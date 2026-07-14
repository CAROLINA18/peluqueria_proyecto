import { describe, expect, it } from 'vitest';
import { businessDateToday, money, normalize, parseBusinessDate } from './domain.js';

describe('domain rules', () => {
  it('normalizes catalog values consistently', () => expect(normalize('  Manicura   BIAB ')).toBe('manicura biab'));
  it('keeps money exact to two decimals', () => expect(money('19.90').add(money('0.10')).toFixed(2)).toBe('20.00'));
  it('rejects non-positive money', () => expect(() => money('0')).toThrow());
  it('rejects more than two decimals', () => expect(() => money('10.001')).toThrow());
  it('parses valid business dates', () => expect(parseBusinessDate('2026-07-14').toISOString().slice(0, 10)).toBe('2026-07-14'));
  it('rejects impossible dates', () => expect(() => parseBusinessDate('2026-02-30')).toThrow());
  it('returns today in ISO shape for Brussels', () => expect(businessDateToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/));
});
