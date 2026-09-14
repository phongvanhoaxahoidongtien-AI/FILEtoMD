import React, { useState } from 'react';
import { ShieldCheck, Download, History, HelpCircle, FileText, Sparkles, Smartphone, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface HeaderProps {
  onOpenHistory: () => void;
  onOpenGuide: () => void;
  onLoadSample: () => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  onOpenGuide,
  onLoadSample,
  historyCount
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [sampleLoaded, setSampleLoaded] = useState(false);

  const handleSampleClick = () => {
    onLoadSample();
    setSampleLoaded(true);
    setTimeout(() => setSampleLoaded(false), 2000);
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 shadow-inner">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5">
                Doc2<span className="text-cyan-400">Markdown</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                <ShieldCheck className="w-3 h-3" />
                100% Offline
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-400 leading-none mt-0.5">
              Chuyển đổi tài liệu & OCR tiếng Việt tối ưu cho AI
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Sample loader */}
          <button
            id="load-sample-btn"
            onClick={handleSampleClick}
            title="Nạp mẫu văn bản hành chính Việt Nam để thử nghiệm"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors shadow-sm"
          >
            {sampleLoaded ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
            <span className="hidden sm:inline">{sampleLoaded ? 'Đã nạp mẫu' : 'Nạp mẫu văn bản'}</span>
          </button>

          {/* History button */}
          <button
            id="history-btn"
            onClick={onOpenHistory}
            className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 transition-colors"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Lịch sử</span>
            {historyCount > 0 && (
              <span className="flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full">
                {historyCount}
              </span>
            )}
          </button>

          {/* Guide button */}
          <button
            id="guide-btn"
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Hướng dẫn</span>
          </button>

          {/* PWA Install Button */}
          {isInstallable && !isInstalled && (
            <button
              id="pwa-install-btn"
              onClick={install}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Cài App</span>
            </button>
          )}

          {isIOS && !isInstalled && (
            <button
              id="pwa-ios-btn"
              onClick={() => setShowIOSGuide(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Cài iOS</span>
            </button>
          )}

          {/* Offline/Online Indicator */}
          <div
            title={isOnline ? 'Ứng dụng đã sẵn sàng chạy Offline' : 'Đang hoạt động hoàn toàn Offline'}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-900/80 border border-slate-800 text-slate-400"
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="hidden lg:inline">{isOnline ? 'Sẵn sàng Offline' : 'Chế độ Offline'}</span>
          </div>
        </div>
      </div>

      {/* iOS Install Instruction Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-cyan-400" />
              Cài đặt trên iPhone / iPad
            </h3>
            <div className="mt-3 text-sm text-slate-300 space-y-2">
              <p>1. Nhấn vào nút <strong>Chia sẻ (Share)</strong> ở thanh dưới trình duyệt Safari.</p>
              <p>2. Cuộn xuống và chọn <strong>Thêm vào MH chính (Add to Home Screen)</strong>.</p>
              <p>3. Mở ứng dụng từ màn hình chính để sử dụng offline hoàn toàn không cần mạng!</p>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-lg bg-cyan-600 hover:bg-cyan-500 py-2 text-sm font-medium text-white transition-colors"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
