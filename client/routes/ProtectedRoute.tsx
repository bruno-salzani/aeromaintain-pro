import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppDomain } from '@/state/AppDomain';

export default function ProtectedRoute() {
  const { isAuthenticated } = useAppDomain();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}

