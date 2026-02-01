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
    shiftId?: string;
    scheduledEndTime?: Timestamp;
}

export const useTimesheetsStore = defineStore('timesheets', () => {
    const timeLogs = ref<TimeLog[]>([]);
    const activeLog = ref<TimeLog | null>(null);
    const loading = ref(false);

    const fetchTimeLogs = async (employeeId?: string, skipCheck: boolean = false) => {
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

            // Trigger Auto Clock-Out check only if not already in a check
            if (!skipCheck) {
                await checkAutoClockOut();
            }
        } catch (error) {
            console.error('Failed to fetch time logs:', error);
        } finally {
            loading.value = false;
        }
    };

    const checkAutoClockOut = async () => {
        const now = new Date();
        const logsToFix = timeLogs.value.filter(log =>
            log.status === 'In Progress' &&
            log.scheduledEndTime &&
            now > log.scheduledEndTime.toDate()
        );

        if (logsToFix.length === 0) return;

        console.log(`Auto Clock-Out: Found ${logsToFix.length} logs to repair.`);

        for (const log of logsToFix) {
            console.log(`Auto Clock-Out: Repairing log for ${log.employeeName}`);
            await clockOut(log.id, log.employeeId, log.scheduledEndTime, true);
        }
    };

    const clockIn = async (employeeId: string, employeeName: string, options?: { isLate?: boolean; lateMinutes?: number; shiftId?: string; scheduledEndTime?: Timestamp }) => {
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
                isLate: options?.isLate || false,
                lateMinutes: options?.lateMinutes || 0,
                shiftId: options?.shiftId || null,
                scheduledEndTime: options?.scheduledEndTime || null
            };
            const docRef = await addDoc(collection(db, 'timesheets'), newLog);
            await fetchTimeLogs(employeeId);
            return docRef.id;
        } catch (error) {
            console.error('Failed to clock in:', error);
            throw error;
        }
    };

    const clockOut = async (logId: string, employeeId: string, customEndTime?: Timestamp, skipFetchCheck: boolean = false) => {
        try {
            const logRef = doc(db, 'timesheets', logId);
            const endTime = customEndTime || Timestamp.now();

            // Find current log to calculate hours
            const logSnapshot = timeLogs.value.find(l => l.id === logId);
            if (!logSnapshot) throw new Error('Log not found');

            const clockInDate = logSnapshot.clockIn.toDate();
            const clockOutDate = endTime.toDate();
            // Ensure end time is at least same as start time to avoid negative hours
            const finalClockOutDate = clockOutDate < clockInDate ? clockInDate : clockOutDate;
            const hours = (finalClockOutDate.getTime() - clockInDate.getTime()) / (1000 * 60 * 60);

            await updateDoc(logRef, {
                clockOut: Timestamp.fromDate(finalClockOutDate),
                totalHours: Number(hours.toFixed(2)),
                status: 'Completed'
            });

            await fetchTimeLogs(employeeId, skipFetchCheck);
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
