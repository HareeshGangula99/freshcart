import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg sticky-top px-4 py-3" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #e5e7eb' }}>
      <div className="container-fluid">
        <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none">
          <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #059669, #10b981)' }}>
            <i className="bi bi-bag-check text-white" style={{ fontSize: '14px' }}></i>
          </div>
          <span className="fw-bold text-dark" style={{ fontSize: '18px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>FreshCart</span>
        </Link>

        <div className="d-flex align-items-center gap-3">
          <Link to="/" className="text-decoration-none fw-medium" style={{ fontSize: '14px', color: '#6b7280' }}>Shop</Link>

          {user?.role === 'ADMIN' && <Link to="/admin" className="text-decoration-none fw-medium" style={{ fontSize: '14px', color: '#6b7280' }}>Admin</Link>}
          {user?.role === 'STORE_MANAGER' && <Link to="/manager" className="text-decoration-none fw-medium" style={{ fontSize: '14px', color: '#6b7280' }}>Manager</Link>}
          {user?.role === 'DELIVERY_PARTNER' && <Link to="/partner" className="text-decoration-none fw-medium" style={{ fontSize: '14px', color: '#6b7280' }}>Partner</Link>}

          {user ? (
            <div className="d-flex align-items-center gap-2">
              <Link to="/cart" className="btn btn-light rounded-3 p-2"><i className="bi bi-cart3" style={{ fontSize: '18px', color: '#6b7280' }}></i></Link>
              <Link to="/profile" className="btn btn-light rounded-3 p-2"><i className="bi bi-person" style={{ fontSize: '18px', color: '#6b7280' }}></i></Link>
              <button onClick={handleLogout} className="btn btn-light rounded-3 p-2 text-muted"><i className="bi bi-box-arrow-right" style={{ fontSize: '18px' }}></i></button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-sm fw-semibold text-white rounded-3 px-3 py-2 fc-primary" style={{ fontSize: '13px' }}>Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
