<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { 
    useChecklistsStore, 
    ALL_TEMPLATES, 
    type ChecklistTemplate 
} from '../../stores/checklists';
import { useAuthStore } from '../../stores/auth';
import SignaturePad from '../../components/checklists/SignaturePad.vue';
import ChecklistHistoryTable from '../../components/checklists/ChecklistHistoryTable.vue';
import { 
  Calendar, Check, 
  History, CheckCircle2,
  Zap,
  Save
} from 'lucide-vue-next';

// --- State ---
const checklistsStore = useChecklistsStore();
const authStore = useAuthStore();
const selectedRole = ref('cashier');
const formState = ref<Record<string, any>>({});
const showSignatureModal = ref(false);
const isSubmitting = ref(false);
const viewMode = ref<'active' | 'history'>('active');

const activeTemplate = computed<ChecklistTemplate>(() => {
    const tpl = ALL_TEMPLATES.find(t => t.role_id === selectedRole.value);
    return tpl || ALL_TEMPLATES[0] as ChecklistTemplate;
});

const progress = computed(() => {
    let total = 0;
    let completed = 0;

    activeTemplate.value.sections.forEach(section => {
        section.tasks.forEach(task => {
            if (task.required) {
                total++;
                const val = formState.value[task.task_id];
                if (val !== undefined && val !== '' && val !== false) {
                    completed++;
                }
            }
        });
    });

    return total === 0 ? 0 : Math.round((completed / total) * 100);
});

// --- Lifecycle & Data Fetch ---
const loadData = async () => {
    if (viewMode.value === 'active') {
        await checklistsStore.fetchChecklist(selectedRole.value);
        if (checklistsStore.currentSubmission) {
            formState.value = { ...checklistsStore.currentSubmission.responses };
        } else {
            formState.value = {};
        }
    } else {
        await checklistsStore.fetchAllChecklists();
    }
};

onMounted(loadData);
watch([selectedRole, viewMode], loadData);

// --- Simple Rules Engine ---
const runRules = (taskId: string, value: any) => {
    if (taskId === 'opening_cash_amount') {
        const amount = Number(value);
        if (amount === 999) {
            alert("📢 AUTOMATION ALERT: High variance detected in opening cash. Verification required.");
        }
    }
};

const handleInputChange = (taskId: string, value: any) => {
    formState.value[taskId] = value;
    runRules(taskId, value);
    saveDraft();
};

let saveTimeout: any = null;
const saveDraft = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        await checklistsStore.saveChecklist({
            id: checklistsStore.currentSubmission?.id,
            templateId: activeTemplate.value.template_id,
            role: selectedRole.value,
            responses: formState.value,
            progress: progress.value,
            status: 'IN_PROGRESS',
            employeeId: authStore.user?.uid || 'unknown',
            employeeName: authStore.user?.email || 'System User'
        });
    }, 2000);
};

const handleFinalSubmit = async (signatureData: string) => {
    isSubmitting.value = true;
    try {
        await checklistsStore.submitChecklist({
            id: checklistsStore.currentSubmission?.id,
            templateId: activeTemplate.value.template_id,
            role: selectedRole.value,
            responses: formState.value,
            progress: 100,
            status: 'COMPLETED',
            submittedAt: null,
            signatureData,
            employeeId: authStore.user?.uid || 'unknown',
            employeeName: authStore.user?.email || 'System User'
        });
        showSignatureModal.value = false;
        alert("Checklist submitted successfully!");
        loadData();
    } catch (error) {
        console.error(error);
        alert("Failed to submit checklist.");
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
  <div class="space-y-8 pb-20">
    <!-- View Switcher & Role Selector -->
    <div class="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div class="flex flex-wrap gap-2">
            <button 
                v-for="tpl in ALL_TEMPLATES" 
                :key="tpl.role_id"
                @click="selectedRole = tpl.role_id; viewMode = 'active'"
                class="px-6 py-2.5 rounded-xl font-bold uppercase text-[9px] tracking-widest transition-all flex items-center gap-2 border"
                :class="selectedRole === tpl.role_id && viewMode === 'active'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                  : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-200'"
            >
                <component :is="tpl.icon" class="w-3.5 h-3.5" />
                {{ tpl.role_title }}
            </button>
            <div class="w-px h-8 bg-slate-100 mx-2 hidden md:block"></div>
            <button 
                @click="viewMode = 'history'"
                class="px-6 py-2.5 rounded-xl font-bold uppercase text-[9px] tracking-widest transition-all flex items-center gap-2 border"
                :class="viewMode === 'history'
                    ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/20' 
                    : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-200'"
            >
                <History class="w-3.5 h-3.5" />
                Audit Logs
            </button>
        </div>

        <div class="flex items-center gap-4">
            <div v-if="viewMode === 'active'" class="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
                <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span class="text-[8px] font-black uppercase tracking-widest text-emerald-600">Active Shift</span>
            </div>
            <div v-else class="flex items-center gap-2 px-4 py-1.5 bg-slate-900 rounded-full">
                <div class="w-1.5 h-1.5 rounded-full bg-primary-400"></div>
                <span class="text-[8px] font-black uppercase tracking-widest text-white">Historical View</span>
            </div>
        </div>
    </div>

    <!-- Active view -->
    <template v-if="viewMode === 'active'">
        <!-- Progress Dashboard -->
        <div v-if="activeTemplate" class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div class="flex items-center gap-5">
                    <div :class="['w-14 h-14 rounded-2xl flex items-center justify-center shadow-md', activeTemplate.theme.secondary, activeTemplate.theme.primary]">
                        <component :is="activeTemplate.icon" class="w-7 h-7" />
                    </div>
                    <div>
                        <h2 class="text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
                            {{ activeTemplate.role_title }}
                        </h2>
                        <div class="flex items-center gap-3 mt-2">
                            <span class="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                <Zap class="w-3 h-3 text-primary-500" />
                                {{ activeTemplate.frequency }}
                            </span>
                            <div class="w-1 h-1 rounded-full bg-slate-200"></div>
                            <span class="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                <Calendar class="w-3 h-3" />
                                {{ new Date().toLocaleDateString() }}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-6 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 ml-auto md:ml-0">
                    <div class="text-right">
                        <p class="text-2xl font-black text-slate-900 tracking-tighter leading-none">{{ progress }}%</p>
                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Completion</p>
                    </div>
                    <div class="w-px h-10 bg-slate-200"></div>
                    <div class="relative w-12 h-12 flex items-center justify-center">
                        <svg class="transform -rotate-90 w-12 h-12">
                            <circle cx="24" cy="24" r="20" stroke-width="4" fill="transparent" class="stroke-slate-200" />
                            <circle 
                                cx="24" cy="24" r="20" stroke-width="4" fill="transparent" 
                                stroke-linecap="round"
                                class="transition-all duration-1000 ease-out"
                                :class="activeTemplate.theme.primary.replace('text-', 'stroke-')"
                                :stroke-dasharray="2 * Math.PI * 20"
                                :stroke-dashoffset="2 * Math.PI * 20 * (1 - progress / 100)"
                            />
                        </svg>
                        <div class="absolute">
                            <Check v-if="progress === 100" class="w-5 h-5 text-emerald-500" />
                            <CheckCircle2 v-else class="w-5 h-5 text-slate-300" />
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Mobile Progress Bar -->
            <div class="mt-6 h-1 w-full bg-slate-100 rounded-full overflow-hidden block md:hidden">
                <div 
                    class="h-full bg-slate-900 transition-all duration-1000"
                    :style="{ width: `${progress}%` }"
                ></div>
            </div>
        </div>

        <!-- Sections -->
        <div v-if="activeTemplate" class="space-y-10">
            <div v-for="(section, idx) in activeTemplate.sections" :key="section.section_id" class="space-y-5">
                <div class="flex items-center gap-3 px-2">
                    <div class="flex items-center justify-center w-6 h-6 bg-slate-900 text-white rounded-lg text-[10px] font-black">
                        0{{ idx + 1 }}
                    </div>
                    <span class="text-sm font-black uppercase tracking-widest text-slate-400">{{ section.title }}</span>
                    <div class="flex-1 h-px bg-slate-100"></div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                        v-for="task in section.tasks" 
                        :key="task.task_id"
                        :class="['group p-5 rounded-2xl border transition-all duration-200 relative', 
                            formState[task.task_id] ? 'bg-white border-primary-500 shadow-lg shadow-primary-500/5' : 'bg-white border-slate-100 hover:border-slate-300',
                            task.type === 'comment' ? 'md:col-span-2' : ''
                        ]"
                    >
                        <div class="relative z-10 space-y-4">
                            <div class="flex justify-between items-start gap-4">
                                <span :class="['text-[11px] font-black uppercase tracking-widest leading-normal transition-colors block', formState[task.task_id] ? 'text-slate-900' : 'text-slate-500']">
                                    {{ task.label }}
                                </span>
                                <div v-if="task.required && !formState[task.task_id]" class="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1"></div>
                            </div>

                            <div v-if="task.type === 'boolean'" class="flex items-center justify-between">
                                <span :class="['text-[9px] font-black uppercase tracking-widest', formState[task.task_id] ? 'text-emerald-500' : 'text-slate-300']">
                                    {{ formState[task.task_id] ? 'Verified' : 'Manual Sign-off' }}
                                </span>
                                <button 
                                    @click="handleInputChange(task.task_id, !formState[task.task_id])"
                                    :class="['w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 border-2', 
                                        formState[task.task_id] ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white text-slate-200 border-slate-50 hover:border-slate-200 hover:text-slate-400']"
                                >
                                    <Check class="w-6 h-6" />
                                </button>
                            </div>

                            <div v-else-if="task.type === 'currency'" class="relative">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-slate-400 font-black text-sm">$</span>
                                </div>
                                <input 
                                    type="number" 
                                    v-model="formState[task.task_id]"
                                    @input="handleInputChange(task.task_id, ($event.target as HTMLInputElement).value)"
                                    class="w-full h-12 pl-10 pr-4 text-lg font-black tracking-tighter bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-slate-900 focus:outline-none transition-all placeholder:text-slate-200"
                                    placeholder="0.00"
                                />
                            </div>

                            <div v-else-if="task.type === 'comment'">
                                <textarea 
                                    v-model="formState[task.task_id]"
                                    @input="handleInputChange(task.task_id, ($event.target as HTMLInputElement).value)"
                                    rows="1"
                                    class="w-full p-4 text-[13px] font-medium bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-slate-900 focus:outline-none transition-all placeholder:text-slate-300"
                                    placeholder="Add notes..."
                                ></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Submit Strip -->
        <div v-if="progress === 100" class="pt-8 animate-in slide-in-from-bottom-5 duration-700">
            <div class="flex items-center justify-between p-6 bg-slate-900 rounded-3xl shadow-xl shadow-slate-900/10 border border-slate-800">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                        <CheckCircle2 class="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h3 class="text-sm font-black text-white uppercase italic tracking-tighter leading-none">All Vectors Verified</h3>
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Authorized personnel signature required</p>
                    </div>
                </div>
                <button 
                    @click="showSignatureModal = true"
                    class="px-8 py-4 bg-primary-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                    <Save class="w-4 h-4" />
                    Sign & Commit
                </button>
            </div>
        </div>
    </template>

    <!-- History View -->
    <template v-else>
        <ChecklistHistoryTable />
    </template>

    <!-- Signature Pad -->
    <SignaturePad 
      v-if="showSignatureModal" 
      :onSave="handleFinalSubmit" 
      :onCancel="() => showSignatureModal = false" 
    />
  </div>
</template>

<style scoped>
.glass-panel {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 3rem;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 9999px;
}
</style>
