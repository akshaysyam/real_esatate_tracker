import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProjectForm from "./components/ProjectForm";
import Dashboard from "./components/Dashboard";
import ProspectsMapView from "./components/ProspectsMapView";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import UserManagement from "./components/UserManagement";
import VersionHistory from "./components/VersionHistory";
import ProtectedRoute, { AdminOnly } from "./components/ProtectedRoute";
import trustateLogo from "./assets/truestate-logo.svg";
import {
  Plus,
  LayoutDashboard,
  MapPin,
  LogOut,
  Users,
  History,
  Home,
  Store,
} from "lucide-react";
import "./App.css";
import "./index.css";

function AppContent() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [authMode, setAuthMode] = useState("login");
  const [highlightProject, setHighlightProject] = useState(null);
  const [propertyType, setPropertyType] = useState("residential");
  const { currentUser, userProfile, logout, canAccess, isAdmin } = useAuth();

  const handleViewProject = (project, isEditMode = false) => {
    setHighlightProject(project);
    setCurrentView(isEditMode ? "editForm" : "dashboard");
  };

  const handleLogout = async () => {
    try {
      await logout();
      setCurrentView("dashboard");
      setHighlightProject(null);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (!currentUser) {
    return authMode === "login" ? (
      <Login onToggleMode={() => setAuthMode("register")} />
    ) : (
      <Register onToggleMode={() => setAuthMode("login")} />
    );
  }

  if (currentUser && !canAccess && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F6F8]">
        <div className="max-w-md w-full text-center p-8">
          <div className="mx-auto h-16 w-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
            <Users className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h2>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">
            Your account has been created and is waiting for admin approval. You'll receive access once an administrator approves your registration.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2">
              <Users className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800">Please contact your administrator for access</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "#0D2421" }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const handleNavClick = (view) => {
    if (userProfile?.role !== "admin" && ["form", "editForm", "users", "history"].includes(view)) return;
    setCurrentView(view);
    if (view !== "dashboard") setHighlightProject(null);
  };

  const getNavItems = () => {
    const baseItems = [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { key: "map", label: "Map", icon: MapPin },
    ];
    if (userProfile?.role === "admin") {
      baseItems.unshift({ key: "form", label: "Add", icon: Plus });
      baseItems.push({ key: "users", label: "Users", icon: Users });
      baseItems.push({ key: "history", label: "History", icon: History });
    }
    return baseItems;
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F5F6F8" }}>
      {/* ── Main Header ── */}
      <header className="sticky top-0 z-50 shadow-md" style={{ backgroundColor: "#0D2421" }}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-6">

            {/* Logo + Brand */}
            <div className="flex items-center gap-3 shrink-0">
              <img src={trustateLogo} className="w-8 h-8 rounded" alt="TruEstate" />
              <div className="flex flex-col leading-tight">
                <span className="text-white font-bold text-base tracking-tight">TruEstate</span>
                <span className="text-white/40 text-[10px] leading-none">
                  {userProfile?.name} · {userProfile?.role}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-white/10 shrink-0" />

            {/* Property type toggle */}
            <div className="flex items-center bg-white/10 rounded-lg p-1 border border-white/10 shrink-0">
              <button
                onClick={() => { setPropertyType("residential"); setHighlightProject(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                  propertyType === "residential"
                    ? "bg-white text-[#0D2421] shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                Residential
              </button>
              <button
                onClick={() => { setPropertyType("commercial"); setHighlightProject(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                  propertyType === "commercial"
                    ? "bg-white text-[#0D2421] shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                Commercial
              </button>
            </div>

            {/* Nav */}
            <nav className="flex items-center gap-1 flex-1">
              {navItems.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => handleNavClick(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                    currentView === key
                      ? "bg-white/15 text-white border border-white/20"
                      : "text-white/60 hover:text-white hover:bg-white/10 border border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>

            {/* User chip + logout */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-white/10 text-white/80 text-xs px-3 py-1.5 rounded-full border border-white/15 font-medium hidden sm:block">
                {userProfile?.name}
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="text-white/50 hover:text-white hover:bg-white/10 p-2 rounded-md transition-colors duration-150"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mode sub-bar ── */}
      <div className="sticky top-16 z-40 border-b border-white/5" style={{ backgroundColor: "#153E3B" }}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Mode:</span>
          <span
            className="text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(201,168,76,0.18)", color: "#C9A84C" }}
          >
            {propertyType}
          </span>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <AdminOnly
          fallback={
            currentView === "form" || currentView === "editForm" || currentView === "history" ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {currentView === "form" && "New Project Entry"}
                    {currentView === "editForm" && "Edit Project"}
                    {currentView === "history" && "Version History"}
                  </h2>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <p className="text-gray-500 text-sm">This feature requires admin privileges. Contact your administrator for access.</p>
                </div>
              </div>
            ) : null
          }
        >
          {currentView === "form" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  New {propertyType === "commercial" ? "Commercial" : "Residential"} Project
                </h2>
                <p className="text-gray-500 mt-1 text-sm">Enter project details, upload supporting documents, and visualize site boundaries.</p>
              </div>
              <ProjectForm
                onSuccess={() => setCurrentView("dashboard")}
                userId={currentUser?.uid}
                propertyType={propertyType}
              />
            </div>
          )}

          {currentView === "editForm" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Edit {propertyType === "commercial" ? "Commercial" : "Residential"} Project
                </h2>
                <p className="text-gray-500 mt-1 text-sm">Update project details and save changes.</p>
              </div>
              <ProjectForm
                onSuccess={() => setCurrentView("dashboard")}
                initialData={highlightProject}
                userId={currentUser?.uid}
                propertyType={propertyType}
              />
            </div>
          )}

          {currentView === "users" && <UserManagement />}
          {currentView === "history" && <VersionHistory propertyType={propertyType} />}
        </AdminOnly>

        {currentView === "dashboard" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {propertyType === "commercial" ? "Commercial" : "Residential"} Projects
              </h2>
              <p className="text-gray-400 text-sm mt-0.5">Track, filter and manage all active proposals</p>
            </div>
            <Dashboard
              initialSelected={highlightProject}
              onViewProject={handleViewProject}
              currentUser={currentUser}
              userProfile={userProfile}
              propertyType={propertyType}
            />
          </div>
        )}

        {currentView === "map" && (
          <div className="space-y-6 animate-fadeIn">
            <ProspectsMapView
              onViewProject={handleViewProject}
              propertyType={propertyType}
            />
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-xs text-gray-400">
          <span>© 2025 TruEstate. All rights reserved.</span>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            <span>v1.1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
