import React, { useState, useEffect, useRef } from "react";
import { useAppContext } from "../context";
import {
  ShoppingBag,
  Star,
  Share2,
  Copy,
  CheckCircle2,
  Search,
  Sparkles,
  HelpCircle,
  DollarSign,
  Clock,
  MapPin,
  Check,
  X,
  LogIn,
  Loader2,
  SlidersHorizontal,
  ChevronRight,
  Store as StoreIcon,
  Filter,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { formatCurrency, safeCopyText, safeStorage } from "../lib/utils";
import { Product } from "../types";
import {
  ProductCarousel,
  StoreCarousel,
} from "../components/FeaturedCarousels";

export function Home() {
  const {
    user,
    stores,
    products,
    reviews,
    addToCart,
    orders,
    quoteRequests,
    createQuoteRequest,
    updateQuoteRequest,
    approveQuoteAndCreateOrder,
    loginWithGoogle,
    companySettings,
    liveDollarRate,
  } = useAppContext();
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "price_asc" | "price_desc">(
    "name",
  );
  const [selectedProductForModal, setSelectedProductForModal] =
    useState<Product | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

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

  // Assisted shopping search and quoting states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchingInternet, setSearchingInternet] = useState(false);
  const [internetResults, setInternetResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Custom manual request input states
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualPriceUSD, setManualPriceUSD] = useState("");
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [uploadingManualImage, setUploadingManualImage] = useState(false);
  const manualFileRef = useRef<HTMLInputElement>(null);

  // Submit flow states
  const [promptQuote, setPromptQuote] = useState<any | null>(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [localSuccessMsg, setLocalSuccessMsg] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Exchange rate oscillation state
  const [showUSD, setShowUSD] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowUSD((prev) => !prev);
    }, 5000); // Oscillate every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200; // Increased quality
          const MAX_HEIGHT = 1200;
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
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject("No canvas context");
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.85); // High quality
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleManualFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setModalError("Por favor, selecione apenas arquivos de imagem (JPEG, PNG).");
      return;
    }

    setUploadingManualImage(true);
    try {
      const compressed = await compressImage(file);
      setManualImageUrl(compressed);
    } catch (err) {
      console.error("Error compressing manual image:", err);
      setModalError("Erro ao processar imagem. Tente outra foto.");
    } finally {
      setUploadingManualImage(false);
    }
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      safeStorage.setItem("referred_by", ref);
    }
  }, []);

  const handleCopyRef = async () => {
    if (!user) return;
    const domain =
      companySettings?.appDomain || "https://dicas-by-ale-snowy.vercel.app";
    // Ensure domain doesn't end with slash
    const cleanDomain = domain.endsWith("/") ? domain.slice(0, -1) : domain;
    const link = `${cleanDomain}/?ref=${user.uid}`;
    await safeCopyText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInternetSearch = async () => {
    if (!searchQuery.trim()) return;

    // URL detection regex
    const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9.-]+\.[a-z]{2,}/i;
    if (urlPattern.test(searchQuery)) {
      setSearchError("Por motivos de segurança contra malware e ataques cibernéticos, não é permitido inserir links ou URLs no campo de busca. Por favor, digite apenas o nome do produto.");
      return;
    }

    setSearchingInternet(true);
    setSearchError(null);
    setInternetResults([]);
    setShowManualForm(false);
    setLocalSuccessMsg(null);

    try {
      // Tenta obter a localização do usuário para melhorar o contexto da busca
      let userLocation = null;
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 3000,
            });
          },
        );
        userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } catch (locErr) {
        console.warn("Location not available:", locErr);
      }

      const response = await fetch("/api/search-internet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, userLocation }),
      });

      let data: any = {};
      try {
        data = await response.json();
      } catch (e) {
        // Safe fallback for parsing
      }

      if (!response.ok) {
        if (response.status === 429 || data.errorReason === "QUOTA_LIMIT") {
          setSearchError(
            "A busca automática via IA atingiu o limite de tráfego nos EUA. Sem problemas! Cadastre sua de solicitação manualmente abaixo de forma 100% real que nossa equipe pesquisará o produto diretamente nas lojas americanas.",
          );
        } else if (
          response.status === 503 ||
          data.errorReason === "KEY_MISSING"
        ) {
          setSearchError(
            "O serviço de busca automática está momentaneamente indisponível. Por favor, envie sua solicitação preenchendo o formulário de orçamento manual abaixo!",
          );
        } else {
          setSearchError(
            "Não foi possível buscar os dados do produto de forma automática agora. Use o formulário abaixo para preencher os dados do orçamento manualmente!",
          );
        }
        return;
      }

      setInternetResults(data.results || []);
      if (!data.results || data.results.length === 0) {
        setSearchError(
          "Nenhum detalhe foi localizado na internet. Que tal fazer sua solicitação de orçamento manual logo abaixo?",
        );
      }
    } catch (err: any) {
      console.error(err);
      setSearchError(
        "Não conseguimos buscar automaticamente no momento. Você ainda pode cadastrar seu orçamento manualmente abaixo!",
      );
    } finally {
      setSearchingInternet(false);
    }
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setModalError(
        "Por favor, faça login ou crie uma conta com o Google para solicitar um orçamento.",
      );
      return;
    }
    if (!promptQuote) return;
    setSubmittingQuote(true);
    setModalError(null);
    try {
      await createQuoteRequest(
        promptQuote.name,
        promptQuote.description || "Solicitado via busca automática de produto",
        promptQuote.imageUrl || "",
        promptQuote.priceUSD || 0,
        promptQuote.priceBRL || 0,
        promptQuote.currency || "USD",
        customerPhone,
      );
      setLocalSuccessMsg(
        "Solicitação enviada com sucesso! Nossa equipe de compras irá procurar este produto e fornecerá a cotação em breve.",
      );
      setPromptQuote(null);
      setCustomerPhone("");
      setInternetResults([]);
      setSearchQuery("");
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
      setModalError(
        "Por favor, faça login ou crie uma conta com o Google para solicitar um orçamento.",
      );
      return;
    }
    if (!manualName.trim()) return;

    // URL detection regex
    const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9.-]+\.[a-z]{2,}/i;
    if (urlPattern.test(manualName) || urlPattern.test(manualDescription)) {
      setModalError("Por motivos de segurança cibernética contra malware, não é permitido colar links ou URLs no formulário de orçamento. Por favor, utilize apenas texto para descrever o produto e anexe uma foto do seu dispositivo.");
      return;
    }

    setSubmittingQuote(true);
    setModalError(null);
    try {
      await createQuoteRequest(
        manualName.trim(),
        manualDescription.trim(),
        manualImageUrl.trim(),
        parseFloat(manualPriceUSD) || 0,
        0,
        "USD",
        customerPhone,
      );
      setLocalSuccessMsg(
        "Solicitação enviada com sucesso! Procuraremos o produto nas lojas e retornaremos com a melhor cotação.",
      );
      setManualName("");
      setManualDescription("");
      setManualPriceUSD("");
      setManualImageUrl("");
      setCustomerPhone("");
      setShowManualForm(false);
      setSearchQuery("");
    } catch (err) {
      console.error(err);
      setModalError(
        "Erro ao enviar solicitação de orçamento. Por favor, revise os dados e tente novamente.",
      );
    } finally {
      setSubmittingQuote(false);
    }
  };

  useEffect(() => {
    const handleOpenModal = () => setShowManualForm(true);
    window.addEventListener("open-quote-modal", handleOpenModal);
    return () =>
      window.removeEventListener("open-quote-modal", handleOpenModal);
  }, []);

  // Filter in-store products dynamically
  const brands = Array.from(
    new Set(products.map((p) => p.brand).filter(Boolean)),
  );
  const allSizes = Array.from(
    new Set(
      products
        .flatMap((p) =>
          p.variants?.map((v) =>
            v?.name && typeof v.name === "string" && v.name.includes("Size")
              ? v.name.split(":").pop()?.trim()
              : null,
          ),
        )
        .filter(Boolean),
    ),
  );

  // Clear internet results when search query is emptied
  useEffect(() => {
    if (!searchQuery.trim()) {
      setInternetResults([]);
      setSearchError(null);
    }
  }, [searchQuery]);

  const filteredProducts = products.filter((p) => {
    const matchesStore = selectedStore ? p.storeId === selectedStore : true;
    const matchesCategory = selectedCategory
      ? p.category === selectedCategory
      : true;
    const matchesBrand = selectedBrand ? p.brand === selectedBrand : true;
    const matchesSize = selectedSize
      ? p.variants?.some(
          (v) =>
            v?.name &&
            typeof v.name === "string" &&
            v.name.includes(selectedSize),
        )
      : true;
    const matchesSearch = searchQuery.trim()
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return (
      matchesStore &&
      matchesCategory &&
      matchesBrand &&
      matchesSize &&
      matchesSearch
    );
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price_asc") return a.priceBRL - b.priceBRL;
    if (sortBy === "price_desc") return b.priceBRL - a.priceBRL;
    return a.name.localeCompare(b.name);
  });

  const sortedStores = [...stores].sort((a, b) => a.name.localeCompare(b.name));

  const successfulReferrals = user
    ? orders.filter(
        (o) =>
          o.referredBy === user.uid &&
          o.userId !== user.uid &&
          o.status !== "CANCELLED",
      )
    : [];

  const featuredProducts = products.filter((p) => p.isFeatured);
  const featuredStores = stores.filter((s) => s.isFeatured);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
      {/* Top Search & Dollar Rate row */}
      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        <div className="md:col-span-2 w-full">
          <div className="flex items-center gap-2">
            <div className="flex-grow min-w-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    searchQuery.trim() &&
                    !searchingInternet
                  ) {
                    handleInternetSearch();
                  }
                }}
                placeholder="O que você quer comprar hoje? (Ex: Nike, iPhone...)"
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 text-sm font-medium text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all shadow-sm focus:shadow-md"
              />
            </div>
            <button
              onClick={handleInternetSearch}
              disabled={searchingInternet || !searchQuery.trim()}
              className="bg-stone-900 hover:bg-black disabled:bg-stone-100 disabled:text-stone-400 text-white font-black px-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-sm shrink-0 shadow-lg shadow-stone-100"
            >
              {searchingInternet ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4 text-rose-500" />
              )}
              <span className="hidden sm:inline">Buscar</span>
            </button>
          </div>
        </div>

        <div className="md:col-span-1 w-full">
          {/* Daily Exchange Rate Display (Oscillating) */}
          <div className="bg-white border border-stone-200 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm hover:shadow-md transition-all h-[54px] md:h-[58px]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-stone-900 text-rose-500 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm transition-transform duration-500 hover:scale-110">
                {showUSD ? "$" : "R$"}
              </div>
              <div className="leading-tight">
                <h4 className="text-[11px] font-black text-stone-900 flex items-center gap-1">
                  {showUSD ? "Dólar Comercial" : "Real Brasileiro"}
                  <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase px-1 py-0.5 rounded">
                    Agora
                  </span>
                </h4>
                <p className="text-[9px] text-stone-400 font-semibold uppercase tracking-wider">
                  Cotação em Tempo Real
                </p>
              </div>
            </div>
            <div className="bg-stone-50 border border-stone-100 text-stone-900 font-mono font-black text-xs px-2.5 py-1 rounded-xl flex flex-col items-end shrink-0">
              <span className="text-[8px] text-stone-400 font-sans tracking-wider font-semibold uppercase leading-none mb-0.5">
                {showUSD ? "1 USD vale:" : "1 BRL vale:"}
              </span>
              <span className="text-rose-600 font-black text-xs sm:text-sm animate-pulse">
                {showUSD ? (
                  <>R$ {(liveDollarRate || companySettings?.dollarRate || 5.50).toFixed(2)}</>
                ) : (
                  <>$ {(1 / (liveDollarRate || companySettings?.dollarRate || 5.50)).toFixed(2)}</>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Product Carousel (Destaques) */}
      <ProductCarousel
        items={featuredProducts}
        onItemClick={(p) => setSelectedProductForModal(p)}
      />

      {/* Storefront / Product Section Headings */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-2 pt-4">
        <div className="flex items-center gap-2">
          <StoreIcon className="w-5 h-5 text-stone-400" />
          <h2 className="text-xl font-display font-black text-stone-900">
            Vitrine <span className="text-rose-500">Shop</span>
          </h2>
        </div>

        {/* Discreet Filter Trigger */}
        <button
          onClick={() => setIsFilterSheetOpen(true)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
            selectedCategory || selectedStore || selectedBrand || selectedSize
              ? "bg-rose-50 border-rose-200 text-rose-600"
              : "bg-white border-stone-200 text-stone-500 hover:border-stone-300"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filtros</span>
          {(selectedCategory ||
            selectedStore ||
            selectedBrand ||
            selectedSize) && (
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Quick Category Tab Ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none border-b border-stone-100">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-black tracking-wide transition-all ${
            selectedCategory === null
              ? "bg-rose-500 text-white shadow-lg shadow-rose-100"
              : "bg-stone-50 hover:bg-stone-100 text-stone-600"
          }`}
        >
          Minha Vitrine (Tudo)
        </button>
        {categories.map((cat) => {
          const count = products.filter((p) => p.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() =>
                setSelectedCategory(cat === selectedCategory ? null : cat)
              }
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-black tracking-wide transition-all flex items-center gap-2 ${
                selectedCategory === cat
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-100"
                  : "bg-stone-50 hover:bg-stone-100 text-stone-600"
              }`}
            >
              <span>{cat}</span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  selectedCategory === cat
                    ? "bg-white/20 text-white"
                    : "bg-stone-200 text-stone-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Products Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">
            {selectedCategory
              ? `${selectedCategory} (${sortedProducts.length})`
              : `Seções da Loja (${sortedProducts.length} itens)`}
          </span>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
              Ordenar:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-0 text-xs font-bold text-stone-700 outline-none focus:ring-0 cursor-pointer"
            >
              <option value="name">A-Z</option>
              <option value="price_asc">Menor Preço</option>
              <option value="price_desc">Maior Preço</option>
            </select>
          </div>
        </div>

        {sortedProducts.length > 0 && selectedCategory !== null && (
          // Single Category Active - standard clean grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {sortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={() => setSelectedProductForModal(product)}
              />
            ))}
          </div>
        )}

        {sortedProducts.length > 0 && selectedCategory === null && (
          // Separated by Category shelves - elegant, space-saving arrangement
          <div className="space-y-12">
            {(() => {
              // Group active sorted products by category
              const grouped = sortedProducts.reduce(
                (acc, p) => {
                  const grpKey = p.category || "Outros";
                  if (!acc[grpKey]) acc[grpKey] = [];
                  acc[grpKey].push(p);
                  return acc;
                },
                {} as Record<string, Product[]>,
              );

              // Sort category sections
              const activeGroupKeys = Object.keys(grouped).sort((a, b) => {
                const idxA = categories.indexOf(a);
                const idxB = categories.indexOf(b);
                if (idxA === -1 && idxB === -1) return a.localeCompare(b);
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
              });

              return activeGroupKeys.map((catKey) => {
                const items = grouped[catKey];
                return (
                  <div
                    key={catKey}
                    className="space-y-3 border-b border-stone-50 pb-6 last:border-0 last:pb-0"
                  >
                    <div className="flex items-baseline justify-between px-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-display font-black text-stone-900 tracking-tight text-base">
                          {catKey}
                        </h3>
                        <span className="text-stone-400 font-bold text-[10px] bg-stone-100 px-2 py-0.5 rounded-full">
                          {items.length}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedCategory(catKey)}
                        className="text-stone-400 hover:text-rose-500 text-xs font-bold transition flex items-center gap-1 group/btn"
                      >
                        Ver todos
                        <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                      </button>
                    </div>

                    {/* Horizontal scroll container - minimal and highly compact */}
                    <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
                      <div className="flex gap-4 overflow-x-auto pb-3 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">
                        {items.filter(Boolean).map((product) => (
                          <div
                            key={product.id}
                            className="w-[150px] sm:w-[190px] shrink-0 snap-start"
                          >
                            <CompactProductCard
                              product={product}
                              onSelect={() =>
                                setSelectedProductForModal(product)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {sortedProducts.length === 0 && (
          <div className="py-24 text-center text-stone-500 bg-stone-50 rounded-[3rem] border border-stone-100 p-8 space-y-4">
            <Sparkles className="w-12 h-12 text-stone-200 mx-auto" />
            <p className="font-bold text-lg text-stone-800 tracking-tight">
              Nenhum produto encontrado
            </p>
            <p className="text-sm max-w-xs mx-auto">
              Tente ajustar seus filtros ou faça uma busca global por qualquer
              item nos EUA.
            </p>
            {searchQuery.trim() !== "" && (
              <button
                onClick={handleInternetSearch}
                disabled={searchingInternet}
                className="bg-rose-500 hover:bg-rose-600 active:scale-95 text-white px-8 py-4 rounded-2xl text-sm font-black transition mx-auto flex items-center gap-2 shadow-xl shadow-rose-100"
              >
                {searchingInternet ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {searchingInternet
                  ? "Buscando nos EUA..."
                  : `Buscar "${searchQuery}" nos Estados Unidos`}
              </button>
            )}
          </div>
        )}
      </div>
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsFilterSheetOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col p-6 animate-slide-in-right">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-display font-black text-stone-900">
                Refinar Busca
              </h3>
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="p-2 hover:bg-stone-100 rounded-full transition"
              >
                <X className="w-6 h-6 text-stone-400" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-8 pr-2 custom-scrollbar">
              {/* Category Filter */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">
                  Categorias
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      selectedCategory === null
                        ? "bg-stone-900 border-stone-900 text-white shadow-md"
                        : "bg-white border-stone-200 text-stone-500 hover:border-stone-400"
                    }`}
                  >
                    Tudo
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() =>
                        setSelectedCategory(
                          cat === selectedCategory ? null : cat,
                        )
                      }
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        selectedCategory === cat
                          ? "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-100"
                          : "bg-white border-stone-200 text-stone-500 hover:border-stone-400"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Store Filter */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">
                  Lojas
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedStore(null)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      selectedStore === null
                        ? "bg-stone-900 border-stone-900 text-white shadow-md"
                        : "bg-white border-stone-200 text-stone-500 hover:border-stone-400"
                    }`}
                  >
                    Todas
                  </button>
                  {sortedStores.map((store) => (
                    <button
                      key={store.id}
                      onClick={() =>
                        setSelectedStore(
                          store.id === selectedStore ? null : store.id,
                        )
                      }
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        selectedStore === store.id
                          ? "bg-stone-900 border-stone-900 text-white shadow-md"
                          : "bg-white border-stone-200 text-stone-500 hover:border-stone-400"
                      }`}
                    >
                      {store.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Filter */}
              {brands.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">
                    Marcas
                  </label>
                  <select
                    value={selectedBrand || ""}
                    onChange={(e) => setSelectedBrand(e.target.value || null)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all appearance-none"
                  >
                    <option value="">Todas</option>
                    {brands.map((brand) => (
                      <option key={brand} value={brand!}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Size Filter */}
              {allSizes.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">
                    Tamanho
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedSize(null)}
                      className={`px-3 py-2 min-w-[3rem] rounded-xl text-xs font-bold transition-all border ${
                        selectedSize === null
                          ? "bg-stone-900 border-stone-900 text-white shadow-md"
                          : "bg-white border-stone-200 text-stone-500 hover:border-stone-400"
                      }`}
                    >
                      Todos
                    </button>
                    {allSizes.map((size) => (
                      <button
                        key={size}
                        onClick={() =>
                          setSelectedSize(size === selectedSize ? null : size)
                        }
                        className={`px-3 py-2 min-w-[3rem] rounded-xl text-xs font-bold transition-all border ${
                          selectedSize === size
                            ? "bg-stone-900 border-stone-900 text-white shadow-md"
                            : "bg-white border-stone-200 text-stone-500 hover:border-stone-400"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-stone-100 mt-6 space-y-3">
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="w-full bg-stone-900 text-white font-black py-4 rounded-2xl shadow-lg transition active:scale-95"
              >
                Ver {sortedProducts.length} Resultados
              </button>
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedStore(null);
                  setSelectedBrand(null);
                  setSelectedSize(null);
                  setSortBy("name");
                }}
                className="w-full text-stone-400 font-bold py-2 text-xs hover:text-stone-600 transition"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Internet Listing & Manual quote button fallback */}
      {searchQuery.trim() !== "" && (
        <div className="pt-2 text-xs text-stone-400 flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={() => {
              setShowManualForm((prev) => !prev);
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
            <button
              onClick={() => setShowManualForm(false)}
              className="absolute top-6 right-6 z-10 p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition"
            >
              <X className="w-5 h-5 text-stone-600" />
            </button>

            <form
              onSubmit={handleManualSubmit}
              className="p-8 md:p-12 space-y-8"
            >
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full text-[10px] font-black text-rose-600 uppercase tracking-widest">
                  <Sparkles className="w-3 h-3" />
                  Compra Assistida Personalizada
                </div>
                <h4 className="font-display font-black text-stone-900 text-3xl">
                  Solicitar Orçamento
                </h4>
                <p className="text-sm text-stone-500 leading-relaxed">
                  Nossa equipe de compras irá cotar o produto desejado
                  diretamente nas lojas americanas para você.
                </p>
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
                        setModalError(
                          "Ocorreu um erro ao fazer logon com o Google. Tente novamente.",
                        );
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
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">
                      Nome do Produto *
                    </label>
                    <input
                      type="text"
                      required
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="Ex: Sephora Glow Recipe Watermelon"
                      className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">
                      Foto do Produto (Anexar do Dispositivo)
                    </label>
                    <div 
                      onClick={() => manualFileRef.current?.click()}
                      className={`w-full aspect-[4/3] md:aspect-video bg-stone-50 border-2 border-dashed ${manualImageUrl ? 'border-rose-200' : 'border-stone-200'} rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-stone-100 transition-all group overflow-hidden relative shadow-inner`}
                    >
                      <input
                        type="file"
                        ref={manualFileRef}
                        onChange={handleManualFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      
                      {manualImageUrl ? (
                        <>
                          <img src={manualImageUrl} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-bold bg-rose-600 px-3 py-1.5 rounded-lg shadow-lg">Alterar Foto</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-stone-400 group-hover:text-rose-500 transition-colors">
                            {uploadingManualImage ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-bold text-stone-900">Clique para anexar foto</p>
                            <p className="text-[10px] text-stone-400 font-medium">JPEG ou PNG de alta resolução</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">
                      Preço Estimado nos EUA ($ USD)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="number"
                        step="0.01"
                        value={manualPriceUSD}
                        onChange={(e) => setManualPriceUSD(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-stone-50 border border-stone-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">
                      Seu WhatsApp *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">
                    Especificações (Cor, Tamanho, Voltagem...)
                  </label>
                  <textarea
                    rows={3}
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
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
                        setModalError(
                          "Ocorreu um erro ao fazer logon com o Google. Tente novamente.",
                        );
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
              Produtos Sugeridos Localizados
            </h3>
            <button
              onClick={() => setInternetResults([])}
              className="text-stone-400 hover:text-stone-600 text-xs font-medium focus:outline-none"
            >
              Limpar Resultados
            </button>
          </div>

          <p className="text-xs text-stone-500 leading-normal">
            Estes produtos foram localizados na internet global com Inteligência
            Artificial. Selecione o que deseja para solicitar cotação com todas
            as taxas e logística garantida!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {internetResults.map((result, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition"
              >
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
                  {(result.storeName?.toLowerCase().includes("florida") ||
                    result.description?.toLowerCase().includes("florida")) && (
                    <div className="absolute top-2.5 right-2.5 bg-green-500 text-white font-bold text-[9px] px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      Melhor Disponibilidade
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-grow space-y-2">
                  <h4 className="font-bold text-stone-900 text-sm leading-snug line-clamp-2">
                    {result.name}
                  </h4>
                  <p className="text-xs text-stone-400 line-clamp-2 leading-tight">
                    {result.description}
                  </p>

                  <div className="pt-2 mt-auto flex items-end justify-between gap-1.5">
                    <div>
                      <span className="text-[10px] text-stone-400 block font-medium">
                        Preço Estimado
                      </span>
                      <span className="font-bold text-stone-800 text-base">
                        {result.currency === "BRL"
                          ? formatCurrency(result.priceBRL)
                          : `$${result.priceUSD.toFixed(2)}`}
                      </span>
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
            <h4 className="font-bold text-rose-950 text-base">
              Quase lá! Forneça seu contato para o orçamento
            </h4>
            <p className="text-xs text-rose-700">
              A nossa equipe de compras pesquisará o produto{" "}
              <strong>"{promptQuote.name}"</strong> e retornará com os valores
              finais em Reais para aprovação.
            </p>
          </div>

          {!user ? (
            <div className="bg-amber-50 border border-amber-100 p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-amber-900">
              <span className="flex items-center gap-2">
                <LogIn className="w-4 h-4 text-rose-500 shrink-0 animate-bounce" />
                Conecte-se para que possamos gravar sua lista de orçamentos
                automaticamente!
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
            <form
              onSubmit={handleSubmitQuote}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-grow">
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
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
                  {submittingQuote
                    ? "Solicitando..."
                    : "Confirmar Solicitação de Orçamento"}
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
            Acompanhe a cotação de menor preço de produtos personalizados que
            você enviou à nossa equipe.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quoteRequests.map((quote) => (
              <div
                key={quote.id}
                className="border border-stone-100 p-4 rounded-xl flex gap-4 overflow-hidden relative bg-stone-50/50 hover:bg-stone-50 transition"
              >
                {quote.productImageUrl && (
                  <div className="w-20 h-20 bg-white rounded-lg overflow-hidden shrink-0 border border-stone-200/50 flex items-center justify-center">
                    <img
                      src={quote.productImageUrl}
                      alt={quote.productName}
                      className="object-contain p-1 w-full h-full"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div className="flex-grow space-y-2">
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-mono text-[9px] bg-stone-200 text-stone-700 px-1 py-0.5 rounded">
                      #{quote.id.substring(0, 6).toUpperCase()}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                        quote.status === "PENDING"
                          ? "bg-orange-50 text-orange-600 border border-orange-100"
                          : quote.status === "QUOTED"
                            ? "bg-blue-50 text-blue-600 border border-blue-100"
                            : quote.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : quote.status === "REJECTED"
                                ? "bg-red-50 text-red-600 border border-red-100"
                                : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {quote.status === "PENDING"
                        ? "Buscando nos EUA"
                        : quote.status === "QUOTED"
                          ? "Orçado - Decidir"
                          : quote.status === "APPROVED"
                            ? "Aprovado"
                            : quote.status === "REJECTED"
                              ? "Recusado"
                              : "Pedido Gerado"}
                    </span>
                  </div>

                  <h3 className="font-bold text-stone-950 text-sm line-clamp-1">
                    {quote.productName}
                  </h3>
                  {quote.productDescription && (
                    <p className="text-xs text-stone-400 line-clamp-1">
                      {quote.productDescription}
                    </p>
                  )}

                  {/* Pricing info and actions */}
                  {quote.status === "PENDING" && (
                    <p className="text-xs text-stone-500 italic flex items-center gap-1.5 pt-1">
                      <Clock className="w-3.5 h-3.5 text-orange-400" />
                      Nossa equipe de compradores já está cotando este produto
                      nas lojas americanas...
                    </p>
                  )}

                  {quote.status === "QUOTED" && (
                    <div className="space-y-3 bg-white p-3 rounded-lg border border-blue-100 mt-2">
                      <div className="text-xs space-y-1">
                        <div className="text-stone-500">
                          Loja nos EUA:{" "}
                          <span className="font-bold text-stone-800">
                            {quote.storeLocationUS}
                          </span>
                        </div>
                        <div className="text-stone-500 font-mono">
                          Estimativa: ${quote.quotedPriceUSD?.toFixed(2)} USD
                        </div>
                        <div className="text-sm font-bold text-stone-900 mt-1">
                          Preço Final:{" "}
                          <span className="text-emerald-600 underline font-extrabold text-base">
                            {formatCurrency(quote.quotedPriceBRL || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (
                              confirm(
                                "Deseja aprovar este orçamento? Será criado um pedido para pagamento!",
                              )
                            ) {
                              try {
                                await approveQuoteAndCreateOrder(quote);
                                alert(
                                  "Orçamento aprovado com sucesso! Pedido gerado. Você já pode efetuar o pagamento.",
                                );
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
                            if (
                              confirm(
                                "Tem certeza que deseja recusar este orçamento?",
                              )
                            ) {
                              try {
                                await updateQuoteRequest(quote.id, {
                                  status: "REJECTED",
                                });
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

                  {quote.status === "APPROVED" && (
                    <div className="text-xs space-y-1">
                      <p className="text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Orçamento aprovado!
                      </p>
                      {quote.orderId && (
                        <a
                          href={`/recibo/${quote.orderId}`}
                          className="inline-block bg-rose-50 text-rose-600 hover:underline px-2.5 py-1 rounded text-[11px] font-bold"
                        >
                          Ver Recibo do Pedido →
                        </a>
                      )}
                    </div>
                  )}

                  {quote.status === "REJECTED" && (
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

      {/* Products Selection Header Removal */}

      {/* Product Detail Modal */}
      {selectedProductForModal && (
        <ProductModal
          product={selectedProductForModal}
          onClose={() => setSelectedProductForModal(null)}
        />
      )}

      {/* Testimonials Section */}
      {reviews.length > 0 && (
        <div className="pt-12 border-t border-stone-100">
          <div className="flex flex-col items-center text-center space-y-2 mb-10">
            <div className="flex gap-1 text-rose-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <h2 className="text-xl font-display font-black text-stone-900 tracking-tight">
              O que dizem nossos clientes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.slice(0, 3).map((r) => (
              <div
                key={r.id}
                className="bg-stone-50/50 p-6 rounded-2xl border border-stone-100/50 flex flex-col items-center text-center"
              >
                <p className="text-xs font-medium text-stone-600 italic mb-4 line-clamp-4 leading-relaxed">
                  "{r.comment}"
                </p>
                <p className="font-bold text-stone-900 text-xs mt-auto uppercase tracking-widest">
                  {r.customerName}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CompactProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: () => void;
}) {
  const { stores, addToCart } = useAppContext();
  if (!product) return null;
  const store = stores ? stores.find((s) => s.id === product.storeId) : null;
  const hasVariants = product.variants && product.variants.length > 0;
  const isAvailable =
    product.isAvailable !== false &&
    (product.boxWidth || 0) > 0 &&
    (product.boxLength || 0) > 0 &&
    (product.boxHeight || 0) > 0 &&
    (product.boxWeight || 0) > 0;
  const isPartnerStore =
    product.stockType === "PARTNER_STORE" ||
    (product.stockType === "IN_STOCK" && (product.inventory || 0) <= 0);

  const priceBRL = product.priceBRL || 0;
  const priceUSD = product.priceUSD || 0;

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden flex flex-col group transition-all duration-300 cursor-pointer p-2.5 h-full relative ${isAvailable ? "hover:shadow-md" : "opacity-80"}`}
    >
      <div className="aspect-square bg-stone-50 rounded-xl relative overflow-hidden flex items-center justify-center mb-2.5 shrink-0 h-32 sm:h-40 w-full">
        <img
          src={product.imageUrl || undefined}
          alt={product.name || "Produto"}
          className={`max-h-full max-w-full object-contain p-1.5 transition-transform duration-500 ${isAvailable ? "group-hover:scale-105" : "grayscale"}`}
          referrerPolicy="no-referrer"
        />

        {/* Subtle badges */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 max-w-[80%]">
          {store?.name && (
            <div className="bg-white/90 backdrop-blur-md text-stone-900 font-extrabold text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm border border-stone-100/30 truncate">
              {store.name}
            </div>
          )}
        </div>
        {!isAvailable && (
          <div className="absolute inset-0 bg-stone-900/30 flex items-center justify-center backdrop-blur-[1px] rounded-xl">
            <div className="bg-stone-900/90 text-white font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full shadow-lg rotate-[-5deg]">
              Indisponível
            </div>
          </div>
        )}
        {isPartnerStore && isAvailable && (
          <div className="absolute top-1.5 right-1.5 bg-amber-500 text-white font-black text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm">
            Encomenda
          </div>
        )}
      </div>

      <div className="flex flex-col flex-grow px-1">
        <div className="mb-1.5 min-h-[2.25rem]">
          {product.brand && (
            <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest block truncate mb-0.5">
              {product.brand}
            </span>
          )}
          <h3 className="font-sans font-bold text-stone-800 text-xs leading-snug line-clamp-2">
            {product.name || ""}
          </h3>
        </div>

        {/* Essential price info only */}
        <div className="mt-auto pt-1 flex items-end justify-between">
          <div className="space-y-0.5">
            {isPartnerStore ? (
              <>
                <div className="font-extrabold text-[11px] sm:text-xs text-amber-600 tracking-tight leading-none uppercase">
                  Sob Consulta
                </div>
                <div className="text-[7px] font-bold text-stone-400 bg-stone-100 px-1 py-0.5 rounded inline-block leading-none uppercase">
                  EUA Sob Demanda
                </div>
              </>
            ) : (
              <>
                <div className="font-extrabold text-sm sm:text-base text-stone-900 tracking-tight leading-none">
                  {formatCurrency(priceBRL)}
                </div>
                <div className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded inline-block leading-none">
                  US$ {priceUSD.toFixed(2)}
                </div>
              </>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isAvailable) return;
              if (hasVariants) {
                onSelect();
              } else {
                addToCart(product, 1);
              }
            }}
            disabled={!isAvailable}
            className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all active:scale-95 shrink-0 shadow-sm ${isAvailable ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-stone-200 text-stone-400 cursor-not-allowed"}`}
            aria-label={isAvailable ? "Adicionar ao carrinho" : "Indisponível"}
          >
            {hasVariants ? (
              <Search className="h-3.5 w-3.5" />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  onSelect,
}: {
  key?: React.Key;
  product: Product;
  onSelect: () => void;
}) {
  const { stores, addToCart } = useAppContext();
  if (!product) return null;
  const store = stores ? stores.find((s) => s.id === product.storeId) : null;

  const hasVariants = product.variants && product.variants.length > 0;
  const isAvailable =
    product.isAvailable !== false &&
    (product.boxWidth || 0) > 0 &&
    (product.boxLength || 0) > 0 &&
    (product.boxHeight || 0) > 0 &&
    (product.boxWeight || 0) > 0;
  const isPartnerStore =
    product.stockType === "PARTNER_STORE" ||
    (product.stockType === "IN_STOCK" && (product.inventory || 0) <= 0);

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden flex flex-col group transition-all duration-500 cursor-pointer ${isAvailable ? "hover:shadow-2xl hover:-translate-y-1" : "opacity-80"}`}
    >
      <div className="aspect-square bg-stone-50 relative overflow-hidden">
        <img
          src={product.imageUrl || undefined}
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-700 ${isAvailable ? "group-hover:scale-110" : "grayscale"}`}
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
        {!isAvailable && (
          <div className="absolute inset-0 bg-stone-900/30 flex items-center justify-center backdrop-blur-[2px]">
            <div className="bg-stone-900/90 text-white font-black text-sm uppercase tracking-widest px-6 py-2 rounded-full shadow-xl rotate-[-5deg]">
              Indisponível
            </div>
          </div>
        )}
        {isPartnerStore && isAvailable && (
          <div className="absolute top-4 right-4 bg-amber-500 text-white font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded shadow-lg">
            Sob Encomenda
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <div className="mb-4">
          {product.brand && (
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1 block">
              {product.brand}
            </span>
          )}
          <h3 className="font-display font-bold text-stone-900 text-lg leading-tight line-clamp-2">
            {product.name}
          </h3>
        </div>

        <p className="text-xs text-stone-400 mb-6 line-clamp-2 leading-relaxed">
          {product.description}
        </p>

        <div className="mt-auto flex items-center justify-between">
          <div className="space-y-0.5">
            {isPartnerStore ? (
              <>
                <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                  Valor do Produto
                </div>
                <div className="font-black text-lg text-amber-600 tracking-tight leading-none mb-1">
                  Sob Consulta
                </div>
                <div className="text-[9px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded inline-block uppercase">
                  Cotação do Personal Shopper
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                  Valor estimado
                </div>
                <div className="font-black text-2xl text-stone-900 tracking-tight">
                  {formatCurrency(product.priceBRL)}
                </div>
                <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded inline-block">
                  US$ {product.priceUSD.toFixed(2)}
                </div>
              </>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isAvailable) return;
              if (hasVariants) {
                onSelect();
              } else {
                addToCart(product, 1);
              }
            }}
            disabled={!isAvailable}
            className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${isAvailable ? "bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-100 hover:shadow-xl active:scale-95 group/btn" : "bg-stone-200 text-stone-400 cursor-not-allowed"}`}
            aria-label={isAvailable ? "Adicionar ao carrinho" : "Indisponível"}
          >
            {hasVariants ? (
              <Search
                className={`h-6 w-6 ${isAvailable ? "group-hover/btn:scale-110 transition-transform" : ""}`}
              />
            ) : (
              <ShoppingBag
                className={`h-6 w-6 ${isAvailable ? "group-hover/btn:scale-110 transition-transform" : ""}`}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function parseVariantName(name: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const parts = name.split(/[|/]/);
  parts.forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) return;
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex !== -1) {
      const key = trimmed.substring(0, colonIndex).trim();
      const val = trimmed.substring(colonIndex + 1).trim();
      attrs[key] = val;
    } else {
      const val = trimmed;
      // Guess attribute type
      const lower = val.toLowerCase();
      if (/^\d+\s*(?:gb|tb)$/i.test(val) || lower.includes("ram") || /^(?:8|12|16|24|32|64)\s*gb$/i.test(val)) {
        if (lower.includes("ram") || /^(?:8|12|16)\s*gb$/i.test(val)) {
          attrs["RAM"] = val.replace(/ram:?/i, "").trim();
        } else {
          attrs["Armazenamento"] = val;
        }
      } else if (/^(?:p|m|g|gg|xg|s|l|xl|xxl|g1|g2|g3|\d{2})$/i.test(val)) {
        attrs["Tamanho"] = val.toUpperCase();
      } else {
        attrs["Cor"] = val;
      }
    }
  });
  return attrs;
}

function ProductModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const { addToCart, stores } = useAppContext();
  
  // Track selected options for each attribute category
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const store = stores ? stores.find((s) => s.id === product.storeId) : null;

  // Initialize with the first variant's attributes
  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      setSelectedOptions(parseVariantName(product.variants[0].name));
    }
  }, [product]);

  // Find the variant that exactly matches the selected options
  const exactSelectedVariant = React.useMemo(() => {
    if (!product.variants || product.variants.length === 0) return null;
    return product.variants.find((v) => {
      const parsed = parseVariantName(v.name);
      return Object.entries(selectedOptions).every(([key, val]) => {
        const v1 = parsed[key];
        const v2 = val;
        return v1 && v2 && v1.toLowerCase().trim() === v2.toLowerCase().trim();
      });
    }) || null;
  }, [product.variants, selectedOptions]);

  // Keep selectedVariant around for compatibility with other sections of code if any, or fall back to exact
  const selectedVariant = exactSelectedVariant || (product.variants && product.variants.length > 0 ? product.variants[0] : null);

  // Dynamic price estimator for completely custom/unconfigured variant combinations
  const estimatedPrices = React.useMemo(() => {
    let customPriceAdjustUSD = 0;
    let customPriceAdjustBRL = 0;
    
    if (product.variants && product.variants.length > 0) {
      Object.entries(selectedOptions).forEach(([category, val]) => {
        // Find all variants that have this option
        const matchingVariants = product.variants!.filter(v => {
          const parsed = parseVariantName(v.name);
          const v1 = parsed[category];
          return v1 && val && v1.toLowerCase().trim() === val.toLowerCase().trim();
        });
        if (matchingVariants.length > 0) {
          // Average adjust
          const avgAdjustUSD = matchingVariants.reduce((sum, v) => sum + (v.priceAdjustUSD || 0), 0) / matchingVariants.length;
          const avgAdjustBRL = matchingVariants.reduce((sum, v) => sum + (v.priceAdjustBRL || 0), 0) / matchingVariants.length;
          customPriceAdjustUSD += avgAdjustUSD;
          customPriceAdjustBRL += avgAdjustBRL;
        }
      });
    }

    const priceBRL = product.priceBRL + customPriceAdjustBRL;
    const priceUSD = product.priceUSD + customPriceAdjustUSD;
    return { priceBRL, priceUSD };
  }, [product, selectedOptions]);

  // Group all possible attribute categories and unique options
  const attributesGroups = React.useMemo(() => {
    if (!product.variants || product.variants.length === 0) return null;
    const groups: Record<string, string[]> = {};
    product.variants.forEach((v) => {
      const parsed = parseVariantName(v.name);
      Object.entries(parsed).forEach(([key, val]) => {
        if (!groups[key]) groups[key] = [];
        if (!groups[key].includes(val)) groups[key].push(val);
      });
    });
    return groups;
  }, [product.variants]);

  const handleSelectOption = (category: string, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [category]: value }));
  };

  const getOptionStatus = React.useCallback((category: string, value: string) => {
    if (!product.variants || product.variants.length === 0) return "IN_STOCK";

    // Create hypothetical selection with this option
    const hypothetical = { ...selectedOptions, [category]: value };

    // See if there is any variant that matches this selection
    const matchingVariants = product.variants.filter((v) => {
      const parsed = parseVariantName(v.name);
      return Object.entries(hypothetical).every(([k, val]) => {
        const v1 = parsed[k];
        return v1 && val && v1.toLowerCase().trim() === val.toLowerCase().trim();
      });
    });

    if (matchingVariants.length === 0) {
      return "NOT_CONFIGURED";
    }

    const hasInStock = matchingVariants.some(v => v.stock > 0);
    return hasInStock ? "IN_STOCK" : "OUT_OF_STOCK";
  }, [product.variants, selectedOptions]);

  const closestInStockVariant = React.useMemo(() => {
    if (!product.variants || product.variants.length === 0) return null;
    
    // Suggest a closest variant only if current combination is out of stock or unconfigured
    const needsSuggestion = !exactSelectedVariant || exactSelectedVariant.stock <= 0;
    if (!needsSuggestion) return null;

    let bestVariant: any = null;
    let highestScore = -1;

    product.variants.forEach((v) => {
      if (v.stock <= 0) return; // Must be in stock
      
      const parsed = parseVariantName(v.name);
      let score = 0;
      Object.entries(selectedOptions).forEach(([k, val]) => {
        const v1 = parsed[k];
        if (v1 && val && v1.toLowerCase().trim() === val.toLowerCase().trim()) {
          score += 1;
        }
      });

      if (score > highestScore) {
        highestScore = score;
        bestVariant = v;
      }
    });

    return bestVariant;
  }, [product.variants, selectedOptions, exactSelectedVariant]);

  const currentPriceBRL = exactSelectedVariant
    ? (product.priceBRL + (exactSelectedVariant.priceAdjustBRL || 0))
    : estimatedPrices.priceBRL;

  const currentPriceUSD = exactSelectedVariant
    ? (product.priceUSD + (exactSelectedVariant.priceAdjustUSD || 0))
    : estimatedPrices.priceUSD;

  const isAvailable =
    product.isAvailable !== false &&
    (product.boxWidth || 0) > 0 &&
    (product.boxLength || 0) > 0 &&
    (product.boxHeight || 0) > 0 &&
    (product.boxWeight || 0) > 0;

  const isPartnerStore =
    product.stockType === "PARTNER_STORE" ||
    (product.stockType === "IN_STOCK" && (product.inventory || 0) <= 0);

  const handleAddToCart = () => {
    const isCustomRequest = !exactSelectedVariant;
    const isOutOfStockRequest = exactSelectedVariant && exactSelectedVariant.stock <= 0;
    
    const productWithVariant: Product = {
      ...product,
      name: exactSelectedVariant
        ? `${product.name} (${exactSelectedVariant.name})`
        : `${product.name} (${Object.entries(selectedOptions).map(([k, v]) => `${k}: ${v}`).join(" | ")})`,
      priceBRL: currentPriceBRL,
      priceUSD: currentPriceUSD,
      sku: exactSelectedVariant?.sku || `${product.sku || "CUSTOM"}-${Object.values(selectedOptions).map(v => v.replace(/\s+/g, "").toUpperCase()).join("-")}`,
      stockType: (isCustomRequest || isOutOfStockRequest || product.stockType === "PARTNER_STORE") ? "PARTNER_STORE" : "IN_STOCK",
      inventory: exactSelectedVariant ? exactSelectedVariant.stock : 0,
    };

    addToCart(productWithVariant, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition"
        >
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
            {isPartnerStore ? (
              <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                Compra na Loja
              </div>
            ) : (
              <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                Pronta Entrega
              </div>
            )}
          </div>
        </div>

        {/* Product Info */}
        <div className="md:w-1/2 p-8 md:p-12 overflow-y-auto space-y-8">
          <div className="space-y-2">
            {product.brand && (
              <span className="text-xs font-black text-rose-500 uppercase tracking-[0.2em]">
                {product.brand}
              </span>
            )}
            <h2 className="text-3xl font-display font-black text-stone-900 leading-tight">
              {product.name}
            </h2>
            {isPartnerStore ? (
              <div className="flex flex-col gap-1 text-xs font-bold text-amber-600">
                <span className="bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 inline-block self-start font-black text-xs">
                  SOB ENCOMENDA - VALOR SOB CONSULTA
                </span>
                <span className="text-stone-400 font-normal leading-relaxed mt-1">
                  Este produto não possui preço de vitrine fixo por ser comprado
                  sob demanda física ou online nos EUA. O valor exato será
                  adicionado após a visita do Personal Shopper à loja.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-xs font-bold text-emerald-600">
                <span className="bg-emerald-50 px-2 py-1 rounded-lg">
                  US$ {currentPriceUSD.toFixed(2)}
                </span>
                <span className="text-stone-300">|</span>
                <span className="text-stone-400">
                  Conversão estimada incl. tributos
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-stone-500 leading-relaxed">
            {product.description}
          </p>

          {/* Variants Selector */}
          {attributesGroups && Object.keys(attributesGroups).length > 0 && (
            <div className="space-y-6">
              <div className="border-t border-stone-100 pt-4" />
              {Object.entries(attributesGroups).map(([category, options]) => (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                      {category}
                    </span>
                    <span className="text-xs font-bold text-stone-700">
                      {selectedOptions[category] || "Não selecionado"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {options.map((val) => {
                      const isSelected = selectedOptions[category] === val;
                      const optionStatus = getOptionStatus(category, val);

                      const getColorDotClass = (colorName: string) => {
                        const name = colorName.toLowerCase();
                        if (name.includes("azul") || name.includes("blue")) return "bg-blue-500";
                        if (name.includes("vermelho") || name.includes("red")) return "bg-red-500";
                        if (name.includes("preto") || name.includes("black")) return "bg-stone-950";
                        if (name.includes("branco") || name.includes("white")) return "bg-white border border-stone-200";
                        if (name.includes("cinza") || name.includes("gray") || name.includes("grey")) return "bg-stone-400";
                        if (name.includes("amarelo") || name.includes("yellow")) return "bg-yellow-400";
                        if (name.includes("verde") || name.includes("green")) return "bg-emerald-500";
                        if (name.includes("rosa") || name.includes("pink")) return "bg-pink-400";
                        if (name.includes("dourado") || name.includes("gold")) return "bg-amber-400";
                        if (name.includes("prata") || name.includes("silver")) return "bg-stone-300";
                        if (name.includes("laranja") || name.includes("orange")) return "bg-orange-500";
                        return null;
                      };
                      const colorClass = category.toLowerCase() === "cor" || category.toLowerCase() === "cores"
                        ? getColorDotClass(val)
                        : null;

                      // Style dynamically based on selection and stock status
                      let buttonStyle = "border-stone-200 bg-white hover:border-stone-300 text-stone-600";
                      if (isSelected) {
                        buttonStyle = "border-rose-500 bg-rose-50/50 text-rose-700 ring-1 ring-rose-500 shadow-sm";
                      } else if (optionStatus === "IN_STOCK") {
                        buttonStyle = "border-stone-200 bg-emerald-50/10 hover:border-emerald-300 hover:bg-emerald-50/20 text-stone-700";
                      } else if (optionStatus === "OUT_OF_STOCK") {
                        buttonStyle = "border-amber-200 border-dashed bg-amber-50/10 hover:border-amber-300 hover:bg-amber-50/20 text-stone-600";
                      } else {
                        buttonStyle = "border-stone-100 bg-stone-50/50 hover:border-stone-250 text-stone-400";
                      }

                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleSelectOption(category, val)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${buttonStyle}`}
                        >
                          {colorClass && (
                            <span className={`w-3.5 h-3.5 rounded-full ${colorClass} shrink-0`} />
                          )}
                          <span>{val}</span>

                          {/* Interactive Availability Badges */}
                          {optionStatus === "IN_STOCK" && !isSelected && (
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-100/60 px-1 py-0.5 rounded ml-0.5 shrink-0 uppercase tracking-widest scale-90">
                              Pronta
                            </span>
                          )}
                          {optionStatus === "OUT_OF_STOCK" && !isSelected && (
                            <span className="text-[9px] font-black text-amber-600 bg-amber-100/60 px-1 py-0.5 rounded ml-0.5 shrink-0 uppercase tracking-widest scale-90">
                              Pedido
                            </span>
                          )}
                          {optionStatus === "NOT_CONFIGURED" && !isSelected && (
                            <span className="text-[9px] font-black text-stone-400 bg-stone-100 px-1 py-0.5 rounded ml-0.5 shrink-0 uppercase tracking-widest scale-90">
                              Especial
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Dynamic Closest Matching Suggestion (Smart Stock Finder) */}
              {closestInStockVariant && (
                <div className="bg-emerald-50/60 rounded-2xl border border-emerald-100 p-4 space-y-3 animate-fade-in">
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5">✨</span>
                    <div className="flex-1">
                      <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                        Disponível em Pronta Entrega
                      </h4>
                      <p className="text-[11px] text-emerald-600 font-medium">
                        Essa exata combinação não está em estoque, mas temos essa configuração semelhante pronta para envio imediato:
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white/90 rounded-xl p-3 border border-emerald-100/50 flex justify-between items-center">
                    <div>
                      <div className="text-xs font-black text-stone-800">
                        {closestInStockVariant.name}
                      </div>
                      <div className="text-[9px] text-stone-400 font-mono mt-0.5">
                        {closestInStockVariant.sku || "Sem SKU"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-emerald-700">
                        {formatCurrency(product.priceBRL + (closestInStockVariant.priceAdjustBRL || 0))}
                      </div>
                      <div className="text-[9px] text-stone-400 font-bold">
                        {closestInStockVariant.stock} un. restantes
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOptions(parseVariantName(closestInStockVariant.name));
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2.5 rounded-xl shadow-md shadow-emerald-100 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    🚀 Usar esta variação (Envio Imediato)
                  </button>
                </div>
              )}

              {/* Special Info Card: Out of stock Predefined Variant */}
              {exactSelectedVariant && exactSelectedVariant.stock <= 0 && (
                <div className="bg-amber-50/40 rounded-2xl border border-amber-100 p-4 space-y-1.5 animate-fade-in">
                  <div className="flex items-start gap-2">
                    <span className="text-xs mt-0.5">⏰</span>
                    <div className="flex-1">
                      <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">
                        Configuração sob Encomenda Física nos EUA
                      </h4>
                      <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                        Essa configuração exata está temporariamente esgotada em nossa pronta entrega, mas está disponível para compra física e envio sob encomenda por nosso Personal Shopper nos EUA!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Special Info Card: Completely custom combination */}
              {!exactSelectedVariant && (
                <div className="bg-amber-50/40 rounded-2xl border border-amber-100 p-4 space-y-1.5 animate-fade-in">
                  <div className="flex items-start gap-2">
                    <span className="text-xs mt-0.5">🔍</span>
                    <div className="flex-1">
                      <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">
                        Solicitação de Encomenda Especial
                      </h4>
                      <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                        Você selecionou uma configuração de dispositivo personalizada e exclusiva! Nós iremos buscar e adquirir essa exata especificação sob demanda nas lojas dos EUA para você.
                      </p>
                      <div className="text-[9px] text-stone-400 font-bold mt-1">
                        * O preço apresentado é uma estimativa calculada dinamicamente com base nas opções selecionadas.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Variant Status Banner */}
              <div className="bg-stone-50 rounded-2xl border border-stone-100 p-4 space-y-2 animate-fade-in">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-stone-500">Configuração selecionada:</span>
                  <span className="font-mono bg-stone-200/50 text-stone-700 px-2 py-0.5 rounded text-[10px]">
                    {exactSelectedVariant?.sku || `${product.sku || "CUSTOM"}-${Object.values(selectedOptions).map(v => v.replace(/\s+/g, "").toUpperCase()).join("-")}`}
                  </span>
                </div>
                <div className="text-xs text-stone-600 font-medium">
                  {exactSelectedVariant ? exactSelectedVariant.name : `Cor: ${selectedOptions["Cor"] || selectedOptions["Cores"] || "N/D"} | RAM: ${selectedOptions["RAM"] || "N/D"} | Armazenamento: ${selectedOptions["Armazenamento"] || "N/D"}`}
                </div>
                <div className="flex items-center justify-between pt-1">
                  {exactSelectedVariant && exactSelectedVariant.stock > 0 ? (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-lg font-bold">
                      ✓ Pronta entrega ({exactSelectedVariant.stock} unidades)
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-lg font-bold">
                      ⏰ Compra sob encomenda física na loja dos EUA
                    </span>
                  )}

                  {exactSelectedVariant && exactSelectedVariant.priceAdjustBRL !== 0 ? (
                    <span className={`text-[10px] font-bold ${exactSelectedVariant.priceAdjustBRL > 0 ? "text-rose-500" : "text-emerald-600"}`}>
                      {exactSelectedVariant.priceAdjustBRL > 0 ? "+" : ""}
                      {formatCurrency(exactSelectedVariant.priceAdjustBRL)} nesta variação
                    </span>
                  ) : !exactSelectedVariant && (currentPriceBRL - product.priceBRL !== 0) ? (
                    <span className={`text-[10px] font-bold ${currentPriceBRL - product.priceBRL > 0 ? "text-rose-500" : "text-emerald-600"}`}>
                      {currentPriceBRL - product.priceBRL > 0 ? "+" : ""}
                      {formatCurrency(currentPriceBRL - product.priceBRL)} ajuste estimado
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Specifications */}
          {product.specifications &&
            Object.keys(product.specifications).length > 0 && (
              <div className="space-y-4 pb-4 border-b border-stone-100">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
                  Especificações Técnicas
                </label>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                  {Object.entries(product.specifications).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between text-[11px] border-b border-stone-50 pb-1"
                      >
                        <span className="text-stone-400">{key}</span>
                        <span className="text-stone-900 font-bold">
                          {value}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

          {/* Purchase actions */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
                  {isPartnerStore ? "Preço de Vitrine (Estimado)" : "Total na Vitrine"}
                </span>
                <span className="text-3xl font-display font-black text-stone-900 tracking-tighter">
                  {isPartnerStore
                    ? `Est. ${formatCurrency(currentPriceBRL)}`
                    : formatCurrency(currentPriceBRL)}
                </span>
              </div>

              <div className="flex items-center bg-stone-50 p-2 rounded-2xl border border-stone-100">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center text-stone-400 hover:text-stone-900 transition"
                >
                  -
                </button>
                <span className="w-12 text-center font-black text-stone-900 text-sm">
                  {quantity}
                </span>
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
              disabled={!isAvailable}
              className={`w-full transition-all font-black py-5 rounded-[2rem] shadow-xl flex items-center justify-center gap-3 ${isAvailable ? "bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white shadow-rose-200" : "bg-stone-200 text-stone-400 cursor-not-allowed shadow-none"}`}
            >
              {isAvailable ? (
                <ShoppingBag className="w-6 h-6" />
              ) : (
                <X className="w-6 h-6" />
              )}
              {isAvailable 
                ? (exactSelectedVariant && exactSelectedVariant.stock > 0 && product.stockType === "IN_STOCK"
                  ? "Adicionar (Pronta Entrega)"
                  : "Solicitar Encomenda Especial (EUA)")
                : "Produto Indisponível"}
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
