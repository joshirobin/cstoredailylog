import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy, Timestamp, limit, where } from 'firebase/firestore';
import { useLocationsStore } from './locations';

export interface CompetitorPrice {
    id?: string;
    stationName: string;
    distance: string;
    prices: { fuelType: string, price: number }[];
    locationId: string;
    loggedBy: string;
    timestamp: any;
}

export interface PricingSuggestion {
    id?: string;
    fuelType: string;
    currentPrice: number;
    suggestedPrice: number;
    reason: string;
    confidence: number;
}

export const usePricingStore = defineStore('pricing', () => {
    const competitorPrices = ref<CompetitorPrice[]>([]);
    const loading = ref(false);

    const fetchCompetitorPrices = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            const q = query(
                collection(db, 'competitor_prices'),
                where('locationId', '==', locationsStore.activeLocationId),
                orderBy('timestamp', 'desc'),
                limit(50)
            );
            const snap = await getDocs(q);
            competitorPrices.value = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompetitorPrice));
        } catch (error) {
            console.error('Failed to fetch competitor prices:', error);
        } finally {
            loading.value = false;
        }
    };

    const logCompetitorPrice = async (log: Omit<CompetitorPrice, 'id' | 'timestamp' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            await addDoc(collection(db, 'competitor_prices'), {
                ...log,
                locationId: locationsStore.activeLocationId,
                timestamp: Timestamp.now()
            });
            await fetchCompetitorPrices();
        } catch (error) {
            console.error('Failed to log competitor price:', error);
            throw error;
        }
    };

    return { competitorPrices, loading, fetchCompetitorPrices, logCompetitorPrice };
});
