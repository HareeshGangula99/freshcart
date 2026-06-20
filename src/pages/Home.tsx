import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { productService } from '../services/api';
import { API_BASE } from '../config';
import { Link } from 'react-router-dom';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageURL: string;
  stockQuantity: number;
}

const categoryMeta: Record<string, { emoji: string; bg: string; color: string; gradient: string }> = {
  Fruits: { emoji: '🍎', bg: '#fef2f2', color: '#dc2626', gradient: 'linear-gradient(135deg, #fef2f2, #fee2e2)' },
  Vegetables: { emoji: '🥬', bg: '#f0fdf4', color: '#16a34a', gradient: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' },
  Dairy: { emoji: '🥛', bg: '#eff6ff', color: '#2563eb', gradient: 'linear-gradient(135deg, #eff6ff, #dbeafe)' },
  Bakery: { emoji: '🍞', bg: '#fffbeb', color: '#d97706', gradient: 'linear-gradient(135deg, #fffbeb, #fef3c7)' },
  Beverages: { emoji: '🥤', bg: '#fdf2f8', color: '#db2777', gradient: 'linear-gradient(135deg, #fdf2f8, #fce7f3)' },
  Snacks: { emoji: '🍿', bg: '#fefce8', color: '#a16207', gradient: 'linear-gradient(135deg, #fefce8, #fef9c3)' },
  Grains: { emoji: '🌾', bg: '#f5f3ff', color: '#7c3aed', gradient: 'linear-gradient(135deg, #f5f3ff, #ede9fe)' },
  Meat: { emoji: '🥩', bg: '#fef2f2', color: '#b91c1c', gradient: 'linear-gradient(135deg, #fef2f2, #fecaca)' },
};

const fallbackMeta = { emoji: '📦', bg: '#f9fafb', color: '#6b7280', gradient: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' };
const getCategoryMeta = (cat: string) => categoryMeta[cat] || fallbackMeta;

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    productService.getCategories().then(res => setCategories(res.data)).catch(() => {});
  }, []);

  const fetchProducts = useCallback(async (cat: string, searchQuery: string) => {
    setLoading(true);
    try {
      const res = await productService.getProducts({ category: cat, search: searchQuery, page: '1', limit: '50' });
      if (res.data.products) {
        setProducts(res.data.products);
        setTotalCount(res.data.pagination.total);
      } else {
        setProducts(res.data);
        setTotalCount(res.data.length);
      }
    } catch (error) { console.error('Error fetching products'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProducts(category, search);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [category, search, fetchProducts]);

  const productCount = useMemo(() => totalCount || products.length, [totalCount, products]);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="fc-hero mb-5">
        <div className="position-relative" style={{ zIndex: 10 }}>
          <div className="d-flex align-items-center gap-2 mb-3">
            <div className="d-flex align-items-center justify-content-center rounded-2" style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}>
              <i className="bi bi-stars" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}></i>
              <small style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginLeft: '6px', fontSize: '12px' }}>Premium Quality</small>
            </div>
          </div>
          <h1 className="fw-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-1px', lineHeight: 1.1 }}>
            Fresh Market
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.75)', maxWidth: '480px', lineHeight: 1.7, marginBottom: '28px' }}>
            Handpicked organic produce delivered to your doorstep. Quality you can taste, freshness you can trust.
          </p>
          <div className="d-flex align-items-center gap-3 gap-md-5 flex-wrap">
            {[
              { icon: 'bi-star-fill', text: '4.8 Rating', sub: '2k+ reviews' },
              { icon: 'bi-bag-check', text: '10k+ Orders', sub: 'Delivered' },
              { icon: 'bi-clock-history', text: '30 min', sub: 'Avg delivery' },
            ].map((item, i) => (
              <div key={i} className="d-flex align-items-center gap-2">
                <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '38px', height: '38px', background: 'rgba(255,255,255,0.12)' }}>
                  <i className={`bi ${item.icon}`} style={{ color: 'white', fontSize: '15px' }}></i>
                </div>
                <div>
                  <p className="fw-bold mb-0" style={{ fontSize: '13px', color: 'white' }}>{item.text}</p>
                  <small style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>{item.sub}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="position-relative mb-4">
        <div className="position-absolute d-flex align-items-center justify-content-center" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px' }}>
          <i className="bi bi-search" style={{ color: '#9ca3af', fontSize: '16px' }}></i>
        </div>
        <input
          type="text"
          placeholder="Search for fresh fruits, vegetables, dairy..."
          className="form-control fc-input"
          style={{ height: '52px', paddingLeft: '48px', borderRadius: '16px', fontSize: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="position-absolute d-flex align-items-center justify-content-center rounded-circle border-0"
            style={{ right: '16px', top: '50%', transform: 'translateY(-50%)', width: '24px', height: '24px', background: '#f3f4f6', cursor: 'pointer' }}
          >
            <i className="bi bi-x" style={{ fontSize: '12px', color: '#6b7280' }}></i>
          </button>
        )}
      </div>

      {/* Category Filters */}
      <div className="d-flex align-items-center gap-2 overflow-x-auto hide-scrollbar pb-2 mb-4">
        <button
          onClick={() => setCategory('')}
          className={`category-pill flex-shrink-0 ${category === '' ? 'active' : ''}`}
        >
          <span className="me-1">✨</span> All
        </button>
        {categories.map(c => {
          const meta = getCategoryMeta(c);
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`category-pill flex-shrink-0 d-flex align-items-center gap-1 ${category === c ? 'active' : ''}`}
            >
              <span>{meta.emoji}</span> {c}
            </button>
          );
        })}
      </div>

      {/* Product Count */}
      {!loading && (
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div className="d-flex align-items-center gap-2">
            <span className="fw-bold" style={{ fontSize: '18px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {category || 'All Products'}
            </span>
            <span className="badge rounded-pill" style={{ background: '#f3f4f6', color: '#6b7280', fontSize: '12px', fontWeight: 600 }}>
              {productCount}
            </span>
          </div>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="product-grid row g-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="col-12 col-sm-6 col-lg-4 col-xl-3">
              <div className="card border-0 fc-card h-100">
                <div className="skeleton" style={{ height: '220px', borderRadius: '16px 16px 0 0' }}></div>
                <div className="card-body p-4">
                  <div className="skeleton mb-2" style={{ height: '12px', width: '60px', borderRadius: '6px' }}></div>
                  <div className="skeleton mb-2" style={{ height: '18px', width: '80%', borderRadius: '6px' }}></div>
                  <div className="skeleton mb-3" style={{ height: '14px', width: '50%', borderRadius: '6px' }}></div>
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="skeleton" style={{ height: '24px', width: '70px', borderRadius: '6px' }}></div>
                    <div className="skeleton" style={{ height: '36px', width: '90px', borderRadius: '10px' }}></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="product-grid row g-4">
          {products.map((product, index) => {
            const meta = getCategoryMeta(product.category);
            const isOutOfStock = product.stockQuantity === 0;
            return (
              <div key={product._id} className="col-12 col-sm-6 col-lg-4 col-xl-3" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="card border-0 fc-card h-100 overflow-hidden animate-slide-up d-flex flex-column">
                  {/* Product Image */}
                  <div className="product-img-wrapper position-relative flex-shrink-0" style={{ height: '220px', background: meta.gradient }}>
                    <img
                      src={product.imageURL ? (product.imageURL.startsWith('http') ? product.imageURL : `${API_BASE}${product.imageURL}`) : `https://placehold.co/400x300/f0fdf4/16a34a?text=${encodeURIComponent(meta.emoji)}`}
                      alt={product.name}
                      className="w-100 h-100"
                      style={{ objectFit: 'cover' }}
                      loading="lazy"
                    />
                    {/* Category Badge */}
                    <span className="position-absolute top-0 start-0 m-3 fw-semibold" style={{ padding: '5px 12px', borderRadius: '10px', fontSize: '11px', background: 'rgba(255,255,255,0.95)', color: meta.color, backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                      {meta.emoji} {product.category}
                    </span>
                    {/* Stock Badge */}
                    {isOutOfStock && (
                      <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
                        <span className="fw-bold" style={{ background: 'rgba(255,255,255,0.95)', color: '#dc2626', padding: '8px 20px', borderRadius: '12px', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                          Out of Stock
                        </span>
                      </div>
                    )}
                    {/* Quick View on hover */}
                    {!isOutOfStock && (
                      <Link
                        to={`/product/${product._id}`}
                        className="position-absolute bottom-0 end-0 m-3 d-flex align-items-center justify-content-center rounded-circle text-white text-decoration-none quick-view-btn"
                        style={{ width: '40px', height: '40px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', opacity: 0, transition: 'opacity 0.2s ease' }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                      >
                        <i className="bi bi-arrow-up-right"></i>
                      </Link>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="card-body d-flex flex-column p-4">
                    <h6 className="fw-bold text-dark mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '15px', lineHeight: 1.3 }}>
                      {product.name}
                    </h6>
                    <p className="text-muted mb-3 flex-grow-1" style={{ fontSize: '13px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {product.description || 'Fresh and quality product'}
                    </p>
                    <div className="d-flex align-items-end justify-content-between mt-auto">
                      <div>
                        <span className="fw-bold" style={{ fontSize: '22px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#059669' }}>
                          ₹{product.price}
                        </span>
                        <span className="text-muted ms-1" style={{ fontSize: '12px' }}>/unit</span>
                      </div>
                      {!isOutOfStock ? (
                        <Link
                          to={`/product/${product._id}`}
                          className="btn btn-sm fw-semibold text-white rounded-3 px-3 py-2 fc-primary"
                          style={{ fontSize: '13px' }}
                        >
                          View <i className="bi bi-arrow-right ms-1"></i>
                        </Link>
                      ) : (
                        <span className="fw-medium" style={{ color: '#dc2626', background: '#fef2f2', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', border: '1px solid #fecaca' }}>
                          Unavailable
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {products.length === 0 && (
            <div className="col-12 text-center py-5">
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
              <p className="fw-bold fs-5 mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No products found</p>
              <p className="text-muted" style={{ fontSize: '14px' }}>Try a different search or category</p>
              <button onClick={() => { setCategory(''); setSearch(''); }} className="btn fw-semibold text-white rounded-3 px-4 py-2 fc-primary mt-2">
                <i className="bi bi-arrow-counterclockwise me-1"></i> Reset Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
