import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';

export interface RolePermissions {
    id: string; // role name e.g., 'Cashier'
    allowedRoutes: string[];
    taskActions: {
        view: 'All' | 'Most' | 'Shift' | 'Own' | 'Kitchen' | 'Inventory' | 'Maintenance';
        execute: boolean;
        modify: boolean;
        verify: boolean;
        purge: boolean;
        override: boolean;
    };
}

export const usePermissionsStore = defineStore('permissions', () => {
    const permissions = ref<Record<string, RolePermissions>>({});
    const loading = ref(false);

    const defaultPermissions: Record<string, RolePermissions> = {
        'Admin': {
            id: 'Admin',
            allowedRoutes: ['*'],
            taskActions: { view: 'All', execute: true, modify: true, verify: true, purge: true, override: true }
        },
        'Manager': {
            id: 'Manager',
            allowedRoutes: ['*'],
            taskActions: { view: 'All', execute: true, modify: true, verify: true, purge: true, override: true }
        },
        'Assistant Manager': {
            id: 'Assistant Manager',
            allowedRoutes: [
                'dashboard', 'sales', 'scan', 'invoices', 'create-invoice', 'payments',
                'create-payment', 'fuel', 'lottery', 'lottery-inventory', 'lottery-reconciliation',
                'lottery-settlement', 'shifts', 'time-clock', 'tasks', 'checklists', 'inventory',
                'pricebook', 'purchases', 'clerk', 'journal', 'vendor-checkin', 'food-safety',
                'competitor-watch', 'lottery-shrinkage', 'cash-flow', 'food-waste', 'sops'
            ],
            taskActions: { view: 'Most', execute: true, modify: true, verify: false, purge: false, override: false }
        },
        'Shift Manager': {
            id: 'Shift Manager',
            allowedRoutes: [
                'dashboard', 'sales', 'scan', 'invoices', 'create-invoice', 'payments',
                'create-payment', 'fuel', 'lottery', 'lottery-inventory', 'lottery-reconciliation',
                'lottery-settlement', 'shifts', 'time-clock', 'tasks', 'checklists', 'inventory',
                'pricebook', 'purchases', 'clerk', 'journal', 'vendor-checkin', 'food-safety',
                'competitor-watch', 'lottery-shrinkage', 'cash-flow', 'food-waste', 'sops'
            ],
            taskActions: { view: 'Shift', execute: true, modify: false, verify: false, purge: false, override: false }
        },
        'Cashier': {
            id: 'Cashier',
            allowedRoutes: [
                'dashboard', 'fuel', 'create-invoice', 'time-clock', 'tasks', 'checklists',
                'clerk', 'vendor-checkin', 'food-safety', 'journal', 'food-waste', 'sops'
            ],
            taskActions: { view: 'Own', execute: true, modify: false, verify: false, purge: false, override: false }
        },
        'Stocker': {
            id: 'Stocker',
            allowedRoutes: [
                'dashboard', 'time-clock', 'tasks', 'checklists', 'pricebook', 'inventory',
                'purchases', 'vendor-checkin', 'sops'
            ],
            taskActions: { view: 'Inventory', execute: true, modify: false, verify: false, purge: false, override: false }
        }
    };

    const fetchPermissions = async () => {
        loading.value = true;
        try {
            const querySnapshot = await getDocs(collection(db, 'role_permissions'));
            const fetched: Record<string, RolePermissions> = {};

            if (querySnapshot.empty) {
                // Initialize Firestore with defaults if empty
                for (const [role, config] of Object.entries(defaultPermissions)) {
                    await setDoc(doc(db, 'role_permissions', role), config);
                    fetched[role] = config;
                }
            } else {
                querySnapshot.forEach((doc) => {
                    fetched[doc.id] = doc.data() as RolePermissions;
                });
            }
            permissions.value = fetched;
        } catch (error) {
            console.error('Failed to fetch permissions:', error);
            permissions.value = defaultPermissions; // Fallback
        } finally {
            loading.value = false;
        }
    };

    const updatePermissions = async (role: string, config: Partial<RolePermissions>) => {
        try {
            const current = (permissions.value[role] || defaultPermissions[role] || defaultPermissions['Cashier']) as RolePermissions;
            const updated: RolePermissions = {
                id: current.id,
                allowedRoutes: config.allowedRoutes || current.allowedRoutes,
                taskActions: config.taskActions ? { ...current.taskActions, ...config.taskActions } : current.taskActions
            };
            await setDoc(doc(db, 'role_permissions', role), updated);
            permissions.value[role] = updated;
        } catch (error) {
            console.error('Failed to update permissions:', error);
            throw error;
        }
    };

    return {
        permissions,
        loading,
        fetchPermissions,
        updatePermissions,
        defaultPermissions
    };
});
