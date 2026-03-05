import { useState, useCallback, useEffect } from 'react';
import { Modal, LoadingState, ErrorState, EmptyState, Toast, Pagination } from '../components/common';
import { employeeAPI } from '../services/api';

const EmployeeForm = ({ onSubmit, onCancel, isSubmitting, initialData = null, isEditMode = false }) => {
    const [formData, setFormData] = useState({
        fullName: initialData?.name || '',
        email: initialData?.email || '',
        department: initialData?.department || '',
        position: initialData?.employee_id || '',
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

        // Name validation: only alphabets and spaces
        if (!formData.fullName.trim()) {
            newErrors.fullName = 'Full name is required';
        } else if (!/^[A-Za-z\s]+$/.test(formData.fullName.trim())) {
            newErrors.fullName = 'Name must contain only alphabets and spaces';
        }

        // Email validation: proper email format
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email.trim())) {
            newErrors.email = 'Please enter a valid email address (e.g., user@example.com)';
        }

        // Department validation: only alphabets and spaces
        if (!formData.department.trim()) {
            newErrors.department = 'Department is required';
        } else if (!/^[A-Za-z\s]+$/.test(formData.department.trim())) {
            newErrors.department = 'Department must contain only alphabets and spaces';
        }

        // Position validation
        if (!formData.position.trim()) {
            newErrors.position = 'Position is required';
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
                <label className="label">Full Name</label>
                <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className={`input ${errors.fullName ? 'input-error' : ''}`}
                    placeholder="e.g., John Doe"
                />
                {errors.fullName && <p className="text-error-400 text-xs mt-1">{errors.fullName}</p>}
            </div>

            <div>
                <label className="label">Email Address</label>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`input ${errors.email ? 'input-error' : ''}`}
                    placeholder="e.g., john.doe@company.com"
                />
                {errors.email && <p className="text-error-400 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
                <label className="label">Department</label>
                <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className={`input ${errors.department ? 'input-error' : ''}`}
                    placeholder="e.g., Engineering"
                />
                {errors.department && <p className="text-error-400 text-xs mt-1">{errors.department}</p>}
            </div>

            <div>
                <label className="label">Position (Employee ID)</label>
                <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className={`input ${errors.position ? 'input-error' : ''}`}
                    placeholder="e.g., Senior Developer"
                    disabled={isEditMode}
                    title={isEditMode ? "Employee ID cannot be changed" : ""}
                />
                {errors.position && <p className="text-error-400 text-xs mt-1">{errors.position}</p>}
                {isEditMode && <p className="text-xs text-[var(--text-muted)] mt-1">Employee ID cannot be modified</p>}
            </div>

            <div className="flex gap-3 pt-4">
                <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">
                    Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <div className="spinner w-4 h-4" />
                            {isEditMode ? 'Updating...' : 'Adding...'}
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isEditMode ? "M5 13l4 4L19 7" : "M12 4v16m8-8H4"} />
                            </svg>
                            {isEditMode ? 'Update Employee' : 'Add Employee'}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

const DeleteConfirmModal = ({ employee, onConfirm, onCancel, isDeleting }) => {
    return (
        <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Delete Employee</h3>
            <p className="text-[var(--text-tertiary)] mb-6">
                Are you sure you want to permanently delete <strong className="text-[var(--text-secondary)]">{employee?.name}</strong>?
                This action cannot be undone and will remove all associated data.
            </p>
            <div className="flex gap-3">
                <button onClick={onCancel} className="btn btn-secondary flex-1">
                    Cancel
                </button>
                <button onClick={onConfirm} className="btn btn-danger flex-1" disabled={isDeleting}>
                    {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
            </div>
        </div>
    );
};

const Employees = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editEmployee, setEditEmployee] = useState(null);
    const [deleteEmployee, setDeleteEmployee] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [toast, setToast] = useState(null);
    const limit = 10;

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const hideToast = () => setToast(null);

    const fetchEmployees = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params = { page, limit };
            if (searchTerm) params.search = searchTerm;
            const response = await employeeAPI.getAll(params);
            setEmployees(response.data || []);
            setTotal(response.total || 0);
        } catch (err) {
            console.error('Error fetching employees:', err);
            const errorMessage = err.message || 'Failed to load employees. Please try again.';
            setError(errorMessage);
            setEmployees([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, limit, searchTerm]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm]);

    const handleAddEmployee = async (data) => {
        setIsSubmitting(true);
        try {
            const apiData = {
                name: data.fullName,
                email: data.email,
                department: data.department,
                employeeId: data.position
            };
            await employeeAPI.create(apiData);
            setIsAddModalOpen(false);
            showToast('Employee added successfully!', 'success');
            fetchEmployees();
        } catch (err) {
            console.error('Error adding employee:', err);
            const errorMessage = err.message || err.response?.data?.detail || 'Failed to add employee. Please check your input and try again.';
            showToast(errorMessage, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateEmployee = async (data) => {
        if (!editEmployee) return;
        setIsSubmitting(true);
        try {
            const apiData = {
                name: data.fullName,
                email: data.email,
                department: data.department
            };
            await employeeAPI.update(editEmployee.id, apiData);
            setEditEmployee(null);
            showToast('Employee updated successfully!', 'success');
            fetchEmployees();
        } catch (err) {
            console.error('Error updating employee:', err);
            const errorMessage = err.message || err.response?.data?.detail || 'Failed to update employee. Please check your input and try again.';
            showToast(errorMessage, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEmployee = async () => {
        if (!deleteEmployee) return;
        setIsSubmitting(true);
        try {
            await employeeAPI.delete(deleteEmployee.id);
            setDeleteEmployee(null);
            showToast('Employee deleted permanently!', 'success');
            fetchEmployees();
        } catch (err) {
            showToast(err.message || 'Failed to delete employee', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading && page === 1 && !searchTerm) return <LoadingState message="Loading employees..." />;
    if (error) return <ErrorState message={error} onRetry={fetchEmployees} />;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-[var(--text-primary)] mb-2">Employees</h1>
                    <p className="text-[var(--text-tertiary)]">Manage your employee records</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Employee
                </button>
            </div>

            <div className="relative">
                {/* <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg> */}
                <input
                    type="text"
                    placeholder="Search by name, ID, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-12"
                />
            </div>

            {employees.length === 0 ? (
                <EmptyState
                    icon={
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    }
                    title={searchTerm ? 'No employees found' : 'No employees yet'}
                    description={searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first employee'}
                    actionLabel={!searchTerm ? 'Add Employee' : null}
                    onAction={!searchTerm ? () => setIsAddModalOpen(true) : null}
                />
            ) : (
                <>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Email</th>
                                    <th>Department</th>
                                    <th>Joined</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((employee) => (
                                    <tr key={employee.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                                                    {employee.name?.charAt(0).toUpperCase() || 'E'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-[var(--text-primary)]">{employee.name}</p>
                                                    <p className="text-xs text-[var(--text-muted)]">{employee.employee_id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-[var(--text-secondary)]">{employee.email}</td>
                                        <td>
                                            <span className="badge badge-info">{employee.department}</span>
                                        </td>
                                        <td className="text-[var(--text-muted)] text-sm">
                                            {employee.joining_date 
                                                ? new Date(employee.joining_date).toLocaleDateString('en-GB') 
                                                : 'N/A'}
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setEditEmployee(employee)}
                                                    className="btn btn-ghost btn-icon text-primary-400 hover:text-primary-300 hover:bg-primary-500/10"
                                                    title="Edit employee"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => setDeleteEmployee(employee)}
                                                    className="btn btn-ghost btn-icon text-error-400 hover:text-error-300 hover:bg-error-500/10"
                                                    title="Delete permanently"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
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

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Employee">
                <EmployeeForm
                    onSubmit={handleAddEmployee}
                    onCancel={() => setIsAddModalOpen(false)}
                    isSubmitting={isSubmitting}
                    isEditMode={false}
                />
            </Modal>

            <Modal isOpen={!!editEmployee} onClose={() => setEditEmployee(null)} title="Edit Employee">
                <EmployeeForm
                    onSubmit={handleUpdateEmployee}
                    onCancel={() => setEditEmployee(null)}
                    isSubmitting={isSubmitting}
                    initialData={editEmployee}
                    isEditMode={true}
                />
            </Modal>

            <Modal isOpen={!!deleteEmployee} onClose={() => setDeleteEmployee(null)} title="Confirm Permanent Delete" size="sm">
                <DeleteConfirmModal
                    employee={deleteEmployee}
                    onConfirm={handleDeleteEmployee}
                    onCancel={() => setDeleteEmployee(null)}
                    isDeleting={isSubmitting}
                />
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
        </div>
    );
};


export default Employees;