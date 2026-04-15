"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { divIcon, type LatLngExpression } from "leaflet";

const markerIcon = divIcon({
  className: "pointer-worksite-marker",
  html: "<span></span>",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function MapViewport({ center }: { center: LatLngExpression }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 17, { animate: true });
  }, [center, map]);

  return null;
}

function ClickableMarker({
  position,
  onPositionChange,
}: {
  position: [number, number];
  onPositionChange: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onPositionChange(event.latlng.lat, event.latlng.lng);
    },
  });

  return (
    <Marker
      position={position}
      icon={markerIcon}
      draggable
      eventHandlers={{
        dragend(event) {
          const marker = event.target;
          const latLng = marker.getLatLng();
          onPositionChange(latLng.lat, latLng.lng);
        },
      }}
    />
  );
}

export function WorksiteMapPicker({
  latitude,
  longitude,
  onPositionChange,
}: {
  latitude: number;
  longitude: number;
  onPositionChange: (latitude: number, longitude: number) => void;
}) {
  const center: [number, number] = [latitude, longitude];

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-border bg-white/80">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Confirme o local no mapa</p>
        <p className="mt-1 text-sm text-muted">
          Arraste o marcador ou toque no mapa para fixar o ponto exato da empresa.
        </p>
      </div>
      <MapContainer center={center} zoom={17} scrollWheelZoom={false} className="h-72 w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport center={center} />
        <ClickableMarker position={center} onPositionChange={onPositionChange} />
      </MapContainer>
    </div>
  );
}
