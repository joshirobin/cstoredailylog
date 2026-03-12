const fs = require('fs');
const content = fs.readFileSync('src/views/operations/DailySalesView.vue', 'utf8');

let newContent = content;

// 1. Replace state variables with currentLog object
newContent = newContent.replace(/const openingCash = ref<number>\(0\);/, `const currentLog = ref<Partial<SalesLog>>({});`);
newContent = newContent.replace(/const closingCash = ref<number>\(0\);\n/g, '');
newContent = newContent.replace(/const safeCash = ref<number>\(0\);\n/g, '');
newContent = newContent.replace(/const checks = ref<Check\[\]>\(\[\]\);\n/g, '');
newContent = newContent.replace(/const expenses = ref<number>\(0\); \n/g, '');
newContent = newContent.replace(/const notes = ref\(''\);\n/g, '');

// 2. Adjust computed properties
newContent = newContent.replace(
  /const dailySales = computed\(\(\) => \{\n  return \(closingCash\.value - openingCash\.value\) - expenses\.value;\n\}\);/,
  `const dailySales = computed(() => {
  return ((currentLog.value.closingCash || 0) - (currentLog.value.openingCash || 0)) - (currentLog.value.expenses || 0);
});`
);
newContent = newContent.replace(
  /const checksTotal = computed\(\(\) => \{\n  return checks\.value\.reduce\(\(sum, check\) => sum \+ \(check\.amount \|\| 0\), 0\);\n\}\);/,
  `const checksTotal = computed(() => {
  return (currentLog.value.checks || []).reduce((sum, check) => sum + (check.amount || 0), 0);
});`
);
newContent = newContent.replace(
  /const safeTotal = computed\(\(\) => \{\n  return safeCash\.value \+ checksTotal\.value;\n\}\);/,
  `const safeTotal = computed(() => {
  return (currentLog.value.safeCash || 0) + checksTotal.value;
});`
);

newContent = newContent.replace(
  /const addCheck = \(\) => checks\.value\.push\(\{ number: '', amount: 0 \}\);/,
  `const addCheck = () => { if(!currentLog.value.checks) currentLog.value.checks = []; currentLog.value.checks.push({ number: '', amount: 0 }); };`
);
newContent = newContent.replace(
  /const removeCheck = \(idx: number\) => checks\.value\.splice\(idx, 1\);/,
  `const removeCheck = (idx: number) => { currentLog.value.checks?.splice(idx, 1); };`
);

// 3. Update resetForm function
newContent = newContent.replace(
  /const resetForm = \(\) => \{\n    openingCash\.value = 0;\n    closingCash\.value = 0;\n    openingDetails\.value = undefined;\n    closingDetails\.value = undefined;\n    safeCash\.value = 0;\n    safeDetails\.value = undefined;\n    checks\.value = \[\];\n    expenses\.value = 0;\n    notes\.value = '';\n/,
  `const resetForm = () => {
    currentLog.value = {
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
`
);

// 4. Update loadLogForEditing function
newContent = newContent.replace(
  /const loadLogForEditing = \(log: SalesLog\) => \{\n    editingLogId\.value = log\.id;\n    selectedDate\.value = log\.date;\n    openingCash\.value = log\.openingCash;\n    closingCash\.value = log\.closingCash;\n    openingDetails\.value = log\.openingDenominations;\n    closingDetails\.value = log\.closingDenominations;\n    safeCash\.value = log\.safeCash \|\| 0;\n    safeDetails\.value = log\.safeCashDetails;\n    checks\.value = log\.checks \|\| \[\];\n    expenses\.value = log\.expenses \|\| 0;\n    notes\.value = log\.notes \|\| '';\n/,
  `const loadLogForEditing = (log: SalesLog) => {
    editingLogId.value = log.id;
    selectedDate.value = log.date;
    currentLog.value = JSON.parse(JSON.stringify(log));
    openingDetails.value = log.openingDenominations;
    closingDetails.value = log.closingDenominations;
    safeDetails.value = log.safeCashDetails;
`
);

// 5. Update saveDailyLog function
const saveDailyLogReplacement = `const logData: Omit<SalesLog, 'id' | 'locationId'> = {
        ...(currentLog.value as any),
        date: selectedDate.value,
        openingDenominations: openingDetails.value,
        closingDenominations: closingDetails.value,
        safeCashDetails: safeDetails.value,
        safeTotal: safeTotal.value,
        totalSales: dailySales.value,
        lottoUrl: currentLottoUrl,
        otherUrl: currentOtherUrl,
        status: 'PENDING_REVIEW',
        submittedBy: 'Manager' 
     };`;

newContent = newContent.replace(
  /const logData[\s\S]*?status: 'PENDING_REVIEW',\n        submittedBy: 'Manager' \n     \};/,
  saveDailyLogReplacement
);

// 6. Fix checkExistingLog
newContent = newContent.replace(
  /openingCash\.value = prevLog\.closingCash;/,
  `if (!currentLog.value) resetForm();\n            currentLog.value.openingCash = prevLog.closingCash;`
);


// Template updates
// Find the "Section 1: Cash Operations" up to the Closing section "Finalization" and replace with `<DailyReconciliationForm />`
const templateStart = newContent.indexOf('<!-- Section 1: Cash Operations -->');
const finalizationStart = newContent.indexOf('<!-- Section 3: Finalization -->');

if (templateStart !== -1 && finalizationStart !== -1) {
    const beforeTemplate = newContent.substring(0, templateStart);
    const afterTemplate = newContent.substring(finalizationStart);
    newContent = beforeTemplate + `<!-- Daily Reconciliation Form -->
          <DailyReconciliationForm :log="currentLog" :isEditable="true" />\n\n          ` + afterTemplate;
}

// Adjust binding in finalization
newContent = newContent.replace(/v-model\.number="expenses"/g, 'v-model.number="currentLog.expenses"');
newContent = newContent.replace(/v-model="notes"/g, 'v-model="currentLog.notes"');

fs.writeFileSync('src/views/operations/DailySalesView.vue', newContent);
