import { Prisma } from '@prisma/client';
import { config } from '../config.js';
import { AppError } from '../http/errors.js';

export const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');

export function money(value: string | number | Prisma.Decimal) {
  try {
    const decimal = new Prisma.Decimal(value);
    if (decimal.lessThanOrEqualTo(0) || decimal.decimalPlaces() > 2) throw new Error();
    return decimal.toDecimalPlaces(2);
  } catch {
    throw new AppError(422, 'INVALID_AMOUNT', 'El importe debe ser mayor que cero y tener máximo dos decimales');
  }
}

export function businessDateToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.APP_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

export function parseBusinessDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AppError(422, 'INVALID_DATE', 'La fecha debe tener formato AAAA-MM-DD');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AppError(422, 'INVALID_DATE', 'La fecha no es válida');
  }
  return date;
}

export const publicUser = <T extends { passwordHash?: unknown; tokenVersion?: unknown }>(user: T) => {
  const { passwordHash: _password, tokenVersion: _version, ...safe } = user;
  return safe;
};
