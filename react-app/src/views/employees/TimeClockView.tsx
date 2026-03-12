import { useState, useEffect, useMemo } from 'react';
import { useEmployeesStore } from '../../stores/useEmployeesStore';
import { useTimesheetsStore } from '../../stores/useTimesheetsStore';
import { useTasksStore } from '../../stores/useTasksStore';
import { useShiftStore } from '../../stores/useShiftStore';
import {
    LogIn, LogOut, User, Timer, History,
    CheckCircle2, ListTodo, ArrowRight, Play
} from 'lucide-react';

export default function TimeClockView() {
    const fetchEmployees = useEmployeesStore(state => state.fetchEmployees);
    const employees = useEmployeesStore(state => state.employees);

    const fetchShifts = useShiftStore(state => state.fetchShifts);
    const shifts = useShiftStore(state => state.shifts);

    const fetchTimeLogs = useTimesheetsStore(state => state.fetchTimeLogs);
    const clockIn = useTimesheetsStore(state => state.clockIn);
    const clockOut = useTimesheetsStore(state => state.clockOut);
    const activeLog = useTimesheetsStore(state => state.activeLog);
    const timeLogs = useTimesheetsStore(state => state.timeLogs);
    const loadingTimesheets = useTimesheetsStore(state => state.loading);

    const fetchTasks = useTasksStore(state => state.fetchTasks);
    const updateTaskStatus = useTasksStore(state => state.updateTaskStatus);
    const tasks = useTasksStore(state => state.tasks);
    const loadingTasks = useTasksStore(state => state.loading);

    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [enteredPin, setEnteredPin] = useState('');

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchEmployees();
        fetchShifts();
    }, [fetchEmployees, fetchShifts]);

    const handleEmployeeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedEmployeeId(val);
        setEnteredPin('');
        if (val) {
            await Promise.all([
                fetchTimeLogs(val),
                fetchTasks(val)
            ]);
        }
    };

    const activeEmployee = useMemo(() => {
        return employees.find(e => e.id === selectedEmployeeId);
    }, [employees, selectedEmployeeId]);

    const myTasks = useMemo(() => {
        if (!selectedEmployeeId) return [];
        return tasks.filter(t => t.status !== 'COMPLETED' && t.assignedTo === selectedEmployeeId);
    }, [tasks, selectedEmployeeId]);

    const handleClockAction = async () => {
        if (!selectedEmployeeId || !activeEmployee) return;

        // PIN Check
        if (activeEmployee.pin && enteredPin !== activeEmployee.pin) {
            alert('Incorrect PIN. Please try again.');
            setEnteredPin('');
            return;
        }

        if (activeLog) {
            // Clocking Out
            await clockOut(activeLog.id, selectedEmployeeId);
            alert(`Goodbye, ${activeEmployee.firstName}! Shift ended.`);
        } else {
            // Clocking In
            let lateness = { isLate: false, lateMinutes: 0 };
            let shiftId = '';
            let scheduledEndTime: any = null;

            const today = new Date();
            const employeeShifts = shifts.filter(s =>
                s.employeeId === selectedEmployeeId &&
                s.startTime && typeof s.startTime.toDate === 'function' &&
                s.startTime.toDate().toDateString() === today.toDateString()
            );

            if (employeeShifts.length > 0) {
                const sortedShifts = [...employeeShifts].sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime());
                const currentShift = sortedShifts.find(s => today.getTime() < s.endTime.toDate().getTime()) || sortedShifts[0];

                if (currentShift) {
                    shiftId = currentShift.id;
                    scheduledEndTime = currentShift.endTime;

                    const startTime = currentShift.startTime.toDate().getTime();
                    const earlyThreshold = startTime - (10 * 60 * 1000);

                    if (today.getTime() < earlyThreshold) {
                        const diff = Math.ceil((startTime - today.getTime()) / (60 * 1000));
                        alert(`Too Early! Please wait another ${diff - 10} minutes before clocking in to prevent unauthorized overtime.`);
                        setEnteredPin('');
                        return;
                    }

                    if (today.getTime() > startTime) {
                        const diff = Math.floor((today.getTime() - startTime) / (60 * 1000));
                        lateness = { isLate: true, lateMinutes: diff };
                    }
                }
            } else if (activeEmployee.role !== 'Admin' && activeEmployee.role !== 'Manager') {
                console.warn('No scheduled shift found for today.');
            }

            await clockIn(selectedEmployeeId, `${activeEmployee.firstName} ${activeEmployee.lastName}`, {
                ...lateness,
                shiftId,
                scheduledEndTime
            });

            let msg = `Welcome, ${activeEmployee.firstName}!\n\nPlease check your daily tasks. Thank you.`;
            if (lateness.isLate) {
                msg = `⚠️ LATE CLOCK-IN DETECTED ⚠️\n\nWelcome, ${activeEmployee.firstName}. You are marked as late by ${lateness.lateMinutes} minutes.`;
            }
            alert(msg);
        }

        setEnteredPin('');
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const handleTaskClick = async (id: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED';
        // @ts-ignore
        await updateTaskStatus(id, nextStatus);
    };

    // Calculate live earnings
    const liveEarned = useMemo(() => {
        if (!activeLog?.clockIn || !activeEmployee?.hourlyRate) return "0.00";
        const start = activeLog.clockIn.toDate ? activeLog.clockIn.toDate() : new Date(activeLog.clockIn);
        const hours = (currentTime.getTime() - start.getTime()) / (1000 * 60 * 60);
        return (hours * activeEmployee.hourlyRate).toFixed(2);
    }, [activeLog, activeEmployee, currentTime]);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12 w-full text-[11px]">
            <div className="text-center space-y-3 mb-12">
                <h2 className="text-4xl font-black font-display text-slate-900 uppercase italic tracking-tighter">Shift Dashboard</h2>
                <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Command Center • C-Store Daily Ops</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column (Punch Card) */}
                <div className="lg:col-span-5 space-y-8">
                    <div className="bg-white p-10 flex flex-col items-center text-center space-y-10 rounded-[2.5rem] border border-slate-100 shadow-2xl relative">
                        {/* Live Clock Display */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-primary-600 uppercase tracking-[0.5em] ml-1">Universal Time</p>
                            <p className="text-6xl font-black text-slate-900 font-mono tracking-tighter">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <div className="h-px w-8 bg-slate-200"></div>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                    {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                </p>
                                <div className="h-px w-8 bg-slate-200"></div>
                            </div>
                        </div>

                        {/* Employee Selection */}
                        <div className="w-full space-y-6 pt-10 border-t border-slate-50">
                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Identify Employee</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="w-5 h-5 text-slate-300 group-focus-within:text-primary-500 transition-colors" />
                                    </div>
                                    <select
                                        value={selectedEmployeeId}
                                        onChange={handleEmployeeChange}
                                        className="w-full pl-12 h-16 text-lg font-black uppercase italic tracking-tighter bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-primary-500 text-slate-900 transition-all appearance-none rounded-[1.5rem] outline-none"
                                    >
                                        <option value="">Select your name...</option>
                                        {employees.length === 0 && <option disabled>No employees found.</option>}
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.firstName} {emp.lastName}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                        <ArrowRight className="w-5 h-5 text-slate-300" />
                                    </div>
                                </div>
                            </div>

                            {/* PIN Input */}
                            {selectedEmployeeId && activeEmployee?.pin && (
                                <div className="space-y-2 text-left animate-in fade-in slide-in-from-top-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Enter PIN</label>
                                    <input
                                        value={enteredPin}
                                        onChange={(e) => setEnteredPin(e.target.value)}
                                        type="password"
                                        maxLength={4}
                                        placeholder="••••"
                                        className="w-full h-16 text-center text-2xl font-black tracking-[1em] text-slate-900 bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-primary-500 transition-all rounded-[1.5rem] outline-none"
                                    />
                                </div>
                            )}

                            {/* Main Action Button */}
                            <button
                                onClick={handleClockAction}
                                disabled={!selectedEmployeeId || loadingTimesheets || (!!activeEmployee?.pin && enteredPin.length < 4)}
                                className={`w-full py-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden relative shadow-2xl ${activeLog ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-rose-500/30' : 'bg-gradient-to-br from-primary-600 to-indigo-600 text-white shadow-primary-500/30'
                                    }`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                {loadingTimesheets ? (
                                    <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full"></div>
                                ) : (
                                    <>
                                        {activeLog ? <LogOut className="w-10 h-10 mb-2 group-hover:scale-110 transition-transform duration-500" /> : <LogIn className="w-10 h-10 mb-2 group-hover:scale-110 transition-transform duration-500" />}
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-80 leading-none">
                                            {activeLog ? 'Shift Active' : 'Available for Duty'}
                                        </span>
                                        <span className="text-2xl font-black uppercase italic tracking-tighter">
                                            {activeLog ? 'Clock Out' : 'Clock In'}
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Current Session Info */}
                        {activeLog && (
                            <div className="w-full p-6 rounded-3xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-between animate-in fade-in slide-in-from-bottom-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                                        <Timer className="w-6 h-6 animate-pulse" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">Shift Start</p>
                                        <p className="text-lg font-black text-slate-900 tracking-tighter">{formatTime(activeLog.clockIn)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">Live Earned</p>
                                    <p className="text-2xl font-black text-emerald-600 font-mono tracking-tighter">
                                        ${liveEarned}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column (My Live Tasks) */}
                <div className="lg:col-span-12 xl:col-span-7 space-y-8">
                    {/* Live Tasks Card */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 overflow-hidden min-h-[500px] flex flex-col shadow-2xl relative">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center">
                                    <ListTodo className="w-6 h-6 text-primary-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">Shift Tasks</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personal Action Items</p>
                                </div>
                            </div>
                            {selectedEmployeeId && (
                                <div className="flex items-center gap-2">
                                    <span className="bg-primary-50 text-primary-700 px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                                        {myTasks.length} Active
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 space-y-4">
                            {!selectedEmployeeId ? (
                                <div className="h-80 flex flex-col items-center justify-center text-center opacity-40">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                        <User className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Identification Required</p>
                                    <p className="text-slate-400 text-[10px] mt-1 max-w-[200px]">Select your name to view your assigned tasks for this shift.</p>
                                </div>
                            ) : loadingTasks ? (
                                <div className="h-80 flex items-center justify-center">
                                    <div className="w-10 h-10 border-2 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                                </div>
                            ) : myTasks.length === 0 ? (
                                <div className="h-80 flex flex-col items-center justify-center text-center">
                                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                                    </div>
                                    <p className="text-emerald-800 font-black uppercase tracking-widest text-xs">Duty Clear!</p>
                                    <p className="text-slate-400 text-[10px] mt-1">Outstanding tasks have been completed.</p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {myTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className="group p-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 hover:border-primary-200 hover:bg-white transition-all shadow-sm hover:shadow-xl"
                                        >
                                            <div className="flex items-start justify-between gap-6">
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        {task.priority === 'URGENT' && (
                                                            <span className="px-3 py-1 bg-rose-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 animate-pulse">Urgent</span>
                                                        )}
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target: {task.title}</span>
                                                    </div>
                                                    <p className="text-base font-black text-slate-900 italic tracking-tighter uppercase line-clamp-1">{task.title}</p>
                                                    <p className="text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed">{task.description}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleTaskClick(task.id, task.status)}
                                                    className={`shrink-0 w-16 h-16 rounded-3xl flex items-center justify-center transition-all active:scale-90 ${task.status === 'PENDING' ? 'bg-slate-200 text-slate-500 hover:bg-primary-500 hover:text-white' : 'bg-primary-500 text-white shadow-lg shadow-primary-200'
                                                        }`}
                                                >
                                                    {task.status === 'PENDING' ? <Play className="w-8 h-8 ml-1" /> : <CheckCircle2 className="w-8 h-8" />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
                            <button className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:text-primary-800 transition-colors">Go to Task Board</button>
                            <div className="flex items-center gap-2">
                                <History className="w-4 h-4 text-slate-300" />
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">History Log Beneath</span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Logs (Mini Strip) */}
                    {selectedEmployeeId && (
                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl shadow-md overflow-x-auto">
                            {timeLogs.length === 0 && !loadingTimesheets ? (
                                <div className="text-center py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">
                                    No recent shift history for this employee
                                </div>
                            ) : (
                                <div className="flex gap-4 min-w-max pb-2">
                                    {timeLogs.slice(0, 5).map(log => (
                                        <div
                                            key={log.id}
                                            className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 min-w-[200px]"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                                                <User className="w-5 h-5 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{formatDate(log.clockIn)}</p>
                                                <p className="text-[11px] font-black text-slate-800">{log.totalHours ? `${log.totalHours.toFixed(1)}h` : 'Shift Active'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <style>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #e2e8f0;
              border-radius: 9999px;
            }
            `}</style>
        </div>
    );
}
