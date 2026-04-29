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

export function LoginPage({ onLogin, onGoogleLogin, setRoute }) {
  const [email, setEmail] = useState(import.meta.env.DEV ? 'customer@luxe.test' : '');
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
    <section className="login-page">
      <form className="login-card glass auth-card" onSubmit={submit}>
        <span className="brand-mark solo"><Crown size={24}/></span>
        <span className="eyebrow">Customer Account</span>
        <h1>Sign in to your account</h1>
        <p>Track orders, manage your wishlist, and checkout faster.</p>
        {error && <div className="auth-error">{error}</div>}
        <GoogleButton onGoogleLogin={onGoogleLogin} setError={setError} />
        <div className="auth-divider"><span></span><b>or</b><span></span></div>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="email" required/>
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" autoComplete="current-password" required/>
        <button className="pill dark large full" disabled={loading}>
          {loading?'Signing in...':'Sign In'}
        </button>
        <div className="auth-links">
          <button type="button" onClick={()=>setRoute('customer-register')}>Create account</button>
          <button type="button" onClick={()=>setRoute('forgot-password')}>Forgot password?</button>
        </div>
        {import.meta.env.DEV && <small>Demo customer: customer@luxe.test / password123</small>}
      </form>
    </section>
  );
}
