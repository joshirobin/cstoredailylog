import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useLocationsStore } from './locations';

export interface StoreSettings {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    latitude?: number;
    longitude?: number;
    locationId: string;
    lastUpdated?: string;
}

export const useSettingsStore = defineStore('settings', () => {
    const settings = ref<StoreSettings>({
        name: 'My C-Store',
        address: '123 Main St',
        city: 'Dallas',
        state: 'TX',
        zipCode: '75201',
        latitude: 32.7767,
        longitude: -96.7970,
        locationId: ''
    });
    const loading = ref(false);

    const fetchSettings = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            const docRef = doc(db, 'settings', locationsStore.activeLocationId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                settings.value = { ...settings.value, ...docSnap.data() as StoreSettings };
            } else {
                // Initialize default for this location if not found
                settings.value = {
                    ...settings.value,
                    locationId: locationsStore.activeLocationId,
                    name: `Store ${locationsStore.activeLocationId}`
                };
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            loading.value = false;
        }
    };

    const updateSettings = async (newSettings: Partial<StoreSettings>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            settings.value = {
                ...settings.value,
                ...newSettings,
                locationId: locationsStore.activeLocationId
            };
            settings.value.lastUpdated = new Date().toISOString();

            if (newSettings.zipCode) {
                await geocodeZipCode(newSettings.zipCode);
            }
            await setDoc(doc(db, 'settings', locationsStore.activeLocationId), settings.value);
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    };

    const geocodeZipCode = async (zip: string) => {
        try {
            const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
            if (response.ok) {
                const data = await response.json();
                const place = data.places[0];
                settings.value.latitude = parseFloat(place.latitude);
                settings.value.longitude = parseFloat(place.longitude);
                settings.value.city = place['place name'];
                settings.value.state = place['state abbreviation'];
            }
        } catch (error) {
            console.error('Geocoding failed:', error);
        }
    };

    return {
        settings,
        loading,
        fetchSettings,
        updateSettings
    };
});
