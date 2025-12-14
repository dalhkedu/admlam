import React, { useState, useEffect } from 'react';
import { Family, Child, ClothingSize, FamilyHistoryEntry } from '../types';
import { parseFamilyData } from '../services/geminiService';
import { StorageService } from '../services/storage';
import { maskCPF, maskPhone, maskCEP, sanitizeInput } from '../utils/masks';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, User, X, Users as UsersIcon, Wand2, Loader2, Sparkles, Search, MapPin, Baby, CreditCard, GraduationCap, AlertCircle, Calendar, FileText, History, Clock, Send, Ban, RefreshCw, AlertTriangle, Home } from 'lucide-react';

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
  email: '',
  numberOfAdults: 1,
  status: 'Ativo',
  children: [],
  history: [],
  registrationDate: '',
  lastReviewDate: '',
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
  const [activeTab, setActiveTab] = useState<'DATA' | 'HISTORY'>('DATA');

  // AI Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Ativo' | 'Suspenso' | 'Inativo'>('ALL');

  // Form State
  const [formData, setFormData] = useState<Family>(emptyFamily);
  const [shouldRenewRegistration, setShouldRenewRegistration] = useState(false);

  // History Note State
  const [newHistoryNote, setNewHistoryNote] = useState('');
  const [newHistoryType, setNewHistoryType] = useState<FamilyHistoryEntry['type']>('Ocorrência');

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

  // Get Validity Settings
  const [validityMonths, setValidityMonths] = useState(12);

  useEffect(() => {
      const fetchSettings = async () => {
          const settings = await StorageService.getSettings();
          setValidityMonths(settings.registrationValidityMonths);
      }
      fetchSettings();
  }, []);

  const filteredFamilies = families.filter(family => {
    const matchesSearch = family.responsibleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (family.cardId && family.cardId.toLowerCase().includes(searchQuery.toLowerCase())) ||
    family.address.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (family.cpf && family.cpf.includes(searchQuery));
    
    const matchesStatus = statusFilter === 'ALL' || family.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleOpenModal = (family?: Family) => {
    // Reset address helper states
    setCep('');
    setAddressNumber('');
    setAddressComplement('');
    setAddressDetails({ logradouro: '', bairro: '', localidade: '', uf: '' });
    setActiveTab('DATA'); // Reset to data tab
    setNewHistoryNote('');
    setShouldRenewRegistration(false);

    if (family) {
      setEditingFamily(family);
      setFormData(JSON.parse(JSON.stringify(family))); // Deep copy
    } else {
      // Generate next Card ID suggestion
      const nextId = families.length + 1;
      const year = new Date().getFullYear().toString().slice(-2);
      const today = new Date().toISOString();
      
      setEditingFamily(null);
      setFormData({
        ...emptyFamily,
        id: crypto.randomUUID(),
        cardId: `${String(nextId).padStart(3, '0')}/${year}`,
        registrationDate: today,
        lastReviewDate: today,
        children: [],
        history: [
            { id: crypto.randomUUID(), date: today, type: 'Cadastro', description: 'Família registrada no sistema.', author: 'Sistema' }
        ]
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
          logradouro: sanitizeInput(data.logradouro),
          bairro: sanitizeInput(data.bairro),
          localidade: sanitizeInput(data.localidade),
          uf: sanitizeInput(data.uf)
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
    
    let updatedFamily = { ...formData };
    const today = new Date().toISOString();

    if (editingFamily) {
        // Renewal Logic
        if (shouldRenewRegistration) {
            updatedFamily.lastReviewDate = today;
            if(updatedFamily.status === 'Suspenso' || updatedFamily.status === 'Inativo') {
                updatedFamily.status = 'Ativo';
            }
            updatedFamily.history = [...(updatedFamily.history || []), {
                id: crypto.randomUUID(),
                date: today,
                type: 'Reativação' as const,
                description: 'Revisão cadastral realizada. Validade renovada.',
                author: 'Sistema'
            }];
        }

        // Detect Status Change to auto-log
        if (editingFamily.status !== updatedFamily.status && !shouldRenewRegistration) { // Don't double log if already logged by renewal
            const statusLog: FamilyHistoryEntry = {
                id: crypto.randomUUID(),
                date: today,
                type: updatedFamily.status === 'Suspenso' ? 'Suspensão' : updatedFamily.status === 'Ativo' ? 'Reativação' : 'Atualização',
                description: `Status alterado de ${editingFamily.status} para ${updatedFamily.status}.`,
                author: 'Sistema'
            };
            updatedFamily.history = [...(updatedFamily.history || []), statusLog];
        }
      onUpdateFamily(updatedFamily);
    } else {
      // New Family is always reviewed today
      updatedFamily.lastReviewDate = today;
      onAddFamily(updatedFamily);
    }
    setIsModalOpen(false);
  };

  const handleAddHistoryNote = () => {
      if(!newHistoryNote.trim()) return;

      const newEntry: FamilyHistoryEntry = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          type: newHistoryType,
          description: sanitizeInput(newHistoryNote),
          author: 'Manual'
      };

      setFormData(prev => ({
          ...prev,
          history: [newEntry, ...(prev.history || [])] // Add to top
      }));
      setNewHistoryNote('');
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
    // Sanitize text fields
    const safeValue = typeof value === 'string' ? sanitizeInput(value) : value;
    
    newChildren[index] = { ...newChildren[index], [field]: safeValue };
    
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
          const today = new Date().toISOString();

          const newFamily: Family = {
              ...emptyFamily,
              id: crypto.randomUUID(),
              cardId: `${String(nextId).padStart(3, '0')}/${year}`,
              registrationDate: today,
              lastReviewDate: today,
              responsibleName: sanitizeInput(result.responsibleName || ''),
              rg: sanitizeInput(result.rg || ''),
              cpf: result.cpf ? maskCPF(result.cpf) : '',
              responsibleBirthDate: result.responsibleBirthDate || '',
              maritalStatus: (result.maritalStatus as any) || 'Solteira(o)',
              spouseName: sanitizeInput(result.spouseName || ''),
              address: sanitizeInput(result.address || ''),
              phone: result.phone ? maskPhone(result.phone) : '',
              email: sanitizeInput(result.email || ''),
              numberOfAdults: result.numberOfAdults || 1,
              isPregnant: result.isPregnant || false,
              pregnancyDueDate: result.pregnancyDueDate || '',
              children: (result.children || []).map((c: any) => ({
                  ...emptyChild,
                  id: crypto.randomUUID(),
                  name: sanitizeInput(c.name || ''),
                  age: c.age || 0,
                  birthDate: c.birthDate || '',
                  gender: c.gender || 'M',
                  clothingSize: sanitizeInput(c.clothingSize || ''),
                  shoeSize: c.shoeSize || 0,
                  isStudent: c.isStudent !== undefined ? c.isStudent : true,
                  schoolYear: sanitizeInput(c.schoolYear || ''),
                  hasDisability: c.hasDisability || false,
                  disabilityDetails: sanitizeInput(c.disabilityDetails || ''),
                  notes: sanitizeInput(c.notes || '')
              })),
              history: [
                { id: crypto.randomUUID(), date: today, type: 'Cadastro', description: 'Família registrada via IA.', author: 'Sistema' }
              ]
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

  const getStatusBadge = (status: Family['status']) => {
      switch(status) {
          case 'Ativo': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Ativo</span>;
          case 'Inativo': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">Inativo</span>;
          case 'Suspenso': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-1"><Ban size={10}/> Suspenso</span>;
      }
  };

  // Helper to calculate expiration date
  const getExpirationDate = (family: Family) => {
      const lastReview = new Date(family.lastReviewDate || family.registrationDate);
      lastReview.setMonth(lastReview.getMonth() + validityMonths);
      return lastReview;
  };

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

      {/* Barra de Busca e Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome, CPF ou endereço..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all text-slate-900 bg-white"
          />
        </div>
        <div className="w-full md:w-48">
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-slate-900 outline-none"
            >
                <option value="ALL">Todos os Status</option>
                <option value="Ativo">Ativos</option>
                <option value="Suspenso">Suspensos</option>
                <option value="Inativo">Inativos</option>
            </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Carteirinha</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Responsável</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm hidden md:table-cell">Validade</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-center">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredFamilies.map(family => {
                const expiration = getExpirationDate(family);
                const isNearExpiration = expiration.getTime() - new Date().getTime() < (30 * 24 * 60 * 60 * 1000); // 30 dias
                
                return (
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
                  <td className="px-6 py-4 hidden md:table-cell text-sm">
                      <div className={`flex items-center gap-1 ${
                          family.status === 'Suspenso' ? 'text-red-500 font-bold' :
                          isNearExpiration ? 'text-amber-600 font-medium' : 'text-slate-600'
                      }`}>
                          {expiration.toLocaleDateString()}
                          {isNearExpiration && family.status === 'Ativo' && <AlertTriangle size={14} />}
                      </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getStatusBadge(family.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setExpandedFamilyId(expandedFamilyId === family.id ? null : family.id)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600"
                        title="Ver Detalhes"
                      >
                         {expandedFamilyId === family.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
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
                                    {family.email && <p><span className="font-medium">Email:</span> {family.email}</p>}
                                    <p><span className="font-medium">Endereço:</span> {family.address}</p>
                                    <p><span className="font-medium">Pessoas na casa:</span> {family.numberOfAdults + family.children.length}</p>
                                    <p><span className="font-medium">Última Revisão:</span> {family.lastReviewDate ? new Date(family.lastReviewDate).toLocaleDateString() : 'N/A'}</p>
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
            )}})}
          </tbody>
        </table>
        {filteredFamilies.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            {searchQuery ? 'Nenhuma família encontrada.' : 'Nenhuma família cadastrada ainda.'}
          </div>
        )}
      </div>

      {/* Main Family Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header ... */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10 shrink-0">
              <h2 className="text-xl font-bold text-slate-800">{editingFamily ? 'Editar Família' : 'Nova Família'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-6 shrink-0">
                <button 
                    onClick={() => setActiveTab('DATA')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'DATA' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <FileText size={16} /> Dados Cadastrais
                    </div>
                </button>
                <button 
                    onClick={() => setActiveTab('HISTORY')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'HISTORY' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <History size={16} /> Histórico e Ocorrências
                    </div>
                </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
                {activeTab === 'DATA' ? (
                     <form onSubmit={handleSave} className="space-y-8" id="familyForm">
                       <section>
                         <h3 className="text-base font-semibold text-emerald-800 bg-emerald-50 p-2 rounded mb-4 flex items-center gap-2">
                           <User size={18}/> 1. Responsável / Assistido
                        </h3>
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-3 space-y-1">
                               <label className="text-xs font-medium text-slate-600">Nome Completo</label>
                               <input 
                                   required
                                   type="text" 
                                   value={formData.responsibleName} 
                                   onChange={e => setFormData({...formData, responsibleName: sanitizeInput(e.target.value)})}
                                   className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                               />
                           </div>
                           <div className="space-y-1">
                               <label className="text-xs font-medium text-slate-600">Status</label>
                               <select 
                                   value={formData.status}
                                   onChange={e => setFormData({...formData, status: e.target.value as any})}
                                   className={`w-full border rounded px-3 py-2 text-sm outline-none font-bold ${
                                       formData.status === 'Ativo' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                       formData.status === 'Suspenso' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                       'bg-slate-50 text-slate-600 border-slate-200'
                                   }`}
                               >
                                   <option value="Ativo">Ativo</option>
                                   <option value="Suspenso">Suspenso</option>
                                   <option value="Inativo">Inativo</option>
                               </select>
                           </div>
                           <div className="space-y-1">
                               <label className="text-xs font-medium text-slate-600">CPF</label>
                               <input 
                                   type="text" 
                                   maxLength={14}
                                   value={formData.cpf || ''}
                                   onChange={e => setFormData({...formData, cpf: maskCPF(e.target.value)})}
                                   className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                                   placeholder="000.000.000-00"
                               />
                           </div>
                           <div className="space-y-1">
                               <label className="text-xs font-medium text-slate-600">RG</label>
                               <input 
                                   type="text" 
                                   maxLength={20}
                                   value={formData.rg || ''}
                                   onChange={e => setFormData({...formData, rg: sanitizeInput(e.target.value)})}
                                   className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                               />
                           </div>
                           <div className="space-y-1">
                               <label className="text-xs font-medium text-slate-600">Data de Nascimento</label>
                               <input 
                                   type="date" 
                                   value={formData.responsibleBirthDate || ''}
                                   onChange={e => setFormData({...formData, responsibleBirthDate: e.target.value})}
                                   className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                               />
                           </div>
                           <div className="space-y-1">
                               <label className="text-xs font-medium text-slate-600">Estado Civil</label>
                               <select 
                                   value={formData.maritalStatus}
                                   onChange={e => setFormData({...formData, maritalStatus: e.target.value as any})}
                                   className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white text-slate-900 outline-none"
                               >
                                   <option value="Solteira(o)">Solteira(o)</option>
                                   <option value="Casada(o)">Casada(o)</option>
                                   <option value="Viúva(o)">Viúva(o)</option>
                                   <option value="Divorciada(o)">Divorciada(o)</option>
                                   <option value="União Estável">União Estável</option>
                                   <option value="Outro">Outro</option>
                               </select>
                           </div>
                           
                           {showSpouseField && (
                                <div className="md:col-span-2 space-y-1">
                                   <label className="text-xs font-medium text-slate-600">Nome do Cônjuge</label>
                                   <input 
                                       type="text" 
                                       value={formData.spouseName || ''} 
                                       onChange={e => setFormData({...formData, spouseName: sanitizeInput(e.target.value)})}
                                       className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                                   />
                               </div>
                           )}
                           
                           <div className="space-y-1">
                               <label className="text-xs font-medium text-slate-600">Total Adultos na Casa</label>
                               <input 
                                   type="number"
                                   min="1"
                                   value={formData.numberOfAdults}
                                   onChange={e => setFormData({...formData, numberOfAdults: parseInt(e.target.value) || 1})}
                                   className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                               />
                           </div>
                         </div>
                       </section>
                       
                       <section>
                          <h3 className="text-base font-semibold text-emerald-800 bg-emerald-50 p-2 rounded mb-4 flex items-center gap-2">
                             <MapPin size={18}/> 2. Endereço e Contato
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                             <div className="space-y-1">
                               <label className="text-xs font-medium text-slate-600">Telefone / WhatsApp</label>
                               <input 
                                   required
                                   type="text" 
                                   maxLength={15}
                                   value={formData.phone} 
                                   onChange={e => setFormData({...formData, phone: maskPhone(e.target.value)})}
                                   className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                                   placeholder="(00) 00000-0000"
                               />
                             </div>
                             <div className="md:col-span-2 space-y-1">
                               <label className="text-xs font-medium text-slate-600">Email (Opcional)</label>
                               <input 
                                   type="email" 
                                   value={formData.email || ''} 
                                   onChange={e => setFormData({...formData, email: sanitizeInput(e.target.value)})}
                                   className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                               />
                             </div>

                             <div className="col-span-full border-t border-dashed border-slate-200 my-2"></div>
                             
                             {/* Address Inputs (CEP, Street, etc) */}
                             <div className="col-span-1">
                                <label className="text-xs font-medium text-slate-600 block mb-1">CEP</label>
                                <div className="relative">
                                    <input 
                                    type="text" 
                                    placeholder="00000-000"
                                    maxLength={9}
                                    value={cep} 
                                    onChange={e => setCep(maskCEP(e.target.value))}
                                    onBlur={handleCepBlur}
                                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                                    />
                                    <div className="absolute right-2 top-2 text-slate-400">
                                    {isLoadingCep ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                    </div>
                                </div>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="text-xs font-medium text-slate-600 block mb-1">Rua / Logradouro</label>
                                <input 
                                    readOnly
                                    tabIndex={-1}
                                    placeholder="Automático..."
                                    value={addressDetails.logradouro} 
                                    className="w-full border border-slate-200 bg-slate-100 rounded px-2 py-1.5 text-sm text-slate-700 font-medium outline-none"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="text-xs font-medium text-slate-600 block mb-1">Número</label>
                                <input 
                                    type="text"
                                    value={addressNumber} 
                                    onChange={e => setAddressNumber(sanitizeInput(e.target.value))}
                                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="text-xs font-medium text-slate-600 block mb-1">Bairro</label>
                                <input 
                                    readOnly
                                    tabIndex={-1}
                                    value={addressDetails.bairro} 
                                    className="w-full border border-slate-200 bg-slate-100 rounded px-2 py-1.5 text-sm text-slate-700 font-medium outline-none"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="text-xs font-medium text-slate-600 block mb-1">Cidade/UF</label>
                                <input 
                                    readOnly
                                    tabIndex={-1}
                                    value={addressDetails.localidade ? `${addressDetails.localidade}/${addressDetails.uf}` : ''} 
                                    className="w-full border border-slate-200 bg-slate-100 rounded px-2 py-1.5 text-sm text-slate-700 font-medium outline-none"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="text-xs font-medium text-slate-600 block mb-1">Complemento</label>
                                <input 
                                    type="text"
                                    value={addressComplement} 
                                    onChange={e => setAddressComplement(sanitizeInput(e.target.value))}
                                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                                />
                            </div>

                             <div className="md:col-span-4 space-y-1">
                               <label className="text-xs font-medium text-slate-600">Endereço Completo (Resultado Final)</label>
                               <input 
                                   required
                                   type="text" 
                                   value={formData.address} 
                                   onChange={e => setFormData({...formData, address: sanitizeInput(e.target.value)})}
                                   className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                               />
                           </div>
                          </div>
                       </section>
                       
                       <section>
                           <h3 className="text-base font-semibold text-emerald-800 bg-emerald-50 p-2 rounded mb-4 flex items-center gap-2">
                             <Baby size={18}/> 3. Filhos e Gestação
                           </h3>
                           
                           <div className="mb-4 p-3 border border-pink-200 bg-pink-50 rounded-lg flex items-center justify-between">
                               <div>
                                   <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                       <input 
                                           type="checkbox"
                                           checked={formData.isPregnant}
                                           onChange={e => setFormData({...formData, isPregnant: e.target.checked})}
                                           className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                                       />
                                       Há gestante na família?
                                   </label>
                                   <p className="text-xs text-slate-500 ml-6">Habilita acompanhamento específico.</p>
                               </div>
                               {formData.isPregnant && (
                                   <div className="flex items-center gap-2">
                                       <span className="text-sm text-slate-600">Data Prevista do Parto:</span>
                                       <input 
                                           type="date"
                                           value={formData.pregnancyDueDate || ''}
                                           onChange={e => setFormData({...formData, pregnancyDueDate: e.target.value})}
                                           className="border border-slate-300 rounded px-2 py-1 text-sm outline-none text-slate-900 bg-white"
                                       />
                                   </div>
                               )}
                           </div>
                           
                           <div className="space-y-4">
                               {formData.children.map((child, index) => (
                                   <div key={child.id} className="bg-white border border-slate-200 rounded-lg p-4 relative">
                                       <button 
                                           type="button"
                                           onClick={() => removeChild(child.id)}
                                           className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1"
                                       >
                                           <Trash2 size={16} />
                                       </button>
                                       
                                       <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                           <div className="md:col-span-2">
                                               <input 
                                                   type="text" 
                                                   placeholder="Nome da Criança"
                                                   className="w-full border-b border-slate-300 px-1 py-1 text-sm outline-none focus:border-emerald-500 font-medium text-slate-900 bg-transparent"
                                                   value={child.name}
                                                   onChange={e => updateChild(index, 'name', e.target.value)}
                                               />
                                           </div>
                                            <div>
                                               <input 
                                                   type="date" 
                                                   className="w-full border-b border-slate-300 px-1 py-1 text-sm outline-none focus:border-emerald-500 text-slate-900 bg-transparent"
                                                   value={child.birthDate || ''}
                                                   onChange={e => updateChild(index, 'birthDate', e.target.value)}
                                               />
                                           </div>
                                           <div className="flex gap-2">
                                               <input 
                                                   type="number" 
                                                   placeholder="Idade"
                                                   readOnly
                                                   className="w-16 bg-slate-50 border-b border-slate-300 px-1 py-1 text-sm outline-none text-slate-500 text-center"
                                                   value={child.age}
                                               />
                                               <select
                                                   className="flex-1 border-b border-slate-300 px-1 py-1 text-sm outline-none focus:border-emerald-500 bg-transparent text-slate-900"
                                                   value={child.gender}
                                                   onChange={e => updateChild(index, 'gender', e.target.value)}
                                               >
                                                   <option value="M">Masculino</option>
                                                   <option value="F">Feminino</option>
                                                   <option value="Outro">Outro</option>
                                               </select>
                                           </div>
                                       </div>
                                       
                                       <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                           <div>
                                               <label className="text-[10px] text-slate-500 uppercase font-bold">Roupa</label>
                                                <select
                                                   className="w-full border border-slate-200 rounded px-2 py-1 text-sm outline-none bg-white text-slate-900"
                                                   value={child.clothingSize}
                                                   onChange={e => updateChild(index, 'clothingSize', e.target.value)}
                                               >
                                                   {Object.values(ClothingSize).map(s => <option key={s} value={s}>{s}</option>)}
                                               </select>
                                           </div>
                                           <div>
                                               <label className="text-[10px] text-slate-500 uppercase font-bold">Sapato</label>
                                                <input
                                                   type="number"
                                                   className="w-full border border-slate-200 rounded px-2 py-1 text-sm outline-none text-slate-900 bg-white"
                                                   value={child.shoeSize}
                                                   onChange={e => updateChild(index, 'shoeSize', e.target.value)}
                                               />
                                           </div>
                                           <div className="col-span-2 md:col-span-3 flex flex-col justify-end">
                                               <div className="flex gap-4">
                                                   <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                                                       <input 
                                                           type="checkbox"
                                                           checked={child.isStudent}
                                                           onChange={e => updateChild(index, 'isStudent', e.target.checked)}
                                                           className="rounded text-emerald-600 focus:ring-emerald-500"
                                                       />
                                                       Estuda?
                                                   </label>
                                                   <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                                                       <input 
                                                           type="checkbox"
                                                           checked={child.hasDisability}
                                                           onChange={e => updateChild(index, 'hasDisability', e.target.checked)}
                                                           className="rounded text-orange-500 focus:ring-orange-500"
                                                       />
                                                       PCD?
                                                   </label>
                                               </div>
                                           </div>
                                       </div>
                                       
                                       {(child.isStudent || child.hasDisability) && (
                                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 bg-slate-50 p-3 rounded">
                                               {child.isStudent && (
                                                   <div>
                                                       <label className="text-[10px] text-emerald-600 font-bold uppercase">Ano Escolar / Série</label>
                                                        <input 
                                                            type="text"
                                                            placeholder="Ex: 5º Ano"
                                                            className="w-full border border-emerald-200 rounded px-2 py-1 text-sm outline-none text-slate-900 bg-white"
                                                            value={child.schoolYear}
                                                            onChange={e => updateChild(index, 'schoolYear', e.target.value)}
                                                        />
                                                   </div>
                                               )}
                                               {child.hasDisability && (
                                                   <div>
                                                       <label className="text-[10px] text-orange-600 font-bold uppercase">Detalhes da Deficiência</label>
                                                        <input 
                                                            type="text"
                                                            placeholder="Qual a necessidade?"
                                                            className="w-full border border-orange-200 rounded px-2 py-1 text-sm outline-none text-slate-900 bg-white"
                                                            value={child.disabilityDetails}
                                                            onChange={e => updateChild(index, 'disabilityDetails', e.target.value)}
                                                        />
                                                   </div>
                                               )}
                                           </div>
                                       )}

                                       <div className="mt-3">
                                            <input 
                                                type="text"
                                                placeholder="Observações adicionais sobre a criança..."
                                                className="w-full border-b border-slate-200 px-1 py-1 text-sm outline-none focus:border-indigo-400 bg-transparent text-slate-600 placeholder-slate-400"
                                                value={child.notes}
                                                onChange={e => updateChild(index, 'notes', e.target.value)}
                                            />
                                       </div>
                                   </div>
                               ))}
                               
                               <button 
                                   type="button"
                                   onClick={addChild}
                                   className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-emerald-500 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2 font-medium"
                               >
                                   <Plus size={20} />
                                   Adicionar Criança
                               </button>
                           </div>
                       </section>
                     </form>
                ) : (
                    <div className="space-y-6">
                        {/* Add History Form */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                             <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <Plus size={16} /> Adicionar Ocorrência / Nota
                             </h3>
                             <div className="space-y-3">
                                 <div>
                                     <label className="text-xs font-medium text-slate-600 block mb-1">Tipo de Registro</label>
                                     <select
                                        value={newHistoryType}
                                        onChange={(e) => setNewHistoryType(e.target.value as any)}
                                        className="w-full md:w-1/2 border border-slate-300 rounded px-3 py-2 text-sm bg-white text-slate-900"
                                     >
                                         <option value="Ocorrência">Ocorrência</option>
                                         <option value="Visita">Visita Domiciliar</option>
                                         <option value="Atualização">Atualização de Dados</option>
                                         <option value="Suspensão">Suspensão</option>
                                         <option value="Reativação">Reativação</option>
                                         <option value="Outro">Outro</option>
                                     </select>
                                 </div>
                                 <div>
                                    <label className="text-xs font-medium text-slate-600 block mb-1">Descrição</label>
                                    <textarea 
                                        rows={3}
                                        value={newHistoryNote}
                                        onChange={(e) => setNewHistoryNote(sanitizeInput(e.target.value))}
                                        placeholder="Descreva o que aconteceu ou a alteração feita..."
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                                    />
                                 </div>
                                 <div className="flex justify-end">
                                     <button 
                                        type="button"
                                        onClick={handleAddHistoryNote}
                                        disabled={!newHistoryNote.trim()}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700 disabled:opacity-50"
                                     >
                                         <Send size={14} /> Registrar
                                     </button>
                                 </div>
                             </div>
                        </div>

                        {/* History Timeline */}
                        <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pl-6 pb-4">
                            {(formData.history && formData.history.length > 0) ? (
                                formData.history.map((entry) => (
                                    <div key={entry.id} className="relative">
                                        <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                                            entry.type === 'Cadastro' ? 'bg-emerald-500' :
                                            entry.type === 'Suspensão' ? 'bg-red-500' :
                                            entry.type === 'Ocorrência' ? 'bg-amber-500' :
                                            entry.type === 'Visita' ? 'bg-purple-500' :
                                            'bg-blue-500'
                                        }`}></div>
                                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-1">
                                            <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                                {entry.type === 'Visita' && <Home size={14} className="text-purple-600" />}
                                                {entry.type}
                                            </h4>
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                <Clock size={12} /> {new Date(entry.date).toLocaleDateString()} às {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                        <div className={`bg-white p-3 rounded-lg border shadow-sm text-sm text-slate-600 ${entry.type === 'Visita' ? 'border-purple-200 bg-purple-50/50' : 'border-slate-100'}`}>
                                            {entry.description}
                                            {entry.author && (
                                                <div className="mt-2 text-xs text-slate-400 border-t border-slate-50 pt-1">
                                                    Registrado por: {entry.author}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500 italic">Nenhum histórico registrado.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50 shrink-0 rounded-b-xl">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => {
                      const form = document.getElementById('familyForm') as HTMLFormElement;
                      if(form) form.requestSubmit();
                      else handleSave({ preventDefault: () => {} } as React.FormEvent);
                  }}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors font-medium"
                >
                  Salvar Família
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};