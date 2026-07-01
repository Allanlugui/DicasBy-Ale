import React, { useState, useEffect } from "react";
import { useAppContext } from "../context";
import { validateDocument } from "../lib/utils";
import {
  User,
  MapPin,
  Calendar,
  CreditCard,
  Phone,
  Mail,
  FileText,
  Gift,
  Bookmark,
  CheckCircle,
  ShieldAlert,
  Truck,
  Send,
  Scale,
  ShieldCheck,
} from "lucide-react";

const DEFAULT_TERMS = `TERMOS DE USO

1. OBJETO E ESCOPO
A Dicas by Ale oferece serviços personalizados de Personal Shopper, assessoria de compras internacionais, armazenamento temporário nos Estados Unidos, despacho aduaneiro e logística internacional com destino ao Brasil. Ao se cadastrar, você concorda irrestritamente com estes termos.

2. TRATAMENTO DE DADOS E LGPD
Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD) e correspondentes diretrizes norte-americanas de proteção à privacidade, coletamos e processamos seus dados pessoais (Nome Completo, Data de Nascimento, Registro de CPF/CNPJ, Telefone WhatsApp de contato e Endereço Residencial Completo).
Estes dados são estritamente necessários para:
- Emissão de notas fiscais (invoices) alfandegárias de importação.
- Cálculo preciso de tributos e taxas aduaneiras.
- Roteamento e envio correto via Correios, transportador aéreo privado, courier expresso, FedEx ou entrega em mãos.
- Autenticação e integridade do seu programa de indicação ("Indique e Ganhe").

3. SEGURANÇA E PRIVACIDADE
Garantimos suporte técnico e legal a quaisquer incidentes. Os seus dados são armazenados localmente e na nuvem criptografada do Firebase do projeto, sendo acessíveis unicamente pela nossa equipe comercial para realizar o despacho físico do produto. Seus dados nunca serão repassados ou comercializados para terceiros não-logísticos.

4. POLÍTICA DE PAGAMENTO E TARIFAS OPERACIONAIS
Disponibilizamos meios de pagamento oficiais configurados pelo administrador. A liberação de compra e envio de pacotes ocorrem mediante a confirmação total de pagamento. Ao utilizar o aplicativo, o cliente está ciente e concorda que eventuais despesas administrativas e tarifas essenciais para o funcionamento da plataforma (como custos operacionais, tributos fixos, infraestrutura, armazenagem básica e manutenção de aplicativo) já estão integralmente incorporadas e embutidas sob a rubrica da nossa "Taxa de Serviço".

5. PRAZOS E PROCESSAMENTO DE BOLETO BANCÁRIO
Quando o cliente optar por realizar o pagamento via boleto bancário, o processamento e compensação pela instituição financeira pode levar até 3 (três) dias úteis. A compra e liberação de envio de qualquer produto ou mercadoria só serão efetivadas e processadas após a compensação e processamento bancário definitivo do respectivo boleto (ou seja, o valor precisa ser efetivamente creditado em conta). Enquanto o pagamento não for compensado pelo banco, o cliente não receberá o produto.`;

const DEFAULT_PRIVACY = `POLÍTICA DE PRIVACIDADE E CONSENTIMENTO DE TRATAMENTO DE DADOS

1. DECLARAÇÃO DE PRIVACIDADE
A empresa respeita profundamente a privacidade de seus parceiros e clientes. Toda informação confidencial compartilhada conosco no ato do cadastro ou acompanhamento de envio está salvaguardada por protocolos modernos de integridade de dados das leis brasileiras (LGPD) e legislação internacional norte-americana.

2. CONSENTIMENTO EXPLICITO
Ao marcar a caixa de seleção de concordo no momento do cadastro ou conclusão do perfil, você emite seu consentimento livre, informado e inequívoco para que a empresa trate seus dados cadastrais para:
- Despacho de mercadorias no modal rodoviário, aéreo doméstico ou internacional.
- Cadastro e controle de transações financeiras para fins contábeis.
- Compartilhamento restrito com os órgãos aduaneiros federais e operadores logísticos no ato da remessa de envio.

3. DIREITOS DO TITULAR
Você possui pleno direito de requerer a anonimização, exclusão de histórico de perfil, correção ou limitação do tratamento dos seus dados diretamente com a nossa equipe de suporte VIP integrada ao app.`;

export function Profile() {
  const { user, profile, saveProfile, companySettings } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // Populate from existing profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setDateOfBirth(profile.dateOfBirth || "");
      setDocument(profile.document || "");
      setPhone(profile.phone || "");
      setZipCode(profile.zipCode || "");
      setStreet(profile.street || "");
      setNumber(profile.number || "");
      setComplement(profile.complement || "");
      setNeighborhood(profile.neighborhood || "");
      setCity(profile.city || "");
      setState(profile.state || "");
      setAcceptedTerms(true);
    } else if (user) {
      setFullName(user.displayName || "");
    }
  }, [profile, user]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white border border-stone-200 rounded-3xl text-center space-y-6 shadow-sm">
        <div className="p-4 bg-rose-50 text-rose-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-stone-900">Acesso Restrito</h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            Você precisa estar autenticado para acessar as configurações de
            perfil e endereço.
          </p>
        </div>
        <a
          href="/login"
          className="block w-full text-center bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl transition text-sm"
        >
          Ir para Login / Cadastro
        </a>
      </div>
    );
  }

  // Simple masks for ease of use
  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) {
      value = `${value.slice(0, 5)}-${value.slice(5)}`;
    }
    setZipCode(value);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 10) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setPhone(value);
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 14) value = value.slice(0, 14);

    if (value.length > 11) {
      // CNPJ: 00.000.000/0000-00
      value = `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12)}`;
    } else if (value.length > 9) {
      // CPF: 000.000.000-00
      value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
    } else if (value.length > 6) {
      value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
    } else if (value.length > 3) {
      value = `${value.slice(0, 3)}.${value.slice(3)}`;
    }
    setDocument(value);
  };

  const handleFetchAddressByCEP = async () => {
    const cleanCEP = zipCode.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;
    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cleanCEP}/json/`,
      );
      const data = await response.json();
      if (!data.erro) {
        setStreet(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        setState(data.uf || "");
      }
    } catch (e) {
      console.error("ViaCEP fail", e);
    }
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (
      !fullName ||
      !dateOfBirth ||
      !document ||
      !phone ||
      !zipCode ||
      !street ||
      !number ||
      !neighborhood ||
      !city ||
      !state
    ) {
      setError("Por favor, preencha todos os campos obrigatórios (*).");
      setLoading(false);
      return;
    }

    if (!acceptedTerms) {
      setError(
        "Para prosseguir, você precisa ler e aceitar os Termos de Uso e Política de Privacidade em total conformidade com a LGPD e legislação americana.",
      );
      setLoading(false);
      return;
    }

    const docValidation = validateDocument(document);

    // URL detection regex for security
    const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9.-]+\.[a-z]{2,}/i;
    const hasUrl = [fullName, street, complement, neighborhood, city, state].some(val => urlPattern.test(val));
    if (hasUrl) {
      setError("Por motivos de segurança cibernética contra malware, não é permitido inserir links ou URLs nos campos de cadastro. Por favor, utilize apenas texto.");
      setLoading(false);
      return;
    }

    if (!docValidation.isValid) {
      setError(
        docValidation.type === "CPF"
          ? "O CPF digitado é inválido. Por favor, verifique o número."
          : docValidation.type === "CNPJ"
          ? "O CNPJ digitado é inválido. Por favor, verifique o número."
          : "O documento informado não é um CPF ou CNPJ válido. Verifique se digitou os números corretamente."
      );
      setLoading(false);
      return;
    }

    try {
      await saveProfile({
        fullName,
        dateOfBirth,
        document,
        phone,
        zipCode,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
      });
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err?.message || "Erro desconhecido ao salvar o perfil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            Meu Perfil
          </h1>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            Mantenha seus dados atualizados para cálculo automatizado de frete,
            emissão de invoices e garantia de entrega.
          </p>
        </div>
        <div className="text-xs font-semibold text-stone-400 bg-stone-100/50 px-3 py-1.5 rounded-xl border border-stone-200 self-start md:self-auto flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" /> {user.email}
        </div>
      </div>

      {/* Info Warning Banner */}
      <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl flex flex-col sm:flex-row gap-4">
        <div className="p-3 bg-white text-rose-500 rounded-xl max-h-fit shadow-xs">
          <Truck className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h4 className="font-bold text-rose-950 text-sm">
            Por que precisamos dos seus dados completos?
          </h4>
          <p className="text-xs text-rose-800 leading-relaxed md:max-w-3xl">
            Sua Personal Shopper VIP realiza o despacho dos pedidos por
            múltiplos modais: frete aéreo expresso, postal clássico, FedEx ou
            entregas pessoais facilitadas no Brasil. Endereço impecável, número
            residencial, CPF/CNPJ (essencial para as burocracias de invoice) e
            data de nascimento correta blindam suas compras de qualquer erro de
            trânsito ou desembaraço aduaneiro.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmitProfile} className="space-y-8">
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold leading-none animate-scale-in">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>
              Perfil e endereçamento atualizados com total sucesso! Emissões
              prontas para entrega.
            </span>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold leading-none">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Personal Data */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <User className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-bold text-stone-900">
              1. Dados Pessoais para Nota/Invoice
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">
                Nome Completo *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-stone-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome idêntico ao documento brasileiro"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 hover:border-stone-300 outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">
                Data de Nascimento *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-stone-400">
                  <Calendar className="w-4 h-4" />
                </span>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 hover:border-stone-300 outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">
                CPF ou CNPJ (para Invoices) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-stone-400">
                  <CreditCard className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={document}
                  onChange={handleDocumentChange}
                  placeholder="CPF (000.000.000-00) ou CNPJ"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 hover:border-stone-300 outline-none transition"
                  required
                />
              </div>
              <p className="text-[10px] text-stone-400">
                Obrigatório pelas transportadoras e alfândega brasileira.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">
                WhatsApp com DDD *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-stone-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(00) 00000-0000"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 hover:border-stone-300 outline-none transition"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Shipping Address */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3 flex-wrap justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-500" />
              <h2 className="text-base font-bold text-stone-900">
                2. Endereço Completo de Destino
              </h2>
            </div>
            <span className="text-[10px] text-stone-400 italic">
              Válido para Correios, Courier, FedEx ou entrega direta
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-bold text-stone-600 block">
                CEP / Código Postal *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={zipCode}
                  onChange={handleZipCodeChange}
                  onBlur={handleFetchAddressByCEP}
                  placeholder="00000-000"
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 hover:border-stone-300 outline-none transition font-semibold"
                  required
                />
                <button
                  type="button"
                  onClick={handleFetchAddressByCEP}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs px-3 rounded-xl font-bold border border-stone-200 flex items-center justify-center cursor-pointer transition-colors"
                >
                  Buscar
                </button>
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-stone-600 block">
                Rua / Avenida *
              </label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Exemplo: Avenida Paulista"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 hover:border-stone-300 outline-none transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">
                Número residencial *
              </label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Ex: 123"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 hover:border-stone-300 outline-none transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">
                Complemento (Opcional)
              </label>
              <input
                type="text"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                placeholder="Apto 42, Bloco B"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 hover:border-stone-300 outline-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">
                Bairro *
              </label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ex: Cerqueira César"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 hover:border-stone-300 outline-none transition"
                required
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-stone-600 block">
                Cidade *
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 hover:border-stone-300 outline-none transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">
                Estado *
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Ex: SP"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 hover:border-stone-300 outline-none transition uppercase"
                maxLength={2}
                required
              />
            </div>
          </div>
        </div>

        {/* Section 3: Legal Terms and Consent (LGPD & USA Privacy Legislation) */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3 justify-between flex-wrap">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-rose-500" />
              <h2 className="text-base font-bold text-stone-900">
                3. Conformidade Legal, LGPD & Privacidade
              </h2>
            </div>
            <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Suporte Legal Premium
            </span>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-stone-600 leading-relaxed">
              Em conformidade com a{" "}
              <strong>LGPD (Lei Geral de Proteção de Dados - Brasil)</strong> e
              a legislação de privacidade norte-americana, seus dados pessoais e
              fiscais são confidenciais, protegidos com criptografia ponta a
              ponta e salvaguardados por nosso departamento de amparo jurídico
              próprio. Seu consentimento expresso abaixo é um requisito legal
              obrigatório para podermos processar e certificar seus embarques.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-stone-600 block">
                  Visualizar Termos de Uso
                </span>
                <div className="h-44 overflow-y-auto border border-stone-200 rounded-xl p-3 bg-stone-50 text-[11px] text-stone-500 font-mono leading-relaxed whitespace-pre-wrap">
                  {companySettings?.termsOfUse || DEFAULT_TERMS}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-stone-600 block">
                  Visualizar Política de Privacidade e Consentimento
                </span>
                <div className="h-44 overflow-y-auto border border-stone-200 rounded-xl p-3 bg-stone-50 text-[11px] text-stone-500 font-mono leading-relaxed whitespace-pre-wrap">
                  {companySettings?.privacyPolicy || DEFAULT_PRIVACY}
                </div>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mt-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4.5 w-4.5 rounded border-stone-300 text-rose-600 focus:ring-rose-500 transition cursor-pointer"
                />
                <span className="text-xs text-stone-700 font-medium leading-relaxed">
                  Confirmo que realizei a leitura integral dos{" "}
                  <strong className="text-stone-900">Termos de Uso</strong> e da{" "}
                  <strong className="text-stone-900">
                    Política de Privacidade
                  </strong>{" "}
                  corporativos, emitindo meu consentimento livre, informado e
                  inequívoco para que a{" "}
                  {companySettings?.companyTradeName ||
                    companySettings?.companyName ||
                    "empresa"}{" "}
                  armazene, processe e compartilhe meus documentos cadastrais
                  estritamente com os despachantes aduaneiros e transportadores
                  logísticos norte-americanos/brasileiros a fim de processar
                  minhas faturas (invoices) e efetuar as entregas de importação
                  solicitadas.
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !acceptedTerms}
            className={`cursor-pointer px-8 py-3.5 bg-rose-600 hover:bg-rose-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed text-white text-sm font-bold rounded-2xl transition-all shadow-md shadow-rose-100 flex items-center gap-2 ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            <Send className="w-4 h-4" />
            {loading
              ? "Salvando informações..."
              : "Salvar e Validar Importações"}
          </button>
        </div>
      </form>

      {/* Section 5: User Drive (Auto Documents) */}
      <UserProfileDrive />
    </div>
  );
}

import { Folder, FolderOpen, Download, FileArchive } from "lucide-react";
function UserProfileDrive() {
  const { folders, documents, user } = useAppContext();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  if (!user) return null;

  // Filtrar pastas para o root se currentFolderId for null. Se currentFolderId for null, mas o user for dono, queremos a raiz.
  // A raiz do user é onde parentId === null E userId === user.uid
  let activeFolderId = currentFolderId;
  const rootFolder = folders.find(
    (f) => f.userId === user.uid && f.parentId === null,
  );

  if (currentFolderId === null && rootFolder) {
    activeFolderId = rootFolder.id;
  }

  const currentFolders = folders.filter(
    (f) => f.parentId === activeFolderId && f.userId === user.uid,
  );
  const currentDocuments = documents.filter(
    (d) => (d.folderId || null) === activeFolderId && d.userId === user.uid,
  );

  const handleBack = () => {
    if (!activeFolderId) return;
    const curr = folders.find((f) => f.id === activeFolderId);
    if (!curr || !curr.parentId) {
      // already at root or higher
      return;
    }
    setCurrentFolderId(curr.parentId);
  };

  const getFileIcon = (type: string) => {
    if (type.toLowerCase().includes("pdf"))
      return <FileText className="w-8 h-8 text-rose-500" />;
    if (type.toLowerCase().includes("zip"))
      return <FileArchive className="w-8 h-8 text-amber-500" />;
    return <FileText className="w-8 h-8 text-blue-500" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 shadow-sm mt-8">
      <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
        <Folder className="w-5 h-5 text-indigo-500" />
        <h2 className="text-base font-bold text-stone-900">
          Meus Documentos (Drive Digital)
        </h2>
      </div>
      <p className="text-xs text-stone-500">
        Aqui estão seus recibos, comprovantes e notas geradas. Para sua
        segurança, guardamos tudo organizado.
      </p>

      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 min-h-[250px]">
        {activeFolderId !== (rootFolder?.id || null) && (
          <button
            onClick={handleBack}
            className="mb-4 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            &larr; Voltar
          </button>
        )}

        {currentFolders.length === 0 && currentDocuments.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-stone-400">
            <FolderOpen className="w-10 h-10 text-stone-300 mb-2" />
            <p className="text-xs font-bold">Pasta vazia.</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {currentFolders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => setCurrentFolderId(folder.id)}
              className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-300 hover:shadow transition"
            >
              <Folder className="w-10 h-10 text-indigo-200 fill-indigo-50" />
              <span className="text-[11px] font-bold text-stone-700 text-center">
                {folder.name}
              </span>
            </div>
          ))}

          {currentDocuments.map((doc) => (
            <a
              key={doc.id}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-rose-300 hover:shadow transition relative group"
            >
              {getFileIcon(doc.type)}
              <span className="text-[10px] font-bold text-stone-700 text-center line-clamp-2">
                {doc.name}
              </span>

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                <div className="bg-stone-900 text-white rounded-full p-1.5 shadow-md">
                  <Download className="w-3 h-3" />
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
