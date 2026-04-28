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

export const mockSignIn = async ({ email, password }) => {
  await new Promise((resolve) => setTimeout(resolve, 450));
  return {
    name: email?.split('@')[0] || 'admin',
    email,
    role: 'Store Owner'
  };
};

export const formatPeso = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value);


export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) throw new Error('VITE_API_URL is not configured.');
  const token = localStorage.getItem('luxe-access-token');
  const response = await fetch(API_BASE_URL + path, {
    ...options,
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

export async function signIn(credentials) {
  if (!API_BASE_URL) return mockSignIn(credentials);
  const data = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
  localStorage.setItem('luxe-access-token', data.accessToken);
  localStorage.setItem('luxe-refresh-token', data.refreshToken);
  return data.user;
}

export async function signInWithGoogle(idToken, role = 'CUSTOMER') {
  if (!API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return { name: 'Google Demo User', email: 'google-user@example.com', role };
  }
  const data = await apiRequest('/auth/google', { method: 'POST', body: JSON.stringify({ idToken, role }) });
  localStorage.setItem('luxe-access-token', data.accessToken);
  localStorage.setItem('luxe-refresh-token', data.refreshToken);
  return data.user;
}

export async function adminApi(path, options = {}) {
  return apiRequest('/admin' + path, options);
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
    { id: 'USR-001', name: 'Store Owner', email: 'admin@luxe.test', role: 'Admin', status: 'Active' },
    { id: 'USR-002', name: 'Fulfillment Staff', email: 'staff@luxe.test', role: 'Staff', status: 'Active' }
  ],
  settings: [
    { id: 'SET-001', key: 'store_name', value: 'LUXE Jewelry & Bags', group: 'General' },
    { id: 'SET-002', key: 'payment_provider', value: 'PayMongo + Maya QR', group: 'Payments' }
  ]
};

export const adminCrudConfig = {
  'admin-products': { key: 'products', title: 'Product Management', endpoint: '/products', fields: ['sku','name','category','price','stock','status'] },
  'admin-variants': { key: 'variants', title: 'Product Variant Management', endpoint: '/variants', fields: ['product','sku','color','size','stock'] },
  'admin-categories': { key: 'categories', title: 'Category & Collection Management', endpoint: '/categories', fields: ['name','slug','items','status'] },
  'admin-inventory': { key: 'inventory', title: 'Inventory Management', endpoint: '/inventory', fields: ['sku','product','stock','lowStockAt','movement'], readOnly: false },
  'admin-orders': { key: 'orders', title: 'Order Management', endpoint: '/orders', fields: ['id','customer','total','status','fulfillment'] },
  'admin-customers': { key: 'customers', title: 'Customer Management', endpoint: '/customers', fields: ['name','email','spend','tag','orders'] },
  'admin-promos': { key: 'promos', title: 'Promo Code & Discount Management', endpoint: '/promos', fields: ['code','type','value','status'] },
  'admin-insights': { key: 'insights', title: 'Wishlist & Demand Insights', endpoint: '/insights', fields: ['product','wishlists','views','trend'], readOnly: true },
  'admin-reviews': { key: 'reviews', title: 'Review Management', endpoint: '/reviews', fields: ['product','customer','rating','status'] },
  'admin-reports': { key: 'reports', title: 'Sales Reports', endpoint: '/reports/sales', fields: ['metric','value','period','change'], readOnly: true },
  'admin-payments': { key: 'payments', title: 'Payment Management', endpoint: '/payments', fields: ['order','provider','amount','status'] },
  'admin-shipping': { key: 'shipping', title: 'Shipping & Delivery Management', endpoint: '/shipping', fields: ['order','courier','tracking','status'] },
  'admin-content': { key: 'content', title: 'Content Management', endpoint: '/content', fields: ['key','title','status'] },
  'admin-users': { key: 'users', title: 'Admin Users & Roles', endpoint: '/users', fields: ['name','email','role','status'] },
  'admin-settings': { key: 'settings', title: 'Store Settings', endpoint: '/settings', fields: ['key','value','group'] }
};
