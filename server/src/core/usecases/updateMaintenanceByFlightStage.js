import mongoose from 'mongoose';

export async function updateMaintenanceByFlightStage({ blockTimeHours, numeroCicloEtapa }, deps) {
  let session = null;
  try {
    if (mongoose.connection.readyState === 1) {
      session = await mongoose.startSession();
      session.startTransaction();
    }
    const aircraft = await deps.aircraftRepo.findOne();
    aircraft.totalHours = (aircraft.totalHours || 0) + (blockTimeHours || 0);
    aircraft.totalCycles = (aircraft.totalCycles || 0) + (numeroCicloEtapa || 0);
    await deps.aircraftRepo.save(aircraft);
    const comps = await deps.componentRepo.findWithRemaining();
    for (const c of comps) {
      const newRemaining = (c.remainingHours || 0) - (blockTimeHours || 0);
      c.remainingHours = newRemaining;
      c.status = newRemaining < 0 ? 'VENCIDO' : newRemaining < 50 ? 'CRITICO' : 'OK';
      await deps.componentRepo.save(c);
      await deps.componentSnapshotRepo.create({
        componentId: c._id?.toString() || c.id || '',
        remainingHours: c.remainingHours,
        status: c.status,
        meta: { deltaHours: blockTimeHours }
      });
    }
    if (session) {
      await session.commitTransaction();
      session.endSession();
    }
  } catch (e) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw e;
  }
}
