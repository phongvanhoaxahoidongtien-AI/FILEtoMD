import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker, Worker } from 'tesseract.js';
import { AdminMetadata, ConversionOptions, ProcessingProgress } from '../../types';
import {
  cropHeaderCanvasColumns,
  extractFromTwoColumns,
  extractVietnameseAdminMetadata
} from '../vietnameseAdminExtractor';
import {
  enhanceFullPageCanvasForScanOCR,
  structureScannedOCRToMarkdown
} from '../scanOCREnhancer';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Cached Tesseract worker
let globalTesseractWorker: Worker | null = null;
let currentLanguage = '';

async function getTesseractWorker(
  language = 'vie+eng',
  onProgress?: (status: string) => void
): Promise<Worker> {
  if (globalTesseractWorker && currentLanguage === language) {
    return globalTesseractWorker;
  }

  if (globalTesseractWorker) {
    await globalTesseractWorker.terminate();
    globalTesseractWorker = null;
  }

  const worker = await createWorker(language, 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        const percent = Math.round((m.progress || 0) * 100);
        onProgress(`Đang nhận diện chữ viết OCR (${percent}%)...`);
      }
    },
  });

  globalTesseractWorker = worker;
  currentLanguage = language;
  return worker;
}

export interface PDFParseResult {
  markdown: string;
  metadata: AdminMetadata;
  thumbnails: string[];
  totalPages: number;
}

interface PDFTextItem {
  str: string;
  transform: number[]; // [scaleX, skewY, skewX, scaleY, x, y]
  width: number;
  height: number;
  fontName?: string;
}

interface DigitalSigInfo {
  signer?: string;
  signingDate?: string;
  docNumber?: string;
}

/**
 * Extracts digital signature and certificate information from PDF annotations
 */
async function extractDigitalSignatureInfo(page: any): Promise<DigitalSigInfo> {
  const result: DigitalSigInfo = {};
  try {
    const annotations = await page.getAnnotations();
    for (const anno of annotations) {
      const isSig = anno.subtype === 'Widget' && (anno.fieldType === 'Sig' || anno.alternativeText || anno.contents);
      if (isSig) {
        const textContent = [anno.contents, anno.alternativeText, anno.fieldValue]
          .filter(t => typeof t === 'string' && t.trim().length > 0)
          .join('\n');

        if (textContent) {
          // Signer name
          const signerMatch = textContent.match(/(?:Ký bởi|Signed by|Người ký|Ký điện tử bởi|Cơ quan ký)\s*[:]\s*([^\r\n,]+)/i);
          if (signerMatch && signerMatch[1]) {
            result.signer = signerMatch[1].trim();
          } else if (!result.signer && (anno.alternativeText || anno.contents)) {
            result.signer = (anno.alternativeText || anno.contents).replace(/[\r\n]+/g, ' ').trim();
          }

          // Signing date
          const dateMatch = textContent.match(/(?:Ngày\s*ký|Thời\s*gian\s*ký|Date|Signing\s*time)\s*[:;\s\-]*\s*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.][12][0-9]{3})/i) ||
            textContent.match(/(?:Ngày\s*ký|Thời\s*gian\s*ký)\s*[:;\s\-]*\s*([0-3]?[0-9])\s+(?:tháng|thang)\s+([0-1]?[0-9])\s+(?:năm|nam)\s+([12][0-9]{3})/i);
          if (dateMatch) {
            if (dateMatch[2] && dateMatch[3]) {
              const d = dateMatch[1].padStart(2, '0');
              const m = dateMatch[2].padStart(2, '0');
              const y = dateMatch[3];
              result.signingDate = `${d}/${m}/${y}`;
            } else {
              result.signingDate = dateMatch[1];
            }
          }

          // Document number in digital signature stamp
          const docNumMatch = textContent.match(/(?:Số\s*ký\s*hiệu|Số\s*văn\s*bản|Số)\s*[:]\s*([0-9]{1,6}(?:\/[0-9]{2,4})?\s*\/\s*[A-Za-zĐđ0-9_.\-&]+(?:\s*[-–—/]\s*[A-Za-zĐđ0-9_.\-&]+)*)/i);
          if (docNumMatch && docNumMatch[1]) {
            result.docNumber = docNumMatch[1].trim();
          }
        }

        // Modification date fallback
        if (!result.signingDate && (anno.modificationDate || anno.M)) {
          const modStr = (anno.modificationDate || anno.M) as string;
          const pdfDateMatch = modStr.match(/D:([12][0-9]{3})([0-1][0-9])([0-3][0-9])/);
          if (pdfDateMatch) {
            const y = pdfDateMatch[1];
            const m = pdfDateMatch[2];
            const d = pdfDateMatch[3];
            result.signingDate = `${d}/${m}/${y}`;
          }
        }
      }
    }
  } catch {
    // ignore annotation errors
  }
  return result;
}

/**
 * Extracts metadata from native PDF text items on Page 1 using exact 2D coordinate analysis.
 * - Khung bên trái: Cơ quan cấp trên (dòng 1), Cơ quan ban hành (dòng 2), Số ký hiệu (dòng 3)
 * - Khung bên phải: Quốc hiệu (dòng 1), Tiêu ngữ (dòng 2), Địa danh & Ngày tháng ban hành (dòng 3)
 */
function extractMetadataFromNativePage(
  items: PDFTextItem[],
  pageWidth: number,
  pageHeight: number,
  digitalSigs?: DigitalSigInfo
): AdminMetadata {
  // Find dynamic header cutoff above the main document title/subject
  let markerY = 0;
  for (const it of items) {
    if (!it.str) continue;
    const s = it.str.trim();
    if (/^(?:QUYẾT\s*ĐỊNH|THÔNG\s*BÁO|KẾ\s*HOẠCH|BÁO\s*CÁO|CHỈ\s*THỊ|NGHỊ\s*QUYẾT|TỜ\s*TRÌNH|KẾT\s*LUẬN|LỆNH|ĐIỀU\s*LỆ)/i.test(s) ||
        /^(?:V\/v|Về\s*việc|Kính\s*gửi|Căn\s*cứ)/i.test(s)) {
      if (it.transform[5] > pageHeight * 0.40) {
        markerY = Math.max(markerY, it.transform[5]);
      }
    }
  }

  // Header zone: above the marker or top 48% of page
  const headerCutoffY = markerY > 0 ? markerY - 8 : pageHeight * 0.52;
  const columnDividerX = pageWidth * 0.52;

  const leftHeaderItems = items.filter(
    it => it.str && it.str.trim() && it.transform[5] >= headerCutoffY && it.transform[4] < columnDividerX
  );
  const rightHeaderItems = items.filter(
    it => it.str && it.str.trim() && it.transform[5] >= headerCutoffY && it.transform[4] >= columnDividerX - (pageWidth * 0.08)
  );
  const bodyItems = items.filter(
    it => it.str && it.str.trim() && it.transform[5] < headerCutoffY
  );

  const leftText = itemsToSortedLines(leftHeaderItems);
  const rightText = itemsToSortedLines(rightHeaderItems);
  const bodyText = itemsToSortedLines(bodyItems.slice(0, 50));

  const meta = extractFromTwoColumns(leftText, rightText, bodyText, digitalSigs);
  meta.extractedFromZone = 'text-layer';
  return meta;
}

/**
 * Converts a list of PDF text items into clean, sorted lines
 */
function itemsToSortedLines(items: PDFTextItem[]): string {
  if (items.length === 0) return '';
  const sorted = [...items].sort((a, b) => {
    const yA = a.transform[5];
    const yB = b.transform[5];
    if (Math.abs(yA - yB) > 8.5) {
      return yB - yA; // top to bottom
    }
    return a.transform[4] - b.transform[4]; // left to right
  });

  const lines: string[] = [];
  let currentLine = '';
  let currentY = sorted[0].transform[5];
  let currentMaxX = sorted[0].transform[4] + (sorted[0].width || 10);

  for (const item of sorted) {
    const itemY = item.transform[5];
    const itemX = item.transform[4];
    if (Math.abs(itemY - currentY) > 8.5) {
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      currentLine = item.str;
      currentY = itemY;
      currentMaxX = itemX + (item.width || 10);
    } else {
      const dist = itemX - currentMaxX;
      if (dist > 3) {
        currentLine += ' ' + item.str;
      } else {
        currentLine += item.str;
      }
      currentMaxX = Math.max(currentMaxX, itemX + (item.width || 10));
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  return lines.join('\n');
}

export async function parsePDFDocument(
  file: File,
  options: ConversionOptions,
  onProgress: (progress: ProcessingProgress) => void
): Promise<PDFParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
    cMapPacked: true,
  });

  onProgress({ stage: 'Đang tải cấu trúc PDF...', percent: 5 });

  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const thumbnails: string[] = [];
  const pageMarkdowns: string[] = [];
  let detectedMetadata: AdminMetadata = { confidenceScore: 0 };
  let digitalSigInfo: DigitalSigInfo = {};

  // Check PDF document metadata for digital creation/mod date
  try {
    const metaObj = await pdf.getMetadata();
    const info = (metaObj?.info || {}) as any;
    if (info) {
      if (info.ModDate && typeof info.ModDate === 'string') {
        const m = info.ModDate.match(/D:([12][0-9]{3})([0-1][0-9])([0-3][0-9])/);
        if (m) {
          digitalSigInfo.signingDate = `${m[3]}/${m[2]}/${m[1]}`;
        }
      }
      if (info.Author && typeof info.Author === 'string') {
        digitalSigInfo.signer = info.Author.trim();
      }
    }
  } catch {
    // ignore
  }

  // Scale resolution based on options
  const scale = options.resolutionMode === 'fast' ? 1.5 : options.resolutionMode === 'high' ? 2.5 : 2.0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const pagePercent = Math.round((pageNum / totalPages) * 85);
    onProgress({
      stage: `Đang xử lý trang ${pageNum}/${totalPages}...`,
      percent: pagePercent,
      currentPage: pageNum,
      totalPages
    });

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // Extract digital signature info from page annotations
    if (pageNum === 1 || pageNum === totalPages) {
      const pageSigs = await extractDigitalSignatureInfo(page);
      digitalSigInfo = { ...digitalSigInfo, ...pageSigs };
      if (digitalSigInfo.signer) {
        detectedMetadata.signer = digitalSigInfo.signer;
      }
      if (digitalSigInfo.signingDate && !detectedMetadata.issueDate) {
        detectedMetadata.issueDate = digitalSigInfo.signingDate;
      }
      if (digitalSigInfo.docNumber && !detectedMetadata.documentNumber) {
        detectedMetadata.documentNumber = digitalSigInfo.docNumber;
      }
    }

    // 1. Extract native text layer
    const textContent = await page.getTextContent();
    const textItems = textContent.items as Array<PDFTextItem>;

    // Filter out blank items
    const nonEmptyItems = textItems.filter(item => item.str && item.str.trim().length > 0);
    const extractedText = nonEmptyItems.map(i => i.str).join(' ');
    const hasSufficientNativeText = extractedText.length > 50;

    // Render page to canvas (for thumbnails & scanned pages)
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Không thể khởi tạo Canvas 2D context trong trình duyệt.');
    }

    await (page.render({
      canvasContext: ctx,
      viewport: viewport,
    } as any).promise);

    // Save thumbnail
    const thumbData = canvas.toDataURL('image/jpeg', 0.65);
    thumbnails.push(thumbData);

    let pageText = '';

    if (hasSufficientNativeText) {
      // PAGE 1 NATIVE METADATA EXTRACTION (Exact coordinate analysis)
      if (pageNum === 1) {
        onProgress({
          stage: 'Đang trích xuất số hiệu & ngày ban hành từ văn bản...',
          percent: pagePercent,
          currentPage: 1,
          totalPages
        });

        const nativeMeta = extractMetadataFromNativePage(textItems, viewport.width, viewport.height, digitalSigInfo);
        if ((nativeMeta.confidenceScore || 0) > 0) {
          detectedMetadata = { ...nativeMeta };
        }

        // If native extraction missed document number or date, run fallback OCR on top 28% header
        if (
          options.prioritizeAdminMetadata &&
          (!detectedMetadata.documentNumber || !detectedMetadata.issueDate || (detectedMetadata.confidenceScore || 0) < 65)
        ) {
          try {
            onProgress({
              stage: 'Tăng cường nhận diện: Quét OCR vùng tiêu đề 25% đầu trang...',
              percent: pagePercent,
              currentPage: 1,
              totalPages
            });

            const { leftCanvas, rightCanvas, fullHeaderCanvas } = cropHeaderCanvasColumns(canvas, 0.30);
            const ocrWorker = await getTesseractWorker(options.ocrLanguage, (msg) => {
              onProgress({ stage: `OCR tiêu đề: ${msg}`, percent: pagePercent, currentPage: 1, totalPages });
            });

            const leftOcr = await ocrWorker.recognize(leftCanvas);
            const rightOcr = await ocrWorker.recognize(rightCanvas);
            let ocrMeta = extractFromTwoColumns(leftOcr.data.text, rightOcr.data.text, undefined, digitalSigInfo);

            if (!ocrMeta.documentNumber) {
              const fullOcr = await ocrWorker.recognize(fullHeaderCanvas);
              const fullMeta = extractVietnameseAdminMetadata(fullOcr.data.text, true);
              if (fullMeta.documentNumber) {
                ocrMeta.documentNumber = fullMeta.documentNumber;
              }
              if (!ocrMeta.issueDate && fullMeta.issueDate) {
                ocrMeta.issueDate = fullMeta.issueDate;
              }
            }

            // Merge newly found fields
            if (ocrMeta.documentNumber && !detectedMetadata.documentNumber) {
              detectedMetadata.documentNumber = ocrMeta.documentNumber;
            }
            if (ocrMeta.issueDate && !detectedMetadata.issueDate) {
              detectedMetadata.issueDate = ocrMeta.issueDate;
            }
            if (ocrMeta.issuingAgency && !detectedMetadata.issuingAgency) {
              detectedMetadata.issuingAgency = ocrMeta.issuingAgency;
            }
            if (ocrMeta.parentAgency && !detectedMetadata.parentAgency) {
              detectedMetadata.parentAgency = ocrMeta.parentAgency;
            }
            if (ocrMeta.location && !detectedMetadata.location) {
              detectedMetadata.location = ocrMeta.location;
            }
            detectedMetadata.confidenceScore = Math.max(detectedMetadata.confidenceScore || 0, ocrMeta.confidenceScore || 0);
          } catch (err) {
            console.warn('Fallback header OCR warning:', err);
          }
        }
      }

      // Reconstruct structured Markdown from native text items
      pageText = reconstructStructuredLayout(textItems, viewport.width, viewport.height, pageNum === 1);
    } else {
      // Scanned / Image PDF: Run column-aware OCR for Page 1 Header
      if (pageNum === 1 && options.prioritizeAdminMetadata) {
        onProgress({
          stage: 'Đang quét OCR vùng tiêu đề & số hiệu văn bản (Trang 1)...',
          percent: pagePercent,
          currentPage: 1,
          totalPages
        });

        try {
          const { leftCanvas, rightCanvas, fullHeaderCanvas } = cropHeaderCanvasColumns(canvas, 0.30);
          const ocrWorker = await getTesseractWorker(options.ocrLanguage, (msg) => {
            onProgress({ stage: `OCR tiêu đề: ${msg}`, percent: pagePercent, currentPage: 1, totalPages });
          });

          const leftOcr = await ocrWorker.recognize(leftCanvas);
          const rightOcr = await ocrWorker.recognize(rightCanvas);
          const ocrMeta = extractFromTwoColumns(leftOcr.data.text, rightOcr.data.text, undefined, digitalSigInfo);

          if (ocrMeta.documentNumber) detectedMetadata.documentNumber = ocrMeta.documentNumber;
          if (ocrMeta.issueDate) detectedMetadata.issueDate = ocrMeta.issueDate;
          if (ocrMeta.issuingAgency) detectedMetadata.issuingAgency = ocrMeta.issuingAgency;
          if (ocrMeta.parentAgency) detectedMetadata.parentAgency = ocrMeta.parentAgency;
          if (ocrMeta.location) detectedMetadata.location = ocrMeta.location;

          if (!detectedMetadata.documentNumber) {
            const fullOcr = await ocrWorker.recognize(fullHeaderCanvas);
            const fullMeta = extractVietnameseAdminMetadata(fullOcr.data.text, true);
            if (fullMeta.documentNumber) detectedMetadata.documentNumber = fullMeta.documentNumber;
            if (fullMeta.issueDate && !detectedMetadata.issueDate) detectedMetadata.issueDate = fullMeta.issueDate;
          }
        } catch (err) {
          console.warn('Header OCR error for scanned PDF:', err);
        }
      }

      // Full page OCR with Adaptive Contrast Enhancement & Red Stamp Removal
      onProgress({
        stage: `Đang xử lý hình ảnh & quét OCR toàn bộ trang ${pageNum}...`,
        percent: pagePercent,
        currentPage: pageNum,
        totalPages
      });

      const ocrWorker = await getTesseractWorker(options.ocrLanguage, (msg) => {
        onProgress({ stage: `Trang ${pageNum}: ${msg}`, percent: pagePercent, currentPage: pageNum, totalPages });
      });

      // Tiền xử lý canvas toàn trang: tẩy trắng nền ố vàng, khử con dấu đỏ đè chữ, làm đậm nét chữ tiếng Việt
      const enhancedCanvas = enhanceFullPageCanvasForScanOCR(canvas);
      const fullPageOcr = await ocrWorker.recognize(enhancedCanvas);
      const rawOcrText = fullPageOcr.data.text;

      // Cấu trúc hóa text OCR thô thành Markdown hoàn chỉnh (tiêu đề, căn cứ, điều khoản, bảng biểu, chữ ký)
      pageText = structureScannedOCRToMarkdown(rawOcrText, pageNum);

      // Extract general metadata if page 1 didn't find everything
      if (pageNum === 1 && (!detectedMetadata.documentNumber || !detectedMetadata.issueDate)) {
        const fullMeta = extractVietnameseAdminMetadata(rawOcrText);
        if (fullMeta.documentNumber && !detectedMetadata.documentNumber) {
          detectedMetadata.documentNumber = fullMeta.documentNumber;
        }
        if (fullMeta.issueDate && !detectedMetadata.issueDate) {
          detectedMetadata.issueDate = fullMeta.issueDate;
        }
        if (fullMeta.issuingAgency && !detectedMetadata.issuingAgency) {
          detectedMetadata.issuingAgency = fullMeta.issuingAgency;
        }
      }
    }

    pageMarkdowns.push(`<!-- PAGE_${pageNum} -->\n${pageText.trim()}`);
  }

  onProgress({ stage: 'Đang tổng hợp và chuẩn hóa Markdown...', percent: 95 });

  const fullMarkdown = pageMarkdowns.join('\n\n---\n\n');

  return {
    markdown: fullMarkdown,
    metadata: detectedMetadata,
    thumbnails,
    totalPages
  };
}

/**
 * Reconstructs lines, paragraphs, and multi-column administrative headings from PDF text items
 */
function reconstructStructuredLayout(
  items: Array<PDFTextItem>,
  pageWidth: number,
  pageHeight: number,
  isFirstPage = false
): string {
  if (items.length === 0) return '';

  let markerY = 0;
  for (const it of items) {
    if (!it.str) continue;
    const s = it.str.trim();
    if (/^(?:QUYẾT\s*ĐỊNH|THÔNG\s*BÁO|KẾ\s*HOẠCH|BÁO\s*CÁO|CHỈ\s*THỊ|NGHỊ\s*QUYẾT|TỜ\s*TRÌNH|KẾT\s*LUẬN|LỆNH|ĐIỀU\s*LỆ)/i.test(s) ||
        /^(?:V\/v|Về\s*việc|Kính\s*gửi|Căn\s*cứ)/i.test(s)) {
      if (it.transform[5] > pageHeight * 0.40) {
        markerY = Math.max(markerY, it.transform[5]);
      }
    }
  }

  const headerCutoffY = markerY > 0 ? markerY - 8 : pageHeight * 0.52;
  const columnDividerX = pageWidth * 0.52;

  // On Page 1, format the two-column administrative header cleanly
  if (isFirstPage) {
    const leftHeaderItems = items.filter(
      it => it.str && it.str.trim() && it.transform[5] >= headerCutoffY && it.transform[4] < columnDividerX
    );
    const rightHeaderItems = items.filter(
      it => it.str && it.str.trim() && it.transform[5] >= headerCutoffY && it.transform[4] >= columnDividerX - (pageWidth * 0.08)
    );
    const bodyItems = items.filter(
      it => it.str && it.str.trim() && it.transform[5] < headerCutoffY
    );

    if (leftHeaderItems.length > 0 || rightHeaderItems.length > 0) {
      const leftLines = itemsToSortedLines(leftHeaderItems);
      const rightLines = itemsToSortedLines(rightHeaderItems);
      const bodyText = formatBodyLines(bodyItems);

      return `${leftLines}\n\n${rightLines}\n\n${bodyText}`.trim();
    }
  }

  return formatBodyLines(items);
}

/**
 * Formats body items into paragraphs, headings, and list items
 */
function formatBodyLines(items: Array<PDFTextItem>): string {
  if (items.length === 0) return '';

  const sorted = [...items].sort((a, b) => {
    const yA = a.transform[5];
    const yB = b.transform[5];
    if (Math.abs(yA - yB) > 8.5) {
      return yB - yA;
    }
    return a.transform[4] - b.transform[4];
  });

  const lines: string[] = [];
  let currentLineText = '';
  let currentY = sorted[0].transform[5];
  let currentMaxX = sorted[0].transform[4] + (sorted[0].width || 10);

  for (const item of sorted) {
    const itemY = item.transform[5];
    const itemX = item.transform[4];

    if (Math.abs(itemY - currentY) > 8.5) {
      if (currentLineText.trim()) {
        lines.push(currentLineText.trim());
      }
      currentLineText = item.str;
      currentY = itemY;
      currentMaxX = itemX + (item.width || 10);
    } else {
      const distance = itemX - currentMaxX;
      if (distance > 4) {
        currentLineText += ' ' + item.str;
      } else {
        currentLineText += item.str;
      }
      currentMaxX = Math.max(currentMaxX, itemX + (item.width || 10));
    }
  }

  if (currentLineText.trim()) {
    lines.push(currentLineText.trim());
  }

  // Format into Markdown blocks while strictly preserving all text
  const resultBlocks: string[] = [];
  let buffer: string[] = [];

  for (const rawLine of lines) {
    const text = rawLine.trim();
    if (!text) continue;

    // Detect section headings: "Điều 1.", "Chương I", "PHẦN I", "QUYẾT ĐỊNH:", "Kính gửi:"
    if (/^(Điều\s+\d+|Chương\s+[IVXLCDM]+|Phần\s+[IVXLCDM]+|QUYẾT\s*ĐỊNH|CHỈ\s*THỊ|THÔNG\s*BÁO|KẾ\s*HOẠCH|KÍNH\s*GỬI)/i.test(text)) {
      if (buffer.length > 0) {
        resultBlocks.push(buffer.join(' '));
        buffer = [];
      }
      resultBlocks.push(`\n### ${text}\n`);
      continue;
    }

    // Detect list items: "1.", "a)", "-", "+"
    if (/^(\d+\.|\w\)|[-*•+])\s+/.test(text)) {
      if (buffer.length > 0) {
        resultBlocks.push(buffer.join(' '));
        buffer = [];
      }
      resultBlocks.push(text);
      continue;
    }

    // Normal paragraph line
    buffer.push(text);
  }

  if (buffer.length > 0) {
    resultBlocks.push(buffer.join(' '));
  }

  return resultBlocks.join('\n\n');
}
