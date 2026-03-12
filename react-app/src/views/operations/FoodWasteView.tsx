import { useState, useEffect, useMemo } from 'react';
import {
    Trash2, Plus, Save, History as HistoryIcon,
    TrendingDown, Calendar, ChevronLeft, ChevronRight,
    FileText, ArrowDownRight, LayoutGrid,
    Soup, Sparkles, Loader2, ListChecks
} from 'lucide-react';
import { useFoodWasteStore, type WasteItem } from '../../stores/useFoodWasteStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const FoodWasteView = () => {
    const foodWasteStore = useFoodWasteStore();
    const authStore = useAuthStore();
    const notificationStore = useNotificationStore();

    // Form State
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<Omit<WasteItem, 'id'>[]>([
        { name: '', quantity: 0, unit: 'Units', reason: 'Expired', costPerUnit: 0, totalCost: 0, category: 'Deli' }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingLogId, setEditingLogId] = useState<string | null>(null);

    // UI State
    const categories = ['Deli', 'Produce', 'Dairy', 'Bakery', 'Meat', 'Grocery', 'Other'];
    const reasons = ['Expired', 'Damaged', 'Cooked Extra', 'Recall', 'Theft', 'Other'];
    const unitsList = ['Units', 'Lbs', 'Kg', 'Cases', 'Pans'];
    const [selectedFilter, setSelectedFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
    const [isWasteFocusOpen, setIsWasteFocusOpen] = useState(false);

    useEffect(() => {
        foodWasteStore.fetchLogs();
    }, []);

    useEffect(() => {
        const existing = foodWasteStore.logs.find(l => l.date === selectedDate);
        if (existing) {
            setEditingLogId(existing.id);
            setItems(existing.items.map(i => ({ ...i })));
            setNotes(existing.notes || '');
        } else {
            resetForm();
        }
    }, [selectedDate, foodWasteStore.logs]);

    const resetForm = () => {
        setEditingLogId(null);
        setItems([{ name: '', quantity: 0, unit: 'Units', reason: 'Expired', costPerUnit: 0, totalCost: 0, category: 'Deli' }]);
        setNotes('');
    };

    const addItem = () => {
        setItems([...items, { name: '', quantity: 0, unit: 'Units', reason: 'Expired', costPerUnit: 0, totalCost: 0, category: 'Deli' }]);
    };

    const removeItem = (idx: number) => {
        const newItems = items.filter((_, i) => i !== idx);
        setItems(newItems.length === 0 ? [{ name: '', quantity: 0, unit: 'Units', reason: 'Expired', costPerUnit: 0, totalCost: 0, category: 'Deli' }] : newItems);
    };

    const updateItem = (idx: number, field: keyof Omit<WasteItem, 'id'>, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[idx], [field]: value };
        if (field === 'quantity' || field === 'costPerUnit') {
            item.totalCost = (Number(item.quantity) || 0) * (Number(item.costPerUnit) || 0);
        }
        newItems[idx] = item;
        setItems(newItems);
    };

    const totalWasteValue = useMemo(() => {
        return items.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    }, [items]);

    const saveLog = async () => {
        if (items.some(i => !i.name || i.quantity <= 0)) {
            notificationStore.error('Please fill in all item details and quantities', 'Form Incomplete');
            return;
        }

        setIsSubmitting(true);
        try {
            const logData = {
                date: selectedDate,
                items: items.map((i, idx) => ({ ...i, id: `item_${idx}_${Date.now()}` })) as WasteItem[],
                totalValue: totalWasteValue,
                submittedBy: authStore.user?.email || 'Manager',
                notes: notes,
                status: 'COMPLETE' as const
            };

            if (editingLogId) {
                await foodWasteStore.updateLog(editingLogId, logData);
                notificationStore.success('Waste record updated', 'Success');
            } else {
                await foodWasteStore.addLog(logData);
                notificationStore.success('New waste log recorded', 'Success');
            }
        } catch (error) {
            notificationStore.error('Failed to save waste record', 'System Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const navigateDate = (days: number) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const deleteLog = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            await foodWasteStore.deleteLog(id);
            notificationStore.success('Record purged', 'Deleted');
            if (editingLogId === id) resetForm();
        } catch (e) {
            notificationStore.error('Delete failed', 'Error');
        }
    };

    const dailyAverage = useMemo(() => {
        if (foodWasteStore.logs.length === 0) return 0;
        const total = foodWasteStore.logs.reduce((sum, l) => sum + l.totalValue, 0);
        return total / foodWasteStore.logs.length;
    }, [foodWasteStore.logs]);

    const filteredLogs = useMemo(() => {
        const now = new Date();
        return foodWasteStore.logs.filter(l => {
            const logDate = new Date(l.date);
            if (selectedFilter === 'today') return l.date === new Date().toISOString().split('T')[0];
            if (selectedFilter === 'week') return (now.getTime() - logDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
            if (selectedFilter === 'month') return (now.getTime() - logDate.getTime()) < 30 * 24 * 60 * 60 * 1000;
            return true;
        });
    }, [foodWasteStore.logs, selectedFilter]);

    const categoryDistribution = useMemo(() => {
        const dist: Record<string, number> = {};
        foodWasteStore.logs.forEach(log => {
            log.items.forEach(item => {
                dist[item.category] = (dist[item.category] || 0) + item.totalCost;
            });
        });
        return dist;
    }, [foodWasteStore.logs]);

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Food Waste Registry</h1>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Shrinkage control & deli loss audit</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white border border-slate-100 p-4 rounded-3xl flex items-center gap-4 shadow-sm">
                        <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
                            <TrendingDown className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">MTD Waste Value</p>
                            <p className="text-lg font-black text-slate-900">${foodWasteStore.logs.filter(l => l.date.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, l) => s + l.totalValue, 0).toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-100 p-4 rounded-3xl flex items-center gap-4 shadow-sm">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
                            <LayoutGrid className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Average Loss/Log</p>
                            <p className="text-lg font-black text-slate-900">${dailyAverage.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-8 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-100 rounded-2xl">
                                <Calendar className="w-6 h-6 text-slate-500" />
                            </div>
                            <div>
                                <h3 className="text-slate-900 font-black text-lg uppercase italic leading-none">{editingLogId ? 'Modify Record' : 'Log New Waste'}</h3>
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1.5">{selectedDate === new Date().toISOString().split('T')[0] ? 'Recording Today' : 'Archived Entry'}</p>
                            </div>
                        </div>

                        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                            <button onClick={() => navigateDate(-1)} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-slate-900 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent border-none text-slate-900 font-black text-sm focus:ring-0 px-4 w-[160px] text-center" />
                            <button onClick={() => navigateDate(1)} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-slate-900 transition-all"><ChevronRight className="w-5 h-5" /></button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div
                            onClick={() => setIsWasteFocusOpen(true)}
                            className="group bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 cursor-pointer hover:border-rose-100 hover:bg-rose-50/20 transition-all shadow-sm flex items-center justify-between"
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-rose-500/10">
                                    <Soup className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Food Loss Focus View</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{items.length} Items Registered in current audit</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Session Total</p>
                                    <p className="text-3xl font-black text-rose-500 tabular-nums">${totalWasteValue.toFixed(2)}</p>
                                </div>
                                <div className="p-4 bg-slate-900 text-white rounded-2xl group-hover:bg-rose-500 transition-colors">
                                    <ListChecks className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic block mb-4 flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-indigo-500" /> Additional Context / Incident Details
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full h-32 bg-slate-50 border border-slate-100 rounded-3xl p-6 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all resize-none shadow-inner"
                                placeholder="Record reasons for large disposals, temperature failures, or damaged delivery notes..."
                            ></textarea>
                        </div>

                        <div className="flex items-center gap-4">
                            <button onClick={resetForm} className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-3xl transition-all">Reset Entry</button>
                            <button
                                onClick={saveLog}
                                disabled={isSubmitting}
                                className="flex-1 flex items-center justify-center gap-3 py-5 bg-slate-900 hover:bg-black text-white rounded-[2rem] text-sm font-black uppercase tracking-widest transition-all shadow-2xl disabled:opacity-50"
                            >
                                {!isSubmitting ? <Save className="w-5 h-5" /> : <Loader2 className="w-5 h-5 animate-spin" />}
                                {isSubmitting ? 'Syncing...' : 'Commit Daily Waste log'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-4 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-indigo-50 text-indigo-500 rounded-2xl">
                                <Soup className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 uppercase italic">Loss by Category</h3>
                        </div>

                        <div className="space-y-4">
                            {Object.entries(categoryDistribution).map(([cat, val]) => (
                                <div key={cat} className="space-y-2">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-500">{cat}</span>
                                        <span className="text-slate-900">${val.toFixed(2)}</span>
                                    </div>
                                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                        <div className="h-full bg-indigo-500 transition-all duration-1000"
                                            style={{ width: `${(val / (totalWasteValue || 1)) * 100}%` }}></div>
                                    </div>
                                </div>
                            ))}
                            {Object.keys(categoryDistribution).length === 0 && <div className="text-center py-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">No data available</div>}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col max-h-[600px]">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-amber-50 text-amber-500 rounded-2xl">
                                    <HistoryIcon className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase italic">Waste Archives</h3>
                            </div>
                            <div className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-400">{filteredLogs.length} RECORDS</div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-8">
                            {(['today', 'week', 'month', 'all'] as const).map(f => (
                                <button key={f}
                                    onClick={() => setSelectedFilter(f)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                        selectedFilter === f ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'bg-slate-50 text-slate-400 hover:text-slate-900'
                                    )}>
                                    {f}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                            {filteredLogs.map(log => (
                                <div key={log.id}
                                    onClick={() => setSelectedDate(log.date)}
                                    className="group p-5 bg-white border border-slate-100 hover:border-slate-300 hover:bg-slate-50 rounded-[2rem] transition-all cursor-pointer shadow-sm relative overflow-hidden">
                                    <div className="relative z-10 flex items-center justify-between mb-4">
                                        <div>
                                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-tighter">{new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</h4>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{new Date(log.date).toLocaleDateString(undefined, { weekday: 'long' })}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-rose-500 tabular-nums">${log.totalValue.toFixed(2)}</p>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Net Loss</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-100/50 pt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500 border border-slate-200 uppercase">
                                                {log.submittedBy?.[0] || '?'}
                                            </div>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[100px]">{log.submittedBy}</span>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                            <ArrowDownRight className="w-3.5 h-3.5 text-slate-300" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredLogs.length === 0 && (
                                <div className="text-center py-20 flex flex-col items-center">
                                    <Trash2 className="w-12 h-12 text-slate-100 mb-4" />
                                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest italic leading-relaxed">No waste records found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isWasteFocusOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300" onClick={() => setIsWasteFocusOpen(false)}></div>
                    <div className="relative bg-white rounded-[3rem] w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col border border-slate-200">
                        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-5">
                                <div className="p-4 rounded-3xl bg-rose-500 text-white shadow-lg shadow-rose-500/20">
                                    <Trash2 className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Itemized Loss Audit</h2>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Wide-View Precision Shrinkage Registry</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={addItem} className="flex items-center gap-2 px-8 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/10">
                                    <Plus className="w-4 h-4" /> Add Item Row
                                </button>
                                <button onClick={() => setIsWasteFocusOpen(false)} className="px-8 py-4 bg-slate-900 text-white hover:bg-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                                    Return to Log
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30">
                            <div className="space-y-6">
                                {items.map((item, idx) => (
                                    <div key={idx} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 relative group transition-all hover:shadow-2xl hover:border-slate-200">
                                        <button onClick={() => removeItem(idx)} className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white border border-slate-100 text-slate-300 hover:text-rose-500 flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all z-20">
                                            <Trash2 className="w-5 h-5" />
                                        </button>

                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
                                            <div className="lg:col-span-4 space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Description</label>
                                                <div className="flex gap-4">
                                                    <select value={item.category} onChange={(e) => updateItem(idx, 'category', e.target.value)} className="w-32 h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-4 text-[10px] font-black uppercase outline-none focus:bg-white focus:border-rose-500 transition-all">
                                                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                    </select>
                                                    <input value={item.name} onChange={(e) => updateItem(idx, 'name', e.target.value)} type="text" placeholder="e.g. Deli Hot Sandwich" className="flex-1 h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 text-sm font-bold outline-none focus:bg-white focus:border-rose-500 transition-all" />
                                                </div>
                                            </div>

                                            <div className="lg:col-span-3 space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity Lost</label>
                                                <div className="flex gap-4">
                                                    <input value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} type="number" className="flex-1 h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 text-sm font-black outline-none focus:bg-white focus:border-rose-500 transition-all" />
                                                    <select value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} className="w-28 h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-4 text-[10px] font-black uppercase outline-none focus:bg-white focus:border-rose-500 transition-all">
                                                        {unitsList.map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="lg:col-span-3 space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Value & Reason</label>
                                                <div className="flex gap-4">
                                                    <div className="relative flex-1">
                                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black">$</span>
                                                        <input value={item.costPerUnit} onChange={(e) => updateItem(idx, 'costPerUnit', Number(e.target.value))} type="number" step="0.01" className="w-full h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl pl-10 pr-6 text-sm font-bold outline-none focus:bg-white focus:border-rose-500 transition-all" />
                                                    </div>
                                                    <select value={item.reason} onChange={(e) => updateItem(idx, 'reason', e.target.value)} className="flex-1 h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-4 text-[10px] font-black uppercase outline-none focus:bg-white focus:border-rose-500 transition-all">
                                                        {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="lg:col-span-2 space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Loss Value</label>
                                                <div className="h-14 flex items-center justify-end px-6 bg-rose-50 rounded-2xl text-base font-black text-rose-600 border border-rose-100 tabular-nums shadow-inner">
                                                    ${(item.totalCost || 0).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-10 p-10 bg-white/50 rounded-[3rem] border-2 border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-10">
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <Sparkles className="w-3 h-3 text-amber-500" /> Accuracy Policy
                                        </h4>
                                        <p className="text-[11px] text-slate-500 font-bold leading-relaxed max-w-sm">Please ensure all disposals are categorized correctly.</p>
                                    </div>
                                    <div className="h-12 w-px bg-slate-200"></div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Item Count</p>
                                        <p className="text-2xl font-black text-slate-900">{items.length} Records</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Audit Session Total</p>
                                    <p className="text-4xl font-black text-slate-900 tabular-nums">${totalWasteValue.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FoodWasteView;
