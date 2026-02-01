<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useComplianceStore } from '../../stores/compliance';
import { useAuthStore } from '../../stores/auth';
import { 
  Plus, Snowflake,
  X, Activity, History, Download, Wind, Zap, Flame
} from 'lucide-vue-next';

const complianceStore = useComplianceStore();
const authStore = useAuthStore();

const isLogging = ref(false);
const newReading = ref({
    equipmentName: '',
    type: 'COOLER' as 'COOLER' | 'FREEZER' | 'HOT_CASE',
    temperature: 0,
    unit: 'F' as const,
    loggedBy: authStore.user?.email?.split('@')[0] || 'Unknown'
});

const equipmentList = [
    { name: 'Beer Cave', type: 'COOLER', icon: Snowflake },
    { name: 'Milk Cooler', type: 'COOLER', icon: Snowflake },
    { name: 'Main Freezer', type: 'FREEZER', icon: Wind },
    { name: 'Hot Case 1 (Deli)', type: 'HOT_CASE', icon: Flame },
    { name: 'Roller Grill', type: 'HOT_CASE', icon: Flame },
    { name: 'Coffee Station', type: 'HOT_CASE', icon: Zap }
] as const;

const handleSubmit = async () => {
    try {
        await complianceStore.addReading(newReading.value);
        isLogging.value = false;
        newReading.value = {
            equipmentName: '',
            type: 'COOLER',
            temperature: 0,
            unit: 'F',
            loggedBy: authStore.user?.email?.split('@')[0] || 'Unknown'
        };
    } catch (e) {
        alert("Failed to log temperature");
    }
};

const getStatusColor = (status: string) => status === 'NORMAL' ? 'text-emerald-500 bg-emerald-50 border-emerald-100' : 'text-rose-500 bg-rose-50 border-rose-100';

const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric'
    }).format(d);
};

onMounted(() => complianceStore.fetchReadings());
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8 pb-20">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 class="text-4xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none mb-3">
                Food Safety <span class="text-rose-600">Compliance</span>
            </h1>
            <p class="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Hazard Analysis • Temperature Matrix</p>
        </div>

        <button 
            @click="isLogging = true"
            class="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
        >
            <Plus class="w-4 h-4" />
            Instant Log
        </button>
    </div>

    <!-- Monitoring Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div v-for="eq in equipmentList" :key="eq.name" class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-slate-300 transition-all">
            <div class="flex items-center justify-between mb-4">
                <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <component :is="eq.icon" class="w-5 h-5" />
                </div>
                <Activity class="w-4 h-4 text-emerald-500 animate-pulse" />
            </div>
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{{ eq.type }}</h3>
            <p class="text-lg font-black text-slate-900 uppercase italic tracking-tighter">{{ eq.name }}</p>
            
            <div class="mt-4 pt-4 border-t border-slate-50 flex justify-between items-end">
                <div>
                   <p class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Target Range</p>
                   <p class="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                       {{ eq.type === 'HOT_CASE' ? '140°F +' : '≤ 41°F' }}
                   </p>
                </div>
                <button @click="newReading.equipmentName = eq.name; newReading.type = eq.type; isLogging = true" class="text-[10px] font-black text-primary-600 uppercase tracking-widest">Check Now</button>
            </div>
        </div>
    </div>

    <!-- Log Section -->
    <div v-if="isLogging" class="bg-white rounded-[2.5rem] border border-slate-900 border-2 p-8 animate-in slide-in-from-top-4">
        <div class="flex items-center justify-between mb-8">
            <h3 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Temperature Verification</h3>
            <button @click="isLogging = false" class="text-slate-400 hover:text-slate-900"><X /></button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipment</label>
                <select v-model="newReading.equipmentName" @change="newReading.type = equipmentList.find(e => e.name === newReading.equipmentName)?.type || 'COOLER'" class="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold">
                    <option v-for="e in equipmentList" :key="e.name">{{ e.name }}</option>
                </select>
            </div>
            <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Measured Temp</label>
                <div class="flex items-center gap-2">
                    <input type="number" v-model.number="newReading.temperature" class="flex-1 bg-slate-50 border-none rounded-xl p-3 text-sm font-bold" />
                    <span class="text-xl font-black text-slate-900">°F</span>
                </div>
            </div>
            <div class="flex items-end pb-1 text-xs font-black text-slate-300 uppercase italic">
                Verified by digital telemetry
            </div>
        </div>

        <button 
            @click="handleSubmit"
            class="w-full py-5 bg-rose-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20"
        >
            Authorize Entry
        </button>
    </div>

    <!-- Audit History -->
    <div class="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div class="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
            <h2 class="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                <History class="w-4 h-4 text-slate-400" />
                Audit Trail (Last 50 Entries)
            </h2>
            <button class="flex items-center gap-2 text-[10px] font-black text-primary-600 uppercase tracking-widest">
                <Download class="w-3.5 h-3.5" /> Export for Inspector
            </button>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left">
                <thead class="bg-slate-50/50">
                    <tr>
                        <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipment</th>
                        <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Temp</th>
                        <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inspector</th>
                        <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                    <tr v-for="r in complianceStore.readings" :key="r.id" class="hover:bg-slate-50/50 transition-colors">
                        <td class="px-8 py-4">
                            <p class="text-xs font-black text-slate-900 uppercase italic tracking-tighter">{{ r.equipmentName }}</p>
                        </td>
                        <td class="px-8 py-4">
                            <span :class="['text-sm font-black', r.status === 'ALERT' ? 'text-rose-600' : 'text-slate-900']">{{ r.temperature }}°F</span>
                        </td>
                        <td class="px-8 py-4">
                            <div :class="['px-3 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest w-fit', getStatusColor(r.status)]">
                                {{ r.status }}
                            </div>
                        </td>
                        <td class="px-8 py-4">
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ r.loggedBy }}</p>
                        </td>
                        <td class="px-8 py-4">
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ formatDate(r.timestamp) }}</p>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  </div>
</template>
