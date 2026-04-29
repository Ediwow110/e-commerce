import React, { useEffect, useState } from 'react';
import { SectionTitle } from '../components/SectionTitle.jsx';
import { IS_DEMO_MODE, getOrder } from '../services/api.js';
import { PackageCheck } from 'lucide-react';

export function ConfirmationPage({ setRoute, routeParams }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(!IS_DEMO_MODE);
  const [error, setError] = useState('');
  const orderId = routeParams?.orderId;
  const orderNumber = routeParams?.orderNumber;

  useEffect(() => {
    if (IS_DEMO_MODE) { setLoading(false); return; }
    if (!orderId) { setError('Order information missing'); setLoading(false); return; }
    setLoading(true);
    getOrder(orderId).then((data) => { setOrder(data); setLoading(false); }).catch((err) => { setError(err.message || 'Failed to load order'); setLoading(false); });
  }, [orderId]);

  if (loading) return <section className="section-pad page center-card"><div className="success-card"><h1>Loading order...</h1></div></section>;
  if (error) return <section className="section-pad page center-card"><div className="success-card"><h1>Error</h1><p>{error}</p><button className="pill dark" onClick={() => setRoute('account')}>View Account</button></div></section>;

  const displayNumber = order?.orderNumber || orderNumber || '#????';
  return (
    <section className="section-pad page center-card">
      <div className="success-card">
        <PackageCheck size={52}/>
        <h1>Order confirmed</h1>
        <p>Your order {displayNumber} has been placed successfully.</p>
        <p className="muted">You will receive a confirmation email shortly.</p>
        <button className="pill dark" onClick={() => setRoute('tracking', { orderId: order?.id || orderId })}>Track Order</button>
        <button className="pill outline" onClick={() => setRoute('home')}>Continue Shopping</button>
      </div>
    </section>
  );
}
