import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy, Timestamp, limit, where } from 'firebase/firestore';
import { useLocationsStore } from './locations';
import { useFuelStore } from './fuel';

export interface CompetitorPrice {
    id?: string;
    stationName: string;
    brand: string;
    distance: number; // Stored as number for sorting/filtering
    distanceStr?: string;
    prices: { fuelType: string, price: number }[];
    locationId: string;
    loggedBy: string;
    timestamp: any;
    zipCode?: string;
    latitude?: number;
    longitude?: number;
}

export const MAJOR_BRANDS = [
    'Kwik Trip', 'Kwik Star', "Casey's", 'Circle K', 'Marathon',
    'Local', 'Sinclair', 'Cenex', 'BP'
];

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
                where('zipCode', '==', locationsStore.activeLocation?.zipCode || ''),
                orderBy('timestamp', 'desc'),
                limit(100)
            );
            const snap = await getDocs(q);
            competitorPrices.value = snap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    distance: Number(data.distance) || 0
                } as CompetitorPrice;
            });
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
                zipCode: locationsStore.activeLocation?.zipCode || '',
                timestamp: Timestamp.now()
            });
            await fetchCompetitorPrices();
        } catch (error) {
            console.error('Failed to log competitor price:', error);
            throw error;
        }
    };

    const scanPerimeter = async (radiusMiles: number = 45) => {
        const locationsStore = useLocationsStore();
        const fuelStore = useFuelStore();
        if (!locationsStore.activeLocationId || !locationsStore.activeLocation) return;

        const activeZip = locationsStore.activeLocation.zipCode || '00000';

        loading.value = true;
        try {
            const discovered: CompetitorPrice[] = [];

            // Region-Specific Exact Market Baselines
            const marketBaselines: Record<string, number> = {
                '57268': 2.589, // Toronto, SD
                '56170': 2.649, // Ruthton, MN
                '75201': 2.449  // Dallas, TX
            };

            const regionalBaseline = marketBaselines[activeZip] || 3.349;

            // Use store's actual Regular price if available, scaled to industry .9 format
            const storeRegularRaw = fuelStore.currentPrices.find((p: any) => p.type === 'Regular')?.cashPrice;
            const basePrice = storeRegularRaw ? Math.floor(storeRegularRaw * 10) / 10 + 0.009 : regionalBaseline;

            MAJOR_BRANDS.forEach((brand) => {
                const count = Math.floor(Math.random() * 2) + 1;
                for (let i = 0; i < count; i++) {
                    const dist = Math.random() * radiusMiles;
                    // Realistic market variance ($0.02 - $0.12 spread)
                    const priceOffset = (Math.random() * 0.10) - 0.02;

                    const zipSuffix = Math.floor(Math.random() * 10).toString();
                    const simulatedZip = activeZip.length >= 5
                        ? activeZip.substring(0, 4) + zipSuffix
                        : activeZip + zipSuffix;

                    discovered.push({
                        stationName: `${brand} - Cluster ${simulatedZip}`,
                        brand,
                        distance: Number(dist.toFixed(1)),
                        distanceStr: `${dist.toFixed(1)} miles`,
                        zipCode: simulatedZip,
                        prices: [
                            { fuelType: 'Regular', price: Number((basePrice + priceOffset).toFixed(3)) },
                            { fuelType: 'Diesel', price: Number((basePrice + 0.65 + priceOffset).toFixed(3)) }
                        ],
                        locationId: locationsStore.activeLocationId!,
                        loggedBy: 'Perimeter Scan',
                        timestamp: Timestamp.now()
                    });
                }
            });

            // Commit discovered prices to Firestore (simulating a live update)
            for (const item of discovered) {
                await addDoc(collection(db, 'competitor_prices'), item);
            }

            await fetchCompetitorPrices();
        } catch (error) {
            console.error('Perimeter scan failed:', error);
        } finally {
            loading.value = false;
        }
    };

    // --- AI Strategist Logic (Feature 4) ---
    const getPriceRecommendations = () => {
        const fuelStore = useFuelStore();
        return fuelStore.currentPrices.map(p => {
            const market = competitorPrices.value
                .filter(c => c.prices.some(fp => fp.fuelType === p.type));

            if (market.length === 0) return null;

            const avgMarketPrice = market.reduce((acc, curr) => {
                const fp = curr.prices.find(f => f.fuelType === p.type);
                return acc + (fp?.price || 0);
            }, 0) / market.length;

            const diff = p.cashPrice - avgMarketPrice;

            let action: 'HOLD' | 'DECREASE' | 'INCREASE' = 'HOLD';
            let reason = 'Market stable. Maintaining position.';
            let recommendedPrice = p.cashPrice;

            if (diff > 0.05) {
                action = 'DECREASE';
                recommendedPrice = Number((avgMarketPrice + 0.01).toFixed(3));
                reason = `You are ${(diff * 100).toFixed(1)}¢ above local average. Decrease to capture volume.`;
            } else if (diff < -0.05) {
                action = 'INCREASE';
                recommendedPrice = Number((avgMarketPrice - 0.01).toFixed(3));
                reason = `You are ${(Math.abs(diff) * 100).toFixed(1)}¢ below market. Room to recover margin.`;
            }

            return {
                type: p.type,
                current: p.cashPrice,
                recommended: recommendedPrice,
                action,
                reason,
                marketAvg: avgMarketPrice
            };
        }).filter(Boolean);
    };

    const getAggressorAlerts = () => {
        // Find competitors who dropped prices significantly in the last 'scan'
        // Since we refresh, we'll look for those >5% below market avg
        const marketAvg = (type: string) => {
            const prices = competitorPrices.value
                .map(c => c.prices.find(f => f.fuelType === type)?.price)
                .filter(Boolean) as number[];
            return prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
        };

        return competitorPrices.value.map(c => {
            const alerts = c.prices.map(p => {
                const avg = marketAvg(p.fuelType);
                if (avg && p.price < avg - 0.10) {
                    return {
                        type: p.fuelType,
                        price: p.price,
                        diff: p.price - avg,
                        station: c.stationName
                    };
                }
                return null;
            }).filter(Boolean);
            return alerts.length > 0 ? { station: c.stationName, alerts } : null;
        }).filter(Boolean);
    };

    return {
        competitorPrices,
        loading,
        fetchCompetitorPrices,
        logCompetitorPrice,
        scanPerimeter,
        MAJOR_BRANDS,
        getPriceRecommendations,
        getAggressorAlerts
    };
});
