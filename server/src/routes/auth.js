import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { User } from '../models/user.js';
import { hashPassword, verifyPassword, createResetToken, consumeResetToken } from '../services/authService.js';
import { sendResetEmail } from '../services/emailService.js';
import { config } from '../config.js';
import pino from 'pino';

export const router = Router();
const logger = pino();

async function verifyRecaptchaToken(token) {
  if (process.env.RECAPTCHA_DISABLED === '1') {
    if (process.env.NODE_ENV !== 'test') {
      logger.warn('reCAPTCHA está desativado (RECAPTCHA_DISABLED=1)');
    }
    return true;
  }
  const secret = process.env.RECAPTCHA_SECRET || config.recaptchaSecret || '';
  if (!secret) return false;
  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token })
    });
    if (!res.ok) return false;
    const data = await res.json().catch(async () => ({ raw: await res.text() }));
    return Boolean(data.success);
  } catch {
    return false;
  }
}

router.post('/login', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    rememberMe: z.boolean().optional(),
    recaptchaToken: z.string().min(1)
  });
  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });
  const { email, password, rememberMe, recaptchaToken } = parsed.data;
  const ok = await verifyRecaptchaToken(recaptchaToken);
  if (!ok) return res.status(400).json({ error: 'recaptcha failed' });
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'invalid credentials' });
  const token = crypto.randomBytes(24).toString('hex');
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined;
  const secure = process.env.NODE_ENV === 'production';
  res.cookie('session', token, { httpOnly: true, sameSite: 'lax', secure, maxAge });
  res.json({ ok: true });
});

router.post('/request-reset', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    cpf: z.string().min(11).max(14),
    recaptchaToken: z.string().min(1)
  });
  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });
  const { email, cpf, recaptchaToken } = parsed.data;
  const ok = await verifyRecaptchaToken(recaptchaToken);
  if (!ok) return res.status(400).json({ error: 'recaptcha failed' });
  const user = await User.findOne({ email });
  if (!user || (user.cpf || '').replace(/[^\d]/g, '') !== (cpf || '').replace(/[^\d]/g, '')) {
    return res.status(404).json({ error: 'user not found' });
  }
  const { token } = await createResetToken(user.id || user._id?.toString());
  const origin = Array.isArray(config.allowedOrigins) && config.allowedOrigins[0] ? config.allowedOrigins[0] : 'http://localhost:3000';
  const resetLink = `${origin}/reset-password?token=${token}`;
  try { await sendResetEmail(user.email, resetLink); } catch {}
  res.json({ ok: true, resetLink });
});

router.post('/reset', async (req, res) => {
  const schema = z.object({
    token: z.string().min(1),
    newPassword: z.string().min(6)
  });
  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });
  const { token, newPassword } = parsed.data;
  try {
    const user = await consumeResetToken(token);
    const { hash } = await hashPassword(newPassword);
    user.passwordHash = hash;
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'reset failed' });
  }
});
