import React from 'react';
import { Heart, Eye, Star } from 'lucide-react';
import { formatPeso } from '../services/api.js';

export default function ProductCard({ product, setRoute }) {
  return (
    <article className="product-card reveal-card">
      <div className="product-media shine">
        <img src={product.image} alt={product.name} />
        <span className="tag">{product.tag}</span>
        <button className="floating-icon"><Heart size={17} /></button>
        <div className="quick-actions">
          <button className="pill dark" onClick={() => setRoute('cart')}>Add to Cart</button>
          <button className="icon-btn light" onClick={() => setRoute('product')}><Eye size={18} /></button>
        </div>
      </div>
      <div className="product-body">
        <div className="row muted small"><span>{product.category}</span><span>{product.color}</span></div>
        <h3>{product.name}</h3>
        <p>{product.material}</p>
        <div className="row"><strong>{formatPeso(product.price)}</strong><span className="rating"><Star size={15} fill="currentColor" /> {product.rating}</span></div>
      </div>
    </article>
  );
}
