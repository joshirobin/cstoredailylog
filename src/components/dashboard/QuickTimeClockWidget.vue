<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useEmployeesStore } from '../../stores/employees';
import { useTimesheetsStore } from '../../stores/timesheets';
import { useShiftStore } from '../../stores/shifts';
import { 
  LogIn, LogOut, User, Timer, ArrowRight
} from 'lucide-vue-next';

const employeesStore = useEmployeesStore();
const timesheetsStore = useTimesheetsStore();
const shiftStore = useShiftStore();
const selectedEmployeeId = ref('');

onMounted(async () => {
  await Promise.all([
    employeesStore.fetchEmployees(),
    shiftStore.fetchShifts()
  ]);
});

const handleEmployeeChange = async () => {
  if (selectedEmployeeId.value) {
    await timesheetsStore.fetchTimeLogs(selectedEmployeeId.value);
  }
};

const enteredPin = ref('');

const activeEmployee = computed(() => {
  return employeesStore.employees.find(e => e.id === selectedEmployeeId.value);
});

const handleClockAction = async () => {
  if (!selectedEmployeeId.value) return;

  const employee = activeEmployee.value;
  if (!employee) return;

  // PIN Check
  if (employee.pin && enteredPin.value !== employee.pin) {
      alert('Incorrect PIN. Please try again.');
      enteredPin.value = '';
      return;
  }

  if (timesheetsStore.activeLog) {
    await timesheetsStore.clockOut(timesheetsStore.activeLog.id, selectedEmployeeId.value);
     alert(`Goodbye, ${employee.firstName}! Shift ended.`);
  } else {
    // Clock-in Restriction Logic
    let lateness = { isLate: false, lateMinutes: 0 };
    let shiftId = '';
    let scheduledEndTime: any = null;

    const today = new Date();
    const employeeShifts = shiftStore.shifts.filter(s => 
        s.employeeId === selectedEmployeeId.value && 
        s.startTime && typeof s.startTime.toDate === 'function' &&
        s.startTime.toDate().toDateString() === today.toDateString()
    );

    if (employeeShifts.length > 0) {
        const sortedShifts = employeeShifts.sort((a,b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime());
        const currentShift = sortedShifts.find(s => today.getTime() < s.endTime.toDate().getTime()) || sortedShifts[0];
        
        if (currentShift) {
            shiftId = currentShift.id;
            scheduledEndTime = currentShift.endTime;
            const startTime = currentShift.startTime.toDate().getTime();
            
            // 10 MINUTE EARLY RESTRICTION
            if (today.getTime() < startTime - (10 * 60 * 1000)) {
                const diff = Math.ceil((startTime - today.getTime()) / (60 * 1000));
                alert(`Too Early! Scheduled start: ${formatTime(currentShift.startTime)}.\n\nPlease wait ${diff - 10} more mins.`);
                enteredPin.value = '';
                return;
            }

            if (today.getTime() > startTime) {
                lateness = { isLate: true, lateMinutes: Math.floor((today.getTime() - startTime) / (60 * 1000)) };
            }
        }
    }

    await timesheetsStore.clockIn(selectedEmployeeId.value, `${employee.firstName} ${employee.lastName}`, {
        ...lateness,
        shiftId,
        scheduledEndTime
    });
     
    let msg = `Welcome, ${employee.firstName}!`;
    if (lateness.isLate) msg += `\n(Marked late by ${lateness.lateMinutes} mins)`;
    alert(msg);
  }
  
  enteredPin.value = '';
};

const formatTime = (timestamp: any) => {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

</script>

<template>
  <div class="glass-panel p-6 bg-white overflow-hidden relative shadow-xl flex flex-col items-center text-center space-y-6">
       <!-- Header -->
        <div class="w-full flex items-center justify-between">
             <div class="text-left">
                <h3 class="text-lg font-black font-display text-slate-900 uppercase italic tracking-tighter">Time Clock</h3>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Log In/Out</p>
             </div>
             <div class="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                 <Timer class="w-5 h-5" />
             </div>
        </div>

        <!-- Employee Selection -->
        <div class="w-full space-y-4">
            <div class="space-y-1 text-left">
                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Employee</label>
                <div class="relative group">
                    <User class="absolute left-3 top-3.5 w-4 h-4 text-slate-300 pointer-events-none" />
                    <select 
                        v-model="selectedEmployeeId" 
                        @change="handleEmployeeChange"
                        class="input-field w-full pl-10 h-12 text-sm font-bold bg-slate-50 border-slate-100 focus:bg-white transition-all appearance-none"
                    >
                        <option value="">Choose Name...</option>
                        <option v-for="emp in employeesStore.employees" :key="emp.id" :value="emp.id">
                            {{ emp.firstName }} {{ emp.lastName }}
                        </option>
                    </select>
                     <ArrowRight class="absolute right-3 top-3.5 w-4 h-4 text-slate-300 pointer-events-none" />
                </div>
            </div>

            <!-- PIN Input -->
                <div v-if="selectedEmployeeId && activeEmployee?.pin" class="space-y-1 text-left animate-in fade-in slide-in-from-top-1">
                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Enter PIN</label>
                    <input 
                        v-model="enteredPin" 
                        type="password" 
                        maxlength="4" 
                        placeholder="••••"
                        class="input-field w-full h-12 text-center text-lg font-black tracking-[0.5em] bg-white border-slate-200 focus:border-primary-500 transition-all"
                    />
                </div>

            <!-- Action Button -->
            <button 
                @click="handleClockAction"
                :disabled="!selectedEmployeeId || timesheetsStore.loading || (!!activeEmployee?.pin && enteredPin.length < 4)"
                class="w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden shadow-lg"
                :class="timesheetsStore.activeLog ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-primary-600 text-white shadow-primary-500/20'"
            >
                <component :is="timesheetsStore.activeLog ? LogOut : LogIn" class="w-5 h-5" />
                <span class="font-black uppercase tracking-wider text-xs">
                    {{ timesheetsStore.activeLog ? 'Clock Out Now' : 'Clock In Now' }}
                </span>
            </button>
        </div>

         <!-- Status -->
        <div v-if="timesheetsStore.activeLog" class="w-full p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between animate-in fade-in">
             <div class="text-left">
                <p class="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">Active Since</p>
                <p class="text-sm font-black text-slate-900 tracking-tighter">{{ formatTime(timesheetsStore.activeLog.clockIn) }}</p>
             </div>
             <div class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
        </div>
        <div v-else-if="selectedEmployeeId && !timesheetsStore.loading" class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Ready to Start Shift
        </div>
  </div>
</template>
