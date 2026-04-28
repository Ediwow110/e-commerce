import React from 'react';

export default function Footer({ setRoute }) {
  return (
    <footer className="footer">
      <div>
        <h3>LUXE</h3>
        <p>Premium jewelry and bags commerce experience with elegant discovery, trust-focused product pages, and smooth checkout UX.</p>
      </div>
      <div className="footer-grid">
        <button onClick={() => setRoute('shop')}>Shop</button>
        <button onClick={() => setRoute('tracking')}>Track Order</button>
        <button onClick={() => setRoute('policies')}>Policies</button>
        <button onClick={() => setRoute('contact')}>Contact</button>
      </div>
    </footer>
  );
}
