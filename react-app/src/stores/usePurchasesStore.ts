import { create } from 'zustand';
import { db } from '../firebaseConfig';
import { useLocationsStore } from './useLocationsStore';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    where,
    Timestamp
} from 'firebase/firestore';

export interface Vendor {
    id: string;
    name: string;
    contact?: string;
    email?: string;
    phone?: string;
    address?: string;
    category?: string;
    locationId: string;
    createdAt: any;
}

export interface PurchaseItem {
    qty: number;
    code: string;
    scanCode: string;
    description: string;
    department: string;
    priceGroup: string;
    productCategory: string;
    units: number;
    caseCost: number;
    caseDisc: number;
    costPerUnitAfterDisc: number;
    extdCaseCost: number;
    unitRetail: number;
    extdCaseRetail: number;
    size?: string;
    margin: number;
    defaultMargin?: number;
    marginAfterRebate?: number;
    totalCost: number;
}

export interface Purchase {
    id: string;
    vendorId: string;
    vendorName: string;
    invoiceNumber: string;
    date: any; // String YYYY-MM-DD or Timestamp
    totalAmount: number;
    items?: PurchaseItem[];
    status: 'Pending' | 'Paid' | 'Cancelled';
    fileUrl?: string;
    rawScanData?: string;
    locationId: string;
    createdAt: any;
}

interface PurchasesState {
    purchases: Purchase[];
    vendors: Vendor[];
    loading: boolean;
    fetchVendors: () => Promise<void>;
    getOrCreateVendor: (name: string) => Promise<Vendor | null>;
    fetchPurchases: () => Promise<void>;
    addPurchase: (purchase: Omit<Purchase, 'id' | 'createdAt' | 'locationId'>) => Promise<string | undefined>;
    updatePurchase: (id: string, updates: Partial<Purchase>) => Promise<void>;
    deletePurchase: (id: string) => Promise<void>;
}

export const usePurchasesStore = create<PurchasesState>((set, get) => ({
    purchases: [],
    vendors: [],
    loading: false,

    fetchVendors: async () => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        try {
            const q = query(
                collection(db, 'vendors'),
                where('locationId', '==', activeLocationId)
            );
            const querySnapshot = await getDocs(q);
            set({
                vendors: querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Vendor))
            });
        } catch (error) {
            console.error('Error fetching vendors:', error);
        }
    },

    getOrCreateVendor: async (name: string) => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return null;

        const { vendors } = get();
        const existing = vendors.find(v => v.name.toLowerCase() === name.toLowerCase());
        if (existing) return existing;

        const newVendorBase = {
            name,
            createdAt: Timestamp.now()
        };

        const docRef = await addDoc(collection(db, 'vendors'), {
            ...newVendorBase,
            locationId: activeLocationId
        });
        const created = { id: docRef.id, ...newVendorBase, locationId: activeLocationId } as Vendor;
        set({ vendors: [...vendors, created] });
        return created;
    },

    fetchPurchases: async () => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        set({ loading: true });
        try {
            const q = query(
                collection(db, 'purchases'),
                where('locationId', '==', activeLocationId),
                orderBy('date', 'desc')
            );
            const querySnapshot = await getDocs(q);
            set({
                purchases: querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Purchase))
            });
        } catch (error) {
            console.error('Error fetching purchases:', error);
            // Fallback for missing index
            const q2 = query(
                collection(db, 'purchases'),
                where('locationId', '==', activeLocationId)
            );
            const snapshot2 = await getDocs(q2);
            const sorted = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase))
                .sort((a, b) => {
                    const dateA = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
                    const dateB = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
                    return dateB - dateA;
                });
            set({ purchases: sorted });
        } finally {
            set({ loading: false });
        }
    },

    addPurchase: async (purchase) => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        try {
            const docRef = await addDoc(collection(db, 'purchases'), {
                ...purchase,
                locationId: activeLocationId,
                createdAt: Timestamp.now()
            });

            // Note: syncItemsToLedger implementation omitted for brevity, but could be added here

            await get().fetchPurchases();
            return docRef.id;
        } catch (error) {
            console.error('Error adding purchase:', error);
            throw error;
        }
    },

    updatePurchase: async (id, updates) => {
        try {
            const purchaseRef = doc(db, 'purchases', id);
            await updateDoc(purchaseRef, updates);
            await get().fetchPurchases();
        } catch (error) {
            console.error('Error updating purchase:', error);
            throw error;
        }
    },

    deletePurchase: async (id) => {
        try {
            await deleteDoc(doc(db, 'purchases', id));
            await get().fetchPurchases();
        } catch (error) {
            console.error('Error deleting purchase:', error);
            throw error;
        }
    }
}));
