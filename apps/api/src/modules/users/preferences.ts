import { Locale } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authenticate, createAccessToken } from '../../security/auth.js';
import { audit } from '../../shared/audit.js';

export const preferencesRouter = Router();

preferencesRouter.patch('/me/preferences', authenticate, async (req, res) => {
  const input = z.object({ locale: z.enum(['es', 'en']) }).parse(req.body);
  const user = await prisma.user.update({ where: { id: req.auth!.userId }, data: { preferredLocale: input.locale === 'es' ? Locale.ES : Locale.EN } });
  await audit(prisma, { actorUserId: user.id, action: 'PREFERENCES_UPDATED', entityType: 'USER', entityId: user.id, requestId: req.requestId, after: { locale: input.locale } });
  res.json({ accessToken: createAccessToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role, preferredLocale: input.locale, mustChangePassword: user.mustChangePassword } });
});
