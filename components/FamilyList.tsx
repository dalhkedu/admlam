import React, { useState } from 'react';
import { Family, Child, ClothingSize } from '../types';
import { parseFamilyData } from '../services/geminiService';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, User, X, Users as UsersIcon, Wand2, Loader2, Sparkles } from 'lucide-react';

interface FamilyListProps {
  families: Family[];
  onAddFamily: (family: Family) => void;
  onUpdateFamily: (family: Family) => void;
  onDeleteFamily: (id: string) => void;
}

const emptyChild: Child = {
  id: '',
  name: '',
  age: 0,
  gender: 'M',
  clothingSize: ClothingSize.INFANTIL_8,
  shoeSize: 30
};

const emptyFamily: Family = {
  id: '',
  responsibleName: '',
  address: '',
  phone: '',
  numberOfAdults: 1,
  status: 'Ativo',
  children: [],
  registrationDate: ''
};

export const FamilyList: React.FC<FamilyListProps> = ({ families, onAddFamily, onUpdateFamily, onDeleteFamily }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [expandedFamilyId, setExpandedFamilyId] = useState<string | null>(null);

  // AI Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Family>(emptyFamily);

  const handleOpenModal = (family?: Family) => {
    if (family) {
      setEditingFamily(family);
      setFormData(JSON.parse(JSON.stringify(family))); // Deep copy
    } else {
      setEditingFamily(null);
      setFormData({
        ...emptyFamily,
        id: crypto.randomUUID(),
        registrationDate: new Date().toISOString(),
        children: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFamily) {
      onUpdateFamily(formData);
    } else {
      onAddFamily(formData);
    }
    setIsModalOpen(false);
  };

  const addChild = () => {
    setFormData(prev => ({
      ...prev,
      children: [...prev.children, { ...emptyChild, id: crypto.randomUUID() }]
    }));
  };

  const removeChild = (childId: string) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.filter(c => c.id !== childId)
    }));
  };

  const updateChild = (index: number, field: keyof Child, value: any) => {
    const newChildren = [...formData.children];
    newChildren[index] = { ...newChildren[index], [field]: value };
    setFormData(prev => ({ ...prev, children: newChildren }));
  };

  const handleAiProcess = async () => {
      if (!aiInputText.trim()) return;
      setIsAiProcessing(true);
      try {
          const result = await parseFamilyData(aiInputText);
          
          const newFamily: Family = {
              ...emptyFamily,
              id: crypto.randomUUID(),
              registrationDate: new Date().toISOString(),
              responsibleName: result.responsibleName || '',
              address: result.address || '',
              phone: result.phone || '',
              numberOfAdults: result.numberOfAdults || 1,
              children: (result.children || []).map((c: any) => ({
                  ...emptyChild,
                  id: crypto.randomUUID(),
                  name: c.name || '',
                  age: c.age || 0,
                  gender: c.gender || 'M',
                  clothingSize: c.clothingSize || '',
                  shoeSize: c.shoeSize || 0,
                  notes: c.notes || ''
              }))
          };
          
          setFormData(newFamily);
          setEditingFamily(null);
          setIsAiModalOpen(false);
          setIsModalOpen(true); // Abre o modal principal com os dados
          setAiInputText('');
      } catch (error) {
          alert("Erro ao processar. Verifique se a chave API está configurada.");
      } finally {
          setIsAiProcessing(false);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Gerenciar Famílias</h1>
           <p className="text-slate-500">Cadastre famílias e seus dependentes.</p>
        </div>
        <div className="flex gap-2">
            <button 
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
            <Sparkles size={18} />
            <span className="hidden md:inline">Cadastrar com IA</span>
            <span className="md:hidden">IA</span>
            </button>
            <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
            <Plus size={18} />
            <span className="hidden md:inline">Nova Família</span>
            <span className="md:hidden">Nova</span>
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Responsável</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm hidden md:table-cell">Endereço</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Telefone</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-center">Composição</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {families.map(family => (
              <React.Fragment key={family.id}>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{family.responsibleName}</div>
                    <div className="text-xs text-slate-500 md:hidden">{family.address}</div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-slate-600 text-sm">{family.address}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{family.phone}</td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => setExpandedFamilyId(expandedFamilyId === family.id ? null : family.id)}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-sm font-medium"
                    >
                      <UsersIcon size={14} />
                      {family.numberOfAdults} Adultos, {family.children.length} Crianças
                      {expandedFamilyId === family.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(family)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => onDeleteFamily(family.id)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-red-600"
                         title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedFamilyId === family.id && (
                  <tr>
                    <td colSpan={5} className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                           <User size={14} /> Detalhes da Composição Familiar
                        </h4>
                        <div className="mb-2 text-sm text-slate-600 px-1">
                          <span className="font-medium">Total de Membros:</span> {family.numberOfAdults + family.children.length} pessoas
                          <span className="mx-2">•</span>
                          <span className="font-medium">Adultos:</span> {family.numberOfAdults}
                          <span className="mx-2">•</span>
                          <span className="font-medium">Cadastro:</span> {new Date(family.registrationDate).toLocaleDateString()}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {family.children.map(child => (
                            <div key={child.id} className="bg-white p-3 rounded border border-slate-200 text-sm shadow-sm">
                              <div className="font-bold text-slate-800 flex justify-between">
                                {child.name} 
                                <span className="text-slate-400 font-normal">{child.age} anos</span>
                              </div>
                              <div className="text-slate-500 text-xs mt-1">
                                <span className="mr-2">Roupa: <strong>{child.clothingSize}</strong></span>
                                <span>Sapato: <strong>{child.shoeSize}</strong></span>
                              </div>
                              {child.notes && <div className="mt-1 text-xs text-amber-600 italic">"{child.notes}"</div>}
                            </div>
                          ))}
                          {family.children.length === 0 && (
                            <p className="text-sm text-slate-400 italic">Nenhuma criança cadastrada.</p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {families.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            Nenhuma família cadastrada ainda.
          </div>
        )}
      </div>

       {/* AI Input Modal */}
       {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
               <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                 <Sparkles className="text-purple-600" /> 
                 Cadastro Rápido com IA
               </h2>
               <button onClick={() => setIsAiModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                 <X size={24} />
               </button>
             </div>
             <div className="p-6 space-y-4">
               <p className="text-sm text-slate-600">
                 Cole um texto informal com os dados da família e a IA irá extrair e preencher o formulário automaticamente.
               </p>
               <textarea 
                 value={aiInputText}
                 onChange={e => setAiInputText(e.target.value)}
                 className="w-full h-32 border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                 placeholder="Ex: Maria Souza, mora na Rua das Rosas 10, tel 9999-1234. Tem 3 filhos: João de 8 anos, Pedro de 5 e Ana de 12."
               />
               <div className="flex justify-end gap-3">
                 <button 
                   onClick={() => setIsAiModalOpen(false)}
                   className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={handleAiProcess}
                   disabled={isAiProcessing || !aiInputText.trim()}
                   className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                 >
                   {isAiProcessing ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                   Processar
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Main Family Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">{editingFamily ? 'Editar Família' : 'Nova Família'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Nome Responsável</label>
                  <input 
                    required
                    type="text" 
                    value={formData.responsibleName} 
                    onChange={e => setFormData({...formData, responsibleName: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Telefone</label>
                  <input 
                    required
                    type="text" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Qtd. Adultos</label>
                  <input 
                    required
                    min="0"
                    type="number" 
                    value={formData.numberOfAdults} 
                    onChange={e => setFormData({...formData, numberOfAdults: parseInt(e.target.value) || 0})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as 'Ativo' | 'Inativo'})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-700 transition-all"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Data Cadastro</label>
                  <input 
                    type="text" 
                    readOnly
                    value={formData.registrationDate ? new Date(formData.registrationDate).toLocaleDateString() : 'Hoje'}
                    className="w-full border border-slate-200 bg-slate-100 text-slate-500 rounded-lg px-3 py-2 outline-none cursor-not-allowed"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-sm font-medium text-slate-700">Endereço</label>
                  <input 
                    required
                    type="text" 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-700">Crianças</h3>
                  <button type="button" onClick={addChild} className="text-sm text-emerald-600 font-medium hover:underline flex items-center gap-1">
                    <Plus size={14} /> Adicionar Criança
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.children.map((child, index) => (
                    <div key={child.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative">
                       <button 
                        type="button" 
                        onClick={() => removeChild(child.id)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="col-span-2">
                           <input 
                            placeholder="Nome"
                            className="w-full text-sm border-slate-300 rounded px-2 py-1.5"
                            value={child.name}
                            onChange={(e) => updateChild(index, 'name', e.target.value)}
                           />
                        </div>
                        <div>
                           <input 
                            type="number"
                            placeholder="Idade"
                            className="w-full text-sm border-slate-300 rounded px-2 py-1.5"
                            value={child.age || ''}
                            onChange={(e) => updateChild(index, 'age', parseInt(e.target.value))}
                           />
                        </div>
                        <div>
                          <select 
                            className="w-full text-sm border-slate-300 rounded px-2 py-1.5 bg-white text-slate-700"
                            value={child.gender}
                            onChange={(e) => updateChild(index, 'gender', e.target.value)}
                          >
                            <option value="M">Masculino</option>
                            <option value="F">Feminino</option>
                          </select>
                        </div>
                        <div>
                          <select 
                            className="w-full text-sm border-slate-300 rounded px-2 py-1.5 bg-white text-slate-700"
                            value={child.clothingSize}
                            onChange={(e) => updateChild(index, 'clothingSize', e.target.value)}
                          >
                            <option value="">Tam. Roupa</option>
                            {Object.values(ClothingSize).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                           <input 
                            type="number"
                            placeholder="Sapato"
                            className="w-full text-sm border-slate-300 rounded px-2 py-1.5"
                            value={child.shoeSize || ''}
                            onChange={(e) => updateChild(index, 'shoeSize', parseInt(e.target.value))}
                           />
                        </div>
                        <div className="col-span-2">
                           <input 
                            placeholder="Observações (opcional)"
                            className="w-full text-sm border-slate-300 rounded px-2 py-1.5"
                            value={child.notes || ''}
                            onChange={(e) => updateChild(index, 'notes', e.target.value)}
                           />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
                  Salvar Família
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};