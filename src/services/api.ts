import axios from 'axios';
import { API_URL } from '../config';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export const authService = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/signup', data),
  googleLogin: (data: { credential: string }) => api.post('/auth/google', data),
  sendOtp: (data: { phone: string }) => api.post('/auth/send-otp', data),
  verifyOtp: (data: { phone: string; otp: string }) => api.post('/auth/verify-otp', data),
  getProfile: () => api.get('/user/profile'),
};

export const productService = {
  getProducts: (params?: any) => api.get('/products', { params }),
  getProductById: (id: string) => api.get(`/products/${id}`),
  getCategories: () => api.get('/categories'),
  createProduct: (data: any) => api.post('/admin/products', data),
  updateProduct: (id: string, data: any) => api.put(`/admin/products/${id}`, data),
  updateStock: (id: string, data: any) => api.put(`/manager/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/admin/products/${id}`),
};

export const orderService = {
  createOrder: (data: any) => api.post('/orders/create', data),
  verifyPayment: (data: any) => api.post('/orders/verify', data),
  getUserOrders: () => api.get('/orders/user'),
  getManagerOrders: () => api.get('/orders/manager'),
  dispatchOrder: (id: string, data: any) => api.patch(`/orders/${id}/dispatch`, data),
  updateStatus: (id: string, data: any) => api.patch(`/orders/${id}/status`, data),
  getPartnerOrders: () => api.get('/orders/partner'),
  getOrderTracking: (id: string) => api.get(`/orders/${id}/tracking`),
};

export const adminService = {
  getPendingApprovals: () => api.get('/admin/requests'),
  approveUser: (id: string) => api.patch(`/admin/approve/${id}`),
  createPartner: (data: any) => api.post('/admin/partners', data),
  getDeliveryPartners: () => api.get('/admin/delivery-partners'),
  getCategories: () => api.get('/admin/categories'),
  createCategory: (data: { name: string; icon?: string; color?: string }) => api.post('/admin/categories', data),
  deleteCategory: (id: string) => api.delete(`/admin/categories/${id}`),
  getActiveDeliveries: () => api.get('/orders/active-deliveries'),
};

export default api;
