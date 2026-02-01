import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy, Timestamp, limit, where } from 'firebase/firestore';
import { useLocationsStore } from './locations';

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
                where('locationId', '==', locationsStore.activeLocationId),
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
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            // Simulated Perimeter Discovery based on coordinates or random generation
            // In a real app, this would call a Gas Price API with radius.
            // Since we don't have one, we "discover" locations of these major brands.

            const discovered: CompetitorPrice[] = [];
            const basePrice = 2.95; // Average market base

            MAJOR_BRANDS.forEach((brand) => {
                // Generate 1-2 locations per brand within radius
                const count = Math.floor(Math.random() * 2) + 1;
                for (let i = 0; i < count; i++) {
                    const dist = Math.random() * radiusMiles;
                    const priceOffset = (Math.random() * 0.20) - 0.10; // +/- 10 cents

                    discovered.push({
                        stationName: `${brand} #${Math.floor(Math.random() * 999)}`,
                        brand,
                        distance: Number(dist.toFixed(1)),
                        distanceStr: `${dist.toFixed(1)} miles`,
                        prices: [
                            { fuelType: 'Regular', price: Number((basePrice + priceOffset).toFixed(2)) },
                            { fuelType: 'Diesel', price: Number((basePrice + 0.80 + priceOffset).toFixed(2)) }
                        ],
                        locationId: locationsStore.activeLocationId!,
                        loggedBy: 'System Scan',
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

    return {
        competitorPrices,
        loading,
        fetchCompetitorPrices,
        logCompetitorPrice,
        scanPerimeter,
        MAJOR_BRANDS
    };
});
