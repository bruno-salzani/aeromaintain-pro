import mongoose from 'mongoose';
import { Aircraft } from '../../models/aircraft.js';

export class AircraftRepository {
  async findOne() {
    if (mongoose.connection.readyState !== 1) {
      return {
        _id: 'local-aircraft',
        totalHours: 0,
        totalCycles: 0,
        save: async () => {}
      };
    }
    return Aircraft.findOne();
  }
  async save(doc) {
    await doc.save();
    return doc;
  }
}
