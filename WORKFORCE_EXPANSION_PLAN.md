# Workforce Hub Expansion: Implementation Plan

## Phase 1: Security & Verification (Module 2)
- [ ] **Task Photo/QR Verification**: 
    - [ ] Update `tasks` store to support image URLs and QR IDs.
    - [ ] Modify Task completion component to handle camera/file input.
    - [ ] Add QR code generator/scanner utility.

## Phase 2: Employee Performance (Module 3)
- [ ] **Performance Scorecards**:
    - [ ] Create `EmployeeProfileView.vue` for individual performance drill-down.
    - [ ] Implement analytics logic: Punctuality (Timesheets vs Schedule), Reliability (Swaps/Coverage), Task Completion rate.
    - [ ] Add visual "Scorecard" card to `EmployeesView.vue`.

## Phase 3: AI & Financial Insights (Module 1 & 5)
- [ ] **Sales & Labor Predictive Analytics**:
    - [ ] Implement simple moving average/linear regression for sales forecasting.
    - [ ] Create labor-to-sales ratio visualizations.
    - [ ] Add "Over-staffing" heatmaps to the Schedule view.
- [ ] **Operational Alerts**:
    - [ ] Build a notification center component.
    - [ ] Add logic for "High Cash" and "Late Clock-in" alerts.

## Phase 4: Inventory & Procurement (Module 4)
- [ ] **Advanced Inventory Hub**:
    - [ ] Add Par Levels and Reorder Points to inventory items.
    - [ ] Build "Auto-Order List" generation.
    - [ ] Implement Fuel Price trend tracking (graphs).

## Phase 5: Digital Archive (Module 6)
- [ ] **Document Vault**:
    - [ ] Create a searchable document library for Invoices and Compliance docs.
    - [ ] Add expiration date tracking for permits.

---

### Tech Stack / Dependencies
- **Charts**: `recharts` or `apexcharts` (need to check if installed).
- **Scanning**: Existing `tesseract.js` + `browser-qr-code-scanner`?
- **Notifications**: Internal state + potentially Firebase Cloud Messaging.
