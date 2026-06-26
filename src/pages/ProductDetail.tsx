import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { productService } from '../services/api';
import { addToCart } from '../store/cartSlice';
import { API_BASE } from '../config';
import type { RootState } from '../store/store';

interface Product { _id: string; name: string; description: string; price: number; category: string; imageURL: string; stockQuantity: number; }

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try { const res = await productService.getProductById(id!); setProduct(res.data); }
      catch (err) { console.error('Failed'); }
      finally { setLoading(false); }
    };
    fetchProduct();
  }, [id]);

  useEffect(() => { if (product && cartItems.find(i => i.id === product._id)) setAdded(true); }, [product, cartItems]);

  const handleAddToCart = () => {
    if (!product) return;
    for (let i = 0; i < quantity; i++) {
      dispatch(addToCart({ id: product._id, name: product.name, price: product.price, quantity: 1, imageURL: product.imageURL ? (product.imageURL.startsWith('http') ? product.imageURL : `${API_BASE}${product.imageURL}`) : `https://placehold.co/400x300/f0fdf4/16a34a?text=Fresh` }));
    }
    setAdded(true);
  };

  if (loading) return (
    <div className="animate-fade-in">
      <div className="skeleton mb-3" style={{ height: '16px', width: '120px', borderRadius: '6px' }}></div>
      <div className="card border-0 shadow-soft rounded-4 overflow-hidden">
        <div className="row g-0">
          <div className="col-12 col-md-6"><div className="skeleton" style={{ height: '220px', borderRadius: 0 }}></div></div>
          <div className="col-12 col-md-6 p-3 p-md-5">
            <div className="skeleton mb-3" style={{ height: '14px', width: '80px', borderRadius: '6px' }}></div>
            <div className="skeleton mb-3" style={{ height: '28px', width: '75%', borderRadius: '6px' }}></div>
            <div className="skeleton mb-3" style={{ height: '16px', width: '100%', borderRadius: '6px' }}></div>
            <div className="skeleton mb-4" style={{ height: '16px', width: '60%', borderRadius: '6px' }}></div>
            <div className="skeleton mb-4" style={{ height: '36px', width: '140px', borderRadius: '8px' }}></div>
            <div className="skeleton" style={{ height: '48px', width: '100%', borderRadius: '12px' }}></div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!product) return (
    <div className="text-center py-5">
      <div className="d-flex align-items-center justify-content-center mx-auto mb-4 rounded-circle" style={{ width: '100px', height: '100px', background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' }}>
        <span style={{ fontSize: '48px' }}>📦</span>
      </div>
      <p className="fw-bold fs-5 mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Product not found</p>
      <p className="text-muted mb-4" style={{ fontSize: '14px' }}>The product you're looking for doesn't exist</p>
      <button onClick={() => navigate('/')} className="btn fw-semibold text-white rounded-3 px-4 py-2 fc-primary">
        <i className="bi bi-arrow-left me-1"></i> Back to Market
      </button>
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="btn btn-sm fw-medium mb-3 mb-md-4 d-inline-flex align-items-center gap-2 rounded-3 px-3 py-2" style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', fontSize: '13px', transition: 'all 0.2s ease' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#e5e7eb'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
      >
        <i className="bi bi-arrow-left"></i> Back
      </button>

      {/* Product Card */}
      <div className="card border-0 shadow-soft rounded-4 overflow-hidden">
        <div className="row g-0">
          {/* Image */}
          <div className="col-12 col-md-6">
            <div className="position-relative product-detail-img" style={{ minHeight: '220px', height: '100%', background: '#f9fafb' }}>
              <img
                src={product.imageURL ? (product.imageURL.startsWith('http') ? product.imageURL : `${API_BASE}${product.imageURL}`) : `https://placehold.co/600x500/f0fdf4/16a34a?text=${encodeURIComponent(product.name)}`}
                alt={product.name}
                className="w-100 h-100"
                style={{ objectFit: 'cover' }}
              />
              {/* Category badge */}
              <span className="position-absolute top-0 start-0 m-4 fw-semibold" style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '12px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                {product.category}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="col-12 col-md-6 p-3 p-md-5 d-flex flex-column">
            {/* Category */}
            <span className="badge fw-semibold mb-3 align-self-start" style={{ background: '#f0fdf4', color: '#059669', borderRadius: '8px', fontSize: '12px', padding: '5px 12px' }}>
              <i className="bi bi-tag me-1"></i> {product.category}
            </span>

            {/* Name */}
            <h2 className="fw-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '24px', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              {product.name}
            </h2>

            {/* Description */}
            <p className="text-muted mb-4" style={{ fontSize: '15px', lineHeight: 1.7 }}>
              {product.description || 'Fresh and quality product, carefully selected for you. Sourced directly from trusted farmers and suppliers.'}
            </p>

            {/* Price */}
            <div className="d-flex align-items-baseline gap-2 mb-4">
              <span className="fw-bold" style={{ fontSize: '28px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#059669' }}>
                ₹{product.price}
              </span>
              <span className="text-muted" style={{ fontSize: '14px' }}>/unit</span>
            </div>

            {/* Stock Info */}
            {product.stockQuantity > 0 && (
              <div className="d-flex align-items-center gap-2 mb-4 p-2 rounded-3" style={{ background: '#f0fdf4', border: '1px solid #dcfce7' }}>
                <span className="rounded-circle d-inline-block" style={{ width: '8px', height: '8px', background: '#22c55e' }}></span>
                <small className="fw-medium" style={{ fontSize: '13px', color: '#059669' }}>{product.stockQuantity} units available</small>
              </div>
            )}

            {product.stockQuantity > 0 ? (
              <>
                {/* Quantity */}
                <div className="mb-4">
                  <label className="form-label fw-semibold mb-2" style={{ fontSize: '14px' }}>Quantity</label>
                  <div className="d-flex align-items-center gap-3">
                    <div className="qty-control">
                      <button onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                        <i className="bi bi-dash"></i>
                      </button>
                      <span>{quantity}</span>
                      <button onClick={() => setQuantity(q => Math.min(product.stockQuantity, q + 1))}>
                        <i className="bi bi-plus"></i>
                      </button>
                    </div>
                    <span className="text-muted" style={{ fontSize: '13px' }}>= ₹{(product.price * quantity).toFixed(2)}</span>
                  </div>
                </div>

                {/* Add to Cart / Go to Cart */}
                {added ? (
                  <div>
                    <div className="d-flex align-items-center gap-2 fw-semibold mb-3 p-3 rounded-3" style={{ background: '#f0fdf4', color: '#059669', border: '1px solid #dcfce7' }}>
                      <i className="bi bi-check-circle-fill" style={{ fontSize: '18px' }}></i>
                      <span>Added to Cart!</span>
                    </div>
                    <button onClick={() => navigate('/cart')} className="btn w-100 fw-bold text-white rounded-3 py-3 fc-primary" style={{ fontSize: '15px', boxShadow: '0 4px 14px -3px rgba(5,150,105,0.4)' }}>
                      <i className="bi bi-cart3 me-2"></i> Go to Cart & Checkout
                    </button>
                  </div>
                ) : (
                  <button onClick={handleAddToCart} className="btn w-100 fw-bold text-white rounded-3 py-3 fc-primary" style={{ fontSize: '15px', boxShadow: '0 4px 14px -3px rgba(5,150,105,0.4)' }}>
                    <i className="bi bi-cart3 me-2"></i> Add to Cart
                  </button>
                )}
              </>
            ) : (
              <div className="d-flex align-items-center gap-2 fw-semibold p-3 rounded-3" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '18px' }}></i>
                <span>Currently out of stock</span>
              </div>
            )}

            {/* Trust Badges */}
            <div className="d-flex align-items-center gap-3 gap-md-5 mt-auto pt-3 pt-md-4 flex-wrap" style={{ borderTop: '1px solid #f3f4f6' }}>
              {[
                { icon: 'bi-shield-check', text: 'Secure Payment', color: '#059669' },
                { icon: 'bi-truck', text: '30 Min Delivery', color: '#2563eb' },
                { icon: 'bi-arrow-repeat', text: 'Easy Returns', color: '#7c3aed' },
              ].map((b, i) => (
                <div key={i} className="d-flex align-items-center gap-2" style={{ fontSize: '12px' }}>
                  <div className="d-flex align-items-center justify-content-center rounded-2" style={{ width: '28px', height: '28px', background: `${b.color}15` }}>
                    <i className={`bi ${b.icon}`} style={{ fontSize: '13px', color: b.color }}></i>
                  </div>
                  <span className="fw-medium text-muted">{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
