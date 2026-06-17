import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context';
import { Navigate } from 'react-router-dom';
import { MessageSquare, Send, Bot, User as UserIcon, Plus, Maximize2, Minimize2, X, Paperclip, FileText, Download } from 'lucide-react';
import { TicketMessage } from '../types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface MessageAttachment {
  name: string;
  url: string;
  type: string;
}

export function Support() {
  const { user, tickets, createTicket, updateTicket, orders, updateOrderStatus, products, autoSaveUserDocument, systemKnowledge } = useAppContext();
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [manuallyClosed, setManuallyClosed] = useState(false);
  
  // Pending attachments list
  const [selectedAttachments, setSelectedAttachments] = useState<MessageAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

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

      // Check if human support was requested
      if (activeTicket.needsHuman) {
        // Has the agent joined? The agent has joined if there's any message marked with isAgent === true from bot
        const hasAgentJoined = activeTicket.messages.some(m => m.role === 'bot' && m.isAgent === true);
        
        if (!hasAgentJoined) {
          // RULE 1: If the chat is forwarded to a human agent, pause the inactivity timer until the agent Joins (sends reply)
          lastActivityRef.current = now;
          return;
        }

        // RULE 2: If the agent sends a message to the client, and the client takes more than five minutes to respond, auto-close the ticket.
        const reversedMessages = [...activeTicket.messages].reverse();
        const lastAgentMsgIndex = reversedMessages.findIndex(m => m.role === 'bot' && m.isAgent === true);
        
        if (lastAgentMsgIndex !== -1) {
          const lastAgentMsg = reversedMessages[lastAgentMsgIndex];
          const agentSentTime = new Date(lastAgentMsg.timestamp).getTime();
          const clientRespondedAfter = reversedMessages.slice(0, lastAgentMsgIndex).some(m => m.role === 'user');

          if (!clientRespondedAfter && (now - agentSentTime >= 300000)) {
            const timeoutMsg: TicketMessage = {
              role: 'bot',
              text: 'O atendimento foi encerrado automaticamente por falta de resposta do cliente (5 minutos após a mensagem enviada pelo atendente). Caso precise de ajuda, abra um novo chamado.',
              timestamp: new Date().toISOString()
            };
            updateTicket(activeTicket.id, [...activeTicket.messages, timeoutMsg], 'CLOSED');
            setActiveTicketId(null);
            setManuallyClosed(true);
            return;
          }
        }
      } else {
        // Standard bot inactivity timer
        const diff = now - lastActivityRef.current;
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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('No canvas context');
          ctx.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingAttachment(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });

        let finalUrl = url;
        if (file.type.startsWith('image/')) {
          finalUrl = await compressImage(file);
        }

        setSelectedAttachments(prev => [
          ...prev,
          { name: file.name, url: finalUrl, type: file.type }
        ]);
      } catch (err) {
        console.error("Error compressing image:", err);
      }
    }
    setUploadingAttachment(false);
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
  };

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
    const hasAttachments = selectedAttachments.length > 0;
    if (!text.trim() && !hasAttachments) return;
    if (!activeTicket || activeTicket.status === 'CLOSED') return;
    
    resetTimer();

    const newMsg: TicketMessage = {
      role: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString(),
      attachments: hasAttachments ? selectedAttachments : undefined
    };
    
    const newMessages = [...activeTicket.messages, newMsg];
    const isFirstUserMessage = activeTicket.messages.filter(m => m.role === 'user').length === 0;

    const attachmentsToSave = [...selectedAttachments];
    setInputText('');
    setSelectedAttachments([]);
    setLoading(true);
    
    await updateTicket(activeTicket.id, newMessages);

    // Save attachments of this conversation to user's administrative drive automatically!
    if (attachmentsToSave.length > 0) {
      for (const att of attachmentsToSave) {
        try {
          await autoSaveUserDocument(
            user.uid,
            user.displayName || user.email || 'Cliente',
            'Atendimento',
            att.name,
            att.url
          );
        } catch (saveErr) {
          console.error("Failed to auto-save file document into active user drive:", saveErr);
        }
      }
    }

    // Notify admin if it's the first message from user
    if (isFirstUserMessage) {
       fetch('/api/notify-ticket', {
         method: 'POST',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({ protocol: activeTicket.protocol, customerName: activeTicket.customerName, initialMessage: text })
       }).catch(console.error);
    }
    
    // Now trigger bot only if no human agent has joined yet
    const hasAgentJoined = newMessages.some(m => m.role === 'bot' && m.isAgent === true);
    
    if (hasAgentJoined) {
      setLoading(false);
      return;
    }

    try {
      const userOrders = orders.filter(o => o.userId === user?.uid);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
          messages: newMessages,
          ticketId: activeTicket.id,
          protocol: activeTicket.protocol,
          customerName: activeTicket.customerName,
          orders: userOrders,
          systemKnowledge: systemKnowledge?.filter(k => k.isApproved) || [],
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

        const transferMatch = textResult.includes('[TRANSFER_TO_HUMAN]');
        let isTransferred = false;
        if (transferMatch) {
          textResult = textResult.replace(/\[TRANSFER_TO_HUMAN\]/g, '').trim();
          isTransferred = true;
          
          let activeCollabs: any[] = [];
          try {
            const tempQ = query(collection(db, 'collaborators'), where('active', '==', true));
            const collabSnap = await getDocs(tempQ);
            activeCollabs = collabSnap.docs
              .map(d => d.data())
              .filter((c: any) => c.permissions && c.permissions.includes('tickets'));
          } catch (err) {
            console.error("Error querying collaborators to notify:", err);
          }

          fetch('/api/notify-ticket', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
              protocol: activeTicket.protocol, 
              customerName: activeTicket.customerName, 
              messages: [...newMessages, { role: 'bot', text: textResult, timestamp: new Date().toISOString() }],
              isUrgent: true,
              collaborators: activeCollabs
            })
          }).catch(console.error);
        }

        const botMsg: TicketMessage = {
          role: 'bot',
          text: textResult,
          timestamp: new Date().toISOString()
        };
        await updateTicket(activeTicket.id, [...newMessages, botMsg], undefined, isTransferred ? true : undefined);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderMessageAttachments = (msg: TicketMessage) => {
    if (!msg.attachments || msg.attachments.length === 0) return null;
    return (
      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          {msg.attachments.map((att, idx) => {
            const isImg = att.type.startsWith('image/') || att.url.startsWith('data:image/');
            return (
              <div key={idx} className="bg-white border border-stone-200 rounded-xl p-2 max-w-sm flex items-center gap-2.5 shadow-sm transition hover:shadow-md">
                {isImg ? (
                  <a href={att.url} target="_blank" rel="noreferrer" className="shrink-0 group relative cursor-pointer block">
                    <img src={att.url} alt={att.name || 'Image'} className="w-12 h-12 object-cover rounded-lg border border-stone-100" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/40 text-white text-[10px] flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition font-bold">Ver</div>
                  </a>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-rose-500" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-stone-800 truncate" title={att.name}>{att.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-stone-400 capitalize shrink-0">{att.type.split('/')[1] || 'Doc'}</span>
                    <a href={att.url} download={att.name} target="_blank" rel="noreferrer" className="text-rose-500 hover:text-rose-600 transition flex items-center gap-0.5 text-[9px] font-black uppercase cursor-pointer" title="Download">
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
    );
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
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 font-display truncate">Atendimento em Andamento</span>
                    {activeTicket.needsHuman && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse shrink-0">
                        Suporte Humano Solicitado
                      </span>
                    )}
                  </div>
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
                       {m.role === 'bot' && m.isAgent && (
                         <div className="text-[10px] uppercase tracking-wider font-extrabold text-rose-600 mb-1 flex items-center gap-1">
                           <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                           Atendente Humano
                         </div>
                       )}
                       {m.text && <p className="text-sm whitespace-pre-wrap">{m.text}</p>}
                       {renderMessageAttachments(m)}
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
                <div className="p-4 bg-white border-t border-stone-100 flex flex-col gap-2">
                  {/* Selected attachments list preview */}
                  {selectedAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-2">
                      {selectedAttachments.map((att, idx) => (
                        <div key={idx} className="relative bg-stone-50 border border-stone-200 rounded-lg p-1.5 pr-8 flex items-center gap-1.5 text-xs max-w-xs shadow-sm">
                          {att.type.startsWith('image/') ? (
                            <img src={att.url} alt="thumbnail" className="w-8 h-8 object-cover rounded" />
                          ) : (
                            <FileText className="w-8 h-8 p-1.5 text-rose-500 bg-rose-50 rounded animate-pulse" />
                          )}
                          <span className="truncate max-w-[120px] font-medium text-stone-700">{att.name}</span>
                          <button 
                            type="button" 
                            onClick={() => setSelectedAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-rose-500 rounded-full hover:bg-stone-200 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {uploadingAttachment && (
                        <div className="flex items-center gap-1.5 text-xs text-stone-500 animate-pulse bg-stone-50 border border-stone-200 rounded-lg p-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0"></span>
                          <span>Preparando arquivo...</span>
                        </div>
                      )}
                    </div>
                  )}

                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleSend(inputText); }} 
                    className="relative flex items-center gap-2"
                    onKeyDown={resetTimer}
                    onClick={resetTimer}
                  >
                    {/* Hidden file input */}
                    <input 
                      type="file" 
                      ref={attachmentInputRef} 
                      className="hidden" 
                      onChange={handleFileChange}
                      multiple
                      accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    />
                    
                    <button
                      type="button"
                      disabled={loading || uploadingAttachment}
                      onClick={() => attachmentInputRef.current?.click()}
                      className="p-2.5 text-stone-400 hover:text-rose-500 hover:border-rose-300 bg-stone-50 rounded-xl border border-stone-200 hover:bg-stone-100 transition shrink-0 flex items-center justify-center cursor-pointer"
                      title="Anexar comprovante, imagem ou documento"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>

                    <div className="relative flex-grow flex items-center">
                      <input
                        type="text"
                        value={inputText}
                        onChange={e => { setInputText(e.target.value); resetTimer(); }}
                        disabled={loading}
                        placeholder={selectedAttachments.length > 0 ? "Adicione uma legenda ou envie..." : "Digite sua dúvida..."}
                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition text-sm"
                      />
                      <button type="submit" disabled={loading || (!inputText.trim() && selectedAttachments.length === 0)} className="absolute right-2 p-2 text-rose-500 hover:text-rose-600 disabled:opacity-50 cursor-pointer">
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
         )}
      </div>
    </div>
  );
}
