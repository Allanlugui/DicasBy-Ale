import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context';
import { ShoppingBag, Star, Share2, Copy, CheckCircle2, Search, Sparkles, HelpCircle, DollarSign, Clock, MapPin, Check, X, LogIn, Loader2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Product } from '../types';

export function Home() {
  const { user, stores, products, reviews, addToCart, orders, quoteRequests, createQuoteRequest, updateQuoteRequest, approveQuoteAndCreateOrder, loginWithGoogle } = useAppContext();
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc'>('name');
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [copied, setCopied] = useState(false);

  const categories = [
    'Eletrônicos', 'Informática', 'Eletrodomésticos', 'Vestuário', 'Calçados', 
    'Beleza e Higiene', 'Brinquedos', 'Esportes', 'Relógios', 'Acessórios', 'Outros'
  ];

  // Assisted shopping search and quoting states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingInternet, setSearchingInternet] = useState(false);
  const [internetResults, setInternetResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Custom manual request input states
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualPriceUSD, setManualPriceUSD] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');

  // Submit flow states
  const [promptQuote, setPromptQuote] = useState<any | null>(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [localSuccessMsg, setLocalSuccessMsg] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('referred_by', ref);
    }
  }, []);

  const handleCopyRef = () => {
    if (!user) return;
    const link = `https://dicas-by-ale.vercel.app/?ref=${user.uid}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInternetSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchingInternet(true);
    setSearchError(null);
    setInternetResults([]);
    setShowManualForm(false);
    setLocalSuccessMsg(null);
    try {
      const response = await fetch('/api/search-internet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      
      let data: any = {};
      try {
        data = await response.json();
      } catch (e) {
        // Safe fallback for parsing
      }

      if (!response.ok) {
        if (response.status === 429 || data.errorReason === 'QUOTA_LIMIT') {
          setSearchError('A busca automática via IA atingiu o limite de tráfego nos EUA. Sem problemas! Cadastre sua de solicitação manualmente abaixo de forma 100% real que nossa equipe pesquisará o produto diretamente nas lojas americanas.');
        } else if (response.status === 503 || data.errorReason === 'KEY_MISSING') {
          setSearchError('O serviço de busca automática está momentaneamente indisponível. Por favor, envie sua solicitação preenchendo o formulário de orçamento manual abaixo!');
        } else {
          setSearchError('Não foi possível buscar os dados do produto de forma automática agora. Use o formulário abaixo para preencher os dados do orçamento manualmente!');
        }
        return;
      }

      setInternetResults(data.results || []);
      if (!data.results || data.results.length === 0) {
        setSearchError('Nenhum detalhe foi localizado na internet. Que tal fazer sua solicitação de orçamento manual logo abaixo?');
      }
    } catch (err: any) {
      console.error(err);
      setSearchError('Não conseguimos buscar automaticamente no momento. Você ainda pode cadastrar seu orçamento manualmente abaixo!');
    } finally {
      setSearchingInternet(false);
    }
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setModalError("Por favor, faça login ou crie uma conta com o Google para solicitar um orçamento.");
      return;
    }
    if (!promptQuote) return;
    setSubmittingQuote(true);
    setModalError(null);
    try {
      await createQuoteRequest(
        promptQuote.name,
        promptQuote.description || 'Solicitado via busca automática de produto',
        promptQuote.imageUrl || '',
        promptQuote.priceUSD || 0,
        customerPhone
      );
      setLocalSuccessMsg("Solicitação enviada com sucesso! Nossa equipe de compras irá procurar este produto e fornecerá a cotação em breve.");
      setPromptQuote(null);
      setCustomerPhone('');
      setInternetResults([]);
      setSearchQuery('');
    } catch (err) {
      console.error(err);
      setModalError("Erro ao enviar solicitação. Por favor, tente novamente.");
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setModalError("Por favor, faça login ou crie uma conta com o Google para solicitar um orçamento.");
      return;
    }
    if (!manualName.trim()) return;
    setSubmittingQuote(true);
    setModalError(null);
    try {
      await createQuoteRequest(
        manualName.trim(),
        manualDescription.trim(),
        manualImageUrl.trim(),
        parseFloat(manualPriceUSD) || 0,
        customerPhone
      );
      setLocalSuccessMsg("Solicitação enviada com sucesso! Procuraremos o produto nas lojas e retornaremos com a melhor cotação.");
      setManualName('');
      setManualDescription('');
      setManualPriceUSD('');
      setManualImageUrl('');
      setCustomerPhone('');
      setShowManualForm(false);
      setSearchQuery('');
    } catch (err) {
      console.error(err);
      setModalError("Erro ao enviar solicitação de orçamento. Por favor, revise os dados e tente novamente.");
    } finally {
      setSubmittingQuote(false);
    }
  };

  // Filter in-store products dynamically
  const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));
  const allSizes = Array.from(new Set(products.flatMap(p => p.variants?.map(v => v.name.includes('Size') ? v.name.split(':').pop()?.trim() : null)).filter(Boolean)));

  const filteredProducts = products.filter(p => {
    const matchesStore = selectedStore ? p.storeId === selectedStore : true;
    const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
    const matchesBrand = selectedBrand ? p.brand === selectedBrand : true;
    const matchesSize = selectedSize ? p.variants?.some(v => v.name.includes(selectedSize)) : true;
    const matchesSearch = searchQuery.trim()
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesStore && matchesCategory && matchesBrand && matchesSize && matchesSearch;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price_asc') return a.priceBRL - b.priceBRL;
    if (sortBy === 'price_desc') return b.priceBRL - a.priceBRL;
    return a.name.localeCompare(b.name);
  });

  const sortedStores = [...stores].sort((a, b) => a.name.localeCompare(b.name));

  const successfulReferrals = user ? orders.filter(o => o.referredBy === user.uid && o.userId !== user.uid && o.status !== 'CANCELLED') : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Hero Section - Parallel Commerce */}
      <div className="bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
             <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/30">
               <Sparkles className="w-3.5 h-3.5" />
               E-commerce Global Especializado
             </div>
             <h1 className="text-4xl md:text-6xl font-display font-black leading-tight">
               EUA para Brasil<br/>
               <span className="text-rose-200">& vice-versa.</span>
             </h1>
             <p className="text-lg md:text-xl text-rose-50 font-medium max-w-md">
               Compramos e enviamos produtos entre Brasil e Estados Unidos com total segurança, transparência e taxas competitivas.
             </p>
             <div className="flex flex-wrap gap-4">
                <button onClick={() => { setShowManualForm(true); setModalError(null); }} className="bg-rose-400/30 backdrop-blur-md text-white border border-white/30 px-8 py-4 rounded-2xl font-bold hover:bg-rose-400/40 transition">
                   Pedir um Orçamento
                </button>
             </div>
          </div>
          <div className="hidden md:flex justify-end gap-4 relative">
             {/* Visual elements representing global trade */}
             <div className="w-64 h-64 bg-white/10 rounded-full border border-white/20 flex flex-col items-center justify-center animate-pulse">
                <MapPin className="w-12 h-12 mb-2" />
                <span className="font-bold text-sm">Logística Direta</span>
                <span className="text-[10px] text-rose-200">Brasil ↔ USA</span>
             </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 -translate-y-4 translate-x-1/4 opacity-10">
          <Star size={400} />
        </div>
      </div>

      {/* Modern High-Contrast Dynamic Product Search Bar */}
      <div id="vitrine" className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-100 shadow-xl shadow-stone-200/50 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="space-y-1">
              <h3 className="font-display font-black text-stone-900 text-xl flex items-center gap-2">
                <Search className="h-5 w-5 text-rose-500" />
                O que você está procurando?
              </h3>
              <p className="text-sm text-stone-500">Filtrando entre produtos e serviços de importação direta.</p>
           </div>
           
           <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Ordenar por:</label>
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="name">Nome (A-Z)</option>
                <option value="price_asc">Menor Preço</option>
                <option value="price_desc">Maior Preço</option>
              </select>
           </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ex: iPhone 15, Stanley Quencher, Sephora, Link Externo..."
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
            />
          </div>
          <button
            onClick={handleInternetSearch}
            disabled={searchingInternet || !searchQuery.trim()}
            className="bg-[#ff004a] hover:bg-[#e60042] disabled:bg-stone-100 disabled:text-stone-400 text-white font-bold px-8 py-4 rounded-2xl transition shadow-lg shadow-rose-200 flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm cursor-pointer whitespace-nowrap"
          >
            {searchingInternet ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Buscando...
              </>
            ) : (
              'Buscar EUA'
            )}
          </button>
        </div>

        {/* Categories Carousel/List */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
           <button
             onClick={() => setSelectedCategory(null)}
             className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
               selectedCategory === null 
                 ? 'bg-rose-500 border-rose-500 text-white shadow-md' 
                 : 'bg-white border-stone-100 text-stone-500 hover:bg-stone-50'
             }`}
           >
             Tudo
           </button>
           {categories.map(cat => (
             <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedCategory === cat 
                    ? 'bg-rose-500 border-rose-500 text-white shadow-md' 
                    : 'bg-white border-stone-100 text-stone-500 hover:bg-stone-50 text-stone-500'
                }`}
             >
               {cat}
             </button>
           ))}
        </div>

        {/* Brand and Size Filters */}
        <div className="flex flex-wrap gap-4 items-center">
           {brands.length > 0 && (
             <div className="flex items-center gap-2">
               <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Marca:</label>
               <select 
                 value={selectedBrand || ''} 
                 onChange={e => setSelectedBrand(e.target.value || null)}
                 className="bg-stone-50 border border-stone-100 rounded-lg px-2 py-1 text-[11px] font-bold text-stone-600 outline-none focus:ring-1 focus:ring-rose-500"
               >
                 <option value="">Todas</option>
                 {brands.map(brand => <option key={brand} value={brand!}>{brand}</option>)}
               </select>
             </div>
           )}

           {allSizes.length > 0 && (
             <div className="flex items-center gap-2">
               <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Tamanho:</label>
               <select 
                 value={selectedSize || ''} 
                 onChange={e => setSelectedSize(e.target.value || null)}
                 className="bg-stone-50 border border-stone-100 rounded-lg px-2 py-1 text-[11px] font-bold text-stone-600 outline-none focus:ring-1 focus:ring-rose-500"
               >
                 <option value="">Todos</option>
                 {allSizes.map(size => <option key={size} value={size!}>{size}</option>)}
               </select>
             </div>
           )}
        </div>
      </div>

        {/* Dynamic Internet Listing & Manual quote button fallback */}
        {searchQuery.trim() !== '' && (
          <div className="pt-2 text-xs text-stone-400 flex flex-wrap items-center justify-between gap-2">
            <span>Filtrando produtos disponíveis na vitrine...</span>
            <button
              onClick={() => {
                setShowManualForm(prev => !prev);
                setInternetResults([]);
                setSearchError(null);
                setManualName(searchQuery);
                setModalError(null);
              }}
              className="text-rose-500 hover:text-rose-600 decoration-rose-400 font-semibold underline flex items-center gap-1 focus:outline-none"
            >
              Fazer Solicitação Manual Direta (Sem busca automatizada)
            </button>
          </div>
        )}
      {/* Status messages indicator */}
      {localSuccessMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 flex items-center gap-2.5 text-sm animate-fade-in font-medium">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <span>{localSuccessMsg}</span>
        </div>
      )}

      {/* Manual Request Form Modal */}
      {showManualForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-fade-in">
            <button onClick={() => setShowManualForm(false)} className="absolute top-6 right-6 z-10 p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition">
              <X className="w-5 h-5 text-stone-600" />
            </button>

            <form onSubmit={handleManualSubmit} className="p-8 md:p-12 space-y-8">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full text-[10px] font-black text-rose-600 uppercase tracking-widest">
                  <Sparkles className="w-3 h-3" />
                  Compra Assistida Personalizada
                </div>
                <h4 className="font-display font-black text-stone-900 text-3xl">Solicitar Orçamento</h4>
                <p className="text-sm text-stone-500 leading-relaxed">Nossa equipe de compras irá cotar o produto desejado diretamente nas lojas americanas para você.</p>
              </div>

              {modalError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs font-bold leading-relaxed">
                  {modalError}
                </div>
              )}

              {!user && (
                <div className="bg-stone-50 border border-stone-100 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-stone-700">
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4 text-[#ff004a] shrink-0 animate-bounce" />
                    Você precisa estar conectado para solicitar um orçamento.
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setModalError(null);
                        await loginWithGoogle();
                      } catch (err) {
                        console.error(err);
                        setModalError("Ocorreu um erro ao fazer logon com o Google. Tente novamente.");
                      }
                    }}
                    className="bg-[#ff004a] hover:bg-[#e60042] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-100"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Entrar com Google
                  </button>
                </div>
              )}
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Nome do Produto *</label>
                    <input 
                      type="text" 
                      required 
                      value={manualName} 
                      onChange={e => setManualName(e.target.value)}
                      placeholder="Ex: Sephora Glow Recipe Watermelon" 
                      className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Link ou Foto (URL opcional)</label>
                    <input 
                      type="text" 
                      value={manualImageUrl} 
                      onChange={e => setManualImageUrl(e.target.value)}
                      placeholder="https://-ou-nome-da-loja" 
                      className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Preço Estimado nos EUA ($ USD)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input 
                        type="number" 
                        step="0.01" 
                        value={manualPriceUSD} 
                        onChange={e => setManualPriceUSD(e.target.value)}
                        placeholder="0.00" 
                        className="w-full bg-stone-50 border border-stone-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Seu WhatsApp *</label>
                    <input 
                      type="text" 
                      required 
                      value={customerPhone} 
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="(00) 00000-0000" 
                      className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Especificações (Cor, Tamanho, Voltagem...)</label>
                  <textarea 
                    rows={3}
                    value={manualDescription} 
                    onChange={e => setManualDescription(e.target.value)}
                    placeholder="Descreva detalhes que facilitem a cotação..." 
                    className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all shadow-inner resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-4">
                {user ? (
                  <button 
                    type="submit" 
                    disabled={submittingQuote}
                    className="w-full bg-[#ff004a] hover:bg-[#e60042] disabled:bg-stone-300 text-white font-black py-5 rounded-[2rem] shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submittingQuote ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Enviando Solicitação...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Confirmar Solicitação de Orçamento
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={async () => {
                      try {
                        setModalError(null);
                        await loginWithGoogle();
                      } catch (err) {
                        console.error(err);
                        setModalError("Ocorreu um erro ao fazer logon com o Google. Tente novamente.");
                      }
                    }}
                    className="w-full bg-stone-900 hover:bg-stone-800 text-white font-black py-5 rounded-[2rem] shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-5 h-5" />
                    Entrar com Google e Confirmar Orçamento
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setShowManualForm(false)}
                  className="w-full py-4 text-stone-400 font-bold hover:text-stone-600 transition"
                >
                  Cancelar e Voltar para a Vitrine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Automated Internet Search Results Grid */}
      {internetResults.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <h3 className="font-display font-bold text-stone-900 text-lg flex items-center gap-1.5">
              <Sparkles className="h-5 w-5 text-rose-500" />
              Produtos Localizados nos Estados Unidos
            </h3>
            <button 
              onClick={() => setInternetResults([])}
              className="text-stone-400 hover:text-stone-600 text-xs font-medium focus:outline-none"
            >
              Limpar Resultados
            </button>
          </div>

          <p className="text-xs text-stone-500 leading-normal">
            Estes produtos foram localizados na internet americana com Inteligência Artificial. Selecione o que deseja para solicitar cotação com todas as taxas de importação!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {internetResults.map((result, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition">
                <div className="aspect-square bg-stone-50 relative overflow-hidden flex items-center justify-center p-3">
                  <img 
                    src={result.imageUrl || undefined} 
                    alt={result.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-rose-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                    {result.storeName || "Importados"}
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-grow space-y-2">
                  <h4 className="font-bold text-stone-900 text-sm leading-snug line-clamp-2">{result.name}</h4>
                  <p className="text-xs text-stone-400 line-clamp-2 leading-tight">{result.description}</p>
                  
                  <div className="pt-2 mt-auto flex items-end justify-between gap-1.5">
                    <div>
                      <span className="text-[10px] text-stone-400 block font-medium">Estimado nos EUA</span>
                      <span className="font-bold text-stone-800 text-base">${result.priceUSD > 0 ? result.priceUSD.toFixed(2) : "Sob consulta"}</span>
                    </div>
                    <button
                      onClick={() => {
                        setPromptQuote(result);
                        setLocalSuccessMsg(null);
                        // Safe scroll/focus to phone prompt
                      }}
                      className="bg-rose-50 text-rose-600 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-rose-500 hover:text-white transition"
                    >
                      Pedir Cotação
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inline Phone & Notification Modal/Prompter */}
      {promptQuote && (
        <div className="bg-rose-50/50 border border-rose-100 p-6 sm:p-8 rounded-2xl space-y-4 animate-fade-in">
          <div>
            <h4 className="font-bold text-rose-950 text-base">Quase lá! Forneça seu contato para o orçamento</h4>
            <p className="text-xs text-rose-700">A nossa equipe de compras pesquisará o produto <strong>"{promptQuote.name}"</strong> e retornará com os valores finais em Reais para aprovação.</p>
          </div>

          {!user ? (
            <div className="bg-amber-50 border border-amber-100 p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-amber-900">
              <span className="flex items-center gap-2">
                <LogIn className="w-4 h-4 text-rose-500 shrink-0 animate-bounce" />
                Conecte-se para que possamos gravar sua lista de orçamentos automaticamente!
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setModalError(null);
                      await loginWithGoogle();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="bg-[#ff004a] hover:bg-[#e60042] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Conectar com Google
                </button>
                <button
                  type="button"
                  onClick={() => setPromptQuote(null)}
                  className="bg-white hover:bg-stone-50 text-stone-600 border border-stone-200 px-4 py-2.5 rounded-lg text-xs font-bold transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitQuote} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <input 
                  type="text" 
                  required
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Seu WhatsApp com DDD (Ex: (11) 99999-9999)"
                  className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submittingQuote}
                  className="bg-rose-500 hover:bg-rose-600 disabled:bg-stone-300 text-white font-bold px-6 py-3 rounded-xl transition text-sm flex items-center justify-center whitespace-nowrap cursor-pointer"
                >
                  {submittingQuote ? "Solicitando..." : "Confirmar Solicitação de Orçamento"}
                </button>
                <button
                  type="button"
                  onClick={() => setPromptQuote(null)}
                  className="text-stone-500 hover:bg-white text-stone-600 px-4 py-3 rounded-xl transition text-sm border border-stone-200/50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Show search fallback if search failed or has errors */}
      {searchError && (
        <div className="bg-stone-50 border border-stone-200 p-6 rounded-2xl text-center space-y-3 animate-fade-in">
          <p className="text-sm text-stone-600 font-medium">{searchError}</p>
          <button
            onClick={() => {
              setShowManualForm(true);
              setSearchError(null);
              setManualName(searchQuery);
            }}
            className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
          >
            Preencher Orçamento Manualmente
          </button>
        </div>
      )}

      {/* My Quotes board dashboard */}
      {user && quoteRequests && quoteRequests.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-rose-100 shadow-sm space-y-4">
          <h2 className="text-xl font-display font-bold text-stone-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-rose-500 animate-pulse" />
            Meus Orçamentos de Compra Assistida
          </h2>
          <p className="text-sm text-stone-500">
            Acompanhe a cotação de menor preço de produtos personalizados que você enviou à nossa equipe.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quoteRequests.map((quote) => (
              <div key={quote.id} className="border border-stone-100 p-4 rounded-xl flex gap-4 overflow-hidden relative bg-stone-50/50 hover:bg-stone-50 transition">
                {quote.productImageUrl && (
                  <div className="w-20 h-20 bg-white rounded-lg overflow-hidden shrink-0 border border-stone-200/50 flex items-center justify-center">
                    <img src={quote.productImageUrl} alt={quote.productName} className="object-contain p-1 w-full h-full" referrerPolicy="no-referrer" />
                  </div>
                )}
                <div className="flex-grow space-y-2">
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-mono text-[9px] bg-stone-200 text-stone-700 px-1 py-0.5 rounded">
                      #{quote.id.substring(0, 6).toUpperCase()}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                      quote.status === 'PENDING' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                      quote.status === 'QUOTED' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                      quote.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      quote.status === 'REJECTED' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {quote.status === 'PENDING' ? 'Buscando nos EUA' :
                       quote.status === 'QUOTED' ? 'Orçado - Decidir' :
                       quote.status === 'APPROVED' ? 'Aprovado' :
                       quote.status === 'REJECTED' ? 'Recusado' : 'Pedido Gerado'}
                    </span>
                  </div>

                  <h3 className="font-bold text-stone-950 text-sm line-clamp-1">{quote.productName}</h3>
                  {quote.productDescription && <p className="text-xs text-stone-400 line-clamp-1">{quote.productDescription}</p>}

                  {/* Pricing info and actions */}
                  {quote.status === 'PENDING' && (
                    <p className="text-xs text-stone-500 italic flex items-center gap-1.5 pt-1">
                      <Clock className="w-3.5 h-3.5 text-orange-400" />
                      Nossa equipe de compradores já está cotando este produto nas lojas americanas...
                    </p>
                  )}

                  {quote.status === 'QUOTED' && (
                    <div className="space-y-3 bg-white p-3 rounded-lg border border-blue-100 mt-2">
                      <div className="text-xs space-y-1">
                        <div className="text-stone-500">Loja nos EUA: <span className="font-bold text-stone-800">{quote.storeLocationUS}</span></div>
                        <div className="text-stone-500 font-mono">Estimativa: ${quote.quotedPriceUSD?.toFixed(2)} USD</div>
                        <div className="text-sm font-bold text-stone-900 mt-1">Preço Final: <span className="text-emerald-600 underline font-extrabold text-base">{formatCurrency(quote.quotedPriceBRL || 0)}</span></div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (confirm("Deseja aprovar este orçamento? Será criado um pedido para pagamento!")) {
                              try {
                                await approveQuoteAndCreateOrder(quote);
                                alert("Orçamento aprovado com sucesso! Pedido gerado. Você já pode efetuar o pagamento.");
                              } catch (err) {
                                console.error(err);
                                alert("Ocorreu um erro ao aprovar orçamento.");
                              }
                            }
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-2 rounded-lg transition"
                        >
                          Aprovar & Pedir
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm("Tem certeza que deseja recusar este orçamento?")) {
                              try {
                                await updateQuoteRequest(quote.id, { status: 'REJECTED' });
                              } catch (err) {
                                console.error(err);
                              }
                            }
                          }}
                          className="bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-xs px-3 py-2 rounded-lg transition"
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  )}

                  {quote.status === 'APPROVED' && (
                    <div className="text-xs space-y-1">
                      <p className="text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Orçamento aprovado!
                      </p>
                      {quote.orderId && (
                        <a href={`/recibo/${quote.orderId}`} className="inline-block bg-rose-50 text-rose-600 hover:underline px-2.5 py-1 rounded text-[11px] font-bold">
                          Ver Recibo do Pedido →
                        </a>
                      )}
                    </div>
                  )}

                  {quote.status === 'REJECTED' && (
                    <p className="text-xs text-rose-500 font-medium italic flex items-center gap-1">
                      <X className="w-3.5 h-3.5" />
                      Você recusou a cotação para este produto.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stores Filter */}
      <div>
        <h2 className="text-xl font-display font-bold text-stone-900 mb-4">Lojas Disponíveis</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setSelectedStore(null);
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedStore === null 
                ? 'bg-stone-900 text-white shadow-md' 
                : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'
            }`}
          >
            Todas as Lojas
          </button>
          {sortedStores.map(store => (
            <button
              key={store.id}
              onClick={() => setSelectedStore(store.id === selectedStore ? null : store.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedStore === store.id
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-100'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'
              }`}
            >
              {store.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div>
        <h2 className="text-xl font-display font-bold text-stone-900 mb-6">Destaques Selecionados</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {sortedProducts.map(product => (
            <ProductCard key={product.id} product={product} onSelect={() => setSelectedProductForModal(product)} />
          ))}
          {sortedProducts.length === 0 && (
            <div className="col-span-full py-12 text-center text-stone-500 bg-white rounded-3xl border border-stone-100 p-8 space-y-4">
              <Sparkles className="w-12 h-12 text-stone-200 mx-auto" />
              <p className="font-medium">Nenhum produto encontrado nesta categoria ou loja.</p>
              {searchQuery.trim() !== '' && (
                <button
                  onClick={handleInternetSearch}
                  disabled={searchingInternet}
                  className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-3 rounded-2xl text-sm font-bold transition mx-auto inline-flex items-center gap-2 shadow-lg shadow-rose-100"
                >
                  {searchingInternet ? <Loader2 className="animate-spin" /> : <Search className="w-4 h-4" />}
                  {searchingInternet ? "Buscando nos EUA..." : `Buscar "${searchQuery}" em lojas Americanas`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProductForModal && (
        <ProductModal 
          product={selectedProductForModal} 
          onClose={() => setSelectedProductForModal(null)} 
        />
      )}

      {/* Testimonials */}

      {/* Testimonials */}
      {reviews.length > 0 && (
        <div className="pt-8 border-t border-stone-100">
          <h2 className="text-xl font-display font-bold text-stone-900 mb-8 text-center">O que nossos clientes dizem</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {reviews.slice(0, 3).map(r => (
                <div key={r.id} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col items-center text-center">
                  <div className="flex gap-1 mb-4 text-orange-400">
                     {[...Array(5)].map((_,i) => <Star key={i} className={`w-5 h-5 ${i < r.rating ? 'fill-current' : 'text-stone-200'}`} />)}
                  </div>
                  <p className="font-medium text-stone-700 italic mb-4 line-clamp-4">"{r.comment}"</p>
                  <p className="font-bold text-stone-900 mt-auto">{r.customerName}</p>
                </div>
             ))}
          </div>
        </div>
      )}

      {/* Refer & Earn Section (Small) */}
      <div className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 border border-emerald-100/75 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row flex-wrap items-center justify-between gap-4 shadow-sm text-xs mt-8">
         <div className="flex flex-1 items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
               <Share2 className="w-5 h-5" />
            </div>
            <div>
               <h3 className="font-bold text-emerald-950 text-sm">Indique e Ganhe Cupons!</h3>
               <p className="text-emerald-700 leading-tight">
                  Ganhe cupons especiais de 15% de desconto quando novos amigos se cadastrarem e comprarem conosco usando seu link de convite.
               </p>
            </div>
         </div>
         <div className="w-full md:w-auto shrink-0 flex flex-col sm:flex-row gap-2 items-center justify-end">
            {user ? (
               <>
                 <div className="bg-white px-3 py-1.5 rounded-lg border border-emerald-100 text-stone-500 font-mono text-[11px] break-all select-all">
                    https://dicas-by-ale.vercel.app/?ref={user.uid}
                 </div>
                 <button 
                   onClick={handleCopyRef}
                   className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 whitespace-nowrap text-xs shadow-sm shadow-emerald-50"
                 >
                   {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                   {copied ? 'Copiado!' : 'Copiar Link'}
                 </button>
               </>
            ) : (
               <a href="/login" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg transition text-center whitespace-nowrap text-xs shadow-sm shadow-emerald-50">
                  Fazer Login para Compartilhar
               </a>
            )}
         </div>

         {/* List of successfully earned referral coupons */}
         {successfulReferrals.length > 0 && (
            <div className="w-full mt-2 pt-2 border-t border-emerald-100/50 flex flex-wrap gap-2 items-center">
               <span className="text-emerald-900 font-bold text-[11px]">Seus Cupons de Desconto Ganhos:</span>
               {successfulReferrals.map((refOrder) => {
                  const couponCode = `IND-${refOrder.id.substring(0, 6).toUpperCase()}`;
                  return (
                     <div key={refOrder.id} className="inline-flex items-center gap-1 bg-white border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-mono text-emerald-700" title="15% de desconto!">
                        <strong>{couponCode}</strong> (15% OFF)
                     </div>
                  );
               })}
            </div>
         )}
      </div>
    </div>
  );
}

function ProductCard({ product, onSelect }: { key?: React.Key; product: Product, onSelect: () => void }) {
  const { stores, addToCart } = useAppContext();
  const store = stores.find(s => s.id === product.storeId);

  const hasVariants = product.variants && product.variants.length > 0;

  return (
    <div 
      onClick={onSelect}
      className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden flex flex-col group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 cursor-pointer"
    >
      <div className="aspect-square bg-stone-50 relative overflow-hidden">
        <img 
          src={product.imageUrl || undefined} 
          alt={product.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute top-4 left-4 flex flex-col gap-2">
           <div className="bg-white/90 backdrop-blur-md text-stone-900 font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full shadow-lg border border-stone-100/50">
             {store?.name}
           </div>
           {product.category && (
             <div className="bg-rose-500/90 backdrop-blur-md text-white font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full shadow-lg self-start">
               {product.category}
             </div>
           )}
        </div>
        {product.stockType === 'PARTNER_STORE' && (
          <div className="absolute top-4 right-4 bg-amber-500 text-white font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded shadow-lg">
            Sob Encomenda
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <div className="mb-4">
           {product.brand && <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1 block">{product.brand}</span>}
           <h3 className="font-display font-bold text-stone-900 text-lg leading-tight line-clamp-2">{product.name}</h3>
        </div>
        
        <p className="text-xs text-stone-400 mb-6 line-clamp-2 leading-relaxed">{product.description}</p>
        
        <div className="mt-auto flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Valor estimado</div>
            <div className="font-black text-2xl text-stone-900 tracking-tight">{formatCurrency(product.priceBRL)}</div>
            <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded inline-block">US$ {product.priceUSD.toFixed(2)}</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasVariants) {
                onSelect();
              } else {
                addToCart(product, 1);
              }
            }}
            className="h-12 w-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 hover:shadow-xl active:scale-95 group/btn"
            aria-label="Adicionar ao carrinho"
          >
            {hasVariants ? (
              <Search className="h-6 w-6 group-hover/btn:scale-110 transition-transform" />
            ) : (
              <ShoppingBag className="h-6 w-6 group-hover/btn:scale-110 transition-transform" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductModal({ product, onClose }: { product: Product, onClose: () => void }) {
  const { addToCart, stores } = useAppContext();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(product.variants?.[0]?.id || null);
  const [quantity, setQuantity] = useState(1);
  const store = stores.find(s => s.id === product.storeId);

  const selectedVariant = product.variants?.find(v => v.id === selectedVariantId);
  
  const currentPriceBRL = product.priceBRL + (selectedVariant?.priceAdjustBRL || 0);
  const currentPriceUSD = product.priceUSD + (selectedVariant?.priceAdjustUSD || 0);

  const handleAddToCart = () => {
    // We add the product with the variant info in the name or description for now
    // Actually our Product type should handle variants better, but let's just snapshot it
    const productWithVariant = {
      ...product,
      name: selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name,
      priceBRL: currentPriceBRL,
      priceUSD: currentPriceUSD,
      sku: selectedVariant?.sku || product.sku
    };
    addToCart(productWithVariant, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row relative">
        <button onClick={onClose} className="absolute top-6 right-6 z-10 p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition">
          <X className="w-5 h-5 text-stone-600" />
        </button>

        {/* Product Image */}
        <div className="md:w-1/2 bg-stone-50 p-8 flex items-center justify-center relative overflow-hidden">
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="w-full h-auto max-h-[400px] object-contain drop-shadow-2xl"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-8 left-8 flex flex-col gap-2">
             <div className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-2xl shadow-lg border border-stone-100 text-stone-900 font-bold text-xs uppercase tracking-widest">
                {store?.name}
             </div>
             {product.stockType === 'PARTNER_STORE' && (
                <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                   Parceria Oficial
                </div>
             )}
          </div>
        </div>

        {/* Product Info */}
        <div className="md:w-1/2 p-8 md:p-12 overflow-y-auto space-y-8">
           <div className="space-y-2">
              {product.brand && <span className="text-xs font-black text-rose-500 uppercase tracking-[0.2em]">{product.brand}</span>}
              <h2 className="text-3xl font-display font-black text-stone-900 leading-tight">{product.name}</h2>
              <div className="flex items-center gap-4 text-xs font-bold text-emerald-600">
                 <span className="bg-emerald-50 px-2 py-1 rounded-lg">US$ {currentPriceUSD.toFixed(2)}</span>
                 <span className="text-stone-300">|</span>
                 <span className="text-stone-400">Conversão estimada incl. tributos</span>
              </div>
           </div>

           <p className="text-sm text-stone-500 leading-relaxed">{product.description}</p>

           {/* Variants Selector */}
           {product.variants && product.variants.length > 0 && (
             <div className="space-y-4">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Seleção de Variante (Cor / Tamanho / Modelo)</label>
                <div className="grid grid-cols-2 gap-3">
                   {product.variants.map(v => (
                     <button
                       key={v.id}
                       disabled={v.stock <= 0}
                       onClick={() => setSelectedVariantId(v.id)}
                       className={`flex flex-col p-3 rounded-2xl border text-left transition-all ${
                         selectedVariantId === v.id 
                           ? 'border-rose-500 bg-rose-50/50 shadow-md ring-1 ring-rose-500' 
                           : 'border-stone-100 bg-stone-50 hover:border-stone-200'
                       } ${v.stock <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                     >
                        <span className="text-xs font-bold text-stone-900">{v.name}</span>
                        {v.priceAdjustBRL !== 0 && (
                          <span className={`${(v.priceAdjustBRL || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'} text-[9px] font-bold mt-1`}>
                            { (v.priceAdjustBRL || 0) > 0 ? '+' : '' }{formatCurrency(v.priceAdjustBRL || 0)}
                          </span>
                        )}
                        {v.stock <= 0 && <span className="text-[9px] text-red-500 font-bold mt-1">Esgotado</span>}
                        {v.stock > 0 && v.stock < 5 && <span className="text-[9px] text-orange-500 font-bold mt-1">Poucas unidades!</span>}
                     </button>
                   ))}
                </div>
             </div>
           )}

           {/* Specifications */}
           {product.specifications && Object.keys(product.specifications).length > 0 && (
             <div className="space-y-4 pb-4 border-b border-stone-100">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Especificações Técnicas</label>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                   {Object.entries(product.specifications).map(([key, value]) => (
                     <div key={key} className="flex justify-between text-[11px] border-b border-stone-50 pb-1">
                        <span className="text-stone-400">{key}</span>
                        <span className="text-stone-900 font-bold">{value}</span>
                     </div>
                   ))}
                </div>
             </div>
           )}

           {/* Purchase actions */}
           <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Total na Vitrine</span>
                    <span className="text-3xl font-display font-black text-stone-900 tracking-tighter">{formatCurrency(currentPriceBRL)}</span>
                 </div>
                 
                 <div className="flex items-center bg-stone-50 p-2 rounded-2xl border border-stone-100">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 flex items-center justify-center text-stone-400 hover:text-stone-900 transition"
                    >
                       -
                    </button>
                    <span className="w-12 text-center font-black text-stone-900 text-sm">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 flex items-center justify-center text-stone-400 hover:text-stone-900 transition"
                    >
                       +
                    </button>
                 </div>
              </div>

              <button
                onClick={handleAddToCart}
                 className="w-full bg-rose-500 hover:bg-rose-600 active:scale-[0.98] transition-all text-white font-black py-5 rounded-[2rem] shadow-xl shadow-rose-200 flex items-center justify-center gap-3"
              >
                 <ShoppingBag className="w-6 h-6" />
                 Adicionar à Sacola
              </button>
              
              <p className="text-[10px] text-center text-stone-400 uppercase font-black tracking-widest">
                 ✈️ Frete internacional e aduana calculados no checkout
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
