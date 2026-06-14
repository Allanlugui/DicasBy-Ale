import React, { useState, useMemo } from 'react';
import { Folder, File as FileIcon, ChevronRight, Plus, Trash2, Download, Image as ImageIcon, FileText, FileArchive, FolderOpen, MoreVertical, Edit2, CornerUpLeft, CornerDownRight } from 'lucide-react';
import { useAppContext } from '../context';
import { DriveFolder, FileDocument, Order } from '../types';
import { ImageInput } from '../components/ImageInput';

export function AdminDriveTab({ limitToUserId }: { limitToUserId?: string }) {
  const { folders: allFolders, documents: allDocuments, createFolder, deleteFolder, updateFolder, createDocument, deleteDocument, updateDocument, orders } = useAppContext();
  
  // Filter by user if requested
  const folders = useMemo(() => limitToUserId ? allFolders.filter(f => f.userId === limitToUserId || f.id === `root_${limitToUserId}` || f.parentId?.startsWith(`root_${limitToUserId}`)) : allFolders, [allFolders, limitToUserId]);
  const documents = useMemo(() => limitToUserId ? allDocuments.filter(d => d.userId === limitToUserId) : allDocuments, [allDocuments, limitToUserId]);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('Outros');
  const [uploadDocName, setUploadDocName] = useState('');
  const [uploadDocUrl, setUploadDocUrl] = useState('');

  // Move Modal State
  const [movingItem, setMovingItem] = useState<{ id: string; type: 'folder' | 'document' } | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string | 'root'>('root');

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const crumbs: DriveFolder[] = [];
    let currentId = currentFolderId;
    while (currentId) {
      const f = folders.find(f => f.id === currentId);
      if (f) {
        crumbs.unshift(f);
        currentId = f.parentId;
      } else {
        break;
      }
    }
    return crumbs;
  }, [currentFolderId, folders]);

  // Current items
  const currentFolders = folders.filter(f => f.parentId === currentFolderId);
  const currentDocuments = documents.filter(d => (d.folderId || null) === currentFolderId);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    
    // Check for duplicate folder name in the current view
    if (folders.some(f => f.name.toLowerCase() === newFolderName.trim().toLowerCase() && f.parentId === currentFolderId)) {
       alert('Já existe uma pasta com este nome neste diretório.');
       return;
    }

    await createFolder(newFolderName.trim(), currentFolderId);
    setNewFolderName('');
    setShowCreateFolder(false);
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadDocName.trim() || !uploadDocUrl) return;
    await createDocument({
      name: uploadDocName.trim(),
      type: uploadDocType,
      url: uploadDocUrl,
      folderId: currentFolderId || undefined,
    });
    setUploadDocName('');
    setUploadDocUrl('');
    setShowUploadDoc(false);
  };

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingItem) return;
    const finalTargetId = targetFolderId === 'root' ? null : targetFolderId;
    
    if (movingItem.type === 'folder') {
       if (movingItem.id === finalTargetId) return; // cannot move to itself
       await updateFolder(movingItem.id, { parentId: finalTargetId });
    } else {
       await updateDocument(movingItem.id, { folderId: finalTargetId || undefined });
    }
    setMovingItem(null);
  };

  const getFileIcon = (type: string) => {
    if (type.toLowerCase().includes('pdf')) return <FileText className="w-8 h-8 text-rose-500" />;
    if (type.toLowerCase().includes('zip')) return <FileArchive className="w-8 h-8 text-amber-500" />;
    return <ImageIcon className="w-8 h-8 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-stone-200">
        
        {/* Breadcrumbs Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap text-sm font-medium w-full md:w-auto">
          <button 
            onClick={() => setCurrentFolderId(null)}
            className={`flex items-center gap-1 hover:text-stone-900 transition ${!currentFolderId ? 'text-stone-900 font-bold' : 'text-stone-500'}`}
          >
            <FolderOpen className="w-4 h-4" />
            Raiz
          </button>
          
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <ChevronRight className="w-4 h-4 text-stone-300 shrink-0" />
              <button 
                onClick={() => setCurrentFolderId(crumb.id)}
                className={`hover:text-stone-900 transition ${idx === breadcrumbs.length - 1 ? 'text-stone-900 font-bold' : 'text-stone-500'}`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => setShowCreateFolder(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition"
          >
            <Folder className="w-4 h-4" />
            Nova Pasta
          </button>
          <button 
            onClick={() => setShowUploadDoc(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            Adicionar Arquivo
          </button>
        </div>
      </div>

      {showCreateFolder && (
        <form onSubmit={handleCreateFolder} className="bg-white p-4 rounded-xl border border-stone-200 flex gap-3 items-end animate-fade-in">
          <div className="flex-grow">
            <label className="block text-xs font-bold text-stone-600 mb-1">Nome da Pasta</label>
            <input 
              type="text" 
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Ex: João da Silva, Recibos 2024..."
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-400 bg-stone-50"
              autoFocus
            />
          </div>
          <button type="submit" className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-stone-800 transition">
            Criar
          </button>
          <button type="button" onClick={() => setShowCreateFolder(false)} className="bg-white text-stone-500 border border-stone-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-stone-50 transition">
            Cancelar
          </button>
        </form>
      )}

      {showUploadDoc && (
        <form onSubmit={handleUploadDoc} className="bg-white p-5 rounded-2xl border border-stone-200 space-y-4 animate-fade-in shadow-sm">
          <h3 className="font-bold text-stone-900 border-b border-stone-100 pb-2">Novo Documento</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">Nome / Identificação</label>
              <input 
                type="text" 
                value={uploadDocName}
                onChange={e => setUploadDocName(e.target.value)}
                placeholder="Ex: Comprovante de Pagamento.png"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-400 bg-stone-50"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">Categoria / Tipo</label>
              <select 
                value={uploadDocType}
                onChange={e => setUploadDocType(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-400 bg-stone-50"
              >
                <option value="Recibo">Recibo</option>
                <option value="Comprovante de Pagamento">Comprovante de Pagamento</option>
                <option value="Nota Fiscal">Nota Fiscal</option>
                <option value="Relatório">Relatório</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>
          
          <div>
            <ImageInput 
              label="Arquivo do Documento"
              value={uploadDocUrl}
              onChange={setUploadDocUrl}
              placeholder="Cole a URL ou carregue/fotografe..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
             <button type="button" onClick={() => setShowUploadDoc(false)} className="bg-white text-stone-500 border border-stone-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-stone-50 transition">
              Cancelar
            </button>
             <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition">
              Salvar Documento
            </button>
          </div>
        </form>
      )}

      {/* Explorer Grid */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 min-h-[400px]">
        
        {breadcrumbs.length > 0 && (
          <div className="mb-6 pb-4 border-b border-stone-100">
             <button 
                onClick={() => setCurrentFolderId(breadcrumbs[breadcrumbs.length - 2]?.id || null)}
                className="flex items-center gap-1.5 text-stone-500 hover:text-stone-900 transition text-sm font-medium"
             >
                <CornerUpLeft className="w-4 h-4" />
                Voltar um nível
             </button>
          </div>
        )}

        {currentFolders.length === 0 && currentDocuments.length === 0 && (
          <div className="flex flex-col justify-center items-center h-48 text-stone-400 space-y-3">
             <FolderOpen className="w-12 h-12 text-stone-200" />
             <p className="text-sm font-medium">Esta pasta está vazia.</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          
          {/* Folders */}
          {currentFolders.map(folder => (
            <div 
              key={folder.id} 
              className="group relative flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-200 cursor-pointer transition select-none"
              onClick={() => setCurrentFolderId(folder.id)}
            >
              <div className="relative">
                <Folder className="w-16 h-16 text-indigo-200 fill-indigo-100 group-hover:scale-105 transition" />
              </div>
              <span className="text-xs font-bold text-stone-700 text-center line-clamp-2 w-full px-1">{folder.name}</span>
              
              <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                <button 
                  onClick={(e) => { e.stopPropagation(); setMovingItem({ id: folder.id, type: 'folder' }); }}
                  className="p-1.5 bg-white/90 hover:bg-white text-stone-500 hover:text-indigo-600 rounded-lg shadow-sm backdrop-blur-sm"
                  title="Mover Pasta"
                >
                  <CornerDownRight className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                  className="p-1.5 bg-white/90 hover:bg-white text-stone-500 hover:text-rose-600 rounded-lg shadow-sm backdrop-blur-sm"
                  title="Excluir Pasta"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Documents */}
          {currentDocuments.map(doc => (
            <div 
              key={doc.id}
              className="group relative flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-200 cursor-pointer transition select-none"
              onClick={() => window.open(doc.url, '_blank')}
            >
                <div className="w-16 h-16 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center group-hover:scale-105 transition overflow-hidden">
                  {doc.url.startsWith('http') || doc.url.startsWith('data:image') ? (
                     <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                     getFileIcon(doc.type)
                  )}
                </div>
               <div className="w-full text-center">
                 <span className="text-xs font-bold text-stone-700 block truncate" title={doc.name}>{doc.name}</span>
                 <span className="text-[9px] text-stone-400 font-medium uppercase">{doc.type}</span>
               </div>

               <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                  <a 
                    href={doc.url}
                    download={doc.name}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 bg-white/90 hover:bg-white text-stone-500 hover:text-indigo-600 rounded-lg shadow-sm backdrop-blur-sm"
                    title="Baixar"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setMovingItem({ id: doc.id, type: 'document' }); }}
                    className="p-1.5 bg-white/90 hover:bg-white text-stone-500 hover:text-indigo-600 rounded-lg shadow-sm backdrop-blur-sm"
                    title="Mover"
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteDocument(doc.id); }}
                    className="p-1.5 bg-white/90 hover:bg-white text-stone-500 hover:text-rose-600 rounded-lg shadow-sm backdrop-blur-sm"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
               </div>
            </div>
          ))}

        </div>
      </div>

      {/* Move Modal */}
      {movingItem && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleMove} className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-fade-in border border-stone-200">
             <div className="p-4 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
               <h3 className="font-bold text-stone-900 flex items-center gap-2">
                 <CornerDownRight className="w-5 h-5 text-indigo-500" />
                 Mover Item
               </h3>
             </div>
             
             <div className="p-5 space-y-4">
                <p className="text-sm text-stone-600 bg-stone-50 border border-stone-200 p-3 rounded-lg">
                  Escolha o novo destino para o item selecionado.
                </p>

                <div>
                   <label className="block text-xs font-bold text-stone-600 mb-1">Destino (Pasta)</label>
                   <select 
                      value={targetFolderId}
                      onChange={e => setTargetFolderId(e.target.value)}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 bg-white"
                      size={8}
                   >
                     <option value="root">📂 / (Raiz principal)</option>
                     {folders.map(f => (
                       <option key={f.id} value={f.id} disabled={movingItem.type === 'folder' && f.id === movingItem.id}>
                         {Array((breadcrumbs.length > 0 ? 1 : 0) + 1).fill('—').join('')} 📁 {f.name}
                       </option>
                     ))}
                   </select>
                </div>
             </div>

             <div className="p-4 border-t border-stone-100 flex justify-end gap-2 bg-stone-50">
                <button type="button" onClick={() => setMovingItem(null)} className="px-4 py-2 text-sm font-bold text-stone-500 hover:text-stone-700 transition">Cancelar</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition">Mover Item</button>
             </div>
          </form>
        </div>
      )}
    </div>
  );
}
