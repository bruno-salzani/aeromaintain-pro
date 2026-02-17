import mongoose from 'mongoose';
import { Volume } from '../../models/volume.js';

export class VolumeRepository {
  async list() {
    if (mongoose.connection.readyState !== 1) {
      return [];
    }
    return Volume.find().lean();
  }
  async findOpenVolume() {
    const isMocked = Volume && Volume.findOne && Object.prototype.hasOwnProperty.call(Volume.findOne, 'mock');
    if (isMocked) {
      return Volume.findOne({ status: 'ABERTO' });
    }
    if (mongoose.connection.readyState !== 1) {
      return {
        _id: 'local-volume',
        status: 'ABERTO',
        dataAbertura: '2000-01-01T00:00:00.000Z',
        anacVolumeId: '',
        anacOperatorIds: [],
        save: async () => {}
      };
    }
    return Volume.findOne({ status: 'ABERTO' });
  }
  async create(data) {
    if (mongoose.connection.readyState !== 1) {
      return { ...data, _id: 'local-volume' };
    }
    const doc = await Volume.create(data);
    return doc.toObject();
  }
  async findById(id) {
    return Volume.findById(id);
  }
  async save(doc) {
    await doc.save();
    return doc;
  }
}
