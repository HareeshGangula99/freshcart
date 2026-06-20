import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { removeFromCart, updateQuantity, clearCart } from '../store/cartSlice';
import { orderService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import LocationSearchInput from '../components/LocationSearchInput';

const Cart: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cart = useSelector((state: RootState) => state.cart.items);
  const [address, setAddress] = useState<{ street: string; city: string; zip: string; lat?: number; lng?: number }>({ street: '', city: '', zip: '' });
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (!user) return alert('Please login to checkout');
    if (!address.street || !address.city || !address.zip) return alert('Please enter delivery address');
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
      <div className="d-flex align-items-center justify-content-between mb-5">
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)' }}>
            <i className="bi bi-cart3 text-white" style={{ fontSize: '18px' }}></i>
          </div>
          <div>
            <h4 className="fw-bold mb-0" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.3px' }}>Your Cart</h4>
            {cart.length > 0 && <small className="text-muted">{totalItems} item{totalItems !== 1 ? 's' : ''} • ₹{totalAmount.toFixed(2)}</small>}
          </div>
        </div>
        <button onClick={() => navigate('/')} className="btn btn-sm fw-medium rounded-3 px-3 py-2" style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#e5e7eb'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
        >
          <i className="bi bi-arrow-left me-1"></i> Continue Shopping
        </button>
      </div>

      {cart.length === 0 ? (
        /* Empty Cart */
        <div className="card border-0 shadow-soft p-5 text-center rounded-4" style={{ maxWidth: '480px', margin: '0 auto' }}>
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
        <div className="row g-4">
          {/* Cart Items */}
          <div className="col-lg-8">
            <div className="d-flex flex-column gap-3">
              {cart.map((item, index) => (
                <div key={item.id} className="card border-0 shadow-soft rounded-4 overflow-hidden animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="p-3 d-flex align-items-center gap-3 cart-item-row">
                    {/* Product Image */}
                    <div className="position-relative flex-shrink-0 rounded-3 overflow-hidden" style={{ width: '80px', height: '80px' }}>
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
                        <button onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}>
                          <i className="bi bi-plus"></i>
                        </button>
                      </div>
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
                    setAddress({ street: data.street, city: data.city, zip: data.zip, lat: data.lat, lng: data.lng });
                    setLocationCoords({ lat: data.lat, lng: data.lng });
                  }}
                  placeholder="Search delivery location..."
                />
                <div className="d-flex gap-2 mt-2">
                  <input
                    placeholder="City"
                    className="form-control fc-input"
                    style={{ fontSize: '13px' }}
                    value={address.city}
                    onChange={e => setAddress({ ...address, city: e.target.value })}
                  />
                  <input
                    placeholder="ZIP"
                    className="form-control fc-input"
                    style={{ fontSize: '13px' }}
                    value={address.zip}
                    onChange={e => setAddress({ ...address, zip: e.target.value })}
                  />
                </div>
              </div>

              {/* Price Breakdown */}
              <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                <div className="d-flex justify-content-between text-muted mb-2" style={{ fontSize: '14px' }}>
                  <span>Subtotal ({totalItems} items)</span>
                  <span className="fw-medium">₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between text-muted mb-2" style={{ fontSize: '14px' }}>
                  <span>Delivery</span>
                  <span className="fw-semibold" style={{ color: '#059669' }}>Free</span>
                </div>
                <div className="d-flex justify-content-between text-muted mb-2" style={{ fontSize: '14px' }}>
                  <span>Taxes</span>
                  <span className="fw-medium">Included</span>
                </div>
                <div style={{ height: '1px', background: '#e5e7eb', margin: '12px 0' }}></div>
                <div className="d-flex justify-content-between">
                  <span className="fw-bold" style={{ fontSize: '16px' }}>Total</span>
                  <span className="fw-bold" style={{ fontSize: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#059669' }}>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Pay Button */}
              <button onClick={handleCheckout} disabled={loading || cart.length === 0} className="btn w-100 fw-bold text-white rounded-3 py-3 fc-primary mt-4 d-flex align-items-center justify-content-center gap-2" style={{ fontSize: '15px', boxShadow: '0 4px 14px -3px rgba(5,150,105,0.4)' }}>
                {loading ? (
                  <><span className="spinner-border spinner-border-sm"></span> Processing...</>
                ) : (
                  <><i className="bi bi-credit-card me-1"></i> Pay ₹{totalAmount.toFixed(2)}</>
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
