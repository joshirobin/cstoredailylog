import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useLocationsStore } from './locations';

export interface PriceBookItem {
    id: string;
    price_book_id: string;
    locationId: string;
    sku: string;
    description: string;
    category: string;
    retail_price: number;
    price_type: 'Regular' | 'Sale' | 'Promo' | 'Multi-Price';
    effective_from: any;
    effective_to: any;
    status: 'Pending' | 'Active' | 'Expired';
    last_updated: any;
    // Legacy support for UI
    itemNumber?: string;
    vendor?: string;
    priceGroup?: string;
    unitCase?: number;
    caseCost?: number;
    caseDiscount?: number;
    unitCost?: number;
    margin?: number;
    taxGroup?: string;
    unitRetail?: number; // Added back for template compatibility
    srp?: number;
    suggested_retail?: number;
    needs_approval?: boolean;
    pos_sync_status?: 'Synced' | 'Pending' | 'Error';
}

export interface FuelPrice {
    id: string;
    grade: string;
    type?: string;
    price: number;
    status?: string;
    costPerGallon: number;
    retailPerGallon: number;
    marginPerGallon: number;
    lastUpdated: any;
}

export interface PricingRule {
    id: string;
    name: string;
    type: string;
    target: string;
    value: number;
    active: boolean;
    minMargin: number;
    scope: string;
}

export interface SyncLog {
    id: string;
    timestamp: any;
    action: string;
    status: string;
    itemsCount: number;
    itemName?: string;
    oldPrice?: number;
    newPrice?: number;
}

export const usePriceBookStore = defineStore('pricebook', () => {
    const items = ref<PriceBookItem[]>([]);
    const fuelPrices = ref<FuelPrice[]>([]);
    const pricingRules = ref<PricingRule[]>([]);
    const syncLogs = ref<SyncLog[]>([]);
    const loading = ref(false);

    const fetchItems = async (locId?: string) => {
        const locationsStore = useLocationsStore();
        const activeId = locId || locationsStore.activeLocationId;
        if (!activeId) return;

        loading.value = true;
        try {
            const q = query(collection(db, 'price_book_items'), where('locationId', '==', activeId));
            const querySnapshot = await getDocs(q);
            items.value = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    unitRetail: data.retail_price // Map for legacy template
                } as PriceBookItem;
            });
        } catch (error) {
            console.error('Failed to fetch price book items:', error);
        } finally {
            loading.value = false;
        }
    };

    const fetchFuelPrices = async () => {
        const querySnapshot = await getDocs(collection(db, 'fuel_prices'));
        fuelPrices.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FuelPrice));
    };

    const fetchPricingRules = async () => {
        const querySnapshot = await getDocs(collection(db, 'pricing_rules'));
        pricingRules.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PricingRule));
    };

    const fetchSyncLogs = async () => {
        const q = query(collection(db, 'sync_logs'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        syncLogs.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SyncLog));
    };

    const addItem = async (item: Omit<PriceBookItem, 'id' | 'last_updated'>) => {
        const locationsStore = useLocationsStore();
        const activeId = item.locationId || locationsStore.activeLocationId;
        if (!activeId) throw new Error('No location ID provided');

        try {
            const docRef = await addDoc(collection(db, 'price_book_items'), {
                ...item,
                locationId: activeId,
                last_updated: Timestamp.now()
            });
            await fetchItems(activeId);
            return docRef.id;
        } catch (error) {
            console.error('Failed to add price book item:', error);
            throw error;
        }
    };

    const updateItem = async (id: string, updates: Partial<PriceBookItem>) => {
        const locationsStore = useLocationsStore();
        const activeId = updates.locationId || locationsStore.activeLocationId;

        try {
            await updateDoc(doc(db, 'price_book_items', id), {
                ...updates,
                last_updated: Timestamp.now()
            });
            if (activeId) await fetchItems(activeId);
        } catch (error) {
            console.error('Failed to update price book item:', error);
            throw error;
        }
    };

    const deleteItem = async (id: string, locId?: string) => {
        const locationsStore = useLocationsStore();
        const activeId = locId || locationsStore.activeLocationId;

        try {
            await deleteDoc(doc(db, 'price_book_items', id));
            if (activeId) await fetchItems(activeId);
        } catch (error) {
            console.error('Failed to delete price book item:', error);
            throw error;
        }
    };

    return {
        items,
        fuelPrices,
        pricingRules,
        syncLogs,
        loading,
        fetchItems,
        fetchFuelPrices,
        fetchPricingRules,
        fetchSyncLogs,
        addItem,
        updateItem,
        deleteItem
    };
});
