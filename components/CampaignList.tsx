import React, { useState, useEffect } from 'react';
import { Campaign, CampaignItem, CampaignType, Family, Package } from '../types';
import { generateCampaignDescription } from '../services/geminiService';
import { Plus, Gift, Check, Play, Square, Wand2, Loader2, Trash2, Copy, Filter, Lock, Users, FileText, X, Calendar, Edit2, Box } from 'lucide-react';

interface CampaignListProps {
  campaigns: Campaign[];
  families: Family[];
  packages: Package[];
  onAddCampaign: (campaign: Campaign) => void;
  onUpdateCampaign: (campaign: Campaign) => void;
  onToggleStatus: (id: string) => void;
}

const emptyCampaign: Campaign = {
  id: '',
  title: '',
  description: '',
  type: CampaignType.OTHER,
  startDate: '',
  endDate: '',
  isActive: true,
  items: [],
  beneficiaryFamilyIds: [],
  packageIds: []
};

export const CampaignList: React.FC<CampaignListProps> = ({ campaigns, families, packages, onAddCampaign, onUpdateCampaign, onToggleStatus }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Campaign>(emptyCampaign);
  const [isGenerating, setIsGenerating] = useState(false);

  // Estado para o Modal de Detalhes (Relatório)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCampaignForDetails, setSelectedCampaignForDetails] = useState<Campaign | null>(null);

  // Estados dos Filtros
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Efeito para recalcular itens quando pacotes ou famílias mudam dentro do modal
  useEffect(() => {
    if (isModalOpen) {
      recalculateItems();
    }
  }, [formData.beneficiaryFamilyIds, formData.packageIds]);

  const recalculateItems = () => {
    // Se não houver pacotes selecionados, não mexe nos itens (permite edição manual ou mantém estado anterior)
    if (!formData.packageIds || formData.packageIds.length === 0) return;

    const familyCount = (formData.beneficiaryFamilyIds || []).length;
    if (familyCount === 0) {
      // Se nenhuma família, zera metas mas mantem itens
       setFormData(prev => ({
         ...prev,
         items: prev.items.map(i => ({...i, targetQuantity: 0}))
       }));
       return;
    }

    // Mapa para agregar itens de pacotes diferentes (ex: dois pacotes tem arroz)
    const itemsMap = new Map<string, {name: string, unit: string, qty: number}>();

    // Itera sobre os pacotes selecionados
    formData.packageIds.forEach(pkgId => {
      const pkg = packages.find(p => p.id === pkgId);
      if (pkg) {
        pkg.items.forEach(pkgItem => {
          // Chave única composta por nome e unidade para evitar duplicatas erradas
          const key = `${pkgItem.name}-${pkgItem.unit}`;
          const current = itemsMap.get(key) || { name: pkgItem.name, unit: pkgItem.unit, qty: 0 };
          
          // Quantidade total = Qtd no pacote * Qtd Famílias
          current.qty += (pkgItem.quantity * familyCount);
          itemsMap.set(key, current);
        });
      }
    });

    // Converte de volta para CampaignItem, tentando preservar collectedQuantity se o item já existia
    setFormData(prev => {
       const newItems: CampaignItem[] = [];
       
       itemsMap.forEach((val, key) => {
          // Tenta encontrar um item existente com mesmo nome e unidade para manter o 'collectedQuantity'
          const existingItem = prev.items.find(i => i.name === val.name && i.unit === val.unit);
          
          newItems.push({
            id: existingItem ? existingItem.id : crypto.randomUUID(),
            name: val.name,
            unit: val.unit as any,
            targetQuantity: val.qty,
            collectedQuantity: existingItem ? existingItem.collectedQuantity : 0
          });
       });

       return { ...prev, items: newItems };
    });
  };

  const handleOpenModal = () => {
    const today = getTodayDate();
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    setFormData({
      ...emptyCampaign,
      id: crypto.randomUUID(),
      startDate: today,
      endDate: nextMonth.toISOString().split('T')[0],
      items: [],
      beneficiaryFamilyIds: [],
      packageIds: []
    });
    setIsModalOpen(true);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setFormData(JSON.parse(JSON.stringify(campaign)));
    setIsModalOpen(true);
  };

  const handleCloneCampaign = (campaign: Campaign) => {
    const today = getTodayDate();
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    const clonedCampaign: Campaign = {
      ...campaign,
      id: crypto.randomUUID(),
      title: `${campaign.title} (Cópia)`,
      startDate: today,
      endDate: nextMonth.toISOString().split('T')[0],
      isActive: true,
      items: campaign.items.map(item => ({
        ...item,
        id: crypto.randomUUID(),
        collectedQuantity: 0
      })),
      beneficiaryFamilyIds: [...(campaign.beneficiaryFamilyIds || [])],
      packageIds: [...(campaign.packageIds || [])]
    };

    setFormData(clonedCampaign);
    setIsModalOpen(true);
  };

  const handleOpenDetails = (campaign: Campaign) => {
    setSelectedCampaignForDetails(campaign);
    setDetailsModalOpen(true);
  };

  const handleGenerateDescription = async () => {
    if (!formData.title) {
      alert("Preencha o título antes de gerar a descrição.");
      return;
    }
    
    setIsGenerating(true);
    const desc = await generateCampaignDescription(formData.title, formData.type, formData.items);
    setFormData(prev => ({ ...prev, description: desc }));
    setIsGenerating(false);
  };

  const toggleFamilySelection = (familyId: string) => {
    setFormData(prev => {
      const ids = prev.beneficiaryFamilyIds || [];
      if (ids.includes(familyId)) {
        return { ...prev, beneficiaryFamilyIds: ids.filter(id => id !== familyId) };
      } else {
        return { ...prev, beneficiaryFamilyIds: [...ids, familyId] };
      }
    });
  };

  const toggleAllFamilies = () => {
    setFormData(prev => {
      const currentIds = prev.beneficiaryFamilyIds || [];
      const activeFamilies = families.filter(f => f.status === 'Ativo');
      
      if (currentIds.length === activeFamilies.length) {
        return { ...prev, beneficiaryFamilyIds: [] }; 
      } else {
        return { ...prev, beneficiaryFamilyIds: activeFamilies.map(f => f.id) }; 
      }
    });
  };

  const togglePackageSelection = (pkgId: string) => {
     setFormData(prev => {
        const ids = prev.packageIds || [];
        if (ids.includes(pkgId)) {
           return { ...prev, packageIds: ids.filter(id => id !== pkgId) };
        } else {
           return { ...prev, packageIds: [...ids, pkgId] };
        }
     });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const today = getTodayDate();
    if (formData.startDate < today && !campaigns.some(c => c.id === formData.id)) {
      alert("A data de início não pode ser anterior a hoje para novas campanhas.");
      return;
    }

    if (formData.endDate < formData.startDate) {
      alert("A data de fim não pode ser anterior à data de início.");
      return;
    }

    const isEditing = campaigns.some(c => c.id === formData.id);

    if (isEditing) {
      onUpdateCampaign(formData);
    } else {
      onAddCampaign(formData);
    }
    
    setIsModalOpen(false);
  };

  // Lógica de Filtragem
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesType = filterType === 'ALL' || campaign.type === filterType;
    const matchesStatus = filterStatus === 'ALL' 
      ? true 
      : filterStatus === 'ACTIVE' 
        ? campaign.isActive 
        : !campaign.isActive;
    
    const campaignStartDate = campaign.startDate.split('T')[0];
    const campaignEndDate = campaign.endDate.split('T')[0];
    
    const matchesStartDate = !filterStartDate || campaignStartDate >= filterStartDate;
    const matchesEndDate = !filterEndDate || campaignEndDate <= filterEndDate;

    return matchesType && matchesStatus && matchesStartDate && matchesEndDate;
  });

  const getLinkedFamilies = (campaign: Campaign) => {
    return families.filter(f => (campaign.beneficiaryFamilyIds || []).includes(f.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Campanhas de Doação</h1>
           <p className="text-slate-500">Crie e acompanhe as campanhas de arrecadação.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={handleOpenModal}
            className="w-full md:w-auto flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span className="hidden md:inline">Nova Campanha</span>
            <span className="md:hidden">Nova</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center flex-wrap">
        <div className="flex items-center gap-2 text-slate-500 font-medium mr-2">
          <Filter size={20} />
          <span>Filtrar:</span>
        </div>
        
        <div className="flex flex-1 flex-wrap gap-4 items-center w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="min-w-[150px] border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Em Andamento</option>
            <option value="CLOSED">Encerradas</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="min-w-[180px] border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
          >
            <option value="ALL">Todos os Tipos</option>
            {Object.values(CampaignType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
             <Calendar size={16} className="text-slate-400"/>
             <span className="text-xs text-slate-500 font-medium">De:</span>
             <input 
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 outline-none p-0"
             />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
             <Calendar size={16} className="text-slate-400"/>
             <span className="text-xs text-slate-500 font-medium">Até:</span>
             <input 
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 outline-none p-0"
             />
          </div>
          
          {(filterStartDate || filterEndDate) && (
            <button 
              onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
              className="text-xs text-red-500 hover:underline"
            >
              Limpar Datas
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCampaigns.length > 0 ? (
          filteredCampaigns.map(campaign => {
            const today = getTodayDate();
            const isExpired = campaign.endDate < today;
            const beneficiaryCount = (campaign.beneficiaryFamilyIds || []).length;

            return (
              <div key={campaign.id} className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      campaign.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {campaign.isActive ? 'Em Andamento' : 'Encerrada'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(campaign.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-800 mb-2">{campaign.title}</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-3">{campaign.description}</p>
                  
                  <div className="mb-4 flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                     <Users size={16} className="text-emerald-600"/>
                     <span><strong>{beneficiaryCount}</strong> famílias vinculadas</span>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Metas (Total)</h4>
                    {campaign.items.length > 0 ? campaign.items.slice(0, 4).map(item => {
                      const percent = item.targetQuantity > 0 ? (item.collectedQuantity / item.targetQuantity) * 100 : 0;
                      return (
                        <div key={item.id} className="text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="text-slate-700">{item.name}</span>
                            <span className="text-slate-500">{item.collectedQuantity}/{item.targetQuantity} {item.unit}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div 
                              className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    }) : (
                       <p className="text-xs text-slate-400 italic">Nenhum item calculado.</p>
                    )}
                    {campaign.items.length > 4 && (
                       <p className="text-xs text-center text-slate-500">+ {campaign.items.length - 4} outros itens</p>
                    )}
                  </div>
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-between items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleOpenDetails(campaign)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors mr-2"
                  >
                    <FileText size={16} />
                    Detalhes
                  </button>
                  
                  <button
                    onClick={() => handleEditCampaign(campaign)}
                    disabled={!campaign.isActive}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                      !campaign.isActive 
                        ? 'text-slate-300 cursor-not-allowed' 
                        : 'text-slate-600 hover:text-blue-600'
                    }`}
                  >
                    <Edit2 size={16} />
                    Editar
                  </button>

                  <button
                    onClick={() => handleCloneCampaign(campaign)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    <Copy size={16} />
                    Clonar
                  </button>
                  
                  {!campaign.isActive && isExpired ? (
                    <span className="flex items-center gap-2 text-sm font-medium ml-auto text-slate-400 cursor-not-allowed">
                      <Lock size={16}/> Finalizada
                    </span>
                  ) : (
                    <button 
                      onClick={() => onToggleStatus(campaign.id)}
                      className={`flex items-center gap-2 text-sm font-medium ml-auto ${
                        campaign.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'
                      }`}
                    >
                      {campaign.isActive ? <><Square size={16}/> Encerrar</> : <><Play size={16}/> Reativar</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-1 md:col-span-2 xl:col-span-3 py-12 text-center bg-white rounded-xl border border-slate-200 border-dashed">
            <Gift className="mx-auto w-12 h-12 text-slate-400 mb-3" />
            <h3 className="text-lg font-medium text-slate-800">Nenhuma campanha encontrada</h3>
            <p className="text-slate-500">Tente alterar os filtros para ver mais resultados.</p>
          </div>
        )}
      </div>

      {/* Modal de Criação/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">
                {campaigns.some(c => c.id === formData.id) ? 'Editar Campanha' : 'Nova Campanha'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Check size={24} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Título da Campanha</label>
                <input 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: Natal Solidário 2024"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Tipo</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as CampaignType})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-700"
                  >
                    {Object.values(CampaignType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Data Início</label>
                  <input 
                    type="date"
                    required
                    min={!campaigns.some(c => c.id === formData.id) ? getTodayDate() : undefined} 
                    value={formData.startDate.toString().split('T')[0]}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Data Fim</label>
                  <input 
                    type="date"
                    required
                    min={formData.startDate}
                    value={formData.endDate.toString().split('T')[0]}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-700">Descrição</label>
                  <button 
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={isGenerating}
                    className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-purple-200 transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12}/>}
                    Gerar com IA
                  </button>
                </div>
                <textarea 
                  required
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  placeholder="Descreva o objetivo da campanha..."
                />
              </div>

              {/* SELEÇÃO DE PACOTES */}
              <div className="border-t border-slate-100 pt-4">
                <h3 className="font-semibold text-slate-700 mb-3">1. Selecione os Pacotes (Cestas)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {packages.length > 0 ? (
                    packages.map(pkg => (
                      <label key={pkg.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                         (formData.packageIds || []).includes(pkg.id) 
                         ? 'bg-indigo-50 border-indigo-300' 
                         : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}>
                         <input 
                          type="checkbox"
                          checked={(formData.packageIds || []).includes(pkg.id)}
                          onChange={() => togglePackageSelection(pkg.id)}
                          className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                         />
                         <div>
                            <div className="font-medium text-sm text-slate-800">{pkg.name}</div>
                            <div className="text-xs text-slate-500">{pkg.items.length} itens</div>
                         </div>
                      </label>
                    ))
                  ) : (
                    <div className="col-span-full p-4 text-center bg-slate-50 rounded border border-slate-200 text-sm text-slate-500">
                      Nenhum pacote cadastrado. Vá em "Pacotes" para criar modelos.
                    </div>
                  )}
                </div>
              </div>

               {/* SELEÇÃO DE FAMÍLIAS */}
               <div className="border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-slate-700">2. Vincular Famílias (Beneficiários)</h3>
                  <button 
                    type="button" 
                    onClick={toggleAllFamilies}
                    className="text-sm text-emerald-600 font-medium hover:underline"
                  >
                    Alternar Todos
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-2 bg-slate-50">
                  {families.filter(f => f.status === 'Ativo').length > 0 ? (
                    families.filter(f => f.status === 'Ativo').map(family => (
                      <label key={family.id} className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={(formData.beneficiaryFamilyIds || []).includes(family.id)}
                          onChange={() => toggleFamilySelection(family.id)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <div className="flex-1 text-sm">
                          <span className="font-medium text-slate-700">{family.responsibleName}</span>
                          <span className="text-slate-500 mx-2">•</span>
                          <span className="text-slate-500">{family.children.length} crianças</span>
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">Nenhuma família ativa encontrada.</p>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Total Selecionado: {(formData.beneficiaryFamilyIds || []).length} famílias.
                </p>
              </div>

              {/* LISTA DE ITENS CALCULADOS (READ ONLY) */}
              <div className="border-t border-slate-100 pt-4">
                 <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                   <Box size={16} className="text-slate-400"/> 
                   Resumo de Itens Necessários
                 </h3>
                 <p className="text-xs text-slate-500 mb-3">
                   Calculado automaticamente: (Itens dos Pacotes) x (Famílias Selecionadas)
                 </p>
                 
                 <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 max-h-48 overflow-y-auto">
                    {formData.items.length > 0 ? (
                      <ul className="space-y-2">
                        {formData.items.map(item => (
                          <li key={item.id} className="flex justify-between text-sm">
                            <span className="text-slate-700">{item.name}</span>
                            <span className="font-medium text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {item.targetQuantity} {item.unit}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400 text-center py-2">
                        Selecione pacotes e famílias para gerar a lista.
                      </p>
                    )}
                 </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
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
                  Salvar Campanha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes / Relatório */}
      {detailsModalOpen && selectedCampaignForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Detalhes da Campanha</h2>
                <p className="text-sm text-slate-500">{selectedCampaignForDetails.title}</p>
              </div>
              <button onClick={() => setDetailsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                    <div className="text-2xl font-bold text-blue-700">
                      {getLinkedFamilies(selectedCampaignForDetails).length}
                    </div>
                    <div className="text-sm text-blue-600 font-medium">Famílias Vinculadas</div>
                 </div>
                 <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-center">
                    <div className="text-2xl font-bold text-indigo-700">
                      {selectedCampaignForDetails.packageIds?.length || 0}
                    </div>
                    <div className="text-sm text-indigo-600 font-medium">Tipos de Pacotes</div>
                 </div>
                 <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 text-center">
                    <div className="text-2xl font-bold text-emerald-700">
                      {selectedCampaignForDetails.items.length}
                    </div>
                    <div className="text-sm text-emerald-600 font-medium">Itens Totais</div>
                 </div>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 font-semibold text-slate-700">
                  Lista de Beneficiários
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white border-b border-slate-200">
                       <tr>
                         <th className="px-4 py-3 font-medium text-slate-600">Responsável</th>
                         <th className="px-4 py-3 font-medium text-slate-600">Composição</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {getLinkedFamilies(selectedCampaignForDetails).map(family => (
                        <tr key={family.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {family.responsibleName}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {family.numberOfAdults} Adultos, {family.children.length} Crianças
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

               <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 font-semibold text-slate-700">
                  Resumo de Arrecadação
                </div>
                 <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white border-b border-slate-200">
                       <tr>
                         <th className="px-4 py-3 font-medium text-slate-600">Item</th>
                         <th className="px-4 py-3 font-medium text-slate-600">Meta</th>
                         <th className="px-4 py-3 font-medium text-slate-600">Coletado</th>
                         <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {selectedCampaignForDetails.items.map(item => {
                        const isComplete = item.collectedQuantity >= item.targetQuantity;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                            <td className="px-4 py-3 text-slate-600">{item.targetQuantity} {item.unit}</td>
                            <td className="px-4 py-3 text-slate-600">{item.collectedQuantity} {item.unit}</td>
                            <td className="px-4 py-3">
                               <span className={`px-2 py-1 rounded-full text-xs font-bold ${isComplete ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                 {isComplete ? 'Completo' : 'Pendente'}
                               </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setDetailsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};