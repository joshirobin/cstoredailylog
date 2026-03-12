<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import type { SalesLog } from '../../../stores/sales';
import { useLocationsStore } from '../../../stores/locations';
import { Calculator, Wallet, Ticket, Fuel, Landmark, CheckSquare, ArrowRight, ArrowLeft } from 'lucide-vue-next';

const props = defineProps<{
    log: Partial<SalesLog>;
    isEditable?: boolean;
}>();

const locationsStore = useLocationsStore();

const activeStep = ref(1);

const initFormData = () => {
    if (props.log && !props.log.pdiForm) {
        props.log.pdiForm = {
            storeName: locationsStore.activeLocation?.name || '',
            storeNumber: '',
            date: props.log.date || new Date().toISOString().split('T')[0],
            managerName: props.log.managerOnDuty || '',
            shift: 'Full Day',
            
            // 1. SALES
            taxableSales: 0, nonTaxable: 0, salesTax: 0, fuelSalesTotal: 0, lotterySales: 0, otherSales: 0,
            
            // 2. PAYMENT
            cashSales: 0, creditSales: 0, debitSales: 0, ebtSales: 0, arSales: 0, arPaid: 0, checkSales: 0, otherPayments: 0,
            
            // 3. RECONCILIATION
            openingFloat: 0, closingFloat: 0, safeCashAdded: 0, safeDrops: 0, bankDeposit: 0, actualCashCounted: 0, actualCheckCounted: 0,
            
            // 4. SAFE
            openingSafe: 0, cashDropsSafe: 0, removedForDeposit: 0, actualSafeCount: 0,
            
            // 5. LOTTERY
            lotteryOpen: 0, lotteryPaidOut: 0, lotterySettled: 0, actualLottery: 0,
            
            // 6. FUEL
            regGal: 0, regSales: 0, premGal: 0, premSales: 0, dieselGal: 0, dieselSales: 0,
            
            // 7. PAID OUT
            paidOuts: [
                { time: '', description: '', amount: 0, employee: '' }
            ],
            
            // 8. DEPOSIT
            cashDeposit: 0, coinDeposit: 0, checkDeposit: 0, bagNumber: '',
            
            // 11. VERIFICATION
            verifyCash: false, verifySafe: false, verifyLottery: false, verifyDeposit: false,
            managerSig: '', employeeSig: '', signDate: props.log.date || new Date().toISOString().split('T')[0]
        };
    }
};

watch(() => props.log, () => {
    if (props.isEditable) {
        initFormData();
        activeStep.value = 1; // Reset to step 1 on new log
    }
}, { immediate: true, deep: true });

// Computed Properties for Auto-Calcs
const pdi = computed(() => props.log.pdiForm || {});

const totalSalesDisplay = computed(() => {
    return (pdi.value.taxableSales || 0) + (pdi.value.nonTaxable || 0) + (pdi.value.salesTax || 0) + 
           (pdi.value.fuelSalesTotal || 0) + (pdi.value.lotterySales || 0) + (pdi.value.otherSales || 0);
});

const totalIncome = computed(() => {
    return (pdi.value.cashSales || 0) + (pdi.value.creditSales || 0) + (pdi.value.debitSales || 0) + 
           (pdi.value.ebtSales || 0) + (pdi.value.arSales || 0) + (pdi.value.arPaid || 0) + (pdi.value.checkSales || 0) + (pdi.value.otherPayments || 0);
});

const paidOutsTotal = computed(() => {
    if (!pdi.value.paidOuts) return 0;
    return pdi.value.paidOuts.reduce((sum: number, po: any) => sum + (po.amount || 0), 0);
});

const totalExpected = computed(() => {
    return (pdi.value.openingFloat || 0) + (pdi.value.cashSales || 0) + (pdi.value.checkSales || 0) + (pdi.value.arPaid || 0) + (pdi.value.safeCashAdded || 0) - paidOutsTotal.value;
});

const totalPhysical = computed(() => {
    return (pdi.value.actualCashCounted || 0) + (pdi.value.actualCheckCounted || 0) + (pdi.value.bankDeposit || 0) + (pdi.value.safeDrops || 0);
});

const overShortRegister = computed(() => {
    return totalPhysical.value - totalExpected.value;
});

const expectedSafe = computed(() => {
    return (pdi.value.openingSafe || 0) + (pdi.value.cashDropsSafe || 0) - (pdi.value.removedForDeposit || 0);
});

const safeOS = computed(() => {
    return (pdi.value.actualSafeCount || 0) - expectedSafe.value;
});

const expectedLottery = computed(() => {
    return (pdi.value.lotteryOpen || 0) + (pdi.value.lotterySales || 0) - (pdi.value.lotteryPaidOut || 0) - (pdi.value.lotterySettled || 0);
});

const lotteryOS = computed(() => {
    return (pdi.value.actualLottery || 0) - expectedLottery.value;
});

const totalFuelCalc = computed(() => {
    return (pdi.value.regSales || 0) + (pdi.value.premSales || 0) + (pdi.value.dieselSales || 0);
});

const totalDeposit = computed(() => {
    return (pdi.value.cashDeposit || 0) + (pdi.value.coinDeposit || 0) + (pdi.value.checkDeposit || 0);
});

const cashRemainingReg = computed(() => {
    return (pdi.value.cashSales || 0) - paidOutsTotal.value - totalDeposit.value;
});

const cashRemainingSafe = computed(() => {
    return (pdi.value.openingSafe || 0) + (pdi.value.cashDropsSafe || 0) - (pdi.value.removedForDeposit || 0);
});

const totalStoreOS = computed(() => {
    return overShortRegister.value + safeOS.value + lotteryOS.value;
});

const addPaidOut = () => {
    pdi.value.paidOuts.push({ time: '', description: '', amount: 0, employee: '' });
};

const removePaidOut = (idx: number) => {
    pdi.value.paidOuts.splice(idx, 1);
};
</script>

<template>
  <div class="pdi-form-container" v-if="props.log.pdiForm">

    <!-- Stepper Navigation (Only in Editable Mode or if we want it everywhere) -->
    <div class="flex flex-wrap gap-2 mb-8 pb-4 border-b border-slate-100" v-if="props.isEditable">
        <button v-for="step in [
            {id: 1, title: 'POS & Sales', icon: Calculator},
            {id: 2, title: 'Cash Control', icon: Wallet},
            {id: 3, title: 'Safe & Lottery', icon: Ticket},
            {id: 4, title: 'Fuel & Payouts', icon: Fuel},
            {id: 5, title: 'Deposit & OS', icon: Landmark},
            {id: 6, title: 'Verify & Sign', icon: CheckSquare}
        ]" :key="step.id" 
        @click="activeStep = step.id"
        class="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
        :class="activeStep === step.id ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900'"
        >
            <component :is="step.icon" class="w-4 h-4" />
            <span class="hidden sm:inline">{{ step.id }}. {{ step.title }}</span>
        </button>
    </div>

    <!-- STEP 1: STORE & SALES -->
    <div v-show="!props.isEditable || activeStep === 1" class="animate-in fade-in slide-in-from-right-4 duration-500">
        <!-- STORE HEADER -->
        <div class="store-header">
        <div class="field">
            <label>Store Name</label> 
            <input v-if="props.isEditable" type="text" placeholder="e.g. Speedway #432" v-model="pdi.storeName">
            <span class="view-val" v-else>{{ pdi.storeName || '-' }}</span>
        </div>
        <div class="field">
            <label>Store #</label> 
            <input v-if="props.isEditable" type="text" placeholder="4321" v-model="pdi.storeNumber">
            <span class="view-val" v-else>{{ pdi.storeNumber || '-' }}</span>
        </div>
        <div class="field">
            <label>Date</label> 
            <input v-if="props.isEditable" type="date" v-model="pdi.date">
            <span class="view-val" v-else>{{ pdi.date || '-' }}</span>
        </div>
        <div class="field">
            <label>Manager</label> 
            <input v-if="props.isEditable" type="text" placeholder="Full name" v-model="pdi.managerName">
            <span class="view-val" v-else>{{ pdi.managerName || '-' }}</span>
        </div>
        
        <div class="shift-group" v-if="props.isEditable">
            <span class="shift-option">
                <input type="radio" value="Morning" v-model="pdi.shift" id="shiftMorning"> 
                <label for="shiftMorning">🌅 Morning</label>
            </span>
            <span class="shift-option">
                <input type="radio" value="Afternoon" v-model="pdi.shift" id="shiftAfternoon"> 
                <label for="shiftAfternoon">☀️ Afternoon</label>
            </span>
            <span class="shift-option">
                <input type="radio" value="Night" v-model="pdi.shift" id="shiftNight"> 
                <label for="shiftNight">🌙 Night</label>
            </span>
            <span class="shift-option">
                <input type="radio" value="Full Day" v-model="pdi.shift" id="shiftFull"> 
                <label for="shiftFull">📅 Full Day</label>
            </span>
        </div>
        <div class="field" v-else>
            <label>Shift</label>
            <span class="view-val">{{ pdi.shift || 'Full Day' }}</span>
        </div>
    </div>

    <!-- 1. SALES SUMMARY (POS Z) -->
    <h2>1️⃣ Sales summary (Z report)</h2>
    <div class="section-card grid-3">
        <div class="input-row"><label>Taxable Sales ($)</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.taxableSales"><span class="view-val" v-else>${{ (pdi.taxableSales || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Non‑Taxable Sales ($)</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.nonTaxable"><span class="view-val" v-else>${{ (pdi.nonTaxable || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Sales Tax Collected ($)</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.salesTax"><span class="view-val" v-else>${{ (pdi.salesTax || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Fuel Sales ($)</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.fuelSalesTotal"><span class="view-val" v-else>${{ (pdi.fuelSalesTotal || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Lottery Sales ($)</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.lotterySales"><span class="view-val" v-else>${{ (pdi.lotterySales || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Other Sales ($)</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.otherSales"><span class="view-val" v-else>${{ (pdi.otherSales || 0).toFixed(2) }}</span></div>
        <div class="input-row md-col-span-3 total-hl">
            <strong>TOTAL SALES: $ <span>{{ totalSalesDisplay.toFixed(2) }}</span></strong>
        </div>
    </div>

    <!-- 2. PAYMENT SUMMARY -->
    <h2>2️⃣ Payment summary</h2>
    <div class="section-card grid-3">
        <div class="input-row"><label>Cash Sales ($)</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.cashSales"><span class="view-val" v-else>${{ (pdi.cashSales || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Credit Card ($)</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.creditSales"><span class="view-val" v-else>${{ (pdi.creditSales || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Debit Card ($)</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.debitSales"><span class="view-val" v-else>${{ (pdi.debitSales || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>EBT ($)</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.ebtSales"><span class="view-val" v-else>${{ (pdi.ebtSales || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>AR / Charge ($)</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.arSales"><span class="view-val" v-else>${{ (pdi.arSales || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Acct Paid / ROA ($)</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.arPaid"><span class="view-val" v-else>${{ (pdi.arPaid || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Check ($)</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.checkSales"><span class="view-val" v-else>${{ (pdi.checkSales || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Other ($)</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.otherPayments"><span class="view-val" v-else>${{ (pdi.otherPayments || 0).toFixed(2) }}</span></div>
        <div class="input-row md-col-span-2"><strong>Total income in: $ <span>{{ totalIncome.toFixed(2) }}</span></strong></div>
    </div>
    </div>

    <!-- STEP 2: CASH RECONCILIATION -->
    <div v-show="!props.isEditable || activeStep === 2" class="animate-in fade-in slide-in-from-right-4 duration-500">
    <h2>3️⃣ Cash reconciliation · Over/Short</h2>
    <div class="section-card">
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            <!-- System / Expected -->
            <div class="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 class="text-sm font-bold uppercase text-slate-800 border-b pb-2 mb-4">1. What you should have (System)</h3>
                <div class="space-y-3">
                    <div class="flex justify-between items-center"><label class="text-sm text-slate-600">Starting Float (Till)</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.openingFloat" class="w-24 p-1 text-right border border-slate-300 rounded"><span class="view-val inline-block text-right w-24" v-else>${{ (pdi.openingFloat || 0).toFixed(2) }}</span></div>
                    <div class="flex justify-between items-center"><label class="text-sm text-slate-600">Cash Sales <span class="text-xs text-sky-500 ml-1">(auto)</span></label> <span class="font-mono text-slate-700 w-24 text-right">${{ (pdi.cashSales || 0).toFixed(2) }}</span></div>
                    <div class="flex justify-between items-center"><label class="text-sm text-slate-600">Check Sales <span class="text-xs text-sky-500 ml-1">(auto)</span></label> <span class="font-mono text-slate-700 w-24 text-right">${{ (pdi.checkSales || 0).toFixed(2) }}</span></div>
                    <div class="flex justify-between items-center"><label class="text-sm text-slate-600">Acct Paid / ROA <span class="text-xs text-sky-500 ml-1">(auto)</span></label> <span class="font-mono text-slate-700 w-24 text-right">${{ (pdi.arPaid || 0).toFixed(2) }}</span></div>
                    <div class="flex justify-between items-center"><label class="text-sm text-slate-600">Extra Cash Added</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.safeCashAdded" class="w-24 p-1 text-right border border-slate-300 rounded"><span class="view-val inline-block text-right w-24" v-else>${{ (pdi.safeCashAdded || 0).toFixed(2) }}</span></div>
                    <div class="border-t border-slate-200 pt-2 my-2"></div>
                    <div class="flex justify-between items-center text-rose-600"><label class="text-sm font-medium">Minus Paid Outs <span class="text-xs ml-1">(auto)</span></label> <span class="font-mono w-24 text-right">-${{ paidOutsTotal.toFixed(2) }}</span></div>
                    <div class="flex justify-between items-center font-bold text-slate-800 pt-3 border-t border-slate-300"><label>Total Expected</label> <span class="w-24 text-right">${{ totalExpected.toFixed(2) }}</span></div>
                </div>
            </div>

            <!-- Actual / Physical -->
            <div class="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 class="text-sm font-bold uppercase text-slate-800 border-b pb-2 mb-4">2. What you actually have (Physical)</h3>
                <div class="space-y-3">
                    <div class="flex justify-between items-center"><label class="text-sm text-slate-600 font-medium">Actual Cash in Drawer</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.actualCashCounted" class="w-24 p-1 text-right border rounded font-bold text-sky-700 bg-sky-50 border-sky-300 outline-none focus:ring-2 ring-sky-500"><span class="view-val inline-block text-right w-24 font-bold text-sky-700" v-else>${{ (pdi.actualCashCounted || 0).toFixed(2) }}</span></div>
                    <div class="flex justify-between items-center"><label class="text-sm text-slate-600">Actual Checks in Drawer</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.actualCheckCounted" class="w-24 p-1 text-right border border-slate-300 rounded text-sky-700"><span class="view-val inline-block text-right w-24" v-else>${{ (pdi.actualCheckCounted || 0).toFixed(2) }}</span></div>
                    <div class="flex justify-between items-center"><label class="text-sm text-amber-600">Closing Float Kept <span class="text-xs ml-1">(info only)</span></label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.closingFloat" class="w-24 p-1 text-right border border-amber-200 bg-amber-50 rounded"><span class="view-val inline-block text-right w-24 text-amber-600" v-else>${{ (pdi.closingFloat || 0).toFixed(2) }}</span></div>
                    
                    <div class="text-[10px] font-bold text-slate-400 mt-2 mb-1 uppercase tracking-wider">Cash Already Removed</div>
                    <div class="flex justify-between items-center"><label class="text-sm text-slate-600">Bank Deposit Done</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.bankDeposit" class="w-24 p-1 text-right border border-slate-300 rounded"><span class="view-val inline-block text-right w-24" v-else>${{ (pdi.bankDeposit || 0).toFixed(2) }}</span></div>
                    <div class="flex justify-between items-center"><label class="text-sm text-slate-600">Safe Drops Done</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.safeDrops" class="w-24 p-1 text-right border border-slate-300 rounded"><span class="view-val inline-block text-right w-24" v-else>${{ (pdi.safeDrops || 0).toFixed(2) }}</span></div>
                    
                    <div class="border-t border-slate-200 pt-2 my-2"></div>
                    <div class="flex justify-between items-center font-bold text-slate-800 pt-3 border-t border-slate-300"><label>Total Physical Accounted</label> <span class="w-24 text-right">${{ totalPhysical.toFixed(2) }}</span></div>
                </div>
            </div>

        </div>

        <div class="mt-6 p-5 rounded-2xl flex items-center justify-between shadow-sm" :class="overShortRegister >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'">
            <div>
                <div class="text-sm font-bold uppercase" :class="overShortRegister >= 0 ? 'text-emerald-800' : 'text-rose-800'">Over / Short (Register)</div>
                <div class="text-xs" :class="overShortRegister >= 0 ? 'text-emerald-600' : 'text-rose-600'">Total Physical MINUS Total Expected</div>
            </div>
            <div class="text-4xl font-black font-mono" :class="overShortRegister >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                {{ overShortRegister >= 0 ? '+' : '' }}${{ overShortRegister.toFixed(2) }}
            </div>
        </div>
        
    </div>
    </div>

    <!-- STEP 3: SAFE & LOTTERY -->
    <div v-show="!props.isEditable || activeStep === 3" class="animate-in fade-in slide-in-from-right-4 duration-500">
    <!-- 4. SAFE RECONCILE -->
    <h2>4️⃣ Safe reconciliation</h2>
    <div class="section-card grid-3">
        <div class="input-row"><label>Opening Safe Balance</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.openingSafe"><span class="view-val" v-else>${{ (pdi.openingSafe || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Cash Drops</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.cashDropsSafe"><span class="view-val" v-else>${{ (pdi.cashDropsSafe || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Removed for Deposit</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.removedForDeposit"><span class="view-val" v-else>${{ (pdi.removedForDeposit || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Expected safe balance</label> <input type="number" step="0.01" :value="expectedSafe.toFixed(2)" readonly class="calc-auto"></div>
        <div class="input-row"><label>Actual safe count</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.actualSafeCount"><span class="view-val" v-else>${{ (pdi.actualSafeCount || 0).toFixed(2) }}</span></div>
        <div class="input-row"><strong>Safe Over/Short: $ <span>{{ safeOS.toFixed(2) }}</span></strong></div>
    </div>

    <!-- 5. LOTTERY -->
    <h2>5️⃣ Lottery reconciliation</h2>
    <div class="section-card grid-3">
        <div class="input-row"><label>Opening Lottery Bal.</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.lotteryOpen"><span class="view-val" v-else>${{ (pdi.lotteryOpen || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Lottery Sales (from above)</label> <input type="number" step="0.01" :value="pdi.lotterySales" readonly class="calc-auto"></div>
        <div class="input-row"><label>Lottery Paid Out</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.lotteryPaidOut"><span class="view-val" v-else>${{ (pdi.lotteryPaidOut || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Lottery Settled</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.lotterySettled"><span class="view-val" v-else>${{ (pdi.lotterySettled || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Expected balance</label> <input type="number" step="0.01" :value="expectedLottery.toFixed(2)" readonly class="calc-auto"></div>
        <div class="input-row"><label>Actual lottery balance</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.actualLottery"><span class="view-val" v-else>${{ (pdi.actualLottery || 0).toFixed(2) }}</span></div>
        <div class="input-row md-col-span-3"><strong>Lottery Over/Short: $ <span>{{ lotteryOS.toFixed(2) }}</span></strong></div>
    </div>
    </div>

    <!-- STEP 4: FUEL & PAYOUTS -->
    <div v-show="!props.isEditable || activeStep === 4" class="animate-in fade-in slide-in-from-right-4 duration-500">
    <!-- 6. FUEL SALES -->
    <h2>6️⃣ Fuel sales (gallons / $)</h2>
    <div class="section-card grid-3">
        <div class="input-row"><label>Regular gallons</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.regGal"><span class="view-val" v-else>{{ (pdi.regGal || 0).toFixed(2) }} g</span></div>
        <div class="input-row"><label>Regular sales $</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.regSales"><span class="view-val" v-else>${{ (pdi.regSales || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Premium gallons</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.premGal"><span class="view-val" v-else>{{ (pdi.premGal || 0).toFixed(2) }} g</span></div>
        <div class="input-row"><label>Premium sales $</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.premSales"><span class="view-val" v-else>${{ (pdi.premSales || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Diesel gallons</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.dieselGal"><span class="view-val" v-else>{{ (pdi.dieselGal || 0).toFixed(2) }} g</span></div>
        <div class="input-row"><label>Diesel sales $</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.dieselSales"><span class="view-val" v-else>${{ (pdi.dieselSales || 0).toFixed(2) }}</span></div>
        <div class="input-row md-col-span-3"><strong>Total fuel sales: $ <span>{{ totalFuelCalc.toFixed(2) }}</span></strong></div>
    </div>

    <!-- 7. PAID OUT LOG -->
    <h2>7️⃣ Paid out log</h2>
    <div class="section-card">
        <table class="table-paidout">
            <thead><tr><th>Time</th><th>Description</th><th>Amount ($)</th><th>Employee</th><th v-if="props.isEditable">Inc</th></tr></thead>
            <tbody>
                <tr v-for="(po, idx) in pdi.paidOuts" :key="idx">
                    <td><input v-if="props.isEditable" type="time" v-model="po.time"><span v-else>{{ po.time }}</span></td>
                    <td><input v-if="props.isEditable" type="text" placeholder="Description" v-model="po.description"><span v-else>{{ po.description }}</span></td>
                    <td><input v-if="props.isEditable" type="number" step="0.01" v-model.number="po.amount"><span v-else>${{ (po.amount || 0).toFixed(2) }}</span></td>
                    <td><input v-if="props.isEditable" type="text" placeholder="Emp" v-model="po.employee"><span v-else>{{ po.employee }}</span></td>
                    <td v-if="props.isEditable"><button @click="removePaidOut(Number(idx))" class="text-rose-500 font-bold hover:underline">X</button></td>
                </tr>
            </tbody>
        </table>
        <div class="mt-4 flex justify-between items-center">
            <button v-if="props.isEditable" @click="addPaidOut" class="badge bg-emerald-600 text-[10px] cursor-pointer hover:bg-emerald-700 transition">➕ Add Row</button>
            <div class="text-right flex-1"><strong>TOTAL PAID OUT: $ <span>{{ paidOutsTotal.toFixed(2) }}</span></strong></div>
        </div>
    </div>
    </div>

    <!-- STEP 5: DEPOSIT & CASH FLOW -->
    <div v-show="!props.isEditable || activeStep === 5" class="animate-in fade-in slide-in-from-right-4 duration-500">
    <!-- 8. DEPOSIT SUMMARY -->
    <h2>8️⃣ Deposit summary</h2>
    <div class="section-card grid-3">
        <div class="input-row"><label>Cash Deposit $</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.cashDeposit"><span class="view-val" v-else>${{ (pdi.cashDeposit || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Coin Amount $</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.coinDeposit"><span class="view-val" v-else>${{ (pdi.coinDeposit || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Check Input $</label> <input v-if="props.isEditable" type="number" step="0.01" v-model.number="pdi.checkDeposit"><span class="view-val" v-else>${{ (pdi.checkDeposit || 0).toFixed(2) }}</span></div>
        <div class="input-row"><label>Deposit Bag #</label> <input v-if="props.isEditable" type="text" placeholder="e.g. 1045" v-model="pdi.bagNumber"><span class="view-val" v-else>#{{ pdi.bagNumber || '-' }}</span></div>
        <div class="input-row md-col-span-2"><strong>Total deposit: $ <span>{{ totalDeposit.toFixed(2) }}</span></strong></div>
    </div>

    <!-- 9. FINAL CASH FLOW -->
    <h2>9️⃣ Final cash flow</h2>
    <div class="section-card grid-3">
        <div class="input-row"><label>Total Cash Sales</label> <input type="number" step="0.01" :value="(pdi.cashSales || 0).toFixed(2)" readonly class="calc-auto"></div>
        <div class="input-row"><label>Minus Paid Outs</label> <input type="number" step="0.01" :value="paidOutsTotal.toFixed(2)" readonly class="calc-auto"></div>
        <div class="input-row"><label>Minus Deposit</label> <input type="number" step="0.01" :value="totalDeposit.toFixed(2)" readonly class="calc-auto"></div>
        <div class="input-row"><label>Cash in register</label> <input type="number" step="0.01" :value="cashRemainingReg.toFixed(2)" readonly class="calc-auto"></div>
        <div class="input-row md-col-span-2"><label>Cash in safe</label> <input type="number" step="0.01" :value="cashRemainingSafe.toFixed(2)" readonly class="calc-auto"></div>
    </div>

    <!-- 10. OVERALL STORE OVER/SHORT -->
    <h2>🔟 Overall store over/short</h2>
    <div class="section-card grid-3 bg-blue-50 border-blue-100">
        <div class="input-row"><label>Register O/S</label> <input type="number" step="0.01" :value="overShortRegister.toFixed(2)" readonly class="calc-auto"></div>
        <div class="input-row"><label>Safe O/S</label> <input type="number" step="0.01" :value="safeOS.toFixed(2)" readonly class="calc-auto"></div>
        <div class="input-row"><label>Lottery O/S</label> <input type="number" step="0.01" :value="lotteryOS.toFixed(2)" readonly class="calc-auto"></div>
        <div class="input-row md-col-span-3 bg-slate-800 text-white rounded-full px-6 py-4 flex justify-between items-center" :class="{ 'bg-rose-600': Math.abs(totalStoreOS) > 5 }">
            <strong>TOTAL STORE OVER/SHORT:</strong>
            <span class="text-xl font-black">${{ totalStoreOS.toFixed(2) }}</span>
        </div>
    </div>
    </div>

    <!-- STEP 6: VERIFICATION -->
    <div v-show="!props.isEditable || activeStep === 6" class="animate-in fade-in slide-in-from-right-4 duration-500">
    <!-- 11. VERIFICATION -->
    <h2>1️⃣1️⃣ Manager verification</h2>
    <div class="section-card">
        <div class="flex gap-6 flex-wrap mb-6 text-sm font-semibold text-slate-700">
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="pdi.verifyCash" :disabled="!props.isEditable" class="w-4 h-4 text-primary-600 rounded border-slate-300"> 
                Cash verified
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="pdi.verifySafe" :disabled="!props.isEditable" class="w-4 h-4 text-primary-600 rounded border-slate-300"> 
                Safe verified
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="pdi.verifyLottery" :disabled="!props.isEditable" class="w-4 h-4 text-primary-600 rounded border-slate-300"> 
                Lottery verified
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="pdi.verifyDeposit" :disabled="!props.isEditable" class="w-4 h-4 text-primary-600 rounded border-slate-300"> 
                Deposit prepared
            </label>
        </div>
        <div class="signature-line grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="signature-item flex flex-col items-start bg-slate-50 p-4 rounded-xl">
                <span class="text-xs uppercase font-bold text-slate-500 mb-2">Manager Signature:</span> 
                <input v-if="props.isEditable" type="text" placeholder="Sign here" v-model="pdi.managerSig" class="border-b-2 border-slate-300 bg-transparent w-full pb-1 outline-none text-primary-700 font-serif italic text-lg">
                <span v-else class="text-primary-700 font-serif italic text-lg border-b border-dashed border-slate-300 w-full min-h-[30px]">{{ pdi.managerSig }}</span>
            </div>
            <div class="signature-item flex flex-col items-start bg-slate-50 p-4 rounded-xl">
                <span class="text-xs uppercase font-bold text-slate-500 mb-2">Employee Signature:</span> 
                <input v-if="props.isEditable" type="text" placeholder="Sign here" v-model="pdi.employeeSig" class="border-b-2 border-slate-300 bg-transparent w-full pb-1 outline-none text-primary-700 font-serif italic text-lg">
                <span v-else class="text-primary-700 font-serif italic text-lg border-b border-dashed border-slate-300 w-full min-h-[30px]">{{ pdi.employeeSig }}</span>
            </div>
            <div class="signature-item flex flex-col items-start bg-slate-50 p-4 rounded-xl">
                <span class="text-xs uppercase font-bold text-slate-500 mb-2">Date:</span> 
                <input v-if="props.isEditable" type="date" v-model="pdi.signDate" class="border-b-2 border-slate-300 bg-transparent w-full pb-1 outline-none text-slate-700 font-medium">
                <span v-else class="text-slate-700 font-medium border-b border-dashed border-slate-300 w-full min-h-[28px]">{{ pdi.signDate }}</span>
            </div>
        </div>
    </div>

    <!-- Warnings -->
    <div class="mt-6 p-4 rounded-xl text-sm mb-4" :class="Math.abs(overShortRegister) > 5 ? 'bg-amber-100 text-amber-800 border-l-4 border-amber-500' : 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-500'">
        <span v-if="Math.abs(overShortRegister) > 5">⚠️ <strong>CAUTION:</strong> Register over/short is ${{ overShortRegister.toFixed(2) }} (over $5 limit). Prepare note for management.</span>
        <span v-else>✅ Register over/short within $5 limit acceptable variance.</span>
    </div>
    </div>

    <!-- Wizard Navigation Buttons -->
    <div class="flex items-center justify-between mt-8 pt-6 border-t border-slate-100" v-if="props.isEditable">
       <button @click="activeStep--" :disabled="activeStep === 1" class="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all disabled:opacity-50">
           <ArrowLeft class="w-4 h-4" /> Previous Step
       </button>
       <button v-if="activeStep < 6" @click="activeStep++" class="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20">
           Next Step <ArrowRight class="w-4 h-4" />
       </button>
       <div v-else class="text-[10px] font-black text-emerald-500 uppercase tracking-widest px-6 py-3">
           Ready to Save Below
       </div>
    </div>

  </div>
</template>

<style scoped>
.pdi-form-container {
    max-width: 100%;
    background: white;
    padding: 0;
}
.pdi-form-container h1 {
    font-size: 1.8rem;
    font-weight: 800;
    margin: 0 0 6px 0;
    color: #0f172a;
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    gap: 12px;
}
.badge {
    background: #0f172a;
    color: white;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 40px;
    text-transform: uppercase;
    letter-spacing: 1px;
}
.subtitle {
    font-size: 0.9rem;
    color: #475569;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 14px;
    margin-bottom: 25px;
    display: flex;
    justify-content: space-between;
    font-weight: 600;
}
.store-header {
    display: flex;
    flex-wrap: wrap;
    gap: 15px 30px;
    background: #f8fafc;
    padding: 20px;
    border-radius: 20px;
    margin-bottom: 30px;
    border: 1px solid #e2e8f0;
}
.field {
    display: flex;
    flex-direction: column;
    min-width: 140px;
}
.field label {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748b;
    margin-bottom: 6px;
}
.field input, .field select, .view-val {
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    padding: 8px 14px;
    font-size: 0.95rem;
    font-weight: 600;
    color: #0f172a;
    min-height: 40px;
    display: flex;
    align-items: center;
}
.shift-group {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 20px;
}
.shift-option {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #f1f5f9;
    padding: 6px 14px;
    border-radius: 40px;
    font-size: 0.85rem;
    font-weight: 700;
    color: #334155;
    cursor: pointer;
}
.shift-option input { margin: 0; }
.pdi-form-container h2 {
    font-size: 1.2rem;
    font-weight: 700;
    color: #0f172a;
    border-left: 6px solid #3b82f6;
    padding-left: 14px;
    margin: 30px 0 20px 0;
    background: #f8fafc;
    display: inline-block;
    padding-right: 20px;
    border-radius: 0 100px 100px 0;
}
.section-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 24px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
}
.grid-3 {
    display: grid;
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 16px;
}
@media (min-width: 768px) {
    .grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .md-col-span-2 { grid-column: span 2 / span 2; }
    .md-col-span-3 { grid-column: span 3 / span 3; }
}
.input-row {
    display: flex;
    flex-direction: column;
}
.input-row label {
    font-weight: 700;
    font-size: 0.75rem;
    color: #475569;
    margin-bottom: 6px;
}
.input-row input {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
    outline: none;
}
.input-row input:focus {
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
.calc-auto {
    background: #e2e8f0 !important;
    border-color: #cbd5e1 !important;
    color: #64748b !important;
}
.total-hl {
    background: #f0f9ff;
    border-radius: 16px;
    padding: 14px 20px;
    color: #0369a1;
    display: flex;
    align-items: center;
}
.total-hl-2 {
    background: #fdf4ff;
    border-radius: 16px;
    padding: 14px 20px;
    color: #86198f;
    display: flex;
    align-items: center;
}
.table-paidout {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 8px;
}
.table-paidout th {
    text-align: left;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    color: #64748b;
    padding: 0 10px;
}
.table-paidout td input {
    width: 100%;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.9rem;
}
</style>
