import { useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's broken default icon path in webpack/vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// SVG-based red pin DivIcon — works reliably in all Vite/webpack builds
// without needing any local PNG asset resolution.
const redIcon = L.divIcon({
  className: "",
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
      <path
        d="M14 0C6.268 0 0 6.268 0 14c0 9.625 12.175 24.5 13.15 25.675a1.1 1.1 0 0 0 1.7 0C15.825 38.5 28 23.625 28 14 28 6.268 21.732 0 14 0z"
        fill="#e53e3e"
        stroke="#b91c1c"
        stroke-width="1"
      />
      <circle cx="14" cy="14" r="5.5" fill="#fff" opacity="0.9"/>
    </svg>`,
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -38],
});

/**
 * Pan + fit the map to a GeoJSON layer's bounds whenever geojson changes.
 */
function FitBounds({ geojson }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson) return;
    try {
      const layer = L.geoJSON(geojson);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 });
      }
    } catch {
      /* ignore */
    }
  }, [geojson, map]);
  return null;
}

// Add debugging logs to trace marker rendering
function CustomMarkers({ geojson }) {
  const map = useMap();

  useEffect(() => {
    if (!geojson) {
      console.warn("No GeoJSON data provided for markers.");
      return;
    }

    console.log("Rendering markers with GeoJSON data:", geojson);

    const markers = L.geoJSON(geojson, {
      pointToLayer: (feature, latlng) => {
        console.log("Creating marker at:", latlng, "with feature:", feature);
        const marker = L.marker(latlng, { icon: redIcon });
        if (feature.properties && feature.properties.name) {
          marker.bindPopup(feature.properties.name);
        }
        return marker;
      },
    });

    markers.addTo(map);

    return () => {
      console.log("Removing markers from map.");
      map.removeLayer(markers);
    };
  }, [geojson, map]);

  return null;
}

/**
 * MapView — renders a Leaflet map with an optional GeoJSON overlay.
 *
 * Props:
 *   geojson  {object|null}   GeoJSON FeatureCollection from KML
 *   height   {string}        CSS height, default '400px'
 */
export default function MapView({ geojson, height = "400px" }) {
  const geoJsonKey = geojson ? JSON.stringify(geojson).slice(0, 40) : "empty";

  return (
    <div
      style={{
        height,
        borderRadius: "0.75rem",
        overflow: "hidden",
        position: "relative",
      }}
      className="border border-slate-200 shadow-md"
    >
      <MapContainer
        center={[20.5937, 78.9629]} // India center
        zoom={5}
        style={{ height: "100%", width: "100%", background: "#f8fafb" }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {geojson && (
          <GeoJSON
            key={geoJsonKey}
            data={geojson}
            style={{
              color: "#153E3B",
              weight: 2.5,
              opacity: 0.9,
              fillColor: "#22c55e",
              fillOpacity: 0.15,
            }}
          />
        )}

        {geojson && <FitBounds geojson={geojson} />}

        {geojson && <CustomMarkers geojson={geojson} />}
      </MapContainer>

      {!geojson && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 1000,
          }}
          className="text-slate-400 text-sm gap-3"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-slate-400"
            >
              <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-medium text-slate-600">
              Upload a KML file to see the site boundary
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Drag and drop or click to browse
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
