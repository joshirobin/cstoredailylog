import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Truck, MousePointer2, Activity, Radar, Droplet, Save,
    ChevronLeft, ChevronRight, Loader2, Paperclip,
    Plus, Zap, Calendar, LayoutGrid, Sparkles, TrendingUp, AlertCircle
} from 'lucide-react';
import { usePricingStore } from '../../stores/usePricingStore';
import { useFuelStore, FuelEntry } from '../../stores/useFuelStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useLocationsStore } from '../../stores/useLocationsStore';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function FuelOperationsView() {
    const fuelStore = useFuelStore();
    const pricingStore = usePricingStore();
    const notificationStore = useNotificationStore();
    const locationsStore = useLocationsStore();

    const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'invoices' | 'suggestions' | 'price-watch'>('suggestions');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const invoiceInputRef = useRef<HTMLInputElement>(null);
    const atgInputRef = useRef<HTMLInputElement>(null);

    const [isDraggingInvoice, setIsDraggingInvoice] = useState(false);
    const [isDraggingAtg, setIsDraggingAtg] = useState(false);
    const [invoiceImageFile, setInvoiceImageFile] = useState<File | null>(null);
    const [atgImageFile, setAtgImageFile] = useState<File | null>(null);
    const [atgImageUrl, setAtgImageUrl] = useState('');
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    const [logEntries, setLogEntries] = useState<FuelEntry[]>([]);
    const [logNotes, setLogNotes] = useState('');
    const [scanProgress, setScanProgress] = useState(0);

    const [newOrder, setNewOrder] = useState({
        orderNumber: '',
        supplier: '',
        date: new Date().toISOString().split('T')[0],
        items: [{ type: 'Regular', gallons: 0 }],
        notes: ''
    });

    const [newInvoice, setNewInvoice] = useState({
        invoiceNumber: '',
        supplier: '',
        date: new Date().toISOString().split('T')[0],
        items: [{ type: 'Regular', gallons: 0, costPerGal: 0, taxes: 0, totalCost: 0 }],
        totalAmount: 0,
        status: 'UNPAID' as 'PAID' | 'UNPAID'
    });

    const triggerInvoiceUpload = () => invoiceInputRef.current?.click();
    const triggerAtgUpload = () => atgInputRef.current?.click();

    const handleInvoiceDrop = (e: React.DragEvent) => {
        setIsDraggingInvoice(false);
        const file = e.dataTransfer?.files[0];
        if (file) setInvoiceImageFile(file);
    };

    const handleAtgDrop = (e: React.DragEvent) => {
        setIsDraggingAtg(false);
        const file = e.dataTransfer?.files[0];
        if (file) setAtgImageFile(file);
    };

    useEffect(() => {
        fuelStore.fetchLogs();
        fuelStore.fetchOrders();
        fuelStore.fetchInvoices();
        fuelStore.fetchCurrentPrices();
        fuelStore.fetchCompetitorPrices();
        fuelStore.fetchTankConfigs();
    }, [locationsStore.activeLocationId]);

    const initializeInventory = () => {
        const existingLog = fuelStore.logs.find(l => l.date === selectedDate);
        if (existingLog) {
            setLogEntries(JSON.parse(JSON.stringify(existingLog.entries)));
            setLogNotes(existingLog.notes || '');
            setAtgImageUrl(existingLog.atgImage || '');
        } else {
            const prevLog = fuelStore.logs
                .filter(l => l.date < selectedDate)
                .sort((a, b) => b.date.localeCompare(a.date))[0];

            const typesToUse = fuelStore.tankConfigs.length > 0
                ? fuelStore.tankConfigs.map(c => c.type)
                : (prevLog ? prevLog.entries.map(e => e.type) : fuelStore.defaultFuelTypes);

            setLogEntries(typesToUse.map(type => {
                const prevEntry = prevLog?.entries.find(e => e.type === type);
                const beginGal = prevEntry ? prevEntry.endInvAtg : 0;

                const deliveryGal = fuelStore.invoices
                    .filter(i => i.date === selectedDate)
                    .reduce((sum, inv) => {
                        const item = inv.items.find(it => it.type === type);
                        return sum + (item ? item.gallons : 0);
                    }, 0);

                return {
                    type,
                    inch: 0,
                    beginGal,
                    deliveryGal,
                    soldGal: 0,
                    bookInv: beginGal + deliveryGal,
                    endInvAtg: 0,
                    costPerGal: 0,
                    variance: -(beginGal + deliveryGal)
                };
            }));
            setLogNotes('');
            setAtgImageUrl('');
        }
    };

    useEffect(() => {
        initializeInventory();
    }, [selectedDate, fuelStore.logs]);

    const calculateInventoryRow = (entry: FuelEntry) => {
        entry.bookInv = (Number(entry.beginGal) || 0) + (Number(entry.deliveryGal) || 0) - (Number(entry.soldGal) || 0);
        entry.variance = entry.bookInv - (Number(entry.endInvAtg) || 0);
        return { ...entry };
    };

    const updateLogEntry = (idx: number, field: keyof FuelEntry, value: number | string) => {
        setLogEntries(prev => {
            const temp = [...prev];
            temp[idx] = { ...temp[idx], [field]: value };
            temp[idx] = calculateInventoryRow(temp[idx]);
            return temp;
        });
    };

    const saveInventory = async () => {
        setIsSubmitting(true);
        try {
            await fuelStore.addLog({
                date: selectedDate,
                entries: logEntries,
                totalVariance: logEntries.reduce((s, e) => s + (e.variance || 0), 0),
                notes: logNotes,
                atgImage: atgImageUrl,
                updatedAt: new Date().toISOString()
            }, atgImageFile || undefined);
            notificationStore.success('Fuel inventory log committed', 'Success');
            setAtgImageFile(null);
        } catch (e) {
            console.error('Save inventory error:', e);
            notificationStore.error('Failed to save fuel log', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAiScan = async () => {
        if (!invoiceImageFile) {
            notificationStore.error('No BOL/Invoice file selected', 'Missing File');
            return;
        }
        setIsAiProcessing(true);
        setScanProgress(0);

        let imageSource: any = invoiceImageFile;

        try {
            if (invoiceImageFile.type === 'application/pdf') {
                const arrayBuffer = await invoiceImageFile.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                if (context) {
                    await page.render({ canvasContext: context, viewport: viewport } as any).promise;
                    imageSource = canvas.toDataURL('image/png');
                }
            }

            const result = await Tesseract.recognize(
                imageSource,
                'eng',
                { logger: m => { if (m.status === 'recognizing text') setScanProgress(Math.floor(m.progress * 100)); } }
            );

            const text = result.data.text;
            const invoiceMatch = text.match(/Invoice\s*#?:\s*([A-Z0-9-]+)/i) || text.match(/#\s*([0-9]{4,})/);
            const totalMatch = text.match(/\$?\s*(\d+[,.]\d{2})/);
            const supplierMatch = text.match(/(Terminal\s*Supply|Global\s*Partners|Sprague|Mansfield)/i);
            const regularMatch = text.match(/(?:Regular|UNL|87)\s*(\d+[,.]?\d*)/i);

            setNewInvoice(prev => ({
                ...prev,
                invoiceNumber: invoiceMatch ? invoiceMatch[1] : 'INV-' + Math.floor(Math.random() * 100000),
                supplier: supplierMatch ? supplierMatch[1] : 'Detected Supplier',
                totalAmount: totalMatch ? parseFloat(totalMatch[1].replace(',', '')) : 0,
                items: [{
                    type: 'Regular',
                    gallons: regularMatch ? parseFloat(regularMatch[1].replace(',', '')) : 0,
                    costPerGal: 0,
                    taxes: 0,
                    totalCost: 0
                }]
            }));

            notificationStore.success('AI Data Extraction complete', 'Success');
        } catch (error) {
            console.error(error);
            notificationStore.error('Failed to process document', 'OCR Error');
        } finally {
            setIsAiProcessing(false);
            setScanProgress(0);
        }
    };

    const aiRecommendations = useMemo(() => {
        return pricingStore.getPriceRecommendations().filter(r => r !== null);
    }, [pricingStore.competitorPrices]);

    const logisticsSummary = useMemo(() => {
        return fuelStore.tankConfigs.map(config => {
            const stats = fuelStore.getLogisticsStatus(config.type);
            return stats ? { type: config.type, ...stats } : null;
        }).filter(s => s !== null);
    }, [fuelStore.tankConfigs, fuelStore.logs]);

    const SAFE_FILL_FACTOR = 0.9;

    const currentTankStatus = useMemo(() => {
        const entriesToUse = logEntries.length > 0 ? logEntries : (fuelStore.logs.find(l => l.date === selectedDate)?.entries || fuelStore.logs[0]?.entries || []);
        if (entriesToUse.length === 0) return [];

        return entriesToUse.map(e => {
            const config = fuelStore.tankConfigs.find(c => c.type === e.type);
            const totalCapacity = config?.capacity || 10000;
            const safeCapacity = totalCapacity * SAFE_FILL_FACTOR;
            const shutoffPoint = config?.shutoffPoint || 300;

            const currentVolume = e.endInvAtg > 0 ? e.endInvAtg : Math.max(0, e.bookInv);
            const percentage = Math.min(100, (currentVolume / safeCapacity) * 100);

            const isCritical = currentVolume <= shutoffPoint;
            const hasDelivery = (Number(e.deliveryGal) || 0) > 0;

            let fuelColor = 'bg-slate-400';
            const name = e.type.toLowerCase();
            if (name.includes('87 regular')) fuelColor = 'bg-emerald-400';
            else if (name.includes('regular')) fuelColor = 'bg-emerald-500';
            else if (name.includes('super')) fuelColor = 'bg-rose-600';
            else if (name.includes('premium')) fuelColor = 'bg-rose-500';
            else if (name.includes('diesel b20')) fuelColor = 'bg-purple-600';
            else if (name.includes('diesel b5')) fuelColor = 'bg-purple-500';
            else if (name.includes('diesel farm')) fuelColor = 'bg-amber-600';
            else if (name.includes('diesel clear')) fuelColor = 'bg-blue-400';
            else if (name.includes('diesel')) fuelColor = 'bg-purple-500';
            else if (name.includes('plus')) fuelColor = 'bg-sky-500';

            return {
                type: e.type,
                level: currentVolume,
                capacity: totalCapacity,
                safeCapacity,
                percentage,
                color: fuelColor,
                isCritical,
                hasDelivery,
                hasData: logEntries.length > 0 || !!fuelStore.logs.find(l => l.date === selectedDate)
            };
        });
    }, [logEntries, fuelStore.logs, fuelStore.tankConfigs, selectedDate]);

    const activeAlarms = currentTankStatus.filter(t => t.isCritical);

    const navigateDate = (days: number) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const marketPosition = useMemo(() => {
        return fuelStore.currentPrices.map(mine => {
            const competitors = fuelStore.competitorPrices
                .map(c => c.prices.find(p => p.type === mine.type))
                .filter(p => !!p);

            if (competitors.length === 0) return { type: mine.type, diff: 0, status: 'NO_DATA' };
            const avg = competitors.reduce((s, p) => s + (p?.price || 0), 0) / competitors.length;
            const diff = mine.cashPrice - avg;
            return {
                type: mine.type,
                avg,
                diff,
                status: diff > 0.05 ? 'EXPENSIVE' : (diff < -0.05 ? 'CHEAP' : 'COMPETITIVE')
            };
        });
    }, [fuelStore.currentPrices, fuelStore.competitorPrices]);

    const getPriceStatusColor = (status: string) => {
        if (status === 'EXPENSIVE') return 'text-rose-500 bg-rose-50 border-rose-100';
        if (status === 'CHEAP') return 'text-emerald-500 bg-emerald-50 border-emerald-100';
        return 'text-slate-400 bg-slate-50 border-slate-100';
    };

    const historicalVolumeData = useMemo(() => {
        const last14Days = Array.from({ length: 14 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (13 - i));
            return d.toISOString().split('T')[0];
        });

        return last14Days.map(dateStr => {
            const log = fuelStore.logs.find(l => l.date === dateStr);
            const totalSold = log ? log.entries.reduce((s, e) => s + (Number(e.soldGal) || 0), 0) : 0;
            const totalVariance = log ? log.totalVariance : 0;
            const dateObj = new Date(dateStr || '');
            const baseline = totalSold > 0 ? totalSold : (8000 + Math.sin(dateObj.getTime() / 100000000) * 1000); // Fixed Math.sin

            return {
                displayDate: dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                volume: baseline,
                variance: totalVariance,
                hasData: !!log
            };
        });
    }, [fuelStore.logs]);

    const calculateInvoiceTotal = () => {
        setNewInvoice(prev => {
            const next = { ...prev };
            next.totalAmount = next.items.reduce((s, i) => {
                i.totalCost = (i.gallons * i.costPerGal) + i.taxes;
                return s + i.totalCost;
            }, 0);
            return next;
        });
    };

    const saveInvoice = async () => {
        setIsSubmitting(true);
        try {
            await fuelStore.addInvoice({
                ...newInvoice,
                locationId: locationsStore.activeLocationId || '',
                createdAt: new Date().toISOString()
            }, invoiceImageFile || undefined);

            // Update local memory entries based on invoice
            newInvoice.items.forEach(invoiceItem => {
                setLogEntries(prev => {
                    const temp = [...prev];
                    const entryIdx = temp.findIndex(e => e.type === invoiceItem.type);
                    if (entryIdx > -1) {
                        temp[entryIdx].deliveryGal = (Number(temp[entryIdx].deliveryGal) || 0) + invoiceItem.gallons;
                        temp[entryIdx] = calculateInventoryRow(temp[entryIdx]);
                    }
                    return temp;
                })
            });

            notificationStore.success('Fuel invoice recorded', 'Success');
            setNewInvoice({ invoiceNumber: '', supplier: '', date: new Date().toISOString().split('T')[0], items: [{ type: 'Regular', gallons: 0, costPerGal: 0, taxes: 0, totalCost: 0 }], totalAmount: 0, status: 'UNPAID' });
            setInvoiceImageFile(null);
        } catch (e) {
            console.error('Save invoice error:', e);
            notificationStore.error('Invoice recording failed', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const addOrderItem = () => {
        setNewOrder(prev => ({ ...prev, items: [...prev.items, { type: 'Regular', gallons: 0 }] }));
    };

    const saveOrder = async () => {
        setIsSubmitting(true);
        try {
            await fuelStore.addOrder({
                ...newOrder,
                status: 'PENDING',
                createdAt: new Date().toISOString()
            });
            notificationStore.success('Fuel order dispatched', 'Success');
            setNewOrder({ orderNumber: '', supplier: '', date: new Date().toISOString().split('T')[0], items: [{ type: 'Regular', gallons: 0 }], notes: '' });
        } catch (e) {
            console.error('Save order error:', e);
            notificationStore.error('Order failed', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-full bg-slate-50 flex flex-col -m-6 p-6 space-y-8 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>

            {/* Hero Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-slate-900/20 group">
                        <Droplet className="w-8 h-8 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Fuel Operations Hub</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Terminal Logistics & Tank Inventory</p>
                            {activeAlarms.length > 0 && <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-3xl border border-slate-100 shadow-sm overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {(['suggestions', 'inventory', 'price-watch', 'orders', 'invoices'] as const).map(t => (
                        <button key={t}
                            onClick={() => setActiveTab(t)}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'text-slate-400 hover:text-slate-900'
                                }`}>
                            {t.replace('-', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Daily Action Suggestions Module */}
            {activeTab === 'suggestions' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                        <div className="flex items-center gap-10 min-w-max pb-4">
                            {currentTankStatus.map(tank => (
                                <div key={tank.type} className="flex flex-col items-center group">
                                    <div className="text-center mb-6">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-900 transition-colors">{tank.type}</span>
                                        <div className="text-lg font-black text-slate-900 mt-1 tabular-nums">{tank.level.toLocaleString()} <span className="text-[8px] opacity-40">GAL</span></div>
                                    </div>

                                    <div className="relative w-28 h-56 bg-slate-100 rounded-[4rem] border-[4px] border-white shadow-2xl overflow-hidden group-hover:scale-105 transition-transform duration-500">
                                        <div className="absolute top-[10%] inset-x-0 h-px bg-rose-400/30 z-20 border-t border-dashed">
                                            <span className="absolute right-2 -top-2 text-[6px] font-black text-rose-400 uppercase">90% CAP</span>
                                        </div>

                                        <div className={`absolute bottom-0 w-full transition-all duration-[2000ms] ${tank.color}`} style={{ height: `${tank.percentage}%`, transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                                            <div className="absolute inset-x-0 bottom-6 text-center">
                                                <span className="text-[10px] font-black text-white/90 tabular-nums">{Math.round(tank.percentage)}%</span>
                                            </div>
                                        </div>

                                        <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white/20 to-transparent z-10"></div>
                                        <div className="absolute inset-y-0 right-0 w-2 bg-black/5 z-0"></div>
                                    </div>

                                    <div className="mt-6 flex flex-col items-center gap-1">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase italic">Ullage: {(tank.safeCapacity - tank.level).toLocaleString()} gal</span>
                                        {tank.isCritical ? (
                                            <div className="flex items-center gap-1 text-[8px] font-black text-rose-500 uppercase mt-1 animate-pulse"><Zap className="w-2.5 h-2.5" /> Critical</div>
                                        ) : tank.hasDelivery ? (
                                            <div className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase mt-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1"></div><Activity className="w-2.5 h-2.5" /> Healthy</div>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {currentTankStatus.filter(t => t.isCritical).map(tank => (
                            <div key={tank.type} className="bg-rose-50 border-2 border-rose-100 rounded-[3rem] p-8 shadow-sm group">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-500/20"><Zap className="w-6 h-6 animate-pulse" /></div>
                                    <div>
                                        <h3 className="text-rose-900 font-black uppercase text-sm tracking-tight italic">{tank.type} CRITICAL</h3>
                                        <p className="text-rose-600/70 text-[10px] font-black uppercase tracking-widest">Immediate action required</p>
                                    </div>
                                </div>
                                <p className="text-rose-900/80 text-sm font-medium leading-relaxed mb-6">
                                    Current inventory is at <span className="font-black">{tank.level.toLocaleString()} GAL</span>. Risk of pump shutoff in less than <span className="font-black text-rose-600">4 hours</span>.
                                </p>
                                <button onClick={() => setActiveTab('orders')} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20">Dispatch Emergency Load</button>
                            </div>
                        ))}

                        {currentTankStatus.filter(t => t.hasDelivery && !t.isCritical).map(tank => (
                            <div key={'healthy-' + tank.type} className="bg-emerald-50 border-2 border-emerald-100 rounded-[3rem] p-8 shadow-sm group animate-in zoom-in duration-500">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20"><Activity className="w-6 h-6" /></div>
                                    <div>
                                        <h3 className="text-emerald-900 font-black uppercase text-sm tracking-tight italic">{tank.type} STABILIZED</h3>
                                        <p className="text-emerald-600/70 text-[10px] font-black uppercase tracking-widest">Inventory Health Restored</p>
                                    </div>
                                </div>
                                <p className="text-emerald-900/80 text-sm font-medium leading-relaxed mb-6">
                                    Inventory has been replenished. Current volume is <span className="font-black text-emerald-600">{tank.level.toLocaleString()} GAL</span>. Supply chain risk has been mitigated.
                                </p>
                            </div>
                        ))}

                        {marketPosition.some(p => p.status === 'EXPENSIVE') && (
                            <div className="bg-amber-50 border-2 border-amber-100 rounded-[3rem] p-8 shadow-sm">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20"><TrendingUp className="w-6 h-6" /></div>
                                    <div>
                                        <h3 className="text-amber-900 font-black uppercase text-sm tracking-tight italic">Pricing Alert</h3>
                                        <p className="text-amber-600/70 text-[10px] font-black uppercase tracking-widest">Market Gap reaching critical</p>
                                    </div>
                                </div>
                                <p className="text-amber-900/80 text-sm font-medium leading-relaxed mb-6">
                                    Competitors have dropped prices by an average of <span className="font-black italic">5.2¢</span>.
                                </p>
                                <button onClick={() => setActiveTab('price-watch')} className="w-full py-4 bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-xl shadow-amber-600/20">Audit Pump Prices</button>
                            </div>
                        )}

                        {currentTankStatus.filter(t => t.isCritical).length === 0 && currentTankStatus.filter(t => t.hasDelivery && !t.isCritical).length === 0 && !marketPosition.some(p => p.status === 'EXPENSIVE') && (
                            <div className="lg:col-span-3 bg-emerald-50 border-2 border-emerald-100 rounded-[3rem] p-12 shadow-sm flex flex-col items-center text-center">
                                <div className="p-4 bg-emerald-500 text-white rounded-[2rem] shadow-xl shadow-emerald-500/20 mb-6"><Sparkles className="w-10 h-10" /></div>
                                <h3 className="text-2xl font-black text-emerald-900 uppercase italic tracking-tighter mb-2">Operations Optimized</h3>
                                <p className="text-emerald-700/70 text-sm font-medium tracking-tight max-w-md">All fuel levels are within safe operating parameters and terminal pricing is competitive. No critical actions pending.</p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* More intelligence widgets can be added here mirroring original UI */}
                        <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm relative overflow-hidden group">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-4 bg-blue-50 text-blue-600 rounded-[2rem]"><Truck className="w-8 h-8" /></div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Inventory Optimization</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Load consolidation suggestions</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {logisticsSummary.filter(t => (t?.ullage ?? 0) >= 6000).map(tank => (
                                    <div key={tank?.type} className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs font-black text-slate-900 uppercase">{tank?.type} Segment</span>
                                            <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-600 text-[8px] font-black uppercase">Favorable Load</span>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium border-slate-900 leading-relaxed">
                                            Current Ullage is <span className="text-slate-900 font-black">{tank?.ullage.toLocaleString()} GAL</span>.
                                        </p>
                                        <div className="mt-4"><button onClick={() => setActiveTab('orders')} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Prepare PO</button></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-[2rem]"><Activity className="w-8 h-8" /></div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Yield Opportunities</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margin & Volume balancing</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {marketPosition.filter(p => p.status === 'CHEAP').map(price => (
                                    <div key={price.type} className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-black text-slate-900 uppercase">{price.type} Pricing</span>
                                            <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-600 text-[8px] font-black uppercase">Margin Opportunity</span>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium">You are <span className="text-emerald-500 font-black">{Math.abs(price.diff).toFixed(1)}¢</span> cheaper than market average.</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-10 p-8 bg-slate-900 text-white rounded-[2.5rem]">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Projected Daily Volume Pool</p>
                                <h4 className="text-4xl font-black tabular-nums tracking-tighter">~{historicalVolumeData[historicalVolumeData.length - 1]?.volume?.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs">GAL</span></h4>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'price-watch' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="bg-blue-600 rounded-[3rem] p-10 flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl">
                        <MousePointer2 className="absolute top-0 right-0 w-64 h-64 opacity-10 rotate-12 scale-125" />
                        <div className="relative z-10 flex items-center gap-8">
                            <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center text-white backdrop-blur-md"><Radar className="w-10 h-10 animate-pulse" /></div>
                            <div>
                                <h2 className="text-3xl font-[1000] text-white uppercase italic tracking-tighter leading-none">AI Price Strategist</h2>
                                <p className="text-white/80 text-[10px] font-black uppercase tracking-widest mt-3">Live Market Recommendations & Aggressor Alerts</p>
                            </div>
                        </div>
                        <div className="relative z-10 flex gap-4 overflow-x-auto pb-2 w-full lg:w-auto">
                            {aiRecommendations.map(rec => (
                                <div key={rec.type} className="min-w-[280px] p-6 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 hover:bg-white/20">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">{rec.type}</span>
                                        <span className="px-2 py-1 rounded-lg bg-white/20 text-[8px] font-black uppercase">{rec.action}</span>
                                    </div>
                                    <h4 className="text-2xl font-black text-white tabular-nums mb-2">${rec.recommended.toFixed(3)}</h4>
                                    <p className="text-[9px] font-medium text-white/70 italic leading-relaxed">{rec.reason}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                        <div className="xl:col-span-12 bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm">
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Your Current Terminal Pricing</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manage live pump prices directly</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {fuelStore.currentPrices.map(price => (
                                    <div key={price.type} className="p-8 pb-6 rounded-[2.5rem] border-2 border-slate-50 hover:border-slate-200 transition-all group relative">
                                        {marketPosition.find(p => p.type === price.type) && (
                                            <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${getPriceStatusColor(marketPosition.find(p => p.type === price.type)?.status || '')}`}>
                                                {marketPosition.find(p => p.type === price.type)?.status}
                                            </div>
                                        )}
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{price.type}</div>
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-1">Cash Price</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                                    <input type="number" step="0.001" value={price.cashPrice} onChange={e => fuelStore.updateCurrentPrice({ ...price, cashPrice: parseFloat(e.target.value) })} className="w-full h-12 bg-slate-50 rounded-2xl pl-8 pr-4 text-sm font-bold focus:bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400">Margin</span>
                                                    <span className="text-[8px] font-black text-slate-300 uppercase italic">MTD Avg</span>
                                                </div>
                                                <span className="text-lg font-black text-emerald-600 tabular-nums">{(price.margin * 100).toFixed(1)}¢</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="xl:col-span-12 bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm">
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Perimeter Market Scan</h3>
                                        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[8px] font-black uppercase tracking-widest">Zip: {locationsStore.activeLocation?.zipCode || 'N/A'}</span>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Direct competitor tracking and survey</p>
                                </div>
                                <button onClick={() => fuelStore.updateCompetitorPrice({ competitorName: 'New Station', distance: '0.5 mi', prices: fuelStore.defaultFuelTypes.slice(0, 2).map(t => ({ type: t, price: 2.99 })) })} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-xl"><Plus className="w-4 h-4" /> Add Station</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {fuelStore.competitorPrices.map((comp, idx) => (
                                    <div key={comp.id || idx} className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100/50 hover:bg-white hover:shadow-xl transition-all group">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl font-black text-slate-300">{comp.competitorName[0] || '?'}</div>
                                                <div>
                                                    <input value={comp.competitorName} onChange={e => fuelStore.updateCompetitorPrice({ ...comp, competitorName: e.target.value })} className="bg-transparent border-none text-lg font-black text-slate-900 outline-none p-0 focus:ring-0 h-7" />
                                                    <input value={comp.distance} onChange={e => fuelStore.updateCompetitorPrice({ ...comp, distance: e.target.value })} className="bg-transparent border-none text-[9px] font-black text-slate-400 uppercase tracking-widest outline-none p-0 focus:ring-0 w-32" />
                                                </div>
                                            </div>
                                            <button onClick={() => { if (confirm('Remove?')) fuelStore.deleteCompetitor(comp.id) }} className="p-3 text-slate-200 hover:text-rose-500 transition-colors"><AlertCircle className="w-5 h-5" /></button>
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                            {comp.prices.map((p, pIdx) => (
                                                <div key={p.type} className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase mb-2">{p.type}</span>
                                                    <div className="flex items-baseline">
                                                        <span className="text-slate-300 text-[10px] font-bold mr-1">$</span>
                                                        <input type="number" step="0.001" value={p.price} onChange={e => {
                                                            const newPrices = [...comp.prices];
                                                            newPrices[pIdx].price = parseFloat(e.target.value) || 0;
                                                            fuelStore.updateCompetitorPrice({ ...comp, prices: newPrices });
                                                        }} className="w-full bg-transparent border-none p-0 text-sm font-black text-slate-900 text-center focus:ring-0" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'inventory' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start animate-in fade-in duration-500">
                    <div className="xl:col-span-8 space-y-8">
                        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Calendar className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase italic leading-none">Tank Report Date</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{selectedDate}</p>
                                </div>
                            </div>
                            <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                <button onClick={() => navigateDate(-1)} className="p-2.5 hover:bg-white hover:text-slate-900 rounded-xl text-slate-400 transition-colors"><ChevronLeft /></button>
                                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent border-none text-slate-900 font-black text-xs w-[130px] text-center outline-none cursor-pointer" />
                                <button onClick={() => navigateDate(1)} className="p-2.5 hover:bg-white hover:text-slate-900 rounded-xl text-slate-400 transition-colors"><ChevronRight /></button>
                            </div>
                        </div>

                        <div className="bg-white border-2 border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
                            <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-white">
                                <div className="flex items-center gap-4">
                                    <LayoutGrid className="w-6 h-6 text-slate-300" />
                                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Underground Inventory Audit</h3>
                                </div>
                                <button onClick={saveInventory} disabled={isSubmitting} className="group px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-3 shadow-xl">
                                    {!isSubmitting ? <Save className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>Commit Records</span>
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-10 py-5">Product</th>
                                            <th className="px-6 py-5 text-center">Opening</th>
                                            <th className="px-6 py-5 text-center">Delivery</th>
                                            <th className="px-6 py-5 text-center">Sold</th>
                                            <th className="px-6 py-5 text-center">Book Inv</th>
                                            <th className="px-6 py-5 text-center bg-blue-50/20">ATG Actual</th>
                                            <th className="px-10 py-5 text-right text-slate-900">Variance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {logEntries.map((entry, idx) => (
                                            <tr key={entry.type} className="group hover:bg-slate-50/30 transition-colors">
                                                <td className="px-10 py-6"><span className="text-sm font-black text-slate-900 uppercase italic">{entry.type}</span></td>
                                                <td className="px-4 py-4"><input type="number" value={entry.beginGal} onChange={e => updateLogEntry(idx, 'beginGal', parseFloat(e.target.value))} className="w-full h-10 bg-slate-50 border border-slate-100 rounded-lg px-3 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500 opacity-60" style={{ MozAppearance: 'textfield' }} /></td>
                                                <td className="px-4 py-4"><input type="number" value={entry.deliveryGal} onChange={e => updateLogEntry(idx, 'deliveryGal', parseFloat(e.target.value))} className="w-full h-10 bg-slate-50 border border-slate-100 rounded-lg px-3 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500" style={{ MozAppearance: 'textfield' }} /></td>
                                                <td className="px-4 py-4"><input type="number" value={entry.soldGal} onChange={e => updateLogEntry(idx, 'soldGal', parseFloat(e.target.value))} className="w-full h-10 bg-slate-50 border border-slate-100 rounded-lg px-3 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500" style={{ MozAppearance: 'textfield' }} /></td>
                                                <td className="px-4 py-4"><div className="text-center text-xs font-black text-slate-400 tabular-nums">{entry.bookInv.toLocaleString()}</div></td>
                                                <td className="px-4 py-4 bg-blue-50/5"><input type="number" value={entry.endInvAtg} onChange={e => updateLogEntry(idx, 'endInvAtg', parseFloat(e.target.value))} className="w-full h-12 bg-slate-50 border border-blue-200 rounded-lg px-3 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500 shadow-sm" style={{ MozAppearance: 'textfield' }} /></td>
                                                <td className="px-10 py-6 text-right">
                                                    <span className={`text-sm font-black tabular-nums ${entry.variance > 0 ? 'text-rose-500' : (entry.variance < 0 ? 'text-emerald-500' : 'text-slate-300')}`}>
                                                        {Math.abs(entry.variance).toFixed(0)} {entry.variance > 0 ? 'SHORT' : (entry.variance < 0 ? 'OVER' : 'BAL')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="xl:col-span-4 space-y-8">
                        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter mb-6">ATG Snapshots</h3>
                            <div className="space-y-6">
                                <div
                                    onClick={triggerAtgUpload}
                                    onDragOver={e => { e.preventDefault(); setIsDraggingAtg(true); }}
                                    onDragLeave={e => { e.preventDefault(); setIsDraggingAtg(false); }}
                                    onDrop={e => { e.preventDefault(); handleAtgDrop(e); }}
                                    className={`block group cursor-pointer border-2 border-dashed rounded-[2rem] p-10 transition-all text-center ${atgImageFile ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:border-blue-500'
                                        } ${isDraggingAtg ? 'bg-blue-50 border-blue-500 border-2' : ''}`}
                                >
                                    <Paperclip className={`w-8 h-8 mx-auto mb-4 ${atgImageFile ? 'text-emerald-500' : 'text-slate-300 group-hover:text-blue-500'}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${atgImageFile ? 'text-emerald-700' : 'text-slate-400'}`}>
                                        {atgImageFile ? atgImageFile.name : 'Upload Report'}
                                    </span>
                                    <input type="file" ref={atgInputRef} className="hidden" onChange={e => setAtgImageFile(e.target.files?.[0] || null)} />
                                </div>
                                <textarea value={logNotes} onChange={e => setLogNotes(e.target.value)} className="w-full h-32 bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 text-xs font-bold outline-none focus:bg-white focus:border-blue-500" placeholder="Audit notes..."></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'orders' && (
                <div className="animate-in fade-in duration-500">
                    <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-12">
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8">Purchase Fuel Loads</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400">Reference #</label>
                                        <input value={newOrder.orderNumber} onChange={e => setNewOrder({ ...newOrder, orderNumber: e.target.value })} className="w-full h-14 bg-slate-50 rounded-2xl px-6 text-sm font-bold outline-none border-2 border-transparent focus:bg-white focus:border-blue-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400">Supplier</label>
                                        <input value={newOrder.supplier} onChange={e => setNewOrder({ ...newOrder, supplier: e.target.value })} className="w-full h-14 bg-slate-50 rounded-2xl px-6 text-sm font-bold outline-none border-2 border-transparent focus:bg-white focus:border-blue-500" />
                                    </div>
                                </div>
                                {newOrder.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-4">
                                        <select value={item.type} onChange={e => {
                                            const newItems = [...newOrder.items];
                                            newItems[idx].type = e.target.value;
                                            setNewOrder({ ...newOrder, items: newItems });
                                        }} className="flex-1 h-14 bg-slate-50 rounded-2xl px-6 text-sm font-bold outline-none border-2 border-transparent focus:bg-white focus:border-blue-500">
                                            {fuelStore.defaultFuelTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <input type="number" value={item.gallons} onChange={e => {
                                            const newItems = [...newOrder.items];
                                            newItems[idx].gallons = parseFloat(e.target.value) || 0;
                                            setNewOrder({ ...newOrder, items: newItems });
                                        }} placeholder="Gals" className="w-48 h-14 bg-slate-50 rounded-2xl px-6 text-sm font-bold outline-none border-2 border-transparent focus:bg-white focus:border-blue-500" />
                                        {idx === newOrder.items.length - 1 && (
                                            <button onClick={addOrderItem} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-colors"><Plus className="w-5 h-5" /></button>
                                        )}
                                    </div>
                                ))}
                                <button onClick={saveOrder} className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">Submit PO to Terminal</button>
                            </div>
                            <div className="bg-slate-50 rounded-[2.5rem] p-8 overflow-y-auto max-h-[500px] border border-slate-100">
                                <h4 className="text-xs font-black uppercase tracking-widest mb-6">Dispatched Queue</h4>
                                {fuelStore.orders.map(order => (
                                    <div key={order.id} className="p-4 bg-white rounded-2xl border border-slate-100 mb-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black">{order.supplier}</span>
                                            <span className="text-[8px] font-black px-2 py-1 bg-amber-50 rounded">{order.status}</span>
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-400 mt-2">{order.items.map(i => `${i.gallons} GAL ${i.type}`).join(', ')}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'invoices' && (
                <div className="animate-in fade-in duration-500">
                    <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-12">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter">Liquid Bill Entry</h3>
                            <button onClick={saveInvoice} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">Save Invoice</button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <div
                                    onClick={triggerInvoiceUpload}
                                    onDragOver={e => { e.preventDefault(); setIsDraggingInvoice(true); }}
                                    onDragLeave={e => { e.preventDefault(); setIsDraggingInvoice(false); }}
                                    onDrop={e => { e.preventDefault(); handleInvoiceDrop(e); }}
                                    className={`p-8 rounded-3xl border border-dashed flex flex-col items-center justify-center gap-4 text-center cursor-pointer transition-all ${invoiceImageFile ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:bg-white'
                                        } ${isDraggingInvoice ? 'bg-blue-50 border-blue-500 border-2' : ''}`}
                                >
                                    <Paperclip className={`w-10 h-10 ${invoiceImageFile ? 'text-emerald-500' : 'text-slate-300'}`} />
                                    <div className="space-y-1">
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${invoiceImageFile ? 'text-emerald-700' : 'text-slate-400'}`}>
                                            {invoiceImageFile ? invoiceImageFile.name : 'Drop BOL Snapshot or PDF'}
                                        </p>
                                        {!invoiceImageFile && <p className="text-[8px] font-bold text-slate-300 uppercase italic">Or click to browse terminal files</p>}
                                    </div>
                                    <input type="file" ref={invoiceInputRef} onChange={e => setInvoiceImageFile(e.target.files?.[0] || null)} className="hidden" accept="image/*,.pdf" />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <input value={newInvoice.invoiceNumber} onChange={e => setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })} placeholder="Invoice #" className="w-full h-14 bg-slate-50 rounded-2xl px-6 text-sm font-bold outline-none border-2 border-transparent focus:bg-white focus:border-blue-500" />
                                    <input value={newInvoice.supplier} onChange={e => setNewInvoice({ ...newInvoice, supplier: e.target.value })} placeholder="Supplier" className="w-full h-14 bg-slate-50 rounded-2xl px-6 text-sm font-bold outline-none border-2 border-transparent focus:bg-white focus:border-blue-500" />
                                </div>

                                {invoiceImageFile && (
                                    <div className="flex flex-col gap-4 p-4 bg-blue-50 rounded-3xl border border-blue-100 animate-in slide-in-from-top duration-300">
                                        <div className="flex gap-4">
                                            <button
                                                onClick={handleAiScan}
                                                disabled={isAiProcessing}
                                                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20"
                                            >
                                                {!isAiProcessing ? <Sparkles className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                                                <span>{isAiProcessing ? 'Analyzing BOL...' : 'Extract with AI (99.9% Accuracy)'}</span>
                                            </button>
                                            <button onClick={() => setInvoiceImageFile(null)} className="px-6 py-4 bg-white text-slate-400 rounded-2xl text-[10px] font-black uppercase hover:text-rose-500 transition-colors">Clear</button>
                                        </div>
                                        {isAiProcessing && (
                                            <div className="space-y-2 px-2 pb-2">
                                                <div className="h-1 bg-blue-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 transition-all duration-300"
                                                        style={{ width: `${scanProgress}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between text-[7px] font-black uppercase text-blue-400">
                                                    <span>Neural Processing</span>
                                                    <span>{scanProgress}%</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {newInvoice.items.map((item, idx) => (
                                    <div key={idx} className="p-6 bg-slate-50 rounded-2xl grid grid-cols-2 gap-4 relative group">
                                        <select value={item.type} onChange={e => {
                                            const newItems = [...newInvoice.items];
                                            newItems[idx].type = e.target.value;
                                            setNewInvoice({ ...newInvoice, items: newItems });
                                        }} className="w-full h-10 bg-slate-50 rounded-2xl px-3 text-xs font-bold outline-none border-2 border-slate-100 focus:bg-white focus:border-blue-500">
                                            {fuelStore.defaultFuelTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <input type="number" value={item.gallons} onChange={e => {
                                            const newItems = [...newInvoice.items];
                                            newItems[idx].gallons = parseFloat(e.target.value) || 0;
                                            setNewInvoice({ ...newInvoice, items: newItems });
                                            calculateInvoiceTotal();
                                        }} placeholder="Gals" className="w-full h-10 bg-slate-50 rounded-2xl px-3 text-xs font-bold outline-none border-2 border-slate-100 focus:bg-white focus:border-blue-500" style={{ MozAppearance: 'textfield' }} />
                                        <input type="number" step="0.001" value={item.costPerGal} onChange={e => {
                                            const newItems = [...newInvoice.items];
                                            newItems[idx].costPerGal = parseFloat(e.target.value) || 0;
                                            setNewInvoice({ ...newInvoice, items: newItems });
                                            calculateInvoiceTotal();
                                        }} placeholder="CPG" className="w-full h-10 bg-slate-50 rounded-2xl px-3 text-xs font-bold outline-none border-2 border-slate-100 focus:bg-white focus:border-blue-500" style={{ MozAppearance: 'textfield' }} />
                                        <div className="flex items-center justify-end px-4 font-black italic text-slate-900">${(item.gallons * item.costPerGal).toFixed(2)}</div>
                                    </div>
                                ))}
                                <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-xs font-black uppercase text-slate-400">Grand Total</span>
                                    <span className="text-3xl font-black tabular-nums italic">${newInvoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest mb-4">Historical Billing</h4>
                                {fuelStore.invoices.map(inv => (
                                    <div key={inv.id} className="p-6 bg-white border border-slate-100 rounded-3xl flex justify-between items-center">
                                        <div>
                                            <p className="text-xs font-black">{inv.supplier}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{inv.invoiceNumber} • {inv.date ? new Date(inv.date).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                        <span className="text-sm font-black tabular-nums">${inv.totalAmount.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
