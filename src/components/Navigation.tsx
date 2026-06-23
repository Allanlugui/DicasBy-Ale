import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Package, Settings, PackageSearch, LogIn, LogOut, Instagram, MessageSquare, User, Smartphone, ChevronDown, Menu, X, Bell } from 'lucide-react';
import { useAppContext } from '../context';
import { AnimatePresence, motion } from 'motion/react';
import { safeStorage } from '../lib/utils';

export function Navigation() {
  const { cart, user, isAdmin, logout, notifications } = useAppContext();
  const location = useLocation();
  const [isInstalled, setIsInstalled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkInstallation = () => {
      const isInStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true;
      
      const installSucceeded = safeStorage.getItem('pwa_installed_successfully') === 'true';
      setIsInstalled(isInStandaloneMode || installSucceeded);
    };

    checkInstallation();

    const handleAppInstalled = () => {
      safeStorage.setItem('pwa_installed_successfully', 'true');
      setIsInstalled(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('storage', checkInstallation);

    const interval = setInterval(checkInstallation, 3000);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('storage', checkInstallation);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setShowUserMenu(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-rose-500" />
              <span className="font-display font-bold text-xl text-stone-900 tracking-tight whitespace-nowrap">Dicas by Alê</span>
            </Link>
            
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
              <Link to="/" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/') ? 'bg-rose-50 text-rose-700' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'}`}>
                Início
              </Link>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-quote-modal'))}
                className="px-3 py-2 rounded-md text-sm font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Pedir Orçamento
              </button>
              <Link to="/rastreio" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/rastreio') ? 'bg-rose-50 text-rose-700' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'}`}>
                Rastreio
              </Link>
              {!isInstalled && (
                <button 
                  onClick={() => (window as any).triggerPwaInstall?.()}
                  className="cursor-pointer px-3 py-2 rounded-md text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50/50 flex items-center gap-1.5 transition-colors"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Instalar App</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <a href="https://www.instagram.com/dicasbyale/" target="_blank" rel="noopener noreferrer" className="p-2 text-stone-400 hover:text-rose-500 hidden sm:block">
              <Instagram className="h-5 w-5" />
            </a>

            <Link to="/carrinho" className="relative p-2 text-stone-400 hover:text-stone-900 transition-colors">
              <ShoppingBag className="h-6 w-6" />
              {cartItemsCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-1 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-rose-500 rounded-full min-w-[20px]">
                  {cartItemsCount}
                </span>
              )}
            </Link>

            {isAdmin && (
               <Link to="/admin" className="relative p-2 text-stone-400 hover:text-rose-500 transition-colors">
                 <Bell className="h-5 w-5" />
                 {notifications.length > 0 && (
                   <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1 right-1 flex h-2.5 w-2.5"
                   >
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                   </motion.span>
                 )}
               </Link>
            )}

            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 p-2 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors"
                id="user-menu-button"
              >
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold overflow-hidden border border-rose-200">
                   {user?.photoURL ? (
                     <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                   ) : (
                     <User className="h-4 w-4" />
                   )}
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${showUserMenu ? 'rotate-180' : ''} hidden sm:block`} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-stone-200/60 border border-stone-100 py-2 animate-fade-in origin-top-right z-50">
                  {user ? (
                    <>
                      {/* User Header */}
                      <div className="px-4 py-3 border-b border-stone-100 mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 font-bold border border-rose-100 overflow-hidden shrink-0">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                            ) : (
                              <User className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-stone-900 truncate">Olá!</p>
                            <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Navigation Section (Mobile Friendly) */}
                      <div className="sm:hidden px-2 pb-2 mb-2 border-b border-stone-100">
                        <p className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Navegação</p>
                        <Link to="/" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive('/') ? 'text-rose-600 bg-rose-50' : 'text-stone-600 hover:bg-stone-50'}`}>
                          <PackageSearch className="h-4 w-4" /> 
                          <span className="font-medium">Início</span>
                        </Link>
                        <button 
                          onClick={() => window.dispatchEvent(new CustomEvent('open-quote-modal'))}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="h-4 w-4" /> 
                          <span className="font-medium">Pedir Orçamento</span>
                        </button>
                        <Link to="/rastreio" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive('/rastreio') ? 'text-rose-600 bg-rose-50' : 'text-stone-600 hover:bg-stone-50'}`}>
                          <Package className="h-4 w-4" /> 
                          <span className="font-medium">Rastreio</span>
                        </Link>
                      </div>

                      {/* Account Section */}
                      <div className="px-2 pb-2 mb-1">
                        <p className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Minha Conta</p>
                        <Link to="/perfil" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive('/perfil') ? 'text-rose-600 bg-rose-50' : 'text-stone-600 hover:bg-stone-50'}`}>
                          <User className="h-4 w-4" /> O Meu Perfil
                        </Link>
                        <Link to="/suporte" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive('/suporte') ? 'text-rose-600 bg-rose-50' : 'text-stone-600 hover:bg-stone-50'}`}>
                          <MessageSquare className="h-4 w-4" /> Suporte e Chat
                        </Link>
                        
                        {isAdmin && (
                          <Link to="/admin" className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold mt-1 transition-colors ${isActive('/admin') ? 'text-rose-600 bg-rose-50' : 'text-stone-600 hover:bg-stone-50'}`}>
                            <div className="flex items-center gap-3">
                              <Settings className="h-4 w-4" /> Painel Admin
                            </div>
                            {notifications.length > 0 && (
                              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                {notifications.length}
                              </span>
                            )}
                          </Link>
                        )}
                      </div>

                      {/* App Section */}
                      {!isInstalled && (
                        <div className="px-2 mb-1">
                          <button 
                            onClick={() => (window as any).triggerPwaInstall?.()}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-rose-50 hover:text-rose-600 transition"
                          >
                            <Smartphone className="h-4 w-4" /> Instalar App
                          </button>
                        </div>
                      )}
                      
                      <div className="h-px bg-stone-100 my-1 mx-4" />
                      
                      <div className="px-2">
                        <button 
                          onClick={logout} 
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-stone-500 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <LogOut className="h-4 w-4" /> Sair
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="sm:hidden px-2 pb-2 mb-2 border-b border-stone-100">
                        <Link to="/" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive('/') ? 'text-rose-600 bg-rose-50' : 'text-stone-600 hover:bg-stone-50'}`}>
                          <PackageSearch className="h-4 w-4" /> 
                          <span className="font-medium">Início</span>
                        </Link>
                        <button 
                          onClick={() => window.dispatchEvent(new CustomEvent('open-quote-modal'))}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="h-4 w-4" /> 
                          <span className="font-medium">Pedir Orçamento</span>
                        </button>
                        <Link to="/rastreio" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive('/rastreio') ? 'text-rose-600 bg-rose-50' : 'text-stone-600 hover:bg-stone-50'}`}>
                          <Package className="h-4 w-4" /> 
                          <span className="font-medium">Rastreio</span>
                        </Link>
                      </div>

                      <div className="px-2">
                        <Link to="/login" className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-rose-600 font-bold hover:bg-rose-50 transition border border-transparent hover:border-rose-100">
                          <LogIn className="h-4 w-4" /> Fazer Login / Criar Conta
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
