import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Search,
  Package,
  MapPin,
  Truck,
  CheckCircle,
  Clock,
  Camera,
  Star,
  Upload,
  XCircle,
  Landmark,
  Copy,
  Info,
  ArrowRight,
  DollarSign,
  FileText,
  FileDown,
  ExternalLink,
  Box,
  CreditCard,
} from "lucide-react";
import { useAppContext } from "../context";
import { ImageInput } from "../components/ImageInput";
import { Trash2 } from "lucide-react";
import { Order, OrderStatus, OrderEvent, Review } from "../types";
import { formatCurrency, safeCopyText, generatePixCode, validateDocument } from "../lib/utils";

const STATUS_ICONS: Record<OrderStatus, React.ElementType> = {
  PENDING_PAYMENT: Clock,
  PREPAYMENT_RECEIVED: CheckCircle,
  AWAITING_PRODUCT_PAYMENT: Clock,
  PRODUCT_PAYMENT_RECEIVED: CheckCircle,
  PAYMENT_RECEIVED: Clock,
  PURCHASED_IN_STORE: Package,
  STORED_IN_US: MapPin,
  SHIPPING_PAID: CheckCircle,
  IN_TRANSIT_TO_BR: Truck,
  ARRIVED_IN_BR: MapPin,
  DELIVERED: CheckCircle,
  CANCELLED: XCircle,
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Aguardando Pagamento de Taxa de Serviço Personalizado",
  PREPAYMENT_RECEIVED: "Pagamento de taxa de serviço personalizado confirmada",
  AWAITING_PRODUCT_PAYMENT: "Aguardando pagamento do produto",
  PRODUCT_PAYMENT_RECEIVED: "Pagamento do produto confirmado",
  PAYMENT_RECEIVED: "Pagamento Confirmado",
  PURCHASED_IN_STORE: "Comprado na Loja",
  STORED_IN_US: "Armazenado no centro de distribuição",
  SHIPPING_PAID: "Frete Pago",
  IN_TRANSIT_TO_BR: "Em trâmite para o Brasil/Estados Unidos",
  ARRIVED_IN_BR: "Seu produto chegou ao destino",
  DELIVERED: "Produto entregue ao cliente",
  CANCELLED: "Cancelado",
};

export function Tracking() {
  const navigate = useNavigate();
  const {
    orders,
    submitReview,
    companySettings,
    autoSaveUserDocument,
    updateOrderStatus,
    profile,
    user,
    shippingMethods,
  } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get("id") || "";

  const [trackingInput, setTrackingInput] = useState(initialId);
  const [order, setOrder] = useState<Order | null>(null);
  const [searchResults, setSearchResults] = useState<Order[]>([]);
  const [searched, setSearched] = useState(!!initialId);
  const [searchType, setSearchType] = useState<"ID" | "CPF" | null>(null);

  // Payments and local receipt upload states
  const [copiedKey, setCopiedKey] = useState(false);
  const [uploadedReceipt, setUploadedReceipt] = useState<string | null>(null);

  // Payment states for Tracking (Credit Card & Boleto)
  const [selectedMethod, setSelectedMethod] = useState<"pix" | "credit_card" | "boleto">("pix");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardInstallments, setCardInstallments] = useState("1");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Billing fields in case user needs to confirm/update them
  const [billingCpf, setBillingCpf] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [billingZip, setBillingZip] = useState("");
  const [billingStreet, setBillingStreet] = useState("");
  const [billingNumber, setBillingNumber] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");

  // Cancellation states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // Sync billing details when order or profile changes
  useEffect(() => {
    if (order) {
      setBillingCpf(profile?.document || order.customerDocument || billingCpf || "");
      setBillingPhone(profile?.phone || billingPhone || "");
      setBillingZip(profile?.zipCode || billingZip || "");
      setBillingStreet(profile?.street || billingStreet || "");
      setBillingNumber(profile?.number || billingNumber || "");
      setBillingCity(profile?.city || billingCity || "");
      setBillingState(profile?.state || billingState || "");
      
      // If payment has already been generated via Asaas, use it!
      if (order.paymentMethod === "credit_card" || order.paymentMethod === "boleto") {
        setSelectedMethod(order.paymentMethod);
      } else {
        setSelectedMethod("pix");
      }
    }
  }, [order, profile]);

  const handleAsaasPaymentTracking = async (currentOrder: Order, amount: number) => {
    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      if (!billingCpf || !billingPhone || !billingZip || !billingStreet || !billingNumber || !billingCity || !billingState) {
        throw new Error("Por favor, preencha todos os dados de cobrança / endereço.");
      }

      const docValidation = validateDocument(billingCpf);
      if (!docValidation.isValid) {
        throw new Error(
          docValidation.type === "CPF"
            ? "O CPF de cobrança informado é inválido. Por favor, verifique o número."
            : docValidation.type === "CNPJ"
            ? "O CNPJ de cobrança informado é inválido. Por favor, verifique o número."
            : "O documento de cobrança informado não é um CPF ou CNPJ válido."
        );
      }

      if (selectedMethod === "credit_card") {
        if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
          throw new Error("Por favor, preencha todos os dados do cartão de crédito.");
        }
        const [expiryMonth, expiryYear] = cardExpiry.split("/");
        if (!expiryMonth || !expiryYear) {
          throw new Error("Validade do cartão deve estar no formato MM/AA (ex: 12/29).");
        }

        const res = await fetch("/api/asaas/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: currentOrder.customerName,
            customerEmail: currentOrder.customerEmail,
            customerCpf: billingCpf,
            customerPhone: billingPhone,
            customerZipCode: billingZip,
            customerStreet: billingStreet,
            customerNumber: billingNumber,
            customerCity: billingCity,
            customerState: billingState,
            value: amount,
            description: `Pagamento Pedido ${currentOrder.trackingId} - Dicas by Alê`,
            billingType: "CREDIT_CARD",
            installmentCount: parseInt(cardInstallments) || 1,
            creditCard: {
              holderName: cardName,
              number: cardNumber.replace(/\s/g, ""),
              expiryMonth: expiryMonth.trim(),
              expiryYear: "20" + expiryYear.trim(),
              ccv: cardCvv,
            }
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Erro ao processar pagamento com cartão.");
        }

        const isPaid = data.status === "CONFIRMED" || data.status === "RECEIVED";
        let targetStatus = currentOrder.status;
        if (isPaid) {
          if (currentOrder.status === 'PENDING_PAYMENT') {
            const hasPrepayment = currentOrder.prepaymentFee && currentOrder.prepaymentFee > 0;
            targetStatus = hasPrepayment ? 'PREPAYMENT_RECEIVED' : 'PAYMENT_RECEIVED';
          } else if (currentOrder.status === 'AWAITING_PRODUCT_PAYMENT') {
            targetStatus = 'PRODUCT_PAYMENT_RECEIVED';
          } else if (currentOrder.status === 'STORED_IN_US') {
            targetStatus = 'SHIPPING_PAID';
          } else {
            targetStatus = 'PAYMENT_RECEIVED';
          }
        }
        
        await updateOrderStatus(
          currentOrder.id,
          targetStatus,
          `Pagamento via Cartão de Crédito iniciado. Status: ${data.status}. ID Asaas: ${data.paymentId}`,
          undefined,
          undefined,
          {
            paymentMethod: "credit_card",
            asaasPaymentId: data.paymentId,
            asaasInvoiceUrl: data.invoiceUrl,
          }
        );

        // Update local order state to show changes immediately
        setOrder({
          ...currentOrder,
          status: targetStatus,
          paymentMethod: "credit_card",
          asaasPaymentId: data.paymentId,
          asaasInvoiceUrl: data.invoiceUrl,
        });

      } else if (selectedMethod === "boleto") {
        const res = await fetch("/api/asaas/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: currentOrder.customerName,
            customerEmail: currentOrder.customerEmail,
            customerCpf: billingCpf,
            customerPhone: billingPhone,
            customerZipCode: billingZip,
            customerStreet: billingStreet,
            customerNumber: billingNumber,
            customerCity: billingCity,
            customerState: billingState,
            value: amount,
            description: `Boleto de Compra Pedido ${currentOrder.trackingId} - Dicas by Alê`,
            billingType: "BOLETO",
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Erro ao gerar boleto.");
        }

        await updateOrderStatus(
          currentOrder.id,
          currentOrder.status,
          `Boleto bancário gerado com sucesso. ID Asaas: ${data.paymentId}`,
          undefined,
          undefined,
          {
            paymentMethod: "boleto",
            asaasPaymentId: data.paymentId,
            asaasInvoiceUrl: data.invoiceUrl,
            bankSlipUrl: data.bankSlipUrl || undefined,
            barCode: data.barCode || undefined,
          }
        );

        // Update local order state to show changes immediately
        setOrder({
          ...currentOrder,
          paymentMethod: "boleto",
          asaasPaymentId: data.paymentId,
          asaasInvoiceUrl: data.invoiceUrl,
          bankSlipUrl: data.bankSlipUrl || undefined,
          barCode: data.barCode || undefined,
        });
      }
    } catch (err: any) {
      console.error(err);
      setPaymentError(err.message || "Ocorreu um erro ao processar o pagamento.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!order) return;
    setIsCancellingOrder(true);
    try {
      const createdDate = new Date(order.createdAt);
      const diffMs = new Date().getTime() - createdDate.getTime();
      const isUnder24h = diffMs <= 24 * 60 * 60 * 1000;
      
      const refundPolicyText = isUnder24h 
        ? "Reembolso integral (100% de devolução de todas as taxas, incluindo taxa especial de serviço) elegível."
        : "Reembolso parcial (apenas 50% de devolução da taxa de serviço) elegível, pois o pedido tem mais de 24 horas.";

      const note = `Pedido cancelado pelo cliente via portal. ${refundPolicyText}`;
      
      await updateOrderStatus(order.id, "CANCELLED", note, undefined, undefined, {
        cancellationReason: "Solicitado pelo cliente via portal",
        cancellationDate: new Date().toISOString(),
        refundEligibility: isUnder24h ? "FULL" : "PARTIAL"
      });
      
      setOrder({
        ...order,
        status: "CANCELLED",
      });
      setCancelSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCancellingOrder(false);
    }
  };

  const handleUploadReceipt = async (url: string, currentOrder: Order) => {
    setUploadedReceipt(url);
    const targetUserId =
      currentOrder.userId || currentOrder.customerEmail || "convidado";
    const userName = currentOrder.customerName || "Cliente";
    const category = "Comprovantes de Pagamento";
    const docName = `Comprovante - Pedido ${currentOrder.id} - ${new Date().toLocaleDateString()}`;
    await autoSaveUserDocument(targetUserId, userName, category, docName, url);
    await updateOrderStatus(
      currentOrder.id,
      currentOrder.status,
      `Comprovante anexado pelo cliente. Arquivo salvo na pasta.`,
    );
  };

  // Review state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    if (initialId) {
      handleSearch(initialId);
    }
  }, [initialId, orders]);

  const handleSearch = (query: string) => {
    setSearched(true);
    const cleanQuery = query
      .replace(/[^\w\s]/g, "")
      .trim()
      .toUpperCase();
    const isCPF = cleanQuery.length === 11 && /^\d+$/.test(cleanQuery);

    let found: Order[] = [];
    if (isCPF) {
      setSearchType("CPF");
      found = orders.filter(
        (o) => o.customerDocument?.replace(/[^\w\s]/g, "") === cleanQuery,
      );
    } else {
      setSearchType("ID");
      const match = orders.find(
        (o) => o.trackingId === query.toUpperCase() || o.id === query,
      );
      found = match ? [match] : [];
    }

    setSearchResults(found);
    if (found.length === 1) {
      setOrder(found[0]);
    } else {
      setOrder(null);
    }

    if (query !== searchParams.get("id")) {
      setSearchParams({ id: query });
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(trackingInput);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || rating === 0) return alert("Por favor, selecione uma nota.");

    const review: Review = {
      id: "",
      orderId: order.id,
      userId: order.userId,
      customerName: order.customerName,
      rating,
      comment,
      photos: reviewPhotos,
      createdAt: new Date().toISOString(),
    };

    try {
      await submitReview(review);
      setReviewSubmitted(true);
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar avaliação.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 md:p-8 text-center mb-8">
        <h1 className="text-2xl font-bold font-display text-stone-900 mb-2">
          Rastrear Pedido
        </h1>
        <p className="text-stone-500 mb-6 max-w-lg mx-auto text-sm">
          Insira o código de rastreio ou seu CPF para acompanhar suas
          importações em tempo real.
        </p>

        <form onSubmit={onSubmit} className="max-w-md mx-auto relative flex">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-stone-400" />
            </div>
            <input
              type="text"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
              className="block w-full pl-11 pr-4 py-4 rounded-l-xl border-y border-l border-stone-200 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none transition uppercase font-mono tracking-widest text-sm text-stone-900"
              placeholder="CÓDIGO OU CPF"
            />
          </div>
          <button
            type="submit"
            className="bg-stone-900 text-white px-6 rounded-r-xl font-bold text-sm tracking-wide hover:bg-stone-800 transition"
          >
            Buscar
          </button>
        </form>

        {/* Suggest direct access if logged in */}
        {orders.length > 0 && !searched && (
          <div className="mt-8 pt-6 border-t border-stone-100">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">
              Seus Pedidos Recentes
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {orders.slice(0, 3).map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    setTrackingInput(o.trackingId);
                    handleSearch(o.trackingId);
                  }}
                  className="bg-stone-50 hover:bg-stone-100 border border-stone-200 px-3 py-2 rounded-lg text-[11px] font-bold text-stone-700 transition flex items-center gap-2"
                >
                  <Package className="w-3 h-3 text-rose-500" />
                  {o.trackingId}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {searched && searchResults.length > 1 && !order && (
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-rose-500" />
            <h3 className="text-lg font-bold font-display text-stone-900">
              Foram encontrados {searchResults.length} pedidos para este CPF
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {searchResults.map((o) => (
              <button
                key={o.id}
                onClick={() => setOrder(o)}
                className="bg-white border border-stone-200 p-4 rounded-2xl text-left hover:border-rose-300 hover:shadow-sm transition group"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-rose-500 tracking-wider uppercase">
                    {o.trackingId}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      o.status === "DELIVERED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {STATUS_LABELS[o.status]}
                  </span>
                </div>
                <div className="text-sm font-bold text-stone-900 mb-1">
                  {o.items.length} item(s)
                </div>
                <div className="text-xs text-stone-500">
                  Em {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                </div>
                <div className="mt-3 text-xs font-bold text-rose-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Ver Detalhes <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {searched && searchResults.length === 0 && (
        <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
          <Package className="h-12 w-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold font-display text-stone-900">
            Pedido não encontrado
          </h3>
          <p className="text-stone-500 mt-1 text-sm">
            Verifique o código e tente novamente.
          </p>
        </div>
      )}

      {order && (
        <div className="space-y-6">
          {/* Order Brief */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="text-xs font-bold text-rose-500 mb-1 tracking-widest uppercase">
                ID: {order.trackingId}
              </div>
              <h2 className="text-2xl font-display font-medium text-stone-900">
                {order.customerName}
              </h2>
              <div className="text-sm text-stone-500">
                {order.items.length} item(s) • Pedido em{" "}
                {new Date(order.createdAt).toLocaleDateString("pt-BR")}
              </div>
            </div>
            <div className="bg-rose-50 px-5 py-3 rounded-xl border border-rose-100 text-right">
              <div className="text-[10px] tracking-wider text-rose-500 font-bold uppercase mb-1">
                Status Atual
              </div>
              <div className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  {order.status !== "DELIVERED" && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  )}
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                {STATUS_LABELS[order.status]}
              </div>
            </div>
          </div>

          {/* Cancellation Info / Action Banner */}
          {(() => {
            const createdDate = new Date(order.createdAt);
            const diffMs = new Date().getTime() - createdDate.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            const diffHours = diffMs / (1000 * 60 * 60);
            
            // Limit to 7 business days (represented as up to 10 calendar days)
            const isEligibleToCancel = diffDays <= 10 && order.status !== "CANCELLED" && order.status !== "DELIVERED";
            
            if (!isEligibleToCancel) return null;
            
            const isUnder24h = diffHours <= 24;
            
            return (
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-scale-in">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Cancelamento de Compra sob Encomenda</span>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed max-w-xl">
                    Este pedido foi efetuado em <strong>{new Date(order.createdAt).toLocaleDateString("pt-BR")}</strong> ({Math.floor(diffDays)} dias atrás). 
                    Você pode cancelar este pedido no sistema imediatamente. 
                    {isUnder24h ? (
                      <span className="text-emerald-600 font-semibold block mt-1">
                        ⏰ Menos de 24 horas transcorridas: elegível a REEMBOLSO INTEGRAL (100%) das taxas.
                      </span>
                    ) : (
                      <span className="text-amber-600 font-semibold block mt-1">
                        ⏳ Mais de 24 horas transcorridas: elegível a REEMBOLSO PARCIAL (50% da taxa de serviço) devido aos custos logísticos já consumidos.
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelModal(true);
                    setCancelSuccess(false);
                  }}
                  className="cursor-pointer px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0"
                >
                  Cancelar Compra
                </button>
              </div>
            );
          })()}

          {/* Carrier Tracking Info */}
          {(order.carrierName || order.carrierTrackingCode) &&
            (() => {
              const carrierNameLower = (order.carrierName || "").toLowerCase();
              const method = shippingMethods?.find((m) => m.carrier.toLowerCase() === carrierNameLower);
              const carrierLogo = method?.logo || (carrierNameLower.includes("fedex")
                ? "https://upload.wikimedia.org/wikipedia/commons/b/b9/FedEx_Corporation_-_Logo.svg"
                : carrierNameLower.includes("dhl")
                  ? "https://upload.wikimedia.org/wikipedia/commons/a/ac/DHL_Logo.svg"
                  : carrierNameLower.includes("ups")
                    ? "https://upload.wikimedia.org/wikipedia/commons/1/1b/UPS_Logo_2014.svg"
                    : carrierNameLower.includes("usps")
                      ? "https://upload.wikimedia.org/wikipedia/commons/d/d3/United_States_Postal_Service_Logo_2022.svg"
                      : null);

              return (
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl shadow-xl p-6 text-white animate-scale-in relative overflow-hidden group border border-white/10">
                  {/* Decorative Background Elements */}
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                    <Truck className="w-32 h-32" />
                  </div>

                  <div className="relative z-10 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
                        <Truck className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold font-display leading-tight">
                          Rastreio da Transportadora
                        </h3>
                        <p className="text-[10px] text-indigo-100 uppercase tracking-[0.2em] font-black opacity-80">
                          Logística Internacional
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10 flex items-center gap-4">
                        {carrierLogo ? (
                          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-2 shrink-0 shadow-inner">
                            <img
                              src={carrierLogo}
                              alt={order.carrierName}
                              className="max-w-full max-h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <Box className="w-6 h-6 text-white/60" />
                          </div>
                        )}
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-indigo-200 uppercase font-black tracking-widest block">
                            Transportadora
                          </span>
                          <span className="text-base font-bold block leading-tight">
                            {order.carrierName || "Não especificada"}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                        <span className="text-[10px] text-indigo-200 uppercase font-black tracking-widest block mb-1">
                          Código de Rastreio
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-mono font-bold tracking-tight select-all">
                            {order.carrierTrackingCode || "Pendente"}
                          </span>
                          {order.carrierTrackingCode && (
                            <button
                              onClick={() => {
                                safeCopyText(order.carrierTrackingCode || "");
                              }}
                              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all cursor-pointer active:scale-95"
                              title="Copiar Código"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 text-[11px] text-indigo-50 leading-relaxed bg-indigo-800/30 p-3 rounded-xl border border-white/5">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-200" />
                      <span>
                        Copie o código acima e utilize no site oficial da{" "}
                        <strong>{order.carrierName || "transportadora"}</strong>{" "}
                        para acompanhar o deslocamento em tempo real.
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
                       {/* Payment Details for PENDING_PAYMENT or STORED_IN_US */}
          {(order.status === "PENDING_PAYMENT" || order.status === "AWAITING_PRODUCT_PAYMENT" || order.status === "STORED_IN_US") &&
            (() => {
              const activePixKey =
                companySettings?.pixKey || "jallanluiz@gmail.com";
              const activePixName = companySettings?.pixName || "Dicas by Ale";
              const activePixCity = companySettings?.pixCity || "SAO PAULO";

              // Use final shipping fee if it exists and we are in shipping payment status
              const isCustom = (order.prepaymentFee || 0) > 0;
              const isShipping = order.status === 'STORED_IN_US';
              let amount = order.totalBRL;
              if (order.status === 'AWAITING_PRODUCT_PAYMENT') {
                amount = order.onDemandProductCostBRL || 0;
              } else if (isShipping) {
                amount = order.finalShippingFeeBRL || order.shippingFeeBRL || 0;
              } else if (order.status === 'PENDING_PAYMENT') {
                if (isCustom) {
                  amount = order.prepaymentFee;
                } else {
                  amount = order.totalBRL;
                }
              }

              const pixCode = generatePixCode(
                activePixKey,
                activePixName,
                activePixCity,
                amount,
              );

              const copyPix = async () => {
                await safeCopyText(pixCode);
                setCopiedKey(true);
                setTimeout(() => setCopiedKey(false), 2500);
              };

              const method = order.paymentMethod || "pix";

              return (
                <div
                  className={`bg-white rounded-2xl border border-rose-100 p-6 md:p-8 space-y-6 shadow-sm animate-scale-in`}
                >
                  <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                    <Landmark
                      className={`w-5 h-5 text-rose-500 hover:scale-110 transition`}
                    />
                    <h3 className="text-base font-bold text-stone-900 font-display">
                      Efetuar o Pagamento do Pedido
                    </h3>
                  </div>

                  {/* Payment Methods Selector Tabs (Only if payment was not generated or is Pix) */}
                  {(!order.asaasPaymentId || order.paymentMethod === "pix") && (
                    <div className="grid grid-cols-3 gap-2 bg-stone-50 p-1.5 rounded-xl border border-stone-200">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMethod("pix");
                          setPaymentError(null);
                        }}
                        className={`cursor-pointer py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          selectedMethod === "pix"
                            ? "bg-white text-rose-600 shadow-sm"
                            : "text-stone-500 hover:text-stone-800"
                        }`}
                        id="tab-method-pix"
                      >
                        <Landmark className="w-3.5 h-3.5" />
                        <span>Pix</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMethod("credit_card");
                          setPaymentError(null);
                        }}
                        className={`cursor-pointer py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          selectedMethod === "credit_card"
                            ? "bg-white text-rose-600 shadow-sm"
                            : "text-stone-500 hover:text-stone-800"
                        }`}
                        id="tab-method-card"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Crédito</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMethod("boleto");
                          setPaymentError(null);
                        }}
                        className={`cursor-pointer py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          selectedMethod === "boleto"
                            ? "bg-white text-rose-600 shadow-sm"
                            : "text-stone-500 hover:text-stone-800"
                        }`}
                        id="tab-method-boleto"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Boleto</span>
                      </button>
                    </div>
                  )}

                  {/* ERROR DISPLAY */}
                  {paymentError && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>{paymentError}</span>
                    </div>
                  )}

                  {/* PAYMENT DISPLAY FLOW */}
                  {/* Option 1: PIX */}
                  {((!order.asaasPaymentId && selectedMethod === "pix") || (order.asaasPaymentId && method === "pix")) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="space-y-4">
                        <p className="text-xs text-stone-600 leading-relaxed">
                          {order.status === 'AWAITING_PRODUCT_PAYMENT'
                            ? "O valor real do produto e o frete de envio foram calculados. Efetue o pagamento abaixo para confirmarmos a compra e o despacho."
                            : (isShipping
                              ? "Sua encomenda já está pronta no nosso galpão! Para que possamos prosseguir com o despacho internacional para o Brasil, por favor efetue o pagamento do frete final calculado."
                              : "Sua compra internacional aguarda confirmação de transferência Pix para darmos início ao faturamento aduaneiro seguro.")}
                        </p>

                        <div className="space-y-1.5 p-3.5 bg-stone-50 rounded-xl border border-stone-100 text-xs">
                          <div className="flex justify-between">
                            <span className="text-stone-400">
                              Beneficiário:
                            </span>
                            <strong className="text-stone-900">
                              {activePixName}
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-400">Chave Pix:</span>
                            <strong className="text-stone-900 select-all font-mono">
                              {activePixKey}
                            </strong>
                          </div>
                          {isCustom && !isShipping && (
                            <div className="flex justify-between text-[11px] text-emerald-700 bg-emerald-50/60 border border-emerald-100 p-1.5 rounded-lg mt-1">
                              <span>Sinal / Taxa de Serviço:</span>
                              <span className="font-bold">Pago ({formatCurrency(order.prepaymentFee)})</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t border-stone-200/60 pt-2 mt-2">
                            <span className="text-stone-500 font-bold">
                              {order.status === 'AWAITING_PRODUCT_PAYMENT'
                                ? "Valor do Produto:"
                                : (isShipping
                                  ? "Frete a Pagar:"
                                  : (isCustom ? "Sinal / Taxa de Serviço:" : "Valor Total do Pedido:"))}
                            </span>
                            <strong className="text-rose-600 text-sm font-semibold">
                              {formatCurrency(amount)}
                            </strong>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={copyPix}
                            className={`cursor-pointer py-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                              copiedKey
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-stone-900 hover:bg-stone-800 text-white border-transparent"
                            }`}
                          >
                            {copiedKey ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600 animate-bounce" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                            {copiedKey
                              ? "Copiado!"
                              : "Copiar Código Pix Copia e Cola"}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4 text-center flex flex-col items-center">
                        <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 inline-block shadow-inner hover:scale-[1.02] transition">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixCode)}`}
                            alt="QR Code Pix"
                            className="w-40 h-40 object-contain mx-auto"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="w-full max-w-sm space-y-2 text-left">
                          <label className="text-[11px] font-bold text-stone-600 block">
                            Já efetuou o pagamento
                            {isShipping ? " do frete" : ""}? Envie o
                            comprovante:
                          </label>
                          {uploadedReceipt ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-semibold space-y-1">
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Comprovante registrado com sucesso!</span>
                              </div>
                              <span className="text-[10px] text-emerald-600 font-normal block leading-snug">
                                Seu comprovante foi anexado e enviado ao nosso
                                setor administrativo. A liberação de logística
                                ocorrerá em instantes.
                              </span>
                            </div>
                          ) : (
                            <ImageInput
                              value=""
                              placeholder="Anexar comprovante de pagamento..."
                              onChange={(url) => {
                                if (url) handleUploadReceipt(url, order);
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Option 2: BOLETO */}
                  {((!order.asaasPaymentId && selectedMethod === "boleto") || (order.asaasPaymentId && method === "boleto")) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-scale-in">
                      {order.asaasPaymentId && method === "boleto" ? (
                        /* Generated Boleto Display */
                        <>
                          <div className="space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 items-start text-[11px] text-amber-900">
                              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="leading-relaxed space-y-1 text-left">
                                <strong className="block text-amber-950 font-bold">Importante - Prazo de Compensação:</strong>
                                <p>
                                  O processamento e compensação do boleto pode levar de <strong>1 a 3 dias úteis</strong>.
                                </p>
                                <p>
                                  A sua compra e o envio do produto só serão efetivados e processados <strong>após a compensação bancária definitiva</strong> (o valor precisa cair em nossa conta). Enquanto isso, o produto não será liberado.
                                </p>
                              </div>
                            </div>

                            <p className="text-xs text-stone-600 leading-relaxed">
                              Seu pedido foi registrado e o boleto bancário já está
                              disponível para pagamento! Pague pelo seu internet
                              banking copiando o código de barras abaixo ou
                              visualize o boleto completo em PDF.
                            </p>

                            <div className="space-y-1.5 p-3.5 bg-stone-50 rounded-xl border border-stone-100 text-xs">
                              <div className="flex justify-between">
                                <span className="text-stone-500 font-bold">
                                  Valor do Boleto:
                                </span>
                                <strong className="text-rose-600 text-sm font-semibold">
                                  {formatCurrency(amount)}
                                </strong>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-stone-400">Vencimento:</span>
                                <strong className="text-stone-800">
                                  1 dia útil
                                </strong>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3.5 pt-2">
                              {order.bankSlipUrl && (
                                <a
                                  href={order.bankSlipUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cursor-pointer py-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition bg-stone-900 hover:bg-stone-800 text-white border-transparent text-center"
                                >
                                  <FileDown className="w-4 h-4" /> Visualizar Boleto
                                  em PDF
                                </a>
                              )}

                              {order.asaasInvoiceUrl && (
                                <a
                                  href={order.asaasInvoiceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cursor-pointer py-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300 text-center"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> Fatura
                                  Completa no Asaas
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="space-y-5">
                            {order.barCode ? (
                              <div className="space-y-2">
                                <label className="text-[10px] text-stone-400 uppercase font-black tracking-widest block">
                                  Linha Digitável (Copiar e Colar)
                                </label>
                                <div className="p-3 bg-stone-50 rounded-xl border border-stone-150 font-mono text-xs text-stone-700 select-all break-all leading-relaxed">
                                  {order.barCode}
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await safeCopyText(order.barCode || "");
                                    setCopiedKey(true);
                                    setTimeout(() => setCopiedKey(false), 2500);
                                  }}
                                  className={`cursor-pointer w-full py-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                                    copiedKey
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      : "bg-rose-600 hover:bg-rose-700 text-white border-transparent"
                                  }`}
                                >
                                  {copiedKey ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                  {copiedKey
                                    ? "Código de Barras Copiado!"
                                    : "Copiar Código de Barras"}
                                </button>
                              </div>
                            ) : (
                              <div className="bg-stone-50 rounded-xl p-4 text-center border border-dashed border-stone-200 text-xs text-stone-400">
                                Código de barras sendo gerado pelo banco. Caso
                                demore, visualize a fatura completa no link ao lado.
                              </div>
                            )}

                            <div className="w-full space-y-2 text-left pt-1">
                              <label className="text-[11px] font-bold text-stone-600 block">
                                Já pagou o boleto? Envie o comprovante:
                              </label>
                              {uploadedReceipt ? (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-semibold space-y-1">
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Comprovante registrado com sucesso!</span>
                                  </div>
                                </div>
                              ) : (
                                <ImageInput
                                  value=""
                                  placeholder="Anexar comprovante de boleto..."
                                  onChange={(url) => {
                                    if (url) handleUploadReceipt(url, order);
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Generate Boleto Form */
                        <div className="col-span-2 space-y-4">
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 items-start text-[11px] text-amber-900">
                            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="leading-relaxed space-y-1 text-left">
                              <strong className="block text-amber-950 font-bold">Aviso sobre o prazo de compensação:</strong>
                              <p>
                                O processamento e compensação do boleto pode levar de <strong>1 a 3 dias úteis</strong>.
                              </p>
                              <p>
                                O seu produto ou mercadoria só será liberado/enviado <strong>após a compensação total do boleto</strong>. Enquanto o pagamento não for compensado, o cliente não receberá o produto.
                              </p>
                            </div>
                          </div>

                          <p className="text-xs text-stone-600">
                            Preencha os dados abaixo para gerar um boleto registrado no banco Asaas. O vencimento será para o próximo dia útil.
                          </p>

                          {/* Billing Form */}
                          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4 text-stone-700 text-left">
                            <h4 className="text-xs font-bold">Dados Cadastrais do Pagador</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-stone-500 block">CPF / CNPJ</label>
                                <input
                                  type="text"
                                  value={billingCpf}
                                  onChange={(e) => setBillingCpf(e.target.value)}
                                  placeholder="000.000.000-00"
                                  className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-stone-500 block">Telefone</label>
                                <input
                                  type="text"
                                  value={billingPhone}
                                  onChange={(e) => setBillingPhone(e.target.value)}
                                  placeholder="(11) 99999-9999"
                                  className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1 col-span-1">
                                <label className="text-[10px] font-bold text-stone-500 block">CEP</label>
                                <input
                                  type="text"
                                  value={billingZip}
                                  onChange={(e) => setBillingZip(e.target.value)}
                                  placeholder="00000-000"
                                  className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                />
                              </div>
                              <div className="space-y-1 col-span-2">
                                <label className="text-[10px] font-bold text-stone-500 block">Rua / Logradouro</label>
                                <input
                                  type="text"
                                  value={billingStreet}
                                  onChange={(e) => setBillingStreet(e.target.value)}
                                  placeholder="Av. Paulista"
                                  className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-stone-500 block">Número</label>
                                <input
                                  type="text"
                                  value={billingNumber}
                                  onChange={(e) => setBillingNumber(e.target.value)}
                                  placeholder="123"
                                  className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-stone-500 block">Cidade</label>
                                <input
                                  type="text"
                                  value={billingCity}
                                  onChange={(e) => setBillingCity(e.target.value)}
                                  placeholder="São Paulo"
                                  className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-stone-500 block">Estado (UF)</label>
                                <input
                                  type="text"
                                  value={billingState}
                                  onChange={(e) => setBillingState(e.target.value)}
                                  placeholder="SP"
                                  className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                />
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isProcessingPayment}
                            onClick={() => handleAsaasPaymentTracking(order, amount)}
                            className="cursor-pointer w-full py-3.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md"
                          >
                            {isProcessingPayment ? (
                              <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                Gerando Boleto no Asaas...
                              </>
                            ) : (
                              <>
                                <FileText className="w-4 h-4" />
                                Confirmar e Gerar Boleto ({formatCurrency(amount)})
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Option 3: CREDIT CARD */}
                  {((!order.asaasPaymentId && selectedMethod === "credit_card") || (order.asaasPaymentId && method === "credit_card")) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-scale-in">
                      {order.asaasPaymentId && method === "credit_card" ? (
                        /* Generated Credit Card Info (Pending Analysis) */
                        <>
                          <div className="space-y-4">
                            <p className="text-xs text-stone-600 leading-relaxed">
                              Seu pagamento por cartão de crédito está sob análise
                              de risco e verificação de segurança antifraude
                              aduaneira no Asaas. Esse processo geralmente leva
                              alguns minutos.
                            </p>

                            <div className="space-y-1.5 p-3.5 bg-stone-50 rounded-xl border border-stone-100 text-xs">
                              <div className="flex justify-between">
                                <span className="text-stone-500 font-bold">
                                  Valor Autorizado:
                                </span>
                                <strong className="text-rose-600 text-sm font-semibold">
                                  {formatCurrency(amount)}
                                </strong>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-stone-400">
                                  Status da Transação:
                                </span>
                                <strong className="text-amber-600 font-bold uppercase tracking-wide text-[10px] bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                  Em Análise
                                </strong>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                              {order.asaasInvoiceUrl && (
                                <a
                                  href={order.asaasInvoiceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cursor-pointer py-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition bg-stone-900 hover:bg-stone-800 text-white border-transparent text-center"
                                >
                                  <ExternalLink className="w-4 h-4" /> Acessar Minha
                                  Fatura no Asaas
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="bg-stone-50 rounded-xl p-5 border border-stone-200 text-xs space-y-2 text-stone-600 leading-relaxed">
                              <strong className="text-stone-950 block text-xs">
                                🔒 Transações com Cartão Protegidas
                              </strong>
                              <span>
                                O banco Asaas exige a validação aduaneira do
                                portador do cartão. Se houver qualquer divergência
                                cadastral, a transação poderá ser estornada
                                automaticamente para sua segurança.
                              </span>
                            </div>

                            <div className="w-full space-y-2 text-left">
                              <label className="text-[11px] font-bold text-stone-600 block">
                                Deseja anexar a fatura ou comprovante?
                              </label>
                              {uploadedReceipt ? (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-semibold space-y-1">
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Comprovante anexado!</span>
                                  </div>
                                </div>
                              ) : (
                                <ImageInput
                                  value=""
                                  placeholder="Anexar comprovante de transação..."
                                  onChange={(url) => {
                                    if (url) handleUploadReceipt(url, order);
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Credit Card Checkout Form */
                        <div className="col-span-2 space-y-6">
                          <p className="text-xs text-stone-600">
                            Preencha os dados do pagador e os dados do cartão de crédito para efetuar o pagamento seguro via Asaas.
                          </p>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
                            {/* Billing Form */}
                            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4 text-stone-700">
                              <h4 className="text-xs font-bold">Dados Cadastrais do Pagador</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-stone-500 block">CPF / CNPJ</label>
                                  <input
                                    type="text"
                                    value={billingCpf}
                                    onChange={(e) => setBillingCpf(e.target.value)}
                                    placeholder="000.000.000-00"
                                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-stone-500 block">Telefone</label>
                                  <input
                                    type="text"
                                    value={billingPhone}
                                    onChange={(e) => setBillingPhone(e.target.value)}
                                    placeholder="(11) 99999-9999"
                                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1 col-span-1">
                                  <label className="text-[10px] font-bold text-stone-500 block">CEP</label>
                                  <input
                                    type="text"
                                    value={billingZip}
                                    onChange={(e) => setBillingZip(e.target.value)}
                                    placeholder="00000-000"
                                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                  />
                                </div>
                                <div className="space-y-1 col-span-2">
                                  <label className="text-[10px] font-bold text-stone-500 block">Rua / Logradouro</label>
                                  <input
                                    type="text"
                                    value={billingStreet}
                                    onChange={(e) => setBillingStreet(e.target.value)}
                                    placeholder="Av. Paulista"
                                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-stone-500 block">Número</label>
                                  <input
                                    type="text"
                                    value={billingNumber}
                                    onChange={(e) => setBillingNumber(e.target.value)}
                                    placeholder="123"
                                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-stone-500 block">Cidade</label>
                                  <input
                                    type="text"
                                    value={billingCity}
                                    onChange={(e) => setBillingCity(e.target.value)}
                                    placeholder="São Paulo"
                                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-stone-500 block">Estado (UF)</label>
                                  <input
                                    type="text"
                                    value={billingState}
                                    onChange={(e) => setBillingState(e.target.value)}
                                    placeholder="SP"
                                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Credit Card Fields */}
                            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4 text-stone-700">
                              <h4 className="text-xs font-bold">Dados do Cartão de Crédito</h4>
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-stone-500 block">Número do Cartão</label>
                                  <input
                                    type="text"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(e.target.value)}
                                    placeholder="0000 0000 0000 0000"
                                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-stone-500 block">Nome do Titular</label>
                                  <input
                                    type="text"
                                    value={cardName}
                                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                                    placeholder="NOME IGUAL NO CARTÃO"
                                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none uppercase focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-stone-500 block">Validade (MM/AA)</label>
                                    <input
                                      type="text"
                                      value={cardExpiry}
                                      onChange={(e) => setCardExpiry(e.target.value)}
                                      placeholder="12/29"
                                      className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-center outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-stone-500 block">CVV</label>
                                    <input
                                      type="text"
                                      value={cardCvv}
                                      onChange={(e) => setCardCvv(e.target.value)}
                                      placeholder="123"
                                      className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-center outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-stone-500 block">Parcelamento</label>
                                  <select
                                    value={cardInstallments}
                                    onChange={(e) => setCardInstallments(e.target.value)}
                                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none font-medium text-stone-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                  >
                                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                                      const interestRate = n === 1 ? 0 : 0.015 + n * 0.018;
                                      const totalWithInterest = amount * (1 + interestRate);
                                      const installmentValue = totalWithInterest / n;
                                      return (
                                        <option key={n} value={n.toString()}>
                                          {n}x de {formatCurrency(installmentValue)} {n === 1 ? "sem juros" : ""}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>

                        <button
                            type="button"
                            disabled={isProcessingPayment}
                            onClick={() => handleAsaasPaymentTracking(order, amount)}
                            className="cursor-pointer w-full py-4 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md"
                          >
                            {isProcessingPayment ? (
                              <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                Processando Cartão de Crédito...
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-4 h-4" />
                                Pagar com Cartão de Crédito ({formatCurrency(amount)})
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          {/* Timeline */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 md:p-8">
            <h3 className="text-lg font-bold font-display text-stone-900 mb-8 border-b border-stone-100 pb-4">
              Histórico de Atividade
            </h3>

            <div className="relative pl-6 space-y-8">
              {/* Vertical line - changed color to stone-100 */}
              <div className="absolute top-4 bottom-4 left-8 w-0.5 bg-stone-100" />

              {order.history.map((event, index) => {
                const isLatest = index === 0;
                const Icon = STATUS_ICONS[event.status] || Package;

                return (
                  <div key={event.id} className="relative z-10 flex gap-6">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-1 ring-4 ring-white ${isLatest ? "bg-rose-500 text-white" : "bg-stone-200 text-stone-500 shadow-inner"}`}
                    >
                      <Icon className="h-2.5 w-2.5" />
                    </div>
                    <div className="flex-grow pt-0.5">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1 gap-1">
                        <h4
                          className={`font-bold ${isLatest ? "text-stone-900 text-base" : "text-stone-600 text-sm"}`}
                        >
                          {STATUS_LABELS[event.status]}
                        </h4>
                        <time className="text-[11px] text-stone-400 font-mono tracking-wider">
                          {new Date(event.date).toLocaleString("pt-BR")}
                        </time>
                      </div>

                      {event.note && (
                        <p
                          className={`text-sm ${isLatest ? "text-stone-600 mt-2" : "text-stone-500 mt-1"}`}
                        >
                          {event.note}
                        </p>
                      )}

                      {event.photoUrl && (
                        <div className="mt-4 rounded-xl overflow-hidden border border-stone-200 shadow-sm sm:max-w-sm group relative bg-stone-50">
                          {event.photoUrl.includes("application/pdf") ||
                          event.photoUrl.toLowerCase().endsWith(".pdf") ? (
                            <div className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                              <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100 shadow-sm">
                                <FileText className="w-8 h-8" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-stone-900">
                                  Documento PDF
                                </p>
                                <p className="text-[10px] text-stone-400 uppercase tracking-widest font-black">
                                  Anexo Oficial
                                </p>
                              </div>
                              <div className="flex gap-2 w-full pt-2">
                                <a
                                  href={event.photoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-600 hover:bg-stone-50 transition shadow-sm"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />{" "}
                                  Visualizar
                                </a>
                                <a
                                  href={event.photoUrl}
                                  download={`documento-${event.id}.pdf`}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-rose-600 rounded-lg text-xs font-bold text-white hover:bg-rose-700 transition shadow-md shadow-rose-200"
                                >
                                  <FileDown className="w-3.5 h-3.5" /> Baixar
                                </a>
                              </div>
                            </div>
                          ) : (
                            <>
                              <img
                                src={event.photoUrl || undefined}
                                alt="Registro fotográfico"
                                className="w-full object-cover"
                              />
                              <div className="absolute top-2 right-2 flex gap-2">
                                <div className="bg-stone-900/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Camera className="w-3 h-3" /> Registro
                                </div>
                              </div>
                              <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                  href={event.photoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-white/90 backdrop-blur-md p-2 rounded-full text-stone-900 hover:bg-white transition shadow-lg"
                                  title="Expandir Foto"
                                >
                                  <ExternalLink className="w-5 h-5" />
                                </a>
                                <a
                                  href={event.photoUrl}
                                  download={`imagem-${event.id}.jpg`}
                                  className="bg-rose-600 p-2 rounded-full text-white hover:bg-rose-500 transition shadow-lg"
                                  title="Fazer Download"
                                >
                                  <FileDown className="w-5 h-5" />
                                </a>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery Method Details */}
          {order.customDeliveryRequested && (
            <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-indigo-900">
                    Entrega Personalizada
                  </h3>
                  <p className="text-xs font-medium text-indigo-600 mt-0.5">
                    Este pedido utiliza um método de entrega sob medida.
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-indigo-100 shadow-sm">
                <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Instruções do Cliente</h4>
                <p className="text-sm text-indigo-900 leading-relaxed font-medium">
                  {order.customDeliveryInstructions || "Nenhuma instrução adicional fornecida."}
                </p>
              </div>
            </div>
          )}

          {/* Order Items Table (Readonly) */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 md:p-8 flex flex-col">
            <h3 className="text-lg font-bold font-display text-stone-900 mb-4 border-b border-stone-100 pb-4">
              Itens da Importação
            </h3>
            <ul className="divide-y divide-stone-100 flex-grow">
              {order.items.map((item) => (
                <li
                  key={item.productId}
                  className="py-4 flex flex-col sm:flex-row gap-4"
                >
                  <div className="w-16 h-16 bg-stone-50 rounded-lg overflow-hidden shrink-0">
                    <img
                      src={item.product.imageUrl || undefined}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-bold text-stone-900 text-sm">
                      {item.product.name}
                    </h4>
                    <p className="text-xs text-stone-500 line-clamp-1 mt-1">
                      {item.product.description}
                    </p>
                  </div>
                  <div className="sm:text-right whitespace-nowrap mt-2 sm:mt-0 pt-1">
                    <div className="text-xs font-mono text-stone-500">
                      Qtd: {item.quantity}
                    </div>
                    <div className="font-bold text-sm text-stone-900 mt-1">
                      {formatCurrency(item.product.priceBRL * item.quantity)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 bg-stone-50 rounded-2xl p-6 border border-stone-100">
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">
                Detalhamento Financeiro
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Subtotal de Produtos:</span>
                  <span className="font-medium text-stone-900">
                    {formatCurrency(order.subtotalBRL)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Taxa de Serviço:</span>
                  <span className="font-medium text-stone-900">
                    {formatCurrency(order.serviceFeeBRL || 0)}
                  </span>
                </div>
                
                {order.appFeeBRL ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Taxa do Aplicativo:</span>
                    <span className="font-medium text-stone-900">
                      {formatCurrency(order.appFeeBRL)}
                    </span>
                  </div>
                ) : null}

                {order.storageFeeBRL ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Taxa de Armazenamento:</span>
                    <span className="font-medium text-stone-900">
                      {formatCurrency(order.storageFeeBRL)}
                    </span>
                  </div>
                ) : null}

                {order.prepaymentFee ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">
                      Sinal Inicial (Sob Encomenda):
                    </span>
                    <span className="font-medium text-stone-900">
                      {formatCurrency(order.prepaymentFee)}
                    </span>
                  </div>
                ) : null}

                {order.onDemandProductCostBRL ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">
                      Valor Adicional do Produto (Sob Encomenda):
                    </span>
                    <span className="font-medium text-stone-900">
                      {formatCurrency(order.onDemandProductCostBRL)}
                    </span>
                  </div>
                ) : null}

                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">
                    {order.finalShippingFeeBRL
                      ? "Frete Internacional (Real):"
                      : "Frete Internacional (Estimado):"}
                  </span>
                  <span
                    className={`font-medium ${order.finalShippingFeeBRL ? "text-rose-600" : "text-stone-500 italic"}`}
                  >
                    {order.finalShippingFeeBRL
                      ? formatCurrency(order.finalShippingFeeBRL)
                      : "Calculado no Envio"}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-stone-200 mt-2">
                  <span className="text-base font-bold text-stone-900">
                    Valor Total Consolidado:
                  </span>
                  <span className="text-xl font-black text-rose-600 font-mono">
                    {formatCurrency(order.totalBRL)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Review Section if Delivered */}
          {order.status === "DELIVERED" && !reviewSubmitted && (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 md:p-8">
              <h3 className="text-lg font-bold font-display text-stone-900 mb-2">
                Sua importação foi concluída! 🎉
              </h3>
              <p className="text-sm text-stone-500 mb-6">
                Gostaríamos muito de saber como foi a sua experiência e ver
                fotos dos seus produtos. Sua opinião é muito importante!
              </p>

              <form onSubmit={handleReviewSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">
                    Qual nota você daria?
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className={`p-2 rounded-full transition-colors ${rating >= star ? "text-orange-400 bg-orange-50" : "text-stone-300 hover:text-orange-300"}`}
                      >
                        <Star
                          className={`w-8 h-8 ${rating >= star ? "fill-current" : ""}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">
                    Comentários (Críticas, elogios ou sugestões)
                  </label>
                  <textarea
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 focus:bg-white focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none text-sm transition"
                    placeholder="Conta um pouco sobre como foi sua experiência..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">
                    Adicionar Fotos (Opcional)
                  </label>
                  <div className="flex flex-col gap-4 mb-2">
                    {reviewPhotos.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {reviewPhotos.map((url, i) => (
                          <div
                            key={i}
                            className="relative w-20 h-20 bg-stone-100 rounded-lg overflow-hidden border border-stone-200 group"
                          >
                            <img
                              src={url || undefined}
                              alt="Review"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setReviewPhotos(
                                  reviewPhotos.filter((_, idx) => idx !== i),
                                )
                              }
                              className="absolute top-1 right-1 bg-black/50 text-white rounded p-1 opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <ImageInput
                      value=""
                      placeholder="Faça Upload ou insira URL..."
                      onChange={(url) => {
                        if (url) setReviewPhotos([...reviewPhotos, url]);
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-stone-900 text-white font-bold py-3 rounded-xl hover:bg-stone-800 transition tracking-wide text-sm"
                >
                  Enviar Avaliação
                </button>
              </form>
            </div>
          )}

          {reviewSubmitted && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 md:p-8 text-center text-emerald-800">
              <span className="text-4xl mb-4 block">💖</span>
              <h3 className="font-bold font-display text-xl mb-2">
                Muito obrigado pela avaliação!
              </h3>
              <p className="text-sm opacity-80">
                Seu feedback foi recebido e nos ajudará a melhorar cada vez mais
                nossos serviços.
              </p>
            </div>
          )}
        </div>
      )}

      {showCancelModal && (
        <div id="cancel-modal" className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-100 max-w-lg w-full overflow-hidden animate-scale-in">
            <div className="p-6 md:p-8 text-center">
              {!cancelSuccess ? (
                <>
                  <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold font-display text-stone-900 mb-2">
                    Confirmar Cancelamento
                  </h3>
                  <p className="text-sm text-stone-500 leading-relaxed mb-6 text-left md:text-center">
                    Você tem certeza que deseja cancelar sua compra sob encomenda? Essa ação não poderá ser desfeita após a confirmação.
                    {(() => {
                      if (!order) return null;
                      const createdDate = new Date(order.createdAt);
                      const diffMs = new Date().getTime() - createdDate.getTime();
                      const diffHours = diffMs / (1000 * 60 * 60);
                      const isUnder24h = diffHours <= 24;
                      return isUnder24h ? (
                        <span className="block mt-4 font-semibold text-emerald-600 bg-emerald-50/50 py-2.5 px-3.5 rounded-xl border border-emerald-100 text-xs text-center">
                          ⏰ Menos de 24h transcorridas: Elegível a reembolso integral (100%) das taxas.
                        </span>
                      ) : (
                        <span className="block mt-4 font-semibold text-amber-600 bg-amber-50/50 py-2.5 px-3.5 rounded-xl border border-amber-100 text-xs text-center">
                          ⏳ Mais de 24h transcorridas: Elegível a reembolso parcial (50% da taxa de serviço) devido aos custos logísticos já iniciados.
                        </span>
                      );
                    })()}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      type="button"
                      disabled={isCancellingOrder}
                      onClick={() => setShowCancelModal(false)}
                      className="cursor-pointer px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      disabled={isCancellingOrder}
                      onClick={handleConfirmCancel}
                      className="cursor-pointer px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isCancellingOrder ? "Cancelando..." : "Sim, Cancelar Compra"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold font-display text-stone-900 mb-2">
                    Compra Cancelada!
                  </h3>
                  <p className="text-sm text-stone-500 leading-relaxed mb-6">
                    Sua solicitação de cancelamento foi processada com sucesso no sistema. O status do pedido foi atualizado para Cancelado.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    className="cursor-pointer px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition shadow-xs"
                  >
                    Fechar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
