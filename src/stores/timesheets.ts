import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, where, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useLocationsStore } from './locations';

export interface TimeLog {
    id: string;
    employeeId: string;
    employeeName: string;
    clockIn: Timestamp;
    clockOut: Timestamp | null;
    totalHours: number | null;
    status: 'In Progress' | 'Completed';
    notes?: string;
    lateMinutes?: number;
    isLate?: boolean;
    locationId: string;
}

export const useTimesheetsStore = defineStore('timesheets', () => {
    const timeLogs = ref<TimeLog[]>([]);
    const activeLog = ref<TimeLog | null>(null);
    const loading = ref(false);

    const fetchTimeLogs = async (employeeId?: string) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            let q;
            const baseQuery = query(
                collection(db, 'timesheets'),
                where('locationId', '==', locationsStore.activeLocationId)
            );

            if (employeeId) {
                q = query(baseQuery, where('employeeId', '==', employeeId), orderBy('clockIn', 'desc'));
            } else {
                q = query(baseQuery, orderBy('clockIn', 'desc'));
            }

            const querySnapshot = await getDocs(q);
            timeLogs.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeLog));

            // Check for active log for this employee
            if (employeeId) {
                activeLog.value = timeLogs.value.find(log => log.status === 'In Progress') || null;
            }
        } catch (error) {
            console.error('Failed to fetch time logs:', error);
        } finally {
            loading.value = false;
        }
    };

    const clockIn = async (employeeId: string, employeeName: string, lateness?: { isLate: boolean; lateMinutes: number }) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const newLog = {
                employeeId,
                employeeName,
                locationId: locationsStore.activeLocationId,
                clockIn: Timestamp.now(),
                clockOut: null,
                totalHours: null,
                status: 'In Progress',
                isLate: lateness?.isLate || false,
                lateMinutes: lateness?.lateMinutes || 0
            };
            const docRef = await addDoc(collection(db, 'timesheets'), newLog);
            await fetchTimeLogs(employeeId);
            return docRef.id;
        } catch (error) {
            console.error('Failed to clock in:', error);
            throw error;
        }
    };

    const clockOut = async (logId: string, employeeId: string) => {
        try {
            const logRef = doc(db, 'timesheets', logId);
            const now = Timestamp.now();

            // Re-fetch current log to calculate hours
            const logSnapshot = timeLogs.value.find(l => l.id === logId);
            if (!logSnapshot) throw new Error('Log not found');

            const clockInDate = logSnapshot.clockIn.toDate();
            const clockOutDate = now.toDate();
            const hours = (clockOutDate.getTime() - clockInDate.getTime()) / (1000 * 60 * 60);

            await updateDoc(logRef, {
                clockOut: now,
                totalHours: Number(hours.toFixed(2)),
                status: 'Completed'
            });

            await fetchTimeLogs(employeeId);
        } catch (error) {
            console.error('Failed to clock out:', error);
            throw error;
        }
    };

    const updateTimeLog = async (id: string, updates: Partial<TimeLog>) => {
        try {
            const logRef = doc(db, 'timesheets', id);
            await updateDoc(logRef, updates);
            await fetchTimeLogs();
        } catch (error) {
            console.error('Failed to update time log:', error);
            throw error;
        }
    };

    const deleteTimeLog = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'timesheets', id));
            await fetchTimeLogs();
        } catch (error) {
            console.error('Failed to delete time log:', error);
            throw error;
        }
    };

    return {
        timeLogs,
        activeLog,
        loading,
        fetchTimeLogs,
        clockIn,
        clockOut,
        updateTimeLog,
        deleteTimeLog
    };
});
