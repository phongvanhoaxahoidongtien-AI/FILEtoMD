import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker, Worker } from 'tesseract.js';
import { AdminMetadata, ConversionOptions, ProcessingProgress } from '../../types';
import { extractVietnameseAdminMetadata, cropHeaderCanvas } from '../vietnameseAdminExtractor';

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

    // 1. Check for native text layer
    const textContent = await page.getTextContent();
    const textItems = textContent.items as Array<{
      str: string;
      transform: number[];
      width: number;
      height: number;
      fontName?: string;
    }>;

    // Filter out blank or invisible items
    const nonEmptyItems = textItems.filter(item => item.str && item.str.trim().length > 0);
    const extractedText = nonEmptyItems.map(i => i.str).join(' ');
    const hasSufficientNativeText = extractedText.length > 50;

    // Render page to canvas (always needed for thumbnails and OCR if needed)
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Không thể khởi tạo Canvas 2D context trong trình duyệt.');
    }

    // Render PDF page to canvas
    // Cast to any to accommodate pdfjs-dist render context types
    await (page.render({
      canvasContext: ctx,
      viewport: viewport,
    } as any).promise);

    // Save thumbnail
    const thumbData = canvas.toDataURL('image/jpeg', 0.65);
    thumbnails.push(thumbData);

    let pageText = '';

    // If Page 1 and "prioritizeAdminMetadata" is enabled, run targeted header crop OCR
    if (pageNum === 1 && options.prioritizeAdminMetadata) {
      onProgress({
        stage: 'Đang trích xuất vùng tiêu đề & số văn bản trang 1...',
        percent: pagePercent,
        currentPage: 1,
        totalPages
      });

      try {
        const headerCanvas = cropHeaderCanvas(canvas, 0.25);
        const ocrWorker = await getTesseractWorker(options.ocrLanguage, (msg) => {
          onProgress({ stage: `OCR vùng tiêu đề: ${msg}`, percent: pagePercent, currentPage: 1, totalPages });
        });

        const headerOcrResult = await ocrWorker.recognize(headerCanvas);
        const headerText = headerOcrResult.data.text;
        const headerMeta = extractVietnameseAdminMetadata(headerText, true);

        if ((headerMeta.confidenceScore || 0) > (detectedMetadata.confidenceScore || 0)) {
          detectedMetadata = { ...headerMeta, extractedFromZone: 'ocr-header' };
        }
      } catch (err) {
        console.warn('Header OCR targeted extraction warning:', err);
      }
    }

    if (hasSufficientNativeText) {
      // Reconstruct structured layout from native text items
      pageText = reconstructStructuredLayout(textItems, viewport.width, viewport.height);
      
      // Also extract metadata from native text if not already confident
      if ((detectedMetadata.confidenceScore || 0) < 50 && pageNum === 1) {
        const textMeta = extractVietnameseAdminMetadata(pageText, false);
        if ((textMeta.confidenceScore || 0) > (detectedMetadata.confidenceScore || 0)) {
          detectedMetadata = { ...detectedMetadata, ...textMeta, extractedFromZone: 'text-layer' };
        }
      }
    } else {
      // Scanned / Image PDF: Run full-page OCR
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

      if (pageNum === 1 && (detectedMetadata.confidenceScore || 0) < 70) {
        const ocrMeta = extractVietnameseAdminMetadata(pageText, false);
        if ((ocrMeta.confidenceScore || 0) > (detectedMetadata.confidenceScore || 0)) {
          detectedMetadata = { ...detectedMetadata, ...ocrMeta, extractedFromZone: 'ocr-full' };
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
 * Reconstructs lines, paragraphs, and multi-column headings from PDF text items
 */
function reconstructStructuredLayout(
  items: Array<{ str: string; transform: number[]; width: number; height: number }>,
  pageWidth: number,
  pageHeight: number
): string {
  if (items.length === 0) return '';

  // Sort by Y descending (PDF coordinates start bottom-left), then X ascending
  const sorted = [...items].sort((a, b) => {
    const yA = a.transform[5];
    const yB = b.transform[5];
    if (Math.abs(yA - yB) > 4) {
      return yB - yA;
    }
    return a.transform[4] - b.transform[4];
  });

  const lines: Array<{ text: string; y: number; minX: number; maxX: number }> = [];
  let currentLineText = '';
  let currentY = sorted[0].transform[5];
  let currentMinX = sorted[0].transform[4];
  let currentMaxX = currentMinX + (sorted[0].width || 10);

  for (const item of sorted) {
    const itemY = item.transform[5];
    const itemX = item.transform[4];

    if (Math.abs(itemY - currentY) > 5) {
      if (currentLineText.trim()) {
        lines.push({ text: currentLineText.trim(), y: currentY, minX: currentMinX, maxX: currentMaxX });
      }
      currentLineText = item.str;
      currentY = itemY;
      currentMinX = itemX;
      currentMaxX = itemX + (item.width || 10);
    } else {
      // Check distance for spacing
      const distance = itemX - currentMaxX;
      if (distance > 10) {
        currentLineText += '    ' + item.str;
      } else if (distance > 2) {
        currentLineText += ' ' + item.str;
      } else {
        currentLineText += item.str;
      }
      currentMaxX = Math.max(currentMaxX, itemX + (item.width || 10));
    }
  }

  if (currentLineText.trim()) {
    lines.push({ text: currentLineText.trim(), y: currentY, minX: currentMinX, maxX: currentMaxX });
  }

  // Format into Markdown blocks
  const resultBlocks: string[] = [];
  let buffer: string[] = [];

  for (const l of lines) {
    const text = l.text.trim();
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
