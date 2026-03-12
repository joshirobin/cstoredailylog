import { useState, useEffect, useMemo, useRef } from 'react';
import {
    Clock,
    CheckCircle2,
    DollarSign,
    Vault,
    Calculator,
    Save,
    Zap,
    Plus,
    Trash2,
    ChevronRight,
    TrendingUp,
    History,
    AlertCircle
} from 'lucide-react';
import CashDenominations from '../../components/CashDenominations';
import { useShiftStore } from '../../stores/useShiftStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useEmployeesStore } from '../../stores/useEmployeesStore';
import { useSalesStore, Check, DenominationCounts, SalesLog } from '../../stores/useSalesStore';
import { useTimesheetsStore } from '../../stores/useTimesheetsStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useLocationsStore } from '../../stores/useLocationsStore';

export default function ClerkDashboardView() {
    const authStore = useAuthStore();
    const employeesStore = useEmployeesStore();
    const salesStore = useSalesStore();
    const timesheetsStore = useTimesheetsStore();
    const notificationStore = useNotificationStore();
    const shiftStore = useShiftStore();
    const locationsStore = useLocationsStore();

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const currentTimeRaw = useRef(new Date());
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

    useEffect(() => {
        const timer = setInterval(() => {
            currentTimeRaw.current = new Date();
            setCurrentTime(new Date().toLocaleTimeString());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const userActiveLog = useMemo(() => {
        return timesheetsStore.timeLogs.find(l => !l.clockOut);
    }, [timesheetsStore.timeLogs]);

    const elapsedDuration = useMemo(() => {
        if (!userActiveLog?.clockIn) return '0h 0m';
        const start = (userActiveLog.clockIn as any).toDate?.() || new Date(userActiveLog.clockIn as any);
        const diff = currentTimeRaw.current.getTime() - start.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }, [currentTime, userActiveLog]);

    const handleQuickRegistry = async () => {
        try {
            if (userActiveLog) {
                await timesheetsStore.clockOut(userActiveLog.id, userActiveLog.employeeId);
                notificationStore.success('Shift ended successfully', 'Time Clock');
            } else {
                const emp = employeesStore.employees.find(e => e.email === authStore.user?.email);
                if (!emp) {
                    notificationStore.error('Employee profile not found for this account', 'Error');
                    return;
                }

                let lateness = { isLate: false, lateMinutes: 0 };
                let shiftId = '';
                let scheduledEndTime: any = null;

                const today = new Date();
                const myShifts = shiftStore.shifts.filter(s =>
                    s.employeeId === emp.id &&
                    s.startTime && typeof (s.startTime as any).toDate === 'function' &&
                    (s.startTime as any).toDate().toDateString() === today.toDateString()
                );

                if (myShifts.length > 0) {
                    const sorted = myShifts.sort((a, b) => (a.startTime as any).toDate().getTime() - (b.startTime as any).toDate().getTime());
                    const currentShift = sorted.find(s => today.getTime() < (s.endTime as any).toDate().getTime()) || sorted[0];

                    if (currentShift) {
                        shiftId = currentShift.id;
                        scheduledEndTime = currentShift.endTime;
                        const startTime = (currentShift.startTime as any).toDate().getTime();

                        if (today.getTime() < startTime - (10 * 60 * 1000)) {
                            const minsLeft = Math.ceil((startTime - today.getTime()) / (60 * 1000)) - 10;
                            notificationStore.error(`Too early! Your shift starts at ${formatTime(currentShift.startTime)}. Please wait ${minsLeft} more mins.`, 'Overtime Prevention');
                            return;
                        }

                        if (today.getTime() > startTime) {
                            lateness = { isLate: true, lateMinutes: Math.floor((today.getTime() - startTime) / (60 * 1000)) };
                        }
                    }
                }

                await timesheetsStore.clockIn(emp.id, `${emp.firstName} ${emp.lastName}`, {
                    ...lateness,
                    shiftId,
                    scheduledEndTime
                });
                notificationStore.success('Shift started!', 'Time Clock');
            }
        } catch (e) {
            notificationStore.error('Failed to update time registry', 'Error');
        }
    };

    const todayDate = new Date().toISOString().split('T')[0];
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'checkout' | 'tasks'>('checkout');
    const [activeAuditType, setActiveAuditType] = useState<'opening' | 'closing' | 'safe' | null>(null);

    const [openingCash, setOpeningCash] = useState<number>(0);
    const [openingDetails, setOpeningDetails] = useState<DenominationCounts | undefined>(undefined);
    const [closingCash, setClosingCash] = useState<number>(0);
    const [closingDetails, setClosingDetails] = useState<DenominationCounts | undefined>(undefined);
    const [safeDrops, setSafeDrops] = useState<number>(0);
    const [safeDetails, setSafeDetails] = useState<DenominationCounts | undefined>(undefined);
    const [expenses, setExpenses] = useState<number>(0);
    const [checks, setChecks] = useState<Check[]>([]);
    const [notes, setNotes] = useState('');

    const totalSales = useMemo(() => {
        return (closingCash - openingCash) + safeDrops - expenses;
    }, [closingCash, openingCash, safeDrops, expenses]);

    const checksTotal = useMemo(() => {
        return checks.reduce((sum, c) => sum + (c.amount || 0), 0);
    }, [checks]);

    const [tasks, setTasks] = useState([
        { id: 'clock_in', label: 'Clock In', done: false },
        { id: 'drawer_verify', label: 'Verify Opening Drawer', done: false },
        { id: 'clean_counter', label: 'Clean POS Area', done: false },
        { id: 'stock_tobacco', label: 'Restock Tobacco/Nicotine', done: false },
        { id: 'check_bathroom', label: 'Restroom Inspection', done: false },
        { id: 'trash_empty', label: 'Empty Lobby Trash', done: false },
        { id: 'closing_count', label: 'Final Cash Count', done: false },
    ]);

    const taskProgress = useMemo(() => {
        const done = tasks.filter(t => t.done).length;
        return Math.round((done / tasks.length) * 100);
    }, [tasks]);

    useEffect(() => {
        const init = async () => {
            const activeLocation = locationsStore.activeLocationId || 'default_location';
            await Promise.all([
                employeesStore.fetchEmployees(),
                salesStore.fetchLogs(activeLocation),
                timesheetsStore.fetchTimeLogs(''),
                shiftStore.fetchShifts()
            ]);

            const myEmp = employeesStore.employees.find(e => e.email === authStore.user?.email);
            if (myEmp) {
                await timesheetsStore.fetchTimeLogs(myEmp.id);
            }
        };
        init();
    }, [authStore.user?.email, locationsStore.activeLocationId, employeesStore.fetchEmployees, salesStore.fetchLogs, timesheetsStore.fetchTimeLogs, shiftStore.fetchShifts]);

    useEffect(() => {
        const existingLog = salesStore.logs.find(l => l.date === todayDate);
        if (existingLog) {
            setOpeningCash(existingLog.openingCash);
            setClosingCash(existingLog.closingCash);
            setSafeDrops(existingLog.safeCash || 0);
            setExpenses(existingLog.expenses || 0);
            setChecks(existingLog.checks || []);
            setNotes(existingLog.notes || '');
        } else {
            const prevLog = salesStore.logs
                .filter(l => l.date < todayDate)
                .sort((a, b) => b.date.localeCompare(a.date))[0];

            if (prevLog) {
                setOpeningCash(prevLog.closingCash);
                notificationStore.info(`Carried over $${prevLog.closingCash.toFixed(2)} from ${prevLog.date}`, "Sync");
            }
        }
    }, [salesStore.logs, todayDate, notificationStore]);

    const addCheck = () => setChecks([...checks, { number: '', amount: 0 }]);
    const removeCheck = (index: number) => {
        const newChecks = [...checks];
        newChecks.splice(index, 1);
        setChecks(newChecks);
    };

    const updateCheckAmount = (index: number, amount: number) => {
        const newChecks = [...checks];
        newChecks[index].amount = amount;
        setChecks(newChecks);
    };

    const updateCheckNumber = (index: number, number: string) => {
        const newChecks = [...checks];
        newChecks[index].number = number;
        setChecks(newChecks);
    };

    const toggleTask = (index: number) => {
        const newTasks = [...tasks];
        newTasks[index].done = !newTasks[index].done;
        setTasks(newTasks);
    };

    const saveShift = async () => {
        setIsSubmitting(true);
        try {
            const activeLocation = locationsStore.activeLocationId || 'default_location';
            const logData: Omit<SalesLog, 'id' | 'locationId'> = {
                date: todayDate,
                openingCash: Number(openingCash) || 0,
                openingDenominations: openingDetails,
                closingCash: Number(closingCash) || 0,
                closingDenominations: closingDetails,
                safeCash: Number(safeDrops) || 0,
                safeCashDetails: safeDetails,
                expenses: Number(expenses) || 0,
                totalSales: Number(totalSales) || 0,
                notes: notes,
                checks: checks.length > 0 ? checks : undefined,
                safeTotal: (Number(safeDrops) || 0) + checksTotal,
                submittedBy: authStore.user?.email || 'Unknown',
                status: 'PENDING_REVIEW'
            };

            const existing = salesStore.logs.find(l => l.date === todayDate);
            if (existing) {
                await salesStore.updateLog(existing.id, logData, activeLocation);
            } else {
                await salesStore.addLog(logData, activeLocation, authStore.user?.email || 'Unknown');
            }
            notificationStore.success('Shift report submitted for manager review!', 'Success');
        } catch (e) {
            notificationStore.error('Failed to save shift report.', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-full bg-slate-50 flex flex-col -m-6 p-4 space-y-4">
            <header className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
                        <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Clerk Terminal</h1>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Shift Session: {todayDate}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Digital Clock</p>
                        <p className="text-sm font-black text-primary-600 tabular-nums">{currentTime}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-100"></div>
                    <div className="flex items-center gap-2">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-900 leading-none">{authStore.user?.email?.split('@')[0] || 'User'}</p>
                            <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Status: Active</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold">
                            {authStore.user?.email?.[0]?.toUpperCase() || '?'}
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-4 overflow-hidden">
                <main className="xl:col-span-8 flex flex-col gap-4 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">

                    <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab('checkout')}
                            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'checkout' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >Shift Balance</button>
                        <button
                            onClick={() => setActiveTab('tasks')}
                            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'tasks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >Task Log ({taskProgress}%)</button>
                    </div>

                    {activeTab === 'checkout' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                    <TrendingUp className="w-32 h-32" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Shift Performance</p>
                                    <h2 className="text-4xl font-black font-mono tracking-tighter">${totalSales.toFixed(2)}</h2>
                                </div>
                                <div className="mt-6 grid grid-cols-4 gap-4">
                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Opening</p>
                                        <p className="text-xs font-bold">${openingCash.toFixed(0)}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Safe Drops</p>
                                        <p className="text-xs font-bold">${safeDrops.toFixed(0)}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Expenses</p>
                                        <p className="text-xs font-bold text-rose-400">-${expenses.toFixed(0)}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Closing</p>
                                        <p className="text-xs font-bold">${closingCash.toFixed(0)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
                                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-emerald-500" />
                                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Register Settlement</h3>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="space-y-4">
                                            <div
                                                onClick={() => setActiveAuditType('opening')}
                                                className="flex items-center justify-between px-4 py-4 bg-transparent rounded-2xl cursor-pointer hover:bg-slate-100 transition-all border-2 border-slate-100 group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 group-hover:scale-110 transition-transform">
                                                        <Calculator className="w-4 h-4" />
                                                    </div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer">Opening Balance Audit</label>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-base font-black text-emerald-600">${openingCash.toFixed(2)}</span>
                                                    <Plus className="w-4 h-4 text-slate-300" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div
                                                onClick={() => setActiveAuditType('closing')}
                                                className="flex items-center justify-between px-4 py-4 bg-transparent rounded-2xl cursor-pointer hover:bg-slate-100 transition-all border-2 border-slate-100 group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary-50 rounded-lg text-primary-600 group-hover:scale-110 transition-transform">
                                                        <Calculator className="w-4 h-4" />
                                                    </div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer">Closing Balance Audit</label>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-base font-black text-primary-600">${closingCash.toFixed(2)}</span>
                                                    <Plus className="w-4 h-4 text-slate-300" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
                                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Vault className="w-4 h-4 text-amber-500" />
                                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Drops & Payouts</h3>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="space-y-4">
                                            <div
                                                onClick={() => setActiveAuditType('safe')}
                                                className="flex items-center justify-between px-4 py-3 bg-transparent rounded-xl cursor-pointer hover:bg-slate-50 transition-all border border-slate-100/50"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Safe Drops / Vault</label>
                                                    <Plus className="w-3 h-3 text-slate-400" />
                                                </div>
                                                <span className="text-sm font-black text-amber-600">${safeDrops.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Payouts / Expenses</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold pointer-events-none">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={expenses}
                                                    onChange={e => setExpenses(parseFloat(e.target.value) || 0)}
                                                    className="w-full h-10 bg-slate-50 border border-rose-50 rounded-lg pl-8 pr-4 text-sm font-bold text-rose-600 focus:bg-white focus:border-rose-500 transition-all outline-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
                                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <History className="w-4 h-4 text-primary-500" />
                                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Checks & Non-Cash Items</h3>
                                        </div>
                                        <button onClick={addCheck} className="text-[10px] font-black uppercase text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors">
                                            <Plus className="w-3 h-3" /> Add Check
                                        </button>
                                    </div>
                                    <div className="p-4">
                                        {checks.length > 0 ? (
                                            <div className="space-y-2">
                                                {checks.map((check, idx) => (
                                                    <div key={idx} className="flex gap-2 animate-in slide-in-from-left-2 duration-300">
                                                        <input
                                                            value={check.number}
                                                            onChange={e => updateCheckNumber(idx, e.target.value)}
                                                            placeholder="Check/MO #"
                                                            className="flex-1 h-9 bg-slate-50 border border-slate-100 rounded-lg px-3 text-xs font-bold outline-none focus:bg-white focus:border-primary-500"
                                                        />
                                                        <div className="relative w-32">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs pointer-events-none">$</span>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={check.amount}
                                                                onChange={e => updateCheckAmount(idx, parseFloat(e.target.value) || 0)}
                                                                className="w-full h-9 bg-slate-50 border border-slate-100 rounded-lg pl-6 pr-3 text-xs font-bold text-right outline-none focus:bg-white focus:border-emerald-500 [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                        </div>
                                                        <button onClick={() => removeCheck(idx)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                ))}
                                                <div className="pt-2 border-t border-slate-50 flex justify-between items-center px-2">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Checks Subtotal</span>
                                                    <span className="text-sm font-black text-slate-900">${checksTotal.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-6">
                                                <p className="text-[10px] font-bold text-slate-300 uppercase italic">No checks recorded for this shift</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] ml-1 block mb-3 italic">Handover Notes & Observations</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full h-48 bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-primary-500 transition-all resize-none shadow-inner"
                                    placeholder="Standard field for variance explanations or shift notes..."
                                ></textarea>
                            </div>

                            <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                                <button className="px-6 py-3 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Clear Form</button>
                                <button
                                    onClick={saveShift}
                                    disabled={isSubmitting}
                                    className="flex-1 max-w-[300px] py-4 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50"
                                >
                                    {!isSubmitting ? (
                                        <Save className="w-4 h-4" />
                                    ) : (
                                        <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                                    )}
                                    {isSubmitting ? 'Processing...' : 'Submit Shift Final'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tasks' && (
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-black text-slate-900 uppercase italic tracking-tighter">Shift Checklist</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Status: {taskProgress}% COMPLETE</p>
                                </div>
                                <div className="w-12 h-12 flex items-center justify-center relative">
                                    <svg className="w-12 h-12 transform -rotate-90">
                                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent"
                                            className="text-emerald-500 transition-all duration-1000"
                                            strokeDasharray={2 * Math.PI * 20}
                                            strokeDashoffset={2 * Math.PI * 20 * (1 - taskProgress / 100)}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute text-[10px] font-black text-slate-900">{taskProgress}%</div>
                                </div>
                            </div>
                            <div className="p-6 space-y-3">
                                {tasks.map((task, idx) => (
                                    <div
                                        key={task.id}
                                        onClick={() => toggleTask(idx)}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${task.done ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${task.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 group-hover:border-primary-500'}`}
                                            >
                                                {task.done && <CheckCircle2 className="w-4 h-4" />}
                                            </div>
                                            <span className={`text-sm font-bold transition-all ${task.done ? 'text-emerald-700' : 'text-slate-600'}`}>{task.label}</span>
                                        </div>
                                        {task.done && <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Verified</span>}
                                    </div>
                                ))}
                            </div>
                            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Automated shift log syncing active</p>
                            </div>
                        </div>
                    )}
                </main>

                <aside className="xl:col-span-4 space-y-4 overflow-y-auto pr-1 pb-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                            <Clock className="w-24 h-24" />
                        </div>
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg transition-all ${userActiveLog ? 'bg-emerald-50 text-emerald-600 shadow-emerald-500/10' : 'bg-slate-50 text-slate-400 shadow-slate-500/10'}`}>
                                <Clock className={`w-8 h-8 ${userActiveLog ? 'animate-pulse' : ''}`} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Time Registry</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {userActiveLog ? 'Shift in Progress' : 'No Active Session'}
                            </p>

                            <div className="mt-6 w-full space-y-3">
                                {userActiveLog && (
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                                        <div className="text-left">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Shift Started</p>
                                            <p className="text-xs font-bold text-slate-900">{formatTime(userActiveLog.clockIn)}</p>
                                        </div>
                                        <div className="w-px h-6 bg-slate-200"></div>
                                        <div className="text-right">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Elapsed</p>
                                            <p className="text-xs font-bold text-primary-600 tabular-nums">{elapsedDuration}</p>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={handleQuickRegistry}
                                    disabled={timesheetsStore.loading}
                                    className="w-full py-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50"
                                >
                                    {userActiveLog ? 'End My Shift' : 'Clock In Now'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
                                <Zap className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">Feed Indicators</h3>
                        </div>
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex gap-4 items-start pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-800 line-clamp-1 leading-tight">Lottery Reconciliation Sync Complete</p>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">3m ago — Automated</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="mt-6 w-full py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center gap-2">
                            View Full Audit <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-rose-900 uppercase tracking-tighter">Stationary Alert</h4>
                                <p className="text-[10px] font-bold text-rose-600 leading-tight mt-1 truncate">Fuel low at Station 04</p>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Modals */}
            {activeAuditType && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300" onClick={() => setActiveAuditType(null)}></div>

                    <div className="relative bg-white rounded-[3rem] w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col border border-slate-200">
                        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-5">
                                <div className={`p-4 rounded-3xl shadow-lg ${activeAuditType === 'opening' ? 'bg-emerald-500 text-white' :
                                    activeAuditType === 'closing' ? 'bg-indigo-500 text-white' : 'bg-amber-500 text-white'}`}>
                                    <Calculator className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
                                        {activeAuditType === 'opening' ? 'Opening Balance Focus' :
                                            activeAuditType === 'closing' ? 'Shift Closing Audit' : 'Vault / Safe Deposit'}
                                    </h2>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1">High-Precision Denomination Entry</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveAuditType(null)}
                                className="px-8 py-4 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm"
                            >
                                Save & Close View
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                            {activeAuditType === 'opening' && (
                                <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                                    <CashDenominations label="Starting Register" modelValue={openingCash} onChange={setOpeningCash} onDetailsChange={setOpeningDetails} />
                                </div>
                            )}
                            {activeAuditType === 'closing' && (
                                <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                                    <CashDenominations label="End of Shift Audit" modelValue={closingCash} onChange={setClosingCash} onDetailsChange={setClosingDetails} />
                                </div>
                            )}
                            {activeAuditType === 'safe' && (
                                <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                                    <CashDenominations label="Vault Transfer Details" modelValue={safeDrops} onChange={setSafeDrops} onDetailsChange={setSafeDetails} />
                                </div>
                            )}

                            <div className="mt-10 grid grid-cols-3 gap-6">
                                <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Accuracy Check</h4>
                                    <p className="text-[11px] text-slate-400 font-bold leading-relaxed">Ensure all physical bills match the quantity entered. Discrepancies over $1.00 must be noted.</p>
                                </div>
                                <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Coin Policy</h4>
                                    <p className="text-[11px] text-slate-400 font-bold leading-relaxed">Include all loose change and rolled coins currently in the register drawer.</p>
                                </div>
                                <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Auto-Save</h4>
                                    <p className="text-[11px] text-slate-400 font-bold leading-relaxed">Your counts are automatically buffered and saved when you return to the main terminal.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
