import { Component } from "react";
import { createPortal } from "react-dom";
import { formatAcres } from "../utils/areaConverter";
import MapView from "./MapView";
import {
  Map,
  ExternalLink,
  Copy,
  Check,
  X,
  Download,
  FileText,
} from "lucide-react";

const BADGE_COLORS = {
  Residential: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Commercial: "bg-blue-100 text-blue-800 border-blue-200",
  "Mixed Use": "bg-purple-100 text-purple-800 border-purple-200",
  Industrial: "bg-orange-100 text-orange-800 border-orange-200",
  Township: "bg-cyan-100 text-cyan-800 border-cyan-200",
  Other: "bg-gray-100 text-gray-700 border-gray-200",
};

const FILE_CATEGORY_LABELS = {
  sitePlan: "Site Plan",
  ppt: "Presentation",
  conceptualPlan: "Conceptual Plan",
  others: "Other",
};

function ComponentCard({ comp, details }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">{comp}</p>
      <div className="flex flex-wrap gap-4">
        {Object.entries(details).map(([k, v]) => {
          if (!v) return null;
          if (k === "builtUpArea") {
            const sqm = parseFloat(v);
            const sqft = (sqm * 10.7639).toLocaleString("en-IN", { maximumFractionDigits: 0 });
            return (
              <div key={k} className="flex flex-col gap-0.5">
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">Built Up Area</span>
                <span className="text-sm font-semibold text-gray-800">
                  {sqm.toLocaleString("en-IN")} <span className="text-gray-400 font-normal text-xs">sqm</span>
                </span>
                <span className="text-xs text-gray-500">≈ <span className="font-medium text-brand-700">{sqft}</span> sqft</span>
              </div>
            );
          }
          const labelMap = { beds: "Total Beds", rooms: "Total Rooms", buildingConfig: "Building Config" };
          return (
            <div key={k} className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">{labelMap[k] || k}</span>
              <span className={`text-sm font-semibold text-gray-800 ${k === "buildingConfig" ? "font-mono" : ""}`}>
                {k === "buildingConfig" ? v : parseFloat(v).toLocaleString("en-IN")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error("Modal Error:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Something went wrong</h3>
            <p className="text-sm text-gray-500 mb-4">Unable to load project details.</p>
            <button onClick={this.props.onClose} className="px-4 py-2 bg-brand-900 text-white rounded-lg text-sm font-medium">Close</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ProjectModal({ project, onClose, copiedId, onCopy }) {
  if (!project) return null;

  const hasFiles = project.files && typeof project.files === "object" &&
    Object.entries(project.files).some(([, v]) => v && typeof v === "object" && Object.keys(v).length > 0);

  return createPortal(
    <ErrorBoundary onClose={onClose}>
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn" style={{ zIndex: 9999 }}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden animate-scaleIn flex flex-col">

          {/* ── Dark header ── */}
          <div className="shrink-0 px-6 pt-6 pb-5" style={{ backgroundColor: "#0D2421" }}>
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Builder + type badge */}
            <div className="flex items-start gap-3 pr-8">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white truncate">{project.builderName}</h2>
                {project.builderAlias && (
                  <p className="text-white/50 text-sm mt-0.5">{project.builderAlias}</p>
                )}
              </div>
              {project.projectType && (
                <span
                  className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border mt-0.5"
                  style={{ backgroundColor: "rgba(201,168,76,0.18)", color: "#C9A84C", borderColor: "rgba(201,168,76,0.3)" }}
                >
                  {project.projectType}
                </span>
              )}
            </div>

            {/* Location */}
            {project.projectLocation && (
              <p className="flex items-center gap-1.5 text-white/50 text-xs mt-2">
                <Map className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{project.projectLocation}</span>
              </p>
            )}

            {/* Quick stat pills */}
            <div className="flex flex-wrap gap-2 mt-4">
              {project.areaInAcres > 0 && (
                <span className="bg-white/10 text-white/80 text-xs px-3 py-1 rounded-full border border-white/15">
                  {formatAcres(project.areaInAcres)} Acres
                </span>
              )}
              {project.totalUnits > 0 && (
                <span className="bg-white/10 text-white/80 text-xs px-3 py-1 rounded-full border border-white/15">
                  {project.totalUnits} Units
                </span>
              )}
              {project.density > 0 && (
                <span className="bg-white/10 text-white/80 text-xs px-3 py-1 rounded-full border border-white/15">
                  {project.density} u/acre
                </span>
              )}
              {project.floorConfig && (
                <span className="bg-white/10 text-white/80 text-xs px-3 py-1 rounded-full border border-white/15">
                  {project.floorConfig}
                </span>
              )}
              {project.date && (
                <span className="bg-white/10 text-white/80 text-xs px-3 py-1 rounded-full border border-white/15">
                  {project.date}
                </span>
              )}
            </div>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Left: details */}
              <div className="space-y-6">

                {/* Proposal Number */}
                {project.proposalNumber && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Proposal Number</p>
                    <button
                      onClick={() => onCopy(project.proposalNumber, `modal-${project.id}`)}
                      className="flex items-center gap-2 font-mono text-sm text-brand-800 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 hover:bg-brand-100 transition-colors group w-full"
                      title="Click to copy"
                    >
                      <span className="flex-1 text-left truncate">{project.proposalNumber}</span>
                      {copiedId === `modal-${project.id}` ? (
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Copy className="w-4 h-4 text-brand-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  </div>
                )}

                {/* Detail grid */}
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Project Details</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {[
                      ["Category", project.applicationCategory],
                      ["Date", project.date],
                      ["Area", project.areaInAcres ? `${formatAcres(project.areaInAcres)} Acres` : null],
                      ...(project.isMixedUse ? [] : [
                        ["Total Units", project.totalUnits || null],
                        ["Density", project.density ? `${project.density} units/acre` : null],
                        ["Floor Config", project.floorConfig && project.parsedFloors
                          ? `${project.floorConfig} (${project.parsedFloors} above ground)`
                          : project.floorConfig || null],
                      ]),
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-0.5">
                        <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{k}</span>
                        <span className="text-sm text-gray-900 font-semibold">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mixed Use: Residential + Commercial sections */}
                {project.isMixedUse ? (
                  <>
                    {/* Residential section */}
                    {(project.totalUnits > 0 || project.density > 0 || project.floorConfig) && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-4">
                        <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          Residential Component
                        </p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          {[
                            ["Total Units", project.totalUnits || null],
                            ["Density", project.density ? `${project.density} units/acre` : null],
                            ["Floor Config", project.floorConfig && project.parsedFloors
                              ? `${project.floorConfig} (${project.parsedFloors} above ground)`
                              : project.floorConfig || null],
                          ].filter(([, v]) => v).map(([k, v]) => (
                            <div key={k} className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">{k}</span>
                              <span className="text-sm text-gray-900 font-semibold">{v}</span>
                            </div>
                          ))}
                        </div>
                        {project.projectConsistsOf?.filter(t => ["Apartment","Villament","Villa","Row house","Plot"].includes(t)).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-emerald-200">
                            {project.projectConsistsOf.filter(t => ["Apartment","Villament","Villa","Row house","Plot"].includes(t)).map(t => (
                              <span key={t} className="badge bg-emerald-100 text-emerald-700 border-emerald-200">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Commercial section */}
                    {project.componentDetails && Object.keys(project.componentDetails).length > 0 && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-4">
                        <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                          Commercial Component
                        </p>
                        <div className="space-y-2">
                          {Object.entries(project.componentDetails).map(([comp, details]) => (
                            <ComponentCard key={comp} comp={comp} details={details} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Project consists of (non-mixed) */}
                    {project.projectConsistsOf?.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Consists Of</p>
                        <div className="flex flex-wrap gap-2">
                          {project.projectConsistsOf.map((type) => (
                            <span key={type} className="badge bg-gray-100 text-gray-700 border-gray-200">{type}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Commercial component details (non-mixed) */}
                    {project.componentDetails && Object.keys(project.componentDetails).length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Component Details</p>
                        <div className="space-y-2">
                          {Object.entries(project.componentDetails).map(([comp, details]) => (
                            <ComponentCard key={comp} comp={comp} details={details} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Documents */}
                {hasFiles && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Documents</p>
                    <div className="space-y-1.5">
                      {Object.entries(project.files).map(([cat, urls]) =>
                        Object.entries(urls).map(([name, url]) => (
                          <a
                            key={`${cat}-${name}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 text-sm text-gray-700 hover:text-brand-900 bg-gray-50 hover:bg-brand-50 border border-gray-200 hover:border-brand-200 rounded-lg px-3 py-2.5 transition-all group"
                          >
                            <FileText className="w-4 h-4 text-gray-400 group-hover:text-brand-600 shrink-0" />
                            <span className="flex-1 truncate font-medium">{name}</span>
                            <span className="text-[11px] text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full shrink-0">
                              {FILE_CATEGORY_LABELS[cat] || cat}
                            </span>
                            <Download className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-500 shrink-0" />
                          </a>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: map */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Boundary Visualization</p>
                <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                  {project.geojson ? (
                    <MapView
                      geojson={(() => {
                        try {
                          return typeof project.geojson === "string" ? JSON.parse(project.geojson) : project.geojson;
                        } catch { return null; }
                      })()}
                      height="420px"
                      fallback={
                        <div className="h-[420px] flex flex-col items-center justify-center text-gray-300 bg-gray-50 gap-3">
                          <Map className="w-12 h-12 opacity-40" />
                          <span className="text-sm">Error loading map</span>
                        </div>
                      }
                    />
                  ) : (
                    <div className="h-[420px] flex flex-col items-center justify-center text-gray-300 gap-3">
                      <Map className="w-12 h-12 opacity-40" />
                      <span className="text-sm text-gray-400">No boundary uploaded</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>,
    document.body
  );
}
