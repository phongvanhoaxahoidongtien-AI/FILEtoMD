import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy,
  Download,
  FileArchive,
  Check,
  Edit3,
  Eye,
  FileText,
  Sparkles,
  Layers,
  ChevronRight,
  Maximize2,
  Share2,
  Calendar,
  Building,
  Hash,
  UserCheck
} from 'lucide-react';
import { DocumentItem } from '../types';
import { downloadMarkdownFile, downloadAllAsZip, mergeAllToSingleMarkdown } from '../utils/zipExport';

interface DocumentViewerProps {
  document: DocumentItem;
  allDocuments: DocumentItem[];
  onUpdateMarkdown: (id: string, newContent: string) => void;
  onPreviewPage: (thumbnailUrl: string, pageNum: number) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document: activeDoc,
  allDocuments,
  onUpdateMarkdown,
  onPreviewPage
}) => {
  const [activeTab, setActiveTab] = useState<'rendered' | 'raw' | 'split' | 'thumbnails'>('split');
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const completedDocs = allDocuments.filter(d => d.status === 'completed' && d.markdownOutput);
  const isMultiple = completedDocs.length > 1;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(activeDoc.markdownOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyFieldValue = (fieldKey: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleDownloadSingle = () => {
    downloadMarkdownFile(activeDoc.name, activeDoc.markdownOutput);
  };

  const handleDownloadZip = () => {
    downloadAllAsZip(allDocuments);
  };

  const handleDownloadMerged = () => {
    const merged = mergeAllToSingleMarkdown(allDocuments);
    downloadMarkdownFile('Tong_hop_van_ban_Markdown.md', merged);
  };

  // Word & character stats
  const lineCount = activeDoc.markdownOutput ? activeDoc.markdownOutput.split('\n').length : 0;
  const wordCount = activeDoc.markdownOutput ? activeDoc.markdownOutput.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="w-full rounded-2xl bg-slate-900/85 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
      {/* Top Bar: Title & High-impact Action Buttons */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-950/60">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base sm:text-lg font-bold text-white tracking-tight truncate max-w-md">
              {activeDoc.name}
            </span>
            {activeDoc.executionTimeMs && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                ⚡ {activeDoc.executionTimeMs}ms
              </span>
            )}
            <span className="text-xs text-slate-400 font-mono">
              {wordCount.toLocaleString()} từ • {lineCount} dòng
            </span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Button */}
          <button
            id="copy-markdown-btn"
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
            <span>{copied ? 'Đã sao chép!' : 'Sao chép Markdown'}</span>
          </button>

          {/* Download Single .md */}
          <button
            id="download-md-btn"
            onClick={handleDownloadSingle}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Tải file .md</span>
          </button>

          {/* Batch Downloads if multiple */}
          {isMultiple && (
            <>
              <button
                id="download-zip-btn"
                onClick={handleDownloadZip}
                title="Tải toàn bộ các file đã xử lý thành gói ZIP"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <FileArchive className="w-4 h-4" />
                <span>Tải gói ZIP ({completedDocs.length} file)</span>
              </button>

              <button
                id="merge-all-btn"
                onClick={handleDownloadMerged}
                title="Hợp nhất tất cả văn bản thành 1 file Markdown duy nhất với mục lục"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Gộp 1 file .md</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Extracted Administrative Metadata Highlight Card (Prioritized) */}
      {activeDoc.metadata && (activeDoc.metadata.documentNumber || activeDoc.metadata.issueDate || activeDoc.metadata.issuingAgency) && (
        <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-blue-950/30 border border-cyan-500/30 shadow-inner">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Thông tin văn bản hành chính đã trích xuất tự động
            </span>
            {activeDoc.metadata.confidenceScore && activeDoc.metadata.confidenceScore > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                Độ tin cậy: {activeDoc.metadata.confidenceScore}%
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* Document number */}
            {activeDoc.metadata.documentNumber && (
              <div className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-400 block flex items-center gap-1">
                    <Hash className="w-3 h-3 text-cyan-400" />
                    Số văn bản
                  </span>
                  <span className="font-mono font-bold text-sm text-cyan-200 mt-0.5 block">
                    {activeDoc.metadata.documentNumber}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyFieldValue('num', activeDoc.metadata.documentNumber!)}
                  title="Sao chép số văn bản"
                  className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800"
                >
                  {copiedField === 'num' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}

            {/* Issue date */}
            {activeDoc.metadata.issueDate && (
              <div className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-400 block flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-400" />
                    Ngày ban hành
                  </span>
                  <span className="font-medium text-sm text-slate-100 mt-0.5 block">
                    {activeDoc.metadata.location ? `${activeDoc.metadata.location}, ` : ''}{activeDoc.metadata.issueDate}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyFieldValue('date', activeDoc.metadata.issueDate!)}
                  title="Sao chép ngày ban hành"
                  className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800"
                >
                  {copiedField === 'date' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}

            {/* Issuing agency (Khung bên trái 2 dòng: cấp trên & cơ quan ban hành) */}
            {(activeDoc.metadata.issuingAgency || activeDoc.metadata.parentAgency) && (
              <div className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 sm:col-span-2 lg:col-span-1">
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] text-slate-400 block flex items-center gap-1">
                    <Building className="w-3 h-3 text-blue-400" />
                    Cơ quan ban hành (Khung bên trái)
                  </span>
                  {activeDoc.metadata.parentAgency && (
                    <span className="text-[11px] text-slate-400 mt-0.5 block truncate" title={`Cơ quan quản lý cấp trên: ${activeDoc.metadata.parentAgency}`}>
                      Cấp trên: <strong className="text-slate-300 font-semibold">{activeDoc.metadata.parentAgency}</strong>
                    </span>
                  )}
                  <span className="font-semibold text-xs text-slate-100 mt-0.5 block truncate" title={`Cơ quan ban hành văn bản: ${activeDoc.metadata.issuingAgency || ''}`}>
                    Ban hành: <strong className="text-cyan-300 font-semibold">{activeDoc.metadata.issuingAgency || activeDoc.metadata.parentAgency}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyFieldValue('agency', `${activeDoc.metadata.parentAgency ? `${activeDoc.metadata.parentAgency}\n` : ''}${activeDoc.metadata.issuingAgency || ''}`)}
                  title="Sao chép cơ quan ban hành"
                  className="p-1 rounded text-slate-400 hover:text-blue-300 hover:bg-slate-800 flex-shrink-0"
                >
                  {copiedField === 'agency' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Subject Title */}
          {activeDoc.metadata.titleSubject && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400 font-medium">Trích yếu nội dung: </span>
              <span className="text-slate-200 font-semibold">{activeDoc.metadata.titleSubject}</span>
            </div>
          )}
        </div>
      )}

      {/* View Switcher Tabs */}
      <div className="px-4 sm:px-6 pt-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('split')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'split'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Song song (Split)</span>
          </button>

          <button
            onClick={() => setActiveTab('rendered')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'rendered'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Hiển thị kết quả</span>
          </button>

          <button
            onClick={() => setActiveTab('raw')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'raw'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Mã nguồn Markdown</span>
          </button>

          {activeDoc.previewThumbnails && activeDoc.previewThumbnails.length > 0 && (
            <button
              onClick={() => setActiveTab('thumbnails')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'thumbnails'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Trang gốc ({activeDoc.previewThumbnails.length})</span>
            </button>
          )}
        </div>

        <span className="text-[11px] text-slate-500 hidden sm:inline">
          Cho phép chỉnh sửa trực tiếp trước khi copy / tải
        </span>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 min-h-[460px] max-h-[640px] overflow-y-auto">
        {/* Split View */}
        {activeTab === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            {/* Left: Rendered Markdown View */}
            <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 sm:p-5 overflow-y-auto max-h-[580px] prose prose-invert prose-cyan max-w-none text-xs sm:text-sm">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                <span>Bản xem trước (Rendered)</span>
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="markdown-render-container">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {activeDoc.markdownOutput}
                </ReactMarkdown>
              </div>
            </div>

            {/* Right: Editable Raw Markdown Editor */}
            <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-3 sm:p-4 flex flex-col h-[580px]">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                <span>Trình soạn thảo Markdown trực tiếp</span>
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <textarea
                value={activeDoc.markdownOutput}
                onChange={(e) => onUpdateMarkdown(activeDoc.id, e.target.value)}
                placeholder="Nội dung Markdown..."
                className="w-full flex-1 p-2 bg-transparent font-mono text-xs text-slate-200 resize-none focus:outline-hidden leading-relaxed select-text"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* Rendered Only View */}
        {activeTab === 'rendered' && (
          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-6 sm:p-8 max-w-4xl mx-auto overflow-y-auto prose prose-invert prose-cyan text-sm">
            <div className="markdown-render-container">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {activeDoc.markdownOutput}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Raw Editor Only View */}
        {activeTab === 'raw' && (
          <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-4 max-w-5xl mx-auto flex flex-col h-[560px]">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-xs text-slate-400">
              <span className="font-semibold">Mã Markdown thô (Có thể sửa đổi tùy ý):</span>
              <span className="font-mono text-[11px]">{wordCount} từ • {lineCount} dòng</span>
            </div>
            <textarea
              value={activeDoc.markdownOutput}
              onChange={(e) => onUpdateMarkdown(activeDoc.id, e.target.value)}
              placeholder="Nội dung Markdown..."
              className="w-full flex-1 p-3 bg-transparent font-mono text-xs sm:text-sm text-slate-200 resize-none focus:outline-hidden leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}

        {/* Thumbnails View */}
        {activeTab === 'thumbnails' && activeDoc.previewThumbnails && (
          <div>
            <div className="mb-3 text-xs text-slate-400">
              Nhấp vào hình thu nhỏ để phóng to và kiểm tra độ nét trang văn bản gốc:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {activeDoc.previewThumbnails.map((thumb, idx) => (
                <div
                  key={idx}
                  onClick={() => onPreviewPage(thumb, idx + 1)}
                  className="group relative rounded-xl border border-slate-800 hover:border-cyan-500/80 bg-slate-950 overflow-hidden cursor-pointer shadow-md transition-all hover:scale-102"
                >
                  <img
                    src={thumb}
                    alt={`Trang ${idx + 1}`}
                    className="w-full h-44 object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 justify-between">
                    <span className="text-[11px] font-bold text-white">Trang {idx + 1}</span>
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-bold text-slate-300">
                    #{idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
