<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
    useChecklistsStore, 
    type ChecklistSubmission,
    type ChecklistTemplate,
    ALL_TEMPLATES 
} from '../../stores/checklists';
import { useAuthStore } from '../../stores/auth';
import { 
  Filter, FileText, X, Calendar, 
  CheckCircle2, AlertCircle, Eye,
  ShieldCheck, UserCheck
} from 'lucide-vue-next';

const checklistsStore = useChecklistsStore();
const authStore = useAuthStore();
const selectedLog = ref<ChecklistSubmission | null>(null);
const filterRole = ref('all');
const isReviewing = ref(false);

const filteredLogs = computed(() => {
    return checklistsStore.submissions.filter(log =>
        filterRole.value === 'all' || log.role === filterRole.value
    );
});

const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
        'cashier': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'manager': 'bg-indigo-100 text-indigo-700 border-indigo-200',
        'kitchen_mgr': 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return colors[role] || 'bg-slate-100 text-slate-700 border-slate-200';
};

const getRoleTitle = (role: string) => {
    const titles: Record<string, string> = {
        'cashier': 'Cashier / Clerk',
        'manager': 'Store Manager',
        'kitchen_mgr': 'Kitchen Manager',
    };
    return titles[role] || role;
};

const selectedTemplate = computed((): ChecklistTemplate => {
    const tpl = ALL_TEMPLATES.find(t => t.template_id === selectedLog.value?.templateId);
    return (tpl || ALL_TEMPLATES[0]) as ChecklistTemplate;
});

const handleReview = async () => {
    if (!selectedLog.value?.id) return;
    isReviewing.value = true;
    try {
        const reviewerName = authStore.user?.displayName || authStore.user?.email || 'System Manager';
        await checklistsStore.reviewChecklist(selectedLog.value.id, reviewerName);
        // Refresh local selected log
        selectedLog.value = { 
            ...selectedLog.value, 
            reviewedBy: reviewerName, 
            reviewedAt: { toDate: () => new Date() } as any 
        };
        alert("Checklist successfully reviewed and marked as verified.");
    } catch (e) {
        alert("Failed to review checklist.");
    } finally {
        isReviewing.value = false;
    }
};
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500">
    <!-- Filters & Stats -->
    <div class="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div class="flex items-center gap-3 w-full md:w-auto">
            <div class="p-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-400">
                <Filter class="w-4 h-4" />
            </div>
            <select
                v-model="filterRole"
                class="bg-transparent border-none focus:ring-0 font-bold uppercase text-[10px] tracking-widest text-slate-900 cursor-pointer"
            >
                <option value="all">All Operations</option>
                <option value="cashier">Cashier Registry</option>
                <option value="manager">Management Logs</option>
                <option value="kitchen_mgr">Kitchen Vectors</option>
            </select>
        </div>
        
        <div class="flex items-center gap-4 px-4 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
            <div class="text-center">
                <p class="text-lg font-black text-slate-900 tracking-tighter leading-none">{{ filteredLogs.length }}</p>
                <p class="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Total Logs</p>
            </div>
            <div class="w-px h-6 bg-slate-200"></div>
            <div class="text-center text-emerald-600">
                <p class="text-lg font-black tracking-tighter leading-none">{{ filteredLogs.filter(l => l.status === 'COMPLETED').length }}</p>
                <p class="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Verified</p>
            </div>
        </div>
    </div>


    <!-- Table Content -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden relative">
        <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-slate-50 text-slate-400 border-b border-slate-100">
                        <th class="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Deployment Date</th>
                        <th class="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Operational Role</th>
                        <th class="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Authorized Personnel</th>
                        <th class="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Compliance Status</th>
                        <th class="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Manager Review</th>
                        <th class="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest">Actions</th>
                    </tr>
                </thead>

                <tbody class="divide-y divide-slate-100">
                    <tr v-if="filteredLogs.length === 0">
                        <td colspan="6" class="px-8 py-32 text-center">
                            <div class="space-y-4 opacity-20">
                                <FileText class="w-20 h-20 mx-auto" />
                                <p class="text-2xl font-black uppercase italic tracking-tighter">No historical vectors found</p>
                            </div>
                        </td>
                    </tr>
                    <tr 
                        v-for="log in filteredLogs" 
                        :key="log.id" 
                        class="hover:bg-slate-50 transition-all group"
                    >
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <Calendar class="w-3.5 h-3.5 text-slate-300" />
                                <span class="font-bold text-slate-900 text-xs">{{ formatDate(log.submittedAt || log.createdAt) }}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            <span :class="['px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border', getRoleBadgeColor(log.role)]">
                                {{ getRoleTitle(log.role) }}
                            </span>
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <span class="text-xs font-bold text-slate-700">{{ log.employeeName || 'Anonymous' }}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-2">
                                <div :class="['w-1.5 h-1.5 rounded-full', log.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-amber-500']"></div>
                                <span :class="['text-[9px] font-black uppercase tracking-widest', log.status === 'COMPLETED' ? 'text-emerald-600' : 'text-amber-600']">
                                    {{ log.status }}
                                </span>
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            <div v-if="log.reviewedBy" class="flex items-center gap-2 text-emerald-600">
                                <ShieldCheck class="w-4 h-4" />
                                <span class="text-[8px] font-black uppercase tracking-widest">Verified by {{ log.reviewedBy }}</span>
                            </div>
                            <div v-else class="flex items-center gap-2 text-slate-300">
                                <AlertCircle class="w-4 h-4" />
                                <span class="text-[8px] font-black uppercase tracking-widest italic">Pending Review</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <button 
                                @click="selectedLog = log"
                                class="px-4 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 ml-auto"
                            >
                                <Eye class="w-3 h-3" />
                                Review Details
                            </button>
                        </td>
                    </tr>

                </tbody>
            </table>
        </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="selectedLog" class="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
        <div class="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in duration-300 flex flex-col">
            <div class="px-12 py-10 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
                <div>
                    <h2 class="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Operational Audit Report</h2>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Deployment ID: #{{ selectedLog.id?.substring(0, 8).toUpperCase() }}</p>
                </div>
                <button 
                    @click="selectedLog = null"
                    class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"
                >
                    <X class="w-6 h-6" />
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar">
                <!-- Info Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Role Vector</p>
                        <p class="text-lg font-black text-slate-900 italic uppercase tracking-tighter">{{ getRoleTitle(selectedLog.role) }}</p>
                    </div>
                    <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Operational Personnel</p>
                        <p class="text-lg font-black text-slate-900 italic uppercase tracking-tighter">{{ selectedLog.employeeName || 'N/A' }}</p>
                    </div>
                    <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Finalized At</p>
                        <p class="text-lg font-black text-slate-900 italic uppercase tracking-tighter">
                            {{ formatDate(selectedLog.submittedAt || selectedLog.createdAt) }}
                        </p>
                    </div>
                    <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Compliance</p>
                        <p class="text-lg font-black text-emerald-600 italic uppercase tracking-tighter">{{ selectedLog.status }}</p>
                    </div>
                </div>

                <!-- Structured Response View -->
                <div class="space-y-6">
                    <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-4">
                        Vector Data Breakdown
                        <div class="flex-1 h-px bg-slate-100"></div>
                    </h3>
                    
                    <div v-if="selectedLog" class="space-y-8">
                        <div v-for="section in selectedTemplate.sections" :key="section.section_id" class="space-y-4">
                            <h4 class="text-[10px] font-black text-slate-900 uppercase tracking-widest border-l-4 border-slate-900 pl-3">
                                {{ section.title }}
                            </h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div v-for="task in section.tasks" :key="task.task_id" class="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                    <span class="text-[11px] font-bold text-slate-600">{{ task.label }}</span>
                                    
                                    <div v-if="task.type === 'boolean'" class="flex items-center gap-2">
                                        <CheckCircle2 v-if="selectedLog.responses[task.task_id]" class="w-4 h-4 text-emerald-500" />
                                        <AlertCircle v-else class="w-4 h-4 text-rose-500" />
                                        <span :class="['text-[9px] font-black uppercase tracking-widest', selectedLog.responses[task.task_id] ? 'text-emerald-600' : 'text-rose-600']">
                                            {{ selectedLog.responses[task.task_id] ? 'Verified' : 'Incomplete' }}
                                        </span>
                                    </div>
                                    <div v-else-if="task.type === 'currency'" class="text-sm font-black text-slate-900">
                                        ${{ Number(selectedLog.responses[task.task_id] || 0).toFixed(2) }}
                                    </div>
                                    <div v-else-if="task.type === 'comment'" class="text-[10px] font-medium text-slate-500 bg-white px-3 py-1 rounded-lg border border-slate-100 italic">
                                        {{ selectedLog.responses[task.task_id] || 'No notes provided' }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Signature Visualization -->
                <div v-if="selectedLog.signatureData" class="space-y-6">
                    <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-4">
                        Personnel Certification
                        <div class="flex-1 h-px bg-slate-100"></div>
                    </h3>
                    <div class="bg-white rounded-[2rem] border-2 border-slate-100 p-8 flex flex-col items-center justify-center relative group">
                        <img :src="selectedLog.signatureData" alt="Signature" class="max-h-32 object-contain relative z-10" />
                        <div class="absolute inset-x-8 bottom-8 h-px bg-slate-100"></div>
                        <p class="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] mt-4">Authorized Signature Line</p>
                    </div>
                </div>

                <!-- Review Badge -->
                <div v-if="selectedLog.reviewedBy" class="p-8 bg-emerald-50 rounded-[2rem] border-2 border-emerald-100 flex items-center gap-6 animate-in slide-in-from-bottom-4">
                    <div class="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100">
                        <UserCheck class="w-8 h-8" />
                    </div>
                    <div>
                        <h4 class="text-sm font-black text-emerald-900 uppercase italic tracking-tighter">Verified by Management</h4>
                        <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">
                            Reviewer: {{ selectedLog.reviewedBy }} • {{ formatDate(selectedLog.reviewedAt) }}
                        </p>
                    </div>
                </div>
            </div>

            <div class="px-12 py-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button 
                    @click="selectedLog = null"
                    class="px-8 py-4 bg-white border-2 border-slate-200 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-slate-900 hover:text-slate-900 transition-all"
                >
                    Dismiss
                </button>
                <button 
                    v-if="!selectedLog.reviewedBy"
                    @click="handleReview"
                    :disabled="isReviewing"
                    class="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    <UserCheck v-if="!isReviewing" class="w-4 h-4" />
                    <span v-else class="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
                    {{ isReviewing ? 'Certifying Matrix...' : 'Certify & Verify Checklist' }}
                </button>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 9999px;
}
</style>
