import { useState } from "react";
import ProjectForm from "./components/ProjectForm";
import Dashboard from "./components/Dashboard";
import ProspectsMapView from "./components/ProspectsMapView";
import { Building2, Plus, LayoutDashboard, MapPin } from "lucide-react";
import "./App.css";
import "./index.css";

function App() {
  const [currentView, setCurrentView] = useState("form");
  // When "See More" is clicked on the map, jump to dashboard with that project highlighted
  const [highlightProject, setHighlightProject] = useState(null);

  const handleViewProject = (project, isEditMode = false) => {
    setHighlightProject(project);
    setCurrentView(isEditMode ? "editForm" : "dashboard");
  };

  const navItems = [
    { key: "form", label: "Add Project", icon: Plus },
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "map", label: "Map View", icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-surface-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-brand-900 border-b border-brand-800 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-800 rounded-lg flex items-center justify-center border border-brand-700">
                <Building2 className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white tracking-tight">
                  Real Estate Tracker
                </h1>
                <p className="text-brand-300 text-xs">
                  Compliance &amp; Project Management
                </p>
              </div>
            </div>

            <nav className="flex items-center gap-1">
              {navItems.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    setCurrentView(key);
                    if (key !== "dashboard") setHighlightProject(null);
                  }}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-2 ${
                    currentView === key
                      ? "bg-brand-800 text-white border border-brand-700"
                      : "text-brand-300 hover:bg-brand-800/50 hover:text-white border border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {currentView === "form" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-surface-900 tracking-tight">
                New Project Entry
              </h2>
              <p className="text-surface-500 mt-1 text-sm">
                Enter project details, upload supporting documents, and
                visualize site boundaries.
              </p>
            </div>
            <ProjectForm onSuccess={() => setCurrentView("dashboard")} />
          </div>
        )}

        {currentView === "dashboard" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-surface-900 tracking-tight">
                Project Dashboard
              </h2>
            </div>
            <Dashboard
              initialSelected={highlightProject}
              onViewProject={handleViewProject}
            />
          </div>
        )}

        {currentView === "map" && (
          <div className="space-y-6 animate-fadeIn">
            <ProspectsMapView onViewProject={handleViewProject} />
          </div>
        )}

        {currentView === "editForm" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-surface-900 tracking-tight">
                Edit Project
              </h2>
              <p className="text-surface-500 mt-1 text-sm">
                Update project details and save changes.
              </p>
            </div>
            <ProjectForm
              onSuccess={() => setCurrentView("dashboard")}
              initialData={highlightProject} // Pass the selected project data
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-surface-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-xs text-surface-500">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-surface-400" />
              <span>Real Estate Tracker</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Powered by OpenStreetMap</span>
              <div className="flex items-center gap-1.5 border-l border-surface-200 pl-4">
                <MapPin className="w-3.5 h-3.5" />
                <span>v1.1.0</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
