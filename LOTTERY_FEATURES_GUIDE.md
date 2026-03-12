# Lottery Management System - Feature Implementation Guide

## 🎯 Overview
This document outlines the implementation of advanced features for the Lottery Management System, including barcode integration, audit trails, auto-save, print layouts, and more.

---

## ✅ Phase 1: Foundation (COMPLETED)

### 1. Barcode/QR Code Integration
**Location:** `/src/components/BarcodeScanner.vue`

**Features:**
- Camera-based barcode/QR code scanning
- Manual input fallback
- Reusable component for any module

**Usage Example:**
```vue
<BarcodeScanner 
  button-text="Scan Book"
  @scanned="handleBookScanned"
/>

<script setup>
const handleBookScanned = (bookNumber: string) => {
  // Look up book by number
  // Auto-fill form or navigate to book details
};
</script>
```

**Integration Points:**
- ✅ Inventory View: Quick book lookup
- ⏳ Assign Tab: Scan to activate books
- ⏳ Settlement: Scan settlement slips
- ⏳ Return: Scan books to return

---

### 2. Auto-Save Drafts
**Location:** `/src/composables/useAutoSave.ts`

**Features:**
- Automatic draft saving to localStorage
- Configurable debounce delay
- Draft age tracking
- 24-hour expiration

**Usage Example:**
```vue
<script setup>
import { useAutoSave } from '@/composables/useAutoSave';

const counts = ref([...]);
const { 
  loadDraft, 
  clearDraft, 
  hasDraft, 
  getDraftAge,
  lastSaved,
  isSaving 
} = useAutoSave('daily-count-2026-02-08', counts, {
  debounceMs: 2000,
  enabled: true
});

onMounted(() => {
  if (hasDraft()) {
    const age = getDraftAge();
    if (confirm(`Found draft from ${age} minutes ago. Restore?`)) {
      const draft = loadDraft();
      if (draft) counts.value = draft;
    }
  }
});

const handleSubmit = async () => {
  await saveCounts();
  clearDraft(); // Clear after successful save
};
</script>

<template>
  <div class="auto-save-indicator" v-if="isSaving">
    <span>Saving draft...</span>
  </div>
  <div class="auto-save-indicator" v-else-if="lastSaved">
    <span>Last saved: {{ lastSaved.toLocaleTimeString() }}</span>
  </div>
</template>
```

**Integration Points:**
- ⏳ Daily Reconciliation: Auto-save counts as user types
- ⏳ Settlement Form: Save settlement details
- ⏳ Return Form: Save return information

---

### 3. Print Layouts
**Location:** `/src/utils/print.ts`

**Features:**
- Generate printer-friendly HTML
- Portrait/Landscape orientation
- CSV export capability
- Customizable headers and footers

**Usage Example:**
```vue
<script setup>
import { generatePrintTable, printDocument, exportToCSV } from '@/utils/print';

const handlePrint = () => {
  const headers = ['Book #', 'Game', 'Begin #', 'End #', 'Sold', 'Total $'];
  const rows = counts.value.map(c => [
    c._bookNumber,
    c._gameName,
    c.startTicket,
    c.endTicket,
    c.soldCount,
    `$${c.salesAmount.toFixed(2)}`
  ]);

  const html = generatePrintTable(headers, rows, {
    title: 'Daily Lottery Count - Feb 8, 2026',
    orientation: 'landscape',
    includeTimestamp: true,
    includeLocation: true
  });

  printDocument(html);
};

const handleExportCSV = () => {
  const headers = ['Book #', 'Game', 'Begin #', 'End #', 'Sold', 'Total $'];
  const rows = counts.value.map(c => [...]);
  
  exportToCSV(headers, rows, 'daily-count-2026-02-08.csv');
};
</script>

<template>
  <button @click="handlePrint">🖨️ Print</button>
  <button @click="handleExportCSV">📊 Export CSV</button>
</template>
```

**Integration Points:**
- ⏳ Daily Reconciliation: Print daily count report
- ⏳ Settlement: Print settlement worksheet
- ⏳ Inventory Summary: Print stock report
- ⏳ Settlement History: Export to Excel

---

### 4. Audit Trail & Compliance
**Location:** `/src/stores/audit.ts`

**Features:**
- Comprehensive activity logging
- User, timestamp, and location tracking
- Filterable audit logs
- Module-specific tracking

**Usage Example:**
```vue
<script setup>
import { useAuditStore } from '@/stores/audit';

const auditStore = useAuditStore();

const activateBook = async (bookId: string, registerId: string) => {
  await lotteryStore.activateBook(bookId, registerId);
  
  // Log the action
  await auditStore.logAction(
    'lottery',
    'BOOK_ACTIVATED',
    'lottery_book',
    {
      bookId,
      bookNumber: book.bookNumber,
      registerId,
      gameName: book.gameName
    },
    bookId
  );
};

const settleBook = async (bookId: string, data: any) => {
  await lotteryStore.settleBook(bookId, data);
  
  await auditStore.logAction(
    'lottery',
    'SETTLEMENT_CREATED',
    'settlement',
    {
      bookId,
      grossSales: data.grossSales,
      netDue: data.netDue
    }
  );
};
</script>
```

**Audit Log Actions:**
```typescript
// Lottery Module
'BOOK_RECEIVED'
'BOOK_ACTIVATED'
'BOOK_RETURNED'
'SETTLEMENT_CREATED'
'COUNT_FINALIZED'
'VARIANCE_REPORTED'

// Auth Module
'USER_LOGIN'
'USER_LOGOUT'
'PERMISSION_CHANGED'

// System Module
'BACKUP_CREATED'
'DATA_EXPORTED'
```

**Integration Points:**
- ⏳ All lottery actions (receive, activate, settle, return)
- ⏳ Daily count finalization
- ⏳ User authentication events
- ⏳ Data exports and reports

---

## ⏳ Phase 2: Data & Compliance (NEXT)

### 5. Enhanced Reporting & Analytics
**Planned Features:**
- Sales performance dashboard
- Top-performing games widget
- Revenue trends chart (daily/weekly/monthly)
- Variance analysis report
- Commission earnings breakdown

**Components to Create:**
- `/src/views/lottery/LotteryAnalyticsView.vue`
- `/src/components/charts/SalesChart.vue`
- `/src/components/charts/GamePerformanceChart.vue`

---

### 6. Automated Alerts & Notifications
**Planned Features:**
- Low stock alerts (<20% remaining)
- Settlement reminders (>24hrs unsettled)
- Variance threshold alerts (>$50)
- Game expiration warnings

**Components to Create:**
- `/src/stores/notifications.ts`
- `/src/components/NotificationBell.vue`
- `/src/utils/alertRules.ts`

---

## ⏳ Phase 3: Advanced Features (FUTURE)

### 7. Financial Daily Cash Reconciliation
**Planned Features:**
- Match lottery sales to cash drawer
- Automated variance detection
- End-of-day reconciliation workflow

### 8. Offline Mode
**Planned Features:**
- Service worker for offline capability
- Local data sync queue
- Background sync when online

---

## 🚀 Next Steps

### Immediate Actions (You Can Do Now):

1. **Integrate Barcode Scanner into Inventory View:**
   - Add scanner to "Receive" tab for quick game lookup
   - Add scanner to "Assign" tab for book activation

2. **Add Auto-Save to Daily Reconciliation:**
   - Import `useAutoSave` composable
   - Show save indicator in UI
   - Restore draft on page load

3. **Add Print Buttons:**
   - Daily Reconciliation: Print count report
   - Settlement: Print settlement worksheet
   - Inventory: Print stock summary

4. **Integrate Audit Logging:**
   - Add `auditStore.logAction()` calls to all major actions
   - Create audit log viewer page

### Files to Modify:

1. `/src/views/lottery/LotteryInventoryView.vue`
   - Add `<BarcodeScanner>` component
   - Add print button

2. `/src/views/lottery/DailyReconciliationView.vue`
   - Add `useAutoSave` composable
   - Add print button
   - Add audit logging on submit

3. `/src/views/lottery/LotterySettlementView.vue`
   - Add print button
   - Add audit logging

4. `/src/stores/lottery.ts`
   - Add audit logging to all actions

---

## 📋 Implementation Checklist

### Phase 1 (Foundation) ✅
- [x] Barcode Scanner Component
- [x] Auto-Save Composable
- [x] Print Utilities
- [x] Audit Trail Store

### Phase 1 Integration (In Progress)
- [ ] Add scanner to Inventory View
- [ ] Add auto-save to Daily Reconciliation
- [ ] Add print buttons to all views
- [ ] Integrate audit logging

### Phase 2 (Data & Compliance)
- [ ] Analytics Dashboard
- [ ] Sales Charts
- [ ] Automated Alerts
- [ ] Notification System

### Phase 3 (Advanced)
- [ ] Cash Reconciliation
- [ ] Offline Mode
- [ ] Service Worker

---

## 🎨 UI Components Needed

### Auto-Save Indicator
```vue
<div class="fixed bottom-4 right-4 px-4 py-2 bg-white shadow-lg rounded-full border border-slate-200">
  <div v-if="isSaving" class="flex items-center gap-2 text-sm text-slate-600">
    <Loader class="w-4 h-4 animate-spin" />
    <span>Saving draft...</span>
  </div>
  <div v-else-if="lastSaved" class="flex items-center gap-2 text-sm text-emerald-600">
    <Check class="w-4 h-4" />
    <span>Saved {{ formatTimeAgo(lastSaved) }}</span>
  </div>
</div>
```

### Print Button
```vue
<button 
  @click="handlePrint"
  class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center gap-2"
>
  <Printer class="w-4 h-4" />
  Print Report
</button>
```

---

## 📊 Database Collections

### New Collections:
```typescript
// audit_logs
{
  id: string;
  timestamp: Timestamp;
  userId: string;
  userEmail: string;
  userName: string;
  locationId: string;
  module: 'lottery' | 'fuel' | 'inventory' | ...;
  action: string;
  entityType: string;
  entityId?: string;
  details: object;
  userAgent: string;
}
```

---

## 🔐 Security Considerations

1. **Audit Logs:** Read-only for non-admin users
2. **Print Access:** All users can print their own reports
3. **Auto-Save:** Stored locally, not synced (privacy)
4. **Barcode Scanner:** Requires camera permission

---

## 📱 Mobile Considerations

- Barcode scanner works on mobile devices
- Print layouts are responsive
- Auto-save works on all devices
- Audit logs accessible from mobile

---

**Ready to proceed with integration?** Let me know which feature you'd like to integrate first!
