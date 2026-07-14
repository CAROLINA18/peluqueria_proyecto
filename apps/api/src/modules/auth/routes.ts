import { Router } from 'express';
import argon2 from 'argon2';
import { Locale } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { AppError } from '../../http/errors.js';
import { audit } from '../../shared/audit.js';
import { normalize, publicUser } from '../../shared/domain.js';
import {
  authenticate, clearRefreshCookie, createAccessToken, hashToken, issueSession,
  readRefreshCookie, setRefreshCookie, verifyRefreshToken,
} from '../../security/auth.js';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().trim().min(3).max(80),
  password: z.string().min(8).max(200),
});

const sessionUser = (user: { id: string; name: string; username: string; role: string; preferredLocale: Locale; mustChangePassword: boolean }) => ({
  id: user.id,
  name: user.name,
  username: user.username,
  role: user.role,
  preferredLocale: user.preferredLocale.toLowerCase(),
  mustChangePassword: user.mustChangePassword,
});

authRouter.post('/login', async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { normalizedUsername: normalize(input.username) } });
  const valid = user ? await argon2.verify(user.passwordHash, input.password) : false;
  if (!user || !valid || user.status !== 'ACTIVE') {
    await audit(prisma, { action: 'LOGIN_FAILED', entityType: 'AUTH', requestId: req.requestId, metadata: { username: normalize(input.username) } });
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Nombre de usuario o contraseña incorrectos');
  }
  const tokens = await issueSession(user, req.header('user-agent'));
  setRefreshCookie(res, tokens.refreshToken);
  await audit(prisma, { actorUserId: user.id, action: 'LOGIN_SUCCEEDED', entityType: 'AUTH', entityId: user.id, requestId: req.requestId });
  res.json({ accessToken: tokens.accessToken, user: sessionUser(user) });
});

authRouter.post('/refresh', async (req, res) => {
  const token = readRefreshCookie(req.cookies as Record<string, unknown>);
  let payload: ReturnType<typeof verifyRefreshToken>;
  try { payload = verifyRefreshToken(token); }
  catch { clearRefreshCookie(res); throw new AppError(401, 'SESSION_INVALID', 'La sesión ya no es válida'); }
  if (!payload.sid) throw new AppError(401, 'SESSION_INVALID', 'La sesión ya no es válida');
  const session = await prisma.authSession.findUnique({ where: { id: payload.sid }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.refreshTokenHash !== hashToken(token)
    || session.user.status !== 'ACTIVE' || session.user.tokenVersion !== payload.version) {
    clearRefreshCookie(res);
    throw new AppError(401, 'SESSION_INVALID', 'La sesión ya no es válida');
  }
  await prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date(), lastUsedAt: new Date() } });
  const nextTokens = await issueSession(session.user, req.header('user-agent'));
  setRefreshCookie(res, nextTokens.refreshToken);
  res.json({ accessToken: nextTokens.accessToken, user: sessionUser(session.user) });
});

authRouter.post('/logout', async (req, res) => {
  const raw = req.cookies?.lq_refresh as string | undefined;
  if (raw) await prisma.authSession.updateMany({ where: { refreshTokenHash: hashToken(raw), revokedAt: null }, data: { revokedAt: new Date() } });
  clearRefreshCookie(res);
  res.status(204).end();
});

authRouter.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } });
  res.json({ user: sessionUser(user) });
});

authRouter.patch('/preferences', authenticate, async (req, res) => {
  const input = z.object({ locale: z.enum(['es', 'en']) }).parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.auth!.userId },
    data: { preferredLocale: input.locale === 'es' ? Locale.ES : Locale.EN },
  });
  await audit(prisma, { actorUserId: user.id, action: 'PREFERENCES_UPDATED', entityType: 'USER', entityId: user.id, requestId: req.requestId, after: { locale: input.locale } });
  res.json({ user: sessionUser(user), accessToken: createAccessToken(user) });
});

authRouter.post('/change-password', authenticate, async (req, res) => {
  const input = z.object({ currentPassword: z.string().min(8), newPassword: z.string().min(10).max(200) }).parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } });
  if (!await argon2.verify(user.passwordHash, input.currentPassword)) throw new AppError(422, 'PASSWORD_INCORRECT', 'La contraseña actual no es correcta');
  const passwordHash = await argon2.hash(input.newPassword, { type: argon2.argon2id });
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false, tokenVersion: { increment: 1 } } });
  await prisma.authSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  clearRefreshCookie(res);
  await audit(prisma, { actorUserId: user.id, action: 'PASSWORD_CHANGED', entityType: 'USER', entityId: user.id, requestId: req.requestId });
  res.status(204).end();
});
