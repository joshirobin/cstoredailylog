const fs = require('fs');
let code = fs.readFileSync('src/views/operations/DailySalesView.vue', 'utf8');

code = code.replace(/const openingCash = ref<number>\(0\);\nconst closingCash = ref<number>\(0\);\nconst openingDetails = ref<DenominationCounts \| undefined>\(undefined\);\nconst closingDetails = ref<DenominationCounts \| undefined>\(undefined\);\n\n\/\/ Safe Deposit\nconst safeCash = ref<number>\(0\);\nconst safeDetails = ref<DenominationCounts \| undefined>\(undefined\);\nconst checks = ref<Check\[\]>\(\[\]\);\n\nconst expenses = ref<number>\(0\); \nconst notes = ref\(''\);/g, 
`const currentLogForm = ref<Partial<SalesLog>>({
    openingCash: 0, closingCash: 0, safeCash: 0, expenses: 0, checks: [], notes: '',
    creditCardSummary: { visa: 0, mastercard: 0, amex: 0, discover: 0, other: 0, total: 0 },
    fuelSalesSummary: { regularGallons: 0, regularSales: 0, premiumGallons: 0, premiumSales: 0, dieselGallons: 0, dieselSales: 0, total: 0 },
    lotteryReconciliation: { openingBalance: 0, lotterySales: 0, lotteryPaidOut: 0, settlementsPaid: 0, endingBalance: 0 },
    safeReconciliation: { openingSafeBalance: 0, cashDrops: 0, cashRemoved: 0, endingSafeBalance: 0 },
    paidOutLog: [],
    depositSummary: { cashDeposit: 0, coins: 0, total: 0, depositBagNumber: '' },
    posZReportSummary: { insideSales: 0, fuelSales: 0, lotterySales: 0, totalSales: 0 },
    signatures: { cashierSignature: '', managerSignature: '', date: '' },
    cashSales: 0, lotteryCashSales: 0, safeCashAdded: 0, otherCashIn: 0, safeDrops: 0, lotteryPaidOut: 0, bankDeposit: 0, otherCashOut: 0
});
const openingDetails = ref<DenominationCounts | undefined>(undefined);
const closingDetails = ref<DenominationCounts | undefined>(undefined);
const safeDetails = ref<DenominationCounts | undefined>(undefined);`);

code = code.replace(/openingCash\.value = prevLog\.closingCash;/g, `currentLogForm.value.openingCash = prevLog.closingCash;`);

code = code.replace(/const dailySales = computed\(\(\) => \{\n  return \(closingCash\.value - openingCash\.value\) - expenses\.value;\n\}\);/g, 
`const dailySales = computed(() => {
  return ((currentLogForm.value.closingCash || 0) - (currentLogForm.value.openingCash || 0)) - (currentLogForm.value.expenses || 0);
});`);

code = code.replace(/const checksTotal = computed\(\(\) => \{\n  return checks\.value\.reduce\(\(sum, check\) => sum \+ \(check\.amount \|\| 0\), 0\);\n\}\);/g, 
`const checksTotal = computed(() => {
  return (currentLogForm.value.checks || []).reduce((sum, check) => sum + (check.amount || 0), 0);
});`);

code = code.replace(/const safeTotal = computed\(\(\) => \{\n  return safeCash\.value \+ checksTotal\.value;\n\}\);/g,
`const safeTotal = computed(() => {
  return (currentLogForm.value.safeCash || 0) + checksTotal.value;
});`);

code = code.replace(/const loadLogForEditing = \(log: SalesLog\) => \{[\s\S]*?otherUrl\.value = log\.otherUrl \|\| '';\n\};/g,
`const loadLogForEditing = (log: SalesLog) => {
    editingLogId.value = log.id;
    selectedDate.value = log.date;
    currentLogForm.value = JSON.parse(JSON.stringify(log));
    openingDetails.value = log.openingDenominations;
    closingDetails.value = log.closingDenominations;
    safeDetails.value = log.safeCashDetails;
    lottoUrl.value = log.lottoUrl || '';
    otherUrl.value = log.otherUrl || '';
    lottoFile.value = null;
    otherFile.value = null;
};`);

code = code.replace(/const resetForm = \(\) => \{[\s\S]*?otherFile\.value = null;\n\};/g,
`const resetForm = () => {
    currentLogForm.value = {
        openingCash: 0, closingCash: 0, safeCash: 0, expenses: 0, checks: [], notes: '',
        creditCardSummary: { visa: 0, mastercard: 0, amex: 0, discover: 0, other: 0, total: 0 },
        fuelSalesSummary: { regularGallons: 0, regularSales: 0, premiumGallons: 0, premiumSales: 0, dieselGallons: 0, dieselSales: 0, total: 0 },
        lotteryReconciliation: { openingBalance: 0, lotterySales: 0, lotteryPaidOut: 0, settlementsPaid: 0, endingBalance: 0 },
        safeReconciliation: { openingSafeBalance: 0, cashDrops: 0, cashRemoved: 0, endingSafeBalance: 0 },
        paidOutLog: [],
        depositSummary: { cashDeposit: 0, coins: 0, total: 0, depositBagNumber: '' },
        posZReportSummary: { insideSales: 0, fuelSales: 0, lotterySales: 0, totalSales: 0 },
        signatures: { cashierSignature: '', managerSignature: '', date: '' },
        cashSales: 0, lotteryCashSales: 0, safeCashAdded: 0, otherCashIn: 0, safeDrops: 0, lotteryPaidOut: 0, bankDeposit: 0, otherCashOut: 0
    };
    openingDetails.value = undefined;
    closingDetails.value = undefined;
    safeDetails.value = undefined;
    lottoUrl.value = '';
    otherUrl.value = '';
    lottoFile.value = null;
    otherFile.value = null;
};`);

code = code.replace(/const logData: Omit<SalesLog, 'id' \| 'locationId'> = \{[\s\S]*?submittedBy: 'Manager' \n     \};/g,
`const logData: Omit<SalesLog, 'id' | 'locationId'> = {
        ...(currentLogForm.value as any),
        date: selectedDate.value,
        openingDenominations: openingDetails.value,
        closingDenominations: closingDetails.value,
        safeCashDetails: safeDetails.value,
        totalSales: dailySales.value,
        lottoUrl: currentLottoUrl,
        otherUrl: currentOtherUrl,
        status: 'PENDING_REVIEW',
        submittedBy: 'Manager' 
     };`);

code = code.replace(/const addCheck = \(\) => checks\.value\.push\(\{ number: '', amount: 0 \}\);/g, 
`const addCheck = () => { if(!currentLogForm.value.checks) currentLogForm.value.checks = []; currentLogForm.value.checks.push({ number: '', amount: 0 }); };`);

code = code.replace(/const removeCheck = \(idx: number\) => checks\.value\.splice\(idx, 1\);/g, 
`const removeCheck = (idx: number) => { currentLogForm.value.checks?.splice(idx, 1); };`);


// Template replace
const section1Start = code.indexOf('<!-- Section 1: Cash Operations -->');
const section3Start = code.indexOf('<!-- Section 3: Finalization -->');
if (section1Start !== -1 && section3Start !== -1) {
    code = code.substring(0, section1Start) + 
`<div class="glass-panel overflow-hidden mb-8">
  <DailyReconciliationForm :log="currentLogForm" :isEditable="true" />
</div>
` + code.substring(section3Start);
}

// Rebind expenses and notes inside Section 3
code = code.replace(/v-model\.number="expenses"/g, 'v-model.number="currentLogForm.expenses"');
code = code.replace(/v-model="notes"/g, 'v-model="currentLogForm.notes"');

fs.writeFileSync('src/views/operations/DailySalesView.vue', code);
