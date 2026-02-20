import React, { useMemo } from 'react';
import { useAppDomain } from '@/state/AppDomain';
import FlightLogBook from '@/components/FlightLogBook';

export default function FlightLogPage() {
  const { logs, addFlightLog, deleteFlightLog, aircraft, volumes } = useAppDomain();
  const activeVolume = useMemo(() => volumes.find(v => v.status === 'ABERTO'), [volumes]);
  return (
    <FlightLogBook
      logs={logs}
      aircraft={aircraft}
      activeVolume={activeVolume}
      onAddLog={addFlightLog}
      onDeleteLog={deleteFlightLog}
    />
  );
}

