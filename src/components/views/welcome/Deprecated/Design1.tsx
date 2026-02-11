import { Button } from "@/components/ui/button";
import { Plus, SignIn, Info } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export default function Design1() {
  return (
    <div className="min-h-screen bg-white text-black font-mono p-8 flex flex-col border-[12px] border-black">
      <header className="border-b-[8px] border-black pb-8 mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-8xl font-black uppercase tracking-tighter leading-none">
            Whistler
          </h1>
          <p className="text-2xl mt-4 font-bold uppercase italic">
            Your Digital Archive. Raw. Unfiltered.
          </p>
        </div>
        <div className="flex gap-4">
          <Button className="bg-black text-white hover:bg-black/90 text-xl px-8 py-8 rounded-none border-4 border-black font-black uppercase">
            <SignIn weight="fill" className="mr-2" /> Sign In
          </Button>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-12 flex-grow">
        <section className="border-[6px] border-black p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-5xl font-black uppercase mb-6 bg-black text-white inline-block px-4">
              Start Fresh
            </h2>
            <p className="text-xl leading-tight mb-8">
              Create a new project and start organizing your files, highlights, and thoughts in a brutalist environment.
            </p>
          </div>
          <Button className="w-full bg-white text-black hover:bg-black hover:text-white border-4 border-black text-2xl py-10 rounded-none font-black uppercase transition-colors">
            <Plus weight="bold" className="mr-3" /> New Project
          </Button>
        </section>

        <section className="border-[6px] border-black p-8 flex flex-col justify-between bg-yellow-400">
          <div>
            <h2 className="text-5xl font-black uppercase mb-6 bg-black text-white inline-block px-4">
              The Manifesto
            </h2>
            <ul className="text-xl font-bold space-y-4 uppercase">
              <li className="flex items-center gap-3">
                <span className="bg-black text-white px-2">01</span> No unnecessary decorations
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-black text-white px-2">02</span> Function defines form
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-black text-white px-2">03</span> Your data is the structure
              </li>
            </ul>
          </div>
          <Link to="/legal" className="text-black underline font-black text-xl flex items-center gap-2 hover:no-underline">
            <Info weight="bold" /> Read the docs
          </Link>
        </section>
      </main>

      <footer className="mt-12 pt-8 border-t-[8px] border-black flex justify-between font-black uppercase text-xl">
        <div>&copy; 2026 WHISTLER</div>
        <div className="flex gap-8">
          <a href="#" className="hover:line-through">Twitter</a>
          <a href="#" className="hover:line-through">GitHub</a>
          <a href="#" className="hover:line-through">Discord</a>
        </div>
      </footer>
    </div>
  );
}
