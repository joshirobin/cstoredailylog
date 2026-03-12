import { useState, useEffect, useMemo } from 'react';
import { Calculator } from 'lucide-react';

interface Denomination {
    value: number;
    label: string;
    count: number;
}

interface CashDenominationsProps {
    label: string;
    value: number | null;
    onChange: (total: number) => void;
    onDetailsChange?: (details: { bills: Record<number, number>, coins: Record<number, number> }) => void;
}

export default function CashDenominations({ label, value, onChange, onDetailsChange }: CashDenominationsProps) {
    const [bills, setBills] = useState<Denomination[]>([
        { value: 100, label: '$100', count: 0 },
        { value: 50, label: '$50', count: 0 },
        { value: 20, label: '$20', count: 0 },
        { value: 10, label: '$10', count: 0 },
        { value: 5, label: '$5', count: 0 },
        { value: 1, label: '$1', count: 0 },
    ]);

    const [coins, setCoins] = useState<Denomination[]>([
        { value: 1.00, label: '$1.00', count: 0 },
        { value: 0.50, label: '50¢', count: 0 },
        { value: 0.25, label: '25¢', count: 0 },
        { value: 0.10, label: '10¢', count: 0 },
        { value: 0.05, label: '5¢', count: 0 },
        { value: 0.01, label: '1¢', count: 0 },
    ]);

    const total = useMemo(() => {
        const billsTotal = bills.reduce((acc, b) => acc + (b.count * b.value), 0);
        const coinsTotal = coins.reduce((acc, c) => acc + (c.count * c.value), 0);
        return Number((billsTotal + coinsTotal).toFixed(2));
    }, [bills, coins]);

    useEffect(() => {
        onChange(total);
        if (onDetailsChange) {
            const details = {
                bills: bills.reduce((acc: Record<number, number>, b) => {
                    if (b.count > 0) acc[b.value] = b.count;
                    return acc;
                }, {}),
                coins: coins.reduce((acc: Record<number, number>, c) => {
                    if (c.count > 0) acc[c.value] = c.count;
                    return acc;
                }, {})
            };
            onDetailsChange(details);
        }
    }, [total]);

    useEffect(() => {
        if (value === 0 || value === null) {
            if (total !== 0) {
                setBills(prev => prev.map(b => ({ ...b, count: 0 })));
                setCoins(prev => prev.map(c => ({ ...c, count: 0 })));
            }
        }
    }, [value]);

    const handleCountChange = (type: 'bills' | 'coins', index: number, count: number) => {
        const val = Math.max(0, count);
        if (type === 'bills') {
            const newBills = [...bills];
            newBills[index].count = val;
            setBills(newBills);
        } else {
            const newCoins = [...coins];
            newCoins[index].count = val;
            setCoins(newCoins);
        }
    };

    return (
        <div className="bg-transparent border-2 border-slate-100 rounded-3xl overflow-hidden transition-all mb-4">
            {/* Header with Total */}
            <div className="p-6 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary-100 p-3 rounded-2xl text-primary-600">
                            <Calculator className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">{label}</div>
                            <div className="text-3xl font-black font-mono text-slate-900 tracking-tighter">${total.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Denomination Inputs */}
            <div className="p-8 bg-white/50 backdrop-blur-sm">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Bills */}
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Paper Currency</h4>
                        {bills.map((bill, i) => (
                            <div key={bill.value} className="flex items-center gap-4 group">
                                <span className="w-12 text-sm font-black text-slate-400 text-right italic">{bill.label}</span>
                                <div className="flex-1 relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs uppercase pointer-events-none">qty</span>
                                    <input
                                        value={bill.count || ''}
                                        onChange={e => handleCountChange('bills', i, parseInt(e.target.value) || 0)}
                                        type="number"
                                        min="0"
                                        className="no-spinner w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 pl-12 text-lg font-black text-slate-900 focus:bg-white focus:border-primary-500 transition-all outline-none"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="w-28 text-right">
                                    <span className="text-lg font-black font-mono text-emerald-600 tracking-tighter">${(bill.count * bill.value).toFixed(0)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Coins */}
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Coinage / Rolls</h4>
                        {coins.map((coin, i) => (
                            <div key={coin.value} className="flex items-center gap-4 group">
                                <span className="w-12 text-sm font-black text-slate-400 text-right italic">{coin.label}</span>
                                <div className="flex-1 relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs uppercase pointer-events-none">qty</span>
                                    <input
                                        value={coin.count || ''}
                                        onChange={e => handleCountChange('coins', i, parseInt(e.target.value) || 0)}
                                        type="number"
                                        min="0"
                                        className="no-spinner w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 pl-12 text-lg font-black text-slate-900 focus:bg-white focus:border-primary-500 transition-all outline-none"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="w-28 text-right">
                                    <span className="text-lg font-black font-mono text-emerald-600 tracking-tighter">${(coin.count * coin.value).toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                .no-spinner::-webkit-inner-spin-button,
                .no-spinner::-webkit-outer-spin-button {
                  -webkit-appearance: none;
                  appearance: none;
                  margin: 0;
                }
                .no-spinner {
                  -moz-appearance: textfield;
                  appearance: textfield;
                }
            `}</style>
        </div>
    );
}
