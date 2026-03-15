<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  FileText,
  CreditCard,
  Plus,
  ArrowUpRight,
  Clock,
  ChevronRight,
  Activity,
  Fuel,
  BarChart3,
  ArrowRight,
  CalendarDays,
  TrendingDown
} from 'lucide-vue-next';
import { useSalesStore } from '../../stores/sales';
import { useAccountsStore } from '../../stores/accounts';
import { useInvoicesStore } from '../../stores/invoices';
import { useLocationsStore } from '../../stores/locations';
import TodaysShiftWidget from '../../components/dashboard/TodaysShiftWidget.vue';
import QuickTimeClockWidget from '../../components/dashboard/QuickTimeClockWidget.vue';
import WeatherWidget from '../../components/dashboard/WeatherWidget.vue';
import FuelPriceWatchWidget from '../../components/dashboard/FuelPriceWatchWidget.vue';

const salesStore = useSalesStore();
const accountsStore = useAccountsStore();
const invoicesStore = useInvoicesStore();
const locationsStore = useLocationsStore();

const isLoaded = ref(false);

onMounted(async () => {
    await Promise.all([
        locationsStore.fetchLocations(),
        salesStore.fetchLogs(),
        accountsStore.fetchAccounts(),
        invoicesStore.fetchInvoices()
    ]);
    setTimeout(() => isLoaded.value = true, 300);
});

const todayDate = new Date().toISOString().split('T')[0];
const formattedDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const totalSalesToday = computed(() => {
    const todayLog = salesStore.logs.find(l => l.date === todayDate);
    return todayLog ? todayLog.totalSales : 0;
});

const yesterdayDate = computed(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
});

const totalSalesYesterday = computed(() => {
    const log = salesStore.logs.find(l => l.date === yesterdayDate.value);
    return log ? log.totalSales : 0;
});

const salesTrend = computed(() => {
    if (totalSalesYesterday.value === 0) return 0;
    return ((totalSalesToday.value - totalSalesYesterday.value) / totalSalesYesterday.value) * 100;
});

const activeAccountsCount = computed(() => accountsStore.accounts.length);
const pendingInvoicesCount = computed(() => invoicesStore.invoices.filter(i => i.status !== 'Paid').length);

const outstandingBalance = computed(() => {
    return accountsStore.accounts.reduce((sum, acc) => {
        const balance = Number(acc.balance);
        return sum + (isNaN(balance) ? 0 : balance);
    }, 0);
});

// Chart Data (Last 7 Days)
const last7DaysSales = computed(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const log = salesStore.logs.find(l => l.date === dateStr);
        days.push({
            date: dateStr,
            label: d.toLocaleDateString('en-US', { weekday: 'short' }),
            sales: log ? log.totalSales : 0
        });
    }
    return days;
});

const maxSales = computed(() => Math.max(...last7DaysSales.value.map(d => d.sales), 1000));
const avgSales = computed(() => {
    const total = salesStore.logs.reduce((s, l) => s + l.totalSales, 0);
    return total / (salesStore.logs.length || 1);
});

// Bar chart heights
const barHeights = computed(() => {
    return last7DaysSales.value.map(d => Math.max((d.sales / maxSales.value) * 100, 4));
});

// SVG Path for sparkline
const revenuePath = computed(() => {
    const width = 600;
    const height = 140;
    if (last7DaysSales.value.length < 2) return "";
    const points = last7DaysSales.value.map((d, i) => {
        const x = (i / 6) * width;
        const y = height - (d.sales / (maxSales.value * 1.1)) * height;
        return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
});

const revenueAreaPath = computed(() => {
    const path = revenuePath.value;
    if (!path) return "";
    return `${path} L 600,140 L 0,140 Z`;
});

const recentLogs = computed(() => {
    return [...salesStore.logs]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);
});

const currentHour = new Date().getHours();
const greeting = computed(() => {
    if (currentHour < 12) return 'Good Morning';
    if (currentHour < 17) return 'Good Afternoon';
    return 'Good Evening';
});
</script>

<template>
  <div class="dashboard-root">

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- PAGE HEADER — Greeting + Date -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <div class="dashboard-header">
      <div class="header-left">
        <p class="greeting-label">{{ greeting }},</p>
        <h1 class="store-title">Operations Center</h1>
        <p class="date-label">
          <CalendarDays class="w-3.5 h-3.5" />
          {{ formattedDate }}
        </p>
      </div>
      <div class="header-right">
        <div class="live-badge">
          <span class="live-dot"></span>
          Live Data
        </div>
        <RouterLink to="/sales" class="btn-new-entry">
          <Plus class="w-4 h-4" />
          New Daily Entry
        </RouterLink>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- ROW 1 — KPI METRIC CARDS -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <div class="kpi-grid">

      <!-- Today's Revenue -->
      <div class="kpi-card kpi-primary">
        <div class="kpi-icon-wrap kpi-icon-blue">
          <DollarSign class="w-5 h-5" />
        </div>
        <div class="kpi-body">
          <span class="kpi-label">Today's Revenue</span>
          <span class="kpi-value">${{ totalSalesToday.toLocaleString(undefined, { minimumFractionDigits: 0 }) }}</span>
          <div class="kpi-trend" :class="salesTrend >= 0 ? 'trend-up' : 'trend-down'">
            <component :is="salesTrend >= 0 ? TrendingUp : TrendingDown" class="w-3.5 h-3.5" />
            <span>{{ Math.abs(salesTrend).toFixed(1) }}% vs yesterday</span>
          </div>
        </div>
        <div class="kpi-sparkline">
          <svg viewBox="0 0 80 32" class="w-full h-full" preserveAspectRatio="none">
            <polyline
              :points="last7DaysSales.map((d,i) => `${(i/6)*80},${32-(d.sales/(maxSales*1.1))*32}`).join(' ')"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            />
          </svg>
        </div>
      </div>

      <!-- Outstanding A/R -->
      <div class="kpi-card">
        <div class="kpi-icon-wrap kpi-icon-rose">
          <CreditCard class="w-5 h-5" />
        </div>
        <div class="kpi-body">
          <span class="kpi-label">Outstanding A/R</span>
          <span class="kpi-value text-rose-600">${{ outstandingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}</span>
          <div class="kpi-sub">{{ activeAccountsCount }} accounts</div>
        </div>
        <RouterLink to="/accounts" class="kpi-action">
          <ArrowUpRight class="w-4 h-4" />
        </RouterLink>
      </div>

      <!-- Active Accounts -->
      <div class="kpi-card">
        <div class="kpi-icon-wrap kpi-icon-emerald">
          <Users class="w-5 h-5" />
        </div>
        <div class="kpi-body">
          <span class="kpi-label">Active Accounts</span>
          <span class="kpi-value text-emerald-600">{{ activeAccountsCount }}</span>
          <div class="kpi-sub">House charge clients</div>
        </div>
        <RouterLink to="/accounts" class="kpi-action">
          <ArrowUpRight class="w-4 h-4" />
        </RouterLink>
      </div>

      <!-- Pending Bills -->
      <div class="kpi-card">
        <div class="kpi-icon-wrap kpi-icon-amber">
          <FileText class="w-5 h-5" />
        </div>
        <div class="kpi-body">
          <span class="kpi-label">Pending Bills</span>
          <span class="kpi-value" :class="pendingInvoicesCount > 0 ? 'text-amber-600' : 'text-slate-900'">{{ pendingInvoicesCount }}</span>
          <div class="kpi-sub">Unpaid invoices</div>
        </div>
        <RouterLink to="/invoices" class="kpi-action">
          <ArrowUpRight class="w-4 h-4" />
        </RouterLink>
      </div>

    </div>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- ROW 2 — MAIN CONTENT: CHART + RIGHT PANEL -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <div class="main-grid">

      <!-- LEFT COL: Sales Chart -->
      <div class="chart-panel">

        <!-- Chart Header -->
        <div class="chart-header">
          <div>
            <h2 class="chart-title">Sales Performance</h2>
            <p class="chart-sub">Daily revenue — last 7 days</p>
          </div>
          <RouterLink to="/sales" class="view-all-btn">
            Full History <ChevronRight class="w-4 h-4" />
          </RouterLink>
        </div>

        <!-- Stat Pills -->
        <div class="chart-stats">
          <div class="stat-pill">
            <span class="stat-pill-label">7-Day Peak</span>
            <span class="stat-pill-value text-primary-700">${{ maxSales.toLocaleString(undefined, {maximumFractionDigits: 0}) }}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-pill">
            <span class="stat-pill-label">Avg / Day</span>
            <span class="stat-pill-value">${{ avgSales.toLocaleString(undefined, {maximumFractionDigits: 0}) }}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-pill">
            <span class="stat-pill-label">Today</span>
            <span class="stat-pill-value text-secondary-600">${{ totalSalesToday.toLocaleString(undefined, {maximumFractionDigits: 0}) }}</span>
          </div>
        </div>

        <!-- Bar Chart -->
        <div class="bar-chart-area">
          <div class="bar-chart">
            <div
              v-for="(d, i) in last7DaysSales"
              :key="d.date"
              class="bar-column"
            >
              <div class="bar-value-label">${{ d.sales > 0 ? (d.sales/1000).toFixed(1)+'k' : '—' }}</div>
              <div class="bar-wrapper">
                <div
                  class="bar-fill"
                  :class="d.date === todayDate ? 'bar-today' : 'bar-default'"
                  :style="{ height: barHeights[i] + '%' }"
                ></div>
              </div>
              <div class="bar-label" :class="d.date === todayDate ? 'text-primary-700 font-black' : ''">{{ d.label }}</div>
            </div>
          </div>
        </div>

        <!-- Area Sparkline -->
        <div class="sparkline-area">
          <svg viewBox="0 0 600 100" class="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#294470" stop-opacity="0.15" />
                <stop offset="100%" stop-color="#294470" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path :d="revenueAreaPath.replace('120', '100').replace('L 400', 'L 600')" fill="url(#sparkGradient)" />
            <path :d="revenuePath" fill="none" stroke="#315bb9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <circle
              v-for="(d, i) in last7DaysSales"
              :key="i"
              :cx="(i/6)*600"
              :cy="100 - (d.sales/(maxSales*1.1))*100"
              r="4"
              fill="white"
              stroke="#315bb9"
              stroke-width="2"
            >
              <title>{{ d.label }}: ${{ d.sales.toLocaleString() }}</title>
            </circle>
          </svg>
        </div>
      </div>

      <!-- RIGHT COL: Widgets Stack -->
      <div class="right-col">

        <!-- Weather Widget -->
        <WeatherWidget />

        <!-- Fuel Price Watch -->
        <FuelPriceWatchWidget />

        <!-- Quick Actions -->
        <div class="quick-actions-panel">
          <h3 class="panel-section-label">Quick Actions</h3>
          <div class="quick-actions-grid">
            <button @click="$router.push('/sales')" class="quick-action-btn">
              <div class="qa-icon qa-icon-blue"><Plus class="w-5 h-5" /></div>
              <span>New Sale</span>
            </button>
            <button @click="$router.push('/fuel')" class="quick-action-btn">
              <div class="qa-icon qa-icon-indigo"><Fuel class="w-5 h-5" /></div>
              <span>Fuel Log</span>
            </button>
            <button @click="$router.push('/payments')" class="quick-action-btn">
              <div class="qa-icon qa-icon-emerald"><DollarSign class="w-5 h-5" /></div>
              <span>Payments</span>
            </button>
            <button @click="$router.push('/invoices')" class="quick-action-btn">
              <div class="qa-icon qa-icon-amber"><FileText class="w-5 h-5" /></div>
              <span>Invoices</span>
            </button>
            <button @click="$router.push('/analytics/forecasting')" class="quick-action-btn">
              <div class="qa-icon qa-icon-violet"><BarChart3 class="w-5 h-5" /></div>
              <span>Analytics</span>
            </button>
            <button @click="$router.push('/time-clock')" class="quick-action-btn">
              <div class="qa-icon qa-icon-rose"><Clock class="w-5 h-5" /></div>
              <span>Time Clock</span>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- ROW 3 — STAFF + RECENT LOGS -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <div class="bottom-grid">

      <!-- Today's Staff Widget -->
      <div class="staff-col">
        <TodaysShiftWidget />
      </div>

      <!-- Recent Settlements -->
      <div class="settlements-panel">
        <div class="settlements-header">
          <div>
            <h3 class="panel-title">Recent Settlements</h3>
            <p class="panel-sub">Latest daily log summaries</p>
          </div>
          <RouterLink to="/sales" class="view-all-btn">
            View All <ArrowRight class="w-4 h-4" />
          </RouterLink>
        </div>

        <div class="settlements-table">
          <div class="table-head">
            <span>Date</span>
            <span>Day</span>
            <span>Revenue</span>
            <span>vs Peak</span>
          </div>
          <div class="table-body">
            <div
              v-for="log in recentLogs"
              :key="log.id"
              class="table-row"
            >
              <span class="row-date">{{ new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}</span>
              <span class="row-day-badge">{{ new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' }) }}</span>
              <span class="row-sales">${{ log.totalSales.toLocaleString(undefined, {maximumFractionDigits: 0}) }}</span>
              <div class="row-bar-wrap">
                <div class="row-bar-track">
                  <div
                    class="row-bar-fill"
                    :style="{ width: Math.min((log.totalSales / maxSales) * 100, 100) + '%' }"
                  ></div>
                </div>
                <span class="row-pct">{{ Math.round((log.totalSales / maxSales) * 100) }}%</span>
              </div>
            </div>
            <div v-if="recentLogs.length === 0" class="table-empty">
              <Activity class="w-8 h-8 text-slate-200" />
              <p>No sales logs found</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Time Clock Widget -->
      <div class="timeclock-col">
        <QuickTimeClockWidget />
      </div>

    </div>

  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   DASHBOARD ROOT
══════════════════════════════════════════════════════════════ */
.dashboard-root {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.75rem 1.75rem 2.5rem;
  max-width: 1800px;
  margin: 0 auto;
  animation: dashboardFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes dashboardFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ══════════════════════════════════════════════════════════════
   PAGE HEADER
══════════════════════════════════════════════════════════════ */
.dashboard-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding-bottom: 0.25rem;
}

.greeting-label {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #64748b;
  margin: 0 0 0.25rem 0;
}

.store-title {
  font-size: 1.85rem;
  font-weight: 900;
  color: #f8fafc;
  letter-spacing: -0.04em;
  margin: 0 0 0.35rem 0;
  line-height: 1;
}

.date-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.live-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #16a34a;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
}

.live-dot {
  width: 6px;
  height: 6px;
  background: #22c55e;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

.btn-new-entry {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #294470;
  color: white;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0.65rem 1.25rem;
  border-radius: 0.75rem;
  text-decoration: none;
  transition: all 0.2s;
  letter-spacing: 0.01em;
  box-shadow: 0 4px 14px -2px rgba(41, 68, 112, 0.35);
}

.btn-new-entry:hover {
  background: #213555;
  box-shadow: 0 6px 20px -2px rgba(41, 68, 112, 0.45);
  transform: translateY(-1px);
}

/* ══════════════════════════════════════════════════════════════
   KPI GRID
══════════════════════════════════════════════════════════════ */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.kpi-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 1.5rem;
  padding: 1.25rem 1.4rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
  overflow: hidden;
  transition: all 0.25s;
  box-shadow: 0 1px 8px -2px rgba(15,23,42,0.04);
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px -4px rgba(15,23,42,0.08);
  border-color: #e2e8f0;
}

.kpi-primary {
  border-color: #e1e9f8;
  background: linear-gradient(135deg, #f8faff 0%, white 100%);
}

.kpi-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kpi-icon-blue   { background: #eff6ff; color: #2563eb; }
.kpi-icon-rose   { background: #fff1f2; color: #e11d48; }
.kpi-icon-emerald { background: #f0fdf4; color: #16a34a; }
.kpi-icon-amber  { background: #fffbeb; color: #d97706; }

.kpi-body {
  flex: 1;
  min-width: 0;
}

.kpi-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #94a3b8;
  margin-bottom: 0.2rem;
}

.kpi-value {
  display: block;
  font-size: 1.6rem;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.kpi-trend {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  font-weight: 700;
  margin-top: 0.3rem;
}

.trend-up   { color: #16a34a; }
.trend-down { color: #dc2626; }

.kpi-sub {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  margin-top: 0.3rem;
}

.kpi-action {
  width: 32px;
  height: 32px;
  border-radius: 0.5rem;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  text-decoration: none;
  transition: all 0.2s;
  flex-shrink: 0;
}

.kpi-action:hover { background: #f1f5f9; color: #294470; }

.kpi-sparkline {
  position: absolute;
  right: 1rem;
  bottom: 0.75rem;
  width: 80px;
  height: 32px;
  opacity: 0.2;
  color: #294470;
}

/* ══════════════════════════════════════════════════════════════
   MAIN GRID (CHART + RIGHT SIDEBAR)
══════════════════════════════════════════════════════════════ */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 1.25rem;
}

/* Chart Panel */
.chart-panel {
  background: white;
  border: 1px solid #f1f5f9;
  border-radius: 1.5rem;
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-shadow: 0 1px 8px -2px rgba(15,23,42,0.04);
}

.chart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.chart-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin: 0 0 0.2rem 0;
}

.chart-sub {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0;
}

.view-all-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: #294470;
  text-decoration: none;
  background: #f0f4fc;
  padding: 0.4rem 0.85rem;
  border-radius: 0.625rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.view-all-btn:hover { background: #e1e9f8; }

.chart-stats {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0.875rem 1.25rem;
  background: #f8fafc;
  border-radius: 1rem;
  border: 1px solid #f1f5f9;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.stat-pill-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #94a3b8;
}

.stat-pill-value {
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.025em;
}

.stat-divider {
  width: 1px;
  height: 28px;
  background: #e2e8f0;
}

/* Bar Chart */
.bar-chart-area {
  flex: 1;
  min-height: 160px;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  height: 160px;
  padding-bottom: 1.5rem;
}

.bar-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  height: 100%;
}

.bar-value-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
  white-space: nowrap;
}

.bar-wrapper {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}

.bar-fill {
  width: 100%;
  border-radius: 0.5rem 0.5rem 0.375rem 0.375rem;
  transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  min-height: 4px;
}

.bar-default { background: linear-gradient(180deg, #c5d7f1 0%, #e1e9f8 100%); }
.bar-today   { background: linear-gradient(180deg, #294470 0%, #315bb9 100%); box-shadow: 0 4px 12px -2px rgba(41,68,112,0.3); }

.bar-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Area Sparkline */
.sparkline-area {
  height: 70px;
  width: 100%;
  border-radius: 0.75rem;
  overflow: hidden;
  opacity: 0.8;
}

/* Right Column */
.right-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Quick Actions */
.quick-actions-panel {
  background: white;
  border: 1px solid #f1f5f9;
  border-radius: 1.25rem;
  padding: 1.25rem;
  box-shadow: 0 1px 8px -2px rgba(15,23,42,0.04);
}

.panel-section-label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #94a3b8;
  margin: 0 0 0.875rem 0;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.625rem;
}

.quick-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 0.5rem 0.75rem;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.quick-action-btn:hover {
  background: white;
  border-color: #e2e8f0;
  box-shadow: 0 4px 12px -2px rgba(15,23,42,0.07);
  transform: translateY(-1px);
  color: #0f172a;
}

.qa-icon {
  width: 36px;
  height: 36px;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qa-icon-blue   { background: #eff6ff; color: #2563eb; }
.qa-icon-indigo { background: #eef2ff; color: #4338ca; }
.qa-icon-emerald { background: #f0fdf4; color: #16a34a; }
.qa-icon-amber  { background: #fffbeb; color: #d97706; }
.qa-icon-violet { background: #f5f3ff; color: #7c3aed; }
.qa-icon-rose   { background: #fff1f2; color: #e11d48; }

/* ══════════════════════════════════════════════════════════════
   BOTTOM GRID (STAFF + SETTLEMENTS + TIME CLOCK)
══════════════════════════════════════════════════════════════ */
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1.6fr 1fr;
  gap: 1.25rem;
  align-items: start;
}

.staff-col,
.timeclock-col {
  min-height: 380px;
}

/* Settlements Panel */
.settlements-panel {
  background: white;
  border: 1px solid #f1f5f9;
  border-radius: 1.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 8px -2px rgba(15,23,42,0.04);
}

.settlements-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.panel-title {
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin: 0 0 0.2rem 0;
}

.panel-sub {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  margin: 0;
}

/* Table */
.settlements-table {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid #f1f5f9;
  border-radius: 1rem;
  overflow: hidden;
}

.table-head {
  display: grid;
  grid-template-columns: 80px 60px 90px 1fr;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  background: #f8fafc;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #94a3b8;
  border-bottom: 1px solid #f1f5f9;
}

.table-body {
  display: flex;
  flex-direction: column;
}

.table-row {
  display: grid;
  grid-template-columns: 80px 60px 90px 1fr;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  align-items: center;
  border-bottom: 1px solid #f8fafc;
  transition: background 0.15s;
}

.table-row:last-child { border-bottom: none; }
.table-row:hover { background: #fafbff; }

.row-date {
  font-size: 0.85rem;
  font-weight: 700;
  color: #334155;
}

.row-day-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f0f4fc;
  color: #294470;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.55rem;
  border-radius: 0.5rem;
}

.row-sales {
  font-size: 0.85rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.row-bar-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.row-bar-track {
  flex: 1;
  height: 6px;
  background: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
}

.row-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #294470, #315bb9);
  border-radius: 9999px;
  transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.row-pct {
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
  width: 40px;
  text-align: right;
}

.table-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2.5rem 1rem;
  color: #cbd5e1;
  font-size: 0.85rem;
  font-weight: 600;
}

/* ══════════════════════════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════════════════════════ */
@media (max-width: 1280px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .main-grid { grid-template-columns: 1fr; }
  .right-col { flex-direction: row; flex-wrap: wrap; }
  .right-col > * { flex: 1 1 260px; }
  .bottom-grid { grid-template-columns: 1fr 1fr; }
  .timeclock-col { grid-column: 1 / -1; }
}

@media (max-width: 768px) {
  .dashboard-root { padding: 1rem; gap: 1rem; }
  .dashboard-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .bottom-grid { grid-template-columns: 1fr; }
  .store-title { font-size: 1.4rem; }
}
</style>
