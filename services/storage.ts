import { db, auth } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { Family, Campaign, Package, DistributionEvent, OrganizationLocation, OrganizationBankInfo, OrganizationSettings } from '../types';

// Nomes das sub-coleções
const COLLECTIONS = {
  FAMILIES: 'families',
  CAMPAIGNS: 'campaigns',
  PACKAGES: 'packages',
  EVENTS: 'events',
  LOCATIONS: 'locations',
  BANK_INFO: 'bank_info',
  SETTINGS: 'settings'
};

// Helper: Garante que temos um usuário logado e retorna a referência da coleção DELE
const getUserCollection = (collectionName: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");
    // Caminho: organizations/{userId}/{collectionName}
    return collection(db, 'organizations', user.uid, collectionName);
};

// Helper: Retorna referência de documento específico do usuário
const getUserDoc = (collectionName: string, docId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");
    return doc(db, 'organizations', user.uid, collectionName, docId);
};

// Dados Padrão (Fallbacks)
const DEFAULT_SETTINGS: OrganizationSettings = { 
    registrationValidityMonths: 12,
    defaultVisitIntervalMonths: 6, // Visitas semestrais por padrão
    contactPhone: '',
    contactEmail: ''
};
const DEFAULT_BANK_INFO: OrganizationBankInfo = { accounts: [] };

// Função auxiliar para verificar expirações
const checkFamilyExpirations = async (families: Family[], campaigns: Campaign[]): Promise<{ families: Family[], campaigns: Campaign[] }> => {
    let settings = DEFAULT_SETTINGS;
    try {
        const settingsSnap = await getDoc(getUserDoc(COLLECTIONS.SETTINGS, 'global'));
        if (settingsSnap.exists()) {
            settings = { ...DEFAULT_SETTINGS, ...settingsSnap.data() };
        }
    } catch (e) {
        console.warn("Could not fetch settings for expiration check", e);
    }
    
    const today = new Date();
    let familiesUpdated = false;
    let campaignsUpdated = false;

    let updatedFamilies = [...families];
    let updatedCampaigns = [...campaigns];

    updatedFamilies = updatedFamilies.map(f => {
        if (f.status === 'Ativo') {
            const lastReview = new Date(f.lastReviewDate || f.registrationDate);
            const expirationDate = new Date(lastReview);
            expirationDate.setMonth(expirationDate.getMonth() + settings.registrationValidityMonths);

            if (today > expirationDate) {
                familiesUpdated = true;
                const newHistory = [
                    {
                        id: crypto.randomUUID(),
                        date: today.toISOString(),
                        type: 'Suspensão' as const,
                        description: 'Suspensão automática: Validade do cadastro expirada.',
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

        const updatePromises: Promise<void>[] = [];
        
        updatedFamilies.forEach(f => {
            const original = families.find(old => old.id === f.id);
            if (original?.status !== f.status) {
                updatePromises.push(setDoc(getUserDoc(COLLECTIONS.FAMILIES, f.id), f));
            }
        });

        if (campaignsUpdated) {
            updatedCampaigns.forEach(c => {
                 const original = campaigns.find(old => old.id === c.id);
                 if (original && original.beneficiaryFamilyIds.length !== c.beneficiaryFamilyIds.length) {
                     updatePromises.push(setDoc(getUserDoc(COLLECTIONS.CAMPAIGNS, c.id), c));
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
    if (!auth.currentUser) return [];
    
    const snapshot = await getDocs(getUserCollection(COLLECTIONS.FAMILIES));
    let families = snapshot.docs.map(doc => doc.data() as Family);
    
    const campSnapshot = await getDocs(getUserCollection(COLLECTIONS.CAMPAIGNS));
    let campaigns = campSnapshot.docs.map(doc => doc.data() as Campaign);

    const result = await checkFamilyExpirations(families, campaigns);
    return result.families;
  },

  saveFamily: async (family: Family): Promise<void> => {
    await setDoc(getUserDoc(COLLECTIONS.FAMILIES, family.id), family);
  },

  deleteFamily: async (id: string): Promise<void> => {
    await deleteDoc(getUserDoc(COLLECTIONS.FAMILIES, id));
  },

  // PACKAGES
  getPackages: async (): Promise<Package[]> => {
    if (!auth.currentUser) return [];
    const snapshot = await getDocs(getUserCollection(COLLECTIONS.PACKAGES));
    return snapshot.docs.map(doc => doc.data() as Package);
  },

  savePackage: async (pkg: Package): Promise<void> => {
    await setDoc(getUserDoc(COLLECTIONS.PACKAGES, pkg.id), pkg);
  },

  deletePackage: async (id: string): Promise<void> => {
    await deleteDoc(getUserDoc(COLLECTIONS.PACKAGES, id));
  },

  // CAMPAIGNS
  getCampaigns: async (): Promise<Campaign[]> => {
    if (!auth.currentUser) return [];
    const snapshot = await getDocs(getUserCollection(COLLECTIONS.CAMPAIGNS));
    let campaigns = snapshot.docs.map(doc => doc.data() as Campaign);

    const today = new Date().toISOString().split('T')[0];
    const updates: Promise<void>[] = [];

    campaigns = campaigns.map(c => {
      let changed = false;
      if (!c.beneficiaryFamilyIds) { c.beneficiaryFamilyIds = []; changed = true; }
      if (!c.packageIds) { c.packageIds = []; changed = true; }

      if (c.isActive && c.endDate < today) {
        c.isActive = false;
        changed = true;
      }

      if (changed) {
          updates.push(setDoc(getUserDoc(COLLECTIONS.CAMPAIGNS, c.id), c));
      }
      return c;
    });

    await Promise.all(updates);
    return campaigns;
  },

  saveCampaign: async (campaign: Campaign): Promise<void> => {
    await setDoc(getUserDoc(COLLECTIONS.CAMPAIGNS, campaign.id), campaign);
  },
  
  toggleCampaignStatus: async (id: string): Promise<void> => {
      const ref = getUserDoc(COLLECTIONS.CAMPAIGNS, id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
          const c = snap.data() as Campaign;
          const today = new Date().toISOString().split('T')[0];
          
          if (!c.isActive && c.endDate < today) {
            return; 
          }
          
          await setDoc(ref, { ...c, isActive: !c.isActive });
      }
  },

  // EVENTS
  getEvents: async (): Promise<DistributionEvent[]> => {
    if (!auth.currentUser) return [];
    const snapshot = await getDocs(getUserCollection(COLLECTIONS.EVENTS));
    return snapshot.docs.map(doc => doc.data() as DistributionEvent);
  },

  saveEvent: async (event: DistributionEvent): Promise<void> => {
    await setDoc(getUserDoc(COLLECTIONS.EVENTS, event.id), event);
  },

  deleteEvent: async (id: string): Promise<void> => {
    await deleteDoc(getUserDoc(COLLECTIONS.EVENTS, id));
  },

  // LOCATIONS
  getLocations: async (): Promise<OrganizationLocation[]> => {
    if (!auth.currentUser) return [];
    const snapshot = await getDocs(getUserCollection(COLLECTIONS.LOCATIONS));
    return snapshot.docs.map(doc => doc.data() as OrganizationLocation);
  },

  saveLocation: async (location: OrganizationLocation): Promise<void> => {
    await setDoc(getUserDoc(COLLECTIONS.LOCATIONS, location.id), location);
  },

  deleteLocation: async (id: string): Promise<void> => {
    await deleteDoc(getUserDoc(COLLECTIONS.LOCATIONS, id));
  },

  // BANK INFO
  getBankInfo: async (): Promise<OrganizationBankInfo> => {
    if (!auth.currentUser) return DEFAULT_BANK_INFO;
    const snap = await getDoc(getUserDoc(COLLECTIONS.BANK_INFO, 'main'));
    if (snap.exists()) {
        return snap.data() as OrganizationBankInfo;
    }
    return DEFAULT_BANK_INFO;
  },

  saveBankInfo: async (info: OrganizationBankInfo): Promise<void> => {
    await setDoc(getUserDoc(COLLECTIONS.BANK_INFO, 'main'), info);
  },

  // SETTINGS (User Global)
  getSettings: async (): Promise<OrganizationSettings> => {
      if (!auth.currentUser) return DEFAULT_SETTINGS;
      const snap = await getDoc(getUserDoc(COLLECTIONS.SETTINGS, 'global'));
      if (snap.exists()) {
          return { ...DEFAULT_SETTINGS, ...snap.data() } as OrganizationSettings;
      }
      return DEFAULT_SETTINGS;
  },

  saveSettings: async (settings: OrganizationSettings): Promise<void> => {
      await setDoc(getUserDoc(COLLECTIONS.SETTINGS, 'global'), settings);
  },

  // DELIVERY REGISTRATION LOGIC
  registerDelivery: async (eventId: string, familyId: string, campaignId: string, campaignTitle: string): Promise<void> => {
      const eventRef = getUserDoc(COLLECTIONS.EVENTS, eventId);
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
      const familyRef = getUserDoc(COLLECTIONS.FAMILIES, familyId);
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