import { useState, useEffect, useCallback, memo } from "react";
import {
  getAllProjects,
  deleteProject,
  getCollectionForType,
} from "../services/projectService";
import { formatAcres } from "../utils/areaConverter";
import MapView from "./MapView";
import ProjectModal from "./ProjectModal";
import {
  Calendar,
  Building2,
  Ruler,
  BarChart3,
  Layers,
  RefreshCw,
  FolderOpen,
  ExternalLink,
  X,
  Map,
  Home,
  Copy,
  Check,
} from "lucide-react";

const SORT_OPTIONS = [
  { key: "date", label: "Date", icon: Calendar },
  { key: "builderName", label: "Builder", icon: Building2 },
  { key: "areaInAcres", label: "Size", icon: Ruler },
  { key: "density", label: "Density", icon: BarChart3 },
  { key: "parsedFloors", label: "Floors", icon: Layers },
];

const BADGE_COLORS = {
  Residential: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Commercial: "bg-blue-50 text-blue-700 border-blue-200",
  "Mixed Use": "bg-purple-50 text-purple-700 border-purple-200",
  Industrial: "bg-orange-50 text-orange-700 border-orange-200",
  Township: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Other: "bg-slate-50 text-slate-700 border-slate-200",
};

function SortButton({ opt, active, dir, onClick }) {
  const Icon = opt.icon;
  return (
    <button
      id={`sort_${opt.key}`}
      type="button"
      onClick={() => onClick(opt.key)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border ${
        active
          ? "text-white border-transparent shadow-sm"
          : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-800"
      }`}
      style={active ? { backgroundColor: "#0D2421" } : undefined}
    >
      <Icon className="w-3.5 h-3.5" />
      {opt.label}
      {active && (
        <span className="ml-0.5 opacity-80">{dir === "asc" ? "↑" : "↓"}</span>
      )}
    </button>
  );
}

// Generate random widths outside of render to avoid impure function calls
const generateShimmerWidths = () =>
  Array(11)
    .fill(0)
    .map(() => 60 + Math.random() * 40);

const SkeletonRow = memo(() => {
  const widths = generateShimmerWidths();
  return (
    <tr>
      {widths.map((width, i) => (
        <td key={i} className="p-4 border-b border-surface-200">
          <div className="h-3 rounded shimmer" style={{ width: `${width}%` }} />
        </td>
      ))}
    </tr>
  );
});

export default function Dashboard({
  onViewProject,
  initialSelected,
  currentUser,
  userProfile,
  propertyType = "residential",
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedProject, setSelectedProject] = useState(
    initialSelected || null,
  );
  const [copiedId, setCopiedId] = useState(null);

  // New state variables for filters
  const [builderFilter, setBuilderFilter] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [sizeRange, setSizeRange] = useState({ min: "", max: "" });

  // Auto-expand when navigated from the map view
  useEffect(() => {
    if (initialSelected) {
      setSelectedProject(initialSelected);
    }
  }, [initialSelected]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllProjects(getCollectionForType(propertyType));
      setProjects(data);
    } catch (err) {
      console.error("Dashboard: Error loading projects:", err);
      setError(err.message || "Failed to load projects. Check Firebase config.");
    } finally {
      setLoading(false);
    }
  }, [propertyType]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "builderName" ? "asc" : "desc");
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      if (!projectId) return;
      await deleteProject(projectId, currentUser?.uid, getCollectionForType(propertyType));
      alert("Project deleted successfully.");

      // Remove the deleted project from the state
      setProjects((prevProjects) =>
        prevProjects.filter((project) => project.id !== projectId),
      );
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project. Please try again.");
    }
  };

  // Apply filters to the projects
  const filteredProjects = projects.filter((project) => {
    const matchesBuilder = builderFilter
      ? project.builderName?.toLowerCase().includes(builderFilter.toLowerCase())
      : true;

    const matchesDateRange =
      dateRange.start && dateRange.end
        ? new Date(project.date) >= new Date(dateRange.start) &&
          new Date(project.date) <= new Date(dateRange.end)
        : true;

    const matchesSizeRange =
      sizeRange.min && sizeRange.max
        ? project.areaInAcres >= parseFloat(sizeRange.min) &&
          project.areaInAcres <= parseFloat(sizeRange.max)
        : true;

    return matchesBuilder && matchesDateRange && matchesSizeRange;
  });

  const sorted = [...filteredProjects].sort((a, b) => {
    let va, vb;
    if (sortKey === "date") {
      va = a.date || "";
      vb = b.date || "";
    } else {
      va = a[sortKey] ?? 0;
      vb = b[sortKey] ?? 0;
    }
    const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const fmt = (v, unit = "") =>
    v !== undefined && v !== null && v !== "" ? `${v}${unit}` : "—";

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Filter Controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Filter by Builder</label>
            <input
              type="text"
              className="input-field"
              value={builderFilter}
              onChange={(e) => setBuilderFilter(e.target.value)}
              placeholder="Enter builder name…"
            />
          </div>
          <div>
            <label className="label">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                className="input-field"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
              />
              <input
                type="date"
                className="input-field"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label className="label">Size Range (Acres)</label>
            <div className="flex gap-2">
              <input
                type="number"
                className="input-field"
                value={sizeRange.min}
                onChange={(e) =>
                  setSizeRange((prev) => ({ ...prev, min: e.target.value }))
                }
                placeholder="Min"
              />
              <input
                type="number"
                className="input-field"
                value={sizeRange.max}
                onChange={(e) =>
                  setSizeRange((prev) => ({ ...prev, max: e.target.value }))
                }
                placeholder="Max"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Projects", value: filteredProjects.length, icon: Building2, color: "bg-brand-50 text-brand-700" },
            {
              label: "Total Area (Acres)",
              value: formatAcres(filteredProjects.reduce((s, p) => s + (p.areaInAcres || 0), 0)),
              icon: Map,
              color: "bg-emerald-50 text-emerald-700",
            },
            propertyType === "commercial" ? {
              label: "Total BUA (sqft)",
              value: (() => {
                const totalSqm = filteredProjects.reduce((s, p) => {
                  if (!p.componentDetails) return s;
                  return s + Object.values(p.componentDetails).reduce((cs, d) => cs + (parseFloat(d.builtUpArea) || 0), 0);
                }, 0);
                return (totalSqm * 10.7639).toLocaleString("en-IN", { maximumFractionDigits: 0 });
              })(),
              icon: Ruler,
              color: "bg-blue-50 text-blue-700",
            } : {
              label: "Total Units",
              value: filteredProjects.reduce((s, p) => s + (p.totalUnits || 0), 0).toLocaleString(),
              icon: Home,
              color: "bg-blue-50 text-blue-700",
            },
            {
              label: "Unique Builders",
              value: new Set(filteredProjects.map((p) => p.builderName)).size,
              icon: FolderOpen,
              color: "bg-purple-50 text-purple-700",
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{stat.label}</div>
                  <div className="text-3xl font-bold text-gray-900 tracking-tight leading-none">{stat.value}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sort Controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mr-1">Sort:</span>
          {SORT_OPTIONS.map((opt) => (
            <SortButton
              key={opt.key}
              opt={opt}
              active={sortKey === opt.key}
              dir={sortDir}
              onClick={handleSort}
            />
          ))}
          <button
            id="refreshProjects"
            type="button"
            onClick={load}
            className="btn-ghost ml-auto text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
          ⚠ {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Mode banner */}
        <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2" style={{ backgroundColor: "#f0f4f3" }}>
          <span className="text-xs font-semibold text-brand-700">
            Showing {sorted.length} {propertyType} project{sorted.length !== 1 ? "s" : ""}
          </span>
          {(builderFilter || dateRange.start || sizeRange.min) && (
            <span className="text-[11px] text-gray-400 ml-1">(filtered)</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Proposal No.</th>
                <th>Builder</th>
                <th>Type</th>
                <th>Location</th>
                <th>Area (Acres)</th>
                {propertyType === "commercial" ? (
                  <th>Components</th>
                ) : (
                  <>
                    <th>Units</th>
                    <th>Density</th>
                  </>
                )}
                <th>Floors</th>
                <th>Date</th>
                <th>Map</th>
                {userProfile?.role === "admin" && <th>Edit</th>}
                {userProfile?.role === "admin" && <th>Delete</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={userProfile?.role === "admin"
                      ? (propertyType === "commercial" ? 11 : 12)
                      : (propertyType === "commercial" ? 9 : 10)}
                    className="text-center py-20"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
                        <FolderOpen className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-gray-700 font-semibold">No projects found</p>
                        <p className="text-sm text-gray-400 mt-0.5">
                          Add a project using the form to get started.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((project) => (
                  <tr
                    key={project.id}
                    onClick={() =>
                      setSelectedProject(selectedProject?.id === project.id ? null : project)
                    }
                    className="cursor-pointer transition-colors"
                    style={{
                      background: selectedProject?.id === project.id
                        ? "rgba(21,62,59,0.05)"
                        : undefined,
                    }}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      {project.proposalNumber ? (
                        <button
                          onClick={() => handleCopy(project.proposalNumber, project.id)}
                          className="flex items-center gap-1.5 font-mono text-xs text-brand-800 bg-brand-50 border border-brand-200 rounded-lg px-2 py-1 hover:bg-brand-100 transition-colors group"
                          title="Click to copy"
                        >
                          <span>{project.proposalNumber}</span>
                          {copiedId === project.id ? (
                            <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          ) : (
                            <Copy className="w-3 h-3 text-brand-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <div className="font-semibold text-gray-900">{project.builderName}</div>
                      {project.builderAlias && (
                        <div className="text-xs text-gray-400 mt-0.5">{project.builderAlias}</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge border ${BADGE_COLORS[project.projectType] || BADGE_COLORS["Other"]}`}>
                        {project.projectType || "—"}
                      </span>
                    </td>
                    <td className="max-w-[200px]">
                      <span className="text-gray-500 text-xs line-clamp-2" title={project.projectLocation}>
                        {project.projectLocation || "—"}
                      </span>
                    </td>
                    <td className="font-mono text-gray-700 text-xs">
                      {project.areaInAcres ? formatAcres(project.areaInAcres) : "—"}
                    </td>
                    {propertyType === "commercial" ? (
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {project.projectConsistsOf?.length > 0
                            ? project.projectConsistsOf.map((c) => (
                                <span key={c} className="badge bg-blue-50 text-blue-700 border-blue-200 text-[10px]">{c}</span>
                              ))
                            : <span className="text-gray-300 text-xs">—</span>}
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="text-gray-700">{fmt(project.totalUnits)}</td>
                        <td className="font-mono text-gray-600 text-xs">
                          {project.density ? `${project.density}` : "—"}
                        </td>
                      </>
                    )}
                    <td>
                      {project.floorConfig ? (
                        <span title={`Parsed: ${project.parsedFloors} floors above ground`} className="text-xs">
                          {project.floorConfig}
                          <span className="ml-1 text-gray-400">({project.parsedFloors})</span>
                        </span>
                      ) : "—"}
                    </td>
                    <td className="whitespace-nowrap text-gray-400 text-xs">{project.date || "—"}</td>
                    <td>
                      {project.geojson ? (
                        <span className="badge bg-emerald-50 text-emerald-700 border-emerald-200">✓ KML</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    {userProfile?.role === "admin" && (
                      <td>
                        <button
                          onClick={(e) => { e.stopPropagation(); onViewProject(project, true); }}
                          className="text-xs px-2.5 py-1.5 rounded-lg font-medium text-white transition-colors"
                          style={{ backgroundColor: "#153E3B" }}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                    {userProfile?.role === "admin" && (
                      <td>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Type DELETE to confirm deletion of project: ${project.builderName}`)) {
                              const userInput = prompt("Type DELETE to confirm deletion:");
                              if (userInput === "DELETE") {
                                handleDeleteProject(project.id);
                              } else {
                                alert("Deletion cancelled. Incorrect confirmation input.");
                              }
                            }
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-lg font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Project Details Modal */}
      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          copiedId={copiedId}
          onCopy={handleCopy}
        />
      )}
    </div>
  );
}
