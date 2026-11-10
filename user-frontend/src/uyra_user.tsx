import React, { useState, useMemo, useEffect } from 'react';
import {
  Flame,
  Car,
  HeartPulse,
  Waves,
  Building2,
  HelpCircle,
  MapPin,
  Navigation,
  PhoneCall,
  CheckCircle2,
  Clock,
  Activity,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  Radio,
  FileText,
  Users,
  ShieldCheck,
  ArrowUpRight,
  RefreshCw,
  LayoutDashboard,
  LocateFixed,
  Globe,
  User,
  LogOut,
} from 'lucide-react';
import {
  UYRA_COLORS,
  EMERGENCY_CATEGORIES,
  PEOPLE_AFFECTED_OPTIONS,
  evaluateSmartSeverity,
  UyraBrand,
  InteractiveMapCanvas,
  API_BASE_URL,
} from './uyra_shared';
import { GoogleMapsCanvas } from './GoogleMapsCanvas';
import { CitizenAuthModal } from './CitizenAuthModal';
import { LanguageSelector } from './LanguageSelector';
import { useTranslation } from 'react-i18next';

interface UyraUserPortalProps {
  onSwitchToAdmin?: () => void;
  onSosSubmitted?: (newIncident: any) => void;
}

// Reverse geocoding helper via OpenStreetMap Nominatim
async function fetchAddressFromCoords(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: { 'User-Agent': 'UYRA-Emergency-Portal/1.0' },
      },
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch (e) {
    console.warn('Reverse geocoding lookup failed:', e);
  }
  return null;
}

// IP-based network location fallback
async function fetchIpLocation(): Promise<{ lat: number; lng: number; address: string } | null> {
  try {
    const res = await fetch('https://ipwho.is/');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.latitude && data.longitude) {
        const addr = [data.city, data.region, data.country].filter(Boolean).join(', ');
        return {
          lat: +data.latitude.toFixed(5),
          lng: +data.longitude.toFixed(5),
          address: addr || `Network Location (${data.city || 'Local Area'})`,
        };
      }
    }
  } catch (e) {
    console.warn('IP geolocation lookup failed:', e);
  }
  return null;
}

export default function UyraUserPortal({
  onSwitchToAdmin,
  onSosSubmitted,
}: UyraUserPortalProps) {
  const { t, i18n } = useTranslation(['emergency', 'common', 'auth']);
  // Screens: 'home' | 'report' | 'confirmation'
  const [publicScreen, setPublicScreen] = useState<'home' | 'report' | 'confirmation'>('home');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('Medical Emergency');
  const [formPeopleBracket, setFormPeopleBracket] = useState('1');
  const [formContactName, setFormContactName] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Citizen Authentication State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [citizenUser, setCitizenUser] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('uyra_citizen_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleLogoutCitizen = () => {
    localStorage.removeItem('uyra_citizen_token');
    localStorage.removeItem('uyra_citizen_user');
    setCitizenUser(null);
  };

  // Geolocation & Map Coordinates
  const [gpsStatus, setGpsStatus] = useState<'prompt' | 'locating' | 'granted' | 'network' | 'manual'>('prompt');
  const [formLat, setFormLat] = useState(11.0168);
  const [formLng, setFormLng] = useState(76.9558);
  const [formAccuracy, setFormAccuracy] = useState(10);
  const [formAddress, setFormAddress] = useState('Detecting current location...');
  const [locationSourceText, setLocationSourceText] = useState('Pending location lock');

  // Confirmation state
  const [submittedIncident, setSubmittedIncident] = useState<any>(null);

  // Live Smart Severity Preview
  const liveSeverityCalc = useMemo(() => {
    return evaluateSmartSeverity(formCategory, formPeopleBracket, formTitle, formDescription);
  }, [formCategory, formPeopleBracket, formTitle, formDescription]);

  // Request real device location with multi-layer fallback
  const requestBrowserLocation = async (silent = false) => {
    setGpsStatus('locating');
    setLocationSourceText('Acquiring precise GPS coordinates...');

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = +pos.coords.latitude.toFixed(5);
          const lng = +pos.coords.longitude.toFixed(5);
          const acc = Math.round(pos.coords.accuracy || 8);
          setFormLat(lat);
          setFormLng(lng);
          setFormAccuracy(acc);
          setGpsStatus('granted');
          setLocationSourceText(`Real Device GPS Locked (±${acc}m)`);

          // Reverse geocode to find real street / locality
          const realAddr = await fetchAddressFromCoords(lat, lng);
          if (realAddr) {
            setFormAddress(realAddr);
          } else {
            setFormAddress(`GPS Fix at ${lat}° N, ${lng}° E`);
          }
        },
        async (err) => {
          console.warn('Browser GPS permission error:', err.code, err.message);
          let reason = 'GPS Unavailable';
          if (err.code === 1) reason = 'Location Permission Denied in Browser Settings';
          else if (err.code === 2) reason = 'GPS Signal Weak / Position Unavailable';
          else if (err.code === 3) reason = 'GPS Request Timed Out';

          setGpsStatus('manual');
          setLocationSourceText(reason);
          setFormAddress('Location permission denied — tap map or enter landmark');
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    } else {
      setGpsStatus('manual');
      setLocationSourceText('Geolocation not supported by browser');
    }
  };

  const simulateGpsLock = async () => {
    setGpsStatus('locating');
    setLocationSourceText('Simulating high-precision GPS lock...');
    setTimeout(async () => {
      const jitterLat = +(11.0168 + (Math.random() - 0.5) * 0.015).toFixed(5);
      const jitterLng = +(76.9558 + (Math.random() - 0.5) * 0.015).toFixed(5);
      setFormLat(jitterLat);
      setFormLng(jitterLng);
      setFormAccuracy(6);
      setGpsStatus('granted');
      setLocationSourceText('Calibrated GPS Coordinates (±6m)');

      const rev = await fetchAddressFromCoords(jitterLat, jitterLng);
      if (rev) {
        setFormAddress(rev);
      } else {
        setFormAddress(`Peelamedu Central Sector (${jitterLat}° N, ${jitterLng}° E)`);
      }
    }, 400);
  };

  const [pendingCategory, setPendingCategory] = useState<string | null>(null);


  // Helper to translate category names and descriptions for display
  const getCategoryDetails = (catName: string) => {
    switch (catName) {
      case 'Fire Emergency':
        return { name: t('emergency:fire'), desc: t('emergency:fireDesc') };
      case 'Medical Emergency':
        return { name: t('emergency:medical'), desc: t('emergency:medicalDesc') };
      case 'Road Accident':
        return { name: t('emergency:roadAccident'), desc: t('emergency:roadDesc') };
      case 'Building Collapse':
        return { name: t('emergency:buildingCollapse'), desc: t('emergency:buildingDesc') };
      case 'Flood':
        return { name: t('emergency:flood'), desc: t('emergency:floodDesc') };
      case 'Other Emergencies':
        return { name: t('emergency:other'), desc: t('emergency:otherDesc') };
      default:
        return { name: catName, desc: '' };
    }
  };

  const startEmergencyReport = (category?: string) => {
    // Authentication requirement: User must be signed in before reporting
    if (!citizenUser) {
      if (category) setPendingCategory(category);
      setIsAuthModalOpen(true);
      return;
    }
    if (category) setFormCategory(category);
    setFormErrors({});
    setPublicScreen('report');
    requestBrowserLocation(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit SOS to NestJS REST API: POST /api/incidents
  const handleSosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formAddress.trim()) {
      errors.address = 'Please enter a landmark/address or use the map marker.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      title: formTitle.trim() || `${formCategory} SOS Alert`,
      description: formDescription.trim() || 'Emergency report transmitted via public SOS portal.',
      category: formCategory,
      peopleBracket: formPeopleBracket,
      contactName: formContactName.trim() || undefined,
      contactPhone: formContactPhone.trim() || undefined,
      latitude: formLat,
      longitude: formLng,
      accuracy: formAccuracy,
      address: formAddress.trim(),
      locationTimestamp: new Date().toISOString(),
    };

    try {
      // Direct relative call through Vite HTTPS proxy or configured base URL
      const targetUrl = API_BASE_URL.startsWith('http') ? API_BASE_URL : '/api';
      const response = await fetch(`${targetUrl}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`Server returned status ${response.status}: ${errBody}`);
      }

      const createdIncident = await response.json();
      setSubmittedIncident(createdIncident);
      setPublicScreen('confirmation');

      if (onSosSubmitted) {
        onSosSubmitted(createdIncident);
      }

      // Reset form
      setFormTitle('');
      setFormDescription('');
      setFormErrors({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Failed to submit SOS to backend API:', err);
      setSubmitError('Unable to reach emergency server. Please check connection or call 112 directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-light">
      {/* ------------------------------------------------------------------ */}
      {/* PUBLIC NAVBAR                                                      */}
      {/* ------------------------------------------------------------------ */}
      <nav
        className="navbar navbar-expand-lg border-bottom sticky-top shadow-sm px-3 py-2 bg-white"
        style={{ zIndex: 1040 }}
      >
        <div className="container-fluid d-flex align-items-center justify-content-between">
          <div
            style={{ cursor: 'pointer' }}
            onClick={() => setPublicScreen('home')}
          >
            <UyraBrand size="md" />
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Global Language Selector */}
            <LanguageSelector />

            <a
              href="tel:112"
              className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 rounded-pill fw-bold px-3 py-1"
            >
              <PhoneCall size={14} />
              <span>{t('common:call112')}</span>
            </a>

            {citizenUser ? (
              <div className="d-flex align-items-center gap-2">
                <div
                  className="d-flex align-items-center gap-1 px-2 py-1 rounded-pill bg-light border"
                  title={`Signed in as ${citizenUser.email}`}
                >
                  {citizenUser.avatarUrl ? (
                    <img
                      src={citizenUser.avatarUrl}
                      alt="avatar"
                      className="rounded-circle"
                      style={{ width: 20, height: 20, objectFit: 'cover' }}
                    />
                  ) : (
                    <User size={14} className="text-danger" />
                  )}
                  <span
                    className="small fw-semibold text-dark text-truncate d-none d-sm-inline"
                    style={{ maxWidth: 120 }}
                  >
                    {citizenUser.fullName || citizenUser.email?.split('@')[0]}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogoutCitizen}
                  className="btn btn-outline-secondary btn-sm rounded-circle p-1"
                  title={t('common:signOut')}
                >
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="btn btn-dark btn-sm d-flex align-items-center gap-1 rounded-pill fw-semibold px-3 py-1"
                style={{ backgroundColor: UYRA_COLORS.deepNavy }}
              >
                <User size={13} />
                <span>{t('common:signIn')}</span>
              </button>
            )}

            {publicScreen !== 'report' && (
              <button
                type="button"
                onClick={() => startEmergencyReport()}
                className="btn btn-danger btn-sm d-flex align-items-center gap-1 rounded-pill fw-black px-3 py-1 shadow-sm"
                style={{ backgroundColor: UYRA_COLORS.primaryRed, border: 'none' }}
              >
                <Radio size={14} className="spinner-grow-sm" />
                <span>{t('common:reportSos')}</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* SCREEN 1: PUBLIC LANDING                                           */}
      {/* ------------------------------------------------------------------ */}
      {publicScreen === 'home' && (
        <div className="container py-4" style={{ maxWidth: 960 }}>
          {/* Urgent Public Notice Banner */}
          <div
            className="alert border-0 rounded-4 p-3 mb-4 d-flex align-items-center gap-3 shadow-sm text-white"
            style={{ backgroundColor: UYRA_COLORS.deepNavy }}
          >
            <div
              className="rounded-circle p-2 d-flex align-items-center justify-content-center"
              style={{ backgroundColor: UYRA_COLORS.primaryRed }}
            >
              <AlertOctagon size={22} />
            </div>
            <div className="flex-grow-1">
              <div className="fw-bold fs-6">{t('emergency:urgentNoticeTitle')}</div>
              <div className="text-white-50 small">
                {t('emergency:urgentNoticeText')}
              </div>
            </div>
          </div>

          {/* Hero Action Card */}
          <div className="card border-0 rounded-4 shadow-sm p-4 text-center mb-4 bg-white">
            <span
              className="badge align-self-center px-3 py-2 rounded-pill fw-bold mb-3 text-uppercase"
              style={{
                backgroundColor: '#FEE2E2',
                color: UYRA_COLORS.primaryRed,
                letterSpacing: '0.08em',
              }}
            >
              {t('emergency:heroBadge')}
            </span>

            <h1 className="fw-black text-dark mb-2" style={{ fontWeight: 900 }}>
              {t('emergency:heroTitle')}
            </h1>
            <p className="text-secondary mb-4 mx-auto" style={{ maxWidth: 620 }}>
              {t('emergency:heroDesc')}
            </p>

            <div className="d-flex flex-column flex-sm-row justify-content-center align-items-center gap-3">
              <button
                type="button"
                onClick={() => startEmergencyReport()}
                className="btn btn-danger btn-lg rounded-pill px-5 py-3 fw-black shadow-lg d-flex align-items-center gap-2"
                style={{
                  backgroundColor: UYRA_COLORS.primaryRed,
                  fontSize: '1.15rem',
                  letterSpacing: '0.02em',
                }}
              >
                <Radio size={22} />
                <span>{t('emergency:tapToReport')}</span>
              </button>
            </div>
          </div>

          {/* Quick Category Grid */}
          <div className="mb-4">
            <h5 className="fw-bold text-dark mb-3">{t('emergency:chooseCategory')}</h5>
            <div className="row g-3">
              {EMERGENCY_CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <div key={cat.id} className="col-12 col-sm-6 col-md-4">
                    <div
                      onClick={() => startEmergencyReport(cat.name)}
                      className="card h-100 p-3 rounded-4 border-0 shadow-sm transition-all"
                      style={{
                        cursor: 'pointer',
                        backgroundColor: '#FFFFFF',
                        borderLeft: `4px solid ${cat.accent}`,
                      }}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="rounded-3 p-3 text-white d-flex align-items-center justify-content-center"
                          style={{ backgroundColor: cat.accent, width: 48, height: 48 }}
                        >
                          <IconComponent size={24} />
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="fw-bold text-dark mb-1">{getCategoryDetails(cat.name).name}</h6>
                          <p className="text-muted small mb-0">{getCategoryDetails(cat.name).desc}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Emergency Telephone Quick Dial */}
          <div className="card rounded-4 border-0 shadow-sm p-4 bg-white">
            <h6 className="fw-bold text-dark mb-3">{t('emergency:directHelplinesTitle')}</h6>
            <div className="row g-3">
              <div className="col-6 col-md-3">
                <a
                  href="tel:112"
                  className="btn btn-outline-danger w-100 rounded-3 p-3 text-center text-decoration-none"
                >
                  <div className="fw-black fs-4 text-danger">112</div>
                  <div className="small fw-semibold text-dark">{t('emergency:helpline112')}</div>
                </a>
              </div>
              <div className="col-6 col-md-3">
                <a
                  href="tel:108"
                  className="btn btn-outline-danger w-100 rounded-3 p-3 text-center text-decoration-none"
                >
                  <div className="fw-black fs-4 text-danger">108</div>
                  <div className="small fw-semibold text-dark">{t('emergency:helpline108')}</div>
                </a>
              </div>
              <div className="col-6 col-md-3">
                <a
                  href="tel:101"
                  className="btn btn-outline-danger w-100 rounded-3 p-3 text-center text-decoration-none"
                >
                  <div className="fw-black fs-4 text-danger">101</div>
                  <div className="small fw-semibold text-dark">{t('emergency:helpline101')}</div>
                </a>
              </div>
              <div className="col-6 col-md-3">
                <a
                  href="tel:100"
                  className="btn btn-outline-danger w-100 rounded-3 p-3 text-center text-decoration-none"
                >
                  <div className="fw-black fs-4 text-danger">100</div>
                  <div className="small fw-semibold text-dark">{t('emergency:helpline100')}</div>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SCREEN 2: PUBLIC SOS REPORTING FORM                                */}
      {/* ------------------------------------------------------------------ */}
      {publicScreen === 'report' && (!citizenUser ? (
        <div className="container py-5 text-center" style={{ maxWidth: 540 }}>
          <div className="card rounded-4 border-0 shadow-sm p-4 bg-white">
            <div
              className="rounded-circle mx-auto p-3 d-flex align-items-center justify-content-center text-danger mb-3 bg-danger bg-opacity-10"
              style={{ width: 68, height: 68 }}
            >
              <User size={34} />
            </div>
            <h4 className="fw-black text-dark mb-2">{t('emergency:authRequiredTitle')}</h4>
            <p className="text-secondary small mb-4">
              {t('emergency:authRequiredDesc')}
            </p>
            <div className="d-flex flex-column gap-2">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="btn btn-danger rounded-pill py-2 fw-bold shadow-sm"
                style={{ backgroundColor: UYRA_COLORS.primaryRed }}
              >
                {t('emergency:authRequiredButton')}
              </button>
              <button
                type="button"
                onClick={() => setPublicScreen('home')}
                className="btn btn-light border rounded-pill py-2 fw-semibold"
              >
                {t('common:returnHome')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="container py-4" style={{ maxWidth: 840 }}>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <button
              type="button"
              onClick={() => setPublicScreen('home')}
              className="btn btn-light border rounded-pill px-3 py-1 btn-sm fw-semibold"
            >
              ← {t('common:backToHome')}
            </button>
            <span className="badge bg-danger px-3 py-2 rounded-pill fw-bold">
              {t('common:step2Of2')}
            </span>
          </div>

          <div className="card rounded-4 border-0 shadow-sm p-4 bg-white mb-4">
            <div className="border-bottom pb-3 mb-4">
              <h3 className="fw-black text-dark mb-1" style={{ fontWeight: 900 }}>
                Emergency Incident Report
              </h3>
              <p className="text-secondary small mb-0">
                Please provide accurate details. Automatic location capture is attempted below. You can also adjust the pin or type an address manually.
              </p>
            </div>

            {submitError && (
              <div className="alert alert-danger rounded-3 py-2 px-3 small d-flex align-items-center gap-2 mb-3">
                <AlertTriangle size={16} />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSosSubmit}>
              {/* Category Picker */}
              <div className="mb-4">
                <label className="form-label fw-bold text-dark">
                  {t('emergency:categorySelectLabel')} <span className="text-danger">*</span>
                </label>
                <div className="row g-2">
                  {EMERGENCY_CATEGORIES.map((cat) => {
                    const isSelected = formCategory === cat.name;
                    const IconComp = cat.icon;
                    return (
                      <div key={cat.id} className="col-6 col-md-4">
                        <div
                          onClick={() => setFormCategory(cat.name)}
                          className={`p-3 rounded-3 border d-flex align-items-center gap-2 cursor-pointer transition-all ${
                            isSelected ? 'bg-danger text-white border-danger shadow-sm' : 'bg-light text-dark'
                          }`}
                          style={{ cursor: 'pointer' }}
                        >
                          <IconComp size={18} className={isSelected ? 'text-white' : 'text-danger'} />
                          <span className="fw-semibold small">{getCategoryDetails(cat.name).name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Title & Description (Optional) */}
              <div className="mb-3">
                <label className="form-label fw-bold text-dark">
                  {t('emergency:titleLabel')}
                </label>
                <input
                  type="text"
                  className="form-control rounded-3"
                  placeholder={t('emergency:titlePlaceholder')}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold text-dark">
                  {t('emergency:descLabel')}
                </label>
                <textarea
                  rows={3}
                  className="form-control rounded-3"
                  placeholder={t('emergency:descPlaceholder')}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              {/* People Affected */}
              <div className="mb-4">
                <label className="form-label fw-bold text-dark">
                  {t('emergency:peopleLabel')} <span className="text-danger">*</span>
                </label>
                <div className="row g-2">
                  {PEOPLE_AFFECTED_OPTIONS.map((opt) => (
                    <div key={opt.id} className="col-6 col-md-3">
                      <div
                        onClick={() => setFormPeopleBracket(opt.id)}
                        className={`p-2 rounded-3 text-center border cursor-pointer ${
                          formPeopleBracket === opt.id
                            ? 'bg-dark text-white border-dark fw-bold'
                            : 'bg-light text-dark'
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        {opt.id === '1'
                          ? t('emergency:people1')
                          : opt.id === '2-5'
                          ? t('emergency:people2to5')
                          : opt.id === '6-10'
                          ? t('emergency:people6to10')
                          : t('emergency:people10Plus')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Geolocation & Map Pin */}
              <div className="mb-4 p-3 rounded-4 bg-light border">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <MapPin size={18} className="text-danger" />
                    <span className="fw-bold text-dark">{t('emergency:locationHeader')}</span>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      onClick={() => requestBrowserLocation()}
                      className="btn btn-outline-danger btn-sm rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1"
                    >
                      <Navigation size={13} />
                      <span>{gpsStatus === 'locating' ? t('emergency:locating') : t('emergency:detectLocation')}</span>
                    </button>
                  </div>
                </div>

                {/* Real-time Status Badge */}
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span
                    className="badge rounded-pill d-flex align-items-center gap-1 px-3 py-1 fw-bold"
                    style={{
                      backgroundColor:
                        gpsStatus === 'granted'
                          ? '#DCFCE7'
                          : gpsStatus === 'network'
                          ? '#DBEAFE'
                          : gpsStatus === 'locating'
                          ? '#FEF3C7'
                          : '#F3F4F6',
                      color:
                        gpsStatus === 'granted'
                          ? '#15803D'
                          : gpsStatus === 'network'
                          ? '#1E40AF'
                          : gpsStatus === 'locating'
                          ? '#92400E'
                          : '#4B5563',
                      border: '1px solid currentColor',
                    }}
                  >
                    {gpsStatus === 'granted' && <LocateFixed size={12} />}
                    {gpsStatus === 'network' && <Globe size={12} />}
                    {gpsStatus === 'locating' && <RefreshCw size={12} className="spinner-border spinner-border-sm" />}
                    <span>{locationSourceText}</span>
                  </span>
                  <span className="text-muted small font-monospace">
                    [{formLat.toFixed(5)}°, {formLng.toFixed(5)}°]
                  </span>
                </div>

                <div className="mb-3">
                  <input
                    type="text"
                    className={`form-control form-control-sm rounded-3 ${formErrors.address ? 'is-invalid' : ''}`}
                    placeholder={t('emergency:addressPlaceholder')}
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                  {formErrors.address && <div className="invalid-feedback">{formErrors.address}</div>}
                  <div className="text-muted small mt-1">
                    {t('emergency:addressTip')}
                  </div>
                </div>

                <GoogleMapsCanvas
                  lat={formLat}
                  lng={formLng}
                  accuracy={formAccuracy}
                  address={formAddress}
                  interactive={true}
                  onCoordsChange={async (coords) => {
                    setFormLat(coords.lat);
                    setFormLng(coords.lng);
                    setGpsStatus('manual');
                    setLocationSourceText('Map Pin Calibrated');
                    if (coords.address) {
                      setFormAddress(coords.address);
                    } else {
                      const rev = await fetchAddressFromCoords(coords.lat, coords.lng);
                      if (rev) {
                        setFormAddress(rev);
                      }
                    }
                  }}
                  height={220}
                  fallbackComponent={
                    <InteractiveMapCanvas
                      lat={formLat}
                      lng={formLng}
                      accuracy={formAccuracy}
                      address={formAddress}
                      interactive={true}
                      onCoordsChange={async (coords) => {
                        setFormLat(coords.lat);
                        setFormLng(coords.lng);
                        setGpsStatus('manual');
                        setLocationSourceText('Map Pin Calibrated');
                        const rev = await fetchAddressFromCoords(coords.lat, coords.lng);
                        if (rev) {
                          setFormAddress(rev);
                        }
                      }}
                      height={220}
                    />
                  }
                />
              </div>

              {/* Optional Contact Details */}
              <div className="row g-3 mb-4">
                <div className="col-12 col-md-6">
                  <label className="form-label fw-bold text-dark small">
                    {t('emergency:contactNameLabel')}
                  </label>
                  <input
                    type="text"
                    className="form-control rounded-3 form-control-sm"
                    placeholder={t('emergency:contactNamePlaceholder')}
                    value={formContactName}
                    onChange={(e) => setFormContactName(e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label fw-bold text-dark small">
                    {t('emergency:contactPhoneLabel')}
                  </label>
                  <input
                    type="tel"
                    className="form-control rounded-3 form-control-sm"
                    placeholder={t('emergency:contactPhonePlaceholder')}
                    value={formContactPhone}
                    onChange={(e) => setFormContactPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Live Severity Calculation Card */}
              <div
                className="p-3 rounded-4 mb-4 border d-flex align-items-center justify-content-between"
                style={{
                  backgroundColor:
                    liveSeverityCalc.suggestedSeverity === 'Critical'
                      ? '#FEE2E2'
                      : liveSeverityCalc.suggestedSeverity === 'High'
                      ? '#FFEDD5'
                      : liveSeverityCalc.suggestedSeverity === 'Medium'
                      ? '#FEF9C3'
                      : '#DCFCE7',
                  borderColor:
                    liveSeverityCalc.suggestedSeverity === 'Critical'
                      ? '#FCA5A5'
                      : '#E5E7EB',
                }}
              >
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <Sparkles size={16} className="text-danger" />
                    <span className="fw-bold small text-dark">
                      {t('emergency:smartSeverityTitle')}
                    </span>
                    <span className="badge bg-dark text-white fw-bold">
                      {liveSeverityCalc.suggestedSeverity.toUpperCase()}
                    </span>
                  </div>
                  <div className="small text-secondary mt-1">
                    Category Score ({liveSeverityCalc.categoryScore}) + People Score (
                    {liveSeverityCalc.peopleScore}) = Total ({liveSeverityCalc.rawScore})
                    {liveSeverityCalc.matchedKeywords.length > 0 && (
                      <span className="text-danger fw-bold ms-2">
                        • Warning Keywords Detected: [{liveSeverityCalc.matchedKeywords.join(', ')}]
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-danger w-100 py-3 rounded-pill fw-black shadow-lg d-flex align-items-center justify-content-center gap-2"
                style={{
                  backgroundColor: UYRA_COLORS.primaryRed,
                  fontSize: '1.15rem',
                  letterSpacing: '0.02em',
                }}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" />
                    <span>{t('emergency:transmitting')}</span>
                  </>
                ) : (
                  <>
                    <Radio size={20} />
                    <span>{t('emergency:transmitSosNow')}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      ))}

      {/* ------------------------------------------------------------------ */}
      {/* SCREEN 3: CONFIRMATION                                             */}
      {/* ------------------------------------------------------------------ */}
      {publicScreen === 'confirmation' && submittedIncident && (
        <div className="container py-4" style={{ maxWidth: 720 }}>
          <div className="card rounded-4 border-0 shadow-sm p-4 text-center bg-white mb-4">
            <div
              className="rounded-circle mx-auto p-3 d-flex align-items-center justify-content-center text-white mb-3 shadow"
              style={{ backgroundColor: '#16A34A', width: 68, height: 68 }}
            >
              <CheckCircle2 size={38} />
            </div>

            <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-2 fw-bold align-self-center mb-2">
              {t('emergency:confirmationBadge')}
            </span>

            <h2 className="fw-black text-dark mb-1" style={{ fontWeight: 900 }}>
              {t('emergency:referenceId')}: {submittedIncident.id || submittedIncident.referenceNumber}
            </h2>
            <p className="text-secondary small mb-3">
              {t('emergency:confirmationDesc')}
            </p>

            <div className="p-3 rounded-3 bg-light border text-start mb-4">
              <div className="row g-2">
                <div className="col-6">
                  <span className="text-muted small">{t('emergency:categorySummary')}:</span>
                  <div className="fw-bold text-dark">{getCategoryDetails(submittedIncident.category).name}</div>
                </div>
                <div className="col-6">
                  <span className="text-muted small">{t('emergency:severitySummary')}:</span>
                  <div>
                    <span className="badge bg-danger fw-bold">
                      {submittedIncident.suggestedSeverity || submittedIncident.confirmedSeverity}
                    </span>
                  </div>
                </div>
                <div className="col-12 mt-2">
                  <span className="text-muted small">{t('emergency:locationSummary')}:</span>
                  <div className="fw-semibold text-dark">{submittedIncident.address}</div>
                </div>
              </div>
            </div>

            <div className="alert alert-warning text-start small mb-4">
              <strong>{t('emergency:safetyRemindersTitle')}</strong>
              <ul className="mb-0 ps-3 mt-1">
                <li>{t('emergency:safety1')}</li>
                <li>{t('emergency:safety2')}</li>
                <li>{t('emergency:safety3')}</li>
              </ul>
            </div>

            <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
              <button
                type="button"
                onClick={() => setPublicScreen('home')}
                className="btn btn-light border rounded-pill px-4 fw-semibold"
              >
                {t('common:returnHome')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Citizen Authentication Modal */}
      <CitizenAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCitizenUser(user);
          if (user.fullName && !formContactName) setFormContactName(user.fullName);
          if (user.phoneNumber && !formContactPhone) setFormContactPhone(user.phoneNumber);
          // If citizen clicked Report SOS, transition to report form immediately upon sign-in
          const targetCat = pendingCategory || formCategory;
          setPendingCategory(null);
          setFormCategory(targetCat);
          setFormErrors({});
          setPublicScreen('report');
          requestBrowserLocation(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
