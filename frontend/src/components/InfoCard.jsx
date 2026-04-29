import React from 'react';

export function InfoCard({ title, value }) {
  return (
    <div className="info-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}
