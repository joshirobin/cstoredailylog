import { useState, useEffect, useMemo } from 'react';
import {
    BrainCircuit,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    ArrowUpRight,
    Search,
    RefreshCw
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useForecastingStore } from '../../stores/useForecastingStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for merging tailwind classes
 */
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const AnalyticsView = () => {
    const forecastingStore = useForecastingStore();
    const [activeTab, setActiveTab] = useState<'overview' | 'anomalies'>('overview');

    useEffect(() => {
        // Initial data load
        if (forecastingStore.salesForecast.length === 0) {
            forecastingStore.generateForecast();
        }
        if (forecastingStore.anomalies.length === 0) {
            forecastingStore.detectAnomalies();
        }
    }, []);

    // --- Chart Configuration ---
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                boxPadding: 6,
                usePointStyle: true,
                titleFont: { weight: 'bold' as const, size: 14 },
                bodyFont: { size: 13 }
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: {
                    color: '#f1f5f9',
                },
                ticks: {
                    callback: (value: any) => '$' + value,
                    font: { size: 11, weight: 'bold' as const },
                    color: '#94a3b8'
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: { size: 11, weight: 'bold' as const },
                    color: '#94a3b8'
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index' as const,
        },
    };

    const chartData = useMemo(() => ({
        labels: forecastingStore.salesForecast.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }),
        datasets: [
            {
                label: 'Projected Sales',
                backgroundColor: (context: any) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return undefined;
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
                    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
                    return gradient;
                },
                borderColor: '#10b981',
                borderWidth: 3,
                data: forecastingStore.salesForecast.map(d => d.predictedSales),
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#10b981',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ]
    }), [forecastingStore.salesForecast]);

    // --- Helper Functions ---
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const getSeverityStyles = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'MEDIUM': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <BrainCircuit className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">AI Command Center</h1>
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Predictive Analytics & Anomaly Detection</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => forecastingStore.generateForecast()}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
                        disabled={forecastingStore.loading}
                    >
                        <RefreshCw className={cn("w-4 h-4", forecastingStore.loading && "animate-spin")} />
                        Update Predictions
                    </button>
                </div>
            </div>

            {/* Key Metrics (Predictions) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Next 7 Days Forecast */}
                <div className="glass-card p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-32 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-all"></div>

                    <div className="flex justify-between items-start mb-4 relative">
                        <div>
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">7-Day Forecast</h3>
                            <div className="text-3xl font-black text-slate-900 tracking-tight">
                                {formatCurrency(forecastingStore.salesForecast.reduce((acc, curr) => acc + curr.predictedSales, 0))}
                            </div>
                        </div>
                        <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 py-1 px-2 rounded-lg w-fit">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>+12.5% vs Last Week</span>
                    </div>
                </div>

                {/* Detected Anomalies */}
                <div className="glass-card p-6 relative overflow-hidden group border-l-4 border-rose-500">
                    <div className="absolute right-0 top-0 p-32 bg-rose-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-rose-500/10 transition-all"></div>

                    <div className="flex justify-between items-start mb-4 relative">
                        <div>
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Active Alerts</h3>
                            <div className="text-3xl font-black text-slate-900 tracking-tight">
                                {forecastingStore.anomalies.filter(a => a.status === 'NEW').length}
                            </div>
                        </div>
                        <div className="p-2 bg-rose-100 rounded-xl text-rose-600">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    </div>

                    <p className="text-[10px] text-rose-600 font-bold mt-2 uppercase tracking-widest">Requires immediate attention</p>
                </div>

                {/* Inventory Optimization */}
                <div className="glass-card p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-all"></div>

                    <div className="flex justify-between items-start mb-4 relative">
                        <div>
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Reorder Suggestions</h3>
                            <div className="text-3xl font-black text-slate-900 tracking-tight">8 Items</div>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                            <Search className="w-5 h-5" />
                        </div>
                    </div>

                    <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">Based on predictive demand models</p>
                </div>
            </div>

            {/* Main Content Tabs */}
            <div className="flex gap-8 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={cn(
                        "pb-4 font-bold text-[11px] uppercase tracking-wider transition-all border-b-2",
                        activeTab === 'overview' ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                >
                    Sales Forecast
                </button>
                <button
                    onClick={() => setActiveTab('anomalies')}
                    className={cn(
                        "pb-4 font-bold text-[11px] uppercase tracking-wider transition-all border-b-2",
                        activeTab === 'anomalies' ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                >
                    Anomaly Detection
                    {forecastingStore.anomalies.filter(a => a.status === 'NEW').length > 0 && (
                        <span className="ml-2 bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full text-[9px] font-black">
                            {forecastingStore.anomalies.filter(a => a.status === 'NEW').length}
                        </span>
                    )}
                </button>
            </div>

            {/* SALES FORECAST TAB */}
            {activeTab === 'overview' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="glass-card p-6 h-[400px]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Projected Revenue (Next 7 Days)</h3>
                            <div className="flex gap-2 text-[10px] font-bold text-slate-500">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Predicted</span>
                                <span className="flex items-center gap-1 ml-3 dashed border-b border-slate-300"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Historical Avg</span>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <Line data={chartData} options={chartOptions as any} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div className="glass-card p-6 border-l-4 border-indigo-500">
                            <h3 className="font-bold text-slate-900 mb-4 text-xs uppercase tracking-widest">AI Insights</h3>
                            <div className="space-y-4">
                                <div className="flex gap-4 items-start p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                    <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600 shrink-0">
                                        <BrainCircuit className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-indigo-900 text-xs uppercase">Weekend Surge Expected</h4>
                                        <p className="text-[11px] text-indigo-700 mt-1 leading-relaxed">
                                            Our models predict a <span className="font-black underline">20% increase</span> in beverage sales this Saturday due to projected high temperatures (85°F).

                                            <br /><br />
                                            <span className="font-bold uppercase text-[9px] tracking-widest text-indigo-500 opacity-60">Action Item</span>
                                            <br />
                                            Ensure cooler stock levels are at 100% capacity by Friday night.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="glass-card p-6 border-l-4 border-blue-500">
                            <h3 className="font-bold text-slate-900 mb-4 text-xs uppercase tracking-widest">Inventory Recommendations</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-[10px]">RB</div>
                                        <div>
                                            <h4 className="font-bold text-[11px] text-slate-900 uppercase">Energy Drinks</h4>
                                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Demand Spike</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-widest">Order +5 Cases</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-black text-[10px]">IC</div>
                                        <div>
                                            <h4 className="font-bold text-[11px] text-slate-900 uppercase">Ice Bags (10lb)</h4>
                                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Heatwave Prep</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-widest">Order +20 Units</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ANOMALIES TAB */}
            {activeTab === 'anomalies' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {forecastingStore.anomalies.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="font-bold text-slate-900 uppercase tracking-widest text-xs">System Healthy</h3>
                            <p className="text-[11px] text-slate-500">No anomalies detected in the last 24 hours.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {forecastingStore.anomalies.map(anomaly => (
                                <div
                                    key={anomaly.id}
                                    className={cn(
                                        "glass-card p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden transition-all",
                                        anomaly.status === 'RESOLVED' && "opacity-60 saturate-50"
                                    )}
                                >
                                    {/* Severity Line */}
                                    <div className={cn("absolute left-0 top-0 bottom-0 w-1", getSeverityStyles(anomaly.severity).split(' ')[0])}></div>

                                    <div className="shrink-0 pt-1">
                                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-sm", getSeverityStyles(anomaly.severity))}>
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-slate-900 uppercase text-[11px] tracking-widest">{anomaly.metric}</h3>
                                                <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border", getSeverityStyles(anomaly.severity))}>
                                                    {anomaly.severity} Risk
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-mono font-bold text-slate-400">{new Date(anomaly.detectedAt).toLocaleString()}</span>
                                        </div>

                                        <p className="text-[12px] text-slate-600 leading-relaxed font-bold mb-4">{anomaly.description}</p>

                                        <div className="flex gap-8 text-[10px] mb-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100 max-w-lg">
                                            <div>
                                                <span className="block text-slate-400 font-black uppercase tracking-widest text-[9px] mb-1">Expected Pattern</span>
                                                <span className="font-mono font-black text-slate-700 text-lg">{anomaly.expectedValue}</span>
                                            </div>
                                            <div className="w-px bg-slate-200"></div>
                                            <div>
                                                <span className="block text-slate-400 font-black uppercase tracking-widest text-[9px] mb-1">Actual Reading</span>
                                                <span className="font-mono font-black text-rose-600 text-lg">{anomaly.actualValue}</span>
                                            </div>
                                            <div className="w-px bg-slate-200"></div>
                                            <div>
                                                <span className="block text-slate-400 font-black uppercase tracking-widest text-[9px] mb-1">Deviation</span>
                                                <span className="font-mono font-black text-rose-600 text-lg">
                                                    {Math.round(((anomaly.actualValue - anomaly.expectedValue) / anomaly.expectedValue) * 100)}%
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            {anomaly.status !== 'RESOLVED' ? (
                                                <>
                                                    <button
                                                        onClick={() => forecastingStore.resolveAnomaly(anomaly.id)}
                                                        className="text-[10px] font-black px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors uppercase tracking-widest"
                                                    >
                                                        Mark as Resolved
                                                    </button>
                                                    <button
                                                        className="text-[10px] font-black px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors uppercase tracking-widest"
                                                    >
                                                        Investigate
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Resolved Logged
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AnalyticsView;
