import React, { useEffect, useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { UYRA_COLORS } from './uyra_shared';

declare global {
  interface Window {
    google?: any;
    _googleMapsPromise?: Promise<any>;
  }
}

// Singleton script loader for Google Maps
function loadGoogleMapsScript(apiKey: string): Promise<any> {
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (window._googleMapsPromise) {
    return window._googleMapsPromise;
  }

  window._googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('google-maps-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps));
      existing.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps SDK loaded but window.google.maps is undefined'));
      }
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });

  return window._googleMapsPromise;
}

export interface GoogleMapsCanvasProps {
  lat?: number;
  lng?: number;
  accuracy?: number;
  address?: string;
  interactive?: boolean;
  onCoordsChange?: ((coords: { lat: number; lng: number; address?: string }) => void) | null;
  height?: number;
  markers?: any[]; // Incidents
  teams?: any[];   // Phase 3 & 4: Response Teams
  assignedConnections?: Array<{
    incidentId: string;
    incidentCoords: { lat: number; lng: number };
    teamId: string;
    teamCoords: { lat: number; lng: number };
    distanceKm?: number | null;
  }>;
  highlightId?: string | null;
  onSelectMarker?: ((m: any) => void) | null;
  onSelectTeam?: ((t: any) => void) | null;
  fallbackComponent?: React.ReactNode;
}

export function GoogleMapsCanvas({
  lat = 11.0168,
  lng = 76.9558,
  accuracy = 10,
  address = 'Coimbatore Central Sector',
  interactive = true,
  onCoordsChange = null,
  height = 240,
  markers = [],
  teams = [],
  assignedConnections = [],
  highlightId = null,
  onSelectMarker = null,
  onSelectTeam = null,
  fallbackComponent = null,
}: GoogleMapsCanvasProps) {
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY?.trim() || '';
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const multiMarkersRef = useRef<any[]>([]);
  const teamMarkersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const accuracyCircleRef = useRef<any>(null);

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // If no API key is provided, return fallback immediately
  if (!apiKey) {
    return <>{fallbackComponent}</>;
  }

  // Load Google Maps script once
  useEffect(() => {
    let isMounted = true;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (isMounted) setScriptLoaded(true);
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('UYRA: Google Maps failed to load, falling back to vector map', err);
          setLoadError(err?.message || 'Failed to load Google Maps SDK');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  // Initialize map when container and script are ready
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.google?.maps) return;

    if (!mapInstanceRef.current) {
      const map = new window.google.maps.Map(containerRef.current, {
        center: { lat, lng },
        zoom: 14,
        disableDefaultUI: !interactive,
        zoomControl: interactive,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: interactive,
      });

      // Allow clicking on map to reposition pin
      if (interactive && markers.length === 0 && teams.length === 0) {
        map.addListener('click', (e: any) => {
          if (!e.latLng) return;
          const clickedLat = +e.latLng.lat().toFixed(6);
          const clickedLng = +e.latLng.lng().toFixed(6);
          if (onCoordsChange) {
            onCoordsChange({ lat: clickedLat, lng: clickedLng });
          }
        });
      }

      mapInstanceRef.current = map;
    }
  }, [scriptLoaded, interactive, markers.length, teams.length]);

  // Update center and single marker when lat/lng change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    const center = { lat, lng };

    // If single marker mode (user reporting portal)
    if (markers.length === 0 && teams.length === 0) {
      mapInstanceRef.current.panTo(center);

      if (!userMarkerRef.current) {
        const marker = new window.google.maps.Marker({
          position: center,
          map: mapInstanceRef.current,
          draggable: interactive,
          animation: window.google.maps.Animation.DROP,
          title: 'Emergency Incident Location',
          icon: {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
            fillColor: UYRA_COLORS.primaryRed,
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#FFFFFF',
            scale: 1.8,
            anchor: new window.google.maps.Point(12, 22),
          },
        });

        if (interactive) {
          marker.addListener('dragend', () => {
            const pos = marker.getPosition();
            if (pos && onCoordsChange) {
              const newLat = +pos.lat().toFixed(6);
              const newLng = +pos.lng().toFixed(6);
              onCoordsChange({ lat: newLat, lng: newLng });
            }
          });
        }
        userMarkerRef.current = marker;
      } else {
        userMarkerRef.current.setPosition(center);
      }

      // Draw accuracy circle
      if (accuracy > 0) {
        if (!accuracyCircleRef.current) {
          accuracyCircleRef.current = new window.google.maps.Circle({
            strokeColor: '#DC2626',
            strokeOpacity: 0.6,
            strokeWeight: 1.5,
            fillColor: '#DC2626',
            fillOpacity: 0.12,
            map: mapInstanceRef.current,
            center: center,
            radius: Math.min(accuracy, 200),
          });
        } else {
          accuracyCircleRef.current.setCenter(center);
          accuracyCircleRef.current.setRadius(Math.min(accuracy, 200));
        }
      }
    }
  }, [lat, lng, accuracy, interactive, markers.length, teams.length]);

  // Handle multi-marker display (Admin Portal: Incidents + Teams + Connections)
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    if (markers.length === 0 && teams.length === 0) return;

    // Clear previous incident markers
    multiMarkersRef.current.forEach((m) => m.setMap(null));
    multiMarkersRef.current = [];

    // Clear previous team markers
    teamMarkersRef.current.forEach((m) => m.setMap(null));
    teamMarkersRef.current = [];

    // Clear previous polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();

    // 1. Plot Incidents
    markers.forEach((inc) => {
      if (!inc.latitude || !inc.longitude) return;
      const pos = { lat: inc.latitude, lng: inc.longitude };
      bounds.extend(pos);

      const sevColor =
        inc.confirmedSeverity === 'Critical'
          ? '#DC2626'
          : inc.confirmedSeverity === 'High'
          ? '#F97316'
          : inc.confirmedSeverity === 'Medium'
          ? '#EAB308'
          : '#16A34A';

      const isSelected = highlightId === inc.id;

      const marker = new window.google.maps.Marker({
        position: pos,
        map: mapInstanceRef.current,
        title: `🚨 Incident ${inc.id}: ${inc.title || inc.category}`,
        zIndex: isSelected ? 999 : 100,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 11 : 7,
          fillColor: sevColor,
          fillOpacity: 1,
          strokeWeight: isSelected ? 3 : 2,
          strokeColor: '#FFFFFF',
        },
      });

      marker.addListener('click', () => {
        if (onSelectMarker) onSelectMarker(inc);
      });

      multiMarkersRef.current.push(marker);
    });

    // 2. Plot Response Teams (Phase 3 & 4)
    teams.forEach((t) => {
      if (!t.latitude || !t.longitude) return;
      const pos = { lat: t.latitude, lng: t.longitude };
      bounds.extend(pos);

      // Color by availability status
      const statusColor =
        t.status === 'AVAILABLE'
          ? '#059669' // Emerald Green
          : t.status === 'DISPATCHED'
          ? '#2563EB' // Blue
          : t.status === 'BUSY'
          ? '#D97706' // Amber
          : '#64748B'; // Slate (OFF_DUTY)

      const marker = new window.google.maps.Marker({
        position: pos,
        map: mapInstanceRef.current,
        title: `🚒 Team: ${t.name} (${t.status})`,
        zIndex: 200,
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: statusColor,
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#FFFFFF',
        },
      });

      marker.addListener('click', () => {
        if (onSelectTeam) onSelectTeam(t);
      });

      teamMarkersRef.current.push(marker);
    });

    // 3. Draw Assigned Team-to-Incident Connection Lines (Phase 3 & 4)
    assignedConnections.forEach((conn) => {
      if (
        !conn.incidentCoords?.lat ||
        !conn.incidentCoords?.lng ||
        !conn.teamCoords?.lat ||
        !conn.teamCoords?.lng
      ) {
        return;
      }

      const path = [
        { lat: conn.teamCoords.lat, lng: conn.teamCoords.lng },
        { lat: conn.incidentCoords.lat, lng: conn.incidentCoords.lng },
      ];

      // Geodesic dashed polyline representing Haversine route
      const line = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#2563EB',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: mapInstanceRef.current,
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 1,
              scale: 3,
            },
            offset: '0',
            repeat: '15px',
          },
        ],
      });

      polylinesRef.current.push(line);
    });

    if ((markers.length > 1 || teams.length > 0) && !bounds.isEmpty()) {
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [markers, teams, assignedConnections, highlightId]);

  if (loadError) {
    return <>{fallbackComponent}</>;
  }

  return (
    <div
      className="position-relative overflow-hidden rounded-3 border"
      style={{ height, minHeight: height }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {!scriptLoaded && (
        <div
          className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-light"
          style={{ zIndex: 5 }}
        >
          <div className="spinner-border text-danger spinner-border-sm mb-2" role="status" />
          <span className="small text-muted fw-semibold">Loading Live Google Maps...</span>
        </div>
      )}

      {/* Floating Info Pill */}
      <div
        className="position-absolute bottom-0 start-0 m-2 px-2 py-1 rounded-2 bg-white bg-opacity-95 shadow-sm border d-flex align-items-center gap-2"
        style={{ fontSize: '0.7rem', zIndex: 10 }}
      >
        <Crosshair size={12} className="text-danger" />
        <span className="font-monospace fw-semibold text-dark">
          {lat.toFixed(5)}° N, {lng.toFixed(5)}° E
        </span>
        <span className="text-muted">|</span>
        <span className="text-truncate" style={{ maxWidth: 210 }}>
          {address || 'Location Synced'}
        </span>
        {teams.length > 0 && (
          <>
            <span className="text-muted">|</span>
            <span className="badge bg-primary rounded-pill px-2" style={{ fontSize: '0.65rem' }}>
              {teams.length} Teams Plotted
            </span>
          </>
        )}
      </div>

      {/* Map Legend Pill */}
      {teams.length > 0 && (
        <div
          className="position-absolute top-0 end-0 m-2 p-2 rounded-3 bg-white bg-opacity-95 shadow-sm border small"
          style={{ fontSize: '0.68rem', zIndex: 10 }}
        >
          <div className="fw-bold text-dark mb-1">Dispatch Map Legend:</div>
          <div className="d-flex align-items-center gap-1 mb-1">
            <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, backgroundColor: '#DC2626' }} />
            <span>Incident Marker</span>
          </div>
          <div className="d-flex align-items-center gap-1 mb-1">
            <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, backgroundColor: '#059669' }} />
            <span>Available Team</span>
          </div>
          <div className="d-flex align-items-center gap-1">
            <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, backgroundColor: '#2563EB' }} />
            <span>Dispatched Team</span>
          </div>
        </div>
      )}

      {interactive && markers.length === 0 && teams.length === 0 && (
        <div
          className="position-absolute top-0 end-0 m-2 px-2 py-1 rounded-pill bg-dark bg-opacity-75 text-white"
          style={{ fontSize: '0.64rem', zIndex: 10 }}
        >
          Click or Drag pin to adjust
        </div>
      )}
    </div>
  );
}
