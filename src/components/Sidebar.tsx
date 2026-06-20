import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const menuItems = [
  { name: 'Shop', path: '/', icon: 'bi-shop', roles: ['USER', 'STORE_MANAGER', 'DELIVERY_PARTNER', 'ADMIN'] },
  { name: 'Cart', path: '/cart', icon: 'bi-cart3', roles: ['USER', 'STORE_MANAGER', 'DELIVERY_PARTNER', 'ADMIN'] },
  { name: 'Profile', path: '/profile', icon: 'bi-person', roles: ['USER', 'STORE_MANAGER', 'DELIVERY_PARTNER', 'ADMIN'] },
  { name: 'Admin Panel', path: '/admin', icon: 'bi-shield-check', roles: ['ADMIN'] },
  { name: 'Manager Panel', path: '/manager', icon: 'bi-grid', roles: ['STORE_MANAGER'] },
  { name: 'Partner Panel', path: '/partner', icon: 'bi-truck', roles: ['DELIVERY_PARTNER'] },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: (v: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const filteredItems = menuItems.filter(item => user?.role && item.roles.includes(user.role));

  const isExpanded = !collapsed;

  return (
    <aside
      className="fc-sidebar d-none d-lg-flex"
      style={{ width: isExpanded ? '264px' : '76px' }}
    >
      {/* Header */}
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

      {/* Nav */}
      <nav className="flex-grow-1 py-3 px-2 overflow-auto">
        {isExpanded && (
          <p className="px-3 mb-2 fw-semibold text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Menu</p>
        )}
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.name : undefined}
            className={({ isActive }) =>
              `d-flex align-items-center rounded-3 mb-1 text-decoration-none ${
                collapsed ? 'justify-content-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
              } ${isActive ? 'fw-semibold' : 'text-secondary'}`
            }
            style={({ isActive }) => ({
              transition: 'all 0.2s ease',
              ...(isActive ? { background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', color: '#059669', boxShadow: 'inset 3px 0 0 #10b981' } : {}),
            })}
          >
            {({ isActive }) => (
              <>
                <i className={`bi ${item.icon}`} style={{ fontSize: '18px', color: isActive ? '#10b981' : '#9ca3af', transition: 'color 0.2s ease' }}></i>
                {isExpanded && <span style={{ fontSize: '13.5px' }}>{item.name}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className={`px-3 pb-3 ${collapsed ? 'px-2' : ''}`}>
        {isExpanded && user && (
          <div className="p-3 rounded-3 mb-2" style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)', border: '1px solid #f0f0f0' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0" style={{ width: '36px', height: '36px', fontSize: '13px', background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)' }}>
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-grow-1">
                <p className="mb-0 fw-semibold text-truncate" style={{ fontSize: '13px' }}>{user.name}</p>
                <small className="text-muted d-block text-truncate" style={{ fontSize: '11px' }}>{user.role?.replace('_', ' ')}</small>
              </div>
              <i className="bi bi-chevron-right text-muted" style={{ fontSize: '10px' }}></i>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
          className={`btn d-flex align-items-center gap-2 w-100 rounded-3 border-0 text-muted ${collapsed ? 'justify-content-center px-2 py-2.5' : 'px-3 py-2.5'}`}
          style={{ fontSize: '13px', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}
        >
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

export default Sidebar;
