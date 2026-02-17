import { z } from 'zod';

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/aeromaintain',
  redisUrl: process.env.REDIS_URL || '',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim()),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  anacSsoTokenUrl: process.env.ANAC_SSO_TOKEN_URL || 'https://homologacao-sso.anac.gov.br/auth/realms/validacao/protocol/openid-connect/token',
  anacClientId: process.env.ANAC_CLIENT_ID || 'client-api-diariodebordo',
  anacUsername: process.env.ANAC_USERNAME || '',
  anacPassword: process.env.ANAC_PASSWORD || '',
  anacApiBaseUrl: process.env.ANAC_API_BASE_URL || 'https://homologacao-api-diariodebordo.anac.gov.br/api'
};

export function validateConfig(c) {
  const Schema = z.object({
    port: z.number().int().positive(),
    mongoUri: z.string().min(1),
    redisUrl: z.string().optional(),
    allowedOrigins: z.array(z.string().min(1)).min(1),
    geminiApiKey: z.string().optional(),
    anacSsoTokenUrl: z.string().url(),
    anacClientId: z.string().min(1),
    anacUsername: z.string().min(1),
    anacPassword: z.string().min(1),
    anacApiBaseUrl: z.string().url(),
    recaptchaSecret: z.string().optional()
  });
  const parsed = Schema.safeParse(c);
  if (!parsed.success) throw new Error('invalid env');
  return parsed.data;
}
