import { ConversionOptions, DocumentItem, SupportedFileType } from '../types';
import { formatDocumentToMarkdown } from './markdownPostProcessor';
import { parsePDFDocument } from './parsers/pdfParser';
import { parseDocxDocument } from './parsers/docxParser';
import { parsePPTXDocument } from './parsers/pptxParser';
import { parseXLSXDocument } from './parsers/xlsxParser';
import { parseImageDocument } from './parsers/imageParser';
import { parseHTMLDocument } from './parsers/htmlParser';
import { parseTXTDocument } from './parsers/txtParser';

export function detectFileType(file: File): SupportedFileType {
  const name = file.name.toLowerCase();
  const ext = name.split('.').pop() || '';

  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (ext === 'doc') return 'doc';
  if (ext === 'pptx') return 'pptx';
  if (ext === 'ppt') return 'ppt';
  if (ext === 'xlsx') return 'xlsx';
  if (ext === 'xls') return 'xls';
  if (ext === 'csv') return 'csv';
  if (['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp'].includes(ext)) return 'image';
  if (['html', 'htm'].includes(ext)) return 'html';
  if (ext === 'txt') return 'txt';
  if (ext === 'md') return 'md';

  // Fallback by mime type
  if (file.type.includes('pdf')) return 'pdf';
  if (file.type.includes('image')) return 'image';
  if (file.type.includes('word') || file.type.includes('officedocument.wordprocessingml')) return 'docx';
  if (file.type.includes('sheet') || file.type.includes('officedocument.spreadsheetml') || file.type.includes('csv')) return 'xlsx';
  if (file.type.includes('presentation') || file.type.includes('officedocument.presentationml')) return 'pptx';

  return 'txt';
}

export async function processDocument(
  doc: DocumentItem,
  options: ConversionOptions,
  onProgress: (progress: DocumentItem['progress']) => void
): Promise<DocumentItem> {
  const startTime = performance.now();
  const fileType = doc.type;

  try {
    let rawMarkdown = '';
    let metadata = doc.metadata;
    let thumbnails: string[] = [];
    let totalPages: number | undefined = undefined;

    switch (fileType) {
      case 'pdf': {
        const result = await parsePDFDocument(doc.file, options, onProgress);
        rawMarkdown = result.markdown;
        metadata = result.metadata;
        thumbnails = result.thumbnails;
        totalPages = result.totalPages;
        break;
      }
      case 'docx':
      case 'doc': {
        onProgress({ stage: 'Đang trích xuất cấu trúc văn bản Word...', percent: 25 });
        const result = await parseDocxDocument(doc.file);
        rawMarkdown = result.markdown;
        metadata = result.metadata;
        break;
      }
      case 'pptx':
      case 'ppt': {
        onProgress({ stage: 'Đang đọc các trang trình chiếu PPTX...', percent: 25 });
        const result = await parsePPTXDocument(doc.file);
        rawMarkdown = result.markdown;
        metadata = result.metadata;
        totalPages = result.totalSlides;
        break;
      }
      case 'xlsx':
      case 'xls':
      case 'csv': {
        onProgress({ stage: 'Đang đọc bảng dữ liệu và cấu trúc hàng cột...', percent: 25 });
        const result = await parseXLSXDocument(doc.file);
        rawMarkdown = result.markdown;
        metadata = result.metadata;
        break;
      }
      case 'image': {
        onProgress({ stage: 'Đang nạp hình ảnh và nhận diện OCR...', percent: 15 });
        const result = await parseImageDocument(doc.file, options, onProgress);
        rawMarkdown = result.markdown;
        metadata = result.metadata;
        if (result.thumbnail) thumbnails = [result.thumbnail];
        break;
      }
      case 'html': {
        onProgress({ stage: 'Đang phân tích cú pháp HTML và chuyển đổi cấu trúc...', percent: 50 });
        const result = await parseHTMLDocument(doc.file);
        rawMarkdown = result.markdown;
        metadata = result.metadata;
        break;
      }
      case 'txt':
      case 'md': {
        onProgress({ stage: 'Đang dọn dẹp ký tự thừa và phân tích tiêu đề...', percent: 50 });
        const result = await parseTXTDocument(doc.file);
        rawMarkdown = result.markdown;
        metadata = result.metadata;
        break;
      }
      default:
        throw new Error(`Định dạng không được hỗ trợ: ${fileType}`);
    }

    onProgress({ stage: 'Đang tạo frontmatter và chuẩn hóa văn bản...', percent: 96 });

    // Format with YAML frontmatter and administrative headers
    const finalMarkdown = formatDocumentToMarkdown(
      rawMarkdown,
      doc.name,
      fileType,
      metadata,
      options,
      totalPages
    );

    const executionTimeMs = Math.round(performance.now() - startTime);

    return {
      ...doc,
      status: 'completed',
      progress: { stage: 'Hoàn thành 100%', percent: 100, totalPages },
      metadata,
      markdownOutput: finalMarkdown,
      previewThumbnails: thumbnails,
      executionTimeMs
    };
  } catch (err: any) {
    console.error('Error converting document:', err);
    return {
      ...doc,
      status: 'error',
      error: err?.message || 'Có lỗi xảy ra trong quá trình chuyển đổi',
      progress: { stage: 'Thất bại', percent: 0 }
    };
  }
}
