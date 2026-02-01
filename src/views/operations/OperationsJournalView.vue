<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useJournalStore, type JournalEntry } from '../../stores/journal';
import { useAuthStore } from '../../stores/auth';
import { 
  MessageSquare, AlertTriangle, Send, 
  Info, Search, ChevronRight,
  User, CheckCircle2, Wrench
} from 'lucide-vue-next';

const journalStore = useJournalStore();
const authStore = useAuthStore();

const newNote = ref('');
const selectedType = ref<JournalEntry['type']>('general');
const selectedPriority = ref<JournalEntry['priority']>('medium');
const isSubmitting = ref(false);
const searchQuery = ref('');

const entryTypes = [
  { id: 'general', label: 'General Note', icon: Info, bg: 'bg-blue-50', text: 'text-blue-600' },
  { id: 'handover', label: 'Shift Handover', icon: MessageSquare, bg: 'bg-indigo-50', text: 'text-indigo-600' },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, bg: 'bg-orange-50', text: 'text-orange-600' },
  { id: 'incident', label: 'Critical Incident', icon: AlertTriangle, bg: 'bg-rose-50', text: 'text-rose-600' }
] as const;

const priorityLevels = [
    { id: 'low', label: 'Normal', color: 'bg-slate-100 text-slate-600' },
    { id: 'medium', label: 'Important', color: 'bg-amber-100 text-amber-600' },
    { id: 'high', label: 'High Priority', color: 'bg-orange-100 text-orange-600' },
    { id: 'urgent', label: 'Urgent Alert', color: 'bg-rose-100 text-rose-600' }
] as const;

const filteredEntries = computed(() => {
    if (!searchQuery.value) return journalStore.entries;
    const q = searchQuery.value.toLowerCase();
    return journalStore.entries.filter(e => 
        e.content.toLowerCase().includes(q) || 
        e.authorName.toLowerCase().includes(q) ||
        e.type.includes(q)
    );
});

const handleSubmit = async () => {
    if (!newNote.value.trim()) return;
    
    isSubmitting.value = true;
    try {
        await journalStore.addEntry({
            content: newNote.value,
            type: selectedType.value,
            priority: selectedPriority.value,
            authorName: authStore.user?.email?.split('@')[0] || 'Unknown User',
            authorId: authStore.user?.uid || 'unknown'
        });
        newNote.value = '';
        selectedType.value = 'general';
        selectedPriority.value = 'medium';
    } catch (e) {
        alert("Failed to submit entry");
    } finally {
        isSubmitting.value = false;
    }
};

const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
    }).format(d);
};

onMounted(() => {
    journalStore.fetchRecentEntries(50);
});
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 class="text-4xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none mb-3">
                Operations <span class="text-primary-600">Journal</span>
            </h1>
            <p class="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Command Center Log • Real-time Compliance</p>
        </div>

        <div class="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
            <div class="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span class="text-[10px] font-black uppercase tracking-widest text-emerald-600">Sync Active</span>
            </div>
            <div class="flex -space-x-2">
                <div v-for="i in 3" :key="i" class="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                    {{ String.fromCharCode(64 + i) }}
                </div>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Input Panel -->
        <div class="lg:col-span-4 space-y-6">
            <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-8 sticky top-8">
                <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-6">New Entry</h3>
                
                <div class="space-y-6">
                    <!-- Type Selector -->
                    <div class="space-y-3">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Vector Category</label>
                        <div class="grid grid-cols-2 gap-2">
                            <button 
                                v-for="type in entryTypes" 
                                :key="type.id"
                                @click="selectedType = type.id as any"
                                :class="['p-3 rounded-2xl border transition-all flex flex-col gap-2 items-start', 
                                    selectedType === type.id ? 'bg-slate-900 border-slate-900' : 'bg-slate-50 border-slate-100 hover:border-slate-200']"
                            >
                                <component :is="type.icon" :class="['w-4 h-4', selectedType === type.id ? 'text-primary-400' : type.text]" />
                                <span :class="['text-[9px] font-black uppercase tracking-widest text-left', selectedType === type.id ? 'text-white' : 'text-slate-600']">
                                    {{ type.label }}
                                </span>
                            </button>
                        </div>
                    </div>

                    <!-- Priority -->
                    <div class="space-y-3">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Priority Level</label>
                        <div class="flex flex-wrap gap-2">
                            <button 
                                v-for="p in priorityLevels" 
                                :key="p.id"
                                @click="selectedPriority = p.id as any"
                                :class="['px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all',
                                    selectedPriority === p.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300']"
                            >
                                {{ p.label }}
                            </button>
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="space-y-3">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Data Payload</label>
                        <textarea 
                            v-model="newNote"
                            placeholder="Type shift notes, incident details, or hand-over tasks..."
                            class="w-full h-40 bg-slate-50 border-none rounded-[1.5rem] p-5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 placeholder:text-slate-300 resize-none"
                        ></textarea>
                    </div>

                    <button 
                        @click="handleSubmit"
                        :disabled="isSubmitting || !newNote.trim()"
                        class="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20 disabled:opacity-50"
                    >
                        <Send class="w-4 h-4" />
                        {{ isSubmitting ? 'Transmitting...' : 'Commit to Journal' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Timeline -->
        <div class="lg:col-span-8 space-y-6">
            <!-- Search & Filters -->
            <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <Search class="w-5 h-5 text-slate-300 ml-2" />
                <input 
                    v-model="searchQuery"
                    placeholder="Filter operations log..."
                    class="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold uppercase tracking-widest text-slate-900"
                />
                <div class="flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ filteredEntries.length }} Logs</span>
                </div>
            </div>

            <!-- Feed -->
            <div class="space-y-6 relative">
                <!-- Timeline Thread -->
                <div class="absolute left-6 top-10 bottom-10 w-px bg-slate-100 hidden md:block"></div>

                <div v-if="filteredEntries.length === 0" class="py-32 text-center opacity-20">
                    <MessageSquare class="w-20 h-20 mx-auto mb-4" />
                    <p class="text-2xl font-black uppercase italic tracking-tighter">No vectors committed</p>
                </div>

                <div 
                    v-for="entry in filteredEntries" 
                    :key="entry.id"
                    class="relative pl-0 md:pl-16 group"
                >
                    <!-- Timeline Node -->
                    <div class="absolute left-[20px] top-6 w-2 h-2 rounded-full border-2 border-white ring-4 ring-slate-50 z-10 hidden md:block"
                         :class="entry.priority === 'urgent' ? 'bg-rose-500 ring-rose-50' : 'bg-slate-300 ring-slate-50'">
                    </div>

                    <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 overflow-hidden">
                        <div class="flex items-center justify-between px-8 py-4 bg-slate-50/50 border-b border-slate-50">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400">
                                    <User class="w-4 h-4" />
                                </div>
                                <div>
                                    <p class="text-[10px] font-black text-slate-900 uppercase italic tracking-tighter">{{ entry.authorName }}</p>
                                    <p class="text-[8px] font-black text-slate-300 uppercase tracking-widest">{{ formatDate(entry.createdAt) }}</p>
                                </div>
                            </div>

                            <div class="flex items-center gap-3">
                                <span :class="['px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border', 
                                    priorityLevels.find(p => p.id === entry.priority)?.color || 'bg-slate-50']">
                                    {{ entry.priority }}
                                </span>
                                <div :class="['px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border bg-white', 
                                    entryTypes.find(t => t.id === entry.type)?.text || 'text-slate-400']">
                                    {{ entry.type }}
                                </div>
                            </div>
                        </div>

                        <div class="p-8">
                            <p class="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {{ entry.content }}
                            </p>
                        </div>

                        <div class="px-8 py-4 border-t border-slate-50 bg-slate-50/30 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all">
                            <div class="flex items-center gap-2">
                                <CheckCircle2 class="w-3.5 h-3.5 text-slate-300" />
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Acknowledge Vector</span>
                            </div>
                            <button class="text-[9px] font-black text-primary-600 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                                Detail Matrix <ChevronRight class="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>
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
