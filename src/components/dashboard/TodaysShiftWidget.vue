<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { 
  Users, 
  Clock, 
  ArrowRight, 
  CalendarDays
} from 'lucide-vue-next';
import { useTimesheetsStore } from '../../stores/timesheets';

const timesheetsStore = useTimesheetsStore();

interface Shift {
    id: string;
    employee: { name: string; employeeId: string };
    startTime: string; // ISO string
    endTime: string;   // ISO string or 'Present'
    status: string;
    totalHours?: number;
}

const shifts = ref<Shift[]>([]);
const loading = ref(true);

const fetchShifts = async () => {
    loading.value = true;
    try {
        await timesheetsStore.fetchTimeLogs();
        
        const todayStr = new Date().toDateString();
        
        // Filter for today's logs and map to Shift interface
        const todayLogs = timesheetsStore.timeLogs.filter(log => {
            if (!log.clockIn || typeof log.clockIn.toDate !== 'function') return false;
            const logDate = log.clockIn.toDate().toDateString();
            return logDate === todayStr;
        });


        shifts.value = todayLogs.map(log => {
            const start = log.clockIn.toDate();
            const end = log.clockOut ? log.clockOut.toDate() : new Date(); // If active, use now
            
            return {
                id: log.id,
                employee: { 
                    name: log.employeeName || 'Unknown Staff', 
                    employeeId: log.employeeId 
                },
                startTime: start.toISOString(),
                endTime: log.clockOut ? end.toISOString() : 'Present',
                status: log.status,
                totalHours: log.totalHours || undefined,
                isLate: log.isLate,
                lateMinutes: log.lateMinutes
            };
        });
        
        shifts.value.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    } catch (error) {
        console.error('Failed to fetch shifts:', error);
    } finally {
        loading.value = false;
    }
};

onMounted(fetchShifts);

const formatTime = (timeStr: string) => {
    if (timeStr === 'Present') return 'Now';
    return new Date(timeStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

const isShiftActive = (shift: Shift) => {
    return shift.status === 'In Progress';
};

const activeShiftsCount = computed(() => shifts.value.filter(isShiftActive).length);

const handleClockOut = async (shift: Shift) => {
    if (!confirm(`Clock out ${shift.employee.name}?`)) return;
    
    try {
        await timesheetsStore.clockOut(shift.id, shift.employee.employeeId);
        await fetchShifts(); // Refresh list
    } catch (e) {
        alert('Failed to clock out');
    }
};
</script>

<template>
  <div class="glass-panel p-8 bg-white overflow-hidden shadow-2xl relative flex flex-col h-full border-2 border-slate-50">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6 relative z-10">
        <div>
            <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Today's Staff</h3>
            <div class="flex items-center gap-2 mt-1">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ shifts.length }} ON DUTY TODAY</span>
                <div class="w-1 h-1 rounded-full bg-slate-300"></div>
                <span class="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{{ activeShiftsCount }} LIVE</span>
            </div>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/10">
            <Users class="w-6 h-6" />
        </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-4">
        <template v-if="loading">
            <div v-for="i in 3" :key="i" class="flex items-center gap-4 p-4 rounded-[1.5rem] bg-slate-50/50 animate-pulse">
                <div class="w-10 h-10 rounded-full bg-slate-200"></div>
                <div class="flex-1 space-y-2">
                    <div class="h-4 bg-slate-200 rounded w-1/2"></div>
                    <div class="h-3 bg-slate-100 rounded w-1/3"></div>
                </div>
            </div>
        </template>

        <template v-else-if="shifts.length === 0">
            <div class="h-full flex flex-col items-center justify-center text-center py-10 space-y-4">
                <div class="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 border-2 border-dashed border-slate-200">
                    <CalendarDays class="w-8 h-8" />
                </div>
                <div>
                    <p class="text-slate-400 font-black uppercase text-[10px] tracking-widest">No Active Roster</p>
                    <p class="text-slate-300 text-[8px] font-black uppercase tracking-widest mt-1">Check central scheduling</p>
                </div>
            </div>
        </template>

        <template v-else>
            <div 
                v-for="shift in shifts" 
                :key="shift.id"
                class="flex items-center gap-4 p-4 rounded-[2rem] border-2 transition-all duration-300 group relative overflow-hidden"
                :class="isShiftActive(shift) 
                    ? 'bg-white border-emerald-100 shadow-xl shadow-emerald-500/5' 
                    : 'bg-slate-50/50 border-transparent hover:border-slate-100'"
            >
                <!-- Active Pulse Overlay -->
                <div v-if="isShiftActive(shift)" class="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent"></div>

                <div 
                    class="w-12 h-12 rounded-[1.2rem] flex items-center justify-center text-sm font-black shadow-sm relative z-10 transition-transform group-hover:scale-110"
                    :class="isShiftActive(shift) ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-100'"
                >
                    {{ shift.employee.name.charAt(0) }}
                </div>

                <div class="flex-1 min-w-0 relative z-10">
                    <div class="flex items-center gap-2">
                        <span class="font-black text-slate-900 uppercase italic tracking-tighter leading-none group-hover:text-primary-600 transition-colors">
                            {{ shift.employee.name }}
                        </span>
                        <div v-if="(shift as any).isLate" class="bg-rose-500 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg shadow-rose-200">
                             Late (+15m)
                        </div>
                        <div v-if="isShiftActive(shift)" class="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span class="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
                        </div>
                    </div>
                    <div class="text-[10px] text-slate-400 font-black flex items-center gap-1.5 mt-1.5 uppercase tracking-widest">
                        <Clock class="w-3 h-3" />
                        {{ formatTime(shift.startTime) }} — {{ formatTime(shift.endTime) }}
                    </div>
                </div>

                <div class="flex items-center gap-2 relative z-20">
                    <div v-if="isShiftActive(shift)">
                        <button 
                            @click.stop="handleClockOut(shift)"
                            class="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-200 transition-colors"
                        >
                            Clock Out
                        </button>
                    </div>
                    <div v-else class="text-right">
                         <span class="block text-[10px] uppercase font-black text-slate-400 tracking-widest">Total</span>
                         <span class="block text-xs font-black text-slate-900">{{ shift.totalHours?.toFixed(2) }} Hrs</span>
                    </div>
                </div>
            </div>
        </template>
    </div>

    <!-- Footer -->
    <div class="mt-8 pt-6 border-t border-slate-50 relative z-10">
        <RouterLink 
            to="/time-clock" 
            class="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary-600 transition-all shadow-xl shadow-slate-900/10 hover:shadow-primary-500/20 group"
        >
            Manage Roster
            <ArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #f1f5f9;
  border-radius: 9999px;
}
</style>
