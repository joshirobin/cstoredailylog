import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy, Timestamp, where, deleteDoc, doc } from 'firebase/firestore';
import { useLocationsStore } from './locations';

export interface TemperatureReading {
    id?: string;
    equipmentName: string; // e.g., 'Beer Cave', 'Hot Case 1', 'Milk Cooler'
    type: 'COOLER' | 'FREEZER' | 'HOT_CASE' | 'FUEL_SAFETY';
    temperature: number;
    unit: 'F' | 'C';
    status: 'NORMAL' | 'ALERT'; // ALERT if out of safety range
    loggedBy: string;
    locationId: string;
    timestamp: any;
    expireAt?: any; // For Firestore TTL (24h)
}

export const useComplianceStore = defineStore('compliance', () => {
    const readings = ref<TemperatureReading[]>([]);
    const loading = ref(false);

    const fetchReadings = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            const q = query(
                collection(db, 'temperature_logs'),
                where('locationId', '==', locationsStore.activeLocationId),
                orderBy('timestamp', 'desc')
            );
            const snap = await getDocs(q);
            readings.value = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TemperatureReading));
        } catch (error) {
            console.error('Failed to fetch readings:', error);
        } finally {
            loading.value = false;
        }
    };

    const addReading = async (reading: Omit<TemperatureReading, 'id' | 'timestamp' | 'status' | 'locationId' | 'expireAt'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const status = reading.type === 'HOT_CASE'
                ? (reading.temperature >= 140 ? 'NORMAL' : 'ALERT')
                : reading.type === 'FUEL_SAFETY'
                    ? (reading.temperature === 0 ? 'NORMAL' : 'ALERT')
                    : (reading.temperature <= 41 ? 'NORMAL' : 'ALERT');

            const now = Date.now();
            const expireAt = Timestamp.fromMillis(now + 24 * 60 * 60 * 1000); // 24 hours from now

            await addDoc(collection(db, 'temperature_logs'), {
                ...reading,
                locationId: locationsStore.activeLocationId,
                status,
                timestamp: Timestamp.now(),
                expireAt: expireAt
            });
            await fetchReadings();
        } catch (error) {
            console.error('Failed to add reading:', error);
            throw error;
        }
    };

    const deleteReading = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'temperature_logs', id));
            await fetchReadings();
        } catch (error) {
            console.error('Failed to delete reading:', error);
            throw error;
        }
    };

    return { readings, loading, fetchReadings, addReading, deleteReading };
});
