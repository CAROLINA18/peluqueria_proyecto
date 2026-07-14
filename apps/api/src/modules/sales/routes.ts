import { createHash, randomInt } from 'node:crypto';
import { Prisma, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { AppError } from '../../http/errors.js';
import { authenticate, requireRole } from '../../security/auth.js';
import { audit } from '../../shared/audit.js';
import { businessDateToday, money, parseBusinessDate } from '../../shared/domain.js';

export const salesRouter = Router();
salesRouter.use(authenticate);

const saleSchema = z.object({
  businessDate: z.string(),
  items: z.array(z.object({
    serviceId: z.uuid(),
    quantity: z.coerce.number().int().min(1).max(100),
    effectiveUnitPrice: z.union([z.string(), z.number()]),
    priceOverrideReason: z.string().trim().max(300).nullable().optional(),
  })).min(1).max(50),
  payments: z.array(z.object({
    paymentMethodId: z.uuid(),
    amount: z.union([z.string(), z.number()]),
    reference: z.string().trim().max(120).nullable().optional(),
  })).min(1).max(10),
  notes: z.string().trim().max(1000).nullable().optional(),
});

type SaleInput = z.infer<typeof saleSchema>;

function serializeSale(sale: any) {
  return {
    ...sale,
    totalAmount: sale.totalAmount.toFixed(2),
    items: sale.items?.map((item: any) => ({
      ...item,
      suggestedUnitPriceSnapshot: item.suggestedUnitPriceSnapshot.toFixed(2),
      effectiveUnitPrice: item.effectiveUnitPrice.toFixed(2),
      lineTotal: item.lineTotal.toFixed(2),
    })),
    payments: sale.payments?.map((payment: any) => ({ ...payment, amount: payment.amount.toFixed(2) })),
  };
}

async function prepareSale(input: SaleInput, role: Role) {
  if (role === Role.ASSISTANT && input.businessDate !== businessDateToday()) {
    throw new AppError(403, 'ASSISTANT_TODAY_ONLY', 'El asistente solo puede registrar ventas de hoy');
  }
  const businessDate = parseBusinessDate(input.businessDate);
  const services = await prisma.service.findMany({ where: { id: { in: input.items.map((item) => item.serviceId) }, status: 'ACTIVE' } });
  const methods = await prisma.paymentMethod.findMany({ where: { id: { in: input.payments.map((payment) => payment.paymentMethodId) }, status: 'ACTIVE' } });
  const serviceMap = new Map(services.map((item) => [item.id, item]));
  const methodMap = new Map(methods.map((item) => [item.id, item]));
  if (serviceMap.size !== new Set(input.items.map((item) => item.serviceId)).size) throw new AppError(422, 'SERVICE_INACTIVE', 'Uno de los servicios ya no está disponible');
  if (methodMap.size !== new Set(input.payments.map((item) => item.paymentMethodId)).size) throw new AppError(422, 'PAYMENT_METHOD_INACTIVE', 'Uno de los medios de pago ya no está disponible');

  let total = new Prisma.Decimal(0);
  const items = input.items.map((item, position) => {
    const service = serviceMap.get(item.serviceId)!;
    const effective = money(item.effectiveUnitPrice);
    const changed = !effective.equals(service.suggestedPrice);
    const reason = item.priceOverrideReason?.trim();
    if (changed && !reason) throw new AppError(422, 'PRICE_OVERRIDE_REASON_REQUIRED', `Debes explicar el cambio de precio de ${service.name}`);
    const lineTotal = effective.mul(item.quantity).toDecimalPlaces(2);
    total = total.add(lineTotal);
    return {
      serviceId: service.id,
      serviceNameSnapshot: service.name,
      quantity: item.quantity,
      suggestedUnitPriceSnapshot: service.suggestedPrice,
      effectiveUnitPrice: effective,
      priceOverrideReason: changed ? reason : null,
      lineTotal,
      position,
    };
  });

  let paid = new Prisma.Decimal(0);
  const payments = input.payments.map((payment, position) => {
    const method = methodMap.get(payment.paymentMethodId)!;
    const amount = money(payment.amount);
    paid = paid.add(amount);
    return {
      paymentMethodId: method.id,
      paymentMethodCodeSnapshot: method.code,
      paymentMethodNameSnapshot: method.name,
      amount,
      reference: payment.reference?.trim() || null,
      position,
    };
  });
  if (!paid.equals(total)) throw new AppError(422, 'PAYMENT_TOTAL_MISMATCH', 'La suma de los pagos debe coincidir con el total', { total: total.toFixed(2), paid: paid.toFixed(2), difference: total.minus(paid).toFixed(2) });
  return { businessDate, total, items, payments };
}

const detailInclude = { items: { orderBy: { position: 'asc' as const } }, payments: { orderBy: { position: 'asc' as const } }, createdBy: { select: { id: true, name: true } } };

salesRouter.get('/', async (req, res) => {
  const from = typeof req.query.from === 'string' ? parseBusinessDate(req.query.from) : undefined;
  const to = typeof req.query.to === 'string' ? parseBusinessDate(req.query.to) : undefined;
  const requestedAuthor = typeof req.query.authorId === 'string' ? req.query.authorId : undefined;
  const where: Prisma.SaleWhereInput = {
    ...(req.auth!.role === Role.ADMIN ? requestedAuthor ? { createdById: requestedAuthor } : {} : { createdById: req.auth!.userId }),
    ...(from || to ? { businessDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(typeof req.query.status === 'string' ? { status: req.query.status as any } : {}),
    ...(typeof req.query.serviceId === 'string' ? { items: { some: { serviceId: req.query.serviceId } } } : {}),
    ...(typeof req.query.paymentMethodId === 'string' ? { payments: { some: { paymentMethodId: req.query.paymentMethodId } } } : {}),
  };
  const data = await prisma.sale.findMany({ where, include: detailInclude, orderBy: [{ businessDate: 'desc' }, { createdAt: 'desc' }], take: 200 });
  res.json({ data: data.map(serializeSale) });
});

salesRouter.get('/:id', async (req, res) => {
  const sale = await prisma.sale.findFirst({ where: { id: String(req.params.id), ...(req.auth!.role === Role.ADMIN ? {} : { createdById: req.auth!.userId }) }, include: detailInclude });
  if (!sale) throw new AppError(404, 'SALE_NOT_FOUND', 'Venta no encontrada');
  res.json({ data: serializeSale(sale) });
});

salesRouter.post('/', async (req, res) => {
  const input = saleSchema.parse(req.body);
  const idempotency = req.header('idempotency-key');
  const keyHash = idempotency ? createHash('sha256').update(idempotency).digest('hex') : undefined;
  const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  if (keyHash) {
    const existing = await prisma.idempotencyKey.findUnique({ where: { scope_keyHash: { scope: req.auth!.userId, keyHash } } });
    if (existing) {
      if (existing.requestHash !== requestHash) throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'La clave de reintento ya fue usada con otros datos');
      res.status(existing.responseStatus).json(existing.responseBody);
      return;
    }
  }
  const prepared = await prepareSale(input, req.auth!.role);
  const folio = `LQ-${input.businessDate.replaceAll('-', '')}-${randomInt(1000, 9999)}`;
  const created = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({ data: {
      folio,
      businessDate: prepared.businessDate,
      totalAmount: prepared.total,
      notes: input.notes?.trim() || null,
      createdById: req.auth!.userId,
      updatedById: req.auth!.userId,
      items: { create: prepared.items },
      payments: { create: prepared.payments },
    }, include: detailInclude });
    const response = { data: serializeSale(sale) } as Prisma.InputJsonValue;
    await audit(tx, { actorUserId: req.auth!.userId, action: 'SALE_CREATED', entityType: 'SALE', entityId: sale.id, requestId: req.requestId, after: { folio, total: prepared.total.toFixed(2) } });
    if (keyHash) await tx.idempotencyKey.create({ data: { scope: req.auth!.userId, keyHash, requestHash, responseStatus: 201, responseBody: response, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    return sale;
  });
  res.status(201).json({ data: serializeSale(created) });
});

salesRouter.put('/:id', requireRole(Role.ADMIN), async (req, res) => {
  const input = saleSchema.parse(req.body);
  const expectedVersion = Number(req.header('if-match'));
  if (!Number.isInteger(expectedVersion)) throw new AppError(428, 'VERSION_REQUIRED', 'Debes enviar la versión actual de la venta');
  const current = await prisma.sale.findUnique({ where: { id: String(req.params.id) }, include: detailInclude });
  if (!current) throw new AppError(404, 'SALE_NOT_FOUND', 'Venta no encontrada');
  if (current.status === 'VOIDED') throw new AppError(422, 'SALE_VOIDED', 'No se puede editar una venta anulada');
  if (current.version !== expectedVersion) throw new AppError(409, 'SALE_CONFLICT', 'La venta cambió; recarga antes de editar');
  const prepared = await prepareSale(input, Role.ADMIN);
  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.sale.updateMany({ where: { id: current.id, version: expectedVersion }, data: { version: { increment: 1 } } });
    if (claimed.count !== 1) throw new AppError(409, 'SALE_CONFLICT', 'La venta cambió; recarga antes de editar');
    await tx.saleItem.deleteMany({ where: { saleId: current.id } });
    await tx.salePayment.deleteMany({ where: { saleId: current.id } });
    const sale = await tx.sale.update({ where: { id: current.id }, data: {
      businessDate: prepared.businessDate,
      totalAmount: prepared.total,
      notes: input.notes?.trim() || null,
      updatedById: req.auth!.userId,
      items: { create: prepared.items },
      payments: { create: prepared.payments },
    }, include: detailInclude });
    await audit(tx, { actorUserId: req.auth!.userId, action: 'SALE_UPDATED', entityType: 'SALE', entityId: sale.id, requestId: req.requestId, before: { total: current.totalAmount.toFixed(2), version: current.version }, after: { total: sale.totalAmount.toFixed(2), version: sale.version } });
    return sale;
  });
  res.json({ data: serializeSale(updated) });
});

salesRouter.post('/:id/void', requireRole(Role.ADMIN), async (req, res) => {
  const input = z.object({ reason: z.string().trim().min(3).max(500) }).parse(req.body);
  const current = await prisma.sale.findUnique({ where: { id: String(req.params.id) } });
  if (!current) throw new AppError(404, 'SALE_NOT_FOUND', 'Venta no encontrada');
  if (current.status === 'VOIDED') throw new AppError(422, 'SALE_ALREADY_VOIDED', 'La venta ya está anulada');
  const sale = await prisma.$transaction(async (tx) => {
    const updated = await tx.sale.update({ where: { id: current.id }, data: { status: 'VOIDED', voidReason: input.reason, voidedAt: new Date(), voidedById: req.auth!.userId, updatedById: req.auth!.userId, version: { increment: 1 } } });
    await audit(tx, { actorUserId: req.auth!.userId, action: 'SALE_VOIDED', entityType: 'SALE', entityId: updated.id, requestId: req.requestId, before: { status: current.status }, after: { status: updated.status, reason: input.reason } });
    return updated;
  });
  res.json({ data: serializeSale(sale) });
});
