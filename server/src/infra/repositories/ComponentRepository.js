import mongoose from 'mongoose';
import { Component } from '../../models/component.js';

export class ComponentRepository {
  async list() {
    if (mongoose.connection.readyState !== 1) {
      return [];
    }
    return Component.find().lean();
  }
  async findWithRemaining() {
    if (mongoose.connection.readyState !== 1) {
      return [];
    }
    return Component.find({ remainingHours: { $ne: null } });
  }
  async create(data) {
    if (mongoose.connection.readyState !== 1) {
      return { ...data, _id: 'local-component' };
    }
    const doc = await Component.create(data);
    return doc.toObject();
  }
  async updateById(id, data) {
    if (mongoose.connection.readyState !== 1) {
      return { id, ...data };
    }
    const doc = await Component.findByIdAndUpdate(id, data, { new: true });
    return doc ? doc.toObject() : null;
  }
  async deleteById(id) {
    if (mongoose.connection.readyState !== 1) {
      return true;
    }
    const res = await Component.findByIdAndDelete(id);
    return !!res;
  }
  async save(doc) {
    await doc.save();
    return doc;
  }
}
