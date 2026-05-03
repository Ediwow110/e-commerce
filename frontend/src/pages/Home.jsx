import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, ShieldCheck, Truck, CreditCard, PackageCheck, Search, Crown } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import { IS_DEMO_MODE, acceptInvitation, addToCart, adminMockData, clearCart, createCheckoutSession, createOrder, fetchAdminDashboard, fetchInvitation, fetchMyOrders, fetchProducts, formatPeso, getCart, products, removeFromCart, requestPasswordReset, resetPassword, updateCartItem } from '../services/api.js';
import { GoogleLogin } from '@react-oauth/google';
import AdminCrud from '../components/AdminCrud.jsx';

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
          <img className="hero-main" src="https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?q=80&w=1400&auto=format&fit=crop" alt="Jewelry" />
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
  const steps = [[ShoppingBagIcon,'Cart','Review items and vouchers.'],[Truck,'Delivery','Choose shipping or pickup.'],[CreditCard,'Payment','Select payment method.'],[PackageCheck,'Tracking','Get order updates.']];
  return <section className="section-pad black"><SectionTitle eyebrow="Checkout Journey" title="Simple enough for buyers, detailed enough for premium orders." /> <div className="step-grid">{steps.map(([Icon,title,text],i)=><div className="step-card" key={title}><Icon size={24}/><span>0{i+1}</span><h3>{title}</h3><p>{text}</p></div>)}</div></section>;
}
function ShoppingBagIcon(props){ return <PackageCheck {...props}/> }

export function ShopPage({ setRoute }) { const { items, loading, error } = useStoreProducts(); return <section className="section-pad page"><SectionTitle eyebrow="Shop" title="All products" /><div className="shop-tools"><div><Search size={18}/> Search jewelry, bags, color, material...</div><button>Sort: Newest</button><button>Filters</button></div>{loading ? <div className="summary-card">Loading products…</div> : error ? <div className="summary-card">{error}</div> : !items.length ? <div className="summary-card">No products are available right now.</div> : <div className="product-grid">{items.map(p => <ProductCard key={p.id} product={p} setRoute={setRoute}/>)}</div>}</section>; }
export function CategoryPage({ setRoute }) { return <section className="section-pad page"><SectionTitle eyebrow="Categories" title="Browse by category" /><div className="category-grid">{['Necklaces','Rings','Earrings','Bracelets','Tote Bags','Crossbody Bags','Clutches','Gift Sets'].map(c=><button className="category-tile" key={c} onClick={()=>setRoute('shop')}>{c}</button>)}</div></section>; }
export function ProductPage({ setRoute, user }) {
  const { items } = useStoreProducts();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');
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

  return <section className="section-pad product-detail page"><div className="gallery"><img src={p.image || p.images?.[0]?.url} alt={p.name}/><div><img src={p.images?.[0]?.url || 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=800&auto=format&fit=crop'} alt={p.name}/><img src={p.images?.[1]?.url || 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?q=80&w=800&auto=format&fit=crop'} alt={p.name}/></div></div><div className="detail-panel"><span className="eyebrow">{p.category?.name || p.category}</span><h1>{p.name}</h1><p className="price">{formatPeso(Number(p.salePrice || p.price))}</p><p>{p.description || 'Premium craftsmanship and elevated daily wear.'}</p><label>Material<select><option>{p.material || p.variants?.[0]?.material || 'Signature finish'}</option></select></label><label>Length<select><option>16 inches</option><option>18 inches</option></select></label>{error && <div className="auth-error">{error}</div>}{added && <div className="auth-success">Added to cart!</div>}<div className="actions"><button className="pill dark large" onClick={handleAddToCart} disabled={adding}>{adding ? 'Adding...' : 'Add to Cart'}</button><button className="pill outline large" onClick={()=>setRoute('wishlist')}>Wishlist</button></div><div className="trust-list"><span>Secure checkout</span><span>Warranty included</span><span>Authenticity certificate ready</span><span>Easy returns</span></div></div></section>;
}
export function WishlistPage({ setRoute }) { const { items, loading } = useStoreProducts(); return <section className="section-pad page"><SectionTitle eyebrow="Saved items" title="Wishlist" />{loading ? <div className="summary-card">Loading saved items…</div> : <div className="product-grid">{items.slice(0,3).map(p => <ProductCard key={p.id} product={p} setRoute={setRoute}/>)}</div>}</section>; }
export function CartPage({ setRoute, user }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(!IS_DEMO_MODE);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    let active = true;
    if (!user && !IS_DEMO_MODE) { setRoute('customer-login'); return; }
    if (IS_DEMO_MODE) {
      setCartItems(products.slice(0,2).map((p, i) => ({ id: i+1, product: p, quantity: 1, variant: null })));
      setLoading(false);
      return;
    }
    setLoading(true);
    getCart().then((data) => {
      if (!active) return;
      setCartItems(Array.isArray(data) ? data : []);
    }).catch((err) => {
      if (!active) return;
      setError(err.message || 'Failed to load cart');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, setRoute]);

  const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.product?.price || item.product?.salePrice || 0) * (item.quantity || 1)), 0);
  const shipping = subtotal > 5000 ? 0 : 250;

  const handleUpdateQuantity = async (itemId, quantity) => {
    if (quantity < 1) return handleRemove(itemId);
    setUpdating(prev => ({ ...prev, [itemId]: true }));
    try {
      await updateCartItem(itemId, quantity);
      setCartItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity } : item));
    } catch (err) { setError(err.message); }
    finally { setUpdating(prev => ({ ...prev, [itemId]: false })); }
  };

  const handleRemove = async (itemId) => {
    setUpdating(prev => ({ ...prev, [itemId]: true }));
    try {
      await removeFromCart(itemId);
      setCartItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err) { setError(err.message); }
    finally { setUpdating(prev => ({ ...prev, [itemId]: false })); }
  };

  const handleCheckout = () => {
    if (!user) { setRoute('customer-login'); return; }
    if (cartItems.length === 0) { setError('Your cart is empty'); return; }
    setRoute('checkout');
  };

  return <section className="section-pad page cart-layout"><div><SectionTitle eyebrow="Shopping bag" title="Your cart" />{error && <div className="auth-error">{error}</div>}{loading ? <div className="summary-card">Loading cart...</div> : cartItems.length === 0 ? <div className="summary-card">Your cart is empty. <button className="pill dark" onClick={()=>setRoute('shop')}>Continue Shopping</button></div> : cartItems.map(item => <div className="line-item" key={item.id}><img src={item.product?.images?.[0]?.url || item.product?.image}/><div><b>{item.product?.name}</b><p>{item.product?.material}</p><div className="quantity-controls"><button onClick={() => handleUpdateQuantity(item.id, (item.quantity || 1) - 1)} disabled={updating[item.id]}>-</button><span>{item.quantity || 1}</span><button onClick={() => handleUpdateQuantity(item.id, (item.quantity || 1) + 1)} disabled={updating[item.id]}>+</button><button onClick={() => handleRemove(item.id)} disabled={updating[item.id]}>Remove</button></div></div><strong>{formatPeso(Number(item.product?.price || item.product?.salePrice || 0) * (item.quantity || 1))}</strong></div>)}</div><div className="summary-card"><h3>Order Summary</h3><p>Subtotal <b>{formatPeso(subtotal)}</b></p><p>Shipping <b>{formatPeso(shipping)}</b></p><input placeholder="Promo code"/><button className="pill dark large full" onClick={handleCheckout} disabled={loading || cartItems.length === 0}>Checkout</button></div></section>;
}
export function CheckoutPage({ setRoute, user }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(!IS_DEMO_MODE);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ fullName: user?.name || '', email: user?.email || '', phone: '', line1: '', city: '', province: '', postalCode: '', shippingMethod: 'standard_delivery', paymentMethod: 'gcash_maya', customerNote: '' });
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  useEffect(() => {
    let active = true;
    if (!user && !IS_DEMO_MODE) { setRoute('customer-login'); return; }
    if (IS_DEMO_MODE) {
      setCartItems(products.slice(0,2).map((p, i) => ({ id: i+1, product: p, quantity: 1, variant: null })));
      setLoading(false);
      return;
    }
    setLoading(true);
    getCart().then((data) => {
      if (!active) return;
      const items = Array.isArray(data) ? data : [];
      if (items.length === 0) { setRoute('cart'); return; }
      setCartItems(items);
    }).catch((err) => { if (active) setError(err.message || 'Failed to load cart'); })
    .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, setRoute]);

  const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.product?.price || item.product?.salePrice || 0) * (item.quantity || 1)), 0);
  const shipping = form.shippingMethod === 'store_pickup' ? 0 : (subtotal > 5000 ? 0 : 250);
  const total = subtotal + shipping;

  const placeOrder = async () => {
    const requiresAddress = form.shippingMethod !== 'store_pickup';
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim()) { setError('Please complete your customer information.'); return; }
    if (requiresAddress && (!form.line1.trim() || !form.city.trim())) { setError('Please add your delivery address.'); return; }
    setError(''); setPlacing(true);
    try {
      const orderPayload = {
        shippingMethod: form.shippingMethod,
        shippingFee: shipping,
        deliveryAddress: requiresAddress ? { fullName: form.fullName, phone: form.phone, line1: form.line1, city: form.city, province: form.province, postalCode: form.postalCode, country: 'Philippines' } : undefined,
        customerNote: form.customerNote
      };
      const order = await createOrder(orderPayload);
      if (!order?.id) throw new Error('Order creation failed');
      const payment = await createCheckoutSession({ orderId: order.id, provider: form.paymentMethod === 'gcash_maya' ? 'paymongo' : form.paymentMethod });
      if (payment?.checkoutUrl) { window.location.href = payment.checkoutUrl; return; }
      clearCart().catch(() => {});
      setRoute('confirmation', { orderId: order.id, orderNumber: order.orderNumber });
    } catch (err) { setError(err.message || 'Failed to place order. Please try again.'); }
    finally { setPlacing(false); }
  };

  return <section className="section-pad page checkout-layout"><div><SectionTitle eyebrow="Checkout" title="Complete your order" /><div className="checkout-steps"><span className="active">1 Cart</span><span className="active">2 Information</span><span className={form.line1 ? 'active' : ''}>3 Delivery</span><span>4 Payment</span></div><div className="form-card"><input value={form.fullName} onChange={update('fullName')} placeholder="Full name"/><input value={form.email} onChange={update('email')} placeholder="Email address" type="email"/><input value={form.phone} onChange={update('phone')} placeholder="Phone number"/><select value={form.shippingMethod} onChange={update('shippingMethod')}><option value="standard_delivery">Standard Delivery</option><option value="store_pickup">Store Pickup</option></select>{form.shippingMethod !== 'store_pickup' && <><input value={form.line1} onChange={update('line1')} className={error && !form.line1 ? 'field-error' : ''} placeholder="Delivery address / street / barangay"/><div className="form-grid"><input value={form.city} onChange={update('city')} className={error && !form.city ? 'field-error' : ''} placeholder="City"/><input value={form.province} onChange={update('province')} placeholder="Province"/><input value={form.postalCode} onChange={update('postalCode')} placeholder="Postal code"/></div></>}<select value={form.paymentMethod} onChange={update('paymentMethod')}><option value="gcash_maya">GCash / Maya</option><option value="card">Credit Card (PayMongo)</option><option value="cod">Cash on Delivery</option></select><textarea value={form.customerNote} onChange={update('customerNote')} placeholder="Order notes (optional)" rows="2"/>{error && <div className="checkout-error">{error}</div>}<button className="pill dark large" onClick={placeOrder} disabled={placing || loading}>{placing ? 'Processing...' : 'Place Order'}</button></div></div><div className="summary-card"><h3>Order Summary</h3><p>{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</p>{loading ? <p>Loading...</p> : cartItems.map(item => <p key={item.id} className="muted">{item.quantity}x {item.product?.name}</p>)}<h2>{formatPeso(total)}</h2><p className="muted">Subtotal: {formatPeso(subtotal)}</p><p className="muted">Shipping: {formatPeso(shipping)}</p><div className="delivery-note"><b>Secure Checkout</b><br/>Your payment is processed securely. Order totals are calculated server-side.</div></div></section>;
}
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
  if (error) return <section className="section-pad page center-card"><div className="success-card"><h1>Error</h1><p>{error}</p><button className="pill dark" onClick={()=>setRoute('account')}>View Account</button></div></section>;

  const displayNumber = order?.orderNumber || orderNumber || '#????';
  return <section className="section-pad page center-card"><div className="success-card"><PackageCheck size={52}/><h1>Order confirmed</h1><p>Your order {displayNumber} has been placed successfully.</p><p className="muted">You will receive a confirmation email shortly.</p><button className="pill dark" onClick={()=>setRoute('tracking', { orderId: order?.id || orderId })}>Track Order</button><button className="pill outline" onClick={()=>setRoute('home')}>Continue Shopping</button></div></section>;
}

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

  return <section className="section-pad page"><SectionTitle eyebrow="Tracking" title={`Order ${orderNumber}`} />{loading ? <div className="summary-card">Loading...</div> : <div className="timeline">{steps.map((s,i)=><div className={s.done?'done':''} key={s.label}><span></span><b>{s.label}</b><p>{s.done?'Completed':'Pending'}</p></div>)}</div>}</section>;
}
export function AccountPage() { const [orderItems, setOrderItems] = useState(IS_DEMO_MODE ? adminMockData.orders : []); const [loading, setLoading] = useState(!IS_DEMO_MODE); useEffect(() => { let active = true; if (IS_DEMO_MODE) return undefined; fetchMyOrders().then((data) => { if (active) setOrderItems(Array.isArray(data) ? data : []); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []); return <section className="section-pad page"><SectionTitle eyebrow="Account" title="Customer account" /><div className="dashboard-grid"><InfoCard title="Profile" value="Customer details"/><InfoCard title="Addresses" value="Saved securely"/><InfoCard title="Order History" value={loading ? 'Loading…' : `${orderItems.length} orders`}/><InfoCard title="Wishlist" value="Saved items"/></div></section>; }
export function SearchPage({ setRoute }) { return <section className="section-pad page"><SectionTitle eyebrow="Search" title="Find your next piece" /><div className="shop-tools"><div><Search size={18}/> Try pearl, tote, ring, black...</div></div><div className="product-grid">{products.slice(0,4).map(p => <ProductCard key={p.id} product={p} setRoute={setRoute}/>)}</div></section>; }
export function AboutPage() { return <section className="section-pad page editorial"><SectionTitle eyebrow="Brand Story" title="Crafted for timeless everyday luxury." /><p>LUXE is a frontend concept for boutiques that need a premium visual experience, trust-driven product pages, and polished browsing flows.</p></section>; }
export function ContactPage() { return <section className="section-pad page checkout-layout"><div><SectionTitle eyebrow="Contact" title="Talk to the boutique" /><div className="form-card"><input placeholder="Name"/><input placeholder="Email"/><textarea placeholder="Message"></textarea><button className="pill dark">Send Message</button></div></div><div className="summary-card"><h3>Store Details</h3><p>Email: hello@luxe.test</p><p>Phone: +63 900 000 0000</p><p>Hours: 10:00 AM - 7:00 PM</p></div></section>; }
export function PoliciesPage({ setRoute }) {
  return (
    <section className="section-pad page">
      <SectionTitle eyebrow="Policies" title="Customer trust pages" />
      <div className="dashboard-grid">
        <button className="info-card" onClick={() => setRoute && setRoute('terms')}><h4>Terms of Service</h4><p>Read the rules of using LUXE Commerce.</p></button>
        <button className="info-card" onClick={() => setRoute && setRoute('privacy')}><h4>Privacy Policy</h4><p>How we collect, use, and protect your data.</p></button>
        <button className="info-card" onClick={() => setRoute && setRoute('refunds')}><h4>Refund Policy</h4><p>When and how refunds are processed.</p></button>
        <button className="info-card" onClick={() => setRoute && setRoute('shipping')}><h4>Shipping Policy</h4><p>Carriers, zones, and delivery timelines.</p></button>
        <button className="info-card" onClick={() => setRoute && setRoute('contact')}><h4>Contact / Support</h4><p>Reach out to our support team.</p></button>
      </div>
    </section>
  );
}

const REVIEW_BANNER = (
  <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '12px 16px', margin: '12px 0', color: '#92400e', fontSize: 14 }}>
    <strong>⚠ REQUIRES LEGAL REVIEW.</strong> The text below is a working
    placeholder. Your business owner / lawyer must review and amend it before
    production launch. See <code>SOFT_LAUNCH_CHECKLIST.md</code> in the repo.
  </div>
);

export function TermsPage() {
  return (
    <section className="section-pad page policy-page">
      <SectionTitle eyebrow="Legal" title="Terms of Service" />
      {REVIEW_BANNER}
      <p><em>Last updated: placeholder date — replace before launch.</em></p>
      <h3>1. Acceptance of terms</h3>
      <p>By accessing or placing an order on LUXE Commerce ("we", "us", "our"), you agree to be bound by these Terms of Service. If you do not agree, do not use this site.</p>
      <h3>2. Eligibility</h3>
      <p>You must be at least 18 years old, or the age of majority in your jurisdiction, to place an order. By ordering you confirm you meet this requirement.</p>
      <h3>3. Orders & pricing</h3>
      <p>All prices are listed in the displayed currency and include applicable taxes unless stated otherwise. We reserve the right to refuse or cancel any order in cases of suspected fraud, pricing errors, or stock unavailability. In such cases any payment will be refunded in full.</p>
      <h3>4. Payment</h3>
      <p>Payments are processed by third-party providers (PayMongo, Maya, Xendit). We do not store your full card number. Each provider's own terms also apply to your payment.</p>
      <h3>5. Shipping & delivery</h3>
      <p>See our Shipping Policy for carriers, zones, and timelines. Title and risk of loss pass to you upon hand-off to the carrier.</p>
      <h3>6. Returns & refunds</h3>
      <p>See our Refund Policy.</p>
      <h3>7. Intellectual property</h3>
      <p>All product imagery, text, logos, and the LUXE name are owned by us or our licensors. You may not reproduce them without written permission.</p>
      <h3>8. Account security</h3>
      <p>You are responsible for keeping your account credentials confidential. Notify us immediately at the support email if you suspect unauthorised access.</p>
      <h3>9. Limitation of liability</h3>
      <p>To the maximum extent permitted by law, our total liability for any claim is limited to the amount you paid for the order giving rise to the claim.</p>
      <h3>10. Governing law</h3>
      <p>These terms are governed by the laws of the jurisdiction in which our business is registered. <em>Specify jurisdiction here before launch.</em></p>
      <h3>11. Changes</h3>
      <p>We may update these terms; the "Last updated" date will reflect the change. Continued use of the site after a change constitutes acceptance.</p>
      <h3>12. Contact</h3>
      <p>For questions about these terms, contact us via the <button className="link-button" onClick={() => window.location.assign('/contact')}>Contact page</button>.</p>
    </section>
  );
}

export function PrivacyPage() {
  return (
    <section className="section-pad page policy-page">
      <SectionTitle eyebrow="Legal" title="Privacy Policy" />
      {REVIEW_BANNER}
      <p><em>Last updated: placeholder date — replace before launch.</em></p>
      <h3>1. Data we collect</h3>
      <ul>
        <li><strong>Account data:</strong> name, email, optional phone, password hash, sign-in provider.</li>
        <li><strong>Order data:</strong> items ordered, shipping address, billing reference.</li>
        <li><strong>Payment data:</strong> a tokenised reference from our payment provider — we do NOT store full card numbers.</li>
        <li><strong>Technical data:</strong> IP address, browser type, request timestamps (kept for security and abuse prevention).</li>
      </ul>
      <h3>2. How we use it</h3>
      <p>To process your orders, send transactional emails, prevent fraud and abuse, comply with legal obligations, and improve the site.</p>
      <h3>3. Third-party processors</h3>
      <ul>
        <li><strong>Payments:</strong> PayMongo, Maya, Xendit (whichever your order uses).</li>
        <li><strong>Email:</strong> Resend, SendGrid, or Mailgun (whichever is configured).</li>
        <li><strong>Error monitoring:</strong> Sentry (if enabled).</li>
        <li><strong>Sign-in with Google:</strong> Google.</li>
      </ul>
      <p>Each processor has its own privacy policy. We share with them only the minimum data needed to perform their function.</p>
      <h3>4. Cookies</h3>
      <p>We use cookies for: keeping you signed in (HttpOnly session cookie), remembering your cart, and CSRF protection. We do not use third-party advertising cookies.</p>
      <h3>5. Your rights</h3>
      <p>Depending on your jurisdiction (GDPR, CCPA, Philippine DPA, etc.), you may have rights to: access, correct, delete, or export your data, and to object to processing. Contact us at the support email to exercise any of these rights.</p>
      <h3>6. Retention</h3>
      <p>Order records are kept for at least 7 years (tax / accounting compliance). Account data is kept while your account is active and deleted within 30 days of a verified erasure request, unless legally required to retain.</p>
      <h3>7. Security</h3>
      <p>Passwords are bcrypt-hashed. Payments are routed through PCI-compliant providers. Database connections use TLS. Admin accounts require two-factor authentication.</p>
      <h3>8. Breach notification</h3>
      <p>We will notify affected users within 72 hours of confirming a personal data breach, in line with applicable law.</p>
      <h3>9. Changes</h3>
      <p>We may update this policy; the "Last updated" date will reflect the change.</p>
      <h3>10. Contact</h3>
      <p>For privacy questions or data requests, contact us via the Contact page.</p>
    </section>
  );
}

export function RefundsPage() {
  return (
    <section className="section-pad page policy-page">
      <SectionTitle eyebrow="Legal" title="Refund & Returns Policy" />
      {REVIEW_BANNER}
      <p><em>Last updated: placeholder date — replace before launch.</em></p>
      <h3>Eligibility</h3>
      <p>Items may be returned for a refund within <strong>14 days</strong> of delivery, unworn and in original condition, with original packaging and proof of purchase.</p>
      <h3>Non-returnable items</h3>
      <ul>
        <li>Pierced jewelry (earrings) for hygiene reasons.</li>
        <li>Custom or engraved pieces.</li>
        <li>Final-sale and clearance items, where clearly marked.</li>
      </ul>
      <h3>How to start a return</h3>
      <ol>
        <li>Open the Contact page and select "Start a return".</li>
        <li>Include your order number and the reason for the return.</li>
        <li>We will email you a return label or instructions within 2 business days.</li>
      </ol>
      <h3>Refund timeline</h3>
      <p>Once we receive and inspect the returned item, we will issue a refund to the original payment method within <strong>5 business days</strong>. Card and e-wallet providers may take an additional 3–10 days to post the credit on your end.</p>
      <h3>Damaged or wrong item</h3>
      <p>If your order arrives damaged or incorrect, contact us within 48 hours of delivery with photos. We will replace the item or issue a full refund at no cost to you.</p>
      <h3>Cancellations</h3>
      <p>Orders can be cancelled before they ship. Once shipped, you must use the return process above.</p>
    </section>
  );
}

export function ShippingPage() {
  return (
    <section className="section-pad page policy-page">
      <SectionTitle eyebrow="Legal" title="Shipping Policy" />
      {REVIEW_BANNER}
      <p><em>Last updated: placeholder date — replace before launch.</em></p>
      <h3>Carriers</h3>
      <p>We currently ship via <strong>placeholder carrier names — replace before launch</strong> (e.g. LBC, J&amp;T, Ninja Van, DHL).</p>
      <h3>Zones &amp; timelines</h3>
      <table className="policy-table">
        <thead><tr><th>Zone</th><th>Estimated delivery</th><th>Notes</th></tr></thead>
        <tbody>
          <tr><td>Metro Manila</td><td>1–2 business days</td><td>Same-day available for orders placed before 11:00.</td></tr>
          <tr><td>Luzon (outside Metro)</td><td>2–4 business days</td><td></td></tr>
          <tr><td>Visayas / Mindanao</td><td>3–5 business days</td><td></td></tr>
          <tr><td>International</td><td>7–14 business days</td><td>Customs delays possible; duties paid by recipient.</td></tr>
        </tbody>
      </table>
      <h3>Shipping fees</h3>
      <p>Calculated at checkout based on weight and destination. Free shipping on orders above the threshold shown on the cart page.</p>
      <h3>Tracking</h3>
      <p>Once your order ships you will receive a tracking number by email and on your account's order detail page.</p>
      <h3>Address accuracy</h3>
      <p>Please double-check your shipping address before placing the order. We are not responsible for orders sent to an incorrect address you provided. Re-shipping fees apply.</p>
      <h3>Lost packages</h3>
      <p>If tracking shows your package as delivered but you did not receive it, contact us within 7 days. We will open an investigation with the carrier and replace or refund per the outcome.</p>
    </section>
  );
}

function GoogleButton({ onGoogleLogin, setError, label = 'Continue with Google' }) {
  const googleConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  if (googleConfigured) {
    return <div className="google-login-wrap"><GoogleLogin onSuccess={(response)=>onGoogleLogin(response.credential)} onError={()=>setError('Google Sign-In failed. Please try again.')} theme="outline" size="large" shape="pill" text="continue_with" width="100%" /></div>;
  }
  if (import.meta.env.DEV) {
    return <div className="auth-success">Google Sign-In is not configured. Add `VITE_GOOGLE_CLIENT_ID`.</div>;
  }
  return null;
}

export function LoginPage({ onLogin, onGoogleLogin, setRoute }) {
  // FIX P0-005: No pre-filled credentials — ever
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try { await onLogin({ email, password }); }
    catch (err) { setError(err.message || 'Unable to sign in'); }
    finally { setLoading(false); }
  };
  return <section className="login-page"><form className="login-card glass auth-card" onSubmit={submit}><span className="brand-mark solo"><Crown size={24}/></span><span className="eyebrow">Customer Account</span><h1>Sign in to your account</h1><p>Track orders, manage your wishlist, and checkout faster.</p>{error && <div className="auth-error">{error}</div>}<GoogleButton onGoogleLogin={onGoogleLogin} setError={setError} /><div className="auth-divider"><span></span><b>or</b><span></span></div><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="email" required/><input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" autoComplete="current-password" required/><button className="pill dark large full" disabled={loading}>{loading?'Signing in...':'Sign In'}</button><div className="auth-links"><button type="button" onClick={()=>setRoute('customer-register')}>Create account</button><button type="button" onClick={()=>setRoute('forgot-password')}>Forgot password?</button></div></form></section>;
}

export function RegisterPage({ onRegister, onGoogleLogin, setRoute }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', accepted: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: field === 'accepted' ? event.target.checked : event.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    if (!form.accepted) return setError('Please accept the terms and privacy policy.');
    setLoading(true);
    try { await onRegister({ name: form.name, email: form.email, password: form.password }); }
    catch (err) { setError(err.message || 'Unable to create account'); }
    finally { setLoading(false); }
  };
  return <section className="login-page"><form className="login-card glass auth-card" onSubmit={submit}><span className="brand-mark solo"><Crown size={24}/></span><span className="eyebrow">New Customer</span><h1>Create your account</h1><p>Save addresses, track orders, receive email receipts, and manage your wishlist.</p>{error && <div className="auth-error">{error}</div>}<GoogleButton onGoogleLogin={onGoogleLogin} setError={setError} label="Sign up with Google"/><div className="auth-divider"><span></span><b>or</b><span></span></div><input value={form.name} onChange={update('name')} placeholder="Full name" required/><input value={form.email} onChange={update('email')} placeholder="Email" type="email" required/><input value={form.password} onChange={update('password')} placeholder="Password" type="password" required/><input value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Confirm password" type="password" required/><label className="check-row"><input type="checkbox" checked={form.accepted} onChange={update('accepted')} /> <span>I accept the Terms and Privacy Policy.</span></label><button className="pill dark large full" disabled={loading}>{loading?'Creating account...':'Create Account'}</button><div className="auth-links"><button type="button" onClick={()=>setRoute('customer-login')}>Already have an account?</button></div></form></section>;
}

export function ForgotPasswordPage({ setRoute }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try { await requestPasswordReset(email); setMessage('If this email exists, a reset link will be sent by the mail API.'); }
    catch (err) { setError(err.message || 'Unable to request password reset'); }
  };
  return <section className="login-page"><form className="login-card glass auth-card" onSubmit={submit}><span className="brand-mark solo"><Crown size={24}/></span><span className="eyebrow">Account Recovery</span><h1>Forgot password</h1><p>Enter your customer email and we will send a reset link through the configured mail API.</p>{error && <div className="auth-error">{error}</div>}{message && <div className="auth-success">{message}</div>}<input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" required/><button className="pill dark large full">Send Reset Link</button><div className="auth-links"><button type="button" onClick={()=>setRoute('customer-login')}>Back to sign in</button></div></form></section>;
}

export function ResetPasswordPage({ setRoute }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!token) return setError('Reset token is missing.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await resetPassword({ token, password });
      setMessage('Password updated. You can now sign in.');
      setTimeout(() => setRoute('customer-login'), 1200);
    } catch (err) {
      setError(err.message || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };
  return <section className="login-page"><form className="login-card glass auth-card" onSubmit={submit}><span className="brand-mark solo"><Crown size={24}/></span><span className="eyebrow">Account Recovery</span><h1>Set a new password</h1><p>Create a new password for your customer account.</p>{error && <div className="auth-error">{error}</div>}{message && <div className="auth-success">{message}</div>}<input value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password" type="password" required/><input value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Confirm new password" type="password" required/><button className="pill dark large full" disabled={loading}>{loading ? 'Updating password...' : 'Reset Password'}</button><div className="auth-links"><button type="button" onClick={()=>setRoute('customer-login')}>Back to sign in</button></div></form></section>;
}

export function AcceptInvitePage({ setRoute, setUser }) {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    if (!token) { setError('Invitation token is missing.'); setLoading(false); return undefined; }
    fetchInvitation(token)
      .then((data) => { if (active) setInvite(data); })
      .catch((err) => { if (active) setError(err.message || 'Invalid or expired invitation'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setSubmitting(true);
    try {
      // FIX P0-004: User state lives in React only — no localStorage
      const account = await acceptInvitation({ token, password });
      if (setUser) {
        setUser(account);
      }
      setMessage('Invitation accepted. Redirecting to admin dashboard...');
      setTimeout(() => setRoute('admin-dashboard'), 1000);
    } catch (err) {
      setError(err.message || 'Unable to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  return <section className="login-page admin-login-page"><form className="login-card glass auth-card" onSubmit={submit}><span className="brand-mark solo"><Crown size={24}/></span><span className="eyebrow">Staff Invitation</span><h1>Accept your invitation</h1>{loading ? <p>Loading invitation…</p> : error && !invite ? <><div className="auth-error">{error}</div><div className="auth-links"><button type="button" onClick={()=>setRoute('admin-login')}>Back to staff sign in</button></div></> : invite ? <><p>Welcome, <b>{invite.name}</b>. You have been invited as <b>{invite.role}</b>. Set a password to activate your <b>{invite.email}</b> staff account.</p>{error && <div className="auth-error">{error}</div>}{message && <div className="auth-success">{message}</div>}<input value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password" type="password" required minLength={8} /><input value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Confirm password" type="password" required minLength={8} /><button className="pill dark large full" disabled={submitting}>{submitting ? 'Activating account...' : 'Activate Staff Account'}</button><div className="auth-links"><button type="button" onClick={()=>setRoute('admin-login')}>Already activated? Sign in</button></div></> : null}</form></section>;
}

export function AdminLoginPage({ onLogin }) {
  // FIX P0-005: No pre-filled credentials — ever
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try { await onLogin({ email, password }); }
    catch (err) { setError(err.message || 'Unable to sign in'); }
    finally { setLoading(false); }
  };
  return <section className="login-page admin-login-page"><form className="login-card glass auth-card" onSubmit={submit}><span className="brand-mark solo"><Crown size={24}/></span><span className="eyebrow">Staff Portal</span><h1>Authorized staff only</h1><p>Use your staff email and password to access the internal operations portal.</p>{error && <div className="auth-error">{error}</div>}<input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="email" required/><input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" autoComplete="current-password" required/><button className="pill dark large full" disabled={loading}>{loading?'Signing in...':'Sign in'}</button>{import.meta.env.DEV && <small>Local seed staff credentials only available in development.</small>}</form></section>;
}

export function AdminPage({ route }) {
  if (route === 'admin-dashboard') return <AdminDashboard />;
  return <AdminCrud route={route} />;
}

function AdminDashboard() { const [stats, setStats] = useState(IS_DEMO_MODE ? { orders: 32, products: 6, customers: 3, lowStock: 4, revenue: 48920 } : null); const [error, setError] = useState(''); useEffect(() => { let active = true; if (IS_DEMO_MODE) return undefined; fetchAdminDashboard().then((data) => { if (active) setStats(data); }).catch((err) => { if (active) setError(err.message || 'Unable to load dashboard.'); }); return () => { active = false; }; }, []); if (error) return <div className="summary-card">{error}</div>; if (!stats) return <div className="summary-card">Loading dashboard…</div>; return <div><SectionTitle eyebrow="Admin" title="Store dashboard" /><div className="dashboard-grid"><InfoCard title="Revenue" value={formatPeso(Number(stats.revenue || 0))}/><InfoCard title="Orders" value={String(stats.orders || 0)}/><InfoCard title="Customers" value={String(stats.customers || 0)}/><InfoCard title="Low Stock" value={`${stats.lowStock || 0} items`}/></div></div>; }
function GenericAdmin({ title, route }) { const items = ['Create / edit records', 'Search and filter table', 'Status controls', 'Empty and loading states', 'Responsive admin layout']; return <div><SectionTitle eyebrow="Admin Module" title={title} /><div className="dashboard-grid">{items.map(i=><InfoCard key={i} title={i} value={route.replace('admin-','')} />)}</div><div className="table-card"><h3>{title} UI placeholder</h3><p>This is frontend-only. Connect backend later to make this module functional.</p></div></div>; }
function AdminTable({ title, headers, rows, compact }) { return <div className="table-card"><h3>{title}</h3><div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table></div>{!compact && <div className="table-actions"><button className="pill dark">Add New</button><button className="pill outline">Export</button></div>}</div>; }
export function SectionTitle({ eyebrow, title }) { return <div className="section-title"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>; }
export function InfoCard({ title, value }) { return <div className="info-card"><span>{title}</span><strong>{value}</strong></div>; }
