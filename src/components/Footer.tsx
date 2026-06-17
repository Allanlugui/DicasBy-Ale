import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Globe, Instagram, MessageSquare, Facebook, Twitter } from 'lucide-react';
import { useAppContext } from '../context';
import { StoreCarousel } from './FeaturedCarousels';

export function Footer() {
  const { stores, companySettings } = useAppContext();
  const featuredStores = stores.filter(s => s.isFeatured);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-[#131921] text-white">
      {/* Back to Top */}
      <button 
        onClick={scrollToTop}
        className="w-full bg-[#37475a] hover:bg-[#485769] py-4 text-sm font-bold transition-colors cursor-pointer"
      >
        Voltar ao início
      </button>

      {/* Store Carousel Integration */}
      {featuredStores.length > 0 && (
        <div className="bg-white border-b border-stone-200">
          <div className="max-w-7xl mx-auto">
             <StoreCarousel 
               items={featuredStores} 
               onItemClick={() => {}} 
             />
          </div>
        </div>
      )}

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 text-base text-center sm:text-left">
          {/* Column 1 */}
          <div className="space-y-6">
            <h4 className="font-black text-xl uppercase tracking-tighter text-rose-500">Minha Conta</h4>
            <ul className="space-y-4 text-stone-300">
              <li><Link to="/perfil" className="hover:text-white transition-colors">Seu Perfil VIP</Link></li>
              <li><Link to="/rastreio" className="hover:text-white transition-colors">Acompanhar Pedidos</Link></li>
              <li><Link to="/carrinho" className="hover:text-white transition-colors">Carrinho de Compras</Link></li>
            </ul>
          </div>

          {/* Column 2 */}
          <div className="space-y-6">
            <h4 className="font-black text-xl uppercase tracking-tighter text-rose-500">Atendimento</h4>
            <ul className="space-y-4 text-stone-300">
              <li><Link to="/suporte" className="hover:text-white transition-colors">Fale Conosco (WhatsApp)</Link></li>
              <li><Link to="/suporte" className="hover:text-white transition-colors">Central de Ajuda</Link></li>
              <li><Link to="/suporte" className="hover:text-white transition-colors">Termos e Condições</Link></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div className="space-y-6">
            <h4 className="font-black text-xl uppercase tracking-tighter text-rose-500">Importação</h4>
            <ul className="space-y-4 text-stone-300">
              <li><Link to="/suporte" className="hover:text-white transition-colors">Como Comprar nos EUA</Link></li>
              <li><Link to="/suporte" className="hover:text-white transition-colors">Custos e Prazos</Link></li>
              <li><Link to="/suporte" className="hover:text-white transition-colors">Seguro de Carga</Link></li>
            </ul>
          </div>

          {/* Column 4 */}
          <div className="space-y-6">
            <h4 className="font-black text-xl uppercase tracking-tighter text-rose-500">Pagamento</h4>
            <div className="p-4 bg-[#232f3e] rounded-2xl border border-[#37475a] space-y-3">
              <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">Métodos Aceitos</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                 <span className="bg-stone-800 px-3 py-1 rounded text-xs font-bold">PIX</span>
                 <span className="bg-stone-800 px-3 py-1 rounded text-xs font-bold">CRÉDITO</span>
                 <span className="bg-stone-800 px-3 py-1 rounded text-xs font-bold">BOLETO</span>
              </div>
              <p className="text-[10px] text-rose-400 font-bold">Parcelamento em até 12x</p>
            </div>
          </div>
        </div>

        {/* Logo and Language/Region Section */}
        <div className="mt-12 pt-12 border-t border-[#232f3e] flex flex-col items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-rose-500 p-1.5 rounded-lg group-hover:scale-110 transition">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-black text-2xl tracking-tighter">Dicas by Alê</span>
          </Link>

          <div className="flex flex-wrap justify-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-2 border border-[#848688] rounded px-3 py-1.5 bg-[#232f3e]">
              <img src="https://flagcdn.com/w20/br.png" alt="Brasil" className="w-4 h-auto" />
              <span>Brasil / Português</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal Links */}
      <div className="bg-[#131a22] py-8 border-t border-[#232f3e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="space-y-2 text-[11px] text-[#888888]">
            <p>© 2021-2026 {companySettings?.companyName || 'Dicas by Alê VIP'}. Todos os direitos reservados.</p>
            {companySettings?.companyCnpj && (
              <p>CNPJ: {companySettings.companyCnpj}</p>
            )}
            <p className="max-w-2xl mx-auto opacity-60">Especialistas em Personal Shopper e Redirecionamento Internacional Estados Unidos para Brasil. Qualidade, segurança e economia para suas compras no exterior.</p>
            <p className="mt-2 text-[#666666]">Dicas by Alê - Assessoria de Compras e Logística Internacional.</p>
          </div>

          <div className="pt-4 border-t border-[#232f3e] max-w-lg mx-auto">
            <p className="text-[10px] text-[#666666] leading-relaxed">
              Intermediação de compras internacionais e logística de redirecionamento. Preços em BRL convertidos conforme cotação do dia.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
