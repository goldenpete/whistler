/**
 * ─── AboutTab.tsx ──────────────────────────────────────────────────
 *
 * Settings tab showing app branding, version info, feature cards,
 * social links, and legal/credits navigation.
 *
 * Extracted from SettingsView.tsx for maintainability.
 *
 * Exports: AboutTab
 * Related: SettingsView, LegalView
 * ───────────────────────────────────────────────────────────────────
 */
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
    GithubLogo,
    DiscordLogo,
    TwitterLogo,
    EnvelopeSimple,
    Heart,
    Code,
    Sparkle,
} from "@phosphor-icons/react";
import { WhistlerLogo } from "@/components/ui/WhistlerLogo";
import { Button } from "@/components/ui/button";
import LegalView from "@/components/views/LegalView";

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */
export function AboutTab() {
    const location = useLocation();
    const isLegalRoute = location.pathname.startsWith('/settings/legal');

    if (isLegalRoute) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <LegalView isNested />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Hero Section - Main Bento Box */}
            <div className="md:col-span-4 lg:col-span-3 lg:row-span-2 relative group overflow-hidden rounded-none border border-border bg-card/30 p-8 md:p-12 flex flex-col items-center justify-center text-center gap-6 min-h-[400px]">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-none pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-none pointer-events-none" />
                
                <div className="relative">
                    <div className="absolute -inset-8 bg-primary/20 blur-3xl rounded-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <WhistlerLogo width={120} height={120} className="relative drop-shadow-2xl transition-transform duration-700 group-hover:scale-110 group-hover:rotate-3" />
                </div>
                
                <div className="space-y-3 relative">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tighter">Whistlerbox</h1>
                    <div className="flex flex-col items-center gap-1">
                        <p className="text-muted-foreground font-medium flex items-center justify-center gap-2">
                            Version 2.4.0 <span className="w-1.5 h-1.5 rounded-none bg-primary/50" /> Stable Channel
                        </p>
                        <p className="text-xs text-muted-foreground/60">Built with precision for the modern web</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 relative mt-4">
                    <Button variant="outline" className="rounded-none px-8 border-primary/20 hover:border-primary/50 transition-all hover:bg-primary/5" asChild>
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                            <GithubLogo size={20} className="mr-2" />
                            GitHub
                        </a>
                    </Button>
                    <Button className="rounded-none px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" asChild>
                        <a href="https://discord.gg" target="_blank" rel="noopener noreferrer">
                            <DiscordLogo size={20} className="mr-2" weight="fill" />
                            Join Discord
                        </a>
                    </Button>
                </div>
            </div>

            {/* Features - Individual Bento Boxes */}
            {[
                { icon: Sparkle, title: "Modern Design", desc: "Crafted with focus on aesthetics and fluid interactions.", color: "text-blue-400", bg: "bg-blue-400/10" },
                { icon: Code, title: "Open Source", desc: "Built by the community, for the community.", color: "text-purple-400", bg: "bg-purple-400/10" },
                { icon: Heart, title: "Privacy First", desc: "Your data stays with you. No trackers, no bloat.", color: "text-rose-400", bg: "bg-rose-400/10" }
            ].map((item, i) => (
                <div key={i} className={cn(
                    "p-6 rounded-none border border-border/50 bg-card/20 hover:bg-card/40 transition-all group flex flex-col justify-between gap-4",
                    i === 0 ? "md:col-span-2 lg:col-span-1" : "md:col-span-2 lg:col-span-1"
                )}>
                    <div className={cn("w-12 h-12 rounded-none flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3", item.bg, item.color)}>
                        <item.icon size={24} weight="duotone" />
                    </div>
                    <div className="space-y-1.5">
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                </div>
            ))}

            {/* Stay Connected - Social Bento Box */}
            <div className="md:col-span-2 lg:col-span-1 p-6 rounded-none border border-border/50 bg-card/20 hover:bg-card/40 transition-all flex flex-col justify-between gap-6">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Connect</h4>
                <div className="space-y-4">
                    <a href="#" className="flex items-center gap-3 group/link text-foreground/80 hover:text-primary transition-colors">
                        <div className="w-10 h-10 rounded-none border border-border flex items-center justify-center group-hover/link:border-primary/30 group-hover/link:bg-primary/5 transition-all">
                            <TwitterLogo size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">Follow on X</span>
                        </div>
                    </a>
                    <a href="#" className="flex items-center gap-3 group/link text-foreground/80 hover:text-primary transition-colors">
                        <div className="w-10 h-10 rounded-none border border-border flex items-center justify-center group-hover/link:border-primary/30 group-hover/link:bg-primary/5 transition-all">
                            <EnvelopeSimple size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">Newsletter</span>
                        </div>
                    </a>
                </div>
            </div>

            {/* Legal & Credits - Wide Bento Box */}
            <div className="md:col-span-4 lg:col-span-2 p-8 rounded-none border border-border/50 bg-card/20 hover:bg-card/40 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Legal & Credits</h4>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground text-sm" asChild>
                            <Link to="/settings/legal/terms">Terms</Link>
                        </Button>
                        <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground text-sm" asChild>
                            <Link to="/settings/legal/privacy">Privacy</Link>
                        </Button>
                        <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground text-sm" asChild>
                            <Link to="/settings/legal/license">License</Link>
                        </Button>
                    </div>
                </div>
                <div className="text-left md:text-right">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        © 2026 Whistlerbox Labs. <br />
                        Built with ❤️ for the community.
                    </p>
                </div>
            </div>
        </div>
    );
}
