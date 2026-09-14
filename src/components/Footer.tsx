import React from 'react';
import { Lock, ShieldCheck, Cpu, HardDrive } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-800/90 bg-[#090d16]/95 backdrop-blur-md px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Main Security Guarantee requirement */}
        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <Lock className="w-3 h-3 text-emerald-400" />
          </div>
          <span className="tracking-tight">
            100% Offline – Dữ liệu không bao giờ rời khỏi thiết bị của bạn
          </span>
        </div>

        {/* Technical specs badges */}
        <div className="hidden md:flex items-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            Xử lý Web Worker & WebAssembly
          </span>
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            Lưu tạm RAM (In-Memory Only)
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Zero External API Calls
          </span>
        </div>
      </div>
    </footer>
  );
};
