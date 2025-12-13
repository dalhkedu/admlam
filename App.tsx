import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { FamilyList } from './components/FamilyList';
import { CampaignList } from './components/CampaignList';
import { PackageList } from './components/PackageList'; 
import { EventList } from './components/EventList';
import { Settings } from './components/Settings';
import { StorageService } from './services/storage';
import { Family, Campaign, ViewState, Package, DistributionEvent, OrganizationBankInfo } from './types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [isLoading, setIsLoading] = useState(true);
  
  const [families, setFamilies] = useState<Family[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [events, setEvents] = useState<DistributionEvent[]>([]);
  const [bankInfo, setBankInfo] = useState<OrganizationBankInfo>({ accounts: [] });

  const fetchData = async () => {
    // setIsLoading(true); // Don't show full loader on refreshes, only initial or manual
    try {
        const [fams, camps, pkgs, evts, bank] = await Promise.all([
            StorageService.getFamilies(),
            StorageService.getCampaigns(),
            StorageService.getPackages(),
            StorageService.getEvents(),
            StorageService.getBankInfo()
        ]);
        setFamilies(fams);
        setCampaigns(camps);
        setPackages(pkgs);
        setEvents(evts);
        setBankInfo(bank);
    } catch (error) {
        console.error("Failed to fetch data:", error);
        alert("Erro ao carregar dados do servidor.");
    } finally {
        setIsLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchData();
  }, [currentView]); 

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
  };

  // Family Handlers
  const handleAddFamily = async (family: Family) => {
    await StorageService.saveFamily(family);
    fetchData();
  };

  const handleUpdateFamily = async (family: Family) => {
    await StorageService.saveFamily(family);
    fetchData();
  };

  const handleDeleteFamily = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta família?')) {
      await StorageService.deleteFamily(id);
      fetchData();
    }
  };

  // Package Handlers
  const handleAddPackage = async (pkg: Package) => {
    await StorageService.savePackage(pkg);
    fetchData();
  };

  const handleUpdatePackage = async (pkg: Package) => {
    await StorageService.savePackage(pkg);
    fetchData();
  };

  const handleDeletePackage = async (id: string) => {
    if (window.confirm('Tem certeza? Isso pode afetar campanhas futuras que usem este pacote.')) {
      await StorageService.deletePackage(id);
      fetchData();
    }
  };

  // Campaign Handlers
  const handleAddCampaign = async (campaign: Campaign) => {
    await StorageService.saveCampaign(campaign);
    fetchData();
  };

  const handleUpdateCampaign = async (campaign: Campaign) => {
    await StorageService.saveCampaign(campaign);
    fetchData();
  };

  const handleToggleCampaign = async (id: string) => {
    await StorageService.toggleCampaignStatus(id);
    fetchData();
  };

  // Event Handlers
  const handleAddEvent = async (event: DistributionEvent) => {
    await StorageService.saveEvent(event);
    fetchData();
  };

  const handleUpdateEvent = async (event: DistributionEvent) => {
    await StorageService.saveEvent(event);
    fetchData();
  };

  const handleDeleteEvent = async (id: string) => {
    if (window.confirm('Tem certeza que deseja cancelar/excluir este evento?')) {
      await StorageService.deleteEvent(id);
      fetchData();
    }
  };

  if (isLoading && families.length === 0) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="text-center">
                  <Loader2 size={48} className="animate-spin text-emerald-600 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-slate-700">Carregando Lar Matilde...</h2>
                  <p className="text-slate-500">Conectando ao banco de dados seguro.</p>
              </div>
          </div>
      );
  }

  return (
    <Layout currentView={currentView} onNavigate={handleNavigate}>
      {currentView === 'DASHBOARD' && (
        <Dashboard families={families} campaigns={campaigns} />
      )}
      {currentView === 'FAMILIES' && (
        <FamilyList 
          families={families} 
          onAddFamily={handleAddFamily}
          onUpdateFamily={handleUpdateFamily}
          onDeleteFamily={handleDeleteFamily}
        />
      )}
      {currentView === 'EVENTS' && (
        <EventList 
          events={events}
          campaigns={campaigns}
          onAddEvent={handleAddEvent}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      )}
      {currentView === 'PACKAGES' && (
        <PackageList
          packages={packages}
          onAddPackage={handleAddPackage}
          onUpdatePackage={handleUpdatePackage}
          onDeletePackage={handleDeletePackage}
        />
      )}
      {currentView === 'CAMPAIGNS' && (
        <CampaignList 
          campaigns={campaigns}
          families={families}
          packages={packages}
          bankInfo={bankInfo}
          onAddCampaign={handleAddCampaign}
          onUpdateCampaign={handleUpdateCampaign} 
          onToggleStatus={handleToggleCampaign}
        />
      )}
      {currentView === 'SETTINGS' && (
        <Settings />
      )}
    </Layout>
  );
};

export default App;