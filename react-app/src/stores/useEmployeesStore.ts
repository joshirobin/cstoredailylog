import { create } from 'zustand';
import { db } from '../firebaseConfig';
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc,
    doc, query, orderBy, Timestamp, where
} from 'firebase/firestore';
import { useLocationsStore } from './useLocationsStore';

export interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    pin: string;
    email: string;
    phone?: string;
    position: string;
    department?: string;
    status: 'Active' | 'Inactive';
    role: 'Admin' | 'Manager' | 'Assistant Manager' | 'Shift Manager' | 'Cashier' | 'Stocker' | string;
    hireDate: string;
    hourlyRate?: number;
    emergencyContact?: string;
    emergencyPhone?: string;
    notes?: string;
    locationId?: string;
    createdAt?: any;
}

interface EmployeesState {
    employees: Employee[];
    loading: boolean;
    fetchEmployees: () => Promise<void>;
    addEmployee: (employee: Partial<Employee>) => Promise<string>;
    updateEmployee: (id: string, employee: Partial<Employee>) => Promise<void>;
    deleteEmployee: (id: string) => Promise<void>;
}

const COLLECTION = 'employees';

export const useEmployeesStore = create<EmployeesState>((set, get) => ({
    employees: [],
    loading: false,

    fetchEmployees: async () => {
        set({ loading: true });
        try {
            const locationId = useLocationsStore.getState().activeLocationId;
            let q;
            if (locationId) {
                q = query(
                    collection(db, COLLECTION),
                    where('locationId', '==', locationId),
                    orderBy('lastName', 'asc')
                );
            } else {
                q = query(collection(db, COLLECTION), orderBy('lastName', 'asc'));
            }
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
            set({ employees: data });
        } catch (e: any) {
            // Fallback: no index or empty
            console.warn('fetchEmployees fallback:', e.message);
            try {
                const snap = await getDocs(collection(db, COLLECTION));
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
                set({ employees: data.sort((a, b) => a.lastName.localeCompare(b.lastName)) });
            } catch (e2) {
                console.error('fetchEmployees failed:', e2);
            }
        } finally {
            set({ loading: false });
        }
    },

    addEmployee: async (employee) => {
        const locationId = useLocationsStore.getState().activeLocationId;
        try {
            const docRef = await addDoc(collection(db, COLLECTION), {
                ...employee,
                locationId: locationId || '',
                createdAt: Timestamp.now()
            });
            await get().fetchEmployees();
            return docRef.id;
        } catch (e) {
            console.error('addEmployee error:', e);
            throw e;
        }
    },

    updateEmployee: async (id, employee) => {
        try {
            await updateDoc(doc(db, COLLECTION, id), { ...employee });
            await get().fetchEmployees();
        } catch (e) {
            console.error('updateEmployee error:', e);
            throw e;
        }
    },

    deleteEmployee: async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTION, id));
            set(state => ({ employees: state.employees.filter(e => e.id !== id) }));
        } catch (e) {
            console.error('deleteEmployee error:', e);
            throw e;
        }
    },
}));
