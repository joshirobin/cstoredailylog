import { useLocationsStore } from '../../stores/useLocationsStore';
import { Plus, Trash2, Calculator } from 'lucide-react';


interface DailyReconciliationFormProps {
    log: any;
    isEditable?: boolean;
    onChange?: (log: any) => void;
    onOpenCalculator?: (field: string, initialValue: number) => void;
}

export default function DailyReconciliationForm({ log, isEditable = false, onChange, onOpenCalculator }: DailyReconciliationFormProps) {
    const locationsStore = useLocationsStore();

    const totalCashIn = (log.cashSales || 0) +
        (log.lotteryCashSales || 0) +
        (log.safeCashAdded || 0) +
        (log.otherCashIn || 0);

    const totalCashOut = (log.safeDrops || 0) +
        (log.lotteryPaidOut || 0) +
        (log.expenses || 0) +
        (log.bankDeposit || 0) +
        (log.otherCashOut || 0);

    const expectedCash = (log.openingCash || 0) + totalCashIn - totalCashOut;
    const overShort = (log.closingCash || 0) - expectedCash;

    const updateField = (field: string, value: any) => {
        if (onChange) {
            onChange({ ...log, [field]: value });
        }
    };

    const updateNestedField = (parent: string, field: string, value: any) => {
        if (onChange) {
            onChange({
                ...log,
                [parent]: {
                    ...(log[parent] || {}),
                    [field]: value
                }
            });
        }
    };

    const addPaidOut = () => {
        const newPaidOutLog = [...(log.paidOutLog || [])];
        newPaidOutLog.push({ time: '', description: '', amount: 0, employee: '' });
        updateField('paidOutLog', newPaidOutLog);
    };

    const removePaidOut = (index: number) => {
        const newPaidOutLog = [...(log.paidOutLog || [])];
        newPaidOutLog.splice(index, 1);
        updateField('paidOutLog', newPaidOutLog);
    };

    const updatePaidOut = (index: number, field: string, value: any) => {
        const newPaidOutLog = [...(log.paidOutLog || [])];
        newPaidOutLog[index] = { ...newPaidOutLog[index], [field]: value };
        updateField('paidOutLog', newPaidOutLog);
    };

    return (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <div className="text-center mb-8 pb-8 border-b-2 border-slate-900 border-dashed">
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">GAS STATION DAILY RECONCILIATION FORM</h1>
            </div>

            {/* Header Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-xs font-bold text-slate-700">
                <div><span className="text-slate-400 uppercase tracking-widest block text-[10px]">Store Name:</span> {locationsStore.activeLocation?.name || 'N/A'}</div>
                <div><span className="text-slate-400 uppercase tracking-widest block text-[10px]">Store #:</span> __________</div>
                <div>
                    <span className="text-slate-400 uppercase tracking-widest block text-[10px]">Date:</span>
                    {!isEditable ? <span>{log.date}</span> :
                        <input type="date" value={log.date} onChange={e => updateField('date', e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none" />
                    }
                </div>
                <div>
                    <span className="text-slate-400 uppercase tracking-widest block text-[10px]">Shift:</span>
                    {!isEditable ? <span>{log.shift || 'Full Day'}</span> :
                        <select value={log.shift || 'Full Day'} onChange={e => updateField('shift', e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none w-full">
                            <option value="Morning">Morning</option>
                            <option value="Afternoon">Afternoon</option>
                            <option value="Night">Night</option>
                            <option value="Full Day">Full Day</option>
                        </select>
                    }
                </div>
                <div className="col-span-2">
                    <span className="text-slate-400 uppercase tracking-widest block text-[10px]">Manager on Duty:</span>
                    {!isEditable ? <span>{log.managerOnDuty || '____________'}</span> :
                        <input type="text" value={log.managerOnDuty || ''} onChange={e => updateField('managerOnDuty', e.target.value)} placeholder="Manager Name" className="bg-slate-50 w-full border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none" />
                    }
                </div>
            </div>

            <div className="space-y-8">
                {/* 1. REGISTER CASH RECONCILIATION */}
                <section>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">1. REGISTER CASH RECONCILIATION</h2>
                    <div className="mb-4">
                        <div className="flex items-center justify-between">
                            <p className="font-bold text-sm flex items-center gap-2">Opening Float:
                                {!isEditable ? <span className="text-emerald-600">${(log.openingCash || 0).toFixed(2)}</span> :
                                    <input type="number" value={log.openingCash || 0} onChange={e => updateField('openingCash', parseFloat(e.target.value) || 0)} className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-2 py-1 text-sm w-32 outline-none font-black" />
                                }
                            </p>
                            {isEditable && onOpenCalculator && (
                                <button onClick={() => onOpenCalculator('openingCash', log.openingCash || 0)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                                    <Calculator className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* CASH IN */}
                        <div>
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">CASH IN</h3>
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="h-10">
                                        <td className="font-medium text-slate-600">Cash Sales</td>
                                        <td className="text-right font-bold w-32">
                                            {!isEditable ? <span>${(log.cashSales || 0).toFixed(2)}</span> :
                                                <input type="number" value={log.cashSales || 0} onChange={e => updateField('cashSales', parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                                            }
                                        </td>
                                    </tr>
                                    <tr className="h-10">
                                        <td className="font-medium text-slate-600">Lottery Cash Sales</td>
                                        <td className="text-right font-bold">
                                            {!isEditable ? <span>${(log.lotteryCashSales || 0).toFixed(2)}</span> :
                                                <input type="number" value={log.lotteryCashSales || 0} onChange={e => updateField('lotteryCashSales', parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                                            }
                                        </td>
                                    </tr>
                                    <tr className="h-10">
                                        <td className="font-medium text-slate-600">Safe Cash Added</td>
                                        <td className="text-right font-bold">
                                            {!isEditable ? <span>${(log.safeCashAdded || 0).toFixed(2)}</span> :
                                                <input type="number" value={log.safeCashAdded || 0} onChange={e => updateField('safeCashAdded', parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                                            }
                                        </td>
                                    </tr>
                                    <tr className="h-10">
                                        <td className="font-medium text-slate-600">Other Cash In</td>
                                        <td className="text-right font-bold">
                                            {!isEditable ? <span>${(log.otherCashIn || 0).toFixed(2)}</span> :
                                                <input type="number" value={log.otherCashIn || 0} onChange={e => updateField('otherCashIn', parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                                            }
                                        </td>
                                    </tr>
                                    <tr className="h-12 bg-slate-50">
                                        <td className="font-black text-slate-900 px-2">Total Cash In</td>
                                        <td className="text-right font-black text-emerald-600 px-2">${totalCashIn.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* CASH OUT */}
                        <div>
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">CASH OUT</h3>
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="h-10">
                                        <td className="font-medium text-slate-600">Safe Drops</td>
                                        <td className="text-right font-bold w-32">
                                            {!isEditable ? <span>${(log.safeDrops || 0).toFixed(2)}</span> :
                                                <input type="number" value={log.safeDrops || 0} onChange={e => updateField('safeDrops', parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-50 border-none rounded px-2 py-1 text-rose-600" />
                                            }
                                        </td>
                                    </tr>
                                    <tr className="h-10">
                                        <td className="font-medium text-slate-600">Lottery Paid Out</td>
                                        <td className="text-right font-bold">
                                            {!isEditable ? <span>${(log.lotteryPaidOut || 0).toFixed(2)}</span> :
                                                <input type="number" value={log.lotteryPaidOut || 0} onChange={e => updateField('lotteryPaidOut', parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-50 border-none rounded px-2 py-1 text-rose-600" />
                                            }
                                        </td>
                                    </tr>
                                    <tr className="h-10">
                                        <td className="font-medium text-slate-600">Paid Outs / Expenses</td>
                                        <td className="text-right font-bold">
                                            {!isEditable ? <span>${(log.expenses || 0).toFixed(2)}</span> :
                                                <input type="number" value={log.expenses || 0} onChange={e => updateField('expenses', parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-50 border-none rounded px-2 py-1 text-rose-600" />
                                            }
                                        </td>
                                    </tr>
                                    <tr className="h-10">
                                        <td className="font-medium text-slate-600">Bank Deposit</td>
                                        <td className="text-right font-bold">
                                            {!isEditable ? <span>${(log.bankDeposit || 0).toFixed(2)}</span> :
                                                <input type="number" value={log.bankDeposit || 0} onChange={e => updateField('bankDeposit', parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-50 border-none rounded px-2 py-1 text-rose-600" />
                                            }
                                        </td>
                                    </tr>
                                    <tr className="h-10">
                                        <td className="font-medium text-slate-600">Other Cash Out</td>
                                        <td className="text-right font-bold">
                                            {!isEditable ? <span>${(log.otherCashOut || 0).toFixed(2)}</span> :
                                                <input type="number" value={log.otherCashOut || 0} onChange={e => updateField('otherCashOut', parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-50 border-none rounded px-2 py-1 text-rose-600" />
                                            }
                                        </td>
                                    </tr>
                                    <tr className="h-12 bg-slate-50">
                                        <td className="font-black text-slate-900 px-2">Total Cash Out</td>
                                        <td className="text-right font-black text-rose-600 px-2">${totalCashOut.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-8 max-w-sm mx-auto bg-slate-900 text-white rounded-2xl p-6 shadow-xl">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">CASH BALANCE</h3>
                        <div className="space-y-2 text-sm font-medium">
                            <div className="flex justify-between items-center text-slate-300">
                                <div className="flex items-center gap-2">
                                    <span>Actual Cash Counted</span>
                                    {isEditable && onOpenCalculator && (
                                        <button onClick={() => onOpenCalculator('closingCash', log.closingCash || 0)} className="p-1 text-slate-500 hover:text-indigo-400">
                                            <Calculator className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                                {!isEditable ? <span className="font-mono text-xl text-white">${(log.closingCash || 0).toFixed(2)}</span> :
                                    <input type="number" value={log.closingCash || 0} onChange={e => updateField('closingCash', parseFloat(e.target.value) || 0)} className="w-32 bg-slate-800 border-none rounded text-right px-2 py-1 font-mono text-xl text-white outline-none" />
                                }
                            </div>
                            <div className="h-px bg-slate-700 my-4"></div>
                            <div className="flex justify-between"><span>Opening Float</span> <span>${(log.openingCash || 0).toFixed(2)}</span></div>
                            <div className="flex justify-between text-emerald-400"><span>+ Total Cash In</span> <span>${totalCashIn.toFixed(2)}</span></div>
                            <div className="flex justify-between text-rose-400"><span>- Total Cash Out</span> <span>${totalCashOut.toFixed(2)}</span></div>
                            <div className="h-px bg-slate-700 my-2"></div>
                            <div className="flex justify-between font-bold text-lg"><span>Expected Cash</span> <span>${expectedCash.toFixed(2)}</span></div>
                            <div className="h-px bg-slate-700 my-2"></div>
                            <div className="flex justify-between font-black text-xl" style={{ color: overShort >= 0 ? '#10b981' : '#f43f5e' }}>
                                <span>OVER / SHORT</span>
                                <span>{overShort >= 0 ? '+' : ''}${overShort.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 2. CREDIT CARD SUMMARY */}
                    <section>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">2. CREDIT CARD SUMMARY</h2>
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-slate-100">
                                {['visa', 'mastercard', 'amex', 'discover', 'other', 'total'].map(brand => (
                                    <tr key={brand} className={brand === 'total' ? 'h-12 bg-slate-50' : 'h-10'}>
                                        <td className={brand === 'total' ? 'font-black text-slate-900 px-2' : 'font-medium text-slate-600'}>{brand.charAt(0).toUpperCase() + brand.slice(1)}</td>
                                        <td className="text-right font-bold w-32 px-2">
                                            {!isEditable || brand === 'total' ? <span>${(log.creditCardSummary?.[brand] || 0).toFixed(2)}</span> :
                                                <input type="number" value={log.creditCardSummary?.[brand] || 0} onChange={e => updateNestedField('creditCardSummary', brand, parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* 3. FUEL SALES SUMMARY */}
                    <section>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">3. FUEL SALES SUMMARY</h2>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[10px] text-slate-400 uppercase tracking-widest text-left"><th className="font-black pb-2">Item</th><th className="font-black pb-2">Gallons</th><th className="text-right font-black pb-2">Amount</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {['regular', 'premium', 'diesel'].map(type => (
                                    <tr key={type} className="h-10">
                                        <td className="font-medium text-slate-600">{type.charAt(0).toUpperCase() + type.slice(1)}</td>
                                        <td className="text-slate-500">
                                            {!isEditable ? <span>{log.fuelSalesSummary?.[`${type}Gallons`] || 0}</span> :
                                                <input type="number" value={log.fuelSalesSummary?.[`${type}Gallons`] || 0} onChange={e => updateNestedField('fuelSalesSummary', `${type}Gallons`, parseFloat(e.target.value) || 0)} className="w-16 bg-slate-50 border-none rounded px-2 py-1 font-mono text-xs" />
                                            }
                                        </td>
                                        <td className="text-right font-bold w-32">
                                            {!isEditable ? <span>${(log.fuelSalesSummary?.[`${type}Sales`] || 0).toFixed(2)}</span> :
                                                <input type="number" value={log.fuelSalesSummary?.[`${type}Sales`] || 0} onChange={e => updateNestedField('fuelSalesSummary', `${type}Sales`, parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                                            }
                                        </td>
                                    </tr>
                                ))}
                                <tr className="h-12 bg-slate-50">
                                    <td colSpan={2} className="font-black text-slate-900 px-2">Total Fuel Sales</td>
                                    <td className="text-right font-black px-2 pb-1 pt-1">
                                        {!isEditable ? <span>${(log.fuelSalesSummary?.total || 0).toFixed(2)}</span> :
                                            <input type="number" value={log.fuelSalesSummary?.total || 0} onChange={e => updateNestedField('fuelSalesSummary', 'total', parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-200 border-none rounded px-2 py-1 font-bold" />
                                        }
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </section>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 4. LOTTERY RECONCILIATION */}
                    <section>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">4. LOTTERY RECONCILIATION</h2>
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-slate-100">
                                {['openingBalance', 'lotterySales', 'lotteryPaidOut', 'settlementsPaid', 'endingBalance'].map(field => (
                                    <tr key={field} className={field === 'endingBalance' ? 'h-12 bg-slate-50' : 'h-10'}>
                                        <td className={field === 'endingBalance' ? 'font-black text-slate-900 px-2' : 'font-medium text-slate-600'}>{field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</td>
                                        <td className="text-right font-bold w-32 px-2">
                                            {!isEditable || field === 'endingBalance' ? <span className={(field === 'lotteryPaidOut' || field === 'settlementsPaid') ? 'text-rose-500' : ''}>${(log.lotteryReconciliation?.[field] || 0).toFixed(2)}</span> :
                                                <input type="number" value={log.lotteryReconciliation?.[field] || 0} onChange={e => updateNestedField('lotteryReconciliation', field, parseFloat(e.target.value) || 0)} className={`w-full text-right bg-slate-50 border-none rounded px-2 py-1 ${(field === 'lotteryPaidOut' || field === 'settlementsPaid') ? 'text-rose-600 bg-rose-50' : ''}`} />
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* 5. SAFE RECONCILIATION */}
                    <section>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">5. SAFE RECONCILIATION</h2>
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-slate-100">
                                {['openingSafeBalance', 'cashDrops', 'cashRemoved', 'endingSafeBalance'].map(field => (
                                    <tr key={field} className={field === 'endingSafeBalance' ? 'h-12 bg-slate-50' : 'h-10'}>
                                        <td className={field === 'endingSafeBalance' ? 'font-black text-slate-900 px-2' : 'font-medium text-slate-600'}>{field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</td>
                                        <td className="text-right font-bold w-32 px-2">
                                            {!isEditable || field === 'endingSafeBalance' ? <span className={field === 'cashDrops' ? 'text-emerald-600' : (field === 'cashRemoved' ? 'text-rose-500' : '')}>${(log.safeReconciliation?.[field] || 0).toFixed(2)}</span> :
                                                <input type="number" value={log.safeReconciliation?.[field] || 0} onChange={e => updateNestedField('safeReconciliation', field, parseFloat(e.target.value) || 0)} className={`w-full text-right bg-slate-50 border-none rounded px-2 py-1 ${field === 'cashDrops' ? 'text-emerald-600 bg-emerald-50' : (field === 'cashRemoved' ? 'text-rose-600 bg-rose-50' : '')}`} />
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                </div>

                {/* 6. PAID OUT LOG */}
                <section>
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest ">6. PAID OUT LOG</h2>
                        {isEditable && (
                            <button onClick={addPaidOut} className="text-[10px] text-primary-600 uppercase font-black tracking-widest flex items-center gap-1 hover:bg-slate-50 px-2 py-1 rounded">
                                <Plus className="w-3 h-3" /> Add Record
                            </button>
                        )}
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-500">
                                <tr>
                                    <th className="p-3">Time</th>
                                    <th className="p-3 w-1/2">Description</th>
                                    <th className="p-3 text-right">Amount</th>
                                    <th className="p-3">Employee</th>
                                    {isEditable && <th className="p-3 w-10"></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {log.paidOutLog?.length ? log.paidOutLog.map((po: any, i: number) => (
                                    <tr key={i} className="h-10">
                                        <td className="px-3 text-slate-500">
                                            {!isEditable ? <span>{po.time}</span> : <input type="time" value={po.time} onChange={e => updatePaidOut(i, 'time', e.target.value)} className="bg-slate-50 border-none rounded px-2 py-1 w-full" />}
                                        </td>
                                        <td className="px-3 font-medium">
                                            {!isEditable ? <span>{po.description}</span> : <input type="text" value={po.description} onChange={e => updatePaidOut(i, 'description', e.target.value)} className="bg-slate-50 border-none rounded px-2 py-1 w-full" placeholder="Desc" />}
                                        </td>
                                        <td className="px-3 text-right font-bold w-32">
                                            {!isEditable ? <span>${(po.amount || 0).toFixed(2)}</span> : <input type="number" value={po.amount || 0} onChange={e => updatePaidOut(i, 'amount', parseFloat(e.target.value) || 0)} className="text-right bg-slate-50 border-none rounded px-2 py-1 w-full" />}
                                        </td>
                                        <td className="px-3 text-slate-500 w-32">
                                            {!isEditable ? <span>{po.employee}</span> : <input type="text" value={po.employee} onChange={e => updatePaidOut(i, 'employee', e.target.value)} className="bg-slate-50 border-none rounded px-2 py-1 w-full" placeholder="Name" />}
                                        </td>
                                        {isEditable && (
                                            <td className="px-3 text-center">
                                                <button onClick={() => removePaidOut(i)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </td>
                                        )}
                                    </tr>
                                )) : (
                                    <>
                                        <tr className="h-10"><td className="p-4 border-b border-slate-100"></td><td className="p-4 border-b border-slate-100"></td><td className="p-4 border-b border-slate-100"></td><td className="p-4 border-b border-slate-100"></td>{isEditable && <td></td>}</tr>
                                        <tr className="h-10"><td className="p-4 border-b border-slate-100"></td><td className="p-4 border-b border-slate-100"></td><td className="p-4 border-b border-slate-100"></td><td className="p-4 border-b border-slate-100"></td>{isEditable && <td></td>}</tr>
                                    </>
                                )}
                            </tbody>
                            <tfoot className="bg-slate-50">
                                <tr>
                                    <td colSpan={2} className="p-3 text-right font-black text-slate-900 uppercase text-[10px] tracking-widest">Total Paid Out:</td>
                                    <td className="p-3 text-right font-black text-slate-900 pb-2 pt-2">
                                        {!isEditable ? <span>${(log.totalPaidOut || 0).toFixed(2)}</span> :
                                            <input type="number" value={log.totalPaidOut || 0} onChange={e => updateField('totalPaidOut', parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-200 border-none rounded px-2 py-1 font-bold" />
                                        }
                                    </td>
                                    <td></td>
                                    {isEditable && <td></td>}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 7. DEPOSIT SUMMARY */}
                    <section>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">7. DEPOSIT SUMMARY</h2>
                        <table className="w-full text-sm mb-4">
                            <tbody className="divide-y divide-slate-100">
                                {['cashDeposit', 'coins', 'total'].map(field => (
                                    <tr key={field} className={field === 'total' ? 'h-12 bg-slate-50' : 'h-10'}>
                                        <td className={field === 'total' ? 'font-black text-slate-900 px-2' : 'font-medium text-slate-600'}>{field === 'total' ? 'Total Deposit' : (field === 'cashDeposit' ? 'Cash Deposit' : 'Coins')}</td>
                                        <td className="text-right font-bold w-32 px-2">
                                            {!isEditable || field === 'total' ? <span>${(log.depositSummary?.[field] || 0).toFixed(2)}</span> :
                                                <input type="number" value={log.depositSummary?.[field] || 0} onChange={e => updateNestedField('depositSummary', field, parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="bg-slate-50 p-4 rounded-xl text-sm font-black text-slate-600 flex items-center gap-3">
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 block mb-1">Deposit Bag #</span>
                            {!isEditable ? <span className="font-mono text-base">{log.depositSummary?.depositBagNumber || '___________________'}</span> :
                                <input type="text" value={log.depositSummary?.depositBagNumber || ''} onChange={e => updateNestedField('depositSummary', 'depositBagNumber', e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono outline-none" placeholder="Bag Num" />
                            }
                        </div>
                    </section>

                    {/* 8. SALES SUMMARY (FROM POS Z REPORT) */}
                    <section>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">8. SALES SUMMARY (Z REPORT)</h2>
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-slate-100">
                                {['insideSales', 'fuelSales', 'lotterySales', 'totalSales'].map(field => (
                                    <tr key={field} className={field === 'totalSales' ? 'h-12 bg-slate-50' : 'h-10'}>
                                        <td className={field === 'totalSales' ? 'font-black text-slate-900 px-2' : 'font-medium text-slate-600'}>{field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</td>
                                        <td className="text-right font-bold w-32 px-2">
                                            {field === 'totalSales' ? (
                                                <span className="text-indigo-600">${((log.posZReportSummary?.insideSales || 0) + (log.posZReportSummary?.fuelSales || 0) + (log.posZReportSummary?.lotterySales || 0)).toFixed(2)}</span>
                                            ) : !isEditable ? (
                                                <span>${(log.posZReportSummary?.[field] || 0).toFixed(2)}</span>
                                            ) : (
                                                <input type="number" value={log.posZReportSummary?.[field] || 0} onChange={(e: any) => updateNestedField('posZReportSummary', field, parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-50 border-none rounded px-2 py-1" />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                </div>

                {/* 9. SIGNATURES */}
                <section className="pt-8 mt-12 border-t-2 border-slate-200 border-dashed">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 text-center pb-2">9. VERIFICATION SIGNATURES</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                        {['cashierSignature', 'managerSignature', 'date'].map(field => (
                            <div key={field}>
                                <div className="h-16 border-b-2 border-slate-300 flex items-end pb-2 justify-center italic text-primary-600 font-bold font-serif">
                                    {!isEditable ? <span>{log.signatures?.[field] || ''}</span> :
                                        <input type={field === 'date' ? 'date' : 'text'} value={log.signatures?.[field] || ''} onChange={e => updateNestedField('signatures', field, e.target.value)} className="bg-transparent border-none text-center outline-none italic w-full text-primary-600 font-bold" placeholder={field === 'date' ? '' : "Type name..."} />
                                    }
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mt-2">{field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
