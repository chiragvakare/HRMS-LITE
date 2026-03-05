import { useState, useCallback, useEffect } from 'react';
import { Modal, LoadingState, ErrorState, EmptyState, Toast, Pagination } from '../components/common';
import { leaveAPI, employeeAPI } from '../services/api';

const LeaveForm = ({ onSubmit, onCancel, isSubmitting, employees }) => {
    const [formData, setFormData] = useState({
        employee_id: '',
        leave_type: '',
        start_date: '',
        end_date: '',
        reason: '',
    });
    const [errors, setErrors] = useState({});

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
        if (!formData.leave_type) newErrors.leave_type = 'Leave type is required';
        if (!formData.start_date) newErrors.start_date = 'Start date is required';
        if (!formData.end_date) newErrors.end_date = 'End date is required';
        else if (new Date(formData.end_date) < new Date(formData.start_date)) {
            newErrors.end_date = 'End date must be after start date';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSubmit(formData);
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
                            {emp.name} ({emp.employee_id})
                        </option>
                    ))}
                </select>
                {errors.employee_id && <p className="text-error-400 text-xs mt-1">{errors.employee_id}</p>}
            </div>

            <div>
                <label className="label">Leave Type</label>
                <select
                    name="leave_type"
                    value={formData.leave_type}
                    onChange={handleChange}
                    className={`input ${errors.leave_type ? 'input-error' : ''}`}
                >
                    <option value="">Select Type</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Casual">Casual Leave</option>
                    <option value="Annual">Annual Leave</option>
                    <option value="Unpaid">Unpaid Leave</option>
                </select>
                {errors.leave_type && <p className="text-error-400 text-xs mt-1">{errors.leave_type}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label">Start Date</label>
                    <input
                        type="date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleChange}
                        className={`input ${errors.start_date ? 'input-error' : ''}`}
                    />
                    {errors.start_date && <p className="text-error-400 text-xs mt-1">{errors.start_date}</p>}
                </div>

                <div>
                    <label className="label">End Date</label>
                    <input
                        type="date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleChange}
                        className={`input ${errors.end_date ? 'input-error' : ''}`}
                    />
                    {errors.end_date && <p className="text-error-400 text-xs mt-1">{errors.end_date}</p>}
                </div>
            </div>

            <div>
                <label className="label">Reason (Optional)</label>
                <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    className="input"
                    rows="3"
                    placeholder="Enter reason for leave..."
                />
            </div>

            <div className="flex gap-3 pt-4">
                <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">
                    Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <div className="spinner w-4 h-4" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Submit Request
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

const Leaves = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [leaves, setLeaves] = useState([]);
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

    const fetchLeaves = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params = { page, limit };
            if (statusFilter) params.status = statusFilter;
            const response = await leaveAPI.getAll(params);
            setLeaves(response.data || []);
            setTotal(response.total || 0);
        } catch (err) {
            console.error('Error fetching leaves:', err);
            setError(err.message || 'Failed to load leaves');
            setLeaves([]);
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
        fetchLeaves();
    }, [fetchLeaves]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    useEffect(() => {
        setPage(1);
    }, [statusFilter]);

    const handleAddLeave = async (data) => {
        setIsSubmitting(true);
        try {
            await leaveAPI.create(data);
            setIsAddModalOpen(false);
            showToast('Leave request submitted successfully!', 'success');
            fetchLeaves();
        } catch (err) {
            console.error('Error adding leave:', err);
            const errorMessage = err.message || 'Failed to submit leave request';
            showToast(errorMessage, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusUpdate = async (leaveId, newStatus) => {
        try {
            await leaveAPI.update(leaveId, { status: newStatus });
            showToast(`Leave ${newStatus.toLowerCase()} successfully!`, 'success');
            fetchLeaves();
        } catch (err) {
            console.error('Error updating leave status:', err);
            showToast(err.message || 'Failed to update leave status', 'error');
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Approved':
                return 'badge-success';
            case 'Rejected':
                return 'badge-danger';
            case 'Pending':
            default:
                return 'badge-warning';
        }
    };

    const getLeaveTypeBadgeClass = (type) => {
        switch (type) {
            case 'Sick':
                return 'badge-error';
            case 'Casual':
                return 'badge-info';
            case 'Annual':
                return 'badge-success';
            case 'Unpaid':
            default:
                return 'badge-warning';
        }
    };

    if (loading && page === 1) return <LoadingState message="Loading leaves..." />;
    if (error) return <ErrorState message={error} onRetry={fetchLeaves} />;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-[var(--text-primary)] mb-2">Leave Management</h1>
                    <p className="text-[var(--text-tertiary)]">Manage employee leave requests</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Leave Request
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
                    onClick={() => setStatusFilter('Approved')}
                    className={`btn btn-sm ${statusFilter === 'Approved' ? 'btn-primary' : 'btn-secondary'}`}
                >
                    Approved
                </button>
                <button
                    onClick={() => setStatusFilter('Rejected')}
                    className={`btn btn-sm ${statusFilter === 'Rejected' ? 'btn-primary' : 'btn-secondary'}`}
                >
                    Rejected
                </button>
            </div>

            {leaves.length === 0 ? (
                <EmptyState
                    icon={
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    }
                    title="No leave requests found"
                    description={statusFilter ? `No ${statusFilter.toLowerCase()} leave requests` : 'Get started by submitting a leave request'}
                    actionLabel={!statusFilter ? 'New Leave Request' : null}
                    onAction={!statusFilter ? () => setIsAddModalOpen(true) : null}
                />
            ) : (
                <>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Leave Type</th>
                                    <th>Duration</th>
                                    <th>Days</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaves.map((leave) => (
                                    <tr key={leave.id}>
                                        <td>
                                            <div>
                                                <p className="font-medium text-[var(--text-primary)]">{leave.employee_name}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{leave.employee_number}</p>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${getLeaveTypeBadgeClass(leave.leave_type)}`}>
                                                {leave.leave_type}
                                            </span>
                                        </td>
                                        <td className="text-sm text-[var(--text-secondary)]">
                                            {new Date(leave.start_date).toLocaleDateString('en-GB')} - {new Date(leave.end_date).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="text-[var(--text-secondary)]">{leave.days} days</td>
                                        <td className="text-sm text-[var(--text-muted)]">{leave.reason || 'N/A'}</td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeClass(leave.status)}`}>
                                                {leave.status}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {leave.status === 'Pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStatusUpdate(leave.id, 'Approved')}
                                                            className="btn btn-ghost btn-icon text-success-400 hover:text-success-300 hover:bg-success-500/10"
                                                            title="Approve"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(leave.id, 'Rejected')}
                                                            className="btn btn-ghost btn-icon text-error-400 hover:text-error-300 hover:bg-error-500/10"
                                                            title="Reject"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </>
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

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="New Leave Request">
                <LeaveForm
                    onSubmit={handleAddLeave}
                    onCancel={() => setIsAddModalOpen(false)}
                    isSubmitting={isSubmitting}
                    employees={employees}
                />
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
        </div>
    );
};

export default Leaves;
