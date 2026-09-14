import React, { useRef, useState } from 'react';
import { UploadCloud, FileType, CheckCircle2, Shield, Zap, Sparkles } from 'lucide-react';
import { detectFileType } from '../utils/documentConverter';
import { DocumentItem } from '../types';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSample: () => void;
  isProcessing: boolean;
}

const SUPPORTED_EXTS = [
  { label: 'PDF ký số & scan', ext: '.pdf', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { label: 'Word (DOCX)', ext: '.docx,.doc', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { label: 'Excel (XLSX, CSV)', ext: '.xlsx,.xls,.csv', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { label: 'PowerPoint (PPTX)', ext: '.pptx,.ppt', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { label: 'Ảnh (JPG, PNG, WebP...)', ext: '.jpg,.jpeg,.png,.webp,.tiff,.bmp', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { label: 'HTML, TXT, MD', ext: '.html,.txt,.md', color: 'text-slate-300 bg-slate-500/10 border-slate-500/20' },
];

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  onLoadSample,
  isProcessing
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

  return (
    <div className="w-full">
      <div
        id="dropzone-area"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-8 sm:p-12 text-center overflow-hidden ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-950/20 shadow-2xl shadow-cyan-500/10 scale-[1.005]'
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
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-40 bg-gradient-to-b from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center max-w-xl mx-auto">
          {/* Main Icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900/90 border border-slate-700/70 flex items-center justify-center shadow-xl group-hover:scale-105 group-hover:border-cyan-500/40 transition-transform">
            <UploadCloud className={`w-8 h-8 sm:w-10 sm:h-10 ${isDragOver ? 'text-cyan-400 animate-bounce' : 'text-slate-300 group-hover:text-cyan-300 transition-colors'}`} />
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Kéo thả tài liệu vào đây hoặc{' '}
            <span className="text-cyan-400 underline decoration-cyan-500/40 underline-offset-4 group-hover:decoration-cyan-400">
              Chọn file từ máy
            </span>
          </h2>

          <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
            Hỗ trợ kéo thả đồng thời nhiều file (batch) • Tự động nhận diện OCR tiếng Việt • Trích xuất số hiệu, ngày ban hành và bảng biểu sang Markdown chuẩn
          </p>

          {/* Button in center */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-600/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              Chọn file từ máy
            </button>

            <button
              type="button"
              onClick={onLoadSample}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-cyan-500/40 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Dùng thử mẫu văn bản hành chính
            </button>
          </div>

          {/* Supported Format Pills */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {SUPPORTED_EXTS.map((item, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border ${item.color}`}
              >
                <FileType className="w-3 h-3 opacity-70" />
                {item.label}
              </span>
            ))}
          </div>

          {/* Security Guarantee callout */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <Shield className="w-3.5 h-3.5" />
              100% Client-Side In-Memory
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              Không gửi dữ liệu ra ngoài
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Tối ưu trực tiếp cho LLM & AI
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
