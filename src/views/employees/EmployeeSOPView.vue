<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSOPStore, type SOP } from '../../stores/sop';
import { useAuthStore } from '../../stores/auth';
import { 
  FileText, ChevronRight, Plus, 
  Search, Filter, Edit, Trash2,
  BookOpen, Target, Sparkles, X
} from 'lucide-vue-next';

const sopStore = useSOPStore();
const authStore = useAuthStore();
const selectedRole = ref('All');
const selectedCategory = ref('All');
const searchQuery = ref('');

onMounted(() => {
  sopStore.fetchSOPs();
});

const canManage = computed(() => {
  return authStore.userRole === 'Admin' || authStore.userRole === 'Manager';
});

const roles = ['Admin', 'Manager', 'Assistant Manager', 'Cashier', 'Stocker', 'Shift Manager'];
const categories = ['Opening', 'Closing', 'Daily Operations', 'Safety', 'Customer Service', 'Inventory'];

const filteredSOPs = computed(() => {
  return sopStore.sops.filter(sop => {
    const matchesRole = selectedRole.value === 'All' || sop.role === selectedRole.value;
    const matchesCategory = selectedCategory.value === 'All' || sop.category === selectedCategory.value;
    const matchesSearch = sop.title.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                         sop.description.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchesRole && matchesCategory && matchesSearch;
  });
});

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Opening': return 'from-amber-500 to-orange-600 shadow-amber-200';
    case 'Closing': return 'from-indigo-500 to-blue-700 shadow-indigo-200';
    case 'Safety': return 'from-rose-500 to-red-700 shadow-rose-200';
    case 'Customer Service': return 'from-sky-500 to-blue-600 shadow-sky-200';
    case 'Inventory': return 'from-emerald-500 to-teal-700 shadow-emerald-200';
    default: return 'from-slate-500 to-slate-700 shadow-slate-200';
  }
};

const showAddModal = ref(false);
const showDetailModal = ref(false);
const activeSOP = ref<SOP | null>(null);

const newSOP = ref<Omit<SOP, 'id' | 'locationId'>>({
  role: 'Cashier',
  title: '',
  category: 'Daily Operations',
  description: '',
  steps: [],
  iconName: 'BookOpen'
});

const newStep = ref({ title: '', description: '', importance: 'Standard' as any });

const addStepToNewSOP = () => {
    if (!newStep.value.title) return;
    newSOP.value.steps.push({
        id: Math.random().toString(36).substr(2, 9),
        ...newStep.value
    });
    newStep.value = { title: '', description: '', importance: 'Standard' };
};

const handleAddSOP = async () => {
    if (!newSOP.value.title) return;
    await sopStore.addSOP(newSOP.value);
    showAddModal.value = false;
    newSOP.value = {
        role: 'Cashier',
        title: '',
        category: 'Daily Operations',
        description: '',
        steps: [],
        iconName: 'BookOpen'
    };
};

const openDetail = (sop: SOP) => {
  activeSOP.value = sop;
  showDetailModal.value = true;
};
</script>

<template>
  <div class="min-h-screen bg-slate-50/50 p-8 pt-0 animate-in fade-in duration-700">
    <!-- Add SOP Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-6 animate-in fade-in">
        <div class="bg-white rounded-[4rem] shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden animate-in zoom-in duration-300 flex flex-col border border-white/20">
            <div class="p-12 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                    <h2 class="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Draft Protocol</h2>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Engineer new operational vector</p>
                </div>
                <button @click="showAddModal = false" class="w-12 h-12 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl flex items-center justify-center transition-all">
                    <X class="w-6 h-6" />
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/30">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div class="space-y-8">
                        <div class="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white space-y-6">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metadata</h4>
                            <div class="space-y-4">
                                <input v-model="newSOP.title" type="text" placeholder="Protocol Title..." class="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-white focus:border-primary-500 outline-none transition-all font-black uppercase text-xs shadow-inner" />
                                <textarea v-model="newSOP.description" rows="4" placeholder="Brief mission brief..." class="w-full p-6 rounded-2xl border-2 border-slate-100 bg-white focus:border-primary-500 outline-none transition-all font-medium text-xs resize-none shadow-inner"></textarea>
                            </div>
                        </div>

                        <div class="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white space-y-6">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <select v-model="newSOP.role" class="h-14 px-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest">
                                    <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
                                </select>
                                <select v-model="newSOP.category" class="h-14 px-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest">
                                    <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-8">
                        <div class="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white space-y-6">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Steps</h4>
                            <div class="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                <div v-for="(s, i) in newSOP.steps" :key="s.id" class="flex gap-4 items-start p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                                    <div class="w-6 h-6 rounded-lg bg-primary-600 text-white flex items-center justify-center text-[10px] font-black italic">{{ i + 1 }}</div>
                                    <div class="flex-1">
                                        <div class="text-[10px] font-black text-slate-700 uppercase">{{ s.title }}</div>
                                        <div class="text-[8px] text-slate-400 mt-1">{{ s.description }}</div>
                                    </div>
                                    <button @click="newSOP.steps.splice(i, 1)" class="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:scale-110 transition-all absolute top-2 right-2">
                                        <Trash2 class="w-3 h-3" />
                                    </button>
                                </div>

                                <div class="p-6 border-2 border-dashed border-slate-200 rounded-[2.5rem] space-y-4">
                                    <input v-model="newStep.title" type="text" placeholder="Step title..." class="w-full h-10 px-4 rounded-xl border border-slate-100 bg-white text-[10px] font-bold outline-none" />
                                    <textarea v-model="newStep.description" rows="2" placeholder="Instructions..." class="w-full p-4 rounded-xl border border-slate-100 bg-white text-[10px] outline-none"></textarea>
                                    <div class="flex justify-between items-center">
                                        <select v-model="newStep.importance" class="text-[8px] font-black uppercase tracking-widest border border-slate-100 px-3 py-1 rounded-lg outline-none">
                                            <option value="Standard">Standard</option>
                                            <option value="Critical">Critical</option>
                                            <option value="Optional">Optional</option>
                                        </select>
                                        <button @click="addStepToNewSOP" type="button" class="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center hover:scale-110 transition-all shadow-lg shadow-primary-500/30">
                                            <Plus class="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="p-10 bg-white border-t border-slate-100 flex justify-end gap-4">
                <button @click="showAddModal = false" class="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Abort</button>
                <button @click="handleAddSOP" class="px-12 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">Submit Protocol</button>
            </div>
        </div>
    </div>
    <!-- Header Strategy Section -->
    <div class="bg-white rounded-[3rem] border-2 border-slate-50 shadow-2xl overflow-hidden relative group mb-12">
        <div class="absolute -right-20 -top-20 w-80 h-80 bg-primary-50 rounded-full opacity-50 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
        
        <div class="px-12 py-16 relative z-10">
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                <div class="flex items-center gap-8">
                    <div class="w-20 h-20 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-slate-900/20">
                        <BookOpen class="w-10 h-10" />
                    </div>
                    <div>
                        <h1 class="text-5xl font-black text-slate-900 uppercase italic tracking-tighter">Protocol Hub</h1>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Standard Operating Procedures & Safety Compliance</p>
                    </div>
                </div>

                <div class="flex flex-wrap gap-4">
                    <div class="flex items-center gap-3 px-6 py-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                        <Sparkles class="w-4 h-4" />
                        Live Enforcement
                    </div>
                    <button 
                        v-if="canManage"
                        @click="showAddModal = true"
                        class="px-8 py-4 bg-gradient-to-r from-primary-600 via-indigo-600 to-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary-500/30 hover:shadow-primary-500/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group"
                    >
                        <Plus class="w-4 h-4 group-hover:rotate-90 transition-transform" />
                        New Protocol
                    </button>
                </div>
            </div>
        </div>

        <!-- Filter Bar -->
        <div class="px-12 py-8 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row gap-6 relative z-10 transition-all">
            <div class="flex-1 relative group">
                <Search class="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary-500 transition-colors" />
                <input 
                    v-model="searchQuery"
                    type="text" 
                    placeholder="Vector search protocols..." 
                    class="w-full h-14 pl-14 pr-6 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-primary-500 font-black text-xs uppercase tracking-tighter transition-all shadow-inner"
                />
            </div>
            <div class="flex gap-4">
                <div class="relative group">
                    <Filter class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select v-model="selectedRole" class="h-14 pl-10 pr-10 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-primary-500 font-black text-[10px] uppercase tracking-widest cursor-pointer appearance-none">
                        <option value="All">All Roles</option>
                        <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
                    </select>
                </div>
                <div class="relative group">
                    <Target class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select v-model="selectedCategory" class="h-14 pl-10 pr-10 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-primary-500 font-black text-[10px] uppercase tracking-widest cursor-pointer appearance-none">
                        <option value="All">Categories</option>
                        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
                    </select>
                </div>
            </div>
        </div>
    </div>

    <!-- SOP Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
      <div 
        v-for="sop in filteredSOPs" 
        :key="sop.id"
        @click="openDetail(sop)"
        class="bg-white rounded-[3rem] border-2 border-slate-50 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden group cursor-pointer relative flex flex-col"
      >
        <div class="p-10 flex-1 flex flex-col space-y-8">
          <div class="flex items-start justify-between">
            <div 
              class="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-2xl bg-gradient-to-br"
              :class="getCategoryColor(sop.category)"
            >
              <BookOpen class="w-8 h-8" />
            </div>
            <div class="flex flex-col items-end gap-2">
                <span class="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[8px] font-black uppercase tracking-widest">
                {{ sop.role }}
                </span>
                <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest">ID: #{{ sop.id.slice(0, 4) }}</span>
            </div>
          </div>

          <div class="space-y-4">
            <h3 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none group-hover:text-primary-600 transition-colors">
                {{ sop.title }}
            </h3>
            <p class="text-slate-400 text-xs font-medium leading-relaxed line-clamp-2">
                {{ sop.description }}
            </p>
          </div>

          <!-- Step Preview -->
          <div class="space-y-3 pt-4">
            <div 
                v-for="step in sop.steps.slice(0, 3)" 
                :key="step.id"
                class="flex gap-4 items-center"
            >
                <div class="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-primary-500 transition-colors"></div>
                <span class="text-[10px] font-black text-slate-700 uppercase tracking-tight">{{ step.title }}</span>
            </div>
            <div v-if="sop.steps.length > 3" class="text-[8px] font-black text-slate-300 uppercase tracking-widest pl-5">+ {{ sop.steps.length - 3 }} more steps</div>
          </div>
        </div>
        
        <div class="px-10 py-6 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
          <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {{ sop.category }}
          </span>
          <div class="flex items-center gap-4">
              <button v-if="canManage" class="p-2 text-slate-300 hover:text-primary-600 transition-colors">
                  <Edit class="w-4 h-4" />
              </button>
              <button v-if="canManage" @click.stop="sopStore.deleteSOP(sop.id)" class="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                  <Trash2 class="w-4 h-4" />
              </button>
              <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-primary-500 group-hover:scale-110 transition-transform">
                <ChevronRight class="w-5 h-5" />
              </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredSOPs.length === 0" class="col-span-full py-40 text-center flex flex-col items-center">
        <div class="w-32 h-32 bg-slate-100 rounded-[2.5rem] flex items-center justify-center mb-10 text-slate-300 shadow-inner">
            <FileText class="w-14 h-14" />
        </div>
        <h3 class="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Negative Results</h3>
        <p class="text-slate-400 font-bold uppercase tracking-widest text-xs mt-4">Protocol vector not found in current sector</p>
        <button @click="selectedRole = 'All'; selectedCategory = 'All'; searchQuery = ''" class="mt-10 px-8 py-3 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary-600 hover:border-primary-100 transition-all shadow-sm">Reset Strategy</button>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal && activeSOP" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-6 animate-in fade-in">
        <div class="bg-white rounded-[4rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in duration-300 flex flex-col border border-white/20">
            <div :class="['p-16 border-b border-white relative overflow-hidden bg-gradient-to-br text-white', getCategoryColor(activeSOP.category)]">
                <div class="relative z-10 space-y-6">
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-4">
                            <span class="px-6 py-2 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">MISSION: {{ activeSOP.category }}</span>
                            <span class="px-6 py-2 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">{{ activeSOP.role }}</span>
                        </div>
                        <button @click="showDetailModal = false" class="w-12 h-12 bg-white/20 hover:bg-white/40 rounded-2xl flex items-center justify-center transition-all">
                            <X class="w-6 h-6" />
                        </button>
                    </div>
                    <h2 class="text-5xl font-black italic tracking-tighter uppercase leading-none">{{ activeSOP.title }}</h2>
                    <p class="text-white/80 font-medium text-lg max-w-2xl leading-relaxed">{{ activeSOP.description }}</p>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto p-16 custom-scrollbar space-y-12">
                <div v-for="(step, idx) in activeSOP.steps" :key="step.id" class="flex gap-10 group">
                    <div class="flex flex-col items-center">
                        <div class="w-14 h-14 rounded-[1.5rem] bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-xl font-black italic text-slate-300 group-hover:bg-primary-50 group-hover:border-primary-200 group-hover:text-primary-600 transition-all duration-500">
                            {{ idx + 1 }}
                        </div>
                        <div v-if="idx < activeSOP.steps.length - 1" class="w-0.5 flex-1 bg-slate-100 my-4"></div>
                    </div>
                    <div class="flex-1 space-y-4 pb-12">
                        <div class="flex items-center gap-4">
                            <h4 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{{ step.title }}</h4>
                            <span v-if="step.importance === 'Critical'" class="px-4 py-1.5 bg-rose-50 text-rose-500 rounded-lg text-[8px] font-black uppercase tracking-widest border border-rose-100 animate-pulse">Critical Step</span>
                        </div>
                        <p class="text-slate-500 leading-relaxed font-medium">{{ step.description }}</p>
                    </div>
                </div>
            </div>

            <div class="p-12 bg-slate-50 border-t border-slate-100 flex justify-center">
                <button @click="showDetailModal = false" class="px-12 py-5 bg-white border-2 border-slate-200 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary-600 hover:border-primary-100 transition-all shadow-sm">Acknowledge Protocol</button>
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
</style>
