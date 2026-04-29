import React, { useState } from 'react';
import { SectionTitle } from '../components/SectionTitle.jsx';
import { IS_DEMO_MODE, addToCart, fetchProducts, formatPeso, products } from '../services/api.js';

export function ProductPage({ setRoute, user }) {
  const [items, setItems] = useState(products);
  const [loading, setLoading] = useState(!IS_DEMO_MODE);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    let active = true;
    if (IS_DEMO_MODE) return undefined;
    fetchProducts().then(data => { if (active) setItems(data); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const p = items[0] || products[0];
  if (!p) return <section className="section-pad page"><div className="summary-card">Product unavailable.</div></section>;

  const handleAddToCart = async () => {
    if (!user) { setRoute('customer-login'); return; }
    setAdding(true); setError('');
    try {
      const variantId = p.variants?.[0]?.id || null;
      await addToCart({ productId: p.id, variantId, quantity: 1 });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) { setError(err.message || 'Failed to add to cart'); }
    finally { setAdding(false); }
  };

  return (
    <section className="section-pad product-detail page">
      <div className="gallery">
        <img src={p.image || p.images?.[0]?.url} alt={p.name}/>
        <div>
          <img src={p.images?.[0]?.url || 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=800&auto=format&fit=crop'} alt={p.name}/>
          <img src={p.images?.[1]?.url || 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?q=80&w=800&auto=format&fit=crop'} alt={p.name}/>
        </div>
      </div>
      <div className="detail-panel">
        <span className="eyebrow">{p.category?.name || p.category}</span>
        <h1>{p.name}</h1>
        <p className="price">{formatPeso(Number(p.salePrice || p.price))}</p>
        <p>{p.description || 'Premium craftsmanship and elevated daily wear.'}</p>
        <label>Material<select><option>{p.material || p.variants?.[0]?.material || 'Signature finish'}</option></select></label>
        <label>Length<select><option>16 inches</option><option>18 inches</option></select></label>
        {error && <div className="auth-error">{error}</div>}
        {added && <div className="auth-success">Added to cart!</div>}
        <div className="actions">
          <button className="pill dark large" onClick={handleAddToCart} disabled={adding}>
            {adding ? 'Adding...' : 'Add to Cart'}
          </button>
          <button className="pill outline large" onClick={() => setRoute('wishlist')}>Wishlist</button>
        </div>
        <div className="trust-list">
          <span>Secure checkout</span>
          <span>Warranty included</span>
          <span>Authenticity certificate ready</span>
          <span>Easy returns</span>
        </div>
      </div>
    </section>
  );
}
