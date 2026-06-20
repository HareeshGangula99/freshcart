import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface PhoneLoginProps {
  mode: 'login' | 'signup';
}

const PhoneLogin: React.FC<PhoneLoginProps> = ({ mode }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
      await authService.sendOtp({ phone: formattedPhone });
      setStep('otp');
      setCountdown(30);
    } catch (err: any) {
      console.error('OTP send error:', err);
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
      const res = await authService.verifyOtp({ phone: formattedPhone, otp });
      login(res.data.token, res.data);
      navigate('/');
    } catch (err: any) {
      console.error('OTP verify error:', err);
      setError(err.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {step === 'phone' ? (
        <>
          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: '13px', color: '#374151' }}>
              Mobile Number
            </label>
            <div className="position-relative">
              <i className="bi bi-phone position-absolute" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}></i>
              <span className="position-absolute fw-semibold" style={{ left: '42px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#374151' }}>+91</span>
              <input
                type="tel"
                className="form-control fc-input"
                style={{ paddingLeft: '78px' }}
                placeholder="Enter 10-digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendOtp}
            disabled={loading || phone.length < 10}
            className="btn w-100 fw-bold text-white rounded-3 py-2 fc-primary"
            style={{ fontSize: '14px', boxShadow: '0 4px 14px -3px rgba(5,150,105,0.4)' }}
          >
            {loading ? (
              <span className="d-flex align-items-center justify-content-center gap-2">
                <span className="spinner-border spinner-border-sm" role="status"></span> Sending OTP...
              </span>
            ) : (
              <>Send OTP <i className="bi bi-arrow-right"></i></>
            )}
          </button>
        </>
      ) : (
        <>
          <div className="mb-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <label className="form-label fw-semibold mb-0" style={{ fontSize: '13px', color: '#374151' }}>
                Enter OTP
              </label>
              <button type="button" className="btn btn-sm p-0 fw-medium" style={{ fontSize: '12px', color: '#059669' }}
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}>
                <i className="bi bi-arrow-left me-1"></i>Change number
              </button>
            </div>
            <p className="text-muted mb-2" style={{ fontSize: '12px' }}>
              OTP sent to <strong>+91{phone}</strong>
            </p>
            <div className="position-relative">
              <i className="bi bi-shield-lock position-absolute" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}></i>
              <input
                type="tel"
                className="form-control fc-input"
                style={{ paddingLeft: '42px', letterSpacing: '6px', fontSize: '18px', fontWeight: 600 }}
                placeholder="------"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleVerifyOtp}
            disabled={loading || otp.length !== 6}
            className="btn w-100 fw-bold text-white rounded-3 py-2 fc-primary"
            style={{ fontSize: '14px', boxShadow: '0 4px 14px -3px rgba(5,150,105,0.4)' }}
          >
            {loading ? (
              <span className="d-flex align-items-center justify-content-center gap-2">
                <span className="spinner-border spinner-border-sm" role="status"></span> Verifying...
              </span>
            ) : (
              <>Verify & {mode === 'login' ? 'Sign In' : 'Create Account'} <i className="bi bi-arrow-right"></i></>
            )}
          </button>

          <div className="text-center mt-2">
            {countdown > 0 ? (
              <small className="text-muted" style={{ fontSize: '12px' }}>Resend OTP in {countdown}s</small>
            ) : (
              <button type="button" className="btn btn-sm p-0 fw-medium" style={{ fontSize: '12px', color: '#059669' }}
                onClick={handleSendOtp} disabled={loading}>
                Resend OTP
              </button>
            )}
          </div>
        </>
      )}

      {error && (
        <div className="alert d-flex align-items-center gap-2 mt-3" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px' }}>
          <i className="bi bi-exclamation-circle-fill"></i>
          {error}
        </div>
      )}
    </div>
  );
};

export default PhoneLogin;
