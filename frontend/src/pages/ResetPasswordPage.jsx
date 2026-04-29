import React, { useState } from 'react';
import { Crown } from 'lucide-react';
import { resetPassword } from '../services/api.js';

export function ResetPasswordPage({ setRoute }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!token) return setError('Reset token is missing.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await resetPassword({ token, password });
      setMessage('Password updated. You can now sign in.');
      setTimeout(() => setRoute('customer-login'), 1200);
    } catch (err) {
      setError(err.message || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className="login-page">
      <form className="login-card glass auth-card" onSubmit={submit}>
        <span className="brand-mark solo"><Crown size={24}/></span>
        <span className="eyebrow">Account Recovery</span>
        <h1>Set a new password</h1>
        <p>Create a new password for your customer account.</p>
        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password" type="password" required/>
        <input value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Confirm new password" type="password" required/>
        <button className="pill dark large full" disabled={loading}>
          {loading ? 'Updating password...' : 'Reset Password'}
        </button>
        <div className="auth-links">
          <button type="button" onClick={()=>setRoute('customer-login')}>Back to sign in</button>
        </div>
      </form>
    </section>
  );
}
