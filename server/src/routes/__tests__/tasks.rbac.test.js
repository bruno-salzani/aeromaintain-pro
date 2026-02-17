import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../services/taskService.js', () => ({
  listTasks: vi.fn(async () => []),
  deleteTask: vi.fn(async () => true)
}));

describe('RBAC Tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ROLES_ENFORCED = '1';
    process.env.ADMIN_API_KEY = '';
  });

  it('bloqueia DELETE /api/tasks/:id sem role ADMINISTRADOR', async () => {
    const { router: tasksRouter } = await import('../tasks.js');
    const app = express();
    app.use(express.json());
    app.use('/api/tasks', tasksRouter);
    const res = await request(app).delete('/api/tasks/t1');
    expect(res.status).toBe(403);
  });

  it('permite DELETE /api/tasks/:id com role ADMINISTRADOR', async () => {
    const { router: tasksRouter } = await import('../tasks.js');
    const app = express();
    app.use(express.json());
    app.use('/api/tasks', tasksRouter);
    const res = await request(app).delete('/api/tasks/t1').set('x-role', 'ADMINISTRADOR');
    expect(res.status).toBe(204);
  });
});
