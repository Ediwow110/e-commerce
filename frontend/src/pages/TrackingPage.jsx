import React, { useEffect, useState } from 'react';
import { SectionTitle } from '../components/SectionTitle.jsx';
import { IS_DEMO_MODE, getOrder } from '../services/api.js';

export function TrackingPage({ routeParams }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(!IS_DEMO_MODE);
  const orderId = routeParams?.orderId;
  const orderNumber = order?.orderNumber || (IS_DEMO_MODE ? '#1051' : '#????');

  useEffect(() => {
    if (IS_DEMO_MODE) { setLoading(false); return; }
    if (!orderId) { setLoading(false); return; }
    setLoading(true);
    getOrder(orderId).then((data) => { setOrder(data); setLoading(false); }).catch(() => setLoading(false));
  }, [orderId]);

  const steps = [
    { label: 'Order placed', done: true },
    { label: 'Payment confirmed', done: order?.paymentStatus === 'PAID' },
    { label: 'Preparing order', done: ['PREPARING','TO_SHIP','SHIPPED','DELIVERED'].includes(order?.status) },
    { label: 'Ready to ship', done: ['TO_SHIP','SHIPPED','DELIVERED'].includes(order?.status) },
    { label: 'Delivered', done: order?.status === 'DELIVERED' }
  ];

  return (
    <section className="section-pad page">
      <SectionTitle eyebrow="Tracking" title={`Order ${orderNumber}`} />
      {loading ? <div className="summary-card">Loading...</div> : <div className="timeline">{steps.map((s,i) => (
        <div className={s.done?'done':''} key={s.label}>
          <span></span>
          <b>{s.label}</b>
          <p>{s.done?'Completed':'Pending'}</p>
        </div>
      ))}</div>}
    </section>
  );
}
