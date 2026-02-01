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
        const fuelStore = useFuelStore();
        if (!locationsStore.activeLocationId || !locationsStore.activeLocation) return;

        const activeZip = locationsStore.activeLocation.zipCode || '00000';

        loading.value = true;
        try {
            const discovered: CompetitorPrice[] = [];

            // Use store's actual Regular price as baseline, or fallback to 3.35
            const storeRegular = fuelStore.currentPrices.find((p: any) => p.type === 'Regular')?.cashPrice || 3.35;
            const basePrice = storeRegular;

            MAJOR_BRANDS.forEach((brand) => {
                const count = Math.floor(Math.random() * 2) + 1;
                for (let i = 0; i < count; i++) {
                    const dist = Math.random() * radiusMiles;
                    const priceOffset = (Math.random() * 0.15) - 0.05;

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
                            { fuelType: 'Regular', price: Number((basePrice + priceOffset).toFixed(2)) },
                            { fuelType: 'Diesel', price: Number((basePrice + 0.65 + priceOffset).toFixed(2)) }
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

    return {
        competitorPrices,
        loading,
        fetchCompetitorPrices,
        logCompetitorPrice,
        scanPerimeter,
        MAJOR_BRANDS
    };
});
