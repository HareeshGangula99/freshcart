import React, { useState, useEffect, useCallback, useRef } from 'react';
import { orderService, adminService, productService } from '../services/api';
import { getSocket } from '../services/socket';
import { API_BASE } from '../config';

const socket = getSocket();

const ManagerDashboard: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [partnerId, setPartnerId] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>('orders');
  const [stockValues, setStockValues] = useState<Record<string, number>>({});
  const stockTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const fetchData = useCallback(async () => {
    try {
      const [oRes, pRes, partRes] = await Promise.all([orderService.getManagerOrders(), productService.getProducts({ page: '1', limit: '200' }), adminService.getDeliveryPartners()]);
      setOrders(oRes.data); setProducts(pRes.data.products || pRes.data); setPartners(partRes.data);
    } catch (err) { console.error('Fetch failed', err); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    socket.on('order_confirmed', (data: { orderId: string; userName: string; amount: number }) => {
      setNotification(`New order from ${data.userName} — ₹${data.amount}`);
      fetchData();
      setTimeout(() => setNotification(null), 6000);
    });
    return () => { socket.off('order_confirmed'); };
  }, [fetchData]);

  useEffect(() => {
    const map: Record<string, number> = {};
    products.forEach(p => { map[p._id] = p.stockQuantity; });
    setStockValues(map);
  }, [products]);

  const handleStockChange = useCallback((id: string, qty: number) => {
    setStockValues(prev => ({ ...prev, [id]: qty }));
    if (stockTimers.current[id]) clearTimeout(stockTimers.current[id]);
    stockTimers.current[id] = setTimeout(async () => {
      try { await productService.updateStock(id, { stockQuantity: qty }); } catch { alert('Stock update failed'); }
    }, 800);
  }, []);

  const handleStockBlur = useCallback((id: string) => {
    if (stockTimers.current[id]) { clearTimeout(stockTimers.current[id]); delete stockTimers.current[id]; }
    const qty = stockValues[id];
    if (qty !== undefined) {
      productService.updateStock(id, { stockQuantity: qty }).catch(() => alert('Stock update failed'));
    }
  }, [stockValues]);

  const handleDispatch = async (orderId: string) => {
    if (!partnerId) return alert('Please select a delivery partner');
    setDispatching(true);
    try {
      await orderService.dispatchOrder(orderId, { deliveryPartnerId: partnerId });
      const sp = partners.find(p => p._id === partnerId);
      socket.emit('order_dispatched', { orderId, partnerName: sp?.name || 'Partner' });
      setSelectedOrder(null); setPartnerId(''); fetchData();
    } catch { alert('Dispatch failed'); } finally { setDispatching(false); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      PLACED: 'bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25',
      CONFIRMED: 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25',
      DISPATCHED: 'bg-purple bg-opacity-10 text-purple border border-purple border-opacity-25',
      DELIVERED: 'bg-success bg-opacity-10 text-success border border-success border-opacity-25',
    };
    return map[s] || 'bg-light text-muted';
  };

  return (
    <div className="animate-fade-in">
      {notification && (
        <div className="position-fixed d-flex align-items-center gap-2 p-3 rounded-3 text-white fw-semibold animate-fade-in" style={{ top: '70px', right: '12px', left: '12px', zIndex: 1070, background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 8px 32px rgba(5,150,105,0.3)', fontSize: '13px' }}>
          <i className="bi bi-bell"></i> {notification}
          <button onClick={() => setNotification(null)} className="btn btn-sm text-white border-0 p-0 ms-2"><i className="bi bi-x-lg"></i></button>
        </div>
      )}

      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center justify-content-center rounded-3 fc-primary" style={{ width: '40px', height: '40px' }}>
            <i className="bi bi-grid text-white"></i>
          </div>
          <div>
            <h4 className="fw-bold mb-0" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '18px' }}>Manager Hub</h4>
            <small className="text-muted">Oversee orders and inventory</small>
          </div>
        </div>
        <button onClick={fetchData} className="btn btn-sm text-muted fw-medium" style={{ border: '1.5px solid #e5e7eb' }}>
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
      </div>

      <div className="d-flex gap-1 p-1 rounded-3 mb-3 mb-md-4 hide-scrollbar" style={{ background: 'white', border: '1px solid #e5e7eb', overflowX: 'auto' }}>
        {[
          { id: 'orders' as const, label: 'Pending Orders', icon: 'bi-cart3', count: orders.length },
          { id: 'inventory' as const, label: 'Inventory', icon: 'bi-box', count: products.length },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`btn d-flex align-items-center gap-2 fw-medium flex-grow-1 justify-content-center rounded-2 py-2 ${activeTab === tab.id ? 'text-white' : 'text-muted'}`}
            style={activeTab === tab.id ? { background: '#059669' } : {}}>
            <i className={`bi ${tab.icon}`}></i> {tab.label}
            <span className="badge" style={{ fontSize: '10px', background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#f3f4f6', color: activeTab === tab.id ? 'white' : '#9ca3af' }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <div className="d-flex flex-column gap-3">
          {orders.length === 0 ? (
            <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
              <p className="text-muted fw-medium">No orders to process</p>
            </div>
          ) : orders.map(order => (
            <div key={order._id} className="card border-0 shadow-sm rounded-4 p-3 d-flex align-items-center justify-content-between flex-wrap gap-2" style={{ cursor: 'pointer' }} onClick={() => setSelectedOrder(order)}>
              <div className="d-flex align-items-center gap-3">
                <div className="rounded-3 d-flex align-items-center justify-content-center bg-success bg-opacity-10" style={{ width: '40px', height: '40px' }}>
                  <i className="bi bi-box text-success"></i>
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <p className="fw-bold mb-0" style={{ fontSize: '13px' }}>#{order._id.slice(-6).toUpperCase()}</p>
                    <span className={`badge ${statusBadge(order.orderStatus)}`}>{order.orderStatus}</span>
                  </div>
                  <small className="text-muted">{order.userId?.name} · ₹{order.totalAmount}</small>
                  <small className="text-muted d-block" style={{ fontSize: '11px' }}>{order.deliveryAddress?.city}, {order.deliveryAddress?.zip}</small>
                </div>
              </div>
              {order.orderStatus !== 'DISPATCHED' && order.orderStatus !== 'DELIVERED' && (
                <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }} className="btn btn-sm fw-bold text-white rounded-3 px-3 py-2 fc-primary d-flex align-items-center gap-1">
                  Dispatch <i className="bi bi-chevron-right"></i>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th className="border-0 px-4 py-3 text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</th>
                  <th className="border-0 px-4 py-3 text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                  <th className="border-0 px-4 py-3 text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock</th>
                  <th className="border-0 px-4 py-3 text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Update</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id}>
                    <td className="px-4 py-3 align-middle">
                      <div className="d-flex align-items-center gap-2">
                        <img src={p.imageURL ? (p.imageURL.startsWith('http') ? p.imageURL : `${API_BASE}${p.imageURL}`) : 'https://via.placeholder.com/36'} alt="" className="rounded-2" style={{ width: '36px', height: '36px', objectFit: 'cover' }} />
                        <span className="fw-medium" style={{ fontSize: '13px' }}>{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted" style={{ fontSize: '13px' }}>{p.category}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${p.stockQuantity === 0 ? 'bg-danger bg-opacity-10 text-danger' : 'bg-success bg-opacity-10 text-success'}`} style={{ fontSize: '11px' }}>{p.stockQuantity} units</span>
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" className="form-control fc-input text-center" style={{ width: '80px', fontSize: '13px' }} value={stockValues[p._id] ?? p.stockQuantity} min={0} onChange={(e) => handleStockChange(p._id, Number(e.target.value))} onBlur={() => handleStockBlur(p._id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {selectedOrder && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-end align-items-md-center justify-content-center p-0 p-md-3" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
          <div className="card border-0 shadow-lg rounded-top-4 rounded-md-4 p-3 p-md-4 animate-scale-in" style={{ maxWidth: '440px', width: '100%', borderRadius: '16px 16px 0 0' }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold mb-0" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Dispatch Order</h5>
              <button onClick={() => { setSelectedOrder(null); setPartnerId(''); }} className="btn btn-sm text-muted border-0"><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="p-3 rounded-3 mb-3" style={{ background: '#f9fafb', border: '1px solid #f3f4f6' }}>
              {[['Order ID', `#${selectedOrder._id.slice(-8).toUpperCase()}`], ['Customer', selectedOrder.userId?.name], ['Amount', `₹${selectedOrder.totalAmount}`], ['Address', `${selectedOrder.deliveryAddress?.street}, ${selectedOrder.deliveryAddress?.city}`]].map(([l, v]) => (
                <div key={String(l)} className="d-flex justify-content-between py-1" style={{ fontSize: '13px' }}>
                  <span className="text-muted">{l}</span>
                  <span className={`fw-semibold ${l === 'Amount' ? 'text-success' : ''}`} style={{ textAlign: 'right', maxWidth: '200px' }}>{String(v)}</span>
                </div>
              ))}
            </div>
            {selectedOrder.products?.length > 0 && (
              <div className="mb-3">
                <small className="text-muted fw-semibold d-block mb-1" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items</small>
                {selectedOrder.products.map((p: any) => (
                  <div key={p._id} className="d-flex justify-content-between text-muted" style={{ fontSize: '13px' }}><span>{p.productId?.name || 'Product'}</span><span className="fw-semibold">x{p.quantity}</span></div>
                ))}
              </div>
            )}
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>Assign Delivery Partner</label>
              {partners.length === 0 ? <small className="text-danger">No partners available</small> : (
                <select className="form-select fc-input" value={partnerId} onChange={e => setPartnerId(e.target.value)}>
                  <option value="">-- Select Partner --</option>
                  {partners.map((p: any) => <option key={p._id} value={p._id}>{p.name} ({p.email})</option>)}
                </select>
              )}
            </div>
            <div className="d-flex gap-2">
              <button onClick={() => { setSelectedOrder(null); setPartnerId(''); }} className="btn flex-grow-1 fw-medium rounded-3 py-2" style={{ border: '1.5px solid #e5e7eb', fontSize: '13px' }}>Cancel</button>
              <button onClick={() => handleDispatch(selectedOrder._id)} disabled={dispatching || !partnerId} className="btn flex-grow-1 fw-bold text-white rounded-3 py-2 fc-primary d-flex align-items-center justify-content-center gap-1" style={{ opacity: dispatching || !partnerId ? 0.5 : 1 }}>
                {dispatching ? 'Dispatching...' : <><i className="bi bi-truck"></i> Dispatch</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
