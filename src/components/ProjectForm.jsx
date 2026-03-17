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
const PROJECT_TYPES = [
  "Residential",
  "Commercial",
  "Mixed Use",
  "Industrial",
  "Township",
  "Other",
];
const APP_CATEGORIES = ["EC", "CRZ", "EC + CRZ", "ToR", "ToR + EC", "Other"];

const INITIAL_STATE = {
  builderName: "",
  builderAlias: "",
  proposalNumber: "",
  projectType: "",
  projectLocation: "",
  date: "",
  applicationCategory: "",
  areaMode: "acres", // 'acres' | 'sqm'
  acres: "",
  guntas: "",
  sqm: "",
  totalUnits: "",
  floorConfig: "",
  projectConsistsOf: [], // Add this line
};

const INPUT_CLASSES =
  "input-field focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all";
const BUTTON_CLASSES =
  "btn-primary w-full justify-center py-3 text-base hover:bg-brand-700 transition-all";

// Accept initialData as a prop and pre-fill the form fields
export default function ProjectForm({ onSuccess, initialData }) {
  const [form, setForm] = useState(initialData || INITIAL_STATE);

  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({
        ...prev,
        ...initialData,
        acres: initialData.areaMode === "acres" ? initialData.acres : "",
        guntas: initialData.areaMode === "acres" ? initialData.guntas : "",
        sqm: initialData.areaMode === "sqm" ? initialData.sqm : "",
      }));
      setKmlData(
        initialData.geojson
          ? {
              geojson: JSON.parse(initialData.geojson),
              address: initialData.projectLocation,
              lat: initialData.coordinates?.lat,
              lng: initialData.coordinates?.lng,
            }
          : null
      );
      setSitePlanFiles(
        initialData.files?.sitePlan
          ? Object.keys(initialData.files.sitePlan).map((name) => ({
              name,
              size: 0,
            }))
          : []
      );
      setPptFiles(
        initialData.files?.ppt
          ? Object.keys(initialData.files.ppt).map((name) => ({
              name,
              size: 0,
            }))
          : []
      );
      setConceptualFiles(
        initialData.files?.conceptualPlan
          ? Object.keys(initialData.files.conceptualPlan).map((name) => ({
              name,
              size: 0,
            }))
          : []
      );
      setOtherFiles(
        initialData.files?.others
          ? Object.keys(initialData.files.others).map((name) => ({
              name,
              size: 0,
            }))
          : []
      );
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

  // ── Handlers
  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

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

  // Update the handleSubmit function to avoid creating duplicate folders in Firebase Storage
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const projectName = initialData
        ? initialData.builderAlias || initialData.builderName
        : `${form.builderAlias || form.builderName}`;

      // Upload files
      const uploadAll = async (files, category) => {
        const urls = {};
        for (const file of files) {
          const url = await uploadFile(projectName, category, file);
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

      const projectData = {
        ...form,
        areaInAcres,
        totalUnits: parseInt(form.totalUnits) || 0,
        floorConfig: form.floorConfig,
        parsedFloors,
        density,
        geojson: kmlData?.geojson ? JSON.stringify(kmlData.geojson) : null,
        coordinates: kmlData ? { lat: kmlData.lat, lng: kmlData.lng } : null,
        files: {
          sitePlan: sitePlanUrls,
          ppt: pptUrls,
          conceptualPlan: conceptualUrls,
          others: otherUrls,
        },
      };

      if (initialData) {
        // Update existing project logic here
        console.log("Updating project data...");
        await updateProject(initialData.id, projectData); // Call the update service
      } else {
        // Add new project logic here
        console.log("Adding new project...");
        await addProject(projectData);
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
        err.message || "Failed to save project. Check Firebase config."
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
              {PROJECT_TYPES.map((t) => (
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
          {/* Replace the multiselect field with checkboxes for better UI */}
          <div>
            <label className="label">Project Consists Of</label>
            <div className="grid grid-cols-2 gap-2">
              {["Apartment", "Villament", "Villa", "Row house", "Plot"].map(
                (option) => (
                  <label key={option} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      value={option}
                      checked={form.projectConsistsOf.includes(option)}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setForm((f) => {
                          const updated = isChecked
                            ? [...f.projectConsistsOf, option]
                            : f.projectConsistsOf.filter(
                                (item) => item !== option
                              );
                          return { ...f, projectConsistsOf: updated };
                        });
                      }}
                      className="form-checkbox h-4 w-4 text-brand-600 border-surface-300 rounded focus:ring-brand-500"
                    />
                    <span className="text-sm text-surface-900">{option}</span>
                  </label>
                )
              )}
            </div>
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
                <span className="text-brand-400 font-mono font-bold">
                  {parsedFloors}
                </span>
              </div>
            )}
            {form.totalUnits && areaInAcres > 0 && (
              <div className="input-field bg-surface-900 text-xs text-slate-400">
                Density:{" "}
                <span className="text-brand-400 font-mono font-bold">
                  {density}
                </span>{" "}
                units/acre
              </div>
            )}
          </div>
        </div>
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
