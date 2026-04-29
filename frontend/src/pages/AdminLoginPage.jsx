import React, { useState } from 'react';
import { Crown } from 'lucide-react';

export function AdminLoginPage({ onLogin }) {
  const [email, setEmail] = useState(import.meta.env.DEV ? 'owner@luxe.test' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'password123' : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try { await onLogin({ email, password }); }
    catch (err) { setError(err.message || 'Unable to sign in'); }
    finally { setLoading(false); }
  };
  return (
    <section className="login-page admin-login-page">
      <form className="login-card glass auth-card" onSubmit={submit}>
        <span className="brand-mark solo"><Crown size={24}/></span>
        <span className="eyebrow">Staff Portal</span>
        <h1>Authorized staff only</h1>
        <p>Use your staff email and password to access the internal operations portal.</p>
        {error && <div className="auth-error">{error}</div>}
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="email" required/>
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" autoComplete="current-password" required/>
        <button className="pill dark large full" disabled={loading}>
          {loading?'Signing in...':'Sign in'}
        </button>
        {import.meta.env.DEV && <small>Local seed staff credentials only available in development.</small>}
      </form>
    </section>
  );
}
