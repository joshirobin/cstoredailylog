import { create } from 'zustand';
import { db, storage } from '../firebaseConfig';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    setDoc,
    doc,
    addDoc,
    getDocs,
    deleteDoc
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLocationsStore } from './useLocationsStore';

export interface FuelEntry {
    type: string;
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
    locationId?: string;
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
    locationId?: string;
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
    locationId?: string;
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

interface FuelState {
    logs: FuelLog[];
    orders: FuelOrder[];
    invoices: FuelInvoice[];
    competitorPrices: CompetitorPrice[];
    currentPrices: CurrentFuelPrice[];
    tankConfigs: TankConfig[];
    loading: boolean;
    defaultFuelTypes: string[];

    fetchTankConfigs: () => void;
    fetchLogs: () => void;
    stopSync: () => void;
    addLog: (log: Omit<FuelLog, 'id'>, file?: File) => Promise<void>;

    fetchOrders: () => void;
    addOrder: (order: Omit<FuelOrder, 'id'>) => Promise<string>;

    fetchInvoices: () => void;
    addInvoice: (invoice: Omit<FuelInvoice, 'id'>, file?: File) => Promise<string>;

    fetchCompetitorPrices: () => void;
    updateCompetitorPrice: (price: Partial<CompetitorPrice> & { competitorName: string }) => Promise<void>;
    deleteCompetitor: (id: string) => Promise<void>;

    fetchCurrentPrices: () => void;
    updateCurrentPrice: (price: Omit<CurrentFuelPrice, 'locationId'>) => Promise<void>;

    getLogisticsStatus: (type: string) => { ullage: number; isCritical: boolean; hoursToShutoff: number; currentGallons: number } | null;
}

let unsubscribeLogs: (() => void) | null = null;
let unsubscribeCompetitors: (() => void) | null = null;
let unsubscribePrices: (() => void) | null = null;
let unsubscribeTanks: (() => void) | null = null;

export const useFuelStore = create<FuelState>((set, get) => ({
    logs: [],
    orders: [],
    invoices: [],
    competitorPrices: [],
    currentPrices: [],
    tankConfigs: [],
    loading: false,
    defaultFuelTypes: ['Regular', 'Super (Premium)', 'Diesel B20', 'Diesel B5', 'Diesel Farm', 'Diesel Clear'],

    fetchTankConfigs: () => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (unsubscribeTanks || !activeLocationId) return;

        const q = query(
            collection(db, 'fuel_tank_configs'),
            where('locationId', '==', activeLocationId)
        );

        unsubscribeTanks = onSnapshot(q, async (snapshot) => {
            if (snapshot.empty) {
                const defaults: TankConfig[] = [
                    { type: 'Regular', capacity: 12000, reorderPoint: 3000, shutoffPoint: 300 },
                    { type: 'Super (Premium)', capacity: 8000, reorderPoint: 2000, shutoffPoint: 300 },
                    { type: 'Diesel B20', capacity: 10000, reorderPoint: 3000, shutoffPoint: 300 }
                ];

                for (const config of defaults) {
                    const docId = `${activeLocationId}_${config.type.replace(/\s+/g, '_')}`;
                    await setDoc(doc(db, 'fuel_tank_configs', docId), {
                        ...config,
                        locationId: activeLocationId,
                        updatedAt: new Date().toISOString()
                    });
                }
            } else {
                set({ tankConfigs: snapshot.docs.map(doc => doc.data() as TankConfig) });
            }
        });
    },

    fetchLogs: () => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (unsubscribeLogs || !activeLocationId) return;

        set({ loading: true });
        const q = query(
            collection(db, 'fuel_logs'),
            where('locationId', '==', activeLocationId),
            orderBy('date', 'desc')
        );

        unsubscribeLogs = onSnapshot(q, (snapshot) => {
            set({
                logs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FuelLog)),
                loading: false
            });
        });
    },

    stopSync: () => {
        if (unsubscribeLogs) { unsubscribeLogs(); unsubscribeLogs = null; }
        if (unsubscribeCompetitors) { unsubscribeCompetitors(); unsubscribeCompetitors = null; }
        if (unsubscribePrices) { unsubscribePrices(); unsubscribePrices = null; }
        if (unsubscribeTanks) { unsubscribeTanks(); unsubscribeTanks = null; }
    },

    addLog: async (log, file) => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        let atgImage = log.atgImage || '';
        if (file) {
            const fileRef = storageRef(storage, `fuel_logs/${activeLocationId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(fileRef, file);
            atgImage = await getDownloadURL(snapshot.ref);
        }

        const logId = `${activeLocationId}_${log.date}`;
        await setDoc(doc(db, 'fuel_logs', logId), {
            ...log,
            id: logId,
            atgImage,
            locationId: activeLocationId,
            updatedAt: new Date().toISOString()
        });
    },

    fetchOrders: async () => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        const q = query(
            collection(db, 'fuel_orders'),
            where('locationId', '==', activeLocationId),
            orderBy('date', 'desc')
        );
        const querySnapshot = await getDocs(q);
        set({ orders: querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FuelOrder)) });
    },

    addOrder: async (order) => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) throw new Error('No active location');

        const docRef = await addDoc(collection(db, 'fuel_orders'), {
            ...order,
            locationId: activeLocationId,
            createdAt: new Date().toISOString()
        });
        get().fetchOrders();
        return docRef.id;
    },

    fetchInvoices: async () => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        const q = query(
            collection(db, 'fuel_invoices'),
            where('locationId', '==', activeLocationId),
            orderBy('date', 'desc')
        );
        const querySnapshot = await getDocs(q);
        set({ invoices: querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FuelInvoice)) });
    },

    addInvoice: async (invoice, file) => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) throw new Error('No active location');

        let imageUrl = invoice.imageUrl || '';
        if (file) {
            const fileRef = storageRef(storage, `fuel_invoices/${activeLocationId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(fileRef, file);
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        const docRef = await addDoc(collection(db, 'fuel_invoices'), {
            ...invoice,
            imageUrl,
            locationId: activeLocationId,
            createdAt: new Date().toISOString()
        });
        get().fetchInvoices();
        return docRef.id;
    },

    fetchCompetitorPrices: () => {
        const activeLocation = useLocationsStore.getState().activeLocation;
        if (unsubscribeCompetitors || !activeLocation?.zipCode) return;

        const q = query(
            collection(db, 'fuel_competitors'),
            where('zipCode', '==', activeLocation.zipCode),
            orderBy('updatedAt', 'desc')
        );
        unsubscribeCompetitors = onSnapshot(q, (snapshot) => {
            set({ competitorPrices: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompetitorPrice)) });
        });
    },

    updateCompetitorPrice: async (price) => {
        const activeLocation = useLocationsStore.getState().activeLocation;
        if (!activeLocation?.zipCode) return;

        const docId = price.id || `${activeLocation.zipCode}_${price.competitorName?.toLowerCase().replace(/\s+/g, '-')}`;
        await setDoc(doc(db, 'fuel_competitors', docId), {
            ...price,
            id: docId,
            zipCode: activeLocation.zipCode,
            updatedAt: new Date().toISOString()
        });
    },

    deleteCompetitor: async (id) => {
        await deleteDoc(doc(db, 'fuel_competitors', id));
    },

    fetchCurrentPrices: () => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (unsubscribePrices || !activeLocationId) return;

        const q = query(
            collection(db, 'fuel_current_prices'),
            where('locationId', '==', activeLocationId)
        );

        unsubscribePrices = onSnapshot(q, async (snapshot) => {
            if (snapshot.empty) {
                const defaults = [
                    { type: 'Regular', cashPrice: 2.99, creditPrice: 3.09, costPerGal: 2.80, margin: 0.19, updatedAt: new Date().toISOString() },
                    { type: 'Super (Premium)', cashPrice: 3.59, creditPrice: 3.69, costPerGal: 3.20, margin: 0.39, updatedAt: new Date().toISOString() },
                    { type: 'Diesel B20', cashPrice: 3.89, creditPrice: 3.89, costPerGal: 3.50, margin: 0.39, updatedAt: new Date().toISOString() }
                ];
                for (const p of defaults) {
                    await setDoc(doc(db, 'fuel_current_prices', `${activeLocationId}_${p.type}`), {
                        ...p,
                        locationId: activeLocationId
                    });
                }
            } else {
                set({ currentPrices: snapshot.docs.map(doc => doc.data() as CurrentFuelPrice) });
            }
        });
    },

    updateCurrentPrice: async (price) => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        const docId = `${activeLocationId}_${price.type}`;
        await setDoc(doc(db, 'fuel_current_prices', docId), {
            ...price,
            locationId: activeLocationId,
            updatedAt: new Date().toISOString()
        });
    },

    getLogisticsStatus: (type) => {
        const config = get().tankConfigs.find(c => c.type === type);
        const latestLog = get().logs[0];
        const entry = latestLog?.entries.find(e => e.type === type);

        if (!config) return null;

        const currentGallons = entry?.endInvAtg || 0;
        const ullage = (config.capacity * 0.90) - currentGallons;

        // Use historical sales if available, otherwise default to 1500
        const history = get().logs.slice(0, 3).map(l => l.entries.find(e => e.type === type)?.soldGal || 0);
        const avgDailySales = history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : 1500;

        const daysToShutoff = (currentGallons - config.shutoffPoint) / (avgDailySales || 1);
        const hoursToShutoff = Math.max(0, daysToShutoff * 24);

        return {
            ullage: Math.max(0, Math.floor(ullage)),
            isCritical: currentGallons <= config.reorderPoint,
            hoursToShutoff: Number(hoursToShutoff.toFixed(1)),
            currentGallons
        };
    }
}));

