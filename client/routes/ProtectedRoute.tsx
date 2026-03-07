import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppDomain } from '@/state/AppDomain';
import { UserRole } from '@/types';

export default function ProtectedRoute({ roles }: { roles?: UserRole[] } = {}) {
  const { isAuthenticated, role } = useAppDomain() as any;
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && roles.length > 0 && !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
