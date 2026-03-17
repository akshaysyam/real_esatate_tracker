import { useState, useEffect, useCallback } from "react";
import { getAllProjects, deleteProject } from "../services/projectService";
import { formatAcres } from "../utils/areaConverter";
import MapView from "./MapView";
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
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
        active
          ? "bg-surface-100 text-surface-900 border-surface-300 shadow-sm"
          : "bg-white text-surface-600 border-surface-200 hover:bg-surface-50 hover:text-surface-900"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {opt.label}
      {active && (
        <span className="ml-0.5 opacity-70">{dir === "asc" ? "↑" : "↓"}</span>
      )}
    </button>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[...Array(11)].map((_, i) => (
        <td key={i} className="px-4 py-3 border-b border-white/5">
          <div
            className="h-3 rounded shimmer"
            style={{ width: `${60 + Math.random() * 40}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function Dashboard({ onViewProject, initialSelected }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedProject, setSelectedProject] = useState(
    initialSelected || null
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
      const data = await getAllProjects();
      setProjects(data);
    } catch (err) {
      setError(
        err.message || "Failed to load projects. Check Firebase config."
      );
    } finally {
      setLoading(false);
    }
  }, []);

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
      await deleteProject(projectId); // Call the delete service
      alert("Project deleted successfully.");

      // Remove the deleted project from the state
      setProjects((prevProjects) =>
        prevProjects.filter((project) => project.id !== projectId)
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
    <div className="space-y-6 animate-fadeIn">
      {/* Filter Controls */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Filter by Builder</label>
            <input
              type="text"
              className="input-field"
              value={builderFilter}
              onChange={(e) => setBuilderFilter(e.target.value)}
              placeholder="Enter builder name"
            />
          </div>
          <div>
            <label className="label">Filter by Date Range</label>
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
            <label className="label">Filter by Size Range (Acres)</label>
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
            {
              label: "Total Projects",
              value: projects.length,
              icon: Building2,
            },
            {
              label: "Total Area (Acres)",
              value: formatAcres(
                projects.reduce((s, p) => s + (p.areaInAcres || 0), 0)
              ),
              icon: Map,
            },
            {
              label: "Total Units",
              value: projects
                .reduce((s, p) => s + (p.totalUnits || 0), 0)
                .toLocaleString(),
              icon: Home,
            },
            {
              label: "Total Builders",
              value: new Set(projects.map((p) => p.builderName)).size,
              icon: FolderOpen,
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="glass-card p-5 flex items-start gap-4"
              >
                <div className="p-2.5 bg-brand-50 rounded-lg text-brand-700">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-medium text-surface-500 mb-0.5">
                    {stat.label}
                  </div>
                  <div className="text-2xl font-bold font-sans text-surface-900 tracking-tight">
                    {stat.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sort Controls */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mr-1">
            Sort by:
          </span>
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
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="bg-surface-900/50">
                <th>Proposal No.</th>
                <th>Builder</th>
                <th>Project Type</th>
                <th>Location</th>
                <th>Area (Acres)</th>
                <th>Units</th>
                <th>Density</th>
                <th>Floors</th>
                <th>Date</th>

                <th>Map</th>
                <th>Edit</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    className="text-center py-16 text-surface-500"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-surface-100 rounded-full flex items-center justify-center text-surface-400">
                        <FolderOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-surface-900 font-medium">
                          No projects yet
                        </p>
                        <p className="text-sm text-surface-500 mt-1">
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
                      setSelectedProject(
                        selectedProject?.id === project.id ? null : project
                      )
                    }
                    className="cursor-pointer"
                    style={{
                      background:
                        selectedProject?.id === project.id
                          ? "rgba(14,144,232,0.06)"
                          : undefined,
                    }}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      {project.proposalNumber ? (
                        <button
                          onClick={() =>
                            handleCopy(project.proposalNumber, project.id)
                          }
                          className="flex items-center gap-1.5 font-mono text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded px-2 py-1 hover:bg-brand-100 transition-colors group"
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
                        <span className="text-surface-400 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <div className="font-semibold text-brand-900">
                        {project.builderName}
                      </div>
                      {project.builderAlias && (
                        <div className="text-xs text-surface-500 mt-0.5">
                          {project.builderAlias}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge border ${
                          BADGE_COLORS[project.projectType] ||
                          BADGE_COLORS["Other"]
                        }`}
                      >
                        {project.projectType || "—"}
                      </span>
                    </td>
                    <td className="max-w-[200px]">
                      <span
                        className="text-surface-600 text-xs line-clamp-2"
                        title={project.projectLocation}
                      >
                        {project.projectLocation || "—"}
                      </span>
                    </td>
                    <td className="font-mono text-surface-700">
                      {project.areaInAcres
                        ? formatAcres(project.areaInAcres)
                        : "—"}
                    </td>
                    <td>{fmt(project.totalUnits)}</td>
                    <td className="font-mono text-surface-700">
                      {project.density ? `${project.density}` : "—"}
                    </td>
                    <td>
                      {project.floorConfig ? (
                        <span
                          title={`Parsed: ${project.parsedFloors} floors above ground`}
                        >
                          {project.floorConfig}
                          <span className="ml-1 text-xs text-surface-500">
                            ({project.parsedFloors})
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap text-surface-500 text-xs">
                      {project.date || "—"}
                    </td>

                    <td>
                      {project.geojson ? (
                        <span className="badge bg-emerald-50 text-emerald-700 border-emerald-200">
                          ✓ KML
                        </span>
                      ) : (
                        <span className="text-surface-400 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProject(project, true); // Pass the project data and edit mode flag
                        }}
                        className="btn-primary text-xs px-2 py-1"
                      >
                        Edit
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              `Type DELETE to confirm deletion of project: ${project.builderName}`
                            )
                          ) {
                            const userInput = prompt(
                              "Type DELETE to confirm deletion:"
                            );
                            if (userInput === "DELETE") {
                              handleDeleteProject(project.id);
                            } else {
                              alert(
                                "Deletion cancelled. Incorrect confirmation input."
                              );
                            }
                          }
                        }}
                        className="btn-secondary text-xs px-2 py-1"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Detail Panel */}
      {selectedProject && (
        <div className="glass-card p-6 animate-fadeIn mt-6 border-brand-200 ring-1 ring-brand-100">
          <div className="flex items-start justify-between mb-6 pb-4 border-b border-surface-200">
            <div>
              <h2 className="text-xl font-bold font-sans text-brand-900 tracking-tight">
                {selectedProject.builderName}
              </h2>
              <p className="text-sm text-surface-500 mt-1 flex items-center gap-1.5">
                <Map className="w-3.5 h-3.5" />
                {selectedProject.projectLocation || "No location provided"}
              </p>
            </div>
            <button
              className="btn-ghost text-sm text-surface-500 hover:text-surface-900"
              onClick={() => setSelectedProject(null)}
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-brand-900 uppercase tracking-wider mb-2">
                Project Details
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {/* Proposal Number with copy */}
                {selectedProject.proposalNumber && (
                  <div className="flex flex-col gap-1 border-b border-surface-100 pb-2 col-span-2">
                    <span className="text-xs text-surface-500">
                      Proposal Number
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          selectedProject.proposalNumber,
                          `detail-${selectedProject.id}`
                        )
                      }
                      className="flex items-center gap-2 font-mono text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded px-3 py-1.5 hover:bg-brand-100 transition-colors w-fit group"
                      title="Click to copy"
                    >
                      <span>{selectedProject.proposalNumber}</span>
                      {copiedId === `detail-${selectedProject.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  </div>
                )}
                {[
                  ["Project Type", selectedProject.projectType],
                  ["Category", selectedProject.applicationCategory],
                  ["Date", selectedProject.date],
                  ["Area", `${formatAcres(selectedProject.areaInAcres)} Acres`],
                  ["Total Units", selectedProject.totalUnits],
                  [
                    "Density",
                    selectedProject.density
                      ? `${selectedProject.density} units/acre`
                      : "—",
                  ],
                  [
                    "Floor Config",
                    selectedProject.floorConfig
                      ? `${selectedProject.floorConfig} (${selectedProject.parsedFloors} above ground)`
                      : "—",
                  ],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex flex-col gap-1 border-b border-surface-100 pb-2 col-span-1"
                  >
                    <span className="text-xs text-surface-500">{k}</span>
                    <span className="text-sm text-surface-900 font-medium">
                      {v || "—"}
                    </span>
                  </div>
                ))}

                {/* Project Consists Of */}
                {selectedProject.projectConsistsOf &&
                  selectedProject.projectConsistsOf.length > 0 && (
                    <div className="flex flex-col gap-1 border-b border-surface-100 pb-2 col-span-2">
                      <span className="text-xs text-surface-500">
                        Project Consists Of
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {selectedProject.projectConsistsOf.map((type) => (
                          <span
                            key={type}
                            className="badge bg-brand-50 text-brand-700 border-brand-200"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              {/* Files */}
              {selectedProject.files &&
                Object.entries(selectedProject.files).some(
                  ([, v]) => Object.keys(v).length > 0
                ) && (
                  <div className="pt-4">
                    <h3 className="text-sm font-semibold text-brand-900 uppercase tracking-wider mb-3">
                      Uploaded Documents
                    </h3>
                    <div className="space-y-2 bg-surface-50 p-3 rounded-md border border-surface-200">
                      {Object.entries(selectedProject.files).map(
                        ([cat, urls]) =>
                          Object.entries(urls).map(([name, url]) => (
                            <a
                              key={`${cat}-${name}`}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-sm text-brand-700 hover:text-brand-900 hover:bg-brand-50 p-1.5 rounded transition-colors group"
                            >
                              <ExternalLink className="w-4 h-4 text-brand-400 group-hover:text-brand-600" />
                              <span className="font-medium">{name}</span>
                              <span className="text-xs text-surface-500 bg-white border border-surface-200 px-1.5 py-0.5 rounded-sm ml-auto">
                                {cat}
                              </span>
                            </a>
                          ))
                      )}
                    </div>
                  </div>
                )}
            </div>

            <div className="bg-surface-50 rounded-lg p-2 border border-surface-200">
              <h3 className="text-sm font-semibold text-brand-900 uppercase tracking-wider mb-3 pl-2 pt-2">
                Boundary Visualization
              </h3>
              {selectedProject.geojson ? (
                <div className="rounded-md overflow-hidden ring-1 ring-surface-200">
                  <MapView
                    geojson={
                      typeof selectedProject.geojson === "string"
                        ? JSON.parse(selectedProject.geojson)
                        : selectedProject.geojson
                    }
                    height="320px"
                  />
                </div>
              ) : (
                <div className="h-[320px] flex items-center justify-center text-surface-400 bg-surface-100 rounded-md ring-1 ring-surface-200 flex-col gap-2">
                  <Map className="w-8 h-8 opacity-50" />
                  <span className="text-sm">No spatial data available</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
