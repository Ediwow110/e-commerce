import React, { useEffect, useState } from 'react';
import { SectionTitle } from '../components/SectionTitle.jsx';
import { InfoCard } from '../components/InfoCard.jsx';
import { IS_DEMO_MODE, fetchMyOrders, adminMockData } from '../services/api.js';

export function AccountPage() {
  const [orderItems, setOrderItems] = useState(IS_DEMO_MODE ? adminMockData.orders : []);
  const [loading, setLoading] = useState(!IS_DEMO_MODE);

  useEffect(() => {
    let active = true;
    if (IS_DEMO_MODE) return undefined;
    fetchMyOrders().then((data) => { if (active) setOrderItems(Array.isArray(data) ? data : []); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <section className="section-pad page">
      <SectionTitle eyebrow="Account" title="Customer account" />
      <div className="dashboard-grid">
        <InfoCard title="Profile" value="Customer details"/>
        <InfoCard title="Addresses" value="Saved securely"/>
        <InfoCard title="Order History" value={loading ? 'Loading…' : `${orderItems.length} orders`}/>
        <InfoCard title="Wishlist" value="Saved items"/>
      </div>
    </section>
  );
}
