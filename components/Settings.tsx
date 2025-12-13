import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { OrganizationLocation, LocationType, OrganizationBankInfo } from '../types';
import { Key, Save, AlertTriangle, CheckCircle, MapPin, Building2, Store, Truck, Plus, Trash2, Edit2, Search, Loader2, X, CreditCard, Wallet, Landmark } from 'lucide-react';

const emptyLocation: OrganizationLocation = {
  id: '',
  name: '',
  type: LocationType.BRANCH,
  address: '',
  phone: '',
  operatingHours: '',
  notes: ''
};

const emptyBankInfo: OrganizationBankInfo = {
    bankName: '',
    agency: '',
    accountNumber: '',
    pixKey: '',
    cnpj: '',
    accountHolder: ''
};

export const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');
  const [bankStatus, setBankStatus] = useState<'idle' | 'saved'>('idle');
  
  // Location States
  const [locations, setLocations] = useState<OrganizationLocation[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<OrganizationLocation | null>(null);
  const [locationForm, setLocationForm] = useState<OrganizationLocation>(emptyLocation);

  // Bank Info State
  const [bankInfo, setBankInfo] = useState<OrganizationBankInfo>(emptyBankInfo);

  // Address Helper State for Modal
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
    setApiKey(StorageService.getApiKey());
    setLocations(StorageService.getLocations());
    setBankInfo(StorageService.getBankInfo());
  }, []);

  // API Key Handlers
  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveApiKey(apiKey);
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 3000);
  };

  // Bank Info Handlers
  const handleSaveBankInfo = (e: React.FormEvent) => {
      e.preventDefault();
      StorageService.saveBankInfo(bankInfo);
      setBankStatus('saved');
      setTimeout(() => setBankStatus('idle'), 3000);
  };

  // Location Handlers
  const handleOpenLocationModal = (location?: OrganizationLocation) => {
    // Reset address helpers
    setCep('');
    setAddressNumber('');
    setAddressComplement('');
    setAddressDetails({ logradouro: '', bairro: '', localidade: '', uf: '' });

    if (location) {
        setEditingLocation(location);
        setLocationForm(JSON.parse(JSON.stringify(location)));
    } else {
        setEditingLocation(null);
        setLocationForm({
            ...emptyLocation,
            id: crypto.randomUUID()
        });
    }
    setIsLocationModalOpen(true);
  };

  const handleDeleteLocation = (id: string) => {
      if(window.confirm("Deseja excluir este local?")) {
          StorageService.deleteLocation(id);
          setLocations(StorageService.getLocations());
      }
  };

  const handleSaveLocation = (e: React.FormEvent) => {
      e.preventDefault();
      StorageService.saveLocation(locationForm);
      setLocations(StorageService.getLocations());
      setIsLocationModalOpen(false);
  };

  // Address/CEP Logic
  useEffect(() => {
    if (addressDetails.logradouro) {
      const fullAddress = `${addressDetails.logradouro}, ${addressNumber}${addressComplement ? ' ' + addressComplement : ''} - ${addressDetails.bairro}, ${addressDetails.localidade}/${addressDetails.uf}`;
      setLocationForm(prev => ({ ...prev, address: fullAddress }));
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

  const getLocationIcon = (type: LocationType) => {
      switch(type) {
          case LocationType.HEADQUARTERS: return <Building2 className="text-purple-600" size={20} />;
          case LocationType.STORE: return <Store className="text-pink-600" size={20} />;
          case LocationType.COLLECTION_POINT: return <Truck className="text-orange-600" size={20} />;
          default: return <MapPin className="text-blue-600" size={20} />;
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configurações e Admin</h1>
        <p className="text-slate-500">Gerencie as integrações e dados da organização.</p>
      </div>

      {/* Seção API Key */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Key size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Integração com IA (Google Gemini)</h3>
            <p className="text-sm text-slate-500 mt-1">
              Para utilizar os recursos de preenchimento automático, geração de textos e sugestão de pacotes,
              você precisa fornecer uma chave de API do Google Gemini.
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex gap-3">
          <AlertTriangle className="text-amber-600 shrink-0" size={20} />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Atenção Admin:</p>
            <p>
              A chave será salva apenas no armazenamento local deste navegador. 
              Obtenha sua chave gratuitamente em <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-amber-900">Google AI Studio</a>.
              Recomendamos o modelo <strong>Gemini 2.5 Flash</strong>.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveApiKey} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Google AI Studio API Key</label>
            <input 
              type="password"
              placeholder="Cole sua chave API aqui (começa com Alza...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm text-slate-900 bg-white"
            />
          </div>
          
          <div className="flex justify-end pt-2">
            <button 
              type="submit"
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white transition-all
                ${status === 'saved' ? 'bg-green-600' : 'bg-emerald-600 hover:bg-emerald-700'}
              `}
            >
              {status === 'saved' ? (
                <>
                  <CheckCircle size={18} />
                  Salvo com Sucesso
                </>
              ) : (
                <>
                  <Save size={18} />
                  Salvar Configuração
                </>
              )}
            </button>
          </div>
        </form>
      </div>

       {/* Seção Dados Bancários */}
       <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CreditCard size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Dados Bancários & Doações</h3>
            <p className="text-sm text-slate-500 mt-1">
              Configure os dados para recebimento de doações via depósito ou Pix.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveBankInfo} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                        <Landmark size={14}/> Banco
                    </label>
                    <input 
                        type="text"
                        placeholder="Ex: Banco do Brasil"
                        value={bankInfo.bankName}
                        onChange={(e) => setBankInfo({...bankInfo, bankName: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-slate-900 bg-white"
                    />
                </div>
                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Titular da Conta</label>
                    <input 
                        type="text"
                        placeholder="Ex: Associação Lar Matilde"
                        value={bankInfo.accountHolder}
                        onChange={(e) => setBankInfo({...bankInfo, accountHolder: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-slate-900 bg-white"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">CNPJ</label>
                    <input 
                        type="text"
                        placeholder="00.000.000/0001-00"
                        value={bankInfo.cnpj}
                        onChange={(e) => setBankInfo({...bankInfo, cnpj: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-slate-900 bg-white font-mono"
                    />
                </div>
                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                        <Wallet size={14}/> Chave Pix (Principal)
                    </label>
                    <input 
                        type="text"
                        placeholder="CPF, CNPJ, Email ou Aleatória"
                        value={bankInfo.pixKey}
                        onChange={(e) => setBankInfo({...bankInfo, pixKey: e.target.value})}
                        className="w-full border border-emerald-300 bg-emerald-50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-emerald-900 font-medium"
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Agência</label>
                    <input 
                        type="text"
                        placeholder="0000-0"
                        value={bankInfo.agency}
                        onChange={(e) => setBankInfo({...bankInfo, agency: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-slate-900 bg-white"
                    />
                </div>
                 <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Conta Corrente / Poupança</label>
                    <input 
                        type="text"
                        placeholder="000000-0"
                        value={bankInfo.accountNumber}
                        onChange={(e) => setBankInfo({...bankInfo, accountNumber: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-slate-900 bg-white"
                    />
                </div>
            </div>

            <div className="flex justify-end pt-2">
            <button 
              type="submit"
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white transition-all
                ${bankStatus === 'saved' ? 'bg-green-600' : 'bg-emerald-600 hover:bg-emerald-700'}
              `}
            >
              {bankStatus === 'saved' ? (
                <>
                  <CheckCircle size={18} />
                  Dados Salvos
                </>
              ) : (
                <>
                  <Save size={18} />
                  Salvar Dados Bancários
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Seção Locais e Endereços */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-start mb-6">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <MapPin size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Endereços da ONG</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Gerencie a Sede, Filiais, Bazares e Pontos de Coleta.
                    </p>
                </div>
            </div>
            <button 
                onClick={() => handleOpenLocationModal()}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
                <Plus size={16} /> Adicionar Endereço
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locations.length > 0 ? (
                locations.map(loc => (
                    <div key={loc.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors relative group">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => handleOpenLocationModal(loc)}
                                className="p-1.5 bg-white text-slate-400 hover:text-blue-600 rounded border border-slate-200 shadow-sm"
                            >
                                <Edit2 size={14} />
                             </button>
                             <button 
                                onClick={() => handleDeleteLocation(loc.id)}
                                className="p-1.5 bg-white text-slate-400 hover:text-red-600 rounded border border-slate-200 shadow-sm"
                            >
                                <Trash2 size={14} />
                             </button>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                             {getLocationIcon(loc.type)}
                             <div>
                                 <h4 className="font-semibold text-slate-800">{loc.name}</h4>
                                 <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                     {loc.type}
                                 </span>
                             </div>
                        </div>
                        <div className="text-sm text-slate-600 space-y-1 pl-1">
                            <p className="line-clamp-2">{loc.address}</p>
                            {loc.phone && <p className="text-slate-500">Tel: {loc.phone}</p>}
                            {loc.operatingHours && <p className="text-slate-500">Horário: {loc.operatingHours}</p>}
                        </div>
                    </div>
                ))
            ) : (
                <div className="col-span-full py-8 text-center text-slate-400 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                    Nenhum endereço cadastrado.
                </div>
            )}
        </div>
      </div>

       {/* Modal de Local */}
       {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">{editingLocation ? 'Editar Local' : 'Novo Local'}</h2>
              <button onClick={() => setIsLocationModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Nome do Local</label>
                        <input 
                            required
                            placeholder="Ex: Sede Administrativa, Bazar Centro"
                            value={locationForm.name}
                            onChange={e => setLocationForm({...locationForm, name: e.target.value})}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Tipo</label>
                        <select 
                            value={locationForm.type}
                            onChange={e => setLocationForm({...locationForm, type: e.target.value as LocationType})}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 outline-none"
                        >
                            {Object.values(LocationType).map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Telefone</label>
                        <input 
                            value={locationForm.phone || ''}
                            onChange={e => setLocationForm({...locationForm, phone: e.target.value})}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                            placeholder="(00) 0000-0000"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Horário de Funcionamento</label>
                        <input 
                            value={locationForm.operatingHours || ''}
                            onChange={e => setLocationForm({...locationForm, operatingHours: e.target.value})}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                            placeholder="Ex: Seg-Sex 08:00 às 18:00"
                        />
                    </div>
                </div>

                {/* Seção de Endereço Automático */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
                    <MapPin size={16} /> Endereço
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
                    <label className="text-xs font-medium text-slate-500 block mb-1">Endereço Completo</label>
                    <input 
                    required
                    type="text" 
                    value={locationForm.address} 
                    onChange={e => setLocationForm({...locationForm, address: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-900 bg-white"
                    placeholder="Endereço gerado ou digitado manualmente..."
                    />
                </div>
              </div>

               <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Observações / Notas</label>
                  <textarea 
                    rows={2}
                    value={locationForm.notes || ''}
                    onChange={e => setLocationForm({...locationForm, notes: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-slate-900 bg-white"
                    placeholder="Instruções de acesso, referência, etc."
                  />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsLocationModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors font-medium"
                >
                  Salvar Local
                </button>
              </div>

            </form>
          </div>
        </div>
       )}

    </div>
  );
};