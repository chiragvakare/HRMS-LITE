import { useState, useCallback, useEffect } from 'react';
import { Modal, LoadingState, ErrorState, EmptyState, Toast, Pagination } from '../components/common';
import { payrollAPI, employeeAPI } from '../services/api';

const PayrollForm = ({ onSubmit, onCancel, isSubmitting, employees }) => {
    const [formData, setFormData] = useState({
        employee_id: '',
        month: '',
        basic_salary: '',
        allowances: '0',
        deductions: '0',
    });
    const [errors, setErrors] = useState({});
    const [netSalary, setNetSalary] = useState(0);

    useEffect(() => {
        const basic = parseInt(formData.basic_salary) || 0;
        const allowances = parseInt(formData.allowances) || 0;
        const deductions = parseInt(formData.deductions) || 0;
        setNetSalary(basic + allowances - deductions);
    }, [formData.basic_salary, formData.allowances, formData.deductions]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.employee_id) newErrors.employee_id = 'Employee is required';
        if (!formData.month) newErrors.month = 'Month is required';
        if (!formData.basic_salary) newErrors.basic_salary = 'Basic salary is required';
        else if (parseInt(formData.basic_salary) < 0) newErrors.basic_salary = 'Salary must be positive';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            const data = {
                ...formData,
                basic_salary: parseInt(formData.basic_salary),
                allowances: parseInt(formData.allowances) || 0,
                deductions: parseInt(formData.deductions) || 0,
            };
            onSubmit(data);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="label">Employee</label>
                <select
                    name="employee_id"
                    value={formData.employee_id}
                    onChange={handleChange}
                    className={`input ${errors.employee_id ? 'input-error' : ''}`}
                >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.department})
                        </option>
                    ))}
                </select>
                {errors.employee_id && <p className="text-error-400 text-xs mt-1">{errors.employee_id}</p>}
            </div>

            <div>
                <label className="label">Month</label>
                <input
                    type="month"
                    name="month"
                    value={formData.month}
                    onChange={handleChange}
                    className={`input ${errors.month ? 'input-error' : ''}`}
                />
                {errors.month && <p className="text-error-400 text-xs mt-1">{errors.month}</p>}
            </div>

            <div>
                <label className="label">Basic Salary</label>
                <input
                    type="number"
                    name="basic_salary"
                    value={formData.basic_salary}
                    onChange={handleChange}
                    className={`input ${errors.basic_salary ? 'input-error' : ''}`}
                    placeholder="e.g., 50000"
                    min="0"
                />
                {errors.basic_salary && <p className="text-error-400 text-xs mt-1">{errors.basic_salary}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label">Allowances</label>
                    <input
                        type="number"
                        name="allowances"
                        value={formData.allowances}
                        onChange={handleChange}
                        className="input"
                        placeholder="0"
                        min="0"
                    />
                </div>

                <div>
                    <label className="label">Deductions</label>
                    <input
                        type="number"
                        name="deductions"
                        value={formData.deductions}
                        onChange={handleChange}
                        className="input"
                        placeholder="0"
                        min="0"
                    />
                </div>
            </div>

            <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4">
                <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)] font-medium">Net Salary</span>
                    <span className="text-2xl font-bold text-primary-400">
                        ₹{netSalary.toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">
                    Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <div className="spinner w-4 h-4" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create Payroll
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

const Payroll = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [payrolls, setPayrolls] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [toast, setToast] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');
    const limit = 10;

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const hideToast = () => setToast(null);

    const fetchPayrolls = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params = { page, limit };
            if (statusFilter) params.status = statusFilter;
            const response = await payrollAPI.getAll(params);
            setPayrolls(response.data || []);
            setTotal(response.total || 0);
        } catch (err) {
            console.error('Error fetching payrolls:', err);
            setError(err.message || 'Failed to load payrolls');
            setPayrolls([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, limit, statusFilter]);

    const fetchEmployees = useCallback(async () => {
        try {
            const response = await employeeAPI.getAll({ limit: 1000 });
            setEmployees(response.data || []);
        } catch (err) {
            console.error('Error fetching employees:', err);
        }
    }, []);

    useEffect(() => {
        fetchPayrolls();
    }, [fetchPayrolls]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    useEffect(() => {
        setPage(1);
    }, [statusFilter]);

    const handleAddPayroll = async (data) => {
        setIsSubmitting(true);
        try {
            await payrollAPI.create(data);
            setIsAddModalOpen(false);
            showToast('Payroll created successfully!', 'success');
            fetchPayrolls();
        } catch (err) {
            console.error('Error adding payroll:', err);
            const errorMessage = err.message || 'Failed to create payroll';
            showToast(errorMessage, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusUpdate = async (payrollId, newStatus) => {
        try {
            await payrollAPI.update(payrollId, { status: newStatus });
            showToast(`Payroll marked as ${newStatus.toLowerCase()} successfully!`, 'success');
            fetchPayrolls();
        } catch (err) {
            console.error('Error updating payroll status:', err);
            showToast(err.message || 'Failed to update payroll status', 'error');
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Paid':
                return 'badge-success';
            case 'Processed':
                return 'badge-info';
            case 'Pending':
            default:
                return 'badge-warning';
        }
    };

    if (loading && page === 1) return <LoadingState message="Loading payrolls..." />;
    if (error) return <ErrorState message={error} onRetry={fetchPayrolls} />;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-[var(--text-primary)] mb-2">Payroll Management</h1>
                    <p className="text-[var(--text-tertiary)]">Manage employee payroll and salaries</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Generate Payroll
                </button>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => setStatusFilter('')}
                    className={`btn btn-sm ${!statusFilter ? 'btn-primary' : 'btn-secondary'}`}
                >
                    All
                </button>
                <button
                    onClick={() => setStatusFilter('Pending')}
                    className={`btn btn-sm ${statusFilter === 'Pending' ? 'btn-primary' : 'btn-secondary'}`}
                >
                    Pending
                </button>
                <button
                    onClick={() => setStatusFilter('Processed')}
                    className={`btn btn-sm ${statusFilter === 'Processed' ? 'btn-primary' : 'btn-secondary'}`}
                >
                    Processed
                </button>
                <button
                    onClick={() => setStatusFilter('Paid')}
                    className={`btn btn-sm ${statusFilter === 'Paid' ? 'btn-primary' : 'btn-secondary'}`}
                >
                    Paid
                </button>
            </div>

            {payrolls.length === 0 ? (
                <EmptyState
                    icon={
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                    title="No payroll records found"
                    description={statusFilter ? `No ${statusFilter.toLowerCase()} payroll records` : 'Get started by generating payroll'}
                    actionLabel={!statusFilter ? 'Generate Payroll' : null}
                    onAction={!statusFilter ? () => setIsAddModalOpen(true) : null}
                />
            ) : (
                <>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Month</th>
                                    <th>Basic Salary</th>
                                    <th>Allowances</th>
                                    <th>Deductions</th>
                                    <th>Net Salary</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payrolls.map((payroll) => (
                                    <tr key={payroll.id}>
                                        <td>
                                            <div>
                                                <p className="font-medium text-[var(--text-primary)]">{payroll.employee_name}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{payroll.department}</p>
                                            </div>
                                        </td>
                                        <td className="text-[var(--text-secondary)]">
                                            {new Date(payroll.month + '-01').toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })}
                                        </td>
                                        <td className="text-[var(--text-secondary)]">₹{payroll.basic_salary.toLocaleString()}</td>
                                        <td className="text-success-400">+₹{payroll.allowances.toLocaleString()}</td>
                                        <td className="text-error-400">-₹{payroll.deductions.toLocaleString()}</td>
                                        <td className="font-semibold text-primary-400">₹{payroll.net_salary.toLocaleString()}</td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeClass(payroll.status)}`}>
                                                {payroll.status}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {payroll.status === 'Pending' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(payroll.id, 'Processed')}
                                                        className="btn btn-ghost btn-icon text-info-400 hover:text-info-300 hover:bg-info-500/10"
                                                        title="Mark as Processed"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {payroll.status === 'Processed' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(payroll.id, 'Paid')}
                                                        className="btn btn-ghost btn-icon text-success-400 hover:text-success-300 hover:bg-success-500/10"
                                                        title="Mark as Paid"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Pagination
                        page={page}
                        totalPages={Math.ceil(total / limit)}
                        total={total}
                        limit={limit}
                        onPageChange={setPage}
                    />
                </>
            )}

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Generate Payroll">
                <PayrollForm
                    onSubmit={handleAddPayroll}
                    onCancel={() => setIsAddModalOpen(false)}
                    isSubmitting={isSubmitting}
                    employees={employees}
                />
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
        </div>
    );
};

export default Payroll;
