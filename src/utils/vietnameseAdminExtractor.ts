import { AdminMetadata } from '../types';

/**
 * Vietnamese Administrative Document Regex & Heuristic Engine
 * Based on Vietnamese National Standards for Administrative Drafting (Decree 30/2020/NĐ-CP)
 * 
 * Header layout:
 * - Khung bên trái (3 dòng):
 *   - Dòng 1: Cơ quan quản lý cấp trên (parentAgency)
 *   - Dòng 2: Cơ quan ban hành văn bản (issuingAgency)
 *   - Dòng 3: Số ký hiệu văn bản (documentNumber: Số: .../...)
 * - Khung bên phải (3 dòng):
 *   - Dòng 1: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
 *   - Dòng 2: Độc lập - Tự do - Hạnh phúc
 *   - Dòng 3: Địa danh, ngày tháng năm ban hành (sau 2 dòng tiêu đề quốc ngữ)
 */

// Regex patterns for Decision & Administrative Document Numbers (Số ký hiệu văn bản)
export const DOC_NUMBER_PATTERNS = [
  // 1. Explicit prefix with Decision Number priority:
  // Số: 123/QĐ-UBND, Số: 1624/QĐ-TTg, Số: 25/2024/QĐ-UBND, Số: 45/QĐ-CTUBND, Số: 12/QD-UBND
  /(?:^|[\n\r]|[^a-zA-Z0-9_đĐà-ỹ])(?:Số|So|SỐ|SO|Sô|Số|S0|No\.?|Ký\s*hiệu|Số\s*ký\s*hiệu|Số\s*\/\s*No\.?)\s*[:;.\s\-]*\s*([0-9]{1,6}(?:\/[0-9]{2,4})?\s*\/\s*(?:QĐ|QD)[A-Za-zĐđ0-9_.\-&]*(?:\s*[-–—/]\s*[A-Za-zĐđ0-9_.\-&]+)*)/i,

  // 2. Primary format with explicit "Số:" prefix and administrative abbreviations:
  // Số: 4119/SKHCN-CNgSHTT, Số: 12/2024/NĐ-CP, Số: 45/TB-UBND, Số: 78/BC-STNMT, Số: 456/TTg
  /(?:^|[\n\r]|[^a-zA-Z0-9_đĐà-ỹ])(?:Số|So|SỐ|SO|Sô|Số|S0|No\.?|Ký\s*hiệu|Số\s*ký\s*hiệu|Số\s*\/\s*No\.?)\s*[:;.\s\-]*\s*([0-9]{1,6}(?:\/[0-9]{2,4})?\s*\/\s*[A-Za-zĐđ0-9_.\-&]+(?:\s*[-–—/]\s*[A-Za-zĐđ0-9_.\-&]+)*)/i,

  // 3. Standalone Decision Number in header zone without "Số:" prefix:
  // 123/QĐ-UBND, 1624/QĐ-TTg, 15/2024/QĐ-UBND, 45/QĐ-STNMT, 12/QD-UBND
  /(?:^|[\s,;:(])([0-9]{1,6}(?:\/[0-9]{2,4})?\s*\/\s*(?:QĐ|QD)(?:[-–—/]\s*[A-Za-zĐđ0-9_.\-&]+)+)(?:[\s,;.)]|$)/i,

  // 4. Standalone document number patterns with administrative abbreviations (Decree 30/2020 standard):
  // 4119/SKHCN-CNgSHTT, 12/2024/NĐ-CP, 456/TTg, 789/BC-STNMT, 15/KH-UBND
  /(?:^|[\s,;:(])([0-9]{1,6}(?:\/[0-9]{4})?\s*\/\s*(?:QĐ|QD|NĐ-CP|ND-CP|TTg|TT|TB|BC|KH|NQ|CT|KL|HD|TTr|CV|GM|NQ-HĐND|UBND|SKHCN|STNMT|SNV|STC|SKHĐT|SNNPTNT|BCT|BCA|BQP|BYT|BGDĐT|BTTTT|VPCP|VP-UBND|TTr-[\w]+|BC-[\w]+|TB-[\w]+|QĐ-[\w]+|KH-[\w]+|HD-[\w]+|GM-[\w]+)[A-Za-zĐđ0-9_.\-&]*)(?:[\s,;.)]|$)/i,

  // 5. General fallback: Number / Acronym-SubAcronym, e.g. 4119/SKHCN-CNgSHTT, 123/UBND-VX
  /(?:^|[\s,;:(])([0-9]{1,6}\s*\/\s*[A-Za-zĐđ0-9]{2,12}(?:\s*[-–—]\s*[A-Za-zĐđ0-9&]{2,14})+)(?:[\s,;.)]|$)/
];

// Regex for Dates in Vietnamese administrative texts
export const DATE_PATTERNS = [
  // Location + Standard Vietnamese date: "Thanh Hóa, ngày 07 tháng 9 năm 2026", "..., ngày 14 tháng 09 năm 2026"
  /(?:(?:[A-ZĐÀ-ỹ][\w\s.,'-]+?),\s*)?(?:ngày|ngay|ngầy|ngảy|ngáy)\s*([0-3]?[0-9])\s*(?:tháng|thang|thâng|thảng|thanǵ|thangr|\/|-|\.)\s*([0-1]?[0-9])\s*(?:năm|nam|nâm|nam̃|\/|-|\.)\s*([12][0-9]{3})/i,

  // With relaxed spacing (e.g. "ngày   tháng   năm" or "ngày  07  tháng  09  năm  2026")
  /(?:ngày|ngay)\s+([0-3]?[0-9])\s+(?:tháng|thang)\s+([0-1]?[0-9])\s+(?:năm|nam)\s+([12][0-9]{3})/i,

  // Digital signature date format: "Ngày ký: 07/09/2026", "Thời gian ký: 07/09/2026 14:30:00"
  /(?:Ngày\s*ký|Thời\s*gian\s*ký|Date|Signing\s*time)\s*[:;\s\-]*\s*([0-3]?[0-9])[\/\-\.]([0-1]?[0-9])[\/\-\.]([12][0-9]{3})/i,

  // Numerical format: "ngày 07/09/2026", "ngày: 07-09-2026", "07/09/2026"
  /(?:ngày|ngay)\s*[:\s]?\s*([0-3]?[0-9])[\/\-\.]([0-1]?[0-9])[\/\-\.]([12][0-9]{3})/i,
  /(?:^|[\s,;:(])([0-3]?[0-9])[\/\-\.]([0-1]?[0-9])[\/\-\.]([12][0-9]{3})(?:[\s,;.)]|$)/
];

// Location regex: e.g. "Thanh Hóa, ngày...", "Hà Nội, ngày...", "TP. Hồ Chí Minh, ngày..."
export const LOCATION_PATTERN = /([A-ZĐÀ-ỹ][\w\s.,'-]{1,40}?),\s*(?:ngày|ngay|ngầy|\d)/i;

// Regex for Subject (V/v... or Về việc...)
export const SUBJECT_PATTERNS = [
  /(?:V\/v|V\/V|Về việc|Ve viec|V\/v:|Về việc:)\s*([^\n\r]{6,250})/i,
  /(?:Trích yếu|Trich yeu|Nội dung|Noi dung)\s*[:]\s*([^\n\r]{6,250})/i,
];

// Noise phrases to strip or reject
export const NATIONAL_MOTTO_PATTERNS = [
  /CỘNG\s*H[OÒ][AÀ]\s*X[AÃ]\s*H[OỘ]I\s*CH[UỦ]\s*NGH[IĨ]A\s*VI[EỆ]T\s*NAM/i,
  /CONG\s*HOA\s*XA\s*HOI\s*CHU\s*NGHIA\s*VIET\s*NAM/i,
  /Đ[OỘ]C\s*L[AẬ]P\s*[-–—]\s*T[UỰ]\s*DO\s*[-–—]\s*H[AẠ]NH\s*PH[UÚ]C/i,
  /DOC\s*LAP\s*[-–—]\s*TU\s*DO\s*[-–—]\s*HANH\s*PHUC/i,
];

/**
 * Clean national motto strings that might get appended to an agency
 */
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
  // Must contain letters (e.g. QĐ, SKHCN, NĐ-CP, TTg)
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
    if (/^(?:Số|So|SỐ|SO|Sô|Số|S0|No\.?|Số\s*\/\s*No\.?)[:;.\s\-]*$/i.test(current) && i + 1 < lines.length) {
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
 * Extract Vietnamese Administrative Document Metadata with exact Decree 30/2020 specifications:
 * 
 * 1. Khung bên trái (3 dòng):
 *    - Dòng 1: Cơ quan quản lý cấp trên (parentAgency)
 *    - Dòng 2: Cơ quan ban hành văn bản (issuingAgency)
 *    - Dòng 3 (dòng thứ 3 bên trái): Số ký hiệu văn bản (documentNumber)
 * 
 * 2. Khung bên phải (3 dòng):
 *    - Dòng 1: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
 *    - Dòng 2: Độc lập - Tự do - Hạnh phúc
 *    - Dòng 3 (dòng thứ 3 bên phải): Địa danh, ngày tháng năm ban hành (ngay sau dòng 1 và 2)
 */
export function extractFromTwoColumns(
  leftText: string,
  rightText: string,
  bodyText?: string,
  digitalSignatures?: { signer?: string; signingDate?: string; docNumber?: string }
): AdminMetadata {
  const result: AdminMetadata = {
    confidenceScore: 0,
    extractedFromZone: 'column-layout'
  };

  // Pre-process left column lines (filter empty & decorative divider lines)
  const rawLeftLines = leftText
    .split(/[\r\n]+/)
    .map(l => cleanNationalMotto(l).trim())
    .filter(l => l.length > 0 && !/^[-–—_.*~=]{2,}$/.test(l));
  const leftLines = mergeMultilineDocNumberLines(rawLeftLines);

  // Pre-process right column lines
  const rightLines = rightText
    .split(/[\r\n]+/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !/^[-–—_.*~=]{2,}$/.test(l));

  // =========================================================================
  // 1. EXTRACT SỐ KÝ HIỆU VĂN BẢN (DÒNG THỨ 3 BÊN TRÁI)
  // =========================================================================
  let docNumber: string | undefined;

  // PRIORITY 1A: Inspect Line 3 (index 2) of Left Column specifically
  if (leftLines.length >= 3) {
    const line3 = leftLines[2];
    for (const pattern of DOC_NUMBER_PATTERNS) {
      const match = line3.match(pattern);
      if (match && match[1]) {
        const normalized = normalizeDocNumber(match[1]);
        if (isValidDocNumber(normalized)) {
          docNumber = normalized;
          result.confidenceScore = (result.confidenceScore || 0) + 60;
          break;
        }
      }
    }
    // Direct check if line3 looks like a document number without strict prefix
    if (!docNumber && /\//.test(line3) && /^\d/.test(line3.replace(/^(?:Số|So|SỐ|No\.?)\s*[:;\s\-]*\s*/i, ''))) {
      const cleanNum = line3.replace(/^(?:Số|So|SỐ|No\.?)\s*[:;\s\-]*\s*/i, '').trim();
      const normalized = normalizeDocNumber(cleanNum);
      if (isValidDocNumber(normalized)) {
        docNumber = normalized;
        result.confidenceScore = (result.confidenceScore || 0) + 55;
      }
    }
  }

  // PRIORITY 1B: Check all lines in the left column
  if (!docNumber) {
    for (let i = 0; i < leftLines.length; i++) {
      const line = leftLines[i];
      for (const pattern of DOC_NUMBER_PATTERNS) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const normalized = normalizeDocNumber(match[1]);
          if (isValidDocNumber(normalized)) {
            docNumber = normalized;
            result.confidenceScore = (result.confidenceScore || 0) + 50;
            break;
          }
        }
      }
      if (docNumber) break;
    }
  }

  // PRIORITY 1C: Check if digital signature metadata contains document number
  if (!docNumber && digitalSignatures?.docNumber) {
    const normalized = normalizeDocNumber(digitalSignatures.docNumber);
    if (isValidDocNumber(normalized)) {
      docNumber = normalized;
      result.confidenceScore = (result.confidenceScore || 0) + 45;
    }
  }

  // PRIORITY 1D: Full combined header fallback
  if (!docNumber) {
    const combinedHeader = `${leftLines.join('\n')}\n${rightLines.join('\n')}`;
    for (const pattern of DOC_NUMBER_PATTERNS) {
      const match = combinedHeader.match(pattern);
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

  // =========================================================================
  // 2. EXTRACT CƠ QUAN QUẢN LÝ CẤP TRÊN & CƠ QUAN BAN HÀNH (KHUNG BÊN TRÁI 2 DÒNG ĐẦU)
  // Dòng 1: Cơ quan quản lý cấp trên (parentAgency)
  // Dòng 2: Cơ quan ban hành văn bản (issuingAgency)
  // =========================================================================
  const agencyCandidates: string[] = [];

  for (let i = 0; i < leftLines.length; i++) {
    const line = leftLines[i];
    // Skip if line is the document number or contains "Số:"
    if (/^(?:Số|So|SỐ|SO|Sô|Số|No\.?|Ký\s*hiệu)/i.test(line)) continue;
    if (docNumber && line.includes(docNumber)) continue;
    if (/^\d{1,6}\s*\//.test(line)) continue;

    const cleanLine = cleanAgencyName(line);
    if (cleanLine.length >= 3 && cleanLine.length <= 90) {
      if (!NATIONAL_MOTTO_PATTERNS.some(p => p.test(cleanLine)) && !/(?:ngày|ngay)\s+\d/i.test(cleanLine)) {
        agencyCandidates.push(cleanLine);
      }
    }
  }

  if (agencyCandidates.length >= 2) {
    // Exactly 2 lines according to Vietnamese administrative drafting:
    // Dòng 1: Cơ quan quản lý cấp trên
    // Dòng 2: Cơ quan ban hành văn bản
    result.parentAgency = agencyCandidates[0];
    result.issuingAgency = agencyCandidates[1];
    result.confidenceScore = (result.confidenceScore || 0) + 30;
  } else if (agencyCandidates.length === 1) {
    const singleAgency = agencyCandidates[0];
    // Check if the single agency is a subordinate agency (Sở, Chi cục, Phòng, Ban)
    const isSubordinate = /^(?:SỞ|SO|CHI CỤC|CHI CUC|PHÒNG|PHONG|TRUNG TÂM|TRUNG TAM|BAN\s)/i.test(singleAgency);
    if (isSubordinate) {
      result.issuingAgency = singleAgency;
    } else {
      result.issuingAgency = singleAgency;
    }
    result.confidenceScore = (result.confidenceScore || 0) + 20;
  }

  // =========================================================================
  // 3. EXTRACT TIÊU ĐỀ QUỐC NGỮ & NGÀY THÁNG BAN HÀNH (DÒNG THỨ 3 BÊN PHẢI)
  // Khung bên phải:
  // Dòng 1: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
  // Dòng 2: Độc lập - Tự do - Hạnh phúc
  // Dòng 3 (dòng thứ 3 bên phải): Địa danh, ngày tháng năm ban hành (ngay sau 2 dòng trên)
  // =========================================================================
  let location: string | undefined;
  let issueDate: string | undefined;

  // Find index of national motto lines in right column
  let mottoEndIndex = -1;
  for (let i = 0; i < rightLines.length; i++) {
    if (/Đ[OỘ]C\s*L[AẬ]P\s*[-–—]\s*T[UỰ]\s*DO\s*[-–—]\s*H[AẠ]NH\s*PH[UÚ]C/i.test(rightLines[i])) {
      mottoEndIndex = i;
      break;
    }
  }

  // PRIORITY 3A: Line 3 of Right Column (immediately following motto or index 2)
  const line3Candidates: string[] = [];
  if (mottoEndIndex >= 0 && mottoEndIndex + 1 < rightLines.length) {
    line3Candidates.push(rightLines[mottoEndIndex + 1]);
  }
  if (rightLines.length >= 3 && !line3Candidates.includes(rightLines[2])) {
    line3Candidates.push(rightLines[2]);
  }

  for (const line of line3Candidates) {
    // Extract location
    if (!location) {
      const locMatch = line.match(LOCATION_PATTERN);
      if (locMatch && locMatch[1]) {
        const cleanLoc = locMatch[1].replace(/^[^\w\s]+/, '').replace(/[.,;:\s]+$/, '').trim();
        if (cleanLoc.length > 1 && cleanLoc.length < 35 && !NATIONAL_MOTTO_PATTERNS.some(p => p.test(cleanLoc))) {
          location = cleanLoc;
        }
      }
    }

    // Extract date
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
            result.confidenceScore = (result.confidenceScore || 0) + 35;
            break;
          }
        }
      }
    }
  }

  // PRIORITY 3B: Search all right lines, then left lines
  const searchLinesForDate = [...rightLines, ...leftLines];
  for (const line of searchLinesForDate) {
    if (!location) {
      const locMatch = line.match(LOCATION_PATTERN);
      if (locMatch && locMatch[1]) {
        const cleanLoc = locMatch[1].replace(/^[^\w\s]+/, '').replace(/[.,;:\s]+$/, '').trim();
        if (cleanLoc.length > 1 && cleanLoc.length < 35 && !NATIONAL_MOTTO_PATTERNS.some(p => p.test(cleanLoc))) {
          location = cleanLoc;
        }
      }
    }

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
            result.confidenceScore = (result.confidenceScore || 0) + 25;
            break;
          }
        }
      }
    }

    if (location && issueDate) break;
  }

  // PRIORITY 3C: Digital signature date if header date is missing or partial
  if (!issueDate && digitalSignatures?.signingDate) {
    for (const pattern of DATE_PATTERNS) {
      const match = digitalSignatures.signingDate.match(pattern);
      if (match && match[1] && match[2] && match[3]) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        issueDate = `${day}/${month}/${year}`;
        result.confidenceScore = (result.confidenceScore || 0) + 25;
        break;
      }
    }
  }

  result.location = location;
  result.issueDate = issueDate;

  // PRIORITY 3D: Digital signature signer
  if (digitalSignatures?.signer) {
    result.signer = digitalSignatures.signer;
  }

  // =========================================================================
  // 4. EXTRACT SUBJECT / TRÍCH YẾU FROM BODY OR REMAINING TEXT
  // =========================================================================
  const combinedBody = (bodyText || '') + '\n' + leftLines.join('\n') + '\n' + rightLines.join('\n');
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
    if (/^(?:V\/v|Về việc|QUYẾT ĐỊNH|THÔNG BÁO|KẾ HOẠCH|BÁO CÁO|CHỈ THỊ|NGHỊ QUYẾT)/i.test(line)) {
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

  // Extract digital signature or signer title if present in text
  const signMatch = text.match(/(?:Ký bởi|Signed by|Ký điện tử bởi|Người ký|Cơ quan ký)\s*[:]\s*([^\r\n]+)/i);
  if (signMatch && signMatch[1]) {
    result.signer = signMatch[1].trim();
  }

  return result;
}

/**
 * Crop the top header portions of a canvas for specialized OCR:
 * Returns separate left and right header canvases with adaptive contrast enhancement
 */
export function cropHeaderCanvasColumns(sourceCanvas: HTMLCanvasElement, headerRatio = 0.30): {
  leftCanvas: HTMLCanvasElement;
  rightCanvas: HTMLCanvasElement;
  fullHeaderCanvas: HTMLCanvasElement;
} {
  const headerHeight = Math.max(160, Math.floor(sourceCanvas.height * headerRatio));
  const fullWidth = sourceCanvas.width;
  const leftWidth = Math.floor(fullWidth * 0.54);
  const rightStartX = Math.floor(fullWidth * 0.44);
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

export function cropHeaderCanvas(sourceCanvas: HTMLCanvasElement, headerRatio = 0.30): HTMLCanvasElement {
  return cropHeaderCanvasColumns(sourceCanvas, headerRatio).fullHeaderCanvas;
}
