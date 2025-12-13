import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { FamilyList } from './components/FamilyList';
import { CampaignList } from './components/CampaignList';
import { PackageList } from './components/PackageList'; // Novo Import
import { StorageService } from './services/storage';
import { Family, Campaign, ViewState, Package } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [families, setFamilies] = useState<Family[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);

  // Load initial data
  useEffect(() => {
    setFamilies(StorageService.getFamilies());
    setCampaigns(StorageService.getCampaigns());
    setPackages(StorageService.getPackages());
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

  // Package Handlers
  const handleAddPackage = (pkg: Package) => {
    StorageService.savePackage(pkg);
    setPackages(StorageService.getPackages());
  };

  const handleUpdatePackage = (pkg: Package) => {
    StorageService.savePackage(pkg);
    setPackages(StorageService.getPackages());
  };

  const handleDeletePackage = (id: string) => {
    if (window.confirm('Tem certeza? Isso pode afetar campanhas futuras que usem este pacote.')) {
      StorageService.deletePackage(id);
      setPackages(StorageService.getPackages());
    }
  };

  // Campaign Handlers
  const handleAddCampaign = (campaign: Campaign) => {
    StorageService.saveCampaign(campaign);
    setCampaigns(StorageService.getCampaigns());
  };

  const handleUpdateCampaign = (campaign: Campaign) => {
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
          onAddCampaign={handleAddCampaign}
          onUpdateCampaign={handleUpdateCampaign} 
          onToggleStatus={handleToggleCampaign}
        />
      )}
    </Layout>
  );
};

export default App;