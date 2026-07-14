import { createHash, randomUUID } from 'node:crypto';
import type { RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role, User } from '@prisma/client';
import { config, isProduction } from '../config.js';
import { prisma } from '../db.js';
import { AppError } from '../http/errors.js';

type TokenPayload = { sub: string; role: Role; version: number; sid?: string };
const refreshCookie = 'lq_refresh';
const sessionHintCookie = 'lq_session_hint';

export function createAccessToken(user: Pick<User, 'id' | 'role' | 'tokenVersion'>) {
  return jwt.sign(
    { sub: user.id, role: user.role, version: user.tokenVersion } satisfies TokenPayload,
    config.JWT_ACCESS_SECRET,
    { expiresIn: '15m', issuer: 'lq-beauty', audience: 'lq-web' },
  );
}

export function createRefreshToken(user: Pick<User, 'id' | 'role' | 'tokenVersion'>, sessionId: string) {
  return jwt.sign(
    { sub: user.id, role: user.role, version: user.tokenVersion, sid: sessionId } satisfies TokenPayload,
    config.JWT_REFRESH_SECRET,
    { expiresIn: '7d', issuer: 'lq-beauty', audience: 'lq-refresh' },
  );
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, config.JWT_REFRESH_SECRET, {
    issuer: 'lq-beauty', audience: 'lq-refresh',
  }) as TokenPayload;
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function issueSession(user: User, userAgent?: string) {
  const id = randomUUID();
  const refreshToken = createRefreshToken(user, id);
  await prisma.authSession.create({
    data: {
      id,
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: userAgent?.slice(0, 255),
    },
  });
  return { accessToken: createAccessToken(user), refreshToken };
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(refreshCookie, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie(sessionHintCookie, '1', {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(refreshCookie, { httpOnly: true, secure: isProduction, sameSite: 'strict', path: '/api/v1/auth' });
  res.clearCookie(sessionHintCookie, { httpOnly: false, secure: isProduction, sameSite: 'strict', path: '/' });
}

export function readRefreshCookie(cookies: Record<string, unknown>) {
  const value = cookies[refreshCookie];
  if (typeof value !== 'string') throw new AppError(401, 'SESSION_REQUIRED', 'La sesión no está disponible');
  return value;
}

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) throw new AppError(401, 'AUTH_REQUIRED', 'Debes iniciar sesión');
    const payload = jwt.verify(header.slice(7), config.JWT_ACCESS_SECRET, {
      issuer: 'lq-beauty', audience: 'lq-web',
    }) as TokenPayload;
    const user = await prisma.user.findUnique({ select: { id: true, role: true, status: true, tokenVersion: true }, where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE' || user.tokenVersion !== payload.version) {
      throw new AppError(401, 'SESSION_INVALID', 'La sesión ya no es válida');
    }
    req.auth = { userId: user.id, role: user.role, tokenVersion: user.tokenVersion };
    next();
  } catch (error) {
    if (error instanceof AppError) next(error);
    else next(new AppError(401, 'SESSION_INVALID', 'La sesión ya no es válida'));
  }
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      next(new AppError(403, 'FORBIDDEN', 'No tienes permiso para realizar esta acción'));
      return;
    }
    next();
  };
}
