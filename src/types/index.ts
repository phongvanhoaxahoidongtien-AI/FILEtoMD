export type SupportedFileType =
  | 'pdf'
  | 'docx'
  | 'doc'
  | 'pptx'
  | 'ppt'
  | 'xlsx'
  | 'xls'
  | 'csv'
  | 'image'
  | 'html'
  | 'txt'
  | 'md';

export type FileProcessingStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'error';

export interface AdminMetadata {
  documentNumber?: string;       // e.g. "123/QĐ-UBND", "456/TTg", "789/BC-..."
  issueDate?: string;            // e.g. "14/09/2026", "14/9/2026"
  issuingAgency?: string;        // e.g. "UBND Tỉnh...", "Bộ Thông tin và Truyền thông"
  parentAgency?: string;         // e.g. "UBND TỈNH QUẢNG NINH" (above department)
  titleSubject?: string;         // e.g. "V/v phê duyệt đề án chuyển đổi số..."
  signDate?: string;             // e.g. digital signature timestamp if present
  signer?: string;               // e.g. "Chủ tịch", "Nguyễn Văn A"
  location?: string;             // e.g. "Hà Nội", "TP. Hồ Chí Minh"
  confidenceScore?: number;      // 0 - 100%
  extractedFromZone?: 'header' | 'text-layer' | 'ocr-full' | 'ocr-header';
}

export interface ProcessingProgress {
  stage: string;                 // e.g. "Đang đọc trang 1/5...", "Đang OCR vùng tiêu đề..."
  percent: number;               // 0 - 100
  currentPage?: number;
  totalPages?: number;
  ocrProgress?: number;          // 0 - 100 for current page OCR
}

export interface DocumentItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: SupportedFileType;
  status: FileProcessingStatus;
  progress: ProcessingProgress;
  metadata: AdminMetadata;
  markdownOutput: string;
  rawText?: string;
  error?: string;
  previewThumbnails?: string[];   // base64/object URLs of pages
  executionTimeMs?: number;
  createdAt: number;
}

export interface ConversionOptions {
  ocrLanguage: 'vie' | 'eng' | 'vie+eng';
  resolutionMode: 'fast' | 'balanced' | 'high'; // fast=1.5x, balanced=2.0x, high=2.5x scale
  prioritizeAdminMetadata: boolean;             // Crop top 22% of page 1 with contrast thresholding
  removeHeaderFooterRepeat: boolean;            // Detect and remove recurring running headers/footers
  extractTables: boolean;                       // Structure tabular data into Markdown tables
  addAIPromptHeader: boolean;                   // Include YAML frontmatter and AI instruction banner
  preserveImagesAsBase64: boolean;              // Include small images in markdown
  cleanOCRNoise: boolean;                       // Strip OCR artifacts and erroneous glyphs
}

export interface HistoryRecord {
  id: string;
  name: string;
  size: number;
  type: SupportedFileType;
  metadata: AdminMetadata;
  markdownOutput: string;
  createdAt: number;
}
