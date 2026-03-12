import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Save,
    CheckCircle2,
    Loader2,
    Printer,
    Download,
    RotateCcw
} from 'lucide-react';
import { useLotteryStore, DailyLotteryCount } from '../../stores/useLotteryStore';
import { useAutoSave } from '../../hooks/useAutoSave';


interface DailyCountRow extends Omit<Partial<DailyLotteryCount>, 'variance' | 'varianceAmount' | 'physicalRemaining'> {
    _gameName: string;
    _bookNumber: string;
    _slotNumber?: string;
    _ticketPrice: number;
    startTicket: number;
    endTicket: number;
    soldCount: number;
    salesAmount: number;
    id?: string;
    physicalRemaining?: number;
    variance?: number;
    varianceAmount?: number;
    bookId?: string;
    expectedRemaining?: number;
    reasonCode?: 'MISCOUNT' | 'DAMAGED' | 'THEFT' | 'UNKNOWN';
    notes?: string;
}

const DailyReconciliationView = () => {
    const navigate = useNavigate();
    const {
        games,
        fetchGames,
        fetchBooks,
        activeBooks,
        saveDailyCounts
    } = useLotteryStore();

    const today = new Date().toISOString().split('T')[0];
    const [selectedDate] = useState(today);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFinalized, setIsFinalized] = useState(false);
    const [counts, setCounts] = useState<DailyCountRow[]>([]);

    const {
        loadDraft,
        clearDraft,
        saveDraft,
        lastSaved,
        isSaving: isAutoSaving
    } = useAutoSave<DailyCountRow[]>('daily_reconciliation', counts);

    const activeBookArr = activeBooks();

    const loadActiveInventory = useCallback(() => {
        const initial = activeBookArr.map(book => {
            const game = games.find(g => g.id === book.gameId);
            const expected = book.ticketEnd - book.currentTicket;
            return {
                bookId: book.id,
                _bookNumber: book.bookNumber,
                _slotNumber: book.slotNumber,
                _gameName: book.gameName,
                _ticketPrice: game?.ticketPrice || 0,
                date: selectedDate,
                startTicket: book.currentTicket,
                endTicket: book.currentTicket,
                soldCount: 0,
                salesAmount: 0,
                expectedRemaining: expected,
                physicalRemaining: expected,
                variance: 0,
                varianceAmount: 0,
                notes: ''
            };
        });
        setCounts(initial);
    }, [activeBookArr, games, selectedDate]);

    useEffect(() => {
        const init = async () => {
            await Promise.all([fetchBooks(), fetchGames()]);
        };
        init();
    }, []);

    useEffect(() => {
        if (activeBookArr.length > 0 && games.length > 0 && counts.length === 0) {
            const draft = loadDraft();
            if (draft && draft.length > 0 && draft[0].date === selectedDate) {
                setCounts(draft);
            } else {
                loadActiveInventory();
            }
        }
    }, [activeBookArr.length, games.length, counts.length, selectedDate, loadActiveInventory, loadDraft]);

    useEffect(() => {
        if (counts.length > 0) {
            saveDraft(counts);
        }
    }, [counts, saveDraft]);

    const calculateRow = (idx: number, endTicket: number) => {
        const newCounts = [...counts];
        const row = newCounts[idx];
        if (!row) return;

        row.endTicket = endTicket;
        const sold = row.endTicket - row.startTicket;
        row.soldCount = sold > 0 ? sold : 0;
        row.salesAmount = row.soldCount * (row._ticketPrice || 0);

        const book = activeBookArr.find(b => b.id === row.bookId);
        if (book) {
            row.physicalRemaining = book.ticketEnd - row.endTicket;
        }

        row.variance = 0;
        row.varianceAmount = 0;
        setCounts(newCounts);
    };

    const updateNotes = (idx: number, notes: string) => {
        const newCounts = [...counts];
        newCounts[idx].notes = notes;
        setCounts(newCounts);
    };

    const markRowSoldOut = (idx: number) => {
        const row = counts[idx];
        if (row && row.bookId) {
            const book = activeBookArr.find(b => b.id === row.bookId);
            if (book) {
                calculateRow(idx, book.ticketEnd);
            }
        }
    };

    const totalSalesAmount = useMemo(() => {
        return counts.reduce((sum, row) => sum + (row.salesAmount || 0), 0);
    }, [counts]);

    const totalTicketsSold = useMemo(() => {
        return counts.reduce((sum, row) => sum + (row.soldCount || 0), 0);
    }, [counts]);

    const handleSubmit = async () => {
        if (!window.confirm(`Are you sure you want to finalize counts?\n\nTotal Sales: $${totalSalesAmount.toFixed(2)}\nTickets Sold: ${totalTicketsSold}\n\nThis will update the inventory log.`)) {
            return;
        }

        setIsSubmitting(true);
        try {
            const activeCounts = counts.filter(c => c.soldCount > 0 || c.notes);

            const payload = activeCounts.map(c => {
                const {
                    _bookNumber,
                    _gameName,
                    _slotNumber,
                    _ticketPrice,
                    startTicket,
                    endTicket,
                    soldCount,
                    salesAmount,
                    ...dbFields
                } = c;

                return {
                    ...dbFields,
                    date: selectedDate,
                    variance: Number(dbFields.variance || 0),
                    varianceAmount: Number(dbFields.varianceAmount || 0),
                    expectedRemaining: Number(dbFields.expectedRemaining || 0),
                    slotNumber: _slotNumber || null,
                    startTicket,
                    endTicket,
                    soldCount,
                    salesAmount,
                    bookNumber: _bookNumber,
                    gameName: _gameName
                } as any;
            });

            await saveDailyCounts(payload);
            clearDraft();
            setIsFinalized(true);
        } catch (e) {
            console.error(e);
            alert('Failed to save counts.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        if (window.confirm('Are you sure you want to clear this form? This will remove all entered data.')) {
            clearDraft();
            loadActiveInventory();
        }
    };

    const lastSavedText = lastSaved ? lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black font-display text-slate-900 uppercase italic tracking-tighter">Daily Count</h2>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Reconciliation & Variance Check</p>
                        {lastSaved && (
                            <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full animate-in fade-in">
                                <CheckCircle2 className="w-3 h-3" />
                                Saved {lastSavedText}
                            </div>
                        )}
                        {isAutoSaving && (
                            <div className="flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-in fade-in">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Saving...
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <button title="Print" className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                            <Printer className="w-4 h-4" />
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        <button title="Export CSV" className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                            <Download className="w-4 h-4" />
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        <button onClick={resetForm} title="Reset Form" className="p-2 hover:bg-rose-50 rounded-lg text-rose-500 transition-colors">
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="px-4 py-2 bg-slate-100 rounded-lg font-mono font-black text-slate-600 text-xs">
                        {selectedDate}
                    </div>
                </div>
            </div>

            {/* Main Table */}
            {!isFinalized ? (
                <div className="glass-panel overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-black tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Pack Entity</th>
                                    <th className="px-6 py-4 text-center">Begin #</th>
                                    <th className="px-6 py-4 w-32 text-center bg-primary-50/50 text-primary-900 border-x border-primary-100 italic">End Ticket (Input)</th>
                                    <th className="px-6 py-4 text-center">Sold</th>
                                    <th className="px-6 py-4 text-right">Yield $</th>
                                    <th className="px-6 py-4 w-48">Notes</th>
                                    <th className="px-6 py-4 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {counts.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {row._slotNumber && <div className="font-mono font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase">{row._slotNumber}</div>}
                                                <div className="font-mono font-black text-slate-900 bg-slate-200/50 px-2 py-1 rounded text-xs">#{row._bookNumber}</div>
                                                <div>
                                                    <div className="font-black text-slate-700 text-xs uppercase italic tracking-tighter">{row._gameName}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">${row._ticketPrice} UNIT</div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-center font-mono text-slate-400 font-bold">
                                            {row.startTicket}
                                        </td>

                                        <td className="px-6 py-2 bg-primary-50/30">
                                            <input
                                                type="number"
                                                value={row.endTicket}
                                                onChange={(e) => calculateRow(idx, parseInt(e.target.value) || 0)}
                                                className="w-full text-center font-mono font-black text-slate-900 bg-white border-2 border-primary-100 rounded-xl py-2 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm"
                                            />
                                        </td>

                                        <td className="px-6 py-4 text-center font-mono font-black text-slate-900">
                                            {row.soldCount}
                                        </td>

                                        <td className="px-6 py-4 text-right font-mono font-black text-emerald-600 bg-emerald-50/20 italic">
                                            ${row.salesAmount.toFixed(2)}
                                        </td>

                                        <td className="px-6 py-2">
                                            <input
                                                value={row.notes}
                                                onChange={(e) => updateNotes(idx, e.target.value)}
                                                type="text"
                                                placeholder="..."
                                                className="w-full bg-slate-50 border-none rounded-lg text-xs font-bold focus:bg-white focus:ring-1 focus:ring-slate-200 transition-all italic"
                                            />
                                        </td>

                                        <td className="px-6 py-2 text-center">
                                            <button onClick={() => markRowSoldOut(idx)} className="text-[10px] font-black uppercase text-amber-500 hover:text-amber-700 hover:scale-105 transition-transform" title="Mark as fully sold out">
                                                Sold Out
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-8 flex items-center justify-between border-t-2 border-emerald-500 bg-white sticky bottom-0 shadow-2xl">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-500 border border-emerald-100">
                                <CheckCircle2 className="w-7 h-7" />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-900 uppercase italic text-sm tracking-tight">Ledger Summary</h4>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Yield Total:</span>
                                    <span className="font-black text-emerald-600 text-3xl italic tracking-tighter">${totalSalesAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-10 py-5 rounded-[2rem] font-black uppercase italic tracking-widest text-xs flex items-center gap-3 transition-all shadow-2xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-950 text-white shadow-slate-900/40 hover:bg-slate-900 hover:-translate-y-1"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {isSubmitting ? 'Syncing Vault...' : 'Finalize Audit'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="max-w-xl mx-auto space-y-8 animate-in zoom-in duration-500 mt-12">
                    <div className="glass-panel p-12 text-center space-y-8 border-t-8 border-emerald-500 rounded-[3rem]">
                        <div className="w-24 h-24 bg-emerald-100 rounded-[2rem] flex items-center justify-center mx-auto text-emerald-600 mb-8 shadow-2xl shadow-emerald-500/20 rotate-12">
                            <CheckCircle2 className="w-12 h-12" />
                        </div>

                        <div>
                            <h3 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Audit Synchronized</h3>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Cycle Count: {selectedDate}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 py-10 border-y border-slate-100">
                            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Yield</p>
                                <p className="text-4xl font-black text-emerald-600 tracking-tighter italic">${totalSalesAmount.toFixed(2)}</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Units Dispatched</p>
                                <p className="text-4xl font-black text-slate-900 tracking-tighter italic">{totalTicketsSold}</p>
                            </div>
                        </div>

                        <button onClick={() => navigate('/lottery')} className="w-full py-6 rounded-3xl bg-slate-950 text-white text-xs font-black uppercase italic tracking-[0.2em] shadow-2xl shadow-slate-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
                            Return to Command
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyReconciliationView;
