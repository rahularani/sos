import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import { UYRA_COLORS, UyraBrand, API_BASE_URL } from './uyra_shared';
import { SUPPORTED_LANGUAGES, STORAGE_KEY } from './i18n/languages';

interface CitizenAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any, token: string) => void;
}

type AuthMode = 'login' | 'register' | 'verify-otp' | 'forgot' | 'reset-password';

export function CitizenAuthModal({ isOpen, onClose, onAuthSuccess }: CitizenAuthModalProps) {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Selected language for registration and profile (default to current active language)
  const [selectedLanguage, setSelectedLanguage] = useState<string>(i18n.language || 'en');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetApiBase = API_BASE_URL.startsWith('http') ? API_BASE_URL : '/api';

  const handleLanguageChange = (code: string) => {
    setSelectedLanguage(code);
    i18n.changeLanguage(code);
    localStorage.setItem(STORAGE_KEY, code);
  };

  // ---------------------------------------------------------------------------
  // Citizen Register
  // ---------------------------------------------------------------------------
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      // Include preferredLanguage payload in preparation for future backend profile support
      const payload = {
        email,
        password,
        fullName,
        phoneNumber,
        preferredLanguage: selectedLanguage,
      };

      const res = await fetch(`${targetApiBase}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setSuccessMessage(t('auth:codeSentTo') + ` ${email}`);
      setMode('verify-otp');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating account');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Verify OTP
  // ---------------------------------------------------------------------------
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch(`${targetApiBase}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, purpose: 'SIGNUP' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      // Preserve selected language preference across authentication
      localStorage.setItem(STORAGE_KEY, selectedLanguage);
      i18n.changeLanguage(selectedLanguage);

      localStorage.setItem('uyra_citizen_token', data.accessToken);
      localStorage.setItem('uyra_citizen_user', JSON.stringify({ ...data.user, preferredLanguage: selectedLanguage }));
      onAuthSuccess(data.user, data.accessToken);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Resend OTP
  // ---------------------------------------------------------------------------
  const handleResendOtp = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${targetApiBase}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: mode === 'verify-otp' ? 'SIGNUP' : 'FORGOT_PASSWORD' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccessMessage('Fresh verification code sent to your email.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Citizen Login
  // ---------------------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch(`${targetApiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          setMode('verify-otp');
          setSuccessMessage(t('auth:codeSentTo') + ` ${email}`);
          return;
        }
        throw new Error(data.message || 'Invalid credentials');
      }

      // If user profile has preferredLanguage, honor it
      if (data.user?.preferredLanguage) {
        localStorage.setItem(STORAGE_KEY, data.user.preferredLanguage);
        i18n.changeLanguage(data.user.preferredLanguage);
      }

      localStorage.setItem('uyra_citizen_token', data.accessToken);
      localStorage.setItem('uyra_citizen_user', JSON.stringify(data.user));
      onAuthSuccess(data.user, data.accessToken);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Forgot Password Request
  // ---------------------------------------------------------------------------
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch(`${targetApiBase}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSuccessMessage('Password reset code sent to your email.');
      setMode('reset-password');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Reset Password with OTP
  // ---------------------------------------------------------------------------
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch(`${targetApiBase}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      localStorage.setItem('uyra_citizen_token', data.accessToken);
      localStorage.setItem('uyra_citizen_user', JSON.stringify(data.user));
      onAuthSuccess(data.user, data.accessToken);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Google OAuth Success
  // ---------------------------------------------------------------------------
  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`${targetApiBase}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Google login failed');

      // Preserve active language
      const activeLang = localStorage.getItem(STORAGE_KEY) || i18n.language || 'en';
      localStorage.setItem(STORAGE_KEY, activeLang);
      i18n.changeLanguage(activeLang);

      localStorage.setItem('uyra_citizen_token', data.accessToken);
      localStorage.setItem('uyra_citizen_user', JSON.stringify(data.user));
      onAuthSuccess(data.user, data.accessToken);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed Google authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 1060,
      }}
    >
      <div
        className="card rounded-4 border-0 shadow-24 w-100 bg-white position-relative overflow-hidden"
        style={{ maxWidth: 460 }}
      >
        {/* Top Header bar with Language Switcher and Close Button */}
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
          <UyraBrand size="sm" />
          <div className="d-flex align-items-center gap-2">
            {/* Modal Language Selector */}
            <div className="d-flex align-items-center gap-1">
              <Globe size={13} className="text-danger" />
              <select
                className="form-select form-select-sm py-0 ps-2 pe-4 rounded-pill border-secondary small"
                style={{ fontSize: '0.75rem', width: 'auto' }}
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                aria-label="Language selection"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-sm btn-light rounded-circle p-1 text-muted"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Status Messages */}
          {errorMessage && (
            <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="alert alert-success py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* MODE: SIGN IN                                                    */}
          {/* ---------------------------------------------------------------- */}
          {mode === 'login' && (
            <div>
              <div className="text-center mb-4">
                <h4 className="fw-black text-dark mb-1">{t('auth:signInTitle')}</h4>
                <p className="text-muted small mb-0">{t('auth:signInSubtitle')}</p>
              </div>

              {/* Google One-Click Button */}
              <div className="d-flex justify-content-center mb-3">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErrorMessage('Google Sign-In failed or was closed.')}
                  shape="pill"
                  size="large"
                  text="signin_with"
                  width="360"
                />
              </div>

              <div className="position-relative text-center my-4">
                <hr className="text-muted m-0" />
                <span
                  className="position-absolute top-50 start-50 translate-middle bg-white px-3 text-muted"
                  style={{ whiteSpace: "nowrap", fontSize: "0.82rem", letterSpacing: "0.01em" }}
                >
                  {t('auth:orSignInEmail')}
                </span>
              </div>

              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">{t('auth:emailLabel')}</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <Mail size={16} className="text-muted" />
                    </span>
                    <input
                      type="email"
                      className="form-control rounded-end-3"
                      placeholder={t('auth:emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="mb-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <label className="form-label small fw-bold text-dark mb-0">{t('auth:passwordLabel')}</label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="btn btn-link p-0 small text-danger text-decoration-none"
                      style={{ fontSize: '0.78rem' }}
                    >
                      {t('auth:forgotPassword')}
                    </button>
                  </div>
                  <div className="input-group mt-1">
                    <span className="input-group-text bg-light border-end-0">
                      <Lock size={16} className="text-muted" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder={t('auth:passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary rounded-end-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-danger w-100 py-2 rounded-pill fw-bold mt-4 d-flex align-items-center justify-content-center gap-2 shadow"
                  style={{ backgroundColor: UYRA_COLORS.primaryRed }}
                >
                  {loading ? <span className="spinner-border spinner-border-sm" /> : <ArrowRight size={16} />}
                  <span>{t('common:signIn')}</span>
                </button>
              </form>

              <div className="text-center mt-3 pt-3 border-top">
                <span className="text-muted small">{t('auth:newToUyra')} </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="btn btn-link p-0 small text-danger fw-bold text-decoration-none"
                >
                  {t('auth:createAnAccount')}
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* MODE: REGISTER                                                   */}
          {/* ---------------------------------------------------------------- */}
          {mode === 'register' && (
            <div>
              <div className="text-center mb-3">
                <h4 className="fw-black text-dark mb-1">{t('auth:createAccountTitle')}</h4>
                <p className="text-muted small mb-0">{t('auth:createAccountSubtitle')}</p>
              </div>

              {/* Google Fast Sign Up */}
              <div className="d-flex justify-content-center mb-3">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErrorMessage('Google Sign-In failed.')}
                  shape="pill"
                  size="large"
                  text="signup_with"
                  width="360"
                />
              </div>

              <div className="position-relative text-center my-4">
                <hr className="text-muted m-0" />
                <span
                  className="position-absolute top-50 start-50 translate-middle bg-white px-3 text-muted"
                  style={{ whiteSpace: "nowrap", fontSize: "0.82rem", letterSpacing: "0.01em" }}
                >
                  {t('auth:orRegisterEmail')}
                </span>
              </div>

              <form onSubmit={handleRegister}>
                <div className="mb-2">
                  <label className="form-label small fw-bold text-dark mb-1">{t('auth:fullNameLabel')}</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <User size={16} className="text-muted" />
                    </span>
                    <input
                      type="text"
                      className="form-control rounded-end-3"
                      placeholder={t('auth:fullNamePlaceholder')}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label small fw-bold text-dark mb-1">{t('auth:emailLabel')}</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <Mail size={16} className="text-muted" />
                    </span>
                    <input
                      type="email"
                      className="form-control rounded-end-3"
                      placeholder={t('auth:emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label small fw-bold text-dark mb-1">{t('auth:phoneLabel')}</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <Phone size={16} className="text-muted" />
                    </span>
                    <input
                      type="tel"
                      className="form-control rounded-end-3"
                      placeholder="+91 98765 43210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>

                {/* Signup Language Preference Selection */}
                <div className="mb-2">
                  <label className="form-label small fw-bold text-dark mb-1 d-flex align-items-center gap-1">
                    <Globe size={14} className="text-danger" />
                    <span>{t('auth:preferredLanguageLabel')}</span>
                  </label>
                  <select
                    className="form-select form-select-sm rounded-3"
                    value={selectedLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.nativeName} ({l.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark mb-1">{t('auth:passwordLabel')}</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <Lock size={16} className="text-muted" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder={t('auth:passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary rounded-end-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-danger w-100 py-2 rounded-pill fw-bold shadow mt-2"
                  style={{ backgroundColor: UYRA_COLORS.primaryRed }}
                >
                  {loading ? <span className="spinner-border spinner-border-sm" /> : t('auth:getVerificationCode')}
                </button>
              </form>

              <div className="text-center mt-3 pt-3 border-top">
                <span className="text-muted small">{t('auth:alreadyRegistered')} </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="btn btn-link p-0 small text-danger fw-bold text-decoration-none"
                >
                  {t('common:signIn')}
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* MODE: VERIFY OTP                                                 */}
          {/* ---------------------------------------------------------------- */}
          {mode === 'verify-otp' && (
            <div className="text-center">
              <div
                className="rounded-circle mx-auto p-3 d-flex align-items-center justify-content-center text-danger mb-3 bg-danger bg-opacity-10"
                style={{ width: 60, height: 60 }}
              >
                <ShieldCheck size={32} />
              </div>
              <h4 className="fw-black text-dark mb-1">{t('auth:enterCodeTitle')}</h4>
              <p className="text-muted small mb-3">
                {t('auth:codeSentTo')} <strong className="text-dark">{email}</strong>
              </p>

              <form onSubmit={handleVerifyOtp}>
                <div className="mb-3">
                  <input
                    type="text"
                    maxLength={6}
                    className="form-control text-center font-monospace fw-bold fs-3 rounded-3"
                    style={{ letterSpacing: '8px' }}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="btn btn-danger w-100 py-2 rounded-pill fw-bold shadow mb-3"
                  style={{ backgroundColor: UYRA_COLORS.primaryRed }}
                >
                  {loading ? <span className="spinner-border spinner-border-sm" /> : t('auth:verifyButton')}
                </button>
              </form>

              <div className="d-flex align-items-center justify-content-between small">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="btn btn-link p-0 small text-secondary text-decoration-none d-flex align-items-center gap-1"
                >
                  <RefreshCw size={13} />
                  <span>{t('auth:resendCode')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="btn btn-link p-0 small text-danger text-decoration-none"
                >
                  {t('auth:changeEmail')}
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* MODE: FORGOT PASSWORD                                            */}
          {/* ---------------------------------------------------------------- */}
          {mode === 'forgot' && (
            <div>
              <div className="text-center mb-3">
                <div
                  className="rounded-circle mx-auto p-3 d-flex align-items-center justify-content-center text-dark mb-3 bg-light border"
                  style={{ width: 56, height: 56 }}
                >
                  <KeyRound size={26} className="text-danger" />
                </div>
                <h4 className="fw-black text-dark mb-1">{t('auth:resetPasswordTitle')}</h4>
                <p className="text-muted small mb-0">{t('auth:resetPasswordSubtitle')}</p>
              </div>

              <form onSubmit={handleForgotPassword}>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">{t('auth:emailLabel')}</label>
                  <input
                    type="email"
                    className="form-control rounded-3"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-danger w-100 py-2 rounded-pill fw-bold shadow"
                  style={{ backgroundColor: UYRA_COLORS.primaryRed }}
                >
                  {loading ? <span className="spinner-border spinner-border-sm" /> : t('auth:sendResetCode')}
                </button>
              </form>

              <div className="text-center mt-3 pt-3 border-top">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="btn btn-link p-0 small text-muted text-decoration-none"
                >
                  {t('auth:backToSignIn')}
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* MODE: RESET PASSWORD WITH OTP                                    */}
          {/* ---------------------------------------------------------------- */}
          {mode === 'reset-password' && (
            <div>
              <div className="text-center mb-3">
                <h4 className="fw-black text-dark mb-1">{t('auth:setNewPasswordTitle')}</h4>
                <p className="text-muted small mb-0">Enter the 6-digit code sent to your email and your new password.</p>
              </div>

              <form onSubmit={handleResetPassword}>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark mb-1">{t('auth:sixDigitCode')}</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="form-control text-center font-monospace fw-bold fs-4 rounded-3"
                    style={{ letterSpacing: '6px' }}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark mb-1">{t('auth:newPasswordLabel')}</label>
                  <div className="input-group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary rounded-end-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="btn btn-danger w-100 py-2 rounded-pill fw-bold shadow"
                  style={{ backgroundColor: UYRA_COLORS.primaryRed }}
                >
                  {loading ? <span className="spinner-border spinner-border-sm" /> : t('auth:updatePasswordButton')}
                </button>
              </form>

              <div className="text-center mt-3 pt-3 border-top">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="btn btn-link p-0 small text-muted text-decoration-none"
                >
                  {t('auth:backToSignIn')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
