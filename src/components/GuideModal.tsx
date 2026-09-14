import React from 'react';
import { X, HelpCircle, ShieldCheck, FileCheck, Sparkles, CheckCircle, Lock, Cpu, Bot } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl max-h-[88vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Hướng dẫn sử dụng & Cam kết bảo mật
              </h3>
              <p className="text-xs text-slate-400">
                Tối ưu chuyển đổi tài liệu hành chính Việt Nam sang Markdown cho AI
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300">
          {/* Section 1: Privacy guarantee */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-300 text-sm">
                Cam kết bảo mật 100% Offline tuyệt đối
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Ứng dụng hoạt động <strong>hoàn toàn trong trình duyệt (Client-side)</strong> bằng WebAssembly và Web Workers. File của bạn không bao giờ được tải lên bất kỳ máy chủ nào. Không có API trung gian, không thu thập dữ liệu phân tích, đảm bảo an toàn tuyệt đối cho hồ sơ tài liệu cơ quan, doanh nghiệp.
              </p>
            </div>
          </div>

          {/* Section 2: Administrative Extraction Features */}
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              1. Trích xuất số văn bản & ngày ban hành hành chính
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300 pl-4 list-disc">
              <li>
                <strong>Cắt và zoom vùng tiêu đề (Header 25%):</strong> Tự động tăng độ tương phản vùng góc trên văn bản để bắt chính xác các mẫu số hiệu: <code className="text-cyan-300">123/QĐ-UBND</code>, <code className="text-cyan-300">456/TTg</code>, <code className="text-cyan-300">789/BC-STNMT</code>, <code className="text-cyan-300">12/2024/NĐ-CP</code>.
              </li>
              <li>
                <strong>Nhận diện ngày tháng chuẩn:</strong> Tự động bóc tách dạng <code className="text-amber-300">ngày 14 tháng 9 năm 2026</code> hoặc <code className="text-amber-300">14/09/2026</code> kèm địa danh ban hành (Hà Nội, TP.HCM, tỉnh thành).
              </li>
              <li>
                <strong>Phát hiện cơ quan ban hành:</strong> Nhận diện các cấp UBND, Bộ, Sở, Ban ngành, Đảng ủy, Doanh nghiệp.
              </li>
              <li>
                <strong>PDF ký số:</strong> Tự động bóc tách thông tin chứng thư số và người ký điện tử.
              </li>
            </ul>
          </div>

          {/* Section 3: Supported Formats */}
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2 mb-2">
              <FileCheck className="w-4 h-4 text-blue-400" />
              2. Các định dạng được hỗ trợ
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-slate-200 block">PDF (Scan & Ký số):</span>
                <span className="text-slate-400 text-[11px]">Trích xuất lớp text số hoặc chạy OCR Tesseract cho văn bản scan ảnh.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-slate-200 block">Word (.docx):</span>
                <span className="text-slate-400 text-[11px]">Giữ nguyên heading, danh sách, in đậm/nghiêng và bảng biểu.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-slate-200 block">Excel & CSV (.xlsx, .xls):</span>
                <span className="text-slate-400 text-[11px]">Chuyển đổi từng sheet thành Markdown Table hoàn chỉnh.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-slate-200 block">Hình ảnh (JPG, PNG, WebP...):</span>
                <span className="text-slate-400 text-[11px]">OCR tiếng Việt chính xác cao, bóc tách chữ từ ảnh chụp scan.</span>
              </div>
            </div>
          </div>

          {/* Section 4: AI Ingestion */}
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-purple-400" />
              3. Tối ưu làm đầu vào cho ChatGPT, Claude, Gemini
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              File Markdown xuất ra được trang bị <strong>YAML Frontmatter</strong> ở đầu trang chứa thông tin số hiệu, ngày ban hành và nguồn gốc. Các mô hình LLM khi đọc file này sẽ hiểu ngay ngữ cảnh tài liệu pháp lý và trả lời chính xác các câu hỏi tra cứu mà không bị ảo giác (hallucination).
            </p>
          </div>

          {/* Section 5: Batch & Export */}
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              4. Xử lý hàng loạt & Xuất file
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có thể kéo thả 10-20 file cùng lúc. Sau khi xử lý, nhấn nút <strong>"Tải gói ZIP"</strong> để tải về toàn bộ file Markdown độc lập, hoặc nhấn <strong>"Gộp 1 file .md"</strong> để có một tài liệu tổng hợp duy nhất có kèm mục lục.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition"
          >
            Đã hiểu, bắt đầu sử dụng
          </button>
        </div>
      </div>
    </div>
  );
};
