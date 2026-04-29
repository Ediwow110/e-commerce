import React, { useEffect, useState } from 'react';
import { SectionTitle } from '../components/SectionTitle.jsx';
import { IS_DEMO_MODE, fetchProducts, products } from '../services/api.js';
import ProductCard from '../components/ProductCard.jsx';

export function WishlistPage({ setRoute }) {
  const [items, setItems] = useState(products);
  const [loading, setLoading] = useState(!IS_DEMO_MODE);

  useEffect(() => {
    let active = true;
    if (IS_DEMO_MODE) return undefined;
    fetchProducts().then(data => { if (active) setItems(data); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <section className="section-pad page">
      <SectionTitle eyebrow="Saved items" title="Wishlist" />
      {loading ? <div className="summary-card">Loading saved items…</div> : <div className="product-grid">{items.slice(0,3).map(p => <ProductCard key={p.id} product={p} setRoute={setRoute}/>)}</div>}
    </section>
  );
}
