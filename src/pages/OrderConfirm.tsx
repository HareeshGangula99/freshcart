import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';

const socket = getSocket();

const OrderConfirm: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notified, setNotified] = useState(false);
  const { orderId, amount, address } = location.state || {};

  useEffect(() => {
    if (!orderId || !user) return;
    socket.emit('join_order_room', orderId);
    socket.emit('order_confirmed', { orderId, userId: user.id, userName: user.name, amount });
    setNotified(true);
    socket.on('order_dispatched', (data: { orderId: string; partnerName: string }) => {
      if (data.orderId === orderId) alert(`Your order has been dispatched! Delivery partner: ${data.partnerName}`);
    });
    return () => { socket.off('order_dispatched'); };
  }, [orderId, user]);

  if (!orderId) {
    return (
      <div className="text-center py-5">
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
        <p className="text-muted fw-medium fs-5">No order information found</p>
        <button onClick={() => navigate('/')} className="btn text-success fw-medium">Go Home</button>
      </div>
    );
  }

  const steps = [
    { label: 'Placed', icon: 'bi-box', done: true },
    { label: 'Confirmed', icon: 'bi-check-circle', done: false },
    { label: 'Dispatched', icon: 'bi-truck', done: false },
    { label: 'Delivered', icon: 'bi-house', done: false },
  ];

  return (
    <div className="d-flex align-items-center justify-content-center py-3 py-md-5 animate-fade-in" style={{ minHeight: '70vh' }}>
      <div className="card border-0 shadow-sm rounded-4 p-3 p-md-4 text-center" style={{ maxWidth: '500px', width: '100%' }}>
        <div className="d-flex justify-content-center mb-4">
          <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>
            <i className="bi bi-check-circle text-success" style={{ fontSize: '44px' }}></i>
          </div>
        </div>
        <h3 className="fw-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '22px' }}>Order Confirmed!</h3>
        <p className="text-muted mb-4">
          Thank you{user?.name ? `, ${user.name}` : ''}! Your order has been placed successfully.
        </p>

        <div className="p-3 rounded-3 text-start mb-4" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
          <div className="d-flex justify-content-between mb-2 flex-wrap gap-1">
            <small className="text-muted">Order ID</small>
            <span className="fw-bold" style={{ fontFamily: 'monospace', fontSize: '13px' }}>#{orderId?.slice(-8).toUpperCase()}</span>
          </div>
          <div className="d-flex justify-content-between mb-2 flex-wrap gap-1">
            <small className="text-muted">Amount Paid</small>
            <span className="fw-bold text-success">₹{amount}</span>
          </div>
          {address && (
            <div className="d-flex justify-content-between flex-wrap gap-1">
              <small className="text-muted">Deliver To</small>
              <small className="text-end"><i className="bi bi-geo-alt text-success me-1"></i>{address.street}, {address.city} - {address.zip}</small>
            </div>
          )}
        </div>

        {notified && (
          <div className="alert d-flex align-items-center gap-2 mb-4" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '13px' }}>
            <i className="bi bi-bell"></i> Store Manager has been notified about your order!
          </div>
        )}

        <div className="d-flex align-items-center justify-content-between mb-4 px-1 px-sm-2 steps-container">
          {steps.map((step, i) => (
            <div key={step.label} className="d-flex flex-column align-items-center gap-1 gap-md-2">
              <div className={`rounded-circle d-flex align-items-center justify-content-center ${i === 0 ? 'bg-success text-white shadow-sm' : 'bg-light text-muted border'}`} style={{ width: '32px', height: '32px' }}>
                <i className={`bi ${step.icon}`}></i>
              </div>
              <small className={`fw-medium ${i === 0 ? 'text-success' : 'text-muted'}`} style={{ fontSize: '11px' }}>{step.label}</small>
            </div>
          ))}
        </div>

        <div className="d-flex gap-3 flex-wrap">
          <button onClick={() => navigate('/profile')} className="btn flex-grow-1 fw-medium rounded-3 py-2 d-flex align-items-center justify-content-center gap-2" style={{ border: '1.5px solid #e5e7eb', fontSize: '13px', minWidth: '120px' }}>
            <i className="bi bi-bag"></i> My Orders
          </button>
          <button onClick={() => navigate('/')} className="btn flex-grow-1 fw-bold text-white rounded-3 py-2 fc-primary d-flex align-items-center justify-content-center gap-2" style={{ fontSize: '13px', minWidth: '120px' }}>
            <i className="bi bi-house"></i> Shop More
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirm;
