import React, { useState, useEffect } from 'react';

const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa_install_dismissed') === 'true');

  useEffect(() => {
    if (dismissed) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const timer = setTimeout(() => {
      if (!showInstall && !dismissed) setShowManual(true);
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, [dismissed, showInstall]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
      setShowManual(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowInstall(false);
    setShowManual(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  if (dismissed) return null;

  if (showInstall) {
    return (
      <div className="rounded-3 p-2 mb-2" style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: '1px solid #a7f3d0' }}>
        <div className="d-flex align-items-center justify-content-between mb-1">
          <small className="fw-bold" style={{ fontSize: '11px', color: '#059669' }}>
            <i className="bi bi-phone me-1"></i> Install FreshCart
          </small>
          <button onClick={handleDismiss} className="btn btn-sm border-0 p-0" style={{ fontSize: '12px', color: '#9ca3af' }}>
            <i className="bi bi-x"></i>
          </button>
        </div>
        <button onClick={handleInstall} className="btn btn-sm w-100 fw-bold text-white rounded-2 py-1" style={{ fontSize: '12px', background: '#059669' }}>
          <i className="bi bi-download me-1"></i> Install Now
        </button>
      </div>
    );
  }

  if (showManual) {
    return (
      <div className="rounded-3 p-2 mb-2" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
        <div className="d-flex align-items-center justify-content-between mb-1">
          <small className="fw-semibold" style={{ fontSize: '11px', color: '#374151' }}>
            <i className="bi bi-phone me-1"></i> Install FreshCart
          </small>
          <button onClick={handleDismiss} className="btn btn-sm border-0 p-0" style={{ fontSize: '12px', color: '#9ca3af' }}>
            <i className="bi bi-x"></i>
          </button>
        </div>
        <small className="d-block" style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.5 }}>
          Tap <i className="bi bi-three-dots-vertical mx-1"></i> (browser menu) → <strong>"Add to Home Screen"</strong>
        </small>
      </div>
    );
  }

  return null;
};

export default InstallPWA;
