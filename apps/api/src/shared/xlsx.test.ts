import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { createXlsx } from './xlsx.js';

describe('createXlsx', () => {
  it('creates a valid OOXML workbook with escaped text and numeric cells', async () => {
    const buffer = await createXlsx([{ name: 'Ventas', rows: [['Servicio', 'EUR'], ['Facial & spa', 65.5]] }]);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file('xl/workbook.xml')).toBeTruthy();
    const sheet = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
    expect(sheet).toContain('Facial &amp; spa');
    expect(sheet).toContain('<v>65.5</v>');
  });
});
