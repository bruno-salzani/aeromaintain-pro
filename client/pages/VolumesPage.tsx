import React from 'react';
import { useAppDomain } from '@/state/AppDomain';
import VolumeManager from '@/components/VolumeManager';
import { apiPutWithHeaders } from '@/services/api';
import { Volume } from '@/types';

export default function VolumesPage() {
  const { volumes, aircraft, addVolume, closeVolume, updateVolumeLocal } = useAppDomain() as any;
  return (
    <VolumeManager
      volumes={volumes}
      aircraft={aircraft}
      onOpenVolume={addVolume}
      onCloseVolume={closeVolume}
      onUpdateVolume={async (id, operatorId, payload) => {
        const updated = await apiPutWithHeaders<Volume>(`/api/volumes/${id}`, payload, { aircompany: operatorId });
        updateVolumeLocal(id, updated as any);
      }}
      onSetClosedLocal={(id, patch) => {
        updateVolumeLocal(id, patch as any);
      }}
    />
  );
}

