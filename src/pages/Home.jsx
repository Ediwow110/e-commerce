import React, { useMemo, useState } from 'react';
import { Sparkles, ShieldCheck, Truck, CreditCard, PackageCheck, Search, Crown } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import { products, orders, customers, formatPeso } from '../services/api.js';

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
  const visible = useMemo(() => filter === 'All' ? products : products.filter(p => p.category === filter), [filter]);
  return <section className="section-pad warm"><div className="split-head"><SectionTitle eyebrow="Premium catalog" title="Featured products" /> <div className="filters">{['All','Jewelry','Bags'].map(f => <button className={filter===f?'active':''} onClick={() => setFilter(f)} key={f}>{f}</button>)}</div></div><div className="product-grid">{visible.map(p => <ProductCard key={p.id} product={p} setRoute={setRoute} />)}</div></section>;
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

export function ShopPage({ setRoute }) { return <section className="section-pad page"><SectionTitle eyebrow="Shop" title="All products" /><div className="shop-tools"><div><Search size={18}/> Search jewelry, bags, color, material...</div><button>Sort: Newest</button><button>Filters</button></div><div className="product-grid">{products.map(p => <ProductCard key={p.id} product={p} setRoute={setRoute}/>)}</div></section>; }
export function CategoryPage({ setRoute }) { return <section className="section-pad page"><SectionTitle eyebrow="Categories" title="Browse by category" /><div className="category-grid">{['Necklaces','Rings','Earrings','Bracelets','Tote Bags','Crossbody Bags','Clutches','Gift Sets'].map(c=><button className="category-tile" key={c} onClick={()=>setRoute('shop')}>{c}</button>)}</div></section>; }
export function ProductPage({ setRoute }) { const p = products[0]; return <section className="section-pad product-detail page"><div className="gallery"><img src={p.image}/><div><img src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=800&auto=format&fit=crop"/><img src="https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?q=80&w=800&auto=format&fit=crop"/></div></div><div className="detail-panel"><span className="eyebrow">{p.category}</span><h1>{p.name}</h1><p className="price">{formatPeso(p.price)}</p><p>Premium pearl necklace with refined gold vermeil finish. Designed for gifting, occasions, and elevated daily wear.</p><label>Material<select><option>{p.material}</option></select></label><label>Length<select><option>16 inches</option><option>18 inches</option></select></label><div className="actions"><button className="pill dark large" onClick={()=>setRoute('cart')}>Add to Cart</button><button className="pill outline large" onClick={()=>setRoute('wishlist')}>Wishlist</button></div><div className="trust-list"><span>Secure checkout</span><span>Warranty included</span><span>Authenticity certificate ready</span><span>Easy returns</span></div></div></section>; }
export function WishlistPage({ setRoute }) { return <section className="section-pad page"><SectionTitle eyebrow="Saved items" title="Wishlist" /><div className="product-grid">{products.slice(0,3).map(p => <ProductCard key={p.id} product={p} setRoute={setRoute}/>)}</div></section>; }
export function CartPage({ setRoute }) { return <section className="section-pad page cart-layout"><div><SectionTitle eyebrow="Shopping bag" title="Your cart" />{products.slice(0,2).map(p=><div className="line-item" key={p.id}><img src={p.image}/><div><b>{p.name}</b><p>{p.material}</p></div><strong>{formatPeso(p.price)}</strong></div>)}</div><div className="summary-card"><h3>Order Summary</h3><p>Subtotal <b>{formatPeso(21450)}</b></p><p>Shipping <b>{formatPeso(250)}</b></p><input placeholder="Promo code"/><button className="pill dark large full" onClick={()=>setRoute('checkout')}>Checkout</button></div></section>; }
export function CheckoutPage({ setRoute }) { return <section className="section-pad page checkout-layout"><div><SectionTitle eyebrow="Checkout" title="Complete your order" /><div className="form-card"><input placeholder="Full name"/><input placeholder="Email address"/><input placeholder="Phone number"/><input placeholder="Delivery address"/><select><option>Standard Delivery</option><option>Store Pickup</option></select><select><option>GCash / Maya</option><option>Credit Card</option><option>Cash on Delivery</option></select><button className="pill dark large" onClick={()=>setRoute('confirmation')}>Place Order</button></div></div><div className="summary-card"><h3>Order Preview</h3><p>2 items</p><h2>{formatPeso(21700)}</h2><p className="muted">You will receive an order confirmation and tracking information.</p></div></section>; }
export function ConfirmationPage({ setRoute }) { return <section className="section-pad page center-card"><div className="success-card"><PackageCheck size={52}/><h1>Order confirmed</h1><p>Your order #1051 has been placed successfully.</p><button className="pill dark" onClick={()=>setRoute('tracking')}>Track Order</button></div></section>; }
export function TrackingPage() { return <section className="section-pad page"><SectionTitle eyebrow="Tracking" title="Order #1051" /><div className="timeline">{['Order placed','Payment confirmed','Preparing order','Ready to ship','Delivered'].map((s,i)=><div className={i<3?'done':''} key={s}><span></span><b>{s}</b><p>{i<3?'Completed':'Pending'}</p></div>)}</div></section>; }
export function AccountPage() { return <section className="section-pad page"><SectionTitle eyebrow="Account" title="Customer account" /><div className="dashboard-grid"><InfoCard title="Profile" value="Customer details"/><InfoCard title="Addresses" value="2 saved"/><InfoCard title="Order History" value="8 orders"/><InfoCard title="Wishlist" value="12 items"/></div></section>; }
export function SearchPage({ setRoute }) { return <section className="section-pad page"><SectionTitle eyebrow="Search" title="Find your next piece" /><div className="shop-tools"><div><Search size={18}/> Try pearl, tote, ring, black...</div></div><div className="product-grid">{products.slice(0,4).map(p => <ProductCard key={p.id} product={p} setRoute={setRoute}/>)}</div></section>; }
export function AboutPage() { return <section className="section-pad page editorial"><SectionTitle eyebrow="Brand Story" title="Crafted for timeless everyday luxury." /><p>LUXE is a frontend concept for boutiques that need a premium visual experience, trust-driven product pages, and polished browsing flows.</p></section>; }
export function ContactPage() { return <section className="section-pad page checkout-layout"><div><SectionTitle eyebrow="Contact" title="Talk to the boutique" /><div className="form-card"><input placeholder="Name"/><input placeholder="Email"/><textarea placeholder="Message"></textarea><button className="pill dark">Send Message</button></div></div><div className="summary-card"><h3>Store Details</h3><p>Email: hello@luxe.test</p><p>Phone: +63 900 000 0000</p><p>Hours: 10:00 AM - 7:00 PM</p></div></section>; }
export function PoliciesPage() { return <section className="section-pad page"><SectionTitle eyebrow="Policies" title="Customer trust pages" /><div className="dashboard-grid">{['Shipping Policy','Return and Exchange Policy','Privacy Policy','Terms and Conditions','Warranty Policy','Care Guide'].map(x=><InfoCard key={x} title={x} value="Frontend page placeholder"/>)}</div></section>; }

export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('customer@luxe.test');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const submit = async (e) => { e.preventDefault(); setLoading(true); await onLogin({ email, password }); setLoading(false); };
  return <section className="login-page"><form className="login-card glass" onSubmit={submit}><span className="brand-mark solo"><Crown size={24}/></span><span className="eyebrow">Customer account</span><h1>Sign in to your account</h1><p>Use your customer email and password to continue shopping, checkout, and order tracking.</p><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" required/><input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" required/><button className="pill dark large full" disabled={loading}>{loading?'Signing in...':'Sign In'}</button><small>Demo customer: customer@luxe.test / password123</small></form></section>;
}

export function AdminPage({ route }) {
  const titleMap = {
    'admin-dashboard': 'Dashboard', 'admin-products': 'Product Management', 'admin-variants': 'Product Variant Management', 'admin-categories': 'Category & Collection Management', 'admin-inventory': 'Inventory Management', 'admin-orders': 'Order Management', 'admin-customers': 'Customer Management', 'admin-promos': 'Promo Code & Discount Management', 'admin-insights': 'Wishlist & Demand Insights', 'admin-reviews': 'Review Management', 'admin-reports': 'Sales Reports', 'admin-payments': 'Payment Management', 'admin-shipping': 'Shipping & Delivery Management', 'admin-content': 'Content Management', 'admin-users': 'Admin Users & Roles', 'admin-settings': 'Settings'
  };
  const title = titleMap[route] || 'Dashboard';
  if (route === 'admin-dashboard') return <AdminDashboard />;
  if (route === 'admin-products') return <AdminTable title={title} rows={products.map(p=>[p.sku,p.name,p.category,formatPeso(p.price),`${p.stock} stock`])} headers={['SKU','Product','Category','Price','Stock']} />;
  if (route === 'admin-orders') return <AdminTable title={title} rows={orders.map(o=>[o.id,o.customer,formatPeso(o.total),o.status,o.fulfillment])} headers={['Order','Customer','Total','Payment','Fulfillment']} />;
  if (route === 'admin-customers') return <AdminTable title={title} rows={customers.map(c=>[c.name,c.email,formatPeso(c.spend),c.tag,`${c.orders} orders`])} headers={['Name','Email','Spend','Tag','Orders']} />;
  return <GenericAdmin title={title} route={route} />;
}

function AdminDashboard() { return <div><SectionTitle eyebrow="Admin" title="Store dashboard" /><div className="dashboard-grid"><InfoCard title="Revenue" value={formatPeso(48920)}/><InfoCard title="Orders" value="32"/><InfoCard title="Low Stock" value="4 items"/><InfoCard title="Conversion" value="3.8%"/></div><AdminTable title="Recent Orders" rows={orders.map(o=>[o.id,o.customer,formatPeso(o.total),o.status,o.fulfillment])} headers={['Order','Customer','Total','Payment','Fulfillment']} compact /></div>; }
function GenericAdmin({ title, route }) { const items = ['Create / edit records', 'Search and filter table', 'Status controls', 'Empty and loading states', 'Responsive admin layout']; return <div><SectionTitle eyebrow="Admin Module" title={title} /><div className="dashboard-grid">{items.map(i=><InfoCard key={i} title={i} value={route.replace('admin-','')} />)}</div><div className="table-card"><h3>{title} UI placeholder</h3><p>This is frontend-only. Connect backend later to make this module functional.</p></div></div>; }
function AdminTable({ title, headers, rows, compact }) { return <div className="table-card"><h3>{title}</h3><div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table></div>{!compact && <div className="table-actions"><button className="pill dark">Add New</button><button className="pill outline">Export</button></div>}</div>; }
export function SectionTitle({ eyebrow, title }) { return <div className="section-title"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>; }
export function InfoCard({ title, value }) { return <div className="info-card"><span>{title}</span><strong>{value}</strong></div>; }
