
import { apiPost } from './api';

export const extractMaintenanceFromPdf = async (base64Pdf: string) => {
  const data = await apiPost<any[]>('/api/ai/extract-maintenance', { base64Pdf });
  return data;
};
