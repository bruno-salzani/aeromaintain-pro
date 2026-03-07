
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import ProtectedRoute from '@/routes/ProtectedRoute';
import { AppDomainProvider } from '@/state/AppDomain';
import DashboardPage from '@/pages/DashboardPage';
import VolumesPage from '@/pages/VolumesPage';
import FlightLogPage from '@/pages/FlightLogPage';
import MaintenancePage from '@/pages/MaintenancePage';
import ComponentsPage from '@/pages/ComponentsPage';
import CompliancePage from '@/pages/CompliancePage';
import StatusPage from '@/pages/StatusPage';
import LoginPage from '@/pages/LoginPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export default function App() {
  const [client] = React.useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <AppDomainProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/volumes" element={<VolumesPage />} />
              <Route path="/flightlog" element={<FlightLogPage />} />
              <Route element={<ProtectedRoute roles={['MANUTENCAO','ADMIN']} />}>
                <Route path="/maintenance" element={<MaintenancePage />} />
              </Route>
              <Route path="/components" element={<ComponentsPage />} />
              <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                <Route path="/compliance" element={<CompliancePage />} />
              </Route>
              <Route path="/status" element={<StatusPage />} />
            </Route>
          </Route>
        </Routes>
      </AppDomainProvider>
    </QueryClientProvider>
  );
}
