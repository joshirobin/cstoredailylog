<template>
  <div class="p-6 max-w-7xl mx-auto">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-slate-900 tracking-tight">Access Control Management</h1>
      <p class="text-slate-500 mt-1">Configure which pages each employee role can access.</p>
    </div>

    <div v-if="permissionsStore.loading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <!-- Role Selection Sidebar -->
      <div class="lg:col-span-1 space-y-2">
        <h2 class="text-sm font-black text-slate-400 uppercase tracking-widest px-4 mb-4">Roles</h2>
        <button
          v-for="(_, role) in rolesList"
          :key="role"
          @click="selectedRole = role"
          class="w-full text-left px-4 py-3 rounded-xl transition-all duration-200 font-semibold flex items-center justify-between group"
          :class="selectedRole === role ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'text-slate-600 hover:bg-slate-100'"
        >
          <span>{{ role }}</span>
          <ChevronRight class="w-4 h-4 transition-transform group-hover:translate-x-1" :class="selectedRole === role ? 'text-white/70' : 'text-slate-300'" />
        </button>
      </div>

      <!-- Permissions Editor -->
      <div class="lg:col-span-3">
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 class="text-xl font-bold text-slate-900">{{ selectedRole }} Permissions</h2>
              <p class="text-sm text-slate-500 mt-0.5">Select the modules this role is allowed to view.</p>
            </div>
            <button 
              @click="savePermissions" 
              :disabled="saving"
              class="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save v-if="!saving" class="w-4 h-4" />
              <div v-else class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              {{ saving ? 'Saving...' : 'Save Configuration' }}
            </button>
          </div>

          <div class="p-6">
            <div v-if="selectedRole === 'Admin' || selectedRole === 'Manager'" class="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 text-amber-800 italic text-sm">
                <Shield class="w-5 h-5 flex-shrink-0" />
                <span>Default system roles are granted full access (*) and cannot be restricted to ensure administrative continuity.</span>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                v-for="route in allRoutes" 
                :key="route.id"
                class="flex items-center gap-3 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group"
                @click="toggleRoute(route.id)"
              >
                <div 
                  class="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all"
                  :class="isAllowed(route.id) ? 'bg-primary-600 border-primary-600' : 'border-slate-200 group-hover:border-slate-300'"
                >
                  <Check v-if="isAllowed(route.id)" class="w-4 h-4 text-white" />
                </div>
                <div>
                  <div class="text-sm font-bold text-slate-900">{{ route.name }}</div>
                  <div class="text-xs text-slate-400 capitalize">{{ route.id.replace(/-/g, ' ') }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { usePermissionsStore } from '../../stores/permissions';
import { ChevronRight, Save, Check, Shield } from 'lucide-vue-next';

const permissionsStore = usePermissionsStore();
const selectedRole = ref('Cashier');
const saving = ref(false);

const rolesList = computed(() => permissionsStore.permissions);

const allRoutes = [
  { id: 'dashboard', name: 'Main Dashboard' },
  { id: 'sales', name: 'Daily Sales & P&L' },
  { id: 'accounts', name: 'House Charge Accounts' },
  { id: 'create-account', name: 'Create Account' },
  { id: 'scan', name: 'Scan Invoices (OCR)' },
  { id: 'invoices', name: 'Invoices History' },
  { id: 'create-invoice', name: 'Create Manual Invoice' },
  { id: 'payments', name: 'Payments History' },
  { id: 'create-payment', name: 'Record Payment' },
  { id: 'fuel', name: 'Fuel Operations' },
  { id: 'lottery', name: 'Lottery Dashboard' },
  { id: 'lottery-inventory', name: 'Lottery Inventory' },
  { id: 'lottery-reconciliation', name: 'Daily Reconciliation' },
  { id: 'lottery-settlement', name: 'Lottery Settlements' },
  { id: 'employees', name: 'Employee Management' },
  { id: 'shifts', name: 'Shift Scheduling' },
  { id: 'time-clock', name: 'Time Clock / Hours' },
  { id: 'tasks', name: 'Employee Tasks' },
  { id: 'checklists', name: 'Daily Checklists' },
  { id: 'inventory', name: 'Inventory Management' },
  { id: 'vault', name: 'Document Vault' },
  { id: 'pricebook', name: 'Store Price Book' },
  { id: 'purchases', name: 'Purchase Logs' },
  { id: 'clerk', name: 'Clerk Terminal' },
  { id: 'journal', name: 'Operations Journal' },
  { id: 'vendor-checkin', name: 'Vendor Checkin' },
  { id: 'food-safety', name: 'Food Safety Logs' },
  { id: 'competitor-watch', name: 'Competitor Tracking' },
  { id: 'lottery-shrinkage', name: 'Shrinkage Analysis' },
  { id: 'cash-flow', name: 'Cash Flow Predictor' },
  { id: 'food-waste', name: 'Food Waste Logs' },
  { id: 'sops', name: 'SOP Guidelines' },
  { id: 'sops-management', name: 'Manage SOPs' } // Future enhancement placeholder
];

const isAllowed = (routeId: string) => {
    const roleConfig = permissionsStore.permissions[selectedRole.value];
    if (!roleConfig) return false;
    const roleRoutes = roleConfig.allowedRoutes || [];
    return roleRoutes.includes(routeId) || roleRoutes.includes('*');
};

const toggleRoute = (routeId: string) => {
    if (selectedRole.value === 'Admin' || selectedRole.value === 'Manager') return;
    
    const roleConfig = permissionsStore.permissions[selectedRole.value];
    if (!roleConfig) return;

    const current = [...(roleConfig.allowedRoutes || [])];
    const index = current.indexOf(routeId);
    
    if (index === -1) {
        current.push(routeId);
    } else {
        current.splice(index, 1);
    }
    
    // Update local state before saving
    roleConfig.allowedRoutes = current;
};

const savePermissions = async () => {
    saving.value = true;
    try {
        const roleConfig = permissionsStore.permissions[selectedRole.value];
        if (roleConfig) {
            await permissionsStore.updatePermissions(selectedRole.value, { 
                allowedRoutes: roleConfig.allowedRoutes 
            });
            alert('Permissions saved successfully!');
        }
    } catch (e) {
        alert('Failed to save permissions.');
    } finally {
        saving.value = false;
    }
};

onMounted(async () => {
    await permissionsStore.fetchPermissions();
});
</script>
