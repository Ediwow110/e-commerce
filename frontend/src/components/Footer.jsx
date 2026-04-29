import React from 'react';
import { routeToPath } from '../App.jsx';

export default function Footer({ setRoute }) {
  const handleNav = (e, target) => {
    e.preventDefault();
    setRoute(target);
  };
  return (
    <footer className="footer">
      <div>
        <h3>LUXE</h3>
        <p>Premium jewelry and bags commerce experience with elegant discovery, trust-focused product pages, and smooth checkout UX.</p>
      </div>
      <div className="footer-grid">
        <a href={routeToPath('shop')} onClick={(e) => handleNav(e, 'shop')}>Shop</a>
        <a href={routeToPath('tracking')} onClick={(e) => handleNav(e, 'tracking')}>Track Order</a>
        <a href={routeToPath('policies')} onClick={(e) => handleNav(e, 'policies')}>Policies</a>
        <a href={routeToPath('contact')} onClick={(e) => handleNav(e, 'contact')}>Contact</a>
      </div>
    </footer>
  );
}
