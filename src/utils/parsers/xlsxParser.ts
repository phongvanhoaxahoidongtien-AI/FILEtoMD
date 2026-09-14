import * as XLSX from 'xlsx';
import { AdminMetadata } from '../../types';
import { extractVietnameseAdminMetadata } from '../vietnameseAdminExtractor';

export interface XLSXParseResult {
  markdown: string;
  metadata: AdminMetadata;
  totalSheets: number;
}

export async function parseXLSXDocument(file: File): Promise<XLSXParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error('File bảng tính không chứa trang tính (sheet) nào.');
  }

  const sections: string[] = [];
  let combinedText = '';

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    // Convert worksheet to raw 2D array
    const rawData: Array<Array<string | number | boolean | null>> = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: ''
    });

    if (rawData.length === 0) continue;

    sections.push(`### Bảng tính: ${sheetName}`);

    // Build Markdown Table
    const tableMarkdown = buildMarkdownTable(rawData);
    sections.push(tableMarkdown);

    // Combine text for metadata extraction
    const sheetText = rawData.slice(0, 15).map(row => row.join(' ')).join('\n');
    combinedText += '\n' + sheetText;
  }

  const metadata = extractVietnameseAdminMetadata(combinedText);

  return {
    markdown: sections.join('\n\n'),
    metadata,
    totalSheets: sheetNames.length
  };
}

function buildMarkdownTable(data: Array<Array<string | number | boolean | null>>): string {
  // Find maximum columns
  let maxCols = 0;
  for (const row of data) {
    if (row.length > maxCols) maxCols = row.length;
  }

  if (maxCols === 0) return '_Bảng tính trống_';

  // Find first non-empty row as header
  let headerIndex = 0;
  while (headerIndex < data.length && data[headerIndex].every(c => c === '' || c === null)) {
    headerIndex++;
  }

  if (headerIndex >= data.length) return '_Bảng tính trống_';

  const rows: string[] = [];

  // Header row
  const headerRow = data[headerIndex];
  const headerCells: string[] = [];
  for (let c = 0; c < maxCols; c++) {
    const val = headerRow && headerRow[c] !== undefined ? String(headerRow[c]).trim() : '';
    headerCells.push(val ? sanitizeTableCell(val) : `Cột ${c + 1}`);
  }
  rows.push(`| ${headerCells.join(' | ')} |`);
  rows.push(`| ${headerCells.map(() => '---').join(' | ')} |`);

  // Data rows
  for (let r = headerIndex + 1; r < data.length; r++) {
    const row = data[r];
    // Skip completely empty rows
    if (!row || row.every(cell => cell === '' || cell === null)) continue;

    const rowCells: string[] = [];
    for (let c = 0; c < maxCols; c++) {
      const val = row[c] !== undefined && row[c] !== null ? String(row[c]).trim() : '';
      rowCells.push(sanitizeTableCell(val));
    }
    rows.push(`| ${rowCells.join(' | ')} |`);
  }

  return rows.join('\n');
}

function sanitizeTableCell(str: string): string {
  return str.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br/>');
}
