import React, { useState, useMemo } from 'react';
import {
  X,
  Clock,
  FileText,
  Trash2,
  Download,
  Copy,
  Check,
  ExternalLink,
  Search,
  CheckSquare,
  Square,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';
import { HistoryRecord } from '../types';
import { downloadMarkdownFile } from '../utils/zipExport';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: HistoryRecord[];
  onSelectRecord: (record: HistoryRecord) => void;
  onDeleteRecord: (id: string) => void;
  onDeleteMultipleRecords: (ids: string[]) => void;
  onClearHistory: () => void;
}

/**
 * Remove Vietnamese accents for fast fuzzy search
 */
function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  records,
  onSelectRecord,
  onDeleteRecord,
  onDeleteMultipleRecords,
  onClearHistory
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Trigger floating toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Filter records based on search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;

    const normalizedQuery = removeVietnameseTones(searchQuery.trim());
    const rawQuery = searchQuery.trim().toLowerCase();

    return records.filter((rec) => {
      // 1. File name
      if (rec.name.toLowerCase().includes(rawQuery) || removeVietnameseTones(rec.name).includes(normalizedQuery)) {
        return true;
      }

      // 2. Document Number
      if (rec.metadata?.documentNumber) {
        const docNum = rec.metadata.documentNumber.toLowerCase();
        if (docNum.includes(rawQuery) || removeVietnameseTones(docNum).includes(normalizedQuery)) {
          return true;
        }
      }

      // 3. Issuing / Parent Agency
      if (rec.metadata?.issuingAgency && (rec.metadata.issuingAgency.toLowerCase().includes(rawQuery) || removeVietnameseTones(rec.metadata.issuingAgency).includes(normalizedQuery))) {
        return true;
      }
      if (rec.metadata?.parentAgency && (rec.metadata.parentAgency.toLowerCase().includes(rawQuery) || removeVietnameseTones(rec.metadata.parentAgency).includes(normalizedQuery))) {
        return true;
      }

      // 4. Issue Date & Location
      if (rec.metadata?.issueDate && rec.metadata.issueDate.includes(rawQuery)) {
        return true;
      }
      if (rec.metadata?.location && (rec.metadata.location.toLowerCase().includes(rawQuery) || removeVietnameseTones(rec.metadata.location).includes(normalizedQuery))) {
        return true;
      }

      // 5. Title / Subject
      if (rec.metadata?.titleSubject && (rec.metadata.titleSubject.toLowerCase().includes(rawQuery) || removeVietnameseTones(rec.metadata.titleSubject).includes(normalizedQuery))) {
        return true;
      }

      // 6. Signer
      if (rec.metadata?.signer && (rec.metadata.signer.toLowerCase().includes(rawQuery) || removeVietnameseTones(rec.metadata.signer).includes(normalizedQuery))) {
        return true;
      }

      // 7. Full Markdown content
      if (rec.markdownOutput) {
        if (rec.markdownOutput.toLowerCase().includes(rawQuery) || removeVietnameseTones(rec.markdownOutput).includes(normalizedQuery)) {
          return true;
        }
      }

      return false;
    });
  }, [records, searchQuery]);

  if (!isOpen) return null;

  // Copy full markdown output of a single document
  const handleCopyFullMarkdown = (id: string, markdownText: string, docName: string) => {
    navigator.clipboard.writeText(markdownText);
    setCopiedId(id);
    showToast(`Đã sao chép toàn bộ Markdown của "${docName}"!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle selection for a single record
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all or deselect all
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length && filteredRecords.length > 0) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all visible filtered records
      setSelectedIds(new Set(filteredRecords.map((r) => r.id)));
    }
  };

  // Execute batch delete of selected documents
  const handleConfirmBatchDelete = () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0) return;

    onDeleteMultipleRecords(idsToDelete);
    setSelectedIds(new Set());
    setShowBatchDeleteConfirm(false);
    showToast(`Đã xóa thành công ${idsToDelete.length} tài liệu khỏi lịch sử!`);
  };

  // Copy merged markdown of all selected records
  const handleCopySelectedBatch = () => {
    const selectedRecords = records.filter((r) => selectedIds.has(r.id));
    if (selectedRecords.length === 0) return;

    const combined = selectedRecords
      .map((r) => `# ${r.name}\n\n${r.markdownOutput}`)
      .join('\n\n---\n\n');

    navigator.clipboard.writeText(combined);
    setCopiedBatch(true);
    showToast(`Đã sao chép toàn bộ nội dung của ${selectedRecords.length} tài liệu đã chọn!`);
    setTimeout(() => setCopiedBatch(false), 2000);
  };

  const isAllSelected = filteredRecords.length > 0 && selectedIds.size === filteredRecords.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < filteredRecords.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-semibold text-xs sm:text-sm shadow-xl flex items-center gap-2 animate-in slide-in-from-top-2 duration-150">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Lịch sử chuyển đổi văn bản
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 font-mono font-medium">
                  {records.length}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Lưu trữ tạm thời an toàn trong bộ nhớ máy cục bộ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {records.length > 0 && (
              <button
                onClick={onClearHistory}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition cursor-pointer"
                title="Xóa toàn bộ lịch sử"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xóa toàn bộ</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar & Filter Controls */}
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên file, số hiệu công văn, cơ quan, ngày tháng, nội dung..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => {
              // Trigger explicit search visual / refocus
              const inputEl = document.querySelector('input[placeholder*="Tìm theo tên file"]') as HTMLInputElement;
              if (inputEl) inputEl.focus();
            }}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 border border-cyan-500/30 transition cursor-pointer flex-shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Tìm kiếm</span>
          </button>
        </div>

        {/* Batch Selection Toolbar (When 1 or more documents are selected) */}
        {selectedIds.size > 0 && (
          <div className="px-5 py-2.5 bg-cyan-950/40 border-b border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-bold text-cyan-200">
                Đã tích chọn: {selectedIds.size} / {filteredRecords.length} tài liệu
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySelectedBatch}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition cursor-pointer"
                title="Sao chép toàn bộ Markdown các mục đã chọn"
              >
                {copiedBatch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBatch ? 'Đã copy!' : 'Sao chép mục đã chọn'}</span>
              </button>

              <button
                onClick={() => setShowBatchDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 transition cursor-pointer"
                title="Xóa đồng loạt các tài liệu đã chọn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa {selectedIds.size} mục đã chọn</span>
              </button>

              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:underline transition cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        {/* Batch Delete Confirmation Sub-banner */}
        {showBatchDeleteConfirm && (
          <div className="px-5 py-3 bg-red-950/60 border-b border-red-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>
                Bạn có chắc chắn muốn xóa vĩnh viễn <strong>{selectedIds.size} tài liệu</strong> này khỏi lịch sử không?
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleConfirmBatchDelete}
                className="px-3 py-1 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-md transition cursor-pointer"
              >
                Xác nhận xóa
              </button>
              <button
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* Select All Row */}
        {filteredRecords.length > 0 && (
          <div className="px-5 py-2 bg-slate-950/50 border-b border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <button
              onClick={handleToggleSelectAll}
              className="flex items-center gap-2 hover:text-cyan-300 transition cursor-pointer select-none"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-cyan-400" />
              ) : isPartiallySelected ? (
                <CheckSquare className="w-4 h-4 text-cyan-400/60" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span className="font-medium">
                {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả tài liệu'}
              </span>
            </button>

            <span className="text-[11px] font-mono text-slate-500">
              {searchQuery.trim()
                ? `Tìm thấy ${filteredRecords.length} / ${records.length} văn bản`
                : `Tổng cộng ${records.length} văn bản`}
            </span>
          </div>
        )}

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {records.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30 text-cyan-400" />
              <p className="font-semibold text-slate-400">Chưa có lịch sử chuyển đổi nào.</p>
              <p className="text-xs mt-1 text-slate-600 max-w-sm mx-auto">
                Khi bạn chuyển đổi các file công văn, quyết định, kế hoạch... tài liệu sẽ tự động lưu lại ở đây để tiện xem lại và sao chép.
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
              <p className="font-semibold text-slate-400">
                Không tìm thấy tài liệu phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-cyan-400 hover:bg-slate-700 transition cursor-pointer"
              >
                Xóa bộ lọc tìm kiếm
              </button>
            </div>
          ) : (
            filteredRecords.map((rec) => {
              const isSelected = selectedIds.has(rec.id);
              const isCopied = copiedId === rec.id;

              return (
                <div
                  key={rec.id}
                  className={`group rounded-xl border transition-all flex items-start justify-between gap-3 p-3.5 ${
                    isSelected
                      ? 'border-cyan-500/70 bg-cyan-950/20 shadow-md shadow-cyan-950/30'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950/90'
                  }`}
                >
                  {/* Checkbox for Batch Selection */}
                  <div className="pt-0.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(rec.id)}
                      className="p-1 -m-1 text-slate-400 hover:text-cyan-400 transition cursor-pointer"
                      title={isSelected ? 'Bỏ chọn' : 'Tích chọn để xử lý hàng loạt'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                      )}
                    </button>
                  </div>

                  {/* Document Information */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="font-bold text-xs sm:text-sm text-slate-200 truncate max-w-md">
                        {rec.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono font-medium">
                        {rec.type.toUpperCase()}
                      </span>
                    </div>

                    {/* Metadata Preview (Decree 30 / Header Line 3 specs) */}
                    {rec.metadata && (rec.metadata.documentNumber || rec.metadata.issueDate || rec.metadata.issuingAgency) && (
                      <div className="mt-1.5 flex flex-wrap gap-2 text-[11px]">
                        {rec.metadata.issuingAgency && (
                          <span className="text-amber-300 font-medium truncate max-w-[220px]">
                            {rec.metadata.issuingAgency}
                          </span>
                        )}
                        {rec.metadata.documentNumber && (
                          <span className="text-cyan-300 font-mono font-semibold bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-800/40">
                            Số: {rec.metadata.documentNumber}
                          </span>
                        )}
                        {rec.metadata.issueDate && (
                          <span className="text-slate-300">
                            Ngày: {rec.metadata.location ? `${rec.metadata.location}, ` : ''}{rec.metadata.issueDate}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Subject / Title snippet if available */}
                    {rec.metadata?.titleSubject && (
                      <p className="mt-1 text-[11px] text-slate-400 line-clamp-1 italic">
                        {rec.metadata.titleSubject}
                      </p>
                    )}

                    <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-500">
                      <span>{new Date(rec.createdAt).toLocaleString('vi-VN')}</span>
                      <span>•</span>
                      <span>{rec.markdownOutput ? `${rec.markdownOutput.length.toLocaleString()} ký tự` : '0 ký tự'}</span>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Open Document Button */}
                    <button
                      onClick={() => {
                        onSelectRecord(rec);
                        onClose();
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 border border-cyan-500/30 transition cursor-pointer"
                      title="Mở xem và chỉnh sửa trực tiếp"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở</span>
                    </button>

                    {/* Copy Full Markdown Button (UPGRADED: Always copies full 100% markdown) */}
                    <button
                      onClick={() => handleCopyFullMarkdown(rec.id, rec.markdownOutput, rec.name)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                          : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border-slate-700'
                      }`}
                      title="Sao chép toàn bộ nội dung Markdown của văn bản này"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[11px] font-bold">Đã copy!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="hidden sm:inline text-[11px]">Copy toàn bộ</span>
                        </>
                      )}
                    </button>

                    {/* Download Single .md */}
                    <button
                      onClick={() => downloadMarkdownFile(rec.name, rec.markdownOutput)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      title="Tải file .md về máy tính"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Individual Record */}
                    <button
                      onClick={() => onDeleteRecord(rec.id)}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                      title="Xóa văn bản này khỏi lịch sử"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
