import React, { useState, useEffect } from 'react';
import { Smartphone, Sparkles, Share, PlusSquare, X, Download, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { safeStorage } from '../lib/utils';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isReadyToInstall, setIsReadyToInstall] = useState(false);
  const [deviceType, setDeviceType] = useState<'android' | 'ios' | 'desktop'>('desktop');

  useEffect(() => {
    // 1. Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);

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
      return;
    }

    // 3. For Android/Chrome/Desktop: Listen to beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('[PWA] beforeinstallprompt event captured');
      setDeferredPrompt(e);
      setIsReadyToInstall(true);

      // Only show banner after first access if not dismissed recently
      const dismissedTime = safeStorage.getItem('pwa_banner_dismissed_at');
      const installSucceeded = safeStorage.getItem('pwa_installed_successfully');
      
      const shouldShow = !installSucceeded && (!dismissedTime || Date.now() - parseInt(dismissedTime) > 24 * 60 * 60 * 1000 * 3); // 3 days cooling off
      if (shouldShow) {
        // Subtle delay for premium UX
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. For iOS devices: Since there is no prompt event, show banner to users directly as iOS fully supports PWAs
    if (isIosDevice) {
      setIsReadyToInstall(true);
      const dismissedTime = safeStorage.getItem('pwa_banner_dismissed_at');
      const installSucceeded = safeStorage.getItem('pwa_installed_successfully');
      const shouldShow = !installSucceeded && (!dismissedTime || Date.now() - parseInt(dismissedTime) > 24 * 60 * 60 * 1000 * 3);

      if (shouldShow) {
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 4000); // slightly longer delay for iOS
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Expose global triggerPwaInstall function
  useEffect(() => {
    (window as any).triggerPwaInstall = () => {
      if (deviceType === 'ios') {
        setShowIosModal(true);
        setShowBanner(false);
      } else if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(({ outcome }: any) => {
          if (outcome === 'accepted') {
            safeStorage.setItem('pwa_installed_successfully', 'true');
            setShowBanner(false);
          }
        });
      } else {
        // If on Android/Desktop but there is no deferred prompt active,
        // it means PWA has already been installed or standard beforeinstallprompt was cancelled.
        // We show them the step-by-step instructions.
        setShowIosModal(true);
        setShowBanner(false);
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
      return;
    }

    if (!deferredPrompt) {
      // Fallback if deferredPrompt isn't loaded/captured yet
      setShowIosModal(true);
      setShowBanner(false);
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
    }
    setDeferredPrompt(null);
  };

  const dismissBanner = () => {
    safeStorage.setItem('pwa_banner_dismissed_at', Date.now().toString());
    setShowBanner(false);
  };

  // Always keep ready to install to listen to triggers
  const isWidgetSupported = true;


  return (
    <>
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

      {/* 2. iOS STEP-BY-STEP CUSTOM TUTORIAL MODAL */}
      {showIosModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-stone-200 shadow-2xl p-6 relative overflow-hidden animate-scale-in text-stone-800">
            {/* Top Pink Line decor */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500"></div>

            <button 
              onClick={() => setShowIosModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 p-1.5 rounded-full hover:bg-stone-50 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 mt-2">
              <div className="bg-rose-50 text-rose-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-stone-900 font-display">
                {deviceType === 'ios' ? 'Instalar no iPhone' : deviceType === 'android' ? 'Instalar no Android' : 'Instalar no Computador'}
              </h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                {deviceType === 'ios' 
                  ? 'O iOS requer que a instalação seja feita através do navegador Safari oficial. Siga estes 3 passos:'
                  : deviceType === 'android'
                    ? 'Instale direto na sua Tela Inicial para uso offline e carregamento rápido. Siga estes passos:'
                    : 'Instale como aplicativo de desktop autônomo na sua máquina. Siga estes passos:'
                }
              </p>
            </div>

            {/* Platform instructions */}
            <div className="mt-6 space-y-4 text-xs font-medium text-stone-700 border-t border-stone-100 pt-4">
              {deviceType === 'ios' ? (
                <>
                  <div className="flex gap-3 items-center">
                    <div className="bg-stone-100 text-stone-800 w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs">1</div>
                    <div className="flex-grow">
                      Toque no botão de <span className="font-bold text-stone-950 inline-flex items-center gap-1 bg-stone-50 border px-1.5 py-0.5 rounded leading-none text-[11px]"><Share className="w-3.5 h-3.5 text-blue-500 inline" /> Compartilhar</span> na barra inferior do Safari.
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="bg-stone-100 text-stone-800 w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs">2</div>
                    <div className="flex-grow">
                      Role a lista e selecione a opção <span className="font-bold text-stone-950 inline-flex items-center gap-1 bg-stone-50 border px-1.5 py-0.5 rounded leading-none text-[11px]"><PlusSquare className="w-3.5 h-3.5 text-stone-800 inline" /> Adicionar à Tela de Início</span>.
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="bg-stone-100 text-stone-800 w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs">3</div>
                    <div className="flex-grow">
                      Toque em <span className="font-bold text-rose-600 uppercase">Adicionar</span> no canto superior direito do seu celular.
                    </div>
                  </div>
                </>
              ) : deviceType === 'android' ? (
                <>
                  <div className="flex gap-3 items-center">
                    <div className="bg-stone-100 text-stone-800 w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs">1</div>
                    <div className="flex-grow">
                      Toque nos <span className="font-bold text-stone-950">três pontinhos (⋮)</span> no canto superior direito do navegador Chrome.
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="bg-stone-100 text-stone-800 w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs">2</div>
                    <div className="flex-grow">
                      Selecione a opção <span className="font-bold text-stone-950 bg-stone-50 border px-1.5 py-0.5 rounded text-[11px] inline-block">Instalar aplicativo</span> ou <span className="font-bold text-stone-950 bg-stone-50 border px-1.5 py-0.5 rounded text-[11px] inline-block">Adicionar à tela inicial</span>.
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="bg-stone-100 text-stone-800 w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs">3</div>
                    <div className="flex-grow">
                      Toque em <span className="font-bold text-rose-600 uppercase">Instalar</span> e confirme a ação.
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

            {/* Action closure Button */}
            <div className="mt-8 border-t border-stone-100 pt-4">
              <button 
                onClick={() => {
                  setShowIosModal(false);
                  safeStorage.setItem('pwa_installed_successfully', 'true');
                }}
                className="cursor-pointer w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition"
              >
                <Check className="w-4 h-4 text-emerald-400" /> Fechar Instruções
              </button>
            </div>
            
            <div className="mt-3 flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-100 text-[10px] text-amber-800">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>
                {deviceType === 'ios' 
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
