import React, { useEffect, useState, Suspense, lazy } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import { adminSignIn, clearAuthStorage, customerSignIn, logout as performLogout, refreshSession, signInWithGoogle, signUp } from './services/api.js';

// Lazy loaded pages
const CustomerHome = lazy(() => import('./pages/CustomerHome.jsx').then(m => ({ default: m.CustomerHome })));
const ShopPage = lazy(() => import('./pages/ShopPage.jsx').then(m => ({ default: m.ShopPage })));
const CategoryPage = lazy(() => import('./pages/CategoryPage.jsx').then(m => ({ default: m.CategoryPage })));
const ProductPage = lazy(() => import('./pages/ProductPage.jsx').then(m => ({ default: m.ProductPage })));
const WishlistPage = lazy(() => import('./pages/WishlistPage.jsx').then(m => ({ default: m.WishlistPage })));
const CartPage = lazy(() => import('./pages/CartPage.jsx').then(m => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage.jsx').then(m => ({ default: m.CheckoutPage })));
const ConfirmationPage = lazy(() => import('./pages/ConfirmationPage.jsx').then(m => ({ default: m.ConfirmationPage })));
const TrackingPage = lazy(() => import('./pages/TrackingPage.jsx').then(m => ({ default: m.TrackingPage })));
const AccountPage = lazy(() => import('./pages/AccountPage.jsx').then(m => ({ default: m.AccountPage })));
const SearchPage = lazy(() => import('./pages/SearchPage.jsx').then(m => ({ default: m.SearchPage })));
const AboutPage = lazy(() => import('./pages/AboutPage.jsx').then(m => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('./pages/ContactPage.jsx').then(m => ({ default: m.ContactPage })));
const PoliciesPage = lazy(() => import('./pages/PoliciesPage.jsx').then(m => ({ default: m.PoliciesPage })));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.jsx').then(m => ({ default: m.ResetPasswordPage })));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage.jsx').then(m => ({ default: m.AcceptInvitePage })));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage.jsx').then(m => ({ default: m.AdminLoginPage })));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx').then(m => ({ default: m.AdminPage })));

const ROUTES_CONFIG = {
  home: { path: '/', component: CustomerHome },
  shop: { path: '/shop', component: ShopPage },
  category: { path: '/categories', component: CategoryPage },
  product: { path: '/product', component: ProductPage },
  wishlist: { path: '/wishlist', component: WishlistPage },
  cart: { path: '/cart', component: CartPage },
  checkout: { path: '/checkout', component: CheckoutPage },
  confirmation: { path: '/order-confirmation', component: ConfirmationPage },
  tracking: { path: '/track-order', component: TrackingPage },
  account: { path: '/account', component: AccountPage },
  search: { path: '/search', component: SearchPage },
  about: { path: '/about', component: AboutPage },
  contact: { path: '/contact', component: ContactPage },
  policies: { path: '/policies', component: PoliciesPage },
  'customer-login': { path: '/customer/login', component: LoginPage },
  'customer-register': { path: '/customer/register', component: RegisterPage },
  'forgot-password': { path: '/customer/forgot-password', component: ForgotPasswordPage },
  'reset-password': { path: '/customer/reset-password', component: ResetPasswordPage },
  'admin-login': { path: '/admin/login', component: AdminLoginPage },
  'admin-accept-invite': { path: '/admin/accept-invite', component: AcceptInvitePage },
  'admin-dashboard': { path: '/admin/dashboard', component: AdminPage },
};

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
  if (normalized.startsWith('/admin/')) return 'admin-' + normalized.replace('/admin/', '').replace(/\//g, '-');
  const entry = Object.entries(ROUTES_CONFIG).find(([_, cfg]) => cfg.path === normalized);
  return entry ? entry[0] : 'home';
};

export const routeToPath = (route) => {
  if (route.startsWith('admin-') && !ROUTES_CONFIG[route]) return '/admin/' + route.replace('admin-', '').replace(/-/g, '/');
  return ROUTES_CONFIG[route]?.path || '/';
};

function canAccessAdminRoute(user, route) {
  if (!user || !adminRoles.includes(user.role)) return false;
  return (adminRoutePermissions[route] || adminRoles).includes(user.role);
}

function RestrictedPage({ title = 'Access restricted', message, action, setRoute }) {
  return <section className="section-pad page center-card"><div className="success-card restricted-card"><div className="section-title"><span className="eyebrow">Permission required</span><h2>{title}</h2></div><p>{message}</p>{action && <button className="pill dark" onClick={() => setRoute(action.route)}>{action.label}</button>}</div></section>;
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
    const accessToken = localStorage.getItem('luxe-access-token');
    const storedUser = localStorage.getItem('luxe-user');
    if (storedUser || !accessToken) return;
    refreshSession()
      .then((account) => {
        if (!account) return;
        localStorage.setItem('luxe-user', JSON.stringify(account));
        setUser(account);
      })
      .catch(() => clearAuthStorage());
  }, []);

  const customerLogin = async (credentials) => {
    const account = await customerSignIn(credentials);
    if (account.role !== 'CUSTOMER') throw new Error('Please use a customer account.');
    localStorage.setItem('luxe-user', JSON.stringify(account));
    setUser(account);
    setRoute('home');
  };
  const adminLogin = async (credentials) => {
    const account = await adminSignIn(credentials);
    if (!adminRoles.includes(account.role)) throw new Error('Admin access required.');
    localStorage.setItem('luxe-user', JSON.stringify(account));
    setUser(account);
    setRoute('admin-dashboard');
  };
  const register = async (payload) => {
    const account = await signUp(payload);
    localStorage.setItem('luxe-user', JSON.stringify(account));
    setUser(account);
    setRoute('home');
  };
  const googleLogin = async (credential) => {
    const account = await signInWithGoogle(credential);
    if (account.role !== 'CUSTOMER') throw new Error('Please use the staff portal for admin access.');
    localStorage.setItem('luxe-user', JSON.stringify(account));
    setUser(account);
    setRoute('home');
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
  else if (route === 'admin-login') page = <AdminLoginPage onLogin={adminLogin} />;
  else if (adminRoutes.includes(route)) {
    if (!user) page = <AdminLoginPage onLogin={adminLogin} />;
    else if (!canAccessAdminRoute(user, route)) page = <RestrictedPage setRoute={setRoute} title="Admin access restricted" message="Your role does not have permission to open this admin section." action={{ label: 'Back to dashboard', route: 'admin-dashboard' }} />;
    else page = <AdminLayout route={route} setRoute={setRoute} user={user}><Suspense fallback={<div className="summary-card">Loading admin section...</div>}><AdminPage route={route} user={user} /></Suspense></AdminLayout>;
  } else if (customerProtectedRoutes.includes(route) && !user) {
    page = <RestrictedPage setRoute={setRoute} title="Customer login required" message="Please sign in or create an account before accessing checkout, wishlist, order tracking, or account pages." action={{ label: 'Sign in', route: 'customer-login' }} />;
  } else if (customerProtectedRoutes.includes(route) && user?.role !== 'CUSTOMER') {
    page = <RestrictedPage setRoute={setRoute} title="Customer account required" message="Admin and staff accounts cannot place customer orders. Please use a customer account for shopping." action={{ label: 'Back to shop', route: 'shop' }} />;
  } else {
    const props = { setRoute, user, routeParams };
    const PageComponent = ROUTES_CONFIG[route]?.component || CustomerHome;
    page = <Suspense fallback={<div className="summary-card">Loading page...</div>}><PageComponent {...props} /></Suspense>;
  }

  const showFooter = !route.startsWith('admin') && !['customer-login','customer-register','forgot-password','reset-password','admin-accept-invite'].includes(route);
  return <><div className="scroll-progress" style={{ width: `${progress}%` }} /><Header route={route} setRoute={setRoute} user={user} onLogout={logout} />{page}{showFooter && <Footer setRoute={setRoute} />}</>;
}
