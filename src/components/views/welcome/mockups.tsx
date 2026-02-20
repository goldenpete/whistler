/**
 * ─── mockups.tsx ──────────────────────────────────────────────────────────────
 *
 * Visual mockup components for the WelcomeView landing page.
 * Each mockup is a small, self-contained JSX component that renders a
 * fake UI preview for a specific feature. They are used inside FeatureSection
 * chips and as default section visuals.
 *
 * Organization:
 *   - MEDIA mockups:       VideoPlayerMockup, VideoChipMockup, AudioChipMockup,
 *                          ImageChipMockup, PdfChipMockup, YoutubeChipMockup
 *   - ORGANIZATION mockups: OrganizationMockup, DragDropMockup, GridListMockup,
 *                          MultiSelectMockup, BulkActionsMockup, SearchFilterMockup
 *   - HIGHLIGHT mockups:   HighlightMockup, TimeRangeMockup, PdfSelectionMockup,
 *                          ImageRegionMockup, NotesColorsMockup
 *   - GRAPH mockups:       GraphMockup, makeNodeMockup, EdgeDrawingMockup
 *   - COLLECTION mockups:  CollectionsMockup, BucketsFoldersMockup, ColorIconMockup,
 *                          DragReorderMockup, ViewModeCollMockup, HighlightGroupMockup
 *   - DOCUMENT mockups:    DocEditorMockup, RichFormattingMockup, FileEmbedsMockup,
 *                          AutoSaveMockup, ViewModesMockup
 *   - SPOTLIGHT mockups:   SpotlightMockup, FuzzySearchMockup, CommandPaletteMockup,
 *                          GroupedResultsMockup, KeyboardNavMockup
 *   - SECURITY mockups:    SecurityMockup, NumericCodeMockup, TwoFactorMockup,
 *                          PasskeyMockup, EncryptionMockup
 *
 * Used by: chipData.ts (referenced in chip arrays), WelcomeView.tsx (default mockups)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
    Play,
    SpeakerHigh,
    PictureInPicture,
    Pause,
    SkipForward,
    SkipBack,
    ArrowsOutSimple,
    Repeat,
    CursorClick,
    Image,
    FilePdf,
    FolderSimple,
    HardDrives,
    Highlighter,
    Tag,
    NotePencil,
    ListBullets,
    GridFour,
    TrashSimple,
    ArrowsOut,
    FunnelSimple,
    MagnifyingGlass,
    TextAa,
    LinkSimple,
    Clock,
    PaintBrush,
    Sparkle,
    Command,
    Rows,
    TreeStructure,
    Fingerprint,
    LockKey,
    ShieldCheck,
    ArrowsClockwise,
    Key,
    NumberSquareEight,
    type Icon,
} from "@phosphor-icons/react";

/* ═══════════════════════════════════════════════════════
   MEDIA MOCKUPS
   ═══════════════════════════════════════════════════════ */

export const VideoPlayerMockup = () => (
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

export const VideoChipMockup = () => (
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
            <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-[8px] text-primary">
                <Repeat size={9} /> A–B Loop
            </div>
            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-background/70 border border-border/30 text-[8px] text-muted-foreground/50 flex items-center gap-1">
                <ArrowsOutSimple size={9} /> Fullscreen
            </div>
        </div>
    </div>
);

export const AudioChipMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 space-y-3">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <SpeakerHigh size={12} /> <span>voiceover.mp3</span>
        </div>
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

export const ImageChipMockup = () => (
    <div className="border border-border/40 bg-card/40 overflow-hidden">
        <div className="aspect-[4/3] bg-muted/20 relative flex items-center justify-center">
            <Image weight="duotone" size={40} className="text-muted-foreground/10" />
            <div className="absolute bottom-2 right-2 flex gap-1 text-[8px] text-muted-foreground/50">
                <div className="w-5 h-5 border border-border/30 bg-background/60 flex items-center justify-center">−</div>
                <div className="px-1.5 h-5 border border-border/30 bg-background/60 flex items-center justify-center">120%</div>
                <div className="w-5 h-5 border border-border/30 bg-background/60 flex items-center justify-center">+</div>
            </div>
            <div className="absolute top-[20%] left-[25%] w-[30%] h-[35%] border-2 border-dashed border-violet-400/40 bg-violet-400/5" />
            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-background/70 border border-border/30 text-[8px] text-muted-foreground/50 flex items-center gap-1">
                <CursorClick size={9} /> Pan & zoom
            </div>
        </div>
    </div>
);

export const PdfChipMockup = () => (
    <div className="border border-border/40 bg-card/40 overflow-hidden">
        <div className="aspect-[3/4] max-h-48 bg-muted/10 relative p-4">
            <div className="space-y-1.5">
                {[85, 90, 70, 80, 75, 60, 85, 50].map((w, i) => (
                    <div key={i} className="h-1 bg-muted/20" style={{ width: `${w}%` }} />
                ))}
                <div className="h-1 bg-sky-400/30 w-[65%]" />
                <div className="h-1 bg-sky-400/30 w-[80%]" />
                <div className="h-1 bg-sky-400/30 w-[40%]" />
                {[70, 85, 60].map((w, i) => (
                    <div key={`b${i}`} className="h-1 bg-muted/20" style={{ width: `${w}%` }} />
                ))}
            </div>
            <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-2 text-[8px] text-muted-foreground/40">
                <span className="px-1.5 py-0.5 border border-border/20 bg-background/60">← Prev</span>
                <span>Page 3 of 12</span>
                <span className="px-1.5 py-0.5 border border-border/20 bg-background/60">Next →</span>
            </div>
        </div>
    </div>
);

export const YoutubeChipMockup = () => (
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

/* ═══════════════════════════════════════════════════════
   ORGANIZATION MOCKUPS
   ═══════════════════════════════════════════════════════ */

export const OrganizationMockup = () => (
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

export const DragDropMockup = () => (
    <div className="border border-border/40 bg-card/40 p-3 space-y-1 text-[10px]">
        <div className="flex items-center gap-1.5 py-1 px-2 text-muted-foreground/50">
            <FolderSimple size={11} className="text-amber-400/60" /> <span>Video Assets</span>
        </div>
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

export const GridListMockup = () => (
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

export const MultiSelectMockup = () => (
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

export const BulkActionsMockup = () => (
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

export const SearchFilterMockup = () => (
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

/* ═══════════════════════════════════════════════════════
   HIGHLIGHT MOCKUPS
   ═══════════════════════════════════════════════════════ */

export const HighlightMockup = () => (
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

export const TimeRangeMockup = () => (
    <div className="border border-border/40 bg-card/40 overflow-hidden">
        <div className="aspect-video bg-muted/30 relative flex items-center justify-center">
            <Play weight="fill" size={20} className="text-muted-foreground/15" />
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

export const PdfSelectionMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 space-y-1.5">
        <div className="text-[9px] text-muted-foreground/40 mb-2">PDF — Page 3</div>
        {[80, 90, 75].map((w, i) => (
            <div key={`a${i}`} className="h-1 bg-muted/20" style={{ width: `${w}%` }} />
        ))}
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

export const ImageRegionMockup = () => (
    <div className="border border-border/40 bg-card/40 overflow-hidden">
        <div className="aspect-[4/3] bg-muted/15 relative">
            <Image weight="duotone" size={30} className="text-muted-foreground/10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
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

export const NotesColorsMockup = () => (
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

/* ═══════════════════════════════════════════════════════
   GRAPH MOCKUPS
   ═══════════════════════════════════════════════════════ */

export const GraphMockup = () => (
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

export const makeNodeMockup = (icon: Icon, label: string, borderColor: string, desc: string) => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        <div className={`absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 border-2 ${borderColor} bg-background/80 text-[10px] text-foreground/70 shadow-lg`}>
            {(() => { const I = icon; return <I size={12} />; })()}
            {label}
        </div>
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

export const EdgeDrawingMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        <div className="absolute left-[20%] top-[35%] flex items-center gap-1 px-2 py-1 border border-amber-400/40 bg-background/60 text-[9px] text-foreground/60">
            <Play size={10} /> intro.mp4
        </div>
        <div className="absolute right-[18%] top-[40%] flex items-center gap-1 px-2 py-1 border border-emerald-400/40 bg-background/60 text-[9px] text-foreground/60">
            <NotePencil size={10} /> Script
        </div>
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line x1="38%" y1="40%" x2="65%" y2="44%" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx="65%" cy="44%" r="3" fill="currentColor" fillOpacity="0.2" />
        </svg>
        <div className="absolute bottom-2 left-2 text-[8px] text-muted-foreground/30 flex items-center gap-1">
            <CursorClick size={9} /> Click and drag between nodes to connect
        </div>
    </div>
);

/* ═══════════════════════════════════════════════════════
   COLLECTION MOCKUPS
   ═══════════════════════════════════════════════════════ */

export const CollectionsMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        <div className="flex items-center gap-1.5 text-[9px] text-foreground/50 mb-3 border-b border-border/20 pb-2">
            <TreeStructure size={10} /> Main Bucket
        </div>
        <div className="ml-2 mb-2">
            <div className="flex items-center gap-1.5 text-[8px] text-foreground/40 mb-1.5">
                <FolderSimple size={9} /> Interview footage
            </div>
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

export const BucketsFoldersMockup = () => (
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

export const ColorIconMockup = () => (
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

export const DragReorderMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 aspect-[16/10] relative overflow-hidden">
        <div className="space-y-1">
            {[
                { name: "Best takes", color: "border-emerald-400/50", dragging: false },
                { name: "B-Roll picks", color: "border-sky-400/50", dragging: true },
                { name: "Ambient tracks", color: "border-violet-400/50", dragging: false },
            ].map((c) => (
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

export const ViewModeCollMockup = () => (
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

export const HighlightGroupMockup = () => (
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

/* ═══════════════════════════════════════════════════════
   DOCUMENT MOCKUPS
   ═══════════════════════════════════════════════════════ */

export const DocEditorMockup = () => (
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

export const RichFormattingMockup = () => (
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

export const FileEmbedsMockup = () => (
    <div className="border border-border/40 bg-card/40 p-4 space-y-2 text-[10px]">
        <div className="text-foreground/50 text-sm">Production Notes</div>
        <div className="text-muted-foreground/40">Use the following clip as the opener:</div>
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

export const AutoSaveMockup = () => (
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

export const ViewModesMockup = () => (
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

/* ═══════════════════════════════════════════════════════
   SPOTLIGHT MOCKUPS
   ═══════════════════════════════════════════════════════ */

export const SpotlightMockup = () => (
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

export const FuzzySearchMockup = () => (
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

export const CommandPaletteMockup = () => (
    <div className="border border-border/40 bg-card/60 overflow-hidden max-w-xs mx-auto">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20">
            <Command size={12} className="text-primary/60" />
            <span className="text-[10px] text-foreground/50">&gt; new</span>
        </div>
        <div className="p-1 text-[10px]">
            {[
                { label: "New Project" },
                { label: "New Collection" },
                { label: "New Document" },
                { label: "New Graph" },
            ].map((r, i) => (
                <div key={i} className={`flex items-center gap-2 px-2 py-1.5 ${i === 0 ? "bg-primary/10" : ""}`}>
                    <span className="text-primary/40 text-[9px]">▸</span>
                    <span className="text-foreground/60 flex-1">{r.label}</span>
                </div>
            ))}
        </div>
    </div>
);

export const GroupedResultsMockup = () => (
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

export const KeyboardNavMockup = () => (
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
   SECURITY MOCKUPS
   ═══════════════════════════════════════════════════════ */

export const SecurityMockup = () => (
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

export const NumericCodeMockup = () => (
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

export const TwoFactorMockup = () => (
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

export const PasskeyMockup = () => (
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

export const EncryptionMockup = () => (
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
