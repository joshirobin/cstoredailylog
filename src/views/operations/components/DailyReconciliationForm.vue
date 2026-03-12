<script setup lang="ts">
import { computed } from 'vue';
import type { SalesLog } from '../../../stores/sales';
import { useLocationsStore } from '../../../stores/locations';
import { Plus, Trash2 } from 'lucide-vue-next';

const props = defineProps<{
    log: Partial<SalesLog>;
    isEditable?: boolean;
}>();

const locationsStore = useLocationsStore();

const totalCashIn = computed(() => {
    return (props.log.cashSales || 0) + 
           (props.log.lotteryCashSales || 0) + 
           (props.log.safeCashAdded || 0) + 
           (props.log.otherCashIn || 0);
});

const totalCashOut = computed(() => {
    return (props.log.safeDrops || 0) + 
           (props.log.lotteryPaidOut || 0) + 
           (props.log.expenses || 0) + 
           (props.log.bankDeposit || 0) + 
           (props.log.otherCashOut || 0);
});

const expectedCash = computed(() => {
    return (props.log.openingCash || 0) + totalCashIn.value - totalCashOut.value;
});

const overShort = computed(() => {
    return (props.log.closingCash || 0) - expectedCash.value;
});

// Helper for Paid Out Log
const addPaidOut = () => {
    if (!props.log.paidOutLog) props.log.paidOutLog = [];
    props.log.paidOutLog.push({ time: '', description: '', amount: 0, employee: '' });
};

const removePaidOut = (index: number) => {
    if (props.log.paidOutLog) {
        props.log.paidOutLog.splice(index, 1);
    }
};

const calculateInitialFields = () => {
    if (!props.log.creditCardSummary) props.log.creditCardSummary = { visa: 0, mastercard: 0, amex: 0, discover: 0, other: 0, total: 0 };
    if (!props.log.fuelSalesSummary) props.log.fuelSalesSummary = { regularGallons: 0, regularSales: 0, premiumGallons: 0, premiumSales: 0, dieselGallons: 0, dieselSales: 0, total: 0 };
    if (!props.log.lotteryReconciliation) props.log.lotteryReconciliation = { openingBalance: 0, lotterySales: 0, lotteryPaidOut: 0, settlementsPaid: 0, endingBalance: 0 };
    if (!props.log.safeReconciliation) props.log.safeReconciliation = { openingSafeBalance: 0, cashDrops: 0, cashRemoved: 0, endingSafeBalance: 0 };
    if (!props.log.depositSummary) props.log.depositSummary = { cashDeposit: 0, coins: 0, total: 0, depositBagNumber: '' };
    if (!props.log.posZReportSummary) props.log.posZReportSummary = { insideSales: 0, fuelSales: 0, lotterySales: 0, totalSales: 0 };
    if (!props.log.signatures) props.log.signatures = { cashierSignature: '', managerSignature: '', date: '' };
    if (!props.log.paidOutLog) props.log.paidOutLog = [];
};

// Initialize if editing to prevent undefined errors in v-model binding
if (props.isEditable) {
    calculateInitialFields();
}
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
    <div class="text-center mb-8 pb-8 border-b-2 border-slate-900 border-dashed">
      <h1 class="text-2xl font-black text-slate-900 uppercase tracking-tighter">GAS STATION DAILY RECONCILIATION FORM</h1>
    </div>

    <!-- Header Info -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-xs font-bold text-slate-700">
      <div><span class="text-slate-400 uppercase tracking-widest block text-[10px]">Store Name:</span> {{ locationsStore.activeLocation?.name || 'N/A' }}</div>
      <div><span class="text-slate-400 uppercase tracking-widest block text-[10px]">Store #:</span> __________</div>
      <div>
         <span class="text-slate-400 uppercase tracking-widest block text-[10px]">Date:</span> 
         <span v-if="!isEditable">{{ props.log.date }}</span>
         <input v-else type="date" v-model="props.log.date" class="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none" />
      </div>
      <div>
        <span class="text-slate-400 uppercase tracking-widest block text-[10px]">Shift:</span> 
        <span v-if="!isEditable">{{ props.log.shift || 'Full Day' }}</span>
        <select v-else v-model="props.log.shift" class="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none w-full">
            <option value="Morning">Morning</option>
            <option value="Afternoon">Afternoon</option>
            <option value="Night">Night</option>
            <option value="Full Day">Full Day</option>
        </select>
      </div>
      <div class="col-span-2">
         <span class="text-slate-400 uppercase tracking-widest block text-[10px]">Manager on Duty:</span> 
         <span v-if="!isEditable">{{ props.log.managerOnDuty || '____________' }}</span>
         <input v-else type="text" v-model="props.log.managerOnDuty" placeholder="Manager Name" class="bg-slate-50 w-full border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none" />
      </div>
    </div>

    <div class="space-y-8">
      <!-- 1. REGISTER CASH RECONCILIATION -->
      <section>
        <h2 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">1. REGISTER CASH RECONCILIATION</h2>
        <div class="mb-4">
          <p class="font-bold text-sm flex items-center gap-2">Opening Float: 
             <span v-if="!isEditable" class="text-emerald-600">${{ (props.log.openingCash || 0).toFixed(2) }}</span>
             <input v-else type="number" v-model.number="props.log.openingCash" class="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-2 py-1 text-sm w-32 outline-none font-black" />
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- CASH IN -->
          <div>
            <h3 class="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">CASH IN</h3>
            <table class="w-full text-sm">
              <tbody class="divide-y divide-slate-100">
                <tr class="h-10">
                  <td class="font-medium text-slate-600">Cash Sales</td>
                  <td class="text-right font-bold w-32">
                     <span v-if="!isEditable">${{ (props.log.cashSales || 0).toFixed(2) }}</span>
                     <input v-else type="number" v-model.number="props.log.cashSales" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                  </td>
                </tr>
                <tr class="h-10">
                  <td class="font-medium text-slate-600">Lottery Cash Sales</td>
                  <td class="text-right font-bold">
                     <span v-if="!isEditable">${{ (props.log.lotteryCashSales || 0).toFixed(2) }}</span>
                     <input v-else type="number" v-model.number="props.log.lotteryCashSales" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                  </td>
                </tr>
                <tr class="h-10">
                  <td class="font-medium text-slate-600">Safe Cash Added</td>
                  <td class="text-right font-bold">
                     <span v-if="!isEditable">${{ (props.log.safeCashAdded || 0).toFixed(2) }}</span>
                     <input v-else type="number" v-model.number="props.log.safeCashAdded" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                  </td>
                </tr>
                <tr class="h-10">
                  <td class="font-medium text-slate-600">Other Cash In</td>
                  <td class="text-right font-bold">
                     <span v-if="!isEditable">${{ (props.log.otherCashIn || 0).toFixed(2) }}</span>
                     <input v-else type="number" v-model.number="props.log.otherCashIn" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                  </td>
                </tr>
                <tr class="h-12 bg-slate-50">
                  <td class="font-black text-slate-900 px-2">Total Cash In</td>
                  <td class="text-right font-black text-emerald-600 px-2">${{ totalCashIn.toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- CASH OUT -->
          <div>
            <h3 class="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">CASH OUT</h3>
            <table class="w-full text-sm">
              <tbody class="divide-y divide-slate-100">
                <tr class="h-10">
                  <td class="font-medium text-slate-600">Safe Drops</td>
                  <td class="text-right font-bold w-32">
                     <span v-if="!isEditable">${{ (props.log.safeDrops || 0).toFixed(2) }}</span>
                     <input v-else type="number" v-model.number="props.log.safeDrops" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1 text-rose-600" />
                  </td>
                </tr>
                <tr class="h-10">
                  <td class="font-medium text-slate-600">Lottery Paid Out</td>
                  <td class="text-right font-bold">
                     <span v-if="!isEditable">${{ (props.log.lotteryPaidOut || 0).toFixed(2) }}</span>
                     <input v-else type="number" v-model.number="props.log.lotteryPaidOut" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1 text-rose-600" />
                  </td>
                </tr>
                <tr class="h-10">
                  <td class="font-medium text-slate-600">Paid Outs / Expenses</td>
                  <td class="text-right font-bold">
                     <span v-if="!isEditable">${{ (props.log.expenses || 0).toFixed(2) }}</span>
                     <input v-else type="number" v-model.number="props.log.expenses" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1 text-rose-600" />
                  </td>
                </tr>
                <tr class="h-10">
                  <td class="font-medium text-slate-600">Bank Deposit</td>
                  <td class="text-right font-bold">
                     <span v-if="!isEditable">${{ (props.log.bankDeposit || 0).toFixed(2) }}</span>
                     <input v-else type="number" v-model.number="props.log.bankDeposit" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1 text-rose-600" />
                  </td>
                </tr>
                <tr class="h-10">
                  <td class="font-medium text-slate-600">Other Cash Out</td>
                  <td class="text-right font-bold">
                     <span v-if="!isEditable">${{ (props.log.otherCashOut || 0).toFixed(2) }}</span>
                     <input v-else type="number" v-model.number="props.log.otherCashOut" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1 text-rose-600" />
                  </td>
                </tr>
                <tr class="h-12 bg-slate-50">
                  <td class="font-black text-slate-900 px-2">Total Cash Out</td>
                  <td class="text-right font-black text-rose-600 px-2">${{ totalCashOut.toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-8 max-w-sm mx-auto bg-slate-900 text-white rounded-2xl p-6 shadow-xl">
           <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">CASH BALANCE</h3>
           <div class="space-y-2 text-sm font-medium">
             <div class="flex justify-between items-center text-slate-300">
                 <span>Actual Cash Counted</span> 
                 <span v-if="!isEditable" class="font-mono text-xl text-white">${{ (props.log.closingCash || 0).toFixed(2) }}</span>
                 <input v-else type="number" v-model.number="props.log.closingCash" class="w-32 bg-slate-800 border-none rounded text-right px-2 py-1 font-mono text-xl text-white outline-none" />
             </div>
             <div class="h-px bg-slate-700 my-4"></div>
             <div class="flex justify-between"><span>Opening Float</span> <span>${{ (props.log.openingCash || 0).toFixed(2) }}</span></div>
             <div class="flex justify-between text-emerald-400"><span>+ Total Cash In</span> <span>${{ totalCashIn.toFixed(2) }}</span></div>
             <div class="flex justify-between text-rose-400"><span>- Total Cash Out</span> <span>${{ totalCashOut.toFixed(2) }}</span></div>
             <div class="h-px bg-slate-700 my-2"></div>
             <div class="flex justify-between font-bold text-lg"><span>Expected Cash</span> <span>${{ expectedCash.toFixed(2) }}</span></div>
             <div class="h-px bg-slate-700 my-2"></div>
             <div class="flex justify-between font-black text-xl" :class="overShort >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                <span>OVER / SHORT</span> 
                <span>{{ overShort >= 0 ? '+' : '' }}${{ overShort.toFixed(2) }}</span>
             </div>
           </div>
        </div>
      </section>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- 2. CREDIT CARD SUMMARY -->
        <section>
            <h2 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">2. CREDIT CARD SUMMARY</h2>
            <table class="w-full text-sm">
                <tbody class="divide-y divide-slate-100" v-if="props.log.creditCardSummary">
                    <tr class="h-10">
                        <td class="font-medium text-slate-600">Visa</td>
                        <td class="text-right font-bold w-32">
                           <span v-if="!isEditable">${{ (props.log.creditCardSummary.visa || 0).toFixed(2) }}</span>
                           <input v-else type="number" v-model.number="props.log.creditCardSummary.visa" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                        </td>
                    </tr>
                    <tr class="h-10">
                        <td class="font-medium text-slate-600">Mastercard</td>
                        <td class="text-right font-bold">
                           <span v-if="!isEditable">${{ (props.log.creditCardSummary.mastercard || 0).toFixed(2) }}</span>
                           <input v-else type="number" v-model.number="props.log.creditCardSummary.mastercard" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                        </td>
                    </tr>
                    <tr class="h-10">
                        <td class="font-medium text-slate-600">Amex</td>
                        <td class="text-right font-bold">
                           <span v-if="!isEditable">${{ (props.log.creditCardSummary.amex || 0).toFixed(2) }}</span>
                           <input v-else type="number" v-model.number="props.log.creditCardSummary.amex" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                        </td>
                    </tr>
                    <tr class="h-10">
                        <td class="font-medium text-slate-600">Discover</td>
                        <td class="text-right font-bold">
                           <span v-if="!isEditable">${{ (props.log.creditCardSummary.discover || 0).toFixed(2) }}</span>
                           <input v-else type="number" v-model.number="props.log.creditCardSummary.discover" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                        </td>
                    </tr>
                    <tr class="h-10">
                        <td class="font-medium text-slate-600">Other</td>
                        <td class="text-right font-bold">
                           <span v-if="!isEditable">${{ (props.log.creditCardSummary.other || 0).toFixed(2) }}</span>
                           <input v-else type="number" v-model.number="props.log.creditCardSummary.other" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                        </td>
                    </tr>
                    <tr class="h-12 bg-slate-50">
                        <td class="font-black text-slate-900 px-2">Total Credit Card</td>
                        <td class="text-right font-black w-32 px-2 pb-1 pt-1">
                           <span v-if="!isEditable">${{ (props.log.creditCardSummary.total || 0).toFixed(2) }}</span>
                           <input v-else type="number" v-model.number="props.log.creditCardSummary.total" class="w-full text-right bg-slate-200 border-none rounded px-2 py-1 font-bold" />
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>

        <!-- 3. FUEL SALES SUMMARY -->
        <section>
            <h2 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">3. FUEL SALES SUMMARY</h2>
            <table class="w-full text-sm">
                <thead>
                    <tr class="text-[10px] text-slate-400 uppercase tracking-widest text-left"><th class="font-black pb-2">Item</th><th class="font-black pb-2">Gallons</th><th class="text-right font-black pb-2">Amount</th></tr>
                </thead>
                <tbody class="divide-y divide-slate-100" v-if="props.log.fuelSalesSummary">
                    <tr class="h-10">
                        <td class="font-medium text-slate-600">Regular</td>
                        <td class="text-slate-500">
                           <span v-if="!isEditable">{{ props.log.fuelSalesSummary.regularGallons || 0 }}</span>
                           <input v-else type="number" v-model.number="props.log.fuelSalesSummary.regularGallons" class="w-16 bg-slate-50 border-none rounded px-2 py-1 font-mono text-xs" />
                        </td>
                        <td class="text-right font-bold w-32">
                           <span v-if="!isEditable">${{ (props.log.fuelSalesSummary.regularSales || 0).toFixed(2) }}</span>
                           <input v-else type="number" v-model.number="props.log.fuelSalesSummary.regularSales" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                        </td>
                    </tr>
                    <tr class="h-10">
                        <td class="font-medium text-slate-600">Premium</td>
                        <td class="text-slate-500">
                           <span v-if="!isEditable">{{ props.log.fuelSalesSummary.premiumGallons || 0 }}</span>
                           <input v-else type="number" v-model.number="props.log.fuelSalesSummary.premiumGallons" class="w-16 bg-slate-50 border-none rounded px-2 py-1 font-mono text-xs" />
                        </td>
                        <td class="text-right font-bold">
                           <span v-if="!isEditable">${{ (props.log.fuelSalesSummary.premiumSales || 0).toFixed(2) }}</span>
                           <input v-else type="number" v-model.number="props.log.fuelSalesSummary.premiumSales" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                        </td>
                    </tr>
                    <tr class="h-10">
                        <td class="font-medium text-slate-600">Diesel</td>
                        <td class="text-slate-500">
                           <span v-if="!isEditable">{{ props.log.fuelSalesSummary.dieselGallons || 0 }}</span>
                           <input v-else type="number" v-model.number="props.log.fuelSalesSummary.dieselGallons" class="w-16 bg-slate-50 border-none rounded px-2 py-1 font-mono text-xs" />
                        </td>
                        <td class="text-right font-bold">
                           <span v-if="!isEditable">${{ (props.log.fuelSalesSummary.dieselSales || 0).toFixed(2) }}</span>
                           <input v-else type="number" v-model.number="props.log.fuelSalesSummary.dieselSales" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                        </td>
                    </tr>
                    <tr class="h-12 bg-slate-50">
                        <td colspan="2" class="font-black text-slate-900 px-2">Total Fuel Sales</td>
                        <td class="text-right font-black px-2 pb-1 pt-1">
                           <span v-if="!isEditable">${{ (props.log.fuelSalesSummary.total || 0).toFixed(2) }}</span>
                           <input v-else type="number" v-model.number="props.log.fuelSalesSummary.total" class="w-full text-right bg-slate-200 border-none rounded px-2 py-1 font-bold" />
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>
      </div>

       <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- 4. LOTTERY RECONCILIATION -->
        <section>
            <h2 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">4. LOTTERY RECONCILIATION</h2>
            <table class="w-full text-sm">
                <tbody class="divide-y divide-slate-100" v-if="props.log.lotteryReconciliation">
                    <tr class="h-10">
                        <td class="font-medium text-slate-600">Opening Balance</td>
                        <td class="text-right font-bold w-32">
                            <span v-if="!isEditable">${{ (props.log.lotteryReconciliation.openingBalance || 0).toFixed(2) }}</span>
                            <input v-else type="number" v-model.number="props.log.lotteryReconciliation.openingBalance" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                        </td>
                    </tr>
                    <tr class="h-10">
                        <td class="font-medium text-slate-600">Lottery Sales</td>
                        <td class="text-right font-bold w-32">
                            <span v-if="!isEditable">${{ (props.log.lotteryReconciliation.lotterySales || 0).toFixed(2) }}</span>
                            <input v-else type="number" v-model.number="props.log.lotteryReconciliation.lotterySales" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                        </td>
                    </tr>
                    <tr class="h-10">
                        <td class="font-medium text-slate-600">Lottery Paid Out</td>
                        <td class="text-right font-bold text-rose-500 w-32">
                            <span v-if="!isEditable">-${{ (props.log.lotteryReconciliation.lotteryPaidOut || 0).toFixed(2) }}</span>
                            <input v-else type="number" v-model.number="props.log.lotteryReconciliation.lotteryPaidOut" class="w-full text-right bg-rose-50 border-none rounded px-2 py-1 text-rose-600" />
                        </td>
                    </tr>
                    <tr class="h-10">
                        <td class="font-medium text-slate-600">Settlements Paid</td>
                        <td class="text-right font-bold text-rose-500 w-32">
                            <span v-if="!isEditable">-${{ (props.log.lotteryReconciliation.settlementsPaid || 0).toFixed(2) }}</span>
                            <input v-else type="number" v-model.number="props.log.lotteryReconciliation.settlementsPaid" class="w-full text-right bg-rose-50 border-none rounded px-2 py-1 text-rose-600" />
                        </td>
                    </tr>
                    <tr class="h-12 bg-slate-50">
                        <td class="font-black text-slate-900 px-2">Ending Balance</td>
                        <td class="text-right font-black text-slate-900 px-2 pb-1 pt-1">
                            <span v-if="!isEditable">${{ (props.log.lotteryReconciliation.endingBalance || 0).toFixed(2) }}</span>
                            <input v-else type="number" v-model.number="props.log.lotteryReconciliation.endingBalance" class="w-full text-right bg-slate-200 border-none rounded px-2 py-1 font-bold" />
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>

        <!-- 5. SAFE RECONCILIATION -->
        <section>
            <h2 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">5. SAFE RECONCILIATION</h2>
            <table class="w-full text-sm">
                <tbody class="divide-y divide-slate-100" v-if="props.log.safeReconciliation">
                    <tr class="h-10">
                        <td class="font-medium text-slate-600">Opening Safe Balance</td>
                        <td class="text-right font-bold w-32">
                           <span v-if="!isEditable">${{ (props.log.safeReconciliation.openingSafeBalance || 0).toFixed(2) }}</span>
                           <input v-else type="number" v-model.number="props.log.safeReconciliation.openingSafeBalance" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                        </td>
                    </tr>
                    <tr class="h-10">
                        <td class="font-medium text-slate-600">Cash Drops</td>
                        <td class="text-right font-bold text-emerald-600 w-32">
                           <span v-if="!isEditable">+${{ (props.log.safeReconciliation.cashDrops || 0).toFixed(2) }}</span>
                           <input v-else type="number" v-model.number="props.log.safeReconciliation.cashDrops" class="w-full text-right bg-emerald-50 border-none rounded px-2 py-1 text-emerald-600" />
                        </td>
                    </tr>
                    <tr class="h-10">
                        <td class="font-medium text-slate-600">Cash Removed</td>
                        <td class="text-right font-bold text-rose-500 w-32">
                           <span v-if="!isEditable">-${{ (props.log.safeReconciliation.cashRemoved || 0).toFixed(2) }}</span>
                           <input v-else type="number" v-model.number="props.log.safeReconciliation.cashRemoved" class="w-full text-right bg-rose-50 border-none rounded px-2 py-1 text-rose-600" />
                        </td>
                    </tr>
                    <tr class="h-12 bg-slate-50">
                        <td class="font-black text-slate-900 px-2">Ending Safe Balance</td>
                        <td class="text-right font-black text-slate-900 px-2 pb-1 pt-1">
                           <span v-if="!isEditable">${{ (props.log.safeReconciliation.endingSafeBalance || 0).toFixed(2) }}</span>
                           <input v-else type="number" v-model.number="props.log.safeReconciliation.endingSafeBalance" class="w-full text-right bg-slate-200 border-none rounded px-2 py-1 font-bold" />
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>
      </div>

       <div class="grid grid-cols-1 gap-8">
            <!-- 6. PAID OUT LOG -->
            <section>
                <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                    <h2 class="text-sm font-black text-slate-900 uppercase tracking-widest ">6. PAID OUT LOG</h2>
                    <button v-if="isEditable" @click="addPaidOut" class="text-[10px] text-primary-600 uppercase font-black tracking-widest flex items-center gap-1 hover:bg-slate-50 px-2 py-1 rounded">
                        <Plus class="w-3 h-3" /> Add Record
                    </button>
                </div>
                <div class="border border-slate-200 rounded-xl overflow-hidden">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-500">
                            <tr>
                                <th class="p-3">Time</th>
                                <th class="p-3 w-1/2">Description</th>
                                <th class="p-3 text-right">Amount</th>
                                <th class="p-3">Employee</th>
                                <th v-if="isEditable" class="p-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100" v-if="props.log.paidOutLog">
                            <template v-if="props.log.paidOutLog.length">
                                <tr v-for="(log, i) in props.log.paidOutLog" :key="i" class="h-10">
                                    <td class="px-3 text-slate-500">
                                        <span v-if="!isEditable">{{ log.time }}</span>
                                        <input v-else type="time" v-model="log.time" class="bg-slate-50 border-none rounded px-2 py-1 w-full" />
                                    </td>
                                    <td class="px-3 font-medium">
                                        <span v-if="!isEditable">{{ log.description }}</span>
                                        <input v-else type="text" v-model="log.description" class="bg-slate-50 border-none rounded px-2 py-1 w-full" placeholder="Desc" />
                                    </td>
                                    <td class="px-3 text-right font-bold w-32">
                                        <span v-if="!isEditable">${{ (log.amount || 0).toFixed(2) }}</span>
                                        <input v-else type="number" v-model.number="log.amount" class="text-right bg-slate-50 border-none rounded px-2 py-1 w-full" />
                                    </td>
                                    <td class="px-3 text-slate-500 w-32">
                                        <span v-if="!isEditable">{{ log.employee }}</span>
                                        <input v-else type="text" v-model="log.employee" class="bg-slate-50 border-none rounded px-2 py-1 w-full" placeholder="Name" />
                                    </td>
                                    <td v-if="isEditable" class="px-3 text-center">
                                        <button @click="removePaidOut(i)" class="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 class="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            </template>
                            <template v-else>
                                <tr class="h-10"><td class="p-4 border-b border-slate-100"></td><td class="p-4 border-b border-slate-100"></td><td class="p-4 border-b border-slate-100"></td><td class="p-4 border-b border-slate-100"></td><td v-if="isEditable"></td></tr>
                                <tr class="h-10"><td class="p-4 border-b border-slate-100"></td><td class="p-4 border-b border-slate-100"></td><td class="p-4 border-b border-slate-100"></td><td class="p-4 border-b border-slate-100"></td><td v-if="isEditable"></td></tr>
                            </template>
                        </tbody>
                        <tfoot class="bg-slate-50">
                            <tr>
                                <td colspan="2" class="p-3 text-right font-black text-slate-900 uppercase text-[10px] tracking-widest">Total Paid Out:</td>
                                <td class="p-3 text-right font-black text-slate-900 pb-2 pt-2">
                                   <span v-if="!isEditable">${{ (props.log.totalPaidOut || 0).toFixed(2) }}</span>
                                   <input v-else type="number" v-model.number="props.log.totalPaidOut" class="w-full text-right bg-slate-200 border-none rounded px-2 py-1 font-bold" />
                                </td>
                                <td></td>
                                <td v-if="isEditable"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </section>
       </div>

       <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- 7. DEPOSIT SUMMARY -->
            <section>
                <h2 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">7. DEPOSIT SUMMARY</h2>
                <table class="w-full text-sm mb-4">
                    <tbody class="divide-y divide-slate-100" v-if="props.log.depositSummary">
                        <tr class="h-10">
                            <td class="font-medium text-slate-600">Cash Deposit</td>
                            <td class="text-right font-bold w-32">
                               <span v-if="!isEditable">${{ (props.log.depositSummary.cashDeposit || 0).toFixed(2) }}</span>
                               <input v-else type="number" v-model.number="props.log.depositSummary.cashDeposit" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                            </td>
                        </tr>
                        <tr class="h-10">
                            <td class="font-medium text-slate-600">Coins</td>
                            <td class="text-right font-bold w-32">
                               <span v-if="!isEditable">${{ (props.log.depositSummary.coins || 0).toFixed(2) }}</span>
                               <input v-else type="number" v-model.number="props.log.depositSummary.coins" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                            </td>
                        </tr>
                        <tr class="h-12 bg-slate-50">
                            <td class="font-black text-slate-900 px-2">Total Deposit</td>
                            <td class="text-right font-black text-slate-900 px-2 pb-1 pt-1">
                               <span v-if="!isEditable">${{ (props.log.depositSummary.total || 0).toFixed(2) }}</span>
                               <input v-else type="number" v-model.number="props.log.depositSummary.total" class="w-full text-right bg-slate-200 border-none rounded px-2 py-1 font-bold" />
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div class="bg-slate-50 p-4 rounded-xl text-sm font-black text-slate-600 flex items-center gap-3">
                    <span class="text-[10px] uppercase tracking-widest text-slate-400 block mb-1">Deposit Bag #</span>
                    <span v-if="!isEditable" class="font-mono text-base">{{ props.log.depositSummary?.depositBagNumber || '___________________' }}</span>
                    <input v-else type="text" v-model="props.log.depositSummary!.depositBagNumber" class="bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono outline-none" placeholder="Bag Num" />
                </div>
            </section>

             <!-- 8. SALES SUMMARY (FROM POS Z REPORT) -->
            <section>
                <h2 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">8. SALES SUMMARY (Z REPORT)</h2>
                <table class="w-full text-sm">
                    <tbody class="divide-y divide-slate-100" v-if="props.log.posZReportSummary">
                        <tr class="h-10">
                            <td class="font-medium text-slate-600">Inside Sales</td>
                            <td class="text-right font-bold w-32">
                               <span v-if="!isEditable">${{ (props.log.posZReportSummary.insideSales || 0).toFixed(2) }}</span>
                               <input v-else type="number" v-model.number="props.log.posZReportSummary.insideSales" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                            </td>
                        </tr>
                        <tr class="h-10">
                            <td class="font-medium text-slate-600">Fuel Sales</td>
                            <td class="text-right font-bold w-32">
                               <span v-if="!isEditable">${{ (props.log.posZReportSummary.fuelSales || 0).toFixed(2) }}</span>
                               <input v-else type="number" v-model.number="props.log.posZReportSummary.fuelSales" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                            </td>
                        </tr>
                        <tr class="h-10">
                            <td class="font-medium text-slate-600">Lottery Sales</td>
                            <td class="text-right font-bold w-32">
                               <span v-if="!isEditable">${{ (props.log.posZReportSummary.lotterySales || 0).toFixed(2) }}</span>
                               <input v-else type="number" v-model.number="props.log.posZReportSummary.lotterySales" class="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                            </td>
                        </tr>
                        <tr class="h-12 bg-slate-50">
                            <td class="font-black text-slate-900 px-2">Total POS Sales</td>
                            <td class="text-right font-black text-slate-900 px-2 pb-1 pt-1">
                               <span v-if="!isEditable">${{ (props.log.posZReportSummary.totalSales || 0).toFixed(2) }}</span>
                               <input v-else type="number" v-model.number="props.log.posZReportSummary.totalSales" class="w-full text-right bg-slate-200 border-none rounded px-2 py-1 font-bold" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </section>
       </div>

        <!-- 9. SIGNATURES -->
        <section class="pt-8 mt-12 border-t-2 border-slate-200 border-dashed">
            <h2 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 text-center pb-2">9. VERIFICATION SIGNATURES</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto" v-if="props.log.signatures">
                <div>
                   <div class="h-16 border-b-2 border-slate-300 flex items-end pb-2 justify-center italic text-primary-600 font-bold">
                       <span v-if="!isEditable">{{ props.log.signatures.cashierSignature || '' }}</span>
                       <input v-else type="text" v-model="props.log.signatures.cashierSignature" class="bg-transparent border-none text-center outline-none italic w-full text-primary-600 font-bold" placeholder="Type name..." />
                   </div>
                   <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mt-2">Cashier Signature</p>
                </div>
                <div>
                   <div class="h-16 border-b-2 border-slate-300 flex items-end pb-2 justify-center italic text-primary-600 font-bold">
                       <span v-if="!isEditable">{{ props.log.signatures.managerSignature || '' }}</span>
                       <input v-else type="text" v-model="props.log.signatures.managerSignature" class="bg-transparent border-none text-center outline-none italic w-full text-primary-600 font-bold" placeholder="Type name..." />
                   </div>
                   <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mt-2">Manager Signature</p>
                </div>
                <div>
                   <div class="h-16 border-b-2 border-slate-300 flex items-end pb-2 justify-center text-slate-700 font-black">
                       <span v-if="!isEditable">{{ props.log.signatures.date || '' }}</span>
                       <input v-else type="date" v-model="props.log.signatures.date" class="bg-transparent border-none text-center outline-none w-full" />
                   </div>
                   <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mt-2">Date Signed</p>
                </div>
            </div>
        </section>

    </div>
  </div>
</template>
