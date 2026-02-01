<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useEmployeesStore } from '../../stores/employees';
import { useTasksStore, type EmployeeTask } from '../../stores/tasks';
import TaskDashboard from '../../components/tasks/TaskDashboard.vue';
import TaskPermissions from '../../components/tasks/TaskPermissions.vue';
import { useAuthStore } from '../../stores/auth';
import { usePermissionsStore } from '../../stores/permissions';
import { 
  Play, User, Calendar, Camera, QrCode,
  CheckCircle2, ChevronDown, Plus, X, Trash2, Clock, CheckSquare,
  Send, Briefcase, AlignLeft, UserPlus, Info, AlertTriangle, Trophy,
  BarChart3, LayoutDashboard, ShieldCheck
} from 'lucide-vue-next';



const authStore = useAuthStore();
const permissionsStore = usePermissionsStore();
const employeesStore = useEmployeesStore();
const tasksStore = useTasksStore();
const showModal = ref(false);
const showDetailModal = ref(false);
const selectedTask = ref<EmployeeTask | null>(null);
const showSuccess = ref(false);
const taskToDelete = ref<string | null>(null);
const isSubmitting = ref(false);
const checkedItems = ref<{ [key: number]: boolean }>({});
const error = ref<string | null>(null);
const viewMode = ref<'kanban' | 'dashboard' | 'permissions'>('kanban');
const isVerifying = ref(false);
const verificationStep = ref<'SELECT' | 'PHOTO' | 'QR'>('SELECT');
const capturedImage = ref<string | null>(null);
const scannedCode = ref<string | null>(null);



const TASK_TEMPLATES = [
    "CUSTOMER SERVICE EXCELLENCE",
    "CLEANLINESS & SANITATION",
    "BATHROOM CHECKLIST",
    "STORE STOCKING & MERCHANDISING",
    "MINNOW TANK MANAGEMENT",
    "CAR WASH DUTIES",
    "FORECOURT & FUEL PUMPS",
    "SAFETY, SECURITY & COMPLIANCE",
    "SHIFT-END PROCEDURES"
];

const TEMPLATE_CONTENT: { [key: string]: string } = {
    "CUSTOMER SERVICE EXCELLENCE": 
        `Welcome every customer: Greet with eye contact, a smile, and a verbal “hello” within 5 seconds
Offer assistance: Actively help locating items or using pumps/kiosks
Offer upsells: Suggest specials, car wash, or promotional items at checkout
Handle complaints: Resolve or escalate with calm and respect
Thank every customer: Ensure each customer leaves with a “thank you” or “have a great day”`,
    "CLEANLINESS & SANITATION":
        `Register Counter: Disinfect counter, POS, card reader, and lotto terminal
Coffee/Fountain Area: Wipe machines, clean drip trays, refill supplies
Floors: Sweep entire store, mop wet/dirty areas
Windows & Doors: Wipe glass (entrance and cooler doors), handles
Trash Cans: Empty all interior trash; replace liners`,
    "BATHROOM CHECKLIST":
        `Clean toilets and urinals: Scrub bowls, wipe seats and flush handles
Clean sinks and mirrors: Wipe faucets, counters, and mirrors with disinfectant
Mop bathroom floors: Mop with disinfectant, remove debris from corners
Restock: Topic paper, soap, and paper towels fully stocked
Trash: Empty trash cans, replace liners`,
    "STORE STOCKING & MERCHANDISING":
        `Coolers: Fully stock drinks, rotate dates, face labels outward
Snacks & Grocery: Face products, restock, check for expired goods
Coffee/Fountain: Refill cups, lids, creamers, sweeteners, napkins
Hot Food (if applicable): Temp check items, stock fresh food, restock condiments
Lottery & POS Supplies: Restock paper, pens, slips, register tape`,
    "MINNOW TANK MANAGEMENT":
        `Remove dead minnows: Use net to remove floating or bottom minnows
Check water level: Top off with conditioned water if low
Monitor oxygen/aeration: Ensure air pump is working properly
Clean filter: Rinse filter or replace if needed (as scheduled)
Clean tank area: Wipe tank glass, floor area around tank, dry any spills
Inventory: Refill bait buckets, lids, and check minnow count`,
    "CAR WASH DUTIES":
        `Inspect bay: Look for debris, soap residue, or hazards
Test equipment: Verify wash is operational, check lights/signs
Refill fluids: Soap, wax, rinse, tire shine (as scheduled)
Clean vacuums: Empty vacuum canisters, check hoses
Trash: Empty car wash trash bins and vacuum trash
Safety signage: Confirm signage is visible and well-lit`,
    "FORECOURT & FUEL PUMPS":
        `Squeegees & Towel Stations: Refill washer fluid, paper towels, replace broken tools
Trash Cans: Empty pump-side bins before full
Spill Check: Look for fuel or fluid spills and clean per safety procedure
Lighting: Ensure pump area is well lit (report outages)
Windshield Cleaner: Top off cleaner fluid (if station has tanks)`,
    "SAFETY, SECURITY & COMPLIANCE":
        `Monitor cameras: Scan for suspicious activity periodically
Fuel leak/spill protocol: Know spill kit location and proper cleanup steps
Fire extinguishers: Check access is clear; inspect gauge (monthly)
Backroom/doors: Keep doors locked when unattended`,
    "SHIFT-END PROCEDURES":
        `Final cleaning: Coffee, fountain, bathrooms, register, and sweep
Cooler shades/lights: Pull down cooler shades and turn off lights (if closing)
Ice cream/fountain: Turn off machines as per SOP
Count drawer: Balance register, report over/short to manager
Clock out: Use proper timekeeping method`
};

const taskForm = ref({
  title: '',
  description: '',
  assigneeId: '',
  priority: 'MEDIUM' as 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW',
  dueDate: new Date().toISOString().substring(0, 10),
  estimatedMinutes: 30,
  beginDate: '',
  completeDate: '',
  verificationType: 'NONE' as 'PHOTO' | 'QR' | 'NONE'
});


const userPermissions = computed(() => {
    return permissionsStore.permissions[authStore.userRole || 'Cashier']?.taskActions || {
        view: 'Own',
        execute: false,
        modify: false,
        verify: false,
        purge: false,
        override: false
    };
});

const canCreate = computed(() => userPermissions.value.execute);
const canModify = computed(() => userPermissions.value.modify);
const canVerify = computed(() => userPermissions.value.verify);
const canPurge = computed(() => userPermissions.value.purge);
const canOverride = computed(() => userPermissions.value.override);

const filteredTasks = computed(() => {
    const scope = userPermissions.value.view;
    const tasks = tasksStore.tasks;
    const userEmail = authStore.user?.email;
    const currentEmployee = employeesStore.employees.find(e => e.email === userEmail);
    const userId = currentEmployee?.id;

    if (scope === 'All') return tasks;
    if (scope === 'Own') return tasks.filter(t => t.assigneeId === userId);
    
    if (scope === 'Kitchen') return tasks.filter(t => t.title.toLowerCase().includes('kitchen') || t.description.toLowerCase().includes('kitchen'));
    if (scope === 'Inventory') return tasks.filter(t => t.title.toLowerCase().includes('inventory') || t.title.toLowerCase().includes('stocking'));
    if (scope === 'Maintenance') return tasks.filter(t => t.title.toLowerCase().includes('maintenance') || t.title.toLowerCase().includes('bathroom') || t.title.toLowerCase().includes('car wash'));
    
    // Fallback for Shift/Most - simplified to 'Own' for now until shift context is added
    return tasks.filter(t => t.assigneeId === userId);
});

onMounted(async () => {
  await Promise.all([
    employeesStore.fetchEmployees(),
    tasksStore.fetchTasks()
  ]);
});

const tasksPending = computed(() => filteredTasks.value.filter(t => t.status === 'PENDING' || !t.status));
const tasksInProgress = computed(() => filteredTasks.value.filter(t => t.status === 'IN_PROGRESS'));
const tasksCompleted = computed(() => filteredTasks.value.filter(t => t.status === 'COMPLETED'));

const handleTemplateChange = (e: Event) => {
    const template = (e.target as HTMLSelectElement).value;
    if (template) {
        taskForm.value.title = template;
        taskForm.value.description = TEMPLATE_CONTENT[template] || '';
    }
};

const handleAddTask = async () => {
  if (!taskForm.value.title.trim()) {
      error.value = "Task title (role) is required";
      return;
  }
  isSubmitting.value = true;
  error.value = null;
  try {
    const employee = employeesStore.employees.find(e => e.id === taskForm.value.assigneeId);
    await tasksStore.addTask({
      ...taskForm.value,
      assigneeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unassigned'
    });
    showModal.value = false;
    resetForm();
  } catch (err) {
    console.error(err);
    error.value = "Failed to create task. Please try again.";
  } finally {
    isSubmitting.value = false;
  }
};

const resetForm = () => {
    taskForm.value = {
        title: '',
        description: '',
        assigneeId: '',
        priority: 'MEDIUM',
        dueDate: new Date().toISOString().substring(0, 10),
        estimatedMinutes: 30,
        beginDate: '',
        completeDate: '',
        verificationType: 'NONE'
    };

    error.value = null;
};

const openTaskDetail = (task: EmployeeTask) => {
    selectedTask.value = task;
    checkedItems.value = {};
    showDetailModal.value = true;
};

const getPriorityValues = (priority: string) => {
    switch (priority) {
        case 'URGENT': return {
            bg: 'bg-gradient-to-br from-purple-50 via-fuchsia-50 to-purple-100',
            text: 'text-purple-900',
            border: 'border-purple-200',
            badge: 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 shadow-lg shadow-purple-500/40',
            glow: 'hover:shadow-2xl hover:shadow-purple-500/30',
            cardGlow: 'before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-purple-500/0 before:via-purple-500/5 before:to-purple-500/0 before:opacity-0 hover:before:opacity-100 before:transition-opacity'
        };
        case 'HIGH': return {
            bg: 'bg-gradient-to-br from-rose-50 via-pink-50 to-red-50',
            text: 'text-rose-900',
            border: 'border-rose-200',
            badge: 'bg-gradient-to-r from-rose-600 via-pink-600 to-red-600 shadow-lg shadow-rose-500/40',
            glow: 'hover:shadow-2xl hover:shadow-rose-500/30',
            cardGlow: 'before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-rose-500/0 before:via-rose-500/5 before:to-rose-500/0 before:opacity-0 hover:before:opacity-100 before:transition-opacity'
        };
        case 'MEDIUM': return {
            bg: 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50',
            text: 'text-amber-900',
            border: 'border-amber-200',
            badge: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 shadow-lg shadow-amber-500/40',
            glow: 'hover:shadow-2xl hover:shadow-amber-500/30',
            cardGlow: 'before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-amber-500/0 before:via-amber-500/5 before:to-amber-500/0 before:opacity-0 hover:before:opacity-100 before:transition-opacity'
        };
        case 'LOW': return {
            bg: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50',
            text: 'text-emerald-900',
            border: 'border-emerald-200',
            badge: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 shadow-lg shadow-emerald-500/40',
            glow: 'hover:shadow-2xl hover:shadow-emerald-500/30',
            cardGlow: 'before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-emerald-500/0 before:via-emerald-500/5 before:to-emerald-500/0 before:opacity-0 hover:before:opacity-100 before:transition-opacity'
        };
        default: return {
            bg: 'bg-gradient-to-br from-slate-50 to-slate-100',
            text: 'text-slate-700',
            border: 'border-slate-200',
            badge: 'bg-slate-500 shadow-lg shadow-slate-500/30',
            glow: 'hover:shadow-xl hover:shadow-slate-500/20',
            cardGlow: ''
        };
    }
};

const updateStatus = async (id: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => {
    const task = tasksStore.tasks.find(t => t.id === id);
    
    // If completing and requires verification
    if (status === 'COMPLETED' && task && task.verificationType !== 'NONE') {
        if (!capturedImage.value && !scannedCode.value) {
            verificationStep.value = task.verificationType as any;
            isVerifying.value = true;
            return;
        }
    }

    try {
        if (status === 'COMPLETED') {
            showSuccess.value = true;
            setTimeout(() => {
                showSuccess.value = false;
                showDetailModal.value = false;
                isVerifying.value = false;
                capturedImage.value = null;
                scannedCode.value = null;
            }, 2000);
        }
        
        await tasksStore.updateTaskStatus(id, status, {
            verificationUrl: capturedImage.value || undefined,
            qrCodeValue: scannedCode.value || undefined
        });
    } catch (e) {
        console.error(e);
        error.value = "Failed to update status.";
    }
};

const handleCapturePhoto = () => {
    // Simulate photo capture/upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (re) => {
                capturedImage.value = re.target?.result as string;
                if (selectedTask.value) {
                    updateStatus(selectedTask.value.id, 'COMPLETED');
                }
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
};

const handleScanQR = () => {
    // Simulate QR scanning
    scannedCode.value = "VERIFIED-LOC-" + Math.floor(Math.random() * 10000);
    setTimeout(() => {
        if (selectedTask.value) {
            updateStatus(selectedTask.value.id, 'COMPLETED');
        }
    }, 1000);
};


const confirmDelete = async () => {
    if (taskToDelete.value) {
        await tasksStore.deleteTask(taskToDelete.value);
        taskToDelete.value = null;
    }
};

const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
};
</script>

<template>
  <div class="animate-in fade-in duration-700">
    <!-- Sticky Navigation Bar -->
    <div class="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5 mb-8 -mx-8 -mt-8 sticky top-0 z-50 shadow-sm flex items-center justify-between">
        <div class="flex items-center gap-6">
            <div class="flex items-center gap-4 border-r border-slate-200 pr-6 mr-2">
                <div class="w-12 h-12 bg-gradient-to-br from-primary-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-xl shadow-primary-500/20">
                    <CheckSquare v-if="viewMode === 'kanban'" class="w-6 h-6" />
                    <BarChart3 v-else-if="viewMode === 'dashboard'" class="w-6 h-6" />
                    <ShieldCheck v-else class="w-6 h-6" />
                </div>
                <div>
                    <h1 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">
                        {{ viewMode === 'kanban' ? 'Live Tasks' : viewMode === 'dashboard' ? 'Operational IQ' : 'Access Logic' }}
                    </h1>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {{ viewMode === 'kanban' ? 'Real-time shift management' : viewMode === 'dashboard' ? 'Vector performance analytics' : 'RBAC Permission Matrix' }}
                    </p>
                </div>
            </div>

            <!-- View Switcher -->
            <div class="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                <button 
                    @click="viewMode = 'kanban'"
                    :class="['px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2', viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600']"
                >
                    <LayoutDashboard class="w-3.5 h-3.5" />
                    Board
                </button>
                <button 
                    @click="viewMode = 'dashboard'"
                    :class="['px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2', viewMode === 'dashboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600']"
                >
                    <BarChart3 class="w-3.5 h-3.5" />
                    Insights
                </button>
                <button 
                    v-if="authStore.userRole === 'Admin'"
                    @click="viewMode = 'permissions'"
                    :class="['px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2', viewMode === 'permissions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600']"
                >
                    <ShieldCheck class="w-3.5 h-3.5" />
                    Security
                </button>
            </div>
        </div>

        <button 
            v-if="canCreate"
            @click="showModal = true" 
            class="px-8 py-3.5 bg-gradient-to-r from-primary-600 via-indigo-600 to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary-500/30 hover:shadow-primary-500/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group"
        >
            <div class="bg-white/20 p-1.5 rounded-lg group-hover:rotate-90 transition-transform">
                <Plus class="w-4 h-4" />
            </div>
            New Task
        </button>
    </div>

    <!-- Main Content -->
    <template v-if="viewMode === 'kanban'">
        <div v-if="tasksStore.loading && tasksStore.tasks.length === 0" class="py-32 flex flex-col items-center justify-center">
            <div class="relative">
                <div class="w-20 h-20 border-4 border-slate-100 border-t-primary-600 rounded-full animate-spin"></div>
                <div class="absolute inset-0 w-20 h-20 border-4 border-transparent border-b-indigo-500 rounded-full animate-spin" style="animation-direction: reverse; animation-duration: 1.5s"></div>
            </div>
            <p class="mt-8 text-slate-400 font-black uppercase tracking-[0.3em] animate-pulse">Synchronizing board...</p>
        </div>

        <!-- Empty State Hub -->
        <div v-else-if="tasksStore.tasks.length === 0" class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto pt-12 pb-16">
            <div class="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-50 p-10 hover:shadow-2xl transition-all group overflow-hidden relative">
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                <div class="relative z-10 space-y-6">
                    <div class="flex items-center gap-4">
                        <div class="relative">
                            <div class="w-4 h-4 bg-amber-500 rounded-full"></div>
                            <div class="absolute inset-0 w-4 h-4 bg-amber-500 rounded-full animate-ping"></div>
                        </div>
                        <h4 class="font-black text-slate-800 text-xl uppercase italic tracking-tighter">Initiating Task</h4>
                    </div>
                    <p class="text-slate-400 font-medium text-sm leading-relaxed">Tasks being created and assigned via templates.</p>
                    <div class="text-7xl font-black text-slate-100 tracking-tighter">00</div>
                </div>
            </div>

            <div class="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-50 p-10 hover:shadow-2xl transition-all group overflow-hidden relative">
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-primary-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                <div class="relative z-10 space-y-6">
                    <div class="flex items-center gap-4">
                        <div class="relative">
                            <div class="w-4 h-4 bg-primary-500 rounded-full"></div>
                            <div class="absolute inset-0 w-4 h-4 bg-primary-500 rounded-full animate-ping"></div>
                        </div>
                        <h4 class="font-black text-slate-800 text-xl uppercase italic tracking-tighter">Pending Task</h4>
                    </div>
                    <p class="text-slate-400 font-medium text-sm leading-relaxed">Active assignments waiting for staff enrollment.</p>
                    <div class="text-7xl font-black text-slate-100 tracking-tighter">00</div>
                </div>
            </div>

            <div class="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-50 p-10 hover:shadow-2xl transition-all group overflow-hidden relative">
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                <div class="relative z-10 space-y-6">
                    <div class="flex items-center gap-4">
                        <div class="relative">
                            <div class="w-4 h-4 bg-emerald-500 rounded-full"></div>
                            <div class="absolute inset-0 w-4 h-4 bg-emerald-500 rounded-full animate-ping"></div>
                        </div>
                        <h4 class="font-black text-slate-800 text-xl uppercase italic tracking-tighter">Completed Task</h4>
                    </div>
                    <p class="text-slate-400 font-medium text-sm leading-relaxed">Historical shift logs and verified compliance logs.</p>
                    <div class="text-7xl font-black text-slate-100 tracking-tighter">00</div>
                </div>
            </div>
        </div>

        <!-- Kanban Board -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <!-- Pending Column -->
            <div class="bg-slate-50/50 rounded-[2.5rem] p-8 border-2 border-slate-200 min-h-[600px] flex flex-col gap-6 shadow-xl shadow-slate-200/20">
                <div class="flex items-center justify-between px-2 pt-2">
                    <h3 class="font-black text-slate-900 flex items-center gap-3 text-xl italic uppercase tracking-tighter">
                        <div class="w-4 h-4 rounded-full bg-slate-400 ring-4 ring-slate-200 shadow-lg"></div>
                        Pending
                    </h3>
                    <span class="bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-2xl text-sm font-black shadow-md">{{ tasksPending.length }}</span>
                </div>
                <div class="space-y-5 flex-1">
                    <div 
                        v-for="task in tasksPending" 
                        :key="task.id"
                        @click="openTaskDetail(task)"
                        :class="['group relative p-6 rounded-[2rem] border-2 transition-all duration-500 cursor-pointer overflow-hidden', getPriorityValues(task.priority).bg, getPriorityValues(task.priority).border, getPriorityValues(task.priority).cardGlow]"
                    >
                        <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent group-hover:via-primary-500 group-hover:h-1.5 transition-all duration-700 opacity-40"></div>
                        
                        <div class="relative z-10">
                            <div class="flex justify-between items-start mb-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-sm border-2 border-white flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all">
                                        <span class="font-black text-primary-600 text-sm">{{ task.assigneeName[0] }}</span>
                                    </div>
                                    <div class="flex flex-col">
                                        <span class="text-[8px] font-black text-slate-400 tracking-[0.2em] uppercase mb-0.5">Assignee</span>
                                        <span class="text-sm font-black text-slate-800">{{ task.assigneeName.split(' ')[0] }}</span>
                                    </div>
                                </div>
                                <button @click.stop="taskToDelete = task.id" v-if="canPurge" class="p-2 bg-white/60 hover:bg-red-500 hover:text-white text-red-500 rounded-xl transition-all shadow-sm">
                                    <Trash2 class="w-4 h-4" />
                                </button>
                            </div>
                            <h4 class="font-black text-slate-900 text-lg mb-2 leading-tight group-hover:text-primary-700 transition-colors">{{ task.title }}</h4>
                            <p class="text-slate-500 text-[10px] font-medium line-clamp-2 mb-6 leading-relaxed">{{ task.description }}</p>
                            <div class="flex items-center justify-end pt-4 border-t-2 border-white/50">
                                <div class="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 bg-white/40 px-3 py-2 rounded-xl border border-white/60">
                                    <Clock class="w-3 h-3 text-primary-500" />
                                    {{ task.estimatedMinutes }}m
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-if="tasksPending.length === 0" class="py-24 border-2 border-dashed border-slate-300 rounded-[2rem] flex flex-col items-center justify-center bg-white/40">
                        <p class="text-slate-400 font-black uppercase tracking-widest text-[10px]">No pending tasks</p>
                    </div>
                </div>
            </div>

            <!-- In Progress Column -->
            <div class="bg-primary-50/30 rounded-[2.5rem] p-8 border-2 border-primary-200 min-h-[600px] flex flex-col gap-6 shadow-xl shadow-primary-500/5">
                <div class="flex items-center justify-between px-2 pt-2">
                    <h3 class="font-black text-primary-900 flex items-center gap-3 text-xl italic uppercase tracking-tighter">
                        <div class="w-4 h-4 rounded-full bg-primary-500 ring-4 ring-primary-100 animate-pulse shadow-lg"></div>
                        Active
                    </h3>
                    <span class="bg-white border-2 border-primary-300 text-primary-700 px-4 py-2 rounded-2xl text-sm font-black shadow-md">{{ tasksInProgress.length }}</span>
                </div>
                <div class="space-y-5 flex-1">
                    <div 
                        v-for="task in tasksInProgress" 
                        :key="task.id"
                        @click="openTaskDetail(task)"
                        :class="['group relative p-6 rounded-[2rem] border-2 transition-all duration-500 cursor-pointer overflow-hidden', getPriorityValues(task.priority).bg, getPriorityValues(task.priority).border, getPriorityValues(task.priority).cardGlow]"
                    >
                        <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary-300 to-transparent group-hover:via-primary-500 group-hover:h-1.5 transition-all duration-700"></div>

                        <div class="relative z-10">
                            <div class="flex justify-between items-start mb-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-white border-2 border-primary-100 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all">
                                        <span class="font-black text-primary-700 text-sm">{{ task.assigneeName[0] }}</span>
                                    </div>
                                    <div class="flex flex-col">
                                        <span class="text-[8px] font-black text-primary-400 tracking-[0.2em] uppercase mb-0.5">Enrolled</span>
                                        <span class="text-sm font-black text-slate-800">{{ task.assigneeName.split(' ')[0] }}</span>
                                    </div>
                                </div>
                            </div>
                            <h4 class="font-black text-slate-900 text-lg mb-2 leading-tight">{{ task.title }}</h4>
                            <p class="text-slate-500 text-[10px] font-medium line-clamp-2 mb-6 leading-relaxed">{{ task.description }}</p>
                            <div class="flex items-center justify-end pt-4 border-t-2 border-white/50">
                                <div class="flex items-center gap-2 text-[10px] font-black uppercase text-primary-600 bg-white/40 px-3 py-2 rounded-xl border border-primary-100">
                                    <Clock class="w-3 h-3 animate-pulse" />
                                    Running...
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-if="tasksInProgress.length === 0" class="py-24 border-2 border-dashed border-primary-100 rounded-[2rem] flex flex-col items-center justify-center bg-white/40">
                        <p class="text-primary-300 font-black uppercase tracking-widest text-[10px]">No active tasks</p>
                    </div>
                </div>
            </div>

            <!-- Completed Column -->
            <div class="bg-emerald-50/30 rounded-[2.5rem] p-8 border-2 border-emerald-200 min-h-[600px] flex flex-col gap-6 shadow-xl shadow-emerald-500/5">
                <div class="flex items-center justify-between px-2 pt-2">
                    <h3 class="font-black text-emerald-900 flex items-center gap-3 text-xl italic uppercase tracking-tighter">
                        <div class="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shadow-lg"></div>
                        Completed
                    </h3>
                    <span class="bg-white border-2 border-emerald-300 text-emerald-700 px-4 py-2 rounded-2xl text-sm font-black shadow-md">{{ tasksCompleted.length }}</span>
                </div>
                <div class="space-y-5 flex-1">
                    <div 
                        v-for="task in tasksCompleted" 
                        :key="task.id"
                        @click="openTaskDetail(task)"
                        class="group relative bg-white border-2 border-emerald-100 p-6 rounded-[2.5rem] hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden"
                    >
                        <div class="flex flex-col gap-5">
                            <div class="flex justify-between items-start border-b border-slate-50 pb-3">
                                <div>
                                    <h5 class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Employee Name</h5>
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-[10px] font-black text-emerald-700 shadow-sm border border-emerald-200">
                                            {{ task.assigneeName[0] }}
                                        </div>
                                        <span class="text-sm font-black text-slate-800 tracking-tight">{{ task.assigneeName }}</span>
                                    </div>
                                </div>
                                <div class="bg-emerald-500 text-white w-7 h-7 flex items-center justify-center rounded-2xl shadow-lg shadow-emerald-200">
                                    <CheckCircle2 class="w-4 h-4" />
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <h5 class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Target Dept</h5>
                                    <div class="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl inline-block">
                                        <span class="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Operations</span>
                                    </div>
                                </div>
                                <div>
                                    <h5 class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assignment</h5>
                                    <h4 class="font-black text-slate-800 text-xs truncate leading-tight">{{ task.title }}</h4>
                                </div>
                            </div>
                            <div class="flex items-center justify-between bg-slate-50/80 p-3 rounded-2xl border border-slate-100 mt-1">
                                <div class="flex items-center gap-2">
                                    <Clock class="w-3 h-3 text-emerald-500" />
                                    <span class="text-[10px] font-black text-slate-600 tracking-tighter">{{ formatTime(task.createdAt) }}</span>
                                </div>
                                <div class="w-px h-3 bg-slate-200"></div>
                                <div class="flex items-center gap-2">
                                    <Calendar class="w-3 h-3 text-emerald-500" />
                                    <span class="text-[10px] font-black text-slate-600 tracking-tighter">{{ formatDate(task.createdAt) }}</span>
                                </div>
                            </div>
                        </div>
                        <button @click.stop="taskToDelete = task.id" v-if="canPurge" class="absolute top-4 right-4 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 class="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </template>

    <template v-else-if="viewMode === 'dashboard'">
        <TaskDashboard />
    </template>

    <template v-else>
        <TaskPermissions />
    </template>

    <!-- Create Task Modal -->
    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-6 animate-in fade-in">
        <div class="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden animate-in zoom-in duration-300 border border-white/20">
            <!-- Modal Header -->
            <div class="px-12 py-10 bg-white border-b-2 border-slate-100">
                <div class="flex justify-between items-start">
                    <div class="space-y-2">
                        <h3 class="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">New Assignment</h3>
                        <p class="text-slate-500 font-medium text-lg">Create and distribute operational vectors to your team</p>
                    </div>
                    <button @click="showModal = false" class="w-14 h-14 flex items-center justify-center rounded-3xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all">
                        <X class="w-7 h-7" />
                    </button>
                </div>
            </div>

            <form @submit.prevent="handleAddTask" class="flex-1 overflow-y-auto custom-scrollbar p-12 space-y-10 bg-gradient-to-br from-slate-50 to-slate-100/50">
                <div v-if="error" class="p-6 bg-rose-50 border-2 border-rose-200 text-rose-700 font-black uppercase text-xs rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-4">
                    <div class="w-10 h-10 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600">
                        <AlertTriangle class="w-6 h-6" />
                    </div>
                    {{ error }}
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <!-- Left Column -->
                    <div class="space-y-8">
                        <div class="bg-white/80 backdrop-blur-sm p-10 rounded-[2.5rem] shadow-xl border-2 border-white hover:shadow-2xl transition-all space-y-8">
                            <div class="flex items-center gap-5">
                                <div class="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-primary-600 to-indigo-700 text-white flex items-center justify-center shadow-2xl shadow-primary-500/30">
                                    <Briefcase class="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Assignment</h4>
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Dept / Mission</p>
                                </div>
                            </div>
                            <div class="space-y-4">
                                <div class="relative group">
                                    <select @change="handleTemplateChange" class="w-full h-16 px-6 rounded-2xl border-2 border-slate-100 bg-white focus:border-primary-500 outline-none transition-all appearance-none font-black uppercase text-sm tracking-tighter text-slate-800 cursor-pointer shadow-inner">
                                        <option value="">Choose a template...</option>
                                        <option v-for="t in TASK_TEMPLATES" :key="t" :value="t">{{ t }}</option>
                                    </select>
                                    <ChevronDown class="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-primary-500 transition-colors" />
                                </div>
                                <input v-model="taskForm.title" type="text" placeholder="Or enter manual directive..." class="w-full h-16 px-6 rounded-2xl border-2 border-slate-100 bg-white focus:border-primary-500 outline-none transition-all font-black uppercase text-sm tracking-tighter text-slate-800 shadow-inner" />
                            </div>
                        </div>

                        <div class="bg-white/80 backdrop-blur-sm p-10 rounded-[2.5rem] shadow-xl border-2 border-white hover:shadow-2xl transition-all space-y-8">
                            <div class="flex items-center gap-5">
                                <div class="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-indigo-500 to-primary-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                                    <AlignLeft class="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Directives</h4>
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Specifications & Protocols</p>
                                </div>
                            </div>
                            <textarea v-model="taskForm.description" rows="8" class="w-full p-8 rounded-[2rem] border-2 border-slate-100 bg-white focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 leading-relaxed resize-none shadow-inner" placeholder="Break down the mission steps..."></textarea>
                        </div>
                    </div>

                    <!-- Right Column -->
                    <div class="space-y-8">
                        <div class="bg-white/80 backdrop-blur-sm p-10 rounded-[2.5rem] shadow-xl border-2 border-white hover:shadow-2xl transition-all space-y-8">
                            <div class="flex items-center gap-5">
                                <div class="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-2xl shadow-rose-500/30">
                                    <AlertTriangle class="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Urgency</h4>
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Priority Matrix</p>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <button 
                                    v-for="p in (['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const)" 
                                    :key="p"
                                    type="button"
                                    @click="taskForm.priority = p"
                                    :class="['py-6 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] border-2 transition-all', taskForm.priority === p ? getPriorityValues(p).badge + ' border-transparent scale-105 shadow-2xl' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white']"
                                >
                                    {{ p }}
                                </button>
                            </div>
                        </div>

                        <div class="bg-white/80 backdrop-blur-sm p-10 rounded-[2.5rem] shadow-xl border-2 border-white hover:shadow-2xl transition-all space-y-8">
                            <div class="flex items-center gap-5">
                                <div class="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                                    <UserPlus class="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Delegation</h4>
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enagement & Timeline</p>
                                </div>
                            </div>
                            <div class="space-y-6">
                                <div class="relative group">
                                    <select v-model="taskForm.assigneeId" class="w-full h-16 px-6 rounded-2xl border-2 border-slate-100 bg-white focus:border-emerald-500 outline-none transition-all appearance-none font-black text-slate-800 cursor-pointer shadow-inner">
                                        <option value="">Unassigned</option>
                                        <option v-for="emp in employeesStore.employees" :key="emp.id" :value="emp.id">
                                            {{ emp.firstName }} {{ emp.lastName }} ({{ emp.position }})
                                        </option>
                                    </select>
                                    <ChevronDown class="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                </div>
                                <div class="grid grid-cols-2 gap-6">
                                    <div class="space-y-2">
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                            <Calendar class="w-3 h-3" />
                                            Due Date
                                        </label>
                                        <input v-model="taskForm.dueDate" type="date" class="w-full h-14 px-5 rounded-2xl border-2 border-slate-100 bg-white focus:border-emerald-500 font-black text-xs shadow-inner" />
                                    </div>
                                    <div class="space-y-2">
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                            <Clock class="w-3 h-3" />
                                            Mins budget
                                        </label>
                                        <input v-model="taskForm.estimatedMinutes" type="number" class="w-full h-14 px-5 rounded-2xl border-2 border-slate-100 bg-white focus:border-emerald-500 font-black text-xs shadow-inner" />
                                    </div>
                                </div>
                                
                                <div class="pt-4 space-y-4">
                                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                        <ShieldCheck class="w-3 h-3 text-primary-500" />
                                        Verification Protocol
                                    </label>
                                    <div class="grid grid-cols-3 gap-3">
                                        <button 
                                            type="button"
                                            @click="taskForm.verificationType = 'NONE'"
                                            :class="['p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all', taskForm.verificationType === 'NONE' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-white border-slate-50 text-slate-300 opacity-50']"
                                        >
                                            <CheckCircle2 class="w-5 h-5" />
                                            <span class="text-[8px] font-black uppercase">None</span>
                                        </button>
                                        <button 
                                            type="button"
                                            @click="taskForm.verificationType = 'PHOTO'"
                                            :class="['p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all', taskForm.verificationType === 'PHOTO' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-50 text-slate-300 opacity-50']"
                                        >
                                            <Camera class="w-5 h-5" />
                                            <span class="text-[8px] font-black uppercase">Photo</span>
                                        </button>
                                        <button 
                                            type="button"
                                            @click="taskForm.verificationType = 'QR'"
                                            :class="['p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all', taskForm.verificationType === 'QR' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-white border-slate-50 text-slate-300 opacity-50']"
                                        >
                                            <QrCode class="w-5 h-5" />
                                            <span class="text-[8px] font-black uppercase">QR Scan</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>


            <div class="px-12 py-8 bg-slate-50 border-t-2 border-slate-100 flex justify-between items-center">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Info class="w-4 h-4 text-primary-500" />
                    Board encryption verified
                </p>
                <div class="flex gap-4">
                    <button @click="showModal = false" class="px-10 py-5 rounded-[1.5rem] border-2 border-slate-200 text-slate-500 font-black uppercase text-xs hover:bg-white hover:text-slate-900 transition-all shadow-sm">Discard</button>
                    <button 
                        @click="handleAddTask" 
                        :disabled="isSubmitting"
                        class="px-16 py-5 rounded-[1.5rem] bg-gradient-to-r from-primary-600 via-indigo-600 to-indigo-700 text-white font-black uppercase text-xs shadow-2xl shadow-primary-500/40 hover:shadow-primary-500/60 hover:scale-105 active:scale-95 transition-all flex items-center gap-4 group"
                    >
                        <template v-if="isSubmitting">
                            <div class="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                            Creating Assignment...
                        </template>
                        <template v-else>
                            <Send class="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                            Deploy Task
                        </template>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Task Detail Modal -->
    <div v-if="showDetailModal && selectedTask" class="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in">
        <div class="bg-white rounded-[4rem] shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in duration-500 relative">
            <div :class="['px-16 py-16 border-b border-white flex justify-between items-start', getPriorityValues(selectedTask.priority).bg]">
                <div class="space-y-6">
                    <div class="flex items-center gap-6">
                        <span :class="['px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-2xl shadow-primary-500/30', getPriorityValues(selectedTask.priority).badge]">
                            {{ selectedTask.priority }}
                        </span>
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] bg-white/60 px-4 py-2 rounded-xl">MISSION LOG #{{ selectedTask.id.slice(0, 8) }}</span>
                    </div>
                    <h3 class="text-5xl font-black text-slate-900 italic tracking-tighter uppercase">{{ selectedTask.title }}</h3>
                </div>
                <button @click="showDetailModal = false" class="w-16 h-16 bg-white/40 hover:bg-white rounded-[2rem] flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all shadow-xl shadow-white/10 backdrop-blur-md">
                    <X class="w-8 h-8" />
                </button>
            </div>

            <div class="p-16 space-y-16 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div class="space-y-10">
                    <h4 class="text-xs font-black text-slate-400 uppercase tracking-[0.5em] flex items-center gap-6">
                        <div class="flex-1 h-px bg-slate-100"></div>
                        Mission Requirements
                        <div class="flex-1 h-px bg-slate-100"></div>
                    </h4>

                    <div class="grid grid-cols-1 gap-5">
                        <div 
                          v-for="(line, idx) in selectedTask.description.split('\n').filter(l => l.trim())" 
                          :key="idx"
                          @click="checkedItems[idx] = !checkedItems[idx]"
                          :class="['p-10 rounded-[3rem] border-2 transition-all duration-500 cursor-pointer flex items-center gap-8 group relative overflow-hidden', checkedItems[idx] ? 'bg-slate-50 border-slate-100 opacity-60 scale-[0.98]' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:border-primary-200']"
                        >
                            <div :class="['w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all duration-700 relative z-10', checkedItems[idx] ? 'bg-emerald-500 text-white rotate-0 shadow-2xl shadow-emerald-500/40' : 'bg-slate-50 text-slate-200 group-hover:bg-primary-50 group-hover:text-primary-600 -rotate-12 group-hover:rotate-0']">
                                <CheckCircle2 class="w-7 h-7" />
                            </div>
                            <span :class="['font-black text-xl italic transition-all relative z-10 tracking-tight', checkedItems[idx] ? 'line-through text-slate-300' : 'text-slate-800']">{{ line }}</span>
                            <div class="absolute inset-0 bg-gradient-to-r from-primary-50/0 to-primary-50/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="bg-slate-50 p-10 rounded-[3rem] flex items-center gap-8 border-2 border-white shadow-inner">
                        <div class="w-20 h-20 rounded-[1.5rem] bg-white flex items-center justify-center shadow-xl shadow-slate-200/50">
                            <User class="w-10 h-10 text-primary-500" />
                        </div>
                        <div>
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-2">Primary Assignee</span>
                            <span class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{{ selectedTask.assigneeName }}</span>
                        </div>
                    </div>
                    <div class="bg-indigo-50 p-10 rounded-[3rem] flex items-center gap-8 border-2 border-indigo-100 shadow-inner group relative">
                        <div class="w-20 h-20 rounded-[1.5rem] bg-indigo-500 flex items-center justify-center shadow-xl shadow-indigo-200/50">
                            <ShieldCheck class="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <span class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] block mb-2">Verification Authority</span>
                            <span class="text-2xl font-black text-indigo-900 uppercase italic tracking-tighter">
                                {{ canVerify ? 'Level: High (Auto-Clear)' : 'Level: Shift (Standard)' }}
                            </span>
                        </div>
                        <div v-if="canModify" class="absolute top-4 right-4 flex gap-2">
                             <button class="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                 <Edit class="w-3 h-3" />
                             </button>
                        </div>
                    </div>
                </div>

                <!-- Proof of Performance -->
                <div v-if="selectedTask.status === 'COMPLETED' && selectedTask.verificationType !== 'NONE'" class="space-y-10">
                    <h4 class="text-xs font-black text-slate-400 uppercase tracking-[0.5em] flex items-center gap-6">
                        <div class="flex-1 h-px bg-slate-100"></div>
                        Proof of Performance
                        <div class="flex-1 h-px bg-slate-100"></div>
                    </h4>
                    
                    <div class="flex justify-center">
                        <div v-if="selectedTask.verificationType === 'PHOTO' && selectedTask.verificationUrl" class="relative group">
                            <img :src="selectedTask.verificationUrl" class="max-w-md w-full rounded-[3rem] shadow-2xl border-8 border-white group-hover:scale-105 transition-transform duration-500" />
                            <div class="absolute inset-0 rounded-[3rem] bg-gradient-to-t from-black/20 to-transparent"></div>
                            <div class="absolute bottom-6 left-6 flex items-center gap-3 bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl border border-white">
                                <Camera class="w-4 h-4 text-primary-600" />
                                <span class="text-[10px] font-black uppercase text-slate-900">Verified Photo Proof</span>
                            </div>
                        </div>
                        
                        <div v-if="selectedTask.verificationType === 'QR' && selectedTask.qrCodeValue" class="bg-amber-50 border-2 border-amber-100 p-10 rounded-[3rem] text-center space-y-4">
                            <div class="w-20 h-20 bg-white rounded-[1.5rem] flex items-center justify-center mx-auto shadow-xl shadow-amber-200/50">
                                <QrCode class="w-10 h-10 text-amber-500" />
                            </div>
                            <div>
                                <h5 class="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em] mb-1">Station Verification</h5>
                                <p class="text-xl font-black text-slate-900 tracking-widest">{{ selectedTask.qrCodeValue }}</p>
                            </div>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time Spacial Verification Logged</p>
                        </div>
                    </div>
                </div>
            </div>


            <div class="px-16 pb-16 pt-8 border-t-2 border-slate-50 flex flex-col items-center gap-10 bg-white">
                <div class="flex gap-6 w-full justify-center">
                    <button 
                        v-if="selectedTask.status !== 'COMPLETED'"
                        @click="updateStatus(selectedTask.id, selectedTask.status === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED')"
                        :disabled="!canCreate"
                        class="px-20 py-8 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700 text-white rounded-[3rem] font-black uppercase italic tracking-tighter text-2xl shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60 hover:scale-105 active:scale-95 transition-all flex items-center gap-6 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <template v-if="selectedTask.status === 'PENDING'">
                            <Play class="w-10 h-10 group-hover:scale-110 transition-transform" />
                            Initiate Mission
                        </template>
                        <template v-else>
                            <Trophy class="w-10 h-10 group-hover:scale-110 transition-transform" />
                            Finalize & Log
                        </template>
                    </button>
                    <button @click="showDetailModal = false" class="px-12 py-8 bg-white border-4 border-slate-50 rounded-[3rem] font-black uppercase text-xs text-slate-300 hover:text-slate-900 hover:border-slate-100 transition-all">Dismiss Board</button>
                </div>
                <div class="flex items-center gap-4">
                    <div class="w-40 h-px bg-slate-100"></div>
                    <span class="text-[10px] font-black text-slate-200 uppercase tracking-[0.8em]">Operations Center</span>
                    <div class="w-40 h-px bg-slate-100"></div>
                </div>
            </div>

            <div v-if="showSuccess" class="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-white/95 backdrop-blur-3xl animate-in fade-in duration-500">
                <div class="w-48 h-48 bg-emerald-100 text-emerald-600 rounded-[3rem] flex items-center justify-center shadow-2xl shadow-emerald-200 animate-bounce mb-12 border-4 border-white">
                    <Trophy class="w-24 h-24" />
                </div>
                <h3 class="text-7xl font-black text-slate-900 italic uppercase tracking-tighter mb-4">Mission Success</h3>
                <p class="text-slate-500 font-bold text-3xl uppercase tracking-widest bg-slate-50 px-8 py-3 rounded-2xl">Shift vector synchronized</p>
            </div>

            <!-- Verification Capture Overlay -->
            <div v-if="isVerifying" class="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-3xl animate-in fade-in duration-300 p-12 text-center">
                <div class="max-w-md w-full space-y-12">
                    <div class="w-32 h-32 bg-primary-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-primary-500/40 animate-pulse">
                        <Camera v-if="verificationStep === 'PHOTO'" class="w-16 h-16 text-white" />
                        <QrCode v-else class="w-16 h-16 text-white" />
                    </div>
                    <div class="space-y-4">
                        <h3 class="text-5xl font-black text-white italic uppercase tracking-tighter">Verification Required</h3>
                        <p class="text-slate-400 font-bold text-lg uppercase tracking-widest">
                            {{ verificationStep === 'PHOTO' ? 'Snapshot of area/work required' : 'Scan station QR code to verify location' }}
                        </p>
                    </div>
                    
                    <div class="flex flex-col gap-4">
                        <button 
                            @click="verificationStep === 'PHOTO' ? handleCapturePhoto() : handleScanQR()"
                            class="w-full py-8 bg-white text-slate-900 rounded-[2rem] font-black uppercase italic tracking-tighter text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all"
                        >
                            {{ verificationStep === 'PHOTO' ? 'Open Camera' : 'Initiate Scan' }}
                        </button>
                        <button v-if="canOverride" @click="updateStatus(selectedTask.id, 'COMPLETED')" class="text-emerald-400 font-black uppercase tracking-widest text-xs hover:text-white transition-colors">Bypass Verification</button>
                        <button @click="isVerifying = false" class="text-slate-500 font-black uppercase tracking-widest text-xs hover:text-white transition-colors">Abort Verification</button>
                    </div>
                </div>
            </div>
        </div>
    </div>


    <!-- Delete Confirmation Modal -->
    <div v-if="taskToDelete" class="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-6 animate-in fade-in">
        <div class="bg-white rounded-[4rem] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in border-4 border-white">
            <div class="p-16 text-center space-y-8">
                <div class="w-28 h-28 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 animate-pulse shadow-inner border border-rose-100">
                    <Trash2 class="w-12 h-12" />
                </div>
                <div class="space-y-2">
                    <h3 class="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Discard Vector?</h3>
                    <p class="text-slate-400 font-medium text-lg leading-relaxed px-8">This will permanently remove the assignment from the live board.</p>
                </div>
            </div>
            <div class="flex border-t-2 border-slate-50 bg-slate-50">
                <button @click="taskToDelete = null" class="flex-1 py-12 font-black uppercase text-xs tracking-[0.4em] text-slate-300 hover:text-slate-900 hover:bg-white transition-all">Abort</button>
                <button @click="confirmDelete" class="flex-1 py-12 font-black uppercase text-xs tracking-[0.4em] text-rose-500 hover:bg-rose-500 hover:text-white transition-all border-l-2 border-slate-100 shadow-2xl">Confirm</button>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
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
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #e2e8f0;
  background-clip: content-box;
}
</style>
