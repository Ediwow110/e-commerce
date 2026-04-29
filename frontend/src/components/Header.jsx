import React from 'react';
import { Crown, Search, Heart, ShoppingBag, User, Menu, LogOut } from 'lucide-react';
import { routeToPath } from '../App.jsx';

export default function Header({ route, setRoute, user, onLogout }) {
  const isAdminArea = route.startsWith('admin');
  const isAdminUser = user && user.role !== 'CUSTOMER';
  const links = [
    ['home', 'Home'], ['shop', 'Shop'], ['category', 'Categories'], ['about', 'About'], ['contact', 'Contact']
  ];

  const accountTarget = user?.role === 'CUSTOMER' ? 'account' : 'customer-login';

  const handleNav = (e, target) => {
    e.preventDefault();
    setRoute(target);
  };

  return (
    <header className="topbar glass">
      <button className="icon-btn mobile-only" aria-label="Open menu"><Menu size={20} /></button>
      <a href={routeToPath(isAdminArea ? 'admin-dashboard' : 'home')} className="brand" onClick={(e) => handleNav(e, isAdminArea ? 'admin-dashboard' : 'home')}>
        <span className="brand-mark"><Crown size={20} /></span>
        <span><strong>LUXE</strong><small>Jewelry & Bags</small></span>
      </a>

      {!isAdminArea && (
        <nav className="nav-links" aria-label="Store navigation">
          {links.map(([key, label]) => (
            <a key={key} href={routeToPath(key)} onClick={(e) => handleNav(e, key)} className={route === key ? 'active' : ''}>
              {label}
            </a>
          ))}
        </nav>
      )}

      <div className="header-actions">
        {!isAdminArea && <>
          <a href={routeToPath('search')} className="icon-btn" onClick={(e) => handleNav(e, 'search')} aria-label="Search"><Search size={19} /></a>
          <a href={routeToPath('wishlist')} className="icon-btn" onClick={(e) => handleNav(e, 'wishlist')} aria-label="Wishlist"><Heart size={19} /></a>
          <a href={routeToPath(accountTarget)} className="icon-btn" onClick={(e) => handleNav(e, accountTarget)} aria-label={user ? 'My account' : 'Sign in'}><User size={19} /></a>
          <a href={routeToPath('cart')} className="pill dark" onClick={(e) => handleNav(e, 'cart')}><ShoppingBag size={17} /> Cart</a>
          {!user && <a href={routeToPath('customer-login')} className="pill outline customer-signin" onClick={(e) => handleNav(e, 'customer-login')}>Sign In</a>}
          {user?.role === 'CUSTOMER' && <button className="pill outline customer-signin" onClick={onLogout}>Logout</button>}
        </>}
        {isAdminArea && isAdminUser && <button className="pill dark" onClick={onLogout}><LogOut size={16} /> Logout</button>}
      </div>
    </header>
  );
}
