import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context';
import { Navigate } from 'react-router-dom';
import { MessageSquare, Send, Bot, User as UserIcon, Plus, Maximize2, Minimize2, X } from 'lucide-react';
import { TicketMessage } from '../types';

export function Support() {
  const { user, tickets, createTicket, updateTicket, orders, updateOrderStatus, products } = useAppContext();
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [manuallyClosed, setManuallyClosed] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-select latest ticket on mount/load and expand to full screen
  useEffect(() => {
    if (tickets.length > 0 && !activeTicketId && !manuallyClosed) {
      // Find first non-closed ticket, or fallback to first
      const firstActive = tickets.find(t => t.status !== 'CLOSED') || tickets[0];
      setActiveTicketId(firstActive.id);
      setIsExpanded(true);
    }
  }, [tickets, activeTicketId, manuallyClosed]);

  // Reset inactivity timer on user interaction
  const resetTimer = () => {
    lastActivityRef.current = Date.now();
  };

  const activeTicket = tickets.find(t => t.id === activeTicketId);

  useEffect(() => {
    if (!activeTicketId || !activeTicket || activeTicket.status === 'CLOSED') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = now - lastActivityRef.current;
      
      // 5 minutes = 300,000 ms
      if (diff >= 300000) {
        const timeoutMsg: TicketMessage = {
          role: 'bot',
          text: 'O atendimento foi encerrado automaticamente por inatividade (5 minutos). Caso precise de ajuda, abra um novo chamado.',
          timestamp: new Date().toISOString()
        };
        updateTicket(activeTicket.id, [...activeTicket.messages, timeoutMsg], 'CLOSED');
        setActiveTicketId(null);
        setManuallyClosed(true);
      }
    }, 10000); // Check every 10s

    return () => clearInterval(interval);
  }, [activeTicketId, activeTicket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tickets, activeTicketId, loading]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold font-display text-stone-900 mb-4">Acesso Restrito</h2>
        <p className="text-stone-500 mb-6">Você precisa estar logado para acessar o Suporte Personalizado.</p>
        <a href="/login" className="bg-rose-600 text-white px-6 py-3 rounded-lg font-bold">Fazer Login</a>
      </div>
    );
  }

  // Find the fresh ticket data in the list (or fallback)

  const startNewTicket = async (initialQuery?: string) => {
    const protocol = Math.floor(Math.random() * 1000000000).toString();
    const initialMessage: TicketMessage = {
      role: 'bot',
      text: 'Olá! Sou o assistente virtual da Dicas by Alê. Como posso te ajudar hoje?',
      timestamp: new Date().toISOString()
    };
    
    let messages = [initialMessage];
    
    if (initialQuery) {
       messages.push({ role: 'user', text: initialQuery, timestamp: new Date().toISOString() });
    }

    try {
      setLoading(true);
      const newId = await createTicket(protocol, messages);
      if (newId) {
        setActiveTicketId(newId);
        setIsExpanded(true);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || !activeTicket || activeTicket.status === 'CLOSED') return;
    
    resetTimer();
    const newMsg: TicketMessage = {
      role: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    const newMessages = [...activeTicket.messages, newMsg];
    const isFirstUserMessage = activeTicket.messages.filter(m => m.role === 'user').length === 0;

    setInputText('');
    setLoading(true);
    
    await updateTicket(activeTicket.id, newMessages);

    // Notify admin if it's the first message from user
    if (isFirstUserMessage) {
       fetch('/api/notify-ticket', {
         method: 'POST',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({ protocol: activeTicket.protocol, customerName: activeTicket.customerName, initialMessage: text })
       }).catch(console.error);
    }
    
    // Now trigger bot
    try {
      const userOrders = orders.filter(o => o.userId === user?.uid);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
          messages: newMessages,
          ticketId: activeTicket.id,
          orders: userOrders,
          products: products?.map(p => ({
            name: p.name,
            brand: p.brand,
            sku: p.sku || '',
            category: p.category,
            priceBRL: p.priceBRL,
            priceUSD: p.priceUSD,
            stockType: p.stockType,
            inventory: p.inventory,
            variants: p.variants?.map(v => ({
              name: v.name,
              sku: v.sku || '',
              stock: v.stock
            })) || []
          })) || []
        })
      });
      const data = await res.json();
      
      if (data.text) {
        let textResult = data.text;
        const cancelMatch = textResult.match(/\[CANCEL_ORDER_ID:\s*([^\]]+)\]/);
        
        if (cancelMatch) {
          const orderIdToCancel = cancelMatch[1].trim();
          textResult = textResult.replace(/\[CANCEL_ORDER_ID:\s*([^\]]+)\]/g, '').trim();
          await updateOrderStatus(orderIdToCancel, 'CANCELLED', 'Cancelado via Atendimento Automático');
        }

        const botMsg: TicketMessage = {
          role: 'bot',
          text: textResult,
          timestamp: new Date().toISOString()
        };
        await updateTicket(activeTicket.id, [...newMessages, botMsg]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 h-[80vh]">
      {/* Sidebar with ticket list */}
      <div className={`bg-white rounded-2xl shadow-sm border border-stone-100 flex flex-col overflow-hidden h-full ${activeTicket && isExpanded ? 'hidden' : 'flex'}`}>
        <div className="p-4 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
           <h2 className="font-bold text-stone-900 font-display">Meus Chamados</h2>
           <button onClick={() => startNewTicket()} className="bg-rose-100 text-rose-600 p-2 rounded-lg hover:bg-rose-200 cursor-pointer">
             <Plus className="h-4 w-4" />
           </button>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
           {tickets.length === 0 && <p className="text-sm text-stone-400 text-center mt-4">Nenhum chamado aberto.</p>}
           {tickets.map(t => (
             <button
               key={t.id}
               onClick={() => {
                 setActiveTicketId(t.id);
                 setIsExpanded(true);
                 setManuallyClosed(false);
                 resetTimer();
               }}
               className={`w-full text-left p-3 rounded-xl transition cursor-pointer ${activeTicketId === t.id ? 'bg-rose-50 border-rose-200 border' : 'hover:bg-stone-50 border border-transparent'}`}
             >
               <div className="flex justify-between items-center mb-1">
                 <span className="font-bold text-xs text-rose-600">Protocolo: {t.protocol}</span>
                 <div className="flex items-center gap-1.5">
                   {t.status === 'CLOSED' ? (
                     <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-stone-100 text-stone-500 font-sans">Encerrado</span>
                   ) : (
                     <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 font-sans">Ativo</span>
                   )}
                   <span className="text-[10px] text-stone-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                 </div>
               </div>
               <div className="text-sm font-medium text-stone-800 line-clamp-1">{t.messages.length > 1 ? t.messages[1].text : 'Novo atendimento'}</div>
             </button>
           ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`bg-white rounded-2xl shadow-sm border border-stone-100 flex flex-col overflow-hidden h-full ${activeTicket && isExpanded ? 'md:col-span-3' : 'md:col-span-2'}`}>
         {!activeTicket ? (
           <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-500">
             <MessageSquare className="h-12 w-12 text-stone-200 mb-4" />
             <p className="mb-4">Selecione um chamado ou inicie um novo para falar com nossa equipe/bot.</p>
             <button onClick={() => startNewTicket()} className="bg-rose-600 text-white font-bold py-2 px-6 rounded-full">
               Iniciar Novo Atendimento
             </button>
           </div>
         ) : (
            <>
              <div onClick={() => { if (!isExpanded) setIsExpanded(true); }} className={`p-4 border-b border-stone-100 bg-stone-50 flex justify-between items-center gap-2 ${!isExpanded ? 'cursor-pointer hover:bg-stone-100 transition' : ''}`}>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-stone-900 font-display truncate">Atendimento em Andamento</span>
                  <span className="text-xs text-stone-500 truncate">Protocolo: {activeTicket.protocol}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeTicket.status === 'CLOSED' && (
                    <span className="bg-stone-100 text-stone-500 text-xs font-bold py-1 px-3 rounded-full uppercase">
                      Encerrado
                    </span>
                  )}
                  
                  {/* Toggle Minimize/Maximize */}
                  {isExpanded ? (
                    <button
                      onClick={() => setIsExpanded(false)}
                      title="Minimizar (Mostrar histórico de chamados)"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-stone-600 bg-stone-100 hover:bg-stone-200 transition text-xs font-semibold cursor-pointer"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Minimizar</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsExpanded(true)}
                      title="Expandir (Ocupar tela cheia)"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-rose-600 bg-rose-50 hover:bg-rose-100 transition text-xs font-semibold cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Expandir</span>
                    </button>
                  )}

                  {/* Close Ticket View */}
                  <button
                     onClick={() => {
                       setActiveTicketId(null);
                       setIsExpanded(false);
                       setManuallyClosed(true);
                     }}
                     title="Fechar bate-papo"
                     className="p-1.5 rounded-full bg-stone-50 border border-stone-200 text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition cursor-pointer flex items-center justify-center font-bold"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div onClick={() => { if (!isExpanded) setIsExpanded(true); }} className={`flex-1 overflow-y-auto p-4 space-y-4 ${!isExpanded ? 'cursor-pointer' : ''}`}>
                 {activeTicket.messages.map((m, i) => (
                   <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-stone-200 text-stone-600' : 'bg-rose-500 text-white'}`}>
                       {m.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                     </div>
                     <div className={`p-3 rounded-2xl max-w-[80%] ${m.role === 'user' ? 'bg-stone-100 text-stone-800 rounded-tr-sm' : 'bg-rose-50 text-stone-900 rounded-tl-sm'}`}>
                       <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                     </div>
                   </div>
                 ))}
                 
                 {activeTicket.status !== 'CLOSED' && activeTicket.messages.length === 1 && (
                    <div className="flex flex-wrap gap-2 mt-4 ml-11">
                      <button onClick={() => handleSend('Cancelamento de compra')} className="bg-white border border-stone-200 text-stone-700 text-xs py-2 px-4 rounded-full shadow-sm hover:bg-stone-50">Cancelamento de compra</button>
                      <button onClick={() => handleSend('Dúvidas sobre prazos')} className="bg-white border border-stone-200 text-stone-700 text-xs py-2 px-4 rounded-full shadow-sm hover:bg-stone-50">Dúvidas sobre prazos</button>
                      <button onClick={() => handleSend('Outros')} className="bg-white border border-stone-200 text-stone-700 text-xs py-2 px-4 rounded-full shadow-sm hover:bg-stone-50">Outros</button>
                    </div>
                 )}
                 {loading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center shrink-0">
                         <span className="animate-pulse w-1 h-3 bg-white mx-[1px]"></span>
                         <span className="animate-pulse w-1 h-3 bg-white mx-[1px] delay-75"></span>
                         <span className="animate-pulse w-1 h-3 bg-white mx-[1px] delay-150"></span>
                      </div>
                    </div>
                 )}
                 <div ref={chatEndRef} />
              </div>

              {activeTicket.status === 'CLOSED' ? (
                <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-stone-800 text-sm">Atendimento Encerrado</span>
                    <span className="text-xs text-stone-500">Este bate-papo foi finalizado. Abra um novo chamado caso precise de ajuda.</span>
                  </div>
                  <button 
                    onClick={() => startNewTicket()} 
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-4 rounded-full transition flex items-center justify-center gap-1 shrink-0 self-start sm:self-center shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Novo Protocolo
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-white border-t border-stone-100">
                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleSend(inputText); }} 
                    className="relative flex items-center"
                    onKeyDown={resetTimer}
                    onClick={resetTimer}
                  >
                    <input
                      type="text"
                      value={inputText}
                      onChange={e => { setInputText(e.target.value); resetTimer(); }}
                      disabled={loading}
                      placeholder="Digite sua dúvida..."
                      className="w-full pl-4 pr-12 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition text-sm"
                    />
                    <button type="submit" disabled={loading || !inputText.trim()} className="absolute right-2 p-2 text-rose-500 hover:text-rose-600 disabled:opacity-50">
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              )}
            </>
         )}
      </div>
    </div>
  );
}
