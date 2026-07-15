import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { AppError } from '../../http/errors.js';
import { authenticate, requireRole } from '../../security/auth.js';
import { audit } from '../../shared/audit.js';
import { money, normalize } from '../../shared/domain.js';

export const catalogsRouter = Router();
catalogsRouter.use(authenticate);

const catalogStatus = z.enum(['ACTIVE', 'INACTIVE']);
const categoryInput = z.object({ name: z.string().trim().min(2).max(120), description: z.string().trim().max(500).nullable().optional(), displayOrder: z.coerce.number().int().min(0).default(0), status: catalogStatus.optional() });
const methodInput = z.object({ code: z.string().trim().min(2).max(50), name: z.string().trim().min(2).max(120), description: z.string().trim().max(500).nullable().optional(), displayOrder: z.coerce.number().int().min(0).default(0), status: catalogStatus.optional() });
const serviceInput = z.object({ name: z.string().trim().min(2).max(160), description: z.string().trim().max(500).nullable().optional(), categoryId: z.uuid().nullable().optional(), suggestedPrice: z.union([z.string(), z.number()]), status: catalogStatus.optional() });

function isAdmin(role: Role) { return role === Role.ADMIN; }

catalogsRouter.get('/categories', async (req, res) => {
  const data = await prisma.serviceCategory.findMany({ where: isAdmin(req.auth!.role) ? {} : { status: 'ACTIVE' }, orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] });
  res.json({ data });
});

catalogsRouter.post('/categories', requireRole(Role.ADMIN), async (req, res) => {
  const input = categoryInput.parse(req.body);
  try {
    const data = await prisma.serviceCategory.create({ data: { ...input, normalizedName: normalize(input.name), deactivatedAt: input.status === 'INACTIVE' ? new Date() : null, createdById: req.auth!.userId, updatedById: req.auth!.userId } });
    await audit(prisma, { actorUserId: req.auth!.userId, action: 'CATEGORY_CREATED', entityType: 'SERVICE_CATEGORY', entityId: data.id, requestId: req.requestId, after: { name: data.name } });
    res.status(201).json({ data });
  } catch (error: any) { if (error?.code === 'P2002') throw new AppError(409, 'CATEGORY_EXISTS', 'Ya existe esa categoría'); throw error; }
});

catalogsRouter.patch('/categories/:id', requireRole(Role.ADMIN), async (req, res) => {
  const input = categoryInput.partial().parse(req.body);
  const current = await prisma.serviceCategory.findUnique({ where: { id: String(req.params.id) } });
  if (!current) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Categoría no encontrada');
  const data = await prisma.serviceCategory.update({ where: { id: current.id }, data: { ...input, ...(input.name ? { normalizedName: normalize(input.name) } : {}), updatedById: req.auth!.userId, deactivatedAt: input.status === 'INACTIVE' ? new Date() : input.status === 'ACTIVE' ? null : undefined } });
  await audit(prisma, { actorUserId: req.auth!.userId, action: 'CATEGORY_UPDATED', entityType: 'SERVICE_CATEGORY', entityId: data.id, requestId: req.requestId, before: { name: current.name, status: current.status }, after: { name: data.name, status: data.status } });
  res.json({ data });
});

catalogsRouter.get('/payment-methods', async (req, res) => {
  const data = await prisma.paymentMethod.findMany({ where: isAdmin(req.auth!.role) ? {} : { status: 'ACTIVE' }, orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] });
  res.json({ data });
});

catalogsRouter.post('/payment-methods', requireRole(Role.ADMIN), async (req, res) => {
  const input = methodInput.parse(req.body);
  try {
    const data = await prisma.paymentMethod.create({ data: { ...input, normalizedCode: normalize(input.code), normalizedName: normalize(input.name), deactivatedAt: input.status === 'INACTIVE' ? new Date() : null, createdById: req.auth!.userId, updatedById: req.auth!.userId } });
    await audit(prisma, { actorUserId: req.auth!.userId, action: 'PAYMENT_METHOD_CREATED', entityType: 'PAYMENT_METHOD', entityId: data.id, requestId: req.requestId, after: { code: data.code, name: data.name } });
    res.status(201).json({ data });
  } catch (error: any) { if (error?.code === 'P2002') throw new AppError(409, 'PAYMENT_METHOD_EXISTS', 'Ya existe ese medio de pago'); throw error; }
});

catalogsRouter.patch('/payment-methods/:id', requireRole(Role.ADMIN), async (req, res) => {
  const input = methodInput.partial().parse(req.body);
  const current = await prisma.paymentMethod.findUnique({ where: { id: String(req.params.id) } });
  if (!current) throw new AppError(404, 'PAYMENT_METHOD_NOT_FOUND', 'Medio de pago no encontrado');
  if (current.status === 'ACTIVE' && input.status === 'INACTIVE' && await prisma.paymentMethod.count({ where: { status: 'ACTIVE' } }) <= 1) throw new AppError(422, 'LAST_PAYMENT_METHOD', 'Debe existir al menos un medio de pago activo');
  const data = await prisma.paymentMethod.update({ where: { id: current.id }, data: { ...input, ...(input.code ? { normalizedCode: normalize(input.code) } : {}), ...(input.name ? { normalizedName: normalize(input.name) } : {}), updatedById: req.auth!.userId, deactivatedAt: input.status === 'INACTIVE' ? new Date() : input.status === 'ACTIVE' ? null : undefined } });
  await audit(prisma, { actorUserId: req.auth!.userId, action: 'PAYMENT_METHOD_UPDATED', entityType: 'PAYMENT_METHOD', entityId: data.id, requestId: req.requestId, before: { name: current.name, status: current.status }, after: { name: data.name, status: data.status } });
  res.json({ data });
});

catalogsRouter.get('/services', async (req, res) => {
  const data = await prisma.service.findMany({ where: isAdmin(req.auth!.role) ? {} : { status: 'ACTIVE' }, include: { category: true }, orderBy: { name: 'asc' } });
  res.json({ data: data.map((item) => ({ ...item, suggestedPrice: item.suggestedPrice.toFixed(2) })) });
});

catalogsRouter.post('/services', requireRole(Role.ADMIN), async (req, res) => {
  const input = serviceInput.parse(req.body);
  try {
    const data = await prisma.service.create({ data: { name: input.name, normalizedName: normalize(input.name), description: input.description, categoryId: input.categoryId, suggestedPrice: money(input.suggestedPrice), status: input.status, deactivatedAt: input.status === 'INACTIVE' ? new Date() : null, createdById: req.auth!.userId, updatedById: req.auth!.userId }, include: { category: true } });
    await audit(prisma, { actorUserId: req.auth!.userId, action: 'SERVICE_CREATED', entityType: 'SERVICE', entityId: data.id, requestId: req.requestId, after: { name: data.name, price: data.suggestedPrice.toFixed(2) } });
    res.status(201).json({ data: { ...data, suggestedPrice: data.suggestedPrice.toFixed(2) } });
  } catch (error: any) { if (error?.code === 'P2002') throw new AppError(409, 'SERVICE_EXISTS', 'Ya existe ese servicio'); throw error; }
});

catalogsRouter.patch('/services/:id', requireRole(Role.ADMIN), async (req, res) => {
  const input = serviceInput.partial().parse(req.body);
  const current = await prisma.service.findUnique({ where: { id: String(req.params.id) } });
  if (!current) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Servicio no encontrado');
  const data = await prisma.service.update({ where: { id: current.id }, data: {
    ...(input.name ? { name: input.name, normalizedName: normalize(input.name) } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.suggestedPrice !== undefined ? { suggestedPrice: money(input.suggestedPrice) } : {}),
    ...(input.status ? { status: input.status, deactivatedAt: input.status === 'INACTIVE' ? new Date() : null } : {}),
    updatedById: req.auth!.userId,
  }, include: { category: true } });
  await audit(prisma, { actorUserId: req.auth!.userId, action: 'SERVICE_UPDATED', entityType: 'SERVICE', entityId: data.id, requestId: req.requestId, before: { name: current.name, price: current.suggestedPrice.toFixed(2), status: current.status }, after: { name: data.name, price: data.suggestedPrice.toFixed(2), status: data.status } });
  res.json({ data: { ...data, suggestedPrice: data.suggestedPrice.toFixed(2) } });
});
