import { create } from 'zustand';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { useLocationsStore } from './useLocationsStore';

export interface VendorDelivery {
    id?: string;
    vendorName: string;
    invoiceNumber: string;
    deliveryDate: string;
    itemCountExpected: number;
    itemCountActual: number;
    shortages: { itemName: string, missingQty: number }[];
    receivedBy: string;
    status: 'VERIFIED' | 'DISCREPANCY' | 'PENDING';
    locationId: string;
    createdAt: any;
}

interface VendorState {
    deliveries: VendorDelivery[];
    loading: boolean;
    fetchDeliveries: () => Promise<void>;
    addDelivery: (delivery: Omit<VendorDelivery, 'id' | 'createdAt' | 'locationId'>) => Promise<void>;
}

export const useVendorStore = create<VendorState>((set, get) => ({
    deliveries: [],
    loading: false,

    fetchDeliveries: async () => {
        const locationId = useLocationsStore.getState().activeLocationId;
        if (!locationId) return;

        set({ loading: true });
        try {
            const q = query(
                collection(db, 'vendor_deliveries'),
                where('locationId', '==', locationId),
                orderBy('deliveryDate', 'desc')
            );
            const snap = await getDocs(q);
            const deliveriesData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VendorDelivery));
            set({ deliveries: deliveriesData });
        } catch (error) {
            console.error('Failed to fetch deliveries:', error);
        } finally {
            set({ loading: false });
        }
    },

    addDelivery: async (delivery) => {
        const locationId = useLocationsStore.getState().activeLocationId;
        if (!locationId) return;

        try {
            await addDoc(collection(db, 'vendor_deliveries'), {
                ...delivery,
                locationId: locationId,
                createdAt: Timestamp.now()
            });
            await get().fetchDeliveries();
        } catch (error) {
            console.error('Failed to add delivery:', error);
            throw error;
        }
    }
}));
