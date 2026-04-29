import React, { useState } from 'react';
import { Sparkles, ShieldCheck, Truck, CreditCard, PackageCheck, Crown } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import { SectionTitle } from '../components/SectionTitle.jsx';
import { IS_DEMO_MODE, fetchProducts, products } from '../services/api.js';
import { useEffect, useMemo } from 'react';

function useStoreProducts() {
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
    return () => {
      active = false;
    };
  }, []);

  return { items, loading, error };
}

function Collections({ setRoute }) {
  const items = [
    ['Fine Jewelry', 'Pearls, rings, earrings, bracelets, and everyday gold pieces.', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1200&auto=format&fit=crop'],
    ['Signature Bags', 'Structured totes, crossbodies, clutches, and occasion bags.', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=1200&auto=format&fit=crop'],
    ['Gift Sets', 'Premium pairings for birthdays, anniversaries, and holidays.', 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=1200&auto=format&fit=crop']
  ];
  return <section className="section-pad"><SectionTitle eyebrow="Shop by story" title="Curated collections" /><div className="collection-grid">{items.map(([title, text, image]) => <button className="collection-card shine" key={title} onClick={() => setRoute('category')}><img src={image} /><div><h3>{title}</h3><p>{text}</p></div></button>)}</div></section>;
}

function FeaturedProducts({ setRoute }) {
  const [filter, setFilter] = useState('All');
  const { items, loading, error } = useStoreProducts();
  const visible = useMemo(() => filter === 'All' ? items : items.filter(p => p.category?.name === filter || p.category === filter), [filter, items]);
  return <section className="section-pad warm"><div className="split-head"><SectionTitle eyebrow="Premium catalog" title="Featured products" /> <div className="filters">{['All','Jewelry','Bags'].map(f => <button className={filter===f?'active':''} onClick={() => setFilter(f)} key={f}>{f}</button>)}</div></div>{error && <div className="error-banner" style={{background:'#fee',color:'#c33',padding:'12px 16px',borderRadius:'8px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'8px'}}><span>⚠️</span><span>{error}</span></div>}{loading ? <div className="summary-card">Loading products…</div> : !error && !visible.length ? <div className="summary-card">No products are currently available.</div> : <div className="product-grid">{visible.map(p => <ProductCard key={p.id} product={p} setRoute={setRoute} />)}</div>}</section>;
}

function Experience() {
  const features = [
    [ShieldCheck, 'Trust layer', 'Warranty, certificates, secure payment signals, and return policy placement.'],
    [Sparkles, 'Premium product pages', 'Large visuals, material details, variant selectors, care notes, and related pairings.'],
    [Truck, 'Delivery clarity', 'Pickup, shipping estimates, fees, and order tracking shown before payment.'],
    [Crown, 'Brand-first UX', 'Editorial layouts and refined motion to make the store feel premium.']
  ];
  return <section className="section-pad experience"><div className="dark-panel"><span className="eyebrow">UX strategy</span><h2>Designed to make high-value products feel trustworthy.</h2><p>The interface highlights craftsmanship, visual quality, materials, authenticity, and smooth decisions.</p></div><div className="feature-grid">{features.map(([Icon,title,text]) => <div className="feature-card" key={title}><Icon size={24}/><h3>{title}</h3><p>{text}</p></div>)}</div></section>;
}

function CheckoutFlow() {
  const steps = [[PackageCheck,'Cart','Review items and vouchers.'],[Truck,'Delivery','Choose shipping or pickup.'],[CreditCard,'Payment','Select payment method.'],[PackageCheck,'Tracking','Get order updates.']];
  return <section className="section-pad black"><SectionTitle eyebrow="Checkout Journey" title="Simple enough for buyers, detailed enough for premium orders." /> <div className="step-grid">{steps.map(([Icon,title,text],i)=><div className="step-card" key={title}><Icon size={24}/><span>0{i+1}</span><h3>{title}</h3><p>{text}</p></div>)}</div></section>;
}

export function CustomerHome({ setRoute }) {
  return (
    <main>
      <section className="hero section-pad">
        <div className="hero-copy fade-up">
          <span className="eyebrow"><Sparkles size={16} /> Premium Frontend UI</span>
          <h1>Elegant shopping for jewelry and bags.</h1>
          <p>A luxury frontend with smooth browsing effects, refined product discovery, wishlist, cart, checkout, order tracking, and customer account screens.</p>
          <div className="actions"><button className="pill dark large" onClick={() => setRoute('shop')}>Explore Shop</button><button className="pill outline large" onClick={() => setRoute('product')}>View Product Page</button></div>
          <div className="stats"><div><b>400+</b><span>Curated items</span></div><div><b>24h</b><span>Order updates</span></div><div><b>4.9</b><span>Rating</span></div></div>
        </div>
        <div className="hero-visual float-layer">
          <img className="hero-main" src="https://images.unsplash.com/photo-160112141207-7a88fb7ce338?q=80&w=1400&auto=format&fit=crop" alt="Jewelry" />
          <img className="hero-small" src="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop" alt="Bag" />
          <div className="glass hero-badge"><ShieldCheck size={20} /> Authenticity ready</div>
        </div>
      </section>
      <Collections setRoute={setRoute} />
      <FeaturedProducts setRoute={setRoute} />
      <Experience />
      <CheckoutFlow />
    </main>
  );
}
