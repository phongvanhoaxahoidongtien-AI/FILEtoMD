import { createWorker } from 'tesseract.js';
import { AdminMetadata, ConversionOptions, ProcessingProgress } from '../../types';
import { extractVietnameseAdminMetadata, cropHeaderCanvas } from '../vietnameseAdminExtractor';
import { enhanceFullPageCanvasForScanOCR, structureScannedOCRToMarkdown } from '../scanOCREnhancer';

export interface ImageParseResult {
  markdown: string;
  metadata: AdminMetadata;
  thumbnail: string;
}

export async function parseImageDocument(
  file: File,
  options: ConversionOptions,
  onProgress: (progress: ProcessingProgress) => void
): Promise<ImageParseResult> {
  onProgress({ stage: 'Đang chuẩn bị hình ảnh scan...', percent: 10 });

  // Read image to HTMLImageElement
  const objectUrl = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Không thể tải định dạng hình ảnh này.'));
    image.src = objectUrl;
  });

  // Tăng scale độ phân giải cho ảnh scan để không mất dấu tiếng Việt
  const scale = options.resolutionMode === 'fast' ? 1.5 : options.resolutionMode === 'high' ? 2.5 : 2.0;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(objectUrl);
    throw new Error('Không thể khởi tạo Canvas context.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(objectUrl);

  const thumbnail = canvas.toDataURL('image/jpeg', 0.65);
  let metadata: AdminMetadata = { confidenceScore: 0 };

  const tesseractLang = options.ocrLanguage === 'vie+eng'
    ? 'vie+eng'
    : options.ocrLanguage === 'eng'
    ? 'eng'
    : 'vie';

  // 1. Tiền xử lý canvas toàn trang: Khử dấu mộc đỏ đè chữ, tẩy trắng nền scan, làm đậm nét chữ tiếng Việt
  const enhancedCanvas = enhanceFullPageCanvasForScanOCR(canvas);

  // 2. If Prioritize Administrative Metadata is ON, run targeted crop on top 28%
  if (options.prioritizeAdminMetadata) {
    onProgress({ stage: 'Đang nhận dạng vùng số hiệu & cơ quan ban hành...', percent: 25 });
    try {
      const headerCanvas = cropHeaderCanvas(enhancedCanvas, 0.28);
      const headerWorker = await createWorker(tesseractLang, 1);
      const headerResult = await headerWorker.recognize(headerCanvas);
      await headerWorker.terminate();

      const headerMeta = extractVietnameseAdminMetadata(headerResult.data.text, true);
      if ((headerMeta.confidenceScore || 0) > 0) {
        metadata = headerMeta;
      }
    } catch (err) {
      console.warn('Targeted image header OCR warning:', err);
    }
  }

  // 3. Full image OCR trên enhancedCanvas
  onProgress({ stage: 'Đang OCR toàn bộ ảnh scan bằng Tesseract nâng cao...', percent: 45 });
  const worker = await createWorker(tesseractLang, 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && m.progress !== undefined) {
        const ocrProg = Math.round(m.progress * 100);
        onProgress({
          stage: `Đang nhận diện chữ trong ảnh scan (${ocrProg}%)...`,
          percent: 45 + Math.round(ocrProg * 0.45),
          ocrProgress: ocrProg
        });
      }
    }
  });

  const fullResult = await worker.recognize(enhancedCanvas);
  await worker.terminate();

  const rawText = fullResult.data.text;

  // Cấu trúc hóa text OCR thô thành Markdown hoàn chỉnh (tiêu đề, căn cứ, điều khoản, bảng biểu, chữ ký)
  const structuredMarkdown = structureScannedOCRToMarkdown(rawText);

  // Enhance metadata if not already confident
  if ((metadata.confidenceScore || 0) < 50) {
    const fullMeta = extractVietnameseAdminMetadata(rawText, false);
    if ((fullMeta.confidenceScore || 0) > (metadata.confidenceScore || 0)) {
      metadata = { ...metadata, ...fullMeta };
    }
  }

  onProgress({ stage: 'Hoàn tất OCR ảnh scan.', percent: 100 });

  return {
    markdown: structuredMarkdown || rawText.trim(),
    metadata,
    thumbnail
  };
}
