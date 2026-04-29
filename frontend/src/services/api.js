export const products = [
  { id: 1, name: 'Seraphina Pearl Necklace', category: 'Jewelry', subcategory: 'Necklaces', price: 8950, stock: 18, sku: 'JWL-PRL-001', rating: 4.9, material: 'Gold Vermeil / Pearl', color: 'Gold', tag: 'Best Seller', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&auto=format&fit=crop' },
  { id: 2, name: 'Noir Structured Tote', category: 'Bags', subcategory: 'Tote Bags', price: 12500, stock: 9, sku: 'BAG-NOI-002', rating: 4.8, material: 'Leather', color: 'Black', tag: 'New Arrival', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1200&auto=format&fit=crop' },
  { id: 3, name: 'Aurelia Signet Ring', category: 'Jewelry', subcategory: 'Rings', price: 6400, stock: 4, sku: 'JWL-RNG-003', rating: 4.9, material: '18k Gold Vermeil', color: 'Gold', tag: 'Limited', image: 'https://images.unsplash.com/photo-1603561596112-db1d6d4e5299?q=80&w=1200&auto=format&fit=crop' },
  { id: 4, name: 'Camel Mini Crossbody', category: 'Bags', subcategory: 'Crossbody Bags', price: 9800, stock: 13, sku: 'BAG-CML-004', rating: 4.7, material: 'Vegan Leather', color: 'Camel', tag: 'Editor Pick', image: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?q=80&w=1200&auto=format&fit=crop' },
  { id: 5, name: 'Luna Diamond Studs', category: 'Jewelry', subcategory: 'Earrings', price: 15200, stock: 7, sku: 'JWL-STD-005', rating: 5.0, material: 'Silver / Diamond', color: 'Silver', tag: 'Premium', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1200&auto=format&fit=crop' },
  { id: 6, name: 'Ivory Evening Clutch', category: 'Bags', subcategory: 'Clutches', price: 7200, stock: 20, sku: 'BAG-IVR-006', rating: 4.6, material: 'Satin', color: 'Ivory', tag: 'Occasion', image: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?q=80&w=1200&auto=format&fit=crop' }
];

export const orders = [
  { id: '#1048', customer: 'Maria Santos', total: 8950, status: 'Paid', fulfillment: 'Preparing', date: 'Today' },
  { id: '#1049', customer: 'Ana Reyes', total: 12500, status: 'Pending', fulfillment: 'To Ship', date: 'Today' },
  { id: '#1050', customer: 'Clara Lim', total: 21600, status: 'Paid', fulfillment: 'Completed', date: 'Yesterday' }
];

export const customers = [
  { name: 'Maria Santos', email: 'maria@example.com', spend: 48420, tag: 'VIP', orders: 8 },
  { name: 'Ana Reyes', email: 'ana@example.com', spend: 12500, tag: 'New', orders: 1 },
  { name: 'Clara Lim', email: 'clara@example.com', spend: 76300, tag: 'Repeat', orders: 12 }
];

const demoUsers = {
  'owner@luxe.test': { name: 'Store Owner', email: 'owner@luxe.test', role: 'SUPER_ADMIN' },
  'admin@luxe.test': { name: 'Admin Manager', email: 'admin@luxe.test', role: 'ADMIN' },
  'inventory@luxe.test': { name: 'Inventory Staff', email: 'inventory@luxe.test', role: 'INVENTORY_STAFF' },
  'orders@luxe.test': { name: 'Order Staff', email: 'orders@luxe.test', role: 'ORDER_STAFF' },
  'customer@luxe.test': { name: 'Maria Customer', email: 'customer@luxe.test', role: 'CUSTOMER' }
};

export const mockSignIn = async ({ email }) => {
  await new Promise((resolve) => setTimeout(resolve, 450));
  const normalized = String(email || '').toLowerCase().trim();
  return demoUsers[normalized] || { name: normalized.split('@')[0] || 'Customer', email: normalized || 'customer@luxe.test', role: 'CUSTOMER' };
};

export const mockSignUp = async ({ name, email }) => {
  await new Promise((resolve) => setTimeout(resolve, 450));
  return { name: name || 'New Customer', email: email || 'customer@luxe.test', role: 'CUSTOMER' };
};

export const formatPeso = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value);


export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
export const IS_DEMO_MODE = import.meta.env.DEV && !API_BASE_URL;

function setAccessToken(token) {
  window.luxeAccessToken = token;
}

export function clearAuthStorage() {
  localStorage.removeItem('luxe-user');
  window.luxeAccessToken = null;
}

export async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) throw new Error('VITE_API_URL is not configured. Demo mode is available only in development.');
  const token = window.luxeAccessToken;
  const response = await fetch(API_BASE_URL + path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'API request failed');
  return payload.data;
}

export async function customerSignIn(credentials) {
  if (IS_DEMO_MODE) {
    const user = await mockSignIn(credentials);
    if (user.role !== 'CUSTOMER') throw new Error('Please use a customer account.');
    return user;
  }
  const data = await apiRequest('/auth/customer/login', { method: 'POST', body: JSON.stringify(credentials) });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function adminSignIn(credentials) {
  if (IS_DEMO_MODE) {
    const user = await mockSignIn(credentials);
    if (user.role === 'CUSTOMER') throw new Error('Admin access required.');
    return user;
  }
  const data = await apiRequest('/auth/admin/login', { method: 'POST', body: JSON.stringify(credentials) });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function signUp(payload) {
  if (IS_DEMO_MODE) return mockSignUp(payload);
  const data = await apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function requestPasswordReset(email) {
  if (IS_DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return { accepted: true, email };
  }
  return apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function resetPassword(payload) {
  if (IS_DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return { reset: true };
  }
  return apiRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchInvitation(token) {
  if (IS_DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { name: 'Demo Staff', email: 'staff@luxe.test', role: 'STAFF', expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() };
  }
  return apiRequest(`/auth/invite/${encodeURIComponent(token)}`);
}

export async function acceptInvitation(payload) {
  if (IS_DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return { user: { name: 'Demo Staff', email: 'staff@luxe.test', role: 'STAFF' }, accessToken: 'demo' };
  }
  const data = await apiRequest('/auth/invite/accept', { method: 'POST', body: JSON.stringify(payload) });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function signInWithGoogle(idToken) {
  if (IS_DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return { name: 'Google Customer', email: 'google-user@example.com', role: 'CUSTOMER' };
  }
  const data = await apiRequest('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function logout() {
  clearAuthStorage();
  if (IS_DEMO_MODE) return { loggedOut: true };
  const data = await apiRequest('/auth/logout', { method: 'POST', body: JSON.stringify({}) });
  return data;
}

export async function refreshSession() {
  if (IS_DEMO_MODE) return null;
  const data = await apiRequest('/auth/refresh', { method: 'POST', body: JSON.stringify({}) });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function fetchProducts(params = {}) {
  if (IS_DEMO_MODE) return products;
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value));
  return apiRequest(`/products${query.size ? `?${query.toString()}` : ''}`);
}

export async function fetchProduct(slug) {
  if (IS_DEMO_MODE) return products.find((product) => product.slug === slug) || products[0] || null;
  return apiRequest(`/products/${slug}`);
}

// Cart APIs
export async function getCart() {
  if (IS_DEMO_MODE) return [];
  return apiRequest('/cart');
}

export async function addToCart(payload) {
  if (IS_DEMO_MODE) return payload;
  return apiRequest('/cart', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateCartItem(itemId, quantity) {
  if (IS_DEMO_MODE) return { id: itemId, quantity };
  return apiRequest(`/cart/${itemId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) });
}

export async function removeFromCart(itemId) {
  if (IS_DEMO_MODE) return { id: itemId };
  return apiRequest(`/cart/${itemId}`, { method: 'DELETE' });
}

export async function clearCart() {
  if (IS_DEMO_MODE) return { success: true };
  return apiRequest('/cart/clear', { method: 'POST' });
}

// Order APIs
export async function createOrder(payload) {
  if (IS_DEMO_MODE) throw new Error('Demo mode cannot create orders');
  return apiRequest('/orders', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getOrder(orderId) {
  if (IS_DEMO_MODE) return null;
  return apiRequest(`/orders/${orderId}`);
}

export async function fetchMyOrders() {
  if (IS_DEMO_MODE) return orders;
  return apiRequest('/orders/me');
}

// Payment APIs
export async function createCheckoutSession(payload) {
  if (IS_DEMO_MODE) throw new Error('Demo mode cannot create payments');
  return apiRequest('/payments/checkout', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchAdminDashboard() {
  if (IS_DEMO_MODE) return { orders: 32, products: 6, customers: 3, lowStock: 1, revenue: 48920 };
  return adminApi('/dashboard');
}

export async function adminApi(path, options = {}) {
  return apiRequest('/admin' + path, options);
}

export async function fetchAdminCollection(endpoint) {
  if (IS_DEMO_MODE) return null;
  return adminApi(endpoint);
}

export async function createAdminRecord(endpoint, payload) {
  if (IS_DEMO_MODE) return payload;
  return adminApi(endpoint, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateAdminRecord(endpoint, id, payload, method = 'PATCH') {
  if (IS_DEMO_MODE) return payload;
  return adminApi(`${endpoint}/${id}`, { method, body: JSON.stringify(payload) });
}

export async function updateAdminSubresource(endpoint, id, suffix, payload) {
  if (IS_DEMO_MODE) return payload;
  return adminApi(`${endpoint}/${id}/${suffix}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteAdminRecord(endpoint, id) {
  if (IS_DEMO_MODE) return { id };
  return adminApi(`${endpoint}/${id}`, { method: 'DELETE' });
}

export const adminMockData = {
  products: products.map((p) => ({ id: p.sku, sku: p.sku, name: p.name, category: p.category, price: p.price, stock: p.stock, status: 'Active' })),
  variants: [
    { id: 'VAR-001', product: 'Seraphina Pearl Necklace', sku: 'JWL-PRL-001-GOLD', color: 'Gold', size: '18in', stock: 18 },
    { id: 'VAR-002', product: 'Noir Structured Tote', sku: 'BAG-NOI-002-BLK', color: 'Black', size: 'Large', stock: 9 }
  ],
  categories: [
    { id: 'cat-jewelry', name: 'Jewelry', slug: 'jewelry', items: 3, status: 'Active' },
    { id: 'cat-bags', name: 'Bags', slug: 'bags', items: 3, status: 'Active' }
  ],
  inventory: products.map((p) => ({ id: p.sku, sku: p.sku, product: p.name, stock: p.stock, lowStockAt: 5, movement: p.stock <= 5 ? 'Low Stock' : 'Healthy' })),
  orders,
  customers,
  promos: [
    { id: 'PROMO-001', code: 'LUXE10', type: 'percentage', value: 10, status: 'Active' },
    { id: 'PROMO-002', code: 'FREESHIP', type: 'free_shipping', value: 0, status: 'Scheduled' }
  ],
  insights: [
    { id: 'WISH-001', product: 'Noir Structured Tote', wishlists: 87, views: 420, trend: '+18%' },
    { id: 'WISH-002', product: 'Seraphina Pearl Necklace', wishlists: 64, views: 350, trend: '+12%' }
  ],
  reviews: [
    { id: 'REV-001', product: 'Seraphina Pearl Necklace', customer: 'Maria Santos', rating: 5, status: 'Approved' },
    { id: 'REV-002', product: 'Camel Mini Crossbody', customer: 'Ana Reyes', rating: 4, status: 'Pending' }
  ],
  reports: [
    { id: 'REP-001', metric: 'Revenue', value: 48920, period: 'Today', change: '+8%' },
    { id: 'REP-002', metric: 'Average Order Value', value: 4200, period: 'This Week', change: '+3%' }
  ],
  payments: [
    { id: 'PAY-001', order: '#1048', provider: 'PayMongo', amount: 8950, status: 'Paid' },
    { id: 'PAY-002', order: '#1049', provider: 'Maya QR', amount: 12500, status: 'Pending' }
  ],
  shipping: [
    { id: 'SHIP-001', order: '#1048', courier: 'J&T', tracking: 'JT123456', status: 'Preparing' },
    { id: 'SHIP-002', order: '#1050', courier: 'LBC', tracking: 'LBC98765', status: 'Delivered' }
  ],
  content: [
    { id: 'HOME-HERO', key: 'home.hero', title: 'Elegant shopping for jewelry and bags.', status: 'Published' },
    { id: 'BANNER-01', key: 'announcement.bar', title: 'Free shipping over ₱5,000', status: 'Published' }
  ],
  users: [
    { id: 'USR-001', name: 'Store Owner', email: 'admin@luxe.test', role: 'SUPER_ADMIN', status: 'Active' },
    { id: 'USR-002', name: 'Fulfillment Staff', email: 'staff@luxe.test', role: 'ORDER_STAFF', status: 'Active' }
  ],
  settings: [
    { id: 'SET-001', key: 'store_name', value: 'LUXE Jewelry & Bags', group: 'General' },
    { id: 'SET-002', key: 'payment_provider', value: 'PayMongo + Maya QR', group: 'Payments' }
  ]
};

export const adminCrudConfig = {
  'admin-products': { key: 'products', title: 'Product Management', endpoint: '/products', fields: ['categoryId','name','slug','description','price','material','isFeatured'] },
  'admin-variants': { key: 'variants', title: 'Product Variant Management', endpoint: '/variants', fields: ['productId','sku','color','size','stock'] },
  'admin-categories': { key: 'categories', title: 'Category & Collection Management', endpoint: '/categories', fields: ['name','slug','imageUrl'] },
  'admin-inventory': { key: 'inventory', title: 'Inventory Management', endpoint: '/inventory/movements', fields: ['variantId','type','quantity','note'], readOnly: false },
  'admin-orders': { key: 'orders', title: 'Order Management', endpoint: '/orders', fields: ['orderNumber','status','paymentStatus'], createDisabled: true, deleteDisabled: true, updateMode: 'status' },
  'admin-customers': { key: 'customers', title: 'Customer Management', endpoint: '/customers', fields: ['name','phone','isActive'] },
  'admin-promos': { key: 'promos', title: 'Promo Code & Discount Management', endpoint: '/promos', fields: ['code','type','value','isActive'] },
  'admin-insights': { key: 'insights', title: 'Wishlist & Demand Insights', endpoint: '/insights', fields: ['product','wishlists','views','trend'], readOnly: true },
  'admin-reviews': { key: 'reviews', title: 'Review Management', endpoint: '/reviews', fields: ['isApproved','comment'] },
  'admin-reports': { key: 'reports', title: 'Sales Reports', endpoint: '/reports/sales', fields: ['metric','value','period','change'], readOnly: true },
  'admin-payments': { key: 'payments', title: 'Payment Management', endpoint: '/payments', fields: ['status','reference'] },
  'admin-shipping': { key: 'shipping', title: 'Shipping & Delivery Management', endpoint: '/shipping', fields: ['method','courier','trackingNo'] },
  'admin-content': { key: 'content', title: 'Content Management', endpoint: '/content', fields: ['key','title','body','isActive'] },
  'admin-users': { key: 'users', title: 'Admin Users & Roles', endpoint: '/users', fields: ['name','email','role'], deleteDisabled: false },
  'admin-settings': { key: 'settings', title: 'Store Settings', endpoint: '/settings', fields: ['key','value','group'], createDisabled: true, deleteDisabled: true, updateMethod: 'PUT' }
};
