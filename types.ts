
export enum ClothingSize {
  P = 'P',
  M = 'M',
  G = 'G',
  GG = 'GG',
  XG = 'XG',
  INFANTIL_2 = '2',
  INFANTIL_4 = '4',
  INFANTIL_6 = '6',
  INFANTIL_8 = '8',
  INFANTIL_10 = '10',
  INFANTIL_12 = '12',
  INFANTIL_14 = '14',
  INFANTIL_16 = '16'
}

export interface Child {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F' | 'Outro';
  clothingSize: ClothingSize | string;
  shoeSize: number;
  notes?: string;
}

export interface Family {
  id: string;
  responsibleName: string;
  address: string;
  phone: string;
  numberOfAdults: number;
  status: 'Ativo' | 'Inativo';
  children: Child[];
  registrationDate: string; // ISO String
}

export enum CampaignType {
  MONTHLY_BASKET = 'Cesta Básica Mensal',
  CHRISTMAS = 'Natal',
  EASTER = 'Páscoa',
  EMERGENCY = 'Emergencial',
  OTHER = 'Outro'
}

export interface CampaignItem {
  id: string;
  name: string;
  targetQuantity: number;
  collectedQuantity: number;
  unit: 'kg' | 'un' | 'lt' | 'pc';
}

// Novos tipos para Pacotes
export interface PackageItem {
  id: string;
  name: string;
  quantity: number;
  unit: 'kg' | 'un' | 'lt' | 'pc';
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  items: PackageItem[];
}

export interface Campaign {
  id: string;
  title: string;
  description: string; // Can be AI generated
  type: CampaignType;
  startDate: string;
  endDate: string;
  isActive: boolean;
  items: CampaignItem[]; // Itens calculados (cache do total necessário)
  packageIds: string[]; // IDs dos pacotes vinculados
  beneficiaryFamilyIds: string[]; // IDs das famílias vinculadas
}

export type ViewState = 'DASHBOARD' | 'FAMILIES' | 'CAMPAIGNS' | 'PACKAGES';
