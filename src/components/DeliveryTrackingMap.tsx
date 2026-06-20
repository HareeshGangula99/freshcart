import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const deliveryPartnerIcon = new L.DivIcon({
  html: `<div style="background:#7c3aed;width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 12px rgba(124,58,237,0.5);display:flex;align-items:center;justify-content:center;"><span style="font-size:18px;">🏍️</span></div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const arrivedIcon = new L.DivIcon({
  html: `<div style="background:#16a34a;width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 12px rgba(22,163,74,0.5);display:flex;align-items:center;justify-content:center;"><span style="font-size:18px;">✅</span></div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const customerIcon = new L.DivIcon({
  html: `<div style="background:#059669;width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 12px rgba(5,150,105,0.5);display:flex;align-items:center;justify-content:center;"><span style="font-size:18px;">🧑</span></div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

interface Location {
  lat: number;
  lng: number;
}

const calculateDistance = (loc1: Location, loc2: Location): number => {
  const R = 6371000;
  const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const dLng = ((loc2.lng - loc1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((loc1.lat * Math.PI) / 180) *
      Math.cos((loc2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const formatETA = (meters: number): string => {
  const mins = Math.round(meters / 138.89);
  if (mins < 1) return 'Arriving now';
  if (mins === 1) return '1 min';
  return `${mins} min`;
};

interface OSRMRouteResult {
  coordinates: [number, number][];
  roadDistance: number;
}

const fetchRoute = async (from: Location, to: Location): Promise<OSRMRouteResult> => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]) {
      const route = data.routes[0];
      return {
        coordinates: route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]),
        roadDistance: route.distance,
      };
    }
  } catch (err) {
    console.error('OSRM route error:', err);
  }
  return {
    coordinates: [[from.lat, from.lng], [to.lat, to.lng]],
    roadDistance: calculateDistance(from, to),
  };
};

const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

const TrackingMapUpdater: React.FC<{ deliveryLocation: Location | null; customerLocation: Location | null; followDelivery?: boolean }> = ({ deliveryLocation, customerLocation, followDelivery: _followDelivery }) => {
  const map = useMap();
  useEffect(() => {
    const points: L.LatLngExpression[] = [];
    if (deliveryLocation) points.push([deliveryLocation.lat, deliveryLocation.lng]);
    if (customerLocation) points.push([customerLocation.lat, customerLocation.lng]);
    if (points.length > 1) map.fitBounds(points as L.LatLngBoundsExpression, { padding: [60, 60] });
    else if (points.length === 1) map.setView(points[0], 16);
  }, [deliveryLocation, customerLocation, map]);
  return null;
};

interface DeliveryTrackingMapProps {
  deliveryLocation: Location | null;
  customerLocation?: Location | null;
  customerAddress?: string;
  orderTitle?: string;
  showCustomerMarker?: boolean;
  height?: string;
  followDelivery?: boolean;
  className?: string;
  onDistanceUpdate?: (data: { distance: number; ETA: string; arrived: boolean }) => void;
}

const DeliveryTrackingMap: React.FC<DeliveryTrackingMapProps> = ({
  deliveryLocation,
  customerLocation,
  customerAddress,
  showCustomerMarker = true,
  height = '300px',
  followDelivery = false,
  className = '',
  onDistanceUpdate,
}) => {
  const [arrived, setArrived] = useState(false);
  const [roadRoute, setRoadRoute] = useState<[number, number][]>([]);
  const [roadDistance, setRoadDistance] = useState<number | null>(null);
  const routeCacheRef = useRef<Map<string, OSRMRouteResult>>(new Map());
  const lastFetchRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });

  const defaultCenter: [number, number] = [17.385, 78.4866];
  const center: [number, number] = deliveryLocation
    ? [deliveryLocation.lat, deliveryLocation.lng]
    : customerLocation
    ? [customerLocation.lat, customerLocation.lng]
    : defaultCenter;

  // Haversine straight-line distance (fallback)
  const haversineDistance = useMemo(() => {
    if (!deliveryLocation || !customerLocation) return null;
    return calculateDistance(deliveryLocation, customerLocation);
  }, [deliveryLocation, customerLocation]);

  // Use road distance when available, fallback to haversine
  const displayDistance = roadDistance !== null ? roadDistance : haversineDistance;

  // Arrival detection uses road distance (not haversine)
  useEffect(() => {
    if (roadDistance !== null) {
      setArrived(roadDistance <= 50);
    } else if (haversineDistance !== null) {
      setArrived(haversineDistance <= 50);
    }
  }, [roadDistance, haversineDistance]);

  useEffect(() => {
    if (displayDistance !== null && onDistanceUpdate) {
      onDistanceUpdate({ distance: displayDistance, ETA: formatETA(displayDistance), arrived: displayDistance <= 50 });
    }
  }, [displayDistance, onDistanceUpdate]);

  // Debounce delivery location to avoid too many OSRM calls
  const debouncedLocation = useDebouncedValue(deliveryLocation, 3000);

  // Fetch road route from OSRM (debounced)
  useEffect(() => {
    if (!debouncedLocation || !customerLocation) {
      setRoadRoute([]);
      setRoadDistance(null);
      return;
    }

    const cacheKey = `${debouncedLocation.lat.toFixed(4)},${debouncedLocation.lng.toFixed(4)}->${customerLocation.lat.toFixed(4)},${customerLocation.lng.toFixed(4)}`;

    if (routeCacheRef.current.has(cacheKey)) {
      const cached = routeCacheRef.current.get(cacheKey)!;
      setRoadRoute(cached.coordinates);
      setRoadDistance(cached.roadDistance);
      return;
    }

    const now = Date.now();
    if (lastFetchRef.current.key === cacheKey && now - lastFetchRef.current.time < 2000) return;
    lastFetchRef.current = { key: cacheKey, time: now };

    fetchRoute(debouncedLocation, customerLocation).then(result => {
      routeCacheRef.current.set(cacheKey, result);
      setRoadRoute(result.coordinates);
      setRoadDistance(result.roadDistance);
    });
  }, [debouncedLocation, customerLocation]);

  // Progress based on road distance
  const progress = useMemo(() => {
    if (displayDistance === null) return 0;
    return Math.min(100, Math.max(0, ((5000 - displayDistance) / 5000) * 100));
  }, [displayDistance]);

  const displayRoute: [number, number][] = roadRoute.length > 0
    ? roadRoute
    : deliveryLocation && customerLocation
      ? [[deliveryLocation.lat, deliveryLocation.lng], [customerLocation.lat, customerLocation.lng]]
      : [];

  return (
    <div className={`rounded-3 overflow-hidden ${className}`} style={{ height, border: '1px solid #e5e7eb' }}>
      <MapContainer center={center} zoom={deliveryLocation || customerLocation ? 16 : 12} style={{ height: '100%', width: '100%' }} zoomControl={true} scrollWheelZoom={true}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <TrackingMapUpdater deliveryLocation={deliveryLocation} customerLocation={customerLocation || null} followDelivery={followDelivery} />

        {displayRoute.length > 1 && (
          <>
            <Polyline positions={displayRoute} pathOptions={{ color: '#3b82f6', weight: 7, opacity: 0.2, lineCap: 'round', lineJoin: 'round' }} />
            <Polyline positions={displayRoute} pathOptions={{ color: arrived ? '#16a34a' : '#3b82f6', weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }} />
          </>
        )}

        {customerLocation && (
          <Circle center={[customerLocation.lat, customerLocation.lng]} radius={10} pathOptions={{ color: arrived ? '#16a34a' : '#059669', fillColor: arrived ? '#dcfce7' : '#d1fae5', fillOpacity: 0.3, weight: arrived ? 2 : 1, dashArray: arrived ? undefined : '4, 4' }} />
        )}

        {deliveryLocation && (
          <Marker position={[deliveryLocation.lat, deliveryLocation.lng]} icon={arrived ? arrivedIcon : deliveryPartnerIcon}>
            <Popup>
              <div style={{ textAlign: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <strong style={{ color: arrived ? '#16a34a' : '#7c3aed' }}>{arrived ? '✅ Arrived!' : '🏍️ Delivery Boy'}</strong>
                {displayDistance !== null && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>{arrived ? 'At your location' : `${formatDistance(displayDistance)} from customer`}</p>}
              </div>
            </Popup>
          </Marker>
        )}

        {showCustomerMarker && customerLocation && (
          <Marker position={[customerLocation.lat, customerLocation.lng]} icon={customerIcon}>
            <Popup>
              <div style={{ textAlign: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <strong style={{ color: '#059669' }}>🧑 Customer</strong>
                {customerAddress && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>{customerAddress}</p>}
                {displayDistance !== null && <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9ca3af' }}>{formatDistance(displayDistance)} from delivery boy</p>}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Distance + ETA overlay - top left */}
      {deliveryLocation && customerLocation && !arrived && (
        <div className="position-absolute top-0 start-0 p-2" style={{ zIndex: 1000 }}>
          <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 shadow-sm" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}>
            <span style={{ fontSize: '14px' }}>🏍️</span>
            <span className="fw-bold" style={{ fontSize: '13px', color: '#3b82f6' }}>{formatDistance(displayDistance || 0)}</span>
            <span className="text-muted" style={{ fontSize: '11px' }}>away</span>
            <span className="text-muted">|</span>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>~{formatETA(displayDistance || 0)}</span>
          </div>
        </div>
      )}

      {/* Waiting for delivery boy - no GPS yet */}
      {!deliveryLocation && customerLocation && (
        <div className="position-absolute top-0 start-0 end-0 d-flex justify-content-center p-2" style={{ zIndex: 1000 }}>
          <div className="d-flex align-items-center gap-2 px-4 py-2 rounded-3 shadow-lg" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}>
            <span className="spinner-border spinner-border-sm" style={{ color: '#7c3aed', width: '14px', height: '14px' }}></span>
            <span className="fw-semibold" style={{ fontSize: '13px', color: '#7c3aed' }}>Waiting for delivery partner...</span>
          </div>
        </div>
      )}

      {/* Arrived badge */}
      {arrived && (
        <div className="position-absolute top-0 start-0 end-0 d-flex justify-content-center p-2" style={{ zIndex: 1000 }}>
          <div className="d-flex align-items-center gap-2 px-4 py-2 rounded-3 shadow-lg" style={{ background: '#16a34a', animation: 'popIn 0.4s ease' }}>
            <span style={{ fontSize: '14px' }}>✅</span>
            <span className="text-white fw-bold" style={{ fontSize: '13px' }}>Arrived!</span>
          </div>
        </div>
      )}

      {/* Progress bar - bottom */}
      {deliveryLocation && customerLocation && (
        <div className="position-absolute bottom-0 start-0 end-0 p-2" style={{ zIndex: 1000 }}>
          <div className="px-3 py-2 rounded-3 shadow-sm" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}>
            <div className="d-flex align-items-center justify-content-between mb-1">
              <small className="fw-semibold" style={{ fontSize: '10px', color: arrived ? '#16a34a' : '#3b82f6' }}>
                {arrived ? 'Delivered' : `${Math.round(progress)}% covered`}
              </small>
              <small className="text-muted" style={{ fontSize: '10px' }}>
                {formatDistance(displayDistance || 0)} left
              </small>
            </div>
            <div style={{ height: '3px', borderRadius: '2px', background: '#e5e7eb' }}>
              <div style={{ width: `${progress}%`, height: '100%', borderRadius: '2px', background: arrived ? '#16a34a' : 'linear-gradient(90deg, #3b82f6, #60a5fa)', transition: 'width 0.5s ease' }}></div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default DeliveryTrackingMap;
