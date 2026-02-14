import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { 
    Sparkle, 
    Lightning, 
    Fingerprint, 
    ArrowsClockwise, 
    Shapes, 
    Rocket,
    ShieldCheck,
    Globe,
    HardDrives,
    Graph,
    CaretRight,
    Plus
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { WhistlerLogo } from "@/components/ui/WhistlerLogo";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

const FeatureCard = ({ icon: Icon, title, description, color }: any) => (
    <motion.div 
        whileHover={{ y: -5 }}
        className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-all group"
    >
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-colors", color)}>
            <Icon weight="duotone" size={28} />
        </div>
        <h3 className="text-xl font-bold mb-3 text-white group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-zinc-400 leading-relaxed">{description}</p>
    </motion.div>
);

const SectionHeader = ({ title, subtitle, tag }: any) => (
    <div className="text-center max-w-3xl mx-auto mb-16 px-6">
        {tag && (
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">
                {tag}
            </span>
        )}
        <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-6 leading-tight">
            {title}
        </h2>
        <p className="text-xl text-zinc-400">
            {subtitle}
        </p>
    </div>
);

export const WelcomeView = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

    const handleGetStarted = () => {
        // Trigger project creation or reveal sidebar
        useStore.getState().setSpotlightOpen(true);
    };

    return (
        <div ref={containerRef} className="absolute inset-0 w-full bg-black selection:bg-primary/30 text-zinc-100 font-inter overflow-y-auto overflow-x-hidden">
            {/* Background Gradient Mesh */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse delay-700" />
            </div>

            {/* Hero Section */}
            <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
                <motion.div 
                    style={{ opacity: heroOpacity, scale: heroScale }}
                    className="z-10 max-w-5xl space-y-8"
                >
                    <div className="flex justify-center mb-8">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl"
                        >
                            <WhistlerLogo width={64} height={64} />
                        </motion.div>
                    </div>

                    <motion.h1 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-6xl md:text-8xl font-black tracking-tighter text-white leading-[0.9] italic"
                    >
                        Create without <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-amber-300">
                            boundaries.
                        </span>
                    </motion.h1>

                    <motion.p 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto leading-relaxed"
                    >
                        The high-performance workspace for creators. Manage assets, build narratives, and sync globally with ease.
                    </motion.p>

                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
                    >
                        <Button 
                            size="lg" 
                            className="h-14 px-8 text-lg font-bold rounded-full gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95"
                            onClick={handleGetStarted}
                        >
                            <Rocket weight="bold" />
                            Get Started
                        </Button>
                        <Button 
                            variant="outline" 
                            size="lg" 
                            className="h-14 px-8 text-lg font-bold rounded-full border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900 transition-all"
                            onClick={() => window.open('https://github.com', '_blank')}
                        >
                            Documentation
                        </Button>
                    </motion.div>
                </motion.div>

                {/* Floating Preview Element */}
                <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 40, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 1 }}
                    className="mt-20 w-full max-w-6xl aspect-video rounded-t-3xl border-x border-t border-zinc-800 bg-zinc-950 shadow-[0_-20px_100px_rgba(0,0,0,0.8)] overflow-hidden"
                >
                    <div className="h-10 w-full bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-zinc-800" />
                            <div className="w-3 h-3 rounded-full bg-zinc-800" />
                            <div className="w-3 h-3 rounded-full bg-zinc-800" />
                        </div>
                    </div>
                    <div className="p-8 flex flex-col items-center justify-center h-full text-zinc-800 italic font-black text-4xl select-none">
                        W H I S T L E R B O X
                    </div>
                </motion.div>
            </section>

            {/* Features Grid */}
            <section className="py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <SectionHeader 
                        tag="Features"
                        title="Everything you need, nothing you don't."
                        subtitle="Designed for speed and precision. Built for the modern creator workflow."
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard 
                            icon={Lightning}
                            title="Zero Latency"
                            description="Optimized for speed. Every interaction is instantaneous, keeping you in the creative flow."
                            color="bg-orange-500/10 text-orange-500"
                        />
                        <FeatureCard 
                            icon={HardDrives}
                            title="Asset Management"
                            description="Organize your media, documents, and creative assets in a unified, intuitive interface."
                            color="bg-blue-500/10 text-blue-500"
                        />
                        <FeatureCard 
                            icon={Graph}
                            title="Visual Graph"
                            description="Connect ideas and visualize relationships between your projects and assets."
                            color="bg-purple-500/10 text-purple-500"
                        />
                        <FeatureCard 
                            icon={Fingerprint}
                            title="Passkey Auth"
                            description="Passwordless security. Sign in instantly using biometric authentication."
                            color="bg-emerald-500/10 text-emerald-500"
                        />
                        <FeatureCard 
                            icon={ArrowsClockwise}
                            title="Global Sync"
                            description="Your projects, everywhere. Automatic cloud synchronization across all your devices."
                            color="bg-sky-500/10 text-sky-500"
                        />
                        <FeatureCard 
                            icon={Shapes}
                            title="Bento Layouts"
                            description="A beautiful, modular interface that adapts to your screen and your style."
                            color="bg-rose-500/10 text-rose-500"
                        />
                    </div>
                </div>
            </section>

            {/* Performance / Security Section */}
            <section className="py-32 bg-zinc-950/50 border-y border-zinc-900">
                <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
                    <div className="flex-1 space-y-8">
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold uppercase tracking-widest">
                            Security First
                        </span>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-tight">
                            Your data, <br />
                            <span className="italic">encrypted & private.</span>
                        </h2>
                        <p className="text-xl text-zinc-400 leading-relaxed">
                            We believe privacy is a fundamental right. Whistler uses industry-leading encryption and decentralized sync technology to ensure only you have access to your creative work.
                        </p>
                        <ul className="space-y-4">
                            {[
                                { icon: ShieldCheck, text: "End-to-end encryption for all sync data" },
                                { icon: Fingerprint, text: "WebAuthn / Passkey support by default" },
                                { icon: Globe, text: "Decentralized edge-network storage" }
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-zinc-300">
                                    <item.icon className="text-emerald-500" size={24} weight="bold" />
                                    <span className="font-medium">{item.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex-1 w-full aspect-square max-w-md bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-[3rem] p-1 flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 border-[2px] border-dashed border-zinc-800/50 rounded-full scale-75"
                        />
                        <ShieldCheck weight="duotone" className="text-emerald-500/20 absolute" size={300} />
                        <Fingerprint weight="bold" className="text-emerald-500 relative z-10" size={120} />
                    </div>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="py-40 px-6 text-center relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
                
                <div className="relative z-10 max-w-3xl mx-auto space-y-10">
                    <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white">
                        Ready to <span className="italic text-primary">Whistler?</span>
                    </h2>
                    <p className="text-xl text-zinc-400">
                        Join thousands of creators building the next generation of digital experiences.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Button 
                            size="lg" 
                            className="h-16 px-10 text-xl font-bold rounded-full gap-2 shadow-2xl shadow-primary/30"
                            onClick={handleGetStarted}
                        >
                            Get Started for Free
                            <CaretRight weight="bold" />
                        </Button>
                    </div>
                </div>
            </section>

            {/* Simple Footer */}
            <footer className="py-12 border-t border-zinc-900 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-3">
                        <WhistlerLogo width={32} height={32} />
                        <span className="font-black italic tracking-tighter text-xl">WHISTLER</span>
                    </div>
                    <div className="flex gap-8 text-sm text-zinc-500 font-medium">
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                        <a href="#" className="hover:text-white transition-colors">Twitter</a>
                        <a href="#" className="hover:text-white transition-colors">GitHub</a>
                    </div>
                    <p className="text-sm text-zinc-600">
                        &copy; 2026 Whistlerbox. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default WelcomeView;
