import React, { useState, useEffect } from 'react';

const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstall(false);
    setDeferredPrompt(null);
  };

  if (!showInstall) return null;

  return (
    <button
      onClick={handleInstall}
      className="btn d-flex align-items-center gap-2 w-100 rounded-3 border-0 fw-medium"
      style={{ fontSize: '13px', padding: '10px 14px', background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', color: '#059669', border: '1px solid #a7f3d0' }}
    >
      <i className="bi bi-phone" style={{ fontSize: '16px' }}></i>
      Install App
    </button>
  );
};

export default InstallPWA;
