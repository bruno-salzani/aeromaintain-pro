import Redis from 'ioredis';

let client;

export function connectRedis(url) {
  if (client) return client;
  client = new Redis(url);
  client.on('error', () => {});
  return client;
}

export function getRedis() {
  return client;
}
