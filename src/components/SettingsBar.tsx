import React, { useState } from 'react';
import { Sliders, Languages, Gauge, Sparkles, FileSpreadsheet, Eye, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { ConversionOptions } from '../types';

interface SettingsBarProps {
  options: ConversionOptions;
  onOptionsChange: (newOptions: ConversionOptions) => void;
  disabled?: boolean;
}

export const SettingsBar: React.FC<SettingsBarProps> = ({
  options,
  onOptionsChange,
  disabled = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const update = <K extends keyof ConversionOptions>(key: K, value: ConversionOptions[K]) => {
    onOptionsChange({
      ...options,
      [key]: value
    });
  };

  return (
    <div className="w-full rounded-xl bg-slate-900/70 border border-slate-800 p-3.5 sm:p-4 transition-all">
      {/* Quick compact bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Sliders className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-200">
            Cấu hình chuyển đổi & OCR
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* OCR Language Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-300">
            <Languages className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline text-slate-400">Ngôn ngữ:</span>
            <select
              disabled={disabled}
              value={options.ocrLanguage}
              onChange={(e) => update('ocrLanguage', e.target.value as any)}
              className="bg-transparent text-white font-medium text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="vie" className="bg-slate-900 text-white">Tiếng Việt (vie)</option>
              <option value="vie+eng" className="bg-slate-900 text-white">Song ngữ (vi + en)</option>
              <option value="eng" className="bg-slate-900 text-white">Tiếng Anh (eng)</option>
            </select>
          </div>

          {/* Resolution mode */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-300">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-slate-400">Độ phân giải:</span>
            <select
              disabled={disabled}
              value={options.resolutionMode}
              onChange={(e) => update('resolutionMode', e.target.value as any)}
              className="bg-transparent text-white font-medium text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="fast" className="bg-slate-900 text-white">Nhanh (1.5x)</option>
              <option value="balanced" className="bg-slate-900 text-white">Cân bằng (2.0x)</option>
              <option value="high" className="bg-slate-900 text-white">Chính xác cao (2.5x)</option>
            </select>
          </div>

          {/* Expand toggles button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition-colors"
          >
            <span>Tùy chọn nâng cao</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Expanded options drawer */}
      {isExpanded && (
        <div className="mt-4 pt-3.5 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Toggle: Prioritize admin metadata */}
          <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 cursor-pointer transition-colors">
            <input
              type="checkbox"
              disabled={disabled}
              checked={options.prioritizeAdminMetadata}
              onChange={(e) => update('prioritizeAdminMetadata', e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/20 bg-slate-900"
            />
            <div>
              <span className="font-semibold text-slate-200 block flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Ưu tiên số văn bản & ngày
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5 leading-tight">
                Cắt và tăng tương phản vùng tiêu đề 25% đầu trang để bắt chính xác Số: .../QĐ-UBND
              </span>
            </div>
          </label>

          {/* Toggle: Remove header/footer repeat */}
          <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 cursor-pointer transition-colors">
            <input
              type="checkbox"
              disabled={disabled}
              checked={options.removeHeaderFooterRepeat}
              onChange={(e) => update('removeHeaderFooterRepeat', e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/20 bg-slate-900"
            />
            <div>
              <span className="font-semibold text-slate-200 block flex items-center gap-1">
                <Eye className="w-3 h-3 text-blue-400" />
                Lọc Header/Footer lặp
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5 leading-tight">
                Tự động phát hiện và loại bỏ số trang, tiêu đề chạy lặp lại giữa các trang
              </span>
            </div>
          </label>

          {/* Toggle: Filename Header */}
          <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 cursor-pointer transition-colors">
            <input
              type="checkbox"
              disabled={disabled}
              checked={options.addAIPromptHeader}
              onChange={(e) => update('addAIPromptHeader', e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/20 bg-slate-900"
            />
            <div>
              <span className="font-semibold text-slate-200 block flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Tiêu đề tên file (# Tên file)
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5 leading-tight">
                Chỉ để tên file ở đầu và toàn bộ nội dung văn bản (không thêm thông tin rác)
              </span>
            </div>
          </label>

          {/* Toggle: Clean OCR Noise */}
          <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 cursor-pointer transition-colors">
            <input
              type="checkbox"
              disabled={disabled}
              checked={options.cleanOCRNoise}
              onChange={(e) => update('cleanOCRNoise', e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/20 bg-slate-900"
            />
            <div>
              <span className="font-semibold text-slate-200 block flex items-center gap-1">
                <FileSpreadsheet className="w-3 h-3 text-purple-400" />
                Lọc nhiễu ký tự OCR
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5 leading-tight">
                Loại bỏ ký tự rác, chuẩn hóa dấu cách và sửa các lỗi phân đoạn phổ biến
              </span>
            </div>
          </label>
        </div>
      )}
    </div>
  );
};
