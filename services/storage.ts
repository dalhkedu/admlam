import { db } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { Family, Campaign, CampaignType, ClothingSize, Package, DistributionEvent, EventFrequency, OrganizationLocation, LocationType, OrganizationBankInfo, OrganizationSettings } from '../types';

// Coleções do Firestore
const COLLECTIONS = {
  FAMILIES: 'families',
  CAMPAIGNS: 'campaigns',
  PACKAGES: 'packages',
  EVENTS: 'events',
  LOCATIONS: 'locations',
  BANK_INFO: 'bank_info',
  SETTINGS: 'settings'
};

const STORAGE_KEYS = {
  API_KEY: 'lar_matilde_api_key' // Mantém API Key local por segurança/conveniência
};

// Dados Padrão (Fallbacks)
const DEFAULT_SETTINGS: OrganizationSettings = { registrationValidityMonths: 12 };
const DEFAULT_BANK_INFO: OrganizationBankInfo = { accounts: [] };

// Função auxiliar para verificar expirações (Lógica de Negócio)
const checkFamilyExpirations = async (families: Family[], campaigns: Campaign[]): Promise<{ families: Family[], campaigns: Campaign[] }> => {
    // Busca configurações do Firestore
    let settings = DEFAULT_SETTINGS;
    try {
        const settingsDoc = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'global'));
        if (settingsDoc.exists()) {
            settings = settingsDoc.data() as OrganizationSettings;
        }
    } catch (e) {
        console.warn("Could not fetch settings for expiration check", e);
    }
    
    const today = new Date();
    let familiesUpdated = false;
    let campaignsUpdated = false;

    // Deep copy para manipulação
    let updatedFamilies = [...families];
    let updatedCampaigns = [...campaigns];

    updatedFamilies = updatedFamilies.map(f => {
        if (f.status === 'Ativo') {
            const lastReview = new Date(f.lastReviewDate || f.registrationDate);
            const expirationDate = new Date(lastReview);
            expirationDate.setMonth(expirationDate.getMonth() + settings.registrationValidityMonths);

            if (today > expirationDate) {
                // Expired
                familiesUpdated = true;
                const newHistory = [
                    {
                        id: crypto.randomUUID(),
                        date: today.toISOString(),
                        type: 'Suspensão' as const,
                        description: 'Suspensão automática: Validade do cadastro expirada. Necessário revisão cadastral.',
                        author: 'Sistema'
                    },
                    ...(f.history || [])
                ];
                return { ...f, status: 'Suspenso' as const, history: newHistory };
            }
        }
        return f;
    });

    if (familiesUpdated) {
        const suspendedIds = updatedFamilies.filter(f => f.status === 'Suspenso').map(f => f.id);
        
        updatedCampaigns = updatedCampaigns.map(c => {
             const hasSuspended = c.beneficiaryFamilyIds.some(id => suspendedIds.includes(id));
             if (hasSuspended) {
                 campaignsUpdated = true;
                 return {
                     ...c,
                     beneficiaryFamilyIds: c.beneficiaryFamilyIds.filter(id => !suspendedIds.includes(id))
                 };
             }
             return c;
        });

        // Salvar alterações no banco
        // Nota: Em um sistema real de grande escala, isso seria uma Cloud Function. 
        // Aqui faremos update no cliente para simplificar.
        const updatePromises: Promise<void>[] = [];
        
        updatedFamilies.forEach(f => {
            const original = families.find(old => old.id === f.id);
            if (original?.status !== f.status) {
                updatePromises.push(setDoc(doc(db, COLLECTIONS.FAMILIES, f.id), f));
            }
        });

        if (campaignsUpdated) {
            updatedCampaigns.forEach(c => {
                 // Simplificação: Salva apenas se mudou (lógica básica)
                 const original = campaigns.find(old => old.id === c.id);
                 if (original && original.beneficiaryFamilyIds.length !== c.beneficiaryFamilyIds.length) {
                     updatePromises.push(setDoc(doc(db, COLLECTIONS.CAMPAIGNS, c.id), c));
                 }
            });
        }
        
        await Promise.all(updatePromises);
    }

    return {
        families: updatedFamilies,
        campaigns: updatedCampaigns
    };
};

export const StorageService = {
  // FAMILIES
  getFamilies: async (): Promise<Family[]> => {
    const snapshot = await getDocs(collection(db, COLLECTIONS.FAMILIES));
    let families = snapshot.docs.map(doc => doc.data() as Family);
    
    // Precisamos das campanhas para a lógica de expiração
    const campSnapshot = await getDocs(collection(db, COLLECTIONS.CAMPAIGNS));
    let campaigns = campSnapshot.docs.map(doc => doc.data() as Campaign);

    const result = await checkFamilyExpirations(families, campaigns);
    return result.families;
  },

  saveFamily: async (family: Family): Promise<void> => {
    await setDoc(doc(db, COLLECTIONS.FAMILIES, family.id), family);
  },

  deleteFamily: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTIONS.FAMILIES, id));
  },

  // PACKAGES
  getPackages: async (): Promise<Package[]> => {
    const snapshot = await getDocs(collection(db, COLLECTIONS.PACKAGES));
    return snapshot.docs.map(doc => doc.data() as Package);
  },

  savePackage: async (pkg: Package): Promise<void> => {
    await setDoc(doc(db, COLLECTIONS.PACKAGES, pkg.id), pkg);
  },

  deletePackage: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTIONS.PACKAGES, id));
  },

  // CAMPAIGNS
  getCampaigns: async (): Promise<Campaign[]> => {
    const snapshot = await getDocs(collection(db, COLLECTIONS.CAMPAIGNS));
    let campaigns = snapshot.docs.map(doc => doc.data() as Campaign);

    // Update old active campaigns logic
    const today = new Date().toISOString().split('T')[0];
    const updates: Promise<void>[] = [];

    campaigns = campaigns.map(c => {
      let changed = false;
      // Ensure fields exist
      if (!c.beneficiaryFamilyIds) { c.beneficiaryFamilyIds = []; changed = true; }
      if (!c.packageIds) { c.packageIds = []; changed = true; }

      // Auto close expired
      if (c.isActive && c.endDate < today) {
        c.isActive = false;
        changed = true;
      }

      if (changed) {
          updates.push(setDoc(doc(db, COLLECTIONS.CAMPAIGNS, c.id), c));
      }
      return c;
    });

    await Promise.all(updates);
    return campaigns;
  },

  saveCampaign: async (campaign: Campaign): Promise<void> => {
    await setDoc(doc(db, COLLECTIONS.CAMPAIGNS, campaign.id), campaign);
  },
  
  toggleCampaignStatus: async (id: string): Promise<void> => {
      // Fetch fresh to toggle safely
      const ref = doc(db, COLLECTIONS.CAMPAIGNS, id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
          const c = snap.data() as Campaign;
          const today = new Date().toISOString().split('T')[0];
          
          if (!c.isActive && c.endDate < today) {
            return; // Cannot reactivate expired date
          }
          
          await setDoc(ref, { ...c, isActive: !c.isActive });
      }
  },

  // EVENTS
  getEvents: async (): Promise<DistributionEvent[]> => {
    const snapshot = await getDocs(collection(db, COLLECTIONS.EVENTS));
    return snapshot.docs.map(doc => doc.data() as DistributionEvent);
  },

  saveEvent: async (event: DistributionEvent): Promise<void> => {
    await setDoc(doc(db, COLLECTIONS.EVENTS, event.id), event);
  },

  deleteEvent: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTIONS.EVENTS, id));
  },

  // LOCATIONS
  getLocations: async (): Promise<OrganizationLocation[]> => {
    const snapshot = await getDocs(collection(db, COLLECTIONS.LOCATIONS));
    return snapshot.docs.map(doc => doc.data() as OrganizationLocation);
  },

  saveLocation: async (location: OrganizationLocation): Promise<void> => {
    await setDoc(doc(db, COLLECTIONS.LOCATIONS, location.id), location);
  },

  deleteLocation: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTIONS.LOCATIONS, id));
  },

  // BANK INFO
  getBankInfo: async (): Promise<OrganizationBankInfo> => {
    const docRef = doc(db, COLLECTIONS.BANK_INFO, 'main');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return snap.data() as OrganizationBankInfo;
    }
    return DEFAULT_BANK_INFO;
  },

  saveBankInfo: async (info: OrganizationBankInfo): Promise<void> => {
    await setDoc(doc(db, COLLECTIONS.BANK_INFO, 'main'), info);
  },

  // SETTINGS (Global)
  getSettings: async (): Promise<OrganizationSettings> => {
      const docRef = doc(db, COLLECTIONS.SETTINGS, 'global');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
          return snap.data() as OrganizationSettings;
      }
      return DEFAULT_SETTINGS;
  },

  saveSettings: async (settings: OrganizationSettings): Promise<void> => {
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'global'), settings);
  },

  // API KEY (Local Only)
  getApiKey: (): string => {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
  },

  saveApiKey: (key: string): void => {
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
  },

  // DELIVERY REGISTRATION LOGIC
  registerDelivery: async (eventId: string, familyId: string, campaignId: string, campaignTitle: string): Promise<void> => {
      const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
      const eventSnap = await getDoc(eventRef);
      if (!eventSnap.exists()) return;
      
      const event = eventSnap.data() as DistributionEvent;
      const today = new Date().toISOString();

      // 1. Update Event
      if (!event.deliveredFamilyIds) event.deliveredFamilyIds = [];
      if (!event.deliveredFamilyIds.includes(familyId)) {
          const newDelivered = [...event.deliveredFamilyIds, familyId];
          await setDoc(eventRef, { ...event, deliveredFamilyIds: newDelivered });
      }

      // 2. Update Family
      const familyRef = doc(db, COLLECTIONS.FAMILIES, familyId);
      const familySnap = await getDoc(familyRef);
      if (familySnap.exists()) {
          const family = familySnap.data() as Family;
          
          const historyEntry = {
              id: crypto.randomUUID(),
              date: today,
              type: 'Entrega' as const,
              description: `Recebimento de doação no evento "${event.title}" (Campanha: ${campaignTitle}).`,
              author: 'Admin'
          };
          
          const updatedHistory = [historyEntry, ...(family.history || [])];
          let updates: any = { history: updatedHistory };

          // Registration Review Logic
          if (event.isRegistrationReview) {
              updates.lastReviewDate = today;
              if (family.status !== 'Ativo') {
                  updates.status = 'Ativo';
                  updates.history.unshift({
                      id: crypto.randomUUID(),
                      date: today,
                      type: 'Reativação' as const,
                      description: `Reativação automática via presença no evento "${event.title}".`,
                      author: 'Sistema'
                  });
              }
          }

          await setDoc(familyRef, { ...family, ...updates });
      }
  }
};