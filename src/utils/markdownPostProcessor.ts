import { AdminMetadata, ConversionOptions } from '../types';

/**
 * Builds the standardized Vietnamese Administrative Document Header
 * According to Decree 30/2020/NĐ-CP:
 * - Khung bên trái 2 dòng:
 *   - Dòng 1: Cơ quan quản lý cấp trên (parentAgency)
 *   - Dòng 2: Cơ quan ban hành văn bản (issuingAgency)
 *   - Dưới cùng: Số văn bản (Số: .../QĐ-UBND, Số: 4119/SKHCN-CNgSHTT)
 * - Khung bên phải:
 *   - Dòng 1: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
 *   - Dòng 2: Độc lập - Tự do - Hạnh phúc
 *   - Dòng 3: [Địa điểm], ngày ... tháng ... năm ...
 */
export function buildStandardizedAdminHeader(metadata?: AdminMetadata): string {
  if (!metadata) return '';

  const hasDocNumber = Boolean(metadata.documentNumber && metadata.documentNumber.trim());
  const hasAgencies = Boolean(metadata.issuingAgency || metadata.parentAgency);
  const hasDate = Boolean(metadata.issueDate && metadata.issueDate.trim());

  // Only generate administrative header if we have at least one significant administrative field
  if (!hasDocNumber && !hasAgencies && !hasDate) {
    return '';
  }

  // Khung bên trái (Left frame):
  // Dòng 1: Cơ quan quản lý cấp trên (nếu có)
  // Dòng 2: Cơ quan ban hành văn bản
  // Dưới cùng: Số văn bản
  const leftLines: string[] = [];
  if (metadata.parentAgency && metadata.parentAgency.trim()) {
    leftLines.push(`**${metadata.parentAgency.trim().toUpperCase()}**`);
  }
  if (metadata.issuingAgency && metadata.issuingAgency.trim()) {
    leftLines.push(`**${metadata.issuingAgency.trim().toUpperCase()}**`);
  }
  if (hasDocNumber) {
    // If user has docNumber, fill into Markdown
    leftLines.push(`Số: ${metadata.documentNumber!.trim()}`);
  }

  // If left column has no agency, provide placeholder or keep empty
  if (leftLines.length === 0 && (hasDocNumber || hasDate)) {
    leftLines.push('**VĂN BẢN HÀNH CHÍNH**');
  }

  // Khung bên phải (Right frame):
  // CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
  // Độc lập - Tự do - Hạnh phúc
  // Địa điểm, ngày ... tháng ... năm ...
  const rightLines: string[] = [
    '**CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM**',
    '**Độc lập - Tự do - Hạnh phúc**'
  ];

  if (hasDate) {
    // Standardize to: "[Địa điểm], ngày DD tháng MM năm YYYY"
    const dateParts = metadata.issueDate!.trim().split(/[\/\-\.]/);
    let dateStr = metadata.issueDate!.trim();
    if (dateParts.length === 3) {
      const day = dateParts[0].padStart(2, '0');
      const month = dateParts[1].padStart(2, '0');
      const year = dateParts[2];
      dateStr = `ngày ${day} tháng ${month} năm ${year}`;
    }
    const locPrefix = metadata.location && metadata.location.trim() ? `${metadata.location.trim()}, ` : '';
    rightLines.push(`*${locPrefix}${dateStr}*`);
  }

  const leftCol = leftLines.join('<br>');
  const rightCol = rightLines.join('<br>');

  return `| ${leftCol} | ${rightCol} |\n| :--- | :--- |\n\n`;
}

/**
 * Strips duplicate or garbled raw header lines from the top of the body text
 * (national motto, raw un-parsed agency fragments, standalone "Số: ...")
 * so the newly injected standardized header sits cleanly without text duplication.
 */
export function stripRawHeaderDuplicates(content: string): string {
  // Check if content begins with page marker <!-- PAGE_1 -->
  const pageMatch = content.match(/^<!--\s*PAGE_1\s*-->\s*/i);
  let prefix = '';
  let rest = content;

  if (pageMatch) {
    prefix = pageMatch[0];
    rest = content.substring(pageMatch[0].length);
  }

  const lines = rest.split('\n');
  let cutIndex = 0;
  let encounteredHeaderLines = 0;

  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if we hit the actual document subject/body
    if (/^(?:#{1,3}\s+)?(?:QUYẾT ĐỊNH|THÔNG BÁO|KẾ HOẠCH|BÁO CÁO|CHỈ THỊ|TỜ TRÌNH|NGHỊ QUYẾT|KẾT LUẬN|LỆNH|ĐIỀU LỆ)/i.test(line) ||
        /^(?:#{1,3}\s+)?(?:V\/v|Về việc|Kính gửi|KÍNH GỬI|Căn cứ|Điều\s+\d+)/i.test(line)) {
      cutIndex = i;
      break;
    }

    // Check if line matches national motto or administrative header items
    const isMotto = /CỘNG\s*H[OÒ][AÀ]\s*X[AÃ]\s*H[OỘ]I\s*CH[UỦ]\s*NGH[IĨ]A|Đ[OỘ]C\s*L[AẬ]P\s*[-–—]\s*T[UỰ]\s*DO/i.test(line);
    const isDocNumberLine = /^(?:Số|So|SỐ|No\.?)[:;\s]/i.test(line) || /^\d{1,6}\s*\/\s*[A-Za-zĐđ]/i.test(line);
    const isDateLine = /(?:ngày|ngay)\s+\d{1,2}\s+(?:tháng|thang)/i.test(line) || /(?:ngày|ngay)\s+\d{1,2}[\/\-\.]\d{1,2}/i.test(line);
    const isAgencyLine = /^(?:UBND|ỦY BAN|HỘI ĐỒNG|CHÍNH PHỦ|BỘ\s+|SỞ\s+|CHI CỤC|BAN\s+|PHÒNG\s+|VĂN PHÒNG|TỈNH|THÀNH PHỐ)/i.test(line);

    if (isMotto || isDocNumberLine || isDateLine || isAgencyLine) {
      encounteredHeaderLines++;
    } else if (encounteredHeaderLines > 0 && line.length < 50 && /^[A-ZĐÀ-ỹ0-9\s.,\-_]+$/.test(line)) {
      // Short uppercase text in the header zone before the subject
      encounteredHeaderLines++;
    }
  }

  if (cutIndex > 0 && encounteredHeaderLines > 0) {
    const remainingBody = lines.slice(cutIndex).join('\n').trim();
    return `${prefix}${remainingBody}`;
  }

  return content;
}

/**
 * Post-processes extracted text/markdown into clean, AI-optimized Markdown
 * Incorporates the standardized administrative header with:
 * - Khung bên trái (cơ quan cấp trên, cơ quan ban hành, số văn bản)
 * - Khung bên phải (quốc hiệu, tiêu ngữ, ngày tháng ban hành)
 */
export function formatDocumentToMarkdown(
  rawContent: string,
  fileName: string,
  _fileType: string,
  metadata: AdminMetadata,
  options: ConversionOptions,
  _totalPages?: number
): string {
  // 1. Clean and normalize body content
  let cleanedBody = rawContent;

  if (options.cleanOCRNoise) {
    cleanedBody = cleanOCRArtifacts(cleanedBody);
  }

  // Remove repeated running headers and footers across pages if enabled
  if (options.removeHeaderFooterRepeat) {
    cleanedBody = removeRecurringHeadersFooters(cleanedBody);
  }

  // 2. Build standardized Vietnamese Administrative Header if metadata is available
  const adminHeader = buildStandardizedAdminHeader(metadata);

  if (adminHeader) {
    // Strip duplicate raw header lines from the top of the body
    cleanedBody = stripRawHeaderDuplicates(cleanedBody);
  }

  // Normalize excessive blank lines
  cleanedBody = cleanedBody
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 3. Assemble final Markdown:
  // Title (# fileName), followed by standardized administrative header, then body
  if (options.addAIPromptHeader && fileName) {
    if (adminHeader) {
      return `# ${fileName}\n\n${adminHeader}${cleanedBody}`.trim();
    }
    return `# ${fileName}\n\n${cleanedBody}`.trim();
  }

  if (adminHeader) {
    return `${adminHeader}${cleanedBody}`.trim();
  }

  return cleanedBody;
}

/**
 * Remove common OCR artifacts and clean up text
 */
export function cleanOCRArtifacts(text: string): string {
  return text
    // Remove isolated single garbage characters
    .replace(/^[|~¬_—\-+=]{1,3}\s*$/gm, '')
    // Fix common OCR broken characters in Vietnamese
    .replace(/\b([0-9]+)\s*[\/]\s*([a-zA-ZÀ-ỹ]+)/g, '$1/$2')
    // Remove null bytes and unprintable chars (except normal whitespace)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Fix multiple spaces inside lines (except markdown table pipes)
    .split('\n')
    .map(line => {
      if (line.trim().startsWith('|')) return line; // keep table line spacing
      return line.replace(/[ \t]{2,}/g, ' ');
    })
    .join('\n');
}

/**
 * Detects and removes repeating header/footer text across multiple pages
 */
export function removeRecurringHeadersFooters(text: string): string {
  const pages = text.split(/(?=<!-- PAGE_\d+ -->|(?:\n--- Page \d+ ---\n))/);
  if (pages.length <= 1) return text;

  // Gather first lines and last lines from each page
  const pageHeaders: string[] = [];
  const pageFooters: string[] = [];

  for (const p of pages) {
    const lines = p.split('\n').map(l => l.trim()).filter(l => l.length > 5);
    if (lines.length > 0) {
      pageHeaders.push(lines[0]);
      pageFooters.push(lines[lines.length - 1]);
    }
  }

  // Find frequent repeating lines (> 50% frequency)
  const headerCounts = countFrequencies(pageHeaders);
  const footerCounts = countFrequencies(pageFooters);

  const repeatedHeaders = Object.keys(headerCounts).filter(k => headerCounts[k] >= Math.max(2, pages.length * 0.5));
  const repeatedFooters = Object.keys(footerCounts).filter(k => footerCounts[k] >= Math.max(2, pages.length * 0.5));

  // Strip those repeating lines
  let result = text;
  for (const h of repeatedHeaders) {
    result = result.split('\n').filter(line => line.trim() !== h).join('\n');
  }
  for (const f of repeatedFooters) {
    result = result.split('\n').filter(line => line.trim() !== f).join('\n');
  }

  return result;
}

function countFrequencies(arr: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of arr) {
    if (item.length > 4) {
      map[item] = (map[item] || 0) + 1;
    }
  }
  return map;
}
