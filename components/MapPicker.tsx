"use client";

import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Simple SVG pin icon to avoid external image assets
 */
const pinSvg = `
<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#34D399"/>
  <circle cx="12" cy="9" r="2.5" fill="white"/>
</svg>
`;

const pinIcon = new L.DivIcon({
  html: pinSvg,
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

interface MapPickerProps {
  /** Callback when user clicks on the map to select a new location */
  onLocationSelect: (lat: number, lng: number) => void;
  /** Callback when an environmental zone is clicked */
  onZoneClick?: (canopy: number, concrete: number) => void;
  /** Current map center – used to recenter the map when geolocation resolves */
  center?: [number, number];
}

/**
 * Main MapPicker component
 */
export default function MapPicker({
  onLocationSelect,
  onZoneClick,
  center,
}: MapPickerProps) {
  // Default center coordinates (fallback to Kolkata)
  const defaultCenter: [number, number] = [22.5726, 88.3639];

  // Effective center: use provided center or default
  const effectiveCenter = useMemo(() => {
    if (center && !Number.isNaN(center[0]) && !Number.isNaN(center[1])) {
      return center;
    }
    return defaultCenter;
  }, [center, defaultCenter]);

  // State to track user-selected position when clicking on the map
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);

  // Generate environmental zones dynamically based on the effective center
  const zones = useMemo(() => {
    // Small fixed offsets that create four distinct zones around the center
    const offsets = [
      { dx: 0.008, dy: -0.005 }, // Zone 1
      { dx: -0.006, dy: 0.01 }, // Zone 2
      { dx: -0.004, dy: -0.009 }, // Zone 3
      { dx: 0.007, dy: 0.006 }, // Zone 4
    ];

    return offsets.map((off, i) => ({
      id: `zone-${i + 1}`,
      center: [
        effectiveCenter[0] + off.dx,
        effectiveCenter[1] + off.dy,
      ] as [number, number],
      radius: 500 + i * 50, // slightly different radii
      canopyCoverage: 20 + (i * 15) % 40,
      concreteRatio: 20 + (i * 20) % 50,
      type: i % 2 === 0 ? "canopy-sink" : "heat-island",
    }));
  }, [effectiveCenter]);

  return (
    <MapContainer
      center={userPosition ?? effectiveCenter}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%" }}
      whenCreated={(mapInstance) => {
        // Ensure map is fully initialized before child components try to attach
        // No-op handler satisfies React-Leaflet mounting lifecycle
      }}
      onClick={(e) => {
        const { lat, lng } = e.latlng;
        setUserPosition([lat, lng]);
        onLocationSelect(lat, lng);
      }}
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* Re-center the map when the incoming `center` prop changes */}
      
      {/* Render each environmental zone as a circle with a popup */}
      {zones.map(zone => (
        <Circle
          key={zone.id}
          center={zone.center}
          radius={zone.radius}
          pathOptions={{
            color: zone.type === "heat-island" ? "#ef4444" : "#10b981",
            fillColor: zone.type === "heat-island" ? "#ef4444" : "#10b981",
            fillOpacity: 0.35,
          }}
          eventHandlers={{
            click: () => {
              onZoneClick?.(
                Math.round(zone.canopyCoverage),
                Math.round(zone.concreteRatio)
              );
            },
          }}
        >
          <Popup className="bg-gray-800 text-white p-2 rounded text-sm shadow-lg">
            <div className="font-semibold mb-1 text-emerald-300">
              {zone.type === "heat-island" ? "Heat Island" : "Canopy Sink"}
            </div>
            <div className="mt-1">
              <span className="font-medium">Canopy Coverage:</span> {zone.canopyCoverage}%
            </div>
            <div className="mt-1">
              <span className="font-medium">Concrete Ratio:</span> {zone.concreteRatio}%
            </div>
            <div className="mt-2 text-xs text-gray-400">
              💡 Click zone to synchronize 3D canvas simulation parameters.
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Marker that shows the user-selected location (if any) */}
      {userPosition && (
        <Marker position={userPosition} icon={pinIcon} />
      )}
    </MapContainer>
  );
}