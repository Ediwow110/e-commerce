import React from 'react';
import { LayoutDashboard, Package, Layers, Boxes, ShoppingCart, Users, BadgePercent, Heart, Star, BarChart3, CreditCard, Truck, FileText, UserCog, Settings } from 'lucide-react';

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

export default function AdminLayout({ route, setRoute, children }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar glass">
        <div className="admin-title">Store Admin</div>
        {adminLinks.map(([key, label, Icon]) => (
          <button key={key} onClick={() => setRoute(key)} className={route === key ? 'active' : ''}>
            <Icon size={17} /> {label}
          </button>
        ))}
      </aside>
      <section className="admin-content">{children}</section>
    </div>
  );
}
