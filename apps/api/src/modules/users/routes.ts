import { Router } from 'express';
import argon2 from 'argon2';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { AppError } from '../../http/errors.js';
import { authenticate, requireRole } from '../../security/auth.js';
import { audit } from '../../shared/audit.js';
import { normalize, publicUser } from '../../shared/domain.js';

export const usersRouter = Router();
usersRouter.use(authenticate, requireRole(Role.ADMIN));

const userSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/),
  role: z.enum([Role.ADMIN, Role.SENIOR_ASSISTANT, Role.ASSISTANT]),
  password: z.string().min(10).max(200).optional(),
});

const resetPasswordSchema = z.object({
  temporaryPassword: z.string().min(10).max(200),
});

usersRouter.get('/', async (req, res) => {
  const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
  const users = await prisma.user.findMany({
    where: query ? { OR: [{ name: { contains: query } }, { username: { contains: query } }] } : undefined,
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
    take: 200,
  });
  res.json({ data: users.map(publicUser) });
});

usersRouter.post('/', async (req, res) => {
  const input = userSchema.extend({ password: z.string().min(10).max(200) }).parse(req.body);
  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
  try {
    const user = await prisma.user.create({ data: {
      name: input.name,
      username: input.username.trim(),
      normalizedUsername: normalize(input.username),
      email: `${normalize(input.username)}@users.linaquirama.local`,
      normalizedEmail: `${normalize(input.username)}@users.linaquirama.local`,
      passwordHash,
      role: input.role,
      mustChangePassword: true,
    } });
    await audit(prisma, { actorUserId: req.auth!.userId, action: 'USER_CREATED', entityType: 'USER', entityId: user.id, requestId: req.requestId, after: { name: user.name, username: user.username, role: user.role } });
    res.status(201).json({ data: publicUser(user) });
  } catch (error: any) {
    if (error?.code === 'P2002') throw new AppError(409, 'USERNAME_EXISTS', 'Ya existe un usuario con ese nombre de usuario');
    throw error;
  }
});

usersRouter.patch('/:id', async (req, res) => {
  const input = userSchema.partial().extend({ status: z.enum(['ACTIVE', 'INACTIVE']).optional() }).parse(req.body);
  const current = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!current) throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');
  if (current.role === Role.ADMIN && current.status === 'ACTIVE'
      && (input.role && input.role !== Role.ADMIN || input.status === 'INACTIVE')) {
    const activeAdmins = await prisma.user.count({ where: { role: Role.ADMIN, status: 'ACTIVE' } });
    if (activeAdmins <= 1) throw new AppError(422, 'LAST_ADMIN', 'No puedes desactivar o degradar al último administrador');
  }
  const passwordHash = input.password ? await argon2.hash(input.password, { type: argon2.argon2id }) : undefined;
  let user;
  try {
    const normalizedUsername = input.username ? normalize(input.username) : undefined;
    user = await prisma.user.update({ where: { id: current.id }, data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.username ? { username: input.username.trim(), normalizedUsername, email: `${normalizedUsername}@users.linaquirama.local`, normalizedEmail: `${normalizedUsername}@users.linaquirama.local` } : {}),
      ...(input.role ? { role: input.role } : {}),
      ...(input.status ? { status: input.status, deactivatedAt: input.status === 'INACTIVE' ? new Date() : null, tokenVersion: { increment: 1 } } : {}),
      ...(passwordHash ? { passwordHash, mustChangePassword: true, tokenVersion: { increment: 1 } } : {}),
    } });
  } catch (error: any) {
    if (error?.code === 'P2002') throw new AppError(409, 'USERNAME_EXISTS', 'Ya existe un usuario con ese nombre de usuario');
    throw error;
  }
  if (input.status === 'INACTIVE' || input.role || passwordHash) await prisma.authSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit(prisma, { actorUserId: req.auth!.userId, action: 'USER_UPDATED', entityType: 'USER', entityId: user.id, requestId: req.requestId, before: { name: current.name, username: current.username, role: current.role, status: current.status }, after: { name: user.name, username: user.username, role: user.role, status: user.status } });
  res.json({ data: publicUser(user) });
});

usersRouter.post('/:id/reset-password', async (req, res) => {
  const input = resetPasswordSchema.parse(req.body);
  const current = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!current) throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');

  const passwordHash = await argon2.hash(input.temporaryPassword, { type: argon2.argon2id });
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: current.id },
      data: { passwordHash, mustChangePassword: true, tokenVersion: { increment: 1 } },
    });
    await tx.authSession.updateMany({
      where: { userId: current.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await audit(tx, {
      actorUserId: req.auth!.userId,
      action: 'USER_PASSWORD_RESET',
      entityType: 'USER',
      entityId: current.id,
      requestId: req.requestId,
      metadata: { forcedChange: true },
    });
    return updated;
  });

  res.json({ data: publicUser(user) });
});
