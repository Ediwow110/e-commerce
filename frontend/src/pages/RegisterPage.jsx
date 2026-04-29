import React, { useState } from 'react';
import { Crown } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

function GoogleButton({ onGoogleLogin, setError, label = 'Continue with Google' }) {
  const googleConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  if (googleConfigured) {
    return (
      <div className="google-login-wrap">
        <GoogleLogin 
          onSuccess={(response)=>onGoogleLogin(response.credential)} 
          onError={()=>setError('Google Sign-In failed. Please try again.')} 
          theme="outline" 
          size="large" 
          shape="pill" 
          text="continue_with" 
          width="100%" 
        />
      </div>
    );
  }
  if (import.meta.env.DEV) {
    return <div className="auth-success">Google Sign-In is not configured. Add `VITE_GOOGLE_CLIENT_ID`.</div>;
  }
  return null;
}

export function RegisterPage({ onRegister, onGoogleLogin, setRoute }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', accepted: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: field === 'accepted' ? event.target.checked : event.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    if (!form.accepted) return setError('Please accept the terms and privacy policy.');
    setLoading(true);
    try { await onRegister({ name: form.name, email: form.email, password: form.password }); }
    catch (err) { setError(err.message || 'Unable to create account'); }
    finally { setLoading(false); }
  };
  return (
    <section className="login-page">
      <form className="login-card glass auth-card" onSubmit={submit}>
        <span className="brand-mark solo"><Crown size={24}/></span>
        <span className="eyebrow">New Customer</span>
        <h1>Create your account</h1>
        <p>Save addresses, track orders, receive email receipts, and manage your wishlist.</p>
        {error && <div className="auth-error">{error}</div>}
        <GoogleButton onGoogleLogin={onGoogleLogin} setError={setError} label="Sign up with Google"/>
        <div className="auth-divider"><span></span><b>or</b><span></span></div>
        <input value={form.name} onChange={update('name')} placeholder="Full name" required/>
        <input value={form.email} onChange={update('email')} placeholder="Email" type="email" required/>
        <input value={form.password} onChange={update('password')} placeholder="Password" type="password" required/>
        <input value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Confirm password" type="password" required/>
        <label className="check-row">
          <input type="checkbox" checked={form.accepted} onChange={update('accepted')} /> 
          <span>I accept the Terms and Privacy Policy.</span>
        </label>
        <button className="pill dark large full" disabled={loading}>
          {loading?'Creating account...':'Create Account'}
        </button>
        <div className="auth-links">
          <button type="button" onClick={()=>setRoute('customer-login')}>Already have an account?</button>
        </div>
      </form>
    </section>
  );
}
