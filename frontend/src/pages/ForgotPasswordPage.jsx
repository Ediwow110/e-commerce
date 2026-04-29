import React, { useState } from 'react';
import { Crown } from 'lucide-react';

export function ForgotPasswordPage({ setRoute }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await import('../services/api.js').then(api => api.requestPasswordReset(email));
      setMessage('If this email exists, a reset link will be sent by the mail API.');
    } catch (err) { setError(err.message || 'Unable to request password reset'); }
  };
  return (
    <section className="login-page">
      <form className="login-card glass auth-card" onSubmit={submit}>
        <span className="brand-mark solo"><Crown size={24}/></span>
        <span className="eyebrow">Account Recovery</span>
        <h1>Forgot password</h1>
        <p>Enter your customer email and we will send a reset link through the configured mail API.</p>
        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" required/>
        <button className="pill dark large full">Send Reset Link</button>
        <div className="auth-links">
          <button type="button" onClick={()=>setRoute('customer-login')}>Back to sign in</button>
        </div>
      </form>
    </section>
  );
}
