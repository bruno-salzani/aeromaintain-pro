import React from 'react';
import { useAppDomain } from '@/state/AppDomain';
import ComplianceManager from '@/components/ComplianceManager';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet } from '@/services/api';
import { ComplianceItem } from '@/types';
import { useEffect } from 'react';

export default function CompliancePage() {
  const { aircraft, complianceItems, setComplianceItems, addComplianceItem, deleteComplianceItem } = useAppDomain() as any;
  const qc = useQueryClient();
  const { data } = useQuery<ComplianceItem[]>({ queryKey: ['compliance'], queryFn: () => apiGet<ComplianceItem[]>('/api/compliance'), staleTime: 60_000 });
  useEffect(() => { if (data) setComplianceItems(data as any); }, [data, setComplianceItems]);
  return (
    <ComplianceManager
      aircraft={aircraft}
      complianceItems={complianceItems}
      onAddCompliance={async (item) => { await addComplianceItem(item); qc.invalidateQueries({ queryKey: ['compliance'] }); }}
      onDeleteCompliance={(id) => { deleteComplianceItem(id); qc.invalidateQueries({ queryKey: ['compliance'] }); }}
    />
  );
}
