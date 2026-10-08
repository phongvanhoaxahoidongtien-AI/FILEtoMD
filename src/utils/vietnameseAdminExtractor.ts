import { AdminMetadata } from '../types';

/**
 * Vietnamese Administrative Document Regex & Heuristic Engine
 * Based on Vietnamese National Standards for Administrative Drafting (Decree 30/2020/NĐ-CP)
 */

// Regex patterns for Decision & Administrative Document Numbers (Số văn bản & Số quyết định)
export const DOC_NUMBER_PATTERNS = [
  // 1. Explicit prefix with Decision Number priority:
  // Số: 123/QĐ-UBND, Số: 1624/QĐ-TTg, Số: 25/2024/QĐ-UBND, Số: 45/QĐ-CTUBND, Số: 12/QD-UBND
  /(?:^|[\n\r]|[^a-zA-Z0-9_đĐà-ỹ])(?:Số|So|SỐ|SO|Sô|Số|Số|S0|No\.?|Số\s*\/\s*No\.?)\s*[:;.\s\-]*\s*([0-9]{1,6}(?:\/[0-9]{2,4})?\s*\/\s*(?:QĐ|QD)[A-Za-zĐđ0-9_.\-]*(?:\s*[-–—/]\s*[A-Za-zĐđ0-9_.\-]+)*)/i,

  // 2. Primary format with explicit "Số:" prefix and administrative abbreviations:
  // Số: 4119/SKHCN-CNgSHTT, Số: 12/2024/NĐ-CP, Số: 45/TB-UBND, Số: 78/BC-STNMT
  /(?:^|[\n\r]|[^a-zA-Z0-9_đĐà-ỹ])(?:Số|So|SỐ|SO|Sô|Số|Số|S0|No\.?|Số\s*\/\s*No\.?)\s*[:;.\s\-]*\s*([0-9]{1,6}(?:\/[0-9]{2,4})?\s*\/\s*[A-Za-zĐđ0-9_.\-]+(?:\s*[-–—/]\s*[A-Za-zĐđ0-9_.\-]+)*)/i,

  // 3. Standalone Decision Number in header zone without "Số:" prefix:
  // 123/QĐ-UBND, 1624/QĐ-TTg, 15/2024/QĐ-UBND, 45/QĐ-STNMT, 12/QD-UBND
  /(?:^|[\s,;:(])([0-9]{1,6}(?:\/[0-9]{2,4})?\s*\/\s*(?:QĐ|QD)(?:[-–—/]\s*[A-Za-zĐđ0-9_.\-]+)+)(?:[\s,;.)]|$)/i,

  // 4. Standalone document number patterns with standard administrative abbreviations:
  /(?:^|[\s,;:(])([0-9]{1,6}(?:\/[0-9]{4})?\s*\/\s*(?:QĐ|QD|NĐ-CP|ND-CP|TTg|TT|TB|BC|KH|NQ|CT|KL|HD|TTr|CV|NQ-HĐND|UBND|SKHCN|STNMT|SNV|STC|SKHĐT|SNNPTNT|BCT|BCA|BQP|BYT|BGDĐT|BTTTT|VPCP|VP-UBND|TTr-[\w]+|BC-[\w]+|TB-[\w]+|QĐ-[\w]+)[A-Za-zĐđ0-9_.\-]*)(?:[\s,;.)]|$)/i,

  // 5. General fallback: Number / Acronym-SubAcronym, e.g. 4119/SKHCN-CNgSHTT
  /(?:^|[\s,;:(])([0-9]{1,6}\s*\/\s*[A-Za-zĐđ]{2,12}(?:\s*[-–—]\s*[A-Za-zĐđ0-9]{2,12})+)(?:[\s,;.)]|$)/
];

// Regex for Dates in Vietnamese administrative texts
// Handles standard "ngày ... tháng ... năm ...", variations with spacing, dots, dashes, and location prefix
export const DATE_PATTERNS = [
  // Location + Standard Vietnamese date: "Thanh Hóa, ngày 07 tháng 9 năm 2026", "..., ngày 14 tháng 09 năm 2026"
  /(?:(?:[A-ZĐÀ-ỹ][\w\s.,'-]+?),\s*)?(?:ngày|ngay|ngầy|ngảy|ngáy)\s*([0-3]?[0-9])\s*(?:tháng|thang|thâng|thảng|thanǵ|thangr|\/|-|\.)\s*([0-1]?[0-9])\s*(?:năm|nam|nâm|nam̃|\/|-|\.)\s*([12][0-9]{3})/i,

  // With relaxed spacing (e.g. "ngày   tháng   năm" or "ngày  07  tháng  09  năm  2026")
  /(?:ngày|ngay)\s+([0-3]?[0-9])\s+(?:tháng|thang)\s+([0-1]?[0-9])\s+(?:năm|nam)\s+([12][0-9]{3})/i,

  // Numerical format: "ngày 07/09/2026", "ngày: 07-09-2026", "07/09/2026"
  /(?:ngày|ngay)\s*[:\s]?\s*([0-3]?[0-9])[\/\-\.]([0-1]?[0-9])[\/\-\.]([12][0-9]{3})/i,
  /(?:^|[\s,;:(])([0-3]?[0-9])[\/\-\.]([0-1]?[0-9])[\/\-\.]([12][0-9]{3})(?:[\s,;.)]|$)/
];

// Location regex: e.g. "Thanh Hóa, ngày...", "Hà Nội, ngày...", "TP. Hồ Chí Minh, ngày..."
export const LOCATION_PATTERN = /([A-ZĐÀ-ỹ][\w\s.,'-]{1,40}?),\s*(?:ngày|ngay|ngầy)/i;

// Regex for Subject (V/v... or Về việc...)
export const SUBJECT_PATTERNS = [
  /(?:V\/v|V\/V|Về việc|Ve viec|V\/v:|Về việc:)\s*([^\n\r]{6,250})/i,
  /(?:Trích yếu|Trich yeu|Nội dung|Noi dung)\s*[:]\s*([^\n\r]{6,250})/i,
];

// Keywords for identifying Administrative Agencies
const AGENCY_KEYWORDS = [
  'ỦY BAN NHÂN DÂN', 'UY BAN NHAN DAN', 'UBND',
  'HỘI ĐỒNG NHÂN DÂN', 'HOI DONG NHAN DAN', 'HĐND',
  'CHÍNH PHỦ', 'CHINH PHU', 'THỦ TƯỚNG CHÍNH PHỦ', 'THU TUONG CHINH PHU',
  'VĂN PHÒNG CHÍNH PHỦ', 'VAN PHONG CHINH PHU', 'VPCP',
  'BỘ ', 'BO ', 'TỔNG CỤC', 'TONG CUC', 'CỤC ', 'CUC ',
  'SỞ ', 'SO ', 'CHI CỤC', 'CHI CUC', 'TRUNG TÂM', 'TRUNG TAM',
  'THANH TRA', 'VIỆN KIỂM SÁT', 'TÒA ÁN',
  'BAN QUẢN LÝ', 'BAN CHỈ ĐẠO', 'BAN CHẤP HÀNH',
  'ĐẢNG BỘ', 'ĐẢNG ỦY', 'TỈNH ỦY', 'THÀNH ỦY', 'HUYỆN ỦY',
  'CÔNG TY', 'TỔNG CÔNG TY', 'TẬP ĐOÀN', 'TRƯỜNG ĐẠI HỌC', 'HỌC VIỆN'
];

// Subordinate agency identifiers (e.g. Sở, Chi cục, Ban) vs Governing body (UBND Tỉnh, Bộ)
const SUBORDINATE_AGENCY_KEYWORDS = [
  'SỞ ', 'SO ', 'CHI CỤC', 'CHI CUC', 'PHÒNG ', 'PHONG ', 'TRUNG TÂM', 'TRUNG TAM', 'BAN '
];

// Noise phrases to strip or reject
const NATIONAL_MOTTO_PATTERNS = [
  /CỘNG\s*H[OÒ][AÀ]\s*X[AÃ]\s*H[OỘ]I\s*CH[UỦ]\s*NGH[IĨ]A\s*VI[EỆ]T\s*NAM/i,
  /CONG\s*HOA\s*XA\s*HOI\s*CHU\s*NGHIA\s*VIET\s*NAM/i,
  /Đ[OỘ]C\s*L[AẬ]P\s*[-–—]\s*T[UỰ]\s*DO\s*[-–—]\s*H[AẠ]NH\s*PH[UÚ]C/i,
  /DOC\s*LAP\s*[-–—]\s*TU\s*DO\s*[-–—]\s*HANH\s*PHUC/i,
];

// Clean national motto strings that might get appended to an agency
export function cleanNationalMotto(text: string): string {
  let cleaned = text;
  for (const pattern of NATIONAL_MOTTO_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned
    .replace(/^[\s_~*–—\-.:;]+/, '')
    .replace(/[\s_~*–—\-.:;]+$/, '')
    .trim();
}

/**
 * Cleans and standardizes agency names (stripping OCR artifacts, bullets, leading symbols)
 */
export function cleanAgencyName(text: string): string {
  let cleaned = cleanNationalMotto(text);
  cleaned = cleaned
    .replace(/^[\s_~*–—\-.:;|#]+/, '')
    .replace(/[\s_~*–—\-.:;|#]+$/, '')
    .trim();
  return cleaned;
}

/**
 * Validates that a string looks like a legitimate administrative document number
 */
export function isValidDocNumber(num: string): boolean {
  if (!num || num.length < 3 || num.length > 50) return false;
  // Must contain a slash
  if (!num.includes('/')) return false;
  // Must start with digits
  if (!/^\d/.test(num.trim())) return false;
  // Must contain letters (e.g. QĐ, SKHCN, NĐ-CP)
  if (!/[A-Za-zĐđ]/.test(num)) return false;
  // Do not accept partial matches ending with dangling hyphen or slash
  if (/[-–—/]$/.test(num.trim())) return false;
  return true;
}

/**
 * Normalizes document number (fixing OCR character confusion and abnormal spacing)
 */
export function normalizeDocNumber(rawNum: string): string {
  let cleaned = rawNum.trim()
    .replace(/[.,;:\s]+$/, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*[-–—]\s*/g, '-')
    .replace(/\s+/g, ' ');

  // Standardize QĐ (Decision) where OCR might produce QD or QÐ
  cleaned = cleaned.replace(/\/QD-/i, '/QĐ-').replace(/\/QD([A-Z])/i, '/QĐ-$1');

  return cleaned;
}

/**
 * Pre-processes text lines: handles multiline "Số:" where the number is on the next line
 */
function mergeMultilineDocNumberLines(lines: string[]): string[] {
  const merged: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const current = lines[i].trim();
    // If current line is just "Số:" or "Số" or "No." without the number
    if (/^(?:Số|So|SỐ|SO|Sô|Số|Số|S0|No\.?|Số\s*\/\s*No\.?)[:;.\s\-]*$/i.test(current) && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (/^\d{1,6}/.test(nextLine) && nextLine.includes('/')) {
        merged.push(`Số: ${nextLine}`);
        i++; // skip next line as it was merged
        continue;
      }
    }
    merged.push(current);
  }
  return merged;
}

/**
 * Extract Vietnamese Administrative Document Metadata with column awareness
 * Khung bên trái 2 dòng:
 * - Dòng trên: Cơ quan quản lý cấp trên (parentAgency)
 * - Dòng dưới: Cơ quan ban hành văn bản (issuingAgency)
 * - Dưới đó: Số văn bản (documentNumber)
 * Khung bên phải:
 * - Quốc hiệu: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
 * - Tiêu ngữ: Độc lập - Tự do - Hạnh phúc
 * - Địa điểm, ngày/tháng/năm (location, issueDate)
 */
export function extractFromTwoColumns(
  leftText: string,
  rightText: string,
  bodyText?: string
): AdminMetadata {
  const result: AdminMetadata = {
    confidenceScore: 0,
    extractedFromZone: 'column-layout'
  };

  const combinedHeader = `${leftText}\n${rightText}`;

  // 1. EXTRACT DOCUMENT NUMBER (Số văn bản)
  // Priority: Search left column first (official standard Decree 30/2020)
  const rawLeftLines = leftText.split(/[\r\n]+/).map(l => cleanNationalMotto(l)).filter(l => l.length > 0);
  const leftLines = mergeMultilineDocNumberLines(rawLeftLines);
  const processedLeftText = leftLines.join('\n');

  let docNumber: string | undefined;

  // Primary: Check patterns against processed leftText
  for (const pattern of DOC_NUMBER_PATTERNS) {
    const match = processedLeftText.match(pattern);
    if (match && match[1]) {
      const normalized = normalizeDocNumber(match[1]);
      if (isValidDocNumber(normalized)) {
        docNumber = normalized;
        const isDecision = /QĐ|QD/i.test(docNumber);
        result.confidenceScore = (result.confidenceScore || 0) + (isDecision ? 55 : 45);
        break;
      }
    }
  }

  // Fallback 1: Line-by-line inspection in left column
  if (!docNumber) {
    for (const line of leftLines) {
      if (/\//.test(line) && /\d/.test(line)) {
        for (const pattern of DOC_NUMBER_PATTERNS) {
          const match = line.match(pattern);
          if (match && match[1]) {
            const normalized = normalizeDocNumber(match[1]);
            if (isValidDocNumber(normalized)) {
              docNumber = normalized;
              result.confidenceScore = (result.confidenceScore || 0) + 40;
              break;
            }
          }
        }
        if (docNumber) break;
      }
    }
  }

  // Fallback 2: Check full combined header if not found in left column
  if (!docNumber) {
    const rawRightLines = rightText.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);
    const rightLines = mergeMultilineDocNumberLines(rawRightLines);
    const fullSearchText = `${processedLeftText}\n${rightLines.join('\n')}`;

    for (const pattern of DOC_NUMBER_PATTERNS) {
      const match = fullSearchText.match(pattern);
      if (match && match[1]) {
        const normalized = normalizeDocNumber(match[1]);
        if (isValidDocNumber(normalized)) {
          docNumber = normalized;
          result.confidenceScore = (result.confidenceScore || 0) + 35;
          break;
        }
      }
    }
  }

  result.documentNumber = docNumber;

  // 2. EXTRACT ISSUING AGENCY & PARENT AGENCY FROM LEFT COLUMN (Khung bên trái 2 dòng)
  // Dòng trên (dòng 1): Cơ quan quản lý cấp trên (parentAgency)
  // Dòng dưới (dòng 2): Cơ quan ban hành văn bản (issuingAgency)
  const agencyCandidates: string[] = [];

  for (const line of leftLines) {
    // Skip if line contains document number or "Số:"
    if (/^(?:Số|So|SỐ|SO|Sô|Số|No\.?)/i.test(line)) continue;
    if (docNumber && line.includes(docNumber)) continue;
    if (/^\d{1,6}\s*\//.test(line)) continue; // skip pure document number lines

    const cleanLine = cleanAgencyName(line);
    if (cleanLine.length >= 3 && cleanLine.length <= 90) {
      // Must not be motto or date or filler
      if (!NATIONAL_MOTTO_PATTERNS.some(p => p.test(cleanLine)) && !/(?:ngày|ngay)\s+\d/i.test(cleanLine)) {
        agencyCandidates.push(cleanLine);
      }
    }
  }

  if (agencyCandidates.length >= 2) {
    // 2 dòng rõ rệt theo đúng thể thức:
    // Dòng trên: Cơ quan quản lý cấp trên
    // Dòng dưới: Cơ quan ban hành văn bản
    result.parentAgency = agencyCandidates[0];
    result.issuingAgency = agencyCandidates[1];
    result.confidenceScore = (result.confidenceScore || 0) + 30;
  } else if (agencyCandidates.length === 1) {
    result.issuingAgency = agencyCandidates[0];
    result.confidenceScore = (result.confidenceScore || 0) + 20;
  }

  // 3. EXTRACT LOCATION AND DATE FROM RIGHT COLUMN (Khung bên phải)
  const rightLines = rightText
    .split(/[\r\n]+/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let location: string | undefined;
  let issueDate: string | undefined;

  const dateSearchLines = [...rightLines, ...leftLines];

  for (const line of dateSearchLines) {
    // Find location
    if (!location) {
      const locMatch = line.match(LOCATION_PATTERN);
      if (locMatch && locMatch[1]) {
        const cleanLoc = locMatch[1].replace(/^[^\w\s]+/, '').replace(/[.,;:\s]+$/, '').trim();
        if (cleanLoc.length > 1 && cleanLoc.length < 35 && !NATIONAL_MOTTO_PATTERNS.some(p => p.test(cleanLoc))) {
          location = cleanLoc;
        }
      }
    }

    // Find date
    if (!issueDate) {
      for (const pattern of DATE_PATTERNS) {
        const match = line.match(pattern);
        if (match && match[1] && match[2] && match[3]) {
          const day = match[1].padStart(2, '0');
          const month = match[2].padStart(2, '0');
          const year = match[3];
          const dayNum = parseInt(day, 10);
          const monthNum = parseInt(month, 10);
          const yearNum = parseInt(year, 10);
          if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1975 && yearNum <= 2045) {
            issueDate = `${day}/${month}/${year}`;
            result.confidenceScore = (result.confidenceScore || 0) + 30;
            break;
          }
        }
      }
    }

    if (location && issueDate) break;
  }

  result.location = location;
  result.issueDate = issueDate;

  // 4. EXTRACT SUBJECT / TRÍCH YẾU FROM BODY OR REMAINING TEXT
  const combinedBody = (bodyText || '') + '\n' + combinedHeader;
  for (const pattern of SUBJECT_PATTERNS) {
    const match = combinedBody.match(pattern);
    if (match && match[1]) {
      result.titleSubject = match[1].trim().replace(/[.,;:\s]+$/, '');
      result.confidenceScore = (result.confidenceScore || 0) + 10;
      break;
    }
  }

  return result;
}

/**
 * Extract Vietnamese Administrative Document Metadata from general text
 * (splits merged two-column lines if necessary)
 */
export function extractVietnameseAdminMetadata(text: string, isHeaderOnly = false): AdminMetadata {
  if (!text || text.trim().length < 10) {
    return { confidenceScore: 0, extractedFromZone: isHeaderOnly ? 'header' : 'text-layer' };
  }

  const rawLines = text.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);
  const headerLines = isHeaderOnly ? rawLines : rawLines.slice(0, 35);

  const leftParts: string[] = [];
  const rightParts: string[] = [];
  const bodyParts: string[] = [];

  let inHeader = true;

  for (const line of headerLines) {
    const hasMotto = NATIONAL_MOTTO_PATTERNS.some(p => p.test(line));
    const hasDate = /(?:ngày|ngay)\s+\d{1,2}\s+(?:tháng|thang)\s+\d{1,2}\s+(?:năm|nam)\s+\d{4}/i.test(line) ||
                    /(?:ngày|ngay)\s+\d{1,2}[\/\-\.]\d{1,2}/i.test(line);

    // If line starts with "V/v", "Về việc" or major section titles, we reached the subject/body
    if (/^(?:V\/v|Về việc|QUYẾT ĐỊNH|THÔNG BÁO|KẾ HOẠCH|BÁO CÁO)/i.test(line)) {
      inHeader = false;
      bodyParts.push(line);
      continue;
    }

    if (!inHeader) {
      bodyParts.push(line);
      continue;
    }

    // If line has both columns merged (e.g. 3+ spaces or tab separating them)
    const columnSplit = line.split(/\s{3,}|\t/);
    if (columnSplit.length >= 2) {
      leftParts.push(cleanNationalMotto(columnSplit[0]));
      rightParts.push(columnSplit.slice(1).join(' '));
    } else if (hasMotto || hasDate) {
      let splitHandled = false;
      for (const pattern of NATIONAL_MOTTO_PATTERNS) {
        const matchIdx = line.search(pattern);
        if (matchIdx > 0) {
          leftParts.push(cleanNationalMotto(line.substring(0, matchIdx)));
          rightParts.push(line.substring(matchIdx));
          splitHandled = true;
          break;
        }
      }
      if (!splitHandled) {
        rightParts.push(line);
      }
    } else {
      leftParts.push(cleanNationalMotto(line));
    }
  }

  const result = extractFromTwoColumns(
    leftParts.join('\n'),
    rightParts.join('\n'),
    bodyParts.join('\n')
  );

  result.extractedFromZone = isHeaderOnly ? 'header' : 'text-layer';

  // Extract digital signature or signer title if present
  const signMatch = text.match(/(?:Ký bởi|Signed by|Ký điện tử bởi|Người ký)\s*[:]\s*([^\r\n]+)/i);
  if (signMatch && signMatch[1]) {
    result.signer = signMatch[1].trim();
  }

  return result;
}

/**
 * Crop the top header portions of a canvas for specialized OCR:
 * Returns separate left and right header canvases with adaptive contrast enhancement
 */
export function cropHeaderCanvasColumns(sourceCanvas: HTMLCanvasElement, headerRatio = 0.28): {
  leftCanvas: HTMLCanvasElement;
  rightCanvas: HTMLCanvasElement;
  fullHeaderCanvas: HTMLCanvasElement;
} {
  const headerHeight = Math.max(140, Math.floor(sourceCanvas.height * headerRatio));
  const fullWidth = sourceCanvas.width;
  const leftWidth = Math.floor(fullWidth * 0.55);
  const rightStartX = Math.floor(fullWidth * 0.42);
  const rightWidth = fullWidth - rightStartX;

  // Helper to create and enhance canvas for OCR
  const createSubCanvas = (sx: number, sy: number, sw: number, sh: number) => {
    const cvs = document.createElement('canvas');
    cvs.width = sw;
    cvs.height = sh;
    const ctx = cvs.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

      try {
        const imgData = ctx.getImageData(0, 0, sw, sh);
        const data = imgData.data;

        // Adaptive contrast enhancement while preserving Vietnamese accents
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          let enhanced = gray;
          if (gray < 175) {
            enhanced = Math.max(0, gray - 50); // darken text strokes
          } else {
            enhanced = Math.min(255, gray + 40); // whiten paper background
          }
          data[i] = enhanced;
          data[i + 1] = enhanced;
          data[i + 2] = enhanced;
        }
        ctx.putImageData(imgData, 0, 0);
      } catch {
        // ignore cross-origin security errors
      }
    }
    return cvs;
  };

  return {
    leftCanvas: createSubCanvas(0, 0, leftWidth, headerHeight),
    rightCanvas: createSubCanvas(rightStartX, 0, rightWidth, headerHeight),
    fullHeaderCanvas: createSubCanvas(0, 0, fullWidth, headerHeight)
  };
}

export function cropHeaderCanvas(sourceCanvas: HTMLCanvasElement, headerRatio = 0.28): HTMLCanvasElement {
  return cropHeaderCanvasColumns(sourceCanvas, headerRatio).fullHeaderCanvas;
}
