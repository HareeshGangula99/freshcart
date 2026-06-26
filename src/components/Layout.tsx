import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import InstallPWA from './InstallPWA';
import ChatBot from './ChatBot';

const menuItems = [
  { name: 'Shop', path: '/', icon: 'bi-shop', roles: ['USER', 'STORE_MANAGER', 'DELIVERY_PARTNER', 'ADMIN'] },
  { name: 'Cart', path: '/cart', icon: 'bi-cart3', roles: ['USER', 'STORE_MANAGER', 'DELIVERY_PARTNER', 'ADMIN'] },
  { name: 'Profile', path: '/profile', icon: 'bi-person', roles: ['USER', 'STORE_MANAGER', 'DELIVERY_PARTNER', 'ADMIN'] },
  { name: 'Admin Panel', path: '/admin', icon: 'bi-shield-check', roles: ['ADMIN'] },
  { name: 'Manager Panel', path: '/manager', icon: 'bi-grid', roles: ['STORE_MANAGER'] },
  { name: 'Partner Panel', path: '/partner', icon: 'bi-truck', roles: ['DELIVERY_PARTNER'] },
];

const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const filteredItems = menuItems.filter(item => user?.role && item.roles.includes(user.role));

  return (
    <div className="d-flex min-vh-100" style={{ background: '#f8f7f4' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100"
          style={{ background: 'rgba(0,0,0,0.4)', zIndex: 1035, backdropFilter: 'blur(2px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className="d-lg-none position-fixed top-0 start-0 h-100 bg-white"
        style={{
          width: '264px',
          zIndex: 1040,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: mobileOpen ? '4px 0 24px rgba(0,0,0,0.1)' : 'none',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="d-flex align-items-center justify-content-between px-3" style={{ height: '64px', borderBottom: '1px solid #f3f4f6' }}>
          <div className="d-flex align-items-center gap-2.5">
            <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #059669, #10b981)' }}>
              <i className="bi bi-bag-check text-white" style={{ fontSize: '16px' }}></i>
            </div>
            <div>
              <h6 className="mb-0 fw-bold" style={{ fontSize: '15px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>FreshCart</h6>
              <small className="text-muted" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fresh Groceries</small>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="btn btn-sm d-flex align-items-center justify-content-center rounded-2 border-0" style={{ width: '36px', height: '36px', background: '#f3f4f6', color: '#6b7280' }}>
            <i className="bi bi-x-lg" style={{ fontSize: '14px' }}></i>
          </button>
        </div>

        <nav className="flex-grow-1 py-3 px-2 overflow-auto">
          <p className="px-3 mb-2 fw-semibold text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Menu</p>
          {filteredItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `d-flex align-items-center gap-3 rounded-3 mb-1 text-decoration-none px-3 py-2.5 ${isActive ? 'fw-semibold' : 'text-secondary'}`
              }
              style={({ isActive }) => ({
                transition: 'all 0.2s ease',
                ...(isActive ? { background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', color: '#059669', boxShadow: 'inset 3px 0 0 #10b981' } : {}),
              })}
            >
              {({ isActive }) => (
                <>
                  <i className={`bi ${item.icon}`} style={{ fontSize: '18px', color: isActive ? '#10b981' : '#9ca3af' }}></i>
                  <span style={{ fontSize: '13.5px' }}>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-3">
          <div className="mb-2">
            <InstallPWA />
          </div>
          {user && (
            <div className="p-3 rounded-3 mb-2" style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)', border: '1px solid #f0f0f0' }}>
              <div className="d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: '36px', height: '36px', fontSize: '13px', background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-grow-1">
                  <p className="mb-0 fw-semibold text-truncate" style={{ fontSize: '13px' }}>{user.name}</p>
                  <small className="text-muted d-block text-truncate" style={{ fontSize: '11px' }}>{user.role?.replace('_', ' ')}</small>
                </div>
              </div>
            </div>
          )}
          <button onClick={logout} className="btn d-flex align-items-center gap-2 w-100 rounded-3 border-0 text-muted px-3 py-2.5" style={{ fontSize: '13px' }}>
            <i className="bi bi-box-arrow-right"></i>
            <span className="fw-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <DesktopSidebar collapsed={collapsed} onToggle={setCollapsed} />

      <main
        className="flex-grow-1"
        style={{ marginLeft: collapsed ? '72px' : '260px', transition: 'margin-left 0.3s ease' }}
      >
        {/* Mobile top bar */}
        <div className="d-lg-none position-fixed top-0 start-0 end-0 px-3 d-flex align-items-center justify-content-between" style={{ height: '56px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', zIndex: 1030, borderBottom: '1px solid #f3f4f6' }}>
          <button
            onClick={() => setMobileOpen(true)}
            className="btn d-flex align-items-center justify-content-center rounded-2 border-0"
            style={{ width: '40px', height: '40px', background: '#f3f4f6', color: '#374151' }}
          >
            <i className="bi bi-list" style={{ fontSize: '20px' }}></i>
          </button>
          <div className="d-flex align-items-center gap-2">
            <div className="d-flex align-items-center justify-content-center rounded-2" style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #059669, #10b981)' }}>
              <i className="bi bi-bag-check text-white" style={{ fontSize: '13px' }}></i>
            </div>
            <span className="fw-bold" style={{ fontSize: '15px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>FreshCart</span>
          </div>
          <div style={{ width: '40px' }}></div>
        </div>

        <div className="container-fluid px-3 py-3 px-lg-5 py-lg-5 mt-mobile" style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>

      <ChatBot />
    </div>
  );
};

// Desktop Sidebar component (same as before but only shown on lg+)
const DesktopSidebar: React.FC<{ collapsed: boolean; onToggle: (v: boolean) => void }> = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const filteredItems = menuItems.filter(item => user?.role && item.roles.includes(user.role));
  const isExpanded = !collapsed;

  return (
    <aside className="fc-sidebar d-none d-lg-flex" style={{ width: isExpanded ? '264px' : '76px' }}>
      <div className={`d-flex align-items-center ${isExpanded ? 'justify-content-between' : 'justify-content-center'} px-3`} style={{ height: '72px', borderBottom: '1px solid #f3f4f6' }}>
        {isExpanded && (
          <div className="d-flex align-items-center gap-2.5">
            <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '38px', height: '38px', background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)' }}>
              <i className="bi bi-bag-check text-white" style={{ fontSize: '17px' }}></i>
            </div>
            <div>
              <h6 className="mb-0 fw-bold" style={{ fontSize: '16px', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.3px' }}>FreshCart</h6>
              <small className="text-muted" style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>Fresh Groceries</small>
            </div>
          </div>
        )}
        {!isExpanded && (
          <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '38px', height: '38px', background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)' }}>
            <i className="bi bi-bag-check text-white" style={{ fontSize: '17px' }}></i>
          </div>
        )}
        {isExpanded && (
          <button onClick={() => onToggle(true)} className="btn btn-sm d-flex align-items-center justify-content-center rounded-2 border-0" style={{ width: '28px', height: '28px', background: '#f3f4f6', color: '#6b7280' }}>
            <i className="bi bi-chevron-left" style={{ fontSize: '12px' }}></i>
          </button>
        )}
      </div>

      <nav className="flex-grow-1 py-3 px-2 overflow-auto">
        {isExpanded && <p className="px-3 mb-2 fw-semibold text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Menu</p>}
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.name : undefined}
            className={({ isActive }) =>
              `d-flex align-items-center rounded-3 mb-1 text-decoration-none ${collapsed ? 'justify-content-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'} ${isActive ? 'fw-semibold' : 'text-secondary'}`
            }
            style={({ isActive }) => ({
              transition: 'all 0.2s ease',
              ...(isActive ? { background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', color: '#059669', boxShadow: 'inset 3px 0 0 #10b981' } : {}),
            })}
          >
            {({ isActive }) => (
              <>
                <i className={`bi ${item.icon}`} style={{ fontSize: '18px', color: isActive ? '#10b981' : '#9ca3af' }}></i>
                {isExpanded && <span style={{ fontSize: '13.5px' }}>{item.name}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={`px-3 pb-3 ${collapsed ? 'px-2' : ''}`}>
        {!collapsed && (
          <div className="mb-2">
            <InstallPWA />
          </div>
        )}
        {collapsed && (
          <button title="Install App" onClick={() => {}} className="btn d-flex align-items-center justify-content-center w-100 px-2 py-2.5 rounded-3 border-0 mb-2" style={{ background: '#ecfdf5', color: '#059669' }}>
            <i className="bi bi-phone" style={{ fontSize: '14px' }}></i>
          </button>
        )}
        {isExpanded && user && (
          <div className="p-3 rounded-3 mb-2" style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)', border: '1px solid #f0f0f0' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0" style={{ width: '36px', height: '36px', fontSize: '13px', background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-grow-1">
                <p className="mb-0 fw-semibold text-truncate" style={{ fontSize: '13px' }}>{user.name}</p>
                <small className="text-muted d-block text-truncate" style={{ fontSize: '11px' }}>{user.role?.replace('_', ' ')}</small>
              </div>
            </div>
          </div>
        )}
        <button onClick={logout} className={`btn d-flex align-items-center gap-2 w-100 rounded-3 border-0 text-muted ${collapsed ? 'justify-content-center px-2 py-2.5' : 'px-3 py-2.5'}`} style={{ fontSize: '13px' }}>
          <i className="bi bi-box-arrow-right"></i>
          {isExpanded && <span className="fw-medium">Logout</span>}
        </button>
        {collapsed && (
          <button onClick={() => onToggle(false)} className="btn d-flex align-items-center justify-content-center w-100 px-2 py-2.5 rounded-3 text-muted border-0 mt-1" style={{ background: '#f3f4f6' }}>
            <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>
          </button>
        )}
      </div>
    </aside>
  );
};

export default Layout;
