import React from 'react';
import { Family, Campaign, OrganizationSettings } from '../types';
import { Users, Gift, Baby, AlertCircle, Home, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  families: Family[];
  campaigns: Campaign[];
  settings: OrganizationSettings | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ families, campaigns, settings }) => {
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

  // Cálcula das próximas visitas
  const getUpcomingVisits = () => {
      const intervalMonths = settings?.defaultVisitIntervalMonths || 6;
      
      const visits = activeFamilies.map(family => {
          // Pega a última visita feita
          const lastVisitEntry = family.history
              ?.filter(h => h.type === 'Visita')
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          
          // Se nunca teve visita, usa data de cadastro
          const lastDate = lastVisitEntry ? new Date(lastVisitEntry.date) : new Date(family.registrationDate);
          
          // Calcula próxima visita
          const nextVisit = new Date(lastDate);
          nextVisit.setMonth(nextVisit.getMonth() + intervalMonths);
          
          return {
              family,
              nextVisit,
              lastVisitDate: lastDate,
              isLate: nextVisit < new Date()
          };
      });

      // Ordena por data (mais antigas/atrasadas primeiro) e pega as top 5
      return visits.sort((a, b) => a.nextVisit.getTime() - b.nextVisit.getTime()).slice(0, 5);
  };

  const upcomingVisits = getUpcomingVisits();

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
          title="Visitas Pendentes" 
          value={upcomingVisits.filter(v => v.isLate).length} 
          icon={Home} 
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

        {/* Upcoming Visits */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Home size={18} className="text-emerald-600"/> Cronograma de Visitas
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3">
             {upcomingVisits.length > 0 ? (
                 upcomingVisits.map((item, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border flex items-center justify-between ${
                        item.isLate ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'
                    }`}>
                        <div>
                            <div className="font-semibold text-slate-700 text-sm">{item.family.responsibleName}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock size={10} />
                                Previsto: {item.nextVisit.toLocaleDateString()}
                            </div>
                        </div>
                        {item.isLate && (
                            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full">
                                Atrasada
                            </span>
                        )}
                        {!item.isLate && (
                             <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                                Em breve
                             </span>
                        )}
                    </div>
                 ))
             ) : (
                 <p className="text-slate-400 text-center text-sm py-4">Nenhuma visita pendente.</p>
             )}
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">
              Baseado no intervalo de {settings?.defaultVisitIntervalMonths || 6} meses.
          </p>
        </div>
      </div>
    </div>
  );
};