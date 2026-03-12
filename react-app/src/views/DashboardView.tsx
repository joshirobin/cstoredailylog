import { useMemo } from 'react';
import {
    TrendingUp,
    DollarSign,
    Users,
    FileText,
    CreditCard,
    Plus,
    ArrowUpRight,
    Target,
    Clock,
    ChevronRight,
    Activity,
    MapPin,
    CloudRain,
    Timer
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSalesStore } from '../stores/useSalesStore';

// Simple mocked Widgets for now
const StoreMapPlaceholder = () => (
    <div className="bg-slate-900 rounded-3xl p-8 relative overflow-hidden h-64 flex flex-col justify-end text-white border-4 border-slate-800">
        <MapPin className="absolute top-6 right-6 w-8 h-8 text-primary-500 opacity-50" />
        <h3 className="text-xl font-black italic uppercase tracking-tighter">Global Map View</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live Location Status</p>
    </div>
);

const FuelPriceWatchWidgetPlaceholder = () => (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unleaded 87</h4>
            <p className="text-2xl font-black tracking-tighter text-slate-900">$3.19</p>
        </div>
        <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Market
        </div>
    </div>
);

const WeatherWidgetPlaceholder = () => (
    <div className="bg-sky-50 rounded-3xl p-6 border border-sky-100 shadow-sm flex items-center justify-between">
        <div>
            <h4 className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Current Weather</h4>
            <p className="text-2xl font-black tracking-tighter text-sky-900">72°F</p>
        </div>
        <CloudRain className="w-8 h-8 text-sky-500" />
    </div>
);

const QuickTimeClockPlaceholder = () => (
    <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 shadow-sm flex items-center justify-between">
        <div>
            <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Time Clock</h4>
            <p className="text-[11px] font-bold tracking-tighter text-amber-900 mt-1">Not Punched In</p>
        </div>
        <button className="bg-amber-600 text-white rounded-xl p-3 shadow-lg shadow-amber-500/30 hover:bg-amber-700 transition-all">
            <Timer className="w-5 h-5" />
        </button>
    </div>
);


export default function DashboardView() {
    const logs = useSalesStore(state => state.logs);

    // Calculate Today's Sales
    const totalSalesToday = useMemo(() => {
        const todayDate = new Date().toISOString().split('T')[0];
        const todayLog = logs.find(l => l.date === todayDate);
        return todayLog ? todayLog.totalSales : 0;
    }, [logs]);

    // Mocked Data
    const activeAccountsCount = 42;
    const pendingInvoicesCount = 8;
    const outstandingBalance = 12450;

    // Chart Data (Last 7 Days)
    const last7DaysSales = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const log = logs.find(l => l.date === dateStr);
            days.push({
                date: dateStr,
                label: d.toLocaleDateString('en-US', { weekday: 'short' }),
                sales: log ? log.totalSales : (Math.random() * 5000 + 4000) // Using random data for visual mock if no logs
            });
        }
        return days;
    }, [logs]);

    const maxSales = useMemo(() => Math.max(...last7DaysSales.map(d => d.sales), 1000), [last7DaysSales]);

    // SVG Paths
    const revenuePath = useMemo(() => {
        const width = 400;
        const height = 120;
        if (last7DaysSales.length < 2) return "";
        const points = last7DaysSales.map((d, i) => {
            const x = (i / 6) * width;
            const y = height - (d.sales / (maxSales * 1.1)) * height;
            return `${x},${y}`;
        });
        return `M ${points.join(' L ')}`;
    }, [last7DaysSales, maxSales]);

    const revenueAreaPath = useMemo(() => {
        const path = revenuePath;
        if (!path) return "";
        return `${path} L 400,120 L 0,120 Z`;
    }, [revenuePath]);

    const recentLogs = useMemo(() => {
        return [...logs]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5);
    }, [logs]);

    // If there are no real logs, make a mock list
    const displayLogs = recentLogs.length > 0 ? recentLogs : [
        { id: '1', date: new Date().toISOString(), totalSales: 8900 },
        { id: '2', date: new Date(Date.now() - 86400000).toISOString(), totalSales: 7450 },
        { id: '3', date: new Date(Date.now() - 172800000).toISOString(), totalSales: 9120 },
    ];

    return (
        <div className="p-4 lg:p-6 space-y-6 max-w-[1800px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 bg-white">

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
                        <Activity className="w-8 h-8 text-primary-600" /> Executive Dashboard
                    </h1>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Live Global Metrics & Status</p>
                </div>
            </div>

            {/* Top KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Revenue Card */}
                <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl flex items-center gap-4 relative overflow-hidden group hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform duration-500">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today's Revenue</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">${totalSalesToday.toLocaleString(undefined, { minimumFractionDigits: 0 })}</p>
                    </div>
                </div>

                {/* A/R Card */}
                <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl flex items-center gap-4 group hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 group-hover:rotate-12 transition-transform">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outstanding A/R</p>
                        <p className="text-2xl font-black text-rose-600 tracking-tighter">${outstandingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                </div>

                {/* Customer Card */}
                <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl flex items-center gap-4 group hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:-translate-y-1 transition-transform">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Accounts</p>
                        <p className="text-2xl font-black text-emerald-600 tracking-tighter">{activeAccountsCount}</p>
                    </div>
                </div>

                {/* Alerts Card */}
                <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl flex items-center gap-4 group hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Bills</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">{pendingInvoicesCount}</p>
                    </div>
                </div>
            </div>

            {/* Main Content Bento Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Large Chart Section */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Interactive Store Map Mock */}
                    <StoreMapPlaceholder />

                    <div className="bg-white border border-slate-100 shadow-sm p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[400px]">
                        <div className="absolute top-0 right-0 p-12 opacity-5">
                            <TrendingUp className="w-64 h-64 text-primary-500" />
                        </div>

                        <div className="flex items-center justify-between relative z-10 mb-8">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight font-display italic uppercase">Sales Performance</h2>
                                <p className="text-slate-500 text-[10px] font-bold tracking-widest flex items-center gap-2 mt-1">
                                    <span className="w-2 h-2 rounded-full bg-primary-500 ring-4 ring-primary-500/20"></span>
                                    LAST 7 DAYS ANALYTICS
                                </p>
                            </div>
                            <button className="bg-slate-100 hover:bg-slate-200 p-2 rounded-lg text-slate-700 transition-all">
                                <ArrowUpRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Custom Revenue Area Chart */}
                        <div className="relative flex-1 w-full mt-4 group">
                            <svg viewBox="0 0 400 120" className="w-full h-full">
                                <defs>
                                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path d={revenueAreaPath} fill="url(#areaGradient)" className="transition-all duration-1000" />
                                <path d={revenuePath} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

                                {/* Dynamic Points */}
                                {last7DaysSales.map((d, i) => (
                                    <circle key={i}
                                        cx={(i / 6) * 400}
                                        cy={120 - (d.sales / (maxSales * 1.1)) * 120}
                                        r="4"
                                        fill="#2563eb"
                                        className="transition-all cursor-pointer hover:stroke-4 hover:stroke-white"
                                    >
                                        <title>{d.label}: ${d.sales.toFixed(0)}</title>
                                    </circle>
                                ))}
                            </svg>

                            {/* Labels */}
                            <div className="flex justify-between mt-4 px-1">
                                {last7DaysSales.map(d => (
                                    <div key={d.date} className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                        {d.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Summary Bar */}
                        <div className="mt-8 flex items-center gap-8 border-t border-slate-100 pt-6 relative z-10">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Avg Daily</span>
                                <span className="text-xl font-bold text-slate-900 tracking-tighter">
                                    ${(last7DaysSales.reduce((s, l) => s + l.sales, 0) / 7).toFixed(0)}
                                </span>
                            </div>
                            <div className="h-8 w-px bg-slate-100"></div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Highest Day</span>
                                <span className="text-xl font-bold text-emerald-600 tracking-tighter">${maxSales.toFixed(0)}</span>
                            </div>
                            <div className="flex-1"></div>
                            <Link to="/operations/daily-sales" className="bg-slate-900 text-white rounded-xl py-3 px-6 text-[10px] font-black tracking-widest shadow-none flex items-center gap-2 uppercase hover:bg-black transition-all">
                                Full History <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <FuelPriceWatchWidgetPlaceholder />
                    <WeatherWidgetPlaceholder />
                    <QuickTimeClockPlaceholder />

                    {/* Quick Action Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <Link to="/operations/daily-sales" className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-primary-500/30 hover:bg-white transition-all text-center group shadow-sm flex flex-col items-center">
                            <Plus className="w-8 h-8 text-primary-600 mx-auto mb-2 group-hover:scale-125 transition-all" />
                            <span className="text-[10px] font-bold text-slate-500 block tracking-widest uppercase group-hover:text-slate-900">New Sale</span>
                        </Link>
                        <button className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-primary-500/30 hover:bg-white transition-all text-center group shadow-sm flex flex-col items-center">
                            <Target className="w-8 h-8 text-primary-600 mx-auto mb-2 group-hover:scale-125 transition-all" />
                            <span className="text-[10px] font-bold text-slate-500 block tracking-widest uppercase group-hover:text-slate-900">Fuel Log</span>
                        </button>
                        <button className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-primary-500/30 hover:bg-white transition-all text-center group shadow-sm flex flex-col items-center">
                            <DollarSign className="w-8 h-8 text-primary-600 mx-auto mb-2 group-hover:scale-125 transition-all" />
                            <span className="text-[10px] font-bold text-slate-500 block tracking-widest uppercase group-hover:text-slate-900">Payments</span>
                        </button>
                        <button className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-primary-500/30 hover:bg-white transition-all text-center group shadow-sm flex flex-col items-center">
                            <FileText className="w-8 h-8 text-primary-600 mx-auto mb-2 group-hover:scale-125 transition-all" />
                            <span className="text-[10px] font-bold text-slate-500 block tracking-widest uppercase group-hover:text-slate-900">Invoices</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom History Strip */}
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[11px] font-black text-slate-900 italic tracking-[0.2em] uppercase flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary-600" />
                        Latest Settlements
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {displayLogs.map(log => (
                        <div key={log.id} className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-primary-300 hover:shadow-lg transition-all cursor-pointer">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-primary-50 text-primary-700 uppercase tracking-tighter">
                                    {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                                <span className="text-[11px] font-black text-emerald-600 tracking-tighter">
                                    ${log.totalSales.toFixed(0)}
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-900 truncate">
                                {new Date(log.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                            </p>
                            <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full" style={{ width: `${Math.min((log.totalSales / maxSales) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <style>{`
                @keyframes animate-in {
                    from { opacity: 0; transform: translateY(10px) scale(0.99); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-in {
                    animation: animate-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
}
