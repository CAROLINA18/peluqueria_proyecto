import { resolve } from 'node:path';
import { Prisma, Role } from '@prisma/client';
import ExcelJS from 'exceljs';
import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { z } from 'zod';
import { config } from '../../config.js';
import { prisma } from '../../db.js';
import { AppError } from '../../http/errors.js';
import { authenticate, requireRole } from '../../security/auth.js';
import { audit } from '../../shared/audit.js';
import { parseBusinessDate } from '../../shared/domain.js';

export const reportsRouter = Router();
reportsRouter.use(authenticate, requireRole(Role.ADMIN, Role.SENIOR_ASSISTANT));

type Period = 'day' | 'week' | 'month' | 'year' | 'custom';
type Locale = 'es' | 'en';

const labels = {
  es: { report: 'Reporte de ventas', period: 'Periodo', generated: 'Generado', sales: 'Ventas', revenue: 'Ingresos', ticket: 'Ticket promedio', services: 'Servicios', payments: 'Pagos', users: 'Profesionales', summary: 'Resumen' },
  en: { report: 'Sales report', period: 'Period', generated: 'Generated', sales: 'Sales', revenue: 'Revenue', ticket: 'Average ticket', services: 'Services', payments: 'Payments', users: 'Professionals', summary: 'Summary' },
};

function addDays(date: Date, days: number) { const result = new Date(date); result.setUTCDate(result.getUTCDate() + days); return result; }
function lastDay(year: number, month: number) { return new Date(Date.UTC(year, month, 0)); }

function resolveRange(query: Record<string, unknown>, role: Role) {
  const period = (typeof query.period === 'string' ? query.period : query.from && query.to ? 'custom' : 'day') as Period;
  if (!['day', 'week', 'month', 'year', 'custom'].includes(period)) throw new AppError(422, 'INVALID_PERIOD', 'Periodo inválido');
  if (role === Role.SENIOR_ASSISTANT && !['day', 'month'].includes(period)) throw new AppError(403, 'SENIOR_PERIOD_FORBIDDEN', 'El asistente senior solo puede consultar día o mes');
  if (period === 'custom') {
    if (typeof query.from !== 'string' || typeof query.to !== 'string') throw new AppError(422, 'RANGE_REQUIRED', 'Debes indicar fecha inicial y final');
    const from = parseBusinessDate(query.from); const to = parseBusinessDate(query.to);
    if (from > to || addDays(from, 366 * 5) < to) throw new AppError(422, 'INVALID_RANGE', 'El rango debe ser válido y no superar cinco años');
    return { period, from, to };
  }
  const anchorValue = typeof query.anchor === 'string' ? query.anchor : new Date().toISOString().slice(0, 10);
  const anchor = parseBusinessDate(anchorValue);
  if (period === 'day') return { period, from: anchor, to: anchor };
  if (period === 'week') { const day = anchor.getUTCDay() || 7; const from = addDays(anchor, 1 - day); return { period, from, to: addDays(from, 6) }; }
  if (period === 'month') return { period, from: new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1)), to: lastDay(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1) };
  return { period, from: new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1)), to: new Date(Date.UTC(anchor.getUTCFullYear(), 11, 31)) };
}

function addGroup(map: Map<string, { name: string; total: Prisma.Decimal; count: number }>, key: string, name: string, amount: Prisma.Decimal, count = 1) {
  const current = map.get(key) ?? { name, total: new Prisma.Decimal(0), count: 0 };
  current.total = current.total.add(amount); current.count += count; map.set(key, current);
}

async function buildReport(query: Record<string, unknown>, role: Role) {
  const range = resolveRange(query, role);
  const sales = await prisma.sale.findMany({
    where: { status: 'POSTED', businessDate: { gte: range.from, lte: range.to } },
    include: { items: true, payments: true, createdBy: { select: { id: true, name: true } } },
    orderBy: [{ businessDate: 'asc' }, { createdAt: 'asc' }],
  });
  let revenue = new Prisma.Decimal(0); let units = 0;
  const byService = new Map<string, { name: string; total: Prisma.Decimal; count: number }>();
  const byPayment = new Map<string, { name: string; total: Prisma.Decimal; count: number }>();
  const byUser = new Map<string, { name: string; total: Prisma.Decimal; count: number }>();
  const byDay = new Map<string, { name: string; total: Prisma.Decimal; count: number }>();
  for (const sale of sales) {
    revenue = revenue.add(sale.totalAmount);
    addGroup(byUser, sale.createdBy.id, sale.createdBy.name, sale.totalAmount);
    const day = sale.businessDate.toISOString().slice(0, 10); addGroup(byDay, day, day, sale.totalAmount);
    for (const item of sale.items) { units += item.quantity; addGroup(byService, item.serviceId, item.serviceNameSnapshot, item.lineTotal, item.quantity); }
    for (const payment of sale.payments) addGroup(byPayment, payment.paymentMethodId, payment.paymentMethodNameSnapshot, payment.amount);
  }
  const serialize = (map: typeof byService) => [...map.entries()].map(([id, value]) => ({ id, name: value.name, total: value.total.toFixed(2), count: value.count })).sort((a, b) => Number(b.total) - Number(a.total));
  return {
    period: range.period,
    from: range.from.toISOString().slice(0, 10),
    to: range.to.toISOString().slice(0, 10),
    currency: 'EUR',
    summary: { salesCount: sales.length, serviceUnits: units, grossRevenue: revenue.toFixed(2), averageTicket: sales.length ? revenue.div(sales.length).toDecimalPlaces(2).toFixed(2) : '0.00' },
    byDay: serialize(byDay), byService: serialize(byService), byPayment: serialize(byPayment), byUser: serialize(byUser),
    sales: sales.map((sale) => ({ id: sale.id, folio: sale.folio, businessDate: sale.businessDate.toISOString().slice(0, 10), author: sale.createdBy.name, total: sale.totalAmount.toFixed(2) })),
  };
}

reportsRouter.get('/sales', async (req, res) => {
  res.json({ data: await buildReport(req.query, req.auth!.role) });
});

reportsRouter.get('/sales/export', async (req, res) => {
  const format = z.enum(['pdf', 'xlsx']).parse(req.query.format);
  const report = await buildReport(req.query, req.auth!.role);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } });
  const locale: Locale = user.preferredLocale === 'EN' ? 'en' : 'es';
  const text = labels[locale];
  const filename = `reporte-ventas-${report.from}_${report.to}.${format}`;
  await audit(prisma, { actorUserId: user.id, action: 'REPORT_EXPORTED', entityType: 'REPORT', requestId: req.requestId, metadata: { format, period: report.period, from: report.from, to: report.to } });
  if (format === 'pdf') {
    res.setHeader('content-type', 'application/pdf'); res.setHeader('content-disposition', `attachment; filename="${filename}"`);
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `${text.report} - ${config.APP_BUSINESS_NAME}`, Author: config.APP_BUSINESS_NAME } });
    doc.pipe(res);
    try { doc.image(resolve(process.cwd(), 'logos/IMG-20260714-WA0010.jpg'), 48, 40, { fit: [64, 64] }); } catch { /* text remains available */ }
    doc.fillColor('#b76f3c').fontSize(20).text(config.APP_BUSINESS_NAME, 126, 50);
    doc.fillColor('#22201e').fontSize(15).text(text.report, 126, 78);
    doc.moveDown(3).fontSize(10).fillColor('#55504b').text(`${text.period}: ${report.from} — ${report.to}`);
    doc.text(`${text.generated}: ${new Intl.DateTimeFormat(locale, { timeZone: config.APP_TIMEZONE, dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}`);
    doc.moveDown().fontSize(12).fillColor('#22201e');
    doc.text(`${text.sales}: ${report.summary.salesCount}`);
    doc.text(`${text.services}: ${report.summary.serviceUnits}`);
    doc.text(`${text.revenue}: ${report.summary.grossRevenue} EUR`);
    doc.text(`${text.ticket}: ${report.summary.averageTicket} EUR`);
    const section = (title: string, rows: Array<{ name: string; total: string; count: number }>) => {
      doc.moveDown().fontSize(13).fillColor('#b76f3c').text(title);
      doc.fontSize(9).fillColor('#22201e');
      rows.slice(0, 30).forEach((row) => doc.text(`${row.name}  ·  ${row.count}  ·  ${row.total} EUR`));
    };
    section(text.services, report.byService); section(text.payments, report.byPayment); section(text.users, report.byUser);
    doc.end(); return;
  }
  const workbook = new ExcelJS.Workbook();
  workbook.creator = config.APP_BUSINESS_NAME; workbook.title = `${text.report} ${report.from} - ${report.to}`;
  const summaryName = locale === 'es' ? 'Resumen' : 'Summary';
  const summary = workbook.addWorksheet(summaryName); summary.addRows([[config.APP_BUSINESS_NAME], [text.report], [`${text.period}:`, report.from, report.to], [], [text.sales, report.summary.salesCount], [text.services, report.summary.serviceUnits], [text.revenue, Number(report.summary.grossRevenue)], [text.ticket, Number(report.summary.averageTicket)]]);
  summary.getColumn(1).width = 28; summary.getColumn(2).width = 18; summary.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FFB76F3C' } };
  const addSheet = (name: string, columns: Partial<ExcelJS.Column>[], rows: unknown[][]) => { const sheet = workbook.addWorksheet(name); sheet.columns = columns; sheet.addRows(rows); sheet.views = [{ state: 'frozen', ySplit: 1 }]; sheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + columns.length)}1` }; sheet.getRow(1).font = { bold: true }; return sheet; };
  addSheet(locale === 'es' ? 'Ventas' : 'Sales', [{ header: 'Folio', key: 'folio', width: 22 }, { header: locale === 'es' ? 'Fecha' : 'Date', key: 'date', width: 14 }, { header: locale === 'es' ? 'Profesional' : 'Professional', key: 'author', width: 24 }, { header: 'EUR', key: 'total', width: 14 }], report.sales.map((row) => [row.folio, row.businessDate, row.author, Number(row.total)]));
  addSheet(locale === 'es' ? 'Servicios' : 'Services', [{ header: locale === 'es' ? 'Servicio' : 'Service', key: 'name', width: 30 }, { header: locale === 'es' ? 'Unidades' : 'Units', key: 'count', width: 12 }, { header: 'EUR', key: 'total', width: 14 }], report.byService.map((row) => [row.name, row.count, Number(row.total)]));
  addSheet(locale === 'es' ? 'Pagos' : 'Payments', [{ header: locale === 'es' ? 'Medio' : 'Method', key: 'name', width: 30 }, { header: locale === 'es' ? 'Operaciones' : 'Operations', key: 'count', width: 14 }, { header: 'EUR', key: 'total', width: 14 }], report.byPayment.map((row) => [row.name.startsWith('=') ? `'${row.name}` : row.name, row.count, Number(row.total)]));
  res.setHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('content-disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res); res.end();
});
