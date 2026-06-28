import React, { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserProfile } from "../types";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Mail,
  MessageCircle,
  X,
  Folder,
} from "lucide-react";
import { AdminDriveTab } from "./AdminDriveTab";

export function AdminCustomersTab() {
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<UserProfile | null>(
    null,
  );
  const [modalTab, setModalTab] = useState<"info" | "files">("info");

  // Form State
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    fullName: "",
    phone: "",
    document: "",
    zipCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "profiles"),
      (snap) => {
        setCustomers(
          snap.docs.map(
            (d) =>
              ({
                id: d.id,
                userId: d.id,
                ...d.data(),
              }) as unknown as UserProfile,
          ),
        );
      },
      (err) => {
        console.error("Error listening to profiles:", err);
      },
    );
    return () => unsub();
  }, []);

  const handleOpenModal = (customer?: UserProfile) => {
    setModalTab("info");
    if (customer) {
      setEditingCustomer(customer);
      setFormData({ ...customer });
    } else {
      setEditingCustomer(null);
      setFormData({
        fullName: "",
        phone: "",
        document: "",
        zipCode: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docId = editingCustomer?.userId || `manual_${Date.now()}`;
      await setDoc(
        doc(db, "profiles", docId),
        {
          ...formData,
          userId: docId,
          updatedAt: new Date().toISOString(),
          ...(editingCustomer ? {} : { createdAt: new Date().toISOString() }),
        },
        { merge: true },
      );

      alert(editingCustomer ? "Cliente atualizado!" : "Cliente adicionado!");
      handleCloseModal();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar cliente");
    }
  };

  const handleDelete = async (userId: string) => {
    if (
      !window.confirm(
        "Tem certeza que deseja apagar este cliente permanentemente? Histórico, documentos e vínculos podem ser perdidos ou ficar órfãos.",
      )
    ) {
      return;
    }
    try {
      await deleteDoc(doc(db, "profiles", userId));
      alert("Cliente excluído permanentemente");
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir cliente");
    }
  };

  const formatPhoneForWa = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length >= 10 ? `55${cleaned}` : cleaned;
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.document?.includes(searchTerm),
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <div>
          <h2 className="text-xl font-display font-bold text-stone-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" />
            CRM de Clientes
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Gerencie os clientes cadastrados em sua plataforma.
          </p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 sm:px-4 rounded-lg flex items-center gap-2 shadow-sm transition"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:block font-bold text-sm">Adicionar</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredCustomers.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-stone-500 border border-stone-200">
            Nenhum cliente encontrado.
          </div>
        )}
        {filteredCustomers.map((customer) => (
          <div
            key={customer.userId}
            className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl uppercase shrink-0 border border-indigo-100">
                {customer.fullName ? customer.fullName.charAt(0) : "C"}
              </div>
              <div>
                <h3 className="font-bold text-stone-900 leading-tight">
                  {customer.fullName || "Cliente sem nome"}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-stone-500">
                  {customer.phone && (
                    <span className="bg-stone-100 px-2 py-0.5 rounded-full">
                      {customer.phone}
                    </span>
                  )}
                  {customer.document && (
                    <span className="bg-stone-100 px-2 py-0.5 rounded-full">
                      Doc: {customer.document}
                    </span>
                  )}
                  {customer.city && customer.state && (
                    <span className="bg-stone-100 px-2 py-0.5 rounded-full">
                      {customer.city} - {customer.state}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleOpenModal(customer)}
                className="p-2 sm:px-3 text-stone-600 hover:bg-stone-100 rounded-lg flex items-center gap-1.5 transition text-sm font-medium"
              >
                <Edit2 className="w-4 h-4" />{" "}
                <span className="hidden sm:block">Editar</span>
              </button>

              {customer.phone && (
                <a
                  href={`https://wa.me/${formatPhoneForWa(customer.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 sm:px-3 text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center gap-1.5 transition text-sm font-medium"
                  title="Chamar no WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />{" "}
                  <span className="hidden sm:block">WhatsApp</span>
                </a>
              )}

              <a
                href={`mailto:${customer.userId.includes("@") ? customer.userId : ""}`}
                className="p-2 sm:px-3 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1.5 transition text-sm font-medium"
                title="Enviar Email"
              >
                <Mail className="w-4 h-4" />{" "}
                <span className="hidden sm:block">Email</span>
              </a>

              <button
                onClick={() => handleDelete(customer.userId)}
                className="p-2 sm:px-3 text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1.5 transition text-sm font-medium ml-auto sm:ml-0"
              >
                <Trash2 className="w-4 h-4" />{" "}
                <span className="hidden sm:block">Excluir</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-fade-in border border-stone-200"
          >
            <div className="p-4 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-stone-900 flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-indigo-500" />
                  {editingCustomer ? "Detalhes do Cliente" : "Novo Cliente"}
                </h3>

                {editingCustomer && (
                  <div className="flex bg-stone-200 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setModalTab("info")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition ${modalTab === "info" ? "bg-white text-indigo-600 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
                    >
                      Informações
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalTab("files")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 ${modalTab === "files" ? "bg-white text-indigo-600 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
                    >
                      <Folder className="w-3 h-3" />
                      Arquivos (Drive)
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              {modalTab === "info" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">
                      Nome Completo
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">
                      Telefone (WhatsApp)
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">
                      CPF ou CNPJ
                    </label>
                    <input
                      type="text"
                      value={formData.document}
                      onChange={(e) =>
                        setFormData({ ...formData, document: e.target.value })
                      }
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">
                      CEP
                    </label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) =>
                        setFormData({ ...formData, zipCode: e.target.value })
                      }
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-600 mb-1">
                      Rua / Endereço
                    </label>
                    <input
                      type="text"
                      value={formData.street}
                      onChange={(e) =>
                        setFormData({ ...formData, street: e.target.value })
                      }
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">
                      Número
                    </label>
                    <input
                      type="text"
                      value={formData.number}
                      onChange={(e) =>
                        setFormData({ ...formData, number: e.target.value })
                      }
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={formData.complement}
                      onChange={(e) =>
                        setFormData({ ...formData, complement: e.target.value })
                      }
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={formData.neighborhood}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          neighborhood: e.target.value,
                        })
                      }
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">
                      Estado (UF)
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <AdminDriveTab limitToUserId={editingCustomer?.userId} />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 font-bold text-stone-500 hover:text-stone-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
              >
                Salvar Cliente
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
