import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    Layers,
    DollarSign,
    Plus,
    ClipboardCheck,
    ArrowRight,
    Archive,
    Ticket,
    History,
    ChevronDown,
    ChevronUp,
    RotateCcw
} from 'lucide-react';
import { useLotteryStore } from '../../stores/useLotteryStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const LotteryDashboardView = () => {
    const navigate = useNavigate();
    const {
        games,
        books,
        history,
        fetchGames,
        fetchBooks,
        fetchHistory,
        activeBooks,
        inStockBooks,
        pendingSettlements,
        returnedBooks
    } = useLotteryStore();

    const [expandedDate, setExpandedDate] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            await Promise.all([
                fetchGames(),
                fetchBooks(),
                fetchHistory()
            ]);
        };
        init();
    }, []);

    const activeBookArr = activeBooks();
    const pendingSettlementsArr = pendingSettlements();
    const inStockArr = inStockBooks();
    const returnedArr = returnedBooks();

    const totalActiveValue = useMemo(() => {
        return activeBookArr.reduce((sum, book) => {
            const game = games.find(g => g.id === book.gameId);
            if (!game) return sum;
            const remaining = book.ticketEnd - book.currentTicket;
            return sum + (remaining * game.ticketPrice);
        }, 0);
    }, [activeBookArr, games]);

    const activeGamesList = useMemo(() => {
        return activeBookArr.map(book => {
            const game = games.find(g => g.id === book.gameId);
            return {
                ...book,
                gameName: game?.gameName || book.gameName,
                price: game?.ticketPrice || 0,
                remaining: book.ticketEnd - book.currentTicket
            };
        }).sort((a, b) => (a.assignedRegister || '').localeCompare(b.assignedRegister || ''));
    }, [activeBookArr, games]);

    const groupedHistory = useMemo(() => {
        const groups: Record<string, any[]> = {};
        history.forEach(item => {
            if (!groups[item.date]) groups[item.date] = [];
            groups[item.date].push(item);
        });

        return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => {
            const items = groups[date] || [];
            const totalSales = items.reduce((sum, i) => sum + (i.salesAmount || 0), 0);
            const totalTickets = items.reduce((sum, i) => sum + (i.soldCount || 0), 0);

            const enrichedItems = items.map(i => {
                const book = books.find(b => b.id === i.bookId);
                const gameName = i.gameName || book?.gameName || 'Unknown Game';
                const bookNumber = i.bookNumber || book?.bookNumber || '???';
                return { ...i, gameName, bookNumber };
            });

            return {
                date,
                totalSales,
                totalTickets,
                items: enrichedItems
            };
        });
    }, [history, books]);

    const toggleDate = (date: string) => {
        setExpandedDate(expandedDate === date ? null : date);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black font-display text-slate-900 uppercase italic tracking-tighter">Lottery Command</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Inventory • Sales • Settlement</p>
                </div>
                <button
                    onClick={() => navigate('/lottery/reconciliation')}
                    className="btn-primary py-3 px-6 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                >
                    <ClipboardCheck className="w-5 h-5" />
                    <span className="font-black uppercase tracking-wider text-xs italic">Start Daily Count</span>
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <div className="glass-panel p-6 flex flex-col justify-between group cursor-pointer hover:shadow-xl transition-all" onClick={() => navigate('/lottery/inventory')}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Books</p>
                            <p className="text-4xl font-black text-slate-900 tracking-tighter mt-1">{activeBookArr.length}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                            <Layers className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600">
                        <span className="px-2 py-0.5 bg-emerald-100 rounded text-[9px] uppercase tracking-wider">Selling</span>
                        <span className="text-slate-400">on floor</span>
                    </div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between border-l-4 border-primary-500">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Floor Value</p>
                            <p className="text-4xl font-black text-slate-900 tracking-tighter mt-1">${totalActiveValue.toLocaleString()}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <span>Est. Potential</span>
                    </div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between group cursor-pointer hover:border-amber-200" onClick={() => navigate('/lottery/settlement')}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Settle</p>
                            <p className="text-4xl font-black text-amber-500 tracking-tighter mt-1">{pendingSettlementsArr.length}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-amber-600">
                        <span className="px-2 py-0.5 bg-amber-100 rounded text-[9px] uppercase tracking-wider">Action Req.</span>
                        <span className="text-slate-400 text-[9px]">Sold Out</span>
                    </div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between group cursor-pointer" onClick={() => navigate('/lottery/inventory')}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Stock</p>
                            <p className="text-4xl font-black text-slate-900 tracking-tighter mt-1">{inStockArr.length}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                            <Archive className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <span>Ready</span>
                    </div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between group cursor-pointer border-l-4 border-rose-500" onClick={() => navigate('/lottery/inventory?tab=return')}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Returned</p>
                            <p className="text-4xl font-black text-rose-500 tracking-tighter mt-1">{returnedArr.length}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                            <RotateCcw className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-rose-500 uppercase tracking-widest">
                        <span>Audit Pack</span>
                    </div>
                </div>
            </div>

            {/* Actions & Feeds */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Feed: Active Games */}
                <div className="lg:col-span-2 glass-panel p-8 relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-32 bg-primary-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 "></div>

                    <div className="flex items-center justify-between mb-8 relative">
                        <div>
                            <h3 className="text-xl font-black font-display text-slate-900 uppercase italic tracking-tight">Live Dispatch Floor</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Real-time Inventory Status</p>
                        </div>
                        <button onClick={() => navigate('/lottery/inventory')} className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline px-4 py-2 bg-primary-50 rounded-lg transition-colors">Manage Full Inventory</button>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm relative">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/80 backdrop-blur-sm text-[10px] uppercase text-slate-500 font-black tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Register</th>
                                    <th className="px-6 py-4">Book Entity</th>
                                    <th className="px-6 py-4">Price Point</th>
                                    <th className="px-6 py-4 text-right">Remaining</th>
                                    <th className="px-6 py-4 text-right">Est. Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {activeGamesList.slice(0, 5).map(book => (
                                    <tr key={book.id} className="group hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-[10px] text-slate-400 font-black bg-slate-100 px-2 py-1 rounded-md uppercase tracking-tighter">
                                                {book.assignedRegister || 'NONE'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-slate-900 uppercase italic text-xs tracking-tight">{book.gameName}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SKU: #{book.bookNumber}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-black text-slate-600 text-xs">${book.price}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-500 font-bold">{book.remaining}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-black text-emerald-600 text-sm tracking-tighter italic">${(book.remaining * book.price).toFixed(0)}</span>
                                        </td>
                                    </tr>
                                ))}
                                {activeGamesList.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-300 text-[10px] font-black uppercase tracking-[0.3em]">Status: No Active Inventory</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    <button onClick={() => navigate('/lottery/inventory')} className="w-full p-8 rounded-[2.5rem] bg-white border-2 border-slate-100 hover:border-primary-100 hover:shadow-2xl hover:-translate-y-1 transition-all text-left group">
                        <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 mb-6 group-hover:bg-primary-600 group-hover:text-white transition-all transform group-hover:rotate-12">
                            <Plus className="w-6 h-6" />
                        </div>
                        <h4 className="font-black text-slate-900 uppercase italic text-lg tracking-tighter">Receive Pkg</h4>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest leading-relaxed">Scan arriving shipments into high-security vault</p>
                    </button>

                    <button onClick={() => navigate('/lottery/settlement')} className="w-full p-8 rounded-[2.5rem] bg-white border-2 border-slate-100 hover:border-amber-100 hover:shadow-2xl hover:-translate-y-1 transition-all text-left group">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-6 group-hover:bg-amber-600 group-hover:text-white transition-all transform group-hover:-rotate-12">
                            <Ticket className="w-6 h-6" />
                        </div>
                        <h4 className="font-black text-slate-900 uppercase italic text-lg tracking-tighter">Settle Books</h4>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest leading-relaxed">Process sold-out packs for financial reconciliation</p>
                    </button>

                    <button className="w-full p-8 rounded-[2.5rem] bg-slate-950 text-white hover:bg-slate-900 hover:shadow-2xl hover:-translate-y-1 transition-all text-left group flex items-center justify-between shadow-xl shadow-slate-900/20">
                        <div>
                            <h4 className="font-black text-white uppercase italic text-lg tracking-tighter">BI Reporting</h4>
                            <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest leading-relaxed">Sync Cloud Terminal</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-slate-700 group-hover:text-white group-hover:translate-x-2 transition-all" />
                    </button>
                </div>

                {/* Sales Log Book - Full Width Bottom */}
                <div className="lg:col-span-3 glass-panel p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black font-display text-slate-900 uppercase italic tracking-tight flex items-center gap-3">
                                <History className="w-6 h-6 text-primary-500" />
                                Ledger Archive
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Immutable Sales Record</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groupedHistory.map(day => (
                            <div key={day.date} className="border border-slate-100 rounded-3xl overflow-hidden hover:shadow-lg transition-all bg-slate-50/30">
                                <div
                                    onClick={() => toggleDate(day.date)}
                                    className={cn(
                                        "p-6 flex items-center justify-between cursor-pointer transition-colors",
                                        expandedDate === day.date ? "bg-slate-900 text-white" : "hover:bg-slate-50"
                                    )}
                                >
                                    <div>
                                        <div className="font-mono font-black text-lg tracking-tighter italic">{day.date}</div>
                                        <div className={cn("text-[9px] font-black uppercase tracking-[0.2em] mt-1", expandedDate === day.date ? "text-slate-400" : "text-slate-400")}>
                                            {day.items.length} Daily Entries
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className={cn("text-[8px] uppercase font-black tracking-widest mb-0.5", expandedDate === day.date ? "text-slate-500" : "text-slate-400")}>Revenue</div>
                                            <div className={cn("font-black tracking-tighter text-lg", expandedDate === day.date ? "text-emerald-400" : "text-emerald-600")}>${day.totalSales.toFixed(2)}</div>
                                        </div>
                                        {expandedDate === day.date ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                    </div>
                                </div>

                                {expandedDate === day.date && (
                                    <div className="bg-white p-2">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-[8px] uppercase text-slate-400 font-black tracking-widest border-b border-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3">Asset</th>
                                                    <th className="px-4 py-3 text-center">Unit Δ</th>
                                                    <th className="px-4 py-3 text-right">Yield</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {day.items.map((entry: any) => (
                                                    <tr key={entry.id} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-slate-900 text-[11px] uppercase italic tracking-tighter">{entry.gameName}</span>
                                                                <span className="font-mono font-bold text-slate-400 text-[9px] tracking-tighter">ID: #{entry.bookNumber}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <span className="font-mono font-black text-slate-600 text-xs">{entry.soldCount}</span>
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            <span className="font-black text-slate-900 text-xs italic">${entry.salesAmount?.toFixed(2)}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}

                        {groupedHistory.length === 0 && (
                            <div className="col-span-full py-20 text-center glass-panel border-dashed">
                                <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Vault Ledger: NULL</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LotteryDashboardView;
