import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Store, Ticket, Timer, Users, Droplet,
    Calculator, BrainCircuit, FileText, Trash2, ShieldCheck,
    BarChartHorizontal, Truck, Camera, MessageSquare, TrendingUp,
    Calendar, DollarSign, LogOut
} from 'lucide-react';
import LotteryInventoryView from './views/lottery/LotteryInventoryView';
import LotteryShrinkageView from './views/lottery/LotteryShrinkageView';
import DailySalesView from './views/DailySalesView';
import AnalyticsView from './views/analytics/AnalyticsView';
import ScanInvoiceView from './views/operations/ScanInvoiceView';
import FoodWasteView from './views/operations/FoodWasteView';
import TimeClockView from './views/employees/TimeClockView';
import EmployeesView from './views/employees/EmployeesView.tsx';
import ScheduleView from './views/employees/ScheduleView';
import PayrollView from './views/employees/PayrollView';
import FuelOperationsView from './views/operations/FuelOperationsView';
import OperationsJournalView from './views/operations/OperationsJournalView';
import CashFlowPredictorView from './views/operations/CashFlowPredictorView';
import TobaccoScanView from './views/operations/TobaccoScanView';
import TemperatureLogView from './views/operations/TemperatureLogView';
import ClerkDashboardView from './views/operations/ClerkDashboardView';
import VendorCheckinView from './views/operations/VendorCheckinView';
import VisualAuditView from './views/operations/VisualAuditView';
import LoginView from './views/LoginView';
import SignupView from './views/SignupView';
import { useAuthStore } from './stores/useAuthStore';
import DashboardView from './views/DashboardView';

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
    const location = useLocation();
    const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
    return (
        <Link
            to={to}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all uppercase tracking-widest
                ${active
                    ? 'bg-white/10 text-white shadow-inner'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
        >
            {icon}
            {label}
        </Link>
    );
}

function NavSection({ label }: { label: string }) {
    return (
        <div className="pt-5 pb-1 px-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
            {label}
        </div>
    );
}

function Sidebar() {
    const logout = useAuthStore(state => state.logout);
    const userRole = useAuthStore(state => state.userRole);

    return (
        <div className="w-60 bg-slate-900 text-white flex flex-col h-screen fixed z-40 border-r border-slate-800">
            {/* Logo */}
            <div className="px-6 py-5 border-b border-slate-800">
                <h1 className="text-lg font-black italic tracking-tighter text-white">C-Store Daily</h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Global Connect · {userRole}</p>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
                <NavLink to="/" icon={<LayoutDashboard className="w-4 h-4 shrink-0" />} label="Dashboard" />
                <NavLink to="/analytics" icon={<BrainCircuit className="w-4 h-4 shrink-0" />} label="AI Analytics" />

                <NavSection label="Operations" />
                <NavLink to="/operations/daily-sales" icon={<Store className="w-4 h-4 shrink-0" />} label="Daily Sales" />
                <NavLink to="/operations/fuel" icon={<Droplet className="w-4 h-4 shrink-0" />} label="Fuel Ops" />
                <NavLink to="/operations/scan-invoices" icon={<FileText className="w-4 h-4 shrink-0" />} label="Scan Invoices" />
                <NavLink to="/operations/food-waste" icon={<Trash2 className="w-4 h-4 shrink-0" />} label="Food Waste" />
                <NavLink to="/operations/vendor-checkin" icon={<Truck className="w-4 h-4 shrink-0" />} label="Vendor Check-in" />
                <NavLink to="/operations/visual-audit" icon={<Camera className="w-4 h-4 shrink-0" />} label="Visual Audit" />
                <NavLink to="/operations/compliance" icon={<ShieldCheck className="w-4 h-4 shrink-0" />} label="Safety & Temp" />
                <NavLink to="/operations/tobacco-scan" icon={<BarChartHorizontal className="w-4 h-4 shrink-0" />} label="Tobacco Scan" />
                <NavLink to="/operations/journal" icon={<MessageSquare className="w-4 h-4 shrink-0" />} label="Journal" />
                <NavLink to="/operations/cash-flow" icon={<TrendingUp className="w-4 h-4 shrink-0" />} label="Cash Flow" />
                <NavLink to="/clerk" icon={<Calculator className="w-4 h-4 shrink-0" />} label="Clerk Terminal" />

                <NavSection label="Employees" />
                <NavLink to="/employees/time-clock" icon={<Timer className="w-4 h-4 shrink-0" />} label="Time Clock" />
                <NavLink to="/employees/directory" icon={<Users className="w-4 h-4 shrink-0" />} label="Directory" />
                <NavLink to="/employees/schedule" icon={<Calendar className="w-4 h-4 shrink-0" />} label="Schedule" />
                <NavLink to="/employees/payroll" icon={<DollarSign className="w-4 h-4 shrink-0" />} label="Payroll" />

                <NavSection label="Lottery" />
                <NavLink to="/lottery/inventory" icon={<Ticket className="w-4 h-4 shrink-0" />} label="Inventory" />
                <NavLink to="/lottery/shrinkage" icon={<ShieldCheck className="w-4 h-4 shrink-0" />} label="Shrinkage" />
            </nav>

            {/* Logout */}
            <div className="px-4 py-4 border-t border-slate-800">
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[11px] font-bold text-rose-400 hover:bg-rose-950 hover:text-rose-300 transition-colors uppercase tracking-widest"
                >
                    <LogOut className="w-4 h-4 shrink-0" />
                    Logout
                </button>
            </div>
        </div>
    );
}

function App() {
    const user = useAuthStore(state => state.user);
    const isDemo = useAuthStore(state => state.isDemo);
    const loading = useAuthStore(state => state.loading);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 text-sm font-medium">Loading…</p>
            </div>
        );
    }

    if (!user && !isDemo) {
        return (
            <Routes>
                <Route path="/login" element={<LoginView />} />
                <Route path="/signup" element={<SignupView />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar />
            <main className="flex-1 ml-60 p-6 overflow-y-auto">
                <div className="max-w-6xl mx-auto h-full bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative">
                    <Routes>
                        {/* Core */}
                        <Route path="/" element={<DashboardView />} />
                        <Route path="/analytics" element={<AnalyticsView />} />

                        {/* Operations */}
                        <Route path="/operations/daily-sales" element={<DailySalesView />} />
                        <Route path="/operations/scan-invoices" element={<ScanInvoiceView />} />
                        <Route path="/operations/food-waste" element={<FoodWasteView />} />
                        <Route path="/operations/compliance" element={<TemperatureLogView />} />
                        <Route path="/operations/tobacco-scan" element={<TobaccoScanView />} />
                        <Route path="/operations/vendor-checkin" element={<VendorCheckinView />} />
                        <Route path="/operations/visual-audit" element={<VisualAuditView />} />
                        <Route path="/operations/journal" element={<OperationsJournalView />} />
                        <Route path="/operations/cash-flow" element={<CashFlowPredictorView />} />
                        <Route path="/operations/tobacco" element={<TobaccoScanView />} />
                        <Route path="/operations/fuel" element={<FuelOperationsView />} />
                        <Route path="/clerk" element={<ClerkDashboardView />} />

                        {/* Employees */}
                        <Route path="/employees/time-clock" element={<TimeClockView />} />
                        <Route path="/employees/directory" element={<EmployeesView />} />
                        <Route path="/employees/schedule" element={<ScheduleView />} />
                        <Route path="/employees/payroll" element={<PayrollView />} />

                        {/* Lottery */}
                        <Route path="/lottery/inventory" element={<LotteryInventoryView />} />
                        <Route path="/lottery/shrinkage" element={<LotteryShrinkageView />} />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
}

export default App;
