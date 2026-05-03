import React, { useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import { adminSignIn, adminVerify2FA, clearAuthStorage, customerSignIn, logout as performLogout, refreshSession, signInWithGoogle, signUp } from './services/api.js';
import { CustomerHome, ShopPage, CategoryPage, ProductPage, WishlistPage, CartPage, CheckoutPage, ConfirmationPage, TrackingPage, AccountPage, SearchPage, AboutPage, ContactPage, PoliciesPage, TermsPage, PrivacyPage, RefundsPage, ShippingPage, LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage, AcceptInvitePage, AdminLoginPage, AdminPage, SectionTitle } from './pages/Home.jsx';

const adminRoutes = ['admin-dashboard','admin-products','admin-variants','admin-categories','admin-inventory','admin-orders','admin-customers','admin-promos','admin-insights','admin-reviews','admin-reports','admin-payments','admin-shipping','admin-content','admin-users','admin-settings'];
const customerProtectedRoutes = ['wishlist','checkout','confirmation','tracking','account'];
const adminRoles = ['SUPER_ADMIN','ADMIN','MANAGER','STAFF','INVENTORY_STAFF','ORDER_STAFF','CONTENT_STAFF','SUPPORT_STAFF'];
const adminRoutePermissions = {
  'admin-users': ['SUPER_ADMIN'],
  'admin-settings': ['SUPER_ADMIN'],
  'admin-payments': ['SUPER_ADMIN','ADMIN','MANAGER','ORDER_STAFF'],
  'admin-reports': ['SUPER_ADMIN','ADMIN','MANAGER'],
  'admin-products': ['SUPER_ADMIN','ADMIN','MANAGER','INVENTORY_STAFF','CONTENT_STAFF','STAFF'],
  'admin-variants': ['SUPER_ADMIN','ADMIN','MANAGER','INVENTORY_STAFF','STAFF'],
  'admin-categories': ['SUPER_ADMIN','ADMIN','MANAGER','INVENTORY_STAFF','CONTENT_STAFF','STAFF'],
  'admin-inventory': ['SUPER_ADMIN','ADMIN','MANAGER','INVENTORY_STAFF','STAFF'],
  'admin-orders': ['SUPER_ADMIN','ADMIN','MANAGER','ORDER_STAFF','SUPPORT_STAFF','STAFF'],
  'admin-customers': ['SUPER_ADMIN','ADMIN','MANAGER','ORDER_STAFF','SUPPORT_STAFF','STAFF'],
  'admin-promos': ['SUPER_ADMIN','ADMIN','MANAGER'],
  'admin-reviews': ['SUPER_ADMIN','ADMIN','MANAGER','SUPPORT_STAFF','STAFF'],
  'admin-shipping': ['SUPER_ADMIN','ADMIN','MANAGER','ORDER_STAFF','STAFF'],
  'admin-content': ['SUPER_ADMIN','ADMIN','MANAGER','CONTENT_STAFF'],
  'admin-insights': ['SUPER_ADMIN','ADMIN','MANAGER'],
  'admin-dashboard': adminRoles
};

const pathToRoute = (path) => {
  const normalized = path.replace(/\/$/, '') || '/';
  const map = {
    '/': 'home',
    '/shop': 'shop',
    '/categories': 'category',
    '/product': 'product',
    '/wishlist': 'wishlist',
    '/cart': 'cart',
    '/checkout': 'checkout',
    '/order-confirmation': 'confirmation',
    '/track-order': 'tracking',
    '/account': 'account',
    '/search': 'search',
    '/about': 'about',
    '/contact': 'contact',
    '/policies': 'policies',
    '/terms': 'terms',
    '/privacy': 'privacy',
    '/refunds': 'refunds',
    '/shipping': 'shipping',
    '/customer/login': 'customer-login',
    '/customer/register': 'customer-register',
    '/customer/forgot-password': 'forgot-password',
    '/customer/reset-password': 'reset-password',
    '/admin/login': 'admin-login',
    '/admin/accept-invite': 'admin-accept-invite',
    '/admin/dashboard': 'admin-dashboard'
  };
  if (normalized.startsWith('/admin/')) return 'admin-' + normalized.replace('/admin/', '').replace(/\//g, '-');
  return map[normalized] || 'home';
};

const routeToPath = (route) => ({
  home: '/', shop: '/shop', category: '/categories', product: '/product', wishlist: '/wishlist', cart: '/cart', checkout: '/checkout', confirmation: '/order-confirmation', tracking: '/track-order', account: '/account', search: '/search', about: '/about', contact: '/contact', policies: '/policies', terms: '/terms', privacy: '/privacy', refunds: '/refunds', shipping: '/shipping',
  'customer-login': '/customer/login', 'customer-register': '/customer/register', 'forgot-password': '/customer/forgot-password', 'reset-password': '/customer/reset-password', 'admin-login': '/admin/login', 'admin-accept-invite': '/admin/accept-invite', 'admin-dashboard': '/admin/dashboard'
}[route] || (route.startsWith('admin-') ? '/admin/' + route.replace('admin-', '').replace(/-/g, '/') : '/'));

function canAccessAdminRoute(user, route) {
  if (!user || !adminRoles.includes(user.role)) return false;
  return (adminRoutePermissions[route] || adminRoles).includes(user.role);
}

function RestrictedPage({ title = 'Access restricted', message, action, setRoute }) {
  return <section className="section-pad page center-card"><div className="success-card restricted-card"><SectionTitle eyebrow="Permission required" title={title} /><p>{message}</p>{action && <button className="pill dark" onClick={() => setRoute(action.route)}>{action.label}</button>}</div></section>;
}

export default function App() {
  const [routeState, setRouteState] = useState(() => pathToRoute(window.location.pathname));
  const [routeParams, setRouteParams] = useState(null);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('luxe-user') || 'null'));
  const [progress, setProgress] = useState(0);

  const setRoute = (nextRoute, params = null) => {
    setRouteState(nextRoute);
    setRouteParams(params);
    const nextPath = routeToPath(nextRoute);
    if (window.location.pathname !== nextPath) window.history.pushState({}, '', nextPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onPop = () => setRouteState(pathToRoute(window.location.pathname));
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - innerHeight;
      setProgress(max > 0 ? (scrollY / max) * 100 : 0);
      document.documentElement.style.setProperty('--scroll-y', `${scrollY * -0.06}px`);
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // On a fresh page load there is no in-memory access token. If the user
    // still has a valid httpOnly refresh cookie we silently re-issue a
    // session; otherwise we stay logged-out. The user object is cached in
    // localStorage purely for first-paint UI hints and is invalidated as soon
    // as any request returns 401.
    const storedUser = localStorage.getItem('luxe-user');
    if (storedUser) return;
    refreshSession()
      .then((account) => {
        if (!account) return;
        localStorage.setItem('luxe-user', JSON.stringify(account));
        setUser(account);
      })
      .catch(() => clearAuthStorage());
  }, []);

  const consumeReturnTo = (fallback) => {
    const stored = sessionStorage.getItem('luxe-return-to');
    sessionStorage.removeItem('luxe-return-to');
    return stored || fallback;
  };
  const finishCustomerLogin = (account, fallback = 'home') => {
    if (account.role !== 'CUSTOMER') throw new Error('Please use a customer account.');
    localStorage.setItem('luxe-user', JSON.stringify(account));
    setUser(account);
    setRoute(consumeReturnTo(fallback));
  };

  const customerLogin = async (credentials) => {
    const { user: account } = await customerSignIn(credentials).then((u) => (u && u.user ? u : { user: u }));
    finishCustomerLogin(account);
  };
  const adminLogin = async (credentials) => {
    const result = await adminSignIn(credentials);
    if (result.twoFactorRequired) return result; // caller (AdminLoginPage) handles step 2
    const account = result.user;
    if (!adminRoles.includes(account.role)) throw new Error('Admin access required.');
    localStorage.setItem('luxe-user', JSON.stringify(account));
    setUser(account);
    setRoute('admin-dashboard');
    return { user: account };
  };
  const adminVerify = async ({ ticket, code }) => {
    const account = await adminVerify2FA({ ticket, code });
    if (!adminRoles.includes(account.role)) throw new Error('Admin access required.');
    localStorage.setItem('luxe-user', JSON.stringify(account));
    setUser(account);
    setRoute('admin-dashboard');
  };
  const register = async (payload) => {
    const account = await signUp(payload);
    finishCustomerLogin(account);
  };
  const googleLogin = async (credential) => {
    const account = await signInWithGoogle(credential);
    if (account.role !== 'CUSTOMER') throw new Error('Please use the staff portal for admin access.');
    finishCustomerLogin(account);
  };
  const logout = async () => {
    try { await performLogout(); }
    catch { clearAuthStorage(); }
    setUser(null);
    setRoute(routeState.startsWith('admin') ? 'admin-login' : 'home');
  };

  let page;
  const route = routeState;
  if (route === 'customer-login') page = <LoginPage onLogin={customerLogin} onGoogleLogin={googleLogin} setRoute={setRoute} />;
  else if (route === 'customer-register') page = <RegisterPage onRegister={register} onGoogleLogin={googleLogin} setRoute={setRoute} />;
  else if (route === 'forgot-password') page = <ForgotPasswordPage setRoute={setRoute} />;
  else if (route === 'reset-password') page = <ResetPasswordPage setRoute={setRoute} />;
  else if (route === 'admin-login') page = <AdminLoginPage onLogin={adminLogin} onVerify2FA={adminVerify} />;
  else if (adminRoutes.includes(route)) {
    if (!user) page = <AdminLoginPage onLogin={adminLogin} onVerify2FA={adminVerify} />;
    else if (!canAccessAdminRoute(user, route)) page = <RestrictedPage setRoute={setRoute} title="Admin access restricted" message="Your role does not have permission to open this admin section." action={{ label: 'Back to dashboard', route: 'admin-dashboard' }} />;
    else page = <AdminLayout route={route} setRoute={setRoute} user={user}><AdminPage route={route} user={user} /></AdminLayout>;
  } else if (customerProtectedRoutes.includes(route) && !user) {
    page = <RestrictedPage setRoute={setRoute} title="Customer login required" message="Please sign in or create an account before accessing checkout, wishlist, order tracking, or account pages." action={{ label: 'Sign in', route: 'customer-login' }} />;
  } else if (customerProtectedRoutes.includes(route) && user?.role !== 'CUSTOMER') {
    page = <RestrictedPage setRoute={setRoute} title="Customer account required" message="Admin and staff accounts cannot place customer orders. Please use a customer account for shopping." action={{ label: 'Back to shop', route: 'shop' }} />;
  } else {
    const props = { setRoute, user, routeParams };
    page = ({
      home: <CustomerHome {...props} />,
      shop: <ShopPage {...props} />,
      category: <CategoryPage {...props} />,
      product: <ProductPage {...props} />,
      wishlist: <WishlistPage {...props} />,
      cart: <CartPage {...props} />,
      checkout: <CheckoutPage {...props} />,
      confirmation: <ConfirmationPage {...props} />,
      tracking: <TrackingPage {...props} />,
      account: <AccountPage {...props} />,
      search: <SearchPage {...props} />,
      about: <AboutPage {...props} />,
      contact: <ContactPage {...props} />,
      policies: <PoliciesPage {...props} />,
      terms: <TermsPage {...props} />,
      privacy: <PrivacyPage {...props} />,
      refunds: <RefundsPage {...props} />,
      shipping: <ShippingPage {...props} />
    })[route] || <CustomerHome {...props} />;
  }

  const showFooter = !route.startsWith('admin') && !['customer-login','customer-register','forgot-password','reset-password','admin-accept-invite'].includes(route);
  return <><div className="scroll-progress" style={{ width: `${progress}%` }} /><Header route={route} setRoute={setRoute} user={user} onLogout={logout} />{page}{showFooter && <Footer setRoute={setRoute} />}</>;
}
