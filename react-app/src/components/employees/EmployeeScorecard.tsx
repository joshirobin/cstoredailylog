import React, { useMemo } from 'react';
import { Trophy, Clock, Target, ShieldCheck, TrendingUp, AlertCircle } from 'lucide-react';

interface Stats {
    punctuality: number; // 0-100
    taskCompletion: number; // 0-100
    reliability: number; // 0-100
    avgShiftDuration: number;
}

interface EmployeeScorecardProps {
    stats: Stats;
}

const EmployeeScorecard: React.FC<EmployeeScorecardProps> = ({ stats }) => {
    const overallScore = useMemo(() => {
        return Math.round((stats.punctuality + stats.taskCompletion + stats.reliability) / 3);
    }, [stats]);

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-emerald-500';
        if (score >= 75) return 'text-primary-500';
        if (score >= 50) return 'text-amber-500';
        return 'text-rose-500';
    };

    const getScoreBg = (score: number) => {
        if (score >= 90) return 'bg-emerald-50 border-emerald-100';
        if (score >= 75) return 'bg-primary-50 border-primary-100';
        if (score >= 50) return 'bg-amber-50 border-amber-100';
        return 'bg-rose-50 border-rose-100';
    };

    return (
        <div className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${getScoreBg(overallScore)}`}>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${overallScore >= 75 ? 'bg-white' : 'bg-white/50'}`}>
                        <Trophy className={`w-8 h-8 ${getScoreColor(overallScore)}`} />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Performance Index</h4>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-4xl font-black italic tracking-tighter ${getScoreColor(overallScore)}`}>{overallScore}%</span>
                            <span className="text-xs font-bold text-slate-400">Total Weight</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-emerald-100">
                        <TrendingUp className="w-3 h-3" />
                        +2.4% vs Last Month
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {/* Punctuality */}
                <div className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-white/80 space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Punctuality</span>
                        </div>
                        <span className="text-sm font-black text-slate-900">{stats.punctuality}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-1000"
                            style={{ width: `${stats.punctuality}%` }}
                        ></div>
                    </div>
                    <p className="text-[9px] font-medium text-slate-400 italic">Within 5m grace period of scheduled start</p>
                </div>

                {/* Task Mastery */}
                <div className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-white/80 space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Target className="w-4 h-4 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Task Mastery</span>
                        </div>
                        <span className="text-sm font-black text-slate-900">{stats.taskCompletion}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000"
                            style={{ width: `${stats.taskCompletion}%` }}
                        ></div>
                    </div>
                    <p className="text-[9px] font-medium text-slate-400 italic">{stats.taskCompletion > 80 ? 'Exceptional operational execution' : 'Standard throughput detected'}</p>
                </div>

                {/* Reliability */}
                <div className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-white/80 space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-4 h-4 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Reliability</span>
                        </div>
                        <span className="text-sm font-black text-slate-900">{stats.reliability}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-1000"
                            style={{ width: `${stats.reliability}%` }}
                        ></div>
                    </div>
                    <p className="text-[9px] font-medium text-slate-400 italic">Calculated by shift attendance stability</p>
                </div>
            </div>

            {overallScore < 60 && (
                <div className="mt-6 p-4 bg-rose-50/50 border border-rose-100 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tighter">Performance review recommended</p>
                </div>
            )}
        </div>
    );
};

export default EmployeeScorecard;
