import { useState, useEffect, useMemo } from 'react';
import { useShiftStore, Shift } from '../../stores/useShiftStore';
import { useEmployeesStore } from '../../stores/useEmployeesStore';
import { Timestamp } from 'firebase/firestore';
import {
    ChevronLeft, ChevronRight, Plus, X, Calendar,
    Clock, Users
} from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


function getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d;
}

function addDays(date: Date, n: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function toDateKey(date: Date): string {
    return date.toISOString().substring(0, 10);
}

function timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}



function shiftHours(shift: Shift): number {
    const start = shift.startTime?.toDate ? shift.startTime.toDate() : new Date(shift.startTime);
    const end = shift.endTime?.toDate ? shift.endTime.toDate() : new Date(shift.endTime);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

function formatShiftTime(ts: any): string {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ROLE_COLORS: Record<string, string> = {
    'Admin': 'bg-purple-100 border-purple-300 text-purple-800',
    'Manager': 'bg-blue-100 border-blue-300 text-blue-800',
    'Assistant Manager': 'bg-indigo-100 border-indigo-300 text-indigo-800',
    'Shift Manager': 'bg-cyan-100 border-cyan-300 text-cyan-800',
    'Cashier': 'bg-emerald-100 border-emerald-300 text-emerald-800',
    'Stocker': 'bg-amber-100 border-amber-300 text-amber-800',
    'default': 'bg-slate-100 border-slate-300 text-slate-700',
};

function getRoleColor(role: string) {
    return ROLE_COLORS[role] || ROLE_COLORS['default'];
}

export default function ScheduleView() {
    const { shifts, loading, fetchShifts, addShift, deleteShift } = useShiftStore();
    const { employees, fetchEmployees } = useEmployeesStore();

    const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
    const [showModal, setShowModal] = useState(false);
    const [selectedDay, setSelectedDay] = useState<string>('');

    const [form, setForm] = useState({
        employeeId: '',
        startTime: '09:00',
        endTime: '17:00',
        notes: '',
    });

    const weekDays = useMemo(() =>
        Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
        [weekStart]
    );

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    useEffect(() => {
        fetchShifts(weekStart);
    }, [weekStart, fetchShifts]);

    const shiftsByDay = useMemo(() => {
        const map: Record<string, Shift[]> = {};
        weekDays.forEach(d => { map[toDateKey(d)] = []; });
        shifts.forEach(s => {
            const key = s.date || (s.startTime?.toDate ? toDateKey(s.startTime.toDate()) : s.date);
            if (map[key]) map[key].push(s);
        });
        return map;
    }, [shifts, weekDays]);

    const totalHoursThisWeek = useMemo(() =>
        shifts.reduce((sum, s) => sum + shiftHours(s), 0),
        [shifts]
    );

    const openAdd = (dayKey: string) => {
        setSelectedDay(dayKey);
        setForm({ employeeId: '', startTime: '09:00', endTime: '17:00', notes: '' });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.employeeId || !selectedDay) return;
        const emp = employees.find(e => e.id === form.employeeId);
        if (!emp) return;

        const [year, month, day] = selectedDay.split('-').map(Number);
        const [sh, sm] = form.startTime.split(':').map(Number);
        const [eh, em] = form.endTime.split(':').map(Number);

        const startDate = new Date(year, month - 1, day, sh, sm, 0);
        const endDate = new Date(year, month - 1, day, eh, em, 0);

        await addShift({
            employeeId: form.employeeId,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            position: emp.position,
            startTime: Timestamp.fromDate(startDate),
            endTime: Timestamp.fromDate(endDate),
            date: selectedDay,
            notes: form.notes,
        });
        setShowModal(false);
    };

    const today = toDateKey(new Date());
    const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${addDays(weekStart, 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-display text-slate-900">Schedule</h2>
                    <p className="text-slate-500 text-sm">Weekly shift planner for your team.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
                        <button onClick={() => setWeekStart(w => addDays(w, -7))} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold text-slate-700 min-w-[200px] text-center">{weekLabel}</span>
                        <button onClick={() => setWeekStart(w => addDays(w, 7))} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    <button onClick={() => setWeekStart(getWeekStart(new Date()))} className="btn-secondary text-sm">Today</button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Staff', value: employees.filter(e => e.status === 'Active').length, icon: <Users className="w-5 h-5" />, color: 'text-primary-600 bg-primary-50' },
                    { label: 'Shifts This Week', value: shifts.length, icon: <Calendar className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Hours Scheduled', value: totalHoursThisWeek.toFixed(1), icon: <Clock className="w-5 h-5" />, color: 'text-amber-600 bg-amber-50' },
                    { label: 'Est. Labor Cost', value: `$${shifts.reduce((s, sh) => s + shiftHours(sh) * (employees.find(e => e.id === sh.employeeId)?.hourlyRate || 0), 0).toFixed(0)}`, icon: <span className="font-black text-base">$</span>, color: 'text-rose-600 bg-rose-50' },
                ].map(stat => (
                    <div key={stat.label} className="glass-panel p-4 flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${stat.color}`}>{stat.icon}</div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                            <p className="text-xl font-black text-slate-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day, i) => {
                        const key = toDateKey(day);
                        const isToday = key === today;
                        const dayShifts = shiftsByDay[key] || [];
                        return (
                            <div key={key} className={`rounded-2xl border transition-all ${isToday ? 'border-primary-300 bg-primary-50/30' : 'border-slate-100 bg-white'} min-h-[200px] flex flex-col overflow-hidden`}>
                                {/* Day Header */}
                                <div className={`px-3 py-2 flex flex-col border-b ${isToday ? 'border-primary-200' : 'border-slate-100'}`}>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-primary-600' : 'text-slate-400'}`}>{DAYS[i]}</span>
                                    <span className={`text-lg font-black leading-none ${isToday ? 'text-primary-700' : 'text-slate-700'}`}>{day.getDate()}</span>
                                </div>

                                {/* Shifts */}
                                <div className="flex-1 p-2 space-y-1.5 overflow-y-auto max-h-[300px]">
                                    {dayShifts.map(shift => {
                                        const emp = employees.find(e => e.id === shift.employeeId);
                                        const colorClass = getRoleColor(emp?.role || '');
                                        return (
                                            <div key={shift.id} className={`group rounded-xl border px-2 py-1.5 text-[10px] font-bold ${colorClass} relative`}>
                                                <div className="font-black leading-tight truncate">{shift.employeeName || emp?.firstName}</div>
                                                <div className="opacity-70 mt-0.5">{formatShiftTime(shift.startTime)} – {formatShiftTime(shift.endTime)}</div>
                                                <button
                                                    onClick={() => deleteShift(shift.id)}
                                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-current hover:text-red-500"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Add Button */}
                                <button
                                    onClick={() => openAdd(key)}
                                    className={`w-full py-2 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest border-t transition-colors ${isToday ? 'border-primary-200 text-primary-500 hover:bg-primary-50' : 'border-slate-100 text-slate-300 hover:bg-slate-50 hover:text-slate-500'}`}
                                >
                                    <Plus className="w-3 h-3" /> Add
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-2 pt-2">
                {Object.entries(ROLE_COLORS).filter(([k]) => k !== 'default').map(([role, cls]) => (
                    <span key={role} className={`px-3 py-1 rounded-full border text-[10px] font-black ${cls}`}>{role}</span>
                ))}
            </div>

            {/* Add Shift Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="glass-panel w-full max-w-md relative z-10 bg-white overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-900">Add Shift</h3>
                                <p className="text-xs text-slate-400">{selectedDay ? new Date(selectedDay + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : ''}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</label>
                                <select
                                    value={form.employeeId}
                                    onChange={e => setForm({ ...form, employeeId: e.target.value })}
                                    className="input-field w-full"
                                    required
                                >
                                    <option value="">Select employee...</option>
                                    {employees.filter(e => e.status === 'Active').map(e => (
                                        <option key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.position}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Time</label>
                                    <input
                                        type="time"
                                        value={form.startTime}
                                        onChange={e => setForm({ ...form, startTime: e.target.value })}
                                        className="input-field w-full"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Time</label>
                                    <input
                                        type="time"
                                        value={form.endTime}
                                        onChange={e => setForm({ ...form, endTime: e.target.value })}
                                        className="input-field w-full"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notes (optional)</label>
                                <input
                                    type="text"
                                    value={form.notes}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                    className="input-field w-full"
                                    placeholder="e.g. Opening shift"
                                />
                            </div>
                            {form.startTime && form.endTime && (
                                <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-600 font-medium">
                                    Duration: <span className="font-black text-slate-900">
                                        {((timeToMinutes(form.endTime) - timeToMinutes(form.startTime)) / 60).toFixed(1)} hrs
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                            <button onClick={handleSave} disabled={!form.employeeId} className="btn-primary flex-1 disabled:opacity-50">
                                Save Shift
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
