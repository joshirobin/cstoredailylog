import { useState, useEffect, useMemo } from 'react';
import { useTobaccoStore, type TobaccoProduct } from '../../stores/useTobaccoStore';
import {
    FileSpreadsheet, ShieldCheck, Zap, History,
    BarChart3, Search, AlertCircle, CheckCircle2,
    Clock, Tag, ArrowUpRight, Loader2
} from 'lucide-react';

const TobaccoScanView = () => {
    const tobaccoStore = useTobaccoStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const filteredProducts = useMemo(() => {
        if (!searchQuery) return tobaccoStore.products;
        const q = searchQuery.toLowerCase();
        return tobaccoStore.products.filter((p: TobaccoProduct) =>
            p.name.toLowerCase().includes(q) ||
            p.upc.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q)
        );
    }, [searchQuery, tobaccoStore.products]);

    const handleGenerateFile = async (brand: string) => {
        setIsGenerating(true);
        try {
            await tobaccoStore.generateScanDataFile(brand);
        } catch (e) {
            alert("Failed to generate scan data file");
        } finally {
            setIsGenerating(false);
        }
    };

    const formatDate = (date: any) => {
        if (!date) return '';
        const d = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date));
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(d);
    };

    useEffect(() => {
        tobaccoStore.fetchScanLogs();
    }, []);

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-32 animate-in fade-in duration-700">
            {/* Sophisticated Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-black uppercase tracking-widest">Revenue Optimizer</div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Scan Data v4.2</span>
                    </div>
                    <h1 className="text-5xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none">
                        Tobacco <span className="text-blue-600">Scan</span> Manager
                    </h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        Certified for Altria & RJ Reynolds Digital Rebate Programs
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => handleGenerateFile('Altria')}
                        disabled={isGenerating}
                        className="flex items-center gap-3 px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                        Altria Export
                    </button>
                    <button
                        onClick={() => handleGenerateFile('RJ Reynolds')}
                        disabled={isGenerating}
                        className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Zap className="w-4 h-4 text-yellow-400" />
                        )}
                        Transmit All Data
                    </button>
                </div>
            </div>

            {/* Analytics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Weekly Rebate</p>
                        <h3 className="text-3xl font-[1000] text-slate-900 italic tracking-tighter tabular-nums">${tobaccoStore.stats.estimatedRebate.toFixed(2)}</h3>
                        <div className="flex items-center gap-1.5 mt-2 text-emerald-500">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">+12.4% vs LY</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Packs Scanned</p>
                        <h3 className="text-3xl font-[1000] text-slate-900 italic tracking-tighter tabular-nums">{tobaccoStore.stats.totalPacksThisWeek}</h3>
                        <div className="flex items-center gap-1.5 mt-2 text-indigo-500">
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Active Velocity</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Compliance Rate</p>
                        <h3 className="text-3xl font-[1000] text-slate-900 italic tracking-tighter tabular-nums">{tobaccoStore.stats.complianceRate}%</h3>
                        <div className="flex items-center gap-1.5 mt-2 text-emerald-500">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Audit Ready</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Sync</p>
                        <h3 className="text-3xl font-[1000] text-slate-900 italic tracking-tighter tabular-nums">{tobaccoStore.stats.pendingTransmissions}</h3>
                        <div className="flex items-center gap-1.5 mt-2 text-rose-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Requires Action</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Products & Search */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3">
                            <Tag className="w-4 h-4 text-blue-500" /> Eligible Product Catalog
                        </h3>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search UPC or Brand..."
                                className="bg-white border border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase tracking-widest focus:ring-2 ring-blue-500/20 transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden text-center">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Intelligence</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Manufacturer</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Price</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Rebate State</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredProducts.map((product) => (
                                        <tr key={product.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6 text-left">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex flex-col items-center justify-center font-mono text-[8px] font-bold text-slate-400">
                                                        <div className="w-6 h-0.5 bg-slate-300 mb-0.5"></div>
                                                        <div className="w-6 h-0.5 bg-slate-300 mb-0.5"></div>
                                                        <div className="w-6 h-0.5 bg-slate-300"></div>
                                                        UPC
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 uppercase tracking-tight text-sm">{product.name}</p>
                                                        <p className="text-[10px] font-mono font-bold text-slate-400 tracking-widest">{product.upc}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-left">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${product.brand === 'Altria' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                    product.brand === 'RJ Reynolds' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                                                    }`}>
                                                    {product.brand}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-left">
                                                <span className="font-mono font-black text-slate-900 tabular-nums">${product.price.toFixed(2)}</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                {product.eligibleForRebate && (
                                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Active Eligibility</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredProducts.length === 0 && (
                            <div className="py-20 text-center">
                                <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-lg font-black text-slate-300 uppercase italic tracking-tighter">No vectors found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Side Panels */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Active Promotions */}
                    <div className="bg-gradient-to-br from-blue-900 to-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                            <Tag className="w-4 h-4 text-blue-400" /> Active Promotions
                        </h3>

                        <div className="space-y-4 relative z-10">
                            {tobaccoStore.promotions.map((promo) => (
                                <div key={promo.id} className="bg-white/10 backdrop-blur-md rounded-[2rem] p-6 border border-white/10 hover:bg-white/15 transition-all group text-left">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">{promo.brand}</p>
                                            <p className="font-black uppercase italic tracking-tighter text-lg leading-tight">{promo.name}</p>
                                        </div>
                                        <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-xl text-[10px] font-black border border-emerald-500/30">
                                            ACTIVE
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{promo.requirement}</span>
                                        <span className="text-xl font-black text-emerald-400 font-mono">-${promo.discountAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Transmission History */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3 px-2">
                            <History className="w-4 h-4 text-blue-500" /> Transmission Log
                        </h3>

                        <div className="space-y-3">
                            {tobaccoStore.scanLogs.map((log) => (
                                <div key={log.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${log.status === 'Transmitted' ? 'bg-emerald-50 text-emerald-500' :
                                            log.status === 'Pending' ? 'bg-amber-50 text-amber-500' : 'bg-rose-50 text-rose-500'
                                            }`}>
                                            {log.status === 'Transmitted' ? <CheckCircle2 className="w-6 h-6" /> :
                                                log.status === 'Pending' ? <Clock className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest text-left">{log.status}</p>
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">• ID: {log.id}</span>
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 text-left">{formatDate(log.timestamp)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900 font-mono tracking-tighter tabular-nums">${log.totalRebate.toFixed(2)}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{log.totalPacks} Packs</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-slate-100 hover:text-slate-600 transition-all">
                            View Full Transmission Audit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TobaccoScanView;
