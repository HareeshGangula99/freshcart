import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { removeFromCart, updateQuantity, clearCart } from '../store/cartSlice';
import { orderService, adminService, userService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import LocationSearchInput from '../components/LocationSearchInput';

interface Settings {
  handlingFee: number;
  gstRate: number;
  freeDeliveryAbove: number;
  deliveryFee: number;
}

const Cart: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cart = useSelector((state: RootState) => state.cart.items);
  const [address, setAddress] = useState<{ street: string; building: string; landmark: string; city: string; zip: string; lat?: number; lng?: number }>({ street: '', building: '', landmark: '', city: '', zip: '' });
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Settings>({ handlingFee: 5, gstRate: 5, freeDeliveryAbove: 200, deliveryFee: 30 });
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const [userPremium, setUserPremium] = useState<any>(null);
  const [userOffers, setUserOffers] = useState<any[]>([]);

  useEffect(() => {
    adminService.getSettings().then(res => setSettings(res.data)).catch(() => {});
    if (user) {
      userService.getMyPremium().then(res => setUserPremium(res.data)).catch(() => {});
      userService.getMyOffers().then(res => setUserOffers(res.data)).catch(() => {});
    }
  }, [user]);

  // Determine effective delivery settings
  const effectiveFreeDeliveryAbove = userPremium?.planId?.freeDeliveryAbove ?? (userOffers.length > 0 ? Math.min(...userOffers.map((o: any) => o.freeDeliveryAbove).filter(Boolean)) : settings.freeDeliveryAbove);
  const effectiveDeliveryFee = userPremium?.planId?.deliveryFee ?? (userOffers.length > 0 ? Math.min(...userOffers.map((o: any) => o.deliveryFee).filter(Boolean)) : settings.deliveryFee);
  const effectiveDiscount = userPremium?.planId?.discountPercent ?? 0;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const taxBreakdown = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    const tax = itemTotal * (settings.gstRate / 100);
    return { name: item.name, quantity: item.quantity, price: item.price, itemTotal, tax };
  });
  const totalTax = taxBreakdown.reduce((sum, item) => sum + item.tax, 0);
  const premiumDiscount = effectiveDiscount > 0 ? subtotal * (effectiveDiscount / 100) : 0;
  const handlingFee = settings.handlingFee;
  const deliveryFee = subtotal >= effectiveFreeDeliveryAbove ? 0 : effectiveDeliveryFee;
  const grandTotal = subtotal - premiumDiscount + totalTax + handlingFee + deliveryFee;

  const handleCheckout = async () => {
    if (!user) return alert('Please login to checkout');
    if (!address.street || !address.building || !address.city || !address.zip) return alert('Please enter complete delivery address');
    if (cart.length === 0) return alert('Cart is empty');

    setLoading(true);
    try {
      const res = await orderService.createOrder({
        products: cart.map(item => ({ productId: item.id, quantity: item.quantity })),
        deliveryAddress: address,
        customerLocation: locationCoords || (address.lat && address.lng ? { lat: address.lat, lng: address.lng } : null),
      });

      const { orderId, amount, razorpayOrderId } = res.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_xxxxxxxxxxxx',
        amount: amount * 100,
        currency: 'INR',
        name: 'FreshCart',
        description: 'Fresh Grocery Order',
        order_id: orderId,
        handler: async function (response: any) {
          try {
            await orderService.verifyPayment({
              orderId: razorpayOrderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            dispatch(clearCart());
            navigate('/order-confirm', { state: { orderId: razorpayOrderId, amount, address } });
          } catch (err) {
            alert('Payment verification failed. Contact support.');
          }
        },
        prefill: { name: user.name, email: user.email },
        theme: { color: '#059669' },
        modal: { ondismiss: () => setLoading(false) },
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.open();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Checkout failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4 mb-md-5">
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)' }}>
            <i className="bi bi-cart3 text-white" style={{ fontSize: '18px' }}></i>
          </div>
          <div>
            <h4 className="fw-bold mb-0" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.3px', fontSize: '20px' }}>Your Cart</h4>
            {cart.length > 0 && <small className="text-muted">{totalItems} item{totalItems !== 1 ? 's' : ''} • ₹{subtotal.toFixed(2)}</small>}
          </div>
        </div>
        <button onClick={() => navigate('/')} className="btn btn-sm fw-medium rounded-3 px-3 py-2" style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', transition: 'all 0.2s ease', fontSize: '13px' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#e5e7eb'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
        >
          <i className="bi bi-arrow-left me-1"></i> Continue Shopping
        </button>
      </div>

      {cart.length === 0 ? (
        /* Empty Cart */
        <div className="card border-0 shadow-soft p-4 p-md-5 text-center rounded-4" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div className="d-flex align-items-center justify-content-center mx-auto mb-4 rounded-circle" style={{ width: '100px', height: '100px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
            <span style={{ fontSize: '48px' }}>🛒</span>
          </div>
          <h5 className="fw-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Your cart is empty</h5>
          <p className="text-muted mb-4" style={{ fontSize: '14px', lineHeight: 1.6 }}>Add some fresh products and get them delivered to your doorstep in 30 minutes</p>
          <button onClick={() => navigate('/')} className="btn fw-bold text-white rounded-3 px-5 py-2.5 fc-primary d-inline-flex align-items-center gap-2 mx-auto" style={{ fontSize: '14px' }}>
            <i className="bi bi-bag"></i> Start Shopping
          </button>
        </div>
      ) : (
        <div className="row g-3 g-lg-4">
          {/* Cart Items */}
          <div className="col-lg-8">
            <div className="d-flex flex-column gap-3">
              {cart.map((item, index) => (
                <div key={item.id} className="card border-0 shadow-soft rounded-4 overflow-hidden animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="p-3 p-sm-3 d-flex align-items-center gap-3 cart-item-row">
                    {/* Product Image */}
                    <div className="position-relative flex-shrink-0 rounded-3 overflow-hidden" style={{ width: '80px', height: '80px', minWidth: '80px' }}>
                      <img src={item.imageURL} alt={item.name} className="w-100 h-100" style={{ objectFit: 'cover' }} />
                    </div>

                    {/* Product Info */}
                    <div className="flex-grow-1 min-w-0 cart-item-info">
                      <h6 className="fw-bold mb-1 text-truncate" style={{ fontSize: '14px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.name}</h6>
                      <p className="text-success fw-bold mb-1" style={{ fontSize: '15px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>₹{item.price}</p>
                      <small className="text-muted" style={{ fontSize: '11px' }}>Subtotal: <span className="fw-semibold">₹{(item.price * item.quantity).toFixed(2)}</span></small>
                    </div>

                    {/* Quantity + Delete */}
                    <div className="d-flex align-items-center gap-2 cart-item-controls">
                      <div className="qty-control">
                        <button onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))}>
                          <i className="bi bi-dash"></i>
                        </button>
                        <span>{item.quantity}</span>
                        <button onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))} disabled={item.quantity >= item.stockQuantity}>
                          <i className="bi bi-plus"></i>
                        </button>
                      </div>
                      {item.quantity >= item.stockQuantity && (
                        <small className="text-warning fw-medium" style={{ fontSize: '10px' }}>Max</small>
                      )}
                      <button onClick={() => dispatch(removeFromCart(item.id))} className="btn btn-sm d-flex align-items-center justify-content-center rounded-2 border-0" style={{ width: '36px', height: '36px', background: '#fef2f2', color: '#dc2626' }}>
                        <i className="bi bi-trash" style={{ fontSize: '14px' }}></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-medium rounded-4 p-4 order-summary">
              <h5 className="fw-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '18px' }}>Order Summary</h5>

              {/* Delivery Address */}
              <div className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="d-flex align-items-center justify-content-center rounded-2" style={{ width: '28px', height: '28px', background: '#f0fdf4' }}>
                    <i className="bi bi-geo-alt text-success" style={{ fontSize: '13px' }}></i>
                  </div>
                  <span className="fw-semibold" style={{ fontSize: '14px' }}>Delivery Address</span>
                </div>
                <LocationSearchInput
                  value={address.street}
                  onChange={(val) => setAddress({ ...address, street: val })}
                  onLocationSelect={(data) => {
                    setAddress({ street: data.street, building: address.building, landmark: address.landmark, city: data.city, zip: data.zip, lat: data.lat, lng: data.lng });
                    setLocationCoords({ lat: data.lat, lng: data.lng });
                  }}
                  placeholder="Search delivery location..."
                />
                <div className="mt-2">
                  <input
                    placeholder="Building / Flat No. *"
                    className="form-control fc-input"
                    style={{ fontSize: '13px' }}
                    value={address.building}
                    onChange={e => setAddress({ ...address, building: e.target.value })}
                  />
                </div>
                <div className="mt-2">
                  <input
                    placeholder="Nearest Landmark (optional)"
                    className="form-control fc-input"
                    style={{ fontSize: '13px' }}
                    value={address.landmark}
                    onChange={e => setAddress({ ...address, landmark: e.target.value })}
                  />
                </div>
                <div className="d-flex gap-2 mt-2">
                  <input
                    placeholder="City *"
                    className="form-control fc-input"
                    style={{ fontSize: '13px' }}
                    value={address.city}
                    onChange={e => setAddress({ ...address, city: e.target.value })}
                  />
                  <input
                    placeholder="ZIP *"
                    className="form-control fc-input"
                    style={{ fontSize: '13px' }}
                    value={address.zip}
                    onChange={e => setAddress({ ...address, zip: e.target.value })}
                  />
                </div>
              </div>

              {/* Price Breakdown */}
              <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                {userPremium && (
                  <div className="d-flex align-items-center gap-2 mb-2 p-2 rounded-2" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: '12px', color: '#059669' }}>
                    <i className="bi bi-gem"></i>
                    <span className="fw-semibold">{userPremium.planId?.name} Member</span>
                    {effectiveDiscount > 0 && <span className="fw-bold">• {effectiveDiscount}% off</span>}
                  </div>
                )}
                {userOffers.length > 0 && !userPremium && (
                  <div className="d-flex align-items-center gap-2 mb-2 p-2 rounded-2" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: '12px', color: '#059669' }}>
                    <i className="bi bi-tag"></i>
                    <span className="fw-semibold">{userOffers.length} offer{userOffers.length > 1 ? 's' : ''} applied</span>
                  </div>
                )}

                <div className="d-flex justify-content-between text-muted mb-2" style={{ fontSize: '14px' }}>
                  <span>Subtotal ({totalItems} items)</span>
                  <span className="fw-medium">₹{subtotal.toFixed(2)}</span>
                </div>

                {premiumDiscount > 0 && (
                  <div className="d-flex justify-content-between mb-2" style={{ fontSize: '14px', color: '#059669' }}>
                    <span className="fw-medium">Premium Discount ({effectiveDiscount}%)</span>
                    <span className="fw-medium">-₹{premiumDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="d-flex justify-content-between align-items-center mb-2" style={{ fontSize: '14px' }}>
                  <span className="text-muted d-flex align-items-center gap-1">
                    Delivery
                    {deliveryFee === 0 && <span className="fw-semibold" style={{ color: '#059669', fontSize: '12px' }}>(Free above ₹{effectiveFreeDeliveryAbove})</span>}
                  </span>
                  {deliveryFee === 0 ? (
                    <span className="fw-semibold" style={{ color: '#059669' }}>Free</span>
                  ) : (
                    <span className="fw-medium">₹{deliveryFee.toFixed(2)}</span>
                  )}
                </div>

                <div className="d-flex justify-content-between align-items-center mb-2" style={{ fontSize: '14px' }}>
                  <span className="text-muted d-flex align-items-center gap-1">
                    GST ({settings.gstRate}%)
                    <span
                      className="d-inline-flex align-items-center justify-content-center rounded-circle"
                      style={{ width: '16px', height: '16px', background: '#e5e7eb', cursor: 'pointer', fontSize: '10px', fontWeight: 600, color: '#6b7280', position: 'relative' }}
                      onClick={() => setShowTaxDetails(!showTaxDetails)}
                    >
                      i
                    </span>
                  </span>
                  <span className="fw-medium">₹{totalTax.toFixed(2)}</span>
                </div>

                {showTaxDetails && (
                  <div className="mb-2 p-2 rounded-2" style={{ background: '#ffffff', border: '1px solid #e5e7eb', fontSize: '12px' }}>
                    <div className="fw-semibold mb-1" style={{ color: '#374151', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tax Breakdown</div>
                    {taxBreakdown.map((item, i) => (
                      <div key={i} className="d-flex justify-content-between" style={{ color: '#6b7280', padding: '2px 0' }}>
                        <span>{item.name} × {item.quantity}</span>
                        <span>₹{item.tax.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="d-flex justify-content-between text-muted mb-2" style={{ fontSize: '14px' }}>
                  <span>Handling Fee</span>
                  <span className="fw-medium">₹{handlingFee.toFixed(2)}</span>
                </div>

                <div style={{ height: '1px', background: '#e5e7eb', margin: '12px 0' }}></div>
                <div className="d-flex justify-content-between">
                  <span className="fw-bold" style={{ fontSize: '16px' }}>Total</span>
                  <span className="fw-bold" style={{ fontSize: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#059669' }}>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Pay Button */}
              <button onClick={handleCheckout} disabled={loading || cart.length === 0} className="btn w-100 fw-bold text-white rounded-3 py-3 fc-primary mt-4 d-flex align-items-center justify-content-center gap-2" style={{ fontSize: '15px', boxShadow: '0 4px 14px -3px rgba(5,150,105,0.4)' }}>
                {loading ? (
                  <><span className="spinner-border spinner-border-sm"></span> Processing...</>
                ) : (
                  <><i className="bi bi-credit-card me-1"></i> Pay ₹{grandTotal.toFixed(2)}</>
                )}
              </button>

              {/* Trust */}
              <div className="d-flex align-items-center justify-content-center gap-4 mt-3">
                <div className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '11px' }}>
                  <i className="bi bi-shield-lock text-success"></i> Secure
                </div>
                <div className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '11px' }}>
                  <i className="bi bi-lightning text-warning"></i> Instant
                </div>
                <div className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '11px' }}>
                  <i className="bi bi-check-circle text-success"></i> Verified
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
