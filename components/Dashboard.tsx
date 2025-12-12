import React from 'react';
import { Family, Campaign } from '../types';
import { Users, Gift, Baby, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  families: Family[];
  campaigns: Campaign[];
}

export const Dashboard: React.FC<DashboardProps> = ({ families, campaigns }) => {
  const activeFamilies = families.filter(f => f.status === 'Ativo');
  const totalChildren = families.reduce((acc, curr) => acc + curr.children.length, 0);
  const activeCampaigns = campaigns.filter(c => c.isActive);
  
  // Calculate total items needed vs collected for active campaigns
  const campaignStats = activeCampaigns.map(c => {
    const totalTarget = c.items.reduce((acc, item) => acc + item.targetQuantity, 0);
    const totalCollected = c.items.reduce((acc, item) => acc + item.collectedQuantity, 0);
    const progress = totalTarget > 0 ? (totalCollected / totalTarget) * 100 : 0;
    
    return {
      name: c.title.length > 15 ? c.title.substring(0, 15) + '...' : c.title,
      progresso: Math.round(progress),
      restante: 100 - Math.round(progress)
    };
  });

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>
        <p className="text-slate-500">Bem-vindo ao painel do Lar Assistencial Matilde.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Famílias Ativas" 
          value={activeFamilies.length} 
          icon={Users} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Crianças Atendidas" 
          value={totalChildren} 
          icon={Baby} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Campanhas Ativas" 
          value={activeCampaigns.length} 
          icon={Gift} 
          color="bg-purple-500" 
        />
        <StatCard 
          title="Ações Pendentes" 
          value="2" 
          icon={AlertCircle} 
          color="bg-orange-400" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Progresso das Campanhas Ativas</h3>
          {campaignStats.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignStats} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="progresso" name="Coletado" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="restante" name="Faltante" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              Nenhuma campanha ativa no momento.
            </div>
          )}
        </div>

        {/* Quick Actions / Recent */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Próximos Eventos</h3>
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="flex items-center gap-2 mb-1">
                <Gift size={16} className="text-emerald-600" />
                <span className="font-semibold text-emerald-800 text-sm">Entrega de Cestas</span>
              </div>
              <p className="text-xs text-emerald-600">30 de Outubro - 09:00</p>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <Users size={16} className="text-blue-600" />
                <span className="font-semibold text-blue-800 text-sm">Reunião Mensal</span>
              </div>
              <p className="text-xs text-blue-600">05 de Novembro - 14:00</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
