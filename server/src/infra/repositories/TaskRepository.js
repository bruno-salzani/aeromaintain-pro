import mongoose from 'mongoose';
import { Task } from '../../models/task.js';

export class TaskRepository {
  async list() {
    if (mongoose.connection.readyState !== 1) {
      return [];
    }
    return Task.find().lean();
  }
  async deleteById(id) {
    if (mongoose.connection.readyState !== 1) {
      return true;
    }
    const res = await Task.findByIdAndDelete(id);
    return !!res;
  }
}
