import { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';

export default function CashDenominations({
    label,
    modelValue,
    onChange,
    onDetailsChange
}: {
    label: string,
    modelValue: number | null,
    onChange?: (val: number) => void,
    onDetailsChange?: (details: { bills: any, coins: any }) => void
}) {
    const [bills, setBills] = useState([
        { value: 100, label: '$100', count: 0 },
        { value: 50, label: '$50', count: 0 },
        { value: 20, label: '$20', count: 0 },
        { value: 10, label: '$10', count: 0 },
        { value: 5, label: '$5', count: 0 },
        { value: 1, label: '$1', count: 0 },
    ]);

    const [coins, setCoins] = useState([
        { value: 1.00, label: '$1.00', count: 0 },
        { value: 0.50, label: '50¢', count: 0 },
        { value: 0.25, label: '25¢', count: 0 },
        { value: 0.10, label: '10¢', count: 0 },
        { value: 0.05, label: '5¢', count: 0 },
        { value: 0.01, label: '1¢', count: 0 },
    ]);

    const billsTotal = bills.reduce((acc, b) => acc + (b.count * b.value), 0);
    const coinsTotal = coins.reduce((acc, c) => acc + (c.count * c.value), 0);
    const total = billsTotal + coinsTotal;

    useEffect(() => {
        if (onChange) {
            onChange(total);
        }
        if (onDetailsChange) {
            const details = {
                bills: bills.reduce((acc: any, b) => { if (b.count > 0) acc[b.value] = b.count; return acc; }, {}),
                coins: coins.reduce((acc: any, c) => { if (c.count > 0) acc[c.value] = c.count; return acc; }, {})
            };
            onDetailsChange(details);
        }
    }, [bills, coins, onChange, onDetailsChange, total]);

    // Reset when modelValue gets cleared externally
    useEffect(() => {
        if (modelValue === 0 || modelValue === null) {
            if (total !== 0) {
                setBills(bills.map(b => ({ ...b, count: 0 })));
                setCoins(coins.map(c => ({ ...c, count: 0 })));
            }
        }
    }, [modelValue, total]);

    const handleBillChange = (index: number, value: number) => {
        const newBills = [...bills];
        newBills[index].count = value;
        setBills(newBills);
    };

    const handleCoinChange = (index: number, value: number) => {
        const newCoins = [...coins];
        newCoins[index].count = value;
        setCoins(newCoins);
    };

    return (
        <div className="bg-transparent border-2 border-slate-100 rounded-[2rem] overflow-hidden transition-all mb-4">
            <div className="p-6 bg-slate-50 border-b border-slate-100">
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

            <div className="p-8 bg-white/50 backdrop-blur-sm">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Paper Currency</h4>
                        {bills.map((bill, index) => (
                            <div key={bill.value} className="flex items-center gap-4 group">
                                <span className="w-12 text-sm font-black text-slate-400 text-right italic">{bill.label}</span>
                                <div className="flex-1 relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs uppercase pointer-events-none">qty</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={bill.count === 0 ? '' : bill.count}
                                        onChange={(e) => handleBillChange(index, parseInt(e.target.value) || 0)}
                                        className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 pl-12 text-lg font-black text-slate-900 focus:bg-white focus:border-primary-500 transition-all outline-none"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="w-28 text-right">
                                    <span className="text-lg font-black font-mono text-emerald-600 tracking-tighter">${(bill.count * bill.value).toFixed(0)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Coinage / Rolls</h4>
                        {coins.map((coin, index) => (
                            <div key={coin.value} className="flex items-center gap-4 group">
                                <span className="w-12 text-sm font-black text-slate-400 text-right italic">{coin.label}</span>
                                <div className="flex-1 relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs uppercase pointer-events-none">qty</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={coin.count === 0 ? '' : coin.count}
                                        onChange={(e) => handleCoinChange(index, parseInt(e.target.value) || 0)}
                                        className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 pl-12 text-lg font-black text-slate-900 focus:bg-white focus:border-primary-500 transition-all outline-none"
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
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                  -webkit-appearance: none; 
                  margin: 0; 
                }
            `}</style>
        </div>
    );
}
