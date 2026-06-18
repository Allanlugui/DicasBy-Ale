import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context';
import { ShieldCheck, Info, FileText, Landmark, Save, RefreshCw, Scale } from 'lucide-react';

const DEFAULT_TERMS = `TERMOS DE USO - IMPORTAGRINGA

1. OBJETO E ESCOPO
A ImportaGringa oferece serviços personalizados de Personal Shopper, assessoria de compras internacionais, armazenamento temporário nos Estados Unidos, despacho aduaneiro e logística internacional com destino ao Brasil. Ao se cadastrar, você concorda irrestritamente com estes termos.

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
Disponibilizamos meios de pagamento oficiais configurados pelo administrador. A liberação de compra e envio de pacotes ocorrem mediante a confirmação total de pagamento. Ao utilizar o aplicativo, o cliente está ciente e concorda que eventuais despesas administrativas e tarifas essenciais para o funcionamento da plataforma (como custos operacionais, tributos fixos, infraestrutura, armazenagem básica e manutenção de aplicativo) já estão integralmente incorporadas e embutidas sob a rubrica da nossa "Taxa de Serviço".`;

const DEFAULT_PRIVACY = `POLÍTICA DE PRIVACIDADE E CONSENTIMENTO DE TRATAMENTO DE DADOS

1. DECLARAÇÃO DE PRIVACIDADE
A ImportaGringa respeita profundamente a privacidade de seus parceiros e clientes. Toda informação confidencial compartilhada conosco no ato do cadastro ou acompanhamento de envio está salvaguardada por protocolos modernos de integridade de dados das leis brasileiras (LGPD) e legislação internacional norte-americana.

2. CONSENTIMENTO EXPLICITO
Ao marcar a caixa de seleção de concordo no momento do cadastro ou conclusão do perfil, você emite seu consentimento livre, informado e inequívoco para que a ImportaGringa trate seus dados cadastrais para:
- Despacho de mercadorias no modal rodoviário, aéreo doméstico ou internacional.
- Cadastro e controle de transações financeiras para fins contábeis.
- Compartilhamento restrito com os órgãos aduaneiros federais e operadores logísticos no ato da remessa de envio.

3. DIREITOS DO TITULAR
Você possui pleno direito de requerer a anonimização, exclusão de histórico de perfil, correção ou limitação do tratamento dos seus dados diretamente com a nossa equipe de suporte VIP integrada ao app.`;

export function AdminSettingsTab() {
  const { companySettings, saveCompanySettings } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Local Form state
  const [pixKey, setPixKey] = useState('');
  const [pixName, setPixName] = useState('');
  const [pixCity, setPixCity] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyTradeName, setCompanyTradeName] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [termsOfUse, setTermsOfUse] = useState('');
  const [privacyPolicy, setPrivacyPolicy] = useState('');

  // ERP Integration fields
  const [adminHubBaseUrl, setAdminHubBaseUrl] = useState('');
  const [adminHubApiKey, setAdminHubApiKey] = useState('');
  const [nexusBaseUrl, setNexusBaseUrl] = useState('');
  const [nexusApiKey, setNexusApiKey] = useState('');

  // New operational costs fields
  const [serviceFeePercent, setServiceFeePercent] = useState(30);
  const [storageRatePerM2, setStorageRatePerM2] = useState(150);
  const [appFeeFixedBRL, setAppFeeFixedBRL] = useState(20);
  const [fixedCosts, setFixedCosts] = useState<{ id: string; label: string; value: number }[]>([]);

  // Load from context
  useEffect(() => {
    if (companySettings) {
      setPixKey(companySettings.pixKey || '');
      setPixName(companySettings.pixName || '');
      setPixCity(companySettings.pixCity || '');
      setCompanyName(companySettings.companyName || '');
      setCompanyTradeName(companySettings.companyTradeName || '');
      setCompanyCnpj(companySettings.companyCnpj || '');
      setCompanyEmail(companySettings.companyEmail || '');
      setCompanyPhone(companySettings.companyPhone || '');
      setCompanyAddress(companySettings.companyAddress || '');
      setTermsOfUse(companySettings.termsOfUse || DEFAULT_TERMS);
      setPrivacyPolicy(companySettings.privacyPolicy || DEFAULT_PRIVACY);
      setServiceFeePercent(companySettings.serviceFeePercent ?? 30);
      setStorageRatePerM2(companySettings.storageRatePerM2 ?? 150);
      setAppFeeFixedBRL(companySettings.appFeeFixedBRL ?? 20);
      setFixedCosts(companySettings.fixedCosts || []);
      setAdminHubBaseUrl(companySettings.adminHubBaseUrl || '');
      setAdminHubApiKey(companySettings.adminHubApiKey || '');
      setNexusBaseUrl(companySettings.nexusBaseUrl || '');
      setNexusApiKey(companySettings.nexusApiKey || '');
    } else {
      setTermsOfUse(DEFAULT_TERMS);
      setPrivacyPolicy(DEFAULT_PRIVACY);
    }
  }, [companySettings]);

  const handleAddField = () => {
    const id = Math.random().toString(36).substr(2, 9);
    setFixedCosts([...fixedCosts, { id, label: '', value: 0 }]);
  };

  const handleUpdateField = (id: string, field: 'label' | 'value', val: any) => {
    setFixedCosts(prev => prev.map(f => f.id === id ? { ...f, [field]: val } : f));
  };

  const handleRemoveField = (id: string) => {
    setFixedCosts(prev => prev.filter(f => f.id !== id));
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);
    if (value.length > 12) {
      value = `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12)}`;
    } else if (value.length > 8) {
      value = `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/`;
    }
    setCompanyCnpj(value);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    if (!pixKey || !pixName || !companyName || !companyCnpj) {
      setError('Por favor, preencha os campos obrigatórios (Chave Pix, Nome do Recebedor, Razão Social e CNPJ).');
      setLoading(false);
      return;
    }

    try {
      await saveCompanySettings({
        pixKey,
        pixName,
        pixCity: pixCity || 'SAO PAULO',
        companyName,
        companyTradeName,
        companyCnpj,
        companyEmail,
        companyPhone,
        companyAddress,
        termsOfUse,
        privacyPolicy,
        serviceFeePercent,
        storageRatePerM2,
        appFeeFixedBRL,
        fixedCosts,
        adminHubBaseUrl,
        adminHubApiKey,
        nexusBaseUrl,
        nexusApiKey
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto text-stone-800">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Configurações Gerais da Empresa e Cobrança</h2>
        <p className="text-xs text-stone-500 mt-1">
          Defina as políticas legais da empresa, regras LGPD, dados jurídicos e a Chave Pix principal para automação de checkout.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8 pb-20">
        
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold leading-none animate-scale-in">
            <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>Configurações atualizadas e integradas com total sucesso! Prontos para faturamentos e novos acessos de clientes.</span>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold leading-none">
            <Info className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. PIX PAYMENTS SETTINGS */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Landmark className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-bold text-stone-900">1. Configuração do Recebimento de Pagamentos (PIX)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-bold text-stone-600 block">Chave Pix Principal *</label>
              <input 
                type="text"
                value={pixKey}
                onChange={e => setPixKey(e.target.value)}
                placeholder="E-mail, CPF, Celular ou Aleatória"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition"
                required
              />
              <p className="text-[10px] text-stone-400">Insira a chave no formato exato cadastrado no seu banco.</p>
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-bold text-stone-600 block">Beneficiário / Nome Recebedor *</label>
              <input 
                type="text"
                value={pixName}
                onChange={e => setPixName(e.target.value)}
                placeholder="Ex Nome Completo ou Razão Social"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition"
                required
              />
              <p className="text-[10px] text-stone-400">Nome titular associado à Chave Pix.</p>
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-bold text-stone-600 block">Cidade do Recebedor (Opcional)</label>
              <input 
                type="text"
                value={pixCity}
                onChange={e => setPixCity(e.target.value)}
                placeholder="Exemplo: SAO PAULO"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition uppercase"
              />
              <p className="text-[10px] text-stone-400">Obrigatório pela rede Pix brasileira. Padrão: SAO PAULO.</p>
            </div>
          </div>
        </div>

        {/* 2. OPERATIONAL FEES & STORAGE */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <RefreshCw className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-bold text-stone-900">2. Taxas Operacionais e Armazenagem</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">Taxa de Serviço (%)</label>
              <div className="relative">
                <input 
                  type="number"
                  value={serviceFeePercent}
                  onChange={e => setServiceFeePercent(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition"
                />
                <span className="absolute right-4 top-2.5 text-stone-400 text-sm">%</span>
              </div>
              <p className="text-[10px] text-stone-400">Padrão: 30%. Aplicado sobre o subtotal dos produtos.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">Valor Base Armazenagem (por m²)</label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-stone-400 text-sm">R$</span>
                <input 
                  type="number"
                  value={storageRatePerM2}
                  onChange={e => setStorageRatePerM2(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition"
                />
              </div>
              <p className="text-[10px] text-stone-400">Usado para calcular a taxa mensal baseada no volume do pacote.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">Taxa de Manutenção App (Fixo R$)</label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-stone-400 text-sm">R$</span>
                <input 
                  type="number"
                  value={appFeeFixedBRL}
                  onChange={e => setAppFeeFixedBRL(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition"
                />
              </div>
              <p className="text-[10px] text-stone-400">Valor fixo cobrado por pedido para manutenção do sistema.</p>
            </div>
          </div>
        </div>

        {/* 3. FIXED COSTS & SALARIES */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-rose-500" />
              <h3 className="text-sm font-bold text-stone-900">3. Custos Fixos e Folha de Pagamento</h3>
            </div>
            <button 
              type="button" 
              onClick={handleAddField}
              className="text-xs bg-stone-900 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-stone-800 transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Adicionar Custo
            </button>
          </div>

          <div className="space-y-3">
            {fixedCosts.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-4 text-center">Nenhum custo fixo cadastrado. Adicione salários, aluguel, etc.</p>
            ) : (
              fixedCosts.map((cost) => (
                <div key={cost.id} className="flex gap-3 items-end animate-fade-in">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Descrição do Custo</label>
                    <input 
                      type="text"
                      value={cost.label}
                      onChange={e => handleUpdateField(cost.id, 'label', e.target.value)}
                      placeholder="Ex: Salário Funcionário A"
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 text-sm rounded-xl outline-none"
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Valor (R$)</label>
                    <input 
                      type="number"
                      value={cost.value}
                      onChange={e => handleUpdateField(cost.id, 'value', Number(e.target.value))}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 text-sm rounded-xl outline-none"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveField(cost.id)}
                    className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                  >
                    <RefreshCw className="w-4 h-4 rotate-45" />
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div className="pt-4 border-t border-stone-100 flex justify-between items-center">
            <span className="text-sm font-bold text-stone-600">Total de Custos Fixos Mensais:</span>
            <span className="text-lg font-black text-rose-600">
              R$ {fixedCosts.reduce((acc, c) => acc + c.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* 4. ERP INTEGRATION CONFIG */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <RefreshCw className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-stone-900">4. Configurações de Integração ERP (AdminHub & Nexus)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* AdminHub Section */}
            <div className="space-y-4 p-4 bg-indigo-50/30 rounded-xl border border-indigo-100">
              <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider">AdminHub Enterprise (Financeiro)</h4>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-600 block">Base URL</label>
                <input 
                  type="url"
                  value={adminHubBaseUrl}
                  onChange={e => setAdminHubBaseUrl(e.target.value)}
                  placeholder="https://api.adminhub.example.com"
                  className="w-full px-4 py-2 bg-white border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-600 block">API Key / Token</label>
                <input 
                  type="password"
                  value={adminHubApiKey}
                  onChange={e => setAdminHubApiKey(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full px-4 py-2 bg-white border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Nexus ERP Section */}
            <div className="space-y-4 p-4 bg-emerald-50/30 rounded-xl border border-emerald-100">
              <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">Nexus ERP (Comercial & NF-e)</h4>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-600 block">Base URL</label>
                <input 
                  type="url"
                  value={nexusBaseUrl}
                  onChange={e => setNexusBaseUrl(e.target.value)}
                  placeholder="https://api.nexus.example.com"
                  className="w-full px-4 py-2 bg-white border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-600 block">API Key / Token</label>
                <input 
                  type="password"
                  value={nexusApiKey}
                  onChange={e => setNexusApiKey(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full px-4 py-2 bg-white border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-stone-500 italic">
            * Estas configurações permitem que a loja envie dados automaticamente após o recebimento dos pagamentos. 
            As chaves cadastradas aqui têm precedência sobre variáveis de ambiente fixas.
          </p>
        </div>

        {/* 5. CORPORATE LEGAL DATA */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Scale className="w-5 h-5 text-stone-500" />
            <h3 className="text-sm font-bold text-stone-900">5. Dados Jurídicos da Empresa (Legal Entity)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">Razão Social *</label>
              <input 
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Razão Social Registrada (LTDA, ME, S/A, etc)"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">Nome Fantasia (Opcional)</label>
              <input 
                type="text"
                value={companyTradeName}
                onChange={e => setCompanyTradeName(e.target.value)}
                placeholder="Exemplo: ImportaGringa VIP"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">CNPJ Corporativo *</label>
              <input 
                type="text"
                value={companyCnpj}
                onChange={handleCnpjChange}
                placeholder="00.000.000/0000-00"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition font-semibold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">WhatsApp de Contato Empresarial</label>
              <input 
                type="text"
                value={companyPhone}
                onChange={e => setCompanyPhone(e.target.value)}
                placeholder="Ex: (11) 99999-9999"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">E-mail para Atendimento Legal</label>
              <input 
                type="email"
                value={companyEmail}
                onChange={e => setCompanyEmail(e.target.value)}
                placeholder="contato@empresa.com"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">Endereço Fiscal / Administrativo Completo</label>
              <input 
                type="text"
                value={companyAddress}
                onChange={e => setCompanyAddress(e.target.value)}
                placeholder="Rua, Número, Bairro, Cidade - UF"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* 3. LEGAL COVENANTS AND AGREEMENTS (LGPD & TERMS OF USE) */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <FileText className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-bold text-stone-900">3. Redação Legal (Termos de Uso, Política de Privacidade e Consentimento LGPD)</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-stone-600 block">Termos de Uso e Escopo do Aplicativo</label>
                <button 
                  type="button" 
                  onClick={() => setTermsOfUse(DEFAULT_TERMS)} 
                  className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                >
                  Restaurar Termos Originais
                </button>
              </div>
              <textarea 
                value={termsOfUse}
                onChange={e => setTermsOfUse(e.target.value)}
                rows={8}
                className="w-full p-4 bg-stone-50 border border-stone-200 text-xs rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition font-mono whitespace-pre-wrap leading-relaxed"
                placeholder="Termos de uso formais..."
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-stone-600 block">Política de Privacidade, Segurança & Consentimento de Dados de Saúde / Idade / Endereço (LGPD)</label>
                <button 
                  type="button" 
                  onClick={() => setPrivacyPolicy(DEFAULT_PRIVACY)} 
                  className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                >
                  Restaurar Política Original
                </button>
              </div>
              <textarea 
                value={privacyPolicy}
                onChange={e => setPrivacyPolicy(e.target.value)}
                rows={8}
                className="w-full p-4 bg-stone-50 border border-stone-200 text-xs rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition font-mono whitespace-pre-wrap leading-relaxed"
                placeholder="Política de privacidade de dados e consentimento..."
              />
            </div>
          </div>
        </div>

        {/* SAVE SUBMIT BAR */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`cursor-pointer px-8 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-md shadow-rose-100 flex items-center gap-2 transition-all ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Salvando Configurações...' : 'Salvar Configurações Corporativas'}
          </button>
        </div>

      </form>
    </div>
  );
}
