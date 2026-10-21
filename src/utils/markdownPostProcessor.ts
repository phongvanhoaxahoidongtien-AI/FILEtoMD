import { AdminMetadata, ConversionOptions } from '../types';

/**
 * Builds the standardized Vietnamese Administrative Document Header
 * According to Decree 30/2020/NĐ-CP & User requirements:
 * 
 * - Khung bên trái (3 dòng):
 *   - Dòng 1: Cơ quan quản lý cấp trên (parentAgency) hoặc dòng trên
 *   - Dòng 2: Cơ quan ban hành văn bản (issuingAgency)
 *   - Dòng 3 (dòng thứ 3 bên trái): Số ký hiệu văn bản (Số: ... / ...)
 * 
 * - Khung bên phải (3 dòng):
 *   - Dòng 1: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
 *   - Dòng 2: Độc lập - Tự do - Hạnh phúc
 *   - Dòng 3 (dòng thứ 3 bên phải): Địa danh, ngày ... tháng ... năm ... (ngay sau dòng 1 và 2)
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

  // =========================================================================
  // Khung bên trái (3 dòng chuẩn xác):
  // Dòng 1: Cơ quan quản lý cấp trên
  // Dòng 2: Cơ quan ban hành văn bản
  // Dòng 3: Số ký hiệu văn bản (Dòng thứ 3 bên trái)
  // =========================================================================
  const leftLines: string[] = [];

  const parent = metadata.parentAgency?.trim().toUpperCase();
  const issuing = metadata.issuingAgency?.trim().toUpperCase();

  if (parent && issuing) {
    // Both agencies available:
    leftLines.push(`**${parent}**`);
    leftLines.push(`**${issuing}**`);
  } else if (issuing) {
    // Only issuing agency available -> line 1 is non-breaking space &nbsp; to keep Số on line 3
    leftLines.push('&nbsp;');
    leftLines.push(`**${issuing}**`);
  } else if (parent) {
    leftLines.push('&nbsp;');
    leftLines.push(`**${parent}**`);
  } else {
    // No agency detected
    leftLines.push('&nbsp;');
    leftLines.push('**CƠ QUAN BAN HÀNH**');
  }

  // Dòng 3 bên trái: Số ký hiệu (ngang hàng dòng thứ 3 tiêu đề quốc ngữ)
  if (hasDocNumber) {
    const cleanNum = metadata.documentNumber!.trim().replace(/^(?:Số|So|SỐ|SO)\s*[:;\s\-]*\s*/i, '');
    leftLines.push(`Số: ${cleanNum}`);
  } else {
    // Mặc định để trống cách nhau, không sử dụng dấu .....
    leftLines.push('Số: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
  }

  // =========================================================================
  // Khung bên phải (3 dòng chuẩn xác):
  // Dòng 1: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
  // Dòng 2: Độc lập - Tự do - Hạnh phúc
  // Dòng 3: [Địa danh], ngày ... tháng ... năm ... (Dòng thứ 3 bên phải)
  // =========================================================================
  const rightLines: string[] = [
    '**CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM**',
    '**Độc lập - Tự do - Hạnh phúc**'
  ];

  if (hasDate) {
    // Format to: "[Địa danh], ngày DD tháng MM năm YYYY"
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
  } else {
    const locPrefix = metadata.location && metadata.location.trim() ? `${metadata.location.trim()}, ` : '';
    // Mặc định để trống cách nhau, không sử dụng dấu .....
    rightLines.push(`*${locPrefix}ngày &nbsp;&nbsp;&nbsp;&nbsp; tháng &nbsp;&nbsp;&nbsp;&nbsp; năm 20&nbsp;&nbsp;&nbsp;&nbsp;*`);
  }

  const leftCol = leftLines.join('<br>');
  const rightCol = rightLines.join('<br>');

  return `| ${leftCol} | ${rightCol} |\n| :--- | :--- |\n\n`;
}

/**
 * Post-processes extracted text into Markdown while:
 * 1. Generating standardized Vietnamese Administrative Header (Decree 30/2020)
 * 2. STRICTLY preserving the original content of the document verbatim:
 *    "Giữ nguyên tuyệt đối nội dung của văn bản, không tự động thêm bớt, điều chỉnh hay thay đổi vị trí của nội dung văn bản."
 */
export function formatDocumentToMarkdown(
  rawContent: string,
  fileName: string,
  _fileType: string,
  metadata: AdminMetadata,
  options: ConversionOptions,
  _totalPages?: number
): string {
  // STRICT PRESERVATION RULE:
  // Giữ nguyên tuyệt đối nội dung gốc của văn bản, không xóa, cắt bớt hay hoán đổi vị trí của văn bản.
  const originalContent = rawContent;

  // 1. Build standardized Vietnamese Administrative Header if metadata is available
  const adminHeader = buildStandardizedAdminHeader(metadata);

  // 2. Assemble final Markdown
  if (options.addAIPromptHeader && fileName) {
    if (adminHeader) {
      return `# ${fileName}\n\n${adminHeader}${originalContent}`.trim();
    }
    return `# ${fileName}\n\n${originalContent}`.trim();
  }

  if (adminHeader) {
    return `${adminHeader}${originalContent}`.trim();
  }

  return originalContent;
}

/**
 * Remove common OCR artifacts without deleting substantive text lines
 */
export function cleanOCRArtifacts(text: string): string {
  return text
    // Fix common OCR broken characters in Vietnamese slashes
    .replace(/\b([0-9]+)\s*[\/]\s*([a-zA-ZÀ-ỹ]+)/g, '$1/$2')
    // Remove null bytes and unprintable control chars
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}
