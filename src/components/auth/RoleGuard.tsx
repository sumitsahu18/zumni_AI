import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

/**
 * Enterprise Role-Based Access Control (RBAC) Guard
 * 
 * - Ensures user is logged in (redirects to /login if unauthenticated).
 * - Enforces allowed role boundaries (SUPER_ADMIN, ADMIN, USER).
 * - SUPER_ADMIN always has super-user permission to all routes.
 * - Redirects unauthorized users to their authorized workspace with an informative alert.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  redirectTo
}) => {
  let user: any = null;
  let showToast: any = () => {};

  try {
    const app = useApp();
    user = app?.user ?? null;
    showToast = app?.showToast ?? (() => {});
  } catch (e) {
    console.warn('[RoleGuard] fallback context access:', e);
  }

  const location = useLocation();

  // 1. Unauthenticated users must sign in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Role verification
  if (allowedRoles && allowedRoles.length > 0) {
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const isExplicitlyAllowed = allowedRoles.includes(user.role);

    if (!isSuperAdmin && !isExplicitlyAllowed) {
      // Determine safe redirect destination
      const destination =
        redirectTo || (user.role === 'ADMIN' ? '/admin/dashboard' : '/user/home');

      try {
        if (typeof showToast === 'function') {
          showToast(
            `Access Denied: You do not have permission to access that section. (Your Role: ${user.role})`,
            'error'
          );
        }
      } catch {}

      return <Navigate to={destination} replace />;
    }
  }

  return <>{children}</>;
};

export default RoleGuard;
