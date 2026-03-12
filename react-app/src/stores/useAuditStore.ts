import { create } from 'zustand';
import { db, storage } from '../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLocationsStore } from './useLocationsStore';
import { useAuthStore } from './useAuthStore';

export interface AuditPhoto {
    id: string;
    category: 'Coffee Bar' | 'Restroom' | 'Pump Area' | 'Cooler' | 'Counter';
    imageUrl: string;
    timestamp: any;
    status: 'Pending' | 'Accepted' | 'Rejected';
    notes?: string;
}

export interface ShiftAudit {
    id: string;
    locationId: string;
    date: string;
    shift: 'Morning' | 'Afternoon' | 'Night';
    auditorEmail: string;
    photos: AuditPhoto[];
    status: 'In Progress' | 'Submitted' | 'Verified';
    verifiedBy?: string;
    verifiedAt?: string;
    createdAt: string;
}

interface AuditState {
    shiftAudits: ShiftAudit[];
    loading: boolean;
    fetchAudits: () => void;
    stopSync: () => void;
    createAudit: (audit: Omit<ShiftAudit, 'id' | 'locationId' | 'createdAt'>) => Promise<string | undefined>;
    verifyAudit: (auditId: string, verifierEmail: string) => Promise<void>;
    deleteAudit: (auditId: string) => Promise<void>;
    uploadAuditImage: (file: File, category: string) => Promise<string>;
    logAction: (module: string, action: string, targetType: string, details?: any, targetId?: string) => Promise<void>;
}

let unsubscribe: (() => void) | null = null;

export const useAuditStore = create<AuditState>((set) => ({
    shiftAudits: [],
    loading: false,

    fetchAudits: () => {
        const locationId = useLocationsStore.getState().activeLocationId;
        if (unsubscribe || !locationId) return;

        set({ loading: true });
        const q = query(
            collection(db, 'shift_audits'),
            where('locationId', '==', locationId),
            orderBy('createdAt', 'desc')
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
            const audits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShiftAudit));
            set({ shiftAudits: audits, loading: false });
        });
    },

    stopSync: () => {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
    },

    createAudit: async (audit) => {
        const locationId = useLocationsStore.getState().activeLocationId;
        const auditorEmail = useAuthStore.getState().user?.email || 'demo@cstoredaily.com';

        if (!locationId) {
            console.error('Cannot create audit: No active location');
            return;
        }

        try {
            const docRef = await addDoc(collection(db, 'shift_audits'), {
                ...audit,
                locationId: locationId,
                auditorEmail: auditorEmail,
                createdAt: new Date().toISOString()
            });
            return docRef.id;
        } catch (error) {
            console.error('Failed to create audit in Firebase:', error);
            throw error;
        }
    },

    verifyAudit: async (auditId, verifierEmail) => {
        try {
            const docRef = doc(db, 'shift_audits', auditId);
            await updateDoc(docRef, {
                status: 'Verified',
                verifiedBy: verifierEmail,
                verifiedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to verify audit:', error);
            throw error;
        }
    },

    deleteAudit: async (auditId) => {
        try {
            await deleteDoc(doc(db, 'shift_audits', auditId));
        } catch (error) {
            console.error('Failed to delete audit:', error);
            throw error;
        }
    },

    uploadAuditImage: async (file, category) => {
        const locationId = useLocationsStore.getState().activeLocationId;
        if (!locationId) throw new Error('No active location');

        const timestamp = Date.now();
        const fileName = `audits/${locationId}/${category}_${timestamp}_${file.name}`;
        const fileRef = storageRef(storage, fileName);

        try {
            await uploadBytes(fileRef, file);
            return await getDownloadURL(fileRef);
        } catch (error) {
            console.error('Failed to upload image:', error);
            throw error;
        }
    },

    logAction: async (module, action, targetType, details, targetId) => {
        try {
            const locationId = useLocationsStore.getState().activeLocationId;
            const userEmail = useAuthStore.getState().user?.email || 'system';

            await addDoc(collection(db, 'system_logs'), {
                module,
                action,
                targetType,
                targetId: targetId || null,
                details: details || {},
                userEmail,
                locationId: locationId || 'global',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to log action:', error);
        }
    }
}));
