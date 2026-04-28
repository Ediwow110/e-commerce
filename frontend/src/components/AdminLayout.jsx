import React from 'react';
import { LayoutDashboard, Package, Layers, Boxes, ShoppingCart, Users, BadgePercent, Heart, Star, BarChart3, CreditCard, Truck, FileText, UserCog, Settings, Lock } from 'lucide-react';

const adminRoles = ['SUPER_ADMIN','ADMIN','MANAGER','STAFF','INVENTORY_STAFF','ORDER_STAFF','CONTENT_STAFF','SUPPORT_STAFF'];
const linkRoles = {
  'admin-dashboard': adminRoles,
  'admin-products': ['SUPER_ADMIN','ADMIN','MANAGER','INVENTORY_STAFF','CONTENT_STAFF','STAFF'],
  'admin-variants': ['SUPER_ADMIN','ADMIN','MANAGER','INVENTORY_STAFF','STAFF'],
  'admin-categories': ['SUPER_ADMIN','ADMIN','MANAGER','INVENTORY_STAFF','CONTENT_STAFF','STAFF'],
  'admin-inventory': ['SUPER_ADMIN','ADMIN','MANAGER','INVENTORY_STAFF','STAFF'],
  'admin-orders': ['SUPER_ADMIN','ADMIN','MANAGER','ORDER_STAFF','SUPPORT_STAFF','STAFF'],
  'admin-customers': ['SUPER_ADMIN','ADMIN','MANAGER','ORDER_STAFF','SUPPORT_STAFF','STAFF'],
  'admin-promos': ['SUPER_ADMIN','ADMIN','MANAGER'],
  'admin-insights': ['SUPER_ADMIN','ADMIN','MANAGER'],
  'admin-reviews': ['SUPER_ADMIN','ADMIN','MANAGER','SUPPORT_STAFF','STAFF'],
  'admin-reports': ['SUPER_ADMIN','ADMIN','MANAGER'],
  'admin-payments': ['SUPER_ADMIN','ADMIN','MANAGER','ORDER_STAFF'],
  'admin-shipping': ['SUPER_ADMIN','ADMIN','MANAGER','ORDER_STAFF','STAFF'],
  'admin-content': ['SUPER_ADMIN','ADMIN','MANAGER','CONTENT_STAFF'],
  'admin-users': ['SUPER_ADMIN'],
  'admin-settings': ['SUPER_ADMIN']
};

const adminLinks = [
  ['admin-dashboard', 'Dashboard', LayoutDashboard],
  ['admin-products', 'Products', Package],
  ['admin-variants', 'Variants', Layers],
  ['admin-categories', 'Categories', Layers],
  ['admin-inventory', 'Inventory', Boxes],
  ['admin-orders', 'Orders', ShoppingCart],
  ['admin-customers', 'Customers', Users],
  ['admin-promos', 'Promos', BadgePercent],
  ['admin-insights', 'Wishlist Insights', Heart],
  ['admin-reviews', 'Reviews', Star],
  ['admin-reports', 'Reports', BarChart3],
  ['admin-payments', 'Payments', CreditCard],
  ['admin-shipping', 'Shipping', Truck],
  ['admin-content', 'Content', FileText],
  ['admin-users', 'Admin Users', UserCog],
  ['admin-settings', 'Settings', Settings]
];

export default function AdminLayout({ route, setRoute, user, children }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar glass">
        <div className="admin-title">Store Admin <span>{user?.role || 'NO_ROLE'}</span></div>
        {adminLinks.map(([key, label, Icon]) => {
          const allowed = (linkRoles[key] || adminRoles).includes(user?.role);
          return (
            <button key={key} onClick={() => allowed && setRoute(key)} className={`${route === key ? 'active' : ''} ${!allowed ? 'locked' : ''}`} disabled={!allowed} title={!allowed ? 'Your role cannot access this section' : label}>
              {allowed ? <Icon size={17} /> : <Lock size={17} />} {label}
            </button>
          );
        })}
      </aside>
      <section className="admin-content">{children}</section>
    </div>
  );
}
