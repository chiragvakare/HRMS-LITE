import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        
        const message = 
            error.response?.data?.detail || 
            error.response?.data?.error || 
            error.message || 
            'Something went wrong';

        return Promise.reject({ 
            message, 
            details: error.response?.data?.details || error.response?.data?.detail 
        });
    }
);

// Dashboard API
export const dashboardAPI = {
    getStats: () => api.get('/dashboard'),
};

// Employee API
export const employeeAPI = {
    getAll: (params) => api.get('/employees', { params }),
    getById: (id) => api.get(`/employees/${id}`),
    create: (data) => api.post('/employees', data),
    update: (id, data) => api.put(`/employees/${id}`, data),
    delete: (id) => api.delete(`/employees/${id}`),
    getDepartments: () => api.get('/employees/departments'),
    getStats: () => api.get('/employees/stats'),
};

// Attendance API
export const attendanceAPI = {
    getAll: (params) => api.get('/attendance', { params }),
    getToday: () => api.get('/attendance/today'),
    getSummary: () => api.get('/attendance/summary'),
    getByEmployee: (id, params) => api.get(`/attendance/employee/${id}`, { params }),
    mark: (data) => api.post('/attendance', data),
};

// Leave API
export const leaveAPI = {
    getAll: (params) => api.get('/leaves', { params }),
    getById: (id) => api.get(`/leaves/${id}`),
    create: (data) => api.post('/leaves', data),
    update: (id, data) => api.put(`/leaves/${id}`, data),
    delete: (id) => api.delete(`/leaves/${id}`),
    getStats: () => api.get('/leaves/stats/summary'),
};

// Payroll API
export const payrollAPI = {
    getAll: (params) => api.get('/payroll', { params }),
    getById: (id) => api.get(`/payroll/${id}`),
    create: (data) => api.post('/payroll', data),
    update: (id, data) => api.put(`/payroll/${id}`, data),
    delete: (id) => api.delete(`/payroll/${id}`),
    getStats: () => api.get('/payroll/stats/summary'),
};

export default api;