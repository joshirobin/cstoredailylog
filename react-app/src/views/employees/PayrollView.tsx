import { useState, useEffect, useMemo } from 'react';
import { useEmployeesStore } from '../../stores/useEmployeesStore';
import { useTimesheetsStore } from '../../stores/useTimesheetsStore';
import {
    DollarSign, Clock, Users,
    ChevronLeft, ChevronRight, Download, AlertTriangle
} from 'lucide-react';

// Get the start/end of a given pay period (bi-weekly, starting from a reference date)
function getPayPeriod(offset = 0): { start: Date; end: Date; label: string } {
    // Use current week's Sunday as anchor
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay() + offset * 14);
    sunday.setHours(0, 0, 0, 0);
    const end = new Date(sunday);
    end.setDate(sunday.getDate() + 13);
    end.setHours(23, 59, 59, 999);
    const label = `${sunday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    return { start: sunday, end, label };
}

function formatHours(h: number) {
    if (h === 0) return '0h 0m';
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return `${hrs}h ${mins}m`;
}

function toTimestamp(ts: any): number {
    if (!ts) return 0;
    if (ts?.toDate) return ts.toDate().getTime();
    return new Date(ts).getTime();
}

export default function PayrollView() {
    const { employees, fetchEmployees } = useEmployeesStore();
    const { allLogs, fetchAllTimeLogs, loading } = useTimesheetsStore();
    const [periodOffset, setPeriodOffset] = useState(0);

    const period = useMemo(() => getPayPeriod(periodOffset), [periodOffset]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    useEffect(() => {
        fetchAllTimeLogs(period.start, period.end);
    }, [fetchAllTimeLogs, period.start, period.end]);

    // Aggregate hours per employee within the period
    const payrollData = useMemo(() => {
        const start = period.start.getTime();
        const end = period.end.getTime();

        return employees.map(emp => {
            const logs = allLogs.filter(log => {
                if (log.employeeId !== emp.id) return false;
                const t = toTimestamp(log.clockIn);
                return t >= start && t <= end;
            });

            const regularHours = logs.reduce((sum, l) => sum + (l.totalHours || 0), 0);
            const overtimeHours = Math.max(0, regularHours - 80); // OT over 80h/bi-weekly
            const regularPay = Math.min(regularHours, 80) * (emp.hourlyRate || 0);
            const overtimePay = overtimeHours * (emp.hourlyRate || 0) * 1.5;
            const grossPay = regularPay + overtimePay;
            const shifts = logs.length;

            return {
                employee: emp,
                regularHours: Math.min(regularHours, 80),
                overtimeHours,
                totalHours: regularHours,
                grossPay,
                regularPay,
                overtimePay,
                shifts,
                logs,
                hourlyRate: emp.hourlyRate || 0,
            };
        }).filter(d => d.employee.status === 'Active');
    }, [employees, allLogs, period]);

    const totals = useMemo(() => ({
        hours: payrollData.reduce((s, d) => s + d.totalHours, 0),
        gross: payrollData.reduce((s, d) => s + d.grossPay, 0),
        overtime: payrollData.reduce((s, d) => s + d.overtimeHours, 0),
        employees: payrollData.filter(d => d.totalHours > 0).length,
    }), [payrollData]);

    const handleExportCSV = () => {
        const rows = [
            ['Employee', 'Position', 'Rate/hr', 'Regular Hours', 'OT Hours', 'Total Hours', 'Regular Pay', 'OT Pay', 'Gross Pay'],
            ...payrollData.map(d => [
                `${d.employee.firstName} ${d.employee.lastName}`,
                d.employee.position,
                d.hourlyRate.toFixed(2),
                d.regularHours.toFixed(2),
                d.overtimeHours.toFixed(2),
                d.totalHours.toFixed(2),
                d.regularPay.toFixed(2),
                d.overtimePay.toFixed(2),
                d.grossPay.toFixed(2),
            ])
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payroll_${period.start.toISOString().substring(0, 10)}.csv`;
        a.click();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-display text-slate-900">Payroll</h2>
                    <p className="text-slate-500 text-sm">Bi-weekly pay period summary and labor costs.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
                        <button onClick={() => setPeriodOffset(o => o - 1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold text-slate-700 min-w-[220px] text-center">{period.label}</span>
                        <button onClick={() => setPeriodOffset(o => o + 1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors" disabled={periodOffset >= 0}>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    <button onClick={handleExportCSV} className="btn-secondary flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Active Staff', value: totals.employees, icon: <Users className="w-5 h-5" />, color: 'text-primary-600 bg-primary-50', sub: 'with logged hours' },
                    { label: 'Total Hours', value: formatHours(totals.hours), icon: <Clock className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50', sub: 'this period' },
                    { label: 'OT Hours', value: formatHours(totals.overtime), icon: <AlertTriangle className="w-5 h-5" />, color: totals.overtime > 0 ? 'text-amber-600 bg-amber-50' : 'text-slate-400 bg-slate-50', sub: 'at 1.5×' },
                    { label: 'Gross Labor', value: `$${totals.gross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <DollarSign className="w-5 h-5" />, color: 'text-rose-600 bg-rose-50', sub: 'est. before tax' },
                ].map(stat => (
                    <div key={stat.label} className="glass-panel p-4 flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl shrink-0 ${stat.color}`}>{stat.icon}</div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                            <p className="text-lg font-black text-slate-900 leading-tight">{stat.value}</p>
                            <p className="text-[10px] text-slate-400">{stat.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Payroll Table */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="glass-panel overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900">Employee Summary</h3>
                        <span className="text-xs text-slate-400 font-medium">{period.label}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    {['Employee', 'Position', 'Rate', 'Shifts', 'Reg. Hours', 'OT Hours', 'Total Hours', 'Reg. Pay', 'OT Pay', 'Gross Pay'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {payrollData.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-12 text-slate-400 text-sm">
                                            No time logs found for this pay period.
                                        </td>
                                    </tr>
                                ) : (
                                    payrollData.map(d => (
                                        <tr key={d.employee.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600 uppercase">
                                                        {d.employee.firstName[0]}{d.employee.lastName[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{d.employee.firstName} {d.employee.lastName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{d.employee.position}</td>
                                            <td className="px-4 py-3 text-slate-600 font-mono">${d.hourlyRate.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">{d.shifts}</span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-slate-700">{formatHours(d.regularHours)}</td>
                                            <td className="px-4 py-3 font-mono">
                                                {d.overtimeHours > 0 ? (
                                                    <span className="text-amber-600 font-bold">{formatHours(d.overtimeHours)}</span>
                                                ) : (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-mono font-bold text-slate-900">{formatHours(d.totalHours)}</td>
                                            <td className="px-4 py-3 font-mono text-slate-600">${d.regularPay.toFixed(2)}</td>
                                            <td className="px-4 py-3 font-mono">
                                                {d.overtimePay > 0 ? (
                                                    <span className="text-amber-600 font-bold">${d.overtimePay.toFixed(2)}</span>
                                                ) : (
                                                    <span className="text-slate-300">$0.00</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-black text-slate-900 font-mono">${d.grossPay.toFixed(2)}</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {payrollData.length > 0 && (
                                <tfoot>
                                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                                        <td colSpan={4} className="px-4 py-3 font-black text-slate-700 text-xs uppercase tracking-wider">Totals</td>
                                        <td className="px-4 py-3 font-black font-mono text-slate-900">{formatHours(payrollData.reduce((s, d) => s + d.regularHours, 0))}</td>
                                        <td className="px-4 py-3 font-black font-mono text-amber-600">{formatHours(totals.overtime)}</td>
                                        <td className="px-4 py-3 font-black font-mono text-slate-900">{formatHours(totals.hours)}</td>
                                        <td className="px-4 py-3 font-black font-mono text-slate-900">${payrollData.reduce((s, d) => s + d.regularPay, 0).toFixed(2)}</td>
                                        <td className="px-4 py-3 font-black font-mono text-amber-600">${payrollData.reduce((s, d) => s + d.overtimePay, 0).toFixed(2)}</td>
                                        <td className="px-4 py-3 font-black font-mono text-emerald-700 text-base">${totals.gross.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}

            <p className="text-[11px] text-slate-400 text-center pt-2">
                * Overtime calculated at 1.5× rate for hours over 80/bi-weekly. All figures are estimates before taxes and deductions.
            </p>
        </div>
    );
}
