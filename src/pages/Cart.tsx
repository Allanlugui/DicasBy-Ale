import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Trash2,
  CreditCard,
  Box,
  Plane,
  Info,
  ShoppingBag,
  Landmark,
  Copy,
  CheckCircle,
  ShieldAlert,
  FileWarning,
  ArrowRight,
  Truck,
  FileText,
  Star,
  Smile,
  Frown,
  Heart,
  Mail,
  Send,
} from "lucide-react";
import { useAppContext } from "../context";
import { formatCurrency, safeCopyText, generatePixCode } from "../lib/utils";
import { DiscountCoupon, Order, OrderStatus, ShippingMethod } from "../types";

export function Cart() {
  const {
    user,
    orders,
    cart,
    removeFromCart,
    createOrder,
    profile,
    companySettings,
    calculateCartTotals,
    shippingMethods,
    coupons,
    addCartFeedback,
    addAbandonedEmailLog,
    updateAbandonedEmailLog,
    abandonedEmailLogs,
  } = useAppContext();
  const navigate = useNavigate();

  const pendingQuoteOrders = orders
    ? orders.filter((o) => o.status === "PENDING_PAYMENT")
    : [];
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Cart abandonment and satisfaction survey state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [removedProduct, setRemovedProduct] = useState<{
    id: string;
    name: string;
    priceBRL: number;
  } | null>(null);
  const [surveyScore, setSurveyScore] = useState<number>(5);
  const [ratingService, setRatingService] = useState<number>(5);
  const [ratingOffers, setRatingOffers] = useState<number>(5);
  const [surveyReason, setSurveyReason] = useState<
    "price" | "shipping" | "delivery_time" | "changed_mind" | "other"
  >("price");
  const [surveyDetails, setSurveyDetails] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Simulated email state

  // Payment Options State
  const [paymentMethod, setPaymentMethod] = useState<
    "pix" | "credit_card" | "debit_card" | "boleto"
  >("pix");
  const [copiedKey, setCopiedKey] = useState(false);
  const [acceptedConsent, setAcceptedConsent] = useState(false);
  const [acceptedCustoms, setAcceptedCustoms] = useState(false);

  // Shipping selection
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<
    string | null
  >(null);

  // Coupons
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<DiscountCoupon | null>(
    null,
  );
  const [showCouponField, setShowCouponField] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Credit Card state
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardInstallments, setCardInstallments] = useState("1");

  // Asaas integration state
  const [asaasData, setAsaasData] = useState<{
    pixCopyPaste?: string;
    invoiceUrl?: string;
    paymentId?: string;
    bankSlipUrl?: string;
    barCode?: string;
  } | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [asaasError, setAsaasError] = useState<string | null>(null);

  // Auto pre-fill from user profile
  useEffect(() => {
    if (profile) {
      setCustomerName(profile.fullName || "");
    }
    if (user) {
      setCustomerEmail(user.email || "");
    }
  }, [profile, user]);

  // Is the profile complete enough to ship?
  const isProfileComplete = !!(
    profile &&
    profile.fullName &&
    profile.document &&
    profile.phone &&
    profile.zipCode &&
    profile.street &&
    profile.number &&
    profile.city &&
    profile.state
  );

  // PIX setup references from admin
  const activePixKey = companySettings?.pixKey || "jallanluiz@gmail.com";
  const activePixName = companySettings?.pixName || "Dicas by Ale";
  const activePixCity = companySettings?.pixCity || "SAO PAULO";

  // Quick calc block
  const selectedShipping = shippingMethods.find(
    (m) => m.id === selectedShippingMethodId,
  );
  const totals = calculateCartTotals(appliedCoupon || undefined);
  const subtotalBRL = totals.subtotalBRL;
  const serviceFeeBRL = totals.serviceFeeBRL;
  const storageFeeBRL = totals.storageFeeBRL;
  const shippingFeeBRL = totals.shippingFeeBRL;
  const appFee = totals.appFee;
  const discountBRL = totals.discountBRL;
  const totalBRL = totals.totalBRL;

  // Dynamic shipping logic based on dimensions (length, width, height) and weight of each product in the cart
  let calculatedShippingStock = 0;
  let calculatedShippingOnDemand = 0;

  if (selectedShipping) {
    cart.forEach((item) => {
      const p = item.product;
      const length = p.boxLength || 20; // fallback if undefined
      const width = p.boxWidth || 15; // fallback if undefined
      const height = p.boxHeight || 10; // fallback if undefined
      const weight = p.boxWeight || 500; // fallback (grams) if undefined

      // Volumetric weight = (L * W * H) / 5000 (standard international courier volumetric weight in kg)
      const volumetricWeight = (length * width * height) / 5000;
      // Physical weight in kg
      const physicalWeight = weight / 1000;
      // Chargeable weight is the greater of the two
      const chargeableWeight = Math.max(volumetricWeight, physicalWeight);

      // Weight multiplier: Base price covers up to 0.5kg (500g). Larger/heavier items scale up the shipping cost.
      const weightMultiplier = Math.max(1, chargeableWeight / 0.5);
      const itemShipping =
        selectedShipping.basePriceBRL * weightMultiplier * item.quantity;

      const isPartnerStore =
        p.stockType === "PARTNER_STORE" ||
        (p.stockType === "IN_STOCK" && (p.inventory || 0) <= 0);
      if (isPartnerStore) {
        calculatedShippingOnDemand += itemShipping;
      } else {
        calculatedShippingStock += itemShipping;
      }
    });
  }

  const estimatedShippingBRL = calculatedShippingStock;
  const shippingMarginOfError = estimatedShippingBRL * 0.1;
  const shippingMin = estimatedShippingBRL - shippingMarginOfError;
  const shippingMax = estimatedShippingBRL + shippingMarginOfError;

  const shippingMarginOnDemand = calculatedShippingOnDemand * 0.1;
  const shippingMinOnDemand =
    calculatedShippingOnDemand - shippingMarginOnDemand;
  const shippingMaxOnDemand =
    calculatedShippingOnDemand + shippingMarginOnDemand;

  const finalTotalBRL = totalBRL + calculatedShippingStock;

  const handleRemoveProductWithFeedback = async (
    productId: string,
    productName: string,
    priceBRL: number,
  ) => {
    setRemovedProduct({ id: productId, name: productName, priceBRL });
    setSurveyScore(5);
    setRatingService(5);
    setRatingOffers(5);
    setSurveyReason("price");
    setSurveyDetails("");
    setFeedbackSubmitted(false);

    setShowFeedbackModal(true);

    try {
      await addAbandonedEmailLog({
        email: user?.email || customerEmail || "cliente@exemplo.com",
        productName,
        productPrice: priceBRL,
        status: "SENT",
      });
    } catch (e) {
      console.error(e);
    }

    removeFromCart(productId);
  };

  const handleSendFeedback = async () => {
    if (!removedProduct) return;
    try {
      const isPositive = surveyScore >= 4;
      await addCartFeedback({
        email: user?.email || customerEmail || "cliente@exemplo.com",
        score: surveyScore,
        ratingService,
        ratingOffers,
        reason: surveyReason,
        details: surveyDetails,
        isPositive,
        type: "ABANDONMENT",
        productName: removedProduct.name,
      });
      setFeedbackSubmitted(true);
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackSubmitted(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyPix = async () => {
    const textToCopy = asaasData?.pixCopyPaste || "";
    if (!textToCopy) return;
    await safeCopyText(textToCopy);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleApplyCoupon = () => {
    setCouponError(null);
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) return;

    // Check in real coupons list
    const foundCoupon = coupons.find((c) => c.code === code && c.active);
    if (foundCoupon) {
      if (
        foundCoupon.minPurchaseBRL &&
        subtotalBRL < foundCoupon.minPurchaseBRL
      ) {
        setCouponError(
          `Compra mínima para este cupom: ${formatCurrency(foundCoupon.minPurchaseBRL)}`,
        );
        return;
      }
      setAppliedCoupon(foundCoupon);
    } else if (code.startsWith("IND-")) {
      // Keep the referral logic too as a fallback if not in DB yet
      const userReferredOrders = user
        ? orders.filter(
            (o) =>
              o.referredBy === user.uid &&
              o.userId !== user.uid &&
              o.status !== "CANCELLED",
          )
        : [];
      const hasMatch = userReferredOrders.some(
        (o) => `IND-${o.id.substring(0, 6).toUpperCase()}` === code,
      );
      if (hasMatch) {
        // Virtual coupon for referral
        setAppliedCoupon({
          id: "virtual-referral",
          code,
          type: "PERCENT",
          value: 15,
          active: true,
          usageCount: 0,
        });
      } else {
        setCouponError(
          "Cupom de indicação inválido ou de compra não confirmada.",
        );
      }
    } else {
      setCouponError("Cupom inválido ou expirado.");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput("");
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!isProfileComplete) return;
    if (!acceptedConsent || !acceptedCustoms) return;
    if (!selectedShippingMethodId) {
      alert("Por favor, selecione uma modalidade de frete.");
      return;
    }

    setIsProcessing(true);
    setAsaasError(null);

    try {
      if (paymentMethod === "pix") {
        // Direct Pix using company settings - fast, solid and reliable!
        const order = await createOrder(
          customerName || profile?.fullName || "Nome Não Fornecido",
          customerEmail || user?.email || "Email Não Fornecido",
          appliedCoupon?.code || undefined,
          discountBRL || undefined,
          {
            shippingMethod: selectedShipping,
            shippingFeeBRL: calculatedShippingStock,
            shippingEstimateBRL: calculatedShippingOnDemand,
            shippingEstimateWithMarginBRL: shippingMaxOnDemand,
            totalBRL: finalTotalBRL,
            customsResponsibilityAccepted: acceptedCustoms,
            paymentMethod: "pix",
          },
        );
        setIsProcessing(false);
        if (order) {
          navigate(`/rastreio?id=${order.trackingId}`);
        }
      } else if (
        paymentMethod === "credit_card" ||
        paymentMethod === "debit_card"
      ) {
        // Card via Asaas API
        if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
          throw new Error("Por favor, preencha todos os campos do cartão.");
        }

        const [expiryMonth, expiryYear] = cardExpiry.split("/");
        if (!expiryMonth || !expiryYear) {
          throw new Error(
            "Validade do cartão deve estar no formato MM/AA (ex: 12/29).",
          );
        }

        const billingType =
          paymentMethod === "credit_card" ? "CREDIT_CARD" : "DEBIT_CARD";

        const res = await fetch("/api/asaas/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: profile?.fullName || customerName || "Cliente",
            customerEmail:
              user?.email || customerEmail || "email@naoinformado.com",
            customerCpf: profile?.document || "",
            customerPhone: profile?.phone || "",
            customerZipCode: profile?.zipCode || "",
            customerStreet: profile?.street || "",
            customerNumber: profile?.number || "",
            customerCity: profile?.city || "",
            customerState: profile?.state || "",
            value: finalTotalBRL,
            description: `Pedido de Importação - ${profile?.fullName || "Cliente"}`,
            billingType,
            installmentCount:
              billingType === "CREDIT_CARD" ? cardInstallments : undefined,
            creditCard: {
              holderName: cardName,
              number: cardNumber.replace(/\s/g, ""),
              expiryMonth: expiryMonth.trim(),
              expiryYear: "20" + expiryYear.trim(),
              ccv: cardCvv,
            },
          }),
        });

        let data;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await res.json();
        } else {
          const text = await res.text();
          throw new Error(
            `Resposta inesperada do servidor (${res.status}). Por favor, tente novamente.`,
          );
        }

        if (!res.ok) {
          throw new Error(
            data.error || "Erro ao processar pagamento com cartão.",
          );
        }

        // Create order with card payment reference
        const isPaid =
          data.status === "CONFIRMED" || data.status === "RECEIVED";
        const order = await createOrder(
          customerName || profile?.fullName || "Nome Não Fornecido",
          customerEmail || user?.email || "Email Não Fornecido",
          appliedCoupon?.code || undefined,
          discountBRL || undefined,
          {
            shippingMethod: selectedShipping,
            shippingFeeBRL: calculatedShippingStock,
            shippingEstimateBRL: calculatedShippingOnDemand,
            shippingEstimateWithMarginBRL: shippingMaxOnDemand,
            totalBRL: finalTotalBRL,
            customsResponsibilityAccepted: acceptedCustoms,
            asaasPaymentId: data.paymentId,
            asaasInvoiceUrl: data.invoiceUrl,
            status: isPaid ? "PAYMENT_RECEIVED" : "PENDING_PAYMENT",
            paymentMethod: paymentMethod,
          },
        );

        setIsProcessing(false);
        if (order) {
          navigate(`/rastreio?id=${order.trackingId}`);
        }
      } else if (paymentMethod === "boleto") {
        // Boleto via Asaas API
        const res = await fetch("/api/asaas/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: profile?.fullName || customerName || "Cliente",
            customerEmail:
              user?.email || customerEmail || "email@naoinformado.com",
            customerCpf: profile?.document || "",
            customerPhone: profile?.phone || "",
            customerZipCode: profile?.zipCode || "",
            customerStreet: profile?.street || "",
            customerNumber: profile?.number || "",
            customerCity: profile?.city || "",
            customerState: profile?.state || "",
            value: finalTotalBRL,
            description: `Pedido de Importação - ${profile?.fullName || "Cliente"}`,
            billingType: "BOLETO",
          }),
        });

        let data;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await res.json();
        } else {
          const text = await res.text();
          throw new Error(
            `Resposta inesperada do servidor (${res.status}). Por favor, tente novamente.`,
          );
        }

        if (!res.ok) {
          throw new Error(data.error || "Erro ao gerar boleto.");
        }

        // Create the order with boleto reference
        const order = await createOrder(
          customerName || profile?.fullName || "Nome Não Fornecido",
          customerEmail || user?.email || "Email Não Fornecido",
          appliedCoupon?.code || undefined,
          discountBRL || undefined,
          {
            shippingMethod: selectedShipping,
            shippingFeeBRL: calculatedShippingStock,
            shippingEstimateBRL: calculatedShippingOnDemand,
            shippingEstimateWithMarginBRL: shippingMaxOnDemand,
            totalBRL: finalTotalBRL,
            customsResponsibilityAccepted: acceptedCustoms,
            asaasPaymentId: data.paymentId,
            asaasInvoiceUrl: data.invoiceUrl,
            bankSlipUrl: data.bankSlipUrl || undefined,
            barCode: data.barCode || undefined,
            paymentMethod: "boleto",
          },
        );

        setIsProcessing(false);
        if (order) {
          navigate(`/rastreio?id=${order.trackingId}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setAsaasError(err.message || "Ocorreu um erro ao processar o pagamento.");
      setIsProcessing(false);
    }
  };

  // If both standard cart and pending quote requests are empty
  if (cart.length === 0 && pendingQuoteOrders.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-stone-800">
        <div className="bg-rose-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="h-10 w-10 text-rose-300" />
        </div>
        <h2 className="text-2xl font-display font-bold text-stone-900 mb-2">
          Sua sacola está vazia
        </h2>
        <p className="text-stone-500 mb-8 font-light text-sm">
          Navegue pelas lojas e adicione produtos que deseja importar.
        </p>
        <button
          onClick={() => navigate("/")}
          className="cursor-pointer bg-rose-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-rose-700 transition animate-pulse-slow"
        >
          Ver Produtos
        </button>
      </div>
    );
  }

  // If standard cart is empty but we have pending quote requests waiting for payment
  if (cart.length === 0 && pendingQuoteOrders.length > 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-stone-800">
        <div className="bg-gradient-to-r from-rose-500 to-amber-500 p-6 md:p-8 rounded-3xl text-white mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
          <div>
            <span className="inline-block bg-white/20 text-white font-bold text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full mb-2">
              Importação Assistida
            </span>
            <h1 className="text-2xl md:text-3xl font-display font-medium">
              Orçamentos Aguardando Pagamento
            </h1>
            <p className="text-white/80 text-xs mt-1.5 max-w-xl">
              Suas solicitações de cotação foram analisadas e aprovadas por
              nossa assessoria. Conclua o pagamento para efetuarmos a compra nas
              lojas oficiais dos EUA.
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="bg-white text-rose-600 hover:bg-stone-50 transition border-none font-bold text-xs px-4 py-2.5 rounded-xl shrink-0"
          >
            Ver Outros Produtos
          </button>
        </div>

        <div className="space-y-8">
          {pendingQuoteOrders.map((order, index) => {
            const specificPixCode = generatePixCode(
              activePixKey,
              activePixName,
              activePixCity,
              order.totalBRL,
            );

            const handleCopySpecificPix = async () => {
              await safeCopyText(specificPixCode);
              setCopiedOrderId(order.id);
              setTimeout(() => setCopiedOrderId(null), 2500);
            };

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col"
                id={`pending-order-box-${order.id}`}
              >
                {/* Header of Item Block */}
                <div className="bg-stone-50 border-b border-stone-150 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-stone-400 font-bold block uppercase">
                      ID DO PEDIDO: #{order.id.substring(0, 8).toUpperCase()}
                    </span>
                    <span className="text-xs text-stone-500">
                      Rastreio Logístico:{" "}
                      <strong className="font-mono text-stone-800">
                        {order.trackingId}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200/50 rounded-lg px-2 py-0.5">
                      Aguardando Pagamento
                    </span>
                  </div>
                </div>

                <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left component: product details */}
                  <div className="lg:col-span-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">
                        Itens Inclusos no Pedido
                      </h3>
                      <div className="space-y-4">
                        {order.items.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex gap-4 items-center bg-stone-50 p-4 rounded-xl border border-stone-150/60"
                          >
                            {item.product.imageUrl && (
                              <img
                                src={item.product.imageUrl}
                                alt={item.product.name}
                                referrerPolicy="no-referrer"
                                className="w-16 h-16 rounded-xl object-cover bg-white border border-stone-100 shrink-0"
                              />
                            )}
                            <div className="flex-grow">
                              <h4 className="text-sm font-bold text-stone-900 leading-tight">
                                {item.product.name}
                              </h4>
                              <p className="text-xs text-stone-400 line-clamp-2 mt-1">
                                {item.product.description}
                              </p>
                              <span className="inline-block text-[11px] font-mono font-bold text-rose-600 bg-rose-50/50 rounded px-1.5 py-0.5 mt-2">
                                Quantidade: x{item.quantity}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cost Summary Box */}
                    <div className="bg-stone-50 rounded-2xl p-5 border border-stone-150/60 text-xs text-stone-600 space-y-2.5">
                      <h4 className="font-bold text-stone-950 text-xs uppercase mb-1.5 flex justify-between">
                        <span>Resumo de Valores</span>
                        <span className="text-[10px] text-stone-400 font-normal normal-case">
                          Consolidado em BRL
                        </span>
                      </h4>
                      <div className="flex justify-between">
                        <span>Preço de Cotação do Produto:</span>
                        <span className="font-mono">
                          {formatCurrency(order.subtotalBRL)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxa de Serviço:</span>
                        <span className="font-mono">
                          {formatCurrency(
                            (order.serviceFeeBRL || 0) +
                              (order.storageFeeBRL || 0) +
                              (order.appFeeBRL || 0),
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Frete Aduaneiro & Correios Brasil:</span>
                        <span className="font-xs italic text-stone-500">
                          Calculado no Envio
                        </span>
                      </div>
                      <div className="pt-3 border-t border-stone-200 flex justify-between items-end">
                        <span className="text-sm font-bold text-stone-900">
                          Total do Pedido:
                        </span>
                        <strong className="text-lg font-bold font-mono text-rose-600">
                          {formatCurrency(order.totalBRL)}
                        </strong>
                      </div>
                    </div>

                    {/* LINK TO RECIBO */}
                    <div className="pt-2">
                      <Link
                        to={`/recibo/${order.id}`}
                        className="text-amber-600 hover:text-amber-700 font-bold text-xs inline-flex items-center gap-1.5 underline"
                      >
                        📄 Ver Recibo e Comprovante do Pedido de Compra →
                      </Link>
                    </div>
                  </div>

                  {/* Right component: Pix Generator for real payment */}
                  <div className="lg:col-span-6 bg-stone-50 border border-stone-200 rounded-2xl p-6 flex flex-col items-center justify-between text-center space-y-6">
                    <div className="w-full">
                      <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 block">
                        Pagamento Pix Copia e Cola
                      </h4>
                      <p className="text-xs text-stone-600 max-w-sm mx-auto mb-4">
                        Escaneie o QR Code abaixo com seu banco ou utilize o
                        código copia e cola para pagar.
                      </p>

                      <div className="bg-white p-3.5 rounded-2xl border border-stone-200 inline-block shadow-inner mb-4">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(specificPixCode)}`}
                          alt="QR Code Pix"
                          className="w-36 h-36 object-contain"
                        />
                      </div>

                      <div className="w-full max-w-xs mx-auto">
                        <button
                          type="button"
                          onClick={handleCopySpecificPix}
                          className={`w-full py-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                            copiedOrderId === order.id
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-stone-900 hover:bg-stone-800 text-white border-transparent"
                          }`}
                        >
                          {copiedOrderId === order.id ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {copiedOrderId === order.id
                            ? "Código Copiado!"
                            : "Copiar Código Pix Copia e Cola"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-stone-800">
      {/* Disclaimer on Business Legal Nature */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-8 flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wide">
            Importações Fiscais Monitoradas
          </h4>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl">
            Sua importação é intermediada pela entidade corporativa jurídica{" "}
            <strong>
              {companySettings?.companyName || "Dicas by Ale VIP"}
            </strong>{" "}
            sob o CNPJ{" "}
            <strong>
              {companySettings?.companyCnpj || "00.000.000/0001-90"}
            </strong>
            . Proteção à privacidade garantida sob a LGPD brasileira e
            diretrizes internacionais americanas.
          </p>
        </div>
        {companySettings?.companyCnpj && (
          <span className="text-[10px] font-mono select-all bg-white border border-stone-200 px-3 py-1.5 rounded-lg text-stone-600 font-bold">
            CNPJ: {companySettings.companyCnpj}
          </span>
        )}
      </div>

      <h1 className="text-3xl font-display font-bold tracking-tight text-stone-900 mb-8">
        Finalizar Pedido
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Cart Items & Profile completeness warning */}
        <div className="lg:col-span-7 space-y-6">
          {/* Complete Profile Warning! */}
          {!isProfileComplete ? (
            <div className="bg-rose-50 border-2 border-dashed border-rose-200 rounded-3xl p-6 md:p-8 space-y-4 animate-pulse-slow">
              <div className="flex items-start gap-4">
                <div className="bg-rose-100 text-rose-600 p-3 rounded-2xl shrink-0">
                  <FileWarning className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-950">
                    📋 Perfil e Dados de Envio Incompletos
                  </h3>
                  <p className="text-xs text-stone-700 leading-relaxed mt-1">
                    Para calcularmos as taxas aduaneiras e expedirmos sua
                    encomenda internacional (dos EUA via{" "}
                    <strong>Correios, Sedex, FedEx, ou Entrega Pessoal</strong>{" "}
                    no Brasil), é indispensável que você registre seus dados
                    completos em nosso painel, incluindo{" "}
                    <strong>
                      CPF, Telefone, CEP e endereço completo com número
                      residencial
                    </strong>
                    .
                  </p>
                </div>
              </div>

              <div className="border-t border-rose-200/50 pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/perfil")}
                  className="cursor-pointer inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-md shadow-rose-100"
                >
                  Completar Meu Perfil de Envio{" "}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-3 items-center text-xs font-medium text-emerald-800">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                Dados de endereçamento e CPF validados para a aduana! Remessa
                segura pronta para faturamento inteligente.
              </span>
            </div>
          )}

          {/* Cart Items Summary */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="p-6 border-b border-stone-100">
              <h2 className="text-md font-bold text-stone-900">
                Itens ({cart.length})
              </h2>
            </div>
            <ul className="divide-y divide-stone-100">
              {cart.map((item) => (
                <li
                  key={item.productId}
                  className="p-6 flex flex-col sm:flex-row gap-4"
                >
                  <div className="w-20 h-20 bg-stone-50 rounded-xl overflow-hidden shrink-0 border border-stone-100">
                    <img
                      src={item.product.imageUrl || undefined}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-stone-900">
                        {item.product.name}
                      </h3>
                      <p className="text-xs text-stone-400 line-clamp-1 mt-1">
                        {item.product.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-stone-500 font-semibold bg-stone-100 px-2 py-1 rounded">
                        Quantidade: {item.quantity}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-sm text-stone-900">
                          {item.product.stockType === "PARTNER_STORE" ||
                          (item.product.stockType === "IN_STOCK" &&
                            (item.product.inventory || 0) <= 0)
                            ? "Sob Encomenda"
                            : formatCurrency(
                                item.product.priceBRL * item.quantity,
                              )}
                        </span>
                        <button
                          onClick={() =>
                            handleRemoveProductWithFeedback(
                              item.productId,
                              item.product.name,
                              item.product.priceBRL,
                            )
                          }
                          className="cursor-pointer text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* RIGHT COLUMN: Resumo e Pagamento */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sticky top-24 shadow-xs">
            <h2 className="text-md font-bold text-stone-900 mb-6 border-b border-stone-100 pb-3">
              Resumo da Compra
            </h2>

            <form onSubmit={handleCheckout} className="space-y-6">
              {/* If Profile logic is complete, show names */}
              {isProfileComplete && (
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs space-y-2">
                  <div className="text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                    Destinatário do Despacho
                  </div>
                  <div>
                    <strong className="text-stone-900 block">
                      {profile.fullName}
                    </strong>
                    <span className="text-stone-500 block mt-0.5">
                      Celular: {profile.phone}
                    </span>
                    <span className="text-stone-500 block mt-0.5">
                      CPF: {profile.document}
                    </span>
                    <span className="text-stone-500 block mt-0.5">
                      Endereço: {profile.street}, {profile.number}{" "}
                      {profile.complement ? `- ${profile.complement}` : ""} •{" "}
                      {profile.city}/{profile.state}
                    </span>
                  </div>
                </div>
              )}

              {/* Total Calculation Details */}
              <div className="space-y-3 text-xs">
                {subtotalBRL > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal (Físico das Compras)</span>
                    <span className="font-semibold text-stone-900">
                      {formatCurrency(subtotalBRL)}
                    </span>
                  </div>
                )}
                {totals.stockCount > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span className="flex items-center gap-1">
                      Taxa de Serviço
                    </span>
                    <span className="font-semibold text-rose-600">
                      {formatCurrency(serviceFeeBRL + appFee + storageFeeBRL)}
                    </span>
                  </div>
                )}
                {totals.prepaymentFee > 0 && (
                  <div className="flex justify-between text-amber-600 font-bold bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                    <span>Taxa de serviço de compra personalizada</span>
                    <span>{formatCurrency(totals.prepaymentFee)}</span>
                  </div>
                )}

                {/* Shipping selection UI */}
                <div className="pt-4 border-t border-stone-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                      Modalidade de Frete
                    </span>
                    <span className="text-[9px] text-stone-300 italic">
                      Pago após pesagem em Miami
                    </span>
                  </div>
                  {shippingMethods.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {shippingMethods.map((method) => {
                        const carrierLogo = method.carrier
                          .toLowerCase()
                          .includes("fedex")
                          ? "https://upload.wikimedia.org/wikipedia/commons/b/b9/FedEx_Corporation_-_Logo.svg"
                          : method.carrier.toLowerCase().includes("dhl")
                            ? "https://upload.wikimedia.org/wikipedia/commons/a/ac/DHL_Logo.svg"
                            : method.carrier.toLowerCase().includes("ups")
                              ? "https://upload.wikimedia.org/wikipedia/commons/1/1b/UPS_Logo_2014.svg"
                              : method.carrier.toLowerCase().includes("usps")
                                ? "https://upload.wikimedia.org/wikipedia/commons/d/d3/United_States_Postal_Service_Logo_2022.svg"
                                : null;

                        let calculatedShippingForThisMethod = 0;
                        cart.forEach((item) => {
                          const p = item.product;
                          const length = p.boxLength || 20;
                          const width = p.boxWidth || 15;
                          const height = p.boxHeight || 10;
                          const weight = p.boxWeight || 500;

                          const volumetricWeight =
                            (length * width * height) / 5000;
                          const physicalWeight = weight / 1000;
                          const chargeableWeight = Math.max(
                            volumetricWeight,
                            physicalWeight,
                          );
                          const weightMultiplier = Math.max(
                            1,
                            chargeableWeight / 0.5,
                          );
                          calculatedShippingForThisMethod +=
                            method.basePriceBRL *
                            weightMultiplier *
                            item.quantity;
                        });

                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() =>
                              setSelectedShippingMethodId(method.id)
                            }
                            className={`flex justify-between items-center p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                              selectedShippingMethodId === method.id
                                ? "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/20 shadow-lg shadow-rose-100/50"
                                : "border-stone-100 bg-white hover:border-stone-300 shadow-sm"
                            }`}
                          >
                            {selectedShippingMethodId === method.id && (
                              <div className="absolute top-0 right-0 p-1.5 bg-rose-500 rounded-bl-xl">
                                <CheckCircle className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}

                            <div className="flex items-center gap-4">
                              {carrierLogo ? (
                                <div className="w-12 h-12 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center p-2 shrink-0 group-hover:scale-105 transition-transform">
                                  <img
                                    src={carrierLogo}
                                    alt={method.carrier}
                                    className="max-w-full max-h-full object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                                  <Truck className="w-6 h-6 text-stone-400" />
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-stone-900 leading-tight">
                                  {method.name}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                                    {method.carrier}
                                  </span>
                                  <span className="text-[10px] text-stone-400">
                                    •
                                  </span>
                                  <span className="text-[10px] text-stone-500 font-medium italic">
                                    Entrega em aprox. {method.estimatedDays}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-stone-800 block">
                                {formatCurrency(
                                  calculatedShippingForThisMethod,
                                )}
                                *
                              </span>
                              <span className="text-[9px] text-stone-400 uppercase tracking-tighter">
                                Custo Estimado Real
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-center">
                      <span className="text-[11px] text-stone-500">
                        Nenhum método de envio configurado. Entre em contato com
                        o suporte.
                      </span>
                    </div>
                  )}
                  {selectedShipping && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 space-y-2 mt-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[10px] uppercase">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        Informações sobre o Frete
                      </div>
                      {totals.onDemandCount > 0 ? (
                        <div className="text-blue-900 leading-normal space-y-1">
                          <p>
                            <strong>Produtos Sob Encomenda:</strong> O valor do
                            frete não será cobrado agora. Você pagará o valor
                            real do envio internacional (estimado entre{" "}
                            <strong className="font-mono">
                              {formatCurrency(shippingMinOnDemand)}
                            </strong>{" "}
                            e{" "}
                            <strong className="font-mono">
                              {formatCurrency(shippingMaxOnDemand)}
                            </strong>
                            ) somente quando os produtos forem pesados e
                            consolidados em nosso centro de distribuição nos
                            Estados Unidos.
                          </p>
                          {totals.stockCount > 0 && (
                            <p>
                              <strong>
                                Produtos de Pronta Entrega (Estoque):
                              </strong>{" "}
                              O valor de{" "}
                              <strong className="font-mono">
                                {formatCurrency(calculatedShippingStock)}
                              </strong>{" "}
                              referente ao frete de envio destes produtos está
                              incluído na soma total do pedido atual.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-blue-900 leading-normal">
                          <strong>Pronta Entrega (Estoque):</strong> O frete
                          para envio direto do estoque no valor de{" "}
                          <strong className="font-mono">
                            {formatCurrency(calculatedShippingStock)}
                          </strong>{" "}
                          já está incluído no total inicial do seu pedido.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Coupons block */}
                <div className="pt-2 border-t border-dashed border-stone-200">
                  {!showCouponField && !appliedCoupon ? (
                    <button
                      type="button"
                      onClick={() => setShowCouponField(true)}
                      className="text-stone-500 hover:text-stone-800 text-[11px] font-bold underline flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      Deseja aplicar código de desconto ou indicação?
                    </button>
                  ) : (
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2 mt-1">
                      <div className="text-stone-700 text-[11px] font-bold">
                        Incentivos / Campanhas
                      </div>
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg p-2 text-xs font-bold leading-none">
                          <span>Cupom {appliedCoupon.code} Ativo!</span>
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="text-rose-600 hover:underline text-[10px] font-bold ml-2 cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponCodeInput}
                              onChange={(e) =>
                                setCouponCodeInput(e.target.value)
                              }
                              className="bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs flex-grow font-mono uppercase focus:border-stone-500 outline-none"
                              placeholder="EX: DICAS10"
                            />
                            <button
                              type="button"
                              onClick={handleApplyCoupon}
                              className="cursor-pointer bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3 py-1 rounded-lg transition"
                            >
                              Ativar
                            </button>
                          </div>
                          {couponError && (
                            <div className="text-rose-600 text-[10px] leading-tight font-semibold mt-1">
                              {couponError}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {discountBRL > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold text-xs pt-1">
                    <span>Desconto Aplicado ({appliedCoupon?.code})</span>
                    <span>-{formatCurrency(discountBRL)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-stone-200 flex justify-between items-center bg-stone-50 p-4 rounded-xl mt-4">
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-widest font-display">
                    Soma Total do Pedido
                  </span>
                  <span className="text-xl font-black font-mono text-stone-900">
                    {formatCurrency(finalTotalBRL)}
                  </span>
                </div>
              </div>

              {/* PAYMENT SELECTORS AND INTERFACES */}
              {isProfileComplete && (
                <div className="space-y-4 border-t border-stone-100 pt-6">
                  <div className="text-xs font-bold text-stone-600">
                    Selecione o Meio de Pagamento:
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod("pix");
                        setAsaasError(null);
                      }}
                      className={`cursor-pointer p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        paymentMethod === "pix"
                          ? "border-rose-500 bg-rose-50/20 text-stone-900 font-bold shadow-xs"
                          : "border-stone-200 bg-white hover:border-stone-300 text-stone-500"
                      }`}
                      id="payment-method-pix"
                    >
                      <Landmark className="w-4 h-4 text-rose-500" />
                      <span className="text-[10px]">Chave Pix</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod("credit_card");
                        setAsaasError(null);
                      }}
                      className={`cursor-pointer p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        paymentMethod === "credit_card"
                          ? "border-rose-500 bg-rose-50/20 text-stone-900 font-bold shadow-xs"
                          : "border-stone-200 bg-white hover:border-stone-300 text-stone-500"
                      }`}
                      id="payment-method-card"
                    >
                      <CreditCard className="w-4 h-4 text-rose-500" />
                      <span className="text-[10px]">Crédito</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod("debit_card");
                        setAsaasError(null);
                      }}
                      className={`cursor-pointer p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        paymentMethod === "debit_card"
                          ? "border-rose-500 bg-rose-50/20 text-stone-900 font-bold shadow-xs"
                          : "border-stone-200 bg-white hover:border-stone-300 text-stone-500"
                      }`}
                      id="payment-method-debit"
                    >
                      <CreditCard className="w-4 h-4 text-rose-500" />
                      <span className="text-[10px]">Débito</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod("boleto");
                        setAsaasError(null);
                      }}
                      className={`cursor-pointer p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        paymentMethod === "boleto"
                          ? "border-rose-500 bg-rose-50/20 text-stone-900 font-bold shadow-xs"
                          : "border-stone-200 bg-white hover:border-stone-300 text-stone-500"
                      }`}
                      id="payment-method-boleto"
                    >
                      <FileText className="w-4 h-4 text-rose-500" />
                      <span className="text-[10px]">Boleto</span>
                    </button>
                  </div>

                  {/* PAYMENT DISPLAY: PIX CARD WITH QR CODE */}
                  {paymentMethod === "pix" && (
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4 text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        <Landmark className="w-4 h-4 text-rose-500" />
                        <span className="text-xs font-bold text-stone-700">
                          Pagamento Imediato via Pix
                        </span>
                      </div>

                      <p className="text-[10px] text-stone-500 leading-relaxed max-w-xs mx-auto">
                        Escaneie com o app de qualquer instituição bancária.
                        Chave registrada em nome do administrador no painel.
                      </p>

                      <div className="bg-white p-3 inline-block rounded-2xl border border-stone-200 shadow-xs mx-auto my-1">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(generatePixCode(companySettings?.pixKey || "admin@pix.com", companySettings?.pixName || "Importação Admin", companySettings?.pixCity || "Sao Paulo", finalTotalBRL))}`}
                          alt="QR Code Pix"
                          className="w-40 h-40 object-contain mx-auto"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          const code = generatePixCode(
                            companySettings?.pixKey || "admin@pix.com",
                            companySettings?.pixName || "Importação Admin",
                            companySettings?.pixCity || "Sao Paulo",
                            finalTotalBRL,
                          );
                          await safeCopyText(code);
                          setCopiedKey(true);
                          setTimeout(() => setCopiedKey(false), 2500);
                        }}
                        className={`cursor-pointer w-full py-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                          copiedKey
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-white hover:bg-stone-100 text-stone-800 border-stone-300"
                        }`}
                      >
                        {copiedKey ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-stone-500" />
                        )}
                        {copiedKey
                          ? "Copiado para Área de Transferência!"
                          : "Copiar Chave Pix (Copia e Cola)"}
                      </button>
                    </div>
                  )}

                  {/* PAYMENT DISPLAY: CREDIT CARD OR DEBIT CARD FIELDS */}
                  {(paymentMethod === "credit_card" ||
                    paymentMethod === "debit_card") && (
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4">
                      <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3 flex gap-2 items-start text-[11px] text-rose-900">
                        <Info className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                          <strong>Gateway de Pagamento Integrado:</strong> Os
                          pagamentos via Cartão (
                          {paymentMethod === "credit_card"
                            ? "Crédito"
                            : "Débito"}
                          ) são processados de forma 100% segura e
                          criptografada. Nosso sistema conta com análise técnica
                          e antifraude ativa para processamento imediato de sua
                          importação.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-500 block">
                            Número do Cartão
                          </label>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            placeholder="0000 0000 0000 0000"
                            className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-500 block">
                            Nome Escrito no Cartão
                          </label>
                          <input
                            type="text"
                            value={cardName}
                            onChange={(e) =>
                              setCardName(e.target.value.toUpperCase())
                            }
                            placeholder="NOME COMPLETO TITULAR"
                            className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none uppercase"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-500 block">
                              Validade (MM/AA)
                            </label>
                            <input
                              type="text"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              placeholder="12/29"
                              className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-center focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-500 block">
                              Código CVV
                            </label>
                            <input
                              type="text"
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value)}
                              placeholder="123"
                              className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-center focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none"
                            />
                          </div>
                        </div>

                        {paymentMethod === "credit_card" && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-500 block">
                              Opção de Parcelamento
                            </label>
                            <select
                              value={cardInstallments}
                              onChange={(e) =>
                                setCardInstallments(e.target.value)
                              }
                              className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none font-medium text-stone-800"
                            >
                              {Array.from({ length: 10 }, (_, i) => i + 1).map(
                                (n) => {
                                  const interestRate =
                                    n === 1 ? 0 : 0.015 + n * 0.018; // 1.5% fixed + 1.8% per month approx
                                  const totalWithInterest =
                                    finalTotalBRL * (1 + interestRate);
                                  const installmentValue =
                                    totalWithInterest / n;
                                  return (
                                    <option key={n} value={n}>
                                      {n}x de {formatCurrency(installmentValue)}{" "}
                                      {n === 1
                                        ? "(Sem Juros)"
                                        : `(Total: ${formatCurrency(totalWithInterest)})`}
                                    </option>
                                  );
                                },
                              )}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CUSTOMS & IMPORTATION IMPORTANT NOTICE */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-6 space-y-2.5">
                    <div className="flex gap-2 items-center text-amber-950 font-extrabold text-[11px] uppercase tracking-wider">
                      <Info className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                      <span>Termos de Responsabilidade Aduaneira</span>
                    </div>
                    <div className="text-[10px] text-amber-900 leading-relaxed space-y-2">
                      <p>
                        <strong>1. Custos de Alfândega e Impostos:</strong>{" "}
                        Todas as taxas aduaneiras (incluindo Remessa Conforme,
                        tributação avulsa, taxas de homologação ou quaisquer
                        impostos cobrados pelas alfândegas dos Estados Unidos ou
                        do Brasil) são de{" "}
                        <strong>
                          inteira e exclusiva responsabilidade do cliente
                          (comprador)
                        </strong>
                        , independentemente da origem.{" "}
                        <strong>Tudo fica 100% a cargo do cliente.</strong>
                      </p>
                      <p>
                        <strong>2. Despacho e Entrega Final:</strong> A{" "}
                        {companySettings?.companyTradeName ||
                          companySettings?.companyName ||
                          "empresa"}{" "}
                        não arca com nenhuma despesa após o despacho da
                        encomenda. No entanto, após o recebimento e desembaraço
                        das mercadorias no Brasil, nossa equipe especializada
                        irá tratar de todo o processo para que a entrega seja
                        realizada de forma segura até o seu endereço.
                      </p>
                    </div>
                  </div>

                  {/* CONSENT CHECKBOXES */}
                  <div className="space-y-3 mt-4">
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={acceptedConsent}
                          onChange={(e) => setAcceptedConsent(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-stone-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                          required
                        />
                        <span className="text-[10px] font-semibold text-stone-600 leading-relaxed block">
                          Declaro concordar em compartilhar meus dados com
                          parceiros logísticos e despachantes aduaneiros
                          americanos e brasileiros para o desembaraço desta
                          importação.
                        </span>
                      </label>
                    </div>

                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={acceptedCustoms}
                          onChange={(e) => setAcceptedCustoms(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                          required
                        />
                        <span className="text-[10px] font-black text-stone-900 leading-relaxed block uppercase">
                          Estou ciente e aceito que todo custo de alfândega,
                          impostos (Remessa Conforme/tributos avulsos) e frete
                          são 100% sob minha responsabilidade, isentando a{" "}
                          {companySettings?.companyTradeName ||
                            companySettings?.companyName ||
                            "empresa"}{" "}
                          após o despacho.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION BTN */}
              <button
                type="submit"
                disabled={
                  isProcessing ||
                  !isProfileComplete ||
                  !acceptedConsent ||
                  !acceptedCustoms ||
                  !selectedShippingMethodId
                }
                className="cursor-pointer w-full bg-rose-600 hover:bg-rose-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-rose-100"
              >
                {isProcessing ? (
                  "Confirmando pedido..."
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" /> Confirmar Pedido de
                    Importação
                  </>
                )}
              </button>

              {(!isProfileComplete ||
                !acceptedCustoms ||
                !selectedShippingMethodId) && (
                <p className="text-[10px] text-center text-rose-600 font-bold leading-tight select-none">
                  * É obrigatório selecionar o frete, completar o perfil e
                  aceitar os termos de importação.
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* FEEDBACK QUESTIONNAIRE MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-stone-200 overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setShowFeedbackModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 cursor-pointer p-2 rounded-full hover:bg-stone-50 transition"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>

            {feedbackSubmitted ? (
              <div className="p-8 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 font-display">
                  Feedback Enviado com Sucesso!
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto">
                  Agradecemos imensamente por compartilhar sua avaliação. Sua
                  opinião (positiva ou negativa) é crucial para monitorarmos
                  nossa performance e qualidade.
                </p>
              </div>
            ) : (
              <div className="p-6 md:p-8 space-y-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-600 font-bold text-[10px] tracking-wider uppercase">
                    <Heart className="w-3.5 h-3.5 fill-current" /> Pesquisa de
                    Satisfação
                  </div>
                  <h3 className="text-lg font-bold text-stone-900 font-display">
                    Ajude-nos a melhorar!
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Vimos que você removeu o item{" "}
                    <strong className="text-stone-800">
                      "{removedProduct?.name}"
                    </strong>
                    . Compreender sua experiência nos ajuda a aprimorar nosso
                    serviço e reter nossos clientes.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Score 1-10 Slider or clickable buttons */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-700">
                      Como você avalia sua satisfação geral com esta visita? (
                      {surveyScore} / 10)
                    </label>
                    <div className="flex gap-1 justify-between">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setSurveyScore(score)}
                          className={`w-8 h-8 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center ${
                            surveyScore === score
                              ? score >= 8
                                ? "bg-emerald-600 text-white"
                                : score >= 5
                                  ? "bg-amber-500 text-white"
                                  : "bg-rose-600 text-white"
                              : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-stone-400 font-medium px-1">
                      <span className="flex items-center gap-1">
                        <Frown className="w-3.5 h-3.5 text-rose-400" />{" "}
                        Insatisfeito
                      </span>
                      <span className="flex items-center gap-1">
                        Satisfeito{" "}
                        <Smile className="w-3.5 h-3.5 text-emerald-400" />
                      </span>
                    </div>
                  </div>

                  {/* Rating Service and Rating Offers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-stone-700">
                        Qualidade das Ofertas / Preços:
                      </label>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingOffers(star)}
                            className="cursor-pointer text-amber-400 hover:scale-110 transition p-0.5"
                          >
                            <Star
                              className={`w-5 h-5 ${ratingOffers >= star ? "fill-current" : "text-stone-300"}`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-stone-700">
                        Qualidade de Atendimento:
                      </label>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingService(star)}
                            className="cursor-pointer text-amber-400 hover:scale-110 transition p-0.5"
                          >
                            <Star
                              className={`w-5 h-5 ${ratingService >= star ? "fill-current" : "text-stone-300"}`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Reason Selection */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-700">
                      Qual foi o motivo principal da desistência?
                    </label>
                    <select
                      value={surveyReason}
                      onChange={(e: any) => setSurveyReason(e.target.value)}
                      className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-stone-800 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                    >
                      <option value="price">
                        💸 Preço do produto muito elevado
                      </option>
                      <option value="shipping">
                        🚚 Custo do frete alto demais
                      </option>
                      <option value="delivery_time">
                        ⏱️ Prazo de entrega muito longo
                      </option>
                      <option value="changed_mind">
                        🤷 Desisti de comprar / Mudei de ideia
                      </option>
                      <option value="other">📝 Outro motivo</option>
                    </select>
                  </div>

                  {/* Suggestion Textarea */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-700">
                      O que poderíamos fazer para mudar sua opinião? (Opcional)
                    </label>
                    <textarea
                      value={surveyDetails}
                      onChange={(e) => setSurveyDetails(e.target.value)}
                      rows={3}
                      placeholder="Ex: Oferecer desconto extra, mais opções de frete rápido..."
                      className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-stone-800 focus:ring-1 focus:ring-rose-500 focus:outline-none placeholder-stone-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="cursor-pointer bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-xs px-5 py-3 rounded-xl transition"
                  >
                    Ignorar
                  </button>
                  <button
                    type="button"
                    onClick={handleSendFeedback}
                    className="cursor-pointer bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-5 py-3 rounded-xl transition flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Enviar Avaliação
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
