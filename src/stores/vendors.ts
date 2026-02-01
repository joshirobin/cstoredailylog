import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { useLocationsStore } from './locations';

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

export const useVendorStore = defineStore('vendors', () => {
    const deliveries = ref<VendorDelivery[]>([]);
    const loading = ref(false);

    const fetchDeliveries = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            const q = query(
                collection(db, 'vendor_deliveries'),
                where('locationId', '==', locationsStore.activeLocationId),
                orderBy('deliveryDate', 'desc')
            );
            const snap = await getDocs(q);
            deliveries.value = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VendorDelivery));
        } catch (error) {
            console.error('Failed to fetch deliveries:', error);
        } finally {
            loading.value = false;
        }
    };

    const addDelivery = async (delivery: Omit<VendorDelivery, 'id' | 'createdAt' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            await addDoc(collection(db, 'vendor_deliveries'), {
                ...delivery,
                locationId: locationsStore.activeLocationId,
                createdAt: Timestamp.now()
            });
            await fetchDeliveries();
        } catch (error) {
            console.error('Failed to add delivery:', error);
            throw error;
        }
    };

    return { deliveries, loading, fetchDeliveries, addDelivery };
});
