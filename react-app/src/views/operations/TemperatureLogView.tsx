import { useState, useEffect } from 'react';
import { useComplianceStore } from '../../stores/useComplianceStore';
import { useAuthStore } from '../../stores/useAuthStore';
import {
    Plus, Snowflake, X, Activity, History as HistoryIcon,
    Download, Wind, Zap, Flame, Shield, Droplet, Trash2, Loader2
} from 'lucide-react';

const equipmentList = [
    { name: 'Beer Cave', type: 'COOLER', icon: Snowflake },
    { name: 'Milk Cooler', type: 'COOLER', icon: Snowflake },
    { name: 'Main Freezer', type: 'FREEZER', icon: Wind },
    { name: 'Hot Case 1 (Deli)', type: 'HOT_CASE', icon: Flame },
    { name: 'Roller Grill', type: 'HOT_CASE', icon: Flame },
    { name: 'Coffee Station', type: 'HOT_CASE', icon: Zap },
    { name: 'UST Leak Detection', type: 'FUEL_SAFETY', icon: Shield },
    { name: 'Tank Water Check', type: 'FUEL_SAFETY', icon: Droplet }
] as const;

const TemperatureLogView = () => {
    const complianceStore = useComplianceStore();
    const { user, userRole } = useAuthStore();

    const [isLogging, setIsLogging] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newReading, setNewReading] = useState({
        equipmentName: '',
        type: 'COOLER' as 'COOLER' | 'FREEZER' | 'HOT_CASE' | 'FUEL_SAFETY',
        temperature: 0,
        unit: 'F' as const,
        loggedBy: user?.email?.split('@')[0] || 'Unknown'
    });

    const handleSubmit = async () => {
        if (!newReading.equipmentName) {
            alert("Please select equipment");
            return;
        }

        setIsSubmitting(true);
        try {
            await complianceStore.addReading(newReading);
            setIsLogging(false);
            setNewReading({
                equipmentName: '',
                type: 'COOLER',
                temperature: 0,
                unit: 'F',
                loggedBy: user?.email?.split('@')[0] || 'Unknown'
            });
        } catch (e) {
            alert("Failed to log entry");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusColor = (status: string) =>
        status === 'NORMAL'
            ? 'text-emerald-500 bg-emerald-50 border-emerald-100'
            : 'text-rose-500 bg-rose-50 border-rose-100';

    const formatDate = (date: any) => {
        if (!date) return '';
        const d = date.toDate ? date.toDate() : new Date(date);
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
            day: 'numeric'
        }).format(d);
    };

    const handleDelete = async (id: string | undefined) => {
        if (!id) {
            alert("Error: Log ID not found");
            return;
        }

        if (!confirm("Permanently delete this safety log entry?")) return;

        try {
            await complianceStore.deleteReading(id);
        } catch (e) {
            console.error('Delete failed:', e);
            alert("Failed to delete log entry.");
        }
    };

    useEffect(() => {
        complianceStore.fetchReadings();
    }, []);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none mb-3">
                        Compliance & <span className="text-rose-600">Safety</span>
                    </h1>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Operational Risk Control • Real-time Compliance</p>
                </div>

                <button
                    onClick={() => setIsLogging(true)}
                    className="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
                >
                    <Plus className="w-4 h-4" />
                    Instant Log
                </button>
            </div>

            {/* Monitoring Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {equipmentList.map((eq) => (
                    <div key={eq.name} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-slate-300 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                <eq.icon className="w-5 h-5" />
                            </div>
                            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                        </div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{eq.type}</h3>
                        <p className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-none">{eq.name}</p>

                        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-end">
                            <div>
                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Target Range</p>
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                                    {eq.type === 'HOT_CASE' ? '140°F +' : eq.type === 'FUEL_SAFETY' ? 'Target: 0' : '≤ 41°F'}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setNewReading({
                                        ...newReading,
                                        equipmentName: eq.name,
                                        type: eq.type
                                    });
                                    setIsLogging(true);
                                }}
                                className="text-[10px] font-black text-blue-600 uppercase tracking-widest"
                            >
                                Check Now
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Log Section */}
            {isLogging && (
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-900 p-8 animate-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">
                            {newReading.type === 'FUEL_SAFETY' ? 'Safety Verification' : 'Temperature Verification'}
                        </h3>
                        <button onClick={() => setIsLogging(false)} className="text-slate-400 hover:text-slate-900">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Equipment</label>
                            <select
                                value={newReading.equipmentName}
                                onChange={(e) => {
                                    const eq = equipmentList.find(item => item.name === e.target.value);
                                    setNewReading({
                                        ...newReading,
                                        equipmentName: e.target.value,
                                        type: (eq?.type || 'COOLER') as any
                                    });
                                }}
                                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="" disabled>Select Equipment...</option>
                                {equipmentList.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2 text-left">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
                                {newReading.type === 'FUEL_SAFETY' ? 'Audit Value' : 'Measured Temp'}
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={newReading.temperature}
                                    onChange={(e) => setNewReading({ ...newReading, temperature: parseFloat(e.target.value) || 0 })}
                                    className="flex-1 bg-slate-50 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20"
                                />
                                <span className="text-xl font-black text-slate-900">
                                    {newReading.type === 'FUEL_SAFETY' ? 'IDX' : '°F'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-end pb-1 text-xs font-black text-slate-300 uppercase italic">
                            Verified by digital telemetry
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-5 bg-rose-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 disabled:bg-slate-400 flex items-center justify-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSubmitting ? 'Authorizing Entry...' : 'Authorize Entry'}
                    </button>
                </div>
            )}

            {/* Audit History */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <HistoryIcon className="w-4 h-4 text-slate-400" />
                        Audit Trail (Last 50 Entries)
                    </h2>
                    <button className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        <Download className="w-3.5 h-3.5" /> Export for Inspector
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipment</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Result</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inspector</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                                {userRole === 'Admin' && <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {complianceStore.readings.map((r) => (
                                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-4">
                                        <p className="text-xs font-black text-slate-900 uppercase italic tracking-tighter">{r.equipmentName}</p>
                                    </td>
                                    <td className="px-8 py-4">
                                        <span className={`text-sm font-black ${r.status === 'ALERT' ? 'text-rose-600' : 'text-slate-900'}`}>
                                            {r.temperature}{r.type === 'FUEL_SAFETY' ? '' : '°F'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className={`px-3 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest w-fit ${getStatusColor(r.status)}`}>
                                            {r.status}
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{r.loggedBy}</p>
                                    </td>
                                    <td className="px-8 py-4">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{formatDate(r.timestamp)}</p>
                                    </td>
                                    {userRole === 'Admin' && (
                                        <td className="px-8 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(r.id)}
                                                className="p-2 text-slate-400 hover:text-rose-600 transition-colors hover:bg-rose-50 rounded-lg group"
                                            >
                                                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {complianceStore.readings.length === 0 && !complianceStore.loading && (
                        <div className="py-20 text-center">
                            <Activity className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No active audit records</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TemperatureLogView;
