import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { SectionTitle } from '../components/SectionTitle.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { IS_DEMO_MODE, fetchProducts, products } from '../services/api.js';

export function ShopPage({ setRoute }) {
  const [items, setItems] = useState(products);
  const [loading, setLoading] = useState(!IS_DEMO_MODE);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (IS_DEMO_MODE) return undefined;
    fetchProducts()
      .then((data) => {
        if (!active) return;
        setItems(Array.isArray(data) && data.length ? data : []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load products.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="section-pad page">
      <SectionTitle eyebrow="Shop" title="All products" />
      <div className="shop-tools">
        <div><Search size={18}/> Search jewelry, bags, color, material...</div>
        <button>Sort: Newest</button>
        <button>Filters</button>
      </div>
      {loading ? <div className="summary-card">Loading products…</div> : error ? <div className="summary-card">{error}</div> : !items.length ? <div className="summary-card">No products are available right now.</div> : <div className="product-grid">{items.map(p => <ProductCard key={p.id} product={p} setRoute={setRoute}/>)}</div>}
    </section>
  );
}
