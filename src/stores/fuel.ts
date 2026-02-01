import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, getDocs, setDoc, doc, query, orderBy, addDoc, onSnapshot, where } from 'firebase/firestore';
import { useLocationsStore } from './locations';

export interface FuelEntry {
    type: string; // 'Regular', 'Plus', 'Premium', 'Diesel', etc.
    inch: number;
    beginGal: number;
    deliveryGal: number;
    soldGal: number;
    bookInv: number;
    endInvAtg: number;
    costPerGal: number;
    variance: number;
}

export interface FuelLog {
    id: string;
    date: string;
    entries: FuelEntry[];
    totalVariance: number;
    notes?: string;
    atgImage?: string;
    updatedAt: string;
}

export interface FuelOrder {
    id: string;
    date: string;
    orderNumber: string;
    supplier: string;
    items: { type: string; gallons: number }[];
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
    notes?: string;
    createdAt: string;
}

export interface FuelInvoice {
    id: string;
    date: string;
    invoiceNumber: string;
    orderId?: string;
    supplier: string;
    items: {
        type: string;
        gallons: number;
        costPerGal: number;
        taxes: number;
        totalCost: number;
    }[];
    totalAmount: number;
    imageUrl?: string;
    status: 'PAID' | 'UNPAID';
    scanMetadata?: any;
    createdAt: string;
}

export interface CompetitorPrice {
    id: string;
    competitorName: string;
    distance: string;
    prices: { type: string; price: number }[];
    updatedAt: string;
}

export interface CurrentFuelPrice {
    type: string;
    cashPrice: number;
    creditPrice: number;
    costPerGal: number;
    margin: number;
    updatedAt: string;
}

export const useFuelStore = defineStore('fuel', () => {
    const logs = ref<FuelLog[]>([]);
    const orders = ref<FuelOrder[]>([]);
    const invoices = ref<FuelInvoice[]>([]);
    const competitorPrices = ref<CompetitorPrice[]>([]);
    const currentPrices = ref<CurrentFuelPrice[]>([]);
    const loading = ref(false);

    const defaultFuelTypes = ['Regular', 'Plus', 'Premium', 'Diesel', 'Kerosene'];

    let unsubscribeLogs: (() => void) | null = null;
    let unsubscribeCompetitors: (() => void) | null = null;
    let unsubscribePrices: (() => void) | null = null;

    const fetchLogs = () => {
        const locationsStore = useLocationsStore();
        if (unsubscribeLogs || !locationsStore.activeLocationId) return;

        loading.value = true;
        const q = query(
            collection(db, 'fuel_logs'),
            where('locationId', '==', locationsStore.activeLocationId),
            orderBy('date', 'desc')
        );

        unsubscribeLogs = onSnapshot(q, (snapshot) => {
            logs.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FuelLog));
            loading.value = false;
        }, (error) => {
            console.error('Real-time sync failed:', error);
            loading.value = false;
        });
    };

    const stopSync = () => {
        if (unsubscribeLogs) { unsubscribeLogs(); unsubscribeLogs = null; }
        if (unsubscribeCompetitors) { unsubscribeCompetitors(); unsubscribeCompetitors = null; }
        if (unsubscribePrices) { unsubscribePrices(); unsubscribePrices = null; }
    };

    const addLog = async (log: Omit<FuelLog, 'id'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const date = log.date;
            const logId = `${locationsStore.activeLocationId}_${date}`;
            await setDoc(doc(db, 'fuel_logs', logId), {
                ...log,
                id: logId,
                locationId: locationsStore.activeLocationId,
                updatedAt: new Date().toISOString()
            });
            // onSnapshot will automatically update logs.value
        } catch (error) {
            console.error('Failed to save fuel log:', error);
            throw error;
        }
    };

    const fetchOrders = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const q = query(
                collection(db, 'fuel_orders'),
                where('locationId', '==', locationsStore.activeLocationId),
                orderBy('date', 'desc')
            );
            const querySnapshot = await getDocs(q);
            orders.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FuelOrder));
        } catch (error) {
            console.error('Failed to fetch fuel orders:', error);
        }
    };

    const addOrder = async (order: Omit<FuelOrder, 'id' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;
        try {
            const docRef = await addDoc(collection(db, 'fuel_orders'), {
                ...order,
                locationId: locationsStore.activeLocationId,
                createdAt: new Date().toISOString() // Ensure createdAt is set
            });
            await fetchOrders();
            return docRef.id;
        } catch (error) {
            console.error('Failed to add fuel order:', error);
            throw error;
        }
    };

    const fetchInvoices = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const q = query(
                collection(db, 'fuel_invoices'),
                where('locationId', '==', locationsStore.activeLocationId),
                orderBy('date', 'desc')
            );
            const querySnapshot = await getDocs(q);
            invoices.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FuelInvoice));
        } catch (error) {
            console.error('Failed to fetch fuel invoices:', error);
        }
    };

    const addInvoice = async (invoice: Omit<FuelInvoice, 'id' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;
        try {
            const docRef = await addDoc(collection(db, 'fuel_invoices'), {
                ...invoice,
                locationId: locationsStore.activeLocationId,
                createdAt: new Date().toISOString() // Ensure createdAt is set
            });
            await fetchInvoices();
            return docRef.id;
        } catch (error) {
            console.error('Failed to add fuel invoice:', error);
            throw error;
        }
    };

    const fetchCompetitorPrices = () => {
        const locationsStore = useLocationsStore();
        if (unsubscribeCompetitors || !locationsStore.activeLocationId) return;

        const q = query(
            collection(db, 'fuel_competitors'),
            where('locationId', '==', locationsStore.activeLocationId),
            orderBy('updatedAt', 'desc')
        );
        unsubscribeCompetitors = onSnapshot(q, (snapshot) => {
            competitorPrices.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompetitorPrice));
        });
    };

    const updateCompetitorPrice = async (price: Partial<CompetitorPrice> & { competitorName: string }) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;
        try {
            const docId = price.id || `${locationsStore.activeLocationId}_${price.competitorName.toLowerCase().replace(/\s+/g, '-')}`;
            await setDoc(doc(db, 'fuel_competitors', docId), {
                ...price,
                id: docId,
                locationId: locationsStore.activeLocationId,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to update competitor price:', error);
        }
    };

    const deleteCompetitor = async (id: string) => {
        try {
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, 'fuel_competitors', id));
        } catch (error) {
            console.error('Failed to delete competitor:', error);
        }
    };

    const fetchCurrentPrices = () => {
        const locationsStore = useLocationsStore();
        if (unsubscribePrices || !locationsStore.activeLocationId) return;

        const q = query(
            collection(db, 'fuel_current_prices'),
            where('locationId', '==', locationsStore.activeLocationId)
        );

        unsubscribePrices = onSnapshot(q, async (snapshot) => {
            currentPrices.value = snapshot.docs.map(doc => doc.data() as CurrentFuelPrice);

            if (snapshot.empty) {
                // Initialize with defaults if collection is empty
                const defaults: Omit<CurrentFuelPrice, 'locationId'>[] = [
                    { type: 'Regular', cashPrice: 2.99, creditPrice: 3.09, costPerGal: 2.80, margin: 0.19, updatedAt: new Date().toISOString() },
                    { type: 'Plus', cashPrice: 3.29, creditPrice: 3.39, costPerGal: 3.00, margin: 0.29, updatedAt: new Date().toISOString() },
                    { type: 'Premium', cashPrice: 3.59, creditPrice: 3.69, costPerGal: 3.20, margin: 0.39, updatedAt: new Date().toISOString() },
                    { type: 'Diesel', cashPrice: 3.89, creditPrice: 3.89, costPerGal: 3.50, margin: 0.39, updatedAt: new Date().toISOString() }
                ];
                for (const p of defaults) {
                    await setDoc(doc(db, 'fuel_current_prices', `${locationsStore.activeLocationId}_${p.type}`), {
                        ...p,
                        locationId: locationsStore.activeLocationId
                    });
                }
            }
        });
    };

    const updateCurrentPrice = async (price: Omit<CurrentFuelPrice, 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;
        try {
            const docId = `${locationsStore.activeLocationId}_${price.type}`;
            await setDoc(doc(db, 'fuel_current_prices', docId), {
                ...price,
                locationId: locationsStore.activeLocationId,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to update current price:', error);
        }
    };

    return {
        logs, loading, defaultFuelTypes, fetchLogs, stopSync, addLog,
        orders, fetchOrders, addOrder,
        invoices, fetchInvoices, addInvoice,
        competitorPrices, fetchCompetitorPrices, updateCompetitorPrice, deleteCompetitor,
        currentPrices, fetchCurrentPrices, updateCurrentPrice
    };
});
