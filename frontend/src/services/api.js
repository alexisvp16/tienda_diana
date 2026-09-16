const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('tienda_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({
    success: false,
    message: 'Error al procesar la respuesta del servidor.'
  }));

  if (!response.ok) {
    throw new Error(data.message || 'Error en la petición.');
  }

  return data;
}

export const api = {
  // Salud y Diagnóstico
  getHealth: () => request('/health'),

  // Autenticación
  login: (credentials) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  getMe: () => request('/auth/me'),

  // Categorías
  getCategories: () => request('/categories'),
  createCategory: (data) => request('/categories', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateCategory: (id, data) => request(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteCategory: (id) => request(`/categories/${id}`, {
    method: 'DELETE'
  }),

  // Productos y Variantes
  getProducts: (params = '') => request(`/products${params}`),
  getProductById: (id) => request(`/products/${id}`),
  createProduct: (data) => request('/products', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateProduct: (id, data) => request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteProduct: (id) => request(`/products/${id}`, {
    method: 'DELETE'
  }),

  // Inventario y Kardex
  adjustStock: (data) => request('/inventory/adjust', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getKardex: (params = '') => request(`/inventory/kardex${params}`),

  // Caja y Arqueos
  openShift: (data) => request('/cash/open', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getCurrentShift: () => request('/cash/current'),
  addCashMovement: (data) => request('/cash/movement', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  closeShift: (data) => request('/cash/close', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getCashHistory: () => request('/cash/history'),

  // Gestión de Cajas Físicas
  getCashRegisters: () => request('/cash/registers'),
  createCashRegister: (data) => request('/cash/registers', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateCashRegister: (id, data) => request(`/cash/registers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteCashRegister: (id) => request(`/cash/registers/${id}`, {
    method: 'DELETE'
  }),

  // Ventas y Tickets
  createSale: (data) => request('/sales', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getSales: (params = '') => request(`/sales${params}`),
  getSaleById: (id) => request(`/sales/${id}`),
  cancelSale: (id, reason) => request(`/sales/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  }),

  // Ajustes de Tienda y Temas
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // Gestión de Usuarios y Roles
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateUser: (id, data) => request(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteUser: (id) => request(`/users/${id}`, {
    method: 'DELETE'
  })
};

