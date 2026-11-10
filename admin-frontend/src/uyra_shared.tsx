import React from 'react';
import {
  Flame,
  Car,
  HeartPulse,
  Waves,
  Building2,
  HelpCircle,
  ShieldCheck,
  MapPin,
  Crosshair,
  Radio,
} from 'lucide-react';

export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:4000/api';
export const SOCKET_URL = import.meta.env?.VITE_SOCKET_URL || 'http://localhost:4000';

export const UYRA_COLORS = {
  primaryRed: '#E50914',
  deepRed: '#B91C1C',
  deepNavy: '#111827',
  black: '#080808',
  white: '#FFFFFF',
  background: '#F5F6F8',
  cardBg: '#FFFFFF',
  secondaryText: '#64748B',
  border: '#E5E7EB',
  severity: {
    Low: { bg: '#DCFCE7', text: '#15803D', hex: '#16A34A', border: '#86EFAC', label: 'Low' },
    Medium: { bg: '#FEF9C3', text: '#A16207', hex: '#EAB308', border: '#FDE047', label: 'Medium' },
    High: { bg: '#FFEDD5', text: '#C2410C', hex: '#F97316', border: '#FDBA74', label: 'High' },
    Critical: { bg: '#FEE2E2', text: '#B91C1C', hex: '#DC2626', border: '#FCA5A5', label: 'Critical' },
  },
  status: {
    Reported: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
    Pending: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
    Verified: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
    'In Progress': { bg: '#E0E7FF', text: '#3730A3', dot: '#6366F1' },
    Resolved: { bg: '#DCFCE7', text: '#166534', dot: '#16A34A' },
  },
};

export const EMERGENCY_CATEGORIES = [
  {
    id: 'Fire Emergency',
    name: 'Fire Emergency',
    shortDesc: 'Structural fire, smoke, gas leak or wildfire',
    score: 3,
    icon: Flame,
    accent: '#E50914',
  },
  {
    id: 'Medical Emergency',
    name: 'Medical Emergency',
    shortDesc: 'Cardiac arrest, trauma, breathing or critical care',
    score: 3,
    icon: HeartPulse,
    accent: '#E50914',
  },
  {
    id: 'Road Accident',
    name: 'Road Accident',
    shortDesc: 'Vehicle collision, highway pile-up or pedestrian injury',
    score: 2,
    icon: Car,
    accent: '#F97316',
  },
  {
    id: 'Building Collapse',
    name: 'Building Collapse',
    shortDesc: 'Structural failure, trapped occupants or debris hazard',
    score: 4,
    icon: Building2,
    accent: '#DC2626',
  },
  {
    id: 'Flood',
    name: 'Flood',
    shortDesc: 'Flash flooding, submerged roads or water rescue needed',
    score: 2,
    icon: Waves,
    accent: '#0284C7',
  },
  {
    id: 'Other Emergencies',
    name: 'Other Emergencies',
    shortDesc: 'Downed power lines, public hazard or urgent distress',
    score: 1,
    icon: HelpCircle,
    accent: '#64748B',
  },
];

export const PEOPLE_AFFECTED_OPTIONS = [
  { id: '1', label: '1 Person', score: 0, numericRep: 1 },
  { id: '2-5', label: '2–5 People', score: 1, numericRep: 3 },
  { id: '6-10', label: '6–10 People', score: 2, numericRep: 8 },
  { id: '10+', label: 'More than 10', score: 3, numericRep: 15 },
];

export const CRITICAL_KEYWORDS = [
  'trapped',
  'unconscious',
  'explosion',
  'bleeding',
  'collapse',
  'children',
  'child',
  'infant',
  'fatal',
  'not breathing',
  'sinking',
  'submerged',
  'gas leak',
  'chemical',
  'burn',
  'mass casualty',
];

export function evaluateSmartSeverity(
  categoryName: string,
  peopleBracketId: string,
  titleText = '',
  descText = '',
) {
  const catObj = EMERGENCY_CATEGORIES.find((c) => c.id === categoryName) || EMERGENCY_CATEGORIES[5];
  const peopleObj =
    PEOPLE_AFFECTED_OPTIONS.find((p) => p.id === peopleBracketId) || PEOPLE_AFFECTED_OPTIONS[0];

  const categoryScore = catObj.score;
  const peopleScore = peopleObj.score;
  const combinedText = `${titleText} ${descText}`.toLowerCase();

  const matchedKeywords = CRITICAL_KEYWORDS.filter((kw) => combinedText.includes(kw));
  const rawScore = categoryScore + peopleScore;

  let suggestedSeverity = 'Low';
  if (matchedKeywords.length > 0 || rawScore >= 7) {
    suggestedSeverity = 'Critical';
  } else if (rawScore >= 5) {
    suggestedSeverity = 'High';
  } else if (rawScore >= 3) {
    suggestedSeverity = 'Medium';
  } else {
    suggestedSeverity = 'Low';
  }

  return {
    suggestedSeverity,
    categoryScore,
    peopleScore,
    rawScore,
    matchedKeywords,
    isKeywordEscalated: matchedKeywords.length > 0 && rawScore < 7,
  };
}

export function UyraBrand({ dark = false, size = 'md', showTagline = true }: { dark?: boolean; size?: string; showTagline?: boolean }) {
  const isLg = size === 'lg';
  return (
    <div className="d-flex align-items-center gap-2 select-none" style={{ textDecoration: 'none' }}>
      <div
        className="d-flex align-items-center justify-content-center rounded-3 shadow-sm"
        style={{
          width: isLg ? 46 : 38,
          height: isLg ? 46 : 38,
          backgroundColor: UYRA_COLORS.primaryRed,
          color: '#FFFFFF',
          transition: 'transform 0.2s ease',
        }}
      >
        <ShieldCheck size={isLg ? 26 : 22} strokeWidth={2.4} />
      </div>
      <div className="d-flex flex-column leading-none">
        <div className="d-flex align-items-baseline gap-1">
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 900,
              fontSize: isLg ? '1.8rem' : '1.35rem',
              letterSpacing: '-0.04em',
              color: dark ? '#FFFFFF' : UYRA_COLORS.deepNavy,
              lineHeight: 1,
            }}
          >
            UYRA
          </span>
          <span
            className="badge rounded-pill fw-bold"
            style={{
              fontSize: '0.62rem',
              backgroundColor: UYRA_COLORS.primaryRed,
              color: '#FFFFFF',
              letterSpacing: '0.04em',
              padding: '0.2em 0.55em',
            }}
          >
            LIVE SOS
          </span>
        </div>
        {showTagline && (
          <span
            style={{
              fontSize: isLg ? '0.75rem' : '0.66rem',
              fontWeight: 700,
              color: dark ? '#94A3B8' : '#64748B',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            Every Life. Every Second.
          </span>
        )}
      </div>
    </div>
  );
}

export function InteractiveMapCanvas({
  lat = 37.7749,
  lng = -122.4194,
  accuracy = 10,
  address = 'Downtown Central Sector',
  interactive = true,
  onCoordsChange = null,
  height = 240,
  markers = [],
  highlightId = null,
  onSelectMarker = null,
}: {
  lat?: number;
  lng?: number;
  accuracy?: number;
  address?: string;
  interactive?: boolean;
  onCoordsChange?: ((coords: { lat: number; lng: number }) => void) | null;
  height?: number;
  markers?: any[];
  highlightId?: string | null;
  onSelectMarker?: ((m: any) => void) | null;
}) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive) return;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !interactive) return;
    setDragOffset((prev) => ({
      x: Math.max(-90, Math.min(90, prev.x + e.movementX * 0.7)),
      y: Math.max(-60, Math.min(60, prev.y + e.movementY * 0.7)),
    }));
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (onCoordsChange) {
      const newLat = +(lat + dragOffset.y * -0.0003).toFixed(5);
      const newLng = +(lng + dragOffset.x * 0.0004).toFixed(5);
      onCoordsChange({ lat: newLat, lng: newLng });
    }
  };

  return (
    <div
      ref={mapRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="position-relative overflow-hidden rounded-3 border select-none"
      style={{
        height,
        backgroundColor: '#E5E7EB',
        backgroundImage: `
          radial-gradient(#CBD5E1 1.2px, transparent 1.2px),
          linear-gradient(to right, rgba(203, 213, 225, 0.45) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(203, 213, 225, 0.45) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px, 48px 48px, 48px 48px',
        cursor: interactive ? (isDragging ? 'grabbing' : 'grab') : 'default',
      }}
    >
      {/* City grid vector streets */}
      <svg
        className="position-absolute top-0 start-0 w-100 h-100 opacity-60"
        style={{ pointerEvents: 'none' }}
      >
        <line x1="0" y1="35%" x2="100%" y2="35%" stroke="#94A3B8" strokeWidth="4" />
        <line x1="0" y1="70%" x2="100%" y2="70%" stroke="#CBD5E1" strokeWidth="3" />
        <line x1="28%" y1="0" x2="28%" y2="100%" stroke="#94A3B8" strokeWidth="4" />
        <line x1="68%" y1="0" x2="68%" y2="100%" stroke="#CBD5E1" strokeWidth="3" />
        <circle cx="28%" cy="35%" r="18" fill="#FEE2E2" opacity="0.6" />
        <circle cx="68%" cy="70%" r="24" fill="#DBEAFE" opacity="0.4" />
      </svg>

      {/* Multiple Markers Render */}
      {markers.length > 0 ? (
        markers.map((m, idx) => {
          const isSelected = highlightId === m.id;
          const leftPercent = 20 + ((idx * 21) % 65);
          const topPercent = 25 + ((idx * 27) % 55);
          const sevColor =
            m.confirmedSeverity === 'Critical'
              ? '#DC2626'
              : m.confirmedSeverity === 'High'
              ? '#F97316'
              : m.confirmedSeverity === 'Medium'
              ? '#EAB308'
              : '#16A34A';

          return (
            <div
              key={m.id || idx}
              onClick={() => onSelectMarker && onSelectMarker(m)}
              className="position-absolute d-flex flex-column align-items-center"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                transform: 'translate(-50%, -100%)',
                cursor: 'pointer',
                zIndex: isSelected ? 12 : 5,
                transition: 'transform 0.15s ease',
              }}
            >
              <div
                className="badge shadow-sm rounded-pill px-2 py-1 mb-1 d-flex align-items-center gap-1 border"
                style={{
                  fontSize: '0.68rem',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  borderColor: isSelected ? sevColor : '#CBD5E1',
                  fontWeight: isSelected ? 800 : 600,
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                <span
                  className="rounded-circle d-inline-block"
                  style={{ width: 8, height: 8, backgroundColor: sevColor }}
                />
                {m.id}
              </div>
              <div
                className="rounded-circle d-flex align-items-center justify-content-center shadow"
                style={{
                  width: isSelected ? 32 : 24,
                  height: isSelected ? 32 : 24,
                  backgroundColor: sevColor,
                  color: '#FFFFFF',
                  border: '2px solid #FFFFFF',
                }}
              >
                <MapPin size={isSelected ? 18 : 14} />
              </div>
            </div>
          );
        })
      ) : (
        /* Single primary location pin */
        <div
          className="position-absolute d-flex flex-column align-items-center"
          style={{
            top: `calc(50% + ${dragOffset.y}px)`,
            left: `calc(50% + ${dragOffset.x}px)`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {/* Accuracy Pulse Ring */}
          <div
            className="position-absolute rounded-circle"
            style={{
              width: Math.min(180, Math.max(64, (accuracy || 10) * 4)),
              height: Math.min(180, Math.max(64, (accuracy || 10) * 4)),
              backgroundColor: 'rgba(229, 9, 20, 0.12)',
              border: '1.5px dashed rgba(229, 9, 20, 0.45)',
              transform: 'translate(0, 30%)',
              pointerEvents: 'none',
              animation: 'pulse 2.2s infinite',
            }}
          />

          <div
            className="badge bg-dark text-white shadow-sm px-2 py-1 mb-1 rounded-pill d-flex align-items-center gap-1 border border-secondary"
            style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}
          >
            <Radio size={10} className="text-danger" />
            <span>Incident Marker (±{accuracy || 10}m)</span>
          </div>

          <div
            className="rounded-circle d-flex align-items-center justify-content-center shadow-lg"
            style={{
              width: 38,
              height: 38,
              backgroundColor: UYRA_COLORS.primaryRed,
              color: '#FFFFFF',
              border: '3px solid #FFFFFF',
            }}
          >
            <MapPin size={20} strokeWidth={2.4} />
          </div>
          <div
            style={{
              width: 10,
              height: 4,
              backgroundColor: 'rgba(0,0,0,0.25)',
              borderRadius: '50%',
              marginTop: 2,
            }}
          />
        </div>
      )}

      {/* Floating Coordinate Pill */}
      <div
        className="position-absolute bottom-0 start-0 m-2 px-2 py-1 rounded-2 bg-white bg-opacity-90 shadow-sm border d-flex align-items-center gap-2"
        style={{ fontSize: '0.7rem', backdropFilter: 'blur(4px)', zIndex: 11 }}
      >
        <Crosshair size={12} className="text-danger" />
        <span className="font-monospace fw-semibold text-dark">
          {lat.toFixed(5)}° N, {Math.abs(lng).toFixed(5)}° W
        </span>
        <span className="text-muted">|</span>
        <span className="text-truncate" style={{ maxWidth: 210 }}>
          {address || 'Coordinates Locked'}
        </span>
      </div>

      {interactive && (
        <div
          className="position-absolute top-0 end-0 m-2 px-2 py-1 rounded-pill bg-dark bg-opacity-75 text-white"
          style={{ fontSize: '0.64rem', zIndex: 11 }}
        >
          Drag marker to calibrate pin
        </div>
      )}
    </div>
  );
}
