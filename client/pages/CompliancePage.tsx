import React from 'react';
import { useAppDomain } from '@/state/AppDomain';
import ComplianceManager from '@/components/ComplianceManager';

export default function CompliancePage() {
  const { aircraft, complianceItems, addComplianceItem, deleteComplianceItem } = useAppDomain() as any;
  return (
    <ComplianceManager
      aircraft={aircraft}
      complianceItems={complianceItems}
      onAddCompliance={addComplianceItem}
      onDeleteCompliance={deleteComplianceItem}
    />
  );
}

