import { create } from 'zustand';
import { db } from '../firebaseConfig';
import {
    collection, getDocs, addDoc, updateDoc,
    doc, query, where, orderBy, Timestamp
} from 'firebase/firestore';
import { useLocationsStore } from './useLocationsStore';

export interface TimeLog {
    id: string;
    employeeId: string;
    employeeName: string;
    clockIn: any;
    clockOut?: any;
    totalHours?: number;
    shiftId?: string;
    isLate?: boolean;
    lateMinutes?: number;
    locationId?: string;
}

interface TimesheetsState {
    timeLogs: TimeLog[];
    allLogs: TimeLog[];   // all employees, used for payroll
    activeLog: TimeLog | null;
    loading: boolean;
    fetchTimeLogs: (employeeId: string) => Promise<void>;
    fetchAllTimeLogs: (startDate?: Date, endDate?: Date) => Promise<void>;
    clockIn: (employeeId: string, employeeName: string, extras?: any) => Promise<void>;
    clockOut: (logId: string, employeeId: string) => Promise<void>;
}

const COLLECTION = 'timesheets';

export const useTimesheetsStore = create<TimesheetsState>((set, get) => ({
    timeLogs: [],
    allLogs: [],
    activeLog: null,
    loading: false,

    fetchTimeLogs: async (employeeId) => {
        set({ loading: true });
        try {
            const locationId = useLocationsStore.getState().activeLocationId;
            let q;
            if (locationId) {
                q = query(
                    collection(db, COLLECTION),
                    where('employeeId', '==', employeeId),
                    where('locationId', '==', locationId),
                    orderBy('clockIn', 'desc')
                );
            } else {
                q = query(
                    collection(db, COLLECTION),
                    where('employeeId', '==', employeeId),
                    orderBy('clockIn', 'desc')
                );
            }
            const snap = await getDocs(q);
            const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as TimeLog));
            const active = logs.find(l => !l.clockOut) || null;
            set({ timeLogs: logs, activeLog: active });
        } catch (e: any) {
            console.warn('fetchTimeLogs fallback:', e.message);
            try {
                const q2 = query(collection(db, COLLECTION), where('employeeId', '==', employeeId));
                const snap2 = await getDocs(q2);
                const logs = snap2.docs
                    .map(d => ({ id: d.id, ...d.data() } as TimeLog))
                    .sort((a, b) => {
                        const aTime = a.clockIn?.toDate ? a.clockIn.toDate().getTime() : new Date(a.clockIn).getTime();
                        const bTime = b.clockIn?.toDate ? b.clockIn.toDate().getTime() : new Date(b.clockIn).getTime();
                        return bTime - aTime;
                    });
                const active = logs.find(l => !l.clockOut) || null;
                set({ timeLogs: logs, activeLog: active });
            } catch (e2) {
                console.error('fetchTimeLogs failed:', e2);
            }
        } finally {
            set({ loading: false });
        }
    },

    fetchAllTimeLogs: async (startDate, endDate) => {
        set({ loading: true });
        try {
            const locationId = useLocationsStore.getState().activeLocationId;
            let q;
            if (locationId && startDate && endDate) {
                q = query(
                    collection(db, COLLECTION),
                    where('locationId', '==', locationId),
                    where('clockIn', '>=', Timestamp.fromDate(startDate)),
                    where('clockIn', '<=', Timestamp.fromDate(endDate)),
                    orderBy('clockIn', 'desc')
                );
            } else if (locationId) {
                q = query(
                    collection(db, COLLECTION),
                    where('locationId', '==', locationId),
                    orderBy('clockIn', 'desc')
                );
            } else {
                q = query(collection(db, COLLECTION), orderBy('clockIn', 'desc'));
            }
            const snap = await getDocs(q);
            const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as TimeLog));
            set({ allLogs: logs });
        } catch (e: any) {
            console.warn('fetchAllTimeLogs fallback:', e.message);
            try {
                const snap = await getDocs(collection(db, COLLECTION));
                set({ allLogs: snap.docs.map(d => ({ id: d.id, ...d.data() } as TimeLog)) });
            } catch (e2) {
                console.error('fetchAllTimeLogs failed:', e2);
            }
        } finally {
            set({ loading: false });
        }
    },

    clockIn: async (employeeId, employeeName, extras) => {
        set({ loading: true });
        const locationId = useLocationsStore.getState().activeLocationId;
        try {
            const newLog: Omit<TimeLog, 'id'> = {
                employeeId,
                employeeName,
                clockIn: Timestamp.now(),
                locationId: locationId || '',
                ...extras
            };
            const docRef = await addDoc(collection(db, COLLECTION), newLog);
            const savedLog: TimeLog = { id: docRef.id, ...newLog };
            set(state => ({
                timeLogs: [savedLog, ...state.timeLogs],
                activeLog: savedLog,
            }));
        } catch (e) {
            console.error('clockIn error:', e);
            throw e;
        } finally {
            set({ loading: false });
        }
    },

    clockOut: async (logId, _employeeId) => {
        set({ loading: true });
        try {
            const log = get().timeLogs.find(l => l.id === logId);
            if (!log) throw new Error('Log not found');
            const clockOutTime = Timestamp.now();
            const startMs = log.clockIn?.toDate ? log.clockIn.toDate().getTime() : new Date(log.clockIn).getTime();
            const totalHours = (clockOutTime.toDate().getTime() - startMs) / (1000 * 60 * 60);
            await updateDoc(doc(db, COLLECTION, logId), { clockOut: clockOutTime, totalHours });
            set(state => ({
                timeLogs: state.timeLogs.map(l =>
                    l.id === logId ? { ...l, clockOut: clockOutTime, totalHours } : l
                ),
                activeLog: null,
            }));
        } catch (e) {
            console.error('clockOut error:', e);
            throw e;
        } finally {
            set({ loading: false });
        }
    },
}));
