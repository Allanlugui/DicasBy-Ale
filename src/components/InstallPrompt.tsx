import React, { useState, useEffect } from 'react';
import { Smartphone, Sparkles, Share, PlusSquare, X, Download, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { safeStorage } from '../lib/utils';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showTopBar, setShowTopBar] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isReadyToInstall, setIsReadyToInstall] = useState(false);
  const [deviceType, setDeviceType] = useState<'android' | 'ios' | 'desktop'>('desktop');
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  // Hook 1: Listen to beforeinstallprompt (GUARANTEED TO ALWAYS RUN, no early returns!)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('[PWA] beforeinstallprompt event captured and stored successfully.');
      setDeferredPrompt(e);
      setIsReadyToInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    console.log('[PWA] Registered beforeinstallprompt listener.');

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Hook 2: Platform detection, in-app browser status, and promotional banners timers
  useEffect(() => {
    // 1. Detect platform & In-App Browser
    const userAgentRaw = window.navigator.userAgent || window.navigator.vendor || (window as any).opera || '';
    const userAgent = userAgentRaw.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    
    // In-app browsers like Instagram, WhatsApp, Facebook, Telegram, TikTok, etc.
    const isInternal = /fban|fbav|instagram|twitter|tgandroid|line|whatsapp|micromessenger/i.test(userAgentRaw);
    setIsInAppBrowser(isInternal);

    if (isIosDevice) {
      setDeviceType('ios');
    } else if (isAndroidDevice) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }

    // 2. Check if already running in standalone mode (already installed)
    const isInStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isInStandaloneMode) {
      setShowBanner(false);
      setShowTopBar(false);
      return;
    }

    // Determine if PWA is already marked as installed
    const hasInstalled = safeStorage.getItem('pwa_installed_successfully') === 'true';
    if (hasInstalled) return;

    const topBarDismissed = safeStorage.getItem('pwa_topbar_dismissed_at');
    const bannerDismissed = safeStorage.getItem('pwa_banner_dismissed_at');

    let bannerTimer: any = null;
    let topBarTimer: any = null;

    if (!topBarDismissed) {
      topBarTimer = setTimeout(() => {
        setShowTopBar(true);
      }, 800); // quick appearance for excellent first-access conversion
    } else if (!bannerDismissed) {
      bannerTimer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
    }

    return () => {
      if (topBarTimer) clearTimeout(topBarTimer);
      if (bannerTimer) clearTimeout(bannerTimer);
    };
  }, []);

  // Expose global triggerPwaInstall function
  useEffect(() => {
    (window as any).triggerPwaInstall = () => {
      if (deviceType === 'ios') {
        setShowIosModal(true);
        setShowBanner(false);
        setShowTopBar(false);
      } else if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(({ outcome }: any) => {
          if (outcome === 'accepted') {
            safeStorage.setItem('pwa_installed_successfully', 'true');
            setShowBanner(false);
            setShowTopBar(false);
          }
        });
      } else {
        // If on Android/Desktop but there is no deferred prompt active,
        // we show them the step-by-step instructions.
        setShowIosModal(true);
        setShowBanner(false);
        setShowTopBar(false);
      }
    };
    return () => {
      delete (window as any).triggerPwaInstall;
    };
  }, [deferredPrompt, deviceType]);

  const handleInstallClick = async () => {
    if (deviceType === 'ios') {
      // Show beautiful modal guide for iOS Safari installations
      setShowIosModal(true);
      setShowBanner(false);
      setShowTopBar(false);
      return;
    }

    if (!deferredPrompt) {
      // Fallback if deferredPrompt isn't loaded/captured yet
      setShowIosModal(true);
      setShowBanner(false);
      setShowTopBar(false);
      return;
    }

    // Show native prompt
    deferredPrompt.prompt();

    // Wait for the user's choice
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to install: ${outcome}`);

    if (outcome === 'accepted') {
      safeStorage.setItem('pwa_installed_successfully', 'true');
      setShowBanner(false);
      setShowTopBar(false);
    }
    setDeferredPrompt(null);
  };

  const dismissBanner = () => {
    safeStorage.setItem('pwa_banner_dismissed_at', Date.now().toString());
    setShowBanner(false);
  };

  const dismissTopBar = () => {
    safeStorage.setItem('pwa_topbar_dismissed_at', Date.now().toString());
    setShowTopBar(false);
  };

  // Always keep ready to install to listen to triggers
  const isWidgetSupported = true;


  return (
    <>
      {/* 3. SIMPLIFIED TOP INSTALLATION BAR FOR FIRST ACCESS */}
      {showTopBar && (
        <div className="bg-gradient-to-r from-rose-500 via-pink-600 to-rose-600 text-white py-3 px-4 shadow-md relative z-40 animate-fade-in border-b border-rose-400/20">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl text-white shrink-0">
                <Smartphone className="w-5 h-5 animate-bounce" />
              </div>
              <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                <span className="font-bold underline decoration-wavy decoration-rose-300">Dicas by Alê no seu Celular:</span> Instale nosso App para acessar mais rápido, acompanhar rastreios em tempo real e receber alertas instantâneos!
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstallClick}
                className="cursor-pointer bg-white text-rose-700 hover:bg-rose-50 active:scale-95 px-4 py-1.5 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Instalar Grátis
              </button>
              <button
                onClick={dismissTopBar}
                className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. FLOATING ACTION PWA INSTALLATION BANNER */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:max-w-md z-50 animate-scale-in">
          <div className="bg-stone-900 border border-stone-800 text-white rounded-2xl shadow-2xl p-4 flex flex-col gap-3 relative overflow-hidden">
            {/* Glossy top highlight */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-pink-300 via-rose-500 to-amber-300"></div>

            <button 
              onClick={dismissBanner}
              className="absolute top-3 right-3 text-stone-400 hover:text-white p-1 rounded-full hover:bg-stone-800 transition"
              title="Fechar lembrete"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-3.5 items-start pr-6">
              <div className="bg-rose-500/15 p-2.5 rounded-xl border border-rose-500/30 text-rose-400 shrink-0 mt-0.5">
                <Smartphone className="w-6 h-6 animate-pulse-slow" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono">Dicas by Alê PWA</span>
                  <span className="bg-amber-400/20 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-400/20 flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5 fill-amber-300" /> Acesso Rápido
                  </span>
                </div>
                <h4 className="text-[13px] font-bold text-stone-100 mt-1">Instalar aplicativo no seu celular?</h4>
                <p className="text-[11px] text-stone-400 leading-normal mt-0.5">
                  Fique por dentro de suas importações dos EUA com rastreio em tempo real e notificações, direto na tela do seu aparelho com apenas 1 clique!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1 border-t border-stone-800/80 pt-3">
              <button 
                onClick={dismissBanner}
                className="cursor-pointer text-center text-xs font-semibold text-stone-400 hover:text-white py-2 rounded-xl hover:bg-stone-800 transition"
              >
                Mais Tarde
              </button>
              
              <button 
                onClick={handleInstallClick}
                className="cursor-pointer bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-950/40"
              >
                <Download className="w-3.5 h-3.5" /> Instalar Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. iOS & IN-APP BROWSER STEP-BY-STEP CUSTOM TUTORIAL MODAL */}
      {showIosModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-stone-200 shadow-2xl p-6 relative overflow-hidden animate-scale-in text-stone-800">
            {/* Top Pink Line decor */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500"></div>

            <button 
              onClick={() => setShowIosModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 p-1.5 rounded-full hover:bg-stone-50 transition cursor-pointer animate-pulse"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 mt-2">
              <div className="bg-rose-50 text-rose-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <Smartphone className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-stone-900 font-display">
                {isInAppBrowser 
                  ? 'Abra no Navegador Externo' 
                  : deviceType === 'ios' 
                    ? 'Instalar no iPhone (Nativo)' 
                    : deviceType === 'android' 
                      ? 'Instalar no Android (Nativo)' 
                      : 'Instalar no Computador'}
              </h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                {isInAppBrowser
                  ? 'Você está usando o navegador interno (Instagram/WhatsApp). Esses navegadores bloqueiam a instalação do app nativo e criam apenas atalhos simples.'
                  : deviceType === 'ios' 
                    ? 'O iOS exige o navegador Safari oficial para instalar o aplicativo nativo de verdade na sua tela de início.'
                    : deviceType === 'android'
                      ? 'Para instalar o app de forma nativa (WebAPK) e não apenas como um link/atalho simples, siga estas instruções:'
                      : 'Instale como aplicativo de desktop autônomo na sua máquina. Siga estes passos:'
                }
              </p>
            </div>

            {/* In-app Browser Call-to-action warning */}
            {isInAppBrowser ? (
              <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-stone-800 space-y-3 animate-pulse">
                <div className="flex gap-2 items-start">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-900">Como instalar o App real agora:</p>
                    <p className="text-[11px] text-stone-600 leading-normal">
                      Não tente instalar clicando em "Adicionar à tela de início" por este navegador interno!
                    </p>
                  </div>
                </div>
                
                <div className="border-t border-amber-200/60 pt-2.5 space-y-2">
                  <div className="flex gap-2 items-center text-xs">
                    <span className="font-bold text-stone-900 shrink-0 bg-amber-200/80 px-1.5 py-0.5 rounded text-[10px]">Android</span>
                    <span className="text-stone-700 leading-tight">Toque em <span className="font-bold">⋮ (três pontinhos)</span> no topo direito e selecione <span className="font-bold">"Abrir no Chrome"</span>.</span>
                  </div>
                  <div className="flex gap-2 items-center text-xs">
                    <span className="font-bold text-stone-900 shrink-0 bg-amber-200/80 px-1.5 py-0.5 rounded text-[10px]">iPhone (iOS)</span>
                    <span className="text-stone-700 leading-tight">Toque no ícone de <span className="font-bold">Bússola/Safari</span> no canto inferior para abrir no <span className="font-bold">Safari</span> nativo.</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Normal Platform instructions */
              <div className="mt-6 space-y-4 text-xs font-medium text-stone-700 border-t border-stone-100 pt-4">
                {deviceType === 'ios' ? (
                  <>
                    <div className="flex gap-3 items-center">
                      <div className="bg-stone-100 text-stone-800 w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs">1</div>
                      <div className="flex-grow">
                        Toque no botão de <span className="font-bold text-stone-950 inline-flex items-center gap-1 bg-stone-50 border px-1.5 py-0.5 rounded leading-none text-[11px]"><Share className="w-3.5 h-3.5 text-blue-500 inline" /> Compartilhar</span> na barra de navegação inferior do Safari.
                      </div>
                    </div>
                    <div className="flex gap-3 items-center">
                      <div className="bg-stone-100 text-stone-800 w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs">2</div>
                      <div className="flex-grow">
                        Role a lista de opções e selecione <span className="font-bold text-stone-950 inline-flex items-center gap-1 bg-stone-50 border px-1.5 py-0.5 rounded leading-none text-[11px]"><PlusSquare className="w-3.5 h-3.5 text-stone-800 inline" /> Adicionar à Tela de Início</span>.
                      </div>
                    </div>
                    <div className="flex gap-3 items-center">
                      <div className="bg-stone-100 text-stone-800 w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs">3</div>
                      <div className="flex-grow">
                        Toque em <span className="font-bold text-rose-600 uppercase">Adicionar</span> no canto superior direito para instalar o App Nativo.
                      </div>
                    </div>
                  </>
                ) : deviceType === 'android' ? (
                  <>
                    <div className="flex gap-3 items-center">
                      <div className="bg-stone-100 text-stone-800 w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs">1</div>
                      <div className="flex-grow">
                        Clique no nosso botão <span className="font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[11px]">Instalar Grátis</span> ou nos <span className="font-bold text-stone-950">três pontinhos (⋮)</span> do Google Chrome.
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="bg-stone-100 text-stone-800 w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">2</div>
                      <div className="flex-grow">
                        Selecione a opção <span className="font-bold text-stone-950 bg-stone-50 border px-1.5 py-0.5 rounded text-[11px] inline-block font-sans">Instalar aplicativo</span> ou <span className="font-bold text-stone-950 bg-stone-50 border px-1.5 py-0.5 rounded text-[11px] inline-block font-sans">Instalar</span>.
                        <p className="text-[10px] text-amber-600 font-medium mt-1">⚠️ ATENÇÃO: NÃO clique em "Adicionar Atalho", pois cria apenas um link web comum.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-center">
                      <div className="bg-stone-100 text-stone-800 w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs">3</div>
                      <div className="flex-grow">
                        Toque em <span className="font-bold text-rose-600 uppercase">Instalar</span> para que o Android compile seu App Nativo completo!
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex gap-3 items-center">
                      <div className="bg-stone-100 text-stone-800 w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs">1</div>
                      <div className="flex-grow">
                        Clique no ícone de <span className="font-bold text-stone-950 bg-stone-50 border px-1.5 py-0.5 rounded text-[11px] inline-flex items-center gap-1"><Download className="w-3.5 h-3.5 inline" /> Instalar aplicativo</span> na barra de endereços (ao lado da estrela de favoritos).
                      </div>
                    </div>
                    <div className="flex gap-3 items-center">
                      <div className="bg-stone-100 text-stone-800 w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs">2</div>
                      <div className="flex-grow">
                        Ou clique nos <span className="font-bold text-stone-950">três pontinhos (⋮)</span> do menu do navegador Chrome/Edge.
                      </div>
                    </div>
                    <div className="flex gap-3 items-center">
                      <div className="bg-stone-100 text-stone-800 w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs">3</div>
                      <div className="flex-grow">
                        Selecione <span className="font-bold text-rose-600 uppercase">Instalar Dicas by Alê...</span> e confirme.
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Action closure Button */}
            <div className="mt-6 border-t border-stone-100 pt-4">
              <button 
                onClick={() => {
                  setShowIosModal(false);
                }}
                className="cursor-pointer w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition"
              >
                <Check className="w-4 h-4 text-emerald-400" /> {isInAppBrowser ? 'Entendi, abrir navegador' : 'Fechar Instruções'}
              </button>
            </div>
            
            <div className="mt-3 flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-100 text-[10px] text-amber-800">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>
                {isInAppBrowser
                  ? 'A instalação nativa como aplicativo real só é permitida no Safari (iOS) ou Chrome (Android) originais.'
                  : deviceType === 'ios' 
                    ? 'Instalação nativa apenas no Safari Apple original.' 
                    : 'Caso já tenha instalado, você já pode acessar via ícone na sua Tela Inicial!'
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
