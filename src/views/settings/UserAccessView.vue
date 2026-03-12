<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { db } from '../../firebaseConfig';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { 
  Clock, Globe, Monitor, 
  MapPin, Search,
  ShieldCheck, ShieldAlert, History
} from 'lucide-vue-next';

interface AccessLog {
    id: string;
    uid: string;
    email: string;
    displayName: string;
    ipAddress: string;
    timestamp: any;
    userAgent: string;
    platform: string;
    locationId: string;
}

const logs = ref<AccessLog[]>([]);
const loading = ref(true);
const searchQuery = ref('');

onMounted(() => {
    const q = query(
        collection(db, 'access_logs'),
        orderBy('timestamp', 'desc'),
        limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        logs.value = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as AccessLog));
        loading.value = false;
    });

    return () => unsubscribe();
});

const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

const getBrowser = (ua: string) => {
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
};

const getOS = (ua: string) => {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Macintosh')) return 'macOS';
    if (ua.includes('iPhone')) return 'iOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Linux')) return 'Linux';
    return 'Other';
};
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-10 pb-40">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <div>
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
            <ShieldCheck class="w-6 h-6" />
          </div>
          <div>
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">System Security</span>
            <h1 class="text-4xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none">Security <span class="text-indigo-600">Shield</span></h1>
          </div>
        </div>
        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Login History • IP Audit • Device Fingerprinting</p>
      </div>

      <div class="relative group">
        <Search class="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
        <input type="text" 
               v-model="searchQuery"
               placeholder="Search logs by email or IP..." 
               class="bg-white border-none rounded-[2rem] pl-14 pr-8 py-5 text-sm font-bold shadow-sm focus:ring-2 ring-indigo-500 transition-all w-full md:w-80 outline-none" />
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
      <div class="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <History class="w-5 h-5" />
          </div>
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last 24 Hours</span>
        </div>
        <p class="text-3xl font-black text-slate-900 tracking-tighter">{{ logs.length }} <span class="text-sm opacity-40 uppercase">Access Events</span></p>
      </div>
      
      <div class="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <Globe class="w-5 h-5" />
          </div>
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unique IPs</span>
        </div>
        <p class="text-3xl font-black text-slate-900 tracking-tighter">{{ new Set(logs.map((l: AccessLog) => l.ipAddress)).size }} <span class="text-sm opacity-40 uppercase">Network Origins</span></p>
      </div>

      <div class="bg-indigo-900 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden text-white">
        <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-indigo-300">
              <ShieldAlert class="w-5 h-5" />
            </div>
            <span class="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Security Status</span>
          </div>
          <p class="text-2xl font-black tracking-tight leading-none italic uppercase">Active Surveillance</p>
          <p class="text-[9px] font-bold text-indigo-300/60 mt-2 uppercase tracking-widest">System is monitoring all node endpoints</p>
        </div>
      </div>
    </div>

    <!-- Logs Table -->
    <div class="bg-white rounded-[3.5rem] p-10 shadow-sm border border-slate-100 overflow-hidden relative">
      <div class="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
      
      <div class="relative z-10 overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-slate-50">
              <th class="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-4">Timestamp</th>
              <th class="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operator</th>
              <th class="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">IP Address</th>
              <th class="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Device / OS</th>
              <th class="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right pr-4">Location ID</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="log in logs" :key="log.id" class="group hover:bg-slate-50/50 transition-colors">
              <td class="py-6 pl-4">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <Clock class="w-4 h-4" />
                  </div>
                  <span class="text-xs font-black text-slate-900 tabular-nums uppercase">{{ formatDate(log.timestamp) }}</span>
                </div>
              </td>
              <td class="py-6">
                <div class="flex flex-col">
                  <span class="text-xs font-black text-slate-900 uppercase italic leading-none">{{ log.displayName }}</span>
                  <span class="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{{ log.email }}</span>
                </div>
              </td>
              <td class="py-6">
                <div class="flex items-center gap-2">
                  <Globe class="w-3.5 h-3.5 text-slate-300" />
                  <span class="text-xs font-black text-slate-900 tabular-nums">{{ log.ipAddress }}</span>
                </div>
              </td>
              <td class="py-6">
                <div class="flex items-center gap-4">
                  <div class="flex items-center gap-1.5">
                    <Monitor class="w-3.5 h-3.5 text-slate-300" />
                    <span class="text-[10px] font-black text-slate-600 uppercase">{{ getBrowser(log.userAgent) }}</span>
                  </div>
                  <div class="w-px h-3 bg-slate-100"></div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase">{{ getOS(log.userAgent) }}</span>
                </div>
              </td>
              <td class="py-6 text-right pr-4">
                <div class="flex items-center justify-end gap-2">
                  <MapPin class="w-3.5 h-3.5 text-indigo-400" />
                  <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{{ log.locationId }}</span>
                </div>
              </td>
            </tr>
            <tr v-if="logs.length === 0 && !loading">
              <td colspan="5" class="py-20 text-center">
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">No access logs discovered in current cycle</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.italic {
  font-style: italic;
}
</style>
