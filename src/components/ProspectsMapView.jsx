import { useState, useEffect, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getAllProjects } from "../services/projectService";
import { formatAcres } from "../utils/areaConverter";
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Map,
  Building2,
  Ruler,
  BarChart3,
  Calendar,
  Hash,
  Copy,
  Check,
  FolderOpen,
  Layers,
  X,
} from "lucide-react";

// Fix Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Colour palette — cycles per project
const BOUNDARY_COLORS = [
  "#153E3B",
  "#0ea5e9",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#10b981",
  "#f97316",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
];
const getColor = (i) => BOUNDARY_COLORS[i % BOUNDARY_COLORS.length];

// ── Helper: compute centroid of a GeoJSON FeatureCollection ────────────────────
function getCentroid(geojson) {
  try {
    const layer = L.geoJSON(geojson);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      return bounds.getCenter(); // { lat, lng }
    }
  } catch {
    /* ignore */
  }
  return null;
}

// ── Fit all GeoJSON layers into view on mount ──────────────────────────────────
function FitAll({ projects }) {
  const map = useMap();
  useEffect(() => {
    const layers = projects
      .filter((p) => p.geojson)
      .map((p) => {
        try {
          const geo =
            typeof p.geojson === "string" ? JSON.parse(p.geojson) : p.geojson;
          return L.geoJSON(geo);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (layers.length === 0) return;
    const group = L.featureGroup(layers);
    const bounds = group.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    }
  }, [projects, map]);
  return null;
}

// ── Create a professional teardrop SVG pin with label ─────────────────────────
function makePinIcon(name, color, isActive) {
  const size = isActive ? 38 : 30;
  const r = isActive ? 12 : 9.5;
  const cx = size / 2;
  const shadow = isActive
    ? "0 4px 16px rgba(0,0,0,0.35)"
    : "0 2px 8px rgba(0,0,0,0.25)";
  const redColor = "#e53e3e"; // Always use red color
  const pinHtml = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:0;cursor:pointer;">
      <svg xmlns="http://www.w3.org/2000/svg"
           width="${size}" height="${size * 1.4}"
           viewBox="0 0 ${size} ${size * 1.4}"
           style="filter:drop-shadow(${shadow});display:block;">
        <path
          d="M${cx} 0
             C${cx * 0.4} 0 0 ${cx * 0.55} 0 ${cx * 1.1}
             C0 ${cx * 1.75} ${cx} ${size * 1.4 - 2} ${cx} ${size * 1.4 - 2}
             C${cx} ${size * 1.4 - 2} ${size} ${cx * 1.75} ${size} ${cx * 1.1}
             C${size} ${cx * 0.55} ${cx * 1.6} 0 ${cx} 0Z"
          fill="${redColor}"
          stroke="${isActive ? "#fff" : "rgba(0,0,0,0.12)"}"
          stroke-width="${isActive ? 2 : 1}"
        />
        <circle cx="${cx}" cy="${cx * 0.95}" r="${r}" fill="#fff" opacity="0.92"/>
        ${
          isActive
            ? `<circle cx="${cx}" cy="${cx * 0.95}" r="${r * 0.45}" fill="${redColor}"/>`
            : ""
        }
      </svg>
      <div style="
        background:${redColor};
        color:#fff;
        font-size:10px;
        font-weight:700;
        font-family:'Inter',system-ui,sans-serif;
        white-space:nowrap;
        padding:2px 7px;
        border-radius:10px;
        margin-top:-1px;
        box-shadow:0 1px 6px rgba(0,0,0,0.22);
        max-width:120px;
        overflow:hidden;
        text-overflow:ellipsis;
        letter-spacing:0.01em;
      ">${name}</div>
    </div>
  `;
  const totalH = size * 1.4 + 22;
  return L.divIcon({
    html: pinHtml,
    className: "",
    iconSize: [size, totalH],
    iconAnchor: [size / 2, totalH],
    popupAnchor: [0, -totalH],
  });
}

// ── Expandable project card ────────────────────────────────────────────────────
function ProjectCard({
  project,
  index,
  isExpanded,
  onToggle,
  onSeeMore,
  copiedId,
  onCopy,
  onClose,
}) {
  const color = getColor(index);
  return (
    <div
      className="rounded-xl border shadow-md overflow-hidden transition-all duration-300"
      style={{
        borderColor: color + "55",
        background: "rgba(255,255,255,0.97)",
      }}
    >
      {/* Header — always visible */}
      <div className="flex items-center justify-between px-4 py-3 text-left">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 min-w-0 flex-1 hover:bg-slate-50 transition-colors rounded-lg px-2 py-1"
          style={{ borderLeft: `4px solid #22c55e` }}
        >
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ background: "#22c55e" }}
          />
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 text-sm leading-tight truncate">
              {project.builderAlias || project.builderName}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-3 animate-fadeIn">
          {/* Proposal number */}
          {project.proposalNumber && (
            <div className="flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <button
                onClick={() =>
                  onCopy(project.proposalNumber, `map-${project.id}`)
                }
                className="flex items-center gap-1.5 font-mono text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded px-2 py-1 hover:bg-brand-100 transition-colors group"
                title="Click to copy"
              >
                <span>{project.proposalNumber}</span>
                {copiedId === `map-${project.id}` ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                icon: Map,
                label: "Location",
                value: project.projectLocation,
                full: true,
              },
              { icon: Building2, label: "Type", value: project.projectType },
              { icon: Calendar, label: "Date", value: project.date },
              {
                icon: Ruler,
                label: "Area",
                value: project.areaInAcres
                  ? `${formatAcres(project.areaInAcres)} Ac`
                  : "—",
              },
              {
                icon: BarChart3,
                label: "Density",
                value: project.density ? `${project.density} u/ac` : "—",
              },
              {
                icon: Layers,
                label: "Floors",
                value: project.floorConfig || "—",
              },
            ].map(({ icon: Icon, label, value, full }) => (
              <div
                key={label}
                className={`flex items-start gap-1.5 ${
                  full ? "col-span-2" : ""
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide">
                    {label}
                  </div>
                  <div
                    className="text-xs text-slate-800 font-medium truncate"
                    title={value}
                  >
                    {value || "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* See More */}
          <button
            onClick={() => onSeeMore(project)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "#22c55e" }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            See More Details
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ProspectsMapView({ onViewProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllProjects();
      setProjects(data);
    } catch (err) {
      setError(err.message || "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const toggleExpand = (id) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const selectProject = (project) => {
    setSelectedProject(project);
    setExpandedId(project.id);
  };

  const closeProject = () => {
    setSelectedProject(null);
    setExpandedId(null);
  };

  const projectsWithGeo = projects.filter((p) => p.geojson);
  const projectsNoGeo = projects.filter((p) => !p.geojson);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-surface-900">
            All Prospects — Map View
          </h2>
          <p className="text-sm text-surface-500 mt-0.5">
            {loading
              ? "Loading projects…"
              : `${projects.length} projects · ${projectsWithGeo.length} with boundaries`}
          </p>
        </div>
        <button onClick={load} className="btn-ghost text-xs" title="Refresh">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Map wrapper */}
      <div
        className="relative rounded-2xl overflow-hidden border border-surface-200 shadow-lg"
        style={{ height: "76vh", minHeight: 480 }}
      >
        {/* Leaflet map */}
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {!loading && <FitAll projects={projectsWithGeo} />}

          {/* GeoJSON boundaries + named pins */}
          {projectsWithGeo.map((project, i) => {
            let geo;
            try {
              geo =
                typeof project.geojson === "string"
                  ? JSON.parse(project.geojson)
                  : project.geojson;
            } catch {
              return null;
            }

            const color = getColor(i);
            const isActive = expandedId === project.id;
            const centroid = getCentroid(geo);

            return (
              <span key={project.id}>
                {/* Coloured boundary */}
                <GeoJSON
                  data={geo}
                  style={{
                    color,
                    weight: isActive ? 4 : 2.5,
                    opacity: 1,
                    fillColor: color,
                    fillOpacity: isActive ? 0.3 : 0.15,
                  }}
                  onEachFeature={(_, layer) => {
                    layer.on("click", () => selectProject(project));
                  }}
                />

                {/* Named pin at centroid */}
                {centroid && (
                  <Marker
                    position={[centroid.lat, centroid.lng]}
                    icon={makePinIcon(
                      project.builderAlias || project.builderName,
                      color,
                      isActive
                    )}
                    eventHandlers={{ click: () => selectProject(project) }}
                  >
                    <Tooltip
                      direction="top"
                      offset={[0, -4]}
                      opacity={0.95}
                      permanent={false}
                    >
                      <span className="text-xs font-semibold">
                        {project.builderAlias || project.builderName}
                      </span>
                      {project.projectLocation && (
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {project.projectLocation}
                        </span>
                      )}
                    </Tooltip>
                  </Marker>
                )}
              </span>
            );
          })}

          {/* Pins for projects WITHOUT geo (place at India center fallback — skip if no coords) */}
          {projectsNoGeo.map((project, ii) => {
            const coords = project.coordinates;
            if (!coords?.lat || !coords?.lng) return null;
            const color = getColor(projectsWithGeo.length + ii);
            const isActive = expandedId === project.id;
            return (
              <Marker
                key={project.id}
                position={[coords.lat, coords.lng]}
                icon={makePinIcon(
                  project.builderAlias || project.builderName,
                  color,
                  isActive
                )}
                eventHandlers={{ click: () => selectProject(project) }}
              />
            );
          })}
        </MapContainer>

        {/* Cards panel — right overlay - only show selected project */}
        <div className="absolute top-3 right-3 z-[1000]" style={{ width: 280 }}>
          {selectedProject && (
            <ProjectCard
              project={selectedProject}
              index={projects.findIndex((p) => p.id === selectedProject.id)}
              isExpanded={expandedId === selectedProject.id}
              onToggle={() => toggleExpand(selectedProject.id)}
              onSeeMore={(p) => onViewProject && onViewProject(p)}
              copiedId={copiedId}
              onCopy={handleCopy}
              onClose={closeProject}
            />
          )}
        </div>

        {/* Bottom-left note for projects without boundary */}
        {!loading && projectsNoGeo.length > 0 && (
          <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-500 shadow">
            {projectsNoGeo.length} project{projectsNoGeo.length > 1 ? "s" : ""}{" "}
            without KML boundary
          </div>
        )}
      </div>
    </div>
  );
}
