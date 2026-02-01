<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useEmployeesStore } from '../../stores/employees';
import { useTimesheetsStore } from '../../stores/timesheets';
import { useTasksStore } from '../../stores/tasks';
import { 
  LogIn, LogOut, User, Timer, History,
  CheckCircle2, ListTodo, ArrowRight, Play
} from 'lucide-vue-next';


import { useShiftStore } from '../../stores/shifts';

const employeesStore = useEmployeesStore();
const timesheetsStore = useTimesheetsStore();
const tasksStore = useTasksStore();
const shiftStore = useShiftStore();
const selectedEmployeeId = ref('');
const currentTime = ref(new Date());

// For real-time clock
setInterval(() => {
  currentTime.value = new Date();
}, 1000);

onMounted(async () => {
    await Promise.all([
        employeesStore.fetchEmployees(),
        shiftStore.fetchShifts()
    ]);
});

const handleEmployeeChange = async () => {
  if (selectedEmployeeId.value) {
    await Promise.all([
        timesheetsStore.fetchTimeLogs(selectedEmployeeId.value),
        tasksStore.fetchTasks(selectedEmployeeId.value)
    ]);
  }
};

// PIN Logic
const enteredPin = ref('');
const handleClockAction = async () => {
  if (!selectedEmployeeId.value) return;

  const employee = employeesStore.employees.find(e => e.id === selectedEmployeeId.value);
  if (!employee) return;

  // PIN Check
  if (employee.pin && enteredPin.value !== employee.pin) {
      alert('Incorrect PIN. Please try again.');
      enteredPin.value = '';
      return;
  }

  if (timesheetsStore.activeLog) {
    // Clocking Out
    await timesheetsStore.clockOut(timesheetsStore.activeLog.id, selectedEmployeeId.value);
    alert(`Goodbye, ${employee.firstName}! Shift ended.`);
  } else {
    // Clocking In
    let lateness = { isLate: false, lateMinutes: 0 };
    let shiftId = '';
    let scheduledEndTime: any = null;
    
    // Lateness detection & Early clock-in prevention
    const today = new Date();
    const employeeShifts = shiftStore.shifts.filter(s => 
        s.employeeId === selectedEmployeeId.value && 
        s.startTime && typeof s.startTime.toDate === 'function' &&
        s.startTime.toDate().toDateString() === today.toDateString()
    );

    if (employeeShifts.length > 0) {
        // Sort to find the most relevant shift (the one starting soonest or already started)
        const sortedShifts = employeeShifts.sort((a,b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime());
        
        // Find a shift that hasn't ended yet or is starting soon
        const currentShift = sortedShifts.find(s => today.getTime() < s.endTime.toDate().getTime()) || sortedShifts[0];
        
        if (currentShift) {
            shiftId = currentShift.id;
            scheduledEndTime = currentShift.endTime;

            const startTime = currentShift.startTime.toDate().getTime();
            const earlyThreshold = startTime - (10 * 60 * 1000); // 10 minutes before

            // EARLY CLOCK-IN PREVENTION
            if (today.getTime() < earlyThreshold) {
                const diff = Math.ceil((startTime - today.getTime()) / (60 * 1000));
                alert(`Too Early! You are scheduled to start at ${formatTime(currentShift.startTime)}.\n\nPlease wait another ${diff - 10} minutes before clocking in to prevent unauthorized overtime.`);
                enteredPin.value = '';
                return;
            }

            // If they clock in after scheduled start
            if (today.getTime() > startTime) {
                 const diff = Math.floor((today.getTime() - startTime) / (60 * 1000));
                 lateness = { isLate: true, lateMinutes: diff };
            }
        }
    } else if (employee.role !== 'Admin' && employee.role !== 'Manager') {
        // If no shifts scheduled today, maybe prevent clock-in for non-managers?
        // For now, let's keep it open or just warn.
        console.warn('No scheduled shift found for today.');
    }

    await timesheetsStore.clockIn(selectedEmployeeId.value, `${employee.firstName} ${employee.lastName}`, {
        ...lateness,
        shiftId,
        scheduledEndTime
    });
    
    // Welcome Popup
    let msg = `Welcome, ${employee.firstName}!\n\nPlease check your daily tasks. Thank you.`;
    if (lateness.isLate) {
        msg = `⚠️ LATE CLOCK-IN DETECTED ⚠️\n\nWelcome, ${employee.firstName}. You are marked as late by ${lateness.lateMinutes} minutes.`;
    }
    alert(msg);
  }
  
  // Reset PIN after action for security
  enteredPin.value = '';
};

const myTasks = computed(() => {
    if (!selectedEmployeeId.value) return [];
    return tasksStore.tasks.filter(t => t.status !== 'COMPLETED');
});

const activeEmployee = computed(() => {
  return employeesStore.employees.find(e => e.id === selectedEmployeeId.value);
});

const formatTime = (timestamp: any) => {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (timestamp: any) => {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const updateTaskStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED';
    await tasksStore.updateTaskStatus(id, nextStatus as any);
};
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8">
    <!-- Header -->
    <div class="text-center space-y-3 mb-12">
      <h2 class="text-4xl font-black font-display text-slate-900 uppercase italic tracking-tighter">Shift Dashboard</h2>
      <p class="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Command Center • C-Store Daily Ops</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Left Column (Punch Card) -->
      <div class="lg:col-span-5 space-y-8">
        <div class="glass-panel p-10 flex flex-col items-center text-center space-y-10 bg-white overflow-hidden relative shadow-2xl">
            <!-- Live Clock Display -->
            <div class="space-y-2">
                <p class="text-[10px] font-black text-primary-600 uppercase tracking-[0.5em] ml-1">Universal Time</p>
                <p class="text-6xl font-black text-slate-900 font-mono tracking-tighter">
                    {{ currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}
                </p>
                <div class="flex items-center justify-center gap-3">
                    <div class="h-px w-8 bg-slate-200"></div>
                    <p class="text-slate-400 text-xs font-black uppercase tracking-widest">{{ currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) }}</p>
                    <div class="h-px w-8 bg-slate-200"></div>
                </div>
            </div>

            <!-- Employee Selection -->
            <div class="w-full space-y-6 pt-10 border-t border-slate-50">
                <div class="space-y-2 text-left">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Identify Employee</label>
                    <div class="relative group">
                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <User class="w-5 h-5 text-slate-300 group-focus-within:text-primary-500 transition-colors" />
                        </div>
                        <select 
                            v-model="selectedEmployeeId" 
                            @change="handleEmployeeChange"
                            class="input-field w-full pl-12 h-16 text-lg font-black uppercase italic tracking-tighter bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-primary-500 transition-all appearance-none"
                        >
                            <option value="">Select your name...</option>
                            <option v-if="employeesStore.employees.length === 0" disabled>No employees found. Add them in Employees tab.</option>
                            <option v-for="emp in employeesStore.employees" :key="emp.id" :value="emp.id">
                                {{ emp.firstName }} {{ emp.lastName }}
                            </option>
                        </select>


                        <div class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                            <ArrowRight class="w-5 h-5 text-slate-300" />
                        </div>
                    </div>
                </div>

                <!-- PIN Input -->
                <div v-if="selectedEmployeeId && activeEmployee?.pin" class="space-y-2 text-left animate-in fade-in slide-in-from-top-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Enter PIN</label>
                    <input 
                        v-model="enteredPin" 
                        type="password" 
                        maxlength="4" 
                        placeholder="••••"
                        class="input-field w-full h-16 text-center text-2xl font-black tracking-[1em] bg-white border-2 border-slate-100 focus:border-primary-500 transition-all rounded-[1.5rem]"
                    />
                </div>

                <!-- Main Action Button -->
                <button 
                    @click="handleClockAction"
                    :disabled="!selectedEmployeeId || timesheetsStore.loading || (!!activeEmployee?.pin && enteredPin.length < 4)"
                    class="w-full py-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden relative shadow-2xl"
                    :class="timesheetsStore.activeLog ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-rose-500/30' : 'bg-gradient-to-br from-primary-600 to-indigo-600 text-white shadow-primary-500/30'"
                >
                    <div class="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <template v-if="timesheetsStore.loading">
                        <div class="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full"></div>
                    </template>
                    <template v-else>
                        <component :is="timesheetsStore.activeLog ? LogOut : LogIn" class="w-10 h-10 mb-2 group-hover:scale-110 transition-transform duration-500" />
                        <span class="text-[10px] font-black uppercase tracking-[0.4em] opacity-80 leading-none">
                            {{ timesheetsStore.activeLog ? 'Shift Active' : 'Available for Duty' }}
                        </span>
                        <span class="text-2xl font-black uppercase italic tracking-tighter">
                            {{ timesheetsStore.activeLog ? 'Clock Out' : 'Clock In' }}
                        </span>
                    </template>
                </button>
            </div>

            <!-- Current Session Info -->
            <div v-if="timesheetsStore.activeLog" class="w-full p-6 rounded-3xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-between animate-in fade-in slide-in-from-bottom-5">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                        <Timer class="w-6 h-6 animate-pulse" />
                    </div>
                    <div class="text-left">
                        <p class="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">Shift Start</p>
                        <p class="text-lg font-black text-slate-900 tracking-tighter">{{ formatTime(timesheetsStore.activeLog.clockIn) }}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">Live Earned</p>
                    <p v-if="timesheetsStore.activeLog?.clockIn && typeof timesheetsStore.activeLog.clockIn.toDate === 'function'" class="text-2xl font-black text-emerald-600 font-mono tracking-tighter">
                        ${{ (( (currentTime.getTime() - timesheetsStore.activeLog.clockIn.toDate().getTime()) / (1000 * 60 * 60) ) * (activeEmployee?.hourlyRate || 0)).toFixed(2) }}
                    </p>
                    <p v-else class="text-2xl font-black text-emerald-600 font-mono tracking-tighter">$0.00</p>

                </div>
            </div>
        </div>
      </div>

      <!-- Right Column (My Live Tasks) -->
      <div class="lg:col-span-12 xl:col-span-7 space-y-8">
        
        <!-- Live Tasks Card -->
        <div class="glass-panel p-8 bg-white overflow-hidden min-h-[500px] flex flex-col shadow-2xl relative">
            <div class="flex items-center justify-between mb-10">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                        <ListTodo class="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <h3 class="text-xl font-black text-slate-900 italic uppercase tracking-tighter">Shift Tasks</h3>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personal Action Items</p>
                    </div>
                </div>
                <div v-if="selectedEmployeeId" class="flex items-center gap-2">
                    <span class="bg-primary-50 text-primary-700 px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                        {{ myTasks.length }} Active
                    </span>
                </div>
            </div>

            <div class="flex-1 space-y-4">
                <div v-if="!selectedEmployeeId" class="h-80 flex flex-col items-center justify-center text-center opacity-40">
                    <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <User class="w-10 h-10 text-slate-300" />
                    </div>
                    <p class="text-slate-500 font-bold uppercase tracking-widest text-xs">Identification Required</p>
                    <p class="text-slate-400 text-[10px] mt-1 max-w-[200px]">Select your name to view your assigned tasks for this shift.</p>
                </div>

                <div v-else-if="tasksStore.loading" class="h-80 flex items-center justify-center">
                    <div class="w-10 h-10 border-2 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                </div>
                
                <div v-else-if="myTasks.length === 0" class="h-80 flex flex-col items-center justify-center text-center">
                    <div class="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 class="w-10 h-10 text-emerald-400" />
                    </div>
                    <p class="text-emerald-800 font-black uppercase tracking-widest text-xs">Duty Clear!</p>
                    <p class="text-slate-400 text-[10px] mt-1">Outstanding tasks have been completed.</p>
                </div>

                <div v-else class="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    <div 
                      v-for="task in myTasks" 
                      :key="task.id"
                      class="group p-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 hover:border-primary-200 hover:bg-white transition-all shadow-sm hover:shadow-xl"
                    >
                        <div class="flex items-start justify-between gap-6">
                            <div class="flex-1 space-y-1">
                                <div class="flex items-center gap-3 mb-2">
                                    <span v-if="task.priority === 'URGENT'" class="px-3 py-1 bg-rose-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 animate-pulse">Urgent</span>
                                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target: {{ task.title }}</span>
                                </div>
                                <p class="text-base font-black text-slate-900 italic tracking-tighter uppercase line-clamp-1">{{ task.title }}</p>
                                <p class="text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed">{{ task.description }}</p>
                            </div>
                            <button 
                                @click="updateTaskStatus(task.id, task.status)"
                                class="shrink-0 w-16 h-16 rounded-3xl flex items-center justify-center transition-all active:scale-90"
                                :class="task.status === 'PENDING' ? 'bg-slate-200 text-slate-500 hover:bg-primary-500 hover:text-white' : 'bg-primary-500 text-white shadow-lg shadow-primary-200'"
                            >
                                <Play v-if="task.status === 'PENDING'" class="w-8 h-8" />
                                <CheckCircle2 v-else class="w-8 h-8" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
                <button @click="$router.push('/tasks')" class="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:text-primary-800 transition-colors">Go to Task Board</button>
                <div class="flex items-center gap-2">
                    <History class="w-4 h-4 text-slate-300" />
                    <span class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">History Log Beneath</span>
                </div>
            </div>
        </div>

        <!-- Recent Logs (Mini Strip) -->
        <div v-if="selectedEmployeeId" class="glass-panel p-6 bg-slate-50 border-2 border-white shadow-xl overflow-x-auto">
            <div v-if="timesheetsStore.timeLogs.length === 0 && !timesheetsStore.loading" class="text-center py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">
                No recent shift history for this employee
            </div>
            <div v-else class="flex gap-4 min-w-max pb-2">
                <div 
                  v-for="log in timesheetsStore.timeLogs.slice(0, 5)" 
                  :key="log.id"
                  class="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 min-w-[200px]"
                >
                    <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                        <User class="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">{{ formatDate(log.clockIn) }}</p>
                        <p class="text-xs font-black text-slate-800">{{ log.totalHours ? `${log.totalHours}h` : 'Shift Active' }}</p>
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
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 9999px;
}
</style>
