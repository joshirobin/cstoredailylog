import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
    Timestamp
} from 'firebase/firestore';

export interface TobaccoProduct {
    id: string;
    upc: string;
    name: string;
    brand: 'Altria' | 'RJ Reynolds' | 'ITG' | 'Other';
    category: 'Cigarettes' | 'OTP' | 'Vape';
    price: number;
    eligibleForRebate: boolean;
}

export interface ScanDataLog {
    id: string;
    timestamp: Timestamp | Date;
    totalPacks: number;
    totalRebate: number;
    status: 'Pending' | 'Transmitted' | 'Error';
    fileUrl?: string;
}

export interface TobaccoPromotion {
    id: string;
    name: string;
    brand: string;
    type: 'Multi-Pack' | 'Loyalty' | 'Direct Value';
    discountAmount: number;
    requirement: string;
    active: boolean;
}

export const useTobaccoStore = defineStore('tobacco', () => {
    const products = ref<TobaccoProduct[]>([
        { id: '1', upc: '028200003021', name: 'Marlboro Red Box', brand: 'Altria', category: 'Cigarettes', price: 9.50, eligibleForRebate: true },
        { id: '2', upc: '028200003106', name: 'Marlboro Gold Box', brand: 'Altria', category: 'Cigarettes', price: 9.50, eligibleForRebate: true },
        { id: '3', upc: '012300000634', name: 'Camel Filters Box', brand: 'RJ Reynolds', category: 'Cigarettes', price: 9.25, eligibleForRebate: true },
        { id: '4', upc: '012300000719', name: 'Newport Menthol Box', brand: 'RJ Reynolds', category: 'Cigarettes', price: 10.50, eligibleForRebate: true },
        { id: '5', upc: '073100008512', name: 'Copenhagen LC Wintergreen', brand: 'Altria', category: 'OTP', price: 7.50, eligibleForRebate: true },
    ]);

    const scanLogs = ref<ScanDataLog[]>([]);
    const promotions = ref<TobaccoPromotion[]>([
        { id: 'p1', name: 'Marlboro 2-Pack Special', brand: 'Altria', type: 'Multi-Pack', discountAmount: 1.00, requirement: '2 Packs', active: true },
        { id: 'p2', name: 'Newport Loyalty Discount', brand: 'RJ Reynolds', type: 'Loyalty', discountAmount: 0.50, requirement: 'Loyal ID', active: true },
    ]);

    const loading = ref(false);

    const stats = computed(() => {
        return {
            totalPacksThisWeek: 1240,
            estimatedRebate: 856.40,
            complianceRate: 98.2,
            pendingTransmissions: scanLogs.value.filter(l => l.status === 'Pending').length
        };
    });

    const fetchScanLogs = async () => {
        loading.value = true;
        const mockLogs: ScanDataLog[] = [
            { id: 'log1', timestamp: new Date(Date.now() - 86400000), totalPacks: 185, totalRebate: 124.50, status: 'Transmitted' },
            { id: 'log2', timestamp: new Date(Date.now() - 172800000), totalPacks: 210, totalRebate: 142.00, status: 'Transmitted' },
            { id: 'log3', timestamp: new Date(), totalPacks: 54, totalRebate: 38.20, status: 'Pending' }
        ];
        scanLogs.value = mockLogs;
        loading.value = false;
    };

    const generateScanDataFile = async (brand: string) => {
        console.log(`Generating scan data for ${brand}`);
        loading.value = true;
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newLog: ScanDataLog = {
            id: Math.random().toString(36).substring(7).toUpperCase(),
            timestamp: new Date(),
            totalPacks: Math.floor(Math.random() * 100) + 100,
            totalRebate: Math.floor(Math.random() * 50) + 50,
            status: 'Pending'
        };

        scanLogs.value.unshift(newLog);
        loading.value = false;
        return newLog;
    };

    return {
        products,
        scanLogs,
        promotions,
        loading,
        stats,
        fetchScanLogs,
        generateScanDataFile
    };
});
