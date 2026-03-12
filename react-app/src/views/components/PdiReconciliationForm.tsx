import { useState } from 'react';
import { Calculator, Wallet, Ticket, Fuel, Landmark, CheckSquare, ArrowRight, ArrowLeft } from 'lucide-react';

export default function PdiReconciliationForm({
    log,
    isEditable = false,
    onChange,
    onOpenCalculator
}: {
    log: any,
    isEditable?: boolean,
    onChange?: (newPdiForm: any) => void,
    onOpenCalculator?: (field: string, initialValue: number) => void
}) {
    const [activeStep, setActiveStep] = useState(1);

    // Default form structure
    const defaultPdi = {
        storeName: '',
        storeNumber: '',
        date: new Date().toISOString().split('T')[0],
        managerName: '',
        shift: 'Full Day',
        taxableSales: 0, nonTaxable: 0, salesTax: 0, fuelSalesTotal: 0, lotterySales: 0, otherSales: 0,
        cashSales: 0, creditSales: 0, debitSales: 0, ebtSales: 0, arSales: 0, arPaid: 0, checkSales: 0, otherPayments: 0,
        openingFloat: 0, closingFloat: 0, safeCashAdded: 0, safeDrops: 0, bankDeposit: 0, actualCashCounted: 0, actualCheckCounted: 0,
        openingSafe: 0, cashDropsSafe: 0, removedForDeposit: 0, actualSafeCount: 0,
        lotteryOpen: 0, lotteryPaidOut: 0, lotterySettled: 0, actualLottery: 0,
        regGal: 0, regSales: 0, premGal: 0, premSales: 0, dieselGal: 0, dieselSales: 0,
        paidOuts: [{ time: '', description: '', amount: 0, employee: '' }],
        cashDeposit: 0, coinDeposit: 0, checkDeposit: 0, bagNumber: '',
        verifyCash: false, verifySafe: false, verifyLottery: false, verifyDeposit: false,
        managerSig: '', employeeSig: '', signDate: new Date().toISOString().split('T')[0]
    };

    const pdi = log?.pdiForm || defaultPdi;

    const updateField = (field: string, value: any) => {
        if (!onChange || !isEditable) return;
        onChange({ ...pdi, [field]: value });
    };

    const updateNestedField = (index: number, field: string, value: any) => {
        if (!onChange || !isEditable) return;
        const newPaidOuts = [...pdi.paidOuts];
        newPaidOuts[index] = { ...newPaidOuts[index], [field]: value };
        onChange({ ...pdi, paidOuts: newPaidOuts });
    };

    const addPaidOut = () => {
        if (!onChange || !isEditable) return;
        onChange({ ...pdi, paidOuts: [...pdi.paidOuts, { time: '', description: '', amount: 0, employee: '' }] });
    };

    const removePaidOut = (idx: number) => {
        if (!onChange || !isEditable) return;
        const newPaidOuts = [...pdi.paidOuts];
        newPaidOuts.splice(idx, 1);
        onChange({ ...pdi, paidOuts: newPaidOuts });
    };

    const totalSalesDisplay = (pdi.taxableSales || 0) + (pdi.nonTaxable || 0) + (pdi.salesTax || 0) +
        (pdi.fuelSalesTotal || 0) + (pdi.lotterySales || 0) + (pdi.otherSales || 0);

    const totalIncome = (pdi.cashSales || 0) + (pdi.creditSales || 0) + (pdi.debitSales || 0) +
        (pdi.ebtSales || 0) + (pdi.arSales || 0) + (pdi.arPaid || 0) + (pdi.checkSales || 0) + (pdi.otherPayments || 0);

    const paidOutsTotal = pdi.paidOuts ? pdi.paidOuts.reduce((sum: number, po: any) => sum + (po.amount || 0), 0) : 0;

    const totalExpected = (pdi.openingFloat || 0) + (pdi.cashSales || 0) + (pdi.checkSales || 0) + (pdi.arPaid || 0) + (pdi.safeCashAdded || 0) - paidOutsTotal;

    const totalPhysical = (pdi.actualCashCounted || 0) + (pdi.actualCheckCounted || 0) + (pdi.bankDeposit || 0) + (pdi.safeDrops || 0);

    const overShortRegister = totalPhysical - totalExpected;

    const expectedSafe = (pdi.openingSafe || 0) + (pdi.cashDropsSafe || 0) - (pdi.removedForDeposit || 0);

    const safeOS = (pdi.actualSafeCount || 0) - expectedSafe;

    const expectedLottery = (pdi.lotteryOpen || 0) + (pdi.lotterySales || 0) - (pdi.lotteryPaidOut || 0) - (pdi.lotterySettled || 0);

    const lotteryOS = (pdi.actualLottery || 0) - expectedLottery;

    const totalDeposit = (pdi.cashDeposit || 0) + (pdi.coinDeposit || 0) + (pdi.checkDeposit || 0);

    const totalStoreOS = overShortRegister + safeOS + lotteryOS;

    const steps = [
        { id: 1, title: 'POS & Sales', icon: Calculator },
        { id: 2, title: 'Cash Control', icon: Wallet },
        { id: 3, title: 'Safe & Lottery', icon: Ticket },
        { id: 4, title: 'Fuel & Payouts', icon: Fuel },
        { id: 5, title: 'Deposit & OS', icon: Landmark },
        { id: 6, title: 'Verify & Sign', icon: CheckSquare }
    ];

    const InputRow = ({ label, field, type = 'number', readOnly = false, valueOverride, showCalc = false }: any) => (
        <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-[10px] uppercase text-slate-500">{label}</label>
                {isEditable && showCalc && onOpenCalculator && (
                    <button onClick={() => onOpenCalculator(field, pdi[field] || 0)} className="text-slate-400 hover:text-indigo-600">
                        <Calculator className="w-3 h-3" />
                    </button>
                )}
            </div>
            {!isEditable || readOnly ? (
                <span className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-900 flex items-center min-h-[36px]">
                    {type === 'number' && !readOnly ? `$${(pdi[field] || 0).toFixed(2)}` : (readOnly && type === 'number' ? `$${(valueOverride || 0).toFixed(2)}` : (valueOverride || pdi[field] || '-'))}
                </span>
            ) : (
                <input
                    type={type}
                    step={type === 'number' ? '0.01' : undefined}
                    value={pdi[field] || (type === 'number' ? '' : '')}
                    onChange={e => updateField(field, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                    className="bg-white border text-[11px] font-bold border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
            )}
        </div>
    );

    return (
        <div className="w-full bg-white relative">
            {isEditable && (
                <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-slate-100">
                    {steps.map(step => {
                        const Icon = step.icon;
                        return (
                            <button
                                key={step.id}
                                onClick={(e) => { e.preventDefault(); setActiveStep(step.id); }}
                                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeStep === step.id ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900'}`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{step.id}. {step.title}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="space-y-6 text-[11px]">
                {/* STEP 1 */}
                {(!isEditable || activeStep === 1) && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <InputRow label="Store Name" field="storeName" type="text" />
                            <InputRow label="Store #" field="storeNumber" type="text" />
                            <InputRow label="Date" field="date" type="date" />
                            <InputRow label="Manager" field="managerName" type="text" />
                        </div>

                        <div className="border border-slate-100 rounded-2xl p-5 shadow-sm">
                            <h2 className="text-[12px] font-black uppercase text-slate-900 mb-4 flex items-center gap-2 tracking-widest"><div className="w-1.5 h-4 bg-primary-500 rounded-full"></div> Sales Summary</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <InputRow label="Taxable Sales ($)" field="taxableSales" showCalc={true} />
                                <InputRow label="Non-Taxable Sales ($)" field="nonTaxable" showCalc={true} />
                                <InputRow label="Sales Tax ($)" field="salesTax" showCalc={true} />
                                <InputRow label="Fuel Sales ($)" field="fuelSalesTotal" showCalc={true} />
                                <InputRow label="Lottery Sales ($)" field="lotterySales" showCalc={true} />
                                <InputRow label="Other Sales ($)" field="otherSales" showCalc={true} />
                                <div className="lg:col-span-3 bg-slate-50 border-l-4 border-primary-500 rounded-xl p-3 flex items-center justify-between text-primary-900">
                                    <strong className="text-[10px] uppercase font-black tracking-widest">Total Sales</strong>
                                    <span className="text-[14px] font-black font-mono">${totalSalesDisplay.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-100 rounded-2xl p-5 shadow-sm">
                            <h2 className="text-[12px] font-black uppercase text-slate-900 mb-4 flex items-center gap-2 tracking-widest"><div className="w-1.5 h-4 bg-primary-500 rounded-full"></div> Payment Summary</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <InputRow label="Cash Sales ($)" field="cashSales" showCalc={true} />
                                <InputRow label="Credit Card ($)" field="creditSales" showCalc={true} />
                                <InputRow label="Debit Card ($)" field="debitSales" showCalc={true} />
                                <InputRow label="EBT ($)" field="ebtSales" showCalc={true} />
                                <InputRow label="AR / Charge ($)" field="arSales" showCalc={true} />
                                <InputRow label="Acct Paid / ROA ($)" field="arPaid" showCalc={true} />
                                <InputRow label="Check ($)" field="checkSales" showCalc={true} />
                                <InputRow label="Other ($)" field="otherPayments" showCalc={true} />
                                <div className="lg:col-span-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-xl p-3 flex items-center justify-between text-emerald-900 mt-2">
                                    <strong className="text-[10px] uppercase font-black tracking-widest">Total Income In</strong>
                                    <span className="text-[14px] font-black font-mono">${totalIncome.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2 */}
                {(!isEditable || activeStep === 2) && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="border border-slate-100 rounded-2xl p-5 shadow-sm bg-slate-50/50">
                                <h3 className="text-[11px] font-black uppercase text-slate-800 border-b border-slate-200 pb-2 mb-4 tracking-widest">1. Expected (System)</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><label className="font-bold text-slate-600 flex items-center gap-2">Starting Float {isEditable && onOpenCalculator && <button onClick={() => onOpenCalculator('openingFloat', pdi.openingFloat || 0)} className="text-slate-400 hover:text-indigo-600"><Calculator className="w-3 h-3" /></button>}</label>
                                        {isEditable ? <input type="number" step="0.01" value={pdi.openingFloat} onChange={e => updateField('openingFloat', parseFloat(e.target.value) || 0)} className="w-24 p-1 rounded-lg border border-slate-200 text-right text-[11px] font-bold" /> : <span className="font-mono">${(pdi.openingFloat || 0).toFixed(2)}</span>}
                                    </div>
                                    <div className="flex justify-between items-center"><label className="font-bold text-slate-600">Cash Sales</label><span className="font-mono">${(pdi.cashSales || 0).toFixed(2)}</span></div>
                                    <div className="flex justify-between items-center"><label className="font-bold text-slate-600">Check Sales</label><span className="font-mono">${(pdi.checkSales || 0).toFixed(2)}</span></div>
                                    <div className="flex justify-between items-center"><label className="font-bold text-slate-600 flex items-center gap-2">Extra Cash Added {isEditable && onOpenCalculator && <button onClick={() => onOpenCalculator('safeCashAdded', pdi.safeCashAdded || 0)} className="text-slate-400 hover:text-indigo-600"><Calculator className="w-3 h-3" /></button>}</label>
                                        {isEditable ? <input type="number" step="0.01" value={pdi.safeCashAdded} onChange={e => updateField('safeCashAdded', parseFloat(e.target.value) || 0)} className="w-24 p-1 rounded-lg border border-slate-200 text-right text-[11px] font-bold" /> : <span className="font-mono">${(pdi.safeCashAdded || 0).toFixed(2)}</span>}
                                    </div>
                                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-rose-600 font-bold"><label>Minus Paid Outs</label><span className="font-mono">-${paidOutsTotal.toFixed(2)}</span></div>
                                    <div className="border-t border-slate-300 pt-3 flex justify-between items-center font-black text-slate-900"><label className="uppercase tracking-widest">Total Expected</label><span className="font-mono">${totalExpected.toFixed(2)}</span></div>
                                </div>
                            </div>

                            <div className="border border-slate-100 rounded-2xl p-5 shadow-sm bg-slate-50/50">
                                <h3 className="text-[11px] font-black uppercase text-slate-800 border-b border-slate-200 pb-2 mb-4 tracking-widest">2. Physical Count</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><label className="font-bold text-slate-600 flex items-center gap-2">Actual Cash in Drawer {isEditable && onOpenCalculator && <button onClick={() => onOpenCalculator('actualCashCounted', pdi.actualCashCounted || 0)} className="text-slate-400 hover:text-indigo-600"><Calculator className="w-3 h-3" /></button>}</label>
                                        {isEditable ? <input type="number" step="0.01" value={pdi.actualCashCounted} onChange={e => updateField('actualCashCounted', parseFloat(e.target.value) || 0)} className="w-24 p-1 rounded-lg border-2 border-primary-300 bg-primary-50 text-primary-900 text-right text-[11px] font-bold" /> : <span className="font-mono text-primary-700 font-bold">${(pdi.actualCashCounted || 0).toFixed(2)}</span>}
                                    </div>
                                    <div className="flex justify-between items-center"><label className="font-bold text-slate-600">Actual Checks</label>
                                        {isEditable ? <input type="number" step="0.01" value={pdi.actualCheckCounted} onChange={e => updateField('actualCheckCounted', parseFloat(e.target.value) || 0)} className="w-24 p-1 rounded-lg border border-slate-200 text-right text-[11px] font-bold" /> : <span className="font-mono">${(pdi.actualCheckCounted || 0).toFixed(2)}</span>}
                                    </div>
                                    <div className="flex justify-between items-center"><label className="font-bold text-amber-600 flex items-center gap-2">Closing Float Kept {isEditable && onOpenCalculator && <button onClick={() => onOpenCalculator('closingFloat', pdi.closingFloat || 0)} className="text-slate-400 hover:text-indigo-600"><Calculator className="w-3 h-3" /></button>}</label>
                                        {isEditable ? <input type="number" step="0.01" value={pdi.closingFloat} onChange={e => updateField('closingFloat', parseFloat(e.target.value) || 0)} className="w-24 p-1 rounded-lg border border-amber-200 bg-amber-50 text-right text-[11px] font-bold" /> : <span className="font-mono text-amber-600">${(pdi.closingFloat || 0).toFixed(2)}</span>}
                                    </div>
                                    <div className="mt-4 flex justify-between items-center"><label className="font-bold text-slate-600">Bank Deposit Done</label>
                                        {isEditable ? <input type="number" step="0.01" value={pdi.bankDeposit} onChange={e => updateField('bankDeposit', parseFloat(e.target.value) || 0)} className="w-24 p-1 rounded-lg border border-slate-200 text-right text-[11px] font-bold" /> : <span className="font-mono">${(pdi.bankDeposit || 0).toFixed(2)}</span>}
                                    </div>
                                    <div className="flex justify-between items-center"><label className="font-bold text-slate-600">Safe Drops Done</label>
                                        {isEditable ? <input type="number" step="0.01" value={pdi.safeDrops} onChange={e => updateField('safeDrops', parseFloat(e.target.value) || 0)} className="w-24 p-1 rounded-lg border border-slate-200 text-right text-[11px] font-bold" /> : <span className="font-mono">${(pdi.safeDrops || 0).toFixed(2)}</span>}
                                    </div>
                                    <div className="border-t border-slate-300 pt-3 flex justify-between items-center font-black text-slate-900"><label className="uppercase tracking-widest">Total Physical</label><span className="font-mono">${totalPhysical.toFixed(2)}</span></div>
                                </div>
                            </div>
                        </div>

                        <div className={`p-5 rounded-2xl flex items-center justify-between border ${overShortRegister >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                            <div>
                                <div className="font-black uppercase tracking-widest">Register Over / Short</div>
                                <div className="text-[10px] font-bold opacity-70 mt-1">Physical Minus Expected</div>
                            </div>
                            <div className="text-2xl font-black font-mono">{overShortRegister >= 0 ? '+' : ''}${overShortRegister.toFixed(2)}</div>
                        </div>
                    </div>
                )}

                {(!isEditable || activeStep === 3) && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="border border-slate-100 rounded-2xl p-5 shadow-sm">
                            <h2 className="text-[12px] font-black uppercase text-slate-900 mb-4 flex items-center gap-2 tracking-widest"><div className="w-1.5 h-4 bg-primary-500 rounded-full"></div> Safe Reconciliation</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <InputRow label="Opening Safe" field="openingSafe" showCalc={true} />
                                <InputRow label="Cash Drops" field="cashDropsSafe" showCalc={true} />
                                <InputRow label="Removed for Deposit" field="removedForDeposit" showCalc={true} />
                                <InputRow label="Expected Balance" field="expectedSafe" readOnly valueOverride={expectedSafe} />
                                <InputRow label="Actual Count" field="actualSafeCount" showCalc={true} />
                                <div className="bg-slate-50 border-l-4 border-slate-300 rounded-xl p-3 flex flex-col items-start justify-center text-slate-900">
                                    <strong className="text-[9px] uppercase font-black tracking-widest text-slate-500 mb-1">Safe Over/Short</strong>
                                    <span className={`text-[13px] font-black font-mono ${safeOS >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>${safeOS.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-100 rounded-2xl p-5 shadow-sm">
                            <h2 className="text-[12px] font-black uppercase text-slate-900 mb-4 flex items-center gap-2 tracking-widest"><div className="w-1.5 h-4 bg-primary-500 rounded-full"></div> Lottery Reconciliation</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <InputRow label="Opening Bal" field="lotteryOpen" showCalc={true} />
                                <InputRow label="Sales (from POS)" field="lotterySales" readOnly valueOverride={pdi.lotterySales} />
                                <InputRow label="Paid Out" field="lotteryPaidOut" showCalc={true} />
                                <InputRow label="Settled" field="lotterySettled" showCalc={true} />
                                <InputRow label="Expected Bal" field="expectedLottery" readOnly valueOverride={expectedLottery} />
                                <InputRow label="Actual Bal" field="actualLottery" showCalc={true} />
                                <div className="sm:col-span-3 bg-slate-50 border-l-4 border-slate-300 rounded-xl p-3 flex items-center justify-between text-slate-900 mt-2">
                                    <strong className="text-[10px] uppercase font-black tracking-widest">Lottery Over/Short</strong>
                                    <span className={`text-[14px] font-black font-mono ${lotteryOS >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>${lotteryOS.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {(!isEditable || activeStep === 4) && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="border border-slate-100 rounded-2xl p-5 shadow-sm">
                            <h2 className="text-[12px] font-black uppercase text-slate-900 mb-4 flex items-center gap-2 tracking-widest"><div className="w-1.5 h-4 bg-primary-500 rounded-full"></div> Fuel Sales</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <InputRow label="Reg Gallons" field="regGal" />
                                <InputRow label="Reg Sales $" field="regSales" />
                                <div className="hidden md:block"></div>
                                <InputRow label="Prem Gallons" field="premGal" />
                                <InputRow label="Prem Sales $" field="premSales" />
                                <div className="hidden md:block"></div>
                                <InputRow label="Diesel Gallons" field="dieselGal" />
                                <InputRow label="Diesel Sales $" field="dieselSales" />
                                <div className="hidden md:block"></div>
                            </div>
                        </div>

                        <div className="border border-slate-100 rounded-2xl p-5 shadow-sm">
                            <h2 className="text-[12px] font-black uppercase text-slate-900 mb-4 flex items-center gap-2 tracking-widest"><div className="w-1.5 h-4 bg-primary-500 rounded-full"></div> Paid Out Log</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="pb-2 text-[9px] uppercase font-black tracking-widest text-slate-400">Time</th>
                                            <th className="pb-2 text-[9px] uppercase font-black tracking-widest text-slate-400">Description</th>
                                            <th className="pb-2 text-[9px] uppercase font-black tracking-widest text-slate-400">Amount</th>
                                            <th className="pb-2 text-[9px] uppercase font-black tracking-widest text-slate-400">Employee</th>
                                            {isEditable && <th className="pb-2 w-10"></th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {pdi.paidOuts.map((po: any, idx: number) => (
                                            <tr key={idx}>
                                                <td className="py-2 pr-2">
                                                    {isEditable ? <input type="time" value={po.time} onChange={e => updateNestedField(idx, 'time', e.target.value)} className="w-full border border-slate-200 rounded-lg text-[10px] font-bold p-1.5" /> : <span className="font-bold text-slate-700">{po.time || '-'}</span>}
                                                </td>
                                                <td className="py-2 pr-2">
                                                    {isEditable ? <input type="text" value={po.description} onChange={e => updateNestedField(idx, 'description', e.target.value)} placeholder="Desc" className="w-full border border-slate-200 rounded-lg text-[10px] font-bold p-1.5" /> : <span className="font-bold text-slate-700">{po.description || '-'}</span>}
                                                </td>
                                                <td className="py-2 pr-2">
                                                    {isEditable ? <input type="number" step="0.01" value={po.amount} onChange={e => updateNestedField(idx, 'amount', parseFloat(e.target.value) || 0)} className="w-20 border border-slate-200 rounded-lg text-[10px] font-bold p-1.5" /> : <span className="font-bold text-slate-700 font-mono">${(po.amount || 0).toFixed(2)}</span>}
                                                </td>
                                                <td className="py-2 pr-2">
                                                    {isEditable ? <input type="text" value={po.employee} onChange={e => updateNestedField(idx, 'employee', e.target.value)} placeholder="Emp" className="w-full border border-slate-200 rounded-lg text-[10px] font-bold p-1.5" /> : <span className="font-bold text-slate-700">{po.employee || '-'}</span>}
                                                </td>
                                                {isEditable && (
                                                    <td className="py-2 pl-2">
                                                        <button onClick={(e) => { e.preventDefault(); removePaidOut(idx); }} className="text-rose-500 font-black hover:bg-rose-50 p-1.5 rounded-lg transition-colors">✕</button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {isEditable && (
                                <button onClick={(e) => { e.preventDefault(); addPaidOut(); }} className="mt-3 text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 py-1.5 px-3 rounded-lg hover:bg-slate-200 transition-colors">+ Add Row</button>
                            )}
                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-900">
                                <span>Total Paid Out</span>
                                <span className="text-[13px] font-mono">${paidOutsTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {(!isEditable || activeStep === 5) && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="border border-slate-100 rounded-2xl p-5 shadow-sm">
                            <h2 className="text-[12px] font-black uppercase text-slate-900 mb-4 flex items-center gap-2 tracking-widest"><div className="w-1.5 h-4 bg-primary-500 rounded-full"></div> Deposit Summary</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <InputRow label="Cash Deposit $" field="cashDeposit" showCalc={true} />
                                <InputRow label="Coin Amount $" field="coinDeposit" showCalc={true} />
                                <InputRow label="Check Input $" field="checkDeposit" showCalc={true} />
                                <InputRow label="Deposit Bag #" field="bagNumber" type="text" />
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-900">
                                <span>Total Deposit</span>
                                <span className="text-[14px] font-mono text-primary-600">${totalDeposit.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-2xl p-6 shadow-lg text-white">
                            <h2 className="text-[12px] font-black uppercase text-slate-300 mb-4 tracking-widest">Final Store Over/Short</h2>
                            <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                                <div><div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Register</div><div className="font-mono mt-1">${overShortRegister.toFixed(2)}</div></div>
                                <div><div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Safe</div><div className="font-mono mt-1">${safeOS.toFixed(2)}</div></div>
                                <div><div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Lottery</div><div className="font-mono mt-1">${lotteryOS.toFixed(2)}</div></div>
                            </div>
                            <div className={`pt-4 border-t border-slate-700 flex justify-between items-center ${Math.abs(totalStoreOS) > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                <span className="text-[14px] font-black uppercase tracking-widest">Total Store O/S</span>
                                <span className="text-[24px] font-black font-mono">${totalStoreOS.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {(!isEditable || activeStep === 6) && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="border border-slate-100 rounded-2xl p-5 shadow-sm">
                            <h2 className="text-[12px] font-black uppercase text-slate-900 mb-4 flex items-center gap-2 tracking-widest"><div className="w-1.5 h-4 bg-primary-500 rounded-full"></div> Signatures</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputRow label="Employee Signature" field="employeeSig" type="text" />
                                <InputRow label="Manager Signature" field="managerSig" type="text" />
                                <InputRow label="Signature Date" field="signDate" type="date" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isEditable && (
                <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-100">
                    <button
                        onClick={(e) => { e.preventDefault(); setActiveStep(Math.max(1, activeStep - 1)); }}
                        disabled={activeStep === 1}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-30 flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Previous
                    </button>
                    {activeStep < steps.length && (
                        <button
                            onClick={(e) => { e.preventDefault(); setActiveStep(activeStep + 1); }}
                            className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:bg-primary-50 px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
                        >
                            Next <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
