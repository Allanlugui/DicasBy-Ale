import React, { useState } from 'react';
import { useAppContext } from '../context';
import { QuoteRequest } from '../types';
import { formatCurrency } from '../lib/utils';
import { Search, Filter, DollarSign, MapPin, Send, MessageSquare, Mail, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export function AdminQuotesTab() {
  const { quoteRequests, updateQuoteRequest } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeQuote, setActiveQuote] = useState<QuoteRequest | null>(null);

  // Form states for active quote editing
  const [quotedUSD, setQuotedUSD] = useState('');
  const [quotedBRL, setQuotedBRL] = useState('');
  const [storeLocation, setStoreLocation] = useState('');

  // When a quote is selected, populate fields
  const selectQuote = (quote: QuoteRequest) => {
    setActiveQuote(quote);
    setQuotedUSD(quote.quotedPriceUSD?.toString() || quote.priceUSD?.toString() || '');
    setQuotedBRL(quote.quotedPriceBRL?.toString() || '');
    setStoreLocation(quote.storeLocationUS || '');
  };

  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuote) return;

    const usdVal = parseFloat(quotedUSD);
    const brlVal = parseFloat(quotedBRL);

    if (isNaN(usdVal) || isNaN(brlVal) || !storeLocation.trim()) {
      alert("Por favor, digite valores numéricos válidos e preencha a localização da loja.");
      return;
    }

    try {
      await updateQuoteRequest(activeQuote.id, {
        quotedPriceUSD: usdVal,
        quotedPriceBRL: brlVal,
        storeLocationUS: storeLocation.trim(),
        status: 'QUOTED'
      });
      alert("Orçamento gravado e enviado com sucesso para o cliente!");
      // Refresh active selection state
      setActiveQuote(prev => prev ? {
        ...prev,
        quotedPriceUSD: usdVal,
        quotedPriceBRL: brlVal,
        storeLocationUS: storeLocation.trim(),
        status: 'QUOTED'
      } : null);
    } catch (err) {
      console.error(err);
      alert("Ocorreu um erro ao gravar o orçamento.");
    }
  };

  const filteredQuotes = quoteRequests.filter(q => {
    const matchesSearch = q.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          q.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' ? true : q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Notifications Builder
  const getNotificationMessage = (quote: QuoteRequest) => {
    const code = quote.id.substring(0, 6).toUpperCase();
    return `Olá ${quote.customerName}! Seu orçamento para o produto *${quote.productName}* foi gerado com sucesso na Dicas by Alê.

*Valores do Orçamento:*
- Encontrado em: ${quote.storeLocationUS || 'Loja física americana'}
- Valor Final com taxas: R$ ${(quote.quotedPriceBRL || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

Para aprovar, basta acessar a nossa plataforma na sua Página Inicial e clicar em *Aparovar* para que possamos iniciar a compra!`;
  };

  const handleWhatsAppNotify = (quote: QuoteRequest) => {
    if (!quote.customerPhone) {
      alert("O cliente não informou o telefone.");
      return;
    }
    const cleanPhone = quote.customerPhone.replace(/\D/g, '');
    const textMsg = encodeURIComponent(getNotificationMessage(quote));
    window.open(`https://wa.me/${cleanPhone}?text=${textMsg}`, '_blank');
  };

  const handleEmailNotify = (quote: QuoteRequest) => {
    const subject = encodeURIComponent(`Seu Orçamento Disponível: ${quote.productName}`);
    const body = encodeURIComponent(getNotificationMessage(quote));
    window.open(`mailto:${quote.customerEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[75vh]">
      {/* Left panel: list of requests */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 flex flex-col overflow-hidden h-full">
        <div className="p-4 border-b border-stone-100 bg-stone-50 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input 
              type="text" 
              placeholder="Buscar por produto ou cliente..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-stone-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-stone-600 focus:outline-none"
            >
              <option value="ALL">Todos Status</option>
              <option value="PENDING">Aguardando Avaliação (Pendente)</option>
              <option value="QUOTED">Orçado (Enviado)</option>
              <option value="APPROVED">Aprovado pelo Cliente</option>
              <option value="REJECTED">Recusado pelo Cliente</option>
              <option value="ORDERED">Pedido Gerado</option>
            </select>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-2 space-y-1">
          {filteredQuotes.map(q => {
            const isSelected = activeQuote?.id === q.id;
            return (
              <button
                key={q.id}
                onClick={() => selectQuote(q)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  isSelected 
                    ? 'bg-rose-50/50 border-rose-200 shadow-sm' 
                    : 'bg-white border-transparent hover:bg-stone-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                    #{q.id.substring(0, 6).toUpperCase()}
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    q.status === 'PENDING' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                    q.status === 'QUOTED' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                    q.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    'bg-stone-50 text-stone-400 border border-stone-100'
                  }`}>
                    {q.status === 'PENDING' ? 'Pendente' :
                     q.status === 'QUOTED' ? 'Respondido' :
                     q.status === 'APPROVED' ? 'Aprovado' :
                     q.status === 'REJECTED' ? 'Recusado' : 'Encerrado'}
                  </span>
                </div>
                
                <h4 className="font-bold text-stone-900 text-sm mt-2 line-clamp-1">{q.productName}</h4>
                <p className="text-xs text-stone-500 line-clamp-1">Por: {q.customerName}</p>
                
                <div className="flex justify-between items-center mt-2 text-[11px] text-stone-400">
                  <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                  {q.quotedPriceBRL && (
                    <span className="font-bold text-stone-800">{formatCurrency(q.quotedPriceBRL)}</span>
                  )}
                </div>
              </button>
            );
          })}
          
          {filteredQuotes.length === 0 && (
            <div className="text-center py-12 text-sm text-stone-400">
              Nenhuma solicitação de orçamento encontrada.
            </div>
          )}
        </div>
      </div>

      {/* Right side: details and response form */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-100 flex flex-col h-full overflow-hidden">
        {activeQuote ? (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Header info */}
            <div className="p-5 border-b border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="font-mono text-xs text-stone-400">Solicitação #{activeQuote.id.toUpperCase()}</span>
                <h3 className="text-lg font-bold text-stone-900 mt-0.5">{activeQuote.productName}</h3>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  onClick={() => handleWhatsAppNotify(activeQuote)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-emerald-100"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
                <button
                  onClick={() => handleEmailNotify(activeQuote)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-stone-200"
                >
                  <Mail className="h-3.5 w-3.5" />
                  E-mail
                </button>
              </div>
            </div>

            {/* Inner Details */}
            <div className="p-6 space-y-6 flex-grow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-stone-100">
                {activeQuote.productImageUrl && (
                  <div className="aspect-video sm:aspect-square rounded-xl bg-stone-50 overflow-hidden border border-stone-100 flex items-center justify-center">
                    <img 
                      src={activeQuote.productImageUrl} 
                      alt={activeQuote.productName} 
                      className="max-h-full max-w-full object-contain p-2"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase text-stone-400 tracking-wider">Cliente Solicitante</span>
                  <div className="rounded-xl bg-stone-50 p-4 space-y-2 text-sm border border-stone-100">
                    <div><span className="font-semibold text-stone-500">Nome:</span> {activeQuote.customerName}</div>
                    <div><span className="font-semibold text-stone-500">E-mail:</span> {activeQuote.customerEmail}</div>
                    {activeQuote.customerPhone && (
                      <div><span className="font-semibold text-stone-500">Telefone:</span> {activeQuote.customerPhone}</div>
                    )}
                    <div><span className="font-semibold text-stone-500">Criado em:</span> {new Date(activeQuote.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-stone-400 tracking-wider mb-2">Descrição e Instruções do Produto</h4>
                <p className="text-sm text-stone-600 bg-stone-50/50 p-4 rounded-xl border border-stone-100 whitespace-pre-wrap">
                  {activeQuote.productDescription || "Nenhuma informação adicional fornecida."}
                </p>
              </div>

              {activeQuote.priceUSD > 0 && (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm font-semibold border border-emerald-100">
                  <DollarSign className="h-5 w-5 shrink-0" />
                  <span>Estimativa de preço na pesquisa automática: ${activeQuote.priceUSD.toFixed(2)} USD</span>
                </div>
              )}

              {/* Responder orçamento */}
              {(activeQuote.status === 'PENDING' || activeQuote.status === 'QUOTED') && (
                <form onSubmit={handleSaveQuote} className="pt-4 border-t border-stone-100 space-y-4">
                  <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    <Send className="h-4 w-4 text-rose-500" />
                    Preencher Valores Oficial do Orçamento
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-500 mb-1">Preço Final nos EUA (USD)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={quotedUSD}
                        onChange={e => setQuotedUSD(e.target.value)}
                        placeholder="Ex: 29.99"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 mb-1">Preço Final de Venda Brasil (BRL)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={quotedBRL}
                        onChange={e => setQuotedBRL(e.target.value)}
                        placeholder="Ex: 199.90 (Com taxas incluídas)"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-1">Loja ou Site Americano de Origem</label>
                    <input 
                      type="text" 
                      required
                      value={storeLocation}
                      onChange={e => setStoreLocation(e.target.value)}
                      placeholder="Ex: Sephora Florida Mall / Walmart Online"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-stone-900 text-white font-bold py-3 px-4 rounded-xl hover:bg-stone-800 transition text-sm"
                  >
                    Gravar e Fornecer Orçamento
                  </button>
                </form>
              )}

              {/* Status Display once evaluated */}
              {activeQuote.status !== 'PENDING' && activeQuote.status !== 'QUOTED' && (
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <h4 className="font-bold text-stone-800 text-sm flex items-center gap-2">
                    {activeQuote.status === 'APPROVED' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-stone-400" />
                    )}
                    Orçamento Resolvido pelo Cliente
                  </h4>
                  <div className="text-xs text-stone-600 grid grid-cols-2 gap-2 pt-1 font-medium">
                    <div>Status: <span className="font-bold uppercase text-stone-900">{activeQuote.status}</span></div>
                    <div>Loja EUA: <span className="font-bold text-stone-900">{activeQuote.storeLocationUS}</span></div>
                    <div>Valor EUA: <span className="font-bold text-stone-900">${activeQuote.quotedPriceUSD?.toFixed(2)}</span></div>
                    <div>Valor Brasil: <span className="font-bold text-stone-900">{formatCurrency(activeQuote.quotedPriceBRL || 0)}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center text-stone-400 font-medium">
            Selecione uma solicitação de orçamento na lista para visualizar e responder.
          </div>
        )}
      </div>
    </div>
  );
}
