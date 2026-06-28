import { useMemo } from 'react';
import L from 'leaflet';
import { Marker, MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const createMarkerIcon = () => L.divIcon({
  className: 'cityfix-marker',
  html: '<span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

export const LocationPreviewMap = ({ latitude, longitude }) => {
  const markerIcon = useMemo(() => createMarkerIcon(), []);
  const position = [latitude, longitude];

  return (
    <div className="location-preview-map">
      <MapContainer
        center={position}
        zoom={15}
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        className="leaflet-map mini-leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={markerIcon} />
      </MapContainer>
    </div>
  );
};
