import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/api';
import { getSocket, registerSocketUser } from '../services/socket';
import { API_BASE } from '../config';
import DeliveryTrackingMap from '../components/DeliveryTrackingMap';
import OrderHelpChat from '../components/OrderHelpChat';

const socket = getSocket();

const statusStyle: Record<string, { background: string; color: string; border: string }> = {
  PLACED: { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' },
  CONFIRMED: { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' },
  DISPATCHED: { background: '#f3e8ff', color: '#7c3aed', border: '1px solid #ddd6fe' },
  OUT_FOR_DELIVERY: { background: '#f3e8ff', color: '#7c3aed', border: '1px solid #ddd6fe' },
  DELIVERED: { background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' },
  CANCELLED: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
};

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [chatOrder, setChatOrder] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [trackingOrder, setTrackingOrder] = useState<any>(null);
  const [orderHelpOrder, setOrderHelpOrder] = useState<any>(null);
  const [unreadOrderIds, setUnreadOrderIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ name: string; text: string } | null>(null);
  const chatOrderRef = useRef<any>(null);
  const userRef = useRef<any>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<{ distance: number; ETA: string; arrived: boolean } | null>(null);
  const trackingListenerRef = useRef<((data: { orderId: string; lat: number; lng: number }) => void) | null>(null);

  useEffect(() => {
    if (user?.id || user?._id) {
      registerSocketUser(String(user.id || user._id));
    }
  }, [user]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        let res;
        if (user?.role === 'DELIVERY_PARTNER') {
          res = await orderService.getPartnerOrders();
        } else {
          res = await orderService.getUserOrders();
        }
        setOrders(res.data);
        // Join order rooms for active orders to receive real-time updates
        res.data.forEach((order: any) => {
          if (order.orderStatus !== 'DELIVERED' && order.orderStatus !== 'CANCELLED') {
            socket.emit('join_order_room', order._id);
          }
        });
      } catch (e) { console.error('Failed to fetch orders', e); }
      finally { setLoading(false); }
    };
    fetchOrders();
  }, [user]);

  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const handleChatHistory = (history: any[]) => setMessages(history);
    const handleReceiveMessage = (msg: any) => {
      const current = chatOrderRef.current;
      const currentUser = userRef.current;
      const myId = currentUser?.id || currentUser?._id;
      if (current && msg.orderId === current._id) {
        if (msg.senderId !== myId) {
          setMessages(prev => [...prev, msg]);
        }
      } else {
        if (msg.senderId !== myId) {
          setUnreadOrderIds(prev => new Set(prev).add(msg.orderId));
          setToast({ name: msg.senderName || 'Someone', text: msg.text });
          setTimeout(() => setToast(null), 4000);
          if (Notification.permission === 'granted') {
            new Notification(`${msg.senderName || 'New message'}`, { body: msg.text, icon: '/bag-check.svg' });
          }
        }
      }
    };
    const handleOrderDispatched = (data: { orderId: string }) => {
      setOrders(prev => prev.map(o => o._id === data.orderId ? { ...o, orderStatus: 'DISPATCHED' } : o));
    };
    const handleDeliveryStarted = (data: { orderId: string }) => {
      setOrders(prev => prev.map(o => o._id === data.orderId ? { ...o, orderStatus: 'OUT_FOR_DELIVERY' } : o));
    };

    socket.on('chat_history', handleChatHistory);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('order_dispatched', handleOrderDispatched);
    socket.on('delivery_started', handleDeliveryStarted);

    return () => {
      socket.off('chat_history', handleChatHistory);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('order_dispatched', handleOrderDispatched);
      socket.off('delivery_started', handleDeliveryStarted);
    };
  }, []);

  // Cleanup tracking listener on unmount
  useEffect(() => {
    return () => {
      if (trackingListenerRef.current) {
        socket.off('delivery_location_update', trackingListenerRef.current);
        trackingListenerRef.current = null;
      }
    };
  }, []);

  const openChat = (order: any) => {
    chatOrderRef.current = order;
    setChatOrder(order);
    setMessages([]);
    setUnreadOrderIds(prev => { const next = new Set(prev); next.delete(order._id); return next; });
    socket.emit('join_room', order._id);
    socket.emit('get_chat_history', { orderId: order._id });
  };

  const closeChat = () => {
    chatOrderRef.current = null;
    setChatOrder(null);
    setMessages([]);
    setInput('');
  };

  const sendMessage = () => {
    if (!input.trim() || !chatOrder || !user) return;
    const msg = { orderId: chatOrder._id, senderId: user.id || user._id, senderName: user.name, text: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, msg]);
    socket.emit('send_message', { orderId: chatOrder._id, senderId: user.id || user._id, senderName: user.name, text: input.trim() });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const isDeliveryPartner = user?.role === 'DELIVERY_PARTNER';

  const openTracking = async (order: any) => {
    setTrackingOrder(order);
    setCustomerLocation(null);
    setTrackingInfo(null);

    // Remove old tracking listener if any
    if (trackingListenerRef.current) {
      socket.off('delivery_location_update', trackingListenerRef.current);
      trackingListenerRef.current = null;
    }

    // ALWAYS use delivery address (Marthahalli) as customer destination - NOT device GPS
    if (order.deliveryAddress?.lat && order.deliveryAddress?.lng) {
      setCustomerLocation({ lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng });
    } else if (order.customerLocation?.lat && order.customerLocation?.lng) {
      setCustomerLocation({ lat: order.customerLocation.lat, lng: order.customerLocation.lng });
    }

    // Fetch latest tracking data from DB
    try {
      const res = await orderService.getOrderTracking(order._id);
      const data = res.data;
      if (data.deliveryPartnerLocation?.lat && data.deliveryPartnerLocation?.lng) {
        setDeliveryLocation({ lat: data.deliveryPartnerLocation.lat, lng: data.deliveryPartnerLocation.lng });
      }
      // Prefer delivery address coordinates (the actual destination)
      if (data.deliveryAddress?.lat && data.deliveryAddress?.lng) {
        setCustomerLocation({ lat: data.deliveryAddress.lat, lng: data.deliveryAddress.lng });
      } else if (data.customerLocation?.lat && data.customerLocation?.lng) {
        setCustomerLocation({ lat: data.customerLocation.lat, lng: data.customerLocation.lng });
      }
    } catch {
      if (order.deliveryPartnerLocation?.lat && order.deliveryPartnerLocation?.lng) {
        setDeliveryLocation({ lat: order.deliveryPartnerLocation.lat, lng: order.deliveryPartnerLocation.lng });
      }
    }

    // Named listener for delivery location updates
    const handleDeliveryLocation = (data: { orderId: string; lat: number; lng: number }) => {
      if (data.orderId === order._id) {
        setDeliveryLocation({ lat: data.lat, lng: data.lng });
      }
    };
    trackingListenerRef.current = handleDeliveryLocation;
    socket.on('delivery_location_update', handleDeliveryLocation);

    // Join tracking room
    socket.emit('join_customer_tracking', order._id);
  };

  const closeTracking = useCallback(() => {
    if (trackingListenerRef.current) {
      socket.off('delivery_location_update', trackingListenerRef.current);
      trackingListenerRef.current = null;
    }
    if (trackingOrder) {
      socket.emit('leave_room', trackingOrder._id);
    }
    setTrackingOrder(null);
    setDeliveryLocation(null);
    setCustomerLocation(null);
    setTrackingInfo(null);
  }, [trackingOrder]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          className="position-fixed d-flex align-items-center gap-3 p-3 rounded-3 animate-slide-up"
          style={{ top: '70px', right: '12px', left: '12px', maxWidth: '400px', marginLeft: 'auto', zIndex: 1080, background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb', cursor: 'pointer' }}
          onClick={() => setToast(null)}
        >
          <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0" style={{ width: '40px', height: '40px', fontSize: '14px', background: 'linear-gradient(135deg, #059669, #10b981)' }}>
            {toast.name?.[0]?.toUpperCase() || 'M'}
          </div>
          <div className="min-w-0 flex-grow-1">
            <p className="fw-bold mb-0 text-truncate" style={{ fontSize: '13px' }}>{toast.name}</p>
            <small className="text-muted text-truncate d-block" style={{ fontSize: '12px' }}>{toast.text}</small>
          </div>
          <i className="bi bi-chat-dots text-success flex-shrink-0" style={{ fontSize: '18px' }}></i>
        </div>
      )}

      {/* Profile Card */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
        <div style={{ height: '96px', background: 'linear-gradient(135deg, #065f46, #059669, #10b981)' }} />
        <div className="card-body" style={{ marginTop: '-40px' }}>
          <div className="d-flex align-items-end gap-3 mb-3">
            <div className="rounded-4 d-flex align-items-center justify-content-center text-white fw-bold fs-4 border border-4 border-white shadow-lg" style={{ width: '72px', height: '72px', minWidth: '72px', background: 'linear-gradient(135deg, #059669, #10b981)', fontSize: '24px' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="pb-1 min-w-0">
              <h4 className="fw-bold mb-0 text-truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '20px' }}>{user?.name}</h4>
              <small className="text-muted text-truncate d-block"><i className="bi bi-envelope me-1"></i>{user?.email}</small>
            </div>
          </div>
          <span className="badge bg-success bg-opacity-10 text-success fw-medium" style={{ borderRadius: '20px', fontSize: '12px' }}>
            <i className="bi bi-shield-check me-1"></i>{user?.role?.replace('_', ' ') || 'USER'}
          </span>
        </div>
      </div>

      {/* Orders Section */}
      <div>
        <h5 className="fw-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '18px' }}>
          <i className="bi bi-bag text-success me-2"></i>
          {isDeliveryPartner ? 'My Deliveries' : 'My Orders'}
          {orders.length > 0 && <span className="badge bg-light text-muted ms-2" style={{ fontSize: '11px' }}>{orders.length}</span>}
        </h5>

        {loading ? (
          <div className="d-flex flex-column gap-3">
            {[...Array(3)].map((_, i) => <div key={i} className="card border-0 shadow-sm rounded-4 p-4"><div className="skeleton" style={{ height: '60px' }}></div></div>)}
          </div>
        ) : orders.length === 0 ? (
          <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
            <p className="text-muted fw-medium mb-1">{isDeliveryPartner ? 'No deliveries assigned yet' : 'No orders yet'}</p>
            <small className="text-muted d-block mb-3">Start shopping to see your orders here</small>
            {!isDeliveryPartner && <a href="/" className="btn btn-sm fw-semibold text-white rounded-3 px-4 py-2 fc-primary">Start Shopping</a>}
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {orders.map(order => (
              <div key={order._id} className="card border-0 shadow-sm rounded-4 overflow-hidden">
                <div className="card-body p-3 d-flex align-items-center justify-content-between flex-wrap gap-2 cursor-pointer" onClick={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)}>
                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    <div className="rounded-3 d-flex align-items-center justify-content-center bg-success bg-opacity-10" style={{ width: '40px', height: '40px' }}>
                      <i className="bi bi-box text-success"></i>
                    </div>
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <p className="fw-bold mb-0" style={{ fontSize: '13px' }}>#{order._id.slice(-8).toUpperCase()}</p>
                        <span className="badge fw-medium" style={{ fontSize: '11px', borderRadius: '12px', padding: '4px 10px', ...(statusStyle[order.orderStatus] || { background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }) }}>
                          {order.orderStatus === 'OUT_FOR_DELIVERY' ? 'On The Way' : order.orderStatus}
                        </span>
                        {unreadOrderIds.has(order._id) && (
                          <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', display: 'inline-block' }}></span>
                        )}
                      </div>
                      <small className="text-muted d-block" style={{ fontSize: '12px' }}>{order.userId?.name || 'Customer'} · {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</small>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold text-success" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '15px' }}>₹{order.totalAmount}</span>
                    {!isDeliveryPartner && (order.orderStatus === 'DISPATCHED' || order.orderStatus === 'OUT_FOR_DELIVERY') && (
                      <button onClick={(e) => { e.stopPropagation(); openTracking(order); }} className="btn btn-sm rounded-2 p-1" style={{ background: '#f3e8ff', color: '#7c3aed', border: 'none', fontSize: '14px' }} title="Track Order">
                        <i className="bi bi-geo-alt"></i>
                      </button>
                    )}
                    <i className={`bi ${expandedOrder === order._id ? 'bi-chevron-up' : 'bi-chevron-down'} text-muted`}></i>
                  </div>
                </div>

                {expandedOrder === order._id && (
                  <div className="card-body border-top p-3 pt-3">
                    <p className="fw-semibold text-muted mb-2" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items</p>
                    <div className="d-flex flex-column gap-2 mb-3">
                      {order.products?.map((item: any) => (
                        <div key={item._id} className="d-flex align-items-center gap-3 p-2 rounded-3" style={{ background: '#f9fafb' }}>
                          {item.productId?.imageURL && <img src={item.productId.imageURL.startsWith('http') ? item.productId.imageURL : `${API_BASE}${item.productId.imageURL}`} alt="" className="rounded-2 flex-shrink-0" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />}
                          <div className="flex-grow-1 min-w-0">
                            <p className="mb-0 fw-medium text-truncate" style={{ fontSize: '13px' }}>{item.productId?.name || 'Product'}</p>
                            <small className="text-muted">₹{item.priceAtPurchase} x {item.quantity}</small>
                          </div>
                          <p className="fw-semibold mb-0 flex-shrink-0" style={{ fontSize: '13px' }}>₹{item.priceAtPurchase * item.quantity}</p>
                        </div>
                      ))}
                    </div>
                    {order.deliveryAddress && (
                      <div className="d-flex align-items-start gap-2 p-2 rounded-3 mb-3" style={{ background: '#f9fafb', fontSize: '13px' }}>
                        <i className="bi bi-geo-alt text-success mt-1 flex-shrink-0"></i>
                        <span className="text-muted">{order.deliveryAddress.street}, {order.deliveryAddress.city} - {order.deliveryAddress.zip}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                      <small className="text-muted">Payment</small>
                      <span className="badge fw-medium" style={{ fontSize: '11px', borderRadius: '12px', padding: '4px 10px', background: order.paymentStatus === 'PAID' ? '#dcfce7' : '#fef2f2', color: order.paymentStatus === 'PAID' ? '#16a34a' : '#dc2626', border: `1px solid ${order.paymentStatus === 'PAID' ? '#bbf7d0' : '#fecaca'}` }}>{order.paymentStatus}</span>
                    </div>
                    {(order.orderStatus === 'DISPATCHED' || order.orderStatus === 'OUT_FOR_DELIVERY') && (
                      <div className="d-flex gap-2 mt-3 flex-wrap">
                        {!isDeliveryPartner && (
                          <button onClick={() => openTracking(order)} className="btn flex-grow-1 fw-semibold text-white rounded-3 py-2 d-flex align-items-center justify-content-center gap-2" style={{ background: '#7c3aed', fontSize: '13px', minWidth: '120px' }}>
                            <i className="bi bi-geo-alt"></i> Track Order
                          </button>
                        )}
                        <button onClick={() => openChat(order)} className={`btn flex-grow-1 fw-semibold text-white rounded-3 py-2 fc-primary d-flex align-items-center justify-content-center gap-2 position-relative`} style={{ fontSize: '13px', minWidth: '120px' }}>
                          <i className="bi bi-chat-dots"></i>
                          {isDeliveryPartner ? 'Chat with Customer' : 'Chat'}
                          {unreadOrderIds.has(order._id) && (
                            <span className="position-absolute top-0 start-100 translate-middle" style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', border: '2px solid white' }}></span>
                          )}
                        </button>
                      </div>
                    )}
                    {!isDeliveryPartner && (
                      <div className="d-flex gap-2 mt-2">
                        <button onClick={() => setOrderHelpOrder(order)} className="btn w-100 fw-semibold rounded-3 py-2 d-flex align-items-center justify-content-center gap-2" style={{ fontSize: '13px', background: '#f0fdf4', color: '#059669', border: '1.5px solid #bbf7d0' }}>
                          <i className="bi bi-headset"></i> Order Help
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Modal */}
      {chatOrder && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-end align-items-md-center justify-content-center p-0 p-md-3" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
          <div className="card border-0 shadow-lg rounded-top-4 rounded-md-4 d-flex flex-column animate-scale-in" style={{ width: '100%', maxWidth: '420px', height: '85vh', maxHeight: '480px', borderRadius: '16px 16px 0 0' }}>
              <div className="card-header d-flex align-items-center justify-content-between border-0 p-3" style={{ background: '#ecfdf5' }}>
                <div className="d-flex align-items-center gap-3 min-w-0">
                  <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0" style={{ width: '36px', height: '36px', fontSize: '13px', background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                    {isDeliveryPartner ? 'U' : 'D'}
                  </div>
                  <div className="min-w-0">
                    <p className="fw-semibold mb-0 text-truncate" style={{ fontSize: '13px' }}>{isDeliveryPartner ? chatOrder.userId?.name || 'Customer' : 'Delivery Partner'}</p>
                    <small className="text-muted">#{chatOrder._id.slice(-6).toUpperCase()}</small>
                  </div>
                </div>
              <button onClick={closeChat} className="btn btn-sm text-muted border-0"><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="card-body flex-grow-1 overflow-auto p-3" style={{ background: '#f9fafb' }}>
              {messages.length === 0 && <div className="text-center text-muted mt-5"><i className="bi bi-chat-dots fs-1 d-block mb-2 opacity-25"></i><small>Say hi!</small></div>}
              {messages.map((msg, i) => {
                const isMe = msg.senderId === (user?.id || user?._id);
                return (
                  <div key={i} className={`d-flex mb-2 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
                    <div className={`px-3 py-2 rounded-3 ${isMe ? 'text-white' : 'bg-white border'}`} style={{ maxWidth: '75%', ...(isMe ? { background: 'linear-gradient(135deg, #059669, #10b981)' } : {}) }}>
                      <p className="mb-1" style={{ fontSize: '13px' }}>{msg.text}</p>
                      <small className={`d-block text-end ${isMe ? 'opacity-75' : 'text-muted'}`} style={{ fontSize: '10px' }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="card-footer border-0 p-3 bg-white rounded-bottom-4">
              <div className="d-flex gap-2">
                <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." className="form-control fc-input" />
                <button onClick={sendMessage} disabled={!input.trim()} className="btn px-3 rounded-3 text-white" style={{ background: input.trim() ? 'linear-gradient(135deg, #059669, #10b981)' : '#e5e7eb' }}>
                  <i className="bi bi-send"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Tracking Modal */}
      {trackingOrder && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-end align-items-md-center justify-content-center p-0 p-md-3" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1060 }} onClick={(e) => { if (e.target === e.currentTarget) closeTracking(); }}>
          <div className="card border-0 shadow-lg rounded-top-4 rounded-md-4 d-flex flex-column animate-scale-in" style={{ width: '100%', maxWidth: '500px', height: '90vh', maxHeight: '700px', borderRadius: '16px 16px 0 0' }}>
            {/* Header */}
            <div className="card-header border-0 p-0" style={{ borderRadius: '16px 16px 0 0', position: 'relative', zIndex: 1100 }}>
              {/* Delivery Partner Info Bar */}
              <div className="p-3" style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-truck text-white" style={{ fontSize: '18px' }}></i>
                    <span className="text-white fw-bold" style={{ fontSize: '15px' }}>Live Tracking</span>
                  </div>
                  <button onClick={closeTracking} className="btn btn-sm text-white border-0 p-1 rounded-circle" style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.2)', fontSize: '14px', position: 'relative', zIndex: 1100 }}><i className="bi bi-x-lg"></i></button>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-circle d-flex align-items-center justify-center text-white fw-bold" style={{ width: '44px', height: '44px', fontSize: '16px', background: 'rgba(255,255,255,0.2)' }}>
                    {trackingOrder.deliveryPartnerId?.name?.[0]?.toUpperCase() || 'D'}
                  </div>
                  <div className="flex-grow-1">
                    <p className="text-white fw-bold mb-0" style={{ fontSize: '14px' }}>
                      {trackingOrder.deliveryPartnerId?.name || 'Delivery Partner'}
                    </p>
                    <small className="text-white" style={{ opacity: 0.8, fontSize: '12px' }}>
                      {trackingOrder.deliveryPartnerId?.phone || 'Phone not available'}
                    </small>
                  </div>
                  {trackingOrder.deliveryPartnerId?.phone && (
                    <a href={`tel:${trackingOrder.deliveryPartnerId.phone}`} className="btn btn-sm text-white rounded-3 px-3 py-1" style={{ background: 'rgba(255,255,255,0.2)' }}>
                      <i className="bi bi-telephone me-1"></i> Call
                    </a>
                  )}
                </div>
              </div>
              {/* Order Info Bar */}
              <div className="px-3 py-2 d-flex align-items-center justify-content-between" style={{ background: '#f8f7f4', borderBottom: '1px solid #e5e7eb' }}>
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold" style={{ fontSize: '12px', fontFamily: 'monospace', color: '#7c3aed' }}>
                    #{trackingOrder._id.slice(-6).toUpperCase()}
                  </span>
                  <span className="badge fw-medium" style={{ fontSize: '10px', background: trackingOrder.orderStatus === 'OUT_FOR_DELIVERY' ? '#dcfce7' : '#fef3c7', color: trackingOrder.orderStatus === 'OUT_FOR_DELIVERY' ? '#16a34a' : '#d97706', padding: '3px 8px', borderRadius: '12px', border: `1px solid ${trackingOrder.orderStatus === 'OUT_FOR_DELIVERY' ? '#bbf7d0' : '#fde68a'}` }}>
                    {trackingOrder.orderStatus === 'OUT_FOR_DELIVERY' ? '🏃 On The Way' : '📦 Dispatched'}
                  </span>
                </div>
                <span className="fw-bold text-success" style={{ fontSize: '13px' }}>₹{trackingOrder.totalAmount}</span>
              </div>
            </div>

            {/* Map */}
            <div className="flex-grow-1 overflow-hidden">
              <DeliveryTrackingMap
                deliveryLocation={deliveryLocation}
                customerLocation={customerLocation}
                customerAddress={trackingOrder.deliveryAddress ? `${trackingOrder.deliveryAddress.street}, ${trackingOrder.deliveryAddress.city}` : undefined}
                orderTitle={`Delivering to ${user?.name}`}
                height="100%"
                followDelivery={true}
                onDistanceUpdate={setTrackingInfo}
              />
            </div>

            {/* Bottom details */}
            <div className="card-footer border-0 px-3 py-2 bg-white rounded-bottom-4">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-geo-alt text-success"></i>
                  <small className="fw-medium" style={{ fontSize: '12px' }}>
                    {trackingOrder.deliveryAddress?.street}, {trackingOrder.deliveryAddress?.city}
                  </small>
                </div>
                {trackingInfo && !trackingInfo.arrived && (
                  <small className="fw-semibold" style={{ fontSize: '12px', color: '#7c3aed' }}>
                    ~{trackingInfo.ETA}
                  </small>
                )}
                {trackingInfo?.arrived && (
                  <small className="fw-semibold" style={{ fontSize: '12px', color: '#16a34a' }}>
                    <i className="bi bi-check-circle me-1"></i>Arrived
                  </small>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Order Help Chat Modal */}
      {orderHelpOrder && (
        <OrderHelpChat order={orderHelpOrder} onClose={() => setOrderHelpOrder(null)} />
      )}
    </div>
  );
};

export default Profile;
