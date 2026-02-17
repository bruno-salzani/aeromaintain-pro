import mongoose from 'mongoose';

export async function connectMongo(uri) {
  if (mongoose.connection.readyState === 1) return mongoose;
  await mongoose.connect(uri, { dbName: 'aeromaintain' });
  return mongoose;
}

export function disconnectMongo() {
  return mongoose.disconnect();
}
