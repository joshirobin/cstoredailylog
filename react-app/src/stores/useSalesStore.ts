import { create } from 'zustand';
import { db } from '../firebaseConfig';
import { collection, getDocs, setDoc, doc, query, orderBy, deleteDoc, where } from 'firebase/firestore';
import { useLocationsStore } from './useLocationsStore';

export interface DenominationCounts {
    bills: { [key: string]: number };
    coins: { [key: string]: number };
}

export interface Check {
    number: string;
    amount: number;
}

export interface CreditCardSummary {
    visa: number;
    mastercard: number;
    amex: number;
    discover: number;
    other: number;
    total: number;
}

export interface FuelSalesSummary {
    regularGallons: number;
    regularSales: number;
    premiumGallons: number;
    premiumSales: number;
    dieselGallons: number;
    dieselSales: number;
    total: number;
}

export interface LotteryReconciliation {
    openingBalance: number;
    lotterySales: number;
    lotteryPaidOut: number;
    settlementsPaid: number;
    endingBalance: number;
}

export interface PaidOutLog {
    time: string;
    description: string;
    amount: number;
    employee: string;
}

export interface DepositSummary {
    cashDeposit: number;
    coins: number;
    total: number;
    depositBagNumber: string;
}

export interface PosZReportSummary {
    insideSales: number;
    fuelSales: number;
    lotterySales: number;
    totalSales: number;
}

export interface Signatures {
    cashierSignature: string;
    managerSignature: string;
    date: string;
}

export interface SalesLog {
    id: string;
    date: string;
    shift?: 'Morning' | 'Afternoon' | 'Night' | 'Full Day';
    managerOnDuty?: string;

    openingCash: number;
    openingDenominations?: DenominationCounts;
    cashSales?: number;
    lotteryCashSales?: number;
    safeCashAdded?: number;
    otherCashIn?: number;
    totalCashIn?: number;
    safeDrops?: number;
    lotteryPaidOut?: number;
    expenses?: number;
    bankDeposit?: number;
    otherCashOut?: number;
    totalCashOut?: number;
    expectedCash?: number;
    closingCash: number;
    closingDenominations?: DenominationCounts;
    overShort?: number;

    creditCardSummary?: CreditCardSummary;
    fuelSalesSummary?: FuelSalesSummary;
    lotteryReconciliation?: LotteryReconciliation;

    safeCash?: number;
    safeCashDetails?: DenominationCounts;
    safeReconciliation?: {
        openingSafeBalance: number;
        cashDrops: number;
        cashRemoved: number;
        endingSafeBalance: number;
    };

    paidOutLog?: PaidOutLog[];
    totalPaidOut?: number;

    depositSummary?: DepositSummary;
    posZReportSummary?: PosZReportSummary;
    signatures?: Signatures;

    pdiForm?: any;

    totalSales: number;
    notes: string;
    checks?: Check[];
    safeTotal?: number;
    lottoUrl?: string;
    otherUrl?: string;
    submittedBy?: string;
    status?: 'PENDING_REVIEW' | 'VERIFIED';
    locationId: string;
}

interface SalesState {
    logs: SalesLog[];
    fetchLogs: (locationId?: string) => Promise<void>;
    addLog: (log: Omit<SalesLog, 'id' | 'locationId'>, locationId: string, email: string) => Promise<void>;
    updateLog: (id: string, updates: Partial<Omit<SalesLog, 'id'>>, locationId: string) => Promise<void>;
    deleteLog: (id: string, locationId: string) => Promise<void>;
    updateLogStatus: (id: string, status: 'PENDING_REVIEW' | 'VERIFIED', locationId: string) => Promise<void>;
    getLogsByDateRange: (startDate: Date, endDate: Date) => SalesLog[];
    uploadReport: (file: File, locationId: string, date: string, type: string) => Promise<string>;
}

export const useSalesStore = create<SalesState>((set, get) => ({
    logs: [],

    fetchLogs: async (locationId?: string) => {
        const id = locationId || useLocationsStore.getState().activeLocationId;
        if (!id) return;
        try {
            const q = query(
                collection(db, 'sales_logs'),
                where('locationId', '==', id),
                orderBy('date', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const logsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalesLog));
            set({ logs: logsData });
        } catch (error) {
            console.error('Failed to fetch sales logs:', error);
        }
    },

    addLog: async (log, locationId, email) => {
        if (!locationId) return;
        try {
            const date = log.date;
            const logId = `${locationId}_${date}`;
            await setDoc(doc(db, 'sales_logs', logId), {
                ...log,
                locationId: locationId,
                submittedBy: email || 'unknown',
                updatedAt: new Date().toISOString()
            });
            await get().fetchLogs(locationId);
        } catch (error) {
            console.error('Failed to save sales log:', error);
        }
    },

    updateLog: async (id, updates, locationId) => {
        try {
            const logRef = doc(db, 'sales_logs', id);
            await setDoc(logRef, updates, { merge: true });
            await get().fetchLogs(locationId);
        } catch (error) {
            console.error('Failed to update sales log:', error);
        }
    },

    deleteLog: async (id, locationId) => {
        try {
            await deleteDoc(doc(db, 'sales_logs', id));
            await get().fetchLogs(locationId);
        } catch (error) {
            console.error('Failed to delete sales log:', error);
        }
    },

    updateLogStatus: async (id, status, locationId) => {
        try {
            const logRef = doc(db, 'sales_logs', id);
            await setDoc(logRef, { status, updatedStatusAt: new Date().toISOString() }, { merge: true });
            await get().fetchLogs(locationId);
        } catch (error) {
            console.error('Failed to update log status:', error);
        }
    },

    getLogsByDateRange: (startDate, endDate) => {
        const toYMD = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const start = toYMD(startDate);
        const end = toYMD(endDate);

        return get().logs.filter(log => {
            return log.date >= start && log.date <= end;
        });
    },

    uploadReport: async (file, locationId, date, type) => {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('../firebaseConfig');

        const fileRef = ref(storage, `sales_reports/${locationId}/${date}/${type}_${file.name}`);
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
    }
}));
