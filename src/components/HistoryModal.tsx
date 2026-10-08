import React from 'react';
import { X, Clock, FileText, Trash2, Download, Copy, Check, ExternalLink } from 'lucide-react';
import { HistoryRecord } from '../types';
import { downloadMarkdownFile } from '../utils/zipExport';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: HistoryRecord[];
  onSelectRecord: (record: HistoryRecord) => void;
  onDeleteRecord: (id: string) => void;
  onClearHistory: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  records,
  onSelectRecord,
  onDeleteRecord,
  onClearHistory
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">
              Lịch sử chuyển đổi gần đây ({records.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {records.length > 0 && (
              <button
                onClick={onClearHistory}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition"
                title="Xóa toàn bộ lịch sử"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa toàn bộ</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {records.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Chưa có lịch sử chuyển đổi nào.</p>
              <p className="text-xs mt-1 text-slate-600">
                Các file bạn xử lý sẽ lưu tạm trong bộ nhớ trình duyệt máy này.
              </p>
            </div>
          ) : (
            records.map((rec) => (
              <div
                key={rec.id}
                className="group rounded-xl border border-slate-800 bg-slate-950/60 hover:border-cyan-500/50 p-3.5 transition flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="font-semibold text-xs sm:text-sm text-slate-200 truncate">
                      {rec.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                      {rec.type.toUpperCase()}
                    </span>
                  </div>

                  {/* Metadata preview */}
                  {rec.metadata && (rec.metadata.documentNumber || rec.metadata.issueDate || rec.metadata.issuingAgency) && (
                    <div className="mt-1.5 flex flex-wrap gap-2 text-[11px]">
                      {rec.metadata.issuingAgency && (
                        <span className="text-amber-300 font-medium truncate max-w-[200px]">
                          {rec.metadata.issuingAgency}
                        </span>
                      )}
                      {rec.metadata.documentNumber && (
                        <span className="text-cyan-300 font-mono">
                          Số: {rec.metadata.documentNumber}
                        </span>
                      )}
                      {rec.metadata.issueDate && (
                        <span className="text-slate-400">
                          Ngày: {rec.metadata.issueDate}
                        </span>
                      )}
                    </div>
                  )}

                  <span className="mt-1 text-[10px] text-slate-500 block">
                    {new Date(rec.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => {
                      onSelectRecord(rec);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 border border-cyan-500/30 transition"
                    title="Mở xem lại kết quả"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở</span>
                  </button>

                  <button
                    onClick={() => handleCopy(rec.id, rec.markdownOutput)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Sao chép Markdown"
                  >
                    {copiedId === rec.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => downloadMarkdownFile(rec.name, rec.markdownOutput)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Tải file .md"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete individual record */}
                  <button
                    onClick={() => onDeleteRecord(rec.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                    title="Xóa văn bản này khỏi lịch sử"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
