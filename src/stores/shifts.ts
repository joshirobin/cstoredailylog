import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, Timestamp, where } from 'firebase/firestore';
import { useLocationsStore } from './locations';

export interface ShiftTemplate {
    id: string;
    description: string;
    label: string;
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
    role: string;
    color: string;
    locationId: string;
}

export interface Shift {
    id: string;
    employeeId: string;
    employeeName: string;
    startTime: Timestamp;
    endTime: Timestamp;
    role: string;
    status: 'Scheduled' | 'Published' | 'Completed' | 'Missed' | 'Call Out' | 'No Show';
    notes?: string;
    isOvertime?: boolean;
    locationId?: string;
}

export interface EmployeeAvailability {
    id: string;
    employeeId: string;
    dayOfWeek: number; // 0-6
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
    isAvailable: boolean;
    locationId: string;
}

export interface TimeOffRequest {
    id: string;
    employeeId: string;
    employeeName: string;
    startDate: string; // ISO Date String
    endDate: string;   // ISO Date String
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    locationId: string;
    createdAt: Timestamp;
}

export interface SwapRequest {
    id: string;
    requesterId: string; // Employee requesting swap
    targetShiftId: string; // Shift to give away
    recipientId?: string; // Proposed replacement (optional)
    status: 'Pending' | 'Approved' | 'Rejected';
    locationId: string;
    createdAt: Timestamp;
}

export const useShiftStore = defineStore('shifts', () => {
    // State
    const shifts = ref<Shift[]>([]);
    const templates = ref<ShiftTemplate[]>([]);
    const loading = ref(false);

    // Getters
    const shiftsByEmployee = computed(() => {
        const groups: Record<string, Shift[]> = {};
        shifts.value.forEach(s => {
            if (!groups[s.employeeId]) groups[s.employeeId] = [];
            groups[s.employeeId]!.push(s);
        });
        return groups;
    });

    // Actions
    const fetchShifts = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            const q = query(
                collection(db, 'shifts'),
                where('locationId', '==', locationsStore.activeLocationId)
            );
            const snap = await getDocs(q);
            shifts.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
        } catch (e) {
            console.error(e);
        } finally {
            loading.value = false;
        }
    };

    const addShift = async (shift: Omit<Shift, 'id' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            await addDoc(collection(db, 'shifts'), {
                ...shift,
                locationId: locationsStore.activeLocationId
            });
            await fetchShifts();
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const updateShift = async (id: string, updates: Partial<Shift>) => {
        try {
            await updateDoc(doc(db, 'shifts', id), updates);
            await fetchShifts();
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const deleteShift = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'shifts', id));
            await fetchShifts();
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const fetchTemplates = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const q = query(
                collection(db, 'shift_templates'),
                where('locationId', '==', locationsStore.activeLocationId)
            );
            const snap = await getDocs(q);
            templates.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as ShiftTemplate));
        } catch (e) {
            console.error(e);
        }
    };

    const saveTemplate = async (template: Omit<ShiftTemplate, 'id' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            await addDoc(collection(db, 'shift_templates'), {
                ...template,
                locationId: locationsStore.activeLocationId
            });
            await fetchTemplates();
        } catch (e) {
            console.error(e);
        }
    };

    // Availability State
    const availabilities = ref<EmployeeAvailability[]>([]);

    // Time Off State
    const timeOffRequests = ref<TimeOffRequest[]>([]);
    const swapRequests = ref<SwapRequest[]>([]);

    // Availability Actions
    const fetchAvailabilities = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const q = query(
                collection(db, 'availabilities'),
                where('locationId', '==', locationsStore.activeLocationId)
            );
            const snap = await getDocs(q);
            availabilities.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeeAvailability));
        } catch (e) {
            console.error(e);
        }
    };

    const updateAvailability = async (id: string, updates: Partial<EmployeeAvailability>) => {
        try {
            await updateDoc(doc(db, 'availabilities', id), updates);
            await fetchAvailabilities();
        } catch (e) {
            console.error(e);
        }
    };

    const addAvailability = async (avail: Omit<EmployeeAvailability, 'id' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            await addDoc(collection(db, 'availabilities'), {
                ...avail,
                locationId: locationsStore.activeLocationId
            });
            await fetchAvailabilities();
        } catch (e) {
            console.error(e);
        }
    };

    // Time Off Actions
    const fetchTimeOffRequests = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const q = query(
                collection(db, 'time_off_requests'),
                where('locationId', '==', locationsStore.activeLocationId)
            );
            const snap = await getDocs(q);
            timeOffRequests.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as TimeOffRequest));
        } catch (e) {
            console.error(e);
        }
    };

    const addTimeOffRequest = async (req: Omit<TimeOffRequest, 'id' | 'locationId' | 'createdAt'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        await addDoc(collection(db, 'time_off_requests'), {
            ...req,
            locationId: locationsStore.activeLocationId,
            createdAt: Timestamp.now()
        });
        await fetchTimeOffRequests();
    };

    const updateTimeOffRequest = async (id: string, status: TimeOffRequest['status']) => {
        await updateDoc(doc(db, 'time_off_requests', id), { status });
        await fetchTimeOffRequests();
    };

    const fetchSwapRequests = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const q = query(
                collection(db, 'swap_requests'),
                where('locationId', '==', locationsStore.activeLocationId)
            );
            const snap = await getDocs(q);
            swapRequests.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as SwapRequest));
        } catch (e) {
            console.error(e);
        }
    };

    const addSwapRequest = async (req: Omit<SwapRequest, 'id' | 'locationId' | 'createdAt'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        await addDoc(collection(db, 'swap_requests'), {
            ...req,
            locationId: locationsStore.activeLocationId,
            createdAt: Timestamp.now()
        });
        await fetchSwapRequests();
    };

    const updateSwapRequest = async (id: string, status: SwapRequest['status']) => {
        await updateDoc(doc(db, 'swap_requests', id), { status });
        await fetchSwapRequests();
    };

    return {
        shifts,
        templates,
        availabilities,
        timeOffRequests,
        swapRequests,
        loading,
        shiftsByEmployee,
        fetchShifts,
        addShift,
        updateShift,
        deleteShift,
        fetchTemplates,
        saveTemplate,
        fetchAvailabilities,
        updateAvailability,
        addAvailability,
        fetchTimeOffRequests,
        addTimeOffRequest,
        updateTimeOffRequest,
        fetchSwapRequests,
        addSwapRequest,
        updateSwapRequest
    };
});

