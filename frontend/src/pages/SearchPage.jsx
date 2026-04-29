import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { SectionTitle } from '../components/SectionTitle.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { products } from '../services/api.js';

export function SearchPage({ setRoute }) {
  return (
    <section className="section-pad page">
      <SectionTitle eyebrow="Search" title="Find your next piece" />
      <div className="shop-tools">
        <div><Search size={18}/> Try pearl, tote, ring, black...</div>
      </div>
      <div className="product-grid">
        {products.slice(0,4).map(p => <ProductCard key={p.id} product={p} setRoute={setRoute}/>)}
      </div>
    </section>
  );
}
