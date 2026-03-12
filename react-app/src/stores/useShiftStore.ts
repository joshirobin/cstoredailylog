import { create } from 'zustand';
import { db } from '../firebaseConfig';
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc,
    doc, query, where, orderBy, Timestamp
} from 'firebase/firestore';
import { useLocationsStore } from './useLocationsStore';

export interface Shift {
    id: string;
    employeeId: string;
    employeeName?: string;
    position?: string;
    startTime: any;   // Firestore Timestamp
    endTime: any;     // Firestore Timestamp
    date: string;     // YYYY-MM-DD, index key
    notes?: string;
    locationId?: string;
}

interface ShiftState {
    shifts: Shift[];
    loading: boolean;
    fetchShifts: (weekStart?: Date) => Promise<void>;
    addShift: (shift: Omit<Shift, 'id'>) => Promise<string>;
    updateShift: (id: string, data: Partial<Shift>) => Promise<void>;
    deleteShift: (id: string) => Promise<void>;
}

const COLLECTION = 'shifts';

export const useShiftStore = create<ShiftState>((set, get) => ({
    shifts: [],
    loading: false,

    fetchShifts: async (weekStart) => {
        set({ loading: true });
        try {
            const locationId = useLocationsStore.getState().activeLocationId;
            let q;

            if (weekStart && locationId) {
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 7);
                q = query(
                    collection(db, COLLECTION),
                    where('locationId', '==', locationId),
                    where('startTime', '>=', Timestamp.fromDate(weekStart)),
                    where('startTime', '<', Timestamp.fromDate(weekEnd)),
                    orderBy('startTime', 'asc')
                );
            } else if (locationId) {
                q = query(
                    collection(db, COLLECTION),
                    where('locationId', '==', locationId),
                    orderBy('startTime', 'asc')
                );
            } else {
                q = query(collection(db, COLLECTION), orderBy('startTime', 'asc'));
            }

            const snap = await getDocs(q);
            set({ shifts: snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift)) });
        } catch (e: any) {
            console.warn('fetchShifts fallback:', e.message);
            try {
                const snap = await getDocs(collection(db, COLLECTION));
                set({ shifts: snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift)) });
            } catch (e2) {
                console.error('fetchShifts failed:', e2);
            }
        } finally {
            set({ loading: false });
        }
    },

    addShift: async (shift) => {
        const locationId = useLocationsStore.getState().activeLocationId;
        try {
            const docRef = await addDoc(collection(db, COLLECTION), {
                ...shift,
                locationId: locationId || '',
            });
            await get().fetchShifts();
            return docRef.id;
        } catch (e) {
            console.error('addShift error:', e);
            throw e;
        }
    },

    updateShift: async (id, data) => {
        try {
            await updateDoc(doc(db, COLLECTION, id), data);
            await get().fetchShifts();
        } catch (e) {
            console.error('updateShift error:', e);
            throw e;
        }
    },

    deleteShift: async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTION, id));
            set(state => ({ shifts: state.shifts.filter(s => s.id !== id) }));
        } catch (e) {
            console.error('deleteShift error:', e);
            throw e;
        }
    },
}));
