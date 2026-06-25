import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Package, MapPin, Truck, CheckCircle, Clock, Camera, Star, Upload, XCircle, Landmark, Copy, Info, ArrowRight, DollarSign, FileText, FileDown, ExternalLink, Box } from 'lucide-react';
import { useAppContext } from '../context';
import { ImageInput } from '../components/ImageInput';
import { Trash2 } from 'lucide-react';
import { Order, OrderStatus, OrderEvent, Review } from '../types';
import { formatCurrency, safeCopyText, generatePixCode } from '../lib/utils';

const STATUS_ICONS: Record<OrderStatus, React.ElementType> = {
  'PENDING_PAYMENT': Clock,
  'PAYMENT_RECEIVED': Clock,
  'PURCHASED_IN_STORE': Package,
  'STORED_IN_US': MapPin,
  'AWAITING_SHIPPING_PAYMENT': DollarSign,
  'SHIPPING_PAID': CheckCircle,
  'IN_TRANSIT_TO_BR': Truck,
  'ARRIVED_IN_BR': MapPin,
  'DELIVERED': CheckCircle,
  'CANCELLED': XCircle,
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  'PENDING_PAYMENT': 'Aguardando Pagamento',
  'PAYMENT_RECEIVED': 'Pagamento Confirmado',
  'PURCHASED_IN_STORE': 'Comprado na Loja',
  'STORED_IN_US': 'Armazenado no CD EUA',
  'AWAITING_SHIPPING_PAYMENT': 'Aguardando Pagamento do Frete',
  'SHIPPING_PAID': 'Frete Pago',
  'IN_TRANSIT_TO_BR': 'Em trâmite para o Brasil (Despachado)',
  'ARRIVED_IN_BR': 'Chegou no Brasil',
  'DELIVERED': 'Entregue ao Cliente',
  'CANCELLED': 'Cancelado',
};

export function Tracking() {
  const { orders, submitReview, companySettings, autoSaveUserDocument, updateOrderStatus } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get('id') || '';
  
  const [trackingInput, setTrackingInput] = useState(initialId);
  const [order, setOrder] = useState<Order | null>(null);
  const [searchResults, setSearchResults] = useState<Order[]>([]);
  const [searched, setSearched] = useState(!!initialId);
  const [searchType, setSearchType] = useState<'ID' | 'CPF' | null>(null);

  // Payments and local receipt upload states
  const [copiedKey, setCopiedKey] = useState(false);
  const [uploadedReceipt, setUploadedReceipt] = useState<string | null>(null);

  const handleUploadReceipt = async (url: string, currentOrder: Order) => {
    setUploadedReceipt(url);
    const targetUserId = currentOrder.userId || currentOrder.customerEmail || 'convidado';
    const userName = currentOrder.customerName || 'Cliente';
    const category = 'Comprovantes de Pagamento';
    const docName = `Comprovante - Pedido ${currentOrder.id} - ${new Date().toLocaleDateString()}`;
    await autoSaveUserDocument(targetUserId, userName, category, docName, url);
    await updateOrderStatus(currentOrder.id, currentOrder.status, `Comprovante anexado pelo cliente. Arquivo salvo na pasta.`);
  };

  // Review state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    if (initialId) {
      handleSearch(initialId);
    }
  }, [initialId, orders]);

  const handleSearch = (query: string) => {
    setSearched(true);
    const cleanQuery = query.replace(/[^\w\s]/g, '').trim().toUpperCase();
    const isCPF = cleanQuery.length === 11 && /^\d+$/.test(cleanQuery);
    
    let found: Order[] = [];
    if (isCPF) {
      setSearchType('CPF');
      found = orders.filter(o => o.customerDocument?.replace(/[^\w\s]/g, '') === cleanQuery);
    } else {
      setSearchType('ID');
      const match = orders.find(o => o.trackingId === query.toUpperCase() || o.id === query);
      found = match ? [match] : [];
    }
    
    setSearchResults(found);
    if (found.length === 1) {
      setOrder(found[0]);
    } else {
      setOrder(null);
    }
    
    if(query !== searchParams.get('id')) {
        setSearchParams({ id: query });
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(trackingInput);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || rating === 0) return alert('Por favor, selecione uma nota.');
    
    const review: Review = {
      id: '',
      orderId: order.id,
      userId: order.userId,
      customerName: order.customerName,
      rating,
      comment,
      photos: reviewPhotos,
      createdAt: new Date().toISOString()
    };
    
    try {
      await submitReview(review);
      setReviewSubmitted(true);
    } catch(e) {
      console.error(e);
      alert('Erro ao enviar avaliação.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Search Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 md:p-8 text-center mb-8">
        <h1 className="text-2xl font-bold font-display text-stone-900 mb-2">Rastrear Pedido</h1>
        <p className="text-stone-500 mb-6 max-w-lg mx-auto text-sm">Insira o código de rastreio ou seu CPF para acompanhar suas importações em tempo real.</p>
        
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
          <button type="submit" className="bg-stone-900 text-white px-6 rounded-r-xl font-bold text-sm tracking-wide hover:bg-stone-800 transition">
            Buscar
          </button>
        </form>

        {/* Suggest direct access if logged in */}
        {orders.length > 0 && !searched && (
          <div className="mt-8 pt-6 border-t border-stone-100">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Seus Pedidos Recentes</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {orders.slice(0, 3).map(o => (
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
            <h3 className="text-lg font-bold font-display text-stone-900">Foram encontrados {searchResults.length} pedidos para este CPF</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {searchResults.map(o => (
              <button
                key={o.id}
                onClick={() => setOrder(o)}
                className="bg-white border border-stone-200 p-4 rounded-2xl text-left hover:border-rose-300 hover:shadow-sm transition group"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-rose-500 tracking-wider uppercase">{o.trackingId}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    o.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {STATUS_LABELS[o.status]}
                  </span>
                </div>
                <div className="text-sm font-bold text-stone-900 mb-1">{o.items.length} item(s)</div>
                <div className="text-xs text-stone-500">Em {new Date(o.createdAt).toLocaleDateString('pt-BR')}</div>
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
          <h3 className="text-lg font-bold font-display text-stone-900">Pedido não encontrado</h3>
          <p className="text-stone-500 mt-1 text-sm">Verifique o código e tente novamente.</p>
        </div>
      )}

      {order && (
        <div className="space-y-6">
          {/* Order Brief */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="text-xs font-bold text-rose-500 mb-1 tracking-widest uppercase">ID: {order.trackingId}</div>
              <h2 className="text-2xl font-display font-medium text-stone-900">{order.customerName}</h2>
              <div className="text-sm text-stone-500">{order.items.length} item(s) • Pedido em {new Date(order.createdAt).toLocaleDateString('pt-BR')}</div>
            </div>
            <div className="bg-rose-50 px-5 py-3 rounded-xl border border-rose-100 text-right">
              <div className="text-[10px] tracking-wider text-rose-500 font-bold uppercase mb-1">Status Atual</div>
              <div className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  {order.status !== 'DELIVERED' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>}
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                {STATUS_LABELS[order.status]}
              </div>
            </div>
          </div>

          {/* Carrier Tracking Info */}
          {(order.carrierName || order.carrierTrackingCode) && (() => {
            const carrier = (order.carrierName || '').toLowerCase();
            const carrierLogo = carrier.includes('fedex') 
              ? 'https://upload.wikimedia.org/wikipedia/commons/b/b9/FedEx_Corporation_-_Logo.svg'
              : carrier.includes('dhl')
              ? 'https://upload.wikimedia.org/wikipedia/commons/a/ac/DHL_Logo.svg'
              : carrier.includes('ups')
              ? 'https://upload.wikimedia.org/wikipedia/commons/1/1b/UPS_Logo_2014.svg'
              : carrier.includes('usps')
              ? 'https://upload.wikimedia.org/wikipedia/commons/d/d3/United_States_Postal_Service_Logo_2022.svg'
              : null;

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
                        <h3 className="text-lg font-bold font-display leading-tight">Rastreio da Transportadora</h3>
                        <p className="text-[10px] text-indigo-100 uppercase tracking-[0.2em] font-black opacity-80">Logística Internacional</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10 flex items-center gap-4">
                        {carrierLogo ? (
                          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-2 shrink-0 shadow-inner">
                            <img src={carrierLogo} alt={order.carrierName} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <Box className="w-6 h-6 text-white/60" />
                          </div>
                        )}
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-indigo-200 uppercase font-black tracking-widest block">Transportadora</span>
                          <span className="text-base font-bold block leading-tight">{order.carrierName || 'Não especificada'}</span>
                        </div>
                      </div>

                      <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                        <span className="text-[10px] text-indigo-200 uppercase font-black tracking-widest block mb-1">Código de Rastreio</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-mono font-bold tracking-tight select-all">{order.carrierTrackingCode || 'Pendente'}</span>
                          {order.carrierTrackingCode && (
                            <button 
                              onClick={() => {
                                safeCopyText(order.carrierTrackingCode || '');
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
                      <span>Copie o código acima e utilize no site oficial da <strong>{order.carrierName || 'transportadora'}</strong> para acompanhar o deslocamento em tempo real.</span>
                    </div>
                 </div>
              </div>
            );
          })()}

          {/* Payment Details for PENDING_PAYMENT or AWAITING_SHIPPING_PAYMENT */}
          {(order.status === 'PENDING_PAYMENT' || order.status === 'AWAITING_SHIPPING_PAYMENT') && (() => {
            const activePixKey = companySettings?.pixKey || 'jallanluiz@gmail.com';
            const activePixName = companySettings?.pixName || 'ImportaGringa VIP';
            const activePixCity = companySettings?.pixCity || 'SAO PAULO';
            
            // Use final shipping fee if it exists and we are in shipping payment status
            const amount = order.status === 'AWAITING_SHIPPING_PAYMENT' 
              ? (order.finalShippingFeeBRL || order.shippingFeeBRL || 0)
              : order.totalBRL;

            const pixCode = generatePixCode(activePixKey, activePixName, activePixCity, amount);

            const copyPix = async () => {
              await safeCopyText(pixCode);
              setCopiedKey(true);
              setTimeout(() => setCopiedKey(false), 2500);
            };

            const isShipping = order.status === 'AWAITING_SHIPPING_PAYMENT';
            const method = order.paymentMethod || 'pix';

            return (
              <div className={`bg-white rounded-2xl border ${isShipping ? 'border-rose-200' : 'border-rose-100'} p-6 md:p-8 space-y-6 shadow-sm animate-scale-in`}>
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <Landmark className={`w-5 h-5 ${isShipping ? 'text-rose-600' : 'text-rose-500'} hover:scale-110 transition`} />
                  <h3 className="text-base font-bold text-stone-900 font-display">
                    {isShipping ? 'Efetuar o Pagamento do FRETE' : 'Efetuar o Pagamento do Pedido'}
                  </h3>
                </div>

                {/* Se for frete, ou se o método de pagamento principal do pedido for PIX, exibe o fluxo de Pix */}
                {(isShipping || method === 'pix') ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                      <p className="text-xs text-stone-600 leading-relaxed">
                        {isShipping 
                          ? 'Sua encomenda já está pronta no nosso galpão! Para que possamos prosseguir com o despacho internacional para o Brasil, por favor efetue o pagamento do frete final calculado.'
                          : 'Sua compra internacional aguarda confirmação de transferência Pix para darmos início ao faturamento aduaneiro seguro.'}
                      </p>

                      <div className="space-y-1.5 p-3.5 bg-stone-50 rounded-xl border border-stone-100 text-xs">
                        <div className="flex justify-between">
                          <span className="text-stone-400">Beneficiário:</span>
                          <strong className="text-stone-900">{activePixName}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Chave Pix:</span>
                          <strong className="text-stone-900 select-all font-mono">{activePixKey}</strong>
                        </div>
                        <div className="flex justify-between border-t border-stone-200/60 pt-2 mt-2">
                          <span className="text-stone-500 font-bold">{isShipping ? 'Frete a Pagar:' : 'Valor do Pedido:'}</span>
                          <strong className="text-rose-600 text-sm font-semibold">{formatCurrency(amount)}</strong>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={copyPix}
                          className={`cursor-pointer py-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                            copiedKey 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-stone-900 hover:bg-stone-800 text-white border-transparent'
                          }`}
                        >
                          {copiedKey ? <CheckCircle className="w-4 h-4 text-emerald-600 animate-bounce" /> : <Copy className="w-4 h-4" />}
                          {copiedKey ? 'Copiado!' : 'Copiar Código Pix Copia e Cola'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 text-center flex flex-col items-center">
                      <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 inline-block shadow-inner hover:scale-[1.02] transition">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixCode)}`} 
                          alt="QR Code Pix" 
                          className="w-40 h-40 object-contain mx-auto"
                        />
                      </div>
                      
                      <div className="w-full max-w-sm space-y-2 text-left">
                        <label className="text-[11px] font-bold text-stone-600 block">Já efetuou o pagamento{isShipping ? ' do frete' : ''}? Envie o comprovante:</label>
                        {uploadedReceipt ? (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-semibold space-y-1">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Comprovante registrado com sucesso!</span>
                            </div>
                            <span className="text-[10px] text-emerald-600 font-normal block leading-snug">Seu comprovante foi anexado e enviado ao nosso setor administrativo. A liberação de logística ocorrerá em instantes.</span>
                          </div>
                        ) : (
                          <ImageInput 
                            value=""
                            placeholder="Anexar comprovante de pagamento..."
                            onChange={url => { if (url) handleUploadReceipt(url, order); }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ) : method === 'boleto' ? (
                  // Se for BOLETO
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                      <p className="text-xs text-stone-600 leading-relaxed">
                        Seu pedido foi registrado e o boleto bancário já está disponível para pagamento! Pague pelo seu internet banking copiando o código de barras abaixo ou visualize o boleto completo em PDF.
                      </p>

                      <div className="space-y-1.5 p-3.5 bg-stone-50 rounded-xl border border-stone-100 text-xs">
                        <div className="flex justify-between">
                          <span className="text-stone-500 font-bold">Valor do Boleto:</span>
                          <strong className="text-rose-600 text-sm font-semibold">{formatCurrency(amount)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Vencimento:</span>
                          <strong className="text-stone-800">1 dia útil</strong>
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
                            <FileDown className="w-4 h-4" /> Visualizar Boleto em PDF
                          </a>
                        )}

                        {order.asaasInvoiceUrl && (
                          <a
                            href={order.asaasInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cursor-pointer py-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300 text-center"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Fatura Completa no Asaas
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="space-y-5">
                      {order.barCode ? (
                        <div className="space-y-2">
                          <label className="text-[10px] text-stone-400 uppercase font-black tracking-widest block">Linha Digitável (Copiar e Colar)</label>
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
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : 'bg-rose-600 hover:bg-rose-700 text-white border-transparent'
                            }`}
                          >
                            {copiedKey ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 animate-bounce" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedKey ? 'Código de Barras Copiado!' : 'Copiar Código de Barras'}
                          </button>
                        </div>
                      ) : (
                        <div className="bg-stone-50 rounded-xl p-4 text-center border border-dashed border-stone-200 text-xs text-stone-400">
                          Código de barras sendo gerado pelo banco. Caso demore, visualize a fatura completa no link ao lado.
                        </div>
                      )}

                      <div className="w-full space-y-2 text-left pt-1">
                        <label className="text-[11px] font-bold text-stone-600 block">Já pagou o boleto? Envie o comprovante:</label>
                        {uploadedReceipt ? (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-semibold space-y-1">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Comprovante registrado com sucesso!</span>
                            </div>
                            <span className="text-[10px] text-emerald-600 font-normal block leading-snug">Seu comprovante foi anexado e enviado ao nosso setor administrativo. A liberação de logística ocorrerá em instantes.</span>
                          </div>
                        ) : (
                          <ImageInput 
                            value=""
                            placeholder="Anexar comprovante de boleto..."
                            onChange={url => { if (url) handleUploadReceipt(url, order); }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Se for CARTÃO DE CRÉDITO
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                      <p className="text-xs text-stone-600 leading-relaxed">
                        Seu pagamento por cartão de crédito está sob análise de risco e verificação de segurança antifraude aduaneira no Asaas. Esse processo geralmente leva alguns minutos.
                      </p>

                      <div className="space-y-1.5 p-3.5 bg-stone-50 rounded-xl border border-stone-100 text-xs">
                        <div className="flex justify-between">
                          <span className="text-stone-500 font-bold">Valor Autorizado:</span>
                          <strong className="text-rose-600 text-sm font-semibold">{formatCurrency(amount)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Status da Transação:</span>
                          <strong className="text-amber-600 font-bold uppercase tracking-wide text-[10px] bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Em Análise</strong>
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
                            <ExternalLink className="w-4 h-4" /> Acessar Minha Fatura no Asaas
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-stone-50 rounded-xl p-5 border border-stone-200 text-xs space-y-2 text-stone-600 leading-relaxed">
                        <strong className="text-stone-950 block text-xs">🔒 Transações com Cartão Protegidas</strong>
                        <span>O banco Asaas exige a validação aduaneira do portador do cartão. Se houver qualquer divergência cadastral, a transação poderá ser estornada automaticamente para sua segurança.</span>
                      </div>

                      <div className="w-full space-y-2 text-left">
                        <label className="text-[11px] font-bold text-stone-600 block">Deseja anexar a fatura ou comprovante?</label>
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
                            onChange={url => { if (url) handleUploadReceipt(url, order); }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          {/* Timeline */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 md:p-8">
            <h3 className="text-lg font-bold font-display text-stone-900 mb-8 border-b border-stone-100 pb-4">Histórico de Atividade</h3>
            
            <div className="relative pl-6 space-y-8">
              {/* Vertical line - changed color to stone-100 */}
              <div className="absolute top-4 bottom-4 left-8 w-0.5 bg-stone-100" />

              {order.history.map((event, index) => {
                const isLatest = index === 0;
                const Icon = STATUS_ICONS[event.status] || Package;

                return (
                  <div key={event.id} className="relative z-10 flex gap-6">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-1 ring-4 ring-white ${isLatest ? 'bg-rose-500 text-white' : 'bg-stone-200 text-stone-500 shadow-inner'}`}>
                      <Icon className="h-2.5 w-2.5" />
                    </div>
                    <div className="flex-grow pt-0.5">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1 gap-1">
                        <h4 className={`font-bold ${isLatest ? 'text-stone-900 text-base' : 'text-stone-600 text-sm'}`}>{STATUS_LABELS[event.status]}</h4>
                        <time className="text-[11px] text-stone-400 font-mono tracking-wider">
                           {new Date(event.date).toLocaleString('pt-BR')}
                        </time>
                      </div>
                      
                      {event.note && (
                        <p className={`text-sm ${isLatest ? 'text-stone-600 mt-2' : 'text-stone-500 mt-1'}`}>
                          {event.note}
                        </p>
                      )}

                      {event.photoUrl && (
                        <div className="mt-4 rounded-xl overflow-hidden border border-stone-200 shadow-sm sm:max-w-sm group relative bg-stone-50">
                          {event.photoUrl.includes('application/pdf') || event.photoUrl.toLowerCase().endsWith('.pdf') ? (
                            <div className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                              <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100 shadow-sm">
                                <FileText className="w-8 h-8" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-stone-900">Documento PDF</p>
                                <p className="text-[10px] text-stone-400 uppercase tracking-widest font-black">Anexo Oficial</p>
                              </div>
                              <div className="flex gap-2 w-full pt-2">
                                <a 
                                  href={event.photoUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-600 hover:bg-stone-50 transition shadow-sm"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> Visualizar
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
                              <img src={event.photoUrl || undefined} alt="Registro fotográfico" className="w-full object-cover" />
                              <div className="absolute top-2 right-2 flex gap-2">
                                <div className="bg-stone-900/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Camera className="w-3 h-3"/> Registro
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
          
          {/* Order Items Table (Readonly) */}
           <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 md:p-8 flex flex-col">
            <h3 className="text-lg font-bold font-display text-stone-900 mb-4 border-b border-stone-100 pb-4">Itens da Importação</h3>
            <ul className="divide-y divide-stone-100 flex-grow">
               {order.items.map((item) => (
                 <li key={item.productId} className="py-4 flex flex-col sm:flex-row gap-4">
                   <div className="w-16 h-16 bg-stone-50 rounded-lg overflow-hidden shrink-0">
                     <img src={item.product.imageUrl || undefined} alt={item.product.name} className="w-full h-full object-cover" />
                   </div>
                   <div className="flex-grow">
                       <h4 className="font-bold text-stone-900 text-sm">{item.product.name}</h4>
                       <p className="text-xs text-stone-500 line-clamp-1 mt-1">{item.product.description}</p>
                   </div>
                   <div className="sm:text-right whitespace-nowrap mt-2 sm:mt-0 pt-1">
                     <div className="text-xs font-mono text-stone-500">Qtd: {item.quantity}</div>
                     <div className="font-bold text-sm text-stone-900 mt-1">{formatCurrency(item.product.priceBRL * item.quantity)}</div>
                   </div>
                 </li>
               ))}
             </ul>

             <div className="mt-6 bg-stone-50 rounded-2xl p-6 border border-stone-100">
               <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Detalhamento Financeiro</h4>
               <div className="space-y-3">
                 <div className="flex justify-between text-sm">
                   <span className="text-stone-500">Subtotal de Produtos:</span>
                   <span className="font-medium text-stone-900">{formatCurrency(order.subtotalBRL)}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-stone-500">Taxa de Serviço:</span>
                   <span className="font-medium text-stone-900">{formatCurrency((order.serviceFeeBRL || 0) + (order.storageFeeBRL || 0) + (order.appFeeBRL || 0))}</span>
                 </div>
                 
                 <div className="flex justify-between text-sm">
                   <span className="text-stone-500">
                     {order.finalShippingFeeBRL ? 'Frete Internacional (Real):' : 'Frete Internacional (Estimado):'}
                   </span>
                   <span className={`font-medium ${order.finalShippingFeeBRL ? 'text-rose-600' : 'text-stone-500 italic'}`}>
                     {order.finalShippingFeeBRL ? formatCurrency(order.finalShippingFeeBRL) : 'Calculado no Envio'}
                   </span>
                 </div>

                 <div className="flex justify-between items-center pt-4 border-t border-stone-200 mt-2">
                   <span className="text-base font-bold text-stone-900">Valor Total Consolidado:</span>
                   <span className="text-xl font-black text-rose-600 font-mono">{formatCurrency(order.totalBRL)}</span>
                 </div>
               </div>
             </div>
          </div>

          {/* Review Section if Delivered */}
          {order.status === 'DELIVERED' && !reviewSubmitted && (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 md:p-8">
              <h3 className="text-lg font-bold font-display text-stone-900 mb-2">Sua importação foi concluída! 🎉</h3>
              <p className="text-sm text-stone-500 mb-6">Gostaríamos muito de saber como foi a sua experiência e ver fotos dos seus produtos. Sua opinião é muito importante!</p>
              
              <form onSubmit={handleReviewSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Qual nota você daria?</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className={`p-2 rounded-full transition-colors ${rating >= star ? 'text-orange-400 bg-orange-50' : 'text-stone-300 hover:text-orange-300'}`}
                      >
                        <Star className={`w-8 h-8 ${rating >= star ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Comentários (Críticas, elogios ou sugestões)</label>
                  <textarea
                    required
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 focus:bg-white focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none text-sm transition"
                    placeholder="Conta um pouco sobre como foi sua experiência..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Adicionar Fotos (Opcional)</label>
                  <div className="flex flex-col gap-4 mb-2">
                    {reviewPhotos.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {reviewPhotos.map((url, i) => (
                          <div key={i} className="relative w-20 h-20 bg-stone-100 rounded-lg overflow-hidden border border-stone-200 group">
                             <img src={url || undefined} alt="Review" className="w-full h-full object-cover" />
                             <button type="button" onClick={() => setReviewPhotos(reviewPhotos.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/50 text-white rounded p-1 opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <ImageInput 
                      value="" 
                      placeholder="Faça Upload ou insira URL..." 
                      onChange={(url) => { if (url) setReviewPhotos([...reviewPhotos, url]); }} 
                    />
                  </div>
                </div>

                <button type="submit" className="w-full bg-stone-900 text-white font-bold py-3 rounded-xl hover:bg-stone-800 transition tracking-wide text-sm">
                  Enviar Avaliação
                </button>
              </form>
            </div>
          )}

          {reviewSubmitted && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 md:p-8 text-center text-emerald-800">
               <span className="text-4xl mb-4 block">💖</span>
               <h3 className="font-bold font-display text-xl mb-2">Muito obrigado pela avaliação!</h3>
               <p className="text-sm opacity-80">Seu feedback foi recebido e nos ajudará a melhorar cada vez mais nossos serviços.</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
