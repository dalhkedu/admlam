import React, { useState } from 'react';
import { Campaign, CampaignItem, CampaignType } from '../types';
import { generateCampaignDescription } from '../services/geminiService';
import { Plus, Gift, Check, Play, Square, Wand2, Loader2, Trash2 } from 'lucide-react';

interface CampaignListProps {
  campaigns: Campaign[];
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
  items: []
};

export const CampaignList: React.FC<CampaignListProps> = ({ campaigns, onAddCampaign, onToggleStatus }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Campaign>(emptyCampaign);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleOpenModal = () => {
    setFormData({
      ...emptyCampaign,
      id: crypto.randomUUID(),
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [{ id: crypto.randomUUID(), name: '', targetQuantity: 0, collectedQuantity: 0, unit: 'un' }]
    });
    setIsModalOpen(true);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCampaign(formData);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Campanhas de Doação</h1>
           <p className="text-slate-500">Crie e acompanhe as campanhas de arrecadação.</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={18} />
          Nova Campanha
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {campaigns.map(campaign => (
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
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-between items-center">
              <button 
                 onClick={() => onToggleStatus(campaign.id)}
                 className={`flex items-center gap-2 text-sm font-medium ${
                   campaign.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'
                 }`}
              >
                {campaign.isActive ? <><Square size={16}/> Encerrar</> : <><Play size={16}/> Reativar</>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">Nova Campanha</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Check size={24} className="rotate-45" /> {/* Using rotate as a close icon replacement if X is boring, but let's stick to X pattern or keep Check as Save? Ah, let's use standard pattern. */}
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
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    {Object.values(CampaignType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Data Início</label>
                  <input 
                    type="date"
                    required
                    value={formData.startDate.toString().split('T')[0]}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
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
                        className="w-20 border border-slate-300 rounded px-2 py-2 text-sm bg-white"
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
                  Criar Campanha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
