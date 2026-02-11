import { useState, useEffect } from "react";
import { Ghost, Warning, Activity, Eye } from "@phosphor-icons/react";

export default function Design5() {
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Glitch Overlay */}
      {glitch && (
        <div className="fixed inset-0 z-50 mix-blend-difference pointer-events-none bg-red-500/20 animate-pulse" />
      )}

      <div className="max-w-4xl w-full relative">
        {/* Decorative elements */}
        <div className="absolute -top-20 -left-20 w-64 h-64 border-4 border-white/10 rounded-full animate-spin-slow" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 border border-white/5 rotate-45" />

        <div className="relative z-10 space-y-12">
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-xs font-bold tracking-[0.5em] text-white/40 uppercase">
              <Activity weight="bold" /> System Initialization
            </div>
            <h1 className={`text-9xl font-black uppercase tracking-[-0.05em] leading-none transition-all ${glitch ? 'translate-x-2 skew-x-12' : ''}`}>
              WHISTLER
            </h1>
          </div>

          <p className="text-3xl font-light leading-tight max-w-2xl border-l border-white/20 pl-8">
            The void where your data becomes structure. No interface. No distraction. Just pure organization.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-12">
            <button className="h-32 border-2 border-white hover:bg-white hover:text-black transition-all flex flex-col items-center justify-center gap-2 group">
              <Ghost size={32} className="group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest">Spawn Project</span>
            </button>
            <button className="h-32 border-2 border-white/30 text-white/30 hover:border-white hover:text-white transition-all flex flex-col items-center justify-center gap-2 group">
              <Warning size={32} />
              <span className="text-xs font-black uppercase tracking-widest">Sync Breach</span>
            </button>
            <button className="h-32 border-2 border-white/30 text-white/30 hover:border-white hover:text-white transition-all flex flex-col items-center justify-center gap-2 group">
              <Eye size={32} />
              <span className="text-xs font-black uppercase tracking-widest">View Source</span>
            </button>
          </div>

          <div className="pt-24 flex justify-between items-end text-[10px] font-bold tracking-[0.3em] uppercase text-white/20">
            <div className="space-y-1">
              <div>UUID: 88-00-11-XX</div>
              <div>LOC: C:\USERS\PETE\WHISTLER</div>
            </div>
            <div className="text-right">
              BY AWESOME_LABS // 2026
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
