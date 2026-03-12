import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db, storage } from '../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLocationsStore } from './locations';
import { useAuthStore } from './auth';

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

export const useAuditStore = defineStore('audits', () => {
    const shiftAudits = ref<ShiftAudit[]>([]);
    const loading = ref(false);

    let unsubscribe: (() => void) | null = null;

    const fetchAudits = () => {
        const locationsStore = useLocationsStore();
        if (unsubscribe || !locationsStore.activeLocationId) return;

        loading.value = true;
        const q = query(
            collection(db, 'shift_audits'),
            where('locationId', '==', locationsStore.activeLocationId),
            orderBy('createdAt', 'desc')
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
            shiftAudits.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShiftAudit));
            loading.value = false;
        });
    };

    const stopSync = () => {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
    };

    const createAudit = async (audit: Omit<ShiftAudit, 'id' | 'locationId' | 'createdAt'>) => {
        const locationsStore = useLocationsStore();
        const authStore = useAuthStore();

        // Ensure we have a location
        if (!locationsStore.activeLocationId) {
            console.error('Cannot create audit: No active location');
            return;
        }

        // Use current user email or fallback to demo
        const auditorEmail = authStore.user?.email || 'demo@cstoredaily.com';

        try {
            console.log('Creating audit in Firestore...', audit);
            const docRef = await addDoc(collection(db, 'shift_audits'), {
                ...audit,
                locationId: locationsStore.activeLocationId,
                auditorEmail: auditorEmail,
                createdAt: new Date().toISOString()
            });
            console.log('Audit created successfully with ID:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Failed to create audit in Firebase:', error);
            throw error;
        }
    };

    const verifyAudit = async (auditId: string, verifierEmail: string) => {
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
    };

    const deleteAudit = async (auditId: string) => {
        try {
            await deleteDoc(doc(db, 'shift_audits', auditId));
        } catch (error) {
            console.error('Failed to delete audit:', error);
            throw error;
        }
    };

    const uploadAuditImage = async (file: File, category: string): Promise<string> => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) throw new Error('No active location');

        const timestamp = Date.now();
        const fileName = `audits/${locationsStore.activeLocationId}/${category}_${timestamp}_${file.name}`;
        const fileRef = storageRef(storage, fileName);

        try {
            await uploadBytes(fileRef, file);
            return await getDownloadURL(fileRef);
        } catch (error) {
            console.error('Failed to upload image:', error);
            throw error;
        }
    };

    return {
        shiftAudits,
        loading,
        fetchAudits,
        stopSync,
        createAudit,
        verifyAudit,
        deleteAudit,
        uploadAuditImage
    };
});
