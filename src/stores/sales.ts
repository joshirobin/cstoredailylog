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
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

    const fetchLogs = async () => {
        try {
            const response = await fetch(`${API_URL}/sales`);
            if (response.ok) {
                logs.value = await response.json();
            }
        } catch (error) {
            console.error('Failed to fetch sales logs:', error);
        }
    };

    const addLog = async (log: Omit<SalesLog, 'id' | 'date'>) => {
        try {
            const date = new Date().toISOString().split('T')[0];
            const response = await fetch(`${API_URL}/sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    opening_cash: log.openingCash,
                    opening_denominations: log.openingDenominations,
                    closing_cash: log.closingCash,
                    closing_denominations: log.closingDenominations,
                    expenses: log.expenses,
                    total_sales: log.totalSales,
                    notes: log.notes,
                    safe_cash: log.safeCash,
                    safe_cash_details: log.safeCashDetails,
                    checks: log.checks,
                    safe_total: log.safeTotal
                })
            });
            if (response.ok) {
                await fetchLogs();
            }
        } catch (error) {
            console.error('Failed to save sales log:', error);
        }
    };

    const updateLog = async (id: string, updates: Partial<Omit<SalesLog, 'id' | 'date'>>) => {
        // For simplicity in this demo, we'll just re-save using POST since our server uses merge on date
        // In a real app, we'd use PUT /api/sales/:id
        const log = logs.value.find(l => l.id === id);
        if (log) {
            await addLog({ ...log, ...updates });
        }
    };

    const deleteLog = (id: string) => {
        // Implement DELETE on server if needed
        logs.value = logs.value.filter(log => log.id !== id);
    };

    const getLogsByDateRange = (startDate: Date, endDate: Date) => {
        return logs.value.filter(log => {
            const logDate = new Date(log.date);
            return logDate >= startDate && logDate <= endDate;
        });
    };

    return { logs, fetchLogs, addLog, updateLog, deleteLog, getLogsByDateRange };
});

