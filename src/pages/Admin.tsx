import React, { useState, useRef, useEffect } from "react";
import {
  Settings,
  Plus,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Store as StoreIcon,
  Trash2,
  Edit2,
  Search,
  MessageSquare,
  Star,
  Mail,
  Eraser,
  FileText,
  TrendingUp,
  DollarSign,
  CheckCircle,
  AlertCircle,
  XCircle,
  Filter,
  Percent,
  Users,
  Truck,
  Scale,
  Bell,
  Download,
  Brain,
  Sparkles,
  BookOpen,
  Clock,
  Pause,
  Smile,
  Frown,
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { useAppContext } from "../context";
import {
  OrderStatus,
  Product,
  Store,
  Ticket,
  Review,
  TicketMessage,
  Order,
  SystemNotification,
  SystemKnowledge,
  CartFeedback,
  AbandonedEmailLog,
} from "../types";
import { formatCurrency, calculateStorageFee } from "../lib/utils";
import { jsPDF } from "jspdf";

import { ImageInput } from "../components/ImageInput";
import { AdminSettingsTab } from "./AdminSettingsTab";
import { AdminCollaboratorsTab } from "./AdminCollaboratorsTab";
import { AdminShippingLabelsTab } from "./AdminShippingLabelsTab";
import { AdminQuotesTab } from "../components/AdminQuotesTab";
import { AdminDriveTab } from "./AdminDriveTab";
import { AdminCustomersTab } from "./AdminCustomersTab";
import { AdminIntegrationLogsTab } from "./AdminIntegrationLogsTab";

export const ADMIN_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Aguardando Pagamento de Taxa de Serviço Personalizado",
  PREPAYMENT_RECEIVED: "Pagamento de taxa de serviço personalizado confirmada",
  AWAITING_PRODUCT_PAYMENT: "Aguardando pagamento do produto",
  PRODUCT_PAYMENT_RECEIVED: "Pagamento do produto confirmado",
  PAYMENT_RECEIVED: "Pagamento Confirmado (Pronto para Faturamento)",
  PURCHASED_IN_STORE: "Comprado na Loja (Pronto para Adicionar Foto da Nota/Produto)",
  STORED_IN_US: "Armazenado no centro de distribuição",
  SHIPPING_PAID: "Frete Pago",
  IN_TRANSIT_TO_BR: "Em trâmite para o Brasil/Estados Unidos",
  ARRIVED_IN_BR: "Seu produto chegou ao destino",
  DELIVERED: "Produto entregue ao cliente",
  CANCELLED: "Cancelado",
};

export function TicketsTab({
  tickets,
  updateTicket,
}: {
  tickets: Ticket[];
  updateTicket: any;
}) {
  const { learnFromTicket } = useAppContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [isLearning, setIsLearning] = useState(false);

  const filteredTickets = tickets.filter(
    (t) =>
      t.protocol.includes(searchTerm) ||
      t.customerName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Find the fresh ticket data in the list (or fallback to local selection status)
  const currentTicket = activeTicket
    ? tickets.find((t) => t.id === activeTicket.id) || activeTicket
    : null;

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTicket || !reply.trim() || currentTicket.status === "CLOSED")
      return;
    const newMsg: TicketMessage = {
      role: "bot",
      text: reply,
      timestamp: new Date().toISOString(),
      isAgent: true,
    };
    await updateTicket(
      currentTicket.id,
      [...currentTicket.messages, newMsg],
      undefined,
      true,
    );
    setReply("");
  };

  const handleClose = async () => {
    if (!currentTicket || currentTicket.status === "CLOSED") return;
    const closedMsg: TicketMessage = {
      role: "bot",
      text: "Atendimento encerrado pelo administrador.",
      timestamp: new Date().toISOString(),
    };
    await updateTicket(
      currentTicket.id,
      [...currentTicket.messages, closedMsg],
      "CLOSED",
    );
  };

  const handleManualLearn = async () => {
    if (!currentTicket) return;
    setIsLearning(true);
    try {
      await learnFromTicket(currentTicket.id);
      alert(
        "A IA analisou esta conversa e extraiu novos aprendizados (se aplicável). Verifique a aba IA Regenerativa.",
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsLearning(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 flex flex-col overflow-hidden h-full">
        <div className="p-4 border-b border-stone-100 bg-stone-50">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por protocolo ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-stone-200 focus:ring-rose-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filteredTickets.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTicket(t)}
              className={`w-full text-left p-3 rounded-xl transition mb-1 ${currentTicket?.id === t.id ? "bg-rose-50 border border-rose-200" : "hover:bg-stone-50 border border-transparent"}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-rose-600">
                  #{t.protocol}
                </span>
                <div className="flex items-center gap-2">
                  {t.needsHuman && t.status !== "CLOSED" && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-red-100 text-red-700 animate-pulse border border-red-200">
                      Urgente (Humano)
                    </span>
                  )}
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${t.status === "CLOSED" ? "bg-stone-100 text-stone-500" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}
                  >
                    {t.status === "CLOSED" ? "Sem atividade" : "Aberto"}
                  </span>
                  <span className="text-xs text-stone-400">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="font-medium text-sm text-stone-900 mt-1">
                {t.customerName}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-100 flex flex-col h-full overflow-hidden">
        {currentTicket ? (
          <>
            <div className="p-4 bg-stone-50 border-b border-stone-100 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-stone-900 font-display">
                    Protocolo {currentTicket.protocol}
                  </h3>
                  {currentTicket.needsHuman &&
                    currentTicket.status !== "CLOSED" && (
                      <span className="bg-red-500 text-white text-[9px] uppercase font-bold px-2 py-0.5 rounded-full animate-bounce shadow">
                        Aguardando Humano ⚠️
                      </span>
                    )}
                </div>
                <p className="text-xs text-stone-500">
                  Cliente: {currentTicket.customerName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleManualLearn}
                  disabled={isLearning || currentTicket.messages.length < 3}
                  title="Extrair aprendizados desta conversa para a IA"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isLearning ? "bg-amber-100 text-amber-600 animate-pulse" : "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200"}`}
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>
                    {isLearning ? "Analisando..." : "Ensinar para IA"}
                  </span>
                </button>

                {currentTicket.status === "CLOSED" ? (
                  <span className="px-3 py-1.5 bg-stone-100 text-stone-500 rounded-lg text-xs font-bold uppercase border border-stone-200">
                    Encerrado
                  </span>
                ) : (
                  <button
                    onClick={handleClose}
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 shadow-sm transition-colors"
                  >
                    Encerrar
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentTicket.messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-3 max-w-[80%] ${m.role === "bot" ? "ml-auto flex-row-reverse" : ""}`}
                >
                  <div
                    className={`p-3 rounded-2xl ${m.role === "bot" ? "bg-rose-50 text-stone-900 rounded-tr-sm" : "bg-stone-100 text-stone-800 rounded-tl-sm"}`}
                  >
                    {m.role === "bot" && m.isAgent && (
                      <div className="text-[10px] uppercase tracking-wider font-extrabold text-rose-600 mb-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        Atendente Humano
                      </div>
                    )}

                    {m.text && (
                      <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                    )}

                    {/* Render attachments if present */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {m.attachments.map((att: any, idx: number) => {
                            const isImg =
                              att.type?.startsWith("image/") ||
                              att.url?.startsWith("data:image/");
                            return (
                              <div
                                key={idx}
                                className="bg-white border border-stone-200 rounded-xl p-2 max-w-sm flex items-center gap-2.5 shadow-sm"
                              >
                                {isImg ? (
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="shrink-0 group relative block cursor-pointer"
                                  >
                                    <img
                                      src={att.url}
                                      alt={att.name || "Image"}
                                      className="w-12 h-12 object-cover rounded-lg border border-stone-100"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/40 text-white text-[10px] flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition font-bold">
                                      Ver
                                    </div>
                                  </a>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                                    <FileText className="w-6 h-6 text-rose-500" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p
                                    className="text-xs font-bold text-stone-800 truncate"
                                    title={att.name}
                                  >
                                    {att.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-stone-400 capitalize shrink-0">
                                      {att.type?.split("/")[1] || "Doc"}
                                    </span>
                                    <a
                                      href={att.url}
                                      download={att.name}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-rose-500 hover:text-rose-600 transition flex items-center gap-0.5 text-[9px] font-black uppercase cursor-pointer"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>Download</span>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <form
              onSubmit={handleReply}
              className="p-4 border-t border-stone-100 bg-white flex gap-2"
            >
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                disabled={currentTicket.status === "CLOSED"}
                className="flex-1 rounded-xl border border-stone-200 px-4 py-2 text-sm focus:ring-rose-500 disabled:bg-stone-50 disabled:text-stone-400"
                placeholder={
                  currentTicket.status === "CLOSED"
                    ? "Atendimento encerrado."
                    : "Digite sua resposta..."
                }
              />
              <button
                type="submit"
                disabled={currentTicket.status === "CLOSED" || !reply.trim()}
                className="bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                Enviar
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-stone-400">
            Selecione um chamado para visualizar
          </div>
        )}
      </div>
    </div>
  );
}

export function ReviewsTab({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0)
    return (
      <div className="text-stone-500 py-8">
        Nenhuma avaliação recebida ainda.
      </div>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reviews.map((r) => (
        <div
          key={r.id}
          className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="font-bold text-stone-900 block">
                {r.customerName}
              </span>
              <span className="text-xs text-stone-400">
                {new Date(r.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex bg-orange-50 text-orange-400 px-2 py-1 rounded-lg">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < r.rating ? "fill-current" : "text-orange-200"}`}
                />
              ))}
            </div>
          </div>
          <p className="text-stone-700 text-sm mb-4">"{r.comment}"</p>
          {r.photos && r.photos.length > 0 && (
            <div className="flex gap-2 mt-4 overflow-x-auto">
              {r.photos.map((url, i) => (
                <img
                  key={i}
                  src={url || undefined}
                  alt="Review"
                  className="w-16 h-16 object-cover rounded-lg"
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function SatisfactionTab() {
  const { cartFeedbacks = [], abandonedEmailLogs = [] } = useAppContext();

  const totalFeedbacks = cartFeedbacks.length;
  const totalEmailsSent = abandonedEmailLogs.length;
  const totalEmailsRecovered = abandonedEmailLogs.filter(
    (l) => l.status === "RECOVERED",
  ).length;

  const recoveryRate =
    totalEmailsSent > 0
      ? Math.round((totalEmailsRecovered / totalEmailsSent) * 100)
      : 0;

  const avgSatisfactionScore =
    totalFeedbacks > 0
      ? Number(
          (
            cartFeedbacks.reduce((sum, f) => sum + (f.score || 0), 0) /
            totalFeedbacks
          ).toFixed(1),
        )
      : 0;

  const avgServiceRating =
    totalFeedbacks > 0
      ? Number(
          (
            cartFeedbacks.reduce((sum, f) => sum + (f.ratingService || 0), 0) /
            totalFeedbacks
          ).toFixed(1),
        )
      : 0;

  const avgOffersRating =
    totalFeedbacks > 0
      ? Number(
          (
            cartFeedbacks.reduce((sum, f) => sum + (f.ratingOffers || 0), 0) /
            totalFeedbacks
          ).toFixed(1),
        )
      : 0;

  const reasonsCount = {
    price: 0,
    shipping: 0,
    delivery_time: 0,
    changed_mind: 0,
    other: 0,
  };

  cartFeedbacks.forEach((f) => {
    if (f.reason && f.reason in reasonsCount) {
      reasonsCount[f.reason as keyof typeof reasonsCount]++;
    } else {
      reasonsCount.other++;
    }
  });

  const getReasonPercentage = (key: keyof typeof reasonsCount) => {
    if (totalFeedbacks === 0) return 0;
    return Math.round((reasonsCount[key] / totalFeedbacks) * 100);
  };

  const positiveFeedbacks = cartFeedbacks.filter(
    (f) => (f.score || 0) >= 7,
  ).length;
  const negativeFeedbacks = totalFeedbacks - positiveFeedbacks;
  const positivePercentage =
    totalFeedbacks > 0
      ? Math.round((positiveFeedbacks / totalFeedbacks) * 100)
      : 0;
  const negativePercentage = totalFeedbacks > 0 ? 100 - positivePercentage : 0;

  return (
    <div className="space-y-8">
      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-stone-150 shadow-xs flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Smile className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
              Satisfação Geral
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl font-black text-stone-900">
                {avgSatisfactionScore}
              </span>
              <span className="text-xs text-stone-400 font-bold">/ 10 NPS</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-stone-150 shadow-xs flex items-center gap-4">
          <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
              Fidelização de Clientes
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl font-black text-stone-900">
                {totalEmailsSent}
              </span>
              <span className="text-xs text-stone-400 font-semibold">
                Envios de Recuperação
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-stone-150 shadow-xs flex items-center gap-4">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
              Carrinhos Recuperados
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl font-black text-stone-900">
                {totalEmailsRecovered}
              </span>
              <span className="text-xs text-stone-400 font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md ml-1">
                {recoveryRate}% taxa
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-stone-150 shadow-xs flex items-center gap-4">
          <div className="p-4 bg-stone-50 text-stone-600 rounded-2xl">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
              Feedbacks de Desistência
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl font-black text-stone-900">
                {totalFeedbacks}
              </span>
              <span className="text-xs text-stone-400 font-semibold">
                Formulários Respondidos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-150 shadow-xs space-y-6">
            <h3 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider pb-3 border-b border-stone-100">
              Performance de Serviço
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-stone-700 block">
                    Qualidade de Atendimento
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Feedback direto do cliente
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-base font-black text-stone-900 block">
                    {avgServiceRating} / 5.0
                  </span>
                  <div className="flex text-amber-400 gap-0.5 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${Math.round(avgServiceRating) >= s ? "fill-current" : "text-stone-200"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div>
                  <span className="text-xs font-bold text-stone-700 block">
                    Qualidade das Ofertas
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Adequação de preços e marcas
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-base font-black text-stone-900 block">
                    {avgOffersRating} / 5.0
                  </span>
                  <div className="flex text-amber-400 gap-0.5 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${Math.round(avgOffersRating) >= s ? "fill-current" : "text-stone-200"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-700">
                  Promotores (Score 7-10): {positivePercentage}%
                </span>
                <span className="text-rose-600">
                  Detratores (Score 1-6): {negativePercentage}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${positivePercentage}%` }}
                />
                <div
                  className="bg-rose-500 h-full"
                  style={{ width: `${negativePercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-150 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider pb-3 border-b border-stone-100">
              Causas de Abandono
            </h3>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-stone-700">
                  <span>💸 Preço do produto elevado</span>
                  <span className="font-mono">
                    {getReasonPercentage("price")}%
                  </span>
                </div>
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full"
                    style={{ width: `${getReasonPercentage("price")}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-bold text-stone-700">
                  <span>🚚 Custo do frete alto</span>
                  <span className="font-mono">
                    {getReasonPercentage("shipping")}%
                  </span>
                </div>
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full"
                    style={{ width: `${getReasonPercentage("shipping")}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-bold text-stone-700">
                  <span>⏱️ Prazo de entrega longo</span>
                  <span className="font-mono">
                    {getReasonPercentage("delivery_time")}%
                  </span>
                </div>
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full"
                    style={{
                      width: `${getReasonPercentage("delivery_time")}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-bold text-stone-700">
                  <span>🤷 Desisti de comprar</span>
                  <span className="font-mono">
                    {getReasonPercentage("changed_mind")}%
                  </span>
                </div>
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="bg-stone-500 h-full"
                    style={{ width: `${getReasonPercentage("changed_mind")}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-bold text-stone-700">
                  <span>📝 Outro motivo</span>
                  <span className="font-mono">
                    {getReasonPercentage("other")}%
                  </span>
                </div>
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="bg-stone-300 h-full"
                    style={{ width: `${getReasonPercentage("other")}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-150 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider pb-3 border-b border-stone-100">
              Avaliações de Desistência Recebidas
            </h3>
            {cartFeedbacks.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">
                Nenhum formulário de avaliação recebido ainda nesta sessão.
              </p>
            ) : (
              <div className="divide-y divide-stone-100 max-h-[350px] overflow-y-auto pr-2 space-y-4">
                {cartFeedbacks.map((fb) => (
                  <div key={fb.id} className="pt-4 first:pt-0 space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-xs font-bold text-stone-800">
                          {fb.email}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono block">
                          {fb.createdAt
                            ? new Date(fb.createdAt).toLocaleString("pt-BR")
                            : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            fb.score >= 8
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : fb.score >= 5
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-rose-50 text-rose-800 border border-rose-200"
                          }`}
                        >
                          Nota Geral: {fb.score} / 10
                        </span>
                      </div>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-150/60 text-xs space-y-1">
                      <div>
                        <strong className="text-stone-900">
                          Item Removido:
                        </strong>{" "}
                        <span className="text-stone-600 font-medium">
                          "{fb.productName}"
                        </span>
                      </div>
                      <div>
                        <strong className="text-stone-900">Motivo:</strong>{" "}
                        <span className="text-stone-600">
                          {fb.reason === "price" && "💸 Preço muito elevado"}
                          {fb.reason === "shipping" && "🚚 Custo de frete alto"}
                          {fb.reason === "delivery_time" &&
                            "⏱️ Prazo de entrega longo"}
                          {fb.reason === "changed_mind" &&
                            "🤷 Desistiu de comprar"}
                          {fb.reason === "other" && "📝 Outro motivo"}
                        </span>
                      </div>
                      {fb.details && (
                        <div className="mt-1.5 pt-1.5 border-t border-stone-200/50 italic text-stone-500">
                          "{fb.details}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-150 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider pb-3 border-b border-stone-100">
              Disparos de Recuperação de Carrinho
            </h3>
            {abandonedEmailLogs.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">
                Nenhum e-mail de abandono enviado ainda.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-150 text-stone-400 uppercase tracking-widest text-[9px] font-extrabold">
                      <th className="pb-3 font-bold">Destinatário</th>
                      <th className="pb-3 font-bold">Produto</th>
                      <th className="pb-3 font-bold">Preço</th>
                      <th className="pb-3 font-bold">Data de Envio</th>
                      <th className="pb-3 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {abandonedEmailLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-stone-50/50 transition-colors"
                      >
                        <td className="py-3 font-medium text-stone-800">
                          {log.email}
                        </td>
                        <td className="py-3 text-stone-600 max-w-[150px] truncate">
                          {log.productName}
                        </td>
                        <td className="py-3 font-mono font-bold text-stone-950">
                          {formatCurrency(log.productPrice)}
                        </td>
                        <td className="py-3 text-stone-400">
                          {log.sentAt
                            ? new Date(log.sentAt).toLocaleString("pt-BR")
                            : ""}
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                              log.status === "RECOVERED"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200/50"
                                : "bg-amber-50 text-amber-800 border border-amber-200/50"
                            }`}
                          >
                            {log.status === "RECOVERED"
                              ? "🎉 Recuperado"
                              : "✉️ Enviado"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminNotificationsTab() {
  const { notifications, resolveNotification } = useAppContext();

  if (notifications.length === 0) {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-12 text-center">
        <Bell className="w-8 h-8 text-stone-300 mx-auto mb-3" />
        <p className="font-bold text-stone-800 text-sm">
          Nenhuma notificação nova
        </p>
        <p className="text-xs text-stone-500 mt-1">
          O sistema está limpo e sem conflitos de duplicidade.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
        <h3 className="font-bold text-xl text-stone-900 flex items-center gap-2">
          <Bell className="text-rose-500 w-5 h-5" /> Centro de Notificações
        </h3>
        <button
          onClick={() =>
            notifications.forEach((n) => resolveNotification(n.id, "DELETE"))
          }
          className="text-xs font-bold text-rose-600 hover:underline"
        >
          Limpar todas
        </button>
      </div>

      <div className="grid gap-4">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-xl ${n.type === "DUPLICATE_FILE" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}
              >
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-stone-900 group-hover:text-rose-600 transition-colors">
                  {n.title}
                </h4>
                <p className="text-xs text-stone-500 max-w-lg">{n.message}</p>
                <div className="mt-2 flex items-center gap-3">
                  {n.data?.documentData?.url && (
                    <a
                      href={n.data.documentData.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-stone-100 border border-stone-200 text-[10px] text-stone-600 font-bold rounded-full hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition"
                    >
                      Ver Arquivo Conflitante
                    </a>
                  )}
                  <span className="text-[10px] text-stone-400 font-medium">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => resolveNotification(n.id, "KEEP")}
                className="px-4 py-2 bg-stone-50 text-stone-600 text-xs font-bold rounded-xl border border-stone-100 hover:bg-stone-100 cursor-pointer transition"
              >
                Ignorar
              </button>
              <button
                onClick={() => resolveNotification(n.id, "DELETE")}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 cursor-pointer transition shadow-sm"
              >
                Resolver
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CouponsTab() {
  const { coupons, addCoupon, updateCoupon, deleteCoupon } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState(0);
  const [minPurchaseBRL, setMinPurchaseBRL] = useState(0);
  const [active, setActive] = useState(true);
  const [editingId, setEditingId] = useState("");

  const resetForm = () => {
    setEditingId("");
    setCode("");
    setType("PERCENT");
    setValue(0);
    setMinPurchaseBRL(0);
    setActive(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      code: code.toUpperCase(),
      type,
      value,
      minPurchaseBRL,
      active,
    };
    if (editingId) {
      await updateCoupon(editingId, data);
    } else {
      await addCoupon(data);
    }
    resetForm();
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-stone-900">Cupons de Desconto</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          {showForm ? <XCircle /> : <Plus />}{" "}
          {showForm ? "Cancelar" : "Novo Cupom"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
              Código do Cupom
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50"
              placeholder="EX: BRASIL10"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50"
            >
              <option value="PERCENT">Porcentagem (%)</option>
              <option value="FIXED">Valor Fixo (R$)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
              Valor do Desconto
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              required
              className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
              Compra Mínima (R$)
            </label>
            <input
              type="number"
              value={minPurchaseBRL}
              onChange={(e) => setMinPurchaseBRL(Number(e.target.value))}
              className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              id="coupon-active"
            />
            <label
              htmlFor="coupon-active"
              className="text-sm font-bold text-stone-700"
            >
              Cupom Ativo
            </label>
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="text-stone-500 font-bold px-4"
            >
              Limpar
            </button>
            <button
              type="submit"
              className="bg-rose-500 text-white px-6 py-2 rounded-lg font-bold"
            >
              Salvar Cupom
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((c) => (
          <div
            key={c.id}
            className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm flex items-center justify-between"
          >
            <div>
              <span className="font-mono font-bold text-rose-600 block">
                {c.code}
              </span>
              <span className="text-xs text-stone-500">
                {c.type === "PERCENT" ? `${c.value}%` : formatCurrency(c.value)}{" "}
                de desconto
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-[9px] px-1.5 rounded uppercase font-black ${c.active ? "bg-emerald-100 text-emerald-600" : "bg-stone-100 text-stone-400"}`}
                >
                  {c.active ? "Ativo" : "Inativo"}
                </span>
                <span className="text-[9px] text-stone-400 font-bold">
                  Usos: {c.usageCount}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingId(c.id);
                  setCode(c.code);
                  setType(c.type);
                  setValue(c.value);
                  setMinPurchaseBRL(c.minPurchaseBRL || 0);
                  setActive(c.active);
                  setShowForm(true);
                }}
                className="p-2 text-stone-400 hover:text-indigo-600 cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteCoupon(c.id)}
                className="p-2 text-stone-400 hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShippingMethodsTab() {
  const {
    shippingMethods,
    addShippingMethod,
    updateShippingMethod,
    deleteShippingMethod,
  } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [carrier, setCarrier] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [basePriceBRL, setBasePriceBRL] = useState(0);
  const [logo, setLogo] = useState("");
  const [editingId, setEditingId] = useState("");

  const resetForm = () => {
    setEditingId("");
    setName("");
    setCarrier("");
    setEstimatedDays("");
    setBasePriceBRL(0);
    setLogo("");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name, carrier, estimatedDays, basePriceBRL, logo };
    if (editingId) {
      await updateShippingMethod(editingId, data);
    } else {
      await addShippingMethod(data);
    }
    resetForm();
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-stone-900">Métodos de Envio</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          {showForm ? <XCircle /> : <Plus />}{" "}
          {showForm ? "Cancelar" : "Novo Método"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
              Nome do Serviço
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50"
              placeholder="Ex: Econômico Aéreo"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
              Transportadora
            </label>
            <input
              type="text"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              required
              className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50"
              placeholder="Ex: USPS, FedEx, Uber Local"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
              Prazo Estimado
            </label>
            <input
              type="text"
              value={estimatedDays}
              onChange={(e) => setEstimatedDays(e.target.value)}
              required
              className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50"
              placeholder="Ex: 15-20 dias"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
              Preço Base Estimado (R$)
            </label>
            <input
              type="number"
              value={basePriceBRL}
              onChange={(e) => setBasePriceBRL(Number(e.target.value))}
              required
              className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
              Logotipo da Transportadora (Opcional)
            </label>
            <div className="flex items-center gap-4">
              {logo && (
                <img src={logo} alt="Logo" className="w-10 h-10 object-contain bg-white rounded border border-stone-200" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full rounded-lg border border-stone-200 px-4 py-1.5 text-sm bg-stone-50 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="text-stone-500 font-bold px-4"
            >
              Limpar
            </button>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold"
            >
              Salvar Método
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shippingMethods.map((m) => (
          <div
            key={m.id}
            className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {m.logo ? (
                <img src={m.logo} alt={m.carrier} className="w-10 h-10 object-contain rounded border border-stone-100 p-1" />
              ) : (
                <div className="w-10 h-10 bg-stone-100 rounded flex items-center justify-center">
                  <span className="text-stone-400 text-xs font-bold">{m.carrier.substring(0, 2).toUpperCase()}</span>
                </div>
              )}
              <div>
                <span className="font-bold text-stone-900 block">{m.name}</span>
                <span className="text-xs text-stone-500">
                  {m.carrier} | {m.estimatedDays}
                </span>
                <span className="text-[11px] font-black text-indigo-600 block mt-1">
                  Base: {formatCurrency(m.basePriceBRL)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingId(m.id);
                  setName(m.name);
                  setCarrier(m.carrier);
                  setEstimatedDays(m.estimatedDays);
                  setBasePriceBRL(m.basePriceBRL);
                  setLogo(m.logo || "");
                  setShowForm(true);
                }}
                className="p-2 text-stone-400 hover:text-indigo-600 cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteShippingMethod(m.id)}
                className="p-2 text-stone-400 hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Admin() {
  const {
    collaborator,
    user,
    orders,
    stores,
    products,
    tickets,
    reviews,
    updateOrderStatus,
    addProduct,
    updateProduct,
    deleteProduct,
    addStore,
    updateStore,
    deleteStore,
    updateTicket,
    notifications,
    systemKnowledge,
    addSystemKnowledge,
    updateSystemKnowledge,
    deleteSystemKnowledge,
  } = useAppContext();
  const [activeTab, setActiveTab] = useState<
    | "orders"
    | "products"
    | "stores"
    | "tickets"
    | "reviews"
    | "satisfaction"
    | "settings"
    | "team"
    | "shipping"
    | "highlights"
    | "quotes"
    | "documents"
    | "customers"
    | "notifications"
    | "coupons"
    | "shipping_methods"
    | "inventory"
    | "knowledge"
    | "integration_logs"
    | null
  >(null);

  const hasPermission = (perm: string) => {
    if (user?.email === "jallanluiz@gmail.com") return true;
    if (!collaborator) return false;
    // Allow access to highlights if they have products or stores permission
    if (perm === "highlights")
      return (
        collaborator.permissions.includes("products") ||
        collaborator.permissions.includes("stores")
      );
    if (perm === "satisfaction")
      return (
        collaborator.permissions.includes("reviews") ||
        collaborator.permissions.includes("settings")
      );
    return collaborator.permissions.includes(perm);
  };

  // Automatically select the first visible/permitted tab on load or profile load
  useEffect(() => {
    const tabs: (typeof activeTab)[] = [
      "orders",
      "products",
      "stores",
      "highlights",
      "tickets",
      "team",
      "shipping",
      "reviews",
      "satisfaction",
      "settings",
      "quotes",
      "documents",
      "customers",
      "coupons",
      "shipping_methods",
      "inventory",
      "knowledge",
    ];
    const allowed = tabs.find((t) => {
      if (t === "shipping") return hasPermission("orders");
      if (t === "quotes")
        return hasPermission("orders") || hasPermission("products");
      if (t === "documents") return hasPermission("orders"); // Allow access if they can see orders
      if (t === "customers") return hasPermission("orders"); // Allow access to CRM if they have orders access
      if (t === "coupons") return hasPermission("settings");
      if (t === "shipping_methods") return hasPermission("settings");
      if (t === "knowledge") return hasPermission("tickets");
      if (t === "satisfaction")
        return hasPermission("reviews") || hasPermission("settings");
      return t && hasPermission(t);
    });
    if (allowed) {
      setActiveTab(allowed);
    }
  }, [collaborator, user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-rose-500" />
          <h1 className="text-3xl font-display font-bold text-stone-900">
            Painel Administrativo
          </h1>
        </div>

        <button
          onClick={() => setActiveTab("notifications")}
          className="relative p-2 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <Bell className="w-6 h-6" />
          {notifications.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full ring-2 ring-white">
              {notifications.length}
            </span>
          )}
        </button>
      </div>

      <div className="flex border-b border-stone-200 mb-8 overflow-x-auto scrollbar-hide pb-2">
        {hasPermission("orders") && (
          <button
            onClick={() => setActiveTab("orders")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "orders" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            Pedidos
            {activeTab === "orders" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
        {hasPermission("products") && (
          <button
            onClick={() => setActiveTab("products")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "products" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            Produtos
            {activeTab === "products" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
        {hasPermission("stores") && (
          <button
            onClick={() => setActiveTab("stores")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "stores" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            Lojas
            {activeTab === "stores" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
        {hasPermission("highlights") && (
          <button
            onClick={() => setActiveTab("highlights")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "highlights" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              Destaques
            </div>
            {activeTab === "highlights" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
        {hasPermission("settings") && (
          <button
            onClick={() => setActiveTab("coupons")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "coupons" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            Cupons
            {activeTab === "coupons" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
        {hasPermission("settings") && (
          <button
            onClick={() => setActiveTab("shipping_methods")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "shipping_methods" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            Métodos frete
            {activeTab === "shipping_methods" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
        {hasPermission("tickets") && (
          <button
            onClick={() => setActiveTab("tickets")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "tickets" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            Suporte
            {activeTab === "tickets" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
        {hasPermission("team") && (
          <button
            onClick={() => setActiveTab("team")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "team" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            Equipe
            {activeTab === "team" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
        {hasPermission("orders") && (
          <button
            onClick={() => setActiveTab("shipping")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "shipping" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            Etiquetas
            {activeTab === "shipping" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
        {hasPermission("reviews") && (
          <button
            onClick={() => setActiveTab("reviews")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "reviews" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            Satisfação (Reviews)
            {activeTab === "reviews" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
        {(hasPermission("reviews") || hasPermission("settings")) && (
          <button
            onClick={() => setActiveTab("satisfaction")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "satisfaction" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            Fidelização & NPS
            {activeTab === "satisfaction" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
        {hasPermission("settings") && (
          <button
            onClick={() => setActiveTab("settings")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "settings" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            Ajustes
            {activeTab === "settings" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
        {hasPermission("settings") && (
          <button
            onClick={() => setActiveTab("integration_logs")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "integration_logs" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            Auditoria / API
            {activeTab === "integration_logs" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
        {(hasPermission("orders") || hasPermission("products")) && (
          <button
            onClick={() => setActiveTab("quotes")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "quotes" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            Orçamentos
            {activeTab === "quotes" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
        {hasPermission("orders") && (
          <button
            onClick={() => setActiveTab("documents")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "documents" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            Drive
            {activeTab === "documents" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
        {hasPermission("orders") && (
          <button
            onClick={() => setActiveTab("customers")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "customers" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            CRM
            {activeTab === "customers" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
        {hasPermission("products") && (
          <button
            onClick={() => setActiveTab("inventory")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "inventory" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            Estoque
            {activeTab === "inventory" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
        {hasPermission("tickets") && (
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === "knowledge" ? "text-rose-600" : "text-stone-500 hover:text-stone-800"}`}
          >
            IA Regenerativa
            {activeTab === "knowledge" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>
            )}
          </button>
        )}
      </div>

      {activeTab === "orders" && hasPermission("orders") && (
        <OrdersTab orders={orders} updateOrderStatus={updateOrderStatus} />
      )}
      {activeTab === "customers" && hasPermission("orders") && (
        <AdminCustomersTab />
      )}
      {activeTab === "products" && hasPermission("products") && (
        <ProductsTab
          products={products}
          stores={stores}
          addProduct={addProduct}
          updateProduct={updateProduct}
          deleteProduct={deleteProduct}
        />
      )}
      {activeTab === "stores" && hasPermission("stores") && (
        <StoresTab
          stores={stores}
          addStore={addStore}
          updateStore={updateStore}
          deleteStore={deleteStore}
        />
      )}
      {activeTab === "highlights" && hasPermission("highlights") && (
        <HighlightsTab
          products={products}
          stores={stores}
          updateProduct={updateProduct}
          updateStore={updateStore}
        />
      )}
      {activeTab === "tickets" && hasPermission("tickets") && (
        <TicketsTab tickets={tickets} updateTicket={updateTicket} />
      )}
      {activeTab === "team" && hasPermission("team") && (
        <AdminCollaboratorsTab />
      )}
      {activeTab === "shipping" && hasPermission("orders") && (
        <AdminShippingLabelsTab orders={orders} />
      )}
      {activeTab === "reviews" && hasPermission("reviews") && (
        <ReviewsTab reviews={reviews} />
      )}
      {activeTab === "satisfaction" &&
        (hasPermission("reviews") || hasPermission("settings")) && (
          <SatisfactionTab />
        )}
      {activeTab === "settings" && hasPermission("settings") && (
        <AdminSettingsTab />
      )}
      {activeTab === "integration_logs" && hasPermission("settings") && (
        <AdminIntegrationLogsTab />
      )}
      {activeTab === "quotes" &&
        (hasPermission("orders") || hasPermission("products")) && (
          <AdminQuotesTab />
        )}
      {activeTab === "documents" && hasPermission("orders") && (
        <AdminDriveTab />
      )}
      {activeTab === "notifications" && <AdminNotificationsTab />}
      {activeTab === "coupons" && hasPermission("settings") && <CouponsTab />}
      {activeTab === "shipping_methods" && hasPermission("settings") && (
        <ShippingMethodsTab />
      )}
      {activeTab === "inventory" && hasPermission("products") && (
        <InventoryTab products={products} updateProduct={updateProduct} />
      )}
      {activeTab === "knowledge" && hasPermission("tickets") && (
        <AdminKnowledgeTab
          systemKnowledge={systemKnowledge}
          addSystemKnowledge={addSystemKnowledge}
          updateSystemKnowledge={updateSystemKnowledge}
          deleteSystemKnowledge={deleteSystemKnowledge}
        />
      )}
    </div>
  );
}

function OrdersTab({
  orders,
  updateOrderStatus,
}: {
  orders: any[];
  updateOrderStatus: any;
}) {
  const { createOrder, liveDollarRate, companySettings } = useAppContext();
  const dollarRate = liveDollarRate || companySettings?.dollarRate || 5.50;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>(
    "ACTIVE_NOT_CANCELLED",
  );
  const [sortBy, setSortBy] = useState<
    "date_newest" | "date_oldest" | "value_highest" | "value_lowest"
  >("date_newest");
  const [showManualOrderModal, setShowManualOrderModal] = useState(false);
  const [manualOrderData, setManualOrderData] = useState({
    customerName: "",
    customerEmail: "",
    customerDocument: "",
    productName: "",
    value: "",
    status: "PAYMENT_RECEIVED" as OrderStatus,
  });
  const [isCreatingManual, setIsCreatingManual] = useState(false);

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !manualOrderData.customerName ||
      !manualOrderData.customerEmail ||
      !manualOrderData.value ||
      !manualOrderData.productName
    ) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsCreatingManual(true);
    try {
      const productId = Math.random().toString(36).substring(7);
      const extraFields: Partial<Order> = {
        status: manualOrderData.status,
        items: [
          {
            productId,
            quantity: 1,
            product: {
              id: productId,
              storeId: "manual",
              name: manualOrderData.productName,
              description: "Item de pedido manual",
              imageUrl:
                "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=200",
              priceUSD: parseFloat(manualOrderData.value) / dollarRate,
              priceBRL: parseFloat(manualOrderData.value),
              category: "Manual",
              stockType: "IN_STOCK",
              inventory: 1,
            },
          },
        ],
        subtotalBRL: parseFloat(manualOrderData.value),
        totalBRL: parseFloat(manualOrderData.value),
        customerDocument: manualOrderData.customerDocument,
      };

      await createOrder(
        manualOrderData.customerName,
        manualOrderData.customerEmail,
        undefined,
        0,
        extraFields,
      );
      alert("Pedido manual criado com sucesso!");
      setShowManualOrderModal(false);
      setManualOrderData({
        customerName: "",
        customerEmail: "",
        customerDocument: "",
        productName: "",
        value: "",
        status: "PAYMENT_RECEIVED",
      });
    } catch (err) {
      console.error(err);
      alert("Erro ao criar pedido manual.");
    } finally {
      setIsCreatingManual(false);
    }
  };

  // Calculates stats
  const totalAll = orders.length;
  const activeOrders = orders.filter((o) => o.status !== "CANCELLED");
  const cancelledOrders = orders.filter((o) => o.status === "CANCELLED");
  const pendingOrders = orders.filter((o) => o.status === "PENDING_PAYMENT" || o.status === "AWAITING_PRODUCT_PAYMENT");
  const paidOrders = orders.filter(
    (o) => o.status !== "CANCELLED" && o.status !== "PENDING_PAYMENT" && o.status !== "AWAITING_PRODUCT_PAYMENT",
  );

  const totalActiveCount = activeOrders.length;
  const totalCancelledCount = cancelledOrders.length;
  const totalPendingCount = pendingOrders.length;
  const totalPaidCount = paidOrders.length;

  const sumTotalBRL = activeOrders.reduce((acc, o) => acc + o.totalBRL, 0);
  const sumPaidBRL = paidOrders.reduce((acc, o) => acc + o.totalBRL, 0);
  const sumPendingBRL = pendingOrders.reduce((acc, o) => acc + o.totalBRL, 0);
  const sumCancelledBRL = cancelledOrders.reduce(
    (acc, o) => acc + o.totalBRL,
    0,
  );
  const avgTicketActiveBRL =
    totalActiveCount > 0 ? sumTotalBRL / totalActiveCount : 0;

  // Filter orders by selected search/category/tab status
  const getFilteredOrders = () => {
    let list = [...orders];

    if (selectedStatus === "ACTIVE_NOT_CANCELLED") {
      list = list.filter((o) => o.status !== "CANCELLED");
    } else if (selectedStatus !== "ALL") {
      list = list.filter((o) => o.status === selectedStatus);
    }

    // Real-time search filter matching: User, Tracking code, Value, Product
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter((o) => {
        // 1. User/Customer (Name, Email, Document/CPF, User ID)
        const matchesUser = 
          (o.customerName && o.customerName.toLowerCase().includes(term)) ||
          (o.customerEmail && o.customerEmail.toLowerCase().includes(term)) ||
          (o.customerDocument && o.customerDocument.toLowerCase().includes(term)) ||
          (o.userId && o.userId.toLowerCase().includes(term));

        // 2. Tracking Codes & IDs
        const matchesTracking = 
          (o.trackingId && o.trackingId.toLowerCase().includes(term)) ||
          (o.carrierTrackingCode && o.carrierTrackingCode.toLowerCase().includes(term)) ||
          (o.asaasPaymentId && o.asaasPaymentId.toLowerCase().includes(term));

        // 3. Value/Price (exact, decimal, formatted or localized)
        const matchesValue = 
          String(o.totalBRL).includes(term) ||
          (typeof o.totalBRL === "number" && o.totalBRL.toFixed(2).includes(term)) ||
          (typeof o.totalBRL === "number" && o.totalBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 }).toLowerCase().includes(term));

        // 4. Products in the order items
        const matchesProduct = o.items?.some((item: any) => 
          (item.product?.name && item.product.name.toLowerCase().includes(term)) ||
          (item.product?.description && item.product.description.toLowerCase().includes(term))
        );

        return matchesUser || matchesTracking || matchesValue || matchesProduct;
      });
    }

    // Sort list
    if (sortBy === "date_newest") {
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else if (sortBy === "date_oldest") {
      list.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    } else if (sortBy === "value_highest") {
      list.sort((a, b) => b.totalBRL - a.totalBRL);
    } else if (sortBy === "value_lowest") {
      list.sort((a, b) => a.totalBRL - b.totalBRL);
    }

    return list;
  };

  const filteredOrdersList = getFilteredOrders();

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Document Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("Dicas by Ale - Relatório de Desempenho", 14, 20);

    // Metadata Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    const now = new Date();
    const dateStr = now.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    doc.text(
      `Relatório oficial emitido eletronicamente em: ${dateStr}`,
      14,
      26,
    );

    // Decorative Separator Line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(14, 30, 196, 30);

    // SECTION 1: KEY PERFORMANCE PLOTS
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("1. Resumo sobre Performance Comercial", 14, 39);

    // Summary container with slate shading
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(14, 43, 182, 45, "F");

    // Grid Lines inside container
    doc.setDrawColor(230, 235, 240);
    doc.line(14, 53, 196, 53);
    doc.line(14, 63, 196, 63);
    doc.line(14, 73, 196, 73);
    doc.line(14, 83, 196, 83);

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Indicador de Desempenho", 17, 49);
    doc.text("Valor Consolidado", 150, 49);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);

    doc.text("Faturamento Líquido Ativo (Potencial)", 17, 59);
    doc.text(
      `R$ ${sumTotalBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      150,
      59,
    );

    doc.text("Faturamento Confirmado (Transações Pagas)", 17, 69);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // emerald-600
    doc.text(
      `R$ ${sumPaidBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      150,
      69,
    );

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text("Valores Sob Análise / Aguardando Pagamento", 17, 79);
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(
      `R$ ${sumPendingBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      150,
      79,
    );

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text("Faturamento Desconsiderado (Cancelados)", 17, 88);
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text(
      `R$ ${sumCancelledBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      150,
      88,
    );

    doc.setTextColor(15, 23, 42);

    // SECTION 2: VOLUME BY OPERATIONAL PIPELINE
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("2. Distribuição Quantitativa por Status Operacional", 14, 101);

    let y = 106;
    doc.setFillColor(241, 245, 249); // slate-100 header
    doc.rect(14, y, 182, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Status da Solicitação", 17, y + 5);
    doc.text("Pedidos correspondentes", 110, y + 5);
    doc.text("Faturamento Subtotal", 150, y + 5);
    y += 7;

    const pipelineStatuses = [
      {
        key: "PENDING_PAYMENT",
        label: "Aguardando Pagamento",
        color: [217, 119, 6],
      },
      {
        key: "PREPAYMENT_RECEIVED",
        label: "Taxa de Serviço Confirmada",
        color: [16, 185, 129],
      },
      {
        key: "AWAITING_PRODUCT_PAYMENT",
        label: "Aguardando Pagamento do Produto",
        color: [217, 119, 6],
      },
      {
        key: "PRODUCT_PAYMENT_RECEIVED",
        label: "Pagamento do Produto Confirmado",
        color: [16, 185, 129],
      },
      {
        key: "PAYMENT_RECEIVED",
        label: "Pagamento Confirmado",
        color: [16, 185, 129],
      },
      {
        key: "PURCHASED_IN_STORE",
        label: "Comprado na Loja Gringa",
        color: [37, 99, 235],
      },
      {
        key: "STORED_IN_US",
        label: "Armazenado no CD EUA",
        color: [79, 70, 229],
      },
      { key: "SHIPPING_PAID", label: "Frete Pago", color: [16, 185, 129] },
      {
        key: "IN_TRANSIT_TO_BR",
        label: "Em Trâmite Internacional",
        color: [124, 58, 237],
      },
      {
        key: "ARRIVED_IN_BR",
        label: "Chegou no Brasil",
        color: [13, 148, 136],
      },
      {
        key: "DELIVERED",
        label: "Entregue ao Destinatário",
        color: [15, 23, 42],
      },
      {
        key: "CANCELLED",
        label: "Cancelado (Excluído dos Ativos)",
        color: [225, 29, 72],
      },
    ];

    pipelineStatuses.forEach((pState) => {
      const stateOrders = orders.filter((o) => o.status === pState.key);
      const count = stateOrders.length;
      const sumBRL = stateOrders.reduce((acc, o) => acc + o.totalBRL, 0);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(pState.label, 17, y + 5);
      doc.text(`${count} pedidos`, 110, y + 5);

      const color = pState.color;
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont("helvetica", "bold");
      doc.text(
        `R$ ${sumBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        150,
        y + 5,
      );

      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 7, 196, y + 7);
      y += 7;
    });

    // Ticket metrics
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`Ticket Médio de Vendas Ativas:`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      `R$ ${avgTicketActiveBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} por transação`,
      68,
      y,
    );

    // SECTION 3: DETAILED GRID FOR VERIFICATION on next page
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("3. Tabela Detalhada de Solicitações Ativas", 14, 20);

    let y_detail = 27;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y_detail, 182, 7, "F");

    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Código", 16, y_detail + 5);
    doc.text("Nome do Cliente / E-mail cadastrado", 46, y_detail + 5);
    doc.text("Status Atual", 126, y_detail + 5);
    doc.text("Faturamento", 166, y_detail + 5);
    y_detail += 7;

    const activeList = orders.filter((o) => o.status !== "CANCELLED");
    if (activeList.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Não há nenhuma solicitação ativa cadastrada no momento.",
        17,
        y_detail + 5,
      );
    } else {
      activeList.forEach((o) => {
        if (y_detail > 272) {
          doc.addPage();
          y_detail = 20;

          // Repeat headers on overflow page
          doc.setFillColor(241, 245, 249);
          doc.rect(14, y_detail, 182, 7, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          doc.text("Código", 16, y_detail + 5);
          doc.text("Nome do Cliente / E-mail cadastrado", 46, y_detail + 5);
          doc.text("Status Atual", 126, y_detail + 5);
          doc.text("Faturamento", 166, y_detail + 5);
          y_detail += 7;
        }

        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(o.trackingId, 16, y_detail + 5);

        doc.setFont("helvetica", "normal");
        const limitEmail =
          o.customerEmail.length > 22
            ? `${o.customerEmail.substring(0, 20)}...`
            : o.customerEmail;
        doc.text(
          `${o.customerName.substring(0, 20)} (${limitEmail})`,
          46,
          y_detail + 5,
        );

        // Map status key to translated label
        const sObj = pipelineStatuses.find((p) => p.key === o.status);
        const stLabel = sObj ? sObj.label : o.status;
        doc.text(stLabel, 126, y_detail + 5);

        doc.setFont("helvetica", "bold");
        doc.text(
          `R$ ${o.totalBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          166,
          y_detail + 5,
        );

        doc.setDrawColor(248, 250, 252);
        doc.line(14, y_detail + 7, 196, y_detail + 7);
        y_detail += 7;
      });
    }

    doc.save(
      `importagringa_relatorio_desempenho_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}.pdf`,
    );
  };

  const statusTabItems = [
    {
      id: "ACTIVE_NOT_CANCELLED",
      label: "Ativos (Sem Cancelados)",
      count: totalActiveCount,
      icon: CheckCircle,
    },
    { id: "ALL", label: "Todos os Pedidos", count: totalAll, icon: Filter },
    {
      id: "PENDING_PAYMENT",
      label: "Aguardando Pagamento",
      count: totalPendingCount,
      icon: AlertCircle,
    },
    {
      id: "PAYMENT_RECEIVED",
      label: "Pagamento Confirmado",
      count: totalPaidCount,
      icon: CheckCircle,
    },
    {
      id: "PURCHASED_IN_STORE",
      label: "Comprado na Loja",
      count: orders.filter((o) => o.status === "PURCHASED_IN_STORE").length,
      icon: StoreIcon,
    },
    {
      id: "STORED_IN_US",
      label: "Armazenado nos EUA",
      count: orders.filter((o) => o.status === "STORED_IN_US").length,
      icon: StoreIcon,
    },
    {
      id: "IN_TRANSIT_TO_BR",
      label: "Em Trânsito para BR",
      count: orders.filter((o) => o.status === "IN_TRANSIT_TO_BR").length,
      icon: FileText,
    },
    {
      id: "ARRIVED_IN_BR",
      label: "No Brasil",
      count: orders.filter((o) => o.status === "ARRIVED_IN_BR").length,
      icon: FileText,
    },
    {
      id: "DELIVERED",
      label: "Entregue",
      count: orders.filter((o) => o.status === "DELIVERED").length,
      icon: CheckCircle,
    },
    {
      id: "CANCELLED",
      label: "Cancelados (Separado)",
      count: totalCancelledCount,
      icon: XCircle,
    },
  ];

  if (orders.length === 0)
    return (
      <div className="text-gray-500 py-8">Nenhum pedido recebido ainda.</div>
    );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. KPI PERFORMANCE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-stone-500 block uppercase tracking-wider">
              Faturamento Confirmado
            </span>
            <span className="text-2xl font-black text-emerald-600 block">
              {formatCurrency(sumPaidBRL)}
            </span>
            <span className="text-[11px] text-stone-400 block">
              {totalPaidCount} transações pagas
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-stone-500 block uppercase tracking-wider">
              Aguardando Pagamento
            </span>
            <span className="text-2xl font-black text-amber-600 block">
              {formatCurrency(sumPendingBRL)}
            </span>
            <span className="text-[11px] text-stone-400 block">
              {totalPendingCount} pedidos aguardando pix/sinal
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-stone-500 block uppercase tracking-wider">
              Ticket Médio Ativo
            </span>
            <span className="text-2xl font-black text-indigo-600 block">
              {formatCurrency(avgTicketActiveBRL)}
            </span>
            <span className="text-[11px] text-stone-400 block block">
              Média de valor por envio
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-1">
            <span className="text-xs font-bold text-stone-500 block uppercase tracking-wider">
              Relatório de Negócio
            </span>
            <span className="text-sm font-semibold text-stone-800 block">
              PDF Completo e Detalhado
            </span>
            <button
              onClick={handleDownloadPDF}
              className="mt-2 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" /> Gerar PDF do Dia
            </button>
          </div>
          <div className="p-3 bg-rose-50 text-rose-500 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. ORDER LIST BY STATUS SUB-TABS */}
      <div>
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-bold text-stone-900">
              Gerenciar Encomendas
            </h3>
            <p className="text-xs text-stone-500">
              Separado e organizado por etapa operacional
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowManualOrderModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm shadow-indigo-100"
            >
              <Plus className="w-4 h-4" /> Novo Pedido Manual
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-500">
                Ordenar por:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border border-stone-200 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:ring-rose-500 focus:border-rose-500 outline-none"
              >
                <option value="date_newest">Mais recente</option>
                <option value="date_oldest">Mais antigo</option>
                <option value="value_highest">Maior valor</option>
                <option value="value_lowest">Menor valor</option>
              </select>
            </div>
          </div>
        </div>

        {/* Barra de Pesquisa de Pedidos */}
        <div className="mb-5">
          <div className="relative flex items-center bg-white border border-stone-200 rounded-2xl shadow-xs transition-all focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-100 p-1 pl-4 pr-2 w-full max-w-2xl">
            <Search className="w-4 h-4 text-stone-400 shrink-0 mr-3" />
            <input
              type="text"
              placeholder="Pesquisar por usuário, rastreio, valor ou produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm text-stone-800 outline-none placeholder-stone-400 font-medium py-2"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="p-1.5 hover:bg-stone-100 rounded-xl text-stone-400 hover:text-stone-600 transition"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="mt-2 flex items-center gap-2 text-xs font-bold text-stone-500 pl-1 animate-fade-in">
              <span className="inline-block w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
              <span>{filteredOrdersList.length} itens correspondentes para "{searchTerm}"</span>
            </div>
          )}
        </div>

        <div className="flex border-b border-stone-200 pb-px overflow-x-auto gap-3 scrollbar-hide py-1">
          {statusTabItems.map((tab) => {
            const TabIcon = tab.icon;
            const isSelected = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`whitespace-nowrap px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer relative ${
                  isSelected
                    ? "bg-rose-600 text-white shadow-sm shadow-rose-100"
                    : "bg-stone-50 text-stone-500 hover:bg-stone-100/80 border border-stone-200"
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-stone-200 text-stone-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CONDITIONAL RENDER BY FILTER */}
      {filteredOrdersList.length === 0 ? (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-12 text-center">
          <Filter className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <p className="font-bold text-stone-800 text-sm">
            Nenhum pedido encontrado nesta seção
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Nenhum pedido operacional com esse status foi localizado.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrdersList.map((order) => (
            <OrderAdminCard
              key={order.id}
              order={order}
              updateOrderStatus={updateOrderStatus}
            />
          ))}
        </div>
      )}

      {/* Manual Order Modal */}
      {showManualOrderModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 p-8 max-w-lg w-full shadow-2xl relative animate-scale-up overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setShowManualOrderModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
            >
              <XCircle className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-stone-900">
                  Novo Pedido Manual
                </h3>
                <p className="text-xs text-stone-500">
                  Crie um registro de compra manual para rastreio
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateManualOrder} className="space-y-5">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualOrderData.customerName}
                    onChange={(e) =>
                      setManualOrderData({
                        ...manualOrderData,
                        customerName: e.target.value,
                      })
                    }
                    className="w-full bg-stone-50 border border-stone-200 text-sm rounded-xl px-4 py-2.5 focus:ring-rose-500 outline-none"
                    placeholder="Nome completo"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      required
                      value={manualOrderData.customerEmail}
                      onChange={(e) =>
                        setManualOrderData({
                          ...manualOrderData,
                          customerEmail: e.target.value,
                        })
                      }
                      className="w-full bg-stone-50 border border-stone-200 text-sm rounded-xl px-4 py-2.5 focus:ring-rose-500 outline-none"
                      placeholder="cliente@email.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                      CPF/Documento
                    </label>
                    <input
                      type="text"
                      value={manualOrderData.customerDocument}
                      onChange={(e) =>
                        setManualOrderData({
                          ...manualOrderData,
                          customerDocument: e.target.value,
                        })
                      }
                      className="w-full bg-stone-50 border border-stone-200 text-sm rounded-xl px-4 py-2.5 focus:ring-rose-500 outline-none"
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                    Descrição do Produto/Lote *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualOrderData.productName}
                    onChange={(e) =>
                      setManualOrderData({
                        ...manualOrderData,
                        productName: e.target.value,
                      })
                    }
                    className="w-full bg-stone-50 border border-stone-200 text-sm rounded-xl px-4 py-2.5 focus:ring-rose-500 outline-none"
                    placeholder="Ex: iPhone 15 Pro Max 256GB"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                      Valor Total (R$) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={manualOrderData.value}
                      onChange={(e) =>
                        setManualOrderData({
                          ...manualOrderData,
                          value: e.target.value,
                        })
                      }
                      className="w-full bg-stone-50 border border-stone-200 text-sm rounded-xl px-4 py-2.5 focus:ring-rose-500 outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                      Status Inicial
                    </label>
                    <select
                      value={manualOrderData.status}
                      onChange={(e) =>
                        setManualOrderData({
                          ...manualOrderData,
                          status: e.target.value as OrderStatus,
                        })
                      }
                      className="w-full bg-stone-50 border border-stone-200 text-sm rounded-xl px-4 py-2.5 focus:ring-rose-500 outline-none"
                    >
                      <option value="PENDING_PAYMENT">Aguardando Pagamento</option>
                      <option value="PREPAYMENT_RECEIVED">
                        Pagamento de taxa de serviço personalizado confirmada
                      </option>
                      <option value="AWAITING_PRODUCT_PAYMENT">
                        Aguardando pagamento do produto
                      </option>
                      <option value="PRODUCT_PAYMENT_RECEIVED">
                        Pagamento do produto confirmado
                      </option>
                      <option value="PAYMENT_RECEIVED">
                        Pagamento Confirmado (Sinal 30% ou Total)
                      </option>
                      <option value="PURCHASED_IN_STORE">
                        Comprado na Loja (Pronto para Adicionar Foto da Nota/Produto)
                      </option>
                      <option value="STORED_IN_US">Armazenado no CD dos EUA</option>
                      <option value="SHIPPING_PAID">Frete Pago (Confirmado)</option>
                      <option value="IN_TRANSIT_TO_BR">
                        Em trâmite para o Brasil (Despachado)
                      </option>
                      <option value="ARRIVED_IN_BR">Chegou no Brasil</option>
                      <option value="DELIVERED">Entregue ao Cliente</option>
                      <option value="CANCELLED">Cancelado</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowManualOrderModal(false)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-3 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingManual}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-100"
                >
                  {isCreatingManual ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Criar Pedido"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderAdminCard({
  order,
  updateOrderStatus,
}: {
  key?: React.Key;
  order: any;
  updateOrderStatus: any;
}) {
  const { companySettings, autoSaveUserDocument, syncOrderWithERPs, profiles } =
    useAppContext();
  const customerProfile = profiles?.find((p: any) => p.userId === order.userId || p.userId === order.customerEmail) || null;
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [note, setNote] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [onDemandProductCostBRL, setOnDemandProductCostBRL] = useState(
    order.onDemandProductCostBRL || 0,
  );
  const [finalShippingFeeBRL, setFinalShippingFeeBRL] = useState(
    order.finalShippingFeeBRL || order.shippingFeeBRL || 0,
  );
  const [carrierName, setCarrierName] = useState(order.carrierName || "");
  const [carrierTrackingCode, setCarrierTrackingCode] = useState(
    order.carrierTrackingCode || "",
  );

  // States for Invoice and documents upload
  const [invoiceBase64, setInvoiceBase64] = useState<string>(
    order.invoiceBase64 || "",
  );
  const [invoiceName, setInvoiceName] = useState<string>(
    order.invoiceName || "",
  );
  const [danfeBase64, setDanfeBase64] = useState<string>(
    order.danfeBase64 || "",
  );
  const [danfeName, setDanfeName] = useState<string>(order.danfeName || "");
  const [customsBase64, setCustomsBase64] = useState<string>(
    order.customsBase64 || "",
  );
  const [customsName, setCustomsName] = useState<string>(
    order.customsName || "",
  );
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);

  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSendInvoiceEmail = async () => {
    const activeInvoiceB64 = invoiceBase64 || order.invoiceBase64;
    const activeDanfeB64 = danfeBase64 || order.danfeBase64;
    const activeCustomsB64 = customsBase64 || order.customsBase64;

    if (!activeInvoiceB64 && !activeDanfeB64 && !activeCustomsB64) {
      alert(
        "Por favor, selecione e anexe pelo menos um documento (Nota Fiscal, DANFE ou Trâmites EUA) antes de disparar o e-mail.",
      );
      return;
    }

    setIsSendingInvoice(true);
    try {
      // Primeiro salvamos os nomes dos documentos no pedido (evitando salvar os dados pesados base64 no banco de dados)
      const extraPayload: any = {
        invoiceName: invoiceName || order.invoiceName || "",
        danfeName: danfeName || order.danfeName || "",
        customsName: customsName || order.customsName || "",
      };

      // Persiste os nomes no banco de dados
      await updateOrderStatus(
        order.id,
        order.status,
        "Salvando nomes dos documentos...",
        "",
        undefined,
        extraPayload,
      );

      // Disparamos o e-mail passando os dados Base64 diretamente no corpo do POST
      const res = await fetch("/api/orders/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          invoiceBase64: activeInvoiceB64 || "",
          invoiceName: invoiceName || order.invoiceName || "",
          danfeBase64: activeDanfeB64 || "",
          danfeName: danfeName || order.danfeName || "",
          customsBase64: activeCustomsB64 || "",
          customsName: customsName || order.customsName || "",
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro no envio do e-mail.");
      }

      alert(
        "Sucesso! E-mail pré-configurado contendo a Nota Fiscal/DANFE anexada foi disparado com sucesso ao cliente.",
      );
    } catch (err: any) {
      alert("Falha ao enviar e-mail: " + err.message);
    } finally {
      setIsSendingInvoice(false);
    }
  };

  // Calculate defaults from order items
  const autoCalculatedDimensions = React.useMemo(() => {
    let totalWeight = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;

    if (order.items && order.items.length > 0) {
      order.items.forEach((item: any) => {
        const qty = item.quantity || 1;
        const p = item.product;
        if (p) {
          totalWeight += (p.boxWeight || 0) * qty;
          maxLength = Math.max(maxLength, p.boxLength || 0);
          maxWidth = Math.max(maxWidth, p.boxWidth || 0);
          totalHeight += (p.boxHeight || 0) * qty;
        }
      });
    }

    return {
      length: maxLength || 0,
      width: maxWidth || 0,
      height: totalHeight || 0,
      weight: totalWeight || 0,
    };
  }, [order.items]);

  // Dimension states
  const [length, setLength] = useState(order.packageDimensions?.length || autoCalculatedDimensions.length);
  const [width, setWidth] = useState(order.packageDimensions?.width || autoCalculatedDimensions.width);
  const [height, setHeight] = useState(order.packageDimensions?.height || autoCalculatedDimensions.height);
  const [weight, setWeight] = useState(order.packageWeight || autoCalculatedDimensions.weight);
  const [storageFeeBRL, setStorageFeeBRL] = useState(order.storageFeeBRL || 0);

  const signatureRef = useRef<SignatureCanvas>(null);
  const currentEvent = order.history[0];

  // Use the new calculateStorageFee method from utils
  useEffect(() => {
    // Find customer profile using useAppContext? No, we don't have it directly. Let's pass it if possible, or just default to company settings
    const fee = calculateStorageFee(
      order,
      companySettings || null,
      customerProfile
    );
    // Add existing order storageFeeBRL in case it was modified? No, the new calculation is dynamic and overrides.
    // Wait, if we want this to update live we should use it. 
    // Wait, calculateStorageFee uses order.storedAtUS which might not exist until the status is saved.
    // Let's use the new function, but also allow manual override?
    
    // Actually, let's keep the manual input state but suggest the calculated one? No, we want it automatic.
    // Let's just set the state if it's > 0
    if (fee > 0) {
      setStorageFeeBRL(Number(fee.toFixed(2)));
    } else if (order.storageFeeBRL) {
      setStorageFeeBRL(order.storageFeeBRL);
    }
  }, [order, companySettings]);

  // Auto-calculate shipping fee based on dimensions and weight when autoRates simulation is active
  useEffect(() => {
    if (companySettings?.enableAutoRates) {
      if (length > 0 || width > 0 || height > 0 || weight > 0) {
        // IATA Volumetric Weight formula: (L * W * H) / 5000
        const volumetricWeight = (length * width * height) / 5000;
        const chargeableWeight = Math.max(weight, volumetricWeight);
        // Base rate: R$ 50 + R$ 80 per chargeable kg
        const calculatedShipping = Math.round((50 + chargeableWeight * 80) * 100) / 100;
        
        // Only update if finalShippingFeeBRL is currently 0 or has not been customized/set in the db
        if (!order.finalShippingFeeBRL || finalShippingFeeBRL === 0 || finalShippingFeeBRL === order.shippingFeeBRL) {
          setFinalShippingFeeBRL(calculatedShipping);
        }
      }
    }
  }, [length, width, height, weight, companySettings?.enableAutoRates, order.finalShippingFeeBRL, order.shippingFeeBRL, finalShippingFeeBRL]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    let receipt = undefined;

    const targetUserId = order.userId || order.customerEmail || "convidado";
    const userName = order.customerName || "Cliente";

    if (status === "DELIVERED") {
      if (signatureRef.current && !signatureRef.current.isEmpty()) {
        const signatureUrl = signatureRef.current.toDataURL();
        receipt = {
          id: Math.random().toString(36).substr(2, 9).toUpperCase(),
          signatureUrl,
          generatedAt: new Date().toISOString(),
        };
        // Auto-save delivery receipt image
        await autoSaveUserDocument(
          targetUserId,
          userName,
          "Recibos de Entrega",
          `Recibo de Entrega - Pedido ${order.id}.png`,
          signatureUrl,
        );
      } else if (!order.receipt) {
        return alert(
          "Por favor, colete a assinatura do cliente para concluir a entrega.",
        );
      }
    }

    const extraFields: any = {};
    if (status === "SHIPPING_PAID") {
      extraFields.shippingPaid = true;
    }

    extraFields.storageFeeBRL = storageFeeBRL;

    if (status === "STORED_IN_US") {
      extraFields.packageDimensions = { length, width, height };
      extraFields.packageWeight = weight;
      if (!order.storedAtUS) extraFields.storedAtUS = new Date().toISOString();
    }
    
    if (status === "ARRIVED_IN_BR") {
      if (!order.storedAtBR) extraFields.storedAtBR = new Date().toISOString();
    }

    extraFields.onDemandProductCostBRL = onDemandProductCostBRL;
    extraFields.totalBRL = calculatedTotal;

    // Document persistence (only persist the filenames, never the heavy base64 strings in the database)
    extraFields.invoiceName = invoiceName;
    extraFields.danfeName = danfeName;
    extraFields.customsName = customsName;
    extraFields.carrierName = carrierName;
    extraFields.carrierTrackingCode = carrierTrackingCode;

    // Se admin anexar foto ou comprovante junto (relatório fotográfico)
    if (photoUrl) {
      await autoSaveUserDocument(
        targetUserId,
        userName,
        "Relatórios Fotográficos",
        `Anexo - Pedido ${order.id} - ${new Date().toLocaleDateString()}`,
        photoUrl,
      );
    }

    await updateOrderStatus(
      order.id,
      status,
      note,
      photoUrl,
      receipt,
      extraFields,
    );
    setNote("");
    setPhotoUrl("");
    alert("Status atualizado com sucesso!");
  };

  // Calculation for the preview table
  const currentSubtotal = order.subtotalBRL;
  const currentServiceFee = order.serviceFeeBRL;
  const effectiveShipping =
    finalShippingFeeBRL > 0 && status !== "PENDING_PAYMENT"
      ? finalShippingFeeBRL
      : order.shippingFeeBRL;
  const currentAppFee = order.appFeeBRL || 0;

  // Use local storageFeeBRL if status is STORED_IN_US or if it was already saved
  const effectiveStorage =
    status === "STORED_IN_US" || order.storageFeeBRL > 0
      ? storageFeeBRL
      : order.storageFeeBRL;

  const calculatedTotal =
    currentSubtotal +
    currentServiceFee +
    effectiveStorage +
    effectiveShipping +
    currentAppFee +
    (order.prepaymentFee || 0) +
    onDemandProductCostBRL;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="font-mono font-bold text-indigo-700 tracking-wider bg-indigo-100 px-2 py-1 rounded inline-block text-xs mb-1">
            {order.trackingId}
          </div>
          <div className="font-semibold text-gray-900">
            {order.customerName}
          </div>
          <div className="text-sm text-gray-500">{order.customerEmail}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">
            Valor Atualizado (Base e Taxas)
          </div>
          <div className="font-bold text-gray-900 text-lg">
            {formatCurrency(calculatedTotal)}
          </div>
          {order.prepaymentFee > 0 && onDemandProductCostBRL > 0 && (
            <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 font-semibold mt-1 inline-block">
              Sinal Já Pago: {formatCurrency(order.prepaymentFee)} | A Pagar: {formatCurrency(onDemandProductCostBRL)}
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={handleUpdate}
        className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start"
      >
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">
            Status Atual
          </h4>

          {/* Entrega Personalizada Instructions */}
          {order.customDeliveryRequested && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2 mb-4">
              <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-[10px] uppercase tracking-widest">
                <Truck className="w-3.5 h-3.5 shrink-0" />
                Instruções de Entrega Personalizada
              </div>
              <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                {order.customDeliveryInstructions || "Nenhuma instrução fornecida."}
              </p>
            </div>
          )}

          <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                Rastreio da Transportadora (Definido pelo Cliente)
              </h5>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 bg-white p-2 border border-stone-100 rounded-lg">
                <span className="text-[9px] font-bold text-stone-400 uppercase block">
                  Transportadora Selecionada
                </span>
                <span className="text-xs font-semibold text-stone-800 block truncate">
                  {order.carrierName || order.shippingMethod?.carrier || "Não especificada"}
                </span>
              </div>
              <div className="space-y-1 bg-white p-2 border border-stone-100 rounded-lg">
                <span className="text-[9px] font-bold text-stone-400 uppercase block">
                  Código de Rastreio Oficial
                </span>
                <span className="text-xs font-mono font-semibold text-stone-800 block truncate">
                  {order.carrierTrackingCode || "Pendente"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 text-green-800 text-sm p-3 rounded-lg border border-green-200">
            <span className="font-bold block mb-1">Última atualização:</span>
            <span className="font-mono text-xs text-green-700">
              {new Date(currentEvent.date).toLocaleString()}
            </span>
            <p className="mt-1 font-medium">{ADMIN_STATUS_LABELS[order.status as OrderStatus] || order.status}</p>
          </div>

          {/* ERP Integrations Sync Status */}
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                Sincronização ERP
              </h5>
              <button
                type="button"
                onClick={async () => {
                  setIsSyncing(true);
                  try {
                    await syncOrderWithERPs(order.id);
                  } finally {
                    setIsSyncing(false);
                  }
                }}
                disabled={isSyncing || order.status !== "PAYMENT_RECEIVED"}
                className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`}
                />
                {isSyncing ? "Sincronizando..." : "Sincronizar Agora"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-white rounded border border-stone-100 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-stone-500">
                    AdminHub
                  </span>
                  {order.integrationSync?.adminHub?.status === "SUCCESS" ? (
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                  ) : order.integrationSync?.adminHub?.status === "FAILED" ? (
                    <XCircle className="w-3 h-3 text-rose-500" />
                  ) : (
                    <Clock className="w-3 h-3 text-amber-500" />
                  )}
                </div>
                <div className="text-[10px] font-bold text-stone-800">
                  {order.integrationSync?.adminHub?.status || "PENDENTE"}
                </div>
                {order.integrationSync?.adminHub?.syncedAt && (
                  <div className="text-[8px] text-stone-400 mt-0.5">
                    {new Date(
                      order.integrationSync.adminHub.syncedAt,
                    ).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="p-2 bg-white rounded border border-stone-100 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-stone-500">
                    Nexus ERP
                  </span>
                  {order.integrationSync?.nexus?.status === "SUCCESS" ? (
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                  ) : order.integrationSync?.nexus?.status === "FAILED" ? (
                    <XCircle className="w-3 h-3 text-rose-500" />
                  ) : (
                    <Clock className="w-3 h-3 text-amber-500" />
                  )}
                </div>
                <div className="text-[10px] font-bold text-stone-800">
                  {order.integrationSync?.nexus?.status || "PENDENTE"}
                </div>
                {order.integrationSync?.nexus?.syncedAt && (
                  <div className="text-[8px] text-stone-400 mt-0.5">
                    {new Date(
                      order.integrationSync.nexus.syncedAt,
                    ).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {(order.integrationSync?.adminHub?.error ||
              order.integrationSync?.nexus?.error) && (
              <div className="bg-rose-50 p-2 rounded text-[10px] text-rose-600 border border-rose-100">
                <span className="font-bold block">
                  Erro na última tentativa:
                </span>
                <p className="line-clamp-2">
                  {order.integrationSync?.adminHub?.error ||
                    order.integrationSync?.nexus?.error}
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 space-y-4">
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
              <h4 className="font-bold text-sm mb-2 text-stone-800">
                Valor do Produto (Para compras sob encomenda)
              </h4>
              <p className="text-[11px] text-stone-500 mb-3 leading-relaxed">
                Insira aqui o valor final da mercadoria adquirida nas lojas para
                cobrança, caso o cliente tenha pago apenas a taxa de serviço
                (Sinal inicial).
              </p>
              <div className="relative">
                <span className="absolute left-3 top-2 text-stone-400 text-sm">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={onDemandProductCostBRL}
                  onChange={(e) =>
                    setOnDemandProductCostBRL(Number(e.target.value))
                  }
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-stone-200 focus:ring-indigo-500 text-sm font-bold bg-white"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Novo Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 border"
              >
                <option value="PENDING_PAYMENT">Aguardando Pagamento</option>
                <option value="PREPAYMENT_RECEIVED">
                  Pagamento de taxa de serviço personalizado confirmada
                </option>
                <option value="AWAITING_PRODUCT_PAYMENT">
                  Aguardando pagamento do produto
                </option>
                <option value="PRODUCT_PAYMENT_RECEIVED">
                  Pagamento do produto confirmado
                </option>
                <option value="PAYMENT_RECEIVED">
                  Pagamento Confirmado (Sinal 30% ou Total)
                </option>
                <option value="PURCHASED_IN_STORE">
                  Comprado na Loja (Pronto para Adicionar Foto da Nota/Produto)
                </option>
                <option value="STORED_IN_US">Armazenado no CD dos EUA</option>
                <option value="SHIPPING_PAID">Frete Pago (Confirmado)</option>
                <option value="IN_TRANSIT_TO_BR">
                  Em trâmite para o Brasil (Despachado)
                </option>
                <option value="ARRIVED_IN_BR">Chegou no Brasil</option>
                <option value="DELIVERED">Entregue ao Cliente</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações (Visível para Cliente)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 border"
                placeholder="Ex: Produto comprado na Apple Store, segue foto da nota."
              />
            </div>

            {status === "STORED_IN_US" && (
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 mt-4 space-y-4 animate-fade-in shadow-sm">
                <div className="flex items-center justify-between text-indigo-900 mb-1">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5" />
                    <h4 className="font-bold text-sm leading-none">
                      Cálculo de Armazenagem
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLength(autoCalculatedDimensions.length);
                      setWidth(autoCalculatedDimensions.width);
                      setHeight(autoCalculatedDimensions.height);
                      setWeight(autoCalculatedDimensions.weight);
                    }}
                    className="text-[9px] bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-2 py-1 rounded font-bold transition-all uppercase tracking-wider"
                    title="Preenche automaticamente com base no catálogo de produtos cadastrados"
                  >
                    Recarregar do Catálogo
                  </button>
                </div>
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  Insira as dimensões do pacote para calcular a taxa de
                  armazenagem (Baseada em R${" "}
                  {companySettings?.storageRatePerM2 || 150}/m²).
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">
                      Comp. (cm)
                    </label>
                    <input
                      type="number"
                      value={length}
                      onChange={(e) => setLength(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">
                      Larg. (cm)
                    </label>
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">
                      Alt. (cm)
                    </label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm bg-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">
                      Peso (kg)
                    </label>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">
                      Taxa Calculada
                    </label>
                    <div className="w-full px-3 py-2 rounded-lg border border-indigo-300 text-sm bg-indigo-100 font-bold text-indigo-900">
                      {formatCurrency(storageFeeBRL)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <ImageInput
                label="Relatório Fotográfico (Opcional)"
                value={photoUrl}
                onChange={setPhotoUrl}
              />
              <p className="text-xs text-gray-500 mt-1">
                Faça upload ou cole a URL de uma foto para incluir no relatório
                do cliente (ex: comprovante, foto da caixa, etc).
              </p>
            </div>

            {/* Seção de Faturamento & Documentos de Importação */}
            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 mt-6 space-y-4 shadow-sm text-stone-800">
              <div className="flex items-center gap-2 border-b border-stone-200 pb-2 mb-1">
                <FileText className="w-5 h-5 text-indigo-600 animate-pulse" />
                <div>
                  <h4 className="font-bold text-sm leading-none text-stone-900">
                    Faturamento & Documentos de Envio
                  </h4>
                  <p className="text-[10px] text-stone-500 mt-1">
                    Anexe Notas Fiscais (PDF), DANFE ou trâmites de importação
                    EUA/Brasil
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* 1. Nota Fiscal principal */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Nota Fiscal Eletrônica (PDF)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setInvoiceName(file.name);
                          const b64 = await fileToDataURL(file);
                          setInvoiceBase64(b64);
                        }
                      }}
                      className="hidden"
                      id={`invoice-upload-${order.id}`}
                    />
                    <label
                      htmlFor={`invoice-upload-${order.id}`}
                      className="cursor-pointer bg-white px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-bold text-stone-700 hover:bg-stone-50 flex items-center gap-1 shadow-sm transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-stone-500" />
                      {invoiceName ? "Substituir" : "Selecionar PDF"}
                    </label>
                    {invoiceName && (
                      <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 truncate flex-1 block">
                        {invoiceName}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. DANFE (Brasil) */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    DANFE Governamental (Brasil)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setDanfeName(file.name);
                          const b64 = await fileToDataURL(file);
                          setDanfeBase64(b64);
                        }
                      }}
                      className="hidden"
                      id={`danfe-upload-${order.id}`}
                    />
                    <label
                      htmlFor={`danfe-upload-${order.id}`}
                      className="cursor-pointer bg-white px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-bold text-stone-700 hover:bg-stone-50 flex items-center gap-1 shadow-sm transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-stone-500" />
                      {danfeName ? "Substituir" : "Selecionar PDF"}
                    </label>
                    {danfeName && (
                      <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 truncate flex-1 block">
                        {danfeName}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Documentação Alfandegária (EUA/BR) */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Documentos Alfandegários / Trâmites EUA
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCustomsName(file.name);
                          const b64 = await fileToDataURL(file);
                          setCustomsBase64(b64);
                        }
                      }}
                      className="hidden"
                      id={`customs-upload-${order.id}`}
                    />
                    <label
                      htmlFor={`customs-upload-${order.id}`}
                      className="cursor-pointer bg-white px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-bold text-stone-700 hover:bg-stone-50 flex items-center gap-1 shadow-sm transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-stone-500" />
                      {customsName ? "Substituir" : "Selecionar PDF"}
                    </label>
                    {customsName && (
                      <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 truncate flex-1 block">
                        {customsName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botão de Envio por E-mail em 1 Clique */}
              <div className="pt-3 border-t border-stone-200 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSendInvoiceEmail}
                  disabled={isSendingInvoice}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition text-xs shadow-sm cursor-pointer"
                >
                  <Mail className="h-4 w-4" />
                  {isSendingInvoice
                    ? "Expedindo Documentos por E-mail..."
                    : "Disparar Nota Fiscal por E-mail ao Cliente"}
                </button>
                {(order.invoiceEmailSent || isSendingInvoice) && (
                  <p className="text-[10px] text-emerald-600 text-center font-bold">
                    ✓ Enviado por e-mail em:{" "}
                    {order.invoiceEmailSentAt
                      ? new Date(order.invoiceEmailSentAt).toLocaleString()
                      : new Date().toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {status === "DELIVERED" && !order.receipt && (
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mt-4 space-y-3">
                <h4 className="font-bold text-sm text-stone-900 border-b border-stone-200 pb-2">
                  Coleta de Assinatura (Obrigatório para Entrega)
                </h4>
                <p className="text-xs text-stone-500">
                  Solicite que o cliente assine abaixo para gerar o recibo
                  oficial de entrega.
                </p>
                <div className="bg-white border-2 border-dashed border-stone-300 rounded-xl overflow-hidden relative">
                  <SignatureCanvas
                    ref={signatureRef}
                    penColor="black"
                    canvasProps={{ className: "signature-canvas w-full h-32" }}
                  />
                  <button
                    type="button"
                    onClick={() => signatureRef.current?.clear()}
                    className="absolute top-2 right-2 bg-stone-100 text-stone-600 p-1.5 rounded-lg text-xs font-bold shadow-sm flex gap-1 items-center hover:bg-stone-200"
                  >
                    <Eraser className="w-3 h-3" /> Limpar
                  </button>
                </div>
              </div>
            )}

            {order.receipt && (
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 mt-4">
                <h4 className="font-bold text-sm text-emerald-900 mb-2">
                  Comprovante Gerado
                </h4>
                <div className="flex items-center gap-4">
                  <img
                    src={order.receipt.signatureUrl || undefined}
                    className="h-16 mix-blend-multiply opacity-80"
                  />
                  <a
                    href={`/recibo/${order.id}`}
                    target="_blank"
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700"
                  >
                    Abrir Comprovante
                  </a>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-sm mt-4"
          >
            <RefreshCw className="h-4 w-4" /> Atualizar Pedido
          </button>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">
            Itens da Solicitação
          </h4>
          <ul className="space-y-4">
            {order.items.map((item: any) => (
              <li key={item.productId} className="flex gap-4">
                <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={item.product.imageUrl || undefined}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-900">
                    {item.product.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    Qtd: {item.quantity} | Valor BR:{" "}
                    {formatCurrency(item.product.priceBRL)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-8 bg-orange-50 text-orange-800 p-4 rounded-xl border border-orange-200">
            <div className="font-bold text-sm mb-2">
              Composição de Valores (Resumo)
            </div>
            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="py-1">Produtos:</td>
                  <td className="text-right font-medium">
                    {formatCurrency(currentSubtotal)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1">Serviço:</td>
                  <td className="text-right font-medium">
                    {formatCurrency(currentServiceFee)}
                  </td>
                </tr>
                {effectiveStorage > 0 && (
                  <tr>
                    <td className="py-1">Armazenagem:</td>
                    <td className="text-right font-medium">
                      {formatCurrency(effectiveStorage)}
                    </td>
                  </tr>
                )}
                {order.prepaymentFee ? (
                  <tr>
                    <td className="py-1">Sinal Inicial (Sob Encomenda):</td>
                    <td className="text-right font-medium">
                      {formatCurrency(order.prepaymentFee)}
                    </td>
                  </tr>
                ) : null}
                {onDemandProductCostBRL > 0 ? (
                  <tr>
                    <td className="py-1">Produto (Sob Encomenda):</td>
                    <td className="text-right font-medium">
                      {formatCurrency(onDemandProductCostBRL)}
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td className="py-1">
                    Frete{" "}
                    {finalShippingFeeBRL > 0 && status !== "PENDING_PAYMENT"
                      ? "Real"
                      : "Estimado (Base)"}
                    :
                  </td>
                  <td className="text-right font-medium">
                    {formatCurrency(effectiveShipping)}
                  </td>
                </tr>
                {currentAppFee > 0 && (
                  <tr>
                    <td className="py-1 text-stone-500">Manutenção App:</td>
                    <td className="text-right font-medium text-stone-500">
                      {formatCurrency(currentAppFee)}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-orange-200 font-bold text-sm">
                  <td className="py-2">Total Consolidado:</td>
                  <td className="text-right py-2">
                    {formatCurrency(calculatedTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </div>
  );
}

function HighlightsTab({
  products,
  stores,
  updateProduct,
  updateStore,
}: {
  products: Product[];
  stores: Store[];
  updateProduct: any;
  updateStore: any;
}) {
  const featuredProducts = products.filter((p) => p.isFeatured);
  const featuredStores = stores.filter((s) => s.isFeatured);

  return (
    <div className="space-y-12">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-stone-900">
              Produtos em Destaque (Carrossel Home)
            </h3>
            <p className="text-xs text-stone-500">
              Produtos que aparecerão na barra rolante superior da página
              inicial.
            </p>
          </div>
          <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-black uppercase">
            {featuredProducts.length} Itens
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => updateProduct(p.id, { isFeatured: !p.isFeatured })}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition text-left cursor-pointer group ${p.isFeatured ? "bg-rose-50 border-rose-200" : "bg-white border-stone-100 hover:border-stone-200 shadow-sm"}`}
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                <img
                  src={p.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-stone-900 truncate">
                  {p.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Star
                    className={`w-3 h-3 ${p.isFeatured ? "fill-rose-500 text-rose-500" : "text-stone-300"}`}
                  />
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">
                    {p.isFeatured ? "No Carrossel" : "Inativo"}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6 pt-12 border-t border-stone-100">
          <div>
            <h3 className="text-xl font-bold text-stone-900">
              Lojas em Destaque (Barra de Marcas)
            </h3>
            <p className="text-xs text-stone-500">
              Lojas que aparecerão no carrossel de logomarcas no meio da página.
            </p>
          </div>
          <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-black uppercase">
            {featuredStores.length} Lojas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stores.map((s) => (
            <button
              key={s.id}
              onClick={() => updateStore(s.id, { isFeatured: !s.isFeatured })}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition text-left cursor-pointer group ${s.isFeatured ? "bg-indigo-50 border-indigo-200" : "bg-white border-stone-100 hover:border-stone-200 shadow-sm"}`}
            >
              <div className="w-12 h-12 rounded-lg bg-stone-50 flex items-center justify-center p-2 shrink-0">
                {s.logoUrl ? (
                  <img
                    src={s.logoUrl}
                    alt=""
                    className="h-full w-auto object-contain"
                  />
                ) : (
                  <StoreIcon className="w-6 h-6 text-stone-200" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-stone-900 truncate">
                  {s.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Star
                    className={`w-3 h-3 ${s.isFeatured ? "fill-indigo-500 text-indigo-500" : "text-stone-300"}`}
                  />
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">
                    {s.isFeatured ? "Na Barra" : "Inativa"}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductsTab({
  products,
  stores,
  addProduct,
  updateProduct,
  deleteProduct,
}: {
  products: Product[];
  stores: Store[];
  addProduct: any;
  updateProduct: any;
  deleteProduct: any;
}) {
  const [showForm, setShowForm] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [productUrl, setProductUrl] = useState("");
  const [geminiMissing, setGeminiMissing] = useState(false);

  // Bulk CSV Import States
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkStoreId, setBulkStoreId] = useState("");
  const [csvContentText, setCsvContentText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });

  // Form fields
  const { companySettings, liveDollarRate } = useAppContext();
  const dollarRate = liveDollarRate || companySettings?.dollarRate || 5.50;
  const [location, setLocation] = useState<"BR" | "US">("US");
  const [editingId, setEditingId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceUSD, setPriceUSD] = useState(0);
  const [priceBRL, setPriceBRL] = useState(0);
  const [imageUrl, setImageUrl] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [stockType, setStockType] = useState<"IN_STOCK" | "PARTNER_STORE">(
    "IN_STOCK",
  );
  const [inventory, setInventory] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [tags, setTags] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [specifications, setSpecifications] = useState<
    { key: string; value: string }[]
  >([]);
  const [variants, setVariants] = useState<
    {
      name: string;
      sku: string;
      stock: number;
      priceUSD: number;
      priceBRL: number;
    }[]
  >([]);

  // Structured Variant Generator states
  const [genColors, setGenColors] = useState("");
  const [genRAMs, setGenRAMs] = useState("");
  const [genStorages, setGenStorages] = useState("");
  const [genSizes, setGenSizes] = useState("");
  const [genDefaultStock, setGenDefaultStock] = useState(10);
  const [genBasePriceUSD, setGenBasePriceUSD] = useState(0);
  const [genBasePriceBRL, setGenBasePriceBRL] = useState(0);
  const [genAutoConvert, setGenAutoConvert] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);

  const [boxWidth, setBoxWidth] = useState(0);
  const [boxLength, setBoxLength] = useState(0);
  const [boxHeight, setBoxHeight] = useState(0);
  const [boxWeight, setBoxWeight] = useState(0);

  const categories = [
    "Eletrônicos",
    "Informática",
    "Eletrodomésticos",
    "Vestuário",
    "Calçados",
    "Beleza e Higiene",
    "Brinquedos",
    "Esportes",
    "Relógios",
    "Acessórios",
    "Outros",
  ];

  // Helper to determine cover images of products if left blank in CSV
  const getProductImageFallback = (
    productName: string,
    categoryName: string = "",
  ): string => {
    const nameLower = (productName || "").toLowerCase();
    const catLower = (categoryName || "").toLowerCase();

    // 1. CHECKS FOR SHOES / SNEAKERS (tênis, sapato, calçado, sneaker, boot, bota, shoe, slide, chinelo, sandália, rasteirinha)
    if (
      nameLower.includes("tênis") ||
      nameLower.includes("tenis") ||
      nameLower.includes("sapato") ||
      nameLower.includes("calçado") ||
      nameLower.includes("calcado") ||
      nameLower.includes("sneaker") ||
      nameLower.includes("boot") ||
      nameLower.includes("bota") ||
      nameLower.includes("shoe") ||
      nameLower.includes("slide") ||
      nameLower.includes("chinelo") ||
      nameLower.includes("sandália") ||
      nameLower.includes("sandalia") ||
      catLower.includes("calçados") ||
      catLower.includes("shoes")
    ) {
      return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400";
    }

    // 2. CHECKS FOR BAGS / BACKPACKS / WALLETS (bag, mochila, mala, bolsa, carteira, backpack, wallet, purse, shoulder bag)
    if (
      nameLower.includes("bolsa") ||
      nameLower.includes("mochila") ||
      nameLower.includes("mala") ||
      nameLower.includes("carteira") ||
      nameLower.includes("backpack") ||
      nameLower.includes("wallet") ||
      nameLower.includes("purse") ||
      nameLower.includes("bag") ||
      catLower.includes("acessórios") ||
      catLower.includes("bags")
    ) {
      return "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400";
    }

    // 3. CHECKS FOR APPAREL / CLOTHES (camisa, camiseta, t-shirt, shirt, casaco, moletom, hoodie, pants, calça, vestido, dress, jaqueta, jacket, shorts, cropped, blusa, regata)
    if (
      nameLower.includes("camisa") ||
      nameLower.includes("camiseta") ||
      nameLower.includes("t-shirt") ||
      nameLower.includes("shirt") ||
      nameLower.includes("casaco") ||
      nameLower.includes("moletom") ||
      nameLower.includes("hoodie") ||
      nameLower.includes("calça") ||
      nameLower.includes("calca") ||
      nameLower.includes("vestido") ||
      nameLower.includes("dress") ||
      nameLower.includes("jaqueta") ||
      nameLower.includes("jacket") ||
      nameLower.includes("shorts") ||
      nameLower.includes("cropped") ||
      nameLower.includes("blusa") ||
      nameLower.includes("regata") ||
      nameLower.includes("roupa") ||
      catLower.includes("vestuário") ||
      catLower.includes("clothing") ||
      catLower.includes("roupas")
    ) {
      return "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400";
    }

    // 4. CHECKS FOR COSMETICS / BEAUTY / SKINCARE / PERFUMES (creme, skin, cream, beauty, shampoo, makeup, maquiagem, perfume, lipstick, gloss, base, batom, blush, rímel, mascara, hidratante, lip balm)
    if (
      nameLower.includes("creme") ||
      nameLower.includes("skin") ||
      nameLower.includes("cream") ||
      nameLower.includes("beauty") ||
      nameLower.includes("shampoo") ||
      nameLower.includes("makeup") ||
      nameLower.includes("maquiagem") ||
      nameLower.includes("perfume") ||
      nameLower.includes("lipstick") ||
      nameLower.includes("gloss") ||
      nameLower.includes("base") ||
      nameLower.includes("batom") ||
      nameLower.includes("blush") ||
      nameLower.includes("rímel") ||
      nameLower.includes("rimel") ||
      nameLower.includes("sephora") ||
      nameLower.includes("sacks") ||
      nameLower.includes("mac ") ||
      nameLower.includes("hidratante") ||
      nameLower.includes("balm") ||
      catLower.includes("beleza") ||
      catLower.includes("beauty") ||
      catLower.includes("cosméticos") ||
      catLower.includes("cosméticos")
    ) {
      return "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400";
    }

    // 5. CHECKS FOR WATCHES (relógio, relogio, watch, smart watch, apple watch)
    if (
      nameLower.includes("relógio") ||
      nameLower.includes("relogio") ||
      nameLower.includes("watch") ||
      catLower.includes("relógios") ||
      catLower.includes("watches")
    ) {
      return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400";
    }

    // 6. CHECKS FOR SMARTPHONES / LAPTOPS / ELECTRONICS general (iphone, samsung, xiaomi, fone, headphone, earbud, airpod, tablet, ipad, carregador, charger, caixa de som, speaker, laptop, computador, notebook, macbook, pc, gamer, console, playstation, switch, nintendo, xbox, kindle)
    if (
      nameLower.includes("iphone") ||
      nameLower.includes("samsung") ||
      nameLower.includes("xiaomi") ||
      nameLower.includes("fone") ||
      nameLower.includes("headphone") ||
      nameLower.includes("earbud") ||
      nameLower.includes("airpod") ||
      nameLower.includes("tablet") ||
      nameLower.includes("ipad") ||
      nameLower.includes("carregador") ||
      nameLower.includes("charger") ||
      nameLower.includes("speaker") ||
      nameLower.includes("laptop") ||
      nameLower.includes("computador") ||
      nameLower.includes("notebook") ||
      nameLower.includes("macbook") ||
      nameLower.includes("console") ||
      nameLower.includes("playstation") ||
      nameLower.includes("nintendo") ||
      nameLower.includes("xbox") ||
      nameLower.includes("kindle") ||
      nameLower.includes("phone") ||
      nameLower.includes("pro") ||
      catLower.includes("eletrônicos") ||
      catLower.includes("electronics")
    ) {
      return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400";
    }

    // DEFAULT FALLBACK
    return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400";
  };

  const parseCSV = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length <= 1) return [];

    // Determine separator (; or ,)
    const firstLine = lines[0];
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const sep = semicolonCount > commaCount ? ";" : ",";

    const splitCSVLine = (line: string, separator: string) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result.map((val) => {
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        return val.replace(/""/g, '"');
      });
    };

    const parentMap = new Map<string, any>();

    for (let i = 1; i < lines.length; i++) {
      const row = splitCSVLine(lines[i], sep);
      if (row.length < 1 || !row[0]) continue;

      const rawName = row[0] || "Produto Importado";
      const rawDesc = row[1] || "Importado via planilha.";
      const rawPriceUSD = Number((row[2] || "0").replace(",", ".")) || 0;
      const rawPriceBRL = Number((row[3] || "0").replace(",", ".")) || 0;
      const rawImageUrl = row[4] || "";
      const rawSku = row[5] || "";
      const rawCategory = row[6] || "Outros";
      const rawBrand = row[7] || "";
      const rawStockType =
        row[8] === "PARTNER_STORE" ? "PARTNER_STORE" : "IN_STOCK";
      const rawInventory = Number(row[9]) || 20;
      const rawTags = row[10]
        ? row[10]
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

      // Variation columns
      const rawParentSku = (row[11] || "").trim();
      const rawVariantName = (row[12] || "").trim();
      const rawPriceAdjustBRL = Number((row[13] || "0").replace(",", ".")) || 0;
      const rawPriceAdjustUSD = Number((row[14] || "0").replace(",", ".")) || 0;

      // Determine aggregation key: Parent SKU or fallback to unique name if variant name is given
      let parentKey = "";
      if (rawParentSku) {
        parentKey = "sku_" + rawParentSku.toLowerCase().trim();
      } else if (rawVariantName) {
        parentKey = "name_" + rawName.toLowerCase().trim();
      } else {
        parentKey = "unique_" + i;
      }

      if (parentMap.has(parentKey)) {
        const existing = parentMap.get(parentKey);

        if (rawVariantName) {
          if (!existing.variants) {
            existing.variants = [];
          }

          existing.variants.push({
            id: "v_" + Math.random().toString(36).substring(2, 9),
            name: rawVariantName,
            sku:
              rawSku || `SKU-VAR-${Math.floor(Math.random() * 89999 + 10000)}`,
            priceAdjustBRL: rawPriceAdjustBRL,
            priceAdjustUSD: rawPriceAdjustUSD,
            stock: rawInventory,
          });

          existing.inventory += rawInventory;
        }
      } else {
        const productEntry: any = {
          name: rawName,
          description: rawDesc,
          priceUSD: rawPriceUSD,
          priceBRL: rawPriceBRL || Math.round(rawPriceUSD * 5.2),
          imageUrl: rawImageUrl,
          sku:
            rawParentSku ||
            rawSku ||
            `SKU-IMP-${Math.floor(Math.random() * 89999 + 10000)}`,
          category: rawCategory,
          brand: rawBrand,
          stockType: rawStockType,
          inventory: rawInventory,
          tags: rawTags,
          variants: [],
        };

        if (rawVariantName) {
          productEntry.variants.push({
            id: "v_" + Math.random().toString(36).substring(2, 9),
            name: rawVariantName,
            sku:
              rawSku || `SKU-VAR-${Math.floor(Math.random() * 89999 + 10000)}`,
            priceAdjustBRL: rawPriceAdjustBRL,
            priceAdjustUSD: rawPriceAdjustUSD,
            stock: rawInventory,
          });
        }

        parentMap.set(parentKey, productEntry);
      }
    }

    return Array.from(parentMap.values());
  };

  const downloadCsvTemplate = () => {
    const headers = [
      "Nome do Produto",
      "Descrição",
      "Preço USD",
      "Preço BRL",
      "Foto URL",
      "SKU",
      "Categoria",
      "Marca",
      "Tipo de Estoque (IN_STOCK/PARTNER_STORE)",
      "Estoque",
      "Tags (separadas por virgula)",
      "SKU Agrupador / SKU Pai (Opcional)",
      "Nome da Variação (Opcional - Ex: Tamanho 40, Vermelho, 128GB)",
      "Ajuste Preço BRL Variação (Opcional)",
      "Ajuste Preço USD Variação (Opcional)",
    ];

    const rows = [
      [
        "iPhone 15 Pro Max",
        "Modelo premium mais recente da Apple em liga fina de Titânio e excelente acabamento.",
        "1199.00",
        "5995.00",
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600",
        "APL-IP15PM-256",
        "Eletrônicos",
        "Apple",
        "PARTNER_STORE",
        "35",
        "apple, iphone, premium, importado",
        "APL-IP15PM-GRP",
        "256GB - Titânio Natural",
        "0.00",
        "0.00",
      ],
      [
        "iPhone 15 Pro Max",
        "Modelo premium mais recente da Apple em liga fina de Titânio e excelente acabamento.",
        "1199.00",
        "5995.00",
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600",
        "APL-IP15PM-512",
        "Eletrônicos",
        "Apple",
        "PARTNER_STORE",
        "15",
        "apple, iphone, premium, importado",
        "APL-IP15PM-GRP",
        "512GB - Titânio Azul",
        "1000.00",
        "200.00",
      ],
      [
        "Tênis Air Jordan Red Retro 1",
        "Modelo clássico icônico de basquete reformulado com couro de excelente costura.",
        "180.00",
        "900.00",
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
        "NKE-AJ1-RED-39",
        "Calçados",
        "Nike",
        "IN_STOCK",
        "12",
        "sneaker, jordan, nike, importado",
        "NKE-AJ1-RED-GRP",
        "Tamanho 39",
        "0.00",
        "0.00",
      ],
      [
        "Tênis Air Jordan Red Retro 1",
        "Modelo clássico icônico de basquete reformulado com couro de excelente costura.",
        "180.00",
        "900.00",
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
        "NKE-AJ1-RED-40",
        "Calçados",
        "Nike",
        "IN_STOCK",
        "28",
        "sneaker, jordan, nike, importado",
        "NKE-AJ1-RED-GRP",
        "Tamanho 40",
        "0.00",
        "0.00",
      ],
    ];

    // Using \uFEFF to support Excel UTF-8 representation
    const csvContent =
      "\uFEFF" +
      [
        headers.join(";"),
        ...rows.map((r) =>
          r.map((val) => `"${val.replace(/"/g, '""')}"`).join(";"),
        ),
      ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_produtos.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const productsParsed = parseCSV(text);
      if (productsParsed.length === 0) {
        alert(
          "Nenhum produto válido encontrado no arquivo CSV. Verifique o delimitador ou o modelo de exemplo.",
        );
      } else {
        setParsedProducts(productsParsed);
        setCsvContentText(text);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkStoreId) {
      alert("Por favor, selecione a loja de destino antes de importar.");
      return;
    }
    if (parsedProducts.length === 0) {
      alert("Nenhum produto carregado. Envie um arquivo CSV válido primeiro.");
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: parsedProducts.length });

    const CHUNK_SIZE = 150;
    let successCount = 0;
    let failedChunks = 0;

    try {
      for (let i = 0; i < parsedProducts.length; i += CHUNK_SIZE) {
        const chunk = parsedProducts.slice(i, i + CHUNK_SIZE);

        try {
          const response = await fetch("/api/bulk-import-products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              storeId: bulkStoreId,
              products: chunk,
            }),
          });

          const responseText = await response.text();
          let data: any;
          try {
            data = JSON.parse(responseText);
          } catch (jsonErr) {
            console.error("Failed to parse response as JSON:", responseText);
            throw new Error(
              `Resposta do servidor inválida: ${responseText.substring(0, 100)}`,
            );
          }

          if (response.ok && data.success) {
            successCount += data.importedCount || chunk.length;
          } else {
            console.error("Failed importing chunk:", data.error);
            failedChunks++;
          }
        } catch (chunkErr) {
          console.error("Error importing chunk:", chunkErr);
          failedChunks++;
        }

        const currentProgress = Math.min(i + CHUNK_SIZE, parsedProducts.length);
        setImportProgress({
          current: currentProgress,
          total: parsedProducts.length,
        });
      }

      if (failedChunks === 0) {
        alert(
          `Sucesso magnífico! Foram cadastrados e integrados ${successCount} produtos com sucesso em seu catálogo de forma automatizada!`,
        );
        setParsedProducts([]);
        setCsvContentText("");
        setShowBulkImport(false);
      } else if (successCount > 0) {
        alert(
          `Importação concluída parcialmente: ${successCount} produtos cadastrados com sucesso. Ocorreram falhas em ${failedChunks} lote(s).`,
        );
        setParsedProducts([]);
        setCsvContentText("");
        setShowBulkImport(false);
      } else {
        alert(
          "Falha ao importar o arquivo CSV. Por favor, tente reduzir o tamanho ou verificar a formatação.",
        );
      }
    } catch (err) {
      console.error(err);
      alert(
        "Ocorreu um erro técnico ao se conectar com o servidor para sincronização.",
      );
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  const resetForm = () => {
    setEditingId("");
    setStoreId("");
    setName("");
    setDescription("");
    setPriceUSD(0);
    setPriceBRL(0);
    setLocation("US");
    setImageUrl("");
    setSku("");
    setCategory("");
    setBrand("");
    setStockType("IN_STOCK");
    setInventory(0);
    setIsAvailable(false);
    setTags("");
    setIsFeatured(false);
    setSpecifications([]);
    setVariants([]);
    setProductUrl("");
    setBoxWidth(0);
    setBoxLength(0);
    setBoxHeight(0);
    setBoxWeight(0);
  };

  const handlePriceUSDChange = (val: number) => {
    setPriceUSD(val);
    if (location === "US") {
      setPriceBRL(Number((val * dollarRate).toFixed(2)));
    }
  };

  const handlePriceBRLChange = (val: number) => {
    setPriceBRL(val);
    if (location === "BR") {
      setPriceUSD(Number((val / dollarRate).toFixed(2)));
    }
  };

  const handleLocationChange = (newLoc: "BR" | "US") => {
    setLocation(newLoc);
    if (newLoc === "US") {
      setPriceBRL(Number((priceUSD * dollarRate).toFixed(2)));
    } else {
      setPriceUSD(Number((priceBRL / dollarRate).toFixed(2)));
    }
  };

  const handleGenerateVariants = () => {
    const colors = genColors.split(",").map(c => c.trim()).filter(Boolean);
    const rams = genRAMs.split(",").map(r => r.trim()).filter(Boolean);
    const storages = genStorages.split(",").map(s => s.trim()).filter(Boolean);
    const sizes = genSizes.split(",").map(s => s.trim()).filter(Boolean);

    if (colors.length === 0 && rams.length === 0 && storages.length === 0 && sizes.length === 0) {
      alert("Por favor, preencha pelo menos um campo de variação (Cores, RAM, Armazenamento ou Tamanhos).");
      return;
    }

    const dimensionColors = colors.length > 0 ? colors : [null];
    const dimensionRams = rams.length > 0 ? rams : [null];
    const dimensionStorages = storages.length > 0 ? storages : [null];
    const dimensionSizes = sizes.length > 0 ? sizes : [null];

    const generated: typeof variants = [];

    dimensionColors.forEach(color => {
      dimensionRams.forEach(ram => {
        dimensionStorages.forEach(storage => {
          dimensionSizes.forEach(size => {
            const parts: string[] = [];
            if (color) parts.push(`Cor: ${color}`);
            if (ram) parts.push(`RAM: ${ram}`);
            if (storage) parts.push(`Armazenamento: ${storage}`);
            if (size) parts.push(`Tamanho: ${size}`);

            if (parts.length === 0) return;

            const variantName = parts.join(" | ");
            
            const baseSku = sku || "SKU";
            const cleanColor = color ? color.replace(/\s+/g, "").toUpperCase() : "";
            const cleanRam = ram ? ram.replace(/\s+/g, "").toUpperCase() : "";
            const cleanStorage = storage ? storage.replace(/\s+/g, "").toUpperCase() : "";
            const cleanSize = size ? size.replace(/\s+/g, "").toUpperCase() : "";
            const suffix = [cleanColor, cleanRam, cleanStorage, cleanSize].filter(Boolean).join("-");
            const variantSku = suffix ? `${baseSku}-${suffix}` : `${baseSku}-${Math.floor(Math.random() * 89999 + 10000)}`;

            const usdVal = genBasePriceUSD > 0 ? genBasePriceUSD : priceUSD;
            const brlVal = genBasePriceBRL > 0 ? genBasePriceBRL : (genBasePriceUSD > 0 && genAutoConvert ? Number((genBasePriceUSD * dollarRate).toFixed(2)) : priceBRL);

            generated.push({
              name: variantName,
              sku: variantSku,
              stock: genDefaultStock,
              priceUSD: usdVal,
              priceBRL: brlVal,
            });
          });
        });
      });
    });

    if (generated.length > 0) {
      setVariants([...variants, ...generated]);
      // Clear colors and sizes but keep price/stock configs
      setGenColors("");
      setGenRAMs("");
      setGenStorages("");
      setGenSizes("");
      setShowGenerator(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      isAvailable &&
      (!boxWidth ||
        boxWidth <= 0 ||
        !boxLength ||
        boxLength <= 0 ||
        !boxHeight ||
        boxHeight <= 0 ||
        !boxWeight ||
        boxWeight <= 0)
    ) {
      alert(
        "Para ativar o produto (Disponível para venda), você precisa preencher as dimensões (largura, comprimento, altura) e o peso da caixa com valores maiores que zero.",
      );
      return;
    }

    const specsMap: Record<string, string> = {};
    specifications.forEach((s) => {
      if (s.key) specsMap[s.key] = s.value;
    });

    const productData = {
      storeId,
      name,
      description,
      priceUSD,
      priceBRL,
      location,
      imageUrl,
      sku,
      category,
      brand,
      stockType,
      inventory,
      isFeatured,
      isAvailable,
      boxWidth,
      boxLength,
      boxHeight,
      boxWeight,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      specifications: specsMap,
      variants: variants.map((v, idx) => ({
        id: idx.toString(),
        name: v.name,
        sku: v.sku,
        stock: v.stock,
        priceAdjustUSD: Number((v.priceUSD - priceUSD).toFixed(2)),
        priceAdjustBRL: Number((v.priceBRL - priceBRL).toFixed(2)),
      })),
    };

    if (editingId) {
      await updateProduct(editingId, productData);
    } else {
      await addProduct(productData);
    }
    resetForm();
    setShowForm(false);
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setStoreId(p.storeId);
    setName(p.name);
    setDescription(p.description);
    setPriceUSD(p.priceUSD);
    setPriceBRL(p.priceBRL);
    setLocation(p.location || "US");
    setImageUrl(p.imageUrl);
    setSku(p.sku || "");
    setCategory(p.category || "");
    setBrand(p.brand || "");
    setStockType(p.stockType || "IN_STOCK");
    setInventory(p.inventory || 0);
    setIsAvailable(p.isAvailable || false);
    setIsFeatured(p.isFeatured || false);
    setBoxWidth(p.boxWidth || 0);
    setBoxLength(p.boxLength || 0);
    setBoxHeight(p.boxHeight || 0);
    setBoxWeight(p.boxWeight || 0);
    setTags(p.tags?.join(", ") || "");
    setSpecifications(
      Object.entries(p.specifications || {}).map(([key, value]) => ({
        key,
        value,
      })),
    );
    setVariants(
      (p.variants || []).map((v) => ({
        name: v.name,
        sku: v.sku || "",
        stock: v.stock,
        priceUSD: Number((p.priceUSD + (v.priceAdjustUSD || 0)).toFixed(2)),
        priceBRL: Number((p.priceBRL + (v.priceAdjustBRL || 0)).toFixed(2)),
      })),
    );
    setShowForm(true);
  };

  const sortedProducts = [...products].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const sortedStores = [...stores].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-stone-900">
            Catálogo de Vitrine
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Gerencie produtos de importação, cadastre-os manualmente ou faça
            envios em lote via planilhas.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setShowBulkImport(!showBulkImport);
              setShowForm(false);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition cursor-pointer border ${showBulkImport ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"}`}
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>Importação CSV</span>
          </button>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setShowBulkImport(false);
            }}
            className="bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-rose-600 transition shadow-sm cursor-pointer"
          >
            {showForm ? (
              <XCircle className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{showForm ? "Cancelar" : "Novo Produto"}</span>
          </button>
        </div>
      </div>

      {showBulkImport && (
        <div className="bg-gradient-to-br from-white to-stone-50/50 p-6 rounded-3xl border border-stone-200/80 shadow-lg animate-fade-in mb-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <h4 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                Lançamento de Produtos em Lote via CSV
              </h4>
              <p className="text-xs text-stone-500 mt-1">
                Alimente nossa planilha modelo com quantos produtos desejar e
                faça o upload de uma única vez para impulsionar sua
                produtividade.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadCsvTemplate}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition self-start cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Baixar Planilha Modelo (.CSV)
            </button>
          </div>

          <form onSubmit={handleBulkImportSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
                    Loja de Origem dos Produtos
                  </label>
                  <select
                    value={bulkStoreId}
                    onChange={(e) => setBulkStoreId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm bg-white"
                  >
                    <option value="">
                      Selecione para qual parceiro esses produtos pertencem...
                    </option>
                    {sortedStores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-bold text-stone-600 uppercase tracking-wider">
                    Carregar Arquivo CSV
                  </span>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition relative flex flex-col items-center justify-center min-h-[180px] ${dragActive ? "border-indigo-500 bg-indigo-50/20" : "border-stone-200 hover:border-stone-300 bg-white"}`}
                  >
                    <input
                      type="file"
                      id="bulkCsvFile"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />

                    <div className="space-y-3 pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center mx-auto text-stone-400">
                        <Upload className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-stone-800">
                          Arraste seu arquivo CSV ou clique para navegar
                        </p>
                        <p className="text-xs text-stone-400">
                          Suporta arquivos separados por ponto e vírgula (;) ou
                          vírgulas (,)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 flex flex-col justify-between">
                <div className="space-y-3">
                  <h5 className="text-xs font-extrabold text-stone-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-rose-500" />
                    Regras de Enriquecimento de Imagens
                  </h5>
                  <div className="text-xs text-stone-600 space-y-2 leading-relaxed">
                    <p>
                      Para que seus clientes comprem com confiança e não tenham
                      dúvidas de modelo,{" "}
                      <strong>todo produto precisa de imagem</strong>.
                    </p>
                    <p>
                      💡 Se você deixar a coluna <strong>Foto URL</strong> em
                      branco, nossa inteligência integrada lerá a categoria do
                      produto e o título para adicionar instantaneamente uma
                      bela foto de alta resolução do Unsplash adequada ao item.
                    </p>
                    <p>
                      Isso permite que você cadastre{" "}
                      <strong>1.000 ou mais produtos</strong> de uma única vez
                      sem se preocupar em hospedar fotos manualmente uma a uma!
                    </p>
                  </div>
                </div>
                {parsedProducts.length > 0 && (
                  <div className="mt-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-2.5">
                    <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold text-indigo-900">
                        {parsedProducts.length} produtos preparados!
                      </p>
                      <p className="text-indigo-700">
                        Visualize a listagem abaixo antes de salvar.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {parsedProducts.length > 0 && (
              <div className="space-y-3 border-t border-stone-100 pt-6">
                <div className="flex justify-between items-center">
                  <h5 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                    Pré-visualização do Lote ({parsedProducts.length} itens
                    detectados)
                  </h5>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedProducts([]);
                      setCsvContentText("");
                    }}
                    className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Deletar Arquivo
                  </button>
                </div>

                <div className="border border-stone-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto shadow-inner bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-stone-50 text-stone-500 font-bold border-b border-stone-200 sticky top-0">
                      <tr>
                        <th className="p-3">Imagem</th>
                        <th className="p-3">Nome do Produto</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3">Preço (BRL)</th>
                        <th className="p-3">Estoque</th>
                        <th className="p-3">Origem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {parsedProducts.slice(0, 100).map((p, idx) => {
                        const fallbackImg = getProductImageFallback(
                          p.name,
                          p.category,
                        );
                        const hasImg = !!p.imageUrl;
                        return (
                          <tr key={idx} className="hover:bg-stone-50/50">
                            <td className="p-3">
                              <div className="w-9 h-9 rounded-lg overflow-hidden border border-stone-100 bg-stone-50 relative group">
                                <img
                                  src={p.imageUrl || fallbackImg}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                                {!hasImg && (
                                  <span
                                    className="absolute bottom-0 right-0 bg-indigo-600 text-white text-[7px] px-1 font-black rounded-tl"
                                    title="Imagem Inteligente Gerada"
                                  >
                                    AUTO
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <p className="font-bold text-stone-900">
                                {p.name}
                              </p>
                              {p.sku && (
                                <span className="font-mono text-[9px] text-stone-400">
                                  SKU: {p.sku}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-medium">
                                {p.category}
                              </span>
                            </td>
                            <td className="p-3">
                              <p className="font-semibold text-stone-800">
                                R$ {p.priceBRL.toFixed(2)}
                              </p>
                              <p className="text-[10px] text-stone-400">
                                US$ {p.priceUSD.toFixed(2)}
                              </p>
                            </td>
                            <td className="p-3 font-mono text-stone-600">
                              {p.inventory}
                            </td>
                            <td className="p-3">
                              <span
                                className={`text-[10px] font-bold ${p.stockType === "PARTNER_STORE" ? "text-amber-600" : "text-emerald-600"}`}
                              >
                                {p.stockType === "PARTNER_STORE"
                                  ? "Parceiro"
                                  : "Próprio"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {parsedProducts.length > 100 && (
                    <div className="p-3 text-center bg-stone-50 text-stone-500 text-xs border-t border-stone-100">
                      Exibindo as primeiras 100 linhas. Mais{" "}
                      {parsedProducts.length - 100} produtos serão cadastrados
                      em segundo plano.
                    </div>
                  )}
                </div>
              </div>
            )}

            {isImporting && importProgress.total > 0 && (
              <div className="space-y-2 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
                <div className="flex justify-between items-center text-xs font-bold text-indigo-900">
                  <span>Importando lotes no Firestore...</span>
                  <span>
                    {importProgress.current} / {importProgress.total} produtos (
                    {Math.round(
                      (importProgress.current / importProgress.total) * 100,
                    )}
                    %)
                  </span>
                </div>
                <div className="w-full bg-indigo-100 rounded-full h-2 overflow-hidden shadow-inner">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(importProgress.current / importProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setShowBulkImport(false);
                  setParsedProducts([]);
                }}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-stone-500 hover:bg-stone-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isImporting || parsedProducts.length === 0}
                className="bg-indigo-600 disabled:bg-stone-300 disabled:text-stone-500 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-md cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>
                      Importando: {importProgress.current}/
                      {importProgress.total}...
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      Cadastrar {parsedProducts.length} Produtos em Massa
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm animate-fade-in mb-8">
          <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h5 className="text-sm font-bold text-stone-800 border-b pb-1">
                  Informações Básicas
                </h5>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
                    Loja de Origem
                  </label>
                  <select
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50"
                  >
                    <option value="">Selecione a loja...</option>
                    {sortedStores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
                    Nome do Produto
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
                    SKU Universal
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50"
                  >
                    <option value="">Selecione...</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-sm font-bold text-stone-800 border-b pb-1">
                  Preços e Imagem
                </h5>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5">
                    Origem / Localização do Produto
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleLocationChange("US")}
                      className={`px-4 py-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                        location === "US"
                          ? "bg-stone-900 border-stone-900 text-amber-400"
                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      🇺🇸 EUA (Base em Dólar)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLocationChange("BR")}
                      className={`px-4 py-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                        location === "BR"
                          ? "bg-stone-900 border-stone-900 text-amber-400"
                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      🇧🇷 Brasil (Base em Real)
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">
                    Produtos nos EUA têm preço base em Dólar. Produtos no Brasil têm preço base em Real. A conversão é em tempo real usando a taxa diária (1 USD = {dollarRate} BRL).
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1 flex items-center justify-between">
                      <span>Preço USD ($)</span>
                      {location === "US" ? (
                        <span className="text-[9px] text-rose-500 font-extrabold bg-rose-50 px-1 py-0.5 rounded">BASE</span>
                      ) : (
                        <span className="text-[9px] text-stone-400 bg-stone-100 px-1 py-0.5 rounded">CONVERTIDO</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={priceUSD || ""}
                      onChange={(e) => handlePriceUSDChange(Number(e.target.value))}
                      required
                      className={`w-full rounded-lg border px-4 py-2 text-sm bg-stone-50 transition ${
                        location === "BR" ? "opacity-60 cursor-not-allowed border-stone-200" : "border-stone-300 ring-1 ring-rose-500/10 focus:ring-rose-500"
                      }`}
                      readOnly={location === "BR"}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1 flex items-center justify-between">
                      <span>Preço BRL (R$)</span>
                      {location === "BR" ? (
                        <span className="text-[9px] text-rose-500 font-extrabold bg-rose-50 px-1 py-0.5 rounded">BASE</span>
                      ) : (
                        <span className="text-[9px] text-stone-400 bg-stone-100 px-1 py-0.5 rounded">CONVERTIDO</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={priceBRL || ""}
                      onChange={(e) => handlePriceBRLChange(Number(e.target.value))}
                      required
                      className={`w-full rounded-lg border px-4 py-2 text-sm bg-stone-50 transition ${
                        location === "US" ? "opacity-60 cursor-not-allowed border-stone-200" : "border-stone-300 ring-1 ring-rose-500/10 focus:ring-rose-500"
                      }`}
                      readOnly={location === "US"}
                    />
                  </div>
                </div>
                <ImageInput
                  label="Foto do Produto"
                  value={imageUrl}
                  onChange={setImageUrl}
                />
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-sm font-bold text-stone-800 border-b pb-1">
                  Estoque e Tags
                </h5>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
                    Tipo de Estoque
                  </label>
                  <select
                    value={stockType}
                    onChange={(e) => setStockType(e.target.value as any)}
                    className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50"
                  >
                    <option value="IN_STOCK">Temos em Estoque</option>
                    <option value="PARTNER_STORE">
                      Comprar na Loja Parceira
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
                    Quantidade em Estoque
                  </label>
                  <input
                    type="number"
                    value={inventory}
                    onChange={(e) => setInventory(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="promocao, lancamento, apple"
                    className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 text-rose-500 border-stone-300 rounded focus:ring-rose-500"
                  />
                  <label
                    htmlFor="isFeatured"
                    className="text-sm font-bold text-stone-700"
                  >
                    Produto em Destaque (Carrossel)
                  </label>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isAvailable"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="w-4 h-4 text-rose-500 border-stone-300 rounded focus:ring-rose-500"
                  />
                  <label
                    htmlFor="isAvailable"
                    className="text-sm font-bold text-stone-700"
                  >
                    Disponível para venda
                  </label>
                </div>

                <div className="border-t border-stone-100 pt-4 mt-2 space-y-3">
                  <h6 className="text-[11px] font-extrabold text-stone-500 uppercase tracking-widest">
                    Dimensões da Caixa (para Frete)
                  </h6>
                  <p className="text-[10px] text-stone-400 leading-tight">
                    Preencha as medidas exatas da caixa de envio e o peso físico
                    em gramas para o cálculo do frete de importação.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                        Comprimento (cm)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={boxLength || ""}
                        onChange={(e) => setBoxLength(Number(e.target.value))}
                        placeholder="Ex: 20"
                        className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-xs bg-stone-50 outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                        Largura (cm)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={boxWidth || ""}
                        onChange={(e) => setBoxWidth(Number(e.target.value))}
                        placeholder="Ex: 15"
                        className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-xs bg-stone-50 outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                        Altura (cm)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={boxHeight || ""}
                        onChange={(e) => setBoxHeight(Number(e.target.value))}
                        placeholder="Ex: 10"
                        className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-xs bg-stone-50 outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                        Peso (gramas)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={boxWeight || ""}
                        onChange={(e) => setBoxWeight(Number(e.target.value))}
                        placeholder="Ex: 500"
                        className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-xs bg-stone-50 outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-1">
                  <h5 className="text-sm font-bold text-stone-800">
                    Especificações Técnicas
                  </h5>
                  <button
                    type="button"
                    onClick={() =>
                      setSpecifications([
                        ...specifications,
                        { key: "", value: "" },
                      ])
                    }
                    className="text-rose-500 text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                </div>
                <div className="space-y-2">
                  {specifications.map((s, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        placeholder="Característica"
                        value={s.key}
                        onChange={(e) => {
                          const newSpecs = [...specifications];
                          newSpecs[idx].key = e.target.value;
                          setSpecifications(newSpecs);
                        }}
                        className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs"
                      />
                      <input
                        placeholder="Valor"
                        value={s.value}
                        onChange={(e) => {
                          const newSpecs = [...specifications];
                          newSpecs[idx].value = e.target.value;
                          setSpecifications(newSpecs);
                        }}
                        className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSpecifications(
                            specifications.filter((_, i) => i !== idx),
                          )
                        }
                        className="text-rose-400 p-1"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {specifications.length === 0 && (
                    <p className="text-[10px] text-stone-400 italic">
                      Nenhuma característica extra adicionada.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-1">
                  <h5 className="text-sm font-bold text-stone-800">
                    Variantes (Tamanhos, Cores, etc)
                  </h5>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowGenerator(!showGenerator)}
                      className="text-amber-600 hover:text-amber-700 text-xs font-bold flex items-center gap-1 bg-amber-50 px-2 py-1 rounded"
                    >
                      ⚡ Gerador Automático
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setVariants([
                          ...variants,
                          {
                            name: "",
                            sku: "",
                            stock: 10,
                            priceUSD: priceUSD,
                            priceBRL: priceBRL,
                          },
                        ])
                      }
                      className="text-rose-500 text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Adicionar Manual
                    </button>
                  </div>
                </div>

                {showGenerator && (
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                        Gerador de Variações Combinadas (Produto Cartesiano)
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setGenColors("Azul, Vermelho, Preto, Dourado, Prata");
                            setGenRAMs("8 GB, 12 GB, 16 GB");
                            setGenStorages("128 GB, 256 GB, 512 GB, 1 TB");
                            setGenSizes("");
                          }}
                          className="bg-white hover:bg-stone-50 text-[10px] text-stone-600 font-bold px-2 py-0.5 rounded border border-stone-200 cursor-pointer"
                        >
                          📱 Celular
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGenColors("Preto, Branco, Azul, Vermelho");
                            setGenRAMs("");
                            setGenStorages("");
                            setGenSizes("P, M, G, GG");
                          }}
                          className="bg-white hover:bg-stone-50 text-[10px] text-stone-600 font-bold px-2 py-0.5 rounded border border-stone-200 cursor-pointer"
                        >
                          👕 Vestuário
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGenColors("");
                            setGenRAMs("");
                            setGenStorages("");
                            setGenSizes("");
                          }}
                          className="bg-white hover:bg-stone-50 text-[10px] text-stone-600 font-bold px-2 py-0.5 rounded border border-stone-200 cursor-pointer"
                        >
                          🧹 Limpar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-stone-500 uppercase">
                          Cores (separadas por vírgula)
                        </label>
                        <input
                          placeholder="Ex: Azul, Preto, Prata"
                          value={genColors}
                          onChange={(e) => setGenColors(e.target.value)}
                          className="w-full rounded border border-stone-200 px-2 py-1 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-stone-500 uppercase">
                          Tamanhos (separados por vírgula)
                        </label>
                        <input
                          placeholder="Ex: P, M, G, GG"
                          value={genSizes}
                          onChange={(e) => setGenSizes(e.target.value)}
                          className="w-full rounded border border-stone-200 px-2 py-1 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-stone-500 uppercase">
                          Memória RAM (separadas por vírgula)
                        </label>
                        <input
                          placeholder="Ex: 8 GB, 12 GB, 16 GB"
                          value={genRAMs}
                          onChange={(e) => setGenRAMs(e.target.value)}
                          className="w-full rounded border border-stone-200 px-2 py-1 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-stone-500 uppercase">
                          Armazenamento Interno (separados por vírgula)
                        </label>
                        <input
                          placeholder="Ex: 128 GB, 256 GB, 512 GB"
                          value={genStorages}
                          onChange={(e) => setGenStorages(e.target.value)}
                          className="w-full rounded border border-stone-200 px-2 py-1 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-t pt-2 border-amber-100">
                      <div>
                        <label className="block text-[9px] font-bold text-stone-500 uppercase">
                          Estoque Inicial Padrão
                        </label>
                        <input
                          type="number"
                          value={genDefaultStock}
                          onChange={(e) => setGenDefaultStock(Number(e.target.value))}
                          className="w-full rounded border border-stone-200 px-2 py-1 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-stone-500 uppercase">
                          Preço Base (USD)
                        </label>
                        <input
                          type="number"
                          value={genBasePriceUSD}
                          onChange={(e) => setGenBasePriceUSD(Number(e.target.value))}
                          placeholder={priceUSD.toString()}
                          className="w-full rounded border border-stone-200 px-2 py-1 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-stone-500 uppercase">
                          Preço Base (BRL)
                        </label>
                        <input
                          type="number"
                          value={genBasePriceBRL}
                          onChange={(e) => setGenBasePriceBRL(Number(e.target.value))}
                          placeholder={priceBRL.toString()}
                          className="w-full rounded border border-stone-200 px-2 py-1 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <label className="flex items-center gap-1.5 text-[10px] font-bold text-stone-600">
                        <input
                          type="checkbox"
                          checked={genAutoConvert}
                          onChange={(e) => setGenAutoConvert(e.target.checked)}
                          className="rounded text-rose-500 focus:ring-rose-500"
                        />
                        Sincronizar USD para BRL usando a cotação (R$ {dollarRate.toFixed(2)})
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateVariants}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1 rounded shadow cursor-pointer"
                      >
                        ⚡ Gerar e Adicionar Combinações
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {variants.map((v, idx) => (
                    <div
                      key={idx}
                      className="bg-stone-50 p-2 rounded border border-stone-200 space-y-2"
                    >
                      <div className="flex gap-2">
                        <input
                          placeholder="Ex: Cor: Azul | RAM: 8 GB | Armazenamento: 256 GB"
                          value={v.name}
                          onChange={(e) => {
                            const newV = [...variants];
                            newV[idx].name = e.target.value;
                            setVariants(newV);
                          }}
                          className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs"
                        />
                        <input
                          placeholder="SKU Específico"
                          value={v.sku}
                          onChange={(e) => {
                            const newV = [...variants];
                            newV[idx].sku = e.target.value;
                            setVariants(newV);
                          }}
                          className="w-24 rounded border border-stone-200 px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          placeholder="Estoque"
                          value={v.stock}
                          onChange={(e) => {
                            const newV = [...variants];
                            newV[idx].stock = Number(e.target.value);
                            setVariants(newV);
                          }}
                          className="w-20 rounded border border-stone-200 px-2 py-1 text-xs"
                        />
                        <div className="flex-1 flex gap-1 items-center">
                          <span className="text-[10px] text-stone-400">
                            USD
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={v.priceUSD}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const newV = [...variants];
                              newV[idx].priceUSD = val;
                              if (genAutoConvert) {
                                newV[idx].priceBRL = Number((val * dollarRate).toFixed(2));
                              }
                              setVariants(newV);
                            }}
                            className="w-20 rounded border border-stone-200 px-2 py-1 text-xs"
                          />
                        </div>
                        <div className="flex-1 flex gap-1 items-center">
                          <span className="text-[10px] text-stone-400">
                            BRL
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={v.priceBRL}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const newV = [...variants];
                              newV[idx].priceBRL = val;
                              if (genAutoConvert) {
                                newV[idx].priceUSD = Number((val / dollarRate).toFixed(2));
                              }
                              setVariants(newV);
                            }}
                            className="w-24 rounded border border-stone-200 px-2 py-1 text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setVariants(variants.filter((_, i) => i !== idx))
                          }
                          className="text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {v.priceUSD !== priceUSD && (
                        <div className="text-[9px] text-stone-400 font-bold pl-2 pb-0.5">
                          Calculado: {v.priceUSD > priceUSD ? "Aumento" : "Desconto"} de{" "}
                          {v.priceUSD > priceUSD ? "+" : ""}
                          US$ {(v.priceUSD - priceUSD).toFixed(2)} /{" "}
                          {v.priceBRL > priceBRL ? "+" : ""}
                          R$ {(v.priceBRL - priceBRL).toFixed(2)} em relação ao valor base
                        </div>
                      )}
                    </div>
                  ))}
                  {variants.length === 0 && (
                    <p className="text-[10px] text-stone-400 italic">
                      O produto é único (sem variações).
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
              <button
                onClick={resetForm}
                type="button"
                className="px-6 py-2 rounded-lg text-sm font-bold text-stone-500 hover:bg-stone-50 transition"
              >
                Limpar Campos
              </button>
              <button
                type="submit"
                className="bg-rose-500 text-white px-8 py-2 rounded-lg text-sm font-bold hover:bg-rose-600 transition shadow-md"
              >
                Salvar Produto Completo
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedProducts.map((p) => (
          <div
            key={p.id}
            className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm group"
          >
            <div className="h-48 overflow-hidden relative">
              <img
                src={p.imageUrl || undefined}
                alt={p.name}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(p)}
                  className="bg-white/90 p-2 rounded-lg text-indigo-600 hover:bg-white shadow-sm cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteProduct(p.id)}
                  className="bg-white/90 p-2 rounded-lg text-rose-600 hover:bg-white shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-2 left-2 flex flex-col gap-1">
                <div className="px-2 py-1 bg-stone-900/80 text-white rounded text-[10px] font-bold uppercase tracking-widest inline-block self-start">
                  {stores
                    ? stores.find((s) => s.id === p.storeId)?.name
                    : "Outra Loja"}
                </div>
                {p.category && (
                  <div className="px-2 py-1 bg-rose-500/80 text-white rounded text-[10px] font-bold uppercase tracking-widest inline-block self-start">
                    {p.category}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-stone-900 line-clamp-1 flex items-center gap-2">
                  {p.name}
                  {p.isFeatured && (
                    <Star className="w-3 h-3 text-rose-500 fill-rose-500" />
                  )}
                  {p.brand && (
                    <span className="text-stone-400 font-normal">
                      | {p.brand}
                    </span>
                  )}
                </h4>
              </div>
              <p className="text-xs text-stone-500 mb-3 line-clamp-2">
                {p.description}
              </p>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${p.stockType === "PARTNER_STORE" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                >
                  {p.stockType === "PARTNER_STORE"
                    ? "Comprar na Loja"
                    : "Em Estoque"}
                </span>
                <span className="text-[10px] text-stone-400 font-bold">
                  INV: {p.inventory}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-stone-50">
                <span className="text-xl font-black text-rose-600">
                  {formatCurrency(p.priceBRL)}
                </span>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                  US$ {p.priceUSD.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoresTab({
  stores,
  addStore,
  updateStore,
  deleteStore,
}: {
  stores: Store[];
  addStore: any;
  updateStore: any;
  deleteStore: any;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  // States for automatic product scanner & varredura
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [autoScanProducts, setAutoScanProducts] = useState(true);

  const resetForm = () => {
    setEditingId("");
    setName("");
    setLogoUrl("");
    setDescription("");
    setIsFeatured(false);
    setAutoScanProducts(true);
  };

  const triggerProductScan = async (
    storeId: string,
    storeName: string,
    storeDesc?: string,
  ) => {
    setIsScanning(true);
    setScanStatus(
      `Varrendo a internet por produtos populares de "${storeName}" usando Inteligência Artificial de ponta e buscando no Google Search...`,
    );
    try {
      const response = await fetch("/api/auto-import-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          storeName,
          storeDescription: storeDesc,
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert(
          `Sucesso! Foram cadastrados ${data.importedCount} produtos de destaque para ${storeName} automaticamente com imagens de alta qualidade.`,
        );
      } else {
        alert(
          `Varredura concluída, mas com ressalvas: ${data.error || "Tente novamente mais tarde."}`,
        );
      }
    } catch (err) {
      console.error("Erro na varredura:", err);
      alert("Ocorreu um erro ao realizar a varredura automatizada.");
    } finally {
      setIsScanning(false);
      setScanStatus("");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateStore(editingId, { name, logoUrl, description, isFeatured });
    } else {
      const storeId = await addStore({
        name,
        logoUrl,
        description,
        isFeatured,
      });
      if (autoScanProducts) {
        await triggerProductScan(storeId, name, description);
      }
    }
    resetForm();
    setShowForm(false);
  };

  const sortedStores = [...stores].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6 relative">
      {/* Scanning status banner */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-stone-200 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200 animate-pulse">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-stone-900">
                Varredura Inteligente Ativa
              </h4>
              <p className="text-sm text-stone-600 leading-relaxed">
                {scanStatus}
              </p>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Buscando e inserindo no banco de dados...</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-stone-100">
        <div>
          <h3 className="text-xl font-bold text-stone-900">Lojas Parceiras</h3>
          <p className="text-xs text-stone-500 mt-1">
            Gerencie as marcas físicas e virtuais integradas e execute
            varreduras inteligentes de produtos.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition"
        >
          {showForm ? (
            <XCircle className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {showForm ? "Cancelar" : "Nova Loja"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                  Nome da Loja
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-white rounded-lg border border-stone-200 px-4 py-2 text-sm"
                  placeholder="ex: Apple, Nike, Sephora..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                  Descrição
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-white rounded-lg border border-stone-200 px-4 py-2 text-sm"
                  placeholder="Breve descritivo para enriquecer os parâmetros de busca..."
                />
              </div>
            </div>
            <div className="space-y-4">
              <ImageInput
                label="Logo (URL)"
                value={logoUrl}
                onChange={setLogoUrl}
              />
              <div className="space-y-2 py-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="storeFeatured"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-stone-300 rounded focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="storeFeatured"
                    className="text-sm font-bold text-stone-700"
                  >
                    Destaque na Home (Barra de Marcas)
                  </label>
                </div>

                {!editingId && (
                  <div className="flex items-start gap-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                    <input
                      type="checkbox"
                      id="autoScanProducts"
                      checked={autoScanProducts}
                      onChange={(e) => setAutoScanProducts(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-stone-300 rounded focus:ring-indigo-500 mt-0.5"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="autoScanProducts"
                        className="text-xs font-bold text-indigo-900 flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 fill-indigo-200" />
                        Varredura de Produtos Inteligente
                      </label>
                      <p className="text-[11px] text-indigo-700 mt-0.5">
                        Realiza uma busca varredora na internet via Google
                        Search integrando até 12 produtos populares desta marca
                        em segundos de forma 100% automatizada.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-bold text-stone-600"
                >
                  Limpar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition"
                >
                  Salvar Loja
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {sortedStores.map((s) => (
          <div
            key={s.id}
            className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm text-center relative group flex flex-col items-center justify-between min-h-[140px] overflow-hidden"
          >
            <div className="h-16 w-full flex items-center justify-center mb-3">
              {s.logoUrl ? (
                <img
                  src={s.logoUrl}
                  alt={s.name}
                  className="h-full w-auto max-w-full object-contain grayscale group-hover:grayscale-0 transition"
                />
              ) : (
                <StoreIcon className="w-8 h-8 text-stone-200" />
              )}
            </div>
            <div className="w-full text-center">
              <span className="font-bold text-stone-800 text-sm truncate w-full px-2 flex items-center justify-center gap-1">
                {s.name}
                {s.isFeatured && (
                  <Star className="w-3 h-3 text-indigo-500 fill-indigo-500" />
                )}
              </span>
            </div>
            <div className="absolute inset-0 bg-stone-900/70 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 backdrop-blur-sm">
              <button
                onClick={() => {
                  setEditingId(s.id);
                  setName(s.name);
                  setLogoUrl(s.logoUrl || "");
                  setDescription(s.description || "");
                  setIsFeatured(s.isFeatured || false);
                  setAutoScanProducts(false);
                  setShowForm(true);
                }}
                className="bg-white p-2 rounded-lg text-indigo-600 hover:scale-110 transition cursor-pointer"
                title="Editar Loja"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => triggerProductScan(s.id, s.name, s.description)}
                className="bg-emerald-500 text-white p-2 rounded-lg hover:scale-110 transition cursor-pointer"
                title="Sincronizar/Buscar Produtos Coerentes com IA"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteStore(s.id)}
                className="bg-white p-2 rounded-lg text-rose-600 hover:scale-110 transition cursor-pointer"
                title="Remover Loja"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InventoryTab({
  products,
  updateProduct,
}: {
  products: Product[];
  updateProduct: any;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStockStatus, setFilterStockStatus] = useState<
    "all" | "low" | "out" | "partner" | "in_stock"
  >("all");
  const [editingStocks, setEditingStocks] = useState<
    Record<
      string,
      {
        inventory: number;
        variants: { id: string; name: string; stock: number }[];
      }
    >
  >({});
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    setEditingStocks((prev) => {
      const merged = { ...prev };
      products.forEach((p) => {
        if (merged[p.id] === undefined) {
          merged[p.id] = {
            inventory: p.inventory || 0,
            variants: (p.variants || []).map((v) => ({
              id: v.id,
              name: v.name,
              stock: v.stock || 0,
            })),
          };
        }
      });
      return merged;
    });
  }, [products]);

  const handleInventoryChange = (productId: string, val: number) => {
    setEditingStocks((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        inventory: Math.max(0, val),
      },
    }));
  };

  const handleVariantStockChange = (
    productId: string,
    variantId: string,
    val: number,
  ) => {
    setEditingStocks((prev) => {
      const prod = prev[productId];
      if (!prod) return prev;
      return {
        ...prev,
        [productId]: {
          ...prod,
          variants: prod.variants.map((v) =>
            v.id === variantId ? { ...v, stock: Math.max(0, val) } : v,
          ),
        },
      };
    });
  };

  const saveProductStock = async (p: Product) => {
    try {
      setSaveLoading(p.id);
      const editingState = editingStocks[p.id];
      if (!editingState) return;

      const updatedVariants = (p.variants || []).map((v) => {
        const editedVar = editingState.variants.find((ev) => ev.id === v.id);
        return {
          ...v,
          stock: editedVar ? editedVar.stock : v.stock,
        };
      });

      await updateProduct(p.id, {
        inventory: editingState.inventory,
        variants: updatedVariants,
      });

      setSaveSuccess(p.id);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaveLoading(null);
    }
  };

  const inStockProducts = products.filter((p) => p.stockType === "IN_STOCK");
  const outOfStockCount =
    inStockProducts.filter((p) => {
      const edit = editingStocks[p.id];
      const inv = edit ? edit.inventory : p.inventory;
      return inv === 0 && (p.variants || []).length === 0;
    }).length +
    inStockProducts.filter((p) => {
      const edit = editingStocks[p.id];
      if (!edit || edit.variants.length === 0) return false;
      return edit.variants.every((v) => v.stock === 0);
    }).length;

  const lowStockCount = inStockProducts.filter((p) => {
    const edit = editingStocks[p.id];
    const inv = edit ? edit.inventory : p.inventory;
    if ((p.variants || []).length === 0) {
      return inv > 0 && inv < 5;
    } else {
      const vars = edit ? edit.variants : [];
      return vars.some((v) => v.stock > 0 && v.stock < 5);
    }
  }).length;

  const totalItemsCount = products.reduce((acc, p) => {
    if (p.stockType === "PARTNER_STORE") return acc;
    const edit = editingStocks[p.id];
    if ((p.variants || []).length === 0) {
      return acc + (edit ? edit.inventory : p.inventory);
    } else {
      const vars = edit ? edit.variants : p.variants || [];
      return acc + vars.reduce((vAcc, v) => vAcc + v.stock, 0);
    }
  }, 0);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const edit = editingStocks[p.id];
    const inv = edit ? edit.inventory : p.inventory;
    const hasVariants = (p.variants || []).length > 0;

    if (filterStockStatus === "all") return true;
    if (filterStockStatus === "partner") return p.stockType === "PARTNER_STORE";
    if (filterStockStatus === "in_stock") return p.stockType === "IN_STOCK";

    if (p.stockType === "PARTNER_STORE") return false;

    if (filterStockStatus === "out") {
      if (!hasVariants) return inv === 0;
      const vars = edit ? edit.variants : [];
      return vars.every((v) => v.stock === 0);
    }

    if (filterStockStatus === "low") {
      if (!hasVariants) return inv > 0 && inv < 5;
      const vars = edit ? edit.variants : [];
      return vars.some((v) => v.stock > 0 && v.stock < 5);
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-stone-900">
            Gestão e Controle de Estoque
          </h3>
          <p className="text-xs text-stone-500">
            Monitore, ajuste quantidades de produtos e gerencie estoques por
            variação de vitrine.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-stone-400 text-xs font-bold uppercase tracking-wider">
              Total em Estoque
            </span>
            <span className="text-2xl font-black text-stone-800">
              {totalItemsCount}{" "}
              <span className="text-xs font-normal text-stone-400">unids</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-stone-400 text-xs font-bold uppercase tracking-wider">
              Estoque Baixo (&lt; 5)
            </span>
            <span className="text-2xl font-black text-stone-800">
              {lowStockCount}{" "}
              <span className="text-xs font-normal text-stone-400">ítens</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-stone-400 text-xs font-bold uppercase tracking-wider">
              Produtos Sem Estoque
            </span>
            <span className="text-2xl font-black text-rose-600">
              {outOfStockCount}{" "}
              <span className="text-xs font-normal text-stone-400">ítens</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-stone-100 text-stone-600">
            <StoreIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-stone-400 text-xs font-bold uppercase tracking-wider">
              Sob Encomenda (Lojas)
            </span>
            <span className="text-2xl font-black text-stone-800">
              {products.filter((p) => p.stockType === "PARTNER_STORE").length}{" "}
              <span className="text-xs font-normal text-stone-400">ítens</span>
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center animate-fade-in animate-duration-300">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por nome, marca, SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-xl border border-stone-200 text-sm bg-stone-50 focus:bg-white transition"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide pb-1">
          <button
            type="button"
            onClick={() => setFilterStockStatus("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition ${filterStockStatus === "all" ? "bg-rose-500 text-white" : "bg-stone-50 text-stone-600 hover:bg-stone-100"}`}
          >
            Todos ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStockStatus("in_stock")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition ${filterStockStatus === "in_stock" ? "bg-emerald-500 text-white" : "bg-stone-50 text-stone-600 hover:bg-stone-100"}`}
          >
            Físico ({products.filter((p) => p.stockType === "IN_STOCK").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStockStatus("low")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition ${filterStockStatus === "low" ? "bg-orange-500 text-white" : "bg-stone-50 text-stone-600 hover:bg-stone-100"}`}
          >
            Estoque Baixo ({lowStockCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStockStatus("out")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition ${filterStockStatus === "out" ? "bg-rose-600 text-white" : "bg-stone-50 text-stone-600 hover:bg-stone-100"}`}
          >
            Esgotados ({outOfStockCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStockStatus("partner")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition ${filterStockStatus === "partner" ? "bg-stone-800 text-white" : "bg-stone-50 text-stone-600 hover:bg-stone-100"}`}
          >
            Sob Encomenda (
            {products.filter((p) => p.stockType === "PARTNER_STORE").length})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-4 text-center">Tipo</th>
                <th className="py-3 px-4 text-center">Referência (SKU)</th>
                <th className="py-3 px-4 text-center min-w-[125px]">
                  Disponibilidade
                </th>
                <th className="py-3 px-4 text-center">Variações</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-stone-400 italic"
                  >
                    Nenhum produto correspondente aos filtros.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const localState = editingStocks[p.id] || {
                    inventory: p.inventory || 0,
                    variants: [],
                  };
                  const hasVariants = (p.variants || []).length > 0;
                  const isLow =
                    p.stockType === "IN_STOCK" &&
                    (hasVariants
                      ? localState.variants.some(
                          (v) => v.stock > 0 && v.stock < 5,
                        )
                      : localState.inventory > 0 && localState.inventory < 5);
                  const isOut =
                    p.stockType === "IN_STOCK" &&
                    (hasVariants
                      ? localState.variants.every((v) => v.stock === 0)
                      : localState.inventory === 0);

                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        className={`${isOut ? "bg-rose-50/10" : ""} hover:bg-stone-50/50 transition`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.imageUrl || undefined}
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover border border-stone-100"
                            />
                            <div>
                              <span className="font-bold text-stone-900 block line-clamp-1">
                                {p.name}
                              </span>
                              <span className="text-[10px] text-stone-400 font-medium">
                                {p.brand || "Sem marca"} · {p.category}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              p.stockType === "PARTNER_STORE" || isOut
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {p.stockType === "PARTNER_STORE"
                              ? "Sob Encomenda"
                              : isOut
                                ? "Compra na Loja (Zerado)"
                                : "Pronta Entrega"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono text-xs text-stone-500">
                            {p.sku || "Sem SKU"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {p.stockType === "PARTNER_STORE" ? (
                            <span className="text-xs text-stone-400 italic">
                              Preço sob orçamento
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              {hasVariants ? (
                                <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                                  {localState.variants.reduce(
                                    (acc, v) => acc + v.stock,
                                    0,
                                  )}{" "}
                                  unids totais
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleInventoryChange(
                                        p.id,
                                        localState.inventory - 1,
                                      )
                                    }
                                    className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold flex items-center justify-center text-xs transition select-none"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    value={localState.inventory}
                                    onChange={(e) =>
                                      handleInventoryChange(
                                        p.id,
                                        parseInt(e.target.value) || 0,
                                      )
                                    }
                                    className="w-12 text-center py-0.5 rounded border border-stone-200 text-xs font-bold bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleInventoryChange(
                                        p.id,
                                        localState.inventory + 1,
                                      )
                                    }
                                    className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold flex items-center justify-center text-xs transition select-none"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                              {isOut && (
                                <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-50 border border-rose-100 px-1 rounded">
                                  Sem estoque
                                </span>
                              )}
                              {isLow && (
                                <span className="text-[9px] font-black uppercase text-orange-500 bg-orange-50 border border-orange-100 px-1 rounded font-sans">
                                  Baixo
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {hasVariants ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedProduct(
                                  expandedProduct === p.id ? null : p.id,
                                )
                              }
                              className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              {p.variants?.length} variações
                              <Plus className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-xs text-stone-400 italic">
                              Sem variações
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {saveSuccess === p.id && (
                              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                                Salvo!
                              </span>
                            )}
                            {p.stockType === "IN_STOCK" && (
                              <button
                                type="button"
                                onClick={() => saveProductStock(p)}
                                disabled={saveLoading === p.id}
                                className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-1 px-3 rounded-lg text-xs transition disabled:bg-rose-300 shadow-sm inline-flex items-center gap-1 cursor-pointer"
                              >
                                {saveLoading === p.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  "Salvar"
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {hasVariants && expandedProduct === p.id && (
                        <tr className="bg-stone-50/80">
                          <td colSpan={6} className="p-4">
                            <div className="border border-stone-200 rounded-xl bg-white p-4 max-w-2xl mx-auto space-y-3">
                              <h4 className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
                                Ajuste de Estoque por Variação
                              </h4>
                              <div className="divide-y divide-stone-100 border-t border-b border-stone-100">
                                {localState.variants.map((v) => (
                                  <div
                                    key={v.id}
                                    className="flex items-center justify-between py-2 text-xs"
                                  >
                                    <span className="font-bold text-stone-705 text-stone-700">
                                      {v.name}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {v.stock === 0 && (
                                        <span className="text-[9px] font-bold uppercase text-rose-500 mr-2">
                                          Sem estoque
                                        </span>
                                      )}
                                      {v.stock > 0 && v.stock < 5 && (
                                        <span className="text-[9px] font-bold uppercase text-orange-500 mr-2">
                                          Estoque Baixo
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleVariantStockChange(
                                            p.id,
                                            v.id,
                                            v.stock - 1,
                                          )
                                        }
                                        className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center font-bold select-none"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        value={v.stock}
                                        onChange={(e) =>
                                          handleVariantStockChange(
                                            p.id,
                                            v.id,
                                            parseInt(e.target.value) || 0,
                                          )
                                        }
                                        className="w-12 text-center border rounded border-stone-200 py-0.5 bg-white font-bold"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleVariantStockChange(
                                            p.id,
                                            v.id,
                                            v.stock + 1,
                                          )
                                        }
                                        className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center font-bold select-none"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-end pt-2">
                                <button
                                  type="button"
                                  onClick={() => saveProductStock(p)}
                                  disabled={saveLoading === p.id}
                                  className="bg-stone-850 bg-stone-800 hover:bg-stone-900 text-white rounded-lg px-4 py-1.5 text-xs font-bold cursor-pointer"
                                >
                                  {saveLoading === p.id
                                    ? "Salvando..."
                                    : "Aplicar nas Variações"}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AdminKnowledgeTab({
  systemKnowledge,
  addSystemKnowledge,
  updateSystemKnowledge,
  deleteSystemKnowledge,
}: {
  systemKnowledge: SystemKnowledge[];
  addSystemKnowledge: any;
  updateSystemKnowledge: any;
  deleteSystemKnowledge: any;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "APPROVED" | "PENDING"
  >("ALL");

  // Modal state for manually adding rules
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<
    "ESTOQUE" | "FRETE" | "IMPOSTOS" | "CANCELAMENTO" | "POLÍTICAS" | "OUTROS"
  >("OUTROS");

  // Edit state
  const [editingItem, setEditingItem] = useState<SystemKnowledge | null>(null);
  const [editDescription, setEditDescription] = useState("");

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;
    try {
      await addSystemKnowledge({
        title: newTitle,
        description: newDescription,
        category: newCategory,
        isApproved: true, // Manually entered rules are approved by default
        confidence: 1.0,
        type: "HUMAN_REPLY",
      });
      setNewTitle("");
      setNewDescription("");
      setNewCategory("OUTROS");
      setIsNewModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editDescription.trim()) return;
    try {
      await updateSystemKnowledge(editingItem.id, {
        description: editDescription,
      });
      setEditingItem(null);
      setEditDescription("");
    } catch (err) {
      console.error(err);
    }
  };

  const filteredKnowledge = systemKnowledge.filter((k) => {
    const matchesSearch =
      k.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "ALL" || k.category === categoryFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "APPROVED" && k.isApproved) ||
      (statusFilter === "PENDING" && !k.isApproved);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "ESTOQUE":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "FRETE":
        return "bg-sky-50 text-sky-800 border-sky-200";
      case "IMPOSTOS":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "CANCELAMENTO":
        return "bg-rose-50 text-rose-800 border-rose-200";
      case "POLÍTICAS":
        return "bg-indigo-50 text-indigo-800 border-indigo-200";
      default:
        return "bg-stone-50 text-stone-800 border-stone-200";
    }
  };

  const approvedRules = systemKnowledge.filter((k) => k.isApproved);
  const pendingRules = systemKnowledge.filter((k) => !k.isApproved);

  return (
    <div className="space-y-6">
      {/* Top dashboard summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-stone-500 font-medium text-sm block">
              Total de Regras
            </span>
            <span className="text-3xl font-display font-bold text-stone-900 mt-1 block">
              {systemKnowledge.length}
            </span>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl">
            <BookOpen className="w-6 h-6 text-stone-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-rose-600 font-medium text-sm block">
              Regras Ativas (IA)
            </span>
            <span className="text-3xl font-display font-bold text-rose-700 mt-1 block">
              {approvedRules.length}
            </span>
            <span className="text-xs text-rose-500 mt-1 block">
              Influenciando o Bot Ativo
            </span>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl">
            <Sparkles className="w-6 h-6 text-rose-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-amber-700 font-medium text-sm block">
              Aguardando Aprovação
            </span>
            <span className="text-3xl font-display font-bold text-amber-800 mt-1 block">
              {pendingRules.length}
            </span>
            <span className="text-xs text-amber-600 mt-1 block">
              Auto-aprendidos de Atendimentos
            </span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <Brain className="w-6 h-6 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-stone-100 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar regras aprendidas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg border-stone-200 text-stone-700 bg-stone-50/50 hover:bg-stone-50 focus:bg-white text-sm"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded-lg border-stone-200 text-stone-700 py-2 px-3 text-sm bg-white"
          >
            <option value="ALL">Todas Categorias</option>
            <option value="ESTOQUE">Estoque</option>
            <option value="FRETE">Frete</option>
            <option value="IMPOSTOS">Impostos / Alfândega</option>
            <option value="CANCELAMENTO">Prazos & Cancelamentos</option>
            <option value="POLÍTICAS">Políticas Gerais</option>
            <option value="OUTROS">Outros</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border rounded-lg border-stone-200 text-stone-700 py-2 px-3 text-sm bg-white"
          >
            <option value="ALL">Todos Status</option>
            <option value="APPROVED">Ativos (Aprovados)</option>
            <option value="PENDING">Pendentes (Auto-aprendidos)</option>
          </select>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Regra Manual
        </button>
      </div>

      {/* Grid of Knowledge Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredKnowledge.length === 0 ? (
          <div className="col-span-2 py-16 text-center bg-white rounded-2xl border border-stone-100">
            <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500 font-medium font-sans">
              Nenhuma regra ativa ou pendente encontrada.
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Sua IA aprende observando o suporte em tempo real.
            </p>
          </div>
        ) : (
          filteredKnowledge.map((k) => (
            <div
              key={k.id}
              className={`p-6 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                k.isApproved
                  ? "bg-white border-stone-200 shadow-sm hover:shadow-md"
                  : "bg-amber-50/40 border-amber-200/70 shadow-xs"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getCategoryColor(k.category)}`}
                      >
                        {k.category}
                      </span>
                      {k.isApproved ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Ativo no Bot
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Auto-aprendido (Pendente)
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-stone-900 tracking-tight leading-snug">
                      {k.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingItem(k);
                        setEditDescription(k.description);
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors"
                      title="Editar descrição da regra"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteSystemKnowledge(k.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Remover regra"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-sm text-stone-600 font-normal leading-relaxed whitespace-pre-line bg-stone-50/50 p-3.5 rounded-xl border border-stone-100/50">
                  {k.description}
                </div>

                {/* Score & Meta */}
                <div className="flex flex-col gap-2 pt-2 border-t border-stone-100">
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="flex items-center gap-1.5 font-medium">
                      {k.type === "HUMAN_REPLY" ? (
                        <>
                          <Users className="w-3.5 h-3.5 text-stone-400" />
                          Atendimento Humano Observado
                        </>
                      ) : (
                        <>
                          <Brain className="w-3.5 h-3.5 text-stone-400" />
                          Atendimento Virtual Observado
                        </>
                      )}
                    </span>
                    <span className="font-bold text-stone-700 font-mono">
                      Confiança: {Math.round(k.confidence * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${k.isApproved ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ width: `${k.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons at card bottom */}
              <div className="flex items-center justify-end gap-3 pt-4 mt-2">
                {!k.isApproved ? (
                  <button
                    onClick={() =>
                      updateSystemKnowledge(k.id, {
                        isApproved: true,
                        confidence: 1.0,
                      })
                    }
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 px-4 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Aprovar Regra e Integrar na Memória do Bot
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      updateSystemKnowledge(k.id, { isApproved: false })
                    }
                    className="w-full text-stone-500 hover:text-stone-800 hover:bg-stone-50 border border-stone-200 rounded-xl py-2 px-4 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pausar Diretriz
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Description Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl border border-stone-100 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-bold text-stone-900 leading-snug">
                Editar Regra de IA
              </h4>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-50"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500 font-medium">
              Altere a diretriz de resolução do cenário para refilar como o
              Assistente Virtual deve reagir no chat.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Regra para: {editingItem.title}
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={5}
                className="w-full p-3 border rounded-xl border-stone-200 text-stone-700 bg-stone-50/50 hover:bg-stone-50 focus:bg-white text-sm focus:outline-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Manual Rule Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <form
            onSubmit={handleAddRule}
            className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl border border-stone-100 flex flex-col space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-bold text-stone-900">
                Nova Diretriz Manual do Sistema
              </h4>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-50"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                  Título do Cenário
                </label>
                <input
                  type="text"
                  required
                  placeholder="EX: Cancelamento de Peças Sob Encomenda"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-3 border rounded-xl border-stone-200 text-stone-700 bg-stone-50/50 text-sm focus:outline-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                    Categoria
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-3 border rounded-xl border-stone-200 text-stone-700 bg-white text-sm focus:outline-rose-500"
                  >
                    <option value="ESTOQUE">Estoque</option>
                    <option value="FRETE">Frete</option>
                    <option value="IMPOSTOS">Impostos / Alfândega</option>
                    <option value="CANCELAMENTO">Prazos & Cancelamentos</option>
                    <option value="POLÍTICAS">Políticas Gerais</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                  Diretriz de Resolução (Como o Bot deve Agir)
                </label>
                <textarea
                  required
                  placeholder="EX: Explique ao cliente que encomendas especiais já pagas sofrem carência de 3 dias para estorno..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={4}
                  className="w-full p-3 border rounded-xl border-stone-200 text-stone-700 bg-stone-50/50 text-sm focus:outline-rose-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold cursor-pointer"
              >
                Adicionar Diretriz
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
