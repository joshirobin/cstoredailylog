import { useState, useEffect, useMemo } from 'react';
import {
    CheckCircle2,
    AlertCircle,
    FileText,
    Calculator,
    Upload,
    Clock
} from 'lucide-react';
import { useLotteryStore } from '../../stores/useLotteryStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const LotterySettlementView = () => {
    const {
        books,
        games,
        settlements,
        fetchBooks,
        fetchSettlements,
        pendingSettlements: getPending,
        settleBook
    } = useLotteryStore();

    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            await Promise.all([fetchBooks(), fetchSettlements()]);
        };
        init();
    }, []);

    const pendingArr = getPending();
    const selectedBook = books.find(b => b.id === selectedBookId);

    const ticketsSold = useMemo(() => {
        if (!selectedBook) return 0;
        return (selectedBook.ticketEnd - selectedBook.ticketStart);
    }, [selectedBook]);

    const grossSales = useMemo(() => {
        if (!selectedBook) return 0;
        const game = games.find(g => g.id === selectedBook.gameId);
        return ticketsSold * (game?.ticketPrice || 0);
    }, [selectedBook, ticketsSold, games]);

    const commission = useMemo(() => {
        if (!selectedBook) return 0;
        const game = games.find(g => g.id === selectedBook.gameId);
        return grossSales * (game?.commissionRate || 0.05);
    }, [selectedBook, grossSales, games]);

    const netDue = grossSales - commission;

    const handleSettle = async () => {
        if (!selectedBook) return;

        try {
            await settleBook(selectedBook.id, {
                bookId: selectedBook.id,
                gameName: selectedBook.gameName,
                bookNumber: selectedBook.bookNumber,
                totalTickets: selectedBook.ticketEnd - selectedBook.ticketStart,
                ticketsSold: ticketsSold,
                grossSales: grossSales,
                commission: commission,
                netDue: netDue,
                settlementDate: new Date(),
                status: 'APPROVED'
            });
            setSelectedBookId(null);
        } catch (e) {
            alert('Failed to settle');
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black font-display text-slate-900 uppercase italic tracking-tighter">Settlement Ledger</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Immutable Finalization of Dispatched Assets</p>
                </div>
                <div className="bg-slate-100 p-1 rounded-2xl flex items-center shadow-inner">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'pending' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-slate-900'
                        )}
                    >
                        Pending Settle
                        <span className="ml-2 bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-md text-[8px]">{pendingArr.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'history' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-slate-900'
                        )}
                    >
                        Archive
                    </button>
                </div>
            </div>

            {activeTab === 'pending' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* List of Pending */}
                    <div className="lg:col-span-4 glass-panel p-0 overflow-hidden h-fit border-t-4 border-amber-500">
                        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-black text-slate-900 uppercase text-[10px] tracking-widest italic">Awaiting Finalization</h3>
                            <Clock className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {pendingArr.map(book => (
                                <div
                                    key={book.id}
                                    onClick={() => setSelectedBookId(book.id)}
                                    className={cn(
                                        "p-6 hover:bg-slate-50 cursor-pointer transition-all border-l-4",
                                        selectedBookId === book.id ? 'border-l-primary-500 bg-primary-50/30' : 'border-l-transparent'
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-black text-slate-900 font-mono text-sm tracking-tighter italic">#{book.bookNumber}</span>
                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md text-[8px] font-black uppercase tracking-widest">Post-Sale</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight truncate">{book.gameName}</p>
                                </div>
                            ))}
                            {pendingArr.length === 0 && (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Queue: Empty</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detail & Action */}
                    <div className="lg:col-span-8">
                        {selectedBook ? (
                            <div className="glass-panel p-10 animate-in fade-in slide-in-from-right-4 duration-500 relative overflow-hidden">
                                <div className="absolute right-0 top-0 p-40 bg-primary-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 "></div>

                                <div className="flex items-center justify-between mb-10 pb-8 border-b border-slate-100 relative">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Settlement Worksheet</h3>
                                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Asset Reconciliation for <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md ml-1 tracking-tighter italic">#{selectedBook.bookNumber}</span></p>
                                    </div>
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
                                        <Calculator className="w-7 h-7" />
                                    </div>
                                </div>

                                <div className="space-y-8 relative">
                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Units Sold</p>
                                            <p className="text-2xl font-black font-mono text-slate-900">{ticketsSold}</p>
                                        </div>
                                        <div className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Gross Yield</p>
                                            <p className="text-2xl font-black font-mono text-emerald-600 italic tracking-tighter">${grossSales.toFixed(2)}</p>
                                        </div>
                                        <div className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Fee (5%)</p>
                                            <p className="text-2xl font-black font-mono text-primary-600 italic tracking-tighter">-${commission.toFixed(2)}</p>
                                        </div>
                                        <div className="p-6 rounded-3xl bg-slate-950 text-white shadow-2xl shadow-slate-900/30">
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Net Liability</p>
                                            <p className="text-3xl font-black font-mono text-white italic tracking-tighter">${netDue.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="space-y-4">
                                        <label className="block w-full p-8 border-2 border-dashed border-slate-200 rounded-[2rem] hover:bg-slate-50 cursor-pointer transition-all text-center group">
                                            <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3 group-hover:text-primary-500 group-hover:scale-110 transition-all" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-primary-600">Digitize Settlement Receipt</span>
                                        </label>

                                        <button onClick={handleSettle} className="w-full py-6 rounded-[2rem] bg-indigo-600 text-white text-xs font-black uppercase italic tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 hover:-translate-y-1 active:scale-[0.98] transition-all">
                                            <FileText className="w-5 h-5" /> Execute Final Settlement
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-[500px] flex flex-col items-center justify-center text-center p-12 glass-panel border-dashed border-2">
                                <AlertCircle className="w-16 h-16 text-slate-200 mb-6" />
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Status: Waiting for Input Selection</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="glass-panel p-0 overflow-hidden border-t-4 border-slate-900 shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-black tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5">Sync Timestamp</th>
                                    <th className="px-8 py-5">Pack Entity</th>
                                    <th className="px-8 py-5 text-center">Unit Δ</th>
                                    <th className="px-8 py-5 text-right">Gross yield</th>
                                    <th className="px-8 py-5 text-right">Liability</th>
                                    <th className="px-8 py-5 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {settlements.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-8 py-5 font-mono text-slate-400 text-xs font-bold uppercase">
                                            {item.settlementDate ? new Date(item.settlementDate.seconds ? item.settlementDate.seconds * 1000 : item.settlementDate).toLocaleDateString() : '---'}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="font-black text-slate-900 uppercase italic text-xs tracking-tight">#{item.bookNumber}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate max-w-[200px]">{item.gameName}</div>
                                        </td>
                                        <td className="px-8 py-5 text-center font-mono font-black text-slate-600 text-xs">{item.ticketsSold}</td>
                                        <td className="px-8 py-5 text-right font-mono font-black text-emerald-600 italic text-sm">${item.grossSales.toFixed(2)}</td>
                                        <td className="px-8 py-5 text-right font-mono font-black text-slate-900 italic text-sm">${item.netDue.toFixed(2)}</td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100">{item.status || 'FINALIZED'}</span>
                                        </td>
                                    </tr>
                                ))}
                                {settlements.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center">
                                            <CheckCircle2 className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                            <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em]">Ledger: Empty State</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LotterySettlementView;
