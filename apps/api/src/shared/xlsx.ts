import JSZip from 'jszip';

export type XlsxScalar = string | number | Date | null | undefined;
export type XlsxCellStyle = 'title' | 'subtitle' | 'section' | 'header' | 'integer' | 'currency' | 'decimal' | 'date' | 'totalLabel' | 'totalCurrency';
export type XlsxValue = XlsxScalar | { value: XlsxScalar; style: XlsxCellStyle };
export type XlsxSheet = {
  name: string;
  rows: XlsxValue[][];
  headerRows?: number[];
  titleRows?: number[];
  sectionRows?: number[];
  totalRows?: number[];
  freezeRows?: number;
  autoFilter?: { headerRow: number; lastRow?: number; fromColumn?: number; toColumn?: number };
  currencyColumns?: number[];
  integerColumns?: number[];
  decimalColumns?: number[];
  dateColumns?: number[];
  merges?: string[];
};
export type XlsxOptions = { title?: string; creator?: string; company?: string; createdAt?: Date };

const styleIds: Record<XlsxCellStyle, number> = {
  title: 1, subtitle: 2, section: 3, header: 4, integer: 5, currency: 6, decimal: 7, date: 8, totalLabel: 9, totalCurrency: 10,
};

function xml(value: unknown) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function safeText(value: string) { return /^[=+\-@]/.test(value) ? `'${value}` : value; }

function columnName(index: number) {
  let result = '';
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) result = String.fromCharCode(65 + ((value - 1) % 26)) + result;
  return result;
}

function excelDate(value: Date) { return (Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) - Date.UTC(1899, 11, 30)) / 86_400_000; }

function unwrap(value: XlsxValue): { value: XlsxScalar; style?: XlsxCellStyle } {
  return typeof value === 'object' && value !== null && !(value instanceof Date) && 'value' in value ? value : { value };
}

function inferredStyle(sheet: XlsxSheet, row: number, column: number, value: XlsxScalar): XlsxCellStyle | undefined {
  if (sheet.titleRows?.includes(row)) return 'title';
  if (sheet.sectionRows?.includes(row)) return 'section';
  if (sheet.headerRows?.includes(row)) return 'header';
  if (sheet.totalRows?.includes(row)) return sheet.currencyColumns?.includes(column) ? 'totalCurrency' : 'totalLabel';
  if (value instanceof Date || sheet.dateColumns?.includes(column)) return 'date';
  if (sheet.currencyColumns?.includes(column)) return 'currency';
  if (sheet.integerColumns?.includes(column)) return 'integer';
  if (sheet.decimalColumns?.includes(column)) return 'decimal';
  return undefined;
}

function worksheet(sheet: XlsxSheet) {
  const columnCount = Math.max(1, ...sheet.rows.map((row) => row.length));
  const widths = Array.from({ length: columnCount }, (_, column) => Math.min(48, Math.max(11, ...sheet.rows.map((row) => String(unwrap(row[column]).value ?? '').length + 2))));
  const cols = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('');
  const rows = sheet.rows.map((row, rowIndex) => {
    const cells = row.map((rawValue, columnIndex) => {
      const cell = unwrap(rawValue);
      const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
      const style = cell.style ?? inferredStyle(sheet, rowIndex, columnIndex, cell.value);
      const styleAttribute = style ? ` s="${styleIds[style]}"` : '';
      if (cell.value instanceof Date) return `<c r="${ref}" s="${styleIds[cell.style ?? 'date']}"><v>${excelDate(cell.value)}</v></c>`;
      if (typeof cell.value === 'number' && Number.isFinite(cell.value)) return `<c r="${ref}"${styleAttribute}><v>${cell.value}</v></c>`;
      return `<c r="${ref}" t="inlineStr"${styleAttribute}><is><t xml:space="preserve">${xml(safeText(String(cell.value ?? '')))}</t></is></c>`;
    }).join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');
  const freezeRows = Math.max(0, sheet.freezeRows ?? 1);
  const pane = freezeRows ? `<pane ySplit="${freezeRows}" topLeftCell="A${freezeRows + 1}" activePane="bottomLeft" state="frozen"/>` : '';
  const filter = sheet.autoFilter ? `<autoFilter ref="${columnName(sheet.autoFilter.fromColumn ?? 0)}${sheet.autoFilter.headerRow + 1}:${columnName(sheet.autoFilter.toColumn ?? columnCount - 1)}${sheet.autoFilter.lastRow ?? Math.max(1, sheet.rows.length)}"/>` : '';
  const merges = sheet.merges?.length ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((ref) => `<mergeCell ref="${xml(ref)}"/>`).join('')}</mergeCells>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${columnName(columnCount - 1)}${Math.max(1, sheet.rows.length)}"/>
  <sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>
  <cols>${cols}</cols><sheetData>${rows}</sheetData>${filter}${merges}
</worksheet>`;
}

export async function createXlsx(sheets: XlsxSheet[], options: XlsxOptions = {}) {
  const zip = new JSZip();
  const createdAt = (options.createdAt ?? new Date()).toISOString();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`);
  zip.folder('_rels')!.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
  const docProps = zip.folder('docProps')!;
  docProps.file('core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(options.title ?? '')}</dc:title><dc:creator>${xml(options.creator ?? options.company ?? '')}</dc:creator><cp:lastModifiedBy>${xml(options.creator ?? options.company ?? '')}</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified></cp:coreProperties>`);
  docProps.file('app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>${xml(options.company ?? '')}</Application><Company>${xml(options.company ?? '')}</Company></Properties>`);
  zip.folder('xl')!.file('workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((sheet, index) => `<sheet name="${xml(sheet.name.slice(0, 31))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets></workbook>`);
  zip.folder('xl')!.folder('_rels')!.file('workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.folder('xl')!.file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3"><numFmt numFmtId="164" formatCode="€ #,##0.00"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd"/><numFmt numFmtId="166" formatCode="0.00"/></numFmts>
  <fonts count="5"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="16"/><name val="Aptos Display"/></font><font><b/><color rgb="FF5A3018"/><sz val="12"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><name val="Aptos"/></font></fonts>
  <fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF171411"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF5E8DF"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF7D421E"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFD8C9BE"/></bottom><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="11"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/><xf numFmtId="164" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyNumberFormat="1"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`);
  const worksheets = zip.folder('xl')!.folder('worksheets')!;
  sheets.forEach((sheet, index) => worksheets.file(`sheet${index + 1}.xml`, worksheet(sheet)));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
