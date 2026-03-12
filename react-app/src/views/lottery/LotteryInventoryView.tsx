import { useState, useEffect, useMemo } from 'react';
import { useLotteryStore, LotteryBook } from '../../stores/useLotteryStore';
import { useAuditStore } from '../../stores/useAuditStore';
import BarcodeScanner from '../../components/BarcodeScanner';
import { generatePrintTable, printDocument, exportToCSV } from '../../utils/print';
import {
    PackagePlus,
    ArrowRightLeft,
    Search,
    AlertTriangle,
    Edit2,
    RotateCcw,
    BarChart3,
    X,
    Printer,
    Download
} from 'lucide-react';
// mock Timestamp from firebase if needed, or use Date.now()
const Timestamp = { now: () => new Date() };

export default function LotteryInventoryView() {
    const fetchGames = useLotteryStore(state => state.fetchGames);
    const fetchBooks = useLotteryStore(state => state.fetchBooks);
    const games = useLotteryStore(state => state.games);
    const books = useLotteryStore(state => state.books);
    const inStockBooks = useLotteryStore(state => state.inStockBooks());
    const returnedBooks = useLotteryStore(state => state.returnedBooks());

    const addGame = useLotteryStore(state => state.addGame);
    const receiveBook = useLotteryStore(state => state.receiveBook);
    const updateBook = useLotteryStore(state => state.updateBook);
    const activateBook = useLotteryStore(state => state.activateBook);
    const returnBook = useLotteryStore(state => state.returnBook);

    const logAction = useAuditStore(state => state.logAction);

    useEffect(() => {
        fetchGames();
        fetchBooks();
    }, [fetchGames, fetchBooks]);

    const [activeTab, setActiveTab] = useState<'receive' | 'assign' | 'return' | 'summary'>('receive');

    // --- Edit Form ---
    const [editingBook, setEditingBook] = useState<Partial<LotteryBook> | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // --- Receive Form ---
    const initialBookState = {
        gameNumber: '',
        gameName: '',
        ticketPrice: 0,
        ticketsPerBook: 0,
        bookNumber: '',
        ticketStart: 0,
        ticketEnd: 0,
        commissionRate: 5
    };
    const [newBook, setNewBook] = useState(initialBookState);

    const totalValue = (newBook.ticketPrice || 0) * (newBook.ticketsPerBook || 0);

    const lookupGame = () => {
        const existingGame = games.find(g => g.gameNumber === newBook.gameNumber);
        if (existingGame) {
            setNewBook((prev: any) => ({
                ...prev,
                gameName: existingGame.gameName,
                ticketPrice: existingGame.ticketPrice,
                ticketsPerBook: existingGame.ticketsPerBook,
                ticketStart: 0,
                ticketEnd: existingGame.ticketsPerBook,
                commissionRate: existingGame.commissionRate * 100
            }));
        }
    };

    const handleGameScanned = (scannedValue: string) => {
        setNewBook(prev => ({ ...prev, gameNumber: scannedValue }));
        // Delay lookup to next tick to allow state to update, or lookup directly
        const existingGame = games.find(g => g.gameNumber === scannedValue);
        if (existingGame) {
            setNewBook((prev: any) => ({
                ...prev,
                gameNumber: scannedValue,
                gameName: existingGame.gameName,
                ticketPrice: existingGame.ticketPrice,
                ticketsPerBook: existingGame.ticketsPerBook,
                ticketStart: 0,
                ticketEnd: existingGame.ticketsPerBook,
                commissionRate: existingGame.commissionRate * 100
            }));
        }
    };

    const handleReceive = async () => {
        if (!newBook.gameNumber || !newBook.bookNumber) return;

        try {
            let gameId = '';
            const existingGame = games.find(g => g.gameNumber === newBook.gameNumber);

            if (existingGame) {
                gameId = existingGame.id;
            } else {
                gameId = await addGame({
                    gameNumber: newBook.gameNumber,
                    gameName: newBook.gameName || 'Unknown Game',
                    ticketPrice: newBook.ticketPrice || 0,
                    ticketsPerBook: newBook.ticketsPerBook || 0,
                    commissionRate: (newBook.commissionRate || 5) / 100,
                    status: 'ACTIVE'
                });
            }

            if (!gameId) {
                alert('Error identifying game. Please try again.');
                return;
            }

            const tStart = newBook.ticketStart;
            const tEnd = newBook.ticketEnd || newBook.ticketsPerBook;

            await receiveBook({
                gameId: gameId,
                gameName: newBook.gameName,
                bookNumber: newBook.bookNumber,
                ticketStart: tStart,
                ticketEnd: tEnd,
                currentTicket: tStart,
                status: 'IN_STOCK',
                receivedDate: Timestamp.now()
            });

            await logAction(
                'lottery',
                'BOOK_RECEIVED',
                'lottery_book',
                {
                    gameNumber: newBook.gameNumber,
                    gameName: newBook.gameName,
                    bookNumber: newBook.bookNumber,
                    ticketStart: tStart,
                    ticketEnd: tEnd,
                    totalTickets: tEnd - tStart
                }
            );

            setNewBook(initialBookState);
            alert('Book received successfully!');
        } catch (e) {
            console.error(e);
            alert('Failed to receive book');
        }
    };

    // --- Assign Form ---
    const [selectedBookId, setSelectedBookId] = useState('');
    const [selectedRegister, setSelectedRegister] = useState('reg-1');
    const [slotNumber, setSlotNumber] = useState('');

    const startEdit = (book: LotteryBook) => {
        setEditingBook({ ...book });
        setIsEditing(true);
    };

    const saveEdit = async () => {
        if (!editingBook || !editingBook.id) return;

        try {
            await updateBook(editingBook.id, {
                bookNumber: editingBook.bookNumber,
                gameName: editingBook.gameName,
                ticketStart: editingBook.ticketStart,
                ticketEnd: editingBook.ticketEnd,
                currentTicket: editingBook.currentTicket
            });
            setIsEditing(false);
            setEditingBook(null);
            alert('Book updated successfully');
        } catch (e) {
            console.error(e);
            alert('Failed to update book');
        }
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setEditingBook(null);
    };

    // --- Lists ---
    const [booksQuery, setBooksQuery] = useState('');
    const filteredStock = useMemo(() => {
        return inStockBooks.filter((b: any) =>
            b.bookNumber.includes(booksQuery) ||
            b.gameName.toLowerCase().includes(booksQuery.toLowerCase())
        );
    }, [inStockBooks, booksQuery]);

    const handleAssignScan = (scannedValue: string) => {
        const book = inStockBooks.find(b => b.bookNumber === scannedValue);
        if (book) {
            setSelectedBookId(book.id);
        } else {
            alert(`Book #${scannedValue} not found in stock.`);
        }
    };

    const handleAssign = async () => {
        if (!selectedBookId || !selectedRegister) return;
        try {
            const book = books.find(b => b.id === selectedBookId);
            await activateBook(selectedBookId, selectedRegister, slotNumber);

            if (book) {
                await logAction(
                    'lottery',
                    'BOOK_ACTIVATED',
                    'lottery_book',
                    {
                        bookNumber: book.bookNumber,
                        gameName: book.gameName,
                        register: selectedRegister,
                        slotNumber: slotNumber || 'N/A'
                    },
                    selectedBookId
                );
            }

            setSelectedBookId('');
            setSlotNumber('');
            alert('Book assigned successfully!');
        } catch (e) {
            alert('Failed to assign book');
        }
    };

    // --- Return logic ---
    const [returnNotes, setReturnNotes] = useState('');
    const [selectedReturnBook, setSelectedReturnBook] = useState<LotteryBook | null>(null);
    const [returnType, setReturnType] = useState<'FULL' | 'PARTIAL'>('FULL');
    const [returnStartTicket, setReturnStartTicket] = useState(0);

    const openReturnModal = (book: LotteryBook) => {
        setSelectedReturnBook(book);
        setReturnType('FULL');
        setReturnStartTicket(book.currentTicket);
        setReturnNotes('');
    };

    const closeReturnModal = () => {
        setSelectedReturnBook(null);
    };

    const handleReturnScan = (scannedValue: string) => {
        const book = books
            .filter(b => b.status === 'IN_STOCK' || b.status === 'PENDING_SETTLEMENT')
            .find(b => b.bookNumber === scannedValue);

        if (book) {
            openReturnModal(book);
        } else {
            alert(`Book #${scannedValue} not found or not eligible for return.`);
        }
    };

    const computedReturnCount = useMemo(() => {
        if (!selectedReturnBook) return 0;
        const start = returnType === 'FULL' ? selectedReturnBook.ticketStart : returnStartTicket;
        const end = selectedReturnBook.ticketEnd;
        if (start > end) return 0;
        return end - start;
    }, [selectedReturnBook, returnType, returnStartTicket]);

    const computedCreditValue = useMemo(() => {
        if (!selectedReturnBook) return 0;
        const game = games.find(g => g.id === selectedReturnBook.gameId);
        if (!game) return 0;
        return computedReturnCount * game.ticketPrice;
    }, [selectedReturnBook, games, computedReturnCount]);

    const handleReturnSubmit = async () => {
        if (!selectedReturnBook) return;
        try {
            await returnBook(selectedReturnBook.id, {
                returnType: returnType,
                startTicket: returnType === 'FULL' ? selectedReturnBook.ticketStart : returnStartTicket,
                endTicket: selectedReturnBook.ticketEnd,
                ticketCount: computedReturnCount,
                creditAmount: computedCreditValue,
                reason: returnNotes
            });

            await logAction(
                'lottery',
                'BOOK_RETURNED',
                'lottery_book',
                {
                    bookNumber: selectedReturnBook.bookNumber,
                    gameName: selectedReturnBook.gameName,
                    returnType: returnType,
                    ticketCount: computedReturnCount,
                    creditAmount: computedCreditValue,
                    reason: returnNotes
                },
                selectedReturnBook.id
            );

            alert('Book returned successfully');
            closeReturnModal();
        } catch (e) {
            alert('Failed to return book');
        }
    };

    // --- Summary logic ---
    const inventorySummary = useMemo(() => {
        const summary: Record<string, any> = {};
        books.forEach(book => {
            if (!summary[book.gameName]) {
                summary[book.gameName] = {
                    name: book.gameName,
                    inStock: 0,
                    active: 0,
                    settled: 0,
                    returned: 0,
                    total: 0
                };
            }
            const s = summary[book.gameName];
            if (book.status === 'IN_STOCK') s.inStock++;
            else if (book.status === 'ACTIVE') s.active++;
            else if (book.status === 'SETTLED') s.settled++;
            else if (book.status === 'RETURNED') s.returned++;
            s.total++;
        });
        return Object.values(summary);
    }, [books]);

    const handlePrintSummary = () => {
        const headers = ['Game Name', 'In Stock', 'Active', 'Settled', 'Returned', 'Total'];
        const rows = inventorySummary.map(s => [
            s.name,
            s.inStock.toString(),
            s.active.toString(),
            s.settled.toString(),
            s.returned.toString(),
            s.total.toString()
        ]);

        const html = generatePrintTable(headers, rows, {
            title: 'Lottery Inventory Summary',
            orientation: 'portrait',
            includeTimestamp: true,
            includeLocation: true
        });

        printDocument(html);
    };

    const handleExportSummary = () => {
        const headers = ['Game Name', 'In Stock', 'Active', 'Settled', 'Returned', 'Total'];
        const rows = inventorySummary.map(s => [
            s.name,
            s.inStock.toString(),
            s.active.toString(),
            s.settled.toString(),
            s.returned.toString(),
            s.total.toString()
        ]);

        const today = new Date().toISOString().split('T')[0];
        exportToCSV(headers, rows, `lottery-inventory-${today}.csv`);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12 w-full p-6 text-[11px]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black font-display text-slate-900 uppercase italic tracking-tighter">Inventory Control</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px] mt-1">Receive & Activate Stock</p>
                </div>

                <div className="bg-slate-100 p-1 rounded-xl flex items-center">
                    <button
                        onClick={() => setActiveTab('receive')}
                        className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${activeTab === 'receive' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Receive
                    </button>
                    <button
                        onClick={() => setActiveTab('assign')}
                        className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${activeTab === 'assign' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Activate
                    </button>
                    <button
                        onClick={() => setActiveTab('return')}
                        className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${activeTab === 'return' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Return
                    </button>
                    <button
                        onClick={() => setActiveTab('summary')}
                        className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${activeTab === 'summary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Summary
                    </button>
                </div>
            </div>

            {/* Receive Panel */}
            {activeTab === 'receive' && (
                <div className="space-y-6">
                    <div className="bg-white/70 backdrop-blur-md rounded-3xl border border-slate-200 shadow-sm p-8">
                        <h3 className="text-lg font-bold font-display text-slate-900 uppercase italic flex items-center gap-2 mb-6">
                            <PackagePlus className="w-5 h-5 text-primary-600" />
                            Scan New Delivery
                        </h3>

                        <div className="mb-6">
                            <BarcodeScanner
                                buttonText="📷 Scan Game Number"
                                onScanned={handleGameScanned}
                            />
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                            {/* Manual Entry Form */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Game #</label>
                                        <input
                                            type="text"
                                            value={newBook.gameNumber}
                                            onChange={(e) => setNewBook({ ...newBook, gameNumber: e.target.value })}
                                            onBlur={lookupGame}
                                            placeholder="000"
                                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[11px] text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Game Name</label>
                                        <input
                                            type="text"
                                            value={newBook.gameName}
                                            onChange={(e) => setNewBook({ ...newBook, gameName: e.target.value })}
                                            placeholder="e.g. Lucky 7s"
                                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[11px] text-slate-900 outline-none focus:border-primary-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Pack #</label>
                                        <input
                                            type="text"
                                            value={newBook.bookNumber}
                                            onChange={(e) => setNewBook({ ...newBook, bookNumber: e.target.value })}
                                            placeholder="Scan Pack Barcode"
                                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[11px] text-slate-900 outline-none focus:border-primary-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Pack Cost ($)</label>
                                        <div className="p-3 rounded-xl bg-slate-100 font-bold text-slate-500 border border-slate-200 text-[11px]">
                                            ${totalValue.toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Price</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                            <input
                                                type="number"
                                                value={newBook.ticketPrice === 0 ? '' : newBook.ticketPrice}
                                                onChange={(e) => setNewBook({ ...newBook, ticketPrice: parseFloat(e.target.value) || 0 })}
                                                className="w-full pl-6 p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[11px] text-slate-900 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Tix / Pack</label>
                                        <input
                                            type="number"
                                            value={newBook.ticketsPerBook === 0 ? '' : newBook.ticketsPerBook}
                                            onChange={(e) => setNewBook({ ...newBook, ticketsPerBook: parseInt(e.target.value) || 0 })}
                                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[11px] text-slate-900 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Comm %</label>
                                        <div className="relative">
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                            <input
                                                type="number"
                                                value={newBook.commissionRate === 0 ? '' : newBook.commissionRate}
                                                onChange={(e) => setNewBook({ ...newBook, commissionRate: parseFloat(e.target.value) || 0 })}
                                                className="w-full p-3 pr-8 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[11px] text-slate-900 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Begin #</label>
                                        <input
                                            type="number"
                                            value={newBook.ticketStart}
                                            onChange={(e) => setNewBook({ ...newBook, ticketStart: parseInt(e.target.value) || 0 })}
                                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[11px] text-slate-900 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">End #</label>
                                        <input
                                            type="number"
                                            value={newBook.ticketEnd}
                                            onChange={(e) => setNewBook({ ...newBook, ticketEnd: parseInt(e.target.value) || 0 })}
                                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[11px] text-slate-900 outline-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleReceive}
                                    disabled={!newBook.gameNumber || !newBook.bookNumber}
                                    className="w-full py-4 rounded-[1.5rem] bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] mt-4 hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    Confirm Receive
                                </button>
                            </div>

                            {/* Recent Activity Feed */}
                            <div className="border-l border-slate-100 pl-6 hidden xl:block">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Stock Overview</h4>
                                <div className="space-y-2">
                                    {inStockBooks.map((book: any) => (
                                        <div key={book.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl group border border-slate-100">
                                            <div>
                                                <div className="font-bold text-slate-900 text-[11px]">#{book.bookNumber}</div>
                                                <div className="text-[9px] text-slate-500 uppercase">{book.gameName}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-[9px] font-bold uppercase">In Stock</span>
                                                <button onClick={() => startEdit(book)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all text-slate-500">
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditing && editingBook && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full space-y-6">
                        <h3 className="text-xl font-black font-display text-slate-900 italic uppercase">Edit Book Details</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Book / Pack #</label>
                                <input type="text" value={editingBook.bookNumber || ''} onChange={(e) => setEditingBook({ ...editingBook, bookNumber: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[11px] text-slate-900 outline-none" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Game Name</label>
                                <input type="text" value={editingBook.gameName || ''} onChange={(e) => setEditingBook({ ...editingBook, gameName: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[11px] text-slate-900 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Begin #</label>
                                    <input type="number" value={editingBook.currentTicket || 0} onChange={(e) => setEditingBook({ ...editingBook, currentTicket: parseInt(e.target.value) || 0 })} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[11px] text-slate-900 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">End #</label>
                                    <input type="number" value={editingBook.ticketEnd || 0} onChange={(e) => setEditingBook({ ...editingBook, ticketEnd: parseInt(e.target.value) || 0 })} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[11px] text-slate-900 outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button onClick={cancelEdit} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 text-[11px] tracking-widest uppercase rounded-xl transition-all">Cancel</button>
                            <button onClick={saveEdit} className="flex-1 py-3 font-bold bg-primary-600 text-[11px] tracking-widest uppercase text-white rounded-xl shadow-lg shadow-primary-500/30 hover:bg-primary-700 transition-all">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Panel */}
            {activeTab === 'assign' && (
                <div className="space-y-6">
                    <div className="bg-white/70 backdrop-blur-md rounded-3xl border border-slate-200 shadow-sm p-8">
                        <h3 className="text-lg font-bold font-display text-slate-900 uppercase italic flex items-center gap-2 mb-6">
                            <ArrowRightLeft className="w-5 h-5 text-primary-600" />
                            Assign to Register
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Select Book from Inventory</label>

                                    <div className="mb-2">
                                        <BarcodeScanner
                                            buttonText="Scan Book to Select"
                                            onScanned={handleAssignScan}
                                            stopOnScan={true}
                                        />
                                    </div>

                                    <select value={selectedBookId} onChange={(e) => setSelectedBookId(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[11px] text-slate-900 outline-none">
                                        <option value="">Select in-stock book...</option>
                                        {inStockBooks.map((book: any) => (
                                            <option key={book.id} value={book.id}>
                                                #{book.bookNumber} - {book.gameName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Assign To Location</label>
                                    <select value={selectedRegister} onChange={(e) => setSelectedRegister(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[11px] text-slate-900 outline-none">
                                        <option value="reg-1">Register 1</option>
                                        <option value="reg-2">Register 2</option>
                                        <option value="bin-1">Counter Bin 1</option>
                                        <option value="machine-1">Vending Machine</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Slot Number (Optional)</label>
                                    <input
                                        type="text"
                                        value={slotNumber}
                                        onChange={(e) => setSlotNumber(e.target.value)}
                                        placeholder="e.g. A-14, 05, etc."
                                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[11px] text-slate-900 outline-none"
                                    />
                                </div>

                                <button onClick={handleAssign} disabled={!selectedBookId} className="w-full py-4 rounded-[1.5rem] bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] mt-4 hover:bg-black transition-all flex items-center justify-center disabled:opacity-50">
                                    Activate Book
                                </button>
                            </div>

                            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                                <div className="flex items-start gap-4">
                                    <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-[11px] uppercase tracking-wider text-amber-900">Activation Note</h4>
                                        <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                                            Once activated, this book will immediately appear in the Daily Reconciliation for sales tracking.
                                            Ensure the book is physically placed in the correct slot.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Inventory List */}
                    <div className="bg-white/70 backdrop-blur-md rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-[11px]">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">Back Room Inventory</h3>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={booksQuery}
                                    onChange={(e) => setBooksQuery(e.target.value)}
                                    type="text"
                                    placeholder="Search books..."
                                    className="pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-primary-100 w-64"
                                />
                            </div>
                        </div>
                        <table className="w-full text-[11px] text-left">
                            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Book #</th>
                                    <th className="px-6 py-4">Game</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Start Ticket</th>
                                    <th className="px-6 py-4 text-right">Received</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredStock.map(book => (
                                    <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-slate-900">#{book.bookNumber}</td>
                                        <td className="px-6 py-4 font-bold">{book.gameName}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full bg-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider">In Stock</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-500">{book.ticketStart}</td>
                                        <td className="px-6 py-4 text-right text-[11px] text-slate-500">
                                            {/* @ts-ignore - mock timestamp format */}
                                            {book.receivedDate?.toDate ? book.receivedDate.toDate().toLocaleDateString() : new Date().toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                                {filteredStock.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs uppercase tracking-widest">No stock matches filter</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Return Panel */}
            {activeTab === 'return' && (
                <div className="space-y-6">
                    <div className="bg-white/70 backdrop-blur-md rounded-3xl border border-slate-200 shadow-sm p-8">
                        <h3 className="text-lg font-bold font-display text-slate-900 uppercase italic flex items-center gap-2 mb-6">
                            <RotateCcw className="w-5 h-5 text-rose-600" />
                            Return Books to Lottery Office
                        </h3>

                        <div className="mb-6">
                            <BarcodeScanner
                                buttonText="Scan Book to Return"
                                onScanned={handleReturnScan}
                                stopOnScan={true}
                            />
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-100">
                            <table className="w-full text-[11px] text-left">
                                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Book #</th>
                                        <th className="px-6 py-4">Game</th>
                                        <th className="px-6 py-4">Current Status</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {books.filter(b => b.status === 'IN_STOCK' || b.status === 'PENDING_SETTLEMENT').map(book => (
                                        <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-mono font-bold text-slate-900">#{book.bookNumber}</td>
                                            <td className="px-6 py-4 font-bold">{book.gameName}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wider">{book.status.replace('_', ' ')}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => openReturnModal(book)} className="px-4 py-2 bg-rose-50 text-rose-600 text-[11px] uppercase tracking-widest font-black rounded-lg hover:bg-rose-100 transition-colors">Return Pack</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {books.filter(b => b.status === 'IN_STOCK' || b.status === 'PENDING_SETTLEMENT').length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs uppercase tracking-widest">No returnable stock available</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Return Details Modal */}
                        {selectedReturnBook && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                                <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 uppercase italic">Return Details</h3>
                                            <p className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mt-1">Processing return for <span className="font-mono text-slate-900">#{selectedReturnBook.bookNumber}</span></p>
                                        </div>
                                        <button onClick={closeReturnModal} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="p-8 space-y-6">
                                        {/* Return Type */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <label className="cursor-pointer">
                                                <input type="radio" checked={returnType === 'FULL'} onChange={() => setReturnType('FULL')} className="peer sr-only" />
                                                <div className="p-4 rounded-xl border-2 border-slate-100 peer-checked:border-rose-500 peer-checked:bg-rose-50 transition-all text-center">
                                                    <span className="block font-black uppercase text-[11px] text-slate-900 peer-checked:text-rose-700">Full Pack</span>
                                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-1 block">Unsold / Damaged</span>
                                                </div>
                                            </label>
                                            <label className="cursor-pointer">
                                                <input type="radio" checked={returnType === 'PARTIAL'} onChange={() => setReturnType('PARTIAL')} className="peer sr-only" />
                                                <div className="p-4 rounded-xl border-2 border-slate-100 peer-checked:border-rose-500 peer-checked:bg-rose-50 transition-all text-center">
                                                    <span className="block font-black uppercase text-[11px] text-slate-900 peer-checked:text-rose-700">Partial Pack</span>
                                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-1 block">Remaining Tickets</span>
                                                </div>
                                            </label>
                                        </div>

                                        {/* Ticket Range */}
                                        {returnType === 'PARTIAL' && (
                                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Returning From Ticket #</label>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="number"
                                                        value={returnStartTicket}
                                                        onChange={(e) => setReturnStartTicket(parseInt(e.target.value) || 0)}
                                                        className="flex-1 p-3 rounded-xl border border-slate-200 font-bold text-[11px] text-slate-900 outline-none"
                                                    />
                                                    <span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest font-mono">to {selectedReturnBook.ticketEnd}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-bold tracking-widest uppercase mt-3">
                                                    Returning <span className="font-black text-rose-600">{computedReturnCount}</span> tickets
                                                </p>
                                            </div>
                                        )}

                                        {/* Credit Calculation */}
                                        <div className="flex items-center justify-between p-6 bg-rose-50 rounded-2xl border border-rose-100">
                                            <span className="text-[11px] font-black text-rose-700 uppercase tracking-widest">Est. Credit Value</span>
                                            <span className="text-3xl font-black font-mono tracking-tighter text-rose-600">${computedCreditValue.toFixed(2)}</span>
                                        </div>

                                        {/* Notes */}
                                        <div>
                                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Reason / Notes</label>
                                            <input
                                                type="text"
                                                value={returnNotes}
                                                onChange={(e) => setReturnNotes(e.target.value)}
                                                placeholder="e.g. Game Ended, Damaged, Theft"
                                                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[11px] text-slate-900 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                                        <button onClick={closeReturnModal} className="flex-1 py-4 font-black uppercase tracking-widest text-[11px] text-slate-500 hover:bg-white rounded-xl transition-all">Cancel</button>
                                        <button onClick={handleReturnSubmit} className="flex-1 py-4 font-black uppercase tracking-widest text-[11px] bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-500/30 hover:bg-rose-700 hover:-translate-y-0.5 transition-all">
                                            Confirm Return
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Returned History */}
                    <div className="bg-white/70 backdrop-blur-md rounded-3xl border border-slate-200 shadow-sm p-6">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Recently Returned Packs</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {returnedBooks.map((book: any) => (
                                <div key={book.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-sm transition-all">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-mono font-black text-[11px] text-slate-900">#{book.bookNumber}</span>
                                        <span className="text-[9px] font-black tracking-widest text-rose-500 uppercase">Returned</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{book.gameName}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Panel */}
            {activeTab === 'summary' && (
                <div className="space-y-6">
                    <div className="bg-white/70 backdrop-blur-md rounded-3xl border border-slate-200 shadow-sm p-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <h3 className="text-lg font-bold font-display text-slate-900 uppercase italic flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-emerald-600" />
                                Total Inventory Summary
                            </h3>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrintSummary}
                                    className="px-4 py-3 bg-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-700 rounded-xl hover:bg-slate-200 flex items-center gap-2 transition-colors"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print
                                </button>
                                <button
                                    onClick={handleExportSummary}
                                    className="px-4 py-3 bg-emerald-100 text-emerald-700 text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-emerald-200 flex items-center gap-2 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-100">
                            <table className="w-full text-[11px] text-left">
                                <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Game Name</th>
                                        <th className="px-6 py-4 text-center">In Stock</th>
                                        <th className="px-6 py-4 text-center">Active</th>
                                        <th className="px-6 py-4 text-center">Settled</th>
                                        <th className="px-6 py-4 text-center">Returned</th>
                                        <th className="px-6 py-4 text-right">Grand Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {inventorySummary.map(s => (
                                        <tr key={s.name} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                                            <td className="px-6 py-4 text-center font-mono text-slate-500">{s.inStock}</td>
                                            <td className="px-6 py-4 text-center font-mono text-emerald-600 font-bold">{s.active}</td>
                                            <td className="px-6 py-4 text-center font-mono text-slate-500">{s.settled}</td>
                                            <td className="px-6 py-4 text-center font-mono text-rose-400">{s.returned}</td>
                                            <td className="px-6 py-4 text-right font-mono font-black text-slate-900">{s.total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50">
                                    <tr className="font-black text-slate-900 uppercase text-[10px] tracking-widest">
                                        <td className="px-6 py-4">Company Totals</td>
                                        <td className="px-6 py-4 text-center">{inventorySummary.reduce((sum, s) => sum + s.inStock, 0)}</td>
                                        <td className="px-6 py-4 text-center text-emerald-600">{inventorySummary.reduce((sum, s) => sum + s.active, 0)}</td>
                                        <td className="px-6 py-4 text-center">{inventorySummary.reduce((sum, s) => sum + s.settled, 0)}</td>
                                        <td className="px-6 py-4 text-center text-rose-400">{inventorySummary.reduce((sum, s) => sum + s.returned, 0)}</td>
                                        <td className="px-6 py-4 text-right text-lg tracking-tighter italic font-mono">
                                            {inventorySummary.reduce((sum, s) => sum + s.total, 0)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">In Stock</p>
                                <p className="text-3xl font-black font-mono tracking-tighter text-slate-900">{inventorySummary.reduce((sum, s) => sum + s.inStock, 0)}</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm text-center">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Active</p>
                                <p className="text-3xl font-black font-mono tracking-tighter text-emerald-600">{inventorySummary.reduce((sum, s) => sum + s.active, 0)}</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Settled</p>
                                <p className="text-3xl font-black font-mono tracking-tighter text-slate-900">{inventorySummary.reduce((sum, s) => sum + s.settled, 0)}</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-100 shadow-sm text-center">
                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2">Returned</p>
                                <p className="text-3xl font-black font-mono tracking-tighter text-rose-600">{inventorySummary.reduce((sum, s) => sum + s.returned, 0)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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
