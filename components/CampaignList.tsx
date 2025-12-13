import React, { useState } from 'react';
import { Campaign, CampaignItem, CampaignType, Family } from '../types';
import { generateCampaignDescription } from '../services/geminiService';
import { Plus, Gift, Check, Play, Square, Wand2, Loader2, Trash2, Copy, Filter, Lock, Users, FileText, X, Calendar, Edit2 } from 'lucide-react';

interface CampaignListProps {
  campaigns: Campaign[];
  families: Family[];
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
  beneficiaryFamilyIds: []
};

export const CampaignList: React.FC<CampaignListProps> = ({ campaigns, families, onAddCampaign, onUpdateCampaign, onToggleStatus }) => {
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

  const handleOpenModal = () => {
    const today = getTodayDate();
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    setFormData({
      ...emptyCampaign,
      id: crypto.randomUUID(),
      startDate: today,
      endDate: nextMonth.toISOString().split('T')[0],
      items: [{ id: crypto.randomUUID(), name: '', targetQuantity: 0, collectedQuantity: 0, unit: 'un' }],
      beneficiaryFamilyIds: [] // Começa sem famílias
    });
    setIsModalOpen(true);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    // Clona o objeto para evitar mutação direta e prepara para edição
    setFormData(JSON.parse(JSON.stringify(campaign)));
    setIsModalOpen(true);
  };

  const handleCloneCampaign = (campaign: Campaign) => {
    const today = getTodayDate();
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    // Cria uma cópia profunda da campanha
    const clonedCampaign: Campaign = {
      ...campaign,
      id: crypto.randomUUID(), // Novo ID
      title: `${campaign.title} (Cópia)`, // Sugestão de título
      startDate: today, // Reseta data de início para hoje
      endDate: nextMonth.toISOString().split('T')[0], // +30 dias
      isActive: true, // Começa ativa
      items: campaign.items.map(item => ({
        ...item,
        id: crypto.randomUUID(), // Novos IDs para os itens
        collectedQuantity: 0 // Reseta quantidade coletada
      })),
      beneficiaryFamilyIds: [...(campaign.beneficiaryFamilyIds || [])] // Copia os vínculos
    };

    setFormData(clonedCampaign);
    setIsModalOpen(true);
  };

  const handleOpenDetails = (campaign: Campaign) => {
    setSelectedCampaignForDetails(campaign);
    setDetailsModalOpen(true);
  };

  const handleGenerateDescription = async () => {
    if (!formData.title || formData.items.length === 0) {
      alert("Preencha o título e adicione itens antes de gerar a descrição.");
      return;
    }
    
    setIsGenerating(true);
    const desc = await generateCampaignDescription(formData.title, formData.type, formData.items);
    setFormData(prev => ({ ...prev, description: desc }));
    setIsGenerating(false);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: crypto.randomUUID(), name: '', targetQuantity: 0, collectedQuantity: 0, unit: 'un' }]
    }));
  };

  const removeItem = (id: string) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
  };

  const updateItem = (index: number, field: keyof CampaignItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: newItems }));
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
        return { ...prev, beneficiaryFamilyIds: [] }; // Desmarcar todos
      } else {
        return { ...prev, beneficiaryFamilyIds: activeFamilies.map(f => f.id) }; // Marcar todos ativos
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de data retroativa apenas se for uma nova campanha ou se a data mudou para o passado
    // Mas permitimos manter datas antigas se estiver apenas editando outros campos de uma campanha em andamento
    const today = getTodayDate();
    if (formData.startDate < today && !campaigns.some(c => c.id === formData.id)) {
      alert("A data de início não pode ser anterior a hoje para novas campanhas.");
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
    
    // Filtro de Data
    const campaignStartDate = campaign.startDate.split('T')[0];
    const campaignEndDate = campaign.endDate.split('T')[0];
    
    const matchesStartDate = !filterStartDate || campaignStartDate >= filterStartDate;
    const matchesEndDate = !filterEndDate || campaignEndDate <= filterEndDate;

    return matchesType && matchesStatus && matchesStartDate && matchesEndDate;
  });

  // Helpers para o Modal de Detalhes
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
        
        <div className="hidden xl:block ml-auto text-sm text-slate-400 whitespace-nowrap">
          Mostrando {filteredCampaigns.length} de {campaigns.length}
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
                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Metas</h4>
                    {campaign.items.map(item => {
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
                    })}
                  </div>
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-between items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleOpenDetails(campaign)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors mr-2"
                    title="Ver detalhes dos beneficiários"
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
                    title={!campaign.isActive ? "Reative a campanha para editar" : "Editar campanha"}
                  >
                    <Edit2 size={16} />
                    Editar
                  </button>

                  <button
                    onClick={() => handleCloneCampaign(campaign)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                    title="Duplicar esta campanha"
                  >
                    <Copy size={16} />
                    Clonar
                  </button>
                  
                  {/* Lógica de exibição do botão de status */}
                  {!campaign.isActive && isExpired ? (
                    <span className="flex items-center gap-2 text-sm font-medium ml-auto text-slate-400 cursor-not-allowed" title="Campanha expirada não pode ser reativada">
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
            <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <Gift className="text-slate-400" />
            </div>
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

              <div className="grid grid-cols-2 gap-4">
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
                    // Apenas restringe data mínima se for uma NOVA campanha. Se for edição, permite manter a data antiga.
                    min={!campaigns.some(c => c.id === formData.id) ? getTodayDate() : undefined} 
                    value={formData.startDate.toString().split('T')[0]}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  {!campaigns.some(c => c.id === formData.id) && 
                    <p className="text-xs text-slate-400 mt-1">Apenas datas futuras ou hoje.</p>
                  }
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
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  placeholder="Descreva o objetivo da campanha..."
                />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-slate-700">Itens Necessários</h3>
                  <button type="button" onClick={addItem} className="text-sm text-emerald-600 font-medium hover:underline flex items-center gap-1">
                    <Plus size={14} /> Adicionar Item
                  </button>
                </div>
                
                <div className="space-y-3">
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
                        className="w-20 border border-slate-300 rounded px-3 py-2 text-sm"
                        value={item.targetQuantity || ''}
                        onChange={e => updateItem(index, 'targetQuantity', parseInt(e.target.value))}
                      />
                       <select
                        className="w-20 border border-slate-300 rounded px-2 py-2 text-sm bg-white text-slate-700"
                        value={item.unit}
                        onChange={e => updateItem(index, 'unit', e.target.value)}
                       >
                         <option value="un">un</option>
                         <option value="kg">kg</option>
                         <option value="lt">lt</option>
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
                </div>
              </div>

               {/* Seção de Vínculo de Famílias */}
               <div className="border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-slate-700">Vincular Famílias</h3>
                  <button 
                    type="button" 
                    onClick={toggleAllFamilies}
                    className="text-sm text-emerald-600 font-medium hover:underline"
                  >
                    Alternar Todos
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-2 bg-slate-50">
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
                  Selecionado: {(formData.beneficiaryFamilyIds || []).length} famílias.
                </p>
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
              {/* Resumo Demográfico */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                    <div className="text-2xl font-bold text-blue-700">
                      {getLinkedFamilies(selectedCampaignForDetails).length}
                    </div>
                    <div className="text-sm text-blue-600 font-medium">Famílias Vinculadas</div>
                 </div>
                 <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-center">
                    <div className="text-2xl font-bold text-amber-700">
                      {getLinkedFamilies(selectedCampaignForDetails).reduce((acc, f) => acc + f.numberOfAdults, 0)}
                    </div>
                    <div className="text-sm text-amber-600 font-medium">Total de Adultos</div>
                 </div>
                 <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 text-center">
                    <div className="text-2xl font-bold text-emerald-700">
                      {getLinkedFamilies(selectedCampaignForDetails).reduce((acc, f) => acc + f.children.length, 0)}
                    </div>
                    <div className="text-sm text-emerald-600 font-medium">Total de Crianças</div>
                 </div>
              </div>

              {/* Lista Detalhada (Lógica para mostrar Crianças se Natal/Páscoa, ou Lista de Famílias para Cesta) */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 font-semibold text-slate-700 flex justify-between items-center">
                  <span>Lista de Necessidades</span>
                  <span className="text-xs font-normal text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                     {selectedCampaignForDetails.type === CampaignType.CHRISTMAS || selectedCampaignForDetails.type === CampaignType.EASTER 
                      ? 'Foco: Crianças' 
                      : 'Foco: Cesta Familiar'}
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white border-b border-slate-200">
                      {selectedCampaignForDetails.type === CampaignType.CHRISTMAS ? (
                         // Cabeçalho Específico para Natal (Tamanhos)
                         <tr>
                           <th className="px-4 py-3 font-medium text-slate-600">Criança</th>
                           <th className="px-4 py-3 font-medium text-slate-600">Idade/Sexo</th>
                           <th className="px-4 py-3 font-medium text-slate-600">Roupa</th>
                           <th className="px-4 py-3 font-medium text-slate-600">Sapato</th>
                           <th className="px-4 py-3 font-medium text-slate-600">Responsável</th>
                         </tr>
                      ) : (
                         // Cabeçalho Padrão (Famílias)
                         <tr>
                           <th className="px-4 py-3 font-medium text-slate-600">Responsável</th>
                           <th className="px-4 py-3 font-medium text-slate-600">Composição</th>
                           <th className="px-4 py-3 font-medium text-slate-600">Estimativa</th>
                         </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {getLinkedFamilies(selectedCampaignForDetails).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400">
                            Nenhuma família vinculada a esta campanha.
                          </td>
                        </tr>
                      ) : (
                        selectedCampaignForDetails.type === CampaignType.CHRISTMAS ? (
                          // Renderização para Natal: Lista Plana de Crianças
                          getLinkedFamilies(selectedCampaignForDetails).flatMap(family => 
                            family.children.map(child => (
                              <tr key={child.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium text-slate-800">{child.name}</td>
                                <td className="px-4 py-3 text-slate-600">{child.age} anos ({child.gender})</td>
                                <td className="px-4 py-3 font-bold text-indigo-600">{child.clothingSize}</td>
                                <td className="px-4 py-3 font-bold text-indigo-600">{child.shoeSize}</td>
                                <td className="px-4 py-3 text-slate-500 text-xs">
                                  {family.responsibleName} <br/> (ID: {family.id.slice(-4)})
                                </td>
                              </tr>
                            ))
                          )
                        ) : (
                          // Renderização para Outros: Lista de Famílias
                          getLinkedFamilies(selectedCampaignForDetails).map(family => {
                             const totalMembers = family.numberOfAdults + family.children.length;
                             return (
                              <tr key={family.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium text-slate-800">
                                  {family.responsibleName}
                                  <div className="text-xs text-slate-400">{family.phone}</div>
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {family.numberOfAdults} Adultos, {family.children.length} Crianças
                                </td>
                                <td className="px-4 py-3 text-emerald-600 font-medium">
                                  1 Cesta ({totalMembers} pessoas)
                                </td>
                              </tr>
                             );
                          })
                        )
                      )}
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