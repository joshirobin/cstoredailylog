<script setup lang="ts">
import { ref, computed } from 'vue';
import { db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useSalesStore, type DenominationCounts, type Check } from '../../stores/sales';
import { useAuthStore } from '../../stores/auth';
import { Save, AlertCircle, CheckCircle2, History, Plus, Trash2, Vault, DollarSign, Calendar, ChevronDown, ChevronUp, Edit3, X } from 'lucide-vue-next';
import CashDenominations from '../../components/CashDenominations.vue';

const salesStore = useSalesStore();
const authStore = useAuthStore();

const openingCash = ref<number | 'custom'>(0);
const closingCash = ref<number | 'custom'>(0);
const customOpeningCash = ref<number>(0);
const customClosingCash = ref<number>(0);
const openingDetails = ref<DenominationCounts | undefined>(undefined);
const closingDetails = ref<DenominationCounts | undefined>(undefined);

// Safe Deposit
const safeCash = ref<number>(0);
const safeDetails = ref<DenominationCounts | undefined>(undefined);
const checks = ref<Check[]>([]);

const expenses = ref<number>(0); 
const notes = ref('');
const isSubmitting = ref(false);
const statusMessage = ref<{ type: 'success' | 'error', text: string } | null>(null);

// Edit mode
const editingLogId = ref<string | null>(null);
const isEditing = computed(() => editingLogId.value !== null);

// Date filtering
type DateFilter = 'today' | 'week' | 'month' | 'all';
const selectedFilter = ref<DateFilter>('all');
const expandedLogIds = ref<Set<string>>(new Set());

// Delete confirmation
const deleteConfirmLogId = ref<string | null>(null);

// Computed properties for actual numeric values
const openingCashAmount = computed(() => {
  return openingCash.value === 'custom' ? customOpeningCash.value : (openingCash.value as number);
});

const closingCashAmount = computed(() => {
  return closingCash.value === 'custom' ? customClosingCash.value : (closingCash.value as number);
});

const dailySales = computed(() => {
  return (closingCashAmount.value - openingCashAmount.value) - expenses.value;
});

const checksTotal = computed(() => {
  return checks.value.reduce((sum, check) => sum + (check.amount || 0), 0);
});

const safeTotal = computed(() => {
  return safeCash.value + checksTotal.value;
});

// Filtered logs based on date range
const filteredLogs = computed(() => {
  const now = new Date();
  let startDate: Date;

  switch (selectedFilter.value) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      return salesStore.logs;
  }

  return salesStore.getLogsByDateRange(startDate, new Date());
});

const toggleLogExpansion = (logId: string) => {
  if (expandedLogIds.value.has(logId)) {
    expandedLogIds.value.delete(logId);
  } else {
    expandedLogIds.value.add(logId);
  }
};

const loadLogForEditing = (log: any) => {
  editingLogId.value = log.id;
  openingCash.value = log.openingCash;
  openingDetails.value = log.openingDenominations;
  closingCash.value = log.closingCash;
  closingDetails.value = log.closingDenominations;
  expenses.value = log.expenses;
  notes.value = log.notes || '';
  safeCash.value = log.safeCash || 0;
  safeDetails.value = log.safeCashDetails;
  checks.value = log.checks || [];

  // Scroll to form
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
};

const cancelEdit = () => {
  editingLogId.value = null;
  resetForm();
};

const resetForm = () => {
  openingCash.value = 0;
  closingCash.value = 0;
  openingDetails.value = undefined;
  closingDetails.value = undefined;
  safeCash.value = 0;
  safeDetails.value = undefined;
  checks.value = [];
  expenses.value = 0;
  notes.value = '';
};

const confirmDelete = (logId: string) => {
  deleteConfirmLogId.value = logId;
};

const cancelDelete = () => {
  deleteConfirmLogId.value = null;
};

const deleteLog = () => {
  if (deleteConfirmLogId.value) {
    salesStore.deleteLog(deleteConfirmLogId.value);
    deleteConfirmLogId.value = null;
    statusMessage.value = { type: 'success', text: 'Log deleted successfully!' };
    setTimeout(() => { statusMessage.value = null; }, 3000);
  }
};

const addCheck = () => {
  checks.value.push({ number: '', amount: 0 });
};

const removeCheck = (index: number) => {
  checks.value.splice(index, 1);
};

const saveDailyLog = async () => {
  if (openingCash.value === 0 && closingCash.value === 0) {
    statusMessage.value = { type: 'error', text: 'Please enter details for Opening and Closing cash.' };
    return;
  }

  isSubmitting.value = true;
  statusMessage.value = null;

  try {
    const logData = {
        openingCash: openingCashAmount.value,
        openingDenominations: openingDetails.value,
        closingCash: closingCashAmount.value,
        closingDenominations: closingDetails.value,
        expenses: expenses.value,
        totalSales: dailySales.value,
        notes: notes.value,
        // Safe deposit data
        safeCash: safeCash.value,
        safeCashDetails: safeDetails.value,
        checks: checks.value.length > 0 ? checks.value : undefined,
        safeTotal: safeTotal.value
    };

    if (isEditing.value && editingLogId.value) {
      // Update existing log
      salesStore.updateLog(editingLogId.value, logData);
      statusMessage.value = { type: 'success', text: 'Daily sales log updated successfully!' };
      editingLogId.value = null;
    } else {
      // Create new log
      // Check if we are in Demo Mode
      if (authStore.user && 'uid' in authStore.user && authStore.user.uid.startsWith('demo-')) {
          // Save to Local Store
          salesStore.addLog(logData);
          // Simulate network delay
          await new Promise(r => setTimeout(r, 800));
      } else {
          // Save to Firestore
          await addDoc(collection(db, 'daily_sales'), {
              ...logData,
              date: serverTimestamp(),
              createdBy: authStore.user?.uid
          });
      }
      statusMessage.value = { type: 'success', text: 'Daily sales log saved successfully!' };
    }
    
    // Reset form
    resetForm();
    
    // Hide success message after 3 seconds
    setTimeout(() => { statusMessage.value = null; }, 3000);
    
  } catch (error) {
    console.error("Error adding document: ", error);
    statusMessage.value = { type: 'error', text: 'Failed to save log. Please try again.' };
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold font-display text-white">Daily Operations</h2>
        <p class="text-surface-400 text-sm">Track shift cash, deposits, and sales</p>
      </div>
      
      <!-- Quick Summary Badge -->
      <div class="glass-panel px-6 py-3">
        <div class="text-xs text-surface-400 uppercase tracking-wide mb-1">Net Sales</div>
        <div class="text-2xl font-bold font-mono" :class="dailySales >= 0 ? 'text-emerald-400' : 'text-red-500'">
          ${{ dailySales.toFixed(2) }}
        </div>
      </div>
    </div>

    <!-- Sales Log History Section -->
    <div v-if="salesStore.logs.length > 0" class="space-y-4">
      <!-- Date Filter Tabs -->
      <div class="glass-panel p-4">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <Calendar class="w-5 h-5 text-primary-400" />
            <h3 class="text-lg font-bold text-white">Sales History</h3>
            <span class="text-sm text-surface-400">({{ filteredLogs.length }} log{{ filteredLogs.length !== 1 ? 's' : '' }})</span>
          </div>
        </div>

        <!-- Filter Buttons -->
        <div class="flex flex-wrap gap-2">
          <button
            @click="selectedFilter = 'today'"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            :class="selectedFilter === 'today' ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-300 hover:bg-surface-700'"
          >
            Today
          </button>
          <button
            @click="selectedFilter = 'week'"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            :class="selectedFilter === 'week' ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-300 hover:bg-surface-700'"
          >
            Last 7 Days
          </button>
          <button
            @click="selectedFilter = 'month'"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            :class="selectedFilter === 'month' ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-300 hover:bg-surface-700'"
          >
            Last 30 Days
          </button>
          <button
            @click="selectedFilter = 'all'"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            :class="selectedFilter === 'all' ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-300 hover:bg-surface-700'"
          >
            All Time
          </button>
        </div>
      </div>

      <!-- Logs List -->
      <div class="space-y-3">
        <div 
          v-for="log in filteredLogs" 
          :key="log.id"
          class="glass-panel overflow-hidden transition-all"
        >
          <!-- Log Header - Always Visible -->
          <div 
            class="p-4 flex items-center justify-between cursor-pointer hover:bg-surface-800/30 transition-colors"
            @click="toggleLogExpansion(log.id)"
          >
            <div class="flex items-center gap-4 flex-1">
              <div class="bg-primary-500/10 p-3 rounded-lg">
                <History class="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <div class="font-semibold text-white">{{ new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</div>
                <div class="text-xs text-surface-500">{{ new Date(log.date).toLocaleTimeString() }}</div>
              </div>
            </div>
            
            <div class="flex items-center gap-4">
              <div class="text-right">
                <div class="text-xl font-bold font-mono text-emerald-400">${{ log.totalSales.toFixed(2) }}</div>
                <div class="text-xs text-surface-500">Net Sales</div>
              </div>
              
              <ChevronDown 
                v-if="!expandedLogIds.has(log.id)" 
                class="w-5 h-5 text-surface-400" 
              />
              <ChevronUp 
                v-else 
                class="w-5 h-5 text-primary-400" 
              />
            </div>
          </div>

          <!-- Expanded Details -->
          <div v-if="expandedLogIds.has(log.id)" class="border-t border-surface-700/50 p-4 bg-surface-900/30 space-y-4">
            <!-- Summary Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="bg-surface-800/50 rounded-lg p-3">
                <div class="text-xs text-surface-400 mb-1">Opening Cash</div>
                <div class="font-mono font-semibold text-white">${{ log.openingCash.toFixed(2) }}</div>
              </div>
              <div class="bg-surface-800/50 rounded-lg p-3">
                <div class="text-xs text-surface-400 mb-1">Closing Cash</div>
                <div class="font-mono font-semibold text-white">${{ log.closingCash.toFixed(2) }}</div>
              </div>
              <div class="bg-surface-800/50 rounded-lg p-3">
                <div class="text-xs text-surface-400 mb-1">Expenses</div>
                <div class="font-mono font-semibold text-red-400">${{ log.expenses.toFixed(2) }}</div>
              </div>
              <div class="bg-surface-800/50 rounded-lg p-3">
                <div class="text-xs text-surface-400 mb-1">Safe Total</div>
                <div class="font-mono font-semibold text-secondary-400">${{ (log.safeTotal || 0).toFixed(2) }}</div>
              </div>
            </div>

            <!-- Notes if present -->
            <div v-if="log.notes" class="bg-surface-800/30 rounded-lg p-3 border border-surface-700/30">
              <div class="text-xs text-surface-400 mb-1">Notes</div>
              <div class="text-sm text-surface-200">{{ log.notes }}</div>
            </div>

            <!-- Checks if present -->
            <div v-if="log.checks && log.checks.length > 0" class="bg-surface-800/30 rounded-lg p-3 border border-surface-700/30">
              <div class="text-xs text-surface-400 mb-2">Checks ({{ log.checks.length }})</div>
              <div class="space-y-1">
                <div v-for="(check, idx) in log.checks" :key="idx" class="flex justify-between text-sm">
                  <span class="text-surface-300">Check #{{ check.number }}</span>
                  <span class="font-mono text-white">${{ check.amount.toFixed(2) }}</span>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3 pt-2">
              <button 
                @click.stop="loadLogForEditing(log)"
                class="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-2"
              >
                <Edit3 class="w-4 h-4" />
                <span>Edit Log</span>
              </button>
              <button 
                @click.stop="confirmDelete(log.id)"
                class="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 rounded-lg text-sm py-2 flex items-center justify-center gap-2 transition-colors font-medium"
              >
                <Trash2 class="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredLogs.length === 0" class="glass-panel p-8 text-center">
          <Calendar class="w-12 h-12 text-surface-600 mx-auto mb-3" />
          <p class="text-surface-400">No logs found for the selected date range.</p>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <div v-if="deleteConfirmLogId" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" @click.self="cancelDelete">
      <div class="glass-panel p-6 max-w-md mx-4 border-2 border-red-500/20">
        <div class="flex items-start gap-4 mb-4">
          <div class="bg-red-500/10 p-3 rounded-lg">
            <AlertCircle class="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-white mb-1">Delete Sales Log?</h3>
            <p class="text-sm text-surface-400">This action cannot be undone. The log will be permanently removed.</p>
          </div>
        </div>
        <div class="flex gap-3">
          <button 
            @click="cancelDelete"
            class="flex-1 btn-secondary py-2.5"
          >
            Cancel
          </button>
          <button 
            @click="deleteLog"
            class="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 font-semibold transition-colors"
          >
            Delete Log
          </button>
        </div>
      </div>
    </div>

    <!-- Form Section Header -->
    <div class="flex items-center justify-between pt-4">
      <div class="flex items-center gap-3">
        <h3 class="text-xl font-bold text-white">
          {{ isEditing ? 'Edit Daily Log' : 'New Daily Log' }}
        </h3>
        <button 
          v-if="isEditing"
          @click="cancelEdit"
          class="text-sm text-surface-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          <X class="w-4 h-4" />
          <span>Cancel Edit</span>
        </button>
      </div>
    </div>

    <!-- Main Content - Single Column -->
    <div class="space-y-6">
      
      <!-- Section 1: Cash Counts -->
      <div class="glass-panel p-6 space-y-6">
        <div class="flex items-center gap-3 mb-4 pb-4 border-b border-surface-700/50">
          <div class="bg-primary-500/20 p-2.5 rounded-lg">
            <DollarSign class="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">Cash Register</h3>
            <p class="text-xs text-surface-400">Opening and closing drawer counts</p>
          </div>
        </div>

        <div class="space-y-6">
          <!-- Opening Float -->
          <div class="space-y-2">
            <label class="text-sm font-semibold text-surface-300">Opening Float</label>
            <div class="relative">
              <span class="absolute left-4 top-3.5 text-surface-500 z-10">$</span>
              <select 
                v-model.number="openingCash"
                class="w-full bg-surface-900 border border-surface-700 rounded-lg px-4 py-3 pl-8 text-base text-white focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 appearance-none cursor-pointer"
              >
                <option :value="0">Select amount...</option>
                <option :value="50">$50.00</option>
                <option :value="100">$100.00</option>
                <option :value="150">$150.00</option>
                <option :value="200">$200.00</option>
                <option :value="250">$250.00</option>
                <option :value="300">$300.00</option>
                <option :value="500">$500.00</option>
                <option :value="1000">$1,000.00</option>
                <option value="custom">Custom Amount</option>
              </select>
              <ChevronDown class="absolute right-4 top-3.5 w-5 h-5 text-surface-500 pointer-events-none" />
            </div>
            <!-- Custom amount input for opening cash -->
            <div v-if="openingCash === 'custom'" class="relative mt-2">
              <span class="absolute left-4 top-3 text-surface-500">$</span>
              <input 
                v-model.number="customOpeningCash"
                type="number" 
                step="0.01"
                placeholder="Enter custom amount"
                class="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 pl-8 text-base text-white placeholder-surface-600 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
                @blur="openingCash = customOpeningCash || 0"
              />
            </div>
          </div>
          
          <!-- Closing Drawer -->
          <div class="space-y-2">
            <label class="text-sm font-semibold text-surface-300">Closing Drawer</label>
            <div class="relative">
              <span class="absolute left-4 top-3.5 text-surface-500 z-10">$</span>
              <select 
                v-model.number="closingCash"
                class="w-full bg-surface-900 border border-surface-700 rounded-lg px-4 py-3 pl-8 text-base text-white focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 appearance-none cursor-pointer"
              >
                <option :value="0">Select amount...</option>
                <option :value="50">$50.00</option>
                <option :value="100">$100.00</option>
                <option :value="150">$150.00</option>
                <option :value="200">$200.00</option>
                <option :value="250">$250.00</option>
                <option :value="300">$300.00</option>
                <option :value="500">$500.00</option>
                <option :value="1000">$1,000.00</option>
                <option value="custom">Custom Amount</option>
              </select>
              <ChevronDown class="absolute right-4 top-3.5 w-5 h-5 text-surface-500 pointer-events-none" />
            </div>
            <!-- Custom amount input for closing cash -->
            <div v-if="closingCash === 'custom'" class="relative mt-2">
              <span class="absolute left-4 top-3 text-surface-500">$</span>
              <input 
                v-model.number="customClosingCash"
                type="number" 
                step="0.01"
                placeholder="Enter custom amount"
                class="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 pl-8 text-base text-white placeholder-surface-600 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
                @blur="closingCash = customClosingCash || 0"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Section 2: Safe Deposit -->
      <div class="glass-panel p-6 space-y-6">
        <div class="flex items-center justify-between mb-4 pb-4 border-b border-surface-700/50">
          <div class="flex items-center gap-3">
            <div class="bg-secondary-500/20 p-2.5 rounded-lg">
              <Vault class="w-6 h-6 text-secondary-400" />
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">Safe Deposit</h3>
              <p class="text-xs text-surface-400">Cash and checks to deposit</p>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs text-surface-400 uppercase tracking-wide">Total</div>
            <div class="text-xl font-bold font-mono text-secondary-400">${{ safeTotal.toFixed(2) }}</div>
          </div>
        </div>

        <!-- Safe Cash -->
        <CashDenominations 
          label="Deposit Cash"
          v-model="safeCash"
          @update:details="(d) => safeDetails = d"
        />

        <!-- Checks -->
        <div class="bg-surface-900/30 border border-surface-700/50 rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-sm font-bold text-white">Checks</h4>
            <button 
              @click="addCheck"
              class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>Add Check</span>
            </button>
          </div>

          <div v-if="checks.length === 0" class="text-center py-6 text-surface-500 text-sm">
            No checks added
          </div>

          <div v-else class="space-y-3">
            <div v-for="(check, index) in checks" :key="index" class="flex items-center gap-3">
              <input 
                v-model="check.number" 
                type="text" 
                placeholder="Check #"
                class="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-4 py-2.5 text-base text-white placeholder-surface-600 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
              />
              <div class="flex-1 relative">
                <span class="absolute left-4 top-2.5 text-surface-500 text-sm">$</span>
                <input 
                  v-model.number="check.amount" 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  class="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-2.5 pl-8 text-base text-white placeholder-surface-600 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
                />
              </div>
              <button 
                @click="removeCheck(index)"
                class="p-2 text-surface-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>

            <div class="flex justify-between items-center pt-3 border-t border-surface-700/50">
              <span class="text-sm text-surface-400">Checks Total</span>
              <span class="font-mono text-white font-semibold">${{ checksTotal.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 3: Expenses & Summary -->
      <div class="glass-panel p-6 space-y-6">
        <h3 class="text-lg font-bold text-white mb-4">Additional Details</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Expenses -->
          <div class="space-y-2">
            <label class="text-sm font-semibold text-surface-300">Expenses / Payouts</label>
            <div class="relative">
              <span class="absolute left-4 top-3 text-surface-500">$</span>
              <input 
                v-model.number="expenses" 
                type="number" 
                step="0.01"
                class="w-full bg-surface-900 border border-surface-700 rounded-lg px-4 py-3 pl-8 text-base text-white focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <!-- Summary -->
          <div class="bg-surface-900/50 border border-surface-700/50 rounded-xl p-4">
            <h4 class="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-3">Summary</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-surface-400">Opening</span>
                <span class="font-mono text-white">${{ openingCashAmount.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-surface-400">Closing</span>
                <span class="font-mono text-white">${{ closingCashAmount.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between border-t border-surface-700 pt-2">
                <span class="text-surface-400">Expenses</span>
                <span class="font-mono text-red-400">-${{ expenses.toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-surface-300">Notes (Optional)</label>
          <textarea 
            v-model="notes" 
            class="w-full bg-surface-900 border border-surface-700 rounded-lg px-4 py-3 text-base text-white placeholder-surface-600 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 min-h-[100px]" 
            placeholder="Any discrepancies or maintenance notes..."
          ></textarea>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-4 pt-4">
          <button 
            @click="saveDailyLog"
            :disabled="isSubmitting"
            class="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
          >
            <Save v-if="!isSubmitting" class="w-5 h-5" />
            <span class="font-semibold">
              {{ isSubmitting ? 'Saving...' : (isEditing ? 'Update Log' : 'Save Daily Log') }}
            </span>
          </button>
        </div>

        <!-- Status Message -->
        <div v-if="statusMessage" class="flex items-center gap-3 p-4 rounded-lg" :class="statusMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'">
          <CheckCircle2 v-if="statusMessage.type === 'success'" class="w-5 h-5" />
          <AlertCircle v-else class="w-5 h-5" />
          <span class="font-medium">{{ statusMessage.text }}</span>
        </div>
      </div>

    </div>
  </div>
</template>
