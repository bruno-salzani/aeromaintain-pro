import { useEffect, useState } from 'react';
import { Volume } from '@/types';
import { apiGet, apiPostWithHeaders } from '@/services/api';

export function useVolumes(initialVolumes: Volume[] = []) {
  const [volumes, setVolumes] = useState<Volume[]>(initialVolumes);

  useEffect(() => {
    apiGet<Volume[]>('/api/volumes')
      .then(list => setVolumes(list as any))
      .catch(() => void 0);
  }, []);

  const addVolume = async (newVol: Omit<Volume, 'id'>) => {
    const local: Volume = {
      ...newVol,
      id: Math.random().toString(36).substr(2, 9)
    };
    setVolumes(prev => [local, ...prev]);
    apiPostWithHeaders<Volume>('/api/volumes/open', newVol, { 'x-role': 'OPERACOES' })
      .then(created => {
        setVolumes(prev => [created as any, ...prev.filter(v => v.id !== local.id)]);
      })
      .catch(() => void 0);
  };

  const closeVolume = (id: string, observations: string) => {
    setVolumes((prev: Volume[]) => prev.map((v: Volume) => (
      v.id === id
        ? {
            ...v,
            status: 'FECHADO',
            dataFechamento: new Date().toISOString(),
            observacoesFechamento: observations
          }
        : v
    )));
    apiPostWithHeaders(`/api/volumes/${id}/close`, { observacoes: observations }, { 'x-role': 'OPERACOES' })
      .catch(() => void 0);
  };

  const updateVolumeLocal = (id: string, patch: Partial<Volume>) => {
    setVolumes((prev: Volume[]) =>
      prev.map((v: Volume) => (v.id === id ? { ...v, ...patch } : v))
    );
  };

  return { volumes, setVolumes, addVolume, closeVolume, updateVolumeLocal };
}
