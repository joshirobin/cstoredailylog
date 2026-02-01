<script setup lang="ts">
import { computed, onMounted } from 'vue';

import { useTasksStore } from '../../stores/tasks';
import { useSalesStore } from '../../stores/sales';
import { useTimesheetsStore } from '../../stores/timesheets';
import { useEmployeesStore } from '../../stores/employees';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  type ChartData,
  type ChartOptions
} from 'chart.js';
import { Bar, Doughnut, Line } from 'vue-chartjs';
import { 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  Zap,
  Check,
  Plus,
  ShieldCheck,
  Bot
} from 'lucide-vue-next';



// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const tasksStore = useTasksStore();
const salesStore = useSalesStore();
const timesheetsStore = useTimesheetsStore();
const employeesStore = useEmployeesStore();

onMounted(async () => {
    await Promise.all([
        salesStore.fetchLogs(),
        timesheetsStore.fetchTimeLogs(),
        employeesStore.fetchEmployees()
    ]);
});


// --- Statistics Calculations ---
const totalTasks = computed(() => tasksStore.tasks.length);
const completedTasks = computed(() => tasksStore.tasks.filter(t => t.status === 'COMPLETED').length);
const pendingTasks = computed(() => tasksStore.tasks.filter(t => t.status !== 'COMPLETED').length);
const urgentTasks = computed(() => tasksStore.tasks.filter(t => t.priority === 'URGENT').length);

// --- Financial IQ Calculations ---

const totalSalesMonth = computed(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    return salesStore.logs
        .filter(l => new Date(l.date) >= startOfMonth)
        .reduce((sum, l) => sum + (l.totalSales || 0), 0);
});

const totalLaborCostMonth = computed(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    
    // Estimate labor cost from timesheets
    return timesheetsStore.timeLogs
        .filter(log => log.clockIn && new Date(log.clockIn.toDate()) >= startOfMonth)
        .reduce((sum, log) => {
            const employee = employeesStore.employees.find(e => e.id === log.employeeId);
            const rate = employee?.hourlyRate || 15;
            return sum + (log.totalHours || 0) * rate;
        }, 0);
});

const laborEfficiency = computed(() => {
    if (totalSalesMonth.value === 0) return 0;
    return Math.round((totalLaborCostMonth.value / totalSalesMonth.value) * 100);
});

const salesForecast = computed(() => {
    const logs = [...salesStore.logs].sort((a, b) => a.date.localeCompare(b.date));
    if (logs.length < 2) return (totalSalesMonth.value || 0) * 1.05;
    
    // Simple average growth
    const firstLog = logs[0];
    const lastLog = logs[logs.length - 1];
    
    if (!firstLog || !lastLog) return (totalSalesMonth.value || 0);

    const firstSales = firstLog.totalSales || 1;
    const lastSales = lastLog.totalSales || 1;
    const growth = lastSales / firstSales;
    return (totalSalesMonth.value || 0) * growth;
});




// --- Chart Data Preparation ---

// 1. Task Status Distribution (Doughnut)
const doughnutData = computed<ChartData<'doughnut'>>(() => ({
  labels: ['Completed', 'In Progress', 'Pending'],
  datasets: [
    {
      data: [
        completedTasks.value,
        tasksStore.tasks.filter(t => t.status === 'IN_PROGRESS').length,
        tasksStore.tasks.filter(t => t.status === 'PENDING').length
      ],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)', // Green
        'rgba(59, 130, 246, 0.8)', // Blue
        'rgba(245, 158, 11, 0.8)',  // Amber
      ],
      hoverOffset: 20,
      borderWidth: 0,
      spacing: 5
    },
  ],
}));

const doughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '75%',
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      padding: 12,
      backgroundColor: '#1e293b',
      titleFont: { size: 14, weight: 'bold' },
      bodyFont: { size: 12 },
      usePointStyle: true,
    }
  }
};

// 2. Weekly Completion Trend
const lineData = computed<ChartData<'line'>>(() => ({
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [
    {
      label: 'Tasks Completed',
      data: [12, 19, 15, 25, 22, 30, completedTasks.value],
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
    },
    {
      label: 'Tasks Created',
      data: [15, 22, 18, 28, 25, 35, totalTasks.value],
      borderColor: '#94a3b8',
      backgroundColor: 'transparent',
      borderDash: [5, 5],
      tension: 0.4,
      pointRadius: 0,
    }
  ],
}));

const lineOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(0,0,0,0.05)' },
      ticks: { font: { weight: 'bold' } }
    },
    x: {
      grid: { display: false },
      ticks: { font: { weight: 'bold' } }
    }
  },
  plugins: {
    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { weight: 'bold' } } }
  }
};

// 3. Employee Performance (Bar - Top 5)
const barData = computed<ChartData<'bar'>>(() => {
  const employeeStats: Record<string, number> = {};
  tasksStore.tasks.forEach(task => {
    if (task.assigneeName) {
      employeeStats[task.assigneeName] = (employeeStats[task.assigneeName] || 0) + (task.status === 'COMPLETED' ? 1 : 0);
    }
  });

  const sortedEmployees = Object.entries(employeeStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return {
    labels: sortedEmployees.map(([name]) => name.split(' ')[0]),
    datasets: [
      {
        label: 'Tasks Completed',
        data: sortedEmployees.map(([, count]) => count),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderRadius: 8,
        barThickness: 20
      },
    ],
  };
});

const barOptions: ChartOptions<'bar'> = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { display: false },
    y: { grid: { display: false }, ticks: { font: { weight: 'bold' } } }
  },
  plugins: {
    legend: { display: false }
  }
};

const activityItems = [
    { text: "Shift Manager completed 'Opening Checklist'", time: "10 mins ago", icon: Check, color: "bg-emerald-100 text-emerald-600" },
    { text: "AI Auditor: Flagged variance in Register 2", time: "25 mins ago", icon: Bot, color: "bg-purple-100 text-purple-600" },
    { text: "New Task Assigned: 'Fuel Sump Inspection'", time: "40 mins ago", icon: Plus, color: "bg-blue-100 text-blue-600" },
    { text: "Compliance Check: Forecourt lighting verified", time: "1 hour ago", icon: ShieldCheck, color: "bg-indigo-100 text-indigo-600" },
];
</script>

<template>
  <div class="space-y-8 animate-in fade-in duration-700">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 class="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Operational Overview</h2>
            <p class="text-slate-500 font-medium tracking-wide">Real-time performance analytics & shift engagement</p>
        </div>
        <div class="flex gap-2">
            <span class="px-5 py-2 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-100">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Vector Stream Active
            </span>
        </div>
    </div>

    <!-- Stats Matrix -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-xl shadow-slate-200/20 hover:shadow-2xl transition-all group overflow-hidden relative">
            <div class="absolute -right-4 -top-4 w-20 h-20 bg-primary-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
            <div class="relative z-10 flex flex-col justify-between h-full">
                <div class="flex items-center justify-between mb-6">
                    <div class="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shadow-inner">
                        <TrendingUp class="w-6 h-6" />
                    </div>
                    <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Financial Projection</span>
                </div>
                <div class="space-y-1">
                    <div class="text-3xl font-black text-slate-900 tracking-tighter">${{ Math.round(salesForecast).toLocaleString() }}</div>
                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">MTD Forecast</div>
                </div>
            </div>
        </div>

        <div class="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-xl shadow-slate-200/20 hover:shadow-2xl transition-all group overflow-hidden relative">
            <div class="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
            <div class="relative z-10 flex flex-col justify-between h-full">
                <div class="flex items-center justify-between mb-6">
                    <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                        <ShieldCheck class="w-6 h-6" />
                    </div>
                    <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Efficiency</span>
                </div>
                <div class="space-y-1">
                    <div class="text-4xl font-black text-slate-900 tracking-tighter">{{ laborEfficiency }}%</div>
                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Labor / Sales Ratio</div>
                </div>
            </div>
        </div>


        <div class="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-xl shadow-slate-200/20 hover:shadow-2xl transition-all group overflow-hidden relative">
            <div class="absolute -right-4 -top-4 w-20 h-20 bg-amber-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
            <div class="relative z-10 flex flex-col justify-between h-full">
                <div class="flex items-center justify-between mb-6">
                    <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                        <Clock class="w-6 h-6" />
                    </div>
                    <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Latency</span>
                </div>
                <div class="space-y-1">
                    <div class="text-4xl font-black text-slate-900 tracking-tighter">{{ pendingTasks }}</div>
                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasks Awaiting</div>
                </div>
            </div>
        </div>

        <div class="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-xl shadow-slate-200/20 hover:shadow-2xl transition-all group overflow-hidden relative">
            <div class="absolute -right-4 -top-4 w-20 h-20 bg-rose-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
            <div class="relative z-10 flex flex-col justify-between h-full">
                <div class="flex items-center justify-between mb-6">
                    <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner">
                        <AlertTriangle class="w-6 h-6" />
                    </div>
                    <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Risk</span>
                </div>
                <div class="space-y-1">
                    <div class="text-4xl font-black text-slate-900 tracking-tighter">{{ urgentTasks }}</div>
                    <div class="text-[10px) font-black text-slate-400 uppercase tracking-widest">Urgent Priority</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Charts Hub -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Weekly Trends -->
        <div class="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border-2 border-slate-50 shadow-xl shadow-slate-200/20">
            <div class="flex items-center justify-between mb-10">
                <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Engagement Velocity</h3>
                <span class="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-lg">Weekly Analytics</span>
            </div>
            <div class="h-[350px]">
                <Line :data="lineData" :options="lineOptions" />
            </div>
        </div>

        <!-- Distribution -->
        <div class="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-pulse"></div>
            <div class="relative z-10 flex flex-col h-full">
                <h3 class="text-xl font-black text-white uppercase italic tracking-tighter mb-10">Payload Status</h3>
                <div class="flex-1 flex flex-col items-center justify-center">
                    <div class="relative w-full h-[250px]">
                        <Doughnut :data="doughnutData" :options="doughnutOptions" />
                        <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span class="text-4xl font-black text-white tracking-tighter">{{ totalTasks }}</span>
                            <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Vectors</span>
                        </div>
                    </div>
                    <div class="mt-8 grid grid-cols-3 gap-4 w-full">
                        <div class="text-center">
                            <div class="text-xs font-black text-emerald-400">{{ completedTasks }}</div>
                            <div class="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Done</div>
                        </div>
                        <div class="text-center">
                            <div class="text-xs font-black text-blue-400">{{ tasksStore.tasks.filter(t => t.status === 'IN_PROGRESS').length }}</div>
                            <div class="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Active</div>
                        </div>
                        <div class="text-center">
                            <div class="text-xs font-black text-amber-400">{{ tasksStore.tasks.filter(t => t.status === 'PENDING').length }}</div>
                            <div class="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Wait</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Insights Floor -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Performers -->
        <div class="bg-white p-10 rounded-[2.5rem] border-2 border-slate-50 shadow-xl shadow-slate-200/20">
            <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">High Performance Units</h3>
            <div v-if="completedTasks > 0" class="h-[250px]">
                <Bar :data="barData" :options="barOptions" />
            </div>
            <div v-else class="h-[250px] flex items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl">
                <p class="text-slate-300 font-black uppercase text-[10px] tracking-widest text-center">No compliance data available in current frame</p>
            </div>
        </div>

        <!-- Activity Stream -->
        <div class="bg-white p-10 rounded-[2.5rem] border-2 border-slate-50 shadow-xl shadow-slate-200/20">
            <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">Vector Feed</h3>
            <div class="space-y-4">
                <div 
                    v-for="(item, i) in activityItems" 
                    :key="i"
                    class="flex items-start gap-5 p-5 rounded-3xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
                >
                    <div :class="['w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110', item.color]">
                        <component :is="item.icon" class="w-5 h-5" />
                    </div>
                    <div class="flex-1">
                        <p class="text-[12px] font-bold text-slate-700 leading-tight group-hover:text-slate-950 transition-colors">{{ item.text }}</p>
                        <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">{{ item.time }}</p>
                    </div>
                    <Zap class="w-4 h-4 text-slate-100 group-hover:text-primary-500 transition-colors" />
                </div>
            </div>
        </div>
    </div>
  </div>
</template>
