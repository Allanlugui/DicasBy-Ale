import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Terminal,
  Lock,
  Globe,
  FileWarning,
  AlertTriangle,
  HelpCircle,
  PhoneCall,
  Download,
  CheckCircle,
  ArrowLeft,
  ShieldAlert,
  Fingerprint
} from "lucide-react";
import { useAppContext } from "../context";

export function Security() {
  const { companySettings } = useAppContext();
  const shopName = companySettings?.companyName || "Dicas by Ale VIP";

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Back button and breadcrumb */}
      <div className="max-w-4xl mx-auto mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-stone-500 hover:text-rose-500 transition-colors text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para a Loja
        </Link>
      </div>

      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden">
        {/* Banner Header */}
        <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-rose-950 text-white p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl -ml-20 -mb-20"></div>
          
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 bg-rose-500/20 border border-rose-500/30 text-rose-300 px-3.5 py-1.5 rounded-full text-xs font-black tracking-widest uppercase">
              <ShieldCheck className="w-4 h-4" /> Central de Segurança e Antifraude
            </div>
            <h1 className="text-3xl md:text-4xl font-black font-display tracking-tight leading-tight">
              Proteja sua navegação e evite golpes na internet
            </h1>
            <p className="text-stone-300 text-sm md:text-base max-w-2xl leading-relaxed font-medium">
              Na <strong className="text-white font-bold">{shopName}</strong>, sua segurança vem em primeiro lugar. Criamos este guia detalhado para ajudá-lo a identificar tentativas de fraude, garantir transações seguras e entender os mecanismos de proteção da nossa loja.
            </p>
          </div>
        </div>

        {/* Warning Alert Banner */}
        <div className="bg-rose-50 border-y border-rose-100 p-6 flex flex-col sm:flex-row gap-4 items-start">
          <div className="bg-rose-100 p-3 rounded-2xl text-rose-600 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-rose-900 text-sm uppercase tracking-wide">
              Aviso Importante: O perigo do Console do Navegador (Self-XSS)
            </h3>
            <p className="text-xs text-rose-800 leading-relaxed font-medium">
              Bloqueamos o acesso do console (F12 / inspecionar elemento) e exibimos alertas críticos para sua proteção. Golpistas tentam enganar usuários comuns pedindo para copiar e colar scripts ou códigos no console do navegador. Ao fazer isso, você permite a execução de códigos nocivos que podem roubar suas senhas, cookies de sessão, ou realizar compras e pagamentos sem o seu consentimento. <strong>Nunca insira códigos que você não entende no console!</strong>
            </p>
          </div>
        </div>

        {/* Main Sections */}
        <div className="p-6 md:p-10 space-y-12">
          
          {/* Section 1: Self-XSS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
              <Terminal className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg md:text-xl font-black text-stone-900 uppercase tracking-tight">
                1. O que é Self-XSS e por que travamos o Console?
              </h2>
            </div>
            <p className="text-stone-600 text-sm leading-relaxed">
              <strong>Self-XSS (Self Cross-Site Scripting)</strong> é um tipo de ataque de engenharia social onde a vítima é induzida a colar códigos JavaScript diretamente no console de ferramentas do desenvolvedor (F12) de seu próprio navegador. 
            </p>
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-3">
              <h4 className="font-bold text-stone-800 text-xs uppercase tracking-wider">Como funciona esse golpe?</h4>
              <ul className="list-disc list-inside text-xs text-stone-600 space-y-2">
                <li>Um golpista entra em contato prometendo promoções secretas, cupons exclusivos ou ferramentas para "invadir" contas alheias.</li>
                <li>Ele instrui você a abrir o console do navegador pressionando <strong>F12</strong> ou <strong>Ctrl+Shift+I</strong>.</li>
                <li>Ele fornece um texto ou link contendo scripts maliciosos complexos e pede para você colá-lo e pressionar <strong>Enter</strong>.</li>
                <li>Ao rodar esse código, o hacker rouba imediatamente os tokens de acesso de login e passa a controlar suas sessões e transações.</li>
              </ul>
              <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1.5 mt-2">
                <CheckCircle className="w-4 h-4" /> Nossa Defesa: Desativamos atalhos de console do navegador e configuramos um monitoramento que limpa o histórico do console, disparando um banner gigante de aviso.
              </p>
            </div>
          </div>

          {/* Section 2: Phishing */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
              <Globe className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg md:text-xl font-black text-stone-900 uppercase tracking-tight">
                2. Phishing e Sites Clonados / Falsificados
              </h2>
            </div>
            <p className="text-stone-600 text-sm leading-relaxed">
              O <strong>Phishing</strong> (pescaria digital) ocorre quando cibercriminosos criam cópias visuais quase idênticas do nosso site de importação com domínios parecidos (ex: <em>dicasbyale-desconto.com</em>) para capturar seus dados bancários, login ou cartões.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="border border-stone-200 rounded-2xl p-5 bg-white space-y-3">
                <span className="inline-block bg-rose-50 text-rose-700 text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full">
                  Perigo do Golpe
                </span>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Você recebe um e-mail urgente ou SMS dizendo que sua mercadoria foi retida ou que você tem uma fatura de frete atrasada, com um link de pagamento direto.
                </p>
              </div>
              <div className="border border-emerald-100 rounded-2xl p-5 bg-emerald-50/20 space-y-3">
                <span className="inline-block bg-emerald-50 text-emerald-700 text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full">
                  Como se proteger
                </span>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Verifique sempre a URL no topo do seu navegador. Nossos links de rastreamento oficiais estão centralizados em nosso painel seguro. Nunca realize transferências Pix para contas de terceiros não-oficiais.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Clickbait */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg md:text-xl font-black text-stone-900 uppercase tracking-tight">
                3. Clickbaits, Promoções Milagrosas e Anúncios Falsos
              </h2>
            </div>
            <p className="text-stone-600 text-sm leading-relaxed">
              Promoções extraordinárias no Instagram, Facebook ou TikTok prometendo produtos importados (como iPhones, perfumes ou eletrônicos) por menos de 20% do preço real são quase sempre falsas.
            </p>
            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 space-y-2 text-xs text-amber-900">
              <p className="font-bold flex items-center gap-1.5 text-amber-800">
                <FileWarning className="w-4 h-4 shrink-0" /> Dicas práticas para não cair no Clickbait:
              </p>
              <ul className="list-decimal list-inside space-y-1.5 font-medium leading-relaxed text-stone-700">
                <li>Desconfie de anúncios com contadores de tempo agressivos e ofertas de "tudo de graça se pagar apenas o frete".</li>
                <li>O serviço de redirecionamento calcula o imposto e frete com base no peso real da mercadoria; fujam de fretes absurdamente baixos sem fundamento técnico.</li>
                <li>Em caso de dúvida, entre em contato com nosso atendimento VIP do WhatsApp diretamente através do botão oficial em nosso portal de Suporte.</li>
              </ul>
            </div>
          </div>

          {/* Section 4: Malware */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
              <Download className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg md:text-xl font-black text-stone-900 uppercase tracking-tight">
                4. Malwares e Aplicativos Maliciosos (.EXE / .APK)
              </h2>
            </div>
            <p className="text-stone-600 text-sm leading-relaxed">
              Criminosos podem tentar enviar mensagens contendo arquivos executáveis ou aplicativos disfarçados de "Rastreadores", "Calculadoras de Imposto" ou "Atualizações do Correio". 
            </p>
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5">
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                ⚠️ <strong>Regra de ouro:</strong> Nunca baixe ou execute nenhum arquivo com extensões <code>.exe</code>, <code>.bat</code>, <code>.scr</code>, ou <code>.apk</code> enviados por canais não-oficiais de suporte ou e-mail. Nós da <strong className="text-rose-600">{shopName}</strong> operamos de forma 100% web, segura e responsiva — você não precisa instalar nenhum arquivo no computador ou celular para rastrear ou pagar suas importações.
              </p>
            </div>
          </div>

          {/* Core Safe Habits Card */}
          <div className="bg-stone-900 text-white rounded-3xl p-6 md:p-8 space-y-4 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-rose-500/20 rounded-full blur-2xl"></div>
            <div className="flex items-center gap-2 text-rose-400">
              <Fingerprint className="w-5 h-5" />
              <span className="text-xs font-black tracking-widest uppercase">Checklist Final de Navegação</span>
            </div>
            <h3 className="text-lg md:text-xl font-black tracking-tight font-display">
              Práticas Diárias de Segurança na Web
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs text-stone-300">
              <div className="space-y-1">
                <span className="text-rose-400 font-bold">● Ative a Verificação em Duas Etapas (2FA)</span>
                <p className="text-stone-400 leading-relaxed">No seu WhatsApp, redes sociais e e-mails para evitar clonagens e acessos indesejados.</p>
              </div>
              <div className="space-y-1">
                <span className="text-rose-400 font-bold">● Senhas Diferentes e Fortes</span>
                <p className="text-stone-400 leading-relaxed">Evite usar a mesma senha em múltiplos sites. Utilize geradores de senhas seguros.</p>
              </div>
              <div className="space-y-1">
                <span className="text-rose-400 font-bold">● Cuidado com Redes Wi-Fi Públicas</span>
                <p className="text-stone-400 leading-relaxed">Não realize transações bancárias ou compras conectado a redes abertas ou sem senha.</p>
              </div>
              <div className="space-y-1">
                <span className="text-rose-400 font-bold">● Duvide de Links por SMS/WhatsApp</span>
                <p className="text-stone-400 leading-relaxed">Sempre acesse o site oficial inserindo o endereço diretamente na barra de navegação.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer info in page */}
        <div className="bg-stone-50 border-t border-stone-200 p-6 md:p-8 text-center space-y-4">
          <p className="text-xs text-stone-500 leading-relaxed max-w-lg mx-auto">
            Tem alguma dúvida ou presenciou alguma atividade suspeita? Entre em contato imediato com nossa equipe. Nós protegemos suas compras e seu processo de importação.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/suporte"
              className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-3 rounded-xl transition"
            >
              <PhoneCall className="w-4 h-4" /> Fale Conosco
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold px-5 py-3 rounded-xl transition"
            >
              Ir para a Loja
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
