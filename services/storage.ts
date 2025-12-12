import { Family, Campaign, CampaignType, ClothingSize } from '../types';

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
      { id: 'it-1', name: 'Brinquedos', targetQuantity: 50, collectedQuantity: 12, unit: 'un' },
      { id: 'it-2', name: 'Panetones', targetQuantity: 25, collectedQuantity: 5, unit: 'un' }
    ]
  },
  {
    id: 'camp-002',
    title: 'Cesta Básica Outubro',
    description: 'Arrecadação mensal de alimentos não perecíveis.',
    type: CampaignType.MONTHLY_BASKET,
    startDate: new Date('2024-10-01').toISOString(),
    endDate: new Date('2024-10-31').toISOString(),
    isActive: true,
    items: [
      { id: 'it-3', name: 'Arroz 5kg', targetQuantity: 20, collectedQuantity: 20, unit: 'un' },
      { id: 'it-4', name: 'Feijão 1kg', targetQuantity: 40, collectedQuantity: 35, unit: 'un' }
    ]
  }
];

const STORAGE_KEYS = {
  FAMILIES: 'lar_matilde_families',
  CAMPAIGNS: 'lar_matilde_campaigns'
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

  getCampaigns: (): Campaign[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(MOCK_CAMPAIGNS));
      return MOCK_CAMPAIGNS;
    }
    return JSON.parse(data);
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
      const campaign = campaigns.find(c => c.id === id);
      if(campaign) {
          campaign.isActive = !campaign.isActive;
          StorageService.saveCampaign(campaign);
      }
  }
};