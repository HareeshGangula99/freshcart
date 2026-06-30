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
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'partners' | 'users' | 'categories'>('orders');
  const [stockValues, setStockValues] = useState<Record<string, number>>({});
  const stockTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const fetchData = useCallback(async () => {
    try {
      const [oRes, pRes, partRes] = await Promise.all([orderService.getManagerOrders(), productService.getProducts({ page: '1', limit: '200' }), adminService.getDeliveryPartners()]);
      setOrders(oRes.data); setProducts(pRes.data.products || pRes.data); setPartners(partRes.data);
    } catch (err) { console.error('Fetch failed', err); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'partners') {
      adminService.getDeliveryPartners().then(res => setPartners(res.data)).catch(() => {});
    }
    if (activeTab === 'users') {
      adminService.getAllUsers().then(res => setAllUsers(res.data)).catch(() => {});
    }
    if (activeTab === 'categories') {
      adminService.getCategories().then(res => setCategories(res.data.map((c: any) => c.name))).catch(() => {});
    }
  }, [activeTab]);

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
    <div className="animate-fade-in admin-panel">
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

      <div className="d-flex gap-1 p-1 rounded-3 mb-3 mb-md-4 scroll-x-isolate" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
        {[
          { id: 'orders' as const, label: 'Orders', icon: 'bi-cart3', count: orders.length },
          { id: 'inventory' as const, label: 'Inventory', icon: 'bi-box', count: products.length },
          { id: 'partners' as const, label: 'Partners', icon: 'bi-truck', count: partners.length },
          { id: 'users' as const, label: 'Users', icon: 'bi-people', count: allUsers.length },
          { id: 'categories' as const, label: 'Categories', icon: 'bi-grid', count: categories.length },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`btn d-flex align-items-center gap-2 fw-medium justify-content-center rounded-2 py-2 flex-shrink-0 ${activeTab === tab.id ? 'text-white' : 'text-muted'}`}
            style={{ whiteSpace: 'nowrap', ...(activeTab === tab.id ? { background: '#059669' } : {}) }}>
            <i className={`bi ${tab.icon}`}></i> {tab.label}
            {tab.count !== undefined && (
              <span className={`badge ${activeTab === tab.id ? 'bg-white bg-opacity-25 text-white' : 'bg-light text-muted'}`} style={{ fontSize: '10px' }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <div className="row g-3">
          {orders.length === 0 ? (
            <div className="col-12">
              <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
                <p className="text-muted fw-medium">No orders to process</p>
              </div>
            </div>
          ) : orders.map(order => (
            <div key={order._id} className="col-12 col-md-4 col-lg-3">
              <div className="card border-0 shadow-sm rounded-4 p-3 d-flex flex-column h-100" style={{ cursor: 'pointer' }} onClick={() => setSelectedOrder(order)}>
                <div className="d-flex align-items-center gap-3 mb-2 flex-grow-1">
                  <div className="rounded-3 d-flex align-items-center justify-content-center bg-success bg-opacity-10 flex-shrink-0" style={{ width: '40px', height: '40px' }}>
                    <i className="bi bi-box text-success"></i>
                  </div>
                  <div className="min-w-0">
                    <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                      <p className="fw-bold mb-0" style={{ fontSize: '13px' }}>#{order._id.slice(-6).toUpperCase()}</p>
                      <span className={`badge ${statusBadge(order.orderStatus)}`}>{order.orderStatus}</span>
                    </div>
                    <small className="text-muted">{order.userId?.name} · ₹{order.totalAmount}</small>
                    <small className="text-muted d-block" style={{ fontSize: '11px' }}>{order.deliveryAddress?.city}, {order.deliveryAddress?.zip}</small>
                  </div>
                </div>
                {order.orderStatus !== 'DISPATCHED' && order.orderStatus !== 'DELIVERED' && (
                  <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }} className="btn btn-sm fw-bold text-white rounded-3 px-3 py-2 fc-primary d-flex align-items-center justify-content-center gap-1 w-100 mt-auto">
                    Dispatch <i className="bi bi-chevron-right"></i>
                  </button>
                )}
              </div>
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

      {/* Partners Tab */}
      {activeTab === 'partners' && (
        <div className="card border-0 shadow-sm rounded-4 p-4">
          <h5 className="fw-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Delivery Partners ({partners.length})</h5>
          {partners.length === 0 ? <p className="text-muted">No partners yet.</p> : (
            <div className="d-flex flex-column gap-2">
              {partners.map((p: any) => (
                <div key={p._id} className="d-flex align-items-center justify-content-between p-3 rounded-3 flex-wrap gap-2" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: '40px', height: '40px', fontSize: '14px', background: p.availability === 'busy' ? '#f59e0b' : '#059669' }}>
                      {p.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h6 className="fw-bold mb-0" style={{ fontSize: '14px' }}>{p.name}</h6>
                      <small className="text-muted" style={{ fontSize: '11px' }}>{p.email} • {p.vehicleType} • ★ {p.rating}</small>
                      <div className="d-flex align-items-center gap-2 mt-1">
                        <span className="badge rounded-pill" style={{ fontSize: '10px', background: p.availability === 'busy' ? '#fef3c7' : '#dcfce7', color: p.availability === 'busy' ? '#d97706' : '#059669' }}>
                          {p.availability === 'busy' ? '● Busy' : '● Free'}
                        </span>
                        {p.isBlocked && <span className="badge rounded-pill" style={{ fontSize: '10px', background: '#fef2f2', color: '#dc2626' }}>Blocked</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={async () => { await adminService.blockDeliveryPartner(p._id, !p.isBlocked); setPartners(partners.map((x: any) => x._id === p._id ? { ...x, isBlocked: !x.isBlocked } : x)); }}
                    className="btn btn-sm fw-semibold rounded-2 px-3 py-1"
                    style={{ fontSize: '12px', background: p.isBlocked ? '#fef2f2' : '#f0fdf4', color: p.isBlocked ? '#dc2626' : '#059669', border: `1px solid ${p.isBlocked ? '#fecaca' : '#dcfce7'}` }}>
                    {p.isBlocked ? 'Unblock' : 'Block'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card border-0 shadow-sm rounded-4 p-4">
          <h5 className="fw-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>All Users ({allUsers.length})</h5>
          {allUsers.length === 0 ? <p className="text-muted">No users yet.</p> : (
            <div className="d-flex flex-column gap-2">
              {allUsers.map((u: any) => (
                <div key={u._id} className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div>
                    <h6 className="fw-bold mb-0" style={{ fontSize: '14px' }}>{u.name}</h6>
                    <small className="text-muted" style={{ fontSize: '11px' }}>{u.email} • {u.phone || 'No phone'} • Joined {new Date(u.createdAt).toLocaleDateString()}</small>
                  </div>
                  <button onClick={async () => { await adminService.blockUser(u._id, !u.isBlocked); setAllUsers(allUsers.map((x: any) => x._id === u._id ? { ...x, isBlocked: !x.isBlocked } : x)); }}
                    className="btn btn-sm fw-semibold rounded-2 px-3 py-1"
                    style={{ fontSize: '12px', background: u.isBlocked ? '#fef2f2' : '#f0fdf4', color: u.isBlocked ? '#dc2626' : '#059669', border: `1px solid ${u.isBlocked ? '#fecaca' : '#dcfce7'}` }}>
                    {u.isBlocked ? 'Unblock' : 'Block'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="card border-0 shadow-sm rounded-4 p-4">
          <h5 className="fw-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Categories ({categories.length})</h5>
          <div className="d-flex flex-wrap gap-2">
            {categories.map(cat => (
              <span key={cat} className="badge rounded-pill px-3 py-2" style={{ background: '#f0fdf4', color: '#059669', fontSize: '13px', fontWeight: 500 }}>{cat}</span>
            ))}
          </div>
          {categories.length === 0 && <p className="text-muted">No categories yet.</p>}
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
                  {partners.map((p: any) => (
                    <option key={p._id} value={p._id} disabled={p.isBlocked}>
                      {p.name} {p.availability === 'free' ? '🟢 Free' : '🟡 Busy'} {p.isBlocked ? '🔴 Blocked' : ''}
                    </option>
                  ))}
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
