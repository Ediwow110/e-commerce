import React, { useEffect, useState } from 'react';
import { SectionTitle } from '../components/SectionTitle.jsx';
import { IS_DEMO_MODE, createCheckoutSession, createOrder, clearCart, getCart, products } from '../services/api.js';

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

  return (
    <section className="section-pad page checkout-layout">
      <div>
        <SectionTitle eyebrow="Checkout" title="Complete your order" />
        <div className="checkout-steps"><span className="active">1 Cart</span><span className="active">2 Information</span><span className={form.line1 ? 'active' : ''}>3 Delivery</span><span>4 Payment</span></div>
        <div className="form-card">
          <input value={form.fullName} onChange={update('fullName')} placeholder="Full name"/>
          <input value={form.email} onChange={update('email')} placeholder="Email address" type="email"/>
          <input value={form.phone} onChange={update('phone')} placeholder="Phone number"/>
          <select value={form.shippingMethod} onChange={update('shippingMethod')}>
            <option value="standard_delivery">Standard Delivery</option>
            <option value="store_pickup">Store Pickup</option>
          </select>
          {form.shippingMethod !== 'store_pickup' && (
            <>
              <input value={form.line1} onChange={update('line1')} className={error && !form.line1 ? 'field-error' : ''} placeholder="Delivery address / street / barangay"/>
              <div className="form-grid">
                <input value={form.city} onChange={update('city')} className={error && !form.city ? 'field-error' : ''} placeholder="City"/>
                <input value={form.province} onChange={update('province')} placeholder="Province"/>
                <input value={form.postalCode} onChange={update('postalCode')} placeholder="Postal code"/>
              </div>
            </>
          )}
          <select value={form.paymentMethod} onChange={update('paymentMethod')}>
            <option value="gcash_maya">GCash / Maya</option>
            <option value="card">Credit Card (PayMongo)</option>
            <option value="cod">Cash on Delivery</option>
          </select>
          <textarea value={form.customerNote} onChange={update('customerNote')} placeholder="Order notes (optional)" rows="2"/>
          {error && <div className="checkout-error">{error}</div>}
          <button className="pill dark large full" onClick={placeOrder} disabled={placing || loading}>
            {placing ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      </div>
      <div className="summary-card">
        <h3>Order Summary</h3>
        <p>{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</p>
        {loading ? <p>Loading...</p> : cartItems.map(item => <p key={item.id} className="muted">{item.quantity}x {item.product?.name}</p>)}
        <h2>{Number(subtotal + shipping).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</h2>
        <p className="muted">Subtotal: {Number(subtotal).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</p>
        <p className="muted">Shipping: {Number(shipping).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</p>
        <div className="delivery-note"><b>Secure Checkout</b><br/>Your payment is processed securely. Order totals are calculated server-side.</div>
      </div>
    </section>
  );
}
