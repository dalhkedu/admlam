
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
  age: number; // Mantido para compatibilidade, calculado via birthDate se possível
  birthDate?: string; // YYYY-MM-DD
  gender: 'M' | 'F' | 'Outro';
  clothingSize: ClothingSize | string;
  shoeSize: number;
  isStudent?: boolean;
  schoolYear?: string; // Ano letivo
  hasDisability?: boolean;
  disabilityDetails?: string;
  notes?: string;
}

export interface Family {
  id: string;
  cardId?: string; // Nº da Carteirinha
  responsibleName: string; // Responsável / Assistido
  responsibleBirthDate?: string; // YYYY-MM-DD
  rg?: string;
  cpf?: string;
  maritalStatus?: 'Casada(o)' | 'Solteira(o)' | 'Viúva(o)' | 'Divorciada(o)' | 'União Estável' | 'Outro';
  spouseName?: string;
  
  address: string;
  phone: string;
  numberOfAdults: number; // Pessoas na casa (adultos)
  
  status: 'Ativo' | 'Inativo';
  children: Child[];
  registrationDate: string; // ISO String
  
  isPregnant?: boolean;
  pregnancyDueDate?: string;
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
  averagePrice?: number;
}

export interface PackageItem {
  id: string;
  name: string;
  quantity: number;
  unit: 'kg' | 'un' | 'lt' | 'pc';
  averagePrice?: number;
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
  description: string;
  type: CampaignType;
  startDate: string;
  endDate: string;
  isActive: boolean;
  items: CampaignItem[];
  packageIds: string[];
  beneficiaryFamilyIds: string[];
}

export enum EventFrequency {
  ONCE = 'Único',
  WEEKLY = 'Semanal',
  MONTHLY = 'Mensal',
  YEARLY = 'Anual'
}

export interface DistributionEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  isFree: boolean;
  entryFee?: number;
  frequency: EventFrequency;
  linkedCampaignIds: string[];
  status: 'Agendado' | 'Realizado' | 'Cancelado';
}

export enum LocationType {
  HEADQUARTERS = 'Sede Administrativa',
  BRANCH = 'Filial',
  STORE = 'Bazar / Loja',
  COLLECTION_POINT = 'Ponto de Coleta',
  WAREHOUSE = 'Depósito / Estoque'
}

export interface OrganizationLocation {
  id: string;
  name: string; // Ex: Sede Principal, Bazar Centro
  type: LocationType;
  address: string;
  phone?: string;
  operatingHours?: string; // Ex: Seg-Sex 08:00 as 18:00
  notes?: string;
}

export type ViewState = 'DASHBOARD' | 'FAMILIES' | 'CAMPAIGNS' | 'PACKAGES' | 'EVENTS' | 'SETTINGS';