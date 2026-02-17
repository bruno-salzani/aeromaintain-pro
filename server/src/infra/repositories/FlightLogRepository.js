import mongoose from 'mongoose';
import { Log } from '../../models/log.js';

export class FlightLogRepository {
  async create(data) {
    if (mongoose.connection.readyState !== 1) {
      return { ...data, _id: 'local-log' };
    }
    const doc = await Log.create(data);
    return doc.toObject();
  }
  async findById(id) {
    if (mongoose.connection.readyState !== 1) {
      return { _id: id, save: async () => {} };
    }
    return Log.findById(id);
  }
  async save(doc) {
    await doc.save();
    return doc;
  }
}
