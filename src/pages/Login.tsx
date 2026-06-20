import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PhoneLogin from '../components/PhoneLogin';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const checkGoogle = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(checkGoogle);
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
        });
      }
    }, 200);

    return () => clearInterval(checkGoogle);
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    setGoogleLoading(true);
    setError('');
    try {
      const res = await authService.googleLogin({ credential: response.credential });
      login(res.data.token, res.data);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google login failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const triggerGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google login is not configured. Please contact admin.');
      return;
    }
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      setError('Google login is loading. Please try again in a moment.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.login({ email, password });
      login(res.data.token, res.data);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh', background: '#f8f7f4' }}>
      {/* Left Panel */}
      <div className="d-none d-lg-flex align-items-center justify-content-center position-relative" style={{ width: '48%', background: 'linear-gradient(160deg, #0a3d2e 0%, #0d6b4a 35%, #10b981 70%, #34d399 100%)', overflow: 'hidden' }}>
        <div className="position-absolute" style={{ top: '-60px', right: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', filter: 'blur(60px)' }} />
        <div className="position-absolute" style={{ bottom: '40px', left: '-40px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', filter: 'blur(50px)' }} />
        <div className="position-absolute" style={{ inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="position-relative text-white" style={{ maxWidth: '440px', zIndex: 10, padding: '60px' }}>
          <div className="d-flex align-items-center gap-3 mb-5">
            <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <i className="bi bi-bag-check fs-5"></i>
            </div>
            <span className="fw-bold" style={{ fontSize: '22px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>FreshCart</span>
          </div>
          <h2 className="fw-bold mb-3" style={{ fontSize: '44px', lineHeight: 1.15, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-1px' }}>
            Fresh groceries,<br />delivered to you.
          </h2>
          <p style={{ fontSize: '17px', lineHeight: 1.7, marginBottom: '48px', color: 'rgba(255,255,255,0.75)', maxWidth: '400px' }}>
            Join thousands of happy customers who trust FreshCart for their daily fresh produce needs.
          </p>
          <div className="d-flex flex-column gap-3">
            {[
              { icon: 'bi-leaf', text: '100% Organic & Fresh' },
              { icon: 'bi-truck', text: '30-minute delivery' },
              { icon: 'bi-star-fill', text: '4.8 rated by customers' },
            ].map((item, i) => (
              <div key={i} className="d-flex align-items-center gap-3" style={{ color: 'rgba(255,255,255,0.85)' }}>
                <div className="d-flex align-items-center justify-content-center rounded-2" style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <i className={`bi ${item.icon}`}></i>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.text}</span>
              </div>
            ))}
          </div>
          <div className="d-flex gap-5 mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            {[{ value: '50K+', label: 'Happy Users' }, { value: '10K+', label: 'Products' }, { value: '4.8', label: 'App Rating' }].map((stat, i) => (
              <div key={i}>
                <div className="fw-bold" style={{ fontSize: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{stat.value}</div>
                <small style={{ color: 'rgba(255,255,255,0.5)' }}>{stat.label}</small>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="d-flex align-items-center justify-content-center flex-grow-1 p-4">
        <div style={{ width: '100%', maxWidth: '420px' }} className="animate-fade-in">
          <div className="d-flex d-lg-none align-items-center gap-3 mb-5 justify-content-center">
            <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #059669, #10b981)' }}>
              <i className="bi bi-bag-check text-white"></i>
            </div>
            <span className="fw-bold" style={{ fontSize: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>FreshCart</span>
          </div>

          <div className="mb-4">
            <h2 className="fw-bold text-dark mb-1" style={{ fontSize: '28px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Welcome back</h2>
            <p className="text-muted" style={{ fontSize: '15px' }}>Sign in to your account to continue shopping</p>
          </div>

          <div className="card border-0 shadow-sm p-4 rounded-4">
            {error && (
              <div className="alert d-flex align-items-center gap-2 mb-3" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px' }}>
                <i className="bi bi-exclamation-circle-fill"></i>
                {error}
              </div>
            )}

            {/* Social & Phone Buttons */}
            <button
              type="button"
              onClick={triggerGoogleLogin}
              disabled={googleLoading}
              className="btn w-100 fw-semibold rounded-3 py-2 d-flex align-items-center justify-content-center gap-2 mb-2"
              style={{ border: '1.5px solid #e5e7eb', fontSize: '14px', color: '#374151', background: '#fff' }}
            >
              {googleLoading ? (
                <span className="spinner-border spinner-border-sm" role="status"></span>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              )}
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </button>

            <button
              type="button"
              onClick={() => { setLoginMethod(loginMethod === 'phone' ? 'email' : 'phone'); setError(''); }}
              className="btn w-100 fw-semibold rounded-3 py-2 d-flex align-items-center justify-content-center gap-2 mb-3"
              style={{ border: '1.5px solid #e5e7eb', fontSize: '14px', color: '#374151', background: '#fff' }}
            >
              <i className={`bi ${loginMethod === 'phone' ? 'bi-envelope' : 'bi-phone'}`}></i>
              {loginMethod === 'phone' ? 'Continue with Email' : 'Continue with Phone'}
            </button>

            {loginMethod === 'phone' ? (
              <PhoneLogin mode="login" />
            ) : (
              <>
                <div className="d-flex align-items-center gap-3 mb-3">
                  <hr className="flex-grow-1" />
                  <small className="text-muted fw-medium">OR</small>
                  <hr className="flex-grow-1" />
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '13px', color: '#374151' }}>Email address</label>
                    <div className="position-relative">
                      <i className="bi bi-envelope position-absolute" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}></i>
                      <input type="email" className="form-control fc-input" style={{ paddingLeft: '42px' }} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="form-label fw-semibold" style={{ fontSize: '13px', color: '#374151' }}>Password</label>
                    <div className="position-relative">
                      <i className="bi bi-lock position-absolute" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}></i>
                      <input type="password" className="form-control fc-input" style={{ paddingLeft: '42px' }} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn w-100 fw-bold text-white rounded-3 py-2 fc-primary" style={{ fontSize: '14px', boxShadow: '0 4px 14px -3px rgba(5,150,105,0.4)' }}>
                    {loading ? (
                      <span className="d-flex align-items-center justify-content-center gap-2">
                        <span className="spinner-border spinner-border-sm" role="status"></span> Signing in...
                      </span>
                    ) : (
                      <>Sign In <i className="bi bi-arrow-right"></i></>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="text-center mt-4" style={{ fontSize: '14px', color: '#6b7280' }}>
            Don't have an account?{' '}
            <Link to="/signup" className="text-decoration-none fw-bold" style={{ color: '#059669' }}>Create one now <i className="bi bi-arrow-up-right"></i></Link>
          </p>
          <div className="d-flex align-items-center justify-content-center gap-1 mt-3 text-muted" style={{ fontSize: '12px' }}>
            <i className="bi bi-lock"></i>
            <span>Secured with 256-bit SSL encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
