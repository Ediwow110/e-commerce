import React from 'react';
import { Crown, Search, Heart, ShoppingBag, User, Menu, LogOut } from 'lucide-react';

export default function Header({ route, setRoute, user, onLogout }) {
  const isAdmin = route.startsWith('admin') || route === 'login';
  const accountTarget = user ? 'account' : 'login';
  const links = [
    ['home', 'Home'], ['shop', 'Shop'], ['category', 'Categories'], ['about', 'About'], ['contact', 'Contact']
  ];

  return (
    <header className="topbar glass">
      <button className="icon-btn mobile-only"><Menu size={20} /></button>
      <button className="brand" onClick={() => setRoute('home')}>
        <span className="brand-mark"><Crown size={20} /></span>
        <span><strong>LUXE</strong><small>Jewelry & Bags</small></span>
      </button>

      {!isAdmin && (
        <nav className="nav-links">
          {links.map(([key, label]) => <button key={key} onClick={() => setRoute(key)} className={route === key ? 'active' : ''}>{label}</button>)}
        </nav>
      )}

      <div className="header-actions">
        {!isAdmin && <>
          <button className="icon-btn" onClick={() => setRoute('search')}><Search size={19} /></button>
          <button className="icon-btn" onClick={() => setRoute('wishlist')}><Heart size={19} /></button>
          <button className="icon-btn" onClick={() => setRoute(accountTarget)}><User size={19} /></button>
          <button className="pill dark" onClick={() => setRoute('cart')}><ShoppingBag size={17} /> Cart</button>
        </>}
        {isAdmin && user && <button className="pill dark" onClick={onLogout}><LogOut size={16} /> Logout</button>}
        {!user && <button className="pill outline" onClick={() => setRoute('login')}>Sign In</button>}
      </div>
    </header>
  );
}
