/**
 * Authentication helper functions
 * Separated to avoid react-refresh warnings
 */

export const AUTH_ROLES = {
  ADMIN: 'admin',
  USER: 'user'
};

export const ADMIN_ONLY_ROUTES = ['form', 'editForm', 'users', 'history'];

export function isAdmin(userRole) {
  return userRole === AUTH_ROLES.ADMIN;
}

export function isUser(userRole) {
  return userRole === AUTH_ROLES.USER;
}

export function canAccessRoute(userRole, route) {
  if (isAdmin(userRole)) {
    return true; // Admin can access all routes
  }
  
  return !ADMIN_ONLY_ROUTES.includes(route);
}
