import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config, isProduction } from './config.js';
import { prisma } from './db.js';
import { errorHandler, notFound } from './http/errors.js';
import { requestContext } from './http/request-context.js';
import { authRouter } from './modules/auth/routes.js';
import { catalogsRouter } from './modules/catalogs/routes.js';
import { reportsRouter } from './modules/reports/routes.js';
import { salesRouter } from './modules/sales/routes.js';
import { preferencesRouter } from './modules/users/preferences.js';
import { usersRouter } from './modules/users/routes.js';

const app = express();
app.disable('x-powered-by');
if (isProduction) app.set('trust proxy', 1);
app.use(requestContext);
app.use(helmet({
  ...(isProduction ? {
    contentSecurityPolicy: {
      directives: {
        scriptSrcAttr: ["'none'", "'report-sample'"],
        reportUri: ['/api/v1/security/csp-report'],
      },
    },
  } : { contentSecurityPolicy: false }),
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({ origin: isProduction ? false : config.CORS_ORIGIN, credentials: true }));
app.post('/api/v1/security/csp-report', express.json({
  limit: '32kb',
  type: ['application/csp-report', 'application/reports+json', 'application/json'],
}), (req, res) => {
  const raw = Array.isArray(req.body) ? req.body[0]?.body : req.body?.['csp-report'] ?? req.body;
  const report = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  console.warn(JSON.stringify({
    level: 'warn',
    event: 'CSP_VIOLATION',
    requestId: req.requestId,
    directive: report['effective-directive'] ?? report.effectiveDirective,
    blockedUri: report['blocked-uri'] ?? report.blockedURL,
    sourceFile: report['source-file'] ?? report.sourceFile,
    line: report['line-number'] ?? report.lineNumber,
    column: report['column-number'] ?? report.columnNumber,
    sample: report['script-sample'] ?? report.sample,
  }));
  res.status(204).end();
});
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
app.get('/health/ready', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ready', business: config.APP_BUSINESS_NAME });
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: 'draft-8', legacyHeaders: false });
const exportLimiter = rateLimit({ windowMs: 60 * 1000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false });
app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/users', preferencesRouter, usersRouter);
app.use('/api/v1/catalogs', catalogsRouter);
app.use('/api/v1/sales', salesRouter);
app.use('/api/v1/reports', exportLimiter, reportsRouter);

const webPath = resolve(process.cwd(), config.WEB_DIST_PATH);
if (existsSync(webPath)) {
  app.use(express.static(webPath, { maxAge: isProduction ? '1d' : 0, index: false }));
  app.get('*splat', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/health/')) { next(); return; }
    res.sendFile(resolve(webPath, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

const server = app.listen(config.PORT, () => console.log(JSON.stringify({ level: 'info', message: `LQ Beauty API escuchando en ${config.PORT}` })));

async function shutdown(signal: string) {
  console.log(JSON.stringify({ level: 'info', message: `Cierre ordenado por ${signal}` }));
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

export { app };
