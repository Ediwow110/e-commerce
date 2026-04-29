import React, { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { fetchInvitation, acceptInvitation } from '../services/api.js';

export function AcceptInvitePage({ setRoute, setUser }) {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    if (!token) { setError('Invitation token is missing.'); setLoading(false); return undefined; }
    fetchInvitation(token)
      .then((data) => { if (active) setInvite(data); })
      .catch((err) => { if (active) setError(err.message || 'Invalid or expired invitation'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setSubmitting(true);
    try {
      const account = await acceptInvitation({ token, password });
      if (setUser) {
        localStorage.setItem('luxe-user', JSON.stringify(account));
        setUser(account);
      }
      setMessage('Invitation accepted. Redirecting to admin dashboard...');
      setTimeout(() => setRoute('admin-dashboard'), 1000);
    } catch (err) {
      setError(err.message || 'Unable to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="login-page admin-login-page">
      <form className="login-card glass auth-card" onSubmit={submit}>
        <span className="brand-mark solo"><Crown size={24}/></span>
        <span className="eyebrow">Staff Invitation</span>
        <h1>Accept your invitation</h1>
        {loading ? <p>Loading invitation…</p> : error && !invite ? (
          <>
            <div className="auth-error">{error}</div>
            <div className="auth-links">
              <button type="button" onClick={()=>setRoute('admin-login')}>Back to staff sign in</button>
            </div>
          </>
        ) : invite ? (
          <>
            <p>Welcome, <b>{invite.name}</b>. You have been invited as <b>{invite.role}</b>. Set a password to activate your <b>{invite.email}</b> staff account.</p>
            {error && <div className="auth-error">{error}</div>}
            {message && <div className="auth-success">{message}</div>}
            <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password" type="password" required minLength={8} />
            <input value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Confirm password" type="password" required minLength={8} />
            <button className="pill dark large full" disabled={submitting}>
              {submitting ? 'Activating account...' : 'Activate Staff Account'}
            </button>
            <div className="auth-links">
              <button type="button" onClick={()=>setRoute('admin-login')}>Already activated? Sign in</button>
            </div>
          </>
        ) : null}
      </form>
    </section>
  );
}
