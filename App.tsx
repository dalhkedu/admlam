import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { FamilyList } from './components/FamilyList';
import { CampaignList } from './components/CampaignList';
import { StorageService } from './services/storage';
import { Family, Campaign, ViewState } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [families, setFamilies] = useState<Family[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Load initial data
  useEffect(() => {
    setFamilies(StorageService.getFamilies());
    setCampaigns(StorageService.getCampaigns());
  }, []);

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
  };

  // Family Handlers
  const handleAddFamily = (family: Family) => {
    StorageService.saveFamily(family);
    setFamilies(StorageService.getFamilies());
  };

  const handleUpdateFamily = (family: Family) => {
    StorageService.saveFamily(family);
    setFamilies(StorageService.getFamilies());
  };

  const handleDeleteFamily = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta família?')) {
      StorageService.deleteFamily(id);
      setFamilies(StorageService.getFamilies());
    }
  };

  // Campaign Handlers
  const handleAddCampaign = (campaign: Campaign) => {
    StorageService.saveCampaign(campaign);
    setCampaigns(StorageService.getCampaigns());
  };

  const handleToggleCampaign = (id: string) => {
    StorageService.toggleCampaignStatus(id);
    setCampaigns(StorageService.getCampaigns());
  };

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
      {currentView === 'CAMPAIGNS' && (
        <CampaignList 
          campaigns={campaigns}
          onAddCampaign={handleAddCampaign}
          onUpdateCampaign={() => {}} // Implemented for completeness if needed later
          onToggleStatus={handleToggleCampaign}
        />
      )}
    </Layout>
  );
};

export default App;
