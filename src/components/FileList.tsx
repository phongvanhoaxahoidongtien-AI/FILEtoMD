import React from 'react';
import { FileText, CheckCircle, AlertCircle, Loader2, Trash2, Eye, Play, CheckCheck, RefreshCw, Layers } from 'lucide-react';
import { DocumentItem } from '../types';

interface FileListProps {
  documents: DocumentItem[];
  activeDocId: string | null;
  onSelectDoc: (id: string) => void;
  onRemoveDoc: (id: string) => void;
  onStartConversion: () => void;
  onClearAll: () => void;
  onRetryDoc: (id: string) => void;
  isProcessing: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const FileList: React.FC<FileListProps> = ({
  documents,
  activeDocId,
  onSelectDoc,
  onRemoveDoc,
  onStartConversion,
  onClearAll,
  onRetryDoc,
  isProcessing
}) => {
  if (documents.length === 0) return null;

  const completedCount = documents.filter(d => d.status === 'completed').length;
  const idleCount = documents.filter(d => d.status === 'idle').length;
  const errorCount = documents.filter(d => d.status === 'error').length;
  const totalCount = documents.length;

  return (
    <div className="w-full rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-5 shadow-xl">
      {/* Batch Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              Danh sách tài liệu ({totalCount})
            </h3>
            <p className="text-xs text-slate-400">
              {completedCount > 0 && <span className="text-emerald-400 font-medium">Đã xong {completedCount}/{totalCount}</span>}
              {idleCount > 0 && <span> • Chờ xử lý {idleCount}</span>}
              {errorCount > 0 && <span className="text-red-400"> • {errorCount} lỗi</span>}
            </p>
          </div>
        </div>

        {/* Batch action buttons */}
        <div className="flex items-center gap-2">
          {idleCount > 0 && (
            <button
              id="start-convert-all-btn"
              onClick={onStartConversion}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Chuyển đổi {idleCount} file</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onClearAll}
            disabled={isProcessing}
            title="Xóa danh sách tài liệu hiện tại"
            className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-700/60 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xóa hết</span>
          </button>
        </div>
      </div>

      {/* File Items List */}
      <div className="mt-3 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
        {documents.map((doc) => {
          const isActive = doc.id === activeDocId;

          return (
            <div
              key={doc.id}
              onClick={() => onSelectDoc(doc.id)}
              className={`group relative rounded-xl border p-3 sm:p-3.5 transition-all cursor-pointer ${
                isActive
                  ? 'border-cyan-500/80 bg-cyan-950/25 shadow-md shadow-cyan-500/5'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* File Icon & Info */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                    <FileText className="w-4 h-4 text-cyan-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs sm:text-sm text-slate-200 truncate max-w-[280px] sm:max-w-md" title={doc.name}>
                        {doc.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {formatBytes(doc.size)}
                      </span>

                      {/* Status Badges */}
                      {doc.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                          <CheckCircle className="w-3 h-3" />
                          Đã chuyển đổi
                        </span>
                      )}

                      {doc.status === 'processing' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Đang xử lý
                        </span>
                      )}

                      {doc.status === 'error' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-500/10 border border-red-500/30 text-red-300">
                          <AlertCircle className="w-3 h-3" />
                          Lỗi
                        </span>
                      )}

                      {doc.status === 'idle' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          Chờ nén
                        </span>
                      )}
                    </div>

                    {/* Extracted Admin Metadata Badges if available */}
                    {doc.metadata && (doc.metadata.documentNumber || doc.metadata.issueDate || doc.metadata.issuingAgency) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                        {doc.metadata.documentNumber && (
                          <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 font-mono font-medium">
                            Số: {doc.metadata.documentNumber}
                          </span>
                        )}
                        {doc.metadata.issueDate && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
                            Ngày: {doc.metadata.issueDate}
                          </span>
                        )}
                        {doc.metadata.issuingAgency && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300 truncate max-w-[200px]" title={doc.metadata.issuingAgency}>
                            {doc.metadata.issuingAgency}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Progress Bar & Stage description */}
                    {doc.status === 'processing' && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-cyan-300">
                          <span className="truncate">{doc.progress.stage || 'Đang nhận dạng OCR...'}</span>
                          <span className="font-mono">{doc.progress.percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${doc.progress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Error message */}
                    {doc.status === 'error' && doc.error && (
                      <p className="mt-1 text-xs text-red-400 font-medium">
                        {doc.error}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1">
                  {doc.status === 'completed' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDoc(doc.id);
                      }}
                      className="p-1.5 rounded-lg text-cyan-400 hover:text-white hover:bg-cyan-500/20 transition-colors"
                      title="Xem kết quả Markdown"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}

                  {doc.status === 'error' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetryDoc(doc.id);
                      }}
                      className="p-1.5 rounded-lg text-amber-400 hover:text-white hover:bg-amber-500/20 transition-colors"
                      title="Thử lại"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isProcessing && doc.status === 'processing'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveDoc(doc.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-20"
                    title="Xóa file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
