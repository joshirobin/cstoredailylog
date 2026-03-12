import { create } from 'zustand';

export interface Location {
    id: string;
    name: string;
    zipCode: string;
    address: string;
}

interface LocationsState {
    activeLocationId: string | null;
    activeLocation: Location | null;
    setActiveLocation: (id: string, zipCode?: string) => void;
}

// Minimal stub for now
export const useLocationsStore = create<LocationsState>((set) => ({
    activeLocationId: 'default_location',
    activeLocation: { id: 'default_location', name: 'Main Store', zipCode: '12345', address: '123 Main St' },
    setActiveLocation: (id, zipCode = '12345') => set({
        activeLocationId: id,
        activeLocation: { id, name: 'Store ' + id, zipCode, address: '' }
    })
}));
