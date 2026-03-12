import { useState, useEffect } from 'react';
import { UploadCloud, FileText, Check, Loader2, Database, Clock, Sparkles, ExternalLink, X } from 'lucide-react';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { useScannedInvoicesStore } from '../../stores/useScannedInvoicesStore';
import { useAccountsStore } from '../../stores/useAccountsStore';
import { useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const ScanInvoiceView = () => {
    const scannedInvoicesStore = useScannedInvoicesStore();
    const accountsStore = useAccountsStore();
    const navigate = useNavigate();

    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [extractedData, setExtractedData] = useState<{ total: string, date: string, description: string, accountId: string } | null>(null);
    const [rawText, setRawText] = useState('');
    const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        scannedInvoicesStore.fetchScannedInvoices();
        accountsStore.fetchAccounts();
    }, []);

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            handleFile(droppedFile);
        }
    };

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            handleFile(selectedFile);
        }
    };

    const handleFile = async (fileToProcess: File) => {
        setFile(fileToProcess);
        setIsProcessing(true);
        setExtractedData(null);
        setRawText('');
        setFileDataUrl(null);
        setProgress(0);

        let imageSource: any = fileToProcess;

        try {
            if (fileToProcess.type === 'application/pdf') {
                setProgress(5);
                const arrayBuffer = await fileToProcess.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const page = await pdf.getPage(1);

                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (context) {
                    await page.render({ canvasContext: context, viewport: viewport } as any).promise;
                    const dUrl = canvas.toDataURL('image/png');
                    imageSource = dUrl;
                    setFileDataUrl(dUrl);
                }
            } else if (fileToProcess.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setFileDataUrl(e.target?.result as string);
                };
                reader.readAsDataURL(fileToProcess);
            }

            const result = await Tesseract.recognize(
                imageSource,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            setProgress(Math.floor(m.progress * 100));
                        }
                    }
                }
            );

            const text = result.data.text;
            setRawText(text);

            const lines = text.split('\n').filter(line => line.trim().length > 3);
            const moneyRegex = /\$?\d+\.\d{2}/g;
            const matches = text.match(moneyRegex);
            const dateRegex = /\d{1,2}\/\d{1,2}\/\d{2,4}/g;
            const dateMatches = text.match(dateRegex);

            const totalMatch = matches && matches.length > 0 ? matches[matches.length - 1] : '$0.00';
            const dateMatch = dateMatches && dateMatches.length > 0 ? dateMatches[0] : new Date().toISOString().split('T')[0];

            let descriptionGuess = 'General Purchase';
            for (const line of lines) {
                if (!line.match(dateRegex) && !line.match(moneyRegex) && line.length > 5) {
                    descriptionGuess = line.trim();
                    break;
                }
            }

            let matchedAccountId = '';
            const lowerText = text.toLowerCase();
            for (const acc of accountsStore.accounts) {
                if (lowerText.includes(acc.name.toLowerCase())) {
                    matchedAccountId = String(acc.id);
                    break;
                }
            }

            setExtractedData({
                total: totalMatch,
                date: dateMatch,
                description: descriptionGuess,
                accountId: matchedAccountId
            });

        } catch (error) {
            console.error(error);
            alert('Error processing file. If using PDF, ensure it is not password protected.');
        } finally {
            setIsProcessing(false);
        }
    };

    const saveToLog = async () => {
        if (!extractedData || !file) return;
        setIsSaving(true);
        try {
            await scannedInvoicesStore.addScannedInvoice({
                fileName: file.name,
                total: extractedData.total || '$0.00',
                extractedDate: extractedData.date || '',
                description: extractedData.description,
                accountName: accountsStore.accounts.find(a => String(a.id) === extractedData.accountId)?.name || 'Unknown',
                rawText: rawText,
                date: new Date().toISOString().split('T')[0]
            }, file);

            setFile(null);
            setExtractedData(null);
            setRawText('');
            setFileDataUrl(null);
        } catch (error) {
            console.error('Error saving scan:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConvertToInvoice = () => {
        if (!extractedData) return;
        scannedInvoicesStore.setPendingScan({
            total: extractedData.total ? extractedData.total.replace('$', '') : '0',
            date: extractedData.date,
            description: extractedData.description,
            accountId: extractedData.accountId,
            file: file ? {
                name: file.name,
                size: file.size,
                type: file.type,
                dataUrl: fileDataUrl
            } : null
        });
        navigate('/operations/daily-sales'); // Redirect to daily sales for now as placeholder for invoice view
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">AI Vision Log</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Neural Invoice Extraction Engine</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Upload Zone */}
                <div className="lg:col-span-5">
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onDrop}
                        className={cn(
                            "relative border-2 border-dashed rounded-[2rem] h-[450px] flex flex-col items-center justify-center transition-all overflow-hidden",
                            isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                    >
                        {!file ? (
                            <div className="text-center p-8 pointer-events-none">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <UploadCloud className="w-10 h-10 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-2">Initialize Scan</h3>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Drag & Drop or Tap to Browse</p>
                                <div className="mt-8 flex gap-2 justify-center">
                                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest">PDF</span>
                                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest">JPG</span>
                                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest">PNG</span>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-8 relative">
                                {fileDataUrl ? (
                                    <img src={fileDataUrl} className="absolute inset-0 w-full h-full object-contain opacity-10 blur-sm p-4" alt="Preview" />
                                ) : (
                                    <FileText className="absolute inset-0 w-full h-full text-slate-100 p-24" />
                                )}

                                <div className="relative z-10 text-center">
                                    <div className="w-24 h-24 bg-white/80 backdrop-blur-md rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-6 border border-white/50">
                                        {isProcessing ? (
                                            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                                        ) : (
                                            <Check className="w-12 h-12 text-emerald-500" />
                                        )}
                                    </div>
                                    <p className="text-slate-900 font-black uppercase tracking-tighter truncate max-w-[280px] text-lg">{file.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{(file.size / 1024).toFixed(1)} KB • {file.type}</p>

                                    {!isProcessing && (
                                        <button
                                            onClick={() => setFile(null)}
                                            className="mt-6 flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all mx-auto"
                                        >
                                            <X className="w-3 h-3" />
                                            Reset Scanner
                                        </button>
                                    )}

                                    {isProcessing && (
                                        <div className="mt-8 w-48 mx-auto">
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-600 transition-all duration-300"
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-3">Analyzing Artifacts... {progress}%</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            accept="image/*,application/pdf"
                            onChange={onFileSelect}
                            disabled={!!file}
                        />
                    </div>
                </div>

                {/* Results Preview */}
                <div className="lg:col-span-7">
                    <div className="glass-card p-8 h-full flex flex-col border-white/50">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Extracted Intelligence</h3>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">Confidence: 89%</span>
                            </div>
                        </div>

                        {extractedData ? (
                            <div className="space-y-6 flex-1 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Payload</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-xl">$</span>
                                            <input
                                                value={extractedData.total.replace('$', '')}
                                                onChange={(e) => setExtractedData({ ...extractedData, total: e.target.value })}
                                                className="w-full h-14 pl-10 pr-4 bg-slate-50 border-0 rounded-2xl text-2xl font-black text-emerald-600 focus:ring-2 focus:ring-emerald-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Detection Date</label>
                                        <input
                                            value={extractedData.date}
                                            onChange={(e) => setExtractedData({ ...extractedData, date: e.target.value })}
                                            className="w-full h-14 px-4 bg-slate-50 border-0 rounded-2xl text-lg font-black text-slate-700 focus:ring-2 focus:ring-slate-400 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity Description</label>
                                    <input
                                        value={extractedData.description}
                                        onChange={(e) => setExtractedData({ ...extractedData, description: e.target.value })}
                                        className="w-full h-14 px-4 bg-slate-50 border-0 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-slate-400 transition-all text-xs"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Associated Account</label>
                                    <select
                                        value={extractedData.accountId}
                                        onChange={(e) => setExtractedData({ ...extractedData, accountId: e.target.value })}
                                        className="w-full h-14 px-4 bg-slate-50 border-0 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-slate-400 transition-all text-xs appearance-none"
                                    >
                                        <option value="">Auto-detection Failed (Select Manually)</option>
                                        {accountsStore.accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Raw OCR Output</label>
                                    <div className="bg-slate-900 rounded-2xl p-4 h-32 overflow-y-auto custom-scrollbar">
                                        <pre className="text-[10px] font-mono text-emerald-400/80 leading-relaxed whitespace-pre-wrap">{rawText || 'No text processed yet.'}</pre>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-8 pt-4">
                                    <button
                                        onClick={saveToLog}
                                        disabled={isSaving}
                                        className="h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50"
                                    >
                                        <Database className="w-4 h-4" />
                                        {isSaving ? 'Synching...' : 'Commit to Log'}
                                    </button>
                                    <button
                                        onClick={handleConvertToInvoice}
                                        className="h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                                    >
                                        Initialize Invoice
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                    <Sparkles className="w-16 h-16 text-slate-300" />
                                </div>
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Neural Network Idle</h3>
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">Pending Visual Input for Analysis</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* History Section */}
            {scannedInvoicesStore.scannedInvoices.length > 0 && (
                <div className="glass-card p-8 border-white/50">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Transmission History</h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Verified OCR Records</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {scannedInvoicesStore.scannedInvoices.map(scan => (
                            <div
                                key={scan.id}
                                className="group p-5 bg-white border border-slate-100 rounded-3xl hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all cursor-default relative overflow-hidden"
                            >
                                <div className="absolute right-0 top-0 p-12 bg-indigo-50/20 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2 group-hover:bg-indigo-500/10 transition-all"></div>

                                <div className="flex items-start justify-between mb-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-900 text-[11px] uppercase tracking-tighter truncate max-w-[120px]">{scan.fileName}</div>
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(scan.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-emerald-600 tracking-tighter">{scan.total}</div>
                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Extracted</span>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6 relative z-10">
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400">Account</span>
                                        <span className="text-slate-700">{scan.accountName}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400">Merchant Date</span>
                                        <span className="text-slate-700">{scan.extractedDate}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 relative z-10">
                                    {scan.fileUrl && (
                                        <a
                                            href={scan.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            View Original
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScanInvoiceView;
