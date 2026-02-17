import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router as aircraftRouter } from './routes/aircraft.js';
import { router as volumesRouter } from './routes/volumes.js';
import { router as logsRouter } from './routes/logs.js';
import { router as componentsRouter } from './routes/components.js';
import { router as tasksRouter } from './routes/tasks.js';
import { router as complianceRouter } from './routes/compliance.js';
import { router as aiRouter } from './routes/ai.js';
import { router as auditRouter } from './routes/audit.js';
import { router as metricsRouter } from './routes/metrics.js';
import { router as authRouter } from './routes/auth.js';
import { connectMongo } from './db/mongo.js';
import { connectRedis, getRedis } from './db/redis.js';
import { Aircraft } from './models/aircraft.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { config, validateConfig } from './config.js';
import { auditLogger } from './middleware/auditLogger.js';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import { verifyAuditChain } from './services/auditService.js';
import { AuditLog } from './models/auditLog.js';
import { recordAuditCheck, getAnacMetrics, getAuditMetrics } from './services/metricsService.js';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
const logger = pino();
app.use(pinoHttp({
  genReqId(req, res) {
    const id = req.headers['x-request-id'] || Math.random().toString(36).slice(2);
    res.setHeader('x-request-id', id);
    return id;
  }
}));
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'", "https:", "data:", "blob:"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
    styleSrc: ["'self'", "'unsafe-inline'", "https:"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "https:"],
    fontSrc: ["'self'", "https:", "data:"]
  }
}));
app.use(cors({ origin: (origin, cb) => {
  if (!origin || config.allowedOrigins.includes(origin)) return cb(null, true);
  cb(new Error('Not allowed by CORS'));
}, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(auditLogger);

if (process.env.CSRF_ENABLED === '1') {
  const secure = process.env.NODE_ENV === 'production';
  app.use(cookieParser());
  app.use(csurf({ cookie: { httpOnly: true, sameSite: 'lax', secure } }));
  app.get('/api/csrf', (req, res) => {
    const token = req.csrfToken();
    res.cookie('XSRF-TOKEN', token, { httpOnly: false, sameSite: 'lax', secure });
    res.json({ token });
  });
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/health/full', async (req, res) => {
  const mongoConnected = mongoose.connection.readyState === 1;
  let redisConnected = false;
  const r = getRedis();
  if (r) {
    try {
      const pong = await r.ping();
      redisConnected = typeof pong === 'string';
    } catch {}
  }
  const anacConfigured = Boolean(config.anacUsername && config.anacPassword && config.anacClientId);
  const csrfEnabled = process.env.CSRF_ENABLED === '1';
  const rolesEnforced = process.env.ROLES_ENFORCED === '1';
  res.json({
    ok: true,
    uptimeSeconds: Math.floor(process.uptime()),
    mongo: { connected: mongoConnected },
    redis: { connected: redisConnected },
    anac: { configured: anacConfigured },
    security: { csrfEnabled, rolesEnforced, allowedOrigins: config.allowedOrigins.length },
    metrics: { anac: getAnacMetrics(), audit: getAuditMetrics() }
  });
});

app.get('/api/state', async (req, res) => {
  const aircraft = await Aircraft.findOne();
  res.json({ aircraft });
});

app.use('/api/aircraft', aircraftRouter);
app.use('/api/v1/aircraft', aircraftRouter);
app.use('/api/volumes', volumesRouter);
app.use('/api/v1/volumes', volumesRouter);
app.use('/api/logs', logsRouter);
app.use('/api/v1/logs', logsRouter);
app.use('/api/components', componentsRouter);
app.use('/api/v1/components', componentsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/v1/compliance', complianceRouter);
app.use('/api/ai', rateLimit({ windowMs: 60_000, max: 10 }), aiRouter);
app.use('/api/v1/ai', rateLimit({ windowMs: 60_000, max: 10 }), aiRouter);
app.use('/api/audit', auditRouter);
app.use('/api/v1/audit', auditRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/v1/metrics', metricsRouter);
app.use('/api/auth', authRouter);
app.use('/api/v1/auth', authRouter);

const port = config.port;
function bootstrap() {
  validateConfig(config);
  connectMongo(config.mongoUri).catch(() => {});
  if (config.redisUrl) {
    try { connectRedis(config.redisUrl); } catch (e) { void e; }
  }
  app.listen(port, () => { logger.info({ port }, 'server'); });
  const resources = ['logs','volumes','components','tasks','compliance','aircraft'];
  setInterval(async () => {
    try {
      for (const r of resources) {
        const resRectify = await AuditLog.countDocuments({ resource: r, action: 'RECTIFY' }).catch(() => 0);
        const check = await verifyAuditChain({ resource: r }).catch(() => ({ total: 0, chainValid: true, breakIndex: undefined }));
        recordAuditCheck(r, check.chainValid, check.total, check.breakIndex, resRectify);
        if (check.chainValid === false) {
          logger.warn({ resource: r, total: check.total, breakIndex: check.breakIndex }, 'audit chain break');
        }
      }
    } catch (e) { void e; }
  }, 60_000);
  app.use((err, req, res, next) => {
    const reqId = req.headers['x-request-id'];
    if (err && err.name === 'ZodError') {
      return res.status(400).json({ error: 'validation_error', requestId: reqId, details: err.errors || err.issues || [] });
    }
    const status = err && typeof err.status === 'number' ? err.status : 500;
    const code = err && typeof err.code === 'string' ? err.code : 'internal_error';
    const message = err && err.message ? err.message : 'internal';
    res.status(status).json({ error: code, message, requestId: reqId });
  });
}
bootstrap();
