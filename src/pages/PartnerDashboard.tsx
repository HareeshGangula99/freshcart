import React, { useState, useEffect, useRef, useCallback } from 'react';
import { orderService } from '../services/api';
import { uploadImage } from '../services/upload';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import DeliveryTrackingMap from '../components/DeliveryTrackingMap';

const socket = getSocket();

const PartnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [delivering, setDelivering] = useState<string | null>(null);
  const [deliveringOrder, setDeliveringOrder] = useState<string | null>(null);
  const [deliveryImage, setDeliveryImage] = useState<File | null>(null);
  const [showDeliverModal, setShowDeliverModal] = useState<string | null>(null);
  const [customerLoc, setCustomerLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [partnerDistance, setPartnerDistance] = useState<{ distance: number; ETA: string; arrived: boolean } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastEmitRef = useRef<number>(0);
  const deliveryImageRef = useRef<File | null>(null);

  useEffect(() => { fetchOrders(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const handleChatHistory = (history: any[]) => setMessages(history);
    const handleReceiveMessage = (msg: any) => setMessages(prev => [...prev, msg]);
    const handleCustomerLocation = (data: { orderId: string; lat: number; lng: number }) => {
      setCustomerLoc({ lat: data.lat, lng: data.lng });
    };

    socket.on('chat_history', handleChatHistory);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('customer_location_update', handleCustomerLocation);

    return () => {
      socket.off('chat_history', handleChatHistory);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('customer_location_update', handleCustomerLocation);
    };
  }, []);

  const fetchOrders = async () => {
    try { const res = await orderService.getPartnerOrders(); setOrders(res.data); }
    catch (error) { console.error('Failed to fetch partner orders:', error); }
  };

  const openChat = (order: any) => {
    if (activeOrder) socket.emit('leave_room', activeOrder._id);
    setActiveOrder(order);
    setMessages([]);
    socket.emit('join_room', order._id);
    socket.emit('get_chat_history', { orderId: order._id });
  };

  const sendMessage = () => {
    if (!input.trim() || !activeOrder || !user) return;
    const msg = { orderId: activeOrder._id, senderId: user.id || user._id, senderName: user.name, text: input.trim(), timestamp: new Date() };
    socket.emit('send_message', msg);
    setMessages(prev => [...prev, msg]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const startDelivery = async (orderId: string) => {
    setDeliveringOrder(orderId);
    setShowMap(true);
    socket.emit('delivery_started', { orderId, partnerName: user?.name });
    socket.emit('join_delivery_tracking', orderId);
    socket.emit('get_customer_location', { orderId });

    try {
      await orderService.updateStatus(orderId, { status: 'OUT_FOR_DELIVERY' });
    } catch (err) {
      console.error('Failed to update status to OUT_FOR_DELIVERY:', err);
    }

    const order = orders.find(o => o._id === orderId);
    // Use delivery address (Marthahalli) as destination, fallback to customerLocation
    if (order?.deliveryAddress?.lat && order?.deliveryAddress?.lng) {
      setCustomerLoc({ lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng });
    } else if (order?.customerLocation?.lat && order?.customerLocation?.lng) {
      setCustomerLoc({ lat: order.customerLocation.lat, lng: order.customerLocation.lng });
    }

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const now = Date.now();
          setMyLocation({ lat: latitude, lng: longitude });
          if (now - lastEmitRef.current >= 3000) {
            lastEmitRef.current = now;
            socket.emit('update_delivery_location', { orderId, lat: latitude, lng: longitude });
          }
        },
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }
  };

  const stopDelivery = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setDeliveringOrder(null);
    setMyLocation(null);
    setCustomerLoc(null);
  }, []);

  useEffect(() => {
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, []);

  const handleDeliver = async (orderId: string) => {
    setDelivering(orderId);
    try {
      let proofUrl = '';
      if (deliveryImageRef.current) {
        const fileName = `delivery/${orderId}-${Date.now()}`;
        proofUrl = await uploadImage(deliveryImageRef.current, fileName);
      }
      await orderService.updateStatus(orderId, { status: 'DELIVERED', deliveryProof: proofUrl });
      stopDelivery();
      setOrders(prev => prev.filter(o => o._id !== orderId));
      setShowDeliverModal(null);
      setDeliveryImage(null);
      deliveryImageRef.current = null;
      if (activeOrder?._id === orderId) setActiveOrder(null);
    } catch { alert('Failed to update status'); }
    finally { setDelivering(null); }
  };

  return (
    <div className="animate-fade-in" style={{ minHeight: 'calc(100vh - 100px)' }}>
      <div className="row g-4">
        {/* Orders List */}
        <div className="col-lg-4 d-flex flex-column gap-3" style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-truck text-success" style={{ fontSize: '20px' }}></i>
            <h5 className="fw-bold mb-0" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Deliveries</h5>
            <span className="badge bg-light text-muted" style={{ fontSize: '11px' }}>{orders.length}</span>
          </div>

          {orders.length === 0 ? (
            <div className="card border-0 shadow-sm rounded-4 p-4 text-center">
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>🚚</div>
              <small className="text-muted fw-medium">No deliveries assigned yet</small>
            </div>
          ) : (
            orders.map(order => (
              <div key={order._id} onClick={() => openChat(order)} className={`card border-0 shadow-sm rounded-4 p-3 ${activeOrder?._id === order._id ? 'border-success border-2' : ''}`} style={{ cursor: 'pointer' }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <p className="fw-bold mb-0" style={{ fontSize: '13px' }}>#{order._id.slice(-6).toUpperCase()}</p>
                  <span className="badge bg-success bg-opacity-10 text-success" style={{ fontSize: '10px' }}>{order.orderStatus}</span>
                </div>
                <p className="text-muted mb-1" style={{ fontSize: '13px' }}>{order.userId?.name}</p>
                <small className="text-muted d-flex align-items-center gap-1 mb-1">
                  <i className="bi bi-geo-alt" style={{ fontSize: '11px' }}></i> {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
                </small>
                {order.userId?.phone && <small className="text-muted d-flex align-items-center gap-1"><i className="bi bi-telephone" style={{ fontSize: '11px' }}></i> {order.userId.phone}</small>}

                <div className="d-flex gap-2 mt-2">
                  {deliveringOrder !== order._id ? (
                    <button onClick={(e) => { e.stopPropagation(); startDelivery(order._id); }} className="btn btn-sm flex-grow-1 fw-bold text-white rounded-3 py-2 d-flex align-items-center justify-content-center gap-1" style={{ fontSize: '12px', background: '#7c3aed' }}>
                      <i className="bi bi-play-circle"></i> Start Delivery
                    </button>
                  ) : (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setShowDeliverModal(order._id); }} className="btn btn-sm flex-grow-1 fw-bold text-white rounded-3 py-2 fc-primary d-flex align-items-center justify-content-center gap-1" style={{ fontSize: '12px' }}>
                        <i className="bi bi-check-circle"></i> Delivered
                      </button>
                      <div className="d-flex align-items-center gap-1 px-2 rounded-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <span className="rounded-circle d-inline-block" style={{ width: '8px', height: '8px', background: '#22c55e', animation: 'pulse 2s infinite' }}></span>
                        <small className="text-success fw-medium" style={{ fontSize: '10px' }}>Live</small>
                      </div>
                    </>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); openChat(order); }} className="btn btn-sm rounded-3 p-2" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <i className="bi bi-chat-dots text-muted"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat Panel */}
        <div className="col-lg-8 d-flex flex-column">
          <div className="card border-0 shadow-sm rounded-4 flex-grow-1 d-flex flex-column overflow-hidden">
            {activeOrder ? (
              <>
                <div className="card-header border-0 p-3 d-flex align-items-center justify-content-between" style={{ background: '#ecfdf5' }}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: '40px', height: '40px', fontSize: '14px', background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                      {activeOrder.userId?.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="fw-semibold mb-0" style={{ fontSize: '14px' }}>{activeOrder.userId?.name}</p>
                      <small className="text-muted">#{activeOrder._id.slice(-6).toUpperCase()} · ₹{activeOrder.totalAmount}</small>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {deliveringOrder === activeOrder._id && (
                      <button onClick={() => {
                        setShowMap(!showMap);
                        if (!showMap && !myLocation) {
                          navigator.geolocation?.getCurrentPosition(
                            (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                            () => {},
                            { enableHighAccuracy: true, timeout: 5000 }
                          );
                        }
                      }} className={`btn btn-sm fw-medium rounded-3 px-3 py-1 d-flex align-items-center gap-1 ${showMap ? 'text-white' : ''}`} style={{ fontSize: '12px', background: showMap ? '#7c3aed' : '#f3e8ff', color: showMap ? 'white' : '#7c3aed' }}>
                        <i className="bi bi-map"></i> {showMap ? 'Hide Map' : 'Show Map'}
                      </button>
                    )}
                    {activeOrder.userId?.phone && (
                      <a href={`tel:${activeOrder.userId.phone}`} className="btn btn-sm text-success fw-medium">
                        <i className="bi bi-telephone me-1"></i> Call
                      </a>
                    )}
                  </div>
                </div>
                {showMap && deliveringOrder === activeOrder._id && (
                  <div className="border-bottom">
                    <DeliveryTrackingMap
                      deliveryLocation={myLocation}
                      customerLocation={customerLoc}
                      customerAddress={activeOrder.deliveryAddress ? `${activeOrder.deliveryAddress.street}, ${activeOrder.deliveryAddress.city}` : undefined}
                      orderTitle={`Delivering to ${activeOrder.userId?.name}`}
                      height="280px"
                      followDelivery={false}
                      onDistanceUpdate={setPartnerDistance}
                    />
                    {partnerDistance && (
                      <div className="d-flex align-items-center justify-content-between px-3 py-2" style={{ background: partnerDistance.arrived ? '#f0fdf4' : '#faf5ff', borderBottom: '1px solid #e5e7eb' }}>
                        <div className="d-flex align-items-center gap-2">
                          <span style={{ fontSize: '14px' }}>{partnerDistance.arrived ? '✅' : '🏍️'}</span>
                          <span className="fw-bold" style={{ fontSize: '13px', color: partnerDistance.arrived ? '#16a34a' : '#7c3aed' }}>
                            {partnerDistance.arrived ? 'Arrived at destination' : `${partnerDistance.distance < 1000 ? Math.round(partnerDistance.distance) + ' m' : (partnerDistance.distance / 1000).toFixed(1) + ' km'} away`}
                          </span>
                        </div>
                        {!partnerDistance.arrived && (
                          <span className="fw-medium" style={{ fontSize: '12px', color: '#6b7280' }}>
                            ETA: ~{partnerDistance.ETA}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="card-body flex-grow-1 overflow-auto p-3" style={{ background: '#f9fafb' }}>
                  {messages.length === 0 && <div className="text-center text-muted mt-5"><i className="bi bi-chat-dots fs-1 d-block mb-2 opacity-25"></i><small>Say hi to {activeOrder.userId?.name}!</small></div>}
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
                <div className="card-footer border-0 p-3 bg-white">
                  <div className="d-flex gap-2">
                    <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." className="form-control fc-input" />
                    <button onClick={sendMessage} disabled={!input.trim()} className="btn px-3 rounded-3 text-white" style={{ background: input.trim() ? 'linear-gradient(135deg, #059669, #10b981)' : '#e5e7eb' }}>
                      <i className="bi bi-send"></i>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>💬</div>
                <p className="fw-medium" style={{ fontSize: '14px' }}>Select an order to chat</p>
                <small className="text-muted">You can also call customers directly</small>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delivery Proof Modal */}
      {showDeliverModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
          <div className="card border-0 shadow-lg rounded-4 p-4 animate-scale-in" style={{ maxWidth: '400px', width: '100%' }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold mb-0" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Confirm Delivery</h5>
              <button onClick={() => { setShowDeliverModal(null); setDeliveryImage(null); deliveryImageRef.current = null; }} className="btn btn-sm text-muted border-0"><i className="bi bi-x-lg"></i></button>
            </div>
            <p className="text-muted mb-3" style={{ fontSize: '13px' }}>Order #{showDeliverModal?.slice(-6).toUpperCase()}</p>
            <label className="form-label fw-medium" style={{ fontSize: '13px' }}>Delivery Photo (optional)</label>
            <label className="d-flex align-items-center gap-2 p-3 rounded-3 mb-3" style={{ border: '1.5px dashed #d1d5db', cursor: 'pointer', background: '#f9fafb', fontSize: '13px', color: '#6b7280' }}>
              <i className="bi bi-camera"></i>
              {deliveryImage ? deliveryImage.name : 'Take or upload delivery photo'}
              <input type="file" accept="image/*" capture="environment" className="d-none" onChange={e => {
                const file = e.target.files?.[0] || null;
                setDeliveryImage(file);
                deliveryImageRef.current = file;
              }} />
            </label>
            {deliveryImage && (
              <div className="mb-3">
                <img src={URL.createObjectURL(deliveryImage)} alt="Delivery proof" className="rounded-3 w-100" style={{ maxHeight: '200px', objectFit: 'cover' }} />
              </div>
            )}
            <button onClick={() => handleDeliver(showDeliverModal)} disabled={delivering === showDeliverModal} className="btn w-100 fw-bold text-white rounded-3 py-2 fc-primary d-flex align-items-center justify-content-center gap-2">
              {delivering === showDeliverModal ? (
                <><span className="spinner-border spinner-border-sm"></span> Confirming...</>
              ) : (
                <><i className="bi bi-check-circle"></i> Mark as Delivered</>
              )}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default PartnerDashboard;
