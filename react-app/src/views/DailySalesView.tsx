import { useState, useEffect, useMemo } from 'react';
import { useSalesStore, SalesLog } from '../stores/useSalesStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useLocationsStore } from '../stores/useLocationsStore';
import {
    Save, AlertCircle, History as HistoryIcon,
    Trash2,
    Edit3, ChevronLeft, ChevronRight,
    TrendingUp, Wallet,
    Clock, Calculator, Loader2,
    CheckCircle2, FileUp, ToggleLeft, ToggleRight,
    X, Check, FileCheck
} from 'lucide-react';
import PdiReconciliationForm from './components/PdiReconciliationForm';
import DailyReconciliationForm from './components/DailyReconciliationForm';
import CashDenominations from './components/CashDenominations';

type DateFilter = 'today' | 'week' | 'month' | 'year' | 'all';

export default function DailySalesView() {
    const fetchLogs = useSalesStore(state => state.fetchLogs);
    const logs = useSalesStore(state => state.logs);
    const addLog = useSalesStore(state => state.addLog);
    const updateLog = useSalesStore(state => state.updateLog);
    const deleteLogStore = useSalesStore(state => state.deleteLog);
    const updateLogStatus = useSalesStore(state => state.updateLogStatus);
    const getLogsByDateRange = useSalesStore(state => state.getLogsByDateRange);
    const uploadReport = useSalesStore(state => state.uploadReport);

    const activeLocationId = useLocationsStore(state => state.activeLocationId);
    const activeLocation = useLocationsStore(state => state.activeLocation);
    const user = useAuthStore(state => state.user);

    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

    const defaultFormState = {
        openingCash: 0, closingCash: 0, safeCash: 0, expenses: 0, notes: '',
        pdiForm: null,
        usePdi: true, // Default to PDI for new logs
        lotteryReportUrl: '',
        globalReportUrl: ''
    };

    const [currentLogForm, setCurrentLogForm] = useState<any>(defaultFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [selectedFilter, setSelectedFilter] = useState<DateFilter>('all');
    const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
    const [deleteConfirmLogId, setDeleteConfirmLogId] = useState<string | null>(null);

    // Denomination Modal State
    const [showCalculator, setShowCalculator] = useState(false);
    const [calcField, setCalcField] = useState<string | null>(null);

    // Upload state
    const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        if (activeLocationId) {
            fetchLogs(activeLocationId);
        }
    }, [activeLocationId, fetchLogs]);

    useEffect(() => {
        checkExistingLog();
    }, [selectedDate, logs]);

    const checkExistingLog = () => {
        const existingLog = logs.find(l => l.date === selectedDate);
        if (existingLog) {
            loadLogForEditing(existingLog);
        } else {
            // New log for this date
            const prevLog = logs
                .filter(l => l.date < selectedDate)
                .sort((a, b) => b.date.localeCompare(a.date))[0];

            setCurrentLogForm({
                ...defaultFormState,
                date: selectedDate,
                openingCash: prevLog?.closingCash || 0,
                usePdi: true,
                pdiForm: {
                    date: selectedDate,
                    openingFloat: prevLog?.closingCash || 0,
                }
            });
            setEditingLogId(null);
        }
    };

    const navigateDate = (days: number) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const loadLogForEditing = (log: SalesLog) => {
        setEditingLogId(log.id);
        setSelectedDate(log.date);
        setCurrentLogForm({
            ...log,
            usePdi: !!log.pdiForm
        });
    };

    const cancelEdit = () => {
        setEditingLogId(null);
        checkExistingLog();
    };

    const toggleLogExpansion = (logId: string) => {
        const newSet = new Set(expandedLogIds);
        if (newSet.has(logId)) newSet.delete(logId);
        else newSet.add(logId);
        setExpandedLogIds(newSet);
    };

    const confirmDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeleteConfirmLogId(id);
    };

    const deleteLog = async () => {
        if (!deleteConfirmLogId || !activeLocationId) return;
        try {
            await deleteLogStore(deleteConfirmLogId, activeLocationId);
            if (editingLogId === deleteConfirmLogId) cancelEdit();
        } catch (e) { console.error(e); } finally { setDeleteConfirmLogId(null); }
    };

    const verifyLog = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!activeLocationId) return;
        try {
            await updateLogStatus(id, 'VERIFIED', activeLocationId);
        } catch (e) { console.error(e); }
    };

    const onFileSelect = async (event: any, type: string) => {
        const file = event.target.files[0];
        if (file && activeLocationId) {
            setUploading((prev: any) => ({ ...prev, [type]: true }));
            try {
                const url = await uploadReport(file, activeLocationId, selectedDate, type);
                setCurrentLogForm((prev: any) => ({
                    ...prev,
                    [type === 'lottery' ? 'lotteryReportUrl' : 'globalReportUrl']: url
                }));
            } catch (error) {
                console.error('Upload failed', error);
            } finally {
                setUploading((prev: any) => ({ ...prev, [type]: false }));
            }
        }
    };

    const handleDenomChange = (total: number) => {
        if (!calcField) return;
        if (currentLogForm.usePdi) {
            setCurrentLogForm((prev: any) => ({
                ...prev,
                pdiForm: { ...prev.pdiForm, [calcField]: total }
            }));
        } else {
            setCurrentLogForm((prev: any) => ({ ...prev, [calcField]: total }));
        }
    };

    const openCalculator = (field: string) => {
        setCalcField(field);
        setShowCalculator(true);
    };

    const filteredLogs = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        switch (selectedFilter) {
            case 'today': startDate = new Date(now.setHours(0, 0, 0, 0)); break;
            case 'week': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
            case 'month': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
            case 'year': startDate = new Date(now.getFullYear(), 0, 1); break;
            default: return logs;
        }
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        return getLogsByDateRange(startDate, endDate);
    }, [logs, selectedFilter, getLogsByDateRange]);

    const totalSalesThisWeek = useMemo(() => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return logs
            .filter((l: SalesLog) => new Date(l.date) >= weekAgo)
            .reduce((sum: number, l: any) => sum + (l.totalSales || 0), 0);
    }, [logs]);

    const totalSalesThisMonth = useMemo(() => {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        return logs
            .filter((l: SalesLog) => new Date(l.date) >= monthAgo)
            .reduce((sum: number, l: any) => sum + (l.totalSales || 0), 0);
    }, [logs]);

    const calculatedTotalSales = useMemo(() => {
        if (currentLogForm.usePdi && currentLogForm.pdiForm) {
            return (currentLogForm.pdiForm.taxableSales || 0) +
                (currentLogForm.pdiForm.nonTaxable || 0) +
                (currentLogForm.pdiForm.salesTax || 0) +
                (currentLogForm.pdiForm.fuelSalesTotal || 0) +
                (currentLogForm.pdiForm.lotterySales || 0) +
                (currentLogForm.pdiForm.otherSales || 0);
        }
        return (currentLogForm.posZReportSummary?.insideSales || 0) +
            (currentLogForm.posZReportSummary?.fuelSales || 0) +
            (currentLogForm.posZReportSummary?.lotterySales || 0);
    }, [currentLogForm]);

    const saveDailyLog = async () => {
        if (!activeLocationId) return;
        setIsSubmitting(true);
        try {
            const finalData = {
                ...currentLogForm,
                date: selectedDate,
                totalSales: calculatedTotalSales,
                locationId: activeLocationId,
                status: currentLogForm.status || 'PENDING_REVIEW'
            };
            if (!finalData.usePdi) delete finalData.pdiForm;

            if (editingLogId) {
                await updateLog(editingLogId, finalData, activeLocationId);
            } else {
                await addLog(finalData, activeLocationId, user?.email || 'unknown');
            }
            setEditingLogId(null);
            checkExistingLog();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-full bg-slate-50 flex flex-col p-6 space-y-8 overflow-y-auto w-full relative">
            {/* Calculator Modal */}
            {showCalculator && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative p-1">
                        <button onClick={() => setShowCalculator(false)} className="absolute top-8 right-8 p-3 rounded-full bg-slate-100 text-slate-400 hover:text-slate-900 z-10">
                            <X className="w-6 h-6" />
                        </button>
                        <div className="p-8 pb-0">
                            <h2 className="text-xl font-black text-slate-900 uppercase italic">Denomination Calculator</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Calculating for: {calcField?.replace(/([A-Z])/g, ' $1').toUpperCase()}</p>
                        </div>
                        <CashDenominations
                            label={calcField || ''}
                            value={null}
                            onChange={handleDenomChange}
                        />
                        <div className="p-8 pt-0 flex justify-end">
                            <button onClick={() => setShowCalculator(false)} className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase italic tracking-widest hover:bg-black transition-all">Close & Apply</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Sales Terminal</h1>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">{activeLocation?.name || 'Global Registry'} Activity Terminal</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-white/70 backdrop-blur-md rounded-3xl border border-slate-200 shadow-sm p-6 flex items-center gap-5">
                            <div className="p-4 rounded-2xl bg-blue-50 text-blue-600"><Wallet className="w-5 h-5" /></div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1.5">7D Sales</p>
                                <p className="text-2xl font-black font-mono tracking-tighter text-slate-900">${totalSalesThisWeek.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                        <div className="bg-white/70 backdrop-blur-md rounded-3xl border border-slate-200 shadow-sm p-6 flex items-center gap-5">
                            <div className="p-4 rounded-2xl bg-purple-50 text-purple-600"><TrendingUp className="w-5 h-5" /></div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1.5">Annual Trend</p>
                                <p className="text-2xl font-black font-mono tracking-tighter text-slate-900">${totalSalesThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <div className="xl:col-span-8 space-y-8">
                    {/* Header Controls */}
                    <div className="bg-white/70 border border-slate-200 rounded-3xl shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border-t-4 border-t-slate-900">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                                <button onClick={() => navigateDate(-1)} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-slate-900 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent border-none text-slate-900 font-black text-sm focus:ring-0 px-4 w-[160px] text-center" />
                                <button onClick={() => navigateDate(1)} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-slate-900 transition-all"><ChevronRight className="w-5 h-5" /></button>
                            </div>

                            <div className="h-10 w-px bg-slate-100"></div>

                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${!currentLogForm.usePdi ? 'text-slate-900' : 'text-slate-400'}`}>Standard</span>
                                <button
                                    onClick={() => setCurrentLogForm((prev: any) => ({ ...prev, usePdi: !prev.usePdi }))}
                                    className={`p-1 rounded-full transition-all ${currentLogForm.usePdi ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                >
                                    {currentLogForm.usePdi ? <ToggleRight className="w-8 h-8 text-white" /> : <ToggleLeft className="w-8 h-8 text-white" />}
                                </button>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${currentLogForm.usePdi ? 'text-indigo-600' : 'text-slate-400'}`}>PDI Form</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button onClick={() => openCalculator('actualCashCounted')} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                <Calculator className="w-4 h-4" /> Denomination Calculator
                            </button>
                        </div>
                    </div>

                    {/* Forms Rendering */}
                    <div className="space-y-8">
                        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden p-1">
                            {currentLogForm.usePdi ? (
                                <PdiReconciliationForm
                                    log={currentLogForm}
                                    isEditable={true}
                                    onChange={(pdiForm: any) => setCurrentLogForm({ ...currentLogForm, pdiForm })}
                                    onOpenCalculator={openCalculator}
                                />
                            ) : (
                                <DailyReconciliationForm
                                    log={currentLogForm}
                                    isEditable={true}
                                    onChange={(log: any) => setCurrentLogForm(log)}
                                    onOpenCalculator={openCalculator}
                                />
                            )}
                        </div>

                        {/* Attachments & Commit */}
                        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-50 rounded-2xl text-slate-900"><FileCheck className="w-6 h-6" /></div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase italic">Verification & Attachments</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Finalize daily financial audit</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {/* File Uploads */}
                                    <div className="space-y-6">
                                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 group">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lottery Report Snapshot</div>
                                                {currentLogForm.lotteryReportUrl && <Check className="w-4 h-4 text-emerald-500" />}
                                            </div>
                                            <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-slate-900 hover:bg-white transition-all">
                                                <input type="file" className="hidden" onChange={(e: any) => onFileSelect(e, 'lottery')} />
                                                {uploading.lottery ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : (
                                                    <>
                                                        <FileUp className="w-6 h-6 text-slate-400 group-hover:text-slate-900 mb-2" />
                                                        <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-slate-900">Upload PDF / Image</span>
                                                    </>
                                                )}
                                            </label>
                                        </div>

                                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 group">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global POS Report</div>
                                                {currentLogForm.globalReportUrl && <Check className="w-4 h-4 text-emerald-500" />}
                                            </div>
                                            <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-slate-900 hover:bg-white transition-all">
                                                <input type="file" className="hidden" onChange={(e: any) => onFileSelect(e, 'global')} />
                                                {uploading.global ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : (
                                                    <>
                                                        <FileUp className="w-6 h-6 text-slate-400 group-hover:text-slate-900 mb-2" />
                                                        <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-slate-900">Upload CSV / PDF</span>
                                                    </>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Discrepancy Notes</label>
                                            <textarea
                                                value={currentLogForm.notes || ''}
                                                onChange={e => setCurrentLogForm({ ...currentLogForm, notes: e.target.value })}
                                                className="w-full h-44 bg-slate-50 border-2 border-transparent rounded-[2rem] p-8 text-sm font-bold/80 text-slate-700 outline-none focus:bg-white focus:border-slate-900 transition-all resize-none shadow-inner leading-relaxed"
                                                placeholder="Explain any significant overages, shortages, or equipment failures during this shift..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                                    {editingLogId && (
                                        <button onClick={cancelEdit} className="px-10 py-5 rounded-[2rem] bg-slate-100 text-slate-500 font-black uppercase italic tracking-tighter hover:bg-slate-200 transition-all">Revert Changes</button>
                                    )}
                                    <button
                                        onClick={saveDailyLog}
                                        disabled={isSubmitting}
                                        className="flex-1 flex items-center justify-center gap-4 py-6 rounded-[2rem] bg-slate-900 text-white font-black uppercase italic tracking-widest hover:bg-black hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 shadow-2xl"
                                    >
                                        {isSubmitting ? <Loader2 className="w-8 h-8 animate-spin" /> : <Save className="w-8 h-8" />}
                                        <span className="text-2xl tracking-tighter">{isSubmitting ? 'Syncing...' : (editingLogId ? 'Update Activity' : 'Commit Daily Log')}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Archives */}
                <div className="xl:col-span-4 space-y-6">
                    <div className="sticky top-10 space-y-6">
                        <div className="bg-white/70 backdrop-blur-md rounded-3xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-slate-900 text-white rounded-xl">
                                        <HistoryIcon className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase italic">Audit Trail</h3>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-8">
                                {['today', 'week', 'month', 'all'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setSelectedFilter(f as DateFilter)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedFilter === f ? 'bg-slate-900 text-white shadow-lg shadow-black/20' : 'bg-slate-100 text-slate-400 hover:text-slate-900'}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredLogs.length > 0 ? filteredLogs.map(log => (
                                    <div
                                        key={log.id}
                                        onClick={() => toggleLogExpansion(log.id)}
                                        className={`rounded-2xl p-5 border transition-all cursor-pointer relative group ${selectedDate === log.date ? 'bg-slate-900 border-slate-900 text-white shadow-xl translate-x-2' : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className={`text-[11px] font-black uppercase tracking-tighter ${selectedDate === log.date ? 'text-white' : 'text-slate-900'}`}>{new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                                <div className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${selectedDate === log.date ? 'text-slate-400' : 'text-slate-400'}`}>{new Date(log.date).toLocaleDateString(undefined, { weekday: 'long' })}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-sm font-black tracking-tighter ${log.totalSales >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    ${(log.totalSales || 0).toFixed(2)}
                                                </div>
                                                <div className={`text-[8px] font-black uppercase tracking-widest ${selectedDate === log.date ? 'text-slate-500' : 'text-slate-400'}`}>Net Store Sales</div>
                                            </div>
                                        </div>

                                        {expandedLogIds.has(log.id) && (
                                            <div className="mt-6 border-t border-slate-100/10 pt-6 animate-in slide-in-from-top-2" onClick={e => e.stopPropagation()}>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-[10px] font-bold"><span className="text-slate-500 uppercase">System Type</span> <span className="text-primary-400 uppercase">{log.pdiForm ? 'PDI/Verifone' : 'Standard'}</span></div>
                                                    <div className="flex justify-between items-center text-[10px] font-bold"><span className="text-slate-500 uppercase">Audit Status</span> <span className={log.status === 'VERIFIED' ? 'text-emerald-400' : 'text-amber-400'}>{log.status}</span></div>
                                                    <button onClick={() => loadLogForEditing(log)} className="w-full mt-4 py-2 bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-700">Open Full Record</button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-end gap-3 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {log.status === 'PENDING_REVIEW' && (
                                                <button onClick={(e) => verifyLog(e, log.id)} className="p-2 text-slate-400 hover:text-emerald-500"><CheckCircle2 className="w-4 h-4" /></button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); loadLogForEditing(log); }} className="p-2 text-slate-400 hover:text-white"><Edit3 className="w-4 h-4" /></button>
                                            <button onClick={(e) => confirmDelete(e, log.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-20 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                                        <Clock className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">No Archived Logs</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {deleteConfirmLogId && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[200] animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full mx-4 border-b-8 border-rose-500">
                        <div className="text-center space-y-4 mb-10">
                            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase italic">Permanently Delete?</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">This financial record will be removed globally and cannot be recovered.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 font-black uppercase italic tracking-widest">
                            <button onClick={() => setDeleteConfirmLogId(null)} className="py-4 rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all">Cancel</button>
                            <button onClick={deleteLog} className="py-4 rounded-2xl bg-rose-600 text-white hover:bg-rose-700 shadow-xl shadow-rose-900/20 transition-all">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                  -webkit-appearance: none; 
                  margin: 0; 
                }
                .custom-scrollbar::-webkit-scrollbar {
                  width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: #e2e8f0;
                  border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
