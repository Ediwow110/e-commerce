import React, { useEffect, useState } from 'react';
import { SectionTitle } from '../components/SectionTitle.jsx';
import { IS_DEMO_MODE, clearCart, formatPeso, getCart, products, removeFromCart, updateCartItem } from '../services/api.js';

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

  return (
    <section className="section-pad page cart-layout">
      <div>
        <SectionTitle eyebrow="Shopping bag" title="Your cart" />
        {error && <div className="auth-error">{error}</div>}
        {loading ? <div className="summary-card">Loading cart...</div> : cartItems.length === 0 ? <div className="summary-card">Your cart is empty. <button className="pill dark" onClick={() => setRoute('shop')}>Continue Shopping</button></div> : cartItems.map(item => (
          <div className="line-item" key={item.id}>
            <img src={item.product?.images?.[0]?.url || item.product?.image}/>
            <div>
              <b>{item.product?.name}</b>
              <p>{item.product?.material}</p>
              <div className="quantity-controls">
                <button onClick={() => handleUpdateQuantity(item.id, (item.quantity || 1) - 1)} disabled={updating[item.id]}>-</button>
                <span>{item.quantity || 1}</span>
                <button onClick={() => handleUpdateQuantity(item.id, (item.quantity || 1) + 1)} disabled={updating[item.id]}>+</button>
                <button onClick={() => handleRemove(item.id)} disabled={updating[item.id]}>Remove</button>
              </div>
            </div>
            <strong>{formatPeso(Number(item.product?.price || item.product?.salePrice || 0) * (item.quantity || 1))}</strong>
          </div>
        ))}
      </div>
      <div className="summary-card">
        <h3>Order Summary</h3>
        <p>Subtotal <b>{formatPeso(subtotal)}</b></p>
        <p>Shipping <b>{formatPeso(shipping)}</b></p>
        <input placeholder="Promo code"/>
        <button className="pill dark large full" onClick={handleCheckout} disabled={loading || cartItems.length === 0}>Checkout</button>
      </div>
    </section>
  );
}
