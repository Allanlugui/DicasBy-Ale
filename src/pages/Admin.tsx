import React, { useState, useRef, useEffect } from 'react';
import { Settings, Plus, RefreshCw, Upload, Image as ImageIcon, Link as LinkIcon, Store as StoreIcon, Trash2, Edit2, Search, MessageSquare, Star, Mail, Eraser, FileText, TrendingUp, DollarSign, CheckCircle, AlertCircle, XCircle, Filter, Percent, Users, Truck, Scale, Bell } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { useAppContext } from '../context';
import { OrderStatus, Product, Store, Ticket, Review, TicketMessage, Order, SystemNotification } from '../types';
import { formatCurrency } from '../lib/utils';
import { jsPDF } from 'jspdf';

import { ImageInput } from '../components/ImageInput';
import { AdminSettingsTab } from './AdminSettingsTab';
import { AdminCollaboratorsTab } from './AdminCollaboratorsTab';
import { AdminShippingLabelsTab } from './AdminShippingLabelsTab';
import { AdminQuotesTab } from '../components/AdminQuotesTab';
import { AdminDriveTab } from './AdminDriveTab';

export function TicketsTab({ tickets, updateTicket }: { tickets: Ticket[], updateTicket: any }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');

  const filteredTickets = tickets.filter(t => t.protocol.includes(searchTerm) || t.customerName.toLowerCase().includes(searchTerm.toLowerCase()));

  // Find the fresh ticket data in the list (or fallback to local selection status)
  const currentTicket = activeTicket ? (tickets.find(t => t.id === activeTicket.id) || activeTicket) : null;

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTicket || !reply.trim() || currentTicket.status === 'CLOSED') return;
    const newMsg: TicketMessage = { role: 'bot', text: reply, timestamp: new Date().toISOString() };
    await updateTicket(currentTicket.id, [...currentTicket.messages, newMsg], undefined, false);
    setReply('');
  };

  const handleClose = async () => {
    if (!currentTicket || currentTicket.status === 'CLOSED') return;
    const closedMsg: TicketMessage = { role: 'bot', text: 'Atendimento encerrado pelo administrador.', timestamp: new Date().toISOString() };
    await updateTicket(currentTicket.id, [...currentTicket.messages, closedMsg], 'CLOSED');
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
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-stone-200 focus:ring-rose-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filteredTickets.map(t => (
            <button 
              key={t.id} 
              onClick={() => setActiveTicket(t)}
              className={`w-full text-left p-3 rounded-xl transition mb-1 ${currentTicket?.id === t.id ? 'bg-rose-50 border border-rose-200' : 'hover:bg-stone-50 border border-transparent'}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-rose-600">#{t.protocol}</span>
                <div className="flex items-center gap-2">
                  {t.needsHuman && t.status !== 'CLOSED' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-red-100 text-red-700 animate-pulse border border-red-200">
                      Urgente (Humano)
                    </span>
                  )}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${t.status === 'CLOSED' ? 'bg-stone-100 text-stone-500' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                    {t.status === 'CLOSED' ? 'Sem atividade' : 'Aberto'}
                  </span>
                  <span className="text-xs text-stone-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="font-medium text-sm text-stone-900 mt-1">{t.customerName}</div>
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
                  <h3 className="font-bold text-stone-900 font-display">Protocolo {currentTicket.protocol}</h3>
                  {currentTicket.needsHuman && currentTicket.status !== 'CLOSED' && (
                    <span className="bg-red-500 text-white text-[9px] uppercase font-bold px-2 py-0.5 rounded-full animate-bounce shadow">
                      Aguardando Humano ⚠️
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500">Cliente: {currentTicket.customerName}</p>
              </div>
              {currentTicket.status === 'CLOSED' ? (
                <span className="px-3 py-1 bg-stone-100 text-stone-500 rounded-lg text-xs font-bold uppercase">
                  Encerrado
                </span>
              ) : (
                <button onClick={handleClose} className="px-3 py-1 bg-rose-100 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-200">
                  Encerrar
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {currentTicket.messages.map((m, i) => (
                  <div key={i} className={`flex gap-3 max-w-[80%] ${m.role === 'bot' ? 'ml-auto flex-row-reverse' : ''}`}>
                    <div className={`p-3 rounded-2xl ${m.role === 'bot' ? 'bg-rose-50 text-stone-900 rounded-tr-sm' : 'bg-stone-100 text-stone-800 rounded-tl-sm'}`}>
                      <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                    </div>
                  </div>
               ))}
            </div>
            <form onSubmit={handleReply} className="p-4 border-t border-stone-100 bg-white flex gap-2">
               <input 
                 type="text" 
                 value={reply}
                 onChange={e => setReply(e.target.value)}
                 disabled={currentTicket.status === 'CLOSED'}
                 className="flex-1 rounded-xl border border-stone-200 px-4 py-2 text-sm focus:ring-rose-500 disabled:bg-stone-50 disabled:text-stone-400"
                 placeholder={currentTicket.status === 'CLOSED' ? 'Atendimento encerrado.' : 'Digite sua resposta...'}
               />
               <button type="submit" disabled={currentTicket.status === 'CLOSED' || !reply.trim()} className="bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50">Enviar</button>
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
  if (reviews.length === 0) return <div className="text-stone-500 py-8">Nenhuma avaliação recebida ainda.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reviews.map(r => (
        <div key={r.id} className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="font-bold text-stone-900 block">{r.customerName}</span>
              <span className="text-xs text-stone-400">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex bg-orange-50 text-orange-400 px-2 py-1 rounded-lg">
              {[...Array(5)].map((_, i) => (
                 <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'fill-current' : 'text-orange-200'}`} />
              ))}
            </div>
          </div>
          <p className="text-stone-700 text-sm mb-4">"{r.comment}"</p>
          {r.photos && r.photos.length > 0 && (
            <div className="flex gap-2 mt-4 overflow-x-auto">
              {r.photos.map((url, i) => (
                <img key={i} src={url || undefined} alt="Review" className="w-16 h-16 object-cover rounded-lg" />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

import { AdminCustomersTab } from './AdminCustomersTab';

function AdminNotificationsTab() {
  const { notifications, resolveNotification } = useAppContext();

  if (notifications.length === 0) {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-12 text-center">
        <Bell className="w-8 h-8 text-stone-300 mx-auto mb-3" />
        <p className="font-bold text-stone-800 text-sm">Nenhuma notificação nova</p>
        <p className="text-xs text-stone-500 mt-1">O sistema está limpo e sem conflitos de duplicidade.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
         <h3 className="font-bold text-xl text-stone-900 flex items-center gap-2">
            <Bell className="text-rose-500 w-5 h-5" /> Centro de Notificações
         </h3>
         <button onClick={() => notifications.forEach(n => resolveNotification(n.id, 'DELETE'))} className="text-xs font-bold text-rose-600 hover:underline">Limpar todas</button>
      </div>

      <div className="grid gap-4">
        {notifications.map(n => (
          <div key={n.id} className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${n.type === 'DUPLICATE_FILE' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                 <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-stone-900 group-hover:text-rose-600 transition-colors">{n.title}</h4>
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
                   <span className="text-[10px] text-stone-400 font-medium">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => resolveNotification(n.id, 'KEEP')}
                className="px-4 py-2 bg-stone-50 text-stone-600 text-xs font-bold rounded-xl border border-stone-100 hover:bg-stone-100 cursor-pointer transition"
              >
                Ignorar
              </button>
              <button 
                onClick={() => resolveNotification(n.id, 'DELETE')}
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
  const [code, setCode] = useState('');
  const [type, setType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [value, setValue] = useState(0);
  const [minPurchaseBRL, setMinPurchaseBRL] = useState(0);
  const [active, setActive] = useState(true);
  const [editingId, setEditingId] = useState('');

  const resetForm = () => {
    setEditingId('');
    setCode('');
    setType('PERCENT');
    setValue(0);
    setMinPurchaseBRL(0);
    setActive(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { code: code.toUpperCase(), type, value, minPurchaseBRL, active };
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
        <button onClick={() => setShowForm(!showForm)} className="bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
           {showForm ? <XCircle /> : <Plus />} {showForm ? 'Cancelar' : 'Novo Cupom'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
             <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Código do Cupom</label>
             <input type="text" value={code} onChange={e => setCode(e.target.value)} required className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50" placeholder="EX: BRASIL10" />
           </div>
           <div>
             <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Tipo</label>
             <select value={type} onChange={e => setType(e.target.value as any)} className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50">
               <option value="PERCENT">Porcentagem (%)</option>
               <option value="FIXED">Valor Fixo (R$)</option>
             </select>
           </div>
           <div>
             <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Valor do Desconto</label>
             <input type="number" value={value} onChange={e => setValue(Number(e.target.value))} required className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50" />
           </div>
           <div>
             <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Compra Mínima (R$)</label>
             <input type="number" value={minPurchaseBRL} onChange={e => setMinPurchaseBRL(Number(e.target.value))} className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50" />
           </div>
           <div className="flex items-center gap-2">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} id="coupon-active" />
              <label htmlFor="coupon-active" className="text-sm font-bold text-stone-700">Cupom Ativo</label>
           </div>
           <div className="md:col-span-2 flex justify-end gap-2">
             <button type="button" onClick={resetForm} className="text-stone-500 font-bold px-4">Limpar</button>
             <button type="submit" className="bg-rose-500 text-white px-6 py-2 rounded-lg font-bold">Salvar Cupom</button>
           </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map(c => (
          <div key={c.id} className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="font-mono font-bold text-rose-600 block">{c.code}</span>
              <span className="text-xs text-stone-500">{c.type === 'PERCENT' ? `${c.value}%` : formatCurrency(c.value)} de desconto</span>
              <div className="flex items-center gap-2 mt-1">
                 <span className={`text-[9px] px-1.5 rounded uppercase font-black ${c.active ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}>
                   {c.active ? 'Ativo' : 'Inativo'}
                 </span>
                 <span className="text-[9px] text-stone-400 font-bold">Usos: {c.usageCount}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditingId(c.id); setCode(c.code); setType(c.type); setValue(c.value); setMinPurchaseBRL(c.minPurchaseBRL || 0); setActive(c.active); setShowForm(true); }} className="p-2 text-stone-400 hover:text-indigo-600 cursor-pointer"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => deleteCoupon(c.id)} className="p-2 text-stone-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShippingMethodsTab() {
  const { shippingMethods, addShippingMethod, updateShippingMethod, deleteShippingMethod } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [carrier, setCarrier] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('');
  const [basePriceBRL, setBasePriceBRL] = useState(0);
  const [editingId, setEditingId] = useState('');

  const resetForm = () => {
    setEditingId('');
    setName('');
    setCarrier('');
    setEstimatedDays('');
    setBasePriceBRL(0);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name, carrier, estimatedDays, basePriceBRL };
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
        <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
           {showForm ? <XCircle /> : <Plus />} {showForm ? 'Cancelar' : 'Novo Método'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
             <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Nome do Serviço</label>
             <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50" placeholder="Ex: Econômico Aéreo" />
           </div>
           <div>
             <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Transportadora</label>
             <input type="text" value={carrier} onChange={e => setCarrier(e.target.value)} required className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50" placeholder="Ex: USPS, FedEx, Uber Local" />
           </div>
           <div>
             <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Prazo Estimado</label>
             <input type="text" value={estimatedDays} onChange={e => setEstimatedDays(e.target.value)} required className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50" placeholder="Ex: 15-20 dias" />
           </div>
           <div>
             <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Preço Base Estimado (R$)</label>
             <input type="number" value={basePriceBRL} onChange={e => setBasePriceBRL(Number(e.target.value))} required className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50" />
           </div>
           <div className="md:col-span-2 flex justify-end gap-2">
             <button type="button" onClick={resetForm} className="text-stone-500 font-bold px-4">Limpar</button>
             <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">Salvar Método</button>
           </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shippingMethods.map(m => (
          <div key={m.id} className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="font-bold text-stone-900 block">{m.name}</span>
              <span className="text-xs text-stone-500">{m.carrier} | {m.estimatedDays}</span>
              <span className="text-[11px] font-black text-indigo-600 block mt-1">Base: {formatCurrency(m.basePriceBRL)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditingId(m.id); setName(m.name); setCarrier(m.carrier); setEstimatedDays(m.estimatedDays); setBasePriceBRL(m.basePriceBRL); setShowForm(true); }} className="p-2 text-stone-400 hover:text-indigo-600 cursor-pointer"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => deleteShippingMethod(m.id)} className="p-2 text-stone-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Admin() {
  const { collaborator, user, orders, stores, products, tickets, reviews, updateOrderStatus, addProduct, updateProduct, deleteProduct, addStore, updateStore, deleteStore, updateTicket, notifications } = useAppContext();
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'stores' | 'tickets' | 'reviews' | 'settings' | 'team' | 'shipping' | 'quotes' | 'documents' | 'customers' | 'notifications' | 'coupons' | 'shipping_methods' | 'inventory' | null>(null);

  const hasPermission = (perm: string) => {
    if (user?.email === 'jallanluiz@gmail.com') return true;
    if (!collaborator) return false;
    return collaborator.permissions.includes(perm);
  };

  // Automatically select the first visible/permitted tab on load or profile load
  useEffect(() => {
    const tabs: (typeof activeTab)[] = [
      'orders', 'products', 'stores', 'tickets', 'team', 'shipping', 'reviews', 'settings', 'quotes', 'documents', 'customers', 'coupons', 'shipping_methods', 'inventory'
    ];
    const allowed = tabs.find(t => {
      if (t === 'shipping') return hasPermission('orders');
      if (t === 'quotes') return hasPermission('orders') || hasPermission('products');
      if (t === 'documents') return hasPermission('orders'); // Allow access if they can see orders
      if (t === 'customers') return hasPermission('orders'); // Allow access to CRM if they have orders access
      if (t === 'coupons') return hasPermission('settings');
      if (t === 'shipping_methods') return hasPermission('settings');
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
          <h1 className="text-3xl font-display font-bold text-stone-900">Painel Administrativo</h1>
        </div>
        
        <button 
          onClick={() => setActiveTab('notifications')}
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
        {hasPermission('orders') && (
          <button 
            onClick={() => setActiveTab('orders')}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === 'orders' ? 'text-rose-600' : 'text-stone-500 hover:text-stone-800'}`}
          >
            Pedidos
            {activeTab === 'orders' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>}
          </button>
        )}
        {hasPermission('products') && (
          <button 
            onClick={() => setActiveTab('products')}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === 'products' ? 'text-rose-600' : 'text-stone-500 hover:text-stone-800'}`}
          >
            Produtos
            {activeTab === 'products' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>}
          </button>
        )}
        {hasPermission('stores') && (
          <button 
            onClick={() => setActiveTab('stores')}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === 'stores' ? 'text-rose-600' : 'text-stone-500 hover:text-stone-800'}`}
          >
            Lojas
            {activeTab === 'stores' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>}
          </button>
        )}
        {hasPermission('settings') && (
          <button 
            onClick={() => setActiveTab('coupons')}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === 'coupons' ? 'text-rose-600' : 'text-stone-500 hover:text-stone-800'}`}
          >
            Cupons
            {activeTab === 'coupons' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>}
          </button>
        )}
        {hasPermission('settings') && (
          <button 
            onClick={() => setActiveTab('shipping_methods')}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === 'shipping_methods' ? 'text-rose-600' : 'text-stone-500 hover:text-stone-800'}`}
          >
            Métodos frete
            {activeTab === 'shipping_methods' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>}
          </button>
        )}
        {hasPermission('tickets') && (
          <button 
            onClick={() => setActiveTab('tickets')}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === 'tickets' ? 'text-rose-600' : 'text-stone-500 hover:text-stone-800'}`}
          >
            Suporte
            {activeTab === 'tickets' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>}
          </button>
        )}
        {hasPermission('team') && (
          <button 
            onClick={() => setActiveTab('team')}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === 'team' ? 'text-rose-600' : 'text-stone-500 hover:text-stone-800'}`}
          >
            Equipe
            {activeTab === 'team' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>}
          </button>
        )}
        {hasPermission('orders') && (
          <button 
            onClick={() => setActiveTab('shipping')}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === 'shipping' ? 'text-rose-600' : 'text-stone-500 hover:text-stone-800'}`}
          >
            Etiquetas
            {activeTab === 'shipping' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>}
          </button>
        )}
        {hasPermission('reviews') && (
          <button 
            onClick={() => setActiveTab('reviews')}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === 'reviews' ? 'text-rose-600' : 'text-stone-500 hover:text-stone-800'}`}
          >
            Satisfação
            {activeTab === 'reviews' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>}
          </button>
        )}
        {hasPermission('settings') && (
          <button 
            onClick={() => setActiveTab('settings')}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === 'settings' ? 'text-rose-600' : 'text-stone-500 hover:text-stone-800'}`}
          >
            Ajustes
            {activeTab === 'settings' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>}
          </button>
        )}
        {(hasPermission('orders') || hasPermission('products')) && (
          <button 
            onClick={() => setActiveTab('quotes')}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === 'quotes' ? 'text-rose-600' : 'text-stone-500 hover:text-stone-800'}`}
          >
            Orçamentos
            {activeTab === 'quotes' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>}
          </button>
        )}
        {hasPermission('orders') && (
          <button 
            onClick={() => setActiveTab('documents')}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === 'documents' ? 'text-rose-600' : 'text-stone-500 hover:text-stone-800'}`}
          >
            Drive
            {activeTab === 'documents' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>}
          </button>
        )}
        {hasPermission('orders') && (
          <button 
            onClick={() => setActiveTab('customers')}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === 'customers' ? 'text-rose-600' : 'text-stone-500 hover:text-stone-800'}`}
          >
            CRM
            {activeTab === 'customers' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>}
          </button>
        )}
        {hasPermission('products') && (
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`whitespace-nowrap pb-4 px-4 font-bold text-sm transition-colors cursor-pointer relative ${activeTab === 'inventory' ? 'text-rose-600' : 'text-stone-500 hover:text-stone-800'}`}
          >
            Estoque
            {activeTab === 'inventory' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full"></span>}
          </button>
        )}
      </div>

      {activeTab === 'orders' && hasPermission('orders') && <OrdersTab orders={orders} updateOrderStatus={updateOrderStatus} />}
      {activeTab === 'customers' && hasPermission('orders') && <AdminCustomersTab />}
      {activeTab === 'products' && hasPermission('products') && <ProductsTab products={products} stores={stores} addProduct={addProduct} updateProduct={updateProduct} deleteProduct={deleteProduct} />}
      {activeTab === 'stores' && hasPermission('stores') && <StoresTab stores={stores} addStore={addStore} updateStore={updateStore} deleteStore={deleteStore} />}
      {activeTab === 'tickets' && hasPermission('tickets') && <TicketsTab tickets={tickets} updateTicket={updateTicket} />}
      {activeTab === 'team' && hasPermission('team') && <AdminCollaboratorsTab />}
      {activeTab === 'shipping' && hasPermission('orders') && <AdminShippingLabelsTab orders={orders} />}
      {activeTab === 'reviews' && hasPermission('reviews') && <ReviewsTab reviews={reviews} />}
      {activeTab === 'settings' && hasPermission('settings') && <AdminSettingsTab />}
      {activeTab === 'quotes' && (hasPermission('orders') || hasPermission('products')) && <AdminQuotesTab />}
      {activeTab === 'documents' && hasPermission('orders') && <AdminDriveTab />}
      {activeTab === 'notifications' && <AdminNotificationsTab />}
      {activeTab === 'coupons' && hasPermission('settings') && <CouponsTab />}
      {activeTab === 'shipping_methods' && hasPermission('settings') && <ShippingMethodsTab />}
      {activeTab === 'inventory' && hasPermission('products') && <InventoryTab products={products} updateProduct={updateProduct} />}
      
    </div>
  );
}

function OrdersTab({ orders, updateOrderStatus }: { orders: any[], updateOrderStatus: any }) {
  const [selectedStatus, setSelectedStatus] = useState<string>('ACTIVE_NOT_CANCELLED');
  const [sortBy, setSortBy] = useState<'date_newest' | 'date_oldest' | 'value_highest' | 'value_lowest'>('date_newest');

  // Calculates stats
  const totalAll = orders.length;
  const activeOrders = orders.filter(o => o.status !== 'CANCELLED');
  const cancelledOrders = orders.filter(o => o.status === 'CANCELLED');
  const pendingOrders = orders.filter(o => o.status === 'PENDING_PAYMENT');
  const paidOrders = orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'PENDING_PAYMENT');

  const totalActiveCount = activeOrders.length;
  const totalCancelledCount = cancelledOrders.length;
  const totalPendingCount = pendingOrders.length;
  const totalPaidCount = paidOrders.length;

  const sumTotalBRL = activeOrders.reduce((acc, o) => acc + o.totalBRL, 0);
  const sumPaidBRL = paidOrders.reduce((acc, o) => acc + o.totalBRL, 0);
  const sumPendingBRL = pendingOrders.reduce((acc, o) => acc + o.totalBRL, 0);
  const sumCancelledBRL = cancelledOrders.reduce((acc, o) => acc + o.totalBRL, 0);
  const avgTicketActiveBRL = totalActiveCount > 0 ? sumTotalBRL / totalActiveCount : 0;

  // Filter orders by selected search/category/tab status
  const getFilteredOrders = () => {
    let list = [...orders];
    
    if (selectedStatus === 'ACTIVE_NOT_CANCELLED') {
      list = list.filter(o => o.status !== 'CANCELLED');
    } else if (selectedStatus !== 'ALL') {
      list = list.filter(o => o.status === selectedStatus);
    }

    // Sort list
    if (sortBy === 'date_newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'date_oldest') {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === 'value_highest') {
      list.sort((a, b) => b.totalBRL - a.totalBRL);
    } else if (sortBy === 'value_lowest') {
      list.sort((a, b) => a.totalBRL - b.totalBRL);
    }

    return list;
  };

  const filteredOrdersList = getFilteredOrders();

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Document Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("ImportaGringa - Relatório de Desempenho", 14, 20);

    // Metadata Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.text(`Relatório oficial emitido eletronicamente em: ${dateStr}`, 14, 26);

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
    doc.text(`R$ ${sumTotalBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 150, 59);

    doc.text("Faturamento Confirmado (Transações Pagas)", 17, 69);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // emerald-600
    doc.text(`R$ ${sumPaidBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 150, 69);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text("Valores Sob Análise / Aguardando Pagamento", 17, 79);
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(`R$ ${sumPendingBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 150, 79);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text("Faturamento Desconsiderado (Cancelados)", 17, 88);
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text(`R$ ${sumCancelledBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 150, 88);

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
      { key: 'PENDING_PAYMENT', label: 'Aguardando Pagamento', color: [217, 119, 6] },
      { key: 'PAYMENT_RECEIVED', label: 'Pagamento Confirmado', color: [16, 185, 129] },
      { key: 'PURCHASED_IN_STORE', label: 'Comprado na Loja Gringa', color: [37, 99, 235] },
      { key: 'STORED_IN_US', label: 'Armazenado no CD EUA', color: [79, 70, 229] },
      { key: 'AWAITING_SHIPPING_PAYMENT', label: 'Aguardando Pagamento Frete', color: [190, 24, 93] },
      { key: 'SHIPPING_PAID', label: 'Frete Pago', color: [16, 185, 129] },
      { key: 'IN_TRANSIT_TO_BR', label: 'Em Trâmite Internacional', color: [124, 58, 237] },
      { key: 'ARRIVED_IN_BR', label: 'Chegou no Brasil', color: [13, 148, 136] },
      { key: 'DELIVERED', label: 'Entregue ao Destinatário', color: [15, 23, 42] },
      { key: 'CANCELLED', label: 'Cancelado (Excluído dos Ativos)', color: [225, 29, 72] }
    ];

    pipelineStatuses.forEach(pState => {
      const stateOrders = orders.filter(o => o.status === pState.key);
      const count = stateOrders.length;
      const sumBRL = stateOrders.reduce((acc, o) => acc + o.totalBRL, 0);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(pState.label, 17, y + 5);
      doc.text(`${count} pedidos`, 110, y + 5);

      const color = pState.color;
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont("helvetica", "bold");
      doc.text(`R$ ${sumBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 150, y + 5);

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
    doc.text(`R$ ${avgTicketActiveBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por transação`, 68, y);

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

    const activeList = orders.filter(o => o.status !== 'CANCELLED');
    if (activeList.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text("Não há nenhuma solicitação ativa cadastrada no momento.", 17, y_detail + 5);
    } else {
      activeList.forEach(o => {
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
        const limitEmail = o.customerEmail.length > 22 ? `${o.customerEmail.substring(0, 20)}...` : o.customerEmail;
        doc.text(`${o.customerName.substring(0, 20)} (${limitEmail})`, 46, y_detail + 5);

        // Map status key to translated label
        const sObj = pipelineStatuses.find(p => p.key === o.status);
        const stLabel = sObj ? sObj.label : o.status;
        doc.text(stLabel, 126, y_detail + 5);

        doc.setFont("helvetica", "bold");
        doc.text(`R$ ${o.totalBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 166, y_detail + 5);

        doc.setDrawColor(248, 250, 252);
        doc.line(14, y_detail + 7, 196, y_detail + 7);
        y_detail += 7;
      });
    }

    doc.save(`importagringa_relatorio_desempenho_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}.pdf`);
  };

  const statusTabItems = [
    { id: 'ACTIVE_NOT_CANCELLED', label: 'Ativos (Sem Cancelados)', count: totalActiveCount, icon: CheckCircle },
    { id: 'ALL', label: 'Todos os Pedidos', count: totalAll, icon: Filter },
    { id: 'PENDING_PAYMENT', label: 'Aguardando Pagamento', count: totalPendingCount, icon: AlertCircle },
    { id: 'PAYMENT_RECEIVED', label: 'Pagamento Confirmado', count: totalPaidCount, icon: CheckCircle },
    { id: 'PURCHASED_IN_STORE', label: 'Comprado na Loja', count: orders.filter(o => o.status === 'PURCHASED_IN_STORE').length, icon: StoreIcon },
    { id: 'STORED_IN_US', label: 'Armazenado nos EUA', count: orders.filter(o => o.status === 'STORED_IN_US').length, icon: StoreIcon },
    { id: 'AWAITING_SHIPPING_PAYMENT', label: 'Pagamento de Frete', count: orders.filter(o => o.status === 'AWAITING_SHIPPING_PAYMENT').length, icon: DollarSign },
    { id: 'IN_TRANSIT_TO_BR', label: 'Em Trânsito para BR', count: orders.filter(o => o.status === 'IN_TRANSIT_TO_BR').length, icon: FileText },
    { id: 'ARRIVED_IN_BR', label: 'No Brasil', count: orders.filter(o => o.status === 'ARRIVED_IN_BR').length, icon: FileText },
    { id: 'DELIVERED', label: 'Entregue', count: orders.filter(o => o.status === 'DELIVERED').length, icon: CheckCircle },
    { id: 'CANCELLED', label: 'Cancelados (Separado)', count: totalCancelledCount, icon: XCircle },
  ];

  if (orders.length === 0) return <div className="text-gray-500 py-8">Nenhum pedido recebido ainda.</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. KPI PERFORMANCE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-stone-500 block uppercase tracking-wider">Faturamento Confirmado</span>
            <span className="text-2xl font-black text-emerald-600 block">{formatCurrency(sumPaidBRL)}</span>
            <span className="text-[11px] text-stone-400 block">{totalPaidCount} transações pagas</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-stone-500 block uppercase tracking-wider">Aguardando Pagamento</span>
            <span className="text-2xl font-black text-amber-600 block">{formatCurrency(sumPendingBRL)}</span>
            <span className="text-[11px] text-stone-400 block">{totalPendingCount} pedidos aguardando pix/sinal</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-stone-500 block uppercase tracking-wider">Ticket Médio Ativo</span>
            <span className="text-2xl font-black text-indigo-600 block">{formatCurrency(avgTicketActiveBRL)}</span>
            <span className="text-[11px] text-stone-400 block block">Média de valor por envio</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-1">
            <span className="text-xs font-bold text-stone-500 block uppercase tracking-wider">Relatório de Negócio</span>
            <span className="text-sm font-semibold text-stone-800 block">PDF Completo e Detalhado</span>
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
            <h3 className="text-lg font-bold text-stone-900">Gerenciar Encomendas</h3>
            <p className="text-xs text-stone-500">Separado e organizado por etapa operacional</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-500">Ordenar por:</span>
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-white border border-stone-200 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:ring-rose-500 focus:border-rose-500 outline-none"
            >
              <option value="date_newest">Mais recente</option>
              <option value="date_oldest">Mais antigo</option>
              <option value="value_highest">Maior valor</option>
              <option value="value_lowest">Menor valor</option>
            </select>
          </div>
        </div>

        <div className="flex border-b border-stone-200 pb-px overflow-x-auto gap-3 scrollbar-hide py-1">
          {statusTabItems.map(tab => {
            const TabIcon = tab.icon;
            const isSelected = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`whitespace-nowrap px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer relative ${
                  isSelected 
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-100' 
                    : 'bg-stone-50 text-stone-500 hover:bg-stone-100/80 border border-stone-200'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
                }`}>
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
          <p className="font-bold text-stone-800 text-sm">Nenhum pedido encontrado nesta seção</p>
          <p className="text-xs text-stone-500 mt-1">Nenhum pedido operacional com esse status foi localizado.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrdersList.map(order => (
            <OrderAdminCard key={order.id} order={order} updateOrderStatus={updateOrderStatus} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderAdminCard({ order, updateOrderStatus }: { key?: React.Key; order: any, updateOrderStatus: any }) {
  const { companySettings, autoSaveUserDocument } = useAppContext();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [note, setNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [finalShippingFeeBRL, setFinalShippingFeeBRL] = useState(order.finalShippingFeeBRL || order.shippingFeeBRL || 0);

  // Dimension states
  const [length, setLength] = useState(order.packageDimensions?.length || 0);
  const [width, setWidth] = useState(order.packageDimensions?.width || 0);
  const [height, setHeight] = useState(order.packageDimensions?.height || 0);
  const [weight, setWeight] = useState(order.packageWeight || 0);
  const [storageFeeBRL, setStorageFeeBRL] = useState(order.storageFeeBRL || 0);

  const signatureRef = useRef<SignatureCanvas>(null);
  const currentEvent = order.history[0];

  // Auto-calculate storage fee when dimensions change and status is STORED_IN_US or similar
  useEffect(() => {
    if (length > 0 && width > 0) {
      const rate = companySettings?.storageRatePerM2 || 150;
      const areaM2 = (length * width) / 10000;
      const calculatedFee = areaM2 * rate;
      setStorageFeeBRL(Number(calculatedFee.toFixed(2)));
    }
  }, [length, width, companySettings]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    let receipt = undefined;
    
    const targetUserId = order.userId || order.customerEmail || 'convidado';
    const userName = order.customerName || 'Cliente';

    if (status === 'DELIVERED') {
      if (signatureRef.current && !signatureRef.current.isEmpty()) {
        const signatureUrl = signatureRef.current.toDataURL();
        receipt = {
          id: Math.random().toString(36).substr(2, 9).toUpperCase(),
          signatureUrl,
          generatedAt: new Date().toISOString()
        };
        // Auto-save delivery receipt image
        await autoSaveUserDocument(targetUserId, userName, 'Recibos de Entrega', `Recibo de Entrega - Pedido ${order.id}.png`, signatureUrl);
      } else if (!order.receipt) {
        return alert('Por favor, colete a assinatura do cliente para concluir a entrega.');
      }
    }
    
    const extraFields: any = {};
    if (status === 'AWAITING_SHIPPING_PAYMENT') {
      extraFields.finalShippingFeeBRL = finalShippingFeeBRL;
    }
    if (status === 'SHIPPING_PAID') {
      extraFields.shippingPaid = true;
    }

    if (status === 'STORED_IN_US') {
      extraFields.packageDimensions = { length, width, height };
      extraFields.packageWeight = weight;
      extraFields.storageFeeBRL = storageFeeBRL;
    }

    extraFields.totalBRL = calculatedTotal;

    // Se admin anexar foto ou comprovante junto (relatório fotográfico)
    if (photoUrl) {
       await autoSaveUserDocument(targetUserId, userName, 'Relatórios Fotográficos', `Anexo - Pedido ${order.id} - ${new Date().toLocaleDateString()}`, photoUrl);
    }

    await updateOrderStatus(order.id, status, note, photoUrl, receipt, extraFields);
    setNote('');
    setPhotoUrl('');
    alert('Status atualizado com sucesso!');
  };

  // Calculation for the preview table
  const currentSubtotal = order.subtotalBRL;
  const currentServiceFee = order.serviceFeeBRL;
  const effectiveShipping = finalShippingFeeBRL > 0 && status !== 'PENDING_PAYMENT' ? finalShippingFeeBRL : order.shippingFeeBRL;
  const currentAppFee = order.appFeeBRL || 0;
  
  // Use local storageFeeBRL if status is STORED_IN_US or if it was already saved
  const effectiveStorage = (status === 'STORED_IN_US' || order.storageFeeBRL > 0) ? storageFeeBRL : order.storageFeeBRL;

  const calculatedTotal = currentSubtotal + currentServiceFee + effectiveStorage + effectiveShipping + currentAppFee;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center flex-wrap gap-4">
        <div>
           <div className="font-mono font-bold text-indigo-700 tracking-wider bg-indigo-100 px-2 py-1 rounded inline-block text-xs mb-1">
             {order.trackingId}
           </div>
           <div className="font-semibold text-gray-900">{order.customerName}</div>
           <div className="text-sm text-gray-500">{order.customerEmail}</div>
        </div>
        <div className="text-right">
           <div className="text-xs text-gray-500">Valor Atualizado (Base e Taxas)</div>
           <div className="font-bold text-gray-900 text-lg">{formatCurrency(calculatedTotal)}</div>
        </div>
      </div>
      
      <form onSubmit={handleUpdate} className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
           <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Status Atual</h4>
           <div className="bg-green-50 text-green-800 text-sm p-3 rounded-lg border border-green-200">
              <span className="font-bold block mb-1">Última atualização:</span>
              <span className="font-mono text-xs text-green-700">{new Date(currentEvent.date).toLocaleString()}</span>
              <p className="mt-1 font-medium">{order.status}</p>
           </div>
           
           <div className="pt-4 space-y-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Novo Status</label>
               <select 
                 value={status} 
                 onChange={e => setStatus(e.target.value as OrderStatus)}
                 className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 border"
               >
                 <option value="PENDING_PAYMENT">Aguardando Pagamento</option>
                 <option value="PAYMENT_RECEIVED">Pagamento Confirmado (Sinal 30% ou Total)</option>
                 <option value="PURCHASED_IN_STORE">Comprado na Loja (Pronto para Adicionar Foto da Nota/Produto)</option>
                 <option value="STORED_IN_US">Armazenado no CD dos EUA</option>
                 <option value="AWAITING_SHIPPING_PAYMENT">Aguardando Pagamento do Frete (Habilita campo de valor final)</option>
                 <option value="SHIPPING_PAID">Frete Pago (Confirmado)</option>
                 <option value="IN_TRANSIT_TO_BR">Em trâmite para o Brasil (Despachado)</option>
                 <option value="ARRIVED_IN_BR">Chegou no Brasil</option>
                 <option value="DELIVERED">Entregue ao Cliente</option>
                 <option value="CANCELLED">Cancelado</option>
               </select>
             </div>
             
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações (Visível para Cliente)</label>
                <textarea 
                  rows={2} 
                  value={note} 
                  onChange={e => setNote(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 border" 
                  placeholder="Ex: Produto comprado na Apple Store, segue foto da nota."
                />
             </div>

             {status === 'STORED_IN_US' && (
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 mt-4 space-y-4 animate-fade-in shadow-sm">
                  <div className="flex items-center gap-2 text-indigo-900 mb-1">
                    <Scale className="w-5 h-5" />
                    <h4 className="font-bold text-sm leading-none">Cálculo de Armazenagem</h4>
                  </div>
                  <p className="text-[11px] text-indigo-700 leading-relaxed">
                    Insira as dimensões do pacote para calcular a taxa de armazenagem (Baseada em R$ {companySettings?.storageRatePerM2 || 150}/m²).
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">Comp. (cm)</label>
                      <input 
                        type="number"
                        value={length}
                        onChange={e => setLength(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">Larg. (cm)</label>
                      <input 
                        type="number"
                        value={width}
                        onChange={e => setWidth(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">Alt. (cm)</label>
                      <input 
                        type="number"
                        value={height}
                        onChange={e => setHeight(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">Peso (kg)</label>
                      <input 
                        type="number"
                        value={weight}
                        onChange={e => setWeight(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">Taxa Calculada</label>
                      <div className="w-full px-3 py-2 rounded-lg border border-indigo-300 text-sm bg-indigo-100 font-bold text-indigo-900">
                        {formatCurrency(storageFeeBRL)}
                      </div>
                    </div>
                  </div>
                </div>
             )}

             {status === 'AWAITING_SHIPPING_PAYMENT' && (
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 mt-4 space-y-4 animate-fade-in shadow-sm">
                  <div className="flex items-center gap-2 text-rose-900 mb-1">
                    <Truck className="w-5 h-5" />
                    <h4 className="font-bold text-sm leading-none">Definição do Frete Final Real</h4>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Insira o valor real do frete calculado para este envio. O cliente verá este valor para realizar o pagamento via Pix.
                  </p>
                  <div>
                    <label className="block text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">Valor do Frete (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-stone-400 text-sm">R$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        value={finalShippingFeeBRL}
                        onChange={e => setFinalShippingFeeBRL(Number(e.target.value))}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-rose-200 focus:ring-rose-500 text-sm font-bold bg-white"
                        placeholder="0.00"
                      />
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
                 <p className="text-xs text-gray-500 mt-1">Faça upload ou cole a URL de uma foto para incluir no relatório do cliente (ex: comprovante, foto da caixa, etc).</p>
             </div>

             {status === 'DELIVERED' && !order.receipt && (
               <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mt-4 space-y-3">
                 <h4 className="font-bold text-sm text-stone-900 border-b border-stone-200 pb-2">Coleta de Assinatura (Obrigatório para Entrega)</h4>
                 <p className="text-xs text-stone-500">Solicite que o cliente assine abaixo para gerar o recibo oficial de entrega.</p>
                 <div className="bg-white border-2 border-dashed border-stone-300 rounded-xl overflow-hidden relative">
                   <SignatureCanvas 
                     ref={signatureRef}
                     penColor="black"
                     canvasProps={{className: 'signature-canvas w-full h-32'}}
                   />
                   <button type="button" onClick={() => signatureRef.current?.clear()} className="absolute top-2 right-2 bg-stone-100 text-stone-600 p-1.5 rounded-lg text-xs font-bold shadow-sm flex gap-1 items-center hover:bg-stone-200"><Eraser className="w-3 h-3" /> Limpar</button>
                 </div>
               </div>
             )}

             {order.receipt && (
               <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 mt-4">
                 <h4 className="font-bold text-sm text-emerald-900 mb-2">Comprovante Gerado</h4>
                 <div className="flex items-center gap-4">
                    <img src={order.receipt.signatureUrl || undefined} className="h-16 mix-blend-multiply opacity-80" />
                    <a href={`/recibo/${order.id}`} target="_blank" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700">Abrir Comprovante</a>
                 </div>
               </div>
             )}
           </div>

           <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-sm mt-4">
              <RefreshCw className="h-4 w-4" /> Atualizar Pedido
           </button>
        </div>

        <div>
           <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">Itens da Solicitação</h4>
           <ul className="space-y-4">
             {order.items.map((item: any) => (
                <li key={item.productId} className="flex gap-4">
                  <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                     <img src={item.product.imageUrl || undefined} alt="" className="w-full h-full object-cover"/>
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-900">{item.product.name}</div>
                    <div className="text-xs text-gray-500">Qtd: {item.quantity} | Valor BR: {formatCurrency(item.product.priceBRL)}</div>
                  </div>
                </li>
             ))}
           </ul>
           <div className="mt-8 bg-orange-50 text-orange-800 p-4 rounded-xl border border-orange-200">
             <div className="font-bold text-sm mb-2">Composição de Valores (Resumo)</div>
             <table className="w-full text-xs">
                <tbody>
                  <tr><td className="py-1">Produtos:</td><td className="text-right font-medium">{formatCurrency(currentSubtotal)}</td></tr>
                  <tr><td className="py-1">Serviço:</td><td className="text-right font-medium">{formatCurrency(currentServiceFee)}</td></tr>
                  {effectiveStorage > 0 && (
                    <tr><td className="py-1">Armazenagem:</td><td className="text-right font-medium">{formatCurrency(effectiveStorage)}</td></tr>
                  )}
                  <tr>
                    <td className="py-1">Frete {(finalShippingFeeBRL > 0 && status !== 'PENDING_PAYMENT') ? 'Real' : 'Estimado (Base)'}:</td>
                    <td className="text-right font-medium">{formatCurrency(effectiveShipping)}</td>
                  </tr>
                  {currentAppFee > 0 && (
                    <tr><td className="py-1 text-stone-500">Manutenção App:</td><td className="text-right font-medium text-stone-500">{formatCurrency(currentAppFee)}</td></tr>
                  )}
                  <tr className="border-t border-orange-200 font-bold text-sm"><td className="py-2">Total Consolidado:</td><td className="text-right py-2">{formatCurrency(calculatedTotal)}</td></tr>
                </tbody>
             </table>
           </div>
        </div>
      </form>
    </div>
  );
}

function ProductsTab({ products, stores, addProduct, updateProduct, deleteProduct }: { products: Product[], stores: Store[], addProduct: any, updateProduct: any, deleteProduct: any }) {
  const [showForm, setShowForm] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [productUrl, setProductUrl] = useState('');
  const [geminiMissing, setGeminiMissing] = useState(false);
  
  // Form fields
  const [editingId, setEditingId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceUSD, setPriceUSD] = useState(0);
  const [priceBRL, setPriceBRL] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [stockType, setStockType] = useState<'IN_STOCK' | 'PARTNER_STORE'>('IN_STOCK');
  const [inventory, setInventory] = useState(0);
  const [tags, setTags] = useState('');
  const [specifications, setSpecifications] = useState<{key: string, value: string}[]>([]);
  const [variants, setVariants] = useState<{name: string, sku: string, stock: number, priceUSD: number, priceBRL: number}[]>([]);

  const categories = [
    'Eletrônicos', 'Informática', 'Eletrodomésticos', 'Vestuário', 'Calçados', 
    'Beleza e Higiene', 'Brinquedos', 'Esportes', 'Relógios', 'Acessórios', 'Outros'
  ];

  const resetForm = () => {
    setEditingId('');
    setStoreId('');
    setName('');
    setDescription('');
    setPriceUSD(0);
    setPriceBRL(0);
    setImageUrl('');
    setSku('');
    setCategory('');
    setBrand('');
    setStockType('IN_STOCK');
    setInventory(0);
    setTags('');
    setSpecifications([]);
    setVariants([]);
    setProductUrl('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const specsMap: Record<string, string> = {};
    specifications.forEach(s => { if(s.key) specsMap[s.key] = s.value; });

    const productData = { 
      storeId, name, description, priceUSD, priceBRL, imageUrl, 
      sku, category, brand, stockType, inventory, 
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      specifications: specsMap,
      variants: variants.map((v, idx) => ({
        id: idx.toString(),
        name: v.name,
        sku: v.sku,
        stock: v.stock,
        priceAdjustUSD: v.priceUSD,
        priceAdjustBRL: v.priceBRL
      }))
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
    setImageUrl(p.imageUrl);
    setSku(p.sku || '');
    setCategory(p.category || '');
    setBrand(p.brand || '');
    setStockType(p.stockType || 'IN_STOCK');
    setInventory(p.inventory || 0);
    setTags(p.tags?.join(', ') || '');
    setSpecifications(Object.entries(p.specifications || {}).map(([key, value]) => ({ key, value })));
    setVariants((p.variants || []).map(v => ({
      name: v.name,
      sku: v.sku || '',
      stock: v.stock,
      priceUSD: v.priceAdjustUSD || 0,
      priceBRL: v.priceAdjustBRL || 0
    })));
    setShowForm(true);
  };

  const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name));
  const sortedStores = [...stores].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-stone-900">Catálogo de Vitrine</h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-rose-600 transition shadow-sm"
        >
          {showForm ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Novo Produto'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm animate-fade-in mb-8">
          <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h5 className="text-sm font-bold text-stone-800 border-b pb-1">Informações Básicas</h5>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Loja de Origem</label>
                  <select 
                    value={storeId} 
                    onChange={e => setStoreId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50"
                  >
                    <option value="">Selecione a loja...</option>
                    {sortedStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Nome do Produto</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">SKU Universal</label>
                  <input type="text" value={sku} onChange={e => setSku(e.target.value)} className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Categoria</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} required className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50">
                    <option value="">Selecione...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-sm font-bold text-stone-800 border-b pb-1">Preços e Imagem</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Preço USD ($)</label>
                    <input type="number" step="0.01" value={priceUSD} onChange={e => setPriceUSD(Number(e.target.value))} required className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Preço BRL (R$)</label>
                    <input type="number" step="0.01" value={priceBRL} onChange={e => setPriceBRL(Number(e.target.value))} required className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50" />
                  </div>
                </div>
                <ImageInput label="Foto do Produto (URL)" value={imageUrl} onChange={setImageUrl} />
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Marca</label>
                  <input type="text" value={brand} onChange={e => setBrand(e.target.value)} className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50" />
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-sm font-bold text-stone-800 border-b pb-1">Estoque e Tags</h5>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Tipo de Estoque</label>
                  <select value={stockType} onChange={e => setStockType(e.target.value as any)} className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50">
                    <option value="IN_STOCK">Temos em Estoque</option>
                    <option value="PARTNER_STORE">Comprar na Loja Parceira</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Quantidade em Estoque</label>
                  <input type="number" value={inventory} onChange={e => setInventory(Number(e.target.value))} className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Tags (separadas por vírgula)</label>
                  <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="promocao, lancamento, apple" className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm bg-stone-50" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-1">
                  <h5 className="text-sm font-bold text-stone-800">Especificações Técnicas</h5>
                  <button type="button" onClick={() => setSpecifications([...specifications, {key: '', value: ''}])} className="text-rose-500 text-xs font-bold flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar</button>
                </div>
                <div className="space-y-2">
                  {specifications.map((s, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input placeholder="Característica" value={s.key} onChange={e => {
                        const newSpecs = [...specifications];
                        newSpecs[idx].key = e.target.value;
                        setSpecifications(newSpecs);
                      }} className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs" />
                      <input placeholder="Valor" value={s.value} onChange={e => {
                        const newSpecs = [...specifications];
                        newSpecs[idx].value = e.target.value;
                        setSpecifications(newSpecs);
                      }} className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs" />
                      <button type="button" onClick={() => setSpecifications(specifications.filter((_, i) => i !== idx))} className="text-rose-400 p-1"><XCircle className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {specifications.length === 0 && <p className="text-[10px] text-stone-400 italic">Nenhuma característica extra adicionada.</p>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-1">
                  <h5 className="text-sm font-bold text-stone-800">Variantes (Tamanhos, Cores, etc)</h5>
                  <button type="button" onClick={() => setVariants([...variants, {name: '', sku: '', stock: 0, priceUSD: 0, priceBRL: 0}])} className="text-rose-500 text-xs font-bold flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar</button>
                </div>
                <div className="space-y-3">
                  {variants.map((v, idx) => (
                    <div key={idx} className="bg-stone-50 p-2 rounded border border-stone-200 space-y-2">
                      <div className="flex gap-2">
                        <input placeholder="Ex: Azul / XL / 128GB" value={v.name} onChange={e => {
                          const newV = [...variants];
                          newV[idx].name = e.target.value;
                          setVariants(newV);
                        }} className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs" />
                        <input placeholder="SKU Específico" value={v.sku} onChange={e => {
                          const newV = [...variants];
                          newV[idx].sku = e.target.value;
                          setVariants(newV);
                        }} className="w-24 rounded border border-stone-200 px-2 py-1 text-xs" />
                      </div>
                      <div className="flex gap-2 items-center">
                        <input type="number" placeholder="Estoque" value={v.stock} onChange={e => {
                          const newV = [...variants];
                          newV[idx].stock = Number(e.target.value);
                          setVariants(newV);
                        }} className="w-20 rounded border border-stone-200 px-2 py-1 text-xs" />
                        <div className="flex-1 flex gap-1 items-center">
                           <span className="text-[10px] text-stone-400">USD</span>
                           <input type="number" step="0.01" value={v.priceUSD} onChange={e => {
                             const newV = [...variants];
                             newV[idx].priceUSD = Number(e.target.value);
                             setVariants(newV);
                           }} className="w-16 rounded border border-stone-200 px-2 py-1 text-xs" />
                        </div>
                        <div className="flex-1 flex gap-1 items-center">
                           <span className="text-[10px] text-stone-400">BRL</span>
                           <input type="number" step="0.01" value={v.priceBRL} onChange={e => {
                             const newV = [...variants];
                             newV[idx].priceBRL = Number(e.target.value);
                             setVariants(newV);
                           }} className="w-20 rounded border border-stone-200 px-2 py-1 text-xs" />
                        </div>
                        <button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== idx))} className="text-rose-400 p-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                  {variants.length === 0 && <p className="text-[10px] text-stone-400 italic">O produto é único (sem variações).</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
               <button onClick={resetForm} type="button" className="px-6 py-2 rounded-lg text-sm font-bold text-stone-500 hover:bg-stone-50 transition">Limpar Campos</button>
               <button type="submit" className="bg-rose-500 text-white px-8 py-2 rounded-lg text-sm font-bold hover:bg-rose-600 transition shadow-md">Salvar Produto Completo</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedProducts.map(p => (
          <div key={p.id} className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm group">
            <div className="h-48 overflow-hidden relative">
              <img src={p.imageUrl || undefined} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(p)} className="bg-white/90 p-2 rounded-lg text-indigo-600 hover:bg-white shadow-sm cursor-pointer"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deleteProduct(p.id)} className="bg-white/90 p-2 rounded-lg text-rose-600 hover:bg-white shadow-sm cursor-pointer"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="absolute bottom-2 left-2 flex flex-col gap-1">
                <div className="px-2 py-1 bg-stone-900/80 text-white rounded text-[10px] font-bold uppercase tracking-widest inline-block self-start">
                  {stores.find(s => s.id === p.storeId)?.name || 'Outra Loja'}
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
                <h4 className="font-bold text-stone-900 line-clamp-1">{p.name} {p.brand && <span className="text-stone-400 font-normal">| {p.brand}</span>}</h4>
              </div>
              <p className="text-xs text-stone-500 mb-3 line-clamp-2">{p.description}</p>
              <div className="flex items-center gap-2 mb-3">
                 <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${p.stockType === 'PARTNER_STORE' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                   {p.stockType === 'PARTNER_STORE' ? 'Comprar na Loja' : 'Em Estoque'}
                 </span>
                 <span className="text-[10px] text-stone-400 font-bold">INV: {p.inventory}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-stone-50">
                <span className="text-xl font-black text-rose-600">{formatCurrency(p.priceBRL)}</span>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">US$ {p.priceUSD.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoresTab({ stores, addStore, updateStore, deleteStore }: { stores: Store[], addStore: any, updateStore: any, deleteStore: any }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setEditingId('');
    setName('');
    setLogoUrl('');
    setDescription('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateStore(editingId, { name, logoUrl, description });
    } else {
      await addStore({ name, logoUrl, description });
    }
    resetForm();
    setShowForm(false);
  };

  const sortedStores = [...stores].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-stone-900">Lojas Parceiras</h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition"
        >
          {showForm ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Nova Loja'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-stone-50 p-6 rounded-2xl border border-stone-200">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                 <div>
                   <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Nome da Loja</label>
                   <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-white rounded-lg border border-stone-200 px-4 py-2 text-sm" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Descrição</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-white rounded-lg border border-stone-200 px-4 py-2 text-sm" />
                 </div>
              </div>
              <div className="space-y-4">
                 <ImageInput label="Logo (URL)" value={logoUrl} onChange={setLogoUrl} />
                 <div className="flex justify-end gap-2 pt-4">
                   <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-bold">Limpar</button>
                   <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold">Salvar Loja</button>
                 </div>
              </div>
           </div>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {sortedStores.map(s => (
          <div key={s.id} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm text-center relative group flex flex-col items-center justify-between min-h-[120px] overflow-hidden">
            <div className="h-16 w-full flex items-center justify-center mb-3">
              {s.logoUrl ? <img src={s.logoUrl} alt={s.name} className="h-full w-auto max-w-full object-contain grayscale group-hover:grayscale-0 transition" /> : <StoreIcon className="w-8 h-8 text-stone-200" />}
            </div>
            <span className="font-bold text-stone-800 text-sm truncate w-full px-2">{s.name}</span>
            <div className="absolute inset-0 bg-stone-900/60 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 backdrop-blur-sm">
                <button onClick={() => { setEditingId(s.id); setName(s.name); setLogoUrl(s.logoUrl || ''); setDescription(s.description || ''); setShowForm(true); }} className="bg-white p-2 rounded-lg text-indigo-600 hover:scale-110 transition cursor-pointer"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deleteStore(s.id)} className="bg-white p-2 rounded-lg text-rose-600 hover:scale-110 transition cursor-pointer"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InventoryTab({ products, updateProduct }: { products: Product[], updateProduct: any }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState<'all' | 'low' | 'out' | 'partner' | 'in_stock'>('all');
  const [editingStocks, setEditingStocks] = useState<Record<string, { inventory: number, variants: { id: string, name: string, stock: number }[] }>>({});
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    setEditingStocks(prev => {
      const merged = { ...prev };
      products.forEach(p => {
        if (merged[p.id] === undefined) {
          merged[p.id] = {
            inventory: p.inventory || 0,
            variants: (p.variants || []).map(v => ({
              id: v.id,
              name: v.name,
              stock: v.stock || 0
            }))
          };
        }
      });
      return merged;
    });
  }, [products]);

  const handleInventoryChange = (productId: string, val: number) => {
    setEditingStocks(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        inventory: Math.max(0, val)
      }
    }));
  };

  const handleVariantStockChange = (productId: string, variantId: string, val: number) => {
    setEditingStocks(prev => {
      const prod = prev[productId];
      if (!prod) return prev;
      return {
        ...prev,
        [productId]: {
          ...prod,
          variants: prod.variants.map(v => v.id === variantId ? { ...v, stock: Math.max(0, val) } : v)
        }
      };
    });
  };

  const saveProductStock = async (p: Product) => {
    try {
      setSaveLoading(p.id);
      const editingState = editingStocks[p.id];
      if (!editingState) return;

      const updatedVariants = (p.variants || []).map(v => {
        const editedVar = editingState.variants.find(ev => ev.id === v.id);
        return {
          ...v,
          stock: editedVar ? editedVar.stock : v.stock
        };
      });

      await updateProduct(p.id, {
        inventory: editingState.inventory,
        variants: updatedVariants
      });

      setSaveSuccess(p.id);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaveLoading(null);
    }
  };

  const inStockProducts = products.filter(p => p.stockType === 'IN_STOCK');
  const outOfStockCount = inStockProducts.filter(p => {
    const edit = editingStocks[p.id];
    const inv = edit ? edit.inventory : p.inventory;
    return inv === 0 && (p.variants || []).length === 0;
  }).length + inStockProducts.filter(p => {
    const edit = editingStocks[p.id];
    if (!edit || edit.variants.length === 0) return false;
    return edit.variants.every(v => v.stock === 0);
  }).length;

  const lowStockCount = inStockProducts.filter(p => {
    const edit = editingStocks[p.id];
    const inv = edit ? edit.inventory : p.inventory;
    if ((p.variants || []).length === 0) {
      return inv > 0 && inv < 5;
    } else {
      const vars = edit ? edit.variants : [];
      return vars.some(v => v.stock > 0 && v.stock < 5);
    }
  }).length;

  const totalItemsCount = products.reduce((acc, p) => {
    if (p.stockType === 'PARTNER_STORE') return acc;
    const edit = editingStocks[p.id];
    if ((p.variants || []).length === 0) {
      return acc + (edit ? edit.inventory : p.inventory);
    } else {
      const vars = edit ? edit.variants : (p.variants || []);
      return acc + vars.reduce((vAcc, v) => vAcc + v.stock, 0);
    }
  }, 0);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) || 
                          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          p.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    const edit = editingStocks[p.id];
    const inv = edit ? edit.inventory : p.inventory;
    const hasVariants = (p.variants || []).length > 0;
    
    if (filterStockStatus === 'all') return true;
    if (filterStockStatus === 'partner') return p.stockType === 'PARTNER_STORE';
    if (filterStockStatus === 'in_stock') return p.stockType === 'IN_STOCK';
    
    if (p.stockType === 'PARTNER_STORE') return false;

    if (filterStockStatus === 'out') {
      if (!hasVariants) return inv === 0;
      const vars = edit ? edit.variants : [];
      return vars.every(v => v.stock === 0);
    }
    
    if (filterStockStatus === 'low') {
      if (!hasVariants) return inv > 0 && inv < 5;
      const vars = edit ? edit.variants : [];
      return vars.some(v => v.stock > 0 && v.stock < 5);
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-stone-900">Gestão e Controle de Estoque</h3>
          <p className="text-xs text-stone-500">Monitore, ajuste quantidades de produtos e gerencie estoques por variação de vitrine.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-stone-400 text-xs font-bold uppercase tracking-wider">Total em Estoque</span>
            <span className="text-2xl font-black text-stone-800">{totalItemsCount} <span className="text-xs font-normal text-stone-400">unids</span></span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-stone-400 text-xs font-bold uppercase tracking-wider">Estoque Baixo (&lt; 5)</span>
            <span className="text-2xl font-black text-stone-800">{lowStockCount} <span className="text-xs font-normal text-stone-400">ítens</span></span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-stone-400 text-xs font-bold uppercase tracking-wider">Produtos Sem Estoque</span>
            <span className="text-2xl font-black text-rose-600">{outOfStockCount} <span className="text-xs font-normal text-stone-400">ítens</span></span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-stone-100 text-stone-600">
            <StoreIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-stone-400 text-xs font-bold uppercase tracking-wider">Sob Encomenda (Lojas)</span>
            <span className="text-2xl font-black text-stone-800">{products.filter(p => p.stockType === 'PARTNER_STORE').length} <span className="text-xs font-normal text-stone-400">ítens</span></span>
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
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-xl border border-stone-200 text-sm bg-stone-50 focus:bg-white transition"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide pb-1">
          <button 
            type="button"
            onClick={() => setFilterStockStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition ${filterStockStatus === 'all' ? 'bg-rose-500 text-white' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
          >
            Todos ({products.length})
          </button>
          <button 
            type="button"
            onClick={() => setFilterStockStatus('in_stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition ${filterStockStatus === 'in_stock' ? 'bg-emerald-500 text-white' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
          >
            Físico ({products.filter(p => p.stockType === 'IN_STOCK').length})
          </button>
          <button 
            type="button"
            onClick={() => setFilterStockStatus('low')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition ${filterStockStatus === 'low' ? 'bg-orange-500 text-white' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
          >
            Estoque Baixo ({lowStockCount})
          </button>
          <button 
            type="button"
            onClick={() => setFilterStockStatus('out')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition ${filterStockStatus === 'out' ? 'bg-rose-600 text-white' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
          >
            Esgotados ({outOfStockCount})
          </button>
          <button 
            type="button"
            onClick={() => setFilterStockStatus('partner')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition ${filterStockStatus === 'partner' ? 'bg-stone-800 text-white' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
          >
            Sob Encomenda ({products.filter(p => p.stockType === 'PARTNER_STORE').length})
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
                <th className="py-3 px-4 text-center min-w-[125px]">Disponibilidade</th>
                <th className="py-3 px-4 text-center">Variações</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-stone-400 italic">Nenhum produto correspondente aos filtros.</td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const localState = editingStocks[p.id] || { inventory: p.inventory || 0, variants: [] };
                  const hasVariants = (p.variants || []).length > 0;
                  const isLow = p.stockType === 'IN_STOCK' && (hasVariants ? localState.variants.some(v => v.stock > 0 && v.stock < 5) : localState.inventory > 0 && localState.inventory < 5);
                  const isOut = p.stockType === 'IN_STOCK' && (hasVariants ? localState.variants.every(v => v.stock === 0) : localState.inventory === 0);

                  return (
                    <React.Fragment key={p.id}>
                      <tr className={`${isOut ? 'bg-rose-50/10' : ''} hover:bg-stone-50/50 transition`}>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img src={p.imageUrl || undefined} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-stone-100" />
                            <div>
                              <span className="font-bold text-stone-900 block line-clamp-1">{p.name}</span>
                              <span className="text-[10px] text-stone-400 font-medium">{p.brand || 'Sem marca'} · {p.category}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.stockType === 'PARTNER_STORE' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {p.stockType === 'PARTNER_STORE' ? 'Sob Encomenda' : 'Pronta Entrega'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono text-xs text-stone-500">{p.sku || 'Sem SKU'}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {p.stockType === 'PARTNER_STORE' ? (
                            <span className="text-xs text-stone-400 italic">Preço sob orçamento</span>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              {hasVariants ? (
                                <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                                  {localState.variants.reduce((acc, v) => acc + v.stock, 0)} unids totais
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button 
                                    type="button"
                                    onClick={() => handleInventoryChange(p.id, localState.inventory - 1)}
                                    className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold flex items-center justify-center text-xs transition select-none"
                                  >
                                    -
                                  </button>
                                  <input 
                                    type="number" 
                                    value={localState.inventory}
                                    onChange={e => handleInventoryChange(p.id, parseInt(e.target.value) || 0)}
                                    className="w-12 text-center py-0.5 rounded border border-stone-200 text-xs font-bold bg-white"
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => handleInventoryChange(p.id, localState.inventory + 1)}
                                    className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold flex items-center justify-center text-xs transition select-none"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                              {isOut && <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-50 border border-rose-100 px-1 rounded">Sem estoque</span>}
                              {isLow && <span className="text-[9px] font-black uppercase text-orange-500 bg-orange-50 border border-orange-100 px-1 rounded font-sans">Baixo</span>}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {hasVariants ? (
                            <button 
                              type="button"
                              onClick={() => setExpandedProduct(expandedProduct === p.id ? null : p.id)}
                              className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              {p.variants?.length} variações
                              <Plus className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-xs text-stone-400 italic">Sem variações</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {saveSuccess === p.id && (
                              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                                Salvo!
                              </span>
                            )}
                            {p.stockType === 'IN_STOCK' && (
                              <button
                                type="button"
                                onClick={() => saveProductStock(p)}
                                disabled={saveLoading === p.id}
                                className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-1 px-3 rounded-lg text-xs transition disabled:bg-rose-300 shadow-sm inline-flex items-center gap-1 cursor-pointer"
                              >
                                {saveLoading === p.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : 'Salvar'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {hasVariants && expandedProduct === p.id && (
                        <tr className="bg-stone-50/80">
                          <td colSpan={6} className="p-4">
                            <div className="border border-stone-200 rounded-xl bg-white p-4 max-w-2xl mx-auto space-y-3">
                              <h4 className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">Ajuste de Estoque por Variação</h4>
                              <div className="divide-y divide-stone-100 border-t border-b border-stone-100">
                                {localState.variants.map(v => (
                                  <div key={v.id} className="flex items-center justify-between py-2 text-xs">
                                    <span className="font-bold text-stone-705 text-stone-700">{v.name}</span>
                                    <div className="flex items-center gap-2">
                                      {v.stock === 0 && <span className="text-[9px] font-bold uppercase text-rose-500 mr-2">Sem estoque</span>}
                                      {v.stock > 0 && v.stock < 5 && <span className="text-[9px] font-bold uppercase text-orange-500 mr-2">Estoque Baixo</span>}
                                      
                                      <button 
                                        type="button"
                                        onClick={() => handleVariantStockChange(p.id, v.id, v.stock - 1)}
                                        className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center font-bold select-none"
                                      >
                                        -
                                      </button>
                                      <input 
                                        type="number"
                                        value={v.stock}
                                        onChange={e => handleVariantStockChange(p.id, v.id, parseInt(e.target.value) || 0)}
                                        className="w-12 text-center border rounded border-stone-200 py-0.5 bg-white font-bold"
                                      />
                                      <button 
                                        type="button"
                                        onClick={() => handleVariantStockChange(p.id, v.id, v.stock + 1)}
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
                                  {saveLoading === p.id ? 'Salvando...' : 'Aplicar nas Variações'}
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
