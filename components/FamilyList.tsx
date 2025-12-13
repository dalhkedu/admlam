import React, { useState, useEffect } from 'react';
import { Family, Child, ClothingSize } from '../types';
import { parseFamilyData } from '../services/geminiService';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, User, X, Users as UsersIcon, Wand2, Loader2, Sparkles, Search, MapPin, Baby, CreditCard, GraduationCap, AlertCircle, Calendar } from 'lucide-react';

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
  birthDate: '',
  gender: 'M',
  clothingSize: ClothingSize.INFANTIL_8,
  shoeSize: 30,
  isStudent: true,
  schoolYear: '',
  hasDisability: false,
  disabilityDetails: ''
};

const emptyFamily: Family = {
  id: '',
  responsibleName: '',
  rg: '',
  cpf: '',
  responsibleBirthDate: '',
  maritalStatus: 'Solteira(o)',
  spouseName: '',
  address: '',
  phone: '',
  numberOfAdults: 1,
  status: 'Ativo',
  children: [],
  registrationDate: '',
  isPregnant: false,
  pregnancyDueDate: '',
  cardId: ''
};

// CPF Validation Helper
const isValidCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf == '') return false;
    // Elimina CPFs invalidos conhecidos
    if (cpf.length != 11 || 
        cpf == "00000000000" || 
        cpf == "11111111111" || 
        cpf == "22222222222" || 
        cpf == "33333333333" || 
        cpf == "44444444444" || 
        cpf == "55555555555" || 
        cpf == "66666666666" || 
        cpf == "77777777777" || 
        cpf == "88888888888" || 
        cpf == "99999999999")
            return false;
    
    // Valida 1o digito
    let add = 0;
    for (let i = 0; i < 9; i++) 
        add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev == 10 || rev == 11) 
        rev = 0;
    if (rev != parseInt(cpf.charAt(9))) 
        return false;
    
    // Valida 2o digito
    add = 0;
    for (let i = 0; i < 10; i++) 
        add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev == 10 || rev == 11) 
        rev = 0;
    if (rev != parseInt(cpf.charAt(10))) 
        return false;
        
    return true;
};

export const FamilyList: React.FC<FamilyListProps> = ({ families, onAddFamily, onUpdateFamily, onDeleteFamily }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [expandedFamilyId, setExpandedFamilyId] = useState<string | null>(null);

  // AI Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState<Family>(emptyFamily);

  // Address Helper State
  const [cep, setCep] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressDetails, setAddressDetails] = useState({
    logradouro: '',
    bairro: '',
    localidade: '',
    uf: ''
  });
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const filteredFamilies = families.filter(family => 
    family.responsibleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (family.cardId && family.cardId.toLowerCase().includes(searchQuery.toLowerCase())) ||
    family.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (family?: Family) => {
    // Reset address helper states
    setCep('');
    setAddressNumber('');
    setAddressComplement('');
    setAddressDetails({ logradouro: '', bairro: '', localidade: '', uf: '' });

    if (family) {
      setEditingFamily(family);
      setFormData(JSON.parse(JSON.stringify(family))); // Deep copy
    } else {
      // Generate next Card ID suggestion
      const nextId = families.length + 1;
      const year = new Date().getFullYear().toString().slice(-2);
      
      setEditingFamily(null);
      setFormData({
        ...emptyFamily,
        id: crypto.randomUUID(),
        cardId: `${String(nextId).padStart(3, '0')}/${year}`,
        registrationDate: new Date().toISOString(),
        children: []
      });
    }
    setIsModalOpen(true);
  };

  // Effect to construct full address when parts change
  useEffect(() => {
    if (addressDetails.logradouro) {
      const fullAddress = `${addressDetails.logradouro}, ${addressNumber}${addressComplement ? ' ' + addressComplement : ''} - ${addressDetails.bairro}, ${addressDetails.localidade}/${addressDetails.uf}`;
      setFormData(prev => ({ ...prev, address: fullAddress }));
    }
  }, [addressDetails, addressNumber, addressComplement]);

  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setAddressDetails({
          logradouro: data.logradouro,
          bairro: data.bairro,
          localidade: data.localidade,
          uf: data.uf
        });
      } else {
        alert("CEP não encontrado.");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP", error);
      alert("Erro ao buscar CEP.");
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de CPF
    if (formData.cpf && formData.cpf.length > 0) {
        if (!isValidCPF(formData.cpf)) {
            alert("CPF Inválido. Por favor verifique o número digitado.");
            return;
        }
    }

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
    
    // Auto calculate age if birthDate changes
    if (field === 'birthDate' && value) {
        const birth = new Date(value);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        newChildren[index].age = age;
    }

    setFormData(prev => ({ ...prev, children: newChildren }));
  };

  const handleAiProcess = async () => {
      if (!aiInputText.trim()) return;
      setIsAiProcessing(true);
      try {
          const result = await parseFamilyData(aiInputText);
          
          const nextId = families.length + 1;
          const year = new Date().getFullYear().toString().slice(-2);

          const newFamily: Family = {
              ...emptyFamily,
              id: crypto.randomUUID(),
              cardId: `${String(nextId).padStart(3, '0')}/${year}`,
              registrationDate: new Date().toISOString(),
              responsibleName: result.responsibleName || '',
              rg: result.rg || '',
              cpf: result.cpf || '',
              responsibleBirthDate: result.responsibleBirthDate || '',
              maritalStatus: (result.maritalStatus as any) || 'Solteira(o)',
              spouseName: result.spouseName || '',
              address: result.address || '',
              phone: result.phone || '',
              numberOfAdults: result.numberOfAdults || 1,
              isPregnant: result.isPregnant || false,
              pregnancyDueDate: result.pregnancyDueDate || '',
              children: (result.children || []).map((c: any) => ({
                  ...emptyChild,
                  id: crypto.randomUUID(),
                  name: c.name || '',
                  age: c.age || 0,
                  birthDate: c.birthDate || '',
                  gender: c.gender || 'M',
                  clothingSize: c.clothingSize || '',
                  shoeSize: c.shoeSize || 0,
                  isStudent: c.isStudent !== undefined ? c.isStudent : true,
                  schoolYear: c.schoolYear || '',
                  hasDisability: c.hasDisability || false,
                  disabilityDetails: c.disabilityDetails || '',
                  notes: c.notes || ''
              }))
          };
          
          setFormData(newFamily);
          setEditingFamily(null);
          setIsAiModalOpen(false);
          setIsModalOpen(true); 
          setAiInputText('');
      } catch (error) {
          alert("Erro ao processar. Verifique se a chave API está configurada.");
      } finally {
          setIsAiProcessing(false);
      }
  };

  const showSpouseField = ['Casada(o)', 'União Estável', 'Outro'].includes(formData.maritalStatus || '');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Gerenciar Famílias</h1>
           <p className="text-slate-500">Cadastro completo dos assistidos.</p>
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

      {/* Barra de Busca */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome, carteirinha ou endereço..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all text-slate-900 bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Carteirinha</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Responsável</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm hidden md:table-cell">Endereço</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-center">Composição</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredFamilies.map(family => (
              <React.Fragment key={family.id}>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono font-medium text-indigo-600">
                    {family.cardId || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{family.responsibleName}</span>
                        {family.isPregnant && (
                            <span className="inline-flex items-center justify-center p-1 rounded-full bg-pink-100 text-pink-600" title="Gestante na família">
                                <Baby size={14} />
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-slate-500 md:hidden">{family.address}</div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-slate-600 text-sm">{family.address}</td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => setExpandedFamilyId(expandedFamilyId === family.id ? null : family.id)}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-sm font-medium"
                    >
                      <UsersIcon size={14} />
                      {family.numberOfAdults} Adt
                      <span className="mx-1">•</span>
                      {family.children.length === 0 && family.isPregnant ? 'Gestante' : `${family.children.length} Cri`}
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
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded border border-slate-200">
                            <div>
                                <h4 className="font-semibold text-slate-700 text-sm mb-2 flex items-center gap-2">
                                    <User size={14} /> Dados do Responsável
                                </h4>
                                <div className="text-sm space-y-1 text-slate-600">
                                    <p><span className="font-medium">CPF:</span> {family.cpf || '-'}</p>
                                    <p><span className="font-medium">RG:</span> {family.rg || '-'}</p>
                                    <p><span className="font-medium">Data Nasc:</span> {family.responsibleBirthDate ? new Date(family.responsibleBirthDate).toLocaleDateString() : '-'}</p>
                                    <p><span className="font-medium">Estado Civil:</span> {family.maritalStatus}</p>
                                    {family.spouseName && <p><span className="font-medium">Cônjuge:</span> {family.spouseName}</p>}
                                </div>
                            </div>
                             <div>
                                <h4 className="font-semibold text-slate-700 text-sm mb-2 flex items-center gap-2">
                                    <MapPin size={14} /> Contato e Moradia
                                </h4>
                                <div className="text-sm space-y-1 text-slate-600">
                                    <p><span className="font-medium">Telefone:</span> {family.phone}</p>
                                    <p><span className="font-medium">Endereço:</span> {family.address}</p>
                                    <p><span className="font-medium">Pessoas na casa:</span> {family.numberOfAdults + family.children.length}</p>
                                    <p><span className="font-medium">Data Cadastro:</span> {new Date(family.registrationDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        {family.isPregnant && (
                            <div className="bg-pink-50 border border-pink-100 p-3 rounded-lg flex items-center gap-3">
                                <div className="p-2 bg-pink-100 rounded-full text-pink-500">
                                    <Baby size={20} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-pink-700">Gestante na Família</div>
                                    <div className="text-xs text-pink-600">
                                        {family.pregnancyDueDate 
                                          ? `Previsão do parto: ${new Date(family.pregnancyDueDate).toLocaleDateString()}` 
                                          : 'Data prevista do parto não informada.'
                                        }
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <h4 className="font-semibold text-slate-700 text-sm mb-2">Filhos / Crianças</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {family.children.map(child => (
                                <div key={child.id} className="bg-white p-3 rounded border border-slate-200 text-sm shadow-sm relative overflow-hidden">
                                {child.hasDisability && (
                                    <div className="absolute top-0 right-0 bg-orange-100 text-orange-600 px-2 py-0.5 text-[10px] font-bold rounded-bl">
                                        PCD
                                    </div>
                                )}
                                <div className="font-bold text-slate-800 flex justify-between pr-8">
                                    {child.name} 
                                    <span className="text-slate-400 font-normal">{child.age} anos</span>
                                </div>
                                <div className="text-slate-500 text-xs mt-1 space-y-0.5">
                                    <div>Nasc: {child.birthDate ? new Date(child.birthDate).toLocaleDateString() : '-'}</div>
                                    <div className="flex gap-2">
                                        <span>Roupa: <strong>{child.clothingSize}</strong></span>
                                        <span>Sapato: <strong>{child.shoeSize}</strong></span>
                                    </div>
                                    {child.isStudent && (
                                        <div className="text-emerald-600 flex items-center gap-1">
                                            <GraduationCap size={12}/> Estudante ({child.schoolYear})
                                        </div>
                                    )}
                                    {child.hasDisability && (
                                         <div className="text-orange-600 flex items-center gap-1">
                                            <AlertCircle size={12}/> {child.disabilityDetails}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded">
                                   <span className="font-semibold">Obs:</span> {child.notes || 'Nenhuma'}
                                </div>
                                </div>
                            ))}
                            {family.children.length === 0 && (
                                <p className="text-sm text-slate-400 italic">Nenhuma criança cadastrada.</p>
                            )}
                            </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {filteredFamilies.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            {searchQuery ? 'Nenhuma família encontrada para os termos da busca.' : 'Nenhuma família cadastrada ainda.'}
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
                 Descreva a família ou cole o texto do formulário. A IA preencherá campos como RG, CPF, Cônjuge e detalhes das crianças.
               </p>
               <textarea 
                 value={aiInputText}
                 onChange={e => setAiInputText(e.target.value)}
                 className="w-full h-32 border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-slate-900 bg-white"
                 placeholder="Ex: Responsável Maria da Silva, CPF 123.456.789-00, RG 1234567. Casada com João. Tem um filho Pedro, nascido em 20/05/2015, autista, calça 36..."
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">{editingFamily ? 'Editar Família' : 'Nova Família'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-8">
              
              {/* Seção 1: Dados Pessoais do Responsável */}
              <section>
                 <h3 className="text-base font-semibold text-emerald-800 bg-emerald-50 p-2 rounded mb-4 flex items-center gap-2">
                    <User size={18}/> 1. Responsável / Assistido
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 space-y-1">
                        <label className="text-xs font-medium text-slate-600">Nome Completo</label>
                        <input 
                            required
                            type="text" 
                            value={formData.responsibleName} 
                            onChange={e => setFormData({...formData, responsibleName: e.target.value})}
                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Nº Carteirinha</label>
                        <input 
                            type="text" 
                            value={formData.cardId} 
                            onChange={e => setFormData({...formData, cardId: e.target.value})}
                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-slate-900 bg-white"
                            placeholder="000/00"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Data Nasc.</label>
                        <input 
                            type="date" 
                            value={formData.responsibleBirthDate} 
                            onChange={e => setFormData({...formData, responsibleBirthDate: e.target.value})}
                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">RG</label>
                        <input 
                            type="text" 
                            value={formData.rg} 
                            onChange={e => setFormData({...formData, rg: e.target.value})}
                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                            placeholder="00.000.000-0"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">CPF</label>
                        <input 
                            type="text" 
                            value={formData.cpf} 
                            onChange={e => setFormData({...formData, cpf: e.target.value})}
                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                            placeholder="000.000.000-00"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Estado Civil</label>
                        <select 
                            value={formData.maritalStatus} 
                            onChange={e => setFormData({...formData, maritalStatus: e.target.value as any})}
                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white outline-none text-slate-900"
                        >
                            <option value="Solteira(o)">Solteira(o)</option>
                            <option value="Casada(o)">Casada(o)</option>
                            <option value="União Estável">União Estável</option>
                            <option value="Divorciada(o)">Divorciada(o)</option>
                            <option value="Viúva(o)">Viúva(o)</option>
                            <option value="Outro">Outro</option>
                        </select>
                    </div>
                     {showSpouseField && (
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-xs font-medium text-slate-600">Nome do Cônjuge</label>
                            <input 
                                type="text" 
                                value={formData.spouseName} 
                                onChange={e => setFormData({...formData, spouseName: e.target.value})}
                                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                            />
                        </div>
                     )}
                 </div>
              </section>

              {/* Seção 2: Contato e Endereço */}
              <section>
                 <h3 className="text-base font-semibold text-emerald-800 bg-emerald-50 p-2 rounded mb-4 flex items-center gap-2">
                    <MapPin size={18}/> 2. Endereço e Contato
                 </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Telefone</label>
                        <input 
                            required
                            type="text" 
                            value={formData.phone} 
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Pessoas na Casa (Adultos)</label>
                        <input 
                            type="number" 
                            min="1"
                            value={formData.numberOfAdults} 
                            onChange={e => setFormData({...formData, numberOfAdults: parseInt(e.target.value) || 0})}
                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                        />
                    </div>
                     
                     {/* CEP Helper */}
                     <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">CEP (Busca Auto)</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="00000-000"
                          value={cep} 
                          onChange={e => setCep(e.target.value)}
                          onBlur={handleCepBlur}
                          className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                        />
                        <div className="absolute right-2 top-2.5 text-slate-400">
                          {isLoadingCep ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        </div>
                      </div>
                    </div>
                    
                    <div className="md:col-span-3 space-y-1">
                        <label className="text-xs font-medium text-slate-600">Endereço Completo</label>
                        <input 
                            required
                            type="text" 
                            value={formData.address} 
                            onChange={e => setFormData({...formData, address: e.target.value})}
                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                            placeholder="Rua, Número, Bairro, Cidade (use o CEP para preencher parte)"
                        />
                        {addressDetails.logradouro && (
                            <p className="text-[10px] text-slate-400">
                                Sugestão do CEP: {addressDetails.logradouro}, {addressDetails.bairro} - {addressDetails.localidade}/{addressDetails.uf}
                            </p>
                        )}
                    </div>
                  </div>
              </section>

              {/* Seção 3: Gestante */}
              <div className="bg-pink-50 p-4 rounded-lg border border-pink-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-100 rounded-full text-pink-600">
                        <Baby size={20} />
                    </div>
                    <div>
                        <span className="font-semibold text-slate-700 block text-sm">Gestante na Família?</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.isPregnant || false}
                            onChange={e => setFormData({...formData, isPregnant: e.target.checked})}
                            className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Sim</span>
                    </label>
                    {formData.isPregnant && (
                        <div className="flex flex-col">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Previsão Parto</label>
                            <input
                                type="date"
                                required={formData.isPregnant}
                                value={formData.pregnancyDueDate || ''}
                                onChange={e => setFormData({...formData, pregnancyDueDate: e.target.value})}
                                className="border border-pink-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-pink-500 text-slate-900 bg-white shadow-sm"
                            />
                        </div>
                    )}
                </div>
              </div>

              {/* Seção 4: Crianças */}
              <section>
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-emerald-800 bg-emerald-50 p-2 rounded flex items-center gap-2">
                        <UsersIcon size={18}/> 3. Filhos / Crianças
                    </h3>
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
                      
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <div className="col-span-2 md:col-span-3">
                           <label className="block text-xs font-medium text-slate-500 mb-1">Nome da Criança</label>
                           <input 
                            placeholder="Nome"
                            className="w-full text-sm border-slate-300 rounded px-2 py-1.5 text-slate-900 bg-white"
                            value={child.name}
                            onChange={(e) => updateChild(index, 'name', e.target.value)}
                           />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                           <label className="block text-xs font-medium text-slate-500 mb-1">Data Nasc.</label>
                           <input 
                            type="date"
                            className="w-full text-sm border-slate-300 rounded px-2 py-1.5 text-slate-900 bg-white"
                            value={child.birthDate || ''}
                            onChange={(e) => updateChild(index, 'birthDate', e.target.value)}
                           />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs font-medium text-slate-500 mb-1">Idade (Calc)</label>
                          <input 
                            readOnly
                            value={child.age}
                            className="w-full text-sm bg-slate-100 border-slate-200 rounded px-2 py-1.5 text-center text-slate-700 font-medium"
                          />
                        </div>
                        
                        <div className="col-span-1 md:col-span-1">
                           <label className="block text-xs font-medium text-slate-500 mb-1">Sexo</label>
                           <select 
                            className="w-full text-sm border-slate-300 rounded px-2 py-1.5 bg-white text-slate-900"
                            value={child.gender}
                            onChange={(e) => updateChild(index, 'gender', e.target.value)}
                           >
                            <option value="M">M</option>
                            <option value="F">F</option>
                           </select>
                        </div>
                        <div className="col-span-1 md:col-span-1">
                           <label className="block text-xs font-medium text-slate-500 mb-1">Roupa</label>
                           <select 
                            className="w-full text-sm border-slate-300 rounded px-2 py-1.5 bg-white text-slate-900"
                            value={child.clothingSize}
                            onChange={(e) => updateChild(index, 'clothingSize', e.target.value)}
                           >
                            <option value="">-</option>
                            {Object.values(ClothingSize).map(s => <option key={s} value={s}>{s}</option>)}
                           </select>
                        </div>
                        <div className="col-span-1 md:col-span-1">
                           <label className="block text-xs font-medium text-slate-500 mb-1">Calçado</label>
                           <input 
                            type="number"
                            className="w-full text-sm border-slate-300 rounded px-2 py-1.5 text-slate-900 bg-white"
                            value={child.shoeSize || ''}
                            onChange={(e) => updateChild(index, 'shoeSize', parseInt(e.target.value))}
                           />
                        </div>
                        
                        <div className="col-span-2 md:col-span-3 flex items-end gap-3 pb-2">
                             <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={child.isStudent}
                                    onChange={e => updateChild(index, 'isStudent', e.target.checked)}
                                    className="w-4 h-4 text-emerald-600 rounded"
                                />
                                <span className="text-sm text-slate-700">Estudante?</span>
                             </label>
                             {child.isStudent && (
                                <input 
                                    placeholder="Ano Letivo (ex: 5º Ano)"
                                    className="flex-1 text-sm border-slate-300 rounded px-2 py-1.5 text-slate-900 bg-white"
                                    value={child.schoolYear || ''}
                                    onChange={e => updateChild(index, 'schoolYear', e.target.value)}
                                />
                             )}
                        </div>

                        <div className="col-span-2 md:col-span-6 bg-orange-50 p-2 rounded border border-orange-100">
                             <div className="flex items-center gap-3 mb-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={child.hasDisability}
                                        onChange={e => updateChild(index, 'hasDisability', e.target.checked)}
                                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                    />
                                    <span className="text-sm font-medium text-orange-800">Possui Deficiência?</span>
                                </label>
                             </div>
                             {child.hasDisability && (
                                <input 
                                    placeholder="Qual deficiência? (Detalhes)"
                                    className="w-full text-sm border-orange-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-orange-500 outline-none text-slate-900 bg-white"
                                    value={child.disabilityDetails || ''}
                                    onChange={e => updateChild(index, 'disabilityDetails', e.target.value)}
                                />
                             )}
                        </div>

                         <div className="col-span-2 md:col-span-6">
                           <label className="block text-xs font-medium text-slate-500 mb-1">Observações</label>
                           <textarea 
                            rows={1}
                            placeholder="Observações ou notas específicas..."
                            className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 text-slate-900 bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                            value={child.notes || ''}
                            onChange={(e) => updateChild(index, 'notes', e.target.value)}
                           />
                        </div>
                      </div>
                    </div>
                  ))}
                 </div>
              </section>

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