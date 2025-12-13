import React, { useState, useEffect } from 'react';
import { DistributionEvent, EventFrequency, Campaign } from '../types';
import { Plus, Calendar, MapPin, Clock, DollarSign, Edit2, Trash2, X, Link, Check, Repeat, Copy, Search, Loader2 } from 'lucide-react';

interface EventListProps {
  events: DistributionEvent[];
  campaigns: Campaign[];
  onAddEvent: (event: DistributionEvent) => void;
  onUpdateEvent: (event: DistributionEvent) => void;
  onDeleteEvent: (id: string) => void;
}

const emptyEvent: DistributionEvent = {
  id: '',
  title: '',
  description: '',
  date: '',
  startTime: '09:00',
  endTime: '12:00',
  location: '',
  isFree: true,
  frequency: EventFrequency.ONCE,
  linkedCampaignIds: [],
  status: 'Agendado'
};

export const EventList: React.FC<EventListProps> = ({ events, campaigns, onAddEvent, onUpdateEvent, onDeleteEvent }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<DistributionEvent>(emptyEvent);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const handleOpenModal = (event?: DistributionEvent) => {
    // Reset address helper states
    setCep('');
    setAddressNumber('');
    setAddressComplement('');
    setAddressDetails({ logradouro: '', bairro: '', localidade: '', uf: '' });

    if (event) {
      setFormData(JSON.parse(JSON.stringify(event)));
      setEditingId(event.id);
    } else {
      setFormData({
        ...emptyEvent,
        id: crypto.randomUUID(),
        date: getTodayDate()
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleCloneEvent = (event: DistributionEvent) => {
    // Clona o evento mas reseta a data para hoje (para agendar um novo)
    const cloned = {
        ...event,
        id: crypto.randomUUID(),
        title: `${event.title} (Cópia)`,
        date: getTodayDate(),
        status: 'Agendado' as const
    };
    setFormData(cloned);
    setEditingId(null);
    setIsModalOpen(true);
  }

  // Effect to construct full address when parts change
  useEffect(() => {
    if (addressDetails.logradouro) {
      const fullAddress = `${addressDetails.logradouro}, ${addressNumber}${addressComplement ? ' ' + addressComplement : ''} - ${addressDetails.bairro}, ${addressDetails.localidade}/${addressDetails.uf}`;
      setFormData(prev => ({ ...prev, location: fullAddress }));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdateEvent(formData);
    } else {
      onAddEvent(formData);
    }
    setIsModalOpen(false);
  };

  const toggleCampaignLink = (campaignId: string) => {
    setFormData(prev => {
      const ids = prev.linkedCampaignIds || [];
      if (ids.includes(campaignId)) {
        return { ...prev, linkedCampaignIds: ids.filter(id => id !== campaignId) };
      } else {
        return { ...prev, linkedCampaignIds: [...ids, campaignId] };
      }
    });
  };

  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Eventos de Distribuição</h1>
           <p className="text-slate-500">Agende as datas e locais para entrega das doações e eventos beneficentes.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={18} />
          Agendar Evento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedEvents.map(event => {
          const isPast = new Date(event.date) < new Date(getTodayDate());
          return (
            <div key={event.id} className={`bg-white rounded-xl shadow-sm border ${isPast ? 'border-slate-100 bg-slate-50' : 'border-slate-200'} flex flex-col`}>
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                    event.status === 'Cancelado' ? 'bg-red-100 text-red-700' :
                    isPast ? 'bg-slate-200 text-slate-600' : 
                    'bg-blue-100 text-blue-700'
                  }`}>
                     {event.frequency !== EventFrequency.ONCE && <Repeat size={12} />}
                     {event.status === 'Cancelado' ? 'Cancelado' : isPast ? 'Realizado' : 'Agendado'}
                  </span>
                  
                  <div className="flex gap-1">
                    <button onClick={() => handleCloneEvent(event)} title="Clonar evento" className="p-1.5 text-slate-400 hover:text-emerald-600 rounded hover:bg-slate-100">
                        <Copy size={16} />
                    </button>
                    <button onClick={() => handleOpenModal(event)} title="Editar" className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100">
                        <Edit2 size={16} />
                    </button>
                    <button onClick={() => onDeleteEvent(event.id)} title="Excluir" className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100">
                        <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className={`text-lg font-bold mb-2 ${isPast ? 'text-slate-600' : 'text-slate-800'}`}>{event.title}</h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{event.description}</p>
                
                <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-emerald-500" />
                        <span>{new Date(event.date).toLocaleDateString()} <span className="text-slate-400">({event.frequency})</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-emerald-500" />
                        <span>{event.startTime} - {event.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-emerald-500" />
                        <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-emerald-500" />
                        <span>{event.isFree ? 'Gratuito' : `R$ ${event.entryFee?.toFixed(2)}`}</span>
                    </div>
                </div>
                
                {event.linkedCampaignIds.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                            <Link size={12}/> Campanhas Vinculadas
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {event.linkedCampaignIds.map(cid => {
                                const camp = campaigns.find(c => c.id === cid);
                                return camp ? (
                                    <span key={cid} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                                        {camp.title}
                                    </span>
                                ) : null;
                            })}
                        </div>
                    </div>
                )}
              </div>
            </div>
          );
        })}
        
        {sortedEvents.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 border-dashed">
            <Calendar className="mx-auto w-12 h-12 text-slate-400 mb-3" />
            <p className="text-slate-500">Nenhum evento agendado.</p>
          </div>
        )}
      </div>

       {/* Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Evento' : 'Novo Evento'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Título do Evento</label>
                <input 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: Entrega de Cestas Mensais"
                />
              </div>

              <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Descrição</label>
                  <textarea 
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    placeholder="Detalhes sobre o evento..."
                  />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Data</label>
                    <input 
                        type="date"
                        required
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Frequência / Recorrência</label>
                    <select
                        value={formData.frequency}
                        onChange={e => setFormData({...formData, frequency: e.target.value as EventFrequency})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none"
                    >
                        {Object.values(EventFrequency).map(f => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Início</label>
                    <input 
                        type="time"
                        required
                        value={formData.startTime}
                        onChange={e => setFormData({...formData, startTime: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Fim</label>
                    <input 
                        type="time"
                        required
                        value={formData.endTime}
                        onChange={e => setFormData({...formData, endTime: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
              </div>

              {/* Seção de Endereço Automático */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
                    <MapPin size={16} /> Endereço do Local
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="col-span-1 md:col-span-1">
                    <label className="text-xs font-medium text-slate-600 block mb-1">CEP</label>
                    <div className="relative">
                        <input 
                        type="text" 
                        placeholder="00000-000"
                        value={cep} 
                        onChange={e => setCep(e.target.value)}
                        onBlur={handleCepBlur}
                        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <div className="absolute right-2 top-2 text-slate-400">
                        {isLoadingCep ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        </div>
                    </div>
                    </div>
                    <div className="col-span-1 md:col-span-3">
                    <label className="text-xs font-medium text-slate-600 block mb-1">Rua / Logradouro</label>
                    <input 
                        readOnly
                        tabIndex={-1}
                        placeholder="Preenchido automaticamente..."
                        value={addressDetails.logradouro} 
                        className="w-full border border-slate-200 bg-slate-100 rounded px-2 py-1.5 text-sm text-slate-600 outline-none"
                    />
                    </div>
                    <div className="col-span-1">
                    <label className="text-xs font-medium text-slate-600 block mb-1">Número</label>
                    <input 
                        type="text"
                        required={!!addressDetails.logradouro}
                        value={addressNumber} 
                        onChange={e => setAddressNumber(e.target.value)}
                        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    </div>
                    <div className="col-span-1">
                    <label className="text-xs font-medium text-slate-600 block mb-1">Complemento</label>
                    <input 
                        type="text"
                        value={addressComplement} 
                        onChange={e => setAddressComplement(e.target.value)}
                        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    </div>
                    <div className="col-span-1">
                    <label className="text-xs font-medium text-slate-600 block mb-1">Bairro</label>
                    <input 
                        readOnly
                        tabIndex={-1}
                        value={addressDetails.bairro} 
                        className="w-full border border-slate-200 bg-slate-100 rounded px-2 py-1.5 text-sm text-slate-600 outline-none"
                    />
                    </div>
                    <div className="col-span-1">
                    <label className="text-xs font-medium text-slate-600 block mb-1">Cidade/UF</label>
                    <input 
                        readOnly
                        tabIndex={-1}
                        value={addressDetails.localidade ? `${addressDetails.localidade}/${addressDetails.uf}` : ''} 
                        className="w-full border border-slate-200 bg-slate-100 rounded px-2 py-1.5 text-sm text-slate-600 outline-none"
                    />
                    </div>
                </div>

                <div className="pt-2">
                    <label className="text-xs font-medium text-slate-500 block mb-1">Local Completo (Resultado)</label>
                    <input 
                    required
                    type="text" 
                    value={formData.location} 
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="Endereço gerado ou nome do local..."
                    />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Custo do Evento</span>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input 
                            type="checkbox"
                            checked={formData.isFree}
                            onChange={e => setFormData({...formData, isFree: e.target.checked})}
                            className="w-4 h-4 text-emerald-600 rounded"
                          />
                          Evento Gratuito
                      </label>
                  </div>
                  {!formData.isFree && (
                      <div className="relative mt-2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">R$</span>
                        <input 
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.entryFee || ''}
                            onChange={e => setFormData({...formData, entryFee: parseFloat(e.target.value)})}
                            className="w-full pl-8 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="0.00"
                        />
                      </div>
                  )}
              </div>

              <div className="border-t border-slate-100 pt-4">
                  <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Link size={16} /> Vincular Campanhas (Origem das Doações)
                  </h3>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-2 bg-slate-50">
                      {campaigns.filter(c => c.isActive).length > 0 ? (
                          campaigns.filter(c => c.isActive).map(campaign => (
                              <label key={campaign.id} className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                  <input 
                                      type="checkbox"
                                      checked={(formData.linkedCampaignIds || []).includes(campaign.id)}
                                      onChange={() => toggleCampaignLink(campaign.id)}
                                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                  />
                                  <div className="text-sm text-slate-700">{campaign.title}</div>
                              </label>
                          ))
                      ) : (
                          <p className="text-sm text-slate-400 text-center py-2">Nenhuma campanha ativa disponível.</p>
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
                  Salvar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};