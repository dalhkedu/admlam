import { Family, Campaign, CampaignType, ClothingSize, Package } from '../types';

// Initial Mock Data
const MOCK_FAMILIES: Family[] = [
  {
    id: 'fam-001',
    responsibleName: 'Maria da Silva',
    address: 'Rua das Flores, 123, Jd. Esperança',
    phone: '(11) 99999-1234',
    numberOfAdults: 2,
    status: 'Ativo',
    registrationDate: new Date('2023-01-15').toISOString(),
    children: [
      { id: 'ch-1', name: 'Joãozinho', age: 8, gender: 'M', clothingSize: ClothingSize.INFANTIL_8, shoeSize: 32, notes: 'Gosta de futebol' },
      { id: 'ch-2', name: 'Ana', age: 5, gender: 'F', clothingSize: ClothingSize.INFANTIL_6, shoeSize: 28, notes: 'Gosta de bonecas' }
    ]
  },
  {
    id: 'fam-002',
    responsibleName: 'José Santos',
    address: 'Av. Principal, 450, Centro',
    phone: '(11) 98888-5678',
    numberOfAdults: 1,
    status: 'Ativo',
    registrationDate: new Date('2023-03-10').toISOString(),
    children: [
      { id: 'ch-3', name: 'Pedro', age: 12, gender: 'M', clothingSize: ClothingSize.INFANTIL_14, shoeSize: 36 }
    ]
  }
];

const MOCK_PACKAGES: Package[] = [
  {
    id: 'pkg-001',
    name: 'Cesta Básica de Alimentos',
    description: 'Itens essenciais de alimentação para subsistência mensal.',
    items: [
      { id: 'pi-1', name: 'Arroz', quantity: 5, unit: 'kg' },
      { id: 'pi-2', name: 'Feijão', quantity: 1, unit: 'kg' },
      { id: 'pi-3', name: 'Macarrão', quantity: 1, unit: 'un' }, // Ajustado para un/pacote pois 500g não é kg inteiro
      { id: 'pi-4', name: 'Óleo de Soja', quantity: 1, unit: 'lt' },
      { id: 'pi-5', name: 'Açúcar', quantity: 1, unit: 'kg' },
      { id: 'pi-6', name: 'Café', quantity: 1, unit: 'un' }, // 500g pacote
      { id: 'pi-7', name: 'Farinha de Trigo', quantity: 1, unit: 'kg' },
      { id: 'pi-8', name: 'Leite em Pó', quantity: 1, unit: 'un' }, // Lata/Pacote
      { id: 'pi-9', name: 'Sardinha em Lata', quantity: 1, unit: 'un' },
      { id: 'pi-10', name: 'Sal', quantity: 1, unit: 'kg' },
      { id: 'pi-11', name: 'Margarina', quantity: 1, unit: 'un' } // 250g pote
    ]
  },
  {
    id: 'pkg-002',
    name: 'Kit Higiene Pessoal',
    description: 'Produtos básicos de higiene e limpeza.',
    items: [
      { id: 'pi-12', name: 'Sabão em Barra', quantity: 1, unit: 'un' },
      { id: 'pi-13', name: 'Detergente', quantity: 1, unit: 'un' },
      { id: 'pi-14', name: 'Papel Higiênico (Pct 4)', quantity: 1, unit: 'un' },
      { id: 'pi-15', name: 'Creme Dental', quantity: 1, unit: 'un' },
      { id: 'pi-16', name: 'Sabonete', quantity: 2, unit: 'un' }
    ]
  }
];

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-001',
    title: 'Natal Solidário 2024',
    description: 'Campanha para arrecadação de brinquedos e roupas para as crianças do lar.',
    type: CampaignType.CHRISTMAS,
    startDate: new Date('2024-11-01').toISOString(),
    endDate: new Date('2024-12-20').toISOString(),
    isActive: true,
    items: [
      { id: 'it-1', name: 'Brinquedos', targetQuantity: 3, collectedQuantity: 1, unit: 'un' }, // Calculado manual no mock
      { id: 'it-2', name: 'Panetones', targetQuantity: 2, collectedQuantity: 0, unit: 'un' }
    ],
    beneficiaryFamilyIds: ['fam-001', 'fam-002'],
    packageIds: [] // Campanha antiga ou personalizada sem pacote
  }
];

const STORAGE_KEYS = {
  FAMILIES: 'lar_matilde_families',
  CAMPAIGNS: 'lar_matilde_campaigns',
  PACKAGES: 'lar_matilde_packages',
  API_KEY: 'lar_matilde_api_key'
};

export const StorageService = {
  getFamilies: (): Family[] => {
    const data = localStorage.getItem(STORAGE_KEYS.FAMILIES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.FAMILIES, JSON.stringify(MOCK_FAMILIES));
      return MOCK_FAMILIES;
    }
    return JSON.parse(data);
  },

  saveFamily: (family: Family): void => {
    const families = StorageService.getFamilies();
    const index = families.findIndex(f => f.id === family.id);
    if (index >= 0) {
      families[index] = family;
    } else {
      families.push(family);
    }
    localStorage.setItem(STORAGE_KEYS.FAMILIES, JSON.stringify(families));
  },

  deleteFamily: (id: string): void => {
    const families = StorageService.getFamilies();
    const filtered = families.filter(f => f.id !== id);
    localStorage.setItem(STORAGE_KEYS.FAMILIES, JSON.stringify(filtered));
  },

  // Packages CRUD
  getPackages: (): Package[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PACKAGES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(MOCK_PACKAGES));
      return MOCK_PACKAGES;
    }
    return JSON.parse(data);
  },

  savePackage: (pkg: Package): void => {
    const packages = StorageService.getPackages();
    const index = packages.findIndex(p => p.id === pkg.id);
    if (index >= 0) {
      packages[index] = pkg;
    } else {
      packages.push(pkg);
    }
    localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(packages));
  },

  deletePackage: (id: string): void => {
    const packages = StorageService.getPackages();
    const filtered = packages.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(filtered));
  },

  // Campaigns CRUD
  getCampaigns: (): Campaign[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
    let campaigns: Campaign[] = [];
    
    if (!data) {
      campaigns = MOCK_CAMPAIGNS;
      localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(MOCK_CAMPAIGNS));
    } else {
      campaigns = JSON.parse(data);
    }

    const today = new Date().toISOString().split('T')[0];
    let hasUpdates = false;

    const updatedCampaigns = campaigns.map(c => {
      if (!c.beneficiaryFamilyIds) {
          c.beneficiaryFamilyIds = [];
          hasUpdates = true;
      }
      if (!c.packageIds) {
          c.packageIds = [];
          hasUpdates = true;
      }

      if (c.isActive && c.endDate < today) {
        hasUpdates = true;
        return { ...c, isActive: false };
      }
      return c;
    });

    if (hasUpdates) {
      localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(updatedCampaigns));
    }

    return updatedCampaigns;
  },

  saveCampaign: (campaign: Campaign): void => {
    const campaigns = StorageService.getCampaigns();
    const index = campaigns.findIndex(c => c.id === campaign.id);
    if (index >= 0) {
      campaigns[index] = campaign;
    } else {
      campaigns.push(campaign);
    }
    localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
  },
  
  toggleCampaignStatus: (id: string): void => {
      const campaigns = StorageService.getCampaigns();
      const campaignIndex = campaigns.findIndex(c => c.id === id);
      
      if(campaignIndex >= 0) {
          const campaign = campaigns[campaignIndex];
          const today = new Date().toISOString().split('T')[0];
          
          if (!campaign.isActive && campaign.endDate < today) {
            return;
          }

          campaign.isActive = !campaign.isActive;
          localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
      }
  },

  // Settings / API Key
  getApiKey: (): string => {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
  },

  saveApiKey: (key: string): void => {
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
  }
};