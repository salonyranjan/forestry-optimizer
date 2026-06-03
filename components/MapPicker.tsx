"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Define a simple SVG pin icon to avoid external image assets
const pinSvg = `
<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#34D399"/>
  <circle cx="12" cy="9" r="2.5" fill="white"/>
</svg>`;

const pinIcon = new L.DivIcon({
  html: pinSvg,
  className: "", // remove default className
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  onZoneClick?: (canopy: number, concrete: number) => void;
}

const ClickHandler = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
  const [position, setPosition] = useState<L.LatLngExpression | null>(null);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onLocationSelect(lat, lng);
    }
  });

  return position ? <Marker position={position} icon={pinIcon} /> : null;
};

export default function MapPicker({ onLocationSelect, onZoneClick }: MapPickerProps) {
  const defaultCenter: L.LatLngExpression = [25.6126, 85.1589]; // Example urban coordinate

  // Simulated environmental zones around the center
  const zones = [
    { id: 'zone-1', center: [25.615, 85.160], radius: 600, canopyCoverage: 80, concreteRatio: 20, type: 'canopy-sink' },
    { id: 'zone-2', center: [25.610, 85.155], radius: 500, canopyCoverage: 30, concreteRatio: 70, type: 'heat-island' },
    { id: 'zone-3', center: [25.618, 85.152], radius: 400, canopyCoverage: 60, concreteRatio: 40, type: 'canopy-sink' },
    { id: 'zone-4', center: [25.607, 85.165], radius: 750, canopyCoverage: 20, concreteRatio: 80, type: 'heat-island' }
  ];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {zones.map(zone => (
          <Circle
            key={zone.id}
            center={zone.center as any}
            radius={zone.radius}
            pathOptions={{
              color: zone.type === 'heat-island' ? '#ef4444' : '#10b981',
              fillColor: zone.type === 'heat-island' ? '#ef4444' : '#10b981',
              fillOpacity: 0.35,
            }}
            eventHandlers={{
              click: () => onZoneClick?.(zone.canopyCoverage, zone.concreteRatio)
            }}
          >
            <Popup className="bg-gray-800 text-white p-2 rounded text-sm shadow-lg">
              <div className="font-semibold mb-1 text-emerald-300">
                {zone.type === 'heat-island' ? 'Heat Island' : 'Canopy Sink'}
              </div>
              <div className="mt-1"><span className="font-medium">Canopy Coverage:</span> {zone.canopyCoverage}%</div>
              <div className="mt-1"><span className="font-medium">Concrete Ratio:</span> {zone.concreteRatio}%</div>
              <div className="mt-2 text-xs text-gray-400">
                💡 Click zone to synchronize 3D canvas simulation parameters.
              </div>
            </Popup>
          </Circle>
        ))}
        <ClickHandler onLocationSelect={onLocationSelect} />
    </MapContainer>
  );
}
