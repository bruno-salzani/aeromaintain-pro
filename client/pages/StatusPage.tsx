import React from 'react';
import HealthMetricsPanel from '@/components/HealthMetricsPanel';

export default function StatusPage() {
  return <HealthMetricsPanel onClose={() => window.history.back()} />;
}

