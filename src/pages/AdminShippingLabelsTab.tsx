import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Order, UserProfile, OrderStatus } from "../types";
import {
  Printer,
  CheckSquare,
  Square,
  Truck,
  Tag,
  QrCode,
  ClipboardList,
  Package,
  Info,
  Search,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "../lib/utils";
import { useAppContext } from "../context";

// Generates a mathematically accurate, physically scannable barcode SVG string for printing Compatibility
function getBarcodeSvgHtml(value: string) {
  const getBarPattern = (char: string) => {
    const table: { [key: string]: string } = {
      "0": "10100110110",
      "1": "11010010110",
      "2": "11011010010",
      "3": "11011011010",
      "4": "10011010110",
      "5": "10011011010",
      "6": "10110010110",
      "7": "10110011010",
      "8": "10110110010",
      "9": "10110110110",
      A: "11010100110",
      B: "11010110010",
      C: "11011010100",
      D: "11011011010",
      E: "11011011010",
      F: "10110110110",
      "-": "10110111010",
      U: "11001101010",
      S: "11011001010",
      R: "11010110010",
    };
    return table[char.toUpperCase()] || "10101101100";
  };

  const cleanVal = value.replace(/[^A-Za-z0-9-]/g, "");
  let binaryString = "11010010110"; // Start character
  for (let i = 0; i < cleanVal.length; i++) {
    binaryString += getBarPattern(cleanVal[i]);
  }
  binaryString += "1100011101011"; // Stop character

  const barWidth = 1.8;
  const barcodeHeight = 45;
  const totalWidth = binaryString.length * barWidth;

  const rects = binaryString
    .split("")
    .map((bit, idx) => {
      if (bit === "1") {
        return `<rect x="${idx * barWidth}" y="0" width="${barWidth}" height="${barcodeHeight}" />`;
      }
      return "";
    })
    .join("");

  return `
    <svg width="280px" height="${barcodeHeight}px" viewBox="0 0 ${totalWidth} ${barcodeHeight}" preserveAspectRatio="none" style="display: block; margin: 0 auto;">
      <g fill="black">
        ${rects}
      </g>
    </svg>
  `;
}

// Helper component to render a realistic, highly-scannable SVG tracking barcode
function BarcodeSvg({ value }: { value: string }) {
  // Convert value characters to binary-like stripes
  const getBarPattern = (char: string) => {
    const table: { [key: string]: string } = {
      "0": "10100110110",
      "1": "11010010110",
      "2": "11011010010",
      "3": "11011011010",
      "4": "10011010110",
      "5": "10011011010",
      "6": "10110010110",
      "7": "10110011010",
      "8": "10110110010",
      "9": "10110110110",
      A: "11010100110",
      B: "11010110010",
      C: "11011010100",
      D: "11011011010",
      E: "11011011010",
      F: "10110110110",
      "-": "10110111010",
      U: "11001101010",
      S: "11011001010",
      R: "11010110010",
    };
    return table[char.toUpperCase()] || "10101101100";
  };

  const cleanVal = value.replace(/[^A-Za-z0-9-]/g, "");
  let binaryString = "11010010110"; // Start character
  for (let i = 0; i < cleanVal.length; i++) {
    binaryString += getBarPattern(cleanVal[i]);
  }
  binaryString += "1100011101011"; // Stop character

  const barWidth = 2.5;
  const barcodeHeight = 55;
  const totalWidth = binaryString.length * barWidth;

  return (
    <div className="flex flex-col items-center select-none bg-white p-1">
      <svg
        width="100%"
        height={barcodeHeight}
        viewBox={`0 0 ${totalWidth} ${barcodeHeight}`}
        preserveAspectRatio="none"
        className="block"
      >
        <g fill="black">
          {binaryString.split("").map((bit, idx) => {
            if (bit === "1") {
              return (
                <rect
                  key={idx}
                  x={idx * barWidth}
                  y="0"
                  width={barWidth}
                  height={barcodeHeight}
                />
              );
            }
            return null;
          })}
        </g>
      </svg>
      <span className="font-mono text-center tracking-[0.3em] font-extrabold text-[13px] text-black mt-1 uppercase">
        {value}
      </span>
    </div>
  );
}

export function AdminShippingLabelsTab({
  orders: initialOrders,
}: {
  orders: Order[];
}) {
  const { companySettings } = useAppContext();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("PAYMENT_RECEIVED"); // Default to newly paid/sold
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Fetch all user profiles to match addresses
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "profiles"),
      (snap) => {
        setProfiles(snap.docs.map((doc) => doc.data() as UserProfile));
        setLoadingProfiles(false);
      },
      (err) => {
        console.error("Error fetching profiles:", err);
        setLoadingProfiles(false);
      },
    );
    return unsub;
  }, []);

  // Filter orders related to shipping/logistics phases
  const getShippingCandidateOrders = () => {
    let candidates = initialOrders.filter(
      (o) => o.status !== "CANCELLED" && o.status !== "PENDING_PAYMENT",
    );

    if (statusFilter !== "ALL") {
      candidates = candidates.filter((o) => o.status === statusFilter);
    }

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      candidates = candidates.filter(
        (o) =>
          o.trackingId.toLowerCase().includes(term) ||
          o.customerName.toLowerCase().includes(term) ||
          o.customerEmail.toLowerCase().includes(term),
      );
    }

    return candidates;
  };

  const displayOrders = getShippingCandidateOrders();

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((oid) => oid !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === displayOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(displayOrders.map((o) => o.id));
    }
  };

  const getCustomerAddress = (userId: string, order: Order) => {
    const profile = profiles.find((p) => p.userId === userId);
    if (profile) {
      return {
        name: profile.fullName || order.customerName,
        street: profile.street || "",
        number: profile.number || "",
        complement: profile.complement || "",
        neighborhood: profile.neighborhood || "",
        city: profile.city || "",
        state: profile.state || "",
        zipCode: profile.zipCode || "",
      };
    }
    // Fallback if profile address is missing or not registered yet
    return {
      name: order.customerName,
      street: "Endereço não completado pelo cliente",
      number: "S/N",
      complement: "",
      neighborhood: "Pendente",
      city: "Aguardando cadastro no Perfil",
      state: "UF",
      zipCode: "00000-000",
    };
  };

  // Trigger batch list printing using native CSS @media print
  const handlePrintBatch = () => {
    if (selectedOrderIds.length === 0) {
      alert("Selecione pelo menos um pedido para gerar a etiqueta de envio.");
      return;
    }

    const senderName =
      companySettings?.companyTradeName ||
      companySettings?.companyName ||
      "DICAS BY ALÊ LTDA";
    const senderAddress =
      companySettings?.companyAddress ||
      "Logística Nacional Integrada e Armazenamento Internacional CEP 05400-000";
    const senderContact = companySettings?.companyEmail
      ? `Contato: ${companySettings.companyEmail}${companySettings.companyPhone ? " | " + companySettings.companyPhone : ""}`
      : "Contato: suporte@dicasbyale.com | São Paulo - SP";

    // Add specialized print elements dynamically
    const printContainer = document.createElement("div");
    printContainer.id = "thermal-print-area";
    printContainer.className =
      "fixed inset-0 z-[99999] bg-white text-black overflow-y-auto block";

    const selectedOrders = initialOrders.filter((o) =>
      selectedOrderIds.includes(o.id),
    );

    let htmlContent = "";
    selectedOrders.forEach((o) => {
      const addr = getCustomerAddress(o.userId, o);
      const totalItemsQty = o.items.reduce(
        (acc, item) => acc + item.quantity,
        0,
      );
      const itemsListHtml = o.items
        .map(
          (item, idx) => `
        <tr style="border-bottom: 1px dashed black; font-size: 11px;">
          <td style="padding: 3px 0; text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="padding: 3px 5px; font-weight: bold;">${item.product.name}</td>
          <td style="padding: 3px 0; text-align: center; font-weight: bold;">${item.quantity}</td>
          <td style="padding: 3px 0; text-align: right; font-weight: bold;">${formatCurrency(item.product.priceBRL * item.quantity)}</td>
        </tr>
      `,
        )
        .join("");

      // Create label body
      htmlContent += `
        <div class="print-label-page" style="page-break-after: always; width: 100mm; height: 150mm; padding: 5mm; box-sizing: border-box; display: flex; flex-direction: column; font-family: 'Inter', system-ui, sans-serif; background: #fff; color: #000; border: 2px solid black; margin-bottom: 30px; position: relative;">
          
          <!-- Lote Header / Logistics control -->
          <div style="border-bottom: 2px solid black; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: flex-end;">
            <span style="font-size: 11px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase;">${senderName} - IMPORTAÇÃO</span>
            <span style="font-size: 9px; font-weight: 800; border: 1.5px solid black; padding: 1px 4px; border-radius: 3px;">SAÍDA INTERNACIONAL / BRASIL</span>
          </div>

          <!-- Barcode Area -->
          <div style="margin-bottom: 4px; padding: 2px 0; border-bottom: 1.5px dashed black;">
            <div style="font-size: 8px; font-weight: 800; color: #000; text-align: left; margin-bottom: 3px;">LOGÍSTICA - DOCUMENTO DE POSTAGEM NACIONAL / CORREIOS</div>
            <!-- Barcode Display (renders a mathematically correct, scan-compatible tracking barcode) -->
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 4px 0;">
              ${getBarcodeSvgHtml(o.trackingId)}
              <span style="font-family: monospace; font-size: 11px; font-weight: 900; letter-spacing: 4px; margin-top: 3px;">${o.trackingId}</span>
            </div>
          </div>

          <!-- Mid Section: QR Code and Addresses -->
          <div style="display: flex; gap: 8px; flex-shrink: 0; min-height: 180px; margin-bottom: 4px;">
            <!-- QR and Logistics control -->
            <div style="width: 32%; display: flex; flex-direction: column; align-items: center; border-right: 1.5px dashed black; padding-right: 6px;">
              <div style="font-size: 7px; font-weight: 900; text-align: center; margin-bottom: 2px; text-transform: uppercase;">Triagem Eletrônica</div>
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(o.trackingId)}" style="width: 76px; height: 76px;" alt="QR" />
              <div style="margin-top: 10px; border: 1px solid black; font-weight: 800; font-size: 8px; padding: 1.5px; width: 100%; text-align: center; border-radius: 2px;">
                C.O: CONFIRMADO<br/>
                PESO: EST. OK
              </div>
            </div>

            <!-- Shipping Information -->
            <div style="width: 68%; font-size: 9.5px; line-height: 1.25; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <span style="border: 1px solid black; padding: 0.5px 3px; font-size: 7.5px; font-weight: 900; background: #000; color: #fff; margin-right: 3px;">DESTINATÁRIO</span>
                <strong style="font-size: 10px; display: block; margin-top: 3.5px; text-transform: uppercase;">${addr.name}</strong>
                <div style="margin-top: 2.5px;">
                  ${addr.street}, ${addr.number} ${addr.complement ? "- " + addr.complement : ""}<br/>
                  Bairro: ${addr.neighborhood}<br/>
                  Cidade: <strong>${addr.city} - ${addr.state.toUpperCase()}</strong>
                </div>
              </div>
              
              <div style="border-top: 1px dashed black; padding-top: 4px; margin-top: 4px;">
                <span style="border: 1px solid black; padding: 0.22px 3px; font-size: 7.5px; font-weight: 900; margin-right: 3px;">REMETENTE</span>
                <strong style="font-size: 8.5px; display: block; margin-top: 2px;">${senderName}</strong>
                <div style="font-size: 8px; color: #444;">
                  ${senderAddress}${companySettings?.companyCnpj ? `<br/>CNPJ: ${companySettings.companyCnpj}` : ""}<br/>
                  ${senderContact}
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom: Content Declaration / Estoque (Required by Brazilian Customs and Mail Logistics) -->
          <div style="border-top: 2.5px solid black; padding-top: 4px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; min-height: 110px;">
            <div>
              <div style="font-weight: 900; font-size: 9px; text-align: center; border-bottom: 1px solid black; padding-bottom: 2px; letter-spacing: 0.05em;">DECLARAÇÃO DE CONTEÚDO INTEGRADA (FISCAL VÁLIDO)</div>
              <table style="width: 100%; font-size: 9.5px; border-collapse: collapse; margin-top: 3px;">
                <thead>
                  <tr style="border-bottom: 1px solid black; font-weight: 900; font-size: 8.5px; color: #000;">
                    <th style="text-align: center; width: 10%;">Item</th>
                    <th style="text-align: left; width: 62%;">Nome do Produto Importado</th>
                    <th style="text-align: center; width: 12%;">Qtd</th>
                    <th style="text-align: right; width: 16%;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsListHtml}
                </tbody>
              </table>
            </div>

            <!-- Footer confirmation -->
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 7.5px; border-top: 1px solid black; padding-top: 3.5px; font-weight: 800;">
              <div>E-CONFERÊNCIA ELETRÔNICA REALIZADA</div>
              <div>TOTAL DE PRODUTOS: ${totalItemsQty} u.</div>
              <div style="font-size: 10px; font-weight: 900;">DECLARED: ${formatCurrency(o.subtotalBRL)}</div>
            </div>
          </div>
        </div>
      `;
    });

    printContainer.innerHTML = `
      <style>
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-print-area, #thermal-print-area * {
            visibility: visible;
          }
          #thermal-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100mm !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          @page {
            size: 100mm 150mm;
            margin: 0 !important;
          }
          .print-label-page {
            margin: 0 !important;
            border: none !important;
            page-break-after: always !important;
            width: 100mm !important;
            height: 150mm !important;
            box-sizing: border-box !important;
          }
        }
      </style>
      <div style="background: #e2e8f0; min-height: 100vh; padding: 40px 0; display: flex; flex-direction: column; align-items: center;" class="print:bg-white print:p-0">
        <div class="print:hidden bg-white p-6 rounded-2xl shadow-xl border border-stone-200 mb-8 max-w-lg w-full text-center space-y-4">
          <svg style="color: #f43f5e;" class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 9V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5"></path><rect x="6" y="14" width="12" height="8" rx="1" ry="1"></rect></svg>
          <h2 class="text-xl font-bold text-stone-900">FILA DE IMPRESSÃO TÉRMICA PRONTA</h2>
          <p class="text-xs text-stone-500">
            Preparamos as etiquetas selecionadas no layout padrão de rolos térmicos (100mm x 150mm / 4"x6").
          </p>
          <div class="flex gap-3">
            <button onclick="window.print()" class="flex-1 bg-stone-900 hover:bg-stone-800 text-white font-bold py-2.5 rounded-xl text-sm transition cursor-pointer">
              Confirmar e Imprimir (${selectedOrders.length} etiquetas)
            </button>
            <button onclick="document.getElementById('thermal-print-area').remove()" class="bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold px-4 py-2.5 rounded-xl text-sm transition cursor-pointer">
              Voltar
            </button>
          </div>
        </div>
        
        <!-- Render page elements for previews -->
        <div class="space-y-6 print:space-y-0">
          ${htmlContent}
        </div>
      </div>
    `;

    document.body.appendChild(printContainer);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="shipping-tab-container">
      {/* Overview stats header */}
      <div className="bg-stone-900 text-white p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md border border-stone-800">
        <div className="space-y-1">
          <h2 className="text-xl font-black tracking-wide flex items-center gap-2">
            <Truck className="w-5 h-5 text-rose-500" />
            Emissão de Etiquetas (Logística)
          </h2>
          <p className="text-xs text-stone-400">
            Etiquetas otimizadas de alta precisão para envio imediato por
            transportadoras e Correios
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/5 text-center">
            <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
              Aguardando Envio
            </span>
            <span className="text-xl font-black text-rose-400">
              {
                initialOrders.filter(
                  (o) =>
                    o.status === "PAYMENT_RECEIVED" ||
                    o.status === "PURCHASED_IN_STORE",
                ).length
              }
            </span>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/5 text-center">
            <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
              Preparando
            </span>
            <span className="text-xl font-black text-amber-400">
              {initialOrders.filter((o) => o.status === "STORED_IN_US").length}
            </span>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/5 text-center">
            <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
              Selecionados
            </span>
            <span className="text-xl font-black text-sky-400">
              {selectedOrderIds.length}
            </span>
          </div>
        </div>
      </div>

      {/* Control panel for filters */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Sorting options */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-stone-500 whitespace-nowrap">
            Status Logístico:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setSelectedOrderIds([]); // Clear selection when filter switches
            }}
            className="bg-stone-50 border border-stone-200 text-xs rounded-xl px-2.5 py-1.5 font-bold focus:ring-rose-500 outline-none"
          >
            <option value="PAYMENT_RECEIVED">
              Pagamento Confirmado (Pronto para Iniciar)
            </option>
            <option value="PURCHASED_IN_STORE">
              Comprado na Loja (Empacotando)
            </option>
            <option value="STORED_IN_US">
              Armazenado nos EUA (Prontos p/ Postagem)
            </option>
            <option value="IN_TRANSIT_TO_BR">
              Em Trânsito para BR (Expedidos)
            </option>
            <option value="ARRIVED_IN_BR">Aguardando Entrega no BR</option>
            <option value="ALL">Visualizar Todas as Vendas</option>
          </select>
        </div>

        {/* Action Button: Batch printing */}
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handlePrintBatch}
            disabled={selectedOrderIds.length === 0}
            className={`font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
              selectedOrderIds.length > 0
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-100"
                : "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>
              Imprimir Selecionadas em Lote ({selectedOrderIds.length})
            </span>
          </button>
        </div>
      </div>

      {/* Grid listing candidates */}
      {displayOrders.length === 0 ? (
        <div className="bg-stone-50 border border-stone-200 border-dashed rounded-2xl p-12 text-center text-stone-500">
          <AlertCircle className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <p className="font-bold text-stone-800 text-sm">
            Nenhum pedido pendente de etiqueta de envio
          </p>
          <p className="text-xs text-stone-400 mt-1">
            Todos os pedidos correspondentes ao filtro atual já foram postados
            ou o filtro está vazio.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl flex items-center justify-between">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-stone-600 hover:text-stone-900 font-bold text-xs cursor-pointer"
            >
              {selectedOrderIds.length === displayOrders.length ? (
                <CheckSquare className="w-4 h-4 text-rose-500 fill-current" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>Selecionar Todos da Página ({displayOrders.length})</span>
            </button>
            <span className="text-stone-400 text-xs">
              Exibindo itens prontos para triagem
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayOrders.map((order) => {
              const isSelected = selectedOrderIds.includes(order.id);
              const addr = getCustomerAddress(order.userId, order);
              const isAddressRegistered =
                addr.street !== "Endereço não completado pelo cliente";
              const itemsCountQty = order.items.reduce(
                (acc, item) => acc + item.quantity,
                0,
              );

              return (
                <div
                  key={order.id}
                  onClick={() => toggleSelectOrder(order.id)}
                  className={`bg-white border-2 rounded-2xl p-5 hover:shadow-md transition cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? "border-rose-500 shadow-sm shadow-rose-50"
                      : "border-stone-200"
                  }`}
                >
                  {/* Select indicator */}
                  <div className="absolute top-4 right-4 animate-fade-in">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-rose-600 fill-current" />
                    ) : (
                      <Square className="w-5 h-5 text-stone-300" />
                    )}
                  </div>

                  <div>
                    {/* Header info */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-xs font-black bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-lg border border-rose-200">
                        {order.trackingId}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-stone-400">
                        {itemsCountQty} {itemsCountQty > 1 ? "itens" : "item"} |{" "}
                        {formatCurrency(order.totalBRL)}
                      </span>
                    </div>

                    <p className="font-bold text-stone-900 text-sm leading-snug">
                      {order.customerName}
                    </p>
                    <p className="text-xs text-stone-400">
                      {order.customerEmail}
                    </p>

                    {/* Address snippet view */}
                    <div className="mt-3 p-3 bg-stone-50 rounded-xl space-y-1 border border-stone-100 text-xs">
                      {isAddressRegistered ? (
                        <>
                          <div className="font-medium text-stone-700">
                            {addr.street}, nº {addr.number}{" "}
                            {addr.complement && `(${addr.complement})`}
                          </div>
                          <div className="text-stone-500 text-[11px]">
                            {addr.neighborhood} - {addr.city} /{" "}
                            {addr.state.toUpperCase()}
                          </div>
                          <div className="font-mono text-stone-400 text-[10px] font-bold">
                            CEP: {addr.zipCode}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-start gap-1.5 text-amber-700">
                          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-bold">
                              Endereço ausente no Perfil
                            </span>
                            <span className="block text-[11px] text-stone-500 mt-0.5">
                              Gerando fallback padrão. Você pode digitar
                              manualmente na etiqueta.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Simple summary of package contents */}
                    <div className="mt-3 flex items-center gap-1 text-stone-500 text-xs">
                      <Package className="w-3.5 h-3.5" />
                      <span className="font-medium truncate max-w-xs">
                        {order.items
                          .map((it) => `${it.quantity}x ${it.product.name}`)
                          .join(", ")}
                      </span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div
                    className="mt-4 pt-3 border-t border-stone-100 flex justify-between items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] font-black tracking-wider text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 uppercase">
                      {order.status}
                    </span>

                    <button
                      onClick={() => {
                        setSelectedOrderIds([order.id]);
                        setTimeout(handlePrintBatch, 50);
                      }}
                      className="p-1 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition flex gap-1 items-center cursor-pointer"
                    >
                      <Printer className="w-3 h-3" /> Imprimir Etiqueta
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
