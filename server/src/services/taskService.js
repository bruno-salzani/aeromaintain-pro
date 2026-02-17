import { Task } from '../models/task.js';
import { Aircraft } from '../models/aircraft.js';
import { TaskRepository } from '../infra/repositories/TaskRepository.js';

export async function listTasks() {
  const repo = new TaskRepository();
  return repo.list();
}

export async function deleteTask(id) {
  const repo = new TaskRepository();
  return repo.deleteById(id);
}
