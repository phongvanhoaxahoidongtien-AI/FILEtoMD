import { AdminMetadata } from '../types';

/**
 * Vietnamese Administrative Document Regex & Heuristic Engine
 * Based on Vietnamese National Standards for Administrative Drafting (Decree 30/2020/NĐ-CP)
 */

// Regex patterns for Document Numbers (Số văn bản)
const DOC_NUMBER_PATTERNS = [
  // Standard format with prefix: Số: 123/QĐ-UBND, Số: 12/2024/NĐ-CP, Số 45/TB-VP
  /(?:Số|So|SỐ|SO|Sô|Số|No\.?|Number)\s*[:;.\s]\s*([0-9]{1,6}(?:\/[0-9]{4})?\s*\/\s*[A-ZĐÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÊẾỀỂỄỆÔỐỒỔỖỘƠỚỜỞỠỢƯỨỪỬỮỰa-zđàáảãạăắằẳẵặâấầẩẫậêếềểễệôốồổỗộơớờởỡợưứừửữự0-9_.\-]+(?:\s*[-–—]\s*[A-ZĐÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÊẾỀỂỄỆÔỐỒỔỖỘƠỚỜỞỠỢƯỨỪỬỮỰa-zđàáảãạăắằẳẵặâấầẩẫậêếềểễệôốồổỗộơớờởỡợưứừửữự0-9_.\-]+)*)/i,
  // Standalone document numbers: e.g., 123/QĐ-UBND, 456/TTg, 789/BC-STNMT, 12/2024/NĐ-CP
  /\b([0-9]{1,6}(?:\/[0-9]{4})?\s*\/\s*(?:QĐ|NĐ-CP|TT|TTg|TB|BC|KH|NQ|CT|KL|HD|TTr|CV|QD|ND-CP|NQ-HĐND|QĐ-UBND|UBND|TTr-SNV|SNV|STC|SKHĐT|SNNPTNT|BCT|BCA|BQP|BYT|BGDĐT|BTTTT|VPCP|VP-UBND|TTr-[\w]+|BC-[\w]+|TB-[\w]+|QĐ-[\w]+)[A-ZĐ0-9_.\-]*)\b/i,
  // Fallback: Number with slash and common acronyms
  /\b([0-9]{1,5}\s*\/\s*[A-ZĐ]{2,10}(?:-[A-ZĐ0-9]{2,10})*)\b/
];

// Regex for Dates in Vietnamese administrative texts
const DATE_PATTERNS = [
  // Location + Date: "Hà Nội, ngày 14 tháng 9 năm 2026" or "..., ngày 05 tháng 09 năm 2025"
  /(?:(?:[A-ZĐÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÊẾỀỂỄỆÔỐỒỔỖỘƠỚỜỞỠỢƯỨỪỬỮỰ][\w\s.,'-]+?),\s*)?(?:ngày|ngay)\s+([0-3]?[0-9])\s+(?:tháng|thang)\s+([0-1]?[0-9])\s+(?:năm|nam)\s+([12][0-9]{3})/i,
  // Standard numerical: 14/09/2026 or 14-09-2026 or 14.09.2026
  /\b([0-3]?[0-9])[\/\-\.]([0-1]?[0-9])[\/\-\.]([12][0-9]{3})\b/,
  // Date in text: "ngày 14/09/2026"
  /(?:ngày|ngay)\s+([0-3]?[0-9])[\/\-\.]([0-1]?[0-9])[\/\-\.]([12][0-9]{3})/i,
];

// Location regex: "Hà Nội, ngày...", "TP. Hồ Chí Minh, ngày..."
const LOCATION_PATTERN = /([A-ZĐÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÊẾỀỂỄỆÔỐỒỔỖỘƠỚỜỞỠỢƯỨỪỬỮỰ][\w\s.,'-]{2,30}?),\s*(?:ngày|ngay)/i;

// Regex for Subject (V/v... or Về việc...)
const SUBJECT_PATTERNS = [
  /(?:V\/v|V\/V|Về việc|Ve viec|V\/v:|Về việc:)\s*([^\n\r]{10,250})/i,
  /(?:Trích yếu|Trich yeu|Nội dung|Noi dung)\s*[:]\s*([^\n\r]{10,250})/i,
];

// Keywords for Issuing Agencies
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

// Noise lines to ignore when finding agencies
const IGNORE_AGENCY_LINES = [
  'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
  'CONG HOA XA HOI CHU NGHIA VIET NAM',
  'ĐỘC LẬP - TỰ DO - HẠNH PHÚC',
  'DOC LAP - TU DO - HANH PHUC',
  'ĐỘC LẬP-TỰ DO-HẠNH PHÚC',
  'TIÊU CHUẨN', 'TRÍCH YẾU'
];

// Signer title patterns
const SIGNER_TITLE_PATTERNS = [
  /(?:TM\.\s*(?:ỦY BAN NHÂN DÂN|UBND|HĐND|CHÍNH PHỦ|BỘ|SỞ))\s*[\r\n]+\s*(?:CHỦ TỊCH|GIÁM ĐỐC|BỘ TRƯỞNG)/i,
  /(?:KT\.\s*(?:CHỦ TỊCH|BỘ TRƯỞNG|GIÁM ĐỐC))\s*[\r\n]+\s*(?:PHÓ CHỦ TỊCH|THỨ TRƯỞNG|PHÓ GIÁM ĐỐC)/i,
  /\b(CHỦ TỊCH|PHÓ CHỦ TỊCH|BỘ TRƯỞNG|THỨ TRƯỞNG|GIÁM ĐỐC|PHÓ GIÁM ĐỐC|CHÁNH VĂN PHÒNG|TỔNG GIÁM ĐỐC)\b/i
];

/**
 * Extract Vietnamese Administrative Document Metadata
 * @param text The full or header text extracted via OCR or PDF layer
 * @param isHeaderOnly Whether this text is specifically the top 20% header
 */
export function extractVietnameseAdminMetadata(text: string, isHeaderOnly = false): AdminMetadata {
  const result: AdminMetadata = {
    confidenceScore: 0,
    extractedFromZone: isHeaderOnly ? 'header' : 'text-layer'
  };

  if (!text || text.trim().length < 10) {
    return result;
  }

  // Pre-clean text lines
  const rawLines = text.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);
  // Focus on top 35 lines for header analysis
  const headerLines = isHeaderOnly ? rawLines : rawLines.slice(0, 35);
  const headerText = headerLines.join('\n');

  // 1. EXTRACT DOCUMENT NUMBER (Số văn bản)
  let docNumber: string | undefined;
  for (const pattern of DOC_NUMBER_PATTERNS) {
    const match = headerText.match(pattern);
    if (match && match[1]) {
      // Clean up matched document number
      let cleaned = match[1].trim();
      // Remove trailing punctuation or whitespace
      cleaned = cleaned.replace(/[.,;:\s]+$/, '');
      // Normalize slashes: "123 / QĐ" -> "123/QĐ"
      cleaned = cleaned.replace(/\s*\/\s*/g, '/');
      // Normalize hyphens: "QĐ - UBND" -> "QĐ-UBND"
      cleaned = cleaned.replace(/\s*[-–—]\s*/g, '-');
      // Normalize multiple spaces
      cleaned = cleaned.replace(/\s+/g, ' ');

      if (isValidDocNumber(cleaned)) {
        docNumber = cleaned;
        result.confidenceScore = (result.confidenceScore || 0) + 40;
        break;
      }
    }
  }

  // If not found in combined headerText, check line-by-line
  if (!docNumber) {
    for (const line of headerLines) {
      if (/Số|So|SỐ/i.test(line) && /\//.test(line)) {
        for (const pattern of DOC_NUMBER_PATTERNS) {
          const match = line.match(pattern);
          if (match && match[1]) {
            let cleaned = match[1].trim().replace(/[.,;:\s]+$/, '').replace(/\s*\/\s*/g, '/').replace(/\s*[-–—]\s*/g, '-');
            if (isValidDocNumber(cleaned)) {
              docNumber = cleaned;
              result.confidenceScore = (result.confidenceScore || 0) + 35;
              break;
            }
          }
        }
        if (docNumber) break;
      }
    }
  }

  result.documentNumber = docNumber;

  // 2. EXTRACT ISSUE DATE (Ngày tháng năm)
  let issueDate: string | undefined;
  let location: string | undefined;

  for (const line of headerLines) {
    // Check location first
    const locMatch = line.match(LOCATION_PATTERN);
    if (locMatch && locMatch[1]) {
      const locClean = locMatch[1].replace(/^[^\w\s]+/, '').trim();
      if (locClean.length > 2 && locClean.length < 35 && !/cộng hòa|độc lập/i.test(locClean)) {
        location = locClean;
      }
    }

    // Check full date
    for (const pattern of DATE_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        if (match[3] && match[2] && match[1]) {
          const day = match[1].padStart(2, '0');
          const month = match[2].padStart(2, '0');
          const year = match[3];
          // Validate sane dates
          const dayNum = parseInt(day, 10);
          const monthNum = parseInt(month, 10);
          const yearNum = parseInt(year, 10);
          if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1975 && yearNum <= 2040) {
            issueDate = `${day}/${month}/${year}`;
            result.confidenceScore = (result.confidenceScore || 0) + 30;
            break;
          }
        }
      }
    }
    if (issueDate) break;
  }

  result.issueDate = issueDate;
  result.location = location;

  // 3. EXTRACT ISSUING AGENCY (Cơ quan ban hành)
  let agencyCandidate: string | undefined;
  let parentAgencyCandidate: string | undefined;

  // Search in header lines (first 15 lines usually)
  const topHeaderLines = headerLines.slice(0, 15);
  for (let i = 0; i < topHeaderLines.length; i++) {
    const line = topHeaderLines[i].toUpperCase();
    
    // Ignore national motto lines
    if (IGNORE_AGENCY_LINES.some(skip => line.includes(skip))) {
      continue;
    }

    for (const kw of AGENCY_KEYWORDS) {
      if (line.includes(kw)) {
        const cleanAgency = topHeaderLines[i].replace(/[.,:;*_-]+$/, '').trim();
        if (cleanAgency.length >= 3 && cleanAgency.length <= 100) {
          if (!agencyCandidate) {
            agencyCandidate = cleanAgency;
            // Check if previous line was a governing body (e.g. UBND Tỉnh above Sở X)
            if (i > 0) {
              const prevLine = topHeaderLines[i - 1].trim();
              if (prevLine.length >= 3 && prevLine.length <= 80 && !IGNORE_AGENCY_LINES.some(s => prevLine.toUpperCase().includes(s))) {
                parentAgencyCandidate = prevLine;
              }
            }
          }
          break;
        }
      }
    }
    if (agencyCandidate) break;
  }

  // Fallback: If no agency keyword found, check line immediately above "Số: ..."
  if (!agencyCandidate && docNumber) {
    const docNumLineIndex = headerLines.findIndex(l => l.includes(docNumber!) || /Số|So/i.test(l));
    if (docNumLineIndex > 0) {
      const lineAbove = headerLines[docNumLineIndex - 1].trim();
      if (lineAbove.length > 3 && lineAbove.length < 80 && !IGNORE_AGENCY_LINES.some(s => lineAbove.toUpperCase().includes(s))) {
        agencyCandidate = lineAbove;
      }
    }
  }

  result.issuingAgency = agencyCandidate;
  result.parentAgency = parentAgencyCandidate;
  if (agencyCandidate) {
    result.confidenceScore = (result.confidenceScore || 0) + 20;
  }

  // 4. EXTRACT SUBJECT (Trích yếu / V/v)
  let titleSubject: string | undefined;
  for (const line of headerLines) {
    for (const pattern of SUBJECT_PATTERNS) {
      const match = line.match(pattern);
      if (match && match[1]) {
        titleSubject = match[1].trim().replace(/[.,;:\s]+$/, '');
        result.confidenceScore = (result.confidenceScore || 0) + 10;
        break;
      }
    }
    if (titleSubject) break;
  }

  result.titleSubject = titleSubject;

  // 5. EXTRACT SIGNER IF PRESENT
  for (const pattern of SIGNER_TITLE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      result.signer = match[0].replace(/[\r\n]+/g, ' - ').trim();
      break;
    }
  }

  // Check digital signature marks
  const digitalSignMatch = text.match(/(?:Ký bởi|Signed by|Ký điện tử bởi)\s*[:]\s*([^\r\n]+)/i);
  if (digitalSignMatch && digitalSignMatch[1]) {
    result.signer = result.signer ? `${result.signer} (${digitalSignMatch[1].trim()})` : digitalSignMatch[1].trim();
  }

  return result;
}

/**
 * Validate that a string looks like a legitimate administrative document number
 */
function isValidDocNumber(num: string): boolean {
  if (!num || num.length < 3 || num.length > 40) return false;
  // Must contain a slash or hyphen
  if (!num.includes('/') && !num.includes('-')) return false;
  // Must start with digits
  if (!/^\d/.test(num)) return false;
  // Should have some uppercase acronym characters
  if (!/[A-ZĐ]/.test(num)) return false;
  return true;
}

/**
 * Crop the top 20-25% header portion of a canvas for specialized OCR
 */
export function cropHeaderCanvas(sourceCanvas: HTMLCanvasElement, headerRatio = 0.22): HTMLCanvasElement {
  const headerCanvas = document.createElement('canvas');
  headerCanvas.width = sourceCanvas.width;
  headerCanvas.height = Math.max(100, Math.floor(sourceCanvas.height * headerRatio));

  const ctx = headerCanvas.getContext('2d');
  if (ctx) {
    // Draw only the top portion
    ctx.drawImage(
      sourceCanvas,
      0, 0, sourceCanvas.width, headerCanvas.height,
      0, 0, headerCanvas.width, headerCanvas.height
    );

    // Image enhancement for OCR: contrast stretch & light thresholding
    try {
      const imgData = ctx.getImageData(0, 0, headerCanvas.width, headerCanvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        // Grayscale conversion
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // High contrast enhancement
        const enhanced = gray < 160 ? Math.max(0, gray - 50) : Math.min(255, gray + 40);
        data[i] = enhanced;
        data[i + 1] = enhanced;
        data[i + 2] = enhanced;
      }
      ctx.putImageData(imgData, 0, 0);
    } catch {
      // If cross-origin or canvas security issue, keep unenhanced
    }
  }

  return headerCanvas;
}
