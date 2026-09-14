import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { SettingsBar } from './components/SettingsBar';
import { FileList } from './components/FileList';
import { DocumentViewer } from './components/DocumentViewer';
import { PDFPreviewModal } from './components/PDFPreviewModal';
import { HistoryModal } from './components/HistoryModal';
import { GuideModal } from './components/GuideModal';
import { Footer } from './components/Footer';
import { DocumentItem, ConversionOptions, HistoryRecord } from './types';
import { detectFileType, processDocument } from './utils/documentConverter';
import { createSampleVietnameseDocument } from './utils/sampleDocuments';

const STORAGE_KEY_OPTIONS = 'doc2md_conversion_options';
const STORAGE_KEY_HISTORY = 'doc2md_history_records';

const DEFAULT_OPTIONS: ConversionOptions = {
  ocrLanguage: 'vie',
  resolutionMode: 'balanced',
  prioritizeAdminMetadata: true,
  removeHeaderFooterRepeat: true,
  extractTables: true,
  addAIPromptHeader: true,
  preserveImagesAsBase64: false,
  cleanOCRNoise: true,
};

export default function App() {
  // State
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Options State
  const [options, setOptions] = useState<ConversionOptions>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OPTIONS);
      if (saved) return { ...DEFAULT_OPTIONS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_OPTIONS;
  });

  // History State
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Modals
  const [historyOpen, setHistoryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    imageUrl: string | null;
    pageNum: number;
  }>({
    isOpen: false,
    imageUrl: null,
    pageNum: 1,
  });

  // Save options to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_OPTIONS, JSON.stringify(options));
    } catch {
      // ignore
    }
  }, [options]);

  // Save history to localStorage
  const saveToHistory = useCallback((doc: DocumentItem) => {
    if (!doc.markdownOutput || doc.status !== 'completed') return;

    setHistoryRecords(prev => {
      const filtered = prev.filter(r => r.name !== doc.name);
      const newRecord: HistoryRecord = {
        id: 'hist-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        name: doc.name,
        size: doc.size,
        type: doc.type,
        metadata: doc.metadata,
        markdownOutput: doc.markdownOutput,
        createdAt: Date.now(),
      };
      const updated = [newRecord, ...filtered].slice(0, 30);
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  // Handle files selected from dropzone or input
  const handleFilesSelected = (files: File[]) => {
    const newItems: DocumentItem[] = files.map((file) => {
      const type = detectFileType(file);
      return {
        id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
        file,
        name: file.name,
        size: file.size,
        type,
        status: 'idle',
        progress: { stage: 'Sẵn sàng xử lý', percent: 0 },
        metadata: { confidenceScore: 0 },
        markdownOutput: '',
        createdAt: Date.now(),
      };
    });

    setDocuments(prev => [...prev, ...newItems]);
    if (!activeDocId && newItems.length > 0) {
      setActiveDocId(newItems[0].id);
    }
  };

  // Convert queued documents sequentially
  const handleStartConversion = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    // Get snapshot of pending docs
    const pendingDocs = documents.filter(d => d.status === 'idle' || d.status === 'error');
    if (pendingDocs.length === 0) {
      setIsProcessing(false);
      return;
    }

    for (const doc of pendingDocs) {
      // Update status to processing
      setDocuments(prev =>
        prev.map(d => (d.id === doc.id ? { ...d, status: 'processing' as const, progress: { stage: 'Bắt đầu xử lý...', percent: 5 } } : d))
      );
      setActiveDocId(doc.id);

      const processed = await processDocument(doc, options, (prog) => {
        setDocuments(prev =>
          prev.map(d => (d.id === doc.id ? { ...d, progress: prog } : d))
        );
      });

      // Update document result
      setDocuments(prev =>
        prev.map(d => (d.id === doc.id ? processed : d))
      );

      if (processed.status === 'completed') {
        saveToHistory(processed);
      }
    }

    setIsProcessing(false);

    // Celebration confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#38bdf8', '#2563eb', '#10b981']
      });
    } catch {
      // ignore
    }
  };

  // Load sample document
  const handleLoadSample = () => {
    const sample = createSampleVietnameseDocument();
    setDocuments(prev => [sample, ...prev]);
    setActiveDocId(sample.id);
    saveToHistory(sample);
  };

  // Remove document
  const handleRemoveDoc = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (activeDocId === id) {
      const remaining = documents.filter(d => d.id !== id);
      setActiveDocId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Retry single document
  const handleRetryDoc = async (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (!doc || isProcessing) return;

    setIsProcessing(true);
    setActiveDocId(id);

    setDocuments(prev =>
      prev.map(d => (d.id === id ? { ...d, status: 'processing', error: undefined, progress: { stage: 'Bắt đầu lại...', percent: 5 } } : d))
    );

    const processed = await processDocument(doc, options, (prog) => {
      setDocuments(prev =>
        prev.map(d => (d.id === id ? { ...d, progress: prog } : d))
      );
    });

    setDocuments(prev =>
      prev.map(d => (d.id === id ? processed : d))
    );

    if (processed.status === 'completed') {
      saveToHistory(processed);
    }

    setIsProcessing(false);
  };

  // Clear all documents
  const handleClearAll = () => {
    setDocuments([]);
    setActiveDocId(null);
  };

  // Update markdown content from editor
  const handleUpdateMarkdown = (id: string, newContent: string) => {
    setDocuments(prev =>
      prev.map(d => (d.id === id ? { ...d, markdownOutput: newContent } : d))
    );
  };

  // Select history record to inspect
  const handleSelectRecord = (record: HistoryRecord) => {
    const docItem: DocumentItem = {
      id: record.id,
      file: new File([record.markdownOutput], record.name, { type: 'text/markdown' }),
      name: record.name,
      size: record.size,
      type: record.type,
      status: 'completed',
      progress: { stage: 'Đã hoàn thành', percent: 100 },
      metadata: record.metadata,
      markdownOutput: record.markdownOutput,
      createdAt: record.createdAt,
    };

    setDocuments(prev => {
      if (!prev.some(d => d.name === record.name)) {
        return [docItem, ...prev];
      }
      return prev;
    });
    setActiveDocId(docItem.id);
  };

  // Clear history
  const handleClearHistory = () => {
    setHistoryRecords([]);
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch {
      // ignore
    }
  };

  // Active document object
  const activeDocument = documents.find(d => d.id === activeDocId);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Top Navigation */}
      <Header
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenGuide={() => setGuideOpen(true)}
        onLoadSample={handleLoadSample}
        historyCount={historyRecords.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-20 space-y-6">
        {/* Settings Bar */}
        <SettingsBar
          options={options}
          onOptionsChange={setOptions}
          disabled={isProcessing}
        />

        {/* Drop Zone Area */}
        <DropZone
          onFilesSelected={handleFilesSelected}
          onLoadSample={handleLoadSample}
          isProcessing={isProcessing}
        />

        {/* Batch File Queue List */}
        <FileList
          documents={documents}
          activeDocId={activeDocId}
          onSelectDoc={setActiveDocId}
          onRemoveDoc={handleRemoveDoc}
          onStartConversion={handleStartConversion}
          onClearAll={handleClearAll}
          onRetryDoc={handleRetryDoc}
          isProcessing={isProcessing}
        />

        {/* Active Document Viewer & Editor */}
        {activeDocument && activeDocument.markdownOutput && (
          <div className="pt-2">
            <DocumentViewer
              document={activeDocument}
              allDocuments={documents}
              onUpdateMarkdown={handleUpdateMarkdown}
              onPreviewPage={(thumb, pageNum) =>
                setPreviewModal({ isOpen: true, imageUrl: thumb, pageNum })
              }
            />
          </div>
        )}
      </main>

      {/* Fixed Privacy & Security Footer */}
      <Footer />

      {/* Modals */}
      <PDFPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
        imageUrl={previewModal.imageUrl}
        pageNum={previewModal.pageNum}
      />

      <HistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        records={historyRecords}
        onSelectRecord={handleSelectRecord}
        onClearHistory={handleClearHistory}
      />

      <GuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
    </div>
  );
}
