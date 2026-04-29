import React from 'react';
import { SectionTitle } from '../components/SectionTitle.jsx';
import { InfoCard } from '../components/InfoCard.jsx';

export function PoliciesPage() {
  return (
    <section className="section-pad page">
      <SectionTitle eyebrow="Policies" title="Customer trust pages" />
      <div className="dashboard-grid">
        {['Shipping Policy','Return and Exchange Policy','Privacy Policy','Terms and Conditions','Warranty Policy','Care Guide'].map(x => (
          <InfoCard key={x} title={x} value="Frontend page placeholder"/>
        ))}
      </div>
    </section>
  );
}
