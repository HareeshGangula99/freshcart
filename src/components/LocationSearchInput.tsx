import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const locationIcon = new L.DivIcon({
  html: `<div style="background:#059669;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><i class="bi bi-geo-alt-fill text-white" style="font-size:12px;"></i></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (data: {
    street: string;
    city: string;
    zip: string;
    lat: number;
    lng: number;
  }) => void;
  placeholder?: string;
}

const MapUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);
  return null;
};

const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = 'Search delivery location...',
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocation = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=in`
      );
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (err) {
      console.error('Search error:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setSelectedLocation(null);
    setShowMap(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchLocation(val);
    }, 400);
  };

  const handleSelect = (suggestion: Suggestion) => {
    const addr = suggestion.address || {};
    const street = addr.road || addr.neighbourhood || addr.suburb || suggestion.display_name.split(',')[0] || '';
    const city = addr.city || addr.town || addr.village || '';
    const zip = addr.postcode || '';
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);

    onChange(street);
    setSelectedLocation({ lat, lng, label: suggestion.display_name });
    setShowSuggestions(false);
    setShowMap(true);

    onLocationSelect({ street, city, zip, lat, lng });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&countrycodes=in`
          );
          const data = await res.json();
          const addr = data.address || {};
          const street = addr.road || addr.neighbourhood || addr.suburb || '';
          const city = addr.city || addr.town || addr.village || '';
          const zip = addr.postcode || '';

          onChange(street);
          setSelectedLocation({ lat: latitude, lng: longitude, label: data.display_name || street });
          setShowMap(true);
          onLocationSelect({ street, city, zip, lat: latitude, lng: longitude });
        } catch (err) {
          console.error('Reverse geocode error:', err);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        alert('Unable to get your location. Please search manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div ref={wrapperRef} className="position-relative">
      {/* Search Input */}
      <div className="position-relative">
        <input
          type="text"
          className="form-control fc-input"
          style={{ fontSize: '13px', paddingLeft: '36px', paddingRight: loading ? '36px' : '12px' }}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        />
        <i className="bi bi-search position-absolute" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '13px' }}></i>
        {loading && (
          <span className="position-absolute spinner-border spinner-border-sm text-muted" style={{ right: '10px', top: '50%', transform: 'translateY(-50%)' }}></span>
        )}
      </div>

      {/* Current Location Button */}
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        className="btn btn-sm w-100 mt-1 d-flex align-items-center justify-content-center gap-1"
        style={{ fontSize: '12px', color: '#059669', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}
      >
        <i className="bi bi-crosshair"></i> Use Current Location
      </button>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="position-absolute w-100 mt-1 rounded-3 shadow-lg overflow-hidden" style={{ zIndex: 1070, background: 'white', border: '1px solid #e5e7eb' }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onClick={() => handleSelect(s)}
              className="px-3 py-2 d-flex align-items-start gap-2"
              style={{ cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none', transition: 'background 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
            >
              <i className="bi bi-geo-alt text-success mt-1" style={{ fontSize: '14px', flexShrink: 0 }}></i>
              <div className="min-w-0">
                <p className="mb-0 fw-medium text-truncate" style={{ fontSize: '13px' }}>
                  {s.address?.road || s.address?.neighbourhood || s.display_name.split(',')[0]}
                </p>
                <small className="text-muted d-block text-truncate" style={{ fontSize: '11px' }}>
                  {s.display_name}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map Preview */}
      {showMap && selectedLocation && (
        <div className="mt-2 rounded-3 overflow-hidden" style={{ border: '1px solid #e5e7eb', height: '160px' }}>
          <MapContainer
            center={[selectedLocation.lat, selectedLocation.lng]}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            scrollWheelZoom={false}
            dragging={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={locationIcon} />
            <MapUpdater center={[selectedLocation.lat, selectedLocation.lng]} />
          </MapContainer>
        </div>
      )}

      {/* Selected Location Label */}
      {selectedLocation && (
        <div className="d-flex align-items-center gap-1 mt-1">
          <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '12px' }}></i>
          <small className="text-success fw-medium" style={{ fontSize: '11px' }}>Location selected</small>
        </div>
      )}
    </div>
  );
};

export default LocationSearchInput;
