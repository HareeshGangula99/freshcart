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
  uom: string;
  uomValue: number;
  imageURL: string;
  stockQuantity: number;
}

const UOM_LABELS: Record<string, string> = {
  kg: 'kg',
  g: 'g',
  qty: 'qty',
  ltr: 'ltr',
  ml: 'ml',
  dozen: 'dozen',
  piece: 'pc',
};

const categoryMeta: Record<string, { emoji: string; bg: string; color: string; gradient: string }> = {
  Fruits: { emoji: '🍎', bg: '#fef2f2', color: '#dc2626', gradient: 'linear-gradient(135deg, #fef2f2, #fee2e2)' },
  Vegetables: { emoji: '🥬', bg: '#f0fdf4', color: '#16a34a', gradient: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' },
  Dairy: { emoji: '🥛', bg: '#eff6ff', color: '#2563eb', gradient: 'linear-gradient(135deg, #eff6ff, #dbeafe)' },
  Bakery: { emoji: '🍞', bg: '#fffbeb', color: '#d97706', gradient: 'linear-gradient(135deg, #fffbeb, #fef3c7)' },
  Beverages: { emoji: '🥤', bg: '#fdf2f8', color: '#db2777', gradient: 'linear-gradient(135deg, #fdf2f8, #fce7f3)' },
  Snacks: { emoji: '🍿', bg: '#fefce8', color: '#a16207', gradient: 'linear-gradient(135deg, #fefce8, #fef9c3)' },
  Grains: { emoji: '🌾', bg: '#f5f3ff', color: '#7c3aed', gradient: 'linear-gradient(135deg, #f5f3ff, #ede9fe)' },
  Meat: { emoji: '🥩', bg: '#fef2f2', color: '#b91c1c', gradient: 'linear-gradient(135deg, #fef2f2, #fecaca)' },
  Chocolate: { emoji: '🍫', bg: '#fdf2f8', color: '#9333ea', gradient: 'linear-gradient(135deg, #fdf2f8, #fae8ff)' },
};

const fallbackMeta = { emoji: '📦', bg: '#f9fafb', color: '#6b7280', gradient: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' };
const getCategoryMeta = (cat: string) => categoryMeta[cat] || fallbackMeta;

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    productService.getCategories().then(res => setCategories(res.data)).catch(() => {});
  }, []);

  const fetchProducts = useCallback(async (cat: string, searchQuery: string) => {
    setLoading(true);
    try {
      const res = await productService.getProducts({ category: cat, search: searchQuery, page: '1', limit: '100' });
      if (res.data.products) {
        setProducts(res.data.products);
      } else {
        setProducts(res.data);
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

  // Group products by category and split into rows
  const groupedProducts = useMemo(() => {
    const PRODUCTS_PER_ROW = 8;
    
    if (category || search) {
      // If filtering, split into rows of 8
      const rows: { name: string; products: Product[] }[] = [];
      for (let i = 0; i < products.length; i += PRODUCTS_PER_ROW) {
        rows.push({
          name: category || 'Search Results',
          products: products.slice(i, i + PRODUCTS_PER_ROW)
        });
      }
      return rows.length > 0 ? rows : [{ name: category || 'Search Results', products: [] }];
    }
    
    const groups: { name: string; products: Product[] }[] = [];
    const categoryOrder = ['Fruits', 'Vegetables', 'Dairy', 'Snacks', 'Bakery', 'Beverages', 'Grains', 'Meat', 'Chocolate'];
    
    categoryOrder.forEach(cat => {
      const catProducts = products.filter(p => p.category === cat);
      if (catProducts.length > 0) {
        // Split into rows of 8
        for (let i = 0; i < catProducts.length; i += PRODUCTS_PER_ROW) {
          groups.push({
            name: cat,
            products: catProducts.slice(i, i + PRODUCTS_PER_ROW)
          });
        }
      }
    });
    
    // Add any remaining categories not in order
    const remaining = products.filter(p => !categoryOrder.includes(p.category));
    if (remaining.length > 0) {
      const remainingCategories = [...new Set(remaining.map(p => p.category))];
      remainingCategories.forEach(cat => {
        const catProducts = remaining.filter(p => p.category === cat);
        for (let i = 0; i < catProducts.length; i += PRODUCTS_PER_ROW) {
          groups.push({
            name: cat,
            products: catProducts.slice(i, i + PRODUCTS_PER_ROW)
          });
        }
      });
    }
    
    return groups;
  }, [products, category, search]);

  return (
    <div className="zepto-layout">
      {/* Fixed Header */}
      <div className="zepto-header">
        {/* Hero */}
        <div className="fc-hero">
          <div className="position-relative" style={{ zIndex: 10 }}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <div className="d-flex align-items-center justify-content-center rounded-2" style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}>
                <i className="bi bi-stars" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}></i>
                <small style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginLeft: '6px', fontSize: '12px' }}>Premium Quality</small>
              </div>
            </div>
            <h1 className="fw-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-1px', lineHeight: 1.1 }}>
              Fresh Market
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: '12px' }}>
              Fresh produce delivered to your doorstep.
            </p>
            <div className="hero-stats-row">
              {[
                { icon: 'bi-star-fill', text: '4.8 Rating', sub: '2k+ reviews' },
                { icon: 'bi-bag-check', text: '10k+ Orders', sub: 'Delivered' },
                { icon: 'bi-clock-history', text: '30 min', sub: 'Avg delivery' },
              ].map((item, i) => (
                <div key={i} className="hero-stat-item">
                  <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }}>
                    <i className={`bi ${item.icon}`} style={{ color: 'white', fontSize: '12px' }}></i>
                  </div>
                  <div className="min-w-0">
                    <p className="fw-bold mb-0 text-truncate" style={{ fontSize: '10px', color: 'white' }}>{item.text}</p>
                    <small className="text-truncate d-block" style={{ fontSize: '8px', color: 'rgba(255,255,255,0.5)' }}>{item.sub}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-wrapper position-relative">
          <div className="position-absolute d-flex align-items-center justify-content-center" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px' }}>
            <i className="bi bi-search" style={{ color: '#9ca3af', fontSize: '14px' }}></i>
          </div>
          <input
            type="text"
            placeholder="Search fresh fruits, veggies..."
            className="form-control fc-input"
            style={{ height: '40px', paddingLeft: '40px', borderRadius: '10px', fontSize: '13px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="position-absolute d-flex align-items-center justify-content-center rounded-circle border-0"
              style={{ right: '10px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', background: '#f3f4f6', cursor: 'pointer' }}
            >
              <i className="bi bi-x" style={{ fontSize: '10px', color: '#6b7280' }}></i>
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="category-filters-wrapper mt-2">
          <div className="d-flex align-items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
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
      </div>

      {/* Scrollable Product Rows */}
      <div className="zepto-content">
        {loading ? (
          // Loading skeletons
          <div className="px-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="mb-3">
                <div className="skeleton mb-2" style={{ height: '16px', width: '100px', borderRadius: '4px' }}></div>
                <div className="d-flex gap-2 overflow-hidden">
                  {[1, 2, 3, 4].map(j => (
                    <div key={j} style={{ minWidth: '140px' }}>
                      <div className="skeleton" style={{ height: '140px', borderRadius: '10px' }}></div>
                      <div className="skeleton mt-2" style={{ height: '12px', width: '80%', borderRadius: '4px' }}></div>
                      <div className="skeleton mt-1" style={{ height: '10px', width: '50%', borderRadius: '4px' }}></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="product-rows-container">
            {groupedProducts.map((group) => {
              const meta = getCategoryMeta(group.name);
              return (
                <div key={group.name} className="product-row-section">
                  {/* Row Header */}
                  <div className="d-flex align-items-center justify-content-between px-3 mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ fontSize: '16px' }}>{meta.emoji}</span>
                      <h3 className="fw-bold mb-0" style={{ fontSize: '16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {group.name}
                      </h3>
                    </div>
                    <span className="badge rounded-pill" style={{ background: '#f3f4f6', color: '#6b7280', fontSize: '10px', fontWeight: 600 }}>
                      {group.products.length}
                    </span>
                  </div>

                  {/* Horizontal Scrollable Products Row */}
                  <div className="product-row-scroll">
                    <div className="product-row-inner">
                      {group.products.map((product) => {
                        const pMeta = getCategoryMeta(product.category);
                        const isOutOfStock = product.stockQuantity === 0;
                        return (
                          <Link key={product._id} to={`/product/${product._id}`} className="product-row-card-link">
                            <div className="product-row-card">
                              {/* Product Image */}
                              <div className="product-row-img-wrapper" style={{ background: pMeta.gradient }}>
                                <img
                                  src={product.imageURL ? (product.imageURL.startsWith('http') ? product.imageURL : `${API_BASE}${product.imageURL}`) : `https://placehold.co/400x300/f0fdf4/16a34a?text=${encodeURIComponent(pMeta.emoji)}`}
                                  alt={product.name}
                                  loading="lazy"
                                />
                                {isOutOfStock && (
                                  <div className="product-row-out-of-stock">
                                    <span>Out of Stock</span>
                                  </div>
                                )}
                                {!isOutOfStock && (
                                  <div className="product-row-quick-view">
                                    <i className="bi bi-arrow-up-right"></i>
                                  </div>
                                )}
                              </div>

                              {/* Product Info */}
                              <div className="product-row-info">
                                <h4 className="product-row-name">{product.name}</h4>
                                <p className="product-row-desc">{product.description || 'Fresh product'}</p>
                                <div className="product-row-price-row">
                                  <span className="product-row-price">₹{product.price}</span>
                                  <span className="product-row-unit">/ {product.uomValue || 1}{UOM_LABELS[product.uom] || 'qty'}</span>
                                </div>
                                {!isOutOfStock ? (
                                  <span className="product-row-view-btn">
                                    View <i className="bi bi-arrow-right ms-1"></i>
                                  </span>
                                ) : (
                                  <span className="product-row-unavailable">Unavailable</span>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {products.length === 0 && !loading && (
              <div className="text-center py-5 px-3">
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                <p className="fw-bold fs-6 mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No products found</p>
                <p className="text-muted" style={{ fontSize: '13px' }}>Try a different search or category</p>
                <button onClick={() => { setCategory(''); setSearch(''); }} className="btn btn-sm fw-semibold text-white rounded-3 px-3 py-2 fc-primary mt-2">
                  <i className="bi bi-arrow-counterclockwise me-1"></i> Reset
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
