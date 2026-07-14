import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')], quiet: true });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  APP_TIMEZONE: z.literal('Europe/Brussels').default('Europe/Brussels'),
  APP_CURRENCY: z.literal('EUR').default('EUR'),
  APP_DEFAULT_LOCALE: z.enum(['es', 'en']).default('es'),
  APP_BUSINESS_NAME: z.string().default('Lina Quirama Beauty Salon'),
  CORS_ORIGIN: z.string().default('http://localhost:4200'),
  WEB_DIST_PATH: z.string().default('apps/web/dist/lq-beauty/browser'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Configuración inválida:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export const isProduction = config.NODE_ENV === 'production';
