import crypto from 'crypto';
import argon2 from 'argon2';
import { User } from '../models/user.js';

export async function hashPassword(password) {
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  return { hash };
}

export async function verifyPassword(password, hash) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export async function createResetToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 30 * 60 * 1000);
  const user = await User.findById(userId);
  if (!user) throw new Error('Not found');
  user.resetToken = token;
  user.resetTokenExpires = expires;
  await user.save();
  return { token, expires };
}

export async function consumeResetToken(token) {
  const user = await User.findOne({ resetToken: token });
  if (!user) throw new Error('invalid token');
  if (!user.resetTokenExpires || user.resetTokenExpires.getTime() < Date.now()) throw new Error('expired token');
  return user;
}
