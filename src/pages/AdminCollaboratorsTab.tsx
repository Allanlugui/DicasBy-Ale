import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Collaborator } from '../types';
import { cleanUndefined } from '../lib/utils';
import { Plus, Trash2, Edit2, UserCheck, Shield, CheckCircle, XCircle, Phone, Mail, Loader2 } from 'lucide-react';

export function AdminCollaboratorsTab() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'SUPPORT' | 'LOGISTICS' | 'PACKAGING' | 'SALES' | 'PURCHASING' | 'OTHER'>('SUPPORT');
  const [receiveQuoteNotifications, setReceiveQuoteNotifications] = useState(false);
  const [active, setActive] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['tickets']);

  const availablePermissions = [
    { key: 'products', label: 'Catálogo de Produtos' },
    { key: 'orders', label: 'Gerenciamento de Pedidos' },
    { key: 'stores', label: 'Cadastro de Lojas' },
    { key: 'tickets', label: 'Chamados & Suporte' },
    { key: 'reviews', label: 'Visualizar Satisfação/Avaliações' },
    { key: 'settings', label: 'Configurações da Empresa' },
    { key: 'team', label: 'Gestão de Colaboradores' }
  ];

  useEffect(() => {
    const q = query(collection(db, 'collaborators'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setCollaborators(snap.docs.map(d => ({ id: d.id, ...d.data() } as Collaborator)));
      setLoading(false);
    }, (err) => {
      console.error('Error fetching collaborators:', err);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handlePermissionToggle = (key: string) => {
    setSelectedPermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert('Por favor, preencha nome e e-mail.');
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const id = cleanEmail;
      const data: Collaborator = {
        id,
        name,
        email: cleanEmail,
        phone,
        role,
        active,
        permissions: selectedPermissions,
        receiveQuoteNotifications,
        createdAt: editingId ? (collaborators.find(c => c.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'collaborators', id), cleanUndefined(data));

      // If we edited an entry that was previously stored under a different ID (like a random uuid), delete the deprecated document
      if (editingId && editingId !== id) {
        try {
          await deleteDoc(doc(db, 'collaborators', editingId));
        } catch (delErr) {
          console.error('Failed to clean up old collaborator document ID:', delErr);
        }
      }

      alert(editingId ? 'Colaborador atualizado!' : 'Colaborador adicionado com sucesso!');
      resetForm();
    } catch (e) {
      console.error('Error saving collaborator:', e);
      alert('Erro ao salvar colaborador.');
    }
  };

  const startEdit = (c: Collaborator) => {
    setEditingId(c.id);
    setName(c.name);
    setEmail(c.email);
    setPhone(c.phone || '');
    setRole(c.role);
    setReceiveQuoteNotifications(!!c.receiveQuoteNotifications);
    setActive(c.active);
    setSelectedPermissions(c.permissions || []);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este colaborador?')) {
      try {
        await deleteDoc(doc(db, 'collaborators', id));
        alert('Colaborador removido.');
      } catch (e) {
        console.error('Error deleting collaborator:', e);
        alert('Erro ao excluir colaborador.');
      }
    }
  };

  const resetForm = () => {
    setEditingId('');
    setName('');
    setEmail('');
    setPhone('');
    setRole('SUPPORT');
    setReceiveQuoteNotifications(false);
    setActive(true);
    setSelectedPermissions(['tickets']);
    setShowForm(false);
  };

  const getRoleBadge = (r: string) => {
    switch (r) {
      case 'ADMIN': return 'bg-stone-900 text-white';
      case 'SUPPORT': return 'bg-sky-100 text-sky-800';
      case 'LOGISTICS': return 'bg-amber-100 text-amber-800';
      case 'PACKAGING': return 'bg-purple-100 text-purple-800';
      case 'SALES': return 'bg-emerald-100 text-emerald-800';
      case 'PURCHASING': return 'bg-rose-100 text-rose-800';
      default: return 'bg-stone-100 text-stone-800';
    }
  };

  const getRoleLabel = (r: string) => {
    switch (r) {
      case 'ADMIN': return 'Administrador';
      case 'SUPPORT': return 'Atendimento/Suporte';
      case 'LOGISTICS': return 'Logística/Despacho';
      case 'PACKAGING': return 'Embalador/Separador';
      case 'SALES': return 'Vendas/Comercial';
      case 'PURCHASING': return 'Área de Compras';
      default: return 'Outro';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in" id="collaborators-tab-container">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-rose-500" />
            Equipe e Colaboradores
          </h2>
          <p className="text-xs text-stone-500">Cadastre e delegue funções específicas para sua equipe</p>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm shadow-rose-100"
          >
            <Plus className="w-4 h-4" /> Adicionar Colaborador
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6 max-w-2xl shadow-sm transition">
          <div className="flex justify-between items-center border-b border-stone-100 pb-4">
            <h3 className="font-bold text-stone-900 text-md">
              {editingId ? 'Editar Colaborador' : 'Cadastrar Novo Membro'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-bold text-stone-500 hover:text-stone-800 border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-50"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Nome Completo</label>
              <input
                required
                type="text"
                placeholder="Ex: Carlos Silva"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-sm rounded-xl border border-stone-200 px-3.5 py-2.5 focus:border-rose-500 focus:ring-rose-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">E-mail Profissional</label>
              <input
                required
                type="email"
                placeholder="Ex: carlos@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full text-sm rounded-xl border border-stone-200 px-3.5 py-2.5 focus:border-rose-500 focus:ring-rose-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Telefone/WhatsApp</label>
              <input
                type="tel"
                placeholder="Ex: (11) 99999-9999"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full text-sm rounded-xl border border-stone-200 px-3.5 py-2.5 focus:border-rose-500 focus:ring-rose-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Cargo / Função Principal</label>
              <select
                value={role}
                onChange={e => {
                  const val = e.target.value as any;
                  setRole(val);
                  if (val === 'PURCHASING' || val === 'ADMIN') {
                    setReceiveQuoteNotifications(true);
                  }
                }}
                className="w-full text-sm rounded-xl border border-stone-200 px-3.5 py-2.5 focus:border-rose-500 focus:ring-rose-500 outline-none"
              >
                <option value="SUPPORT">Atendimento / Suporte</option>
                <option value="LOGISTICS">Logística / Despacho</option>
                <option value="PACKAGING">Embalador / Separador</option>
                <option value="SALES">Venda / Comercial</option>
                <option value="PURCHASING">Área de Compras / Cotações</option>
                <option value="ADMIN">Administrador Geral</option>
                <option value="OTHER">Outros</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-stone-600 uppercase">Delegar Permissões (Funções no Sistema)</label>
            <p className="text-xs text-stone-400 mt-1">Marque cada módulo do sistema que este colaborador será autorizado a gerenciar</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-100">
              {availablePermissions.map(p => (
                <label key={p.key} className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-stone-200 hover:bg-stone-50 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(p.key)}
                    onChange={() => handlePermissionToggle(p.key)}
                    className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                  />
                  <span className="text-sm font-medium text-stone-700">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-stone-600 uppercase">Preferências de Notificação</label>
            <p className="text-xs text-stone-400 mt-1">Configure o recebimento de alertas automáticos para este colaborador</p>
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
              <label className="flex items-start gap-3 px-3 py-3 bg-white rounded-xl border border-stone-200 hover:bg-stone-50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={receiveQuoteNotifications}
                  onChange={(e) => setReceiveQuoteNotifications(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 h-4.5 w-4.5 mt-0.5"
                />
                <div>
                  <span className="text-sm font-bold text-stone-700 block">Solicitações de Orçamentos (Compras)</span>
                  <span className="text-xs text-stone-400 block mt-0.5">Receber e-mails e resumos em tempo real sempre que um cliente fizer uma nova solicitação de orçamento de importação.</span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-600 uppercase">Status da Conta:</span>
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={`text-xs font-black px-3 py-1.5 rounded-lg transition-colors ${
                  active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {active ? 'ATIVO' : 'INATIVO'}
              </button>
            </div>

            <button
              type="submit"
              className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition"
            >
              {editingId ? 'Salvar Edições' : 'Cadastrar Colaborador'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-12 text-center text-stone-400 flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-stone-300" />
          <span>Carregando lista de colaboradores...</span>
        </div>
      ) : collaborators.length === 0 ? (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-12 text-center text-stone-500">
          <Shield className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <p className="font-bold text-stone-800 text-sm">Nenhum colaborador registrado</p>
          <p className="text-xs text-stone-400 mt-1">Sua empresa ainda não possui colaboradores registrados neste sistema.</p>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-500 tracking-wider">
                  <th className="p-4 pl-6">Colaborador</th>
                  <th className="p-4">Cargo / Função</th>
                  <th className="p-4">Permissões Habilitadas</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {collaborators.map(c => (
                  <tr key={c.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-stone-100 font-black text-stone-600 flex items-center justify-center border border-stone-200 text-xs shadow-sm uppercase">
                          {c.name.substring(0, 2)}
                        </div>
                        <div>
                          <span className="font-bold text-stone-900 block leading-tight">{c.name}</span>
                          <span className="text-xs text-stone-400 block mt-0.5">{c.email}</span>
                          {c.phone && <span className="text-[11px] text-stone-400 block mt-0.5">{c.phone}</span>}
                          {c.receiveQuoteNotifications && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 bg-rose-50 border border-rose-100 rounded-md px-1.5 py-0.5 mt-1 font-bold">
                              🔔 Alertas de Compras
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getRoleBadge(c.role)}`}>
                        {getRoleLabel(c.role)}
                      </span>
                    </td>
                    <td className="p-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {c.permissions && c.permissions.length > 0 ? (
                          c.permissions.map(p => {
                            const found = availablePermissions.find(ap => ap.key === p);
                            return (
                              <span key={p} className="bg-stone-100 border border-stone-200 text-stone-600 text-[10px] font-bold px-1.5 py-0.5 rounded-lg">
                                {found?.label || p}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-stone-400 text-xs italic">Nenhuma permissão</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {c.active ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs"><CheckCircle className="w-4 h-4" /> Ativo</span>
                      ) : (
                        <span className="flex items-center gap-1 text-stone-400 font-bold text-xs"><XCircle className="w-4 h-4" /> Inativo</span>
                      )}
                    </td>
                    <td className="p-4 text-right pr-6">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => startEdit(c)}
                          className="p-1 px-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 hover:text-stone-900 rounded-lg text-xs font-bold transition flex gap-1 items-center cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 hover:text-rose-900 rounded-lg text-xs font-bold transition flex gap-1 items-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
