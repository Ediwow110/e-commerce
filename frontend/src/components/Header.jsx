import React from 'react';
import { Crown, Search, Heart, ShoppingBag, User, Menu, LogOut } from 'lucide-react';

export default function Header({ route, setRoute, user, onLogout }) {
  const isAdminArea = route.startsWith('admin');
  const isAdminUser = user && user.role !== 'CUSTOMER';
  const links = [
    ['home', 'Home'], ['shop', 'Shop'], ['category', 'Categories'], ['about', 'About'], ['contact', 'Contact']
  ];

  const accountTarget = user?.role === 'CUSTOMER' ? 'account' : 'customer-login';

  return (
    <header className="topbar glass">
      <button className="icon-btn mobile-only" aria-label="Open menu"><Menu size={20} /></button>
      <button className="brand" onClick={() => setRoute(isAdminArea ? 'admin-dashboard' : 'home')}>
        <span className="brand-mark"><Crown size={20} /></span>
        <span><strong>LUXE</strong><small>Jewelry & Bags</small></span>
      </button>

      {!isAdminArea && (
        <nav className="nav-links" aria-label="Store navigation">
          {links.map(([key, label]) => <button key={key} onClick={() => setRoute(key)} className={route === key ? 'active' : ''}>{label}</button>)}
        </nav>
      )}

      <div className="header-actions">
        {!isAdminArea && <>
          <button className="icon-btn" onClick={() => setRoute('search')} aria-label="Search"><Search size={19} /></button>
          <button className="icon-btn" onClick={() => setRoute('wishlist')} aria-label="Wishlist"><Heart size={19} /></button>
          <button className="icon-btn" onClick={() => setRoute(accountTarget)} aria-label={user ? 'My account' : 'Sign in'}><User size={19} /></button>
          <button className="pill dark" onClick={() => setRoute('cart')}><ShoppingBag size={17} /> Cart</button>
          {!user && <button className="pill outline customer-signin" onClick={() => setRoute('customer-login')}>Sign In</button>}
          {user?.role === 'CUSTOMER' && <button className="pill outline customer-signin" onClick={onLogout}>Logout</button>}
        </>}
        {isAdminArea && isAdminUser && <button className="pill dark" onClick={onLogout}><LogOut size={16} /> Logout</button>}
      </div>
    </header>
  );
}
