import React, { useState, useEffect } from 'react';
import { adminService, productService } from '../services/api';
import { uploadImage } from '../services/upload';
import { getSocket } from '../services/socket';
import DeliveryTrackingMap from '../components/DeliveryTrackingMap';

const socket = getSocket();

const UOM_OPTIONS = [
  { value: 'kg', label: 'Kilogram (kg)', short: 'kg' },
  { value: 'g', label: 'Gram (g)', short: 'g' },
  { value: 'qty', label: 'Quantity (qty)', short: 'qty' },
  { value: 'ltr', label: 'Litre (ltr)', short: 'ltr' },
  { value: 'ml', label: 'Millilitre (ml)', short: 'ml' },
  { value: 'dozen', label: 'Dozen', short: 'dozen' },
  { value: 'piece', label: 'Piece', short: 'pc' },
];

const ROWS_PER_PAGE = 8;

const AdminDashboard: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryList, setCategoryList] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, categories: [] as string[], uom: 'qty', uomValue: 1, description: '', stockQuantity: 10 });
  const [editProduct, setEditProduct] = useState<any>(null);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [newPartner, setNewPartner] = useState({ name: '', email: '', password: '', phone: '', vehicleType: 'Bike' });
  const [activeTab, setActiveTab] = useState<'products' | 'approvals' | 'partners' | 'categories' | 'tracking' | 'settings' | 'users' | 'offers' | 'premium'>('products');
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
  const [storeSettings, setStoreSettings] = useState({ handlingFee: 5, gstRate: 5, freeDeliveryAbove: 200, deliveryFee: 30 });
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allPartners, setAllPartners] = useState<any[]>([]);
  const [userOffers, setUserOffers] = useState<any[]>([]);
  const [premiumPlans, setPremiumPlans] = useState<any[]>([]);
  const [premiumSubscribers, setPremiumSubscribers] = useState<any[]>([]);
  const [newOffer, setNewOffer] = useState({ name: '', userIds: [] as string[], freeDeliveryAbove: 0, deliveryFee: 0, expiresAt: '' });
  const [selectedOfferUsers, setSelectedOfferUsers] = useState<string[]>([]);
  const [offerUserSearch, setOfferUserSearch] = useState('');
  const [newPlan, setNewPlan] = useState({ name: '', type: 'monthly' as 'weekly' | 'monthly', price: 0, freeDeliveryAbove: 0, deliveryFee: 0, discountPercent: 0 });

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (activeTab === 'tracking') {
      fetchActiveDeliveries();
    }
    if (activeTab === 'settings') {
      adminService.getSettings().then(res => setStoreSettings(res.data)).catch(() => {});
    }
    if (activeTab === 'users') {
      adminService.getAllUsers().then(res => setAllUsers(res.data)).catch(() => {});
    }
    if (activeTab === 'partners') {
      adminService.getDeliveryPartners().then(res => setAllPartners(res.data)).catch(() => {});
    }
    if (activeTab === 'offers') {
      adminService.getUserOffers().then(res => setUserOffers(res.data)).catch(() => {});
      adminService.getAllUsers().then(res => setAllUsers(res.data)).catch(() => {});
    }
    if (activeTab === 'premium') {
      adminService.getPremiumPlans().then(res => setPremiumPlans(res.data)).catch(() => {});
      adminService.getPremiumSubscribers().then(res => setPremiumSubscribers(res.data)).catch(() => {});
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
        uomValue: newProduct.uomValue,
        description: newProduct.description,
        stockQuantity: newProduct.stockQuantity,
        imageURL,
      });

      fetchData();
      setNewProduct({ name: '', price: 0, categories: [], uom: 'qty', uomValue: 1, description: '', stockQuantity: 10 });
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
        uomValue: editProduct.uomValue,
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
    { id: 'partners' as const, label: 'Partners', icon: 'bi-truck', count: allPartners.length },
    { id: 'users' as const, label: 'Users', icon: 'bi-person-lines-fill', count: allUsers.length },
    { id: 'offers' as const, label: 'User Offers', icon: 'bi-tag', count: userOffers.length },
    { id: 'premium' as const, label: 'Premium', icon: 'bi-gem', count: premiumPlans.length },
    { id: 'tracking' as const, label: 'Live Tracking', icon: 'bi-geo-alt' },
    { id: 'settings' as const, label: 'Settings', icon: 'bi-gear' },
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
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-end align-items-md-center justify-content-center p-0 p-sm-3" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
      <div className="card border-0 shadow-lg rounded-top-4 rounded-md-4 p-3 p-sm-4 animate-scale-in" style={{ maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px 16px 0 0' }}>
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
            <div className="d-flex gap-2">
              <input 
                type="number" 
                placeholder="Unit qty" 
                className="form-control fc-input" 
                style={{ width: '80px' }}
                min="1"
                value={data.uomValue || 1} 
                onChange={e => setData({ ...data, uomValue: Number(e.target.value) || 1 })} 
              />
              <select className="form-select fc-input flex-grow-1" value={data.uom || 'qty'} onChange={e => setData({ ...data, uom: e.target.value })}>
                {UOM_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <small className="text-muted" style={{ fontSize: '10px' }}>
              Price: ₹{data.price || 0} per {data.uomValue || 1} {UOM_OPTIONS.find(o => o.value === (data.uom || 'qty'))?.short || 'qty'}
            </small>
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
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2 gap-md-3">
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center justify-content-center rounded-3 fc-primary" style={{ width: '40px', height: '40px' }}>
            <i className="bi bi-shield-check text-white"></i>
          </div>
          <div>
            <h4 className="fw-bold mb-0" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '18px' }}>Admin Panel</h4>
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
      <div className="d-flex gap-1 p-1 rounded-3 mb-3 mb-md-4 scroll-x-isolate" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
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
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-end align-items-md-center justify-content-center p-0 p-md-3" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
          <div className="card border-0 shadow-lg rounded-top-4 rounded-md-4 p-3 p-md-4 animate-scale-in" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px 16px 0 0' }}>
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
          <div className="p-3 d-flex gap-2 align-items-center flex-wrap flex-sm-nowrap" style={{ borderBottom: '1px solid #f0f0f0' }}>
            <div className="position-relative flex-grow-1" style={{ minWidth: '150px' }}>
              <i className="bi bi-search position-absolute" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '13px' }}></i>
              <input type="text" className="form-control" style={{ paddingLeft: '36px', fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '8px' }} placeholder="Search products..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
            </div>
            <select className="form-select flex-shrink-0" style={{ width: 'auto', fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '8px' }} value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}>
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
        <div>
          <div className="card border-0 shadow-sm rounded-4 p-4 mb-3" style={{ maxWidth: '440px' }}>
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
          <div className="card border-0 shadow-sm rounded-4 p-4">
            <h5 className="fw-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Delivery Partners ({allPartners.length})</h5>
            {allPartners.length === 0 ? <p className="text-muted">No partners yet.</p> : (
              <div className="d-flex flex-column gap-2">
                {allPartners.map((p: any) => (
                  <div key={p._id} className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <div>
                      <h6 className="fw-bold mb-0" style={{ fontSize: '14px' }}>{p.name}</h6>
                      <small className="text-muted" style={{ fontSize: '11px' }}>{p.email} • {p.vehicleType} • ★ {p.rating}</small>
                    </div>
                    <button onClick={async () => { await adminService.blockDeliveryPartner(p._id, !p.isBlocked); setAllPartners(allPartners.map((x: any) => x._id === p._id ? { ...x, isBlocked: !x.isBlocked } : x)); }}
                      className="btn btn-sm fw-semibold rounded-2 px-3 py-1"
                      style={{ fontSize: '12px', background: p.isBlocked ? '#fef2f2' : '#f0fdf4', color: p.isBlocked ? '#dc2626' : '#059669', border: `1px solid ${p.isBlocked ? '#fecaca' : '#dcfce7'}` }}>
                      {p.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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

      {/* User Offers Tab */}
      {activeTab === 'offers' && (
        <div>
          <div className="card border-0 shadow-sm rounded-4 p-4 mb-3" style={{ maxWidth: '540px' }}>
            <h5 className="fw-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <i className="bi bi-tag text-success me-2"></i> Create User Offer
            </h5>
            <input placeholder="Offer Name (e.g. VIP Group)" className="form-control fc-input mb-2" value={newOffer.name} onChange={e => setNewOffer({ ...newOffer, name: e.target.value })} required />
            <div className="row g-2 mb-2">
              <div className="col-6">
                <label className="form-label fw-medium" style={{ fontSize: '12px' }}>Free Delivery Above (₹)</label>
                <input type="number" className="form-control fc-input" value={newOffer.freeDeliveryAbove} onChange={e => setNewOffer({ ...newOffer, freeDeliveryAbove: Number(e.target.value) })} min={0} />
              </div>
              <div className="col-6">
                <label className="form-label fw-medium" style={{ fontSize: '12px' }}>Delivery Fee (₹)</label>
                <input type="number" className="form-control fc-input" value={newOffer.deliveryFee} onChange={e => setNewOffer({ ...newOffer, deliveryFee: Number(e.target.value) })} min={0} />
              </div>
            </div>
            <div className="mb-2">
              <label className="form-label fw-medium" style={{ fontSize: '12px' }}>Expires On (optional)</label>
              <input type="date" className="form-control fc-input" value={newOffer.expiresAt} onChange={e => setNewOffer({ ...newOffer, expiresAt: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label fw-medium" style={{ fontSize: '12px' }}>Select Users</label>
              <input type="text" className="form-control fc-input mb-2" placeholder="Search users..." style={{ fontSize: '12px' }}
                value={offerUserSearch} onChange={e => setOfferUserSearch(e.target.value)} />
              <div className="d-flex gap-2 mb-2">
                <button type="button" className="btn btn-sm rounded-2 fw-medium" style={{ fontSize: '11px', background: '#f0fdf4', color: '#059669', border: '1px solid #dcfce7' }}
                  onClick={() => {
                    const filtered = allUsers.filter((u: any) => u.name.toLowerCase().includes(offerUserSearch.toLowerCase()));
                    const allSelected = filtered.every((u: any) => selectedOfferUsers.includes(u._id));
                    if (allSelected) {
                      setSelectedOfferUsers(prev => prev.filter(id => !filtered.find((u: any) => u._id === id)));
                    } else {
                      const newIds = filtered.map((u: any) => u._id);
                      setSelectedOfferUsers(prev => [...new Set([...prev, ...newIds])]);
                    }
                  }}>
                  {allUsers.filter((u: any) => u.name.toLowerCase().includes(offerUserSearch.toLowerCase())).every((u: any) => selectedOfferUsers.includes(u._id)) ? 'Deselect All' : 'Select All'}
                </button>
                <span className="d-flex align-items-center text-muted" style={{ fontSize: '11px' }}>
                  {selectedOfferUsers.length} / {allUsers.length} selected
                </span>
              </div>
              <div className="d-flex flex-column gap-1 p-2 rounded-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', maxHeight: '200px', overflowY: 'auto' }}>
                {allUsers.filter((u: any) => u.name.toLowerCase().includes(offerUserSearch.toLowerCase())).length === 0 && (
                  <small className="text-muted text-center py-2" style={{ fontSize: '11px' }}>No users found</small>
                )}
                {allUsers.filter((u: any) => u.name.toLowerCase().includes(offerUserSearch.toLowerCase())).map((u: any) => (
                  <label key={u._id} className="d-flex align-items-center gap-2 px-2 py-1.5 rounded-2" style={{ fontSize: '12px', cursor: 'pointer', background: selectedOfferUsers.includes(u._id) ? '#ecfdf5' : '#fff', border: `1px solid ${selectedOfferUsers.includes(u._id) ? '#a7f3d0' : '#e5e7eb'}`, transition: 'all 0.15s ease' }}>
                    <input type="checkbox" className="form-check-input m-0" style={{ width: '14px', height: '14px' }}
                      checked={selectedOfferUsers.includes(u._id)}
                      onChange={() => setSelectedOfferUsers(prev => prev.includes(u._id) ? prev.filter(id => id !== u._id) : [...prev, u._id])} />
                    <span className="fw-medium">{u.name}</span>
                    <small className="text-muted ms-auto" style={{ fontSize: '10px' }}>{u.email}</small>
                  </label>
                ))}
              </div>
            </div>
            <button onClick={async () => {
              if (!newOffer.name || selectedOfferUsers.length === 0) return alert('Enter offer name and select users');
              await adminService.createUserOffer({ ...newOffer, userIds: selectedOfferUsers });
              setNewOffer({ name: '', userIds: [], freeDeliveryAbove: 0, deliveryFee: 0, expiresAt: '' });
              setSelectedOfferUsers([]);
              const res = await adminService.getUserOffers();
              setUserOffers(res.data);
            }} className="btn w-100 fw-bold text-white rounded-3 py-2 fc-primary">Create Offer</button>
          </div>
          <div className="card border-0 shadow-sm rounded-4 p-4">
            <h5 className="fw-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Active Offers ({userOffers.length})</h5>
            {userOffers.length === 0 ? <p className="text-muted">No offers yet.</p> : (
              <div className="d-flex flex-column gap-2">
                {userOffers.map((o: any) => (
                  <div key={o._id} className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ background: o.isActive ? '#f9fafb' : '#fef2f2', border: `1px solid ${o.isActive ? '#e5e7eb' : '#fecaca'}` }}>
                    <div>
                      <h6 className="fw-bold mb-0" style={{ fontSize: '14px' }}>{o.name}</h6>
                      <small className="text-muted" style={{ fontSize: '11px' }}>
                        {o.userIds?.length || 0} users • {o.freeDeliveryAbove ? `Free above ₹${o.freeDeliveryAbove}` : ''} {o.deliveryFee ? `• ₹${o.deliveryFee} delivery` : ''}
                        {o.expiresAt ? ` • Expires ${new Date(o.expiresAt).toLocaleDateString()}` : ''}
                      </small>
                    </div>
                    <div className="d-flex gap-1">
                      <button onClick={async () => { await adminService.toggleUserOffer(o._id); const res = await adminService.getUserOffers(); setUserOffers(res.data); }}
                        className="btn btn-sm fw-semibold rounded-2 px-2 py-1" style={{ fontSize: '11px', background: o.isActive ? '#fef2f2' : '#f0fdf4', color: o.isActive ? '#dc2626' : '#059669', border: `1px solid ${o.isActive ? '#fecaca' : '#dcfce7'}` }}>
                        {o.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={async () => { if (confirm('Delete this offer?')) { await adminService.deleteUserOffer(o._id); const res = await adminService.getUserOffers(); setUserOffers(res.data); } }}
                        className="btn btn-sm fw-semibold rounded-2 px-2 py-1" style={{ fontSize: '11px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Premium Tab */}
      {activeTab === 'premium' && (
        <div>
          <div className="card border-0 shadow-sm rounded-4 p-4 mb-3" style={{ maxWidth: '540px' }}>
            <h5 className="fw-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <i className="bi bi-gem text-success me-2"></i> Create Premium Plan
            </h5>
            <input placeholder="Plan Name (e.g. Weekly Gold)" className="form-control fc-input mb-2" value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} required />
            <div className="row g-2 mb-2">
              <div className="col-6">
                <label className="form-label fw-medium" style={{ fontSize: '12px' }}>Plan Type</label>
                <select className="form-select fc-input" value={newPlan.type} onChange={e => setNewPlan({ ...newPlan, type: e.target.value as 'weekly' | 'monthly' })}>
                  <option value="weekly">Weekly (7 days)</option>
                  <option value="monthly">Monthly (30 days)</option>
                </select>
              </div>
              <div className="col-6">
                <label className="form-label fw-medium" style={{ fontSize: '12px' }}>Price (₹)</label>
                <input type="number" className="form-control fc-input" value={newPlan.price} onChange={e => setNewPlan({ ...newPlan, price: Number(e.target.value) })} min={0} />
              </div>
            </div>
            <div className="row g-2 mb-2">
              <div className="col-4">
                <label className="form-label fw-medium" style={{ fontSize: '12px' }}>Free Delivery Above (₹)</label>
                <input type="number" className="form-control fc-input" value={newPlan.freeDeliveryAbove} onChange={e => setNewPlan({ ...newPlan, freeDeliveryAbove: Number(e.target.value) })} min={0} />
              </div>
              <div className="col-4">
                <label className="form-label fw-medium" style={{ fontSize: '12px' }}>Delivery Fee (₹)</label>
                <input type="number" className="form-control fc-input" value={newPlan.deliveryFee} onChange={e => setNewPlan({ ...newPlan, deliveryFee: Number(e.target.value) })} min={0} />
              </div>
              <div className="col-4">
                <label className="form-label fw-medium" style={{ fontSize: '12px' }}>Discount (%)</label>
                <input type="number" className="form-control fc-input" value={newPlan.discountPercent} onChange={e => setNewPlan({ ...newPlan, discountPercent: Number(e.target.value) })} min={0} max={50} />
              </div>
            </div>
            <button onClick={async () => {
              if (!newPlan.name || !newPlan.price) return alert('Enter plan name and price');
              await adminService.createPremiumPlan(newPlan);
              setNewPlan({ name: '', type: 'monthly', price: 0, freeDeliveryAbove: 0, deliveryFee: 0, discountPercent: 0 });
              const res = await adminService.getPremiumPlans();
              setPremiumPlans(res.data);
            }} className="btn w-100 fw-bold text-white rounded-3 py-2 fc-primary">Create Plan</button>
          </div>
          <div className="card border-0 shadow-sm rounded-4 p-4 mb-3">
            <h5 className="fw-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Premium Plans ({premiumPlans.length})</h5>
            {premiumPlans.length === 0 ? <p className="text-muted">No plans yet.</p> : (
              <div className="d-flex flex-column gap-2">
                {premiumPlans.map((plan: any) => (
                  <div key={plan._id} className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <div>
                      <h6 className="fw-bold mb-0" style={{ fontSize: '14px' }}>{plan.name} <span className="badge bg-success bg-opacity-10 text-success" style={{ fontSize: '10px' }}>{plan.type}</span></h6>
                      <small className="text-muted" style={{ fontSize: '11px' }}>₹{plan.price} • Free above ₹{plan.freeDeliveryAbove} • ₹{plan.deliveryFee} delivery • {plan.discountPercent}% off</small>
                    </div>
                    <div className="d-flex gap-1">
                      <button onClick={async () => { await adminService.deletePremiumPlan(plan._id); const res = await adminService.getPremiumPlans(); setPremiumPlans(res.data); }}
                        className="btn btn-sm fw-semibold rounded-2 px-2 py-1" style={{ fontSize: '11px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card border-0 shadow-sm rounded-4 p-4">
            <h5 className="fw-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Active Subscribers ({premiumSubscribers.length})</h5>
            {premiumSubscribers.length === 0 ? <p className="text-muted">No active subscribers.</p> : (
              <div className="d-flex flex-column gap-2">
                {premiumSubscribers.map((s: any) => (
                  <div key={s._id} className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ background: '#f0fdf4', border: '1px solid #dcfce7' }}>
                    <div>
                      <h6 className="fw-bold mb-0" style={{ fontSize: '14px' }}>{s.userId?.name}</h6>
                      <small className="text-muted" style={{ fontSize: '11px' }}>{s.planId?.name} • Expires {new Date(s.endDate).toLocaleDateString()}</small>
                    </div>
                    <span className="badge" style={{ background: '#dcfce7', color: '#059669', fontSize: '11px' }}>Active</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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
            <div className="row g-3 g-lg-4">
              {/* Delivery List */}
              <div className="col-12 col-lg-4 d-flex flex-column gap-3" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {activeDeliveries.map(order => (
                  <div
                    key={order._id}
                    onClick={() => setSelectedDelivery(order)}
                    onDoubleClick={(e) => e.preventDefault()}
                    className={`card border-0 shadow-sm rounded-4 p-3 ${selectedDelivery?._id === order._id ? 'border-2' : ''}`}
                    style={{ cursor: 'pointer', borderColor: selectedDelivery?._id === order._id ? '#7c3aed' : undefined, userSelect: 'none' }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <p className="fw-bold mb-0" style={{ fontSize: '13px' }}>#{order._id.slice(-6).toUpperCase()}</p>
                      <span className="badge rounded-pill" style={{ fontSize: '10px', color: order.orderStatus === 'OUT_FOR_DELIVERY' ? '#7c3aed' : order.orderStatus === 'DISPATCHED' ? '#2563eb' : '#059669', background: order.orderStatus === 'OUT_FOR_DELIVERY' ? '#f3e8ff' : order.orderStatus === 'DISPATCHED' ? '#dbeafe' : '#f0fdf4' }}>
                        {order.orderStatus === 'OUT_FOR_DELIVERY' ? 'Out for Delivery' : order.orderStatus === 'DISPATCHED' ? 'Dispatched' : order.orderStatus === 'CONFIRMED' ? 'Confirmed' : order.orderStatus}
                      </span>
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
              <div className="col-12 col-lg-8">
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
                      <div className="col-3 col-md-3">
                        <small className="text-muted d-block mb-1" style={{ fontSize: '11px' }}>Order</small>
                        <p className="fw-bold mb-0" style={{ fontSize: '13px' }}>#{selectedDelivery._id.slice(-6).toUpperCase()}</p>
                      </div>
                      <div className="col-3 col-md-3">
                        <small className="text-muted d-block mb-1" style={{ fontSize: '11px' }}>Customer</small>
                        <p className="fw-medium mb-0 text-truncate" style={{ fontSize: '13px' }}>{selectedDelivery.userId?.name}</p>
                      </div>
                      <div className="col-3 col-md-3">
                        <small className="text-muted d-block mb-1" style={{ fontSize: '11px' }}>Partner</small>
                        <p className="fw-medium mb-0 text-truncate" style={{ fontSize: '13px' }}>{selectedDelivery.deliveryPartnerId?.name || 'N/A'}</p>
                      </div>
                      <div className="col-3 col-md-3">
                        <small className="text-muted d-block mb-1" style={{ fontSize: '11px' }}>Status</small>
                        <span className="badge rounded-pill" style={{ fontSize: '11px', color: selectedDelivery.orderStatus === 'OUT_FOR_DELIVERY' ? '#7c3aed' : '#059669', background: selectedDelivery.orderStatus === 'OUT_FOR_DELIVERY' ? '#f3e8ff' : '#f0fdf4' }}>
                          {selectedDelivery.orderStatus === 'OUT_FOR_DELIVERY' ? 'Out for Delivery' : selectedDelivery.orderStatus === 'DISPATCHED' ? 'Dispatched' : selectedDelivery.orderStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="card border-0 shadow-soft rounded-4 p-4">
          <h5 className="fw-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Store Settings</h5>
          <div className="row g-4">
            <div className="col-md-3">
              <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>Handling Fee (₹)</label>
              <input type="number" className="form-control fc-input" value={storeSettings.handlingFee} onChange={e => setStoreSettings({ ...storeSettings, handlingFee: Number(e.target.value) })} min={0} />
              <small className="text-muted" style={{ fontSize: '11px' }}>Added to every order at checkout</small>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>GST Rate (%)</label>
              <input type="number" className="form-control fc-input" value={storeSettings.gstRate} onChange={e => setStoreSettings({ ...storeSettings, gstRate: Number(e.target.value) })} min={0} max={28} />
              <small className="text-muted" style={{ fontSize: '11px' }}>Applied on all products</small>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>Delivery Fee (₹)</label>
              <input type="number" className="form-control fc-input" value={storeSettings.deliveryFee} onChange={e => setStoreSettings({ ...storeSettings, deliveryFee: Number(e.target.value) })} min={0} />
              <small className="text-muted" style={{ fontSize: '11px' }}>Charged when below free delivery limit</small>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>Free Delivery Above (₹)</label>
              <input type="number" className="form-control fc-input" value={storeSettings.freeDeliveryAbove} onChange={e => setStoreSettings({ ...storeSettings, freeDeliveryAbove: Number(e.target.value) })} min={0} />
              <small className="text-muted" style={{ fontSize: '11px' }}>Orders above this get free delivery</small>
            </div>
          </div>
          <button onClick={() => { adminService.updateSettings(storeSettings).then(() => alert('Settings saved!')).catch(() => alert('Failed to save')); }} className="btn fw-bold text-white rounded-3 px-4 py-2 mt-4 fc-primary" style={{ fontSize: '14px' }}>
            <i className="bi bi-check-lg me-1"></i> Save Settings
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
