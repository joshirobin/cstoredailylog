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
    zipCode: string;
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

export interface TankConfig {
    type: string;
    capacity: number;
    reorderPoint: number;
    shutoffPoint: number;
}

export const useFuelStore = defineStore('fuel', () => {
    const logs = ref<FuelLog[]>([]);
    const orders = ref<FuelOrder[]>([]);
    const invoices = ref<FuelInvoice[]>([]);
    const competitorPrices = ref<CompetitorPrice[]>([]);
    const currentPrices = ref<CurrentFuelPrice[]>([]);
    const loading = ref(false);

    const tankConfigs = ref<TankConfig[]>([
        { type: 'Regular', capacity: 10000, reorderPoint: 3000, shutoffPoint: 300 },
        { type: 'Plus', capacity: 8000, reorderPoint: 2000, shutoffPoint: 300 },
        { type: 'Premium', capacity: 8000, reorderPoint: 2000, shutoffPoint: 300 },
        { type: 'Diesel', capacity: 12000, reorderPoint: 4000, shutoffPoint: 300 }
    ]);

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
        if (unsubscribeCompetitors || !locationsStore.activeLocation?.zipCode) return;

        const q = query(
            collection(db, 'fuel_competitors'),
            where('zipCode', '==', locationsStore.activeLocation.zipCode),
            orderBy('updatedAt', 'desc')
        );
        unsubscribeCompetitors = onSnapshot(q, (snapshot) => {
            competitorPrices.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompetitorPrice));
        });
    };

    const updateCompetitorPrice = async (price: Partial<CompetitorPrice> & { competitorName: string }) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocation?.zipCode) return;
        try {
            const zipCode = locationsStore.activeLocation.zipCode;
            const docId = price.id || `${zipCode}_${price.competitorName.toLowerCase().replace(/\s+/g, '-')}`;
            await setDoc(doc(db, 'fuel_competitors', docId), {
                ...price,
                id: docId,
                zipCode,
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

    // --- Logistics Intelligence (Feature 2) ---
    const getLogisticsStatus = (type: string) => {
        const config = tankConfigs.value.find(c => c.type === type);
        const latestLog = logs.value[0];
        const entry = latestLog?.entries.find(e => e.type === type);

        if (!config || !entry) return null;

        const currentGallons = entry.endInvAtg;
        const ullage = (config.capacity * 0.90) - currentGallons; // 90% safe fill rule

        // Simple prediction: average of last 3 logs sold gallons
        const history = logs.value.slice(0, 3).map(l => l.entries.find(e => e.type === type)?.soldGal || 0);
        const avgDailySales = history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : 1500;

        const daysToShutoff = (currentGallons - config.shutoffPoint) / (avgDailySales || 1);
        const hoursToShutoff = Math.max(0, daysToShutoff * 24);

        return {
            currentGallons,
            ullage: Math.max(0, Math.floor(ullage)),
            hoursToShutoff: Number(hoursToShutoff.toFixed(1)),
            isCritical: currentGallons <= config.reorderPoint,
            isShutoffRisk: hoursToShutoff < 24
        };
    };

    // --- Analytics Intelligence (Feature 3) ---
    const getVarianceTrends = () => {
        return logs.value.slice(0, 30).map(l => ({
            date: l.date,
            variance: l.totalVariance
        })).reverse();
    };

    const getMarginVelocity = () => {
        return currentPrices.value.map(p => {
            const latestLog = logs.value[0];
            const sold = (latestLog?.entries.find(e => e.type === p.type)?.soldGal) || (p.type.includes('Regular') ? 2500 : 800);
            return {
                type: p.type,
                margin: p.margin,
                volume: sold,
                velocity: p.margin * sold // Dollars earned from this fuel type
            };
        });
    };

    return {
        logs, loading, defaultFuelTypes, fetchLogs, stopSync, addLog,
        orders, fetchOrders, addOrder,
        invoices, fetchInvoices, addInvoice,
        competitorPrices, fetchCompetitorPrices, updateCompetitorPrice, deleteCompetitor,
        currentPrices, fetchCurrentPrices, updateCurrentPrice,
        tankConfigs, getLogisticsStatus, getVarianceTrends, getMarginVelocity
    };
});
