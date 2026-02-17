import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../models/user.js', () => ({
  User: {
    findOne: vi.fn(),
    findById: vi.fn(),
    find: vi.fn()
  }
}));

import * as authService from '../../services/authService.js';
const { User } = await import('../../models/user.js');

describe('Auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RECAPTCHA_DISABLED = '1';
  });

  it('login success sets cookie', async () => {
    const { router: authRouter } = await import('../auth.js');
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    User.findOne.mockResolvedValue({ email: 'u@test.com', passwordHash: 'h', passwordSalt: 's' });
    vi.spyOn(authService, 'verifyPassword').mockReturnValue(true);
    const res = await request(app).post('/api/auth/login').send({ email: 'u@test.com', password: '123456', rememberMe: true, recaptchaToken: 't' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('request reset returns link when cpf matches', async () => {
    const { router: authRouter } = await import('../auth.js');
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    User.findOne.mockResolvedValue({ id: 'u1', email: 'u@test.com', cpf: '12345678900' });
    vi.spyOn(authService, 'createResetToken').mockResolvedValue({ token: 'reset123', expires: new Date(Date.now() + 1000) });
    const res = await request(app).post('/api/auth/request-reset').send({ email: 'u@test.com', cpf: '123.456.789-00', recaptchaToken: 't' });
    expect(res.status).toBe(200);
    expect(res.body.resetLink).toContain('reset-password?token=reset123');
  });

  it('reset success updates password', async () => {
    const { router: authRouter } = await import('../auth.js');
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    const save = vi.fn();
    vi.spyOn(authService, 'consumeResetToken').mockResolvedValue({ save });
    vi.spyOn(authService, 'hashPassword').mockReturnValue({ hash: 'nh', salt: 'ns' });
    const res = await request(app).post('/api/auth/reset').send({ token: 'abc', newPassword: '123456' });
    expect(res.status).toBe(200);
    expect(save).toHaveBeenCalled();
  });
});
