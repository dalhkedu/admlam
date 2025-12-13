import React, { useState } from 'react';
import { Package, PackageItem } from '../types';
import { suggestPackageItems } from '../services/geminiService';
import { Plus, Trash2, Box, X, Edit2, Wand2, Loader2 } from 'lucide-react';

interface PackageListProps {
  packages: Package[];
  onAddPackage: (pkg: Package) => void;
  onUpdatePackage: (pkg: Package) => void;
  onDeletePackage: (id: string) => void;
}

const emptyPackage: Package = {
  id: '',
  name: '',
  description: '',
  items: []
};

export const PackageList: React.FC<PackageListProps> = ({ packages, onAddPackage, onUpdatePackage, onDeletePackage }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Package>(emptyPackage);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleOpenModal = (pkg?: Package) => {
    if (pkg) {
      setFormData(JSON.parse(JSON.stringify(pkg))); // Deep copy
      setEditingId(pkg.id);
    } else {
      setFormData({
        ...emptyPackage,
        id: crypto.randomUUID(),
        items: [{ id: crypto.randomUUID(), name: '', quantity: 1, unit: 'un' }]
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: crypto.randomUUID(), name: '', quantity: 1, unit: 'un' }]
    }));
  };

  const removeItem = (id: string) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
  };

  const updateItem = (index: number, field: keyof PackageItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleSuggestItems = async () => {
      if(!formData.name || !formData.description) {
          alert("Preencha o nome e a descrição do pacote primeiro.");
          return;
      }

      setIsSuggesting(true);
      try {
          const suggestions = await suggestPackageItems(formData.name, formData.description);
          if (suggestions.length > 0) {
              setFormData(prev => ({
                  ...prev,
                  items: suggestions
              }));
          }
      } catch (error) {
          alert("Erro ao gerar sugestões. Verifique a chave API nas Configurações.");
      } finally {
          setIsSuggesting(false);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdatePackage(formData);
    } else {
      onAddPackage(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Pacotes e Cestas</h1>
           <p className="text-slate-500">Defina os itens padrões para cada tipo de cesta (ex: Cesta de Alimentos, Higiene).</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={18} />
          Novo Pacote
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map(pkg => (
          <div key={pkg.id} className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                   <Box size={24} />
                </div>
                <div className="flex gap-2">
                   <button onClick={() => handleOpenModal(pkg)} className="text-slate-400 hover:text-blue-600">
                     <Edit2 size={18} />
                   </button>
                   <button onClick={() => onDeletePackage(pkg.id)} className="text-slate-400 hover:text-red-500">
                     <Trash2 size={18} />
                   </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800">{pkg.name}</h3>
              <p className="text-sm text-slate-500 mb-4 h-10 line-clamp-2">{pkg.description}</p>
              
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Itens por Família</h4>
                <ul className="space-y-1">
                  {pkg.items.slice(0, 5).map(item => (
                    <li key={item.id} className="text-sm text-slate-700 flex justify-between">
                      <span>{item.name}</span>
                      <span className="font-medium text-slate-500">{item.quantity} {item.unit}</span>
                    </li>
                  ))}
                  {pkg.items.length > 5 && (
                    <li className="text-xs text-indigo-600 font-medium pt-1">
                      + {pkg.items.length - 5} outros itens...
                    </li>
                  )}
                </ul>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 rounded-b-xl text-xs text-slate-500 text-center">
               {pkg.items.length} itens totais
            </div>
          </div>
        ))}
        
        {packages.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 border-dashed">
             <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <Box className="text-slate-400" />
            </div>
            <p className="text-slate-500">Nenhum pacote cadastrado.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Pacote' : 'Novo Pacote'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Nome do Pacote</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Ex: Cesta Básica Completa"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Descrição</label>
                  <textarea 
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Ex: Alimentos não perecíveis para 30 dias."
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-slate-700">Itens do Pacote</h3>
                  <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={handleSuggestItems}
                        disabled={isSuggesting}
                        className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded flex items-center gap-1 hover:bg-purple-200 transition-colors disabled:opacity-50"
                      >
                         {isSuggesting ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14}/>}
                         Sugerir Itens com IA
                      </button>
                      <button type="button" onClick={addItem} className="text-sm text-emerald-600 font-medium hover:underline flex items-center gap-1">
                        <Plus size={14} /> Adicionar Item
                      </button>
                  </div>
                </div>
                
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  {formData.items.map((item, index) => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <input 
                        placeholder="Nome do Item"
                        required
                        className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
                        value={item.name}
                        onChange={e => updateItem(index, 'name', e.target.value)}
                      />
                      <input 
                        type="number"
                        placeholder="Qtd"
                        required
                        min="0.1"
                        step="0.1"
                        className="w-24 border border-slate-300 rounded px-3 py-2 text-sm"
                        value={item.quantity || ''}
                        onChange={e => updateItem(index, 'quantity', e.target.value ? parseFloat(e.target.value) : 0)}
                      />
                       <select
                        className="w-24 border border-slate-300 rounded px-2 py-2 text-sm bg-white text-slate-700"
                        value={item.unit}
                        onChange={e => updateItem(index, 'unit', e.target.value)}
                       >
                         <option value="un">un</option>
                         <option value="kg">kg</option>
                         <option value="lt">lt</option>
                         <option value="pc">pc</option>
                       </select>
                       <button 
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-red-500 p-2"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                  ))}
                  {formData.items.length === 0 && (
                    <p className="text-center text-sm text-slate-400 italic">Adicione itens para compor este pacote.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                 <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors font-medium"
                >
                  Salvar Pacote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};