import { create } from 'zustand';
import { db } from '../firebaseConfig';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    Timestamp,
    limit
} from 'firebase/firestore';
import { useLocationsStore } from './useLocationsStore';
import { useFuelStore } from './useFuelStore';

export interface CompetitorPrice {
    id?: string;
    stationName: string;
    brand: string;
    distance: number;
    prices: { fuelType: string, price: number }[];
    locationId: string;
    timestamp: any;
    zipCode?: string;
}

export interface PriceRecommendation {
    type: string;
    action: 'INCREASE' | 'DECREASE' | 'HOLD';
    recommended: number;
    reason: string;
    current: number;
    marketAvg: number;
}

interface PricingState {
    competitorPrices: CompetitorPrice[];
    loading: boolean;
    fetchCompetitorPrices: () => void;
    logCompetitorPrice: (price: Omit<CompetitorPrice, 'id' | 'timestamp' | 'locationId'>) => Promise<void>;
    scanPerimeter: () => Promise<void>;
    getPriceRecommendations: () => PriceRecommendation[];
}

let unsubscribeCompetitors: (() => void) | null = null;

export const usePricingStore = create<PricingState>((set, get) => ({
    competitorPrices: [],
    loading: false,

    fetchCompetitorPrices: () => {
        const activeLocation = useLocationsStore.getState().activeLocation;
        if (unsubscribeCompetitors || !activeLocation?.zipCode) return;

        set({ loading: true });
        const q = query(
            collection(db, 'competitor_prices'),
            where('zipCode', '==', activeLocation.zipCode),
            orderBy('timestamp', 'desc'),
            limit(100)
        );

        unsubscribeCompetitors = onSnapshot(q, (snapshot) => {
            set({
                competitorPrices: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompetitorPrice)),
                loading: false
            });
        });
    },

    logCompetitorPrice: async (price) => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        const activeLocation = useLocationsStore.getState().activeLocation;
        if (!activeLocationId) return;

        await addDoc(collection(db, 'competitor_prices'), {
            ...price,
            locationId: activeLocationId,
            zipCode: activeLocation?.zipCode || '',
            timestamp: Timestamp.now()
        });
    },

    scanPerimeter: async () => {
        const activeLocation = useLocationsStore.getState().activeLocation;
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocation || !activeLocationId) return;

        set({ loading: true });
        try {
            // Simulated discovery logic similar to Vue version
            const brands = ['Kwik Trip', 'Casey\'s', 'BP', 'Shell', 'Marathon'];
            const discovered: Omit<CompetitorPrice, 'id'>[] = [];
            const basePrice = useFuelStore.getState().currentPrices.find(p => p.type === 'Regular')?.cashPrice || 2.99;

            brands.forEach(brand => {
                const dist = Math.random() * 5;
                const priceOffset = (Math.random() * 0.10) - 0.05;
                discovered.push({
                    stationName: `${brand} - ${activeLocation.zipCode}`,
                    brand,
                    distance: Number(dist.toFixed(1)),
                    prices: [
                        { fuelType: 'Regular', price: Number((basePrice + priceOffset).toFixed(3)) },
                        { fuelType: 'Super (Premium)', price: Number((basePrice + 0.60 + priceOffset).toFixed(3)) }
                    ],
                    locationId: activeLocationId,
                    zipCode: activeLocation.zipCode,
                    timestamp: Timestamp.now()
                });
            });

            for (const item of discovered) {
                await addDoc(collection(db, 'competitor_prices'), item);
            }
        } finally {
            set({ loading: false });
        }
    },

    getPriceRecommendations: () => {
        const currentPrices = useFuelStore.getState().currentPrices;
        const competitorPrices = get().competitorPrices;

        return currentPrices.map(p => {
            const market = competitorPrices.filter(c => c.prices.some(fp => fp.fuelType === p.type));
            if (market.length === 0) return null;

            const avgMarketPrice = market.reduce((acc, curr) => {
                const fp = curr.prices.find(f => f.fuelType === p.type);
                return acc + (fp?.price || 0);
            }, 0) / market.length;

            const diff = p.cashPrice - avgMarketPrice;
            let action: 'HOLD' | 'DECREASE' | 'INCREASE' = 'HOLD';
            let reason = 'Market stable. Maintaining position.';
            let recommended = p.cashPrice;

            if (diff > 0.05) {
                action = 'DECREASE';
                recommended = Number((avgMarketPrice + 0.01).toFixed(3));
                reason = `You are ${(diff * 100).toFixed(1)}¢ above local average. Decrease to capture volume.`;
            } else if (diff < -0.05) {
                action = 'INCREASE';
                recommended = Number((avgMarketPrice - 0.01).toFixed(3));
                reason = `You are ${(Math.abs(diff) * 100).toFixed(1)}¢ below market. Room to recover margin.`;
            }

            return {
                type: p.type,
                action,
                recommended,
                reason,
                current: p.cashPrice,
                marketAvg: avgMarketPrice
            };
        }).filter(Boolean) as PriceRecommendation[];
    }
}));

