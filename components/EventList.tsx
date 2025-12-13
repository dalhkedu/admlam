import React, { useState, useEffect } from 'react';
import { DistributionEvent, EventFrequency, Campaign, Family } from '../types';
import { StorageService } from '../services/storage';
import { Plus, Calendar, MapPin, Clock, DollarSign, Edit2, Trash2, X, Link, Check, Repeat, Copy, Search, Loader2, Filter, AlertTriangle, Car, Ticket, Box, RefreshCw, CheckCircle2, User } from 'lucide-react';

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
  hasParking: false,
  isParkingPaid: false,
  isDeliveryEvent: false,
  isRegistrationReview: false,
  deliveredFamilyIds: [],
  frequency: EventFrequency.ONCE,
  linkedCampaignIds: [],
  status: 'Agendado'
};

export const EventList: React.FC<EventListProps> = ({ events, campaigns, onAddEvent, onUpdateEvent, onDeleteEvent }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<DistributionEvent>(emptyEvent);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Delivery Modal State
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [selectedEventForDelivery, setSelectedEventForDelivery] = useState<DistributionEvent | null>(null);
  const [deliverySearchQuery, setDeliverySearchQuery] = useState('');
  const [allFamilies, setAllFamilies] = useState<Family[]>([]); // Need to fetch families to show names

  // Filter States
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterFrequency, setFilterFrequency] = useState<string>('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

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

  useEffect(() => {
      // Load families for the delivery modal context
      setAllFamilies(StorageService.getFamilies());
  }, []);

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
        status: 'Agendado' as const,
        deliveredFamilyIds: [], // Reset entregas
        linkedCampaignIds: [] // Reseta vínculos ao clonar para forçar revalidação de regras
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

  // Delivery Modal Logic
  const handleOpenDelivery = (event: DistributionEvent) => {
      setSelectedEventForDelivery(event);
      setIsDeliveryModalOpen(true);
      setDeliverySearchQuery('');
  };

  const handleConfirmDelivery = (familyId: string, campaignId: string, campaignTitle: string) => {
      if (!selectedEventForDelivery) return;
      
      if(window.confirm("Confirmar entrega para esta família?")) {
          StorageService.registerDelivery(selectedEventForDelivery.id, familyId, campaignId, campaignTitle);
          // Atualiza estado local para refletir na UI sem recarregar tudo
          const updatedEvent = {
              ...selectedEventForDelivery,
              deliveredFamilyIds: [...(selectedEventForDelivery.deliveredFamilyIds || []), familyId]
          };
          setSelectedEventForDelivery(updatedEvent);
          onUpdateEvent(updatedEvent); // Atualiza na lista principal
          // Atualiza lista de famílias global para refletir mudança de status se houver
          setAllFamilies(StorageService.getFamilies()); 
      }
  };

  const getDeliveryList = () => {
      if (!selectedEventForDelivery) return [];
      
      const list: { family: Family, campaign: Campaign }[] = [];
      
      selectedEventForDelivery.linkedCampaignIds.forEach(campId => {
          const campaign = campaigns.find(c => c.id === campId);
          if (campaign && campaign.beneficiaryFamilyIds) {
              campaign.beneficiaryFamilyIds.forEach(famId => {
                  const family = allFamilies.find(f => f.id === famId);
                  if (family) {
                      list.push({ family, campaign });
                  }
              });
          }
      });

      // Remove duplicates if a family is in multiple campaigns linked to same event (rare but possible logic)
      // Actually, if they are in multiple campaigns, they get multiple things, so keep them?
      // For simplicity, let's allow listing multiple times if they are in multiple campaigns.
      
      return list.filter(item => {
          const search = deliverySearchQuery.toLowerCase();
          return item.family.responsibleName.toLowerCase().includes(search) || 
                 (item.family.cardId && item.family.cardId.toLowerCase().includes(search));
      });
  };

  // Logic for Filtering
  const filteredEvents = events.filter(event => {
    // Filter by Status
    if (filterStatus !== 'ALL' && event.status !== filterStatus) return false;

    // Filter by Frequency
    if (filterFrequency !== 'ALL' && event.frequency !== filterFrequency) return false;

    // Filter by Date Range
    if (filterStartDate && event.date < filterStartDate) return false;
    if (filterEndDate && event.date > filterEndDate) return false;

    return true;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Lógica para filtrar campanhas disponíveis no modal
  const getAvailableCampaigns = () => {
      return campaigns.filter(campaign => {
          const isLinked = (formData.linkedCampaignIds || []).includes(campaign.id);
          
          // Regra 1: Se já está vinculada, mostra sempre (para permitir desvincular ou ver histórico)
          if (isLinked) return true;

          // Regra 2: Campanha deve estar Ativa para novos vínculos
          if (!campaign.isActive) return false;

          // Regra 3: Data de fim da campanha deve ser ANTERIOR ou IGUAL à data do evento
          // (Não posso distribuir algo de uma campanha que ainda vai durar meses no futuro, teoricamente)
          if (campaign.endDate > formData.date) return false;

          return true;
      });
  };

  const availableCampaigns = getAvailableCampaigns();
  const hasHiddenCampaigns = campaigns.length > availableCampaigns.length;

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
            className="min-w-[150px] border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
          >
            <option value="ALL">Todos os Status</option>
            <option value="Agendado">Agendado</option>
            <option value="Realizado">Realizado</option>
            <option value="Cancelado">Cancelado</option>
          </select>

          <select
            value={filterFrequency}
            onChange={(e) => setFilterFrequency(e.target.value)}
            className="min-w-[150px] border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
          >
            <option value="ALL">Todas Frequências</option>
            {Object.values(EventFrequency).map(freq => (
                <option key={freq} value={freq}>{freq}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
             <Calendar size={16} className="text-slate-400"/>
             <span className="text-xs text-slate-500 font-medium">De:</span>
             <input 
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="bg-transparent border-none text-sm text-slate-900 focus:ring-0 outline-none p-0"
             />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
             <Calendar size={16} className="text-slate-400"/>
             <span className="text-xs text-slate-500 font-medium">Até:</span>
             <input 
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="bg-transparent border-none text-sm text-slate-900 focus:ring-0 outline-none p-0"
             />
          </div>
          
          {(filterStartDate || filterEndDate || filterStatus !== 'ALL' || filterFrequency !== 'ALL') && (
            <button 
              onClick={() => { 
                  setFilterStartDate(''); 
                  setFilterEndDate('');
                  setFilterStatus('ALL');
                  setFilterFrequency('ALL');
              }}
              className="text-xs text-red-500 hover:underline ml-auto md:ml-0"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedEvents.map(event => {
          const isPast = new Date(event.date) < new Date(getTodayDate());
          const isFinalized = event.status === 'Realizado' || event.status === 'Cancelado';

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
                    <button 
                        onClick={() => !isFinalized && handleOpenModal(event)} 
                        disabled={isFinalized}
                        title={isFinalized ? "Eventos finalizados não podem ser editados" : "Editar"}
                        className={`p-1.5 rounded ${isFinalized ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
                    >
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
                        <Ticket size={16} className="text-emerald-500" />
                        <span>{event.isFree ? 'Entrada Franca' : `Entrada: R$ ${event.entryFee?.toFixed(2)}`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Car size={16} className="text-emerald-500" />
                        <span>
                            {event.hasParking 
                                ? (event.isParkingPaid ? `Estacionamento: R$ ${event.parkingFee?.toFixed(2) || '?.??'}` : 'Estacionamento Gratuito') 
                                : 'Sem Estacionamento'}
                        </span>
                    </div>
                    
                    {/* Delivery Flags Display */}
                    {event.isDeliveryEvent && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                                <Box size={12} /> Evento de Entrega
                            </span>
                            {event.isRegistrationReview && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                                    <RefreshCw size={12} /> Recadastramento
                                </span>
                            )}
                        </div>
                    )}
                </div>
                
                {event.linkedCampaignIds && event.linkedCampaignIds.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                            <Link size={12}/> Campanhas Vinculadas
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {event.linkedCampaignIds.map(cid => {
                                const camp = campaigns.find(c => c.id === cid);
                                return camp ? (
                                    <span key={cid} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                                        {camp.title}
                                        {!camp.isActive && <span className="opacity-50 text-[10px]">(Encerrada)</span>}
                                    </span>
                                ) : null;
                            })}
                        </div>
                    </div>
                )}
                
                {/* Delivery Button */}
                {event.isDeliveryEvent && !isFinalized && event.linkedCampaignIds.length > 0 && (
                    <button 
                        onClick={() => handleOpenDelivery(event)}
                        className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Box size={16} /> Gerenciar Entregas
                    </button>
                )}
              </div>
            </div>
          );
        })}
        
        {sortedEvents.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 border-dashed">
            <Calendar className="mx-auto w-12 h-12 text-slate-400 mb-3" />
            <p className="text-slate-500">Nenhum evento encontrado com os filtros selecionados.</p>
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
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                  placeholder="Ex: Entrega de Cestas Mensais"
                />
              </div>

              <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Descrição</label>
                  <textarea 
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-slate-900 bg-white"
                    placeholder="Detalhes sobre o evento..."
                  />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Data do Evento</label>
                    <input 
                        type="date"
                        required
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Frequência / Recorrência</label>
                    <select
                        value={formData.frequency}
                        onChange={e => setFormData({...formData, frequency: e.target.value as EventFrequency})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 outline-none"
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
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Fim</label>
                    <input 
                        type="time"
                        required
                        value={formData.endTime}
                        onChange={e => setFormData({...formData, endTime: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                    />
                  </div>
              </div>

              {/* Opções de Entrega e Recadastramento */}
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 space-y-3">
                  <h3 className="font-semibold text-emerald-800 flex items-center gap-2 text-sm">
                      <Box size={16} /> Logística de Entrega e Presença
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-start gap-2 cursor-pointer p-2 bg-white rounded border border-emerald-100 hover:border-emerald-300">
                          <input 
                              type="checkbox"
                              checked={formData.isDeliveryEvent}
                              onChange={e => setFormData({...formData, isDeliveryEvent: e.target.checked})}
                              className="mt-1 w-4 h-4 text-emerald-600 rounded"
                          />
                          <div className="text-sm">
                              <span className="font-medium text-slate-700 block">Evento de Entrega?</span>
                              <span className="text-xs text-slate-500">Famílias precisam estar presentes para receber doações.</span>
                          </div>
                      </label>
                      <label className={`flex items-start gap-2 cursor-pointer p-2 bg-white rounded border border-emerald-100 hover:border-emerald-300 ${!formData.isDeliveryEvent ? 'opacity-50' : ''}`}>
                          <input 
                              type="checkbox"
                              checked={formData.isRegistrationReview}
                              onChange={e => setFormData({...formData, isRegistrationReview: e.target.checked})}
                              disabled={!formData.isDeliveryEvent}
                              className="mt-1 w-4 h-4 text-emerald-600 rounded"
                          />
                          <div className="text-sm">
                              <span className="font-medium text-slate-700 block">Conta como Recadastramento?</span>
                              <span className="text-xs text-slate-500">A presença renova a validade do cadastro da família.</span>
                          </div>
                      </label>
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
                        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
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
                        className="w-full border border-slate-200 bg-slate-100 rounded px-2 py-1.5 text-sm text-slate-700 font-medium outline-none"
                    />
                    </div>
                    <div className="col-span-1">
                    <label className="text-xs font-medium text-slate-600 block mb-1">Número</label>
                    <input 
                        type="text"
                        required={!!addressDetails.logradouro}
                        value={addressNumber} 
                        onChange={e => setAddressNumber(e.target.value)}
                        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                    />
                    </div>
                    <div className="col-span-1">
                    <label className="text-xs font-medium text-slate-600 block mb-1">Complemento</label>
                    <input 
                        type="text"
                        value={addressComplement} 
                        onChange={e => setAddressComplement(e.target.value)}
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
                </div>

                <div className="pt-2">
                    <label className="text-xs font-medium text-slate-500 block mb-1">Local Completo (Resultado)</label>
                    <input 
                    required
                    type="text" 
                    value={formData.location} 
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-900 bg-white"
                    placeholder="Endereço gerado ou nome do local..."
                    />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                             <Ticket size={16}/> Entrada / Ingresso
                          </span>
                          <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input 
                                type="checkbox"
                                checked={formData.isFree}
                                onChange={e => setFormData({...formData, isFree: e.target.checked})}
                                className="w-4 h-4 text-emerald-600 rounded"
                              />
                              Entrada Franca
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
                                className="w-full pl-8 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                                placeholder="0.00"
                            />
                          </div>
                      )}
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                             <Car size={16}/> Estacionamento
                          </span>
                          <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input 
                                type="checkbox"
                                checked={formData.hasParking}
                                onChange={e => setFormData({...formData, hasParking: e.target.checked})}
                                className="w-4 h-4 text-emerald-600 rounded"
                              />
                              Possui local?
                          </label>
                      </div>
                      {formData.hasParking && (
                          <div className="space-y-2 mt-2">
                             <label className="flex items-center gap-2 cursor-pointer text-sm bg-white p-2 rounded border border-slate-200">
                                <input 
                                    type="checkbox"
                                    checked={!formData.isParkingPaid}
                                    onChange={e => setFormData({...formData, isParkingPaid: !e.target.checked})}
                                    className="w-4 h-4 text-emerald-600 rounded"
                                />
                                Estacionamento Gratuito
                             </label>
                             {formData.isParkingPaid && (
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">R$</span>
                                    <input 
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.parkingFee || ''}
                                        onChange={e => setFormData({...formData, parkingFee: parseFloat(e.target.value)})}
                                        className="w-full pl-8 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                                        placeholder="Valor do Estacionamento"
                                    />
                                </div>
                             )}
                          </div>
                      )}
                  </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                  <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Link size={16} /> Vincular Campanhas (Opcional)
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Selecione campanhas ativas que terminam antes ou na data do evento ({new Date(formData.date).toLocaleDateString()}).
                  </p>
                  
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-2 bg-slate-50">
                      {availableCampaigns.length > 0 ? (
                          availableCampaigns.map(campaign => (
                              <label key={campaign.id} className={`flex items-center gap-3 p-2 bg-white rounded border cursor-pointer ${
                                  !campaign.isActive ? 'border-slate-100 bg-slate-50 opacity-75' : 'border-slate-200 hover:bg-slate-50'
                              }`}>
                                  <input 
                                      type="checkbox"
                                      checked={(formData.linkedCampaignIds || []).includes(campaign.id)}
                                      onChange={() => toggleCampaignLink(campaign.id)}
                                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                  />
                                  <div className="text-sm text-slate-700">
                                      {campaign.title}
                                      <span className="text-xs text-slate-400 ml-2">
                                          (Fim: {new Date(campaign.endDate).toLocaleDateString()})
                                      </span>
                                      {!campaign.isActive && <span className="text-xs text-slate-400 ml-1 font-semibold">[Inativa]</span>}
                                  </div>
                              </label>
                          ))
                      ) : (
                          <div className="p-4 text-center">
                              <p className="text-sm text-slate-500 italic">Nenhuma campanha disponível.</p>
                              {hasHiddenCampaigns && (
                                  <p className="text-xs text-amber-600 mt-1 flex items-center justify-center gap-1">
                                      <AlertTriangle size={12} />
                                      Algumas campanhas foram ocultadas pois terminam após a data do evento ou já estão concluídas.
                                  </p>
                              )}
                          </div>
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

      {/* Modal de Gerenciamento de Entregas */}
      {isDeliveryModalOpen && selectedEventForDelivery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10 shrink-0">
                      <div>
                          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                              <Box size={24} className="text-emerald-600"/> Gestão de Entregas
                          </h2>
                          <p className="text-sm text-slate-500">
                              {selectedEventForDelivery.title} - {new Date(selectedEventForDelivery.date).toLocaleDateString()}
                          </p>
                      </div>
                      <button onClick={() => setIsDeliveryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>

                  <div className="p-4 bg-slate-50 border-b border-slate-200">
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                              type="text"
                              placeholder="Buscar família por nome ou carteirinha..."
                              value={deliverySearchQuery}
                              onChange={e => setDeliverySearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                          />
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                      <div className="space-y-4">
                          {getDeliveryList().length > 0 ? (
                              getDeliveryList().map(({ family, campaign }, idx) => {
                                  const isDelivered = (selectedEventForDelivery.deliveredFamilyIds || []).includes(family.id);
                                  
                                  return (
                                      <div key={`${family.id}-${idx}`} className={`border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                                          isDelivered ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
                                      }`}>
                                          <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                  <User size={16} className="text-slate-400" />
                                                  <span className="font-bold text-slate-800">{family.responsibleName}</span>
                                                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">
                                                      {family.cardId}
                                                  </span>
                                              </div>
                                              <div className="text-sm text-slate-500 flex items-center gap-2">
                                                  <span className="font-medium text-emerald-600">{campaign.title}</span>
                                              </div>
                                              <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded inline-block max-w-full">
                                                  <strong>Itens Previstos:</strong>{' '}
                                                  {campaign.items.length > 3 
                                                      ? `${campaign.items.slice(0, 3).map(i => i.name).join(', ')}... (+${campaign.items.length - 3})`
                                                      : campaign.items.map(i => i.name).join(', ')
                                                  }
                                              </div>
                                          </div>

                                          <div className="flex flex-col items-end gap-2">
                                              {isDelivered ? (
                                                  <div className="flex items-center gap-2 text-emerald-700 font-bold bg-emerald-100 px-4 py-2 rounded-lg">
                                                      <CheckCircle2 size={20} />
                                                      Entregue
                                                  </div>
                                              ) : (
                                                  <button 
                                                      onClick={() => handleConfirmDelivery(family.id, campaign.id, campaign.title)}
                                                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                                                  >
                                                      <Box size={18} /> Confirmar Entrega
                                                  </button>
                                              )}
                                              {selectedEventForDelivery.isRegistrationReview && isDelivered && (
                                                  <span className="text-xs text-indigo-600 flex items-center gap-1">
                                                      <RefreshCw size={12} /> Cadastro Renovado
                                                  </span>
                                              )}
                                          </div>
                                      </div>
                                  );
                              })
                          ) : (
                              <div className="text-center py-12 text-slate-400">
                                  {deliverySearchQuery ? 'Nenhuma família encontrada.' : 'Nenhuma família vinculada às campanhas deste evento.'}
                              </div>
                          )}
                      </div>
                  </div>
                  
                  <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl text-right">
                      <button onClick={() => setIsDeliveryModalOpen(false)} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium">
                          Fechar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};