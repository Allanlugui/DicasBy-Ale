import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trash2, CreditCard, Box, Plane, Info, ShoppingBag, Landmark, Copy, CheckCircle, ShieldAlert, FileWarning, ArrowRight } from 'lucide-react';
import { useAppContext } from '../context';
import { formatCurrency, safeCopyText } from '../lib/utils';
import { DiscountCoupon, Order, OrderStatus, ShippingMethod } from '../types';

export function Cart() {
  const { 
    user, orders, cart, removeFromCart, createOrder, profile, 
    companySettings, calculateCartTotals, shippingMethods, coupons 
  } = useAppContext();
  const navigate = useNavigate();
  
  const pendingQuoteOrders = orders ? orders.filter(o => o.status === 'PENDING_PAYMENT') : [];
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);


  // Payment Options State
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [copiedKey, setCopiedKey] = useState(false);
  const [acceptedConsent, setAcceptedConsent] = useState(false);
  const [acceptedCustoms, setAcceptedCustoms] = useState(false);

  // Shipping selection
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string | null>(null);

  // Coupons
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<DiscountCoupon | null>(null);
  const [showCouponField, setShowCouponField] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Credit Card state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardInstallments, setCardInstallments] = useState('1');

  // Auto pre-fill from user profile
  useEffect(() => {
    if (profile) {
      setCustomerName(profile.fullName || '');
    }
    if (user) {
      setCustomerEmail(user.email || '');
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
  const activePixKey = companySettings?.pixKey || 'jallanluiz@gmail.com';
  const activePixName = companySettings?.pixName || 'ImportaGringa VIP';
  const activePixCity = companySettings?.pixCity || 'SAO PAULO';

  // Quick calc block
  const selectedShipping = shippingMethods.find(m => m.id === selectedShippingMethodId);
  const totals = calculateCartTotals(appliedCoupon || undefined);
  const subtotalBRL = totals.subtotalBRL;
  const serviceFeeBRL = totals.serviceFeeBRL;
  const storageFeeBRL = totals.storageFeeBRL;
  const shippingFeeBRL = totals.shippingFeeBRL;
  const appFee = totals.appFee;
  const discountBRL = totals.discountBRL;
  const totalBRL = totals.totalBRL;
  
  // Custom shipping logic based on user request
  const estimatedShippingBRL = selectedShipping?.basePriceBRL || 0;
  const shippingMarginOfError = estimatedShippingBRL * 0.10;
  const shippingMin = estimatedShippingBRL - shippingMarginOfError;
  const shippingMax = estimatedShippingBRL + shippingMarginOfError;

  const finalTotalBRL = totalBRL + estimatedShippingBRL;

  // Generate standard BR Code payload for Pix Copy and Paste
  const formattedAmount = finalTotalBRL.toFixed(2);
  const cleanKey = activePixKey.replace(/[^a-zA-Z0-9@.]/g, '');
  const pixCopyPasteText = `00020101021126580014br.gov.bcb.pix0140${cleanKey.length.toString().padStart(2, '0')}${cleanKey}5204000053039865405${formattedAmount.length.toString().padStart(2, '0')}${formattedAmount}5802BR59${activePixName.length.toString().padStart(2, '0')}${activePixName}60${activePixCity.length.toString().padStart(2, '0')}${activePixCity}62070503***6304`;

  const handleCopyPix = async () => {
    await safeCopyText(pixCopyPasteText);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleApplyCoupon = () => {
    setCouponError(null);
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) return;

    // Check in real coupons list
    const foundCoupon = coupons.find(c => c.code === code && c.active);
    if (foundCoupon) {
      if (foundCoupon.minPurchaseBRL && subtotalBRL < foundCoupon.minPurchaseBRL) {
        setCouponError(`Compra mínima para este cupom: ${formatCurrency(foundCoupon.minPurchaseBRL)}`);
        return;
      }
      setAppliedCoupon(foundCoupon);
    } else if (code.startsWith('IND-')) {
       // Keep the referral logic too as a fallback if not in DB yet
       const userReferredOrders = user ? orders.filter(o => o.referredBy === user.uid && o.userId !== user.uid && o.status !== 'CANCELLED') : [];
       const hasMatch = userReferredOrders.some(
         o => `IND-${o.id.substring(0, 6).toUpperCase()}` === code
       );
       if (hasMatch) {
          // Virtual coupon for referral
          setAppliedCoupon({
            id: 'virtual-referral',
            code,
            type: 'PERCENT',
            value: 15,
            active: true,
            usageCount: 0
          });
       } else {
          setCouponError('Cupom de indicação inválido ou de compra não confirmada.');
       }
    } else {
      setCouponError('Cupom inválido ou expirado.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
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
    // Submit order to db
    setTimeout(async () => {
      try {
        const order = await createOrder(
          customerName || profile?.fullName || 'Nome Não Fornecido', 
          customerEmail || user?.email || 'Email Não Fornecido', 
          appliedCoupon?.code || undefined, 
          discountBRL || undefined,
          {
            shippingMethod: selectedShipping,
            shippingEstimateBRL: estimatedShippingBRL,
            shippingEstimateWithMarginBRL: shippingMax,
            customsResponsibilityAccepted: acceptedCustoms
          }
        );
        setIsProcessing(false);
        if (order) {
          navigate(`/rastreio?id=${order.trackingId}`);
        }
      } catch (err) {
        console.error(err);
        setIsProcessing(false);
      }
    }, 1500);
  };

  // If both standard cart and pending quote requests are empty
  if (cart.length === 0 && pendingQuoteOrders.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-stone-800">
        <div className="bg-rose-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="h-10 w-10 text-rose-300" />
        </div>
        <h2 className="text-2xl font-display font-bold text-stone-900 mb-2">Sua sacola está vazia</h2>
        <p className="text-stone-500 mb-8 font-light text-sm">Navegue pelas lojas e adicione produtos que deseja importar.</p>
        <button onClick={() => navigate('/')} className="cursor-pointer bg-rose-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-rose-700 transition animate-pulse-slow">
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
            <h1 className="text-2xl md:text-3xl font-display font-medium">Orçamentos Aguardando Pagamento</h1>
            <p className="text-white/80 text-xs mt-1.5 max-w-xl">
              Suas solicitações de cotação foram analisadas e aprovadas por nossa assessoria. Conclua o pagamento para efetuarmos a compra nas lojas oficiais dos EUA.
            </p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="bg-white text-rose-600 hover:bg-stone-50 transition border-none font-bold text-xs px-4 py-2.5 rounded-xl shrink-0"
          >
            Ver Outros Produtos
          </button>
        </div>

        <div className="space-y-8">
          {pendingQuoteOrders.map((order, index) => {
            const amountFormatted = order.totalBRL.toFixed(2);
            const cleanPixKey = activePixKey.replace(/[^a-zA-Z0-9@.]/g, '');
            const specificPixCode = `00020101021126580014br.gov.bcb.pix0140${cleanPixKey.length.toString().padStart(2, '0')}${cleanPixKey}5204000053039865405${amountFormatted.length.toString().padStart(2, '0')}${amountFormatted}5802BR59${activePixName.length.toString().padStart(2, '0')}${activePixName}60${activePixCity.length.toString().padStart(2, '0')}${activePixCity}62070503***6304`;

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
                      Rastreio Logístico: <strong className="font-mono text-stone-800">{order.trackingId}</strong>
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
                      <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Itens Inclusos no Pedido</h3>
                      <div className="space-y-4">
                        {order.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex gap-4 items-center bg-stone-50 p-4 rounded-xl border border-stone-150/60">
                            {item.product.imageUrl && (
                              <img 
                                src={item.product.imageUrl} 
                                alt={item.product.name} 
                                referrerPolicy="no-referrer"
                                className="w-16 h-16 rounded-xl object-cover bg-white border border-stone-100 shrink-0" 
                              />
                            )}
                            <div className="flex-grow">
                              <h4 className="text-sm font-bold text-stone-900 leading-tight">{item.product.name}</h4>
                              <p className="text-xs text-stone-400 line-clamp-2 mt-1">{item.product.description}</p>
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
                        <span className="text-[10px] text-stone-400 font-normal normal-case">Consolidado em BRL</span>
                      </h4>
                      <div className="flex justify-between">
                        <span>Preço de Cotação do Produto:</span>
                        <span className="font-mono">{formatCurrency(order.subtotalBRL)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxa de Serviço:</span>
                        <span className="font-mono">{formatCurrency((order.serviceFeeBRL || 0) + (order.storageFeeBRL || 0) + (order.appFeeBRL || 0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Frete Aduaneiro & Correios Brasil:</span>
                        <span className="font-xs italic text-stone-500">Calculado no Envio</span>
                      </div>
                      <div className="pt-3 border-t border-stone-200 flex justify-between items-end">
                        <span className="text-sm font-bold text-stone-900">Total do Pedido:</span>
                        <strong className="text-lg font-bold font-mono text-rose-600">{formatCurrency(order.totalBRL)}</strong>
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
                      <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 block">Pagamento Pix Copia e Cola</h4>
                      <p className="text-xs text-stone-600 max-w-sm mx-auto mb-4">
                        Escaneie o QR Code abaixo com seu banco ou utilize o código copia e cola para pagar.
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
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-stone-900 hover:bg-stone-800 text-white border-transparent'
                          }`}
                        >
                          {copiedOrderId === order.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 animate-bounce" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedOrderId === order.id ? 'Código Copiado!' : 'Copiar Código Pix Copia e Cola'}
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
          <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wide">Importações Fiscais Monitoradas</h4>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl">
            Sua importação é intermediada pela entidade corporativa jurídica <strong>{companySettings?.companyName || 'ImportaGringa VIP'}</strong> sob o CNPJ <strong>{companySettings?.companyCnpj || '00.000.000/0001-90'}</strong>. Proteção à privacidade garantida sob a LGPD brasileira e diretrizes internacionais americanas.
          </p>
        </div>
        {companySettings?.companyCnpj && (
          <span className="text-[10px] font-mono select-all bg-white border border-stone-200 px-3 py-1.5 rounded-lg text-stone-600 font-bold">
            CNPJ: {companySettings.companyCnpj}
          </span>
        )}
      </div>

      <h1 className="text-3xl font-display font-bold tracking-tight text-stone-900 mb-8">Finalizar Pedido</h1>

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
                  <h3 className="text-base font-bold text-stone-950">📋 Perfil e Dados de Envio Incompletos</h3>
                  <p className="text-xs text-stone-700 leading-relaxed mt-1">
                    Para calcularmos as taxas aduaneiras e expedirmos sua encomenda internacional (dos EUA via <strong>Correios, Sedex, FedEx, ou Entrega Pessoal</strong> no Brasil), é indispensável que você registre seus dados completos em nosso painel, incluindo <strong>CPF, Telefone, CEP e endereço completo com número residencial</strong>.
                  </p>
                </div>
              </div>
              
              <div className="border-t border-rose-200/50 pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/perfil')}
                  className="cursor-pointer inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-md shadow-rose-100"
                >
                  Completar Meu Perfil de Envio <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-3 items-center text-xs font-medium text-emerald-800">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Dados de endereçamento e CPF validados para a aduana! Remessa segura pronta para faturamento inteligente.</span>
            </div>
          )}

          {/* Cart Items Summary */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
             <div className="p-6 border-b border-stone-100">
               <h2 className="text-md font-bold text-stone-900">Itens ({cart.length})</h2>
             </div>
             <ul className="divide-y divide-stone-100">
               {cart.map((item) => (
                 <li key={item.productId} className="p-6 flex flex-col sm:flex-row gap-4">
                   <div className="w-20 h-20 bg-stone-50 rounded-xl overflow-hidden shrink-0 border border-stone-100">
                     <img src={item.product.imageUrl || undefined} alt={item.product.name} className="w-full h-full object-cover" />
                   </div>
                   <div className="flex-grow flex flex-col justify-between">
                     <div>
                       <h3 className="font-bold text-sm text-stone-900">{item.product.name}</h3>
                       <p className="text-xs text-stone-400 line-clamp-1 mt-1">{item.product.description}</p>
                     </div>
                     <div className="flex items-center justify-between mt-4">
                       <span className="text-xs text-stone-500 font-semibold bg-stone-100 px-2 py-1 rounded">Quantidade: {item.quantity}</span>
                       <div className="flex items-center gap-4">
                          <span className="font-bold text-sm text-stone-900">{formatCurrency(item.product.priceBRL * item.quantity)}</span>
                          <button onClick={() => removeFromCart(item.productId)} className="cursor-pointer text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition">
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
            <h2 className="text-md font-bold text-stone-900 mb-6 border-b border-stone-100 pb-3">Resumo da Compra</h2>
            
            <form onSubmit={handleCheckout} className="space-y-6">
              
              {/* If Profile logic is complete, show names */}
              {isProfileComplete && (
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs space-y-2">
                  <div className="text-stone-500 font-bold uppercase tracking-wider text-[10px]">Destinatário do Despacho</div>
                  <div>
                    <strong className="text-stone-900 block">{profile.fullName}</strong>
                    <span className="text-stone-500 block mt-0.5">Celular: {profile.phone}</span>
                    <span className="text-stone-500 block mt-0.5">CPF: {profile.document}</span>
                    <span className="text-stone-500 block mt-0.5">Endereço: {profile.street}, {profile.number} {profile.complement ? `- ${profile.complement}` : ''} • {profile.city}/{profile.state}</span>
                  </div>
                </div>
              )}

              {/* Total Calculation Details */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal (Físico das Compras)</span>
                  <span className="font-semibold text-stone-900">{formatCurrency(subtotalBRL)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span className="flex items-center gap-1">Taxa de Serviço</span>
                  <span className="font-semibold text-rose-600">{formatCurrency(serviceFeeBRL + appFee + storageFeeBRL)}</span>
                </div>
                
                {/* Shipping selection UI */}
                <div className="pt-4 border-t border-stone-100 space-y-3">
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Modalidade de Frete</span>
                      <span className="text-[9px] text-stone-300 italic">Pago após pesagem em Miami</span>
                   </div>
                   {shippingMethods.length > 0 ? (
                     <div className="grid grid-cols-1 gap-2">
                       {shippingMethods.map(method => (
                         <button
                           key={method.id}
                           type="button"
                           onClick={() => setSelectedShippingMethodId(method.id)}
                           className={`flex justify-between items-center p-3 rounded-xl border text-left transition-all ${
                             selectedShippingMethodId === method.id 
                               ? 'border-rose-500 bg-rose-50/10 ring-1 ring-rose-500' 
                               : 'border-stone-100 bg-stone-50 hover:border-stone-200'
                           }`}
                         >
                           <div className="flex flex-col">
                              <span className="text-xs font-bold text-stone-900">{method.name} ({method.carrier})</span>
                              <span className="text-[10px] text-stone-500 italic">Entrega em aprox. {method.estimatedDays}</span>
                           </div>
                           <span className="text-xs font-black text-stone-800">{formatCurrency(method.basePriceBRL)}*</span>
                         </button>
                       ))}
                     </div>
                   ) : (
                     <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-center">
                        <span className="text-[11px] text-stone-500">Nenhum método de envio configurado. Entre em contato com o suporte.</span>
                     </div>
                    )}
                    {selectedShipping && (
                      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 space-y-1 mt-2">
                         <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[10px]">
                            <Info className="w-3 h-3" />
                            ESTIMATIVA DE FRETE PARA ESTA MODALIDADE
                         </div>
                         <p className="text-[10px] text-blue-900 leading-normal">
                            O frete é pago apenas quando os produtos chegam no nosso centro nos EUA. 
                            O valor final pode variar 10% para mais ou menos conforme o peso real. 
                            Estimado entre <strong>{formatCurrency(shippingMin)}</strong> e <strong>{formatCurrency(shippingMax)}</strong>.
                         </p>
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
                      <div className="text-stone-700 text-[11px] font-bold">Incentivos / Campanhas</div>
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
                              onChange={e => setCouponCodeInput(e.target.value)} 
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
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-widest font-display">Soma Total do Pedido</span>
                  <span className="text-xl font-black font-mono text-stone-900">{formatCurrency(finalTotalBRL)}</span>
                </div>
              </div>

              {/* PAYMENT SELECTORS AND INTERFACES */}
              {isProfileComplete && (
                <div className="space-y-4 border-t border-stone-100 pt-6">
                  <div className="text-xs font-bold text-stone-600">Selecione o Meio de Pagamento:</div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pix')}
                      className={`cursor-pointer p-3 rounded-xl border flex flex-col items-center gap-1 transition ${
                        paymentMethod === 'pix' 
                          ? 'border-rose-500 bg-rose-50/20 text-stone-900 font-bold' 
                          : 'border-stone-200 bg-white hover:border-stone-300 text-stone-500'
                      }`}
                    >
                      <Landmark className="w-5 h-5 text-rose-500" />
                      <span className="text-xs">Chave Pix</span>
                    </button>

                    <button
                      type="button"
                      disabled
                      className={`cursor-not-allowed opacity-60 p-3 rounded-xl border flex flex-col items-center gap-1 transition-all border-stone-200 bg-stone-50 text-stone-400`}
                      title="Cartão de crédito em desenvolvimento"
                    >
                      <CreditCard className="w-5 h-5" />
                      <span className="text-xs">Cartão de Crédito</span>
                      <span className="text-[9px] bg-stone-200 px-1.5 rounded-sm">Em breve</span>
                    </button>
                  </div>

                  {/* PAYMENT DISPLAY: PIX CARD WITH QR CODE */}
                  {paymentMethod === 'pix' && (
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4 text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        <Landmark className="w-4 h-4 text-rose-500" />
                        <span className="text-xs font-bold text-stone-700">QR Code Pix para Pagamento Imediato</span>
                      </div>

                      <p className="text-[10px] text-stone-500 leading-relaxed max-w-xs mx-auto">
                        Escaneie com o app de qualquer instituição bancária. Após o pagamento do sinal de 30% ou valor total, envie o comprovante na tela de rastreamento para liberação aduaneira.
                      </p>

                      {pixCopyPasteText && (
                        <div className="bg-white p-3 inline-block rounded-2xl border border-stone-200 shadow-xs mx-auto my-1">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixCopyPasteText)}`} 
                            alt="QR Code Pix" 
                            className="w-40 h-40 object-contain mx-auto"
                          />
                        </div>
                      )}

                      <div className="space-y-1 bg-white p-2.5 rounded-xl border border-stone-100 text-left text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-stone-400">Beneficiário:</span>
                          <span className="font-bold text-stone-900">{activePixName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Localização:</span>
                          <span className="font-bold text-stone-900 uppercase">{activePixCity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Chave Pix:</span>
                          <span className="font-bold text-stone-900 select-all">{activePixKey}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className={`cursor-pointer w-full py-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                          copiedKey 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-white hover:bg-stone-100 text-stone-800 border-stone-300'
                        }`}
                      >
                        {copiedKey ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
                        {copiedKey ? 'Copiado para Área de Transferência!' : 'Copiar Chave Pix (Copia e Cola)'}
                      </button>
                    </div>
                  )}

                  {/* PAYMENT DISPLAY: CREDIT CARD FIELDS */}
                  {paymentMethod === 'credit_card' && (
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4">
                      <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3 flex gap-2 items-start text-[11px] text-rose-900">
                        <Info className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                          <strong>Gateway de Pagamento Integrado:</strong> Os pagamentos via Cartão de Crédito são processados de forma 100% segura e criptografada. Nosso sistema conta com análise técnica e antifraude ativa para processamento imediato de sua importação.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-500 block">Número do Cartão de Crédito</label>
                          <input 
                            type="text" 
                            value={cardNumber}
                            onChange={e => setCardNumber(e.target.value)}
                            placeholder="0000 0000 0000 0000"
                            className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none" 
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-500 block">Nome Escrito no Cartão</label>
                          <input 
                            type="text" 
                            value={cardName}
                            onChange={e => setCardName(e.target.value.toUpperCase())}
                            placeholder="NOME COMPLETO TITULAR"
                            className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none uppercase" 
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-500 block">Validade (MM/AA)</label>
                            <input 
                              type="text" 
                              value={cardExpiry}
                              onChange={e => setCardExpiry(e.target.value)}
                              placeholder="12/29"
                              className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-center focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-500 block">Código CVV</label>
                            <input 
                              type="text" 
                              value={cardCvv}
                              onChange={e => setCardCvv(e.target.value)}
                              placeholder="123"
                              className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-center focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none" 
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-500 block">Opção de Parcelamento</label>
                          <select 
                            value={cardInstallments}
                            onChange={e => setCardInstallments(e.target.value)}
                            className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none"
                          >
                            <option value="1">1x de {formatCurrency(finalTotalBRL)} (Sem acréscimos)</option>
                            <option value="2">2x de {formatCurrency(finalTotalBRL / 2)}</option>
                            <option value="3">3x de {formatCurrency(finalTotalBRL / 3)}</option>
                            <option value="6">6x de {formatCurrency((finalTotalBRL * 1.05) / 6)} (Com juros)</option>
                            <option value="12">12x de {formatCurrency((finalTotalBRL * 1.1) / 12)} (Com juros)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CONSENT CHECKBOXES */}
                  <div className="space-y-3 mt-4">
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={acceptedConsent}
                          onChange={e => setAcceptedConsent(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-stone-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                          required
                        />
                        <span className="text-[10px] font-semibold text-stone-600 leading-relaxed block">
                          Declaro concordar em compartilhar meus dados com parceiros logísticos e despachantes aduaneiros americanos e brasileiros para o desembaraço desta importação.
                        </span>
                      </label>
                    </div>

                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={acceptedCustoms}
                          onChange={e => setAcceptedCustoms(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                          required
                        />
                        <span className="text-[10px] font-black text-stone-900 leading-relaxed block uppercase">
                          Estou ciente de que o frete internacional e eventuais impostos de importação são de minha inteira responsabilidade e serão cobrados à parte após o recebimento no depósito em Miami.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION BTN */}
              <button 
                type="submit" 
                disabled={isProcessing || !isProfileComplete || !acceptedConsent || !acceptedCustoms || !selectedShippingMethodId}
                className="cursor-pointer w-full bg-rose-600 hover:bg-rose-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-rose-100"
              >
                {isProcessing ? 'Validando transação com banco...' : (
                  <>
                    <CreditCard className="h-5 w-5" /> Confirmar Pedido de Importação
                  </>
                )}
              </button>

              {(!isProfileComplete || !acceptedCustoms || !selectedShippingMethodId) && (
                <p className="text-[10px] text-center text-rose-600 font-bold leading-tight select-none">
                   * É obrigatório selecionar o frete, completar o perfil e aceitar os termos de importação.
                </p>
              )}
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
