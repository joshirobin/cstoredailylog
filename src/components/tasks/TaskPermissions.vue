<script setup lang="ts">
import { 
  Check, Ban, ShieldAlert, 
  Globe, Fingerprint
} from 'lucide-vue-next';
import { usePermissionsStore } from '../../stores/permissions';
import { computed } from 'vue';

const permissionsStore = usePermissionsStore();

const permissionsData = computed(() => {
    return Object.values(permissionsStore.permissions).map(p => ({
        role: p.id,
        view: p.taskActions?.view || 'Own',
        create: p.taskActions?.execute ?? false,
        edit: p.taskActions?.modify ?? false,
        approve: p.taskActions?.verify ?? false,
        delete: p.taskActions?.purge ?? false,
        override: p.taskActions?.override ?? false
    }));
});

const togglePermission = async (role: string, field: string) => {
    if (role === 'Admin' || role === 'Manager') return;
    
    const config = permissionsStore.permissions[role];
    if (!config) return;

    const taskActions = { ...config.taskActions };
    const fieldMap: Record<string, string> = {
        'create': 'execute',
        'edit': 'modify',
        'approve': 'verify',
        'delete': 'purge',
        'override': 'override'
    };
    const targetField = fieldMap[field] || field;
    (taskActions as any)[targetField] = !(taskActions as any)[targetField];

    await permissionsStore.updatePermissions(role, { taskActions });
};

const SPECIAL_LOCKS = [
    "Cash edits require Manager role",
    "Lottery edits require Manager approval",
    "Food logs cannot be deleted",
    "Completed checklists are immutable"
];

const SYSTEM_CAPS = [
    'Multi-store Support', 
    'Multi-state Compliance', 
    'Mobile Checklists', 
    'Audit Logs', 
    'Franchise Reporting', 
    'SOC-style Controls'
];
</script>

<template>
  <div class="space-y-8 animate-in fade-in duration-700">
    <!-- Main RBAC Card -->
    <div class="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-2xl overflow-hidden relative group">
        <div class="absolute -right-20 -top-20 w-80 h-80 bg-slate-50 rounded-full opacity-50 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
        
        <!-- Header -->
        <div class="px-12 py-10 bg-white border-b border-slate-100 relative z-10">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div class="flex items-center gap-6">
                    <div class="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
                        <Fingerprint class="w-8 h-8" />
                    </div>
                    <div>
                        <h2 class="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Identity Matrix</h2>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Role-Based Access Control (RBAC) System</p>
                    </div>
                </div>
                <div class="flex gap-6">
                    <div class="flex items-center gap-3 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                        <Check class="w-3.5 h-3.5" />
                        Authorized
                    </div>
                    <div class="flex items-center gap-3 px-4 py-2 bg-rose-50 rounded-xl border border-rose-100 text-[10px] font-black uppercase tracking-widest text-rose-500">
                        <Ban class="w-3.5 h-3.5" />
                        Restricted
                    </div>
                </div>
            </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto custom-scrollbar relative z-10">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-slate-50/50">
                        <th class="px-12 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Personnel Cluster</th>
                        <th class="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">Data Scope</th>
                        <th class="px-6 py-6 text-[10px) font-black uppercase tracking-[0.3em] text-slate-400 text-center">Execute</th>
                        <th class="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">Modify</th>
                        <th class="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">Verify</th>
                        <th class="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">Purge</th>
                        <th class="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">Override</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                    <tr 
                        v-for="(row, idx) in permissionsData" 
                        :key="idx" 
                        class="hover:bg-slate-50 transition-all group"
                    >
                        <td class="px-12 py-6">
                            <span class="text-lg font-black text-slate-900 tracking-tighter uppercase italic group-hover:text-primary-600 transition-colors">{{ row.role }}</span>
                        </td>
                        <td class="px-6 py-6 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-50/30">
                            <span class="px-4 py-1.5 rounded-lg bg-white border border-slate-100 shadow-sm">{{ row.view }}</span>
                        </td>
                        <td class="px-6 py-6 text-center">
                            <button 
                                @click="togglePermission(row.role, 'create')"
                                class="w-full flex items-center justify-center transition-all duration-300 hover:scale-125 disabled:cursor-not-allowed"
                                :disabled="row.role === 'Admin' || row.role === 'Manager'"
                            >
                                <Check v-if="row.create" class="w-5 h-5 text-emerald-500" />
                                <Ban v-else class="w-5 h-5 text-rose-300 opacity-20" />
                            </button>
                        </td>
                        <td class="px-6 py-6 text-center">
                            <button 
                                @click="togglePermission(row.role, 'edit')"
                                class="w-full flex items-center justify-center transition-all duration-300 hover:scale-125 disabled:cursor-not-allowed"
                                :disabled="row.role === 'Admin' || row.role === 'Manager'"
                            >
                                <Check v-if="row.edit" class="w-5 h-5 text-emerald-500" />
                                <Ban v-else class="w-5 h-5 text-rose-300 opacity-20" />
                            </button>
                        </td>
                        <td class="px-6 py-6 text-center">
                            <button 
                                @click="togglePermission(row.role, 'approve')"
                                class="w-full flex items-center justify-center transition-all duration-300 hover:scale-125 disabled:cursor-not-allowed"
                                :disabled="row.role === 'Admin' || row.role === 'Manager'"
                            >
                                <Check v-if="row.approve" class="w-5 h-5 text-emerald-500" />
                                <Ban v-else class="w-5 h-5 text-rose-300 opacity-20" />
                            </button>
                        </td>
                        <td class="px-6 py-6 text-center">
                            <button 
                                @click="togglePermission(row.role, 'delete')"
                                class="w-full flex items-center justify-center transition-all duration-300 hover:scale-125 disabled:cursor-not-allowed"
                                :disabled="row.role === 'Admin' || row.role === 'Manager'"
                            >
                                <Check v-if="row.delete" class="w-5 h-5 text-emerald-500" />
                                <Ban v-else class="w-5 h-5 text-rose-300 opacity-20" />
                            </button>
                        </td>
                        <td class="px-6 py-6 text-center">
                            <button 
                                @click="togglePermission(row.role, 'override')"
                                class="w-full flex items-center justify-center transition-all duration-300 hover:scale-125 disabled:cursor-not-allowed"
                                :disabled="row.role === 'Admin' || row.role === 'Manager'"
                            >
                                <Check v-if="row.override" class="w-5 h-5 text-emerald-500" />
                                <Ban v-else class="w-5 h-5 text-rose-300 opacity-20" />
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Security & Capabilities Footer -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Security Locks -->
        <div class="bg-white p-10 rounded-[3rem] border-2 border-rose-50 shadow-xl shadow-rose-500/5 relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
            <div class="relative z-10 space-y-8">
                <div class="flex items-center gap-5">
                    <div class="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shadow-lg shadow-rose-200">
                        <ShieldAlert class="w-7 h-7" />
                    </div>
                    <div>
                        <h3 class="text-xl font-black text-rose-900 uppercase italic tracking-tighter">Security Enforcements</h3>
                        <p class="text-[8px] font-black text-rose-400 uppercase tracking-widest">Protocol Locks & Validation</p>
                    </div>
                </div>
                <div class="space-y-4">
                    <div v-for="(lock, i) in SPECIAL_LOCKS" :key="i" class="flex items-center gap-4 group/item">
                        <div class="w-1.5 h-1.5 rounded-full bg-rose-400 group-hover/item:scale-150 transition-transform"></div>
                        <span class="text-sm font-black text-rose-800 tracking-tight uppercase group-hover/item:translate-x-2 transition-transform">{{ lock }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- System Capabilities -->
        <div class="bg-white p-10 rounded-[3rem] border-2 border-primary-50 shadow-xl shadow-primary-500/5 relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-primary-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
            <div class="relative z-10 space-y-8">
                <div class="flex items-center gap-5">
                    <div class="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-600 shadow-lg shadow-primary-200">
                        <Globe class="w-7 h-7" />
                    </div>
                    <div>
                        <h3 class="text-xl font-black text-primary-900 uppercase italic tracking-tighter">Core Infrastructure</h3>
                        <p class="text-[8px] font-black text-primary-400 uppercase tracking-widest">System Capabilities</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div v-for="(cap, i) in SYSTEM_CAPS" :key="i" class="flex items-center gap-3">
                        <div class="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                            <Check class="w-3.5 h-3.5" />
                        </div>
                        <span class="text-[10px] font-black text-slate-800 uppercase tracking-widest">{{ cap }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #f1f5f9;
  border-radius: 9999px;
  border: 2px solid transparent;
  background-clip: content-box;
}
</style>
