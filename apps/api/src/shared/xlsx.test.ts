import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { createXlsx } from './xlsx.js';

describe('createXlsx', () => {
  it('creates an analytical OOXML workbook with types, filters and document properties', async () => {
    const buffer = await createXlsx([{
      name: 'Ventas',
      rows: [['Fecha', 'Servicio', 'EUR'], [new Date('2026-07-15T00:00:00Z'), 'Facial & spa', 65.5]],
      headerRows: [0], freezeRows: 1, autoFilter: { headerRow: 0 }, dateColumns: [0], currencyColumns: [2],
    }], { title: 'Reporte de ventas', creator: 'Admin', company: 'Lina Quirama Beauty Salon', createdAt: new Date('2026-07-15T12:00:00Z') });
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file('xl/workbook.xml')).toBeTruthy();
    const sheet = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
    expect(sheet).toContain('Facial &amp; spa');
    expect(sheet).toContain('<v>65.5</v>');
    expect(sheet).toContain('<v>46218</v>');
    expect(sheet).toContain('<autoFilter ref="A1:C2"/>');
    const properties = await zip.file('docProps/core.xml')!.async('string');
    expect(properties).toContain('Reporte de ventas');
    expect(properties).toContain('Admin');
    const appProperties = await zip.file('docProps/app.xml')!.async('string');
    expect(appProperties).toContain('Lina Quirama Beauty Salon');
  });

  it('neutralizes formula injection in every user-controlled text cell', async () => {
    const buffer = await createXlsx([{ name: 'Servicios', rows: [['Servicio'], ['=HYPERLINK("bad")'], ['+SUM(1,1)'], ['-1+2'], ['@name']] }]);
    const zip = await JSZip.loadAsync(buffer);
    const sheet = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
    expect(sheet).toContain('&apos;=HYPERLINK(&quot;bad&quot;)');
    expect(sheet).toContain('&apos;+SUM(1,1)');
    expect(sheet).toContain('&apos;-1+2');
    expect(sheet).toContain('&apos;@name');
  });
});
