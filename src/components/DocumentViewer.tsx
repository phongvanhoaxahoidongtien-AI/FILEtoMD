import React, { useState, useMemo, useEffect } from 'react';
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
  Maximize2,
  Calendar,
  Building,
  Hash,
  ExternalLink,
  Columns,
  FileCheck,
  ArrowRight,
  ZoomIn
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
  // Tab state: 'compare' (Đối chiếu bản gốc), 'split' (Song song Render vs Raw), 'rendered', 'raw', 'original' (Xem file gốc), 'thumbnails'
  const [activeTab, setActiveTab] = useState<'compare' | 'split' | 'rendered' | 'raw' | 'original' | 'thumbnails'>('compare');
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Create temporary Blob URL for the original uploaded file to view/read
  const fileUrl = useMemo(() => {
    try {
      if (activeDoc.file && activeDoc.file.size > 0) {
        return URL.createObjectURL(activeDoc.file);
      }
    } catch {
      // ignore
    }
    return null;
  }, [activeDoc.file]);

  // Clean up object URL when unmounting or switching file
  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

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

  // Helper format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Word & character stats
  const lineCount = activeDoc.markdownOutput ? activeDoc.markdownOutput.split('\n').length : 0;
  const wordCount = activeDoc.markdownOutput ? activeDoc.markdownOutput.trim().split(/\s+/).filter(Boolean).length : 0;

  // Render the original file preview component
  const renderOriginalFileView = (isCompact = false) => {
    const hasThumbnails = activeDoc.previewThumbnails && activeDoc.previewThumbnails.length > 0;
    const isPDF = activeDoc.type === 'pdf';
    const isImage = activeDoc.type === 'image';

    return (
      <div className="flex flex-col h-full bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden">
        {/* Sub-header of original file */}
        <div className="px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            <span className="font-semibold text-slate-200 truncate" title={activeDoc.name}>
              Bản gốc: {activeDoc.name}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
              {formatSize(activeDoc.size)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-800 text-cyan-300 hover:bg-slate-700 transition"
                title="Mở file gốc trong tab mới của trình duyệt"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="hidden sm:inline">Mở tab mới</span>
              </a>
            )}

            {fileUrl && (
              <a
                href={fileUrl}
                download={activeDoc.name}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Tải lại file gốc ban đầu"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Content of Original File */}
        <div className={`flex-1 overflow-y-auto p-3 sm:p-4 ${isCompact ? 'max-h-[560px]' : 'min-h-[560px]'}`}>
          {/* Case 1: PDF with native viewer or rendered pages */}
          {isPDF ? (
            hasThumbnails ? (
              <div className="space-y-4">
                <div className="text-[11px] text-slate-400 flex items-center justify-between pb-1 border-b border-slate-800/60">
                  <span>Các trang tài liệu PDF gốc ({activeDoc.previewThumbnails!.length} trang):</span>
                  {fileUrl && (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                      Xem dạng PDF nhúng &rarr;
                    </a>
                  )}
                </div>
                {activeDoc.previewThumbnails!.map((thumb, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-800 bg-black/40 overflow-hidden shadow-md">
                    <div className="px-2 py-1 bg-slate-900/90 text-[10px] text-slate-400 font-mono flex items-center justify-between border-b border-slate-800">
                      <span>Trang {idx + 1}</span>
                      <button
                        onClick={() => onPreviewPage(thumb, idx + 1)}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
                      >
                        <ZoomIn className="w-3 h-3" /> Phóng to
                      </button>
                    </div>
                    <img
                      src={thumb}
                      alt={`Bản gốc trang ${idx + 1}`}
                      className="w-full h-auto object-contain bg-white"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            ) : fileUrl ? (
              <iframe
                src={fileUrl}
                className="w-full h-full min-h-[520px] rounded-lg border border-slate-800 bg-slate-900"
                title="Bản gốc PDF"
              />
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                Không thể tải trực tiếp file PDF. Bạn có thể nhấn nút &ldquo;Mở tab mới&rdquo; ở trên để đọc.
              </div>
            )
          ) : isImage ? (
            /* Case 2: Image File */
            <div className="flex flex-col items-center justify-center p-2">
              <img
                src={fileUrl || (activeDoc.previewThumbnails ? activeDoc.previewThumbnails[0] : '')}
                alt="Hình ảnh gốc"
                className="max-w-full max-h-[540px] object-contain rounded-lg shadow-lg border border-slate-800 bg-slate-900"
              />
            </div>
          ) : (
            /* Case 3: DOCX, TXT, HTML, XLSX text contents */
            <div className="space-y-3">
              <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-500/20 text-xs text-blue-200 flex items-center justify-between">
                <span>Văn bản trích xuất gốc từ tệp {activeDoc.type.toUpperCase()}:</span>
                {fileUrl && (
                  <a href={fileUrl} download={activeDoc.name} className="text-cyan-300 hover:underline flex items-center gap-1 font-medium">
                    <Download className="w-3 h-3" /> Tải tệp {activeDoc.name}
                  </a>
                )}
              </div>
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                {activeDoc.rawText || activeDoc.markdownOutput}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

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
              Thông tin văn bản hành chính đã trích xuất tự động (Nghị định 30)
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
                    Số văn bản (Dòng 3)
                  </span>
                  <span className="font-mono font-bold text-sm text-cyan-200 mt-0.5 block">
                    {activeDoc.metadata.documentNumber}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyFieldValue('num', activeDoc.metadata.documentNumber!)}
                  title="Sao chép số văn bản"
                  className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 cursor-pointer"
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
                    Ngày ban hành (Dòng 3)
                  </span>
                  <span className="font-medium text-sm text-slate-100 mt-0.5 block">
                    {activeDoc.metadata.location ? `${activeDoc.metadata.location}, ` : ''}{activeDoc.metadata.issueDate}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyFieldValue('date', activeDoc.metadata.issueDate!)}
                  title="Sao chép ngày ban hành"
                  className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 cursor-pointer"
                >
                  {copiedField === 'date' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}

            {/* Issuing agency */}
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
                  className="p-1 rounded text-slate-400 hover:text-blue-300 hover:bg-slate-800 flex-shrink-0 cursor-pointer"
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

      {/* View Switcher Tabs (Enhanced with Original File Compare) */}
      <div className="px-4 sm:px-6 pt-4 flex items-center justify-between border-b border-slate-800 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
          {/* NEW: Compare Tab (File gốc vs Markdown) */}
          <button
            onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'compare'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5 text-amber-400" />
            <span>Đối chiếu bản gốc &bull; MD</span>
          </button>

          {/* NEW: Original File Tab */}
          <button
            onClick={() => setActiveTab('original')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'original'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Xem file gốc ({activeDoc.type.toUpperCase()})</span>
          </button>

          {/* Split View (Rendered vs Raw Editor) */}
          <button
            onClick={() => setActiveTab('split')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'split'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sửa &amp; Xem song song</span>
          </button>

          {/* Rendered Only */}
          <button
            onClick={() => setActiveTab('rendered')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'rendered'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Kết quả A4</span>
          </button>

          {/* Raw Markdown */}
          <button
            onClick={() => setActiveTab('raw')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'raw'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Mã Markdown</span>
          </button>

          {/* Thumbnails */}
          {activeDoc.previewThumbnails && activeDoc.previewThumbnails.length > 0 && (
            <button
              onClick={() => setActiveTab('thumbnails')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'thumbnails'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Trang thu nhỏ ({activeDoc.previewThumbnails.length})</span>
            </button>
          )}
        </div>

        <span className="text-[11px] text-slate-500 hidden md:inline whitespace-nowrap ml-2">
          Đối chiếu trực tiếp bản gốc với kết quả Markdown chuẩn
        </span>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 min-h-[480px] max-h-[660px] overflow-y-auto">
        {/* TAB 1: COMPARE (Bên trái: Bản gốc ban đầu; Bên phải: Trình soạn thảo Markdown trực tiếp để sửa số hiệu/ngày tháng và sao chép) */}
        {activeTab === 'compare' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            {/* CỘT TRÁI: Bản gốc ban đầu (PDF / Ảnh scan / File gốc) để đối chiếu trực tiếp */}
            <div className="h-[580px] flex flex-col">
              {renderOriginalFileView(true)}
            </div>

            {/* CỘT PHẢI: Trình soạn thảo Markdown trực tiếp (Có thể chỉnh sửa số công văn, ngày tháng rồi mới copy) */}
            <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-3.5 sm:p-4 flex flex-col h-[580px] shadow-lg">
              <div className="flex flex-wrap items-center justify-between pb-2.5 mb-2 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Edit3 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Trình soạn thảo Markdown trực tiếp
                    </span>
                    <span className="text-[10px] text-amber-300 block">
                      Sửa số hiệu, ngày tháng ở dòng 3 rồi bấm Sao chép
                    </span>
                  </div>
                </div>

                {/* Nút Sao chép Markdown trực tiếp ngay tại cột soạn thảo */}
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30 active:scale-95 transition cursor-pointer"
                  title="Sao chép toàn bộ nội dung Markdown sau khi đã chỉnh sửa"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã sao chép!' : 'Sao chép Markdown'}</span>
                </button>
              </div>

              {/* Textarea soạn thảo trực tiếp */}
              <textarea
                value={activeDoc.markdownOutput}
                onChange={(e) => onUpdateMarkdown(activeDoc.id, e.target.value)}
                placeholder="Nội dung Markdown... Bạn có thể chỉnh sửa số hiệu công văn, ngày tháng hoặc nội dung trực tiếp tại đây."
                className="w-full flex-1 p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 font-mono text-xs text-slate-100 resize-none focus:outline-hidden focus:border-cyan-500/80 leading-relaxed select-text"
                spellCheck={false}
              />

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
                <span>{wordCount} từ • {lineCount} dòng</span>
                <span className="text-cyan-400/80">Nội dung tự động đồng bộ khi tải file</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ORIGINAL ONLY (Xem file gốc toàn khung) */}
        {activeTab === 'original' && (
          <div className="max-w-5xl mx-auto h-[600px]">
            {renderOriginalFileView(false)}
          </div>
        )}

        {/* TAB 3: SPLIT VIEW (Rendered vs Raw Markdown Editor) */}
        {activeTab === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            {/* Left: Rendered Markdown View */}
            <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 sm:p-5 overflow-y-auto max-h-[580px] prose prose-invert prose-cyan max-w-none text-xs sm:text-sm">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                <span>Bản xem trước A4 (Rendered)</span>
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

        {/* TAB 4: RENDERED ONLY */}
        {activeTab === 'rendered' && (
          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-6 sm:p-8 max-w-4xl mx-auto overflow-y-auto prose prose-invert prose-cyan text-sm">
            <div className="markdown-render-container">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {activeDoc.markdownOutput}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* TAB 5: RAW EDITOR ONLY */}
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

        {/* TAB 6: THUMBNAILS */}
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
