import { useState, useEffect, useMemo } from 'react';
import { useLotteryStore } from '../../stores/useLotteryStore';
import {
    AlertTriangle, ShieldCheck,
    TrendingDown, Search,
    History, ArrowUpRight,
    Filter
} from 'lucide-react';

const LotteryShrinkageView = () => {
    const lotteryStore = useLotteryStore();
    const [searchQuery, setSearchQuery] = useState('');

    const shrinkageMetrics = useMemo(() => {
        const totalVariance = lotteryStore.history.reduce((sum, h) => sum + (h.variance || 0), 0);
        const totalAmount = lotteryStore.history.reduce((sum, h) => sum + (h.varianceAmount || 0), 0);
        const highRiskGames = [...new Set(lotteryStore.history.filter(h => (h.variance || 0) < 0).map(h => h.bookId))].length;

        return {
            totalVariance,
            totalAmount,
            highRiskGames
        };
    }, [lotteryStore.history]);

    const filteredHistory = useMemo(() => {
        if (!searchQuery) return lotteryStore.history;
        const q = searchQuery.toLowerCase();
        return lotteryStore.history.filter(h =>
            h.bookId.toLowerCase().includes(q) ||
            h.date.includes(q)
        );
    }, [searchQuery, lotteryStore.history]);

    useEffect(() => {
        const load = async () => {
            await lotteryStore.fetchHistory();
            await lotteryStore.fetchBooks();
        };
        load();
    }, []);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none mb-3">
                        Lottery <span className="text-emerald-600">Shrinkage</span>
                    </h1>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Theft Detection • Inventory Shrinkage Analysis</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-tight">Net Variance</p>
                        <p className={`text-xl font-black italic tracking-tighter leading-none ${shrinkageMetrics.totalAmount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ${Math.abs(shrinkageMetrics.totalAmount).toFixed(2)}
                            {shrinkageMetrics.totalAmount < 0 ? ' LOSS' : ' GAIN'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Shrinkage Analytics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mb-6">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Missing Tickets</h3>
                    <p className="text-3xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none">
                        {Math.abs(shrinkageMetrics.totalVariance)} <span className="text-xs text-slate-300">UT</span>
                    </p>
                    <p className="mt-4 text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> High Risk Detected
                    </p>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 mb-6">
                        <Filter className="w-6 h-6" />
                    </div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">High Risk Books</h3>
                    <p className="text-3xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none">
                        {shrinkageMetrics.highRiskGames} <span className="text-xs text-slate-300">BN</span>
                    </p>
                    <p className="mt-4 text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" /> Requires Audit
                    </p>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-900 border-2 shadow-2xl shadow-slate-900/10">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white mb-6 font-black italic">
                        SH
                    </div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Shift Protection</h3>
                    <p className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-tight">
                        Mandatory Shift Change Verification Active
                    </p>
                    <p className="mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> Digital Chain of Custody
                    </p>
                </div>
            </div>

            {/* History Audit */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400">
                            <History className="w-5 h-5" />
                        </div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Discrepancy Audit Log</h3>
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-100">
                        <Search className="w-4 h-4 text-slate-300" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter audit trail..."
                            className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Book ID</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actual</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Variance</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredHistory.map((h) => (
                                <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">{h.date}</td>
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${(h.variance || 0) < 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                                            <span className="text-xs font-black text-slate-700 font-mono">{h.bookId}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-xs font-bold text-slate-400">{h.expectedRemaining}</td>
                                    <td className="px-8 py-4 text-xs font-bold text-slate-900">{h.physicalRemaining}</td>
                                    <td className="px-8 py-4">
                                        <span className={`text-xs font-black ${(h.variance || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {(h.variance || 0) > 0 ? '+' : ''}{h.variance}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <span className={`text-xs font-black font-mono ${(h.varianceAmount || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {(h.varianceAmount || 0) < 0 ? '-' : ''}${Math.abs(h.varianceAmount || 0).toFixed(2)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredHistory.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                        No discrepancy records found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LotteryShrinkageView;
