import React, { useState, useEffect } from 'react';
import { adminService, productService } from '../services/api';
import { uploadImage } from '../services/upload';
import { getSocket } from '../services/socket';
import DeliveryTrackingMap from '../components/DeliveryTrackingMap';

const socket = getSocket();

const UOM_OPTIONS = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'qty', label: 'Quantity (qty)' },
  { value: 'ltr', label: 'Litre (ltr)' },
  { value: 'ml', label: 'Millilitre (ml)' },
  { value: 'dozen', label: 'Dozen' },
  { value: 'piece', label: 'Piece' },
];

const ROWS_PER_PAGE = 8;

const AdminDashboard: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryList, setCategoryList] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, categories: [] as string[], uom: 'qty', description: '', stockQuantity: 10 });
  const [editProduct, setEditProduct] = useState<any>(null);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [newPartner, setNewPartner] = useState({ name: '', email: '', password: '', phone: '', vehicleType: 'Bike' });
  const [activeTab, setActiveTab] = useState<'products' | 'approvals' | 'partners' | 'categories' | 'tracking'>('products');
  const [showProductForm, setShowProductForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkProducts, setBulkProducts] = useState([{ name: '', price: 0, categories: [] as string[], uom: 'qty', description: '', stockQuantity: 10, image: null as File | null }]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [deliveryLocations, setDeliveryLocations] = useState<Record<string, { lat: number; lng: number }>>({});
  const [customerLocations, setCustomerLocations] = useState<Record<string, { lat: number; lng: number }>>({});
  const [_trackingFilter] = useState<'all' | 'active'>('all');

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (activeTab === 'tracking') {
      fetchActiveDeliveries();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'tracking') return;

    const handleDeliveryLocation = (data: { orderId: string; lat: number; lng: number }) => {
      setDeliveryLocations(prev => {
        if (prev[data.orderId]?.lat === data.lat && prev[data.orderId]?.lng === data.lng) return prev;
        return { ...prev, [data.orderId]: { lat: data.lat, lng: data.lng } };
      });
    };
    const handleCustomerLocation = (data: { orderId: string; lat: number; lng: number }) => {
      setCustomerLocations(prev => {
        if (prev[data.orderId]?.lat === data.lat && prev[data.orderId]?.lng === data.lng) return prev;
        return { ...prev, [data.orderId]: { lat: data.lat, lng: data.lng } };
      });
    };

    socket.on('delivery_location_update', handleDeliveryLocation);
    socket.on('customer_location_update', handleCustomerLocation);
    return () => {
      socket.off('delivery_location_update', handleDeliveryLocation);
      socket.off('customer_location_update', handleCustomerLocation);
    };
  }, [activeTab]);

  const fetchActiveDeliveries = async () => {
    try {
      const res = await adminService.getActiveDeliveries();
      setActiveDeliveries(res.data);
      socket.emit('join_admin_tracking');
      res.data.forEach((order: any) => {
        if (order.deliveryPartnerLocation) {
          setDeliveryLocations(prev => ({
            ...prev,
            [order._id]: { lat: order.deliveryPartnerLocation.lat, lng: order.deliveryPartnerLocation.lng },
          }));
        }
      });
    } catch (error) {
      console.error('Failed to fetch active deliveries:', error);
    }
  };

  const fetchData = async () => {
    const [pRes, rRes] = await Promise.all([
      productService.getProducts({ page: '1', limit: '200' }),
      adminService.getPendingApprovals(),
    ]);
    setProducts(pRes.data.products || pRes.data);
    setRequests(rRes.data);
    fetchCategories();
  };

  const fetchCategories = async () => {
    try {
      const [adminRes, productRes] = await Promise.all([
        adminService.getCategories().catch(() => ({ data: [] })),
        productService.getCategories().catch(() => ({ data: [] })),
      ]);
      const dbCategories = adminRes.data.map((c: any) => c.name);
      const allCategories = [...new Set([...dbCategories, ...productRes.data])];
      setCategories(allCategories);
      setCategoryList(adminRes.data);
    } catch {
      const productRes = await productService.getCategories().catch(() => ({ data: [] }));
      setCategories(productRes.data);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await adminService.createCategory({ name: newCategoryName.trim() });
      setNewCategoryName('');
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add category');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    try {
      await adminService.deleteCategory(id);
      fetchCategories();
    } catch { alert('Delete failed'); }
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || (p.categories || []).includes(filterCategory) || p.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / ROWS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const handleCategoryToggle = (cat: string, isEdit = false) => {
    if (isEdit && editProduct) {
      const cats = editProduct.categories || [];
      setEditProduct({
        ...editProduct,
        categories: cats.includes(cat) ? cats.filter((c: string) => c !== cat) : [...cats, cat],
      });
    } else {
      const cats = newProduct.categories;
      setNewProduct({
        ...newProduct,
        categories: cats.includes(cat) ? cats.filter(c => c !== cat) : [...cats, cat],
      });
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUploading(true);
      let imageURL = '';

      if (productImage) {
        const primaryCategory = newProduct.categories[0]?.toLowerCase() || 'general';
        imageURL = await uploadImage(productImage, primaryCategory, setUploadProgress);
      }

      await productService.createProduct({
        name: newProduct.name,
        price: newProduct.price,
        categories: newProduct.categories,
        category: newProduct.categories[0] || '',
        uom: newProduct.uom,
        description: newProduct.description,
        stockQuantity: newProduct.stockQuantity,
        imageURL,
      });

      fetchData();
      setNewProduct({ name: '', price: 0, categories: [], uom: 'qty', description: '', stockQuantity: 10 });
      setProductImage(null);
      setUploadProgress(0);
      setShowProductForm(false);
    } catch (error) {
      alert('Failed to add product');
    } finally {
      setUploading(false);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUploading(true);
      let imageURL = editProduct.imageURL || '';

      if (productImage) {
        const primaryCategory = editProduct.categories[0]?.toLowerCase() || 'general';
        imageURL = await uploadImage(productImage, primaryCategory, setUploadProgress);
      }

      await productService.updateProduct(editProduct._id, {
        name: editProduct.name,
        price: editProduct.price,
        categories: editProduct.categories,
        category: editProduct.categories[0] || '',
        uom: editProduct.uom,
        description: editProduct.description,
        stockQuantity: editProduct.stockQuantity,
        imageURL,
      });

      fetchData();
      setEditProduct(null);
      setProductImage(null);
      setUploadProgress(0);
      setShowEditForm(false);
    } catch (error) {
      alert('Failed to update product');
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (product: any) => {
    setEditProduct({ ...product });
    setProductImage(null);
    setShowEditForm(true);
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminService.createPartner(newPartner);
      setNewPartner({ name: '', email: '', password: '', phone: '', vehicleType: 'Bike' });
    } catch (error) { alert('Partner creation failed'); }
  };

  const handleApprove = async (id: string) => {
    try { await adminService.approveUser(id); fetchData(); } catch { alert('Approval failed'); }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Delete this product?')) {
      try { await productService.deleteProduct(id); fetchData(); } catch { alert('Delete failed'); }
    }
  };

  const addBulkRow = () => {
    setBulkProducts([...bulkProducts, { name: '', price: 0, categories: [], uom: 'qty', description: '', stockQuantity: 10, image: null }]);
  };

  const removeBulkRow = (index: number) => {
    if (bulkProducts.length === 1) return;
    setBulkProducts(bulkProducts.filter((_, i) => i !== index));
  };

  const updateBulkRow = (index: number, field: string, value: any) => {
    const updated = [...bulkProducts];
    (updated[index] as any)[field] = value;
    setBulkProducts(updated);
  };

  const toggleBulkCategory = (index: number, cat: string) => {
    const updated = [...bulkProducts];
    const cats = updated[index].categories;
    updated[index].categories = cats.includes(cat) ? cats.filter((c: string) => c !== cat) : [...cats, cat];
    setBulkProducts(updated);
  };

  const handleBulkSubmit = async () => {
    const validProducts = bulkProducts.filter(p => p.name && p.price > 0);
    if (validProducts.length === 0) return alert('Add at least one product with a name and price');

    setBulkUploading(true);
    setBulkProgress({ current: 0, total: validProducts.length });

    try {
      for (let i = 0; i < validProducts.length; i++) {
        setBulkProgress({ current: i + 1, total: validProducts.length });
        const p = validProducts[i];
        let imageURL = '';

        if (p.image) {
          const primaryCategory = p.categories[0]?.toLowerCase() || 'general';
          imageURL = await uploadImage(p.image, primaryCategory);
        }

        await productService.createProduct({
          name: p.name,
          price: p.price,
          categories: p.categories,
          category: p.categories[0] || '',
          uom: p.uom,
          description: p.description,
          stockQuantity: p.stockQuantity,
          imageURL,
        });
      }

      fetchData();
      setBulkProducts([{ name: '', price: 0, categories: [], uom: 'qty', description: '', stockQuantity: 10, image: null }]);
      setShowBulkForm(false);
      alert(`${validProducts.length} products added successfully!`);
    } catch (error) {
      alert('Some products failed to add. Try again.');
    } finally {
      setBulkUploading(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  const tabs = [
    { id: 'products' as const, label: 'Products', icon: 'bi-box', count: products.length },
    { id: 'categories' as const, label: 'Categories', icon: 'bi-grid', count: categories.length },
    { id: 'approvals' as const, label: 'Approvals', icon: 'bi-people', count: requests.length },
    { id: 'partners' as const, label: 'Partners', icon: 'bi-truck' },
    { id: 'tracking' as const, label: 'Live Tracking', icon: 'bi-geo-alt' },
  ];

  const renderCategoryCheckboxes = (selectedCategories: string[], isEdit = false) => (
    <div>
      <div className="d-flex flex-wrap gap-2 mb-2">
        {categories.map(cat => (
          <label key={cat} className="d-flex align-items-center gap-1 px-2 py-1 rounded-2" style={{ border: '1px solid #e5e7eb', fontSize: '12px', cursor: 'pointer', background: selectedCategories.includes(cat) ? '#ecfdf5' : '#f9fafb' }}>
            <input type="checkbox" className="form-check-input m-0" style={{ width: '14px', height: '14px' }}
              checked={selectedCategories.includes(cat)} onChange={() => handleCategoryToggle(cat, isEdit)} />
            <span style={{ fontSize: '12px' }}>{cat}</span>
          </label>
        ))}
      </div>
      <div className="input-group input-group-sm" style={{ maxWidth: '260px' }}>
        <input type="text" className="form-control" style={{ fontSize: '12px', border: '1px solid #e5e7eb', borderRadius: '6px 0 0 6px' }} placeholder="New category..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); setNewCategoryName(''); } }} />
        <button type="button" className="btn btn-sm fc-primary text-white" style={{ borderRadius: '0 6px 6px 0', fontSize: '12px' }}
          onClick={() => { handleAddCategory(); setNewCategoryName(''); }} disabled={!newCategoryName.trim()}>
          <i className="bi bi-plus"></i>
        </button>
      </div>
    </div>
  );

  const renderProductForm = (onSubmit: (e: React.FormEvent) => void, data: any, setData: any, title: string) => (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
      <div className="card border-0 shadow-lg rounded-4 p-4 animate-scale-in" style={{ maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="fw-bold mb-0" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</h5>
          <button onClick={() => { setShowProductForm(false); setShowEditForm(false); setEditProduct(null); }} className="btn btn-sm text-muted border-0"><i className="bi bi-x-lg"></i></button>
        </div>
        <form onSubmit={onSubmit}>
          <input placeholder="Product Name" className="form-control fc-input mb-2" value={data.name || ''} onChange={e => setData({ ...data, name: e.target.value })} required />

          <div className="d-flex gap-2 mb-2">
            <div className="flex-grow-1">
              <input type="number" placeholder="Price (₹)" className="form-control fc-input" value={data.price || ''} onChange={e => setData({ ...data, price: Number(e.target.value) })} required />
            </div>
            <div className="flex-grow-1">
              <input type="number" placeholder="Stock" className="form-control fc-input" value={data.stockQuantity || ''} onChange={e => setData({ ...data, stockQuantity: Number(e.target.value) })} required />
            </div>
          </div>

          <div className="mb-2">
            <label className="form-label fw-medium text-muted mb-1" style={{ fontSize: '12px' }}>Unit of Measurement</label>
            <select className="form-select fc-input" value={data.uom || 'qty'} onChange={e => setData({ ...data, uom: e.target.value })}>
              {UOM_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div className="mb-2">
            <label className="form-label fw-medium text-muted mb-1" style={{ fontSize: '12px' }}>Categories (select multiple)</label>
            {renderCategoryCheckboxes(data.categories || [], !!editProduct)}
          </div>

          <label className="form-label fw-medium text-muted mb-1" style={{ fontSize: '12px' }}>Product Image</label>
          <label className="d-flex align-items-center gap-2 p-2 rounded-3 mb-2" style={{ border: '1.5px dashed #d1d5db', cursor: 'pointer', background: '#f9fafb', fontSize: '13px', color: '#6b7280' }}>
            <i className="bi bi-upload"></i>
            {productImage ? productImage.name : 'Choose image...'}
            <input type="file" accept="image/*" className="d-none" onChange={e => setProductImage(e.target.files ? e.target.files[0] : null)} />
          </label>

          {uploading && uploadProgress > 0 && (
            <div className="mb-2">
              <div className="progress" style={{ height: '6px', borderRadius: '3px' }}>
                <div className="progress-bar fc-primary" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <small className="text-muted" style={{ fontSize: '11px' }}>Uploading... {uploadProgress}%</small>
            </div>
          )}

          <textarea placeholder="Description" className="form-control fc-input mb-3" rows={2} style={{ resize: 'none' }} value={data.description || ''} onChange={e => setData({ ...data, description: e.target.value })} />
          <button type="submit" disabled={uploading} className="btn w-100 fw-bold text-white rounded-3 py-2 fc-primary">
            {uploading ? (
              <span className="d-flex align-items-center justify-content-center gap-2">
                <span className="spinner-border spinner-border-sm" role="status"></span> Uploading...
              </span>
            ) : (
              title === 'Add New Product' ? 'Create Product' : 'Update Product'
            )}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center justify-content-center rounded-3 fc-primary" style={{ width: '40px', height: '40px' }}>
            <i className="bi bi-shield-check text-white"></i>
          </div>
          <div>
            <h4 className="fw-bold mb-0" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Admin Panel</h4>
            <small className="text-muted">Manage your store operations</small>
          </div>
        </div>
        {activeTab === 'products' && (
          <div className="d-flex gap-2 flex-wrap">
            <button onClick={() => setShowBulkForm(true)} className="btn btn-sm fw-bold text-white rounded-3 px-3 py-2 d-flex align-items-center gap-1" style={{ background: '#7c3aed' }}>
              <i className="bi bi-plus-lg"></i> Bulk Add
            </button>
            <button onClick={() => setShowProductForm(!showProductForm)} className="btn btn-sm fw-bold text-white rounded-3 px-3 py-2 fc-primary d-flex align-items-center gap-1">
              <i className="bi bi-plus-lg"></i> Add Product
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="d-flex gap-1 p-1 rounded-3 mb-4" style={{ background: 'white', border: '1px solid #e5e7eb', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`btn d-flex align-items-center gap-2 fw-medium justify-content-center rounded-2 py-2 flex-shrink-0 ${activeTab === tab.id ? 'text-white' : 'text-muted'}`}
            style={{ whiteSpace: 'nowrap', ...(activeTab === tab.id ? { background: '#059669' } : {}) }}>
            <i className={`bi ${tab.icon}`}></i> {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`badge ${activeTab === tab.id ? 'bg-white bg-opacity-25 text-white' : 'bg-light text-muted'}`} style={{ fontSize: '10px' }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Add Product Modal */}
      {showProductForm && renderProductForm(handleAddProduct, newProduct, setNewProduct, 'Add New Product')}

      {/* Edit Product Modal */}
      {showEditForm && editProduct && renderProductForm(handleEditProduct, editProduct, setEditProduct, 'Edit Product')}

      {/* Bulk Add Modal */}
      {showBulkForm && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
          <div className="card border-0 shadow-lg rounded-4 p-4 animate-scale-in" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h5 className="fw-bold mb-0" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Bulk Add Products</h5>
                <small className="text-muted">Add multiple products at once</small>
              </div>
              <button onClick={() => setShowBulkForm(false)} className="btn btn-sm text-muted border-0"><i className="bi bi-x-lg"></i></button>
            </div>

            {bulkUploading && (
              <div className="alert d-flex align-items-center gap-2 mb-3" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '13px' }}>
                <span className="spinner-border spinner-border-sm"></span>
                Uploading {bulkProgress.current}/{bulkProgress.total} products...
              </div>
            )}

            {bulkProducts.map((product, index) => (
              <div key={index} className="card border mb-3" style={{ borderColor: '#e5e7eb' }}>
                <div className="card-header d-flex align-items-center justify-content-between py-2" style={{ background: '#f9fafb' }}>
                  <small className="fw-bold text-muted">Product {index + 1}</small>
                  {bulkProducts.length > 1 && (
                    <button onClick={() => removeBulkRow(index)} className="btn btn-sm text-danger border-0 p-0"><i className="bi bi-trash"></i></button>
                  )}
                </div>
                <div className="card-body p-3">
                  <input placeholder="Product Name" className="form-control fc-input mb-2" style={{ fontSize: '13px' }} value={product.name} onChange={e => updateBulkRow(index, 'name', e.target.value)} required />
                  <div className="d-flex gap-2 mb-2 flex-wrap">
                    <input type="number" placeholder="Price (₹)" className="form-control fc-input" style={{ fontSize: '13px' }} value={product.price || ''} onChange={e => updateBulkRow(index, 'price', Number(e.target.value))} required />
                    <input type="number" placeholder="Stock" className="form-control fc-input" style={{ fontSize: '13px' }} value={product.stockQuantity} onChange={e => updateBulkRow(index, 'stockQuantity', Number(e.target.value))} />
                    <select className="form-select fc-input" style={{ fontSize: '13px' }} value={product.uom} onChange={e => updateBulkRow(index, 'uom', e.target.value)}>
                      {UOM_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.value}</option>)}
                    </select>
                  </div>
                  <div className="d-flex flex-wrap gap-1 mb-2">
                    {categories.slice(0, 6).map(cat => (
                      <label key={cat} className="d-flex align-items-center gap-1 px-2 py-0 rounded" style={{ border: '1px solid #e5e7eb', fontSize: '11px', cursor: 'pointer', background: product.categories.includes(cat) ? '#ecfdf5' : '#f9fafb' }}>
                        <input type="checkbox" className="form-check-input m-0" style={{ width: '12px', height: '12px' }} checked={product.categories.includes(cat)} onChange={() => toggleBulkCategory(index, cat)} />
                        {cat}
                      </label>
                    ))}
                  </div>
                  <label className="d-flex align-items-center gap-2 p-1 rounded-2 mb-0" style={{ border: '1px dashed #d1d5db', cursor: 'pointer', background: '#f9fafb', fontSize: '12px', color: '#6b7280' }}>
                    <i className="bi bi-upload"></i>
                    {product.image ? product.image.name : 'Image (optional)'}
                    <input type="file" accept="image/*" className="d-none" onChange={e => updateBulkRow(index, 'image', e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>
            ))}

            <button onClick={addBulkRow} className="btn w-100 fw-medium rounded-3 py-2 mb-3" style={{ border: '1.5px dashed #059669', color: '#059669', fontSize: '13px', background: '#f0fdf4' }}>
              <i className="bi bi-plus-lg me-1"></i> Add Another Product
            </button>

            <div className="d-flex gap-2">
              <button onClick={() => setShowBulkForm(false)} className="btn flex-grow-1 fw-medium rounded-3 py-2" style={{ border: '1px solid #e5e7eb', fontSize: '13px' }}>Cancel</button>
              <button onClick={handleBulkSubmit} disabled={bulkUploading} className="btn flex-grow-1 fw-bold text-white rounded-3 py-2 fc-primary">
                {bulkUploading ? 'Uploading...' : `Add ${bulkProducts.filter(p => p.name).length} Products`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="p-3 d-flex gap-2 align-items-center" style={{ borderBottom: '1px solid #f0f0f0' }}>
            <div className="position-relative flex-grow-1">
              <i className="bi bi-search position-absolute" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '13px' }}></i>
              <input type="text" className="form-control" style={{ paddingLeft: '36px', fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '8px' }} placeholder="Search products..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
            </div>
            <select className="form-select" style={{ width: 'auto', fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '8px' }} value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th className="border-0 px-4 py-3 text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
                  <th className="border-0 px-4 py-3 text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</th>
                  <th className="border-0 px-4 py-3 text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                  <th className="border-0 px-4 py-3 text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UOM</th>
                  <th className="border-0 px-4 py-3 text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</th>
                  <th className="border-0 px-4 py-3 text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock</th>
                  <th className="border-0 px-4 py-3 text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-muted py-5">No products found</td></tr>
                ) : paginatedProducts.map((p, idx) => (
                  <tr key={p._id}>
                    <td className="px-4 py-3 text-muted" style={{ fontSize: '13px' }}>{(page - 1) * ROWS_PER_PAGE + idx + 1}</td>
                    <td className="px-4 py-3 align-middle">
                      <div className="d-flex align-items-center gap-2">
                        <img src={p.imageURL || 'https://via.placeholder.com/36'} alt="" className="rounded-2" style={{ width: '36px', height: '36px', objectFit: 'cover' }} />
                        <span className="fw-medium" style={{ fontSize: '13px' }}>{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: '13px' }}>
                      <div className="d-flex flex-wrap gap-1">
                        {(p.categories || [p.category]).filter(Boolean).map((cat: string, i: number) => (
                          <span key={i} className="badge bg-success bg-opacity-10 text-success" style={{ fontSize: '10px' }}>{cat}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted" style={{ fontSize: '13px' }}>{p.uom || 'qty'}</td>
                    <td className="px-4 py-3 fw-bold text-success" style={{ fontSize: '13px' }}>₹{p.price}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${p.stockQuantity === 0 ? 'bg-danger bg-opacity-10 text-danger' : p.stockQuantity < 10 ? 'bg-warning bg-opacity-10 text-warning' : 'bg-success bg-opacity-10 text-success'}`} style={{ fontSize: '11px' }}>{p.stockQuantity}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="d-flex gap-1">
                        <button onClick={() => openEditModal(p)} className="btn btn-sm text-muted border-0 rounded-2 p-1" title="Edit">
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button onClick={() => handleDeleteProduct(p._id)} className="btn btn-sm text-muted border-0 rounded-2 p-1" title="Delete">
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex align-items-center justify-content-between p-3" style={{ borderTop: '1px solid #f0f0f0' }}>
              <small className="text-muted" style={{ fontSize: '12px' }}>
                Showing {(page - 1) * ROWS_PER_PAGE + 1}-{Math.min(page * ROWS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length}
              </small>
              <div className="d-flex gap-1">
                <button className="btn btn-sm rounded-2" style={{ border: '1px solid #e5e7eb', fontSize: '12px' }} disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <i className="bi bi-chevron-left"></i>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`btn btn-sm rounded-2 ${page === p ? 'text-white' : ''}`} style={page === p ? { background: '#059669', fontSize: '12px' } : { border: '1px solid #e5e7eb', fontSize: '12px' }} onClick={() => setPage(p)}>
                    {p}
                  </button>
                ))}
                <button className="btn btn-sm rounded-2" style={{ border: '1px solid #e5e7eb', fontSize: '12px' }} disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approvals Tab */}
      {activeTab === 'approvals' && (
        <div className="d-flex flex-column gap-3">
          {requests.length === 0 ? (
            <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
              <p className="text-muted fw-medium">No pending approvals</p>
            </div>
          ) : requests.map(user => (
            <div key={user._id} className="card border-0 shadow-sm rounded-4 p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: '40px', height: '40px', fontSize: '14px', background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="fw-bold mb-0" style={{ fontSize: '13px' }}>{user.name}</p>
                  <small className="text-muted">{user.email} · {user.role?.replace('_', ' ')}</small>
                </div>
              </div>
              <button onClick={() => handleApprove(user._id)} className="btn btn-sm fw-bold text-white rounded-3 px-3 py-2 fc-primary">Approve</button>
            </div>
          ))}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div style={{ maxWidth: '500px' }}>
          <div className="card border-0 shadow-sm rounded-4 p-4 mb-3">
            <h6 className="fw-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <i className="bi bi-plus-circle text-success me-2"></i> Add New Category
            </h6>
            <div className="input-group">
              <input type="text" className="form-control fc-input" placeholder="Category name (e.g. Electronics, Meat...)" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { handleAddCategory(); } }} />
              <button className="btn fw-bold text-white px-4 fc-primary" onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                <i className="bi bi-plus-lg"></i> Add
              </button>
            </div>
          </div>
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="px-4 py-3 fw-semibold text-muted" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
              All Categories ({categories.length})
            </div>
            {categories.length === 0 ? (
              <div className="p-5 text-center text-muted">No categories yet</div>
            ) : (
              <div className="d-flex flex-column">
                {categories.map((cat, idx) => {
                  const dbCat = categoryList.find((c: any) => c.name === cat);
                  return (
                    <div key={cat} className="d-flex align-items-center justify-content-between px-4 py-3" style={{ borderBottom: idx < categories.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                      <div className="d-flex align-items-center gap-2">
                        <div className="rounded-2 d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', background: '#f0fdf4', color: '#059669' }}>
                          <i className="bi bi-tag" style={{ fontSize: '14px' }}></i>
                        </div>
                        <span className="fw-medium" style={{ fontSize: '14px' }}>{cat}</span>
                        {dbCat && <span className="badge bg-success bg-opacity-10 text-success" style={{ fontSize: '10px' }}>Custom</span>}
                      </div>
                      {dbCat && (
                        <button onClick={() => handleDeleteCategory(dbCat._id, cat)} className="btn btn-sm text-muted border-0 rounded-2 p-1">
                          <i className="bi bi-trash"></i>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Partners Tab */}
      {activeTab === 'partners' && (
        <div className="card border-0 shadow-sm rounded-4 p-4" style={{ maxWidth: '440px' }}>
          <h5 className="fw-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <i className="bi bi-truck text-success me-2"></i> Create Delivery Partner
          </h5>
          <form onSubmit={handleCreatePartner}>
            <input placeholder="Full Name" className="form-control fc-input mb-2" value={newPartner.name} onChange={e => setNewPartner({ ...newPartner, name: e.target.value })} required />
            <input type="email" placeholder="Email" className="form-control fc-input mb-2" value={newPartner.email} onChange={e => setNewPartner({ ...newPartner, email: e.target.value })} required />
            <input type="password" placeholder="Password" className="form-control fc-input mb-2" value={newPartner.password} onChange={e => setNewPartner({ ...newPartner, password: e.target.value })} required />
            <input type="tel" placeholder="Phone Number" className="form-control fc-input mb-2" value={newPartner.phone} onChange={e => setNewPartner({ ...newPartner, phone: e.target.value })} required />
            <select className="form-select fc-input mb-3" value={newPartner.vehicleType} onChange={e => setNewPartner({ ...newPartner, vehicleType: e.target.value })}>
              <option value="Bike">🚲 Bike</option>
              <option value="Scooter">🛵 Scooter</option>
              <option value="Van">🚐 Van</option>
              <option value="Truck">🚛 Truck</option>
            </select>
            <button type="submit" className="btn w-100 fw-bold text-white rounded-3 py-2 fc-primary">Create Partner</button>
          </form>
        </div>
      )}

      {/* Live Tracking Tab */}
      {activeTab === 'tracking' && (
        <div>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '10px', height: '10px', background: '#22c55e', animation: 'pulse 2s infinite' }}></div>
              <span className="fw-semibold text-muted" style={{ fontSize: '13px' }}>{activeDeliveries.length} Active Deliveries</span>
            </div>
            <button onClick={fetchActiveDeliveries} className="btn btn-sm fw-medium rounded-3 px-3 py-1" style={{ border: '1px solid #e5e7eb', fontSize: '12px' }}>
              <i className="bi bi-arrow-clockwise me-1"></i> Refresh
            </button>
          </div>

          {activeDeliveries.length === 0 ? (
            <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗺️</div>
              <p className="text-muted fw-medium mb-1">No active deliveries right now</p>
              <small className="text-muted">Active deliveries will appear here with live location tracking</small>
            </div>
          ) : (
            <div className="row g-4">
              {/* Delivery List */}
              <div className="col-lg-4 d-flex flex-column gap-3" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {activeDeliveries.map(order => (
                  <div
                    key={order._id}
                    onClick={() => setSelectedDelivery(order)}
                    className={`card border-0 shadow-sm rounded-4 p-3 ${selectedDelivery?._id === order._id ? 'border-2' : ''}`}
                    style={{ cursor: 'pointer', borderColor: selectedDelivery?._id === order._id ? '#7c3aed' : undefined }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <p className="fw-bold mb-0" style={{ fontSize: '13px' }}>#{order._id.slice(-6).toUpperCase()}</p>
                      <span className="badge bg-purple bg-opacity-10 text-purple" style={{ fontSize: '10px', color: '#7c3aed', background: '#f3e8ff' }}>{order.orderStatus}</span>
                    </div>
                    <p className="text-muted mb-1" style={{ fontSize: '12px' }}>
                      <i className="bi bi-person me-1"></i>{order.userId?.name}
                    </p>
                    <p className="text-muted mb-1" style={{ fontSize: '12px' }}>
                      <i className="bi bi-truck me-1"></i>{order.deliveryPartnerId?.name || 'Unassigned'}
                    </p>
                    {deliveryLocations[order._id] && (
                      <div className="d-flex align-items-center gap-1 mt-1">
                        <span className="rounded-circle d-inline-block" style={{ width: '6px', height: '6px', background: '#22c55e' }}></span>
                        <small className="text-success" style={{ fontSize: '10px' }}>Location updating live</small>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Map View */}
              <div className="col-lg-8">
                {selectedDelivery ? (
                  <DeliveryTrackingMap
                    deliveryLocation={deliveryLocations[selectedDelivery._id] || null}
                    customerLocation={customerLocations[selectedDelivery._id] || null}
                    customerAddress={selectedDelivery.deliveryAddress ? `${selectedDelivery.deliveryAddress.street}, ${selectedDelivery.deliveryAddress.city}` : undefined}
                    orderTitle={`Order #${selectedDelivery._id.slice(-6).toUpperCase()}`}
                    height="500px"
                    followDelivery={true}
                    className="shadow-sm d-none d-lg-block"
                  />
                ) : (
                  <div className="card border-0 shadow-sm rounded-4 d-none d-lg-flex align-items-center justify-content-center" style={{ height: '500px' }}>
                    <div className="text-center text-muted">
                      <div style={{ fontSize: '48px', marginBottom: '12px' }}>👈</div>
                      <p className="fw-medium">Select a delivery to view on map</p>
                      <small>All active delivery locations will be tracked in real-time</small>
                    </div>
                  </div>
                )}

                {selectedDelivery && (
                  <div className="card border-0 shadow-sm rounded-4 p-3 mt-3 mt-lg-0">
                    <div className="row g-3">
                      <div className="col-md-4">
                        <small className="text-muted d-block mb-1" style={{ fontSize: '11px' }}>Order</small>
                        <p className="fw-bold mb-0" style={{ fontSize: '13px' }}>#{selectedDelivery._id.slice(-6).toUpperCase()}</p>
                      </div>
                      <div className="col-md-4">
                        <small className="text-muted d-block mb-1" style={{ fontSize: '11px' }}>Customer</small>
                        <p className="fw-medium mb-0" style={{ fontSize: '13px' }}>{selectedDelivery.userId?.name}</p>
                      </div>
                      <div className="col-md-4">
                        <small className="text-muted d-block mb-1" style={{ fontSize: '11px' }}>Delivery Partner</small>
                        <p className="fw-medium mb-0" style={{ fontSize: '13px' }}>{selectedDelivery.deliveryPartnerId?.name || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
