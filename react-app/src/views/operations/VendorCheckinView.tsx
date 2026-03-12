import { useState, useEffect, useMemo } from 'react';
import { useVendorStore } from '../../stores/useVendorStore';
import { useAuthStore } from '../../stores/useAuthStore';
import {
    Plus, Package, AlertTriangle, Search, Truck,
    ChevronRight, X, Loader2
} from 'lucide-react';

const VendorCheckinView = () => {
    const vendorStore = useVendorStore();
    const { user } = useAuthStore();

    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newDelivery, setNewDelivery] = useState({
        vendorName: '',
        invoiceNumber: '',
        deliveryDate: new Date().toISOString().split('T')[0],
        itemCountExpected: 0,
        itemCountActual: 0,
        shortages: [] as { itemName: string, missingQty: number }[],
        receivedBy: user?.email?.split('@')[0] || 'Unknown'
    });

    const [currentShortageItem, setCurrentShortageItem] = useState('');
    const [currentShortageQty, setCurrentShortageQty] = useState(0);

    const addShortage = () => {
        if (!currentShortageItem || currentShortageQty <= 0) return;
        setNewDelivery({
            ...newDelivery,
            shortages: [
                ...newDelivery.shortages,
                { itemName: currentShortageItem, missingQty: currentShortageQty }
            ]
        });
        setCurrentShortageItem('');
        setCurrentShortageQty(0);
    };

    const removeShortage = (index: number) => {
        const updated = [...newDelivery.shortages];
        updated.splice(index, 1);
        setNewDelivery({ ...newDelivery, shortages: updated });
    };

    const handleSubmit = async () => {
        if (!newDelivery.vendorName || !newDelivery.invoiceNumber) {
            alert("Please fill in vendor name and invoice number");
            return;
        }

        setIsSubmitting(true);
        try {
            const status = newDelivery.itemCountActual < newDelivery.itemCountExpected
                ? 'DISCREPANCY'
                : 'VERIFIED';

            await vendorStore.addDelivery({
                ...newDelivery,
                status
            });
            setIsAdding(false);
            setNewDelivery({
                vendorName: '',
                invoiceNumber: '',
                deliveryDate: new Date().toISOString().split('T')[0],
                itemCountExpected: 0,
                itemCountActual: 0,
                shortages: [],
                receivedBy: user?.email?.split('@')[0] || 'Unknown'
            });
        } catch (e) {
            alert("Failed to save delivery");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredDeliveries = useMemo(() => {
        if (!searchQuery) return vendorStore.deliveries;
        const q = searchQuery.toLowerCase();
        return vendorStore.deliveries.filter(d =>
            d.vendorName.toLowerCase().includes(q) ||
            d.invoiceNumber.toLowerCase().includes(q)
        );
    }, [searchQuery, vendorStore.deliveries]);

    useEffect(() => {
        vendorStore.fetchDeliveries();
    }, []);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none mb-3">
                        Vendor <span className="text-indigo-600">Receiving</span>
                    </h1>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Supply Chain Integrity • Loss Prevention</p>
                </div>

                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
                >
                    <Plus className="w-4 h-4" />
                    New Check-in
                </button>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <Search className="w-5 h-5 text-slate-300 ml-2" />
                <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search manifests, vendors, or invoices..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold uppercase tracking-widest text-slate-900 outline-none"
                />
                <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredDeliveries.length} Shipments</span>
                </div>
            </div>

            {isAdding && (
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-900 p-8 animate-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Manifest Verification</h3>
                        <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-900">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 text-left">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Vendor Name</label>
                            <input
                                value={newDelivery.vendorName}
                                onChange={(e) => setNewDelivery({ ...newDelivery, vendorName: e.target.value.toUpperCase() })}
                                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold"
                                placeholder="e.g. CORE-MARK, PEPSI"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Invoice #</label>
                            <input
                                value={newDelivery.invoiceNumber}
                                onChange={(e) => setNewDelivery({ ...newDelivery, invoiceNumber: e.target.value })}
                                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold"
                                placeholder="INV-0000"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Expected Boxes</label>
                            <input
                                type="number"
                                value={newDelivery.itemCountExpected}
                                onChange={(e) => setNewDelivery({ ...newDelivery, itemCountExpected: parseInt(e.target.value) || 0 })}
                                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Actual Received</label>
                            <input
                                type="number"
                                value={newDelivery.itemCountActual}
                                onChange={(e) => setNewDelivery({ ...newDelivery, itemCountActual: parseInt(e.target.value) || 0 })}
                                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold"
                            />
                        </div>
                    </div>

                    {/* Shortages Section */}
                    <div className="mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            Discrepancy Log
                        </h4>

                        <div className="flex gap-4 mb-4">
                            <input
                                value={currentShortageItem}
                                onChange={(e) => setCurrentShortageItem(e.target.value)}
                                className="flex-1 bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold"
                                placeholder="Item description..."
                            />
                            <input
                                type="number"
                                value={currentShortageQty}
                                onChange={(e) => setCurrentShortageQty(parseInt(e.target.value) || 0)}
                                className="w-24 bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold"
                                placeholder="Qty"
                            />
                            <button
                                onClick={addShortage}
                                className="px-6 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors"
                            >
                                Add
                            </button>
                        </div>

                        <div className="space-y-2">
                            {newDelivery.shortages.map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-xl animate-in fade-in slide-in-from-left-2">
                                    <span className="text-xs font-bold text-slate-700">{s.itemName}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-black text-rose-500 uppercase">Short {s.missingQty}</span>
                                        <button onClick={() => removeShortage(idx)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {newDelivery.shortages.length === 0 && (
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center py-4 italic">No discrepancies noted yet</p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:bg-slate-400 flex items-center justify-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSubmitting ? 'Authorizing Check-in...' : 'Authorize Check-in'}
                    </button>
                </div>
            )}

            {/* History List */}
            <div className="space-y-4">
                {filteredDeliveries.map((d) => (
                    <div key={d.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4 text-left">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${d.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {d.status === 'VERIFIED' ? <Package className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-none">{d.vendorName}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inv: {d.invoiceNumber}</span>
                                        <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d.deliveryDate}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4">
                                <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-left">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-tight">Verification Status</p>
                                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                                        {d.itemCountActual}/{d.itemCountExpected} Boxes
                                    </p>
                                </div>

                                <div className={`px-4 py-2 rounded-xl border font-black uppercase text-[10px] tracking-widest ${d.status === 'VERIFIED' ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-rose-100 border-rose-200 text-rose-700'
                                    }`}>
                                    {d.status}
                                </div>

                                <button className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {filteredDeliveries.length === 0 && !vendorStore.loading && (
                    <div className="py-20 text-center">
                        <Truck className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                        <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No verified shipments found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VendorCheckinView;
