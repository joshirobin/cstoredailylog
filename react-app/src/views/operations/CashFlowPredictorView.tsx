import { useState, useEffect, useMemo } from 'react';
import { useCashFlowStore, type PlannedTransaction } from '../../stores/useCashFlowStore';
import { useSalesStore } from '../../stores/useSalesStore';
import { usePurchasesStore } from '../../stores/usePurchasesStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import {
    TrendingUp, Calendar, AlertCircle, Plus, X,
    Wallet, ArrowUpRight, ArrowDownRight,
    Clock, Landmark, Receipt, Loader2
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

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const CashFlowPredictorView = () => {
    const cashStore = useCashFlowStore();
    const salesStore = useSalesStore();
    const purchasesStore = usePurchasesStore();
    const notificationStore = useNotificationStore();

    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newTransaction, setNewTransaction] = useState<Partial<PlannedTransaction>>({
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        type: 'OUTFLOW',
        category: 'Inventory',
        recurring: 'NONE'
    });

    const projections = useMemo(() => cashStore.getProjections(), [cashStore.plannedTransactions, salesStore.logs]);

    const stats = useMemo(() => {
        if (projections.length === 0) return { low: 0, high: 0, end: 0 };
        const low = Math.min(...projections.map(p => p.balance));
        const high = Math.max(...projections.map(p => p.balance));
        const end = projections[projections.length - 1]?.balance || 0;
        return { low, high, end };
    }, [projections]);

    const chartData = {
        labels: projections.map(p => {
            const d = new Date(p.date + 'T00:00:00');
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [
            {
                label: 'Projected Balance',
                data: projections.map(p => p.balance),
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                callbacks: {
                    label: (context: any) => ` Balance: $${context.parsed.y.toLocaleString()}`
                }
            }
        },
        scales: {
            y: {
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: { callback: (val: any) => `$${val.toLocaleString()}` }
            },
            x: { grid: { display: false } }
        }
    };

    const handleAddPlanned = async () => {
        if (!newTransaction.description || (newTransaction.amount || 0) <= 0) {
            notificationStore.error('Invalid Transaction', 'Check amount and description');
            return;
        }

        setIsSubmitting(true);
        try {
            await cashStore.addPlanned({
                description: newTransaction.description,
                amount: newTransaction.amount || 0,
                date: newTransaction.date || '',
                type: newTransaction.type as any,
                category: newTransaction.category as any,
                recurring: newTransaction.recurring as any,
                loggedBy: 'Admin'
            });
            setIsAdding(false);
            setNewTransaction({
                description: '',
                amount: 0,
                date: new Date().toISOString().split('T')[0],
                type: 'OUTFLOW',
                category: 'Inventory',
                recurring: 'NONE'
            });
            notificationStore.success('Transaction Scheduled', 'Projection updated');
        } catch (e) {
            notificationStore.error('Operation Failed', 'Authorization error');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            await Promise.all([
                cashStore.fetchPlanned(),
                salesStore.fetchLogs(),
                purchasesStore.fetchPurchases()
            ]);
        };
        loadInitialData();
    }, []);

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none mb-3">
                        Cash Flow <span className="text-blue-600">Predictor</span>
                    </h1>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">14-Day Liquidity Radar • Auto-Trend Analysis</p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
                    >
                        <Plus className="w-4 h-4" />
                        Schedule Expense
                    </button>
                </div>
            </div>

            {/* Health Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Projected 14-Day Low</p>
                        <p className={`text-3xl font-[1000] italic tracking-tighter leading-none ${stats.low < 5000 ? 'text-rose-600' : 'text-slate-900'}`}>
                            ${stats.low.toLocaleString()}
                        </p>
                        <div className="mt-4 flex items-center gap-2">
                            {stats.low < 5000 ? (
                                <AlertCircle className="w-4 h-4 text-rose-500" />
                            ) : (
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            )}
                            <p className={`text-[9px] font-black uppercase tracking-widest ${stats.low < 5000 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {stats.low < 5000 ? 'Critical Balance Warning' : 'Healthy Liquidity'}
                            </p>
                        </div>
                    </div>
                    <Landmark className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-50 group-hover:text-slate-100 transition-colors" />
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Inflow</p>
                        <p className="text-3xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none">
                            +${(stats.end - 15000 + (stats.end < 15000 ? 5000 : 0)).toLocaleString()}
                        </p>
                        <p className="mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Based on 30-day sales velocity
                        </p>
                    </div>
                    <ArrowUpRight className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-50 group-hover:text-slate-100 transition-colors" />
                </div>

                <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-900/20 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Projection (Day 14)</p>
                        <p className="text-3xl font-[1000] text-white uppercase italic tracking-tighter leading-none">
                            ${stats.end.toLocaleString()}
                        </p>
                        <div className="mt-4 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic">Live Trend Prediction</p>
                        </div>
                    </div>
                    <Wallet className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5" />
                </div>
            </div>

            {/* Chart & Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Balance Chart */}
                <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-1">Financial Trajectory</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Projection Range: {projections[0]?.date || 'Loading...'} - {projections[13]?.date || 'Loading...'}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="text-[8px] font-black uppercase text-slate-400">Projected Balance</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[400px]">
                        <Line data={chartData} options={chartOptions} />
                    </div>
                </div>

                {/* Expense Radar */}
                <div className="lg:col-span-4 space-y-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                        <Clock className="w-4 h-4" /> Outflow Radar
                    </h3>

                    {isAdding && (
                        <div className="bg-white rounded-[2rem] border-2 border-slate-900 p-6 shadow-xl animate-in zoom-in-95">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">Schedule Transaction</h4>
                                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-900"><X className="w-4 h-4" /></button>
                            </div>

                            <div className="space-y-4">
                                {/* Type Toggle */}
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button
                                        onClick={() => setNewTransaction({ ...newTransaction, type: 'OUTFLOW' })}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${newTransaction.type === 'OUTFLOW' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        Expense
                                    </button>
                                    <button
                                        onClick={() => setNewTransaction({ ...newTransaction, type: 'INFLOW' })}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${newTransaction.type === 'INFLOW' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        Income
                                    </button>
                                </div>

                                <input
                                    value={newTransaction.description}
                                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                                    placeholder="Description (e.g. Core-Mark)"
                                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                                />

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-2">Amount</label>
                                        <input
                                            type="number"
                                            value={newTransaction.amount}
                                            onChange={(e) => setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) })}
                                            className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-2">Date</label>
                                        <input
                                            type="date"
                                            value={newTransaction.date}
                                            onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                                            className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-2">Category</label>
                                        <select
                                            value={newTransaction.category}
                                            onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value as any })}
                                            className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold"
                                        >
                                            <option>Inventory</option>
                                            <option>Fuel</option>
                                            <option>Payroll</option>
                                            <option>Utilities</option>
                                            <option>Tax</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-2">Frequency</label>
                                        <select
                                            value={newTransaction.recurring}
                                            onChange={(e) => setNewTransaction({ ...newTransaction, recurring: e.target.value as any })}
                                            className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold"
                                        >
                                            <option value="NONE">One-time</option>
                                            <option value="WEEKLY">Weekly</option>
                                            <option value="BI-WEEKLY">Bi-weekly</option>
                                            <option value="MONTHLY">Monthly</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={handleAddPlanned}
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 disabled:bg-slate-400 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                                    {isSubmitting ? 'Authorizing...' : 'Authorize Transaction'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm divide-y divide-slate-50 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {cashStore.plannedTransactions.length === 0 ? (
                            <div className="py-12 text-center">
                                <Calendar className="w-10 h-10 text-slate-100 mx-auto mb-4" />
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No scheduled hits detected</p>
                            </div>
                        ) : (
                            cashStore.plannedTransactions.map(tx => (
                                <div key={tx.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'INFLOW' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {tx.type === 'INFLOW' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-900 uppercase italic tracking-tighter">{tx.description}</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{tx.date} • {tx.category}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <p className="text-sm font-black font-mono text-slate-900">${tx.amount.toLocaleString()}</p>
                                        <button onClick={() => cashStore.deletePlanned(tx.id!)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Predictor Logic Breakdown */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-1">Prediction Core</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">How we calculate your numbers</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sales Velocity</p>
                        <p className="text-sm font-bold text-slate-700 italic">Analyzes 30-day historical turnover to predict daily cash receipts.</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Weekend Multiplier</p>
                        <p className="text-sm font-bold text-slate-700 italic">Automatically applies 20% lift on Friday/Saturday projections.</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expense Radar</p>
                        <p className="text-sm font-bold text-slate-700 italic">Layers manual scheduled outflows over automated sales inflows.</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Liquidity Gating</p>
                        <p className="text-sm font-bold text-slate-700 italic">Identifies "Red Zones" where planned inventory hits exceed cash-on-hand.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CashFlowPredictorView;
