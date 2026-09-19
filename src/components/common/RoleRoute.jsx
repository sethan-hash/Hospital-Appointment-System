import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * Returns the default dashboard path for a given user role.
 */
export function getDashboardPathForRole(role) {
  switch (role) {
    case 'DOCTOR':
      return '/doctor/dashboard';
    case 'RECEPTIONIST':
      return '/receptionist/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    case 'PATIENT':
    default:
      return '/patient/dashboard';
  }
}

/**
 * Role-based authorization route wrapper.
 * Ensures the authenticated user possesses one of the allowed roles.
 * If unauthorized, redirects to the user's role-appropriate dashboard.
 */
export function RoleRoute({ allowedRoles = [], children }) {
  const { currentUser, role } = useAuth();

  if (!currentUser || !role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    const targetDashboard = getDashboardPathForRole(role);
    return <Navigate to={targetDashboard} replace />;
  }

  return children;
}
