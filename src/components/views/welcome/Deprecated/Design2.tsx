import { Button } from "@/components/ui/button";
import { Plus, SignIn, Lightning, Files } from "@phosphor-icons/react";

export default function Design2() {
  return (
    <div className="min-h-screen bg-[#f1f1f1] text-[#1a1a1a] p-8 flex items-center justify-center font-sans">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Header/Hero */}
        <div className="lg:col-span-8 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-12">
          <div className="inline-block bg-purple-400 border-2 border-black px-4 py-1 mb-6 font-bold uppercase tracking-wider">
            v2.0 is live
          </div>
          <h1 className="text-7xl font-black mb-6 leading-[0.9]">
            Organize everything <br />
            <span className="text-blue-500 underline decoration-8 underline-offset-8">without the noise.</span>
          </h1>
          <p className="text-2xl font-medium mb-10 max-w-2xl">
            Whistler is the brutalist archive for your digital life. Fast, local-first, and beautifully simple.
          </p>
          <div className="flex flex-wrap gap-6">
            <Button className="h-16 px-10 text-xl font-black bg-green-400 text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all rounded-none">
              <Plus weight="fill" className="mr-2" /> Get Started
            </Button>
            <Button className="h-16 px-10 text-xl font-black bg-white text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all rounded-none">
              <SignIn weight="fill" className="mr-2" /> Sign In
            </Button>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="bg-yellow-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
            <Lightning weight="fill" className="text-5xl mb-4" />
            <h3 className="text-2xl font-black mb-2 uppercase">Instant Search</h3>
            <p className="font-bold">Find anything in milliseconds. We don't do loading spinners.</p>
          </div>
          
          <div className="bg-pink-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
            <Files weight="fill" className="text-5xl mb-4" />
            <h3 className="text-2xl font-black mb-2 uppercase">Local First</h3>
            <p className="font-bold">Your data stays on your machine. We only sync when you want us to.</p>
          </div>
        </div>

        {/* Marquee Footer */}
        <div className="lg:col-span-12 bg-black text-white py-4 overflow-hidden whitespace-nowrap border-4 border-black">
          <div className="inline-block animate-marquee font-black uppercase text-2xl px-4">
            * NO TRACKERS * NO ADS * NO BULLSHIT * OPEN SOURCE * LOCAL FIRST * 
          </div>
          <div className="inline-block animate-marquee font-black uppercase text-2xl px-4">
            * NO TRACKERS * NO ADS * NO BULLSHIT * OPEN SOURCE * LOCAL FIRST * 
          </div>
        </div>
      </div>
    </div>
  );
}
