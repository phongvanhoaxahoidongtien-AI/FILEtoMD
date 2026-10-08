import React, { useRef, useState } from 'react';
import { UploadCloud, FileType, CheckCircle2, Shield, Zap, Sparkles, Plus } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSample: () => void;
  isProcessing: boolean;
  hasDocuments?: boolean;
}

const SUPPORTED_EXTS = [
  { label: 'PDF ký số & scan', ext: '.pdf', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { label: 'Word (DOCX)', ext: '.docx,.doc', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { label: 'Excel (XLSX, CSV)', ext: '.xlsx,.xls,.csv', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { label: 'PowerPoint (PPTX)', ext: '.pptx,.ppt', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { label: 'Ảnh (JPG, PNG...)', ext: '.jpg,.jpeg,.png,.webp,.tiff,.bmp', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { label: 'HTML, TXT, MD', ext: '.html,.txt,.md', color: 'text-slate-300 bg-slate-500/10 border-slate-500/20' },
];

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  onLoadSample,
  isProcessing,
  hasDocuments = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelected(filesArray);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
      e.target.value = ''; // Reset input to allow re-selection
    }
  };

  // Compact Strip View when documents are already present
  // Keeps FileList completely visible without scrolling
  if (hasDocuments) {
    return (
      <div className="w-full">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp,.tiff,.bmp,.html,.txt,.md"
          onChange={handleFileChange}
        />

        <div
          id="dropzone-area"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative group cursor-pointer rounded-xl border border-dashed transition-all duration-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-500/10 scale-[1.003]'
              : 'border-slate-700/80 hover:border-cyan-500/60 bg-slate-900/50 hover:bg-slate-900/80'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center flex-shrink-0 group-hover:border-cyan-500/40">
              <UploadCloud className={`w-5 h-5 ${isDragOver ? 'text-cyan-400 animate-bounce' : 'text-cyan-300'}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
                Kéo thả thêm tài liệu vào đây hoặc{' '}
                <span className="text-cyan-400 underline decoration-cyan-500/40 hover:decoration-cyan-400">
                  Chọn file từ máy
                </span>
              </p>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate">
                Hỗ trợ PDF ký số, Word, Excel, PowerPoint, Ảnh scan OCR, TXT • Client-Side 100%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm file</span>
            </button>

            <button
              type="button"
              onClick={onLoadSample}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-all cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">Thêm mẫu</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Streamlined, compact DropZone for empty state
  return (
    <div className="w-full">
      <div
        id="dropzone-area"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 px-6 py-5 sm:px-8 sm:py-6 text-center overflow-hidden ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-950/25 shadow-2xl shadow-cyan-500/10 scale-[1.005]'
            : 'border-slate-700/80 hover:border-cyan-500/60 bg-slate-900/40 hover:bg-slate-900/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp,.tiff,.bmp,.html,.txt,.md"
          onChange={handleFileChange}
        />

        {/* Ambient background glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-32 bg-gradient-to-b from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center max-w-xl mx-auto">
          {/* Main Icon - compact */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 mb-2.5 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/70 flex items-center justify-center shadow-lg group-hover:scale-105 group-hover:border-cyan-500/40 transition-transform">
            <UploadCloud className={`w-6 h-6 sm:w-7 sm:h-7 ${isDragOver ? 'text-cyan-400 animate-bounce' : 'text-slate-300 group-hover:text-cyan-300 transition-colors'}`} />
          </div>

          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Kéo thả toàn bộ tài liệu vào đây hoặc{' '}
            <span className="text-cyan-400 underline decoration-cyan-500/40 underline-offset-4 group-hover:decoration-cyan-400">
              Chọn file từ máy
            </span>
          </h2>

          <p className="mt-1 text-xs text-slate-400 leading-relaxed max-w-md">
            Hỗ trợ kéo thả đồng thời nhiều file • Tự động nhận diện OCR tiếng Việt & trích xuất số hiệu (Số: .../QĐ-UBND, ngày... tháng... năm) sang Markdown chuẩn AI
          </p>

          {/* Action buttons */}
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-600/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              Chọn file từ máy
            </button>

            <button
              type="button"
              onClick={onLoadSample}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium text-xs sm:text-sm text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-cyan-500/40 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Dùng thử mẫu văn bản hành chính
            </button>
          </div>

          {/* Supported Format Pills - compact */}
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5">
            {SUPPORTED_EXTS.map((item, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium border ${item.color}`}
              >
                <FileType className="w-2.5 h-2.5 opacity-70" />
                {item.label}
              </span>
            ))}
          </div>

          {/* Security Guarantee callout - concise */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10.5px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <Shield className="w-3 h-3" />
              100% Client-Side In-Memory
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              Không gửi dữ liệu ra ngoài
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Tối ưu cho LLM & AI
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
