<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useEmployeesStore, type Employee } from '../../stores/employees';
import { useTimesheetsStore } from '../../stores/timesheets';
import { 
  Users, Plus, Mail, Phone, Briefcase, 
  Calendar, Edit2, Trash2, X,
  Search, Filter, CheckCircle, Clock,
  Award
} from 'lucide-vue-next';
import EmployeeScorecard from '../../components/employees/EmployeeScorecard.vue';
import { useTasksStore } from '../../stores/tasks';
import { useShiftStore } from '../../stores/shifts';


const employeesStore = useEmployeesStore();
const timesheetsStore = useTimesheetsStore();
const searchQuery = ref('');
const isModalOpen = ref(false);
const editingEmployee = ref<Partial<Employee> | null>(null);
const tasksStore = useTasksStore();
const shiftsStore = useShiftStore();
const showScorecardModal = ref(false);
const selectedEmployeeForScorecard = ref<Employee | null>(null);


const employeeForm = ref<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  hourlyRate: number;
  hireDate: string;
  status: 'Active' | 'Inactive';
  pin: string;
  role: 'Admin' | 'Manager' | 'Assistant Manager' | 'Shift Manager' | 'Cashier' | 'Stocker';
}>({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  position: '',
  hourlyRate: 0,
  hireDate: new Date().toISOString().substring(0, 10),
  status: 'Active',
  pin: '',
  role: 'Cashier'
});

onMounted(() => {
  Promise.all([
    employeesStore.fetchEmployees(),
    timesheetsStore.fetchTimeLogs(),
    tasksStore.fetchTasks(),
    shiftsStore.fetchShifts()
  ]);
});

const calculateEmployeeStats = (employeeId: string) => {
    // Semi-random but deterministic for the demo
    const seed = employeeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const taskCompletion = Math.round(70 + (seed % 30));
    const punctuality = Math.round(80 + (seed % 20));
    const reliability = Math.round(85 + (seed % 15));
    
    return {
        taskCompletion,
        punctuality,
        reliability,
        avgShiftDuration: 8.2
    };
};

const openScorecard = (employee: Employee) => {
    selectedEmployeeForScorecard.value = employee;
    showScorecardModal.value = true;
};


const employeeHours = computed(() => {
    const hoursMap: Record<string, number> = {};
    timesheetsStore.timeLogs.forEach(log => {
        if (log.totalHours) {
            hoursMap[log.employeeId] = (hoursMap[log.employeeId] || 0) + log.totalHours;
        }
    });
    return hoursMap;
});

const openModal = (employee?: Employee) => {
  if (employee) {
    editingEmployee.value = employee;
    employeeForm.value = {
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      phone: employee.phone || '',
      position: employee.position || '',
      hourlyRate: employee.hourlyRate || 0,
      hireDate: employee.hireDate || new Date().toISOString().substring(0, 10),
      status: employee.status || 'Active',
      pin: employee.pin || '',
      role: employee.role || 'Cashier'
    };
  } else {
    editingEmployee.value = null;
    employeeForm.value = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      hourlyRate: 0,
      hireDate: new Date().toISOString().substring(0, 10),
      status: 'Active',
      pin: '',
      role: 'Cashier'
    };
  }
  isModalOpen.value = true;
};

const handleSubmit = async () => {
  try {
    if (editingEmployee.value?.id) {
      await employeesStore.updateEmployee(editingEmployee.value.id, employeeForm.value);
    } else {
      const newId = await employeesStore.addEmployee(employeeForm.value);
      // Wait for the store to update so we have the full employee object
      const newEmployee = employeesStore.employees.find(e => e.id === newId);
      if (newEmployee) {
        try {
          await employeesStore.sendWelcomeEmail(newEmployee);
          alert(`Employee registered successfully! Welcome email sent to ${newEmployee.email}.`);
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          alert('Employee registered, but failed to send welcome email. Please check server logs.');
        }
      }
    }
    isModalOpen.value = false;
  } catch (error: any) {
    console.error('Error saving employee:', error);
    alert(`Error saving employee: ${error.message || 'Unknown error'}`);
  }
};


const handleDelete = async (id: string) => {
  if (confirm('Are you sure you want to delete this employee? This will not remove their historical time logs.')) {
    await employeesStore.deleteEmployee(id);
  }
};

const filteredEmployees = computed(() => {
  return employeesStore.employees.filter(e => 
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    e.position.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold font-display text-slate-900">Employee Management</h2>
        <p class="text-slate-500 text-sm">Manage your store staff, positions, and payroll details.</p>
      </div>
      <button @click="openModal()" class="btn-primary flex items-center justify-center gap-2">
        <Plus class="w-4 h-4" />
        <span>Add Employee</span>
      </button>
    </div>

    <!-- Stats Summary -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="glass-panel p-6 flex items-center gap-4">
        <div class="bg-primary-50 p-3 rounded-2xl text-primary-600">
          <Users class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Staff</p>
          <p class="text-2xl font-black text-slate-900">{{ employeesStore.employees.length }}</p>
        </div>
      </div>
      <div class="glass-panel p-6 flex items-center gap-4">
        <div class="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
          <CheckCircle class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Active</p>
          <p class="text-2xl font-black text-slate-900">
            {{ employeesStore.employees.filter(e => e.status === 'Active').length }}
          </p>
        </div>
      </div>
      <div class="glass-panel p-6 flex items-center gap-4">
        <div class="bg-slate-100 p-3 rounded-2xl text-slate-600">
          <Briefcase class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Positions</p>
          <p class="text-2xl font-black text-slate-900">
            {{ new Set(employeesStore.employees.map(e => e.position)).size }}
          </p>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search employees by name or position..." 
          class="input-field w-full pl-10"
        />
      </div>
      <button class="btn-secondary flex items-center gap-2">
        <Filter class="w-4 h-4" />
        <span>Filter</span>
      </button>
    </div>

    <!-- Employees Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div v-if="employeesStore.loading" class="col-span-full py-20 text-center">
        <div class="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-slate-500">Loading staff directory...</p>
      </div>

      <div v-else-if="filteredEmployees.length === 0" class="col-span-full py-20 text-center glass-panel">
        <Users class="w-12 h-12 text-slate-200 mx-auto mb-4" />
        <p class="text-slate-500 font-medium">No employees found.</p>
      </div>

      <div 
        v-for="employee in filteredEmployees" 
        :key="employee.id"
        class="glass-panel p-6 hover:shadow-2xl hover:translate-y-[-4px] transition-all duration-300 group"
      >
        <div class="flex justify-between items-start mb-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
              {{ employee.firstName[0] }}{{ employee.lastName[0] }}
            </div>
            <div>
              <h3 class="font-bold text-slate-900">{{ employee.firstName }} {{ employee.lastName }}</h3>
              <p class="text-xs font-medium text-primary-600 uppercase tracking-wider">{{ employee.position }}</p>
            </div>
          </div>
          <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button @click="openModal(employee)" class="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
              <Edit2 class="w-4 h-4" />
            </button>
            <button @click="handleDelete(employee.id)" class="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div class="space-y-3 pt-4 border-t border-slate-50">
          <div class="flex items-center gap-3 text-sm text-slate-600">
            <Mail class="w-4 h-4 text-slate-400" />
            <span>{{ employee.email }}</span>
          </div>
          <div class="flex items-center gap-3 text-sm text-slate-600">
            <Phone class="w-4 h-4 text-slate-400" />
            <span>{{ employee.phone }}</span>
          </div>
          <div class="flex items-center gap-3 text-sm text-slate-600">
            <Calendar class="w-4 h-4 text-slate-400" />
            <span>Joined {{ new Date(employee.hireDate).toLocaleDateString() }}</span>
          </div>
        </div>

        <div class="mt-6 grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
          <div class="flex flex-col">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Hourly Rate</span>
            <span class="text-sm font-bold text-slate-900">${{ employee.hourlyRate.toFixed(2) }}/hr</span>
          </div>
          <div class="flex flex-col text-right">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total Hours</span>
            <span class="text-sm font-black text-slate-900 flex items-center justify-end gap-1">
                <Clock class="w-3 h-3 text-slate-400" />
                {{ (employeeHours[employee.id] || 0).toFixed(2) }}
            </span>
          </div>
        </div>
        
        <div class="mt-4 flex justify-between items-center">
             <span 
                class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                :class="employee.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'"
            >
                {{ employee.status }}
            </span>
            <button 
                @click="openScorecard(employee)"
                class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 transition-colors"
            >
                <Award class="w-3.5 h-3.5" />
                View Analytics
            </button>
        </div>
    </div>
</div>

<!-- Scorecard Modal -->
<div v-if="showScorecardModal && selectedEmployeeForScorecard" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md" @click="showScorecardModal = false"></div>
    <div class="bg-white rounded-[3.5rem] w-full max-w-xl relative z-10 overflow-hidden animate-in zoom-in duration-300 shadow-2xl">
        <div class="p-10 pb-0 flex justify-between items-start">
            <div class="flex items-center gap-5">
                <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-600">
                    {{ selectedEmployeeForScorecard.firstName[0] }}{{ selectedEmployeeForScorecard.lastName[0] }}
                </div>
                <div>
                    <h3 class="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">{{ selectedEmployeeForScorecard.firstName }} {{ selectedEmployeeForScorecard.lastName }}</h3>
                    <p class="text-[10px] font-black text-primary-600 uppercase tracking-widest">Operational Vector Analytics</p>
                </div>
            </div>
            <button @click="showScorecardModal = false" class="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                <X class="w-6 h-6" />
            </button>
        </div>
        
        <div class="p-10">
            <EmployeeScorecard 
                :employeeId="selectedEmployeeForScorecard.id" 
                :stats="calculateEmployeeStats(selectedEmployeeForScorecard.id)" 
            />
            
            <div class="mt-8 flex gap-4">
                <button @click="showScorecardModal = false" class="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Close Report</button>
                <button class="px-8 py-5 border-2 border-slate-100 rounded-3xl text-slate-400 hover:text-slate-900 hover:border-slate-200 transition-all">
                    <Filter class="w-5 h-5" />
                </button>
            </div>
        </div>
    </div>
</div>


    <!-- Employee Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="isModalOpen = false"></div>
      <div class="glass-panel w-full max-w-2xl relative z-10 bg-white overflow-hidden animate-in fade-in zoom-in duration-300">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 class="font-bold text-slate-900">{{ editingEmployee ? 'Edit Employee' : 'Add New Employee' }}</h3>
          <button @click="isModalOpen = false" class="text-slate-400 hover:text-slate-900 border-none bg-transparent p-0"><CheckCircle class="w-6 h-6" /></button>
        </div>
        
        <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">First Name</label>
              <input v-model="employeeForm.firstName" type="text" required class="input-field w-full" placeholder="John" />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Last Name</label>
              <input v-model="employeeForm.lastName" type="text" required class="input-field w-full" placeholder="Doe" />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
              <input v-model="employeeForm.email" type="email" required class="input-field w-full" placeholder="john@example.com" />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Phone Number</label>
              <input v-model="employeeForm.phone" type="tel" required class="input-field w-full" placeholder="(555) 000-0000" />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Position</label>
              <select v-model="employeeForm.position" required class="input-field w-full">
                <option value="">Select Position...</option>
                <option value="Store Manager">Store Manager</option>
                <option value="Assistant Manager">Assistant Manager</option>
                <option value="Cashier">Cashier</option>
                <option value="Stock Associate">Stock Associate</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Hourly Rate ($)</label>
              <input v-model.number="employeeForm.hourlyRate" type="number" step="0.01" required class="input-field w-full" />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Hire Date</label>
              <input v-model="employeeForm.hireDate" type="date" required class="input-field w-full" />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Status</label>
              <select v-model="employeeForm.status" class="input-field w-full">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div class="space-y-1.5">
               <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Clock-In PIN</label>
               <input v-model="employeeForm.pin" type="text" maxlength="4" placeholder="1234" class="input-field w-full font-mono tracking-widest" />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">System Role</label>
              <select v-model="employeeForm.role" required class="input-field w-full">
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Assistant Manager">Assistant Manager</option>
                <option value="Shift Manager">Shift Manager</option>
                <option value="Cashier">Cashier</option>
                <option value="Stocker">Stocker</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" @click="isModalOpen = false" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary">
              {{ editingEmployee ? 'Update Details' : 'Register Employee' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
