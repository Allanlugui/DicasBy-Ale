import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Terminal, RefreshCw, Trash2, Search, SlidersHorizontal, CheckCircle2, XCircle, AlertCircle, Eye, CornerDownRight, Calendar, Layers } from 'lucide-react';

interface IntegrationLog {
  id: string;
  timestamp: string;
  service: string;
  endpoint: string;
  method: string;
  status: 'SUCCESS' | 'ERROR';
  statusCode: number;
  errorDescription: string | null;
  payload: any;
}

export function AdminIntegrationLogsTab() {
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState<'ALL' | 'Vendas' | 'Finanças' | 'Recursos Humanos'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'ERROR'>('ALL');
  const [selectedLog, setSelectedLog] = useState<IntegrationLog | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'integrationLogs'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as IntegrationLog)));
      setLoading(false);
    }, (err) => {
      console.error('Error fetching integration logs:', err);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleClearAllLogs = async () => {
    if (window.confirm('Tem certeza absoluta que deseja limpar todo o histórico e logs de auditoria de integrações? Esta ação é irreversível.')) {
      try {
        setLoading(true);
        const ref = collection(db, 'integrationLogs');
        const snap = await getDocs(ref);
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
          batch.delete(doc(db, 'integrationLogs', d.id));
        });
        await batch.commit();
        alert('Todos os logs de auditoria foram excluídos com sucesso.');
      } catch (err) {
        console.error('Error clearing integration logs:', err);
        alert('Erro ao limpar os logs.');
      } finally {
        setLoading(false);
      }
    }
  };

  const getServiceBadge = (service: string) => {
    switch (service) {
      case 'Vendas':
        return 'bg-emerald-50 border-emerald-100 text-emerald-700';
      case 'Finanças':
        return 'bg-sky-50 border-sky-100 text-sky-700';
      case 'Recursos Humanos':
        return 'bg-purple-50 border-purple-100 text-purple-700';
      default:
        return 'bg-stone-50 border-stone-200 text-stone-700';
    }
  };

  const getStatusBadge = (log: IntegrationLog) => {
    if (log.status === 'SUCCESS') {
      return 'bg-emerald-100/70 text-emerald-800 border-emerald-200';
    } else {
      switch (log.statusCode) {
        case 401:
          return 'bg-amber-100/70 text-amber-800 border-amber-200';
        case 400:
          return 'bg-rose-100/70 text-rose-800 border-rose-200';
        default:
          return 'bg-red-100 text-red-800 border-red-200';
      }
    }
  };

  // Filter logs logic
  const filteredLogs = logs.filter(log => {
    const matchService = serviceFilter === 'ALL' || log.service === serviceFilter;
    const matchStatus = statusFilter === 'ALL' || log.status === statusFilter;
    
    // Search payloads
    const payloadStr = JSON.stringify(log.payload || {}).toLowerCase();
    const errorStr = (log.errorDescription || '').toLowerCase();
    const idStr = log.id.toLowerCase();
    const endpointStr = log.endpoint.toLowerCase();
    const term = searchTerm.toLowerCase();

    const matchSearch = searchTerm === '' || 
                        payloadStr.includes(term) || 
                        errorStr.includes(term) || 
                        idStr.includes(term) || 
                        endpointStr.includes(term);

    return matchService && matchStatus && matchSearch;
  });

  return (
    <div className="space-y-8 animate-fade-in" id="integration-logs-tab-panel">
      {/* Header with Title and Quick Actions */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            Auditoria Ativa & Logs de Integração
          </h2>
          <p className="text-xs text-stone-500">Módulo de monitoramento em tempo real para as APIs do Nexus ERP e AdminHub</p>
        </div>

        {logs.length > 0 && (
          <button
            onClick={handleClearAllLogs}
            className="border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 hover:text-rose-600 font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Trash2 className="w-4 h-4" /> Limpar Histórico de Auditoria
          </button>
        )}
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
          <span className="text-xs text-stone-400 font-bold block uppercase tracking-wider">Total de Requisições</span>
          <span className="text-3xl font-black text-stone-800 block mt-1">{logs.length}</span>
          <span className="text-[10px] text-stone-400 mt-2 block">Sincronizações recebidas registradas no ERP</span>
        </div>
        <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-xs">
          <span className="text-xs text-stone-400 font-bold block uppercase tracking-wider">Sincronizações Com Sucesso</span>
          <span className="text-3xl font-black text-emerald-600 block mt-1">
            {logs.filter(l => l.status === 'SUCCESS').length}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium mt-2 block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Transações operacionais executadas com sucesso
          </span>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
          <span className="text-xs text-stone-400 font-bold block uppercase tracking-wider">Erros & Rejeições de API</span>
          <span className="text-3xl font-black text-rose-600 block mt-1">
            {logs.filter(l => l.status === 'ERROR').length}
          </span>
          <span className="text-[10px] text-rose-500 font-medium mt-2 block flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Rejeições por auth ou formatação (HTTP 400, 401)
          </span>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Service Filter tabs */}
          <button
            onClick={() => setServiceFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              serviceFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            Todos Serviços
          </button>
          <button
            onClick={() => setServiceFilter('Vendas')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              serviceFilter === 'Vendas' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            Vendas (Sales)
          </button>
          <button
            onClick={() => setServiceFilter('Finanças')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              serviceFilter === 'Finanças' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            Finanças (Finance)
          </button>
          <button
            onClick={() => setServiceFilter('Recursos Humanos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              serviceFilter === 'Recursos Humanos' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            Equipe/RH (HR)
          </button>
        </div>

        <div className="flex gap-4 items-center w-full md:w-auto justify-end flex-wrap">
          {/* Status Select Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs font-bold font-sans outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-stone-700"
            >
              <option value="ALL">Todos os Retornos</option>
              <option value="SUCCESS">Sucesso (200)</option>
              <option value="ERROR">Falhas/Erros (Rejeição)</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Buscar payload, ID, NF, erro..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-xs font-medium rounded-xl border border-stone-200 pl-8 pr-3.5 py-2.5 bg-white focus:border-indigo-500 outline-none"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-3" />
          </div>
        </div>
      </div>

      {/* Main Logs Table */}
      {loading ? (
        <div className="py-16 text-center text-stone-400 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-stone-300" />
          <span className="text-xs font-semibold">Buscando banco de auditorias ativas...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-stone-50 border border-dashed border-stone-300 rounded-2xl p-12 text-center text-stone-500">
          <SlidersHorizontal className="w-8 h-8 text-stone-300 mx-auto mb-3 animate-pulse" />
          <p className="font-bold text-stone-800 text-sm">Nenhum log encontrado</p>
          <p className="text-xs text-stone-400 mt-1">Não existem requisições que correspondam aos filtros de busca atuais.</p>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-500 tracking-wider">
                  <th className="p-4 pl-6">Data & Hora</th>
                  <th className="p-4">Serviço</th>
                  <th className="p-4">Endpoint</th>
                  <th className="p-4 text-center">Código HTTP</th>
                  <th className="p-4">Detalhamento Científico / Diagnóstico</th>
                  <th className="p-4 text-right pr-6">Análise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-stone-50/50 transition-colors">
                    {/* Date/Time */}
                    <td className="p-4 pl-6 font-mono text-stone-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-300" />
                        <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                        <span className="text-stone-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </td>

                    {/* Service Name */}
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold ${getServiceBadge(log.service)}`}>
                        {log.service}
                      </span>
                    </td>

                    {/* Endpoint */}
                    <td className="p-4 font-mono text-stone-600 font-semibold select-all text-[11px]">
                      {log.endpoint}
                    </td>

                    {/* Status Code HTTP */}
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-lg font-mono text-[11px] font-black ${getStatusBadge(log)}`}>
                        {log.status === 'SUCCESS' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-500" />
                        )}
                        {log.statusCode}
                      </span>
                    </td>

                    {/* Diagnósticos */}
                    <td className="p-4 max-w-xs font-sans text-stone-600 truncate">
                      {log.status === 'SUCCESS' ? (
                        <span className="text-emerald-600 font-semibold">Integrada com sucesso</span>
                      ) : (
                        <span className="text-rose-600 font-bold block truncate" title={log.errorDescription || 'Erro não especificado'}>
                          ⚠️ {log.errorDescription || 'Rejeição de formato de dados / payload incorreto'}
                        </span>
                      )}
                    </td>

                    {/* View inspection */}
                    <td className="p-4 text-right pr-6">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 rounded-lg text-[11px] font-bold transition flex gap-1 items-center ml-auto cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspecionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Model/Modal Inspection Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-6 shadow-xl relative animate-scale-up">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-stone-100 pb-4">
              <div>
                <span className="text-[10px] font-mono font-black text-stone-400 block tracking-widest uppercase">Protocolo de Auditoria Ativa</span>
                <span className="text-sm font-bold text-stone-950 block mt-0.5 font-mono select-all">
                  ID: {selectedLog.id}
                </span>
                <div className="flex gap-2 items-center mt-2 flex-wrap">
                  <span className={`px-2 py-0.5 border rounded-full text-[10px] font-bold ${getServiceBadge(selectedLog.service)}`}>
                    {selectedLog.service}
                  </span>
                  <span className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-lg font-mono text-[10px] font-black ${getStatusBadge(selectedLog)}`}>
                    {selectedLog.statusCode}
                  </span>
                  <span className="text-xs text-stone-400 font-mono">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-xs border border-stone-200 text-stone-500 hover:text-stone-800 bg-stone-50 hover:bg-stone-100 px-3 py-1.5 rounded-xl font-bold cursor-pointer transition select-none"
              >
                Fechar
              </button>
            </div>

            {/* Diagnostic Information */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wide flex items-center gap-1">
                <Layers className="w-4 h-4 text-indigo-500" />
                Diagnóstico de Processamento
              </h4>
              <div className="bg-stone-50 border border-stone-200 p-4 rounded-xl space-y-2 text-xs">
                <div>
                  <span className="text-stone-400 font-bold">Endpoint de Entrada:</span>
                  <span className="font-mono ml-2 font-semibold text-stone-700">{selectedLog.endpoint}</span>
                </div>
                <div>
                  <span className="text-stone-400 font-bold">Status Operação:</span>
                  <span className={`ml-2 font-bold ${selectedLog.status === 'SUCCESS' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedLog.status === 'SUCCESS' ? 'SUCESSO (COMPLETED)' : 'REJEITADO (FAILED)'}
                  </span>
                </div>
                {selectedLog.errorDescription && (
                  <div className="border-t border-stone-200/50 pt-2 mt-2">
                    <span className="text-stone-400 font-bold block">Erro Identificado:</span>
                    <span className="text-rose-600 font-black block mt-1 font-mono leading-relaxed bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                      {selectedLog.errorDescription}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Core Payload View (The requested Detail View) */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wide flex items-center gap-1">
                  <CornerDownRight className="w-4 h-4 text-indigo-500" />
                  Cópia Detalhada de Payload Rejeitado / Recebido
                </h4>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedLog.payload, null, 2));
                    alert('Payload copiado para a área de transferência!');
                  }}
                  className="text-[10px] text-indigo-600 hover:underline font-bold cursor-pointer"
                >
                  Copiar JSON completo
                </button>
              </div>
              <pre className="p-4 bg-stone-900 text-stone-200 rounded-xl text-[11px] font-mono leading-relaxed max-h-64 overflow-y-auto select-all whitespace-pre">
                {JSON.stringify(selectedLog.payload, null, 2)}
              </pre>
            </div>

            {/* Footer informational */}
            <p className="text-[10px] text-stone-400 text-center">
              Todos os payloads de integração são monitorados de forma segura sob as diretrizes de LGPD e autenticação HMAC-SHA256 de chaves de API.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
