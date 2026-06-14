import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, Package, CheckCircle, ArrowRight, Clock, ShoppingBag, CreditCard, Receipt as ReceiptIcon, AlertCircle } from 'lucide-react';
import { useAppContext } from '../context';
import { formatCurrency } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';

export function Receipt() {
  const { id } = useParams();
  const { orders } = useAppContext();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (orders && id) {
      const found = orders.find(o => o.id === id);
      setOrder(found);
    }
  }, [id, orders]);

  if (!order) return <div className="p-8 text-center text-stone-500">Carregando recibo...</div>;

  const receiptUrl = window.location.href;

  // If the order status is not fully delivered, show the elegant purchase order voucher/invoice style receipt!
  if (order.status !== 'DELIVERED') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-200" id="purchase-order-receipt bg">
          
          {/* Header depending on state */}
          <div className="bg-gradient-to-r from-rose-500 to-amber-500 p-8 text-white text-center relative">
            <ReceiptIcon className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-3xl font-display font-bold tracking-tight mb-2">Comprovante de Pedido de Compra</h1>
            <p className="opacity-90 font-medium">Este documento detalha o seu orçamento aprovado e formaliza o pedido de compra.</p>
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md rounded-full px-4 py-1.5 text-xs font-bold uppercase mt-4">
              <Clock className="w-3.5 h-3.5 animate-pulse" /> Status: {order.status === 'PENDING_PAYMENT' ? 'Aguardando Pagamento' : 'Em Andamento'}
            </div>
          </div>

          {/* Prompt/Instructions Block */}
          {order.status === 'PENDING_PAYMENT' && (
            <div className="bg-amber-50 border-y border-amber-200/60 p-6 flex flex-col items-center text-center space-y-4">
              <div className="bg-amber-100 text-amber-800 p-2.5 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="max-w-md">
                <h3 className="font-bold text-stone-900 text-sm">Aguardando Pagamento do Sinal / Compra nos EUA</h3>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Para que nossa especialista <strong>Alê</strong> consiga efetuar a compra física deste produto em Nova York/EUA, é necessário concluir a etapa de pagamento do pedido.
                </p>
              </div>

              {/* ACTION BUTTON TO MY SACOLA OR SECURE CHECKOUT */}
              <div className="w-full max-w-sm pt-2 space-y-2">
                <Link 
                  to="/carrinho" 
                  id="go-to-bag-button" 
                  className="w-full inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md transition-all font-display text-sm transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Ir para Minha Sacola de Compras
                </Link>
                <span className="text-[11px] text-stone-400 block">
                  Seu produto estará aguardando o pagamento de importação em sua sacola.
                </span>
              </div>
            </div>
          )}

          {/* Detailed Info */}
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-stone-100 pb-8">
              <div>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">ID do Pedido de Compra</h3>
                <p className="font-mono text-stone-900 font-bold">{order.id}</p>
              </div>
              <div>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Data de Emissão</h3>
                <p className="text-stone-900 font-medium">{new Date(order.createdAt).toLocaleString('pt-BR')}</p>
              </div>
            </div>

            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200/60">
              <h3 className="font-bold text-stone-900 mb-4 border-b border-stone-200 pb-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-rose-500" /> Detalhes dos Produtos e Custos
              </h3>
              
              <div className="space-y-4">
                <div>
                  <span className="text-stone-400 block text-xs">Destinatário da Importação</span>
                  <span className="font-bold text-stone-900">{order.customerName}</span>
                  <span className="text-stone-500 block text-xs mt-0.5">{order.customerEmail}</span>
                  {order.customerDocument && (
                    <span className="text-stone-500 block text-xs mt-0.5">CPF: {order.customerDocument}</span>
                  )}
                </div>
                <div>
                  <span className="text-stone-400 block text-xs">Chave Logística de Rastreio</span>
                  <span className="font-mono text-stone-900 px-2 py-0.5 bg-stone-200 rounded text-xs select-all inline-block font-semibold mt-1">{order.trackingId}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="mt-6">
                <span className="text-stone-500 block text-xs mb-2">Itens sob Cotação</span>
                <ul className="space-y-2.5">
                   {order.items.map((item: any) => (
                      <li key={item.productId} className="flex gap-4 items-center bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                         {item.product.imageUrl && (
                           <img src={item.product.imageUrl || undefined} alt={item.product.name} referrerPolicy="no-referrer" className="w-12 h-12 rounded-lg object-cover bg-stone-50 border border-stone-100 shrink-0" />
                         )}
                         <div className="flex-grow">
                            <span className="text-sm font-bold text-stone-900 block leading-tight line-clamp-1">{item.product.name}</span>
                            <span className="text-xs text-stone-400 block mt-1 line-clamp-1">{item.product.description}</span>
                         </div>
                         <span className="text-xs font-mono text-stone-500 font-bold bg-stone-150 px-2 py-1 rounded">x{item.quantity}</span>
                      </li>
                   ))}
                </ul>
              </div>

              {/* Pricing breakdown */}
              <div className="mt-8 pt-4 border-t border-stone-200 space-y-2 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal do Produto:</span>
                  <span className="font-mono font-medium">{formatCurrency(order.subtotalBRL)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxa de Serviço:</span>
                  <span className="font-mono font-medium">{formatCurrency((order.serviceFeeBRL || 0) + (order.storageFeeBRL || 0) + (order.appFeeBRL || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frete Internacional & Aduaneiro Segurado:</span>
                  <span className="font-mono font-medium italic text-stone-500">
                     {order.finalShippingFeeBRL ? formatCurrency(order.finalShippingFeeBRL) : 'Calculado no Envio'}
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-stone-200 flex justify-between items-end">
                   <span className="text-sm font-bold text-stone-800">Custo Total Consolidado</span>
                   <span className="text-xl font-bold font-mono text-rose-600">{formatCurrency(order.totalBRL)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-6">
              <h3 className="text-sm font-bold text-stone-900 mb-2">Validação Administrativa</h3>
              <p className="text-xs text-stone-500 mb-4">Escaneie para validar o status deste pedido de assessoria de compra nos servidores oficiais.</p>
              <div className="bg-stone-50 p-4 inline-block rounded-xl border border-stone-200">
                <QRCodeSVG value={receiptUrl} size={100} />
              </div>
            </div>

          </div>

          <div className="bg-stone-900 p-8 text-center text-white">
             <h2 className="text-lg font-display font-bold mb-2">Dica by Alê - Assessoria Internacional</h2>
             <p className="text-stone-400 text-xs max-w-sm mx-auto">Para sua segurança jurídica, seu pedido de compra está respaldado pelo CNPJ de intermediação aduaneira nacional.</p>
          </div>

        </div>
      </div>
    );
  }

  // --- STANDARD COMPLETED/DELIVERED RECEIPT VIEW ---
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-200">
        
        {/* Header */}
        <div className="bg-emerald-500 p-8 text-white text-center relativereceipt">
           <ShieldCheck className="w-16 h-16 mx-auto mb-4 opacity-90" />
           <h1 className="text-3xl font-display font-bold tracking-tight mb-2">Comprovante de Entrega Autêntico</h1>
           <p className="opacity-90 font-medium">Sua encomenda internacional foi entregue com sucesso.</p>
        </div>

        {/* Info */}
        <div className="p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
               <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">ID do Recibo</h3>
               <p className="font-mono text-stone-900 font-bold">{order.receipt?.id || order.id}</p>
            </div>
            <div>
               <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Data da Efetivação</h3>
               <p className="text-stone-900 font-medium">{order.receipt ? new Date(order.receipt.generatedAt).toLocaleString() : new Date(order.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-stone-50 p-6 rounded-xl border border-stone-100">
            <h3 className="font-bold text-stone-900 mb-4 border-b border-stone-200 pb-2">Resumo da Importação</h3>
            <div className="space-y-4">
              <div>
                <span className="text-stone-500 block text-xs">Cliente</span>
                <span className="font-bold text-stone-900">{order.customerName}</span>
                {order.customerDocument && (
                  <span className="text-stone-500 block text-[10px] mt-0.5">CPF: {order.customerDocument}</span>
                )}
              </div>
              <div>
                <span className="text-stone-500 block text-xs">ID de Rastreio</span>
                <span className="font-mono text-stone-900 px-2 py-1 bg-stone-200 rounded text-sm">{order.trackingId}</span>
              </div>
            </div>

            <div className="mt-6">
              <span className="text-stone-500 block text-xs mb-2">Itens Entregues</span>
              <ul className="space-y-2">
                 {order.items.map((item: any) => (
                    <li key={item.productId} className="flex justify-between items-center bg-white p-3 rounded-lg border border-stone-200 shadow-sm">
                       <span className="text-sm font-medium text-stone-900 line-clamp-1">{item.product?.name || 'Produto'}</span>
                       <span className="text-xs font-mono text-stone-500">x{item.quantity}</span>
                    </li>
                 ))}
              </ul>
            </div>
            
            <div className="mt-6 border-t border-stone-200 pt-4 flex justify-between items-end">
               <span className="text-sm font-bold text-stone-500">Custo Total Encomendado</span>
               <span className="text-xl font-bold font-mono text-emerald-600">{formatCurrency(order.totalBRL)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white border border-stone-200 rounded-xl p-6">
            <div>
              <h3 className="text-sm font-bold text-stone-900 mb-2">Validação Digital</h3>
              <p className="text-xs text-stone-500 mb-4">Escaneie o QR Code para acessar este comprovante e validar sua autenticidade a qualquer momento.</p>
              <div className="bg-stone-50 p-4 inline-block rounded-xl border border-stone-200">
                <QRCodeSVG value={receiptUrl} size={120} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 mb-2">Assinatura Coletada</h3>
              {order.receipt?.signatureUrl ? (
                <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 flex items-center justify-center">
                   <img src={order.receipt.signatureUrl} alt="Assinatura Digital" className="max-h-24 mix-blend-multiply" />
                </div>
              ) : (
                <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 text-center text-xs text-stone-400">
                  Assinatura não coletada.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer / Review Call */}
        <div className="bg-stone-900 p-8 text-center border-t border-stone-100">
           <h2 className="text-xl font-display font-bold text-white mb-2">Muito obrigado pela compra! 🎊</h2>
           <p className="text-stone-400 text-sm mb-6 max-w-md mx-auto">Esperamos que tenha tido uma excelente experiência importando seus produtos. Sua avaliação é muito importante para nós.</p>
           <Link to={`/rastreio?id=${order.trackingId}`} className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold transition">
              Avaliar Experiência <ArrowRight className="w-4 h-4" />
           </Link>
        </div>
      </div>
    </div>
  );
}

