import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { LocateFixed, MapPin } from 'lucide-react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = {
  latitude: 10.7636,
  longitude: 78.8181
};

const createMarkerIcon = () => L.divIcon({
  className: 'cityfix-marker',
  html: '<span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const ClickHandler = ({ onChange }) => {
  useMapEvents({
    click(event) {
      onChange({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6))
      });
    }
  });

  return null;
};

const RecenterMap = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView([position.latitude, position.longitude], Math.max(map.getZoom(), 14), {
        animate: true
      });
    }
  }, [map, position]);

  return null;
};

export const MapPicker = ({ value, onChange, onDetectLocation, isLocating }) => {
  const markerIcon = useMemo(() => createMarkerIcon(), []);
  const currentPosition = value || DEFAULT_CENTER;

  return (
    <div className="map-picker">
      <div className="map-toolbar">
        <div>
          <span className="eyebrow">Location pin</span>
          <p>Click the map or use current location.</p>
        </div>
        <button className="ghost-button" type="button" onClick={onDetectLocation} disabled={isLocating}>
          <LocateFixed size={16} />
          {isLocating ? 'Detecting...' : 'Detect my location'}
        </button>
      </div>

      <MapContainer
        center={[currentPosition.latitude, currentPosition.longitude]}
        zoom={13}
        scrollWheelZoom
        className="leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        <RecenterMap position={value} />
        {value && (
          <Marker
            position={[value.latitude, value.longitude]}
            icon={markerIcon}
            draggable
            eventHandlers={{
              dragend(event) {
                const marker = event.target;
                const latlng = marker.getLatLng();
                onChange({
                  latitude: Number(latlng.lat.toFixed(6)),
                  longitude: Number(latlng.lng.toFixed(6))
                });
              }
            }}
          />
        )}
      </MapContainer>

      <div className="coordinate-readout">
        <MapPin size={15} />
        {value
          ? `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`
          : 'No pin selected yet'}
      </div>
    </div>
  );
};
