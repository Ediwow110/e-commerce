import React from 'react';
import { SectionTitle } from '../components/SectionTitle.jsx';

export function CategoryPage({ setRoute }) {
  return (
    <section className="section-pad page">
      <SectionTitle eyebrow="Categories" title="Browse by category" />
      <div className="category-grid">
        {['Necklaces','Rings','Earrings','Bracelets','Tote Bags','Crossbody Bags','Clutches','Gift Sets'].map(c => (
          <button className="category-tile" key={c} onClick={() => setRoute('shop')}>
            {c}
          </button>
        ))}
      </div>
    </section>
  );
}
