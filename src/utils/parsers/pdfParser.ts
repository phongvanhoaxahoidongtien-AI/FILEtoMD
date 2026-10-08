import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker, Worker } from 'tesseract.js';
import { AdminMetadata, ConversionOptions, ProcessingProgress } from '../../types';
import {
  extractVietnameseAdminMetadata,
  extractFromTwoColumns,
  cropHeaderCanvasColumns
} from '../vietnameseAdminExtractor';

// Initialize PDF.js worker using local bundled worker URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Shared Tesseract Worker instance for batch efficiency
let sharedTesseractWorker: { worker: Worker; lang: string } | null = null;

async function getTesseractWorker(lang: string, onStatus?: (status: string, progress: number) => void): Promise<Worker> {
  const tesseractLang = lang === 'vi+en' || lang === 'vie+eng' ? 'vie+eng' : lang === 'en' || lang === 'eng' ? 'eng' : 'vie';

  if (sharedTesseractWorker && sharedTesseractWorker.lang === tesseractLang) {
    return sharedTesseractWorker.worker;
  }

  if (sharedTesseractWorker) {
    try {
      await sharedTesseractWorker.worker.terminate();
    } catch {
      // ignore
    }
    sharedTesseractWorker = null;
  }

  if (onStatus) onStatus('Khởi động động cơ OCR Tesseract...', 5);

  const worker = await createWorker(tesseractLang, 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && m.progress !== undefined && onStatus) {
        onStatus(`Đang nhận dạng OCR: ${Math.round(m.progress * 100)}%`, Math.round(m.progress * 100));
      }
    },
  });

  sharedTesseractWorker = { worker, lang: tesseractLang };
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

/**
 * Extracts metadata from native PDF text items on Page 1 using exact 2D coordinate analysis.
 * Vietnamese administrative standard (Decree 30/2020):
 * - Top Left (x < 55%, top 38% y): Issuing Agency + Document Number (Số: 123/QĐ-UBND, Số: 4119/SKHCN-CNgSHTT)
 * - Top Right (x >= 42%, top 38% y): National Motto + Location & Issue Date (Thanh Hóa, ngày 07/09/2026)
 * - Center / Body: Title & Subject (V/v..., QUYẾT ĐỊNH)
 */
function extractMetadataFromNativePage(
  items: PDFTextItem[],
  pageWidth: number,
  pageHeight: number
): AdminMetadata {
  // In PDF coordinate system, y starts at bottom. Top 38% of page is y >= pageHeight * 0.62
  const headerCutoffY = pageHeight * 0.60;
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
  const bodyText = itemsToSortedLines(bodyItems.slice(0, 45));

  const meta = extractFromTwoColumns(leftText, rightText, bodyText);
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
    if (Math.abs(yA - yB) > 7) {
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
    if (Math.abs(itemY - currentY) > 7) {
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

    // 1. Extract native text layer
    const textContent = await page.getTextContent();
    const textItems = textContent.items as Array<PDFTextItem>;

    // Filter out blank items
    const nonEmptyItems = textItems.filter(item => item.str && item.str.trim().length > 0);
    const extractedText = nonEmptyItems.map(i => i.str).join(' ');
    const hasSufficientNativeText = extractedText.length > 50;

    // Render page to canvas (always needed for thumbnails & scanned pages)
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

    // Check for digital signature annotations
    if (pageNum === 1 || pageNum === totalPages) {
      try {
        const annotations = await page.getAnnotations();
        for (const anno of annotations) {
          if (anno.subtype === 'Widget' && (anno.fieldType === 'Sig' || anno.alternativeText)) {
            const sigName = anno.alternativeText || anno.fieldValue || anno.contents;
            if (sigName && typeof sigName === 'string') {
              detectedMetadata.signer = sigName.replace(/[\r\n]+/g, ' ').trim();
            }
          }
        }
      } catch {
        // ignore annotation errors
      }
    }

    if (hasSufficientNativeText) {
      // PAGE 1 NATIVE METADATA EXTRACTION (Exact coordinate analysis)
      if (pageNum === 1) {
        onProgress({
          stage: 'Đang trích xuất số hiệu & ngày ban hành từ văn bản...',
          percent: pagePercent,
          currentPage: 1,
          totalPages
        });

        const nativeMeta = extractMetadataFromNativePage(textItems, viewport.width, viewport.height);
        if ((nativeMeta.confidenceScore || 0) > 0) {
          detectedMetadata = { ...nativeMeta };
        }

        // If native extraction missed document number or date, run fallback OCR on top 25% header
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

            const { leftCanvas, rightCanvas, fullHeaderCanvas } = cropHeaderCanvasColumns(canvas, 0.28);
            const ocrWorker = await getTesseractWorker(options.ocrLanguage, (msg) => {
              onProgress({ stage: `OCR tiêu đề: ${msg}`, percent: pagePercent, currentPage: 1, totalPages });
            });

            const leftOcr = await ocrWorker.recognize(leftCanvas);
            const rightOcr = await ocrWorker.recognize(rightCanvas);
            let ocrMeta = extractFromTwoColumns(leftOcr.data.text, rightOcr.data.text);

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
          const { leftCanvas, rightCanvas, fullHeaderCanvas } = cropHeaderCanvasColumns(canvas, 0.28);
          const ocrWorker = await getTesseractWorker(options.ocrLanguage, (msg) => {
            onProgress({ stage: `OCR tiêu đề: ${msg}`, percent: pagePercent, currentPage: 1, totalPages });
          });

          // Run OCR on Left column (Agency & Doc Number)
          const leftOcr = await ocrWorker.recognize(leftCanvas);
          // Run OCR on Right column (National Motto & Date)
          const rightOcr = await ocrWorker.recognize(rightCanvas);

          let ocrMeta = extractFromTwoColumns(leftOcr.data.text, rightOcr.data.text);

          // If document number or date is not found, also scan full header
          if (!ocrMeta.documentNumber || !ocrMeta.issueDate) {
            const fullOcr = await ocrWorker.recognize(fullHeaderCanvas);
            const fullMeta = extractVietnameseAdminMetadata(fullOcr.data.text, true);
            if (fullMeta.documentNumber && !ocrMeta.documentNumber) {
              ocrMeta.documentNumber = fullMeta.documentNumber;
            }
            if (fullMeta.issueDate && !ocrMeta.issueDate) {
              ocrMeta.issueDate = fullMeta.issueDate;
            }
          }

          if ((ocrMeta.confidenceScore || 0) > (detectedMetadata.confidenceScore || 0)) {
            detectedMetadata = { ...ocrMeta, extractedFromZone: 'ocr-header' };
          }
        } catch (err) {
          console.warn('Scanned PDF header OCR warning:', err);
        }
      }

      // Run full page OCR
      onProgress({
        stage: `Trang ${pageNum} là ảnh quét - Đang chạy OCR Tesseract...`,
        percent: pagePercent,
        currentPage: pageNum,
        totalPages
      });

      const ocrWorker = await getTesseractWorker(options.ocrLanguage, (msg, prog) => {
        onProgress({
          stage: `OCR Trang ${pageNum}/${totalPages}: ${msg}`,
          percent: Math.min(95, pagePercent + Math.round((prog || 0) * 0.1)),
          currentPage: pageNum,
          totalPages,
          ocrProgress: prog
        });
      });

      const ocrResult = await ocrWorker.recognize(canvas);
      pageText = ocrResult.data.text;

      if (pageNum === 1 && (detectedMetadata.confidenceScore || 0) < 60) {
        const fullMeta = extractVietnameseAdminMetadata(pageText, false);
        if ((fullMeta.confidenceScore || 0) > (detectedMetadata.confidenceScore || 0)) {
          detectedMetadata = { ...detectedMetadata, ...fullMeta, extractedFromZone: 'ocr-full' };
        }
      }
    }

    // Wrap page content with clear Markdown markers
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

  const headerCutoffY = pageHeight * 0.60;
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
    if (Math.abs(yA - yB) > 7) {
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

    if (Math.abs(itemY - currentY) > 7) {
      if (currentLineText.trim()) {
        lines.push(currentLineText.trim());
      }
      currentLineText = item.str;
      currentY = itemY;
      currentMaxX = itemX + (item.width || 10);
    } else {
      const distance = itemX - currentMaxX;
      if (distance > 5) {
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

  // Format into Markdown blocks
  const resultBlocks: string[] = [];
  let buffer: string[] = [];

  for (const rawLine of lines) {
    const text = rawLine.trim();
    if (!text) continue;

    // Detect section headings: "Điều 1.", "Chương I", "PHẦN I", "QUYẾT ĐỊNH:", "Kính gửi:"
    if (/^(Điều\s+\d+|Chương\s+[IVXLCDM]+|Phần\s+[IVXLCDM]+|QUYẾT ĐỊNH|CHỈ THỊ|THÔNG BÁO|KẾ HOẠCH|KÍNH GỬI)/i.test(text)) {
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
