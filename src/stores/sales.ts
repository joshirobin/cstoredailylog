import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface DenominationCounts {
    bills: { [key: string]: number }; // e.g. "100": 5
    coins: { [key: string]: number }; // e.g. "0.25": 40
}

export interface Check {
    number: string;
    amount: number;
}

export interface SalesLog {
    id: string;
    date: string; // ISO string
    openingCash: number;
    openingDenominations?: DenominationCounts; // Added
    closingCash: number;
    closingDenominations?: DenominationCounts; // Added
    expenses: number;
    totalSales: number;
    notes: string;
    // Safe Deposit fields
    safeCash?: number;
    safeCashDetails?: DenominationCounts;
    checks?: Check[];
    safeTotal?: number;
}

export const useSalesStore = defineStore('sales', () => {
    const logs = ref<SalesLog[]>([]);

    const addLog = (log: Omit<SalesLog, 'id' | 'date'>) => {
        const newLog = {
            ...log,
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString()
        };
        // Add to beginning of list
        logs.value.unshift(newLog);
    };

    const updateLog = (id: string, updates: Partial<Omit<SalesLog, 'id' | 'date'>>) => {
        const index = logs.value.findIndex(log => log.id === id);
        if (index !== -1) {
            const currentLog = logs.value[index];
            logs.value[index] = {
                ...currentLog,
                ...updates
            } as SalesLog;
        }
    };

    const deleteLog = (id: string) => {
        logs.value = logs.value.filter(log => log.id !== id);
    };

    const getLogsByDateRange = (startDate: Date, endDate: Date) => {
        return logs.value.filter(log => {
            const logDate = new Date(log.date);
            return logDate >= startDate && logDate <= endDate;
        });
    };

    return { logs, addLog, updateLog, deleteLog, getLogsByDateRange };
});

