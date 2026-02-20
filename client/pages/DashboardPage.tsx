import React, { useState } from 'react';
import { useAppDomain } from '@/state/AppDomain';
import AdminQuickActions from '@/components/AdminQuickActions';
import Dashboard from '@/components/Dashboard';
import UsersManager from '@/components/UsersManager';
import AircraftModal from '@/components/AircraftModal';
import AuditLogs from '@/components/AuditLogs';
import HealthMetricsPanel from '@/components/HealthMetricsPanel';

export default function DashboardPage() {
  const { aircraft, components, users, addUser, updateUser, deleteUser, setAircraft } = useAppDomain() as any;
  const [showUsers, setShowUsers] = useState(false);
  const [showAircraftModal, setShowAircraftModal] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  return (
    <>
      <AdminQuickActions
        onAddUser={() => setShowUsers(true)}
        onAddAircraft={() => setShowAircraftModal(true)}
        onViewLogs={() => setShowAudit(true)}
        onViewHealth={() => setShowHealth(true)}
      />
      <Dashboard aircraft={aircraft} components={components} />
      {showUsers && (
        <UsersManager
          users={users}
          onAdd={addUser}
          onUpdate={updateUser}
          onDelete={deleteUser}
          onClose={() => setShowUsers(false)}
        />
      )}
      {showAircraftModal && (
        <AircraftModal
          aircraft={aircraft}
          onSaveLocal={(a) => setAircraft(a)}
          onClose={() => setShowAircraftModal(false)}
        />
      )}
      {showAudit && <AuditLogs onClose={() => setShowAudit(false)} />}
      {showHealth && <HealthMetricsPanel onClose={() => setShowHealth(false)} />}
    </>
  );
}

