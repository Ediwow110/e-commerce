import React, { useEffect, useState } from 'react';
import { SectionTitle } from '../components/SectionTitle.jsx';
import { InfoCard } from '../components/InfoCard.jsx';
import AdminCrud from '../components/AdminCrud.jsx';
import { IS_DEMO_MODE, fetchAdminDashboard, formatPeso } from '../services/api.js';

function AdminDashboard() {
  const [stats, setStats] = useState(IS_DEMO_MODE ? { orders: 32, products: 6, customers: 3, lowStock: 4, revenue: 48920 } : null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (IS_DEMO_MODE) return undefined;
    fetchAdminDashboard().then((data) => { if (active) setStats(data); }).catch((err) => { if (active) setError(err.message || 'Unable to load dashboard.'); });
    return () => { active = false; };
  }, []);
  if (error) return <div className="summary-card">{error}</div>;
  if (!stats) return <div className="summary-card">Loading dashboard…</div>;
  return (
    <div>
      <SectionTitle eyebrow="Admin" title="Store dashboard" />
      <div className="dashboard-grid">
        <InfoCard title="Revenue" value={formatPeso(Number(stats.revenue || 0))}/>
        <InfoCard title="Orders" value={String(stats.orders || 0)}/><InfoCard title="Customers" value={String(stats.customers || 0)}/><InfoCard title="Low Stock" value={`${stats.lowStock || 0} items`}/>
      </div>
    </div>
  );
}

export function AdminPage({ route }) {
  if (route === 'admin-dashboard') return <AdminDashboard />;
  return <AdminCrud route={route} />;
}
