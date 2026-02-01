<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useShiftStore, type Shift } from '../../stores/shifts';
import { useEmployeesStore } from '../../stores/employees';
import { useTimesheetsStore } from '../../stores/timesheets';
import { 
    Plus,
    ChevronLeft,
    ChevronRight,
    Copy,
    Trash2,
    Calendar,
    Save,
    X,
    Clock,
    DollarSign,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Share2,
    CalendarX
} from 'lucide-vue-next';


import { Timestamp } from 'firebase/firestore';

const shiftStore = useShiftStore();
const employeeStore = useEmployeesStore();
const timesheetsStore = useTimesheetsStore();

// UI State
const activeTab = ref('Schedule');
const isModalOpen = ref(false);
const isAvailabilityModalOpen = ref(false);
const isSwapModalOpen = ref(false);
const editingShiftId = ref<string | null>(null);
const editingAvailabilityEmpId = ref<string | null>(null);
const selectedSwapShift = ref<Shift | null>(null);
const swapRecipientId = ref<string>('');

const tempAvailability = ref<any[]>([]);
const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


// Calendar State
const currentWeekStart = ref(new Date());

const setWeekStart = (d: Date) => {
    const temp = new Date(d);
    const day = temp.getDay();
    const diff = temp.getDate() - day;
    const sunday = new Date(temp.setDate(diff));
    sunday.setHours(0,0,0,0);
    return sunday;
};

currentWeekStart.value = setWeekStart(new Date());

const weekDays = computed(() => {
    const days: Date[] = [];
    const start = new Date(currentWeekStart.value);
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        days.push(d);
    }
    return days;
});

const navigateWeek = (dir: number) => {
    const d = new Date(currentWeekStart.value);
    d.setDate(d.getDate() + (dir * 7));
    currentWeekStart.value = d;
};

const formatDateRange = computed(() => {
    const start = weekDays.value[0];
    const end = weekDays.value[6];
    if (!start || !end) return '';
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
});

// Shift Form State
const newShift = ref({
    employeeId: '',
    date: '',
    startTime: '06:00',
    endTime: '14:00',
    role: 'Cashier',
    notes: '',
    status: 'Scheduled' as Shift['status']
});

// Role Colors
const roleColors: Record<string, string> = {
    'Cashier': 'emerald',
    'Stock': 'blue',
    'Kitchen': 'amber',
    'Manager': 'purple',
    'Maintenance': 'slate'
};

const getRoleColor = (role: string) => roleColors[role] || 'slate';

// Data Loading
onMounted(async () => {
    await Promise.all([
        shiftStore.fetchShifts(),
        shiftStore.fetchTemplates(),
        shiftStore.fetchTimeOffRequests(),
        shiftStore.fetchAvailabilities(),
        shiftStore.fetchSwapRequests(),
        employeeStore.fetchEmployees(),
        timesheetsStore.fetchTimeLogs()


    ]);
});

// Utilities
const getShiftsForDay = (date: Date, empId?: string) => {
    const dateStr = date.toDateString();
    return shiftStore.shifts.filter(s => {
        const sDate = s.startTime.toDate().toDateString();
        const matchesDate = sDate === dateStr;
        const matchesEmp = empId ? s.employeeId === empId : true;
        return matchesDate && matchesEmp;
    });
};

const formatTime = (ts: Timestamp) => {
    return ts.toDate().toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
};

const getShiftDuration = (s: Shift) => {
    const ms = s.endTime.toDate().getTime() - s.startTime.toDate().getTime();
    return ms / (1000 * 60 * 60);
};

const getEmployeeWeeklyHours = (employeeId: string, targetDate: Date) => {
    const d = new Date(targetDate);
    const day = d.getDay();
    const diff = d.getDate() - day;
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0,0,0,0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const shifts = shiftStore.shifts.filter(s => {
        if (s.employeeId !== employeeId) return false;
        if (editingShiftId.value && s.id === editingShiftId.value) return false;
        const sTime = s.startTime.toDate().getTime();
        return sTime >= weekStart.getTime() && sTime < weekEnd.getTime();
    });

    return shifts.reduce((acc, s) => acc + getShiftDuration(s), 0);
};

// Actions
const openAddShift = (dateStr?: string, empId?: string) => {
    editingShiftId.value = null;
    const safeDate = dateStr || new Date().toISOString().substring(0, 10);
    newShift.value = {
        employeeId: empId || '',
        date: safeDate,
        startTime: '06:00',
        endTime: '14:00',
        role: 'Cashier',
        notes: '',
        status: 'Scheduled'
    };
    isModalOpen.value = true;
};

const editShift = (shift: Shift) => {
    editingShiftId.value = shift.id;
    const dateStr = shift.startTime.toDate().toISOString().split('T')[0] ?? '';
    newShift.value = {
        employeeId: shift.employeeId,
        date: dateStr,
        startTime: shift.startTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        endTime: shift.endTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        role: shift.role,
        notes: shift.notes || '',
        status: shift.status
    };
    isModalOpen.value = true;
};

const handleDeleteShift = async () => {
    if (!editingShiftId.value) return;
    if (confirm('Are you sure you want to delete this shift?')) {
        await shiftStore.deleteShift(editingShiftId.value);
        isModalOpen.value = false;
    }
};

const handleSaveShift = async () => {
    if (!newShift.value.employeeId || !newShift.value.date) return;

    const start = new Date(`${newShift.value.date}T${newShift.value.startTime}`);
    let end = new Date(`${newShift.value.date}T${newShift.value.endTime}`);
    if (end < start) end.setDate(end.getDate() + 1);

    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const currentHours = getEmployeeWeeklyHours(newShift.value.employeeId, start);
    const projectedTotal = currentHours + duration;

    if (projectedTotal > 40) {
        if (!confirm(`⚠️ OVERTIME WARNING ⚠️\n\nEmployee will exceed 40 hours (Projected: ${projectedTotal.toFixed(1)}h).\n\nAuthorize?`)) return;
    }

    const emp = employeeStore.employees.find(e => e.id === newShift.value.employeeId);
    const shiftData = {
        employeeId: newShift.value.employeeId,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        startTime: Timestamp.fromDate(start),
        endTime: Timestamp.fromDate(end),
        role: newShift.value.role,
        status: newShift.value.status,
        notes: newShift.value.notes,
        isOvertime: projectedTotal > 40
    };

    try {
        if (editingShiftId.value) {
            await shiftStore.updateShift(editingShiftId.value, shiftData);
        } else {
            await shiftStore.addShift(shiftData);
        }
        isModalOpen.value = false;
    } catch (e) {
        alert('Error saving shift');
    }
};

const copyPreviousWeek = async () => {
    alert('Copy functionality coming soon.');
};

// Swap Actions
const handleApproveSwap = async (swap: any) => {
    try {
        const shift = shiftStore.shifts.find(s => s.id === swap.targetShiftId);
        const recipient = employeeStore.employees.find(e => e.id === swap.recipientId);
        
        if (!shift || !recipient) {
            alert('Shift or Recipient not found.');
            return;
        }

        // Update the shift with the new employee
        await shiftStore.updateShift(shift.id, {
            employeeId: recipient.id,
            employeeName: `${recipient.firstName} ${recipient.lastName}`
        });

        // Update swap request status
        await shiftStore.updateSwapRequest(swap.id, 'Approved');
        alert('Shift swap approved and updated.');
    } catch (e) {
        console.error(e);
        alert('Failed to approve swap.');
    }
};

const handleRejectSwap = async (swapId: string) => {
    try {
        await shiftStore.updateSwapRequest(swapId, 'Rejected');
        alert('Shift swap rejected.');
    } catch (e) {
        console.error(e);
    }
};

const requestSwap = (shift: Shift) => {
    selectedSwapShift.value = shift;
    swapRecipientId.value = '';
    isSwapModalOpen.value = true;
};

const confirmSwapRequest = async () => {
    if (!selectedSwapShift.value) return;
    
    try {
        await shiftStore.addSwapRequest({
            requesterId: selectedSwapShift.value.employeeId,
            targetShiftId: selectedSwapShift.value.id,
            recipientId: swapRecipientId.value || undefined,
            status: 'Pending'
        });
        isSwapModalOpen.value = false;
        alert('Swap request posted!');
    } catch (e) {
        console.error(e);
        alert('Error creating swap request');
    }
};


// Availability Actions
const openEditAvailability = (empId: string) => {
    editingAvailabilityEmpId.value = empId;
    const empAvail = shiftStore.availabilities.filter(a => a.employeeId === empId);
    
    // Initialize temp availability with either existing data or defaults
    tempAvailability.value = daysOfWeek.map((day, index) => {
        const existing = empAvail.find(a => a.dayOfWeek === index);
        return {
            id: existing?.id,
            employeeId: empId,
            dayOfWeek: index,
            dayName: day,
            startTime: existing?.startTime || '09:00',
            endTime: existing?.endTime || '17:00',
            isAvailable: existing ? existing.isAvailable : true
        };
    });
    
    isAvailabilityModalOpen.value = true;
};

const handleSaveAvailability = async () => {
    if (!editingAvailabilityEmpId.value) return;
    
    try {
        await Promise.all(tempAvailability.value.map(async (avail) => {
            const { dayName, ...cleanAvail } = avail;
            if (avail.id) {
                await shiftStore.updateAvailability(avail.id, cleanAvail);
            } else {
                await shiftStore.addAvailability(cleanAvail);
            }
        }));
        isAvailabilityModalOpen.value = false;
        alert('Availability pattern updated successfully!');
    } catch (e) {
        console.error(e);
        alert('Failed to save availability.');
    }
};

const getAvailabilityForDay = (empId: string, dayIdx: number) => {
    return shiftStore.availabilities.find(a => a.employeeId === empId && a.dayOfWeek === dayIdx);
};

const formatAvailability = (avail?: any) => {
    if (!avail || !avail.isAvailable) return 'Not Available';
    return `${avail.startTime} - ${avail.endTime}`;
};

// Stats
const totalWeeklyHours = computed(() => {
    let total = 0;
    weekDays.value.forEach(day => {
        getShiftsForDay(day).forEach(s => total += getShiftDuration(s));
    });
    return total;
});

const estimatedWeeklyCost = computed(() => {
    let cost = 0;
    weekDays.value.forEach(day => {
        getShiftsForDay(day).forEach(s => {
            const emp = employeeStore.employees.find(e => e.id === s.employeeId);
            const hours = getShiftDuration(s);
            if (emp && emp.hourlyRate) {
                cost += hours * emp.hourlyRate;
            }
        });
    });
    return cost;
});

// Report Logic
const reportData = computed(() => {
    const start = weekDays.value[0];
    const end = weekDays.value[6];
    if (!start || !end) return [];

    return employeeStore.employees.map(emp => {
        const scheduledShifts = shiftStore.shifts.filter(s => {
            const sTime = s.startTime.toDate();
            // Compare dates simply to avoid time issues
            const sDateStr = sTime.toDateString();
            return weekDays.value.some(d => d.toDateString() === sDateStr) && s.employeeId === emp.id;
        });
        const scheduledHours = scheduledShifts.reduce((acc, s) => acc + getShiftDuration(s), 0);
        const scheduledCost = scheduledShifts.reduce((acc, s) => acc + (getShiftDuration(s) * (emp.hourlyRate || 0)), 0);

        const actualLogs = timesheetsStore.timeLogs.filter(l => {
            const lTime = l.clockIn.toDate();
            const lDateStr = lTime.toDateString();
            return weekDays.value.some(d => d.toDateString() === lDateStr) && l.employeeId === emp.id;
        });
        const actualHours = actualLogs.reduce((acc, l) => acc + (l.totalHours || 0), 0);
        const actualCost = actualLogs.reduce((acc, l) => acc + ((l.totalHours || 0) * (emp.hourlyRate || 0)), 0);
        
        const lateCount = actualLogs.filter(l => l.isLate).length;
        const totalLogs = actualLogs.length;
        const punctuality = totalLogs > 0 ? ((totalLogs - lateCount) / totalLogs) * 100 : 100;

        const variance = actualHours - scheduledHours;
        const costVariance = actualCost - scheduledCost;

        return {
            id: emp.id,
            name: `${emp.firstName} ${emp.lastName}`,
            scheduled: scheduledHours,
            actual: actualHours,
            scheduledCost,
            actualCost,
            variance: variance,
            costVariance: costVariance,
            punctuality: punctuality,
            status: Math.abs(variance) < 1 ? 'Perfect' : (variance > 0 ? 'Over' : 'Under')
        };
    });
});


// Helper for Swaps
const getEmployeeName = (id?: string) => {
    if (!id) return 'Open';
    const emp = employeeStore.employees.find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown';
};

const getShiftDetails = (id: string) => {
    const s = shiftStore.shifts.find(sh => sh.id === id);
    if (!s) return 'Unknown Shift';
    return `${s.role} on ${s.startTime.toDate().toLocaleDateString()} (${formatTime(s.startTime)} - ${formatTime(s.endTime)})`;
};
</script>


<template>
    <div class="space-y-6 pb-20 max-w-[1800px] mx-auto p-6">
        <!-- Main Header -->
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div>
                <h2 class="text-4xl font-black font-display text-slate-900 uppercase italic tracking-tighter">Workforce Hub</h2>
                <div class="flex gap-4 mt-4 border-b border-slate-100">
                    <button 
                        v-for="tab in ['Schedule', 'Time Off', 'Swaps', 'Reports', 'Availability']" 
                        :key="tab"
                        @click="activeTab = tab"
                        class="pb-2 text-xs font-black uppercase tracking-widest border-b-2 transition-colors px-2"
                        :class="activeTab === tab ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-400 hover:text-slate-600'"
                    >
                        {{ tab }}
                    </button>

                </div>
            </div>

            <!-- Dashboard Tools -->
            <div v-if="activeTab === 'Schedule'" class="flex flex-wrap items-center gap-3">
                 <div class="flex items-center gap-3 mr-2">
                     <div class="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <Clock class="w-3.5 h-3.5 text-primary-500" />
                        <span class="text-[11px] font-black text-slate-700 uppercase tracking-tighter">{{ totalWeeklyHours.toFixed(1) }}h</span>
                     </div>
                     <div class="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <DollarSign class="w-3.5 h-3.5 text-emerald-500" />
                        <span class="text-[11px] font-black text-emerald-700 uppercase tracking-tighter">${{ estimatedWeeklyCost.toFixed(0) }}</span>
                     </div>
                 </div>

                 <div class="flex items-center bg-slate-100/50 rounded-xl p-1">
                    <button @click="navigateWeek(-1)" class="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-900 transition-all">
                        <ChevronLeft class="w-4 h-4" />
                    </button>
                    <div class="px-4 flex items-center gap-2">
                        <Calendar class="w-3.5 h-3.5 text-slate-400" />
                        <span class="text-[10px] font-black text-slate-900 uppercase tracking-widest min-w-[120px] text-center">
                            {{ formatDateRange }}
                        </span>
                    </div>
                     <button @click="navigateWeek(1)" class="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-900 transition-all">
                        <ChevronRight class="w-4 h-4" />
                    </button>
                 </div>

                 <div class="flex gap-2">
                     <button @click="copyPreviousWeek" class="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-primary-500 transition-all" title="Copy Previous">
                         <Copy class="w-4 h-4" />
                     </button>
                     <button @click="openAddShift()" class="btn-primary py-2.5 px-5 flex items-center gap-2 shadow-lg shadow-primary-500/10">
                        <Plus class="w-4 h-4" />
                        <span class="font-black uppercase tracking-wider text-[10px]">New Shift</span>
                    </button>
                 </div>
            </div>

        </div>

        <!-- TAB CONTENT: SCHEDULE -->
        <div v-if="activeTab === 'Schedule'" class="bg-white border border-slate-100 overflow-hidden shadow-sm rounded-3xl animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-left border-collapse table-fixed min-w-[1000px]">
                    <thead>
                        <tr>
                            <th class="p-3 bg-slate-50/50 border-b border-r border-slate-100 w-[180px] sticky left-0 z-20">
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Employee</span>
                            </th>
                            <th v-for="day in weekDays" :key="day.toISOString()" class="p-2 bg-slate-50/50 border-b border-slate-100 text-center">
                                <div class="flex flex-col items-center">
                                    <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ day.toLocaleDateString('en-US', {weekday: 'short'}) }}</div>
                                    <div class="w-7 h-7 flex items-center justify-center rounded-lg text-sm font-black mt-0.5 transition-all" 
                                        :class="day.toDateString() === new Date().toDateString() ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-slate-900'">
                                        {{ day.getDate() }}
                                    </div>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        <tr v-for="emp in employeeStore.employees" :key="emp.id" class="group hover:bg-slate-50/30 transition-colors">
                            <td class="p-3 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 shadow-[2px_0_5px_-3px_rgba(0,0,0,0.05)]">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px] shrink-0">
                                        {{ emp.firstName[0] }}{{ emp.lastName[0] }}
                                    </div>
                                    <div class="min-w-0">
                                        <div class="font-black text-slate-900 text-xs truncate leading-tight">{{ emp.firstName }} {{ emp.lastName }}</div>
                                        <div class="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">{{ emp.position }}</div>
                                    </div>
                                </div>
                            </td>


                            <td v-for="day in weekDays" :key="day.toISOString()" class="p-1 border-r border-slate-50 relative group/cell h-full align-top">
                                <div class="min-h-[70px] h-full flex flex-col gap-1 transition-all">
                                    <div 
                                        v-for="shift in getShiftsForDay(day, emp.id)" 
                                        :key="shift.id"
                                        @click="editShift(shift)"
                                        class="p-1.5 rounded-lg border cursor-pointer hover:shadow-md transition-all group/shift relative overflow-hidden"
                                        :class="`bg-${getRoleColor(shift.role)}-50 border-${getRoleColor(shift.role)}-100`"
                                    >
                                        <div :class="`absolute left-0 top-0 bottom-0 w-0.5 bg-${getRoleColor(shift.role)}-500`"></div>
                                        <div class="pl-1.5 space-y-0.5">
                                            <div class="flex items-center justify-between">
                                                 <span :class="`text-[8px] font-black uppercase tracking-tight text-${getRoleColor(shift.role)}-700`">{{ shift.role }}</span>
                                                  <div class="flex gap-0.5">
                                                     <AlertTriangle v-if="shift.isOvertime" class="w-2.5 h-2.5 text-rose-500" />
                                                     <CalendarX v-if="shift.status === 'Call Out' || shift.status === 'No Show'" class="w-2.5 h-2.5 text-rose-600" />
                                                   </div>
                                                </div>
                                                <div class="text-[10px] font-black text-slate-900 leading-none">
                                                    {{ formatTime(shift.startTime) }}
                                                </div>
                                                <div class="flex justify-between items-center">
                                                    <span class="text-[8px] font-bold text-slate-400 uppercase">{{ getShiftDuration(shift).toFixed(0) }}h</span>
                                                    <button @click.stop="requestSwap(shift)" class="p-0.5 hover:bg-white/50 rounded text-slate-300 hover:text-primary-500 opacity-0 group-hover/shift:opacity-100 transition-all">
                                                        <Share2 class="w-2.5 h-2.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                    <button 
                                        @click="openAddShift(day.toISOString().split('T')[0], emp.id)"
                                        class="w-full flex-1 py-2 rounded-lg border-2 border-dashed border-slate-100 hover:border-primary-100 hover:bg-primary-50/30 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-all text-primary-300"
                                    >
                                        <Plus class="w-3 h-3" />
                                    </button>
                                </div>
                            </td>

                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- TAB CONTENT: TIME OFF -->
        <div v-if="activeTab === 'Time Off'" class="glass-panel p-8 bg-white animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-3xl">
            <div class="flex items-center justify-between mb-8">
                <div>
                   <h3 class="text-2xl font-black text-slate-900 uppercase italic">Time Off Requests</h3>
                   <p class="text-sm text-slate-500">Manage leave and vacation requests.</p>
                </div>
            </div>

            <div v-if="shiftStore.timeOffRequests.length === 0" class="py-20 text-center">
                 <Calendar class="w-12 h-12 text-slate-200 mx-auto mb-4" />
                 <h4 class="text-lg font-bold text-slate-900">No requests yet</h4>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div v-for="req in shiftStore.timeOffRequests" :key="req.id" class="p-6 rounded-3xl border border-slate-100 bg-slate-50/30">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold text-slate-700 shadow-sm">
                            {{ req.employeeName ? req.employeeName[0] : '?' }}
                        </div>
                        <div>
                            <div class="font-black text-slate-900 text-sm">{{ req.employeeName }}</div>
                            <div class="text-[10px] font-black uppercase tracking-widest" :class="{
                                'text-amber-500': req.status === 'Pending',
                                'text-emerald-500': req.status === 'Approved',
                                'text-rose-500': req.status === 'Rejected'
                            }">{{ req.status }}</div>
                        </div>
                    </div>
                    <div class="space-y-2 mb-6">
                        <div class="text-xs font-bold text-slate-600 flex items-center gap-2">
                            <Calendar class="w-3.5 h-3.5" />
                            {{ new Date(req.startDate).toLocaleDateString() }} - {{ new Date(req.endDate).toLocaleDateString() }}
                        </div>
                        <p class="text-xs text-slate-500 italic">"{{ req.reason }}"</p>
                    </div>
                    <div v-if="req.status === 'Pending'" class="flex gap-2">
                        <button @click="shiftStore.updateTimeOffRequest(req.id, 'Rejected')" class="flex-1 py-2 text-xs font-black uppercase bg-white border border-rose-100 text-rose-500 rounded-xl">Reject</button>
                        <button @click="shiftStore.updateTimeOffRequest(req.id, 'Approved')" class="flex-1 py-2 text-xs font-black uppercase bg-white border border-emerald-100 text-emerald-500 rounded-xl">Approve</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- TAB CONTENT: SWAPS -->
        <div v-if="activeTab === 'Swaps'" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-2xl font-black text-slate-900 uppercase italic">Shift Swap Requests</h3>
                    <p class="text-sm text-slate-500">Manage employee requests to swap or cover shifts.</p>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div v-for="swap in shiftStore.swapRequests" :key="swap.id" class="glass-panel p-6 border-slate-100 bg-white">
                    <div class="flex justify-between items-start mb-4">
                        <span 
                            class="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
                            :class="{
                                'bg-amber-100 text-amber-700': swap.status === 'Pending',
                                'bg-emerald-100 text-emerald-700': swap.status === 'Approved',
                                'bg-rose-100 text-rose-700': swap.status === 'Rejected'
                            }"
                        >
                            {{ swap.status }}
                        </span>
                        <span class="text-[10px] text-slate-400 font-bold">{{ swap.createdAt.toDate().toLocaleDateString() }}</span>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Requester</p>
                            <p class="font-black text-slate-900">{{ getEmployeeName(swap.requesterId) }}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Shift</p>
                            <p class="text-sm font-bold text-slate-700">{{ getShiftDetails(swap.targetShiftId) }}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Proposed Recipient</p>
                            <p class="font-black" :class="swap.recipientId ? 'text-slate-900' : 'text-primary-600 italic'">
                                {{ swap.recipientId ? getEmployeeName(swap.recipientId) : 'Open Pool' }}
                            </p>
                        </div>
                    </div>

                    <div v-if="swap.status === 'Pending'" class="flex gap-2 mt-8">
                        <button @click="handleApproveSwap(swap)" class="btn-primary flex-1 py-2 text-[10px]">Approve</button>
                        <button @click="handleRejectSwap(swap.id)" class="btn-secondary flex-1 py-2 text-[10px]">Reject</button>
                    </div>
                </div>

                <div v-if="shiftStore.swapRequests.length === 0" class="col-span-full py-20 text-center glass-panel bg-slate-50 border-dashed border-2 border-slate-200">
                    <Share2 class="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p class="text-slate-500 font-bold uppercase tracking-widest text-xs">No swap requests at this time</p>
                </div>
            </div>
        </div>

        <!-- TAB CONTENT: REPORTS -->

        <div v-if="activeTab === 'Reports'" class="glass-panel p-8 bg-white animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-3xl">
            <h3 class="text-2xl font-black text-slate-900 uppercase italic mb-8">Performance Analytics</h3>
            <div class="overflow-hidden border border-slate-100 rounded-2xl">
                <table class="w-full text-left">
                    <thead class="bg-slate-50">
                        <tr>
                            <th class="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Employee</th>
                            <th class="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Sch. Hrs</th>
                            <th class="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Act. Hrs</th>
                            <th class="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Hr. Variance</th>
                            <th class="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Cost Var.</th>
                            <th class="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Punctuality</th>
                            <th class="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-for="item in reportData" :key="item.id" class="hover:bg-slate-50 transition-colors">
                            <td class="p-6">
                                <span class="font-black text-slate-900">{{ item.name }}</span>
                            </td>
                            <td class="p-6 text-sm font-bold text-slate-600">{{ item.scheduled.toFixed(1) }}h</td>
                            <td class="p-6 text-sm font-bold text-slate-900">{{ item.actual.toFixed(1) }}h</td>
                            <td class="p-6">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-black" :class="item.variance > 0 ? 'text-rose-600' : 'text-emerald-600'">
                                        {{ item.variance > 0 ? '+' : '' }}{{ item.variance.toFixed(1) }}h
                                    </span>
                                    <TrendingUp v-if="item.variance > 1" class="w-4 h-4 text-rose-500" />
                                    <TrendingDown v-if="item.variance < -1" class="w-4 h-4 text-emerald-500" />
                                </div>
                            </td>
                            <td class="p-6">
                                <span class="text-sm font-black" :class="item.costVariance > 0 ? 'text-rose-600' : 'text-emerald-600'">
                                    {{ item.costVariance > 0 ? '+' : '' }}${{ item.costVariance.toFixed(2) }}
                                </span>
                            </td>
                             <td class="p-6">
                                <div class="flex items-center gap-2">
                                    <div class="flex-1 h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                        <div :class="item.punctuality > 90 ? 'bg-emerald-500' : 'bg-amber-500'" class="h-full" :style="`width: ${item.punctuality}%`"></div>
                                    </div>
                                    <span class="text-[10px] font-black text-slate-900">{{ item.punctuality.toFixed(0) }}%</span>
                                </div>
                            </td>
                            <td class="p-6">
                                <span 
                                    class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                                    :class="{
                                        'bg-emerald-100 text-emerald-700': item.status === 'Perfect',
                                        'bg-rose-100 text-rose-700': item.status === 'Over',
                                        'bg-blue-100 text-blue-700': item.status === 'Under'
                                    }"
                                >
                                    {{ item.status }}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- TAB CONTENT: AVAILABILITY -->
        <div v-if="activeTab === 'Availability'" class="glass-panel p-8 bg-white animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-3xl">
             <div class="flex items-center justify-between mb-8">
                <div>
                   <h3 class="text-2xl font-black text-slate-900 uppercase italic">Staff Availability</h3>
                   <p class="text-sm text-slate-500">View recurring availability and preferred hours.</p>
                </div>
                <button class="btn-secondary py-2 px-4 text-xs flex items-center gap-2">
                    <Share2 class="w-4 h-4" />
                    Share Forms
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div v-for="emp in employeeStore.employees" :key="emp.id" class="p-6 rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400">
                            {{ emp.firstName[0] }}{{ emp.lastName[0] }}
                        </div>
                        <div>
                            <h4 class="font-black text-slate-900 leading-none">{{ emp.firstName }} {{ emp.lastName }}</h4>
                            <p class="text-[10px] font-black text-primary-500 uppercase tracking-widest mt-1">{{ emp.position }}</p>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <div v-for="(day, idx) in daysOfWeek" :key="day" class="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-slate-50">
                            <span class="font-bold text-slate-500">{{ day.substring(0, 3) }}</span>
                            <span class="font-black" :class="getAvailabilityForDay(emp.id, idx)?.isAvailable === false ? 'text-slate-300' : 'text-slate-900'">
                                {{ formatAvailability(getAvailabilityForDay(emp.id, idx)) }}
                            </span>
                        </div>
                    </div>

                    <button @click="openEditAvailability(emp.id)" class="w-full mt-6 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 border border-dashed border-slate-200 rounded-xl hover:border-primary-200 hover:text-primary-500 transition-all">
                        Edit Pattern
                    </button>
                </div>
            </div>
        </div>

        <!-- Availability Modal -->
        <div v-if="isAvailabilityModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" @click="isAvailabilityModalOpen = false"></div>
            <div class="glass-panel w-full max-w-2xl relative z-10 bg-white p-0 overflow-hidden shadow-2xl rounded-3xl scale-in-center">
                <div class="bg-primary-600 p-6 flex items-center justify-between text-white">
                    <div>
                        <h3 class="text-xl font-black uppercase italic">Edit Availability Pattern</h3>
                        <p class="text-[10px] text-primary-100 font-black uppercase tracking-widest mt-1">
                            Set recurring weekly availability
                        </p>
                    </div>
                    <button @click="isAvailabilityModalOpen = false" class="text-white/60 hover:text-white p-2 border-none bg-transparent">
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <div class="p-8 space-y-4">
                    <div v-for="day in tempAvailability" :key="day.dayOfWeek" class="grid grid-cols-4 items-center gap-4 p-3 rounded-2xl border border-slate-50 bg-slate-50/50">
                        <div class="col-span-1">
                            <span class="font-black text-slate-900 text-sm uppercase italic">{{ day.dayName }}</span>
                        </div>
                        <div class="col-span-1">
                            <button 
                                type="button" 
                                @click="day.isAvailable = !day.isAvailable"
                                :class="day.isAvailable ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'"
                                class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all w-full"
                            >
                                {{ day.isAvailable ? 'Available' : 'Off Day' }}
                            </button>
                        </div>
                        <div class="col-span-2 flex items-center gap-2" v-if="day.isAvailable">
                            <input type="time" v-model="day.startTime" class="w-full p-2 rounded-lg border-2 border-slate-100 text-xs font-bold" />
                            <span class="text-slate-400 font-black text-[10px]">TO</span>
                            <input type="time" v-model="day.endTime" class="w-full p-2 rounded-lg border-2 border-slate-100 text-xs font-bold" />
                        </div>
                        <div class="col-span-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest italic py-2" v-else>
                            Employee is not available on this day
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 pt-6">
                        <button @click="isAvailabilityModalOpen = false" class="btn-secondary px-6">Cancel</button>
                        <button @click="handleSaveAvailability" class="btn-primary px-8">Save Pattern</button>
                    </div>
                </div>
            </div>
        </div>


        <!-- Add/Edit Shift Modal -->
        <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" @click="isModalOpen = false"></div>
            <div class="glass-panel w-full max-w-md relative z-10 bg-white p-0 overflow-hidden shadow-2xl rounded-3xl scale-in-center">
                <div class="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 class="text-xl font-black text-slate-900 uppercase italic">{{ editingShiftId ? 'Edit Shift' : 'New Shift' }}</h3>
                        <p class="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Labor management</p>
                    </div>
                    <button @click="isModalOpen = false" class="text-slate-400 hover:text-slate-900 p-2"><X class="w-5 h-5" /></button>
                </div>

                <div class="p-8 space-y-6">
                    <div class="space-y-4">
                        <div>
                            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Employee</label>
                            <select v-model="newShift.employeeId" class="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm font-bold appearance-none">
                                <option value="" disabled>Select Staff Member</option>
                                <option v-for="emp in employeeStore.employees" :key="emp.id" :value="emp.id">{{ emp.firstName }} {{ emp.lastName }}</option>
                            </select>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Date</label>
                                <input type="date" v-model="newShift.date" class="w-full p-3 rounded-xl border-2 border-slate-100 text-sm font-bold" />
                            </div>
                            <div>
                                <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Role</label>
                                <select v-model="newShift.role" class="w-full p-3 rounded-xl border-2 border-slate-100 text-sm font-bold">
                                    <option v-for="(_, role) in roleColors" :key="role" :value="role">{{ role }}</option>
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Start</label>
                                <input type="time" v-model="newShift.startTime" class="w-full p-3 rounded-xl border-2 border-slate-100 text-sm font-bold" />
                            </div>
                            <div>
                                <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">End</label>
                                <input type="time" v-model="newShift.endTime" class="w-full p-3 rounded-xl border-2 border-slate-100 text-sm font-bold" />
                            </div>
                        </div>
                         <div>
                            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Shift Status</label>
                            <select v-model="newShift.status" class="w-full p-3 rounded-xl border-2 border-slate-100 text-sm font-bold bg-white" :class="{
                                'text-rose-600': newShift.status === 'Call Out' || newShift.status === 'No Show',
                                'text-emerald-600': newShift.status === 'Completed'
                            }">
                                <option value="Scheduled">Scheduled</option>
                                <option value="Published">Published</option>
                                <option value="Completed">Completed</option>
                                <option value="Call Out">Call Out (Absent)</option>
                                <option value="No Show">No Show</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Notes</label>
                            <input type="text" v-model="newShift.notes" class="w-full p-3 rounded-xl border-2 border-slate-100 text-sm" placeholder="Optional notes..." />
                        </div>
                    </div>
                </div>

                <div class="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <button v-if="editingShiftId" @click="handleDeleteShift" class="p-3 text-rose-500 bg-white border border-rose-100 rounded-xl hover:bg-rose-50"><Trash2 class="w-5 h-5" /></button>
                    <button @click="isModalOpen = false" class="flex-1 font-bold text-slate-500">Cancel</button>
                    <button @click="handleSaveShift" class="flex-[2] btn-primary py-3 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20">
                        <Save class="w-4 h-4" />
                        <span>{{ editingShiftId ? 'Update' : 'Save' }}</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Swap Request Modal -->
    <div v-if="isSwapModalOpen" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div class="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden scale-in-center">
            <div class="p-8 border-b border-slate-50">
                <div class="flex items-center gap-4 mb-2">
                    <div class="p-3 bg-primary-50 rounded-2xl text-primary-600"><Share2 class="w-6 h-6" /></div>
                    <h3 class="text-xl font-black text-slate-900 uppercase italic">Request Shift Swap</h3>
                </div>
                <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">Choose who you want to offer this shift to.</p>
            </div>
            
            <div class="p-8 space-y-6">
                <div v-if="selectedSwapShift" class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Your Shift</div>
                    <div class="font-black text-slate-900">{{ selectedSwapShift.role }}</div>
                    <div class="text-sm font-bold text-slate-600">
                        {{ selectedSwapShift.startTime.toDate().toLocaleDateString() }} 
                        ({{ formatTime(selectedSwapShift.startTime) }} - {{ formatTime(selectedSwapShift.endTime) }})
                    </div>
                </div>

                <div class="space-y-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proposed Recipient</label>
                    <select 
                        v-model="swapRecipientId" 
                        class="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-slate-900 font-bold focus:bg-white focus:border-primary-500 transition-all outline-none"
                    >
                        <option value="">Open Pool (Anyone can accept)</option>
                        <option v-for="emp in employeeStore.employees" :key="emp.id" :value="emp.id">
                            {{ emp.firstName }} {{ emp.lastName }}
                        </option>
                    </select>
                    <p class="text-[10px] text-slate-400 italic">Leave as "Open Pool" if you don't have a specific person in mind.</p>
                </div>

                <div class="pt-4 flex gap-4">
                    <button @click="isSwapModalOpen = false" class="flex-1 py-4 font-black uppercase text-slate-400 tracking-widest hover:text-slate-600 transition-colors">Cancel</button>
                    <button @click="confirmSwapRequest" class="flex-1 btn-primary py-4 font-black uppercase tracking-widest shadow-xl shadow-primary-500/20">Submit Request</button>
                </div>
            </div>
        </div>
    </div>
</template>


<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.scale-in-center {
	animation: scale-in-center 0.2s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
}
@keyframes scale-in-center {
  0% { transform: scale(0.95); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
