import React from 'react';
import { SectionTitle } from '../components/SectionTitle.jsx';

export function ContactPage() {
  return (
    <section className="section-pad page checkout-layout">
      <div>
        <SectionTitle eyebrow="Contact" title="Talk to the boutique" />
        <div className="form-card">
          <input placeholder="Name"/>
          <input placeholder="Email"/>
          <textarea placeholder="Message"></textarea>
          <button className="pill dark">Send Message</button>
        </div>
      </div>
      <div className="summary-card">
        <h3>Store Details</h3>
        <p>Email: hello@luxe.test</p>
        <p>Phone: +63 900 000 0000</p>
        <p>Hours: 10:00 AM - 7:00 PM</p>
      </div>
    </section>
  );
}
