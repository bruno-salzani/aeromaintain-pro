import { useEffect, useState } from 'react';
import { ComplianceItem } from '@/types';
import { apiGet, apiPostWithHeaders, apiDeleteWithHeaders } from '@/services/api';

export function useCompliance(initialItems: ComplianceItem[] = []) {
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>(initialItems);

  useEffect(() => {
    apiGet<ComplianceItem[]>('/api/compliance')
      .then(list => setComplianceItems(list as any))
      .catch(() => void 0);
  }, []);

  const addComplianceItem = async (item: Omit<ComplianceItem, 'id'>) => {
    const local = { ...item, id: Math.random().toString(36).substr(2, 9) };
    setComplianceItems(prev => [local, ...prev]);
    apiPostWithHeaders<ComplianceItem>('/api/compliance', item, { 'x-role': 'ADMINISTRADOR' })
      .then(created => {
        setComplianceItems(prev => [created as any, ...prev.filter(i => i.id !== local.id)]);
      })
      .catch(() => void 0);
  };

  const deleteComplianceItem = (id: string) => {
    setComplianceItems(prev => prev.filter(i => i.id !== id));
    apiDeleteWithHeaders(`/api/compliance/${id}`, { 'x-role': 'ADMINISTRADOR' }).catch(() => void 0);
  };

  return { complianceItems, setComplianceItems, addComplianceItem, deleteComplianceItem };
}
