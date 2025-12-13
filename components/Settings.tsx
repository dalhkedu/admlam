import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { Key, Save, AlertTriangle, CheckCircle } from 'lucide-react';

export const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    setApiKey(StorageService.getApiKey());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveApiKey(apiKey);
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configurações e Admin</h1>
        <p className="text-slate-500">Gerencie as integrações do sistema.</p>
      </div>

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

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Google AI Studio API Key</label>
            <input 
              type="password"
              placeholder="Cole sua chave API aqui (começa com Alza...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm"
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
    </div>
  );
};