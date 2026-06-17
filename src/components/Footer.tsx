import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Globe, Instagram, MessageSquare, Facebook, Twitter } from 'lucide-react';
import { useAppContext } from '../context';
import { StoreCarousel } from './FeaturedCarousels';

export function Footer() {
  const { stores } = useAppContext();
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
        <div className="border-b border-[#232f3e]">
          <StoreCarousel 
            items={featuredStores} 
            onItemClick={() => {}} 
          />
        </div>
      )}

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-sm">
          {/* Column 1 */}
          <div className="space-y-4">
            <h4 className="font-bold text-base">Conheça-nos</h4>
            <ul className="space-y-2 text-[#cccccc]">
              <li><Link to="/perfil" className="hover:underline">Informações corporativas</Link></li>
              <li><Link to="/suporte" className="hover:underline">Comunicados à imprensa</Link></li>
              <li><Link to="/" className="hover:underline">Comunidade</Link></li>
              <li><Link to="/suporte" className="hover:underline">Acessibilidade</Link></li>
            </ul>
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <h4 className="font-bold text-base">Ganhe dinheiro conosco</h4>
            <ul className="space-y-2 text-[#cccccc]">
              <li><Link to="/suporte" className="hover:underline">Venda na Dicas by Alê</Link></li>
              <li><Link to="/suporte" className="hover:underline">Proteja e construa a sua marca</Link></li>
              <li><Link to="/suporte" className="hover:underline">Forneça para a nossa rede</Link></li>
              <li><Link to="/suporte" className="hover:underline">Seja um associado</Link></li>
              <li><Link to="/suporte" className="hover:underline">Anuncie seus produtos</Link></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div className="space-y-4">
            <h4 className="font-bold text-base">Pagamento</h4>
            <ul className="space-y-2 text-[#cccccc]">
              <li><Link to="/suporte" className="hover:underline">Meios de Pagamento</Link></li>
              <li><Link to="/carrinho" className="hover:underline">Compre com Pontos</Link></li>
              <li><Link to="/suporte" className="hover:underline">Cartão de crédito</Link></li>
            </ul>
          </div>

          {/* Column 4 */}
          <div className="space-y-4">
            <h4 className="font-bold text-base">Deixe-nos ajudar você</h4>
            <ul className="space-y-2 text-[#cccccc]">
              <li><Link to="/perfil" className="hover:underline">Sua conta</Link></li>
              <li><Link to="/rastreio" className="hover:underline">Frete e prazo de entrega</Link></li>
              <li><Link to="/suporte" className="hover:underline">Devoluções e reembolsos</Link></li>
              <li><Link to="/suporte" className="hover:underline">Gerencie seu conteúdo e dispositivos</Link></li>
              <li><Link to="/suporte" className="hover:underline">Ajuda</Link></li>
            </ul>
          </div>
        </div>

        {/* Logo and Language/Region Section */}
        <div className="mt-12 pt-12 border-t border-[#232f3e] flex flex-col items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-rose-500" />
            <span className="font-display font-bold text-2xl tracking-tighter">Dicas by Alê</span>
          </Link>

          <div className="flex flex-wrap justify-center gap-4 text-xs font-medium">
            <button className="flex items-center gap-2 border border-[#848688] rounded px-3 py-1.5 hover:bg-[#232f3e] transition">
              <Globe className="w-4 h-4" />
              <span>Português</span>
            </button>
            <button className="flex items-center gap-2 border border-[#848688] rounded px-3 py-1.5 hover:bg-[#232f3e] transition">
              <img src="https://flagcdn.com/w20/br.png" alt="Brasil" className="w-4 h-auto" />
              <span>Brasil</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Legal Links */}
      <div className="bg-[#131a22] py-8 border-t border-[#232f3e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] text-[#cccccc]">
            <Link to="/suporte" className="hover:underline">Condições de Uso</Link>
            <Link to="/suporte" className="hover:underline">Notificação de Privacidade</Link>
            <Link to="/suporte" className="hover:underline">Cookies</Link>
            <Link to="/suporte" className="hover:underline">Anúncios Baseados em Interesses</Link>
          </div>

          <div className="space-y-1 text-[11px] text-[#888888]">
            <p>© 2021-2026 ImportaGringa VIP, Inc. ou suas afiliadas</p>
            <p>Amazon Serviços de Varejo do Brasil Ltda. | CNPJ 00.000.000/0001-90</p>
            <p>Av. Juscelino Kubitschek, 2041, Torre E, 18° andar - São Paulo CEP: 04543-011 | Fale conosco | ajuda@dicasbyale.com.br</p>
          </div>

          <div className="pt-4">
            <p className="text-[10px] text-[#888888]">
              Formas de pagamento aceitas: cartões de crédito (Visa, MasterCard, Elo e American Express), cartões de débito (Visa e Elo), Boleto e Pix.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
