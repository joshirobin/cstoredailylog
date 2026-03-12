import { create } from 'zustand';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy, Timestamp, where, deleteDoc, doc } from 'firebase/firestore';
import { useLocationsStore } from './useLocationsStore';

export interface TemperatureReading {
    id?: string;
    equipmentName: string;
    type: 'COOLER' | 'FREEZER' | 'HOT_CASE' | 'FUEL_SAFETY';
    temperature: number;
    unit: 'F' | 'C';
    status: 'NORMAL' | 'ALERT';
    loggedBy: string;
    locationId: string;
    timestamp: any;
    expireAt?: any;
}

interface ComplianceState {
    readings: TemperatureReading[];
    loading: boolean;
    fetchReadings: () => Promise<void>;
    addReading: (reading: Omit<TemperatureReading, 'id' | 'timestamp' | 'status' | 'locationId' | 'expireAt'>) => Promise<void>;
    deleteReading: (id: string) => Promise<void>;
}

export const useComplianceStore = create<ComplianceState>((set, get) => ({
    readings: [],
    loading: false,

    fetchReadings: async () => {
        const locationId = useLocationsStore.getState().activeLocationId;
        if (!locationId) return;

        set({ loading: true });
        try {
            const q = query(
                collection(db, 'temperature_logs'),
                where('locationId', '==', locationId),
                orderBy('timestamp', 'desc')
            );
            const snap = await getDocs(q);
            const readingsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TemperatureReading));
            set({ readings: readingsData });
        } catch (error) {
            console.error('Failed to fetch readings:', error);
        } finally {
            set({ loading: false });
        }
    },

    addReading: async (reading) => {
        const locationId = useLocationsStore.getState().activeLocationId;
        if (!locationId) return;

        try {
            const status = reading.type === 'HOT_CASE'
                ? (reading.temperature >= 140 ? 'NORMAL' : 'ALERT')
                : reading.type === 'FUEL_SAFETY'
                    ? (reading.temperature === 0 ? 'NORMAL' : 'ALERT')
                    : (reading.temperature <= 41 ? 'NORMAL' : 'ALERT');

            const now = Date.now();
            const expireAt = Timestamp.fromMillis(now + 24 * 60 * 60 * 1000);

            await addDoc(collection(db, 'temperature_logs'), {
                ...reading,
                locationId: locationId,
                status,
                timestamp: Timestamp.now(),
                expireAt: expireAt
            });
            await get().fetchReadings();
        } catch (error) {
            console.error('Failed to add reading:', error);
            throw error;
        }
    },

    deleteReading: async (id: string) => {
        try {
            await deleteDoc(doc(db, 'temperature_logs', id));
            await get().fetchReadings();
        } catch (error) {
            console.error('Failed to delete reading:', error);
            throw error;
        }
    }
}));
