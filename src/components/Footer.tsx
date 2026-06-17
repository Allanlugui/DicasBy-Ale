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

      {/* Store Carousel Integration (The requested "same model" in the footer) */}
      {featuredStores.length > 0 && (
        <div className="bg-white border-b border-stone-200">
          <StoreCarousel 
            items={featuredStores} 
            onItemClick={() => {}} 
          />
        </div>
      )}

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 text-sm text-center sm:text-left">
          {/* Column 1 */}
          <div className="space-y-4">
            <h4 className="font-bold text-base">Minha Conta</h4>
            <ul className="space-y-2 text-[#cccccc]">
              <li><Link to="/perfil" className="hover:underline">Seu Perfil</Link></li>
              <li><Link to="/rastreio" className="hover:underline">Seus Pedidos</Link></li>
              <li><Link to="/carrinho" className="hover:underline">Seu Carrinho</Link></li>
            </ul>
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <h4 className="font-bold text-base">Atendimento</h4>
            <ul className="space-y-2 text-[#cccccc]">
              <li><Link to="/suporte" className="hover:underline">Fale Conosco</Link></li>
              <li><Link to="/suporte" className="hover:underline">Dúvidas Frequentes</Link></li>
              <li><Link to="/suporte" className="hover:underline">Termos de Uso</Link></li>
              <li><Link to="/suporte" className="hover:underline">Privacidade</Link></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div className="space-y-4">
            <h4 className="font-bold text-base">Importação</h4>
            <ul className="space-y-2 text-[#cccccc]">
              <li><Link to="/suporte" className="hover:underline">Como Funciona</Link></li>
              <li><Link to="/suporte" className="hover:underline">Taxas e Impostos</Link></li>
              <li><Link to="/suporte" className="hover:underline">Prazos de Entrega</Link></li>
            </ul>
          </div>

          {/* Column 4 */}
          <div className="space-y-4">
            <h4 className="font-bold text-base">Pagamento</h4>
            <ul className="space-y-2 text-[#cccccc]">
              <li><span className="block italic opacity-70">Aceitamos:</span></li>
              <li className="text-white font-bold">PIX, Cartão de Crédito</li>
              <li><span className="text-[10px] opacity-50">Parcelamento em até 12x</span></li>
            </ul>
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
            <p>© 2021-2026 {companySettings?.companyName || 'ImportaGringa VIP'}. Todos os direitos reservados.</p>
            {companySettings?.companyCnpj && (
              <p>CNPJ: {companySettings.companyCnpj}</p>
            )}
            <p className="max-w-2xl mx-auto opacity-60">Sua Personal Shopper VIP nos Estados Unidos. Compre nas melhores marcas americanas e receba com segurança no conforto da sua casa no Brasil.</p>
            <p className="mt-2 text-[#666666]">Dicas by Alê - Assessoria de Compras e Redirecionamento Internacional.</p>
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
