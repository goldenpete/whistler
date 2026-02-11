import { Button } from "@/components/ui/button";
import { ArrowRight } from "@phosphor-icons/react";

export default function Design3() {
  return (
    <div className="min-h-screen bg-[#111] text-white font-mono p-12 flex flex-col justify-between">
      <nav className="flex justify-between items-start border-t border-white/20 pt-4">
        <div className="text-4xl font-bold tracking-tighter">W/H</div>
        <div className="flex flex-col items-end gap-2 text-sm uppercase tracking-widest text-white/60">
          <span>Version 2026.02</span>
          <span>Stable Release</span>
        </div>
      </nav>

      <main className="max-w-4xl">
        <h1 className="text-[12vw] font-black leading-[0.8] tracking-tighter uppercase mb-12">
          Whistler
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
          <p className="text-2xl leading-tight">
            A radical approach to digital archiving. Strip away the fluff. Keep the essence. Whistler is a tool for those who value structure over decoration.
          </p>
          <div className="flex flex-col gap-6">
            <button className="group flex items-center justify-between border-b-2 border-white pb-4 text-3xl font-black uppercase hover:bg-white hover:text-black transition-all px-2">
              <span>Create Project</span>
              <ArrowRight weight="bold" className="group-hover:translate-x-2 transition-transform" />
            </button>
            <button className="group flex items-center justify-between border-b-2 border-white pb-4 text-3xl font-black uppercase hover:bg-white hover:text-black transition-all px-2">
              <span>Cloud Sync</span>
              <ArrowRight weight="bold" className="group-hover:translate-x-2 transition-transform" />
            </button>
            <button className="group flex items-center justify-between border-b-2 border-white/30 pb-4 text-3xl font-black uppercase text-white/30 hover:text-white transition-all px-2">
              <span>Documentation</span>
              <ArrowRight weight="bold" className="group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>
      </main>

      <footer className="grid grid-cols-2 md:grid-cols-4 gap-8 border-b border-white/20 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-white/40 uppercase text-[10px] tracking-widest">Philosophy</span>
          <span className="font-bold">Pure Function</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-white/40 uppercase text-[10px] tracking-widest">Security</span>
          <span className="font-bold">E2E Encrypted</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-white/40 uppercase text-[10px] tracking-widest">Storage</span>
          <span className="font-bold">Infinite Nodes</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-white/40 uppercase text-[10px] tracking-widest">License</span>
          <span className="font-bold">MIT-Standard</span>
        </div>
      </footer>
    </div>
  );
}
