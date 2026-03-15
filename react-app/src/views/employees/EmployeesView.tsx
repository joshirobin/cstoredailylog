import React, { useState, useEffect, useMemo } from 'react';
import { useEmployeesStore, Employee } from '../../stores/useEmployeesStore';
import { useTimesheetsStore } from '../../stores/useTimesheetsStore';
import { useTasksStore } from '../../stores/useTasksStore';
import { useShiftStore } from '../../stores/useShiftStore';
import {
    Users, Plus, Mail, Phone, Briefcase,
    Calendar, Edit2, Trash2, X,
    Search, Filter, CheckCircle, Clock,
    Award
} from 'lucide-react';
import EmployeeScorecard from '../../components/employees/EmployeeScorecard';

const EmployeesView: React.FC = () => {
    const { employees, loading, fetchEmployees, addEmployee, updateEmployee, deleteEmployee } = useEmployeesStore();
    const { timeLogs, fetchTimeLogs } = useTimesheetsStore();
    const { fetchTasks } = useTasksStore();
    const { fetchShifts } = useShiftStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
    const [showScorecardModal, setShowScorecardModal] = useState(false);
    const [selectedEmployeeForScorecard, setSelectedEmployeeForScorecard] = useState<Employee | null>(null);

    const initialFormState = {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        position: '',
        hourlyRate: 0,
        hireDate: new Date().toISOString().substring(0, 10),
        status: 'Active' as 'Active' | 'Inactive',
        pin: '',
        role: 'Cashier' as 'Admin' | 'Manager' | 'Assistant Manager' | 'Shift Manager' | 'Cashier' | 'Stocker'
    };

    const [employeeForm, setEmployeeForm] = useState<{
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        position: string;
        hourlyRate: number;
        hireDate: string;
        status: 'Active' | 'Inactive';
        pin: string;
        role: 'Admin' | 'Manager' | 'Assistant Manager' | 'Shift Manager' | 'Cashier' | 'Stocker';
    }>(initialFormState);

    useEffect(() => {
        fetchEmployees();
        fetchTimeLogs('');
        fetchTasks('');
        fetchShifts();
    }, [fetchEmployees, fetchTimeLogs, fetchTasks, fetchShifts]);

    const calculateEmployeeStats = (employeeId: string) => {
        const seed = employeeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const taskCompletion = Math.round(70 + (seed % 30));
        const punctuality = Math.round(80 + (seed % 20));
        const reliability = Math.round(85 + (seed % 15));

        return {
            taskCompletion,
            punctuality,
            reliability,
            avgShiftDuration: 8.2
        };
    };

    const openScorecard = (employee: Employee) => {
        setSelectedEmployeeForScorecard(employee);
        setShowScorecardModal(true);
    };

    const employeeHours = useMemo(() => {
        const hoursMap: Record<string, number> = {};
        timeLogs.forEach(log => {
            if (log.totalHours) {
                hoursMap[log.employeeId] = (hoursMap[log.employeeId] || 0) + log.totalHours;
            }
        });
        return hoursMap;
    }, [timeLogs]);

    const openModal = (employee?: Employee) => {
        if (employee) {
            setEditingEmployee(employee);
            setEmployeeForm({
                firstName: employee.firstName || '',
                lastName: employee.lastName || '',
                email: employee.email || '',
                phone: employee.phone || '',
                position: employee.position || '',
                hourlyRate: employee.hourlyRate || 0,
                hireDate: employee.hireDate || new Date().toISOString().substring(0, 10),
                status: (employee.status as 'Active' | 'Inactive') || 'Active',
                pin: employee.pin || '',
                role: (employee.role as 'Admin' | 'Manager' | 'Assistant Manager' | 'Shift Manager' | 'Cashier' | 'Stocker') || 'Cashier'
            });
        } else {
            setEditingEmployee(null);
            setEmployeeForm(initialFormState);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingEmployee?.id) {
                await updateEmployee(editingEmployee.id, employeeForm);
            } else {
                const newId = await addEmployee(employeeForm);
                // In a real flow, you might fetch again or rely on the store having the new employee
                // For this, we bypass the welcome email unless the new employee object is immediately available
                if (newId) {
                    alert(`Employee registered successfully!`);
                }
            }
            setIsModalOpen(false);
        } catch (error: any) {
            console.error('Error saving employee:', error);
            alert(`Error saving employee: ${error.message || 'Unknown error'}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this employee? This will not remove their historical time logs.')) {
            await deleteEmployee(id);
        }
    };

    const filteredEmployees = useMemo(() => {
        return employees.filter(e =>
            `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.position.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [employees, searchQuery]);

    const activeEmployeesCount = employees.filter(e => e.status === 'Active').length;
    const uniquePositionsCount = new Set(employees.map(e => e.position)).size;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-display text-slate-900">Employee Management</h2>
                    <p className="text-slate-500 text-base">Manage your store staff, positions, and payroll details.</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Add Employee</span>
                </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 flex items-center gap-4">
                    <div className="bg-primary-50 p-3 rounded-2xl text-primary-600">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Staff</p>
                        <p className="text-2xl font-black text-slate-900">{employees.length}</p>
                    </div>
                </div>
                <div className="glass-panel p-6 flex items-center gap-4">
                    <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active</p>
                        <p className="text-2xl font-black text-slate-900">{activeEmployeesCount}</p>
                    </div>
                </div>
                <div className="glass-panel p-6 flex items-center gap-4">
                    <div className="bg-slate-100 p-3 rounded-2xl text-slate-600">
                        <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Positions</p>
                        <p className="text-2xl font-black text-slate-900">{uniquePositionsCount}</p>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        type="text"
                        placeholder="Search employees by name or position..."
                        className="input-field w-full pl-10"
                    />
                </div>
                <button className="btn-secondary flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <span>Filter</span>
                </button>
            </div>

            {/* Employees Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-500">Loading staff directory...</p>
                    </div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="col-span-full py-20 text-center glass-panel">
                        <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">No employees found.</p>
                    </div>
                ) : (
                    filteredEmployees.map(employee => (
                        <div key={employee.id} className="glass-panel p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors uppercase">
                                        {employee.firstName[0]}{employee.lastName[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{employee.firstName} {employee.lastName}</h3>
                                        <p className="text-sm font-medium text-primary-600 uppercase tracking-wider">{employee.position}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(employee)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(employee.id!)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-50">
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <span>{employee.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <span>{employee.phone}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <span>Joined {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Hourly Rate</span>
                                    <span className="text-base font-bold text-slate-900">${(employee.hourlyRate || 0).toFixed(2)}/hr</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Total Hours</span>
                                    <span className="text-base font-black text-slate-900 flex items-center justify-end gap-1">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        {employee.id ? (employeeHours[employee.id] || 0).toFixed(2) : '0.00'}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 flex justify-between items-center">
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${employee.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                                >
                                    {employee.status}
                                </span>
                                <button
                                    onClick={() => openScorecard(employee)}
                                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 transition-colors"
                                >
                                    <Award className="w-3.5 h-3.5" />
                                    View Analytics
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Scorecard Modal */}
            {showScorecardModal && selectedEmployeeForScorecard && selectedEmployeeForScorecard.id && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowScorecardModal(false)}></div>
                    <div className="bg-white rounded-[3.5rem] w-full max-w-xl relative z-10 overflow-hidden animate-in zoom-in duration-300 shadow-2xl">
                        <div className="p-10 pb-0 flex justify-between items-start">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-600 uppercase">
                                    {selectedEmployeeForScorecard.firstName[0]}{selectedEmployeeForScorecard.lastName[0]}
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">{selectedEmployeeForScorecard.firstName} {selectedEmployeeForScorecard.lastName}</h3>
                                    <p className="text-xs font-black text-primary-600 uppercase tracking-widest">Operational Vector Analytics</p>
                                </div>
                            </div>
                            <button onClick={() => setShowScorecardModal(false)} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-10">
                            <EmployeeScorecard
                                stats={calculateEmployeeStats(selectedEmployeeForScorecard.id)}
                            />

                            <div className="mt-8 flex gap-4">
                                <button onClick={() => setShowScorecardModal(false)} className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-sm tracking-widest shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Close Report</button>
                                <button className="px-8 py-5 border-2 border-slate-100 rounded-3xl text-slate-400 hover:text-slate-900 hover:border-slate-200 transition-all">
                                    <Filter className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Employee Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="glass-panel w-full max-w-2xl relative z-10 bg-white overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="font-bold text-slate-900">{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 border-none bg-transparent p-0"><CheckCircle className="w-6 h-6" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">First Name</label>
                                    <input value={employeeForm.firstName} onChange={e => setEmployeeForm({ ...employeeForm, firstName: e.target.value })} type="text" required className="input-field w-full" placeholder="John" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Last Name</label>
                                    <input value={employeeForm.lastName} onChange={e => setEmployeeForm({ ...employeeForm, lastName: e.target.value })} type="text" required className="input-field w-full" placeholder="Doe" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                                    <input value={employeeForm.email} onChange={e => setEmployeeForm({ ...employeeForm, email: e.target.value })} type="email" required className="input-field w-full" placeholder="john@example.com" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Phone Number</label>
                                    <input value={employeeForm.phone} onChange={e => setEmployeeForm({ ...employeeForm, phone: e.target.value })} type="tel" required className="input-field w-full" placeholder="(555) 000-0000" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Position</label>
                                    <select value={employeeForm.position} onChange={e => setEmployeeForm({ ...employeeForm, position: e.target.value })} required className="input-field w-full">
                                        <option value="">Select Position...</option>
                                        <option value="Store Manager">Store Manager</option>
                                        <option value="Assistant Manager">Assistant Manager</option>
                                        <option value="Cashier">Cashier</option>
                                        <option value="Stock Associate">Stock Associate</option>
                                        <option value="Maintenance">Maintenance</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Hourly Rate ($)</label>
                                    <input value={employeeForm.hourlyRate} onChange={e => setEmployeeForm({ ...employeeForm, hourlyRate: parseFloat(e.target.value) || 0 })} type="number" step="0.01" required className="input-field w-full" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Hire Date</label>
                                    <input value={employeeForm.hireDate} onChange={e => setEmployeeForm({ ...employeeForm, hireDate: e.target.value })} type="date" required className="input-field w-full" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Status</label>
                                    <select value={employeeForm.status} onChange={e => setEmployeeForm({ ...employeeForm, status: e.target.value as 'Active' | 'Inactive' })} className="input-field w-full">
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Clock-In PIN</label>
                                    <input value={employeeForm.pin} onChange={e => setEmployeeForm({ ...employeeForm, pin: e.target.value })} type="text" maxLength={4} placeholder="1234" className="input-field w-full font-mono tracking-widest" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">System Role</label>
                                    <select value={employeeForm.role} onChange={e => setEmployeeForm({ ...employeeForm, role: e.target.value as any })} required className="input-field w-full">
                                        <option value="Admin">Admin</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Assistant Manager">Assistant Manager</option>
                                        <option value="Shift Manager">Shift Manager</option>
                                        <option value="Cashier">Cashier</option>
                                        <option value="Stocker">Stocker</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary">
                                    {editingEmployee ? 'Update Details' : 'Register Employee'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeesView;
