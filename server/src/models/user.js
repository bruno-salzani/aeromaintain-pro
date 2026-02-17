import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  cpf: { type: String, required: true },
  passwordHash: { type: String, required: true },
  resetToken: { type: String },
  resetTokenExpires: { type: Date }
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);
