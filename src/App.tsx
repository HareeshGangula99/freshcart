import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import 'bootstrap/dist/css/bootstrap.min.css';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Cart = lazy(() => import('./pages/Cart'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const OrderConfirm = lazy(() => import('./pages/OrderConfirm'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const PartnerDashboard = lazy(() => import('./pages/PartnerDashboard'));
const Profile = lazy(() => import('./pages/Profile'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
        <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <p className="text-sm text-warm-400 font-medium">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/order-confirm" element={<OrderConfirm />} />

                <Route element={<PrivateRoute />}>
                  <Route path="/profile" element={<Profile />} />
                </Route>

                <Route element={<PrivateRoute allowedRoles={['ADMIN']} />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>

                <Route element={<PrivateRoute allowedRoles={['STORE_MANAGER']} />}>
                  <Route path="/manager" element={<ManagerDashboard />} />
                </Route>

                <Route element={<PrivateRoute allowedRoles={['DELIVERY_PARTNER']} />}>
                  <Route path="/partner" element={<PartnerDashboard />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </Provider>
  );
}

export default App;
