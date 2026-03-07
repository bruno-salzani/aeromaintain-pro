import React from 'react';
import { useAppDomain } from '@/state/AppDomain';
import VolumeManager from '@/components/VolumeManager';
import { apiPutWithHeaders } from '@/services/api';
import { Volume } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet } from '@/services/api';
import { useEffect } from 'react';

export default function VolumesPage() {
  const { volumes, setVolumes, aircraft, addVolume, closeVolume, updateVolumeLocal } = useAppDomain() as any;
  const { data } = useQuery<Volume[]>({ queryKey: ['volumes'], queryFn: () => apiGet<Volume[]>('/api/volumes'), staleTime: 60_000 });
  useEffect(() => { if (data) setVolumes(data as any); }, [data, setVolumes]);
  const qc = useQueryClient();
  return (
    <VolumeManager
      volumes={volumes}
      aircraft={aircraft}
      onOpenVolume={async (...args: any[]) => { await addVolume.apply(null, args as any); qc.invalidateQueries({ queryKey: ['volumes'] }); }}
      onCloseVolume={async (...args: any[]) => { await closeVolume.apply(null, args as any); qc.invalidateQueries({ queryKey: ['volumes'] }); }}
      onUpdateVolume={async (id, operatorId, payload) => {
        const updated = await apiPutWithHeaders<Volume>(`/api/volumes/${id}`, payload, { aircompany: operatorId });
        updateVolumeLocal(id, updated as any);
        qc.invalidateQueries({ queryKey: ['volumes'] });
      }}
      onSetClosedLocal={(id, patch) => {
        updateVolumeLocal(id, patch as any);
        qc.invalidateQueries({ queryKey: ['volumes'] });
      }}
    />
  );
}
