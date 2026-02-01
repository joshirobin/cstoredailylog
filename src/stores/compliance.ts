import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { useLocationsStore } from './locations';

export interface TemperatureReading {
    id?: string;
    equipmentName: string; // e.g., 'Beer Cave', 'Hot Case 1', 'Milk Cooler'
    type: 'COOLER' | 'FREEZER' | 'HOT_CASE';
    temperature: number;
    unit: 'F' | 'C';
    status: 'NORMAL' | 'ALERT'; // ALERT if out of safety range
    loggedBy: string;
    locationId: string;
    timestamp: any;
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

    const addReading = async (reading: Omit<TemperatureReading, 'id' | 'timestamp' | 'status' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const status = reading.type === 'HOT_CASE'
                ? (reading.temperature >= 140 ? 'NORMAL' : 'ALERT')
                : (reading.temperature <= 41 ? 'NORMAL' : 'ALERT');

            await addDoc(collection(db, 'temperature_logs'), {
                ...reading,
                locationId: locationsStore.activeLocationId,
                status,
                timestamp: Timestamp.now()
            });
            await fetchReadings();
        } catch (error) {
            console.error('Failed to add reading:', error);
            throw error;
        }
    };

    return { readings, loading, fetchReadings, addReading };
});
