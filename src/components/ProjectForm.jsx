import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import MapView from "./MapView";
import { processKml } from "../utils/kmlHandler";
import {
  acresGuntasToAcres,
  sqmToAcres,
  formatAcres,
  computeDensity,
} from "../utils/areaConverter";
import { parseFloors } from "../utils/floorParser";
import {
  addProject,
  uploadFile,
  updateProject,
  getCollectionForType,
  RESIDENTIAL_COLLECTION,
  COMMERCIAL_COLLECTION,
} from "../services/projectService";
import {
  FileText,
  Map,
  Presentation,
  Ruler,
  Paperclip,
  Loader2,
  CheckCircle2,
  UploadCloud,
  Save,
  X,
} from "lucide-react";

// ── Sub-component: Dropzone ──────────────────────────────────────────────────
function FileDropzone({ label, accept, onDrop, files, icon: Icon }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: true,
  });
  return (
    <div>
      <label className="label">{label}</label>
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? "active" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex justify-center mb-2">
          <Icon className="w-8 h-8 text-surface-400" />
        </div>
        <p className="text-sm font-medium text-surface-900 mb-1">
          {isDragActive ? "Drop files here…" : "Click or drag files"}
        </p>
        <p className="text-xs text-surface-500">Upload project documents</p>
        {files.length > 0 && (
          <ul className="mt-4 space-y-1 w-full text-left">
            {files.map((f, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-xs text-surface-600 bg-white border border-surface-200 rounded px-2 py-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                <span className="truncate font-medium">{f.name}</span>
                <span className="ml-auto text-surface-400 shrink-0">
                  {(f.size / 1024).toFixed(0)} KB
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Checkbox option ───────────────────────────────────────────────────────────
function CheckboxOption({ option, form, setForm }) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        value={option}
        checked={form.projectConsistsOf.includes(option)}
        onChange={(e) => {
          const isChecked = e.target.checked;
          setForm((f) => {
            const updated = isChecked
              ? [...f.projectConsistsOf, option]
              : f.projectConsistsOf.filter((item) => item !== option);
            const componentDetails = isChecked
              ? f.componentDetails
              : Object.fromEntries(
                  Object.entries(f.componentDetails || {}).filter(([k]) => k !== option)
                );
            return { ...f, projectConsistsOf: updated, componentDetails };
          });
        }}
        className="form-checkbox h-4 w-4 text-brand-600 border-surface-300 rounded focus:ring-brand-500"
      />
      <span className="text-sm text-surface-900">{option}</span>
    </label>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ children }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1 h-px bg-white/5" />
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {children}
      </span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
const RESIDENTIAL_PROJECT_TYPES = [
  "Residential",
  "Commercial",
  "Mixed Use",
  "Industrial",
  "Township",
  "Other",
];

const COMMERCIAL_PROJECT_TYPES = [
  "Commercial",
  "Mixed Use",
  "Other",
];
const APP_CATEGORIES = ["EC", "CRZ", "EC + CRZ", "ToR", "ToR + EC", "Other"];

// Fields shown per component type in commercial mode.
// Hospital → beds + builtUpArea; Hotel → rooms + builtUpArea; everything else → builtUpArea only.
const RESIDENTIAL_CONSISTS_OPTIONS = ["Apartment", "Villament", "Villa", "Row house", "Plot"];
const COMMERCIAL_CONSISTS_OPTIONS = ["Office Space", "Hospital", "Retail", "School", "College", "Hotel", "Warehouse"];

const SQM_TO_SQFT = 10.7639;
const sqmToSqft = (sqm) => {
  const v = parseFloat(sqm);
  if (!sqm || isNaN(v) || v <= 0) return null;
  return (v * SQM_TO_SQFT).toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const COMPONENT_FIELD_CONFIG = {
  Hospital: [
    { key: "beds", label: "Total Beds", type: "number", placeholder: "e.g. 200" },
    { key: "builtUpArea", label: "Built Up Area (sqm)", type: "number", placeholder: "e.g. 4645" },
    { key: "buildingConfig", label: "Building Config", type: "text", placeholder: "e.g. 2B+G+8" },
  ],
  Hotel: [
    { key: "rooms", label: "Total Rooms", type: "number", placeholder: "e.g. 150" },
    { key: "builtUpArea", label: "Built Up Area (sqm)", type: "number", placeholder: "e.g. 7432" },
    { key: "buildingConfig", label: "Building Config", type: "text", placeholder: "e.g. 2B+G+5" },
  ],
};
const DEFAULT_COMPONENT_FIELDS = [
  { key: "builtUpArea", label: "Built Up Area (sqm)", type: "number", placeholder: "e.g. 2787" },
  { key: "buildingConfig", label: "Building Config", type: "text", placeholder: "e.g. 2B+G+3" },
];

const INITIAL_STATE = {
  builderName: "",
  builderAlias: "",
  proposalNumber: "",
  projectType: "",
  projectLocation: "",
  date: "",
  applicationCategory: "",
  areaMode: "acres",
  acres: "",
  guntas: "",
  sqm: "",
  totalUnits: "",
  floorConfig: "",
  projectConsistsOf: [],
  componentDetails: {},
};

const INPUT_CLASSES =
  "input-field focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all";
const BUTTON_CLASSES =
  "btn-primary w-full justify-center py-3 text-base hover:bg-brand-700 transition-all";

export default function ProjectForm({ onSuccess, initialData, userId, propertyType = "residential" }) {
  const [form, setForm] = useState(initialData || INITIAL_STATE);

  useEffect(() => {
    if (initialData) {
      // Set form fields
      setForm({
        builderName: initialData.builderName || "",
        builderAlias: initialData.builderAlias || "",
        proposalNumber: initialData.proposalNumber || "",
        projectLocation: initialData.projectLocation || "",
        projectType: initialData.projectType || "",
        appCategory: initialData.appCategory || "",
        date: initialData.date || "",
        areaMode: initialData.areaMode || "acres",
        acres: initialData.acres || "",
        guntas: initialData.guntas || "",
        sqm: initialData.sqm || "",
        totalUnits: initialData.totalUnits || "",
        floorConfig: initialData.floorConfig || "",
        projectConsistsOf: initialData.projectConsistsOf || [],
        componentDetails: initialData.componentDetails || {},
      });

      // Set KML data if available
      if (initialData.geojson) {
        try {
          const geojson =
            typeof initialData.geojson === "string"
              ? JSON.parse(initialData.geojson)
              : initialData.geojson;
          setKmlData({
            geojson,
            lat: initialData.coordinates?.lat,
            lng: initialData.coordinates?.lng,
          });
        } catch (error) {
          console.error("Error parsing geojson:", error);
        }
      }

      // IMPORTANT: Don't set file arrays when editing - this prevents fake files from being uploaded
      // The existing files will be preserved through the merge logic in handleSubmit
      setSitePlanFiles([]);
      setPptFiles([]);
      setConceptualFiles([]);
      setOtherFiles([]);
    }
  }, [initialData]);

  const [kmlData, setKmlData] = useState(null); // { geojson, address, lat, lng }
  const [kmlFile, setKmlFile] = useState(null);
  const [kmlLoading, setKmlLoading] = useState(false);
  const [kmlError, setKmlError] = useState("");

  // File vault
  const [sitePlanFiles, setSitePlanFiles] = useState([]);
  const [pptFiles, setPptFiles] = useState([]);
  const [conceptualFiles, setConceptualFiles] = useState([]);
  const [otherFiles, setOtherFiles] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  // ── Computed values
  const areaInAcres =
    form.areaMode === "acres"
      ? acresGuntasToAcres(form.acres, form.guntas)
      : sqmToAcres(form.sqm);

  const parsedFloors = parseFloors(form.floorConfig);
  const density = computeDensity(parseInt(form.totalUnits) || 0, areaInAcres);
  const isMixedUse = form.projectType === "Mixed Use";

  // Clear projectConsistsOf when projectType changes so stale options don't linger
  useEffect(() => {
    setForm((f) => ({ ...f, projectConsistsOf: [], componentDetails: {} }));
  }, [form.projectType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers
  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const setComponentDetail = (component, field, value) =>
    setForm((f) => ({
      ...f,
      componentDetails: {
        ...f.componentDetails,
        [component]: { ...f.componentDetails?.[component], [field]: value },
      },
    }));

  const handleKmlDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setKmlLoading(true);
    setKmlError("");
    setKmlFile(file);
    try {
      const result = await processKml(file);
      setKmlData(result);
      setForm((f) => ({ ...f, projectLocation: result.address }));
    } catch (err) {
      setKmlError(err.message || "Failed to process KML");
    } finally {
      setKmlLoading(false);
    }
  }, []);

  const {
    getRootProps: kmlRootProps,
    getInputProps: kmlInputProps,
    isDragActive: kmlDragActive,
  } = useDropzone({
    onDrop: handleKmlDrop,
    accept: { "application/vnd.google-earth.kml+xml": [".kml"] },
    multiple: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const collectionName = getCollectionForType(propertyType);
      const storageRoot = propertyType === "commercial" ? "commercial_projects" : "projects";
      const projectName = initialData
        ? initialData.builderAlias || initialData.builderName
        : `${form.builderAlias || form.builderName}`;

      const uploadAll = async (files, category) => {
        const urls = {};
        for (const file of files) {
          const url = await uploadFile(projectName, category, file, storageRoot);
          urls[file.name] = url;
        }
        return urls;
      };

      const [sitePlanUrls, pptUrls, conceptualUrls, otherUrls] =
        await Promise.all([
          uploadAll(sitePlanFiles, "sitePlan"),
          uploadAll(pptFiles, "ppt"),
          uploadAll(conceptualFiles, "conceptualPlan"),
          uploadAll(otherFiles, "others"),
        ]);

      // For updates, merge new files with existing files
      const existingFiles = initialData?.files || {};
      const mergedFiles = {
        sitePlan: { ...existingFiles.sitePlan, ...sitePlanUrls },
        ppt: { ...existingFiles.ppt, ...pptUrls },
        conceptualPlan: { ...existingFiles.conceptualPlan, ...conceptualUrls },
        others: { ...existingFiles.others, ...otherUrls },
      };

      const projectData = {
        ...form,
        areaInAcres,
        floorConfig: form.floorConfig,
        parsedFloors,
        geojson: kmlData?.geojson ? JSON.stringify(kmlData.geojson) : null,
        coordinates: kmlData ? { lat: kmlData.lat, lng: kmlData.lng } : null,
        files: mergedFiles,
        // Residential fields
        totalUnits: parseInt(form.totalUnits) || 0,
        density,
        // Commercial fields
        componentDetails: form.componentDetails || {},
        // Mixed use flag
        isMixedUse,
      };

      if (isMixedUse) {
        if (initialData) {
          // Update current document
          await updateProject(initialData.id, projectData, userId, collectionName);
          // Update linked counterpart in the other collection
          if (initialData.linkedId) {
            const otherCollection =
              collectionName === COMMERCIAL_COLLECTION
                ? RESIDENTIAL_COLLECTION
                : COMMERCIAL_COLLECTION;
            await updateProject(initialData.linkedId, projectData, userId, otherCollection);
          }
        } else {
          // Create in residential first, then commercial, then link them
          const resId = await addProject(
            { ...projectData, isMixedUse: true },
            userId,
            RESIDENTIAL_COLLECTION,
          );
          const comId = await addProject(
            { ...projectData, isMixedUse: true, linkedId: resId },
            userId,
            COMMERCIAL_COLLECTION,
          );
          // Backfill linkedId into residential doc (no versioning needed for this patch)
          await updateProject(resId, { linkedId: comId }, null, RESIDENTIAL_COLLECTION);
        }
      } else if (initialData) {
        await updateProject(initialData.id, projectData, userId, collectionName);
      } else {
        await addProject(projectData, userId, collectionName);
      }

      setSuccess(true);
      setForm(INITIAL_STATE);
      setKmlData(null);
      setKmlFile(null);
      setSitePlanFiles([]);
      setPptFiles([]);
      setConceptualFiles([]);
      setOtherFiles([]);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Error saving project:", err);
      setSubmitError(
        err.message || "Failed to save project. Check Firebase config.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
      {/* ── Basic Metadata ───────────────────────────────────────── */}
      <div className="glass-card p-6">
        <SectionHeading>Project Metadata</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Builder Name *</label>
            <input
              id="builderName"
              className={`${INPUT_CLASSES} border border-surface-300 rounded-md shadow-sm`}
              required
              value={form.builderName}
              onChange={set("builderName")}
              placeholder="e.g. APG Developers Pvt Ltd"
            />
          </div>
          <div>
            <label className="label">Builder Alias</label>
            <input
              id="builderAlias"
              className={`${INPUT_CLASSES} border border-surface-300 rounded-md shadow-sm`}
              value={form.builderAlias}
              onChange={set("builderAlias")}
              placeholder="e.g. Assetz"
            />
          </div>
          <div>
            <label className="label">Proposal Number</label>
            <input
              id="proposalNumber"
              className={`${INPUT_CLASSES} border border-surface-300 rounded-md shadow-sm`}
              value={form.proposalNumber}
              onChange={set("proposalNumber")}
              placeholder="e.g. SIA/KA/INFRA2/571718/2026"
            />
          </div>
          <div>
            <label className="label">Project Type *</label>
            <select
              id="projectType"
              className={`${INPUT_CLASSES} border border-surface-300 rounded-md shadow-sm`}
              required
              value={form.projectType}
              onChange={set("projectType")}
            >
              <option value="">Select type…</option>
              {(propertyType === "commercial" ? COMMERCIAL_PROJECT_TYPES : RESIDENTIAL_PROJECT_TYPES).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date *</label>
            <input
              id="projectDate"
              type="date"
              className={`${INPUT_CLASSES} border border-surface-300 rounded-md shadow-sm`}
              required
              value={form.date}
              onChange={set("date")}
            />
          </div>
          <div>
            <label className="label">Application Category *</label>
            <input
              id="appCategory"
              className="input-field border border-surface-300 rounded-md shadow-sm"
              value={form.applicationCategory}
              onChange={set("applicationCategory")}
              placeholder="Enter application category"
              required
            />
          </div>
          <div>
            <label className="label">Project Location</label>
            <input
              id="projectLocation"
              className={`${INPUT_CLASSES} border border-surface-300 rounded-md shadow-sm`}
              value={form.projectLocation}
              onChange={set("projectLocation")}
              placeholder="Auto-filled from KML or enter manually"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Project Consists Of</label>
            {isMixedUse ? (
              /* Mixed Use: show both groups with section labels */
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Residential</p>
                  <div className="grid grid-cols-2 gap-2">
                    {RESIDENTIAL_CONSISTS_OPTIONS.map((option) => (
                      <CheckboxOption key={option} option={option} form={form} setForm={setForm} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Commercial</p>
                  <div className="grid grid-cols-2 gap-2">
                    {COMMERCIAL_CONSISTS_OPTIONS.map((option) => (
                      <CheckboxOption key={option} option={option} form={form} setForm={setForm} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(propertyType === "commercial"
                  ? COMMERCIAL_CONSISTS_OPTIONS
                  : RESIDENTIAL_CONSISTS_OPTIONS
                ).map((option) => (
                  <CheckboxOption key={option} option={option} form={form} setForm={setForm} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Area & Units ─────────────────────────────────────────── */}
      <div className="glass-card p-6">
        <SectionHeading>Area & Units</SectionHeading>

        {/* Area mode toggle */}
        <div className="flex gap-2 mb-4">
          {[
            { v: "acres", label: "Acres + Guntas" },
            { v: "sqm", label: "Square Metres" },
          ].map(({ v, label }) => (
            <button
              key={v}
              type="button"
              id={`areaMode_${v}`}
              onClick={() => setForm((f) => ({ ...f, areaMode: v }))}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                form.areaMode === v
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-900/40"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {form.areaMode === "acres" ? (
            <>
              <div>
                <label className="label">Acres</label>
                <input
                  id="fieldAcres"
                  type="number"
                  min="0"
                  step="1"
                  className={`${INPUT_CLASSES} border border-surface-300 rounded-md shadow-sm`}
                  value={form.acres}
                  onChange={set("acres")}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">Guntas (0–39)</label>
                <input
                  id="fieldGuntas"
                  type="number"
                  min="0"
                  max="39"
                  step="1"
                  className={`${INPUT_CLASSES} border border-surface-300 rounded-md shadow-sm`}
                  value={form.guntas}
                  onChange={set("guntas")}
                  placeholder="0"
                />
              </div>
            </>
          ) : (
            <div className="sm:col-span-2">
              <label className="label">Square Metres</label>
              <input
                id="fieldSqm"
                type="number"
                min="0"
                step="0.01"
                className={`${INPUT_CLASSES} border border-surface-300 rounded-md shadow-sm`}
                value={form.sqm}
                onChange={set("sqm")}
                placeholder="e.g. 8093.71"
              />
            </div>
          )}

          {/* Computed display */}
          <div className="flex flex-col justify-end">
            <label className="label">Computed Area</label>
            <div className="input-field bg-surface-900 text-brand-400 font-mono font-semibold">
              {formatAcres(areaInAcres)} Acres
            </div>
          </div>
        </div>

        {isMixedUse ? (
          /* ── Mixed Use: residential units + commercial per-component, shared floor config ── */
          <div className="mt-4 space-y-5">
            {/* Shared floor config */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Floor Configuration</label>
                <input
                  id="floorConfig"
                  className={`${INPUT_CLASSES} border border-surface-300 rounded-md shadow-sm`}
                  value={form.floorConfig}
                  onChange={set("floorConfig")}
                  placeholder="e.g. 2B+G+18"
                />
              </div>
              <div className="flex flex-col gap-2 justify-end">
                {form.floorConfig && (
                  <div className="input-field bg-surface-900 text-xs text-slate-400">
                    Parsed floors:{" "}
                    <span className="text-brand-400 font-mono font-bold">{parsedFloors}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Residential subsection */}
            {form.projectConsistsOf.some((o) => RESIDENTIAL_CONSISTS_OPTIONS.includes(o)) && (
              <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50/40">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-3">Residential</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Total Units</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className={`${INPUT_CLASSES} border border-surface-300 rounded-md shadow-sm`}
                      value={form.totalUnits}
                      onChange={set("totalUnits")}
                      placeholder="e.g. 450"
                    />
                  </div>
                  {form.totalUnits && areaInAcres > 0 && (
                    <div className="flex flex-col justify-end">
                      <div className="input-field bg-surface-900 text-xs text-slate-400">
                        Density:{" "}
                        <span className="text-brand-400 font-mono font-bold">{density}</span>{" "}
                        units/acre
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Commercial subsection */}
            {(() => {
              const commercialSelected = form.projectConsistsOf.filter((o) =>
                COMMERCIAL_CONSISTS_OPTIONS.includes(o)
              );
              if (commercialSelected.length === 0) return null;
              return (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/40">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-3">Commercial</p>
                  <div className="space-y-3">
                    {commercialSelected.map((component) => {
                      const fields = COMPONENT_FIELD_CONFIG[component] || DEFAULT_COMPONENT_FIELDS;
                      return (
                        <div key={component} className="border border-surface-200 rounded-lg p-3 bg-white">
                          <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2">{component}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {fields.map((f) => {
                              const val = form.componentDetails?.[component]?.[f.key] || "";
                              const sqft = f.key === "builtUpArea" ? sqmToSqft(val) : null;
                              return (
                                <div key={f.key}>
                                  <label className="label">{f.label}</label>
                                  <input
                                    type={f.type || "text"}
                                    {...(f.type === "number" ? { min: "0", step: "0.01" } : {})}
                                    className={`${INPUT_CLASSES} border border-surface-300 rounded-md shadow-sm`}
                                    value={val}
                                    onChange={(e) => setComponentDetail(component, f.key, e.target.value)}
                                    placeholder={f.placeholder}
                                  />
                                  {sqft && (
                                    <p className="mt-1 text-xs text-slate-400">≈ <span className="font-mono text-brand-600 font-semibold">{sqft}</span> sqft</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {form.projectConsistsOf.length === 0 && (
              <p className="text-xs text-surface-400 italic">
                Select components above to enter per-component details.
              </p>
            )}
          </div>
        ) : propertyType === "commercial" ? (
          /* ── Commercial only: per-component built-up area / unit counts ── */
          <div className="mt-4 space-y-4">
            {form.projectConsistsOf.length === 0 ? (
              <p className="text-xs text-surface-400 italic">
                Select components above to enter per-component details.
              </p>
            ) : (
              form.projectConsistsOf.map((component) => {
                const fields = COMPONENT_FIELD_CONFIG[component] || DEFAULT_COMPONENT_FIELDS;
                return (
                  <div key={component} className="border border-surface-200 rounded-lg p-4 bg-surface-50">
                    <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-3">
                      {component}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {fields.map((f) => {
                        const val = form.componentDetails?.[component]?.[f.key] || "";
                        const sqft = f.key === "builtUpArea" ? sqmToSqft(val) : null;
                        return (
                          <div key={f.key}>
                            <label className="label">{f.label}</label>
                            <input
                              type={f.type || "text"}
                              {...(f.type === "number" ? { min: "0", step: "0.01" } : {})}
                              className={`${INPUT_CLASSES} border border-surface-300 rounded-md shadow-sm`}
                              value={val}
                              onChange={(e) => setComponentDetail(component, f.key, e.target.value)}
                              placeholder={f.placeholder}
                            />
                            {sqft && (
                              <p className="mt-1 text-xs text-slate-400">≈ <span className="font-mono text-brand-600 font-semibold">{sqft}</span> sqft</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ── Residential only: total units + floor config ── */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="label">Total Units</label>
              <input
                id="totalUnits"
                type="number"
                min="0"
                step="1"
                className={`${INPUT_CLASSES} border border-surface-300 rounded-md shadow-sm`}
                value={form.totalUnits}
                onChange={set("totalUnits")}
                placeholder="e.g. 450"
              />
            </div>
            <div>
              <label className="label">Floor Configuration</label>
              <input
                id="floorConfig"
                className={`${INPUT_CLASSES} border border-surface-300 rounded-md shadow-sm`}
                value={form.floorConfig}
                onChange={set("floorConfig")}
                placeholder="e.g. 2B+G+18"
              />
            </div>
            <div className="flex flex-col gap-2 justify-end">
              {form.floorConfig && (
                <div className="input-field bg-surface-900 text-xs text-slate-400">
                  Parsed floors above ground:{" "}
                  <span className="text-brand-400 font-mono font-bold">{parsedFloors}</span>
                </div>
              )}
              {form.totalUnits && areaInAcres > 0 && (
                <div className="input-field bg-surface-900 text-xs text-slate-400">
                  Density:{" "}
                  <span className="text-brand-400 font-mono font-bold">{density}</span>{" "}
                  units/acre
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── KML + Map ────────────────────────────────────────────── */}
      <div className="glass-card p-6">
        <SectionHeading>Site Boundary (KML)</SectionHeading>

        <div
          {...kmlRootProps()}
          className={`dropzone mb-4 ${kmlDragActive ? "active" : ""}`}
          id="kmlDropzone"
        >
          <input {...kmlInputProps()} />
          {kmlLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 text-brand-600 text-sm font-medium">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              Processing KML…
            </div>
          ) : kmlFile ? (
            <div className="flex flex-col items-center justify-center gap-2 text-sm text-emerald-600 font-medium">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              {kmlFile.name}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <UploadCloud className="w-8 h-8 text-surface-400 mb-2" />
              <p className="text-sm font-medium text-surface-900 mb-1">
                Drop a .kml file here or click to browse
              </p>
              <p className="text-xs text-surface-500">
                Used for boundary visualization
              </p>
            </div>
          )}
        </div>

        {kmlError && (
          <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
            <X className="w-4 h-4" />
            {kmlError}
          </div>
        )}

        <div className="rounded-md overflow-hidden ring-1 ring-surface-200">
          <MapView geojson={kmlData?.geojson || null} height="380px" />
        </div>
      </div>

      {/* ── File Vault ───────────────────────────────────────────── */}
      <div className="glass-card p-6">
        <SectionHeading>File Vault</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FileDropzone
            label="Site Plan"
            accept={{ "image/*": [], "application/pdf": [".pdf"] }}
            files={sitePlanFiles}
            onDrop={(f) => setSitePlanFiles((p) => [...p, ...f])}
            icon={Map}
          />
          <FileDropzone
            label="Project PPT"
            accept={{
              "application/pdf": [".pdf"],
              "application/vnd.ms-powerpoint": [".ppt"],
              "application/vnd.openxmlformats-officedocument.presentationml.presentation":
                [".pptx"],
            }}
            files={pptFiles}
            onDrop={(f) => setPptFiles((p) => [...p, ...f])}
            icon={Presentation}
          />
          <FileDropzone
            label="Conceptual Plan"
            accept={{ "application/pdf": [".pdf"] }}
            files={conceptualFiles}
            onDrop={(f) => setConceptualFiles((p) => [...p, ...f])}
            icon={Ruler}
          />
          <FileDropzone
            label="Others"
            accept={{}}
            files={otherFiles}
            onDrop={(f) => setOtherFiles((p) => [...p, ...f])}
            icon={Paperclip}
          />
        </div>
      </div>

      {/* ── Submit ───────────────────────────────────────────────── */}
      {submitError && (
        <div className="px-4 py-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
          <X className="w-4 h-4" />
          {submitError}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          Project saved successfully!
        </div>
      )}

      <button
        type="submit"
        id="submitProject"
        disabled={submitting}
        className={`${BUTTON_CLASSES} ${
          submitting ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Saving Project…
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Save Project
          </>
        )}
      </button>
    </form>
  );
}
