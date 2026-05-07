import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { Building2, Lock, AlertCircle } from "lucide-react";

/**
 * ProtectedRoute component that restricts access based on user roles
 * @param {Object} props
 * @param {React.ReactNode} props.children - Components to render if authorized
 * @param {string[]} props.allowedRoles - Array of allowed roles ('admin', 'user')
 * @param {React.ReactNode} props.fallback - Optional fallback component for unauthorized access
 */
export default function ProtectedRoute({
  children,
  allowedRoles = ["admin", "user"],
  fallback = null,
}) {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-900 mx-auto"></div>
          <p className="mt-4 text-surface-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="max-w-md w-full text-center p-8">
          <div className="mx-auto h-16 w-16 bg-brand-900 rounded-full flex items-center justify-center mb-6">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-surface-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-surface-600 mb-6">
            Please sign in to access this page.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
              <span className="text-sm text-amber-800">
                You need to be logged in to continue
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile || !allowedRoles.includes(userProfile.role)) {
    if (fallback) {
      return fallback;
    }

    // Return null to show nothing - no notifications
    return null;
  }

  return children;
}

/**
 * AdminOnly component - shorthand for admin-only routes
 */
export function AdminOnly({ children, fallback = null }) {
  return (
    <ProtectedRoute allowedRoles={["admin"]} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

/**
 * UserOnly component - shorthand for user-only routes (excludes admin if needed)
 */
export function UserOnly({ children, fallback = null }) {
  return (
    <ProtectedRoute allowedRoles={["user"]} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}
