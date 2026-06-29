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
      <div className="fc-hero mb-4 mb-md-5">
        <div className="position-relative" style={{ zIndex: 10 }}>
          <div className="d-flex align-items-center gap-2 mb-2 mb-md-3">
            <div className="d-flex align-items-center justify-content-center rounded-2" style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}>
              <i className="bi bi-stars" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}></i>
              <small style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginLeft: '6px', fontSize: '12px' }}>Premium Quality</small>
            </div>
          </div>
          <h1 className="fw-bold mb-2 mb-md-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-1px', lineHeight: 1.1 }}>
            Fresh Market
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', maxWidth: '480px', lineHeight: 1.7, marginBottom: '20px' }} className="d-none d-sm-block">
            Handpicked organic produce delivered to your doorstep. Quality you can taste, freshness you can trust.
          </p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: '20px' }} className="d-sm-none">
            Fresh produce delivered to your doorstep.
          </p>
          <div className="hero-stats-row">
            {[
              { icon: 'bi-star-fill', text: '4.8 Rating', sub: '2k+ reviews' },
              { icon: 'bi-bag-check', text: '10k+ Orders', sub: 'Delivered' },
              { icon: 'bi-clock-history', text: '30 min', sub: 'Avg delivery' },
            ].map((item, i) => (
              <div key={i} className="hero-stat-item">
                <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }}>
                  <i className={`bi ${item.icon}`} style={{ color: 'white', fontSize: '14px' }}></i>
                </div>
                <div className="min-w-0">
                  <p className="fw-bold mb-0 text-truncate" style={{ fontSize: '12px', color: 'white' }}>{item.text}</p>
                  <small className="text-truncate d-block" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>{item.sub}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-wrapper position-relative mb-3 mb-md-4">
        <div className="position-absolute d-flex align-items-center justify-content-center" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px' }}>
          <i className="bi bi-search" style={{ color: '#9ca3af', fontSize: '16px' }}></i>
        </div>
        <input
          type="text"
          placeholder="Search fresh fruits, veggies..."
          className="form-control fc-input"
          style={{ height: '48px', paddingLeft: '48px', borderRadius: '14px', fontSize: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
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
      <div className="category-filters-wrapper mb-3 mb-md-4">
        <div className="d-flex align-items-center gap-2 overflow-x-auto hide-scrollbar pb-2">
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
        <div className="product-grid row g-3 g-md-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="col-6 col-sm-6 col-lg-4 col-xl-3">
              <div className="card border-0 fc-card h-100">
                <div className="skeleton" style={{ height: '160px', borderRadius: '16px 16px 0 0' }}></div>
                <div className="card-body p-3">
                  <div className="skeleton mb-2" style={{ height: '10px', width: '50px', borderRadius: '6px' }}></div>
                  <div className="skeleton mb-2" style={{ height: '14px', width: '80%', borderRadius: '6px' }}></div>
                  <div className="skeleton mb-3" style={{ height: '12px', width: '50%', borderRadius: '6px' }}></div>
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="skeleton" style={{ height: '20px', width: '60px', borderRadius: '6px' }}></div>
                    <div className="skeleton" style={{ height: '32px', width: '70px', borderRadius: '10px' }}></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="product-grid row g-3 g-md-4">
          {products.map((product, index) => {
            const meta = getCategoryMeta(product.category);
            const isOutOfStock = product.stockQuantity === 0;
            return (
              <div key={product._id} className="col-6 col-sm-6 col-lg-4 col-xl-3" style={{ animationDelay: `${index * 0.05}s` }}>
                <Link to={`/product/${product._id}`} className="text-decoration-none">
                  <div className="card border-0 fc-card h-100 overflow-hidden animate-slide-up d-flex flex-column">
                    {/* Product Image */}
                    <div className="product-img-wrapper position-relative flex-shrink-0" style={{ height: '160px', background: meta.gradient }}>
                      <img
                        src={product.imageURL ? (product.imageURL.startsWith('http') ? product.imageURL : `${API_BASE}${product.imageURL}`) : `https://placehold.co/600x450/f0fdf4/16a34a?text=${encodeURIComponent(meta.emoji)}`}
                        alt={product.name}
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
                        loading="lazy"
                      />
                      {/* Category Badge */}
                      <span className="position-absolute top-0 start-0 m-2 m-md-3 fw-semibold" style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '10px', background: 'rgba(255,255,255,0.95)', color: meta.color, backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                        {meta.emoji} {product.category}
                      </span>
                      {/* Stock Badge */}
                      {isOutOfStock && (
                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
                          <span className="fw-bold" style={{ background: 'rgba(255,255,255,0.95)', color: '#dc2626', padding: '6px 16px', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                            Out of Stock
                          </span>
                        </div>
                      )}
                      {/* Quick View on hover */}
                      {!isOutOfStock && (
                        <div
                          className="position-absolute bottom-0 end-0 m-2 m-md-3 d-flex align-items-center justify-content-center rounded-circle text-white quick-view-btn"
                          style={{ width: '36px', height: '36px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', opacity: 0, transition: 'opacity 0.2s ease' }}
                        >
                          <i className="bi bi-arrow-up-right" style={{ fontSize: '14px' }}></i>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="card-body d-flex flex-column p-3">
                      <h6 className="fw-bold text-dark mb-1 product-name" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', lineHeight: 1.3 }}>
                        {product.name}
                      </h6>
                      <p className="text-muted mb-2 flex-grow-1" style={{ fontSize: '11px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {product.description || 'Fresh and quality product'}
                      </p>
                      <div className="d-flex align-items-end justify-content-between mt-auto">
                        <div>
                          <span className="fw-bold" style={{ fontSize: '18px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#059669' }}>
                            ₹{product.price}
                          </span>
                        </div>
                        {!isOutOfStock ? (
                          <span
                            className="btn btn-sm fw-semibold text-white rounded-2 px-2 py-1 fc-primary"
                            style={{ fontSize: '11px', minHeight: '28px' }}
                          >
                            View <i className="bi bi-arrow-right ms-1"></i>
                          </span>
                        ) : (
                          <span className="fw-medium" style={{ color: '#dc2626', background: '#fef2f2', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', border: '1px solid #fecaca' }}>
                            Unavailable
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
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
