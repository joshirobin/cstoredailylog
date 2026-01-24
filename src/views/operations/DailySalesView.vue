<script setup lang="ts">
import { ref, computed } from 'vue';
import { db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useSalesStore, type DenominationCounts, type Check } from '../../stores/sales';
import { useAuthStore } from '../../stores/auth';
import { Save, AlertCircle, CheckCircle2, History, Plus, Trash2, Vault, DollarSign } from 'lucide-vue-next';
import CashDenominations from '../../components/CashDenominations.vue';

const salesStore = useSalesStore();
const authStore = useAuthStore();

const openingCash = ref<number>(0);
const closingCash = ref<number>(0);
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

const dailySales = computed(() => {
  return (closingCash.value - openingCash.value) - expenses.value;
});

const checksTotal = computed(() => {
  return checks.value.reduce((sum, check) => sum + (check.amount || 0), 0);
});

const safeTotal = computed(() => {
  return safeCash.value + checksTotal.value;
});

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
        openingCash: openingCash.value,
        openingDenominations: openingDetails.value,
        closingCash: closingCash.value,
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
    
    // Reset form totals
    openingCash.value = 0;
    closingCash.value = 0;
    safeCash.value = 0;
    checks.value = [];
    expenses.value = 0;
    notes.value = '';
    
    // Hide success message after 3 seconds
    setTimeout(() => { statusMessage.value = null }, 3000);
    
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
          <CashDenominations 
            label="Opening Float"
            v-model="openingCash"
            @update:details="(d) => openingDetails = d"
          />
          
          <CashDenominations 
            label="Closing Drawer"
            v-model="closingCash"
            @update:details="(d) => closingDetails = d"
          />
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
                <span class="font-mono text-white">${{ openingCash.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-surface-400">Closing</span>
                <span class="font-mono text-white">${{ closingCash.toFixed(2) }}</span>
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
            <span class="font-semibold">{{ isSubmitting ? 'Saving...' : 'Save Daily Log' }}</span>
          </button>
        </div>

        <!-- Status Message -->
        <div v-if="statusMessage" class="flex items-center gap-3 p-4 rounded-lg" :class="statusMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'">
          <CheckCircle2 v-if="statusMessage.type === 'success'" class="w-5 h-5" />
          <AlertCircle v-else class="w-5 h-5" />
          <span class="font-medium">{{ statusMessage.text }}</span>
        </div>
      </div>

      <!-- Recent Logs -->
      <div v-if="salesStore.logs.length > 0" class="glass-panel p-6">
        <div class="flex items-center gap-3 mb-4">
          <History class="w-5 h-5 text-surface-400" />
          <h3 class="text-lg font-bold text-white">Recent Logs (This Session)</h3>
        </div>
        <div class="space-y-3">
          <div v-for="log in salesStore.logs.slice(0, 5)" :key="log.id" class="flex items-center justify-between p-4 bg-surface-900/40 border border-surface-700/30 rounded-lg hover:border-primary-500/30 transition-colors">
            <div class="flex items-center gap-4">
              <div class="text-sm">
                <div class="text-surface-300 font-medium">{{ new Date(log.date).toLocaleTimeString() }}</div>
                <div class="text-xs text-surface-500">{{ new Date(log.date).toLocaleDateString() }}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-mono text-emerald-400 font-bold text-lg">${{ log.totalSales.toFixed(2) }}</div>
              <div class="text-xs text-surface-500">Net Sales</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
