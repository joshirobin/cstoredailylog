import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, addDoc, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useAuthStore } from './auth';
import { useLocationsStore } from './locations';

export interface AuditLogEntry {
    id: string;
    timestamp: Timestamp;
    userId: string;
    userEmail: string;
    userName: string;
    locationId: string;
    module: 'lottery' | 'fuel' | 'inventory' | 'tasks' | 'invoices' | 'auth' | 'system';
    action: string; // e.g., 'BOOK_ACTIVATED', 'SETTLEMENT_CREATED', 'COUNT_FINALIZED'
    entityType: string; // e.g., 'lottery_book', 'settlement', 'daily_count'
    entityId?: string;
    details: Record<string, any>; // Additional context
    ipAddress?: string;
    userAgent?: string;
}

export const useAuditStore = defineStore('audit', () => {
    const logs = ref<AuditLogEntry[]>([]);
    const loading = ref(false);

    /**
     * Log an action to the audit trail
     */
    const logAction = async (
        module: AuditLogEntry['module'],
        action: string,
        entityType: string,
        details: Record<string, any> = {},
        entityId?: string
    ) => {
        const authStore = useAuthStore();
        const locationsStore = useLocationsStore();

        if (!authStore.user || !locationsStore.activeLocationId) {
            console.warn('Cannot log audit: No user or location');
            return;
        }

        try {
            const entry: Omit<AuditLogEntry, 'id'> = {
                timestamp: Timestamp.now(),
                userId: authStore.user.uid,
                userEmail: authStore.user.email || 'unknown',
                userName: authStore.user.displayName || authStore.user.email || 'Unknown User',
                locationId: locationsStore.activeLocationId,
                module,
                action,
                entityType,
                entityId,
                details,
                userAgent: navigator.userAgent
            };

            await addDoc(collection(db, 'audit_logs'), entry);
        } catch (error) {
            console.error('Failed to log audit entry:', error);
            // Don't throw - audit logging should not break the app
        }
    };

    /**
     * Fetch audit logs with filters
     */
    const fetchLogs = async (filters: {
        module?: AuditLogEntry['module'];
        userId?: string;
        entityId?: string;
        startDate?: Date;
        endDate?: Date;
        limitCount?: number;
    } = {}) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            let q = query(
                collection(db, 'audit_logs'),
                where('locationId', '==', locationsStore.activeLocationId)
            );

            if (filters.module) {
                q = query(q, where('module', '==', filters.module));
            }

            if (filters.userId) {
                q = query(q, where('userId', '==', filters.userId));
            }

            if (filters.entityId) {
                q = query(q, where('entityId', '==', filters.entityId));
            }

            // Order by timestamp descending
            q = query(q, orderBy('timestamp', 'desc'));

            if (filters.limitCount) {
                q = query(q, limit(filters.limitCount));
            }

            const snap = await getDocs(q);
            logs.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogEntry));
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            loading.value = false;
        }
    };

    return {
        logs,
        loading,
        logAction,
        fetchLogs
    };
});
