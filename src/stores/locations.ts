import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuthStore } from './auth';

export interface Location {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    latitude?: number;
    longitude?: number;
    managerId?: string;
    status: 'Active' | 'Inactive';
    createdAt: string;
}

export const useLocationsStore = defineStore('locations', () => {
    const locations = ref<Location[]>([]);
    const authStore = useAuthStore();

    // Sanitize active location ID from storage
    const getInitialLocationId = () => {
        const id = localStorage.getItem('activeLocationId');
        if (!id || id === 'null' || id === 'undefined') return null;
        return id;
    };

    const activeLocationId = ref<string | null>(getInitialLocationId());
    const loading = ref(false);

    const activeLocation = computed(() => {
        if (locations.value.length === 0) return null;
        return locations.value.find(l => l.id === activeLocationId.value) || locations.value[0];
    });


    const fetchLocations = async () => {
        if (!authStore.user) return;
        loading.value = true;

        try {
            const querySnapshot = await getDocs(collection(db, 'locations'));
            const fetched: Location[] = [];
            querySnapshot.forEach((doc) => {
                fetched.push({ id: doc.id, ...doc.data() } as Location);
            });

            if (fetched.length === 0) {
                const defaultLoc = {
                    name: 'Primary Store',
                    address: '123 Main St',
                    city: 'Dallas',
                    state: 'TX',
                    zipCode: '75201',
                    status: 'Active' as const,
                    createdAt: new Date().toISOString(),
                    latitude: 32.7767,
                    longitude: -96.7970
                };
                const docRef = await addDoc(collection(db, 'locations'), defaultLoc);
                const newLoc = { id: docRef.id, ...defaultLoc } as Location;
                locations.value = [newLoc];
                setActiveLocation(docRef.id);
            } else {
                locations.value = fetched;

                // Auto-repair: If any location is missing coordinates but has a zipCode, try to geocode it
                for (const loc of fetched) {
                    if (!loc.latitude || !loc.longitude || loc.latitude === 0) {
                        console.log(`Location Store: Attempting to repair coordinates for ${loc.name}...`);
                        const geo = await geocodeZipCode(loc.zipCode);
                        if (geo) {
                            try {
                                const docRef = doc(db, 'locations', loc.id);
                                await updateDoc(docRef, {
                                    latitude: geo.latitude,
                                    longitude: geo.longitude,
                                    city: geo.city || loc.city,
                                    state: geo.state || loc.state
                                });
                                // Update local state matching the ID
                                const idx = locations.value.findIndex(l => l.id === loc.id);
                                if (idx !== -1) {
                                    locations.value[idx] = {
                                        ...locations.value[idx],
                                        latitude: geo.latitude,
                                        longitude: geo.longitude
                                    } as Location;
                                }
                            } catch (e) {
                                console.error('Silent coordinate repair failed:', e);
                            }
                        }
                    }
                }

                if (!activeLocationId.value || !fetched.find(l => l.id === activeLocationId.value)) {
                    const first = fetched[0];
                    if (first) setActiveLocation(first.id);
                }
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
        } finally {
            loading.value = false;
        }
    };

    const setActiveLocation = (id: string) => {
        console.log('Location Store: Switching active location to', id);
        activeLocationId.value = id;
        localStorage.setItem('activeLocationId', id);
    };

    const addLocation = async (location: Omit<Location, 'id' | 'createdAt'>) => {
        try {
            let finalLocation = { ...location };

            // Geocode before adding
            if (location.zipCode) {
                const geo = await geocodeZipCode(location.zipCode);
                if (geo) {
                    finalLocation.latitude = geo.latitude;
                    finalLocation.longitude = geo.longitude;
                    finalLocation.city = geo.city || location.city;
                    finalLocation.state = geo.state || location.state;
                }
            }

            const docRef = await addDoc(collection(db, 'locations'), {
                ...finalLocation,
                createdAt: new Date().toISOString()
            });
            await fetchLocations();
            return docRef.id;
        } catch (error) {
            console.error('Error adding location:', error);
            throw error;
        }
    };

    const updateLocation = async (id: string, updates: Partial<Location>) => {
        try {
            if (updates.zipCode) {
                const geo = await geocodeZipCode(updates.zipCode);
                if (geo) {
                    updates.latitude = geo.latitude;
                    updates.longitude = geo.longitude;
                    updates.city = geo.city;
                    updates.state = geo.state;
                }
            }
            const docRef = doc(db, 'locations', id);
            await updateDoc(docRef, updates);
            await fetchLocations();
        } catch (error) {
            console.error('Error updating location:', error);
            throw error;
        }
    };

    const geocodeZipCode = async (zip: string) => {
        try {
            const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
            if (response.ok) {
                const data = await response.json();
                const place = data.places[0];
                return {
                    latitude: parseFloat(place.latitude),
                    longitude: parseFloat(place.longitude),
                    city: place['place name'],
                    state: place['state abbreviation']
                };
            }
        } catch (error) {
            console.error('Geocoding failed:', error);
        }
        return null;
    };

    const clearData = () => {
        locations.value = [];
        activeLocationId.value = null;
        localStorage.removeItem('activeLocationId');
    };

    return {
        locations,
        activeLocationId,
        activeLocation,
        loading,
        fetchLocations,
        setActiveLocation,
        addLocation,
        updateLocation,
        clearData,
        geocodeZipCode
    };
});

