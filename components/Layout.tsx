import React, { useState } from 'react';
import { ViewState } from '../types';
import { AuthService } from '../services/auth';
import { LayoutDashboard, Users, Gift, Menu, X, HeartHandshake, Package, Settings as SettingsIcon, Calendar, LogOut } from 'lucide-react';

interface LayoutProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, onNavigate, children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'FAMILIES', label: 'Famílias', icon: Users },
    { id: 'EVENTS', label: 'Eventos', icon: Calendar },
    { id: 'CAMPAIGNS', label: 'Campanhas', icon: Gift },
    { id: 'PACKAGES', label: 'Pacotes / Cestas', icon: Package },
  ];

  const handleLogout = async () => {
    try {
        await AuthService.logout();
    } catch (e) {
        console.error("Erro ao sair", e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white shadow-sm z-20 h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 font-bold text-emerald-600 text-lg">
          <HeartHandshake />
          <span>Lar Matilde</span>
        </div>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-100 flex-shrink-0">
           <HeartHandshake className="text-emerald-600" />
           <span className="font-bold text-slate-800 text-lg">Lar Matilde</span>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id as ViewState);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 mt-auto space-y-2">
           <button
             onClick={() => {
                onNavigate('SETTINGS');
                setSidebarOpen(false);
             }}
             className={`
               w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
               ${currentView === 'SETTINGS'
                 ? 'bg-emerald-50 text-emerald-700'
                 : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
             `}
           >
              <SettingsIcon size={20} />
              Configurações
           </button>
           
           <button
             onClick={handleLogout}
             className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
           >
              <LogOut size={20} />
              Sair
           </button>

          <div className="px-2 pt-2 border-t border-slate-50 mt-2">
              <p className="text-xs text-slate-400 text-center">Admin Dashboard</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:pt-0 pt-16 overflow-y-auto h-screen">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};