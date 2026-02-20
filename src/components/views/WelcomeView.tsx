import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { 
    Lightning, 
    Fingerprint, 
    ArrowsClockwise, 
    ShieldCheck,
    Globe,
    HardDrives,
    Graph,
    ArrowRight,
    NotePencil,
    Play,
    Sparkle,
    Tag,
    FolderSimple,
    MagnifyingGlass,
    Keyboard,
    SpeakerHigh,
    PictureInPicture,
    Highlighter,
    FilePdf,
    Image,
    Trash,
    SlidersHorizontal,
    Palette,
    MusicNote,
    Pause,
    SkipForward,
    SkipBack,
    ArrowsOutSimple,
    Repeat,
    CursorClick,
    ListBullets,
    GridFour,
    CheckSquare,
    TrashSimple,
    FunnelSimple,
    Selection,
    TextAa,
    Clock,
    PaintBrush,
    LinkSimple,
    ArrowsOut,
    Command,
    CaretDown,
    Rows,
    TreeStructure,
    DownloadSimple,
    LockKey,
    Key,
    NumberSquareEight,
    type Icon
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { WhistlerLogo } from "@/components/ui/WhistlerLogo";
import { useStore } from "@/store/useStore";
import { useNavigate } from "react-router-dom";
import { importProject } from "@/utils/projectData";
import type { Project } from "@/types";

/* ─── Animation ─── */
const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.07, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
    }),
};
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

/* ─── Animated graph web background for hero ─── */
interface WebNode { x: number; y: number; vx: number; vy: number; r: number }

const GraphWebBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const nodesRef = useRef<WebNode[]>([]);
    const animRef = useRef<number>(0);
    const dprRef = useRef(1);

    const CONNECT_DIST = 180;
    const NODE_COUNT = 60;

    const init = useCallback((w: number, h: number) => {
        const nodes: WebNode[] = [];
        for (let i = 0; i < NODE_COUNT; i++) {
            nodes.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 2 + 1.2,
            });
        }
        nodesRef.current = nodes;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const prevSize = { w: 0, h: 0 };

        const resize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            const dpr = window.devicePixelRatio || 1;
            dprRef.current = dpr;
            const w = parent.clientWidth;
            const h = parent.clientHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            if (nodesRef.current.length === 0) {
                init(w, h);
            } else if (prevSize.w > 0 && prevSize.h > 0) {
                // Rescale node positions proportionally to new size
                const sx = w / prevSize.w;
                const sy = h / prevSize.h;
                for (const n of nodesRef.current) {
                    n.x *= sx;
                    n.y *= sy;
                }
            }
            prevSize.w = w;
            prevSize.h = h;
        };
        resize();
        window.addEventListener("resize", resize);

        const tick = () => {
            const dpr = dprRef.current;
            const w = canvas.width / dpr;
            const h = canvas.height / dpr;
            const nodes = nodesRef.current;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);

            // Resolve primary color to rgb for canvas use
            const primary = getComputedStyle(canvas).getPropertyValue("--primary").trim();
            // Parse HSL string like "142 71% 45%" into usable rgb
            let r = 255, g = 255, b = 255;
            if (primary) {
                const parts = primary.split(/\s+/);
                if (parts.length >= 3) {
                    const h = parseFloat(parts[0]) / 360;
                    const s = parseFloat(parts[1]) / 100;
                    const l = parseFloat(parts[2]) / 100;
                    const hue2rgb = (p: number, q: number, t: number) => {
                        if (t < 0) t += 1; if (t > 1) t -= 1;
                        if (t < 1/6) return p + (q - p) * 6 * t;
                        if (t < 1/2) return q;
                        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                        return p;
                    };
                    if (s === 0) { r = g = b = Math.round(l * 255); }
                    else {
                        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                        const p = 2 * l - q;
                        r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
                        g = Math.round(hue2rgb(p, q, h) * 255);
                        b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
                    }
                }
            }

            // Move nodes
            for (const n of nodes) {
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < 0 || n.x > w) n.vx *= -1;
                if (n.y < 0 || n.y > h) n.vy *= -1;
                n.x = Math.max(0, Math.min(w, n.x));
                n.y = Math.max(0, Math.min(h, n.y));
            }

            // Draw edges
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECT_DIST) {
                        const alpha = (1 - dist / CONNECT_DIST) * 0.12;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }

            // Draw nodes
            for (const n of nodes) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${r},${g},${b},0.22)`;
                ctx.fill();
            }

            animRef.current = requestAnimationFrame(tick);
        };
        animRef.current = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener("resize", resize);
        };
    }, [init]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden
        />
    );
};

/* ─── Chip sub-feature type ─── */
type ChipDetail = {
    label: string;
    title: string;
    desc: string;
    mockup: ReactNode;
};

/* ═══════════════════════════════════════════════════════
   MINI MOCKUPS — one per chip
   ═══════════════════════════════════════════════════════ */

// --- Media: default ---
const VideoPlayerMockup = () => (
    <div className="border border-border/40 bg-card/40 overflow-hidden">
        <div className="aspect-video bg-muted/30 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-muted/5" />
            <Play weight="fill" size={36} className="text-muted-foreground/20" />
            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-background/70 border border-border/30 text-[9px] text-muted-foreground/60 flex items-center gap-1">
                <PictureInPicture size={10} /> PiP
            </div>
        </div>
        <div className="px-3 py-2 border-t border-border/30 flex items-center gap-2">
            <Play weight="fill" size={12} className="text-primary" />
            <div className="flex-1 h-1 bg-muted/40 relative">
                <div className="h-full w-[35%] bg-primary/60" />
                <div className="absolute left-[35%] -top-8 -translate-x-1/2 w-12 h-7 bg-muted/60 border border-border/30 flex items-center justify-center text-[7px] text-muted-foreground/50">1:24</div>
            </div>
            <span className="text-[9px] text-muted-foreground/50 font-mono">1:24 / 4:02</span>
            <SpeakerHigh size={11} className="text-muted-foreground/40" />
            <span className="text-[9px] text-muted-foreground/40">1.0x</span>
        </div>
    </div>
);

// Media chip mockups
const VideoChipMockup = () => (
    <div className="border border-border/40 bg-card/40 overflow-hidden">
        <div className="aspect-video bg-muted/30 relative flex items-center justify-center">
            <Play weight="fill" size={28} className="text-muted-foreground/15" />
            <div className="absolute bottom-0 inset-x-0 bg-background/80 border-t border-border/20 px-3 py-1.5 flex items-center gap-2">
                <Pause weight="fill" size={10} className="text-primary" />
                <div className="flex-1 h-0.5 bg-muted/40"><div className="h-full w-[60%] bg-primary/60" /></div>
                <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground/50">
                    <span className="px-1 border border-border/20 bg-muted/30">0.25x</span>
                    <span className="px-1 border border-primary/40 bg-primary/10 text-primary">1x</span>
                    <span className="px-1 border border-border/20 bg-muted/30">2x</span>
                    <span className="px-1 border border-border/20 bg-muted/30">4x</span>
                </div>
            </div>
            {/* A-B loop indicator */}
            <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-[8px] text-primary">
                <Repeat size={9} /> A–B Loop
            </div>
            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-background/70 border border-border/30 text-[8px] text-muted-foreground/50 flex items-center gap-1">
                <ArrowsOutSimple size={9} /> Fullscreen
            </div>
        </div>
    </div>
);

const AudioChipMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 space-y-3">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <SpeakerHigh size={12} /> <span>voiceover.mp3</span>
        </div>
        {/* Waveform bars */}
        <div className="flex items-end gap-px h-10">
            {[30,50,70,40,80,60,90,45,65,85,35,55,75,40,60,80,50,70,45,65,90,55,40,70,50,80,60,35,75,55].map((h, i) => (
                <div key={i} className={`flex-1 ${i < 12 ? 'bg-primary/50' : 'bg-muted/30'}`} style={{ height: `${h}%` }} />
            ))}
        </div>
        <div className="flex items-center justify-between text-[9px] text-muted-foreground/40">
            <div className="flex items-center gap-2">
                <SkipBack size={10} /> <Play weight="fill" size={10} className="text-primary" /> <SkipForward size={10} />
                <span className="ml-2 px-1 border border-border/20">1.0x</span>
            </div>
            <span className="font-mono">0:38 / 1:52</span>
        </div>
    </div>
);

const ImageChipMockup = () => (
    <div className="border border-border/40 bg-card/40 overflow-hidden">
        <div className="aspect-[4/3] bg-muted/20 relative flex items-center justify-center">
            <Image weight="duotone" size={40} className="text-muted-foreground/10" />
            {/* Zoom controls */}
            <div className="absolute bottom-2 right-2 flex gap-1 text-[8px] text-muted-foreground/50">
                <div className="w-5 h-5 border border-border/30 bg-background/60 flex items-center justify-center">−</div>
                <div className="px-1.5 h-5 border border-border/30 bg-background/60 flex items-center justify-center">120%</div>
                <div className="w-5 h-5 border border-border/30 bg-background/60 flex items-center justify-center">+</div>
            </div>
            {/* Region highlight overlay */}
            <div className="absolute top-[20%] left-[25%] w-[30%] h-[35%] border-2 border-dashed border-violet-400/40 bg-violet-400/5" />
            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-background/70 border border-border/30 text-[8px] text-muted-foreground/50 flex items-center gap-1">
                <CursorClick size={9} /> Pan & zoom
            </div>
        </div>
    </div>
);

const PdfChipMockup = () => (
    <div className="border border-border/40 bg-card/40 overflow-hidden">
        <div className="aspect-[3/4] max-h-48 bg-muted/10 relative p-4">
            {/* Fake PDF text lines */}
            <div className="space-y-1.5">
                {[85, 90, 70, 80, 75, 60, 85, 50].map((w, i) => (
                    <div key={i} className="h-1 bg-muted/20" style={{ width: `${w}%` }} />
                ))}
                {/* Selected text highlight */}
                <div className="h-1 bg-sky-400/30 w-[65%]" />
                <div className="h-1 bg-sky-400/30 w-[80%]" />
                <div className="h-1 bg-sky-400/30 w-[40%]" />
                {[70, 85, 60].map((w, i) => (
                    <div key={`b${i}`} className="h-1 bg-muted/20" style={{ width: `${w}%` }} />
                ))}
            </div>
            {/* Page nav */}
            <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-2 text-[8px] text-muted-foreground/40">
                <span className="px-1.5 py-0.5 border border-border/20 bg-background/60">← Prev</span>
                <span>Page 3 of 12</span>
                <span className="px-1.5 py-0.5 border border-border/20 bg-background/60">Next →</span>
            </div>
        </div>
    </div>
);

const YoutubeChipMockup = () => (
    <div className="border border-border/40 bg-card/40 overflow-hidden">
        <div className="aspect-video bg-muted/30 relative flex items-center justify-center">
            <div className="w-14 h-10 bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <Play weight="fill" size={16} className="text-red-400/60" />
            </div>
            <div className="absolute bottom-0 inset-x-0 bg-background/80 border-t border-border/20 px-3 py-1 text-[8px] text-muted-foreground/40 flex items-center gap-2">
                <Play weight="fill" size={9} className="text-primary" />
                <div className="flex-1 h-0.5 bg-muted/40"><div className="h-full w-[20%] bg-red-400/60" /></div>
                <span className="font-mono">0:45 / 12:30</span>
            </div>
            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-background/70 border border-border/30 text-[8px] text-muted-foreground/50">
                youtube.com/watch?v=...
            </div>
        </div>
    </div>
);

// --- Organization: default ---
const OrganizationMockup = () => (
    <div className="border border-border/40 bg-card/40 p-3 space-y-1.5 text-[10px]">
        <div className="flex items-center gap-2 text-muted-foreground/70 pb-1 border-b border-border/20 mb-1">
            <HardDrives size={11} /> <span>My Storage</span>
        </div>
        {[
            { icon: FolderSimple, name: "Video Assets", indent: 0, color: "text-amber-400/60" },
            { icon: Play, name: "intro-final.mp4", indent: 1, color: "text-muted-foreground/50" },
            { icon: Play, name: "b-roll-city.mp4", indent: 1, color: "text-muted-foreground/50" },
            { icon: FolderSimple, name: "Audio", indent: 0, color: "text-sky-400/60" },
            { icon: SpeakerHigh, name: "voiceover.mp3", indent: 1, color: "text-muted-foreground/50" },
            { icon: FolderSimple, name: "Documents", indent: 0, color: "text-emerald-400/60" },
            { icon: FilePdf, name: "brief.pdf", indent: 1, color: "text-muted-foreground/50" },
            { icon: Image, name: "cover.png", indent: 1, color: "text-muted-foreground/50" },
        ].map((item, i) => (
            <div key={i} className={`flex items-center gap-1.5 py-0.5 ${item.color}`} style={{ paddingLeft: item.indent * 14 }}>
                <item.icon size={11} /> <span>{item.name}</span>
            </div>
        ))}
    </div>
);

// Organization chip mockups
const DragDropMockup = () => (
    <div className="border border-border/40 bg-card/40 p-3 space-y-1 text-[10px]">
        <div className="flex items-center gap-1.5 py-1 px-2 text-muted-foreground/50">
            <FolderSimple size={11} className="text-amber-400/60" /> <span>Video Assets</span>
        </div>
        {/* Dragging item */}
        <div className="flex items-center gap-1.5 py-1 px-2 bg-primary/10 border border-primary/20 text-foreground/60 relative">
            <Play size={11} /> <span>b-roll-city.mp4</span>
            <CursorClick size={10} className="text-primary ml-auto" />
        </div>
        <div className="h-0.5 bg-primary/30 mx-2" />
        <div className="flex items-center gap-1.5 py-1 px-2 text-muted-foreground/40">
            <Play size={11} /> <span>intro-final.mp4</span>
        </div>
        <div className="flex items-center gap-1.5 py-1 px-2 text-muted-foreground/40">
            <SpeakerHigh size={11} /> <span>voiceover.mp3</span>
        </div>
    </div>
);

const GridListMockup = () => (
    <div className="border border-border/40 bg-card/40 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 text-[9px] text-muted-foreground/40">
            <div className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary flex items-center gap-1"><GridFour size={9} /> Grid</div>
            <div className="px-1.5 py-0.5 border border-border/20 flex items-center gap-1"><ListBullets size={9} /> List</div>
        </div>
        <div className="p-2 grid grid-cols-3 gap-1.5">
            {["intro.mp4", "b-roll.mp4", "cover.png", "brief.pdf", "voice.mp3", "notes.doc"].map((f, i) => (
                <div key={i} className="border border-border/20 bg-muted/10 p-2 flex flex-col items-center gap-1 text-[8px] text-muted-foreground/40">
                    <div className="w-full aspect-square bg-muted/20 flex items-center justify-center">
                        {i < 2 ? <Play size={10} /> : i === 2 ? <Image size={10} /> : i === 3 ? <FilePdf size={10} /> : i === 4 ? <SpeakerHigh size={10} /> : <NotePencil size={10} />}
                    </div>
                    <span className="truncate w-full text-center">{f}</span>
                </div>
            ))}
        </div>
    </div>
);

const MultiSelectMockup = () => (
    <div className="border border-border/40 bg-card/40 p-2 space-y-0.5 text-[10px]">
        <div className="px-2 py-1 text-[9px] text-primary mb-1">3 items selected</div>
        {[
            { name: "intro-final.mp4", selected: true },
            { name: "b-roll-city.mp4", selected: true },
            { name: "voiceover.mp3", selected: false },
            { name: "cover.png", selected: true },
            { name: "brief.pdf", selected: false },
        ].map((f, i) => (
            <div key={i} className={`flex items-center gap-2 px-2 py-1 ${f.selected ? 'bg-primary/10 border border-primary/20' : 'text-muted-foreground/40'}`}>
                <div className={`w-3.5 h-3.5 border flex items-center justify-center ${f.selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border/40'}`}>
                    {f.selected && <span className="text-[7px]">✓</span>}
                </div>
                <span className={f.selected ? 'text-foreground/70' : ''}>{f.name}</span>
            </div>
        ))}
    </div>
);

const BulkActionsMockup = () => (
    <div className="border border-border/40 bg-card/40 p-3 space-y-2 text-[10px]">
        <div className="text-[9px] text-primary mb-1">3 items selected</div>
        <div className="flex flex-wrap gap-1.5">
            {[
                { icon: FolderSimple, label: "Move to…" },
                { icon: TrashSimple, label: "Delete" },
                { icon: ArrowsOut, label: "Open" },
            ].map((a, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-1 border border-border/30 bg-muted/20 text-muted-foreground/60 hover:border-border/50 cursor-default">
                    <a.icon size={10} /> <span>{a.label}</span>
                </div>
            ))}
        </div>
        <div className="border-t border-border/20 pt-2 text-muted-foreground/30 text-[9px]">
            Apply actions to all selected items at once
        </div>
    </div>
);

const SearchFilterMockup = () => (
    <div className="border border-border/40 bg-card/40 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20">
            <MagnifyingGlass size={11} className="text-muted-foreground/40" />
            <span className="text-[10px] text-foreground/50">intro</span>
        </div>
        <div className="px-3 py-1.5 border-b border-border/10 flex items-center gap-1.5 text-[8px] text-muted-foreground/40">
            <FunnelSimple size={9} />
            {["All", "Video", "Audio", "Image", "PDF"].map((f, i) => (
                <span key={f} className={`px-1.5 py-0.5 border ${i === 1 ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/20'}`}>{f}</span>
            ))}
        </div>
        <div className="p-1.5 text-[10px]">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/5">
                <Play size={10} className="text-muted-foreground/40" /> <span className="text-foreground/60">intro-final.mp4</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1">
                <Play size={10} className="text-muted-foreground/30" /> <span className="text-muted-foreground/40">intro-draft.mp4</span>
            </div>
        </div>
    </div>
);

// --- Highlights: default ---
const HighlightMockup = () => (
    <div className="border border-border/40 bg-card/40 p-3 space-y-2 text-[10px]">
        <div className="flex items-center gap-2 text-muted-foreground/70 pb-1 border-b border-border/20">
            <Highlighter size={11} /> <span>Highlights</span>
        </div>
        {[
            { time: "0:42 – 1:15", note: "Great intro shot", color: "border-l-amber-400/60" },
            { time: "2:30 – 2:58", note: "Use this b-roll", color: "border-l-sky-400/60" },
            { time: "Page 3, paragraph 2", note: "Key statistic", color: "border-l-emerald-400/60" },
            { time: "Region selection", note: "Logo placement", color: "border-l-violet-400/60" },
        ].map((h, i) => (
            <div key={i} className={`border-l-2 ${h.color} pl-2 py-1`}>
                <div className="text-muted-foreground/40 font-mono text-[8px]">{h.time}</div>
                <div className="text-foreground/60">{h.note}</div>
            </div>
        ))}
    </div>
);

// Highlight chip mockups
const TimeRangeMockup = () => (
    <div className="border border-border/40 bg-card/40 overflow-hidden">
        <div className="aspect-video bg-muted/30 relative flex items-center justify-center">
            <Play weight="fill" size={20} className="text-muted-foreground/15" />
            {/* Timeline with highlighted range */}
            <div className="absolute bottom-0 inset-x-0 bg-background/80 border-t border-border/20 px-3 py-2">
                <div className="h-2 bg-muted/30 relative">
                    <div className="absolute left-[20%] w-[25%] h-full bg-amber-400/30 border-x-2 border-amber-400/60" />
                    <div className="absolute left-[20%] -top-4 text-[7px] text-amber-400/60 font-mono">0:42</div>
                    <div className="absolute left-[45%] -top-4 text-[7px] text-amber-400/60 font-mono -translate-x-full">1:15</div>
                </div>
                <div className="mt-1.5 text-[8px] text-muted-foreground/40">Highlight: "Great intro shot"</div>
            </div>
        </div>
    </div>
);

const PdfSelectionMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 space-y-1.5">
        <div className="text-[9px] text-muted-foreground/40 mb-2">PDF — Page 3</div>
        {[80, 90, 75].map((w, i) => (
            <div key={`a${i}`} className="h-1 bg-muted/20" style={{ width: `${w}%` }} />
        ))}
        {/* Selected range */}
        <div className="h-1.5 bg-emerald-400/30 w-[70%] border-b border-emerald-400/40" />
        <div className="h-1.5 bg-emerald-400/30 w-[85%] border-b border-emerald-400/40" />
        <div className="h-1.5 bg-emerald-400/30 w-[45%] border-b border-emerald-400/40" />
        {[65, 80].map((w, i) => (
            <div key={`b${i}`} className="h-1 bg-muted/20" style={{ width: `${w}%` }} />
        ))}
        <div className="mt-2 border-t border-border/20 pt-2 text-[8px] text-emerald-400/50">
            Selected: "The quarterly revenue increased by 28%..."
        </div>
    </div>
);

const ImageRegionMockup = () => (
    <div className="border border-border/40 bg-card/40 overflow-hidden">
        <div className="aspect-[4/3] bg-muted/15 relative">
            <Image weight="duotone" size={30} className="text-muted-foreground/10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            {/* Selection rectangle */}
            <div className="absolute top-[15%] left-[20%] w-[40%] h-[45%] border-2 border-dashed border-violet-400/50 bg-violet-400/5">
                <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-violet-400/60 border border-violet-400" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-violet-400/60 border border-violet-400" />
                <div className="absolute -bottom-0.5 -left-0.5 w-2 h-2 bg-violet-400/60 border border-violet-400" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-violet-400/60 border border-violet-400" />
            </div>
            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-background/70 border border-border/30 text-[8px] text-violet-400/60">
                Region: 20%, 15% → 60%, 60%
            </div>
        </div>
    </div>
);

const NotesColorsMockup = () => (
    <div className="border border-border/40 bg-card/40 p-3 space-y-2 text-[10px]">
        <div className="text-[9px] text-muted-foreground/50 mb-1">Edit Highlight</div>
        <div className="border border-border/20 p-2 bg-muted/10 text-foreground/50 min-h-[3rem]">
            Great intro shot — use as opening sequence
        </div>
        <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[9px] text-muted-foreground/40 mr-1">Color:</span>
            {["bg-amber-400", "bg-sky-400", "bg-emerald-400", "bg-violet-400", "bg-rose-400", "bg-orange-400"].map((c, i) => (
                <div key={i} className={`w-4 h-4 ${c} ${i === 0 ? 'ring-1 ring-offset-1 ring-offset-background ring-foreground/30' : 'opacity-50'}`} />
            ))}
        </div>
        <div className="flex items-center gap-1.5 pt-1 text-[9px] text-muted-foreground/40">
            <Tag size={10} /> Collection: Intro Highlights
        </div>
    </div>
);

// --- Graph: default ---
const GraphMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        {[
            { x: 15, y: 20, label: "intro.mp4", icon: Play, color: "border-amber-400/40" },
            { x: 60, y: 15, label: "Script", icon: NotePencil, color: "border-emerald-400/40" },
            { x: 38, y: 60, label: "B-Roll", icon: Tag, color: "border-sky-400/40" },
            { x: 72, y: 55, label: "Final Cut", icon: FolderSimple, color: "border-violet-400/40" },
        ].map((node, i) => (
            <div key={i} className={`absolute flex items-center gap-1 px-2 py-1 border ${node.color} bg-background/60 text-[9px] text-foreground/60`}
                style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
                <node.icon size={10} /> {node.label}
            </div>
        ))}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <line x1="25%" y1="25%" x2="52%" y2="60%" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
            <line x1="65%" y1="22%" x2="52%" y2="60%" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
            <line x1="52%" y1="60%" x2="72%" y2="55%" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
            <line x1="25%" y1="25%" x2="65%" y2="22%" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        </svg>
    </div>
);

// --- Collections: default ---
const CollectionsMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        {/* Bucket header */}
        <div className="flex items-center gap-1.5 text-[9px] text-foreground/50 mb-3 border-b border-border/20 pb-2">
            <TreeStructure size={10} /> Main Bucket
        </div>
        {/* Folder */}
        <div className="ml-2 mb-2">
            <div className="flex items-center gap-1.5 text-[8px] text-foreground/40 mb-1.5">
                <FolderSimple size={9} /> Interview footage
            </div>
            {/* Collections inside folder */}
            <div className="ml-3 space-y-1">
                {[
                    { name: "Best takes", color: "bg-emerald-400/60", count: 8 },
                    { name: "B-Roll picks", color: "bg-sky-400/60", count: 5 },
                ].map(c => (
                    <div key={c.name} className="flex items-center gap-1.5 text-[8px] text-muted-foreground/50">
                        <div className={`w-1.5 h-1.5 ${c.color}`} />
                        <Tag size={8} /> {c.name}
                        <span className="ml-auto text-[7px] text-muted-foreground/30">{c.count}</span>
                    </div>
                ))}
            </div>
        </div>
        {/* Second folder */}
        <div className="ml-2">
            <div className="flex items-center gap-1.5 text-[8px] text-foreground/40 mb-1.5">
                <FolderSimple size={9} /> Sound design
            </div>
            <div className="ml-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground/50">
                    <div className="w-1.5 h-1.5 bg-violet-400/60" />
                    <Tag size={8} /> Ambient tracks
                    <span className="ml-auto text-[7px] text-muted-foreground/30">3</span>
                </div>
            </div>
        </div>
    </div>
);

// Collections chip mockups
const BucketsFoldersMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[9px] text-foreground/60 border border-border/30 px-2 py-1.5 bg-background/40">
                <TreeStructure size={10} className="text-primary/60" /> Main Bucket
                <span className="ml-auto text-[7px] text-muted-foreground/30">12 items</span>
            </div>
            <div className="ml-3 flex items-center gap-1.5 text-[8px] text-muted-foreground/50 border border-border/20 px-2 py-1 bg-background/20">
                <FolderSimple size={9} /> Interview footage
                <span className="ml-auto text-[7px] text-muted-foreground/30">2 collections</span>
            </div>
            <div className="ml-6 flex items-center gap-1.5 text-[8px] text-muted-foreground/40 border border-emerald-400/30 px-2 py-1 bg-background/20">
                <div className="w-1.5 h-1.5 bg-emerald-400/60" /> <Tag size={8} /> Best takes
            </div>
            <div className="ml-3 flex items-center gap-1.5 text-[8px] text-muted-foreground/50 border border-border/20 px-2 py-1 bg-background/20">
                <FolderSimple size={9} /> Sound design
                <span className="ml-auto text-[7px] text-muted-foreground/30">1 collection</span>
            </div>
        </div>
        <div className="absolute bottom-2 left-2 text-[8px] text-muted-foreground/30">Three-level hierarchy: buckets → folders → collections</div>
    </div>
);

const ColorIconMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        <div className="space-y-3">
            <div className="text-[8px] text-muted-foreground/40 uppercase tracking-wider">Collection color & icon</div>
            <div className="flex gap-1.5">
                {["bg-red-400", "bg-amber-400", "bg-emerald-400", "bg-sky-400", "bg-violet-400", "bg-pink-400"].map(c => (
                    <div key={c} className={`w-5 h-5 ${c} ${c === 'bg-emerald-400' ? 'ring-1 ring-white/40' : 'opacity-50'}`} />
                ))}
            </div>
            <div className="flex gap-2 flex-wrap">
                {[Tag, Highlighter, FolderSimple, Clock, PaintBrush, Sparkle].map((I, idx) => (
                    <div key={idx} className={`p-1.5 border text-[10px] ${idx === 0 ? 'border-primary/40 text-primary/70 bg-primary/5' : 'border-border/20 text-muted-foreground/30'}`}>
                        <I size={12} />
                    </div>
                ))}
            </div>
        </div>
        <div className="absolute bottom-2 left-2 text-[8px] text-muted-foreground/30">Personalize with 22 icons and custom colors</div>
    </div>
);

const DragReorderMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        <div className="space-y-1">
            {[
                { name: "Best takes", color: "border-emerald-400/50", y: 0 },
                { name: "B-Roll picks", color: "border-sky-400/50", y: 0, dragging: true },
                { name: "Ambient tracks", color: "border-violet-400/50", y: 0 },
            ].map((c, i) => (
                <div key={c.name} className={`flex items-center gap-2 px-2 py-1.5 border ${c.color} bg-background/40 text-[8px] text-muted-foreground/50 ${c.dragging ? 'ring-1 ring-primary/30 shadow-lg translate-x-1 -translate-y-0.5' : ''}`}>
                    <Rows size={8} className="text-muted-foreground/30" />
                    <div className={`w-1.5 h-1.5 ${c.color.replace('border-', 'bg-').replace('/50', '/60')}`} />
                    <Tag size={8} /> {c.name}
                </div>
            ))}
        </div>
        <div className="absolute bottom-2 left-2 text-[8px] text-muted-foreground/30">Drag to reorder collections and folders</div>
    </div>
);

const ViewModeCollMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
            <div className="flex border border-border/30 overflow-hidden">
                {[{ icon: GridFour, active: true }, { icon: ListBullets, active: false }, { icon: Rows, active: false }].map(({ icon: I, active }, idx) => (
                    <div key={idx} className={`px-1.5 py-1 ${active ? 'bg-primary/10 text-primary/70' : 'text-muted-foreground/30'}`}>
                        <I size={10} />
                    </div>
                ))}
            </div>
            <span className="text-[7px] text-muted-foreground/30">Grid / List / Cards</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square border border-border/20 bg-background/20 flex items-center justify-center">
                    <Tag size={10} className="text-muted-foreground/20" />
                </div>
            ))}
        </div>
        <div className="absolute bottom-2 left-2 text-[8px] text-muted-foreground/30">Switch between grid, list, and card layouts</div>
    </div>
);

const HighlightGroupMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        <div className="flex items-center gap-1.5 text-[9px] text-foreground/60 mb-2">
            <div className="w-2 h-2 bg-emerald-400/60" /> <Tag size={9} /> Best takes
            <span className="ml-auto text-[7px] text-muted-foreground/30">8 highlights</span>
        </div>
        <div className="space-y-1">
            {[
                { type: "Video", label: "00:42 – 01:15", icon: Play },
                { type: "Video", label: "03:10 – 03:28", icon: Play },
                { type: "PDF", label: "Page 3, \"key insight\"", icon: FilePdf },
                { type: "Image", label: "Region (120,40)", icon: Image },
            ].map((h, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1 border border-border/20 bg-background/20 text-[7px] text-muted-foreground/40">
                    <h.icon size={8} /> <span className="text-muted-foreground/30">{h.type}</span> {h.label}
                </div>
            ))}
        </div>
        <div className="absolute bottom-2 left-2 text-[8px] text-muted-foreground/30">Group highlights from different media types</div>
    </div>
);

const collectionChips: ChipDetail[] = [
    { label: "Buckets & folders", title: "Buckets & folders", desc: "Collections are organized in a three-level tree: buckets at the root, folders for grouping, and collections as the leaves that hold your highlights. This structure keeps large projects manageable.", mockup: <BucketsFoldersMockup /> },
    { label: "Colors & icons", title: "Colors & icons", desc: "Assign a color and one of 22 Phosphor icons to any collection, folder, or bucket. Colors carry through to graph nodes and sidebar indicators so you can identify groups at a glance.", mockup: <ColorIconMockup /> },
    { label: "Drag & drop", title: "Drag & drop reordering", desc: "Reorder collections and folders by dragging them into the position you want. Move collections between folders, or folders between buckets, with a single drag gesture.", mockup: <DragReorderMockup /> },
    { label: "View modes", title: "Grid, list & cards", desc: "Switch the collections browser between grid, list, and card layouts depending on how you prefer to browse. Each view shows thumbnail previews generated from the highlights inside.", mockup: <ViewModeCollMockup /> },
    { label: "Highlight groups", title: "Highlight groups", desc: "A collection gathers highlights from any media type — video time ranges, audio clips, PDF text selections, and image regions — into a single reviewable set.", mockup: <HighlightGroupMockup /> },
];

// Graph chip mockups
const makeNodeMockup = (icon: Icon, label: string, borderColor: string, desc: string) => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        {/* Highlighted node */}
        <div className={`absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 border-2 ${borderColor} bg-background/80 text-[10px] text-foreground/70 shadow-lg`}>
            {(() => { const I = icon; return <I size={12} />; })()}
            {label}
        </div>
        {/* Faded connected nodes */}
        <div className="absolute left-[15%] top-[20%] flex items-center gap-1 px-2 py-1 border border-border/20 bg-background/30 text-[8px] text-muted-foreground/30">
            <Play size={9} /> video.mp4
        </div>
        <div className="absolute right-[12%] top-[25%] flex items-center gap-1 px-2 py-1 border border-border/20 bg-background/30 text-[8px] text-muted-foreground/30">
            <NotePencil size={9} /> notes
        </div>
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line x1="30%" y1="28%" x2="48%" y2="38%" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
            <line x1="72%" y1="30%" x2="55%" y2="38%" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
        </svg>
        <div className="absolute bottom-2 left-2 text-[8px] text-muted-foreground/30">{desc}</div>
    </div>
);

const EdgeDrawingMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        <div className="absolute left-[20%] top-[35%] flex items-center gap-1 px-2 py-1 border border-amber-400/40 bg-background/60 text-[9px] text-foreground/60">
            <Play size={10} /> intro.mp4
        </div>
        <div className="absolute right-[18%] top-[40%] flex items-center gap-1 px-2 py-1 border border-emerald-400/40 bg-background/60 text-[9px] text-foreground/60">
            <NotePencil size={10} /> Script
        </div>
        {/* Animated edge being drawn */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line x1="38%" y1="40%" x2="65%" y2="44%" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx="65%" cy="44%" r="3" fill="currentColor" fillOpacity="0.2" />
        </svg>
        <div className="absolute bottom-2 left-2 text-[8px] text-muted-foreground/30 flex items-center gap-1">
            <CursorClick size={9} /> Click and drag between nodes to connect
        </div>
    </div>
);

// --- Documents: default ---
const DocEditorMockup = () => (
    <div className="border border-border/40 bg-card/40 overflow-hidden">
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/20 text-muted-foreground/30">
            {["B", "I", "U", "S"].map(l => (
                <div key={l} className="w-5 h-5 flex items-center justify-center border border-border/20 text-[9px]">{l}</div>
            ))}
            <div className="w-px h-4 bg-border/20 mx-1" />
            <div className="w-5 h-5 flex items-center justify-center border border-border/20 text-[8px]">H1</div>
            <div className="w-5 h-5 flex items-center justify-center border border-border/20 text-[8px]">H2</div>
        </div>
        <div className="p-4 space-y-2 text-[10px]">
            <div className="text-foreground/50 text-sm">Project Brief</div>
            <div className="text-muted-foreground/40 leading-relaxed">
                The goal of this project is to create a short-form video combining the interview footage with supporting b-roll...
            </div>
            <div className="h-px bg-border/10 my-1" />
            <div className="text-muted-foreground/30 leading-relaxed">Referenced files: intro.mp4, cover.png</div>
        </div>
    </div>
);

// Document chip mockups
const RichFormattingMockup = () => (
    <div className="border border-border/40 bg-card/40 overflow-hidden">
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/20 text-muted-foreground/30">
            {[
                { l: "B", active: true }, { l: "I", active: false }, { l: "U", active: false },
                { l: "S", active: false },
            ].map(b => (
                <div key={b.l} className={`w-5 h-5 flex items-center justify-center border text-[9px] ${b.active ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/20'}`}>{b.l}</div>
            ))}
            <div className="w-px h-4 bg-border/20 mx-1" />
            {["H1", "H2", "H3"].map(h => (
                <div key={h} className="w-6 h-5 flex items-center justify-center border border-border/20 text-[8px]">{h}</div>
            ))}
            <div className="w-px h-4 bg-border/20 mx-1" />
            <ListBullets size={10} className="text-muted-foreground/30" />
            <TextAa size={10} className="text-muted-foreground/30 ml-1" />
            <LinkSimple size={10} className="text-muted-foreground/30 ml-1" />
        </div>
        <div className="p-4 space-y-1.5 text-[10px]">
            <div className="text-foreground/60 text-sm">Heading One</div>
            <div className="text-foreground/40"><span className="text-foreground/60" style={{ fontWeight: 600 }}>Bold text</span> and <span className="italic">italic text</span> and <span className="underline">underlined</span></div>
            <div className="text-muted-foreground/30 line-through">Strikethrough text</div>
        </div>
    </div>
);

const FileEmbedsMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 space-y-2 text-[10px]">
        <div className="text-foreground/50 text-sm">Production Notes</div>
        <div className="text-muted-foreground/40">Use the following clip as the opener:</div>
        {/* Embedded file reference */}
        <div className="flex items-center gap-2 px-2 py-1.5 border border-primary/20 bg-primary/5">
            <Play size={12} className="text-primary" />
            <span className="text-foreground/60">intro-final.mp4</span>
            <span className="text-[8px] text-muted-foreground/30 ml-auto">Embedded file</span>
        </div>
        <div className="text-muted-foreground/40">And pair it with this cover image:</div>
        <div className="flex items-center gap-2 px-2 py-1.5 border border-primary/20 bg-primary/5">
            <Image size={12} className="text-primary" />
            <span className="text-foreground/60">cover.png</span>
            <span className="text-[8px] text-muted-foreground/30 ml-auto">Embedded file</span>
        </div>
    </div>
);

const AutoSaveMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 space-y-3 text-[10px]">
        <div className="flex items-center justify-between">
            <span className="text-foreground/50 text-sm">Project Brief</span>
            <span className="text-[9px] text-emerald-400/60 flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-400/60" /> Saved
            </span>
        </div>
        <div className="text-muted-foreground/40 leading-relaxed">
            The goal of this project is to create a short-form video combining the interview footage with supporting b-roll...
            <span className="border-r-2 border-primary/60 animate-pulse" />
        </div>
        <div className="border-t border-border/20 pt-2 text-[8px] text-muted-foreground/30">
            Changes are saved automatically as you type
        </div>
    </div>
);

const ViewModesMockup = () => (
    <div className="border border-border/40 bg-card/40 overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/20 text-[8px] text-muted-foreground/40">
            <span className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary">Page</span>
            <span className="px-1.5 py-0.5 border border-border/20">Pageless</span>
            <span className="px-1.5 py-0.5 border border-border/20">Wide</span>
        </div>
        <div className="p-4 flex justify-center">
            <div className="w-3/4 border border-border/10 bg-muted/5 p-3 space-y-1.5">
                <div className="h-1.5 bg-muted/20 w-[60%]" />
                <div className="h-1 bg-muted/15 w-[90%]" />
                <div className="h-1 bg-muted/15 w-[85%]" />
                <div className="h-1 bg-muted/15 w-[70%]" />
                <div className="h-1 bg-muted/15 w-[80%]" />
            </div>
        </div>
        <div className="text-center text-[8px] text-muted-foreground/30 pb-2">Fixed-width page mode</div>
    </div>
);

// --- Spotlight: default ---
const SpotlightMockup = () => (
    <div className="border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden max-w-xs mx-auto">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20">
            <MagnifyingGlass size={12} className="text-muted-foreground/40" />
            <span className="text-[10px] text-foreground/50">intro</span>
            <kbd className="ml-auto text-[8px] text-muted-foreground/30 border border-border/20 px-1">Esc</kbd>
        </div>
        <div className="p-1 text-[10px]">
            {[
                { icon: Play, label: "intro-final.mp4", type: "File" },
                { icon: Tag, label: "Intro Highlights", type: "Collection" },
                { icon: NotePencil, label: "Intro Script", type: "Doc" },
            ].map((r, i) => (
                <div key={i} className={`flex items-center gap-2 px-2 py-1.5 ${i === 0 ? "bg-primary/10" : ""}`}>
                    <r.icon size={11} className="text-muted-foreground/40" />
                    <span className="text-foreground/60 flex-1">{r.label}</span>
                    <span className="text-muted-foreground/30 text-[8px]">{r.type}</span>
                </div>
            ))}
        </div>
    </div>
);

// Spotlight chip mockups
const FuzzySearchMockup = () => (
    <div className="border border-border/40 bg-card/60 overflow-hidden max-w-xs mx-auto">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20">
            <MagnifyingGlass size={12} className="text-muted-foreground/40" />
            <span className="text-[10px] text-foreground/50">brl</span>
        </div>
        <div className="p-1 text-[10px]">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-primary/10">
                <Play size={11} className="text-muted-foreground/40" />
                <span className="text-foreground/60"><span className="text-primary">b</span>-<span className="text-primary">r</span>ol<span className="text-primary">l</span>-city.mp4</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5">
                <Tag size={11} className="text-muted-foreground/30" />
                <span className="text-muted-foreground/50"><span className="text-primary/60">B</span>-<span className="text-primary/60">R</span>ol<span className="text-primary/60">l</span> Collection</span>
            </div>
        </div>
        <div className="px-3 py-1.5 border-t border-border/10 text-[8px] text-muted-foreground/30">Partial match — "brl" matches "b-roll"</div>
    </div>
);

const CommandPaletteMockup = () => (
    <div className="border border-border/40 bg-card/60 overflow-hidden max-w-xs mx-auto">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20">
            <Command size={12} className="text-primary/60" />
            <span className="text-[10px] text-foreground/50">&gt; new</span>
        </div>
        <div className="p-1 text-[10px]">
            {[
                { label: "New Project", key: "" },
                { label: "New Collection", key: "" },
                { label: "New Document", key: "" },
                { label: "New Graph", key: "" },
            ].map((r, i) => (
                <div key={i} className={`flex items-center gap-2 px-2 py-1.5 ${i === 0 ? "bg-primary/10" : ""}`}>
                    <span className="text-primary/40 text-[9px]">▸</span>
                    <span className="text-foreground/60 flex-1">{r.label}</span>
                </div>
            ))}
        </div>
    </div>
);

const GroupedResultsMockup = () => (
    <div className="border border-border/40 bg-card/60 overflow-hidden max-w-xs mx-auto">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20">
            <MagnifyingGlass size={12} className="text-muted-foreground/40" />
            <span className="text-[10px] text-foreground/50">project</span>
        </div>
        <div className="p-1 text-[10px]">
            <div className="px-2 py-1 text-[8px] text-muted-foreground/30 uppercase tracking-wider">Files</div>
            <div className="flex items-center gap-2 px-2 py-1 text-muted-foreground/50"><Play size={10} /> project-intro.mp4</div>
            <div className="px-2 py-1 text-[8px] text-muted-foreground/30 uppercase tracking-wider mt-1">Docs</div>
            <div className="flex items-center gap-2 px-2 py-1 text-muted-foreground/50"><NotePencil size={10} /> Project Brief</div>
            <div className="px-2 py-1 text-[8px] text-muted-foreground/30 uppercase tracking-wider mt-1">Collections</div>
            <div className="flex items-center gap-2 px-2 py-1 text-muted-foreground/50"><Tag size={10} /> Project Assets</div>
        </div>
    </div>
);

const KeyboardNavMockup = () => (
    <div className="border border-border/40 bg-card/60 overflow-hidden max-w-xs mx-auto">
        <div className="p-1 text-[10px]">
            <div className="flex items-center gap-2 px-2 py-1.5"><Play size={11} className="text-muted-foreground/30" /><span className="text-muted-foreground/50">intro.mp4</span></div>
            <div className="flex items-center gap-2 px-2 py-1.5 bg-primary/10 border-l-2 border-primary">
                <Tag size={11} className="text-primary/60" /><span className="text-foreground/60">Highlights</span>
                <span className="ml-auto text-[8px] text-muted-foreground/30">↵ Open</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5"><NotePencil size={11} className="text-muted-foreground/30" /><span className="text-muted-foreground/50">Script</span></div>
        </div>
        <div className="px-3 py-1.5 border-t border-border/10 flex items-center gap-3 text-[8px] text-muted-foreground/30">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
        </div>
    </div>
);

/* ═══════════════════════════════════════════════════════
   CHIP DATA — per section
   ═══════════════════════════════════════════════════════ */

const mediaChips: ChipDetail[] = [
    { label: "Video", title: "Video player", desc: "Variable speed playback from 0.25x to 4x, A–B looping to repeat a section, per-file zoom, fullscreen mode, and automatic resume from your last playback position.", mockup: <VideoChipMockup /> },
    { label: "Audio", title: "Audio player", desc: "Waveform-style progress visualization, skip forward and back by 10 seconds, loop toggle, and playback speed adjustment between 0.5x and 2x. Volume is remembered per file.", mockup: <AudioChipMockup /> },
    { label: "Images", title: "Image viewer", desc: "Pan by clicking and dragging. Zoom with mouse wheel, pinch, or toolbar buttons. Draw rectangular region highlights directly on the image. Supports fullscreen viewing.", mockup: <ImageChipMockup /> },
    { label: "PDFs", title: "PDF viewer", desc: "Page-by-page navigation with keyboard and buttons. Zoom in and out with mouse wheel support. Select text to create annotations stored with the exact character range.", mockup: <PdfChipMockup /> },
    { label: "YouTube", title: "YouTube playback", desc: "Paste a YouTube URL and it plays inline using the YouTube IFrame API. Supports play, pause, seek, volume, and playback rate controls from within the app.", mockup: <YoutubeChipMockup /> },
];

const orgChips: ChipDetail[] = [
    { label: "Drag & drop", title: "Drag and drop", desc: "Reorder files and folders by dragging them. Move items between folders by dropping them on a folder target. Powered by dnd-kit for smooth, accessible drag interactions.", mockup: <DragDropMockup /> },
    { label: "Grid / list view", title: "Grid and list views", desc: "Switch between a grid view with visual thumbnail cards and a compact list view. Your view preference is remembered per storage and collection.", mockup: <GridListMockup /> },
    { label: "Multi-select", title: "Multi-select", desc: "Click to select individual items, or use shift-click to select a range. Selected items are highlighted and a selection count is shown above the file list.", mockup: <MultiSelectMockup /> },
    { label: "Bulk actions", title: "Bulk actions", desc: "With multiple items selected, perform actions on all of them at once — move to a folder, delete, or open. Saves time when reorganizing large projects.", mockup: <BulkActionsMockup /> },
    { label: "Search & filter", title: "Search and filter", desc: "Search files by name within the current storage or folder. Filter by file type (video, audio, image, PDF) to narrow results. The filter bar sits above the file list.", mockup: <SearchFilterMockup /> },
];

const highlightChips: ChipDetail[] = [
    { label: "Time ranges", title: "Time-range highlights", desc: "While watching a video or listening to audio, mark a start and end timestamp to create a highlight. The highlighted range is shown on the seek bar and can be clicked to jump back.", mockup: <TimeRangeMockup /> },
    { label: "PDF text selection", title: "PDF text highlights", desc: "Select text directly in the PDF viewer to create an annotation. The exact character range and selected text content are stored so the highlight can be relocated on the page.", mockup: <PdfSelectionMockup /> },
    { label: "Image regions", title: "Image region highlights", desc: "Draw a rectangle on an image to highlight a specific area. The region is stored as normalized coordinates (0–1) so it works at any zoom level. Click a region highlight to pan and zoom to it.", mockup: <ImageRegionMockup /> },
    { label: "Notes & colors", title: "Notes and colors", desc: "Every highlight can have a text note and a color. Choose from multiple color options to organize highlights visually. Highlights can be grouped into collections for review and export.", mockup: <NotesColorsMockup /> },
];

const graphChips: ChipDetail[] = [
    { label: "File nodes", title: "File nodes", desc: "Add any file from your storage as a node on the graph canvas. The node shows the file name, type icon, and accent color. Click to open the file in its player.", mockup: makeNodeMockup(Play, "intro.mp4", "border-amber-400/60", "Link files from your storage to the canvas") },
    { label: "Collection nodes", title: "Collection nodes", desc: "Add collections as nodes to visualize how highlights and assets are grouped. The node displays the collection name and its custom icon and color.", mockup: makeNodeMockup(Tag, "B-Roll Assets", "border-sky-400/60", "Visualize collection groupings on the canvas") },
    { label: "Note nodes", title: "Note nodes", desc: "Create standalone text notes directly on the canvas. Useful for adding context, labels, or reminders alongside your connected assets.", mockup: makeNodeMockup(NotePencil, "Director notes", "border-emerald-400/60", "Add text notes anywhere on the canvas") },
    { label: "Link nodes", title: "Link nodes", desc: "Add external URLs as nodes on the graph. Useful for referencing external resources, documentation, or inspiration alongside your project assets.", mockup: makeNodeMockup(LinkSimple, "docs.example.com", "border-violet-400/60", "Reference external URLs on the canvas") },
    { label: "Edge drawing", title: "Edge drawing", desc: "Click and drag from one node to another to draw a connection edge. Edges visually represent relationships between assets. Right-click edges for a context menu to delete them.", mockup: <EdgeDrawingMockup /> },
];

const docChips: ChipDetail[] = [
    { label: "Rich formatting", title: "Rich text formatting", desc: "The toolbar supports bold, italic, underline, strikethrough, three heading levels, ordered and unordered lists, text alignment, and inline links. Formatting is applied to selected text.", mockup: <RichFormattingMockup /> },
    { label: "File embeds", title: "File embeds", desc: "Insert references to files from your storage directly in the document. A file picker dialog lets you browse and select files. Embedded references appear as clickable inline blocks.", mockup: <FileEmbedsMockup /> },
    { label: "Auto-save", title: "Auto-save", desc: "Documents save automatically as you type with a short debounce. A saved indicator appears in the header. No manual save button is needed — your work is always preserved.", mockup: <AutoSaveMockup /> },
    { label: "3 view modes", title: "Three view modes", desc: "Choose between page mode (fixed-width centered layout), pageless mode (full-width, no page boundaries), and wide mode (pageless with extra-wide content area). Switch modes from the toolbar.", mockup: <ViewModesMockup /> },
];

const spotlightChips: ChipDetail[] = [
    { label: "Fuzzy search", title: "Fuzzy matching", desc: "Type partial or abbreviated names and the search engine matches them across all entity types. Results are ranked by relevance so the best match appears first.", mockup: <FuzzySearchMockup /> },
    { label: "Command palette", title: "Command palette", desc: "Type \">\" to switch to command mode. Execute actions like creating a new project, opening settings, or navigating to a specific view — all without leaving the keyboard.", mockup: <CommandPaletteMockup /> },
    { label: "Grouped results", title: "Grouped results", desc: "Search results are organized into sections by type — files, collections, documents, highlights, graphs. Each group has a header and type-specific icons for quick scanning.", mockup: <GroupedResultsMockup /> },
    { label: "Keyboard nav", title: "Keyboard navigation", desc: "Use arrow keys to move between results, Enter to open the selected item, and Escape to dismiss. Tab switches between result groups. No mouse required.", mockup: <KeyboardNavMockup /> },
];

// --- Security & Auth mockups ---
const SecurityMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        <div className="space-y-3">
            <div className="text-[8px] text-muted-foreground/40 uppercase tracking-wider mb-2">Sign in</div>
            <div className="flex items-center gap-2 px-3 py-2 border border-border/30 bg-background/40">
                <NumberSquareEight size={12} className="text-primary/60" />
                <div className="flex gap-1">
                    {["4", "8", "2", "1"].map((n, i) => (
                        <span key={i} className="text-[11px] text-foreground/70 font-mono">{n}</span>
                    ))}
                    <span className="text-[9px] text-muted-foreground/30 mx-0.5">-</span>
                    {["7", "3", "9", "0"].map((n, i) => (
                        <span key={i} className="text-[11px] text-foreground/70 font-mono">{n}</span>
                    ))}
                    <span className="text-[9px] text-muted-foreground/30 mx-0.5">-</span>
                    {["5", "6", "1", "2"].map((n, i) => (
                        <span key={i} className="text-[11px] text-foreground/70 font-mono">{n}</span>
                    ))}
                    <span className="text-[9px] text-muted-foreground/30 mx-0.5">-</span>
                    {["8", "4", "0", "3"].map((n, i) => (
                        <span key={i} className="text-[11px] text-foreground/70 font-mono">{n}</span>
                    ))}
                </div>
            </div>
            <div className="flex gap-2">
                <div className="flex-1 px-2 py-1.5 border border-primary/30 bg-primary/5 text-[8px] text-primary/70 text-center">Sign in</div>
                <div className="flex-1 px-2 py-1.5 border border-border/20 bg-background/20 text-[8px] text-muted-foreground/40 text-center flex items-center justify-center gap-1">
                    <Fingerprint size={9} /> Passkey
                </div>
            </div>
            <div className="text-[7px] text-muted-foreground/25">No email. No password. Just a numeric code.</div>
        </div>
    </div>
);

const NumericCodeMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        <div className="space-y-3">
            <div className="text-[8px] text-muted-foreground/40 uppercase tracking-wider">Your Sync ID</div>
            <div className="px-3 py-2.5 border border-primary/30 bg-background/40 text-center">
                <span className="font-mono text-sm text-foreground/80 tracking-widest">4821-7390-5612-8403</span>
            </div>
            <div className="flex items-center gap-2 text-[8px] text-muted-foreground/40">
                <LockKey size={10} /> Generated with cryptographic randomness
            </div>
            <div className="space-y-1 text-[7px] text-muted-foreground/30">
                <div className="flex items-center gap-1.5"><span className="w-1 h-1 bg-primary/40" /> No email required</div>
                <div className="flex items-center gap-1.5"><span className="w-1 h-1 bg-primary/40" /> No password to remember</div>
                <div className="flex items-center gap-1.5"><span className="w-1 h-1 bg-primary/40" /> Anonymous by default</div>
            </div>
        </div>
        <div className="absolute bottom-2 left-2 text-[8px] text-muted-foreground/30">Your ID is your account</div>
    </div>
);

const TwoFactorMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        <div className="space-y-3">
            <div className="text-[8px] text-muted-foreground/40 uppercase tracking-wider">Two-factor authentication</div>
            <div className="flex items-center gap-3">
                <div className="w-16 h-16 border border-border/30 bg-background/30 flex items-center justify-center">
                    <GridFour size={24} className="text-muted-foreground/20" />
                </div>
                <div className="space-y-1 text-[8px] text-muted-foreground/40">
                    <div>Scan with your authenticator app</div>
                    <div className="text-[7px] text-muted-foreground/25">Google Authenticator, Authy, etc.</div>
                </div>
            </div>
            <div className="flex gap-1.5 justify-center">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="w-7 h-8 border border-border/30 bg-background/30 flex items-center justify-center text-[11px] font-mono text-foreground/60">
                        {i < 3 ? ["7", "2", "4"][i] : ""}
                    </div>
                ))}
            </div>
            <div className="text-[7px] text-muted-foreground/25 text-center">Enter 6-digit code to verify</div>
        </div>
    </div>
);

const PasskeyMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        <div className="space-y-3">
            <div className="text-[8px] text-muted-foreground/40 uppercase tracking-wider">Passkey authentication</div>
            <div className="flex items-center gap-3 px-3 py-2 border border-border/30 bg-background/40">
                <Fingerprint size={20} className="text-primary/60" />
                <div className="space-y-0.5">
                    <div className="text-[9px] text-foreground/60">Use biometrics or a security key</div>
                    <div className="text-[7px] text-muted-foreground/30">Windows Hello, Touch ID, YubiKey</div>
                </div>
            </div>
            <div className="space-y-1">
                <div className="flex items-center justify-between text-[8px] text-muted-foreground/40 px-2 py-1.5 border border-border/20 bg-background/20">
                    <div className="flex items-center gap-1.5"><Key size={9} /> MacBook Pro Touch ID</div>
                    <span className="text-[7px] text-muted-foreground/25">Added 3d ago</span>
                </div>
                <div className="flex items-center justify-between text-[8px] text-muted-foreground/40 px-2 py-1.5 border border-border/20 bg-background/20">
                    <div className="flex items-center gap-1.5"><Key size={9} /> YubiKey 5C</div>
                    <span className="text-[7px] text-muted-foreground/25">Added 2w ago</span>
                </div>
            </div>
            <div className="text-[7px] text-muted-foreground/25">Passkeys bypass 2FA for faster login</div>
        </div>
    </div>
);

const EncryptionMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        <div className="space-y-3">
            <div className="text-[8px] text-muted-foreground/40 uppercase tracking-wider">Sync security</div>
            <div className="space-y-1.5">
                {[
                    { label: "Client-side encryption", desc: "Data encrypted before leaving your browser", icon: LockKey },
                    { label: "No tracking", desc: "No analytics, no cookies, no third-party scripts", icon: ShieldCheck },
                    { label: "Per-entity sync toggles", desc: "Choose what syncs: files, collections, highlights, docs", icon: ArrowsClockwise },
                ].map(item => (
                    <div key={item.label} className="flex items-start gap-2 px-2 py-1.5 border border-border/20 bg-background/20">
                        <item.icon size={10} className="text-primary/50 mt-0.5 shrink-0" />
                        <div>
                            <div className="text-[8px] text-foreground/50">{item.label}</div>
                            <div className="text-[7px] text-muted-foreground/30">{item.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        <div className="absolute bottom-2 left-2 text-[8px] text-muted-foreground/30">Your data stays with you</div>
    </div>
);

const securityChips: ChipDetail[] = [
    { label: "Numeric code", title: "Numeric code sign-in", desc: "Your account is a 16-digit number like 4821-7390-5612-8403. No email, no password, no username required. Generate one randomly with a single click, or type your own. Your code is your identity — simple and private.", mockup: <NumericCodeMockup /> },
    { label: "2FA", title: "Two-factor authentication", desc: "Add TOTP-based two-factor authentication using any authenticator app. Scan a QR code during setup, then enter a 6-digit code on each login. You can enable or disable 2FA at any time from settings.", mockup: <TwoFactorMockup /> },
    { label: "Passkeys", title: "Passkey authentication", desc: "Register passkeys using biometrics (Touch ID, Windows Hello) or physical security keys (YubiKey). Passkeys bypass the TOTP step entirely for faster, phishing-resistant sign-in. Manage multiple passkeys from settings.", mockup: <PasskeyMockup /> },
    { label: "Encryption & privacy", title: "Encryption & privacy", desc: "Data is encrypted client-side before upload. There are no trackers, no analytics cookies, and no third-party scripts. Per-entity sync toggles let you choose exactly what leaves your device. Timestamp-based conflict resolution keeps the newest version.", mockup: <EncryptionMockup /> },
];

/* ═══════════════════════════════════════════════════════
   FEATURE SECTION — reusable component with chip toggle
   ═══════════════════════════════════════════════════════ */

const FeatureSection = ({
    icon: SectionIcon,
    label,
    title,
    description,
    chips,
    defaultMockup,
    reversed = false,
    id,
}: {
    icon: Icon;
    label: string;
    title: string;
    description: string;
    chips: ChipDetail[];
    defaultMockup: ReactNode;
    reversed?: boolean;
    id?: string;
}) => {
    const [activeChip, setActiveChip] = useState<string | null>(null);
    const active = chips.find(c => c.label === activeChip) ?? null;

    return (
        <section className="px-6 pb-24 scroll-mt-16" id={id}>
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-60px" }}
                    variants={stagger}
                >
                    <motion.div variants={fadeUp} custom={0} className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-start`}>
                        {/* Text side */}
                        <div className={`space-y-4 ${reversed ? 'order-1 md:order-2' : ''}`}>
                            <div className="flex items-center gap-2 text-primary text-[11px] uppercase tracking-widest">
                                <SectionIcon weight="regular" size={14} />
                                <span>{label}</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-normal tracking-tight text-foreground">
                                {title}
                            </h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {description}
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {chips.map(c => (
                                    <button
                                        key={c.label}
                                        onClick={() => setActiveChip(prev => prev === c.label ? null : c.label)}
                                        className={`px-2 py-1 border text-[10px] transition-all cursor-pointer ${
                                            activeChip === c.label
                                                ? 'border-primary/50 bg-primary/10 text-primary'
                                                : 'border-border/30 bg-muted/20 text-muted-foreground/60 hover:border-border/50 hover:text-muted-foreground/80'
                                        }`}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Visual side */}
                        <motion.div variants={fadeUp} custom={1} className={reversed ? 'order-2 md:order-1' : ''}>
                            <div className="relative aspect-[4/3] overflow-hidden">
                            <AnimatePresence mode="wait">
                                {active ? (
                                    <motion.div
                                        key={active.label}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.25 }}
                                        className="absolute inset-x-0 top-0 space-y-3"
                                    >
                                        <div className="space-y-1.5">
                                            <h3 className="text-sm font-medium text-foreground">{active.title}</h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{active.desc}</p>
                                        </div>
                                        {active.mockup}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="default"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.25 }}
                                        className="absolute inset-x-0 top-0"
                                    >
                                        {defaultMockup}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            </div>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};

export const WelcomeView = () => {
    const navigate = useNavigate();

    const handleCreateProject = () => {
        const name = 'My Project';
        useStore.getState().addProject(name);
    };

    const handleLoadDemo = () => {
        const p1: Project = { id: crypto.randomUUID(), name: 'Demo Project', created: Date.now(), lastModified: Date.now() };
        const s1 = { id: crypto.randomUUID(), projectId: p1.id, name: 'Main Storage', created: Date.now(), lastModified: Date.now() };
        const f1: any = { id: crypto.randomUUID(), projectId: p1.id, storageId: s1.id, parentId: null, name: 'Getting Started.mp4', url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4', type: 'video', order: 0, created: Date.now(), lastModified: Date.now() };
        useStore.setState((state: any) => ({
            projects: [...state.projects, p1],
            storages: [...state.storages, s1],
            files: [...state.files, f1],
            activeProjectId: p1.id,
            activeStorageId: s1.id
        }));
    };

    const handleImportProject = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const text = await file.text();
            try {
                const data = JSON.parse(text);
                if (!data.version || !data.project) throw new Error('Invalid project file');
                const importedData = importProject(data);
                useStore.setState((state: any) => ({
                    projects: [...state.projects, importedData.project],
                    files: [...state.files, ...importedData.files],
                    collections: [...state.collections, ...importedData.collections],
                    highlights: [...state.highlights, ...importedData.highlights],
                    graphs: [...state.graphs, ...importedData.graphs],
                    graphNodes: [...state.graphNodes, ...importedData.graphNodes],
                    graphEdges: [...state.graphEdges, ...importedData.graphEdges],
                    docs: [...state.docs, ...importedData.docs],
                    storages: [...state.storages, ...importedData.storages],
                    activeProjectId: importedData.project.id
                }));
            } catch (err) {
                console.error('Failed to import project:', err);
            }
        };
        input.click();
    };

    const [activeSection, setActiveSection] = useState<string | null>(null);

    const observerSectionRef = useRef<string | null>(null);

    useEffect(() => {
        const scrollContainer = document.getElementById('welcome-scroll');
        if (!scrollContainer) return;
        const sectionIds = ['home', 'media', 'organization', 'highlights', 'collections', 'graphs', 'documents', 'search', 'security', 'more'];
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const id = entry.target.id.replace('section-', '');
                        observerSectionRef.current = id;
                        setActiveSection(id);
                    }
                }
            },
            { root: scrollContainer, rootMargin: '-40% 0px -40% 0px', threshold: 0 }
        );
        for (const id of sectionIds) {
            const el = document.getElementById(`section-${id}`);
            if (el) observer.observe(el);
        }

        // Detect when scrolled near bottom → activate "end", restore observer section when leaving
        let wasAtEnd = false;
        const onScroll = () => {
            const nearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 10;
            if (nearBottom) {
                wasAtEnd = true;
                setActiveSection('end');
            } else if (wasAtEnd) {
                wasAtEnd = false;
                if (observerSectionRef.current) {
                    setActiveSection(observerSectionRef.current);
                }
            }
        };
        scrollContainer.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            observer.disconnect();
            scrollContainer.removeEventListener('scroll', onScroll);
        };
    }, []);

    const navLinks = [
        { label: "Home", id: "home" },
        { label: "Media", id: "media" },
        { label: "Organization", id: "organization" },
        { label: "Highlights", id: "highlights" },
        { label: "Collections", id: "collections" },
        { label: "Graphs", id: "graphs" },
        { label: "Documents", id: "documents" },
        { label: "Search", id: "search" },
        { label: "Security", id: "security" },
        { label: "More", id: "more" },
    ];

    return (
        <div id="welcome-scroll" className="absolute inset-0 w-full bg-background selection:bg-primary/30 overflow-y-auto overflow-x-hidden">

            {/* ── Top nav bar ── */}
            <div className="sticky top-0 z-50 h-12 bg-background/60 backdrop-blur-md border-b border-border/20">
                <div className="max-w-5xl mx-auto h-full flex items-center justify-center gap-6 px-6">
                    {navLinks.map(link => (
                        <button
                            key={link.id}
                            onClick={() => document.getElementById(`section-${link.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                            className={`text-[11px] transition-colors cursor-pointer hidden md:block ${
                                activeSection === link.id
                                    ? 'text-primary'
                                    : 'text-muted-foreground/60 hover:text-foreground'
                            }`}
                        >
                            {link.label}
                        </button>
                    ))}
                    <button
                        onClick={() => {
                            const el = document.getElementById('welcome-scroll');
                            if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                        }}
                        className={`text-[11px] transition-colors cursor-pointer hidden md:block ${
                            activeSection === 'end'
                                ? 'text-primary'
                                : 'text-muted-foreground/60 hover:text-foreground'
                        }`}
                    >
                        End
                    </button>
                </div>
            </div>

            {/* ── Ambient background ── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[70%] h-[40%] bg-primary/6 blur-[140px]" />
            </div>

            {/* ═══════════════════════════════════════════════════════════
                HERO
               ═══════════════════════════════════════════════════════════ */}
            <section id="section-home" className="relative flex flex-col items-center justify-center text-center px-6 pt-24 pb-24 min-h-[80vh]">
                <GraphWebBackground />
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={stagger}
                    className="relative z-10 max-w-3xl mx-auto space-y-7"
                >
                    <motion.div variants={fadeUp} custom={0} className="flex justify-center">
                        <div className="p-3 bg-card/60 border border-border/40 shadow-lg backdrop-blur-sm">
                            <WhistlerLogo width={44} height={44} />
                        </div>
                    </motion.div>

                    <motion.h1
                        variants={fadeUp}
                        custom={1}
                        className="text-4xl md:text-6xl font-normal tracking-tight text-foreground leading-[1.1]"
                    >
                        A workspace for managing{" "}
                        <span className="text-primary">media and ideas</span>
                    </motion.h1>

                    <motion.p
                        variants={fadeUp}
                        custom={2}
                        className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed"
                    >
                        Organize video, audio, images, PDFs, and documents in one place.
                        Create highlights, build visual graphs, and sync across devices.
                    </motion.p>

                    <motion.div
                        variants={fadeUp}
                        custom={3}
                        className="flex flex-wrap items-center justify-center gap-3 pt-2"
                    >
                        <Button
                            size="lg"
                            className="h-11 px-6 text-sm font-medium rounded-none gap-2 shadow-lg shadow-primary/20"
                            onClick={handleCreateProject}
                        >
                            Create a project
                            <ArrowRight weight="regular" size={15} />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-11 px-5 text-sm font-medium rounded-none gap-2"
                            onClick={handleLoadDemo}
                        >
                            <Sparkle weight="regular" size={15} />
                            Load demo
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-11 px-5 text-sm font-medium rounded-none gap-2"
                            onClick={handleImportProject}
                        >
                            <DownloadSimple weight="regular" size={15} />
                            Load project
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-11 px-5 text-sm font-medium rounded-none gap-2"
                            onClick={() => navigate('/settings?tab=sync')}
                        >
                            <ArrowsClockwise weight="regular" size={15} />
                            Sync access
                        </Button>
                    </motion.div>

                    <motion.p
                        variants={fadeUp}
                        custom={4}
                        className="text-xs text-muted-foreground/50"
                    >
                        Press{" "}
                        <kbd className="px-1.5 py-0.5 border border-border/60 bg-muted/50 font-mono text-[10px]">
                            Ctrl K
                        </kbd>{" "}
                        to open spotlight
                    </motion.p>
                </motion.div>
            </section>

            {/* ═══════════════════════════════════════════════════════════
                FEATURE SECTIONS
               ═══════════════════════════════════════════════════════════ */}
            <FeatureSection
                id="section-media"
                icon={Play}
                label="Media playback"
                title="Built-in players for every file type"
                description="Play video, audio, view images, and read PDFs directly in the app. The video player includes variable speed playback (0.25x–4x), A–B looping, seek preview thumbnails, and picture-in-picture mode. Audio playback supports waveform visualization and skip controls. Files resume from your last position automatically."
                chips={mediaChips}
                defaultMockup={<VideoPlayerMockup />}
            />

            <FeatureSection
                id="section-organization"
                icon={HardDrives}
                label="Organization"
                title="Projects, storages, and folders"
                description="Create projects as top-level workspaces. Inside each project, storages hold your files in a nested folder structure. Drag and drop to reorder, move files between folders, and switch between grid and list views. Collections organize highlights into a three-level hierarchy — buckets, folders, and collections."
                chips={orgChips}
                defaultMockup={<OrganizationMockup />}
                reversed
            />

            <FeatureSection
                id="section-highlights"
                icon={Highlighter}
                label="Highlights"
                title="Annotate any media type"
                description="Create time-range highlights on video and audio with start/end timestamps. Select text in PDFs to save text-based annotations. Draw rectangular regions on images for spatial highlights. Every highlight can have a note, a color, and can be grouped into collections for review."
                chips={highlightChips}
                defaultMockup={<HighlightMockup />}
            />

            <FeatureSection
                id="section-collections"
                icon={Tag}
                label="Collections"
                title="Group highlights into reviewable sets"
                description="Collections let you gather highlights from different files into organized groups. Build a three-level hierarchy of buckets, folders, and collections. Assign custom colors and icons, drag to reorder, and switch between grid, list, and card views. Each collection shows thumbnail previews of the highlights inside."
                chips={collectionChips}
                defaultMockup={<CollectionsMockup />}
                reversed
            />

            <FeatureSection
                id="section-graphs"
                icon={Graph}
                label="Visual graphs"
                title="Connect assets on a canvas"
                description="Canvas-based node graphs let you map relationships between files, collections, highlights, docs, links, and notes. Draw edges between nodes, pan and zoom the canvas, and use context menus for quick editing. Each node is color-coded and shows a preview of its content."
                chips={graphChips}
                defaultMockup={<GraphMockup />}
            />

            <FeatureSection
                id="section-documents"
                icon={NotePencil}
                label="Documents"
                title="Rich text editing built in"
                description="Write notes, scripts, and documentation alongside your media. The editor supports formatting (bold, italic, underline, strikethrough), headings, lists, links, and alignment controls. Embed file references directly in your documents. Choose between page, pageless, and wide view modes. Documents auto-save as you type."
                chips={docChips}
                defaultMockup={<DocEditorMockup />}
                reversed
            />

            <FeatureSection
                id="section-search"
                icon={MagnifyingGlass}
                label="Spotlight search"
                title="Find anything instantly"
                description="Press Ctrl+K to open the spotlight. Search across all your files, collections, highlights, and documents with fuzzy matching. Run commands directly from the palette. Results are grouped by type with icons and keyboard navigation."
                chips={spotlightChips}
                defaultMockup={<SpotlightMockup />}
            />

            <FeatureSection
                id="section-security"
                icon={LockKey}
                label="Security & sync"
                title="A different way to sign in"
                description="No email, no password — your account is a 16-digit numeric code you can generate with one click. Layer on two-factor authentication with any TOTP app, or register passkeys for biometric sign-in. Data is encrypted client-side before syncing, and there are zero trackers or third-party scripts."
                chips={securityChips}
                defaultMockup={<SecurityMockup />}
                reversed
            />

            {/* ═══════════════════════════════════════════════════════════
                ADDITIONAL FEATURES — Compact grid
               ═══════════════════════════════════════════════════════════ */}
            <section className="px-6 pb-24 scroll-mt-16" id="section-more">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-60px" }}
                        variants={stagger}
                    >
                        <motion.div variants={fadeUp} custom={0} className="text-center mb-12">
                            <div className="flex items-center justify-center gap-2 text-primary text-[11px] uppercase tracking-widest mb-3">
                                <SlidersHorizontal weight="regular" size={14} />
                                <span>More features</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-normal tracking-tight text-foreground">
                                And everything else
                            </h2>
                        </motion.div>

                        <motion.div
                            variants={stagger}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                        >
                            {[
                                {
                                    icon: Keyboard,
                                    title: "Keyboard shortcuts",
                                    desc: "Fully customizable keybinds for navigation, playback, and editing. Double-tap sequences for quick go-to actions, all rebindable in settings.",
                                },
                                {
                                    icon: Palette,
                                    title: "Theming",
                                    desc: "Choose from multiple base and accent color presets, or create your own theme with full CSS variable control. Set a custom background image with adjustable opacity.",
                                },
                                {
                                    icon: ArrowsClockwise,
                                    title: "Cloud sync",
                                    desc: "Sync your data across devices. Choose what syncs — files, collections, highlights, docs — with per-entity toggles and configurable auto-sync intervals.",
                                },
                                {
                                    icon: MusicNote,
                                    title: "Ambient music",
                                    desc: "Play background music while you work. Volume adjusts automatically when video or audio files are playing so nothing clashes.",
                                },
                                {
                                    icon: Trash,
                                    title: "Trash & restore",
                                    desc: "Deleted something by accident? Files, collections, graphs, and documents go to a soft-delete trash. Restore individual items or permanently empty it.",
                                },
                                {
                                    icon: Globe,
                                    title: "Browser-based",
                                    desc: "Runs entirely in your browser — no download, no install, no desktop app required. Works on any device with a modern browser.",
                                },
                                {
                                    icon: Sparkle,
                                    title: "Sound effects",
                                    desc: "Optional interaction sounds for clicks, confirmations, errors, and search. Swap in your own audio files to personalize the experience.",
                                },
                                {
                                    icon: Lightning,
                                    title: "Import & export",
                                    desc: "Export entire projects as JSON files for backup or sharing. Import them on another device or browser to pick up right where you left off.",
                                },
                                {
                                    icon: SlidersHorizontal,
                                    title: "View preferences",
                                    desc: "Switch between grid, list, and card layouts across storages and collections. Sort by name, date, or custom order. Your view preferences persist per project.",
                                },
                            ].map((feat, i) => (
                                <motion.div
                                    key={feat.title}
                                    variants={fadeUp}
                                    custom={i}
                                    className="p-4 border border-border/30 bg-card/20 hover:bg-card/40 hover:border-border/50 transition-all group"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <feat.icon weight="regular" size={16} className="text-primary shrink-0" />
                                        <h3 className="text-sm font-medium text-foreground">{feat.title}</h3>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════
                BOTTOM CTA
               ═══════════════════════════════════════════════════════════ */}
            <section className="px-6 pb-20">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-40px" }}
                    variants={stagger}
                    className="max-w-3xl mx-auto text-center space-y-5 pt-12 border-t border-border/30"
                >
                    <motion.h2
                        variants={fadeUp}
                        custom={0}
                        className="text-2xl md:text-3xl font-normal tracking-tight text-foreground"
                    >
                        Ready to get started?
                    </motion.h2>

                    <motion.p
                        variants={fadeUp}
                        custom={1}
                        className="text-sm text-muted-foreground max-w-md mx-auto"
                    >
                        Create your first project and start organizing.
                    </motion.p>

                    <motion.div
                        variants={fadeUp}
                        custom={2}
                        className="flex items-center justify-center gap-3"
                    >
                        <Button
                            size="lg"
                            className="h-11 px-6 text-sm font-medium rounded-none gap-2"
                            onClick={handleCreateProject}
                        >
                            Create a project
                            <ArrowRight weight="regular" size={15} />
                        </Button>
                    </motion.div>
                </motion.div>
            </section>

            {/* ── Footer ── */}
            <footer className="px-6 pb-10">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground/40">
                    <div className="flex items-center gap-2">
                        <WhistlerLogo width={18} height={18} className="opacity-40" />
                        <span className="font-medium tracking-tight">WHISTLER</span>
                    </div>
                    <span>&copy; {new Date().getFullYear()} Whistlerbox</span>
                </div>
            </footer>
        </div>
    );
};

export default WelcomeView;
