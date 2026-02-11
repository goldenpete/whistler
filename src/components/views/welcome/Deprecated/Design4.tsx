import { Terminal, Database, ShieldCheck, Cpu } from "@phosphor-icons/react";

export default function Design4() {
  return (
    <div className="min-h-screen bg-[#1a1c1e] text-[#a9b1d6] font-mono p-4 md:p-12 overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-5" 
           style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      <div className="relative border border-[#414868] h-full flex flex-col">
        {/* Top Bar */}
        <div className="border-b border-[#414868] p-4 flex justify-between items-center bg-[#24283b]">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-4 text-xs font-bold uppercase tracking-widest text-[#565f89]">Whistler_Terminal_v2.0</span>
          </div>
          <div className="text-xs text-[#565f89]">SYSTEM_STATUS: OK</div>
        </div>

        <div className="flex-grow flex flex-col md:flex-row">
          {/* Left Column: Commands */}
          <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-[#414868] p-8 space-y-8">
            <div className="space-y-4">
              <h2 className="text-white text-sm font-black uppercase tracking-tighter border-b border-[#414868] pb-2">Entry_Points</h2>
              <button className="w-full text-left p-4 border border-[#414868] hover:bg-[#414868] hover:text-white transition-all group">
                <span className="text-xs text-[#565f89] block mb-1">CMD_01</span>
                <span className="text-lg font-bold flex items-center justify-between">
                  INIT_NEW_PROJECT
                  <Terminal size={18} />
                </span>
              </button>
              <button className="w-full text-left p-4 border border-[#414868] hover:bg-[#414868] hover:text-white transition-all group">
                <span className="text-xs text-[#565f89] block mb-1">CMD_02</span>
                <span className="text-lg font-bold flex items-center justify-between">
                  AUTH_RECOVERY
                  <Database size={18} />
                </span>
              </button>
            </div>

            <div className="p-4 bg-[#ff9e64]/10 border border-[#ff9e64]/30 text-[#ff9e64] text-xs">
              <span className="font-bold block mb-2">WARNING:</span>
              Local data persistence is currently active. Ensure backup protocols are followed before session termination.
            </div>
          </div>

          {/* Right Column: Hero Content */}
          <div className="flex-grow p-8 md:p-16 flex flex-col justify-center">
            <h1 className="text-6xl md:text-8xl font-black text-white leading-none mb-8 tracking-tighter">
              ARCHIVE<br />
              <span className="text-[#7aa2f7]">PROTOCOL</span>
            </h1>
            <p className="text-xl max-w-xl mb-12 border-l-4 border-[#7aa2f7] pl-6">
              Industrial grade file organization. Whistler bypasses traditional UI paradigms to provide direct access to your digital assets.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-[#414868] flex items-center gap-4">
                <ShieldCheck size={32} className="text-[#9ece6a]" />
                <div>
                  <div className="text-white font-bold text-sm">ENCRYPTION</div>
                  <div className="text-[10px]">AES-256-GCM</div>
                </div>
              </div>
              <div className="p-4 border border-[#414868] flex items-center gap-4">
                <Cpu size={32} className="text-[#bb9af7]" />
                <div>
                  <div className="text-white font-bold text-sm">PROCESSING</div>
                  <div className="text-[10px]">CLIENT_SIDE_ONLY</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="border-t border-[#414868] p-2 px-4 flex justify-between text-[10px] bg-[#1a1b26] text-[#565f89]">
          <div className="flex gap-4">
            <span>LN: 104</span>
            <span>COL: 12</span>
            <span>UTF-8</span>
          </div>
          <div className="flex gap-4 uppercase font-bold">
            <span className="text-[#9ece6a]">Connected</span>
            <span>v2.0.4-LATEST</span>
          </div>
        </div>
      </div>
    </div>
  );
}
