import React from 'react';
import { Heart, Eye, Star } from 'lucide-react';
import { formatPeso } from '../services/api.js';

export default function ProductCard({ product, setRoute }) {
  const image = product.image || product.images?.[0]?.url;
  const category = product.category?.name || product.category || 'Collection';
  const accent = product.color || product.variants?.[0]?.color || product.tag || 'Signature';
  const material = product.material || product.variants?.[0]?.material || 'Premium finish';
  const price = Number(product.salePrice || product.price || 0);
  const rating = product.rating || (product.reviews?.length ? (product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length).toFixed(1) : 'New');
  return (
    <article className="product-card reveal-card">
      <div className="product-media shine">
        <img src={image} alt={product.name} />
        <span className="tag">{product.tag || (product.isFeatured ? 'Featured' : 'New')}</span>
        <button className="floating-icon"><Heart size={17} /></button>
        <div className="quick-actions">
          <button className="pill dark" onClick={() => setRoute('cart')}>Add to Cart</button>
          <button className="icon-btn light" onClick={() => setRoute('product')}><Eye size={18} /></button>
        </div>
      </div>
      <div className="product-body">
        <div className="row muted small"><span>{category}</span><span>{accent}</span></div>
        <h3>{product.name}</h3>
        <p>{material}</p>
        <div className="row"><strong>{formatPeso(price)}</strong><span className="rating"><Star size={15} fill="currentColor" /> {rating}</span></div>
      </div>
    </article>
  );
}
