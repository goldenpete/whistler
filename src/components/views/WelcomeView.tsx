/**
 * ─── WelcomeView.tsx ──────────────────────────────────────────────────────────
 *
 * Landing / onboarding page shown when no projects exist.
 * Contains hero, 8 feature sections, a "more features" grid, CTA, and footer.
 *
 * Sub-modules (in ./welcome/):
 *   animations.ts         — fadeUp / stagger motion variants
 *   GraphWebBackground.tsx — animated canvas node web behind the hero
 *   FeatureSection.tsx     — reusable section with chip toggles + ChipDetail type
 *   mockups.tsx            — ~35 visual mockup components for chip previews
 *   chipData.tsx           — 8 chip arrays (mediaChips, orgChips, etc.)
 *
 * Layout:
 *   1. Sticky top nav bar with section links + active indicator
 *   2. Hero section with logo, headline, buttons
 *   3. 8 × FeatureSection (media, org, highlights, collections, graphs, docs, search, security)
 *   4. "More features" compact grid (9 cards)
 *   5. Bottom CTA
 *   6. Footer
 *
 * Key behaviors:
 *   - IntersectionObserver tracks which section is in view → highlights nav link
 *   - Scroll listener detects "near bottom" → activates "End" button
 *   - observerSectionRef remembers last observer-reported section for restore
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import {
    Lightning,
    ArrowsClockwise,
    Globe,
    HardDrives,
    Graph,
    ArrowRight,
    NotePencil,
    Play,
    Sparkle,
    Tag,
    MagnifyingGlass,
    Keyboard,
    Highlighter,
    Trash,
    SlidersHorizontal,
    Palette,
    MusicNote,
    DownloadSimple,
    LockKey,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { WhistlerLogo } from "@/components/ui/WhistlerLogo";
import { useStore } from "@/store/useStore";
import { useNavigate } from "react-router-dom";
import { importProject } from "@/utils/projectData";
import type { Project, File as AppFile } from "@/types";

/* ─── Welcome sub-modules ─── */
import { fadeUp, stagger } from "./welcome/animations";
import { GraphWebBackground } from "./welcome/GraphWebBackground";
import { FeatureSection } from "./welcome/FeatureSection";
import {
    VideoPlayerMockup,
    OrganizationMockup,
    HighlightMockup,
    CollectionsMockup,
    GraphMockup,
    DocEditorMockup,
    SpotlightMockup,
    SecurityMockup,
} from "./welcome/mockups";
import {
    mediaChips,
    orgChips,
    highlightChips,
    collectionChips,
    graphChips,
    docChips,
    spotlightChips,
    securityChips,
} from "./welcome/chipData";

/* ═══════════════════════════════════════════════════════
   WELCOME VIEW — main component
   ═══════════════════════════════════════════════════════ */

export const WelcomeView = () => {
    const navigate = useNavigate();

    /* ── Project action handlers ── */

    const handleCreateProject = () => {
        const name = 'My Project';
        useStore.getState().addProject(name);
    };

    const handleLoadDemo = () => {
        const p1: Project = { id: crypto.randomUUID(), name: 'Demo Project', created: Date.now(), lastModified: Date.now() };
        const s1 = { id: crypto.randomUUID(), projectId: p1.id, name: 'Main Storage', created: Date.now(), lastModified: Date.now() };
        const f1: AppFile = { id: crypto.randomUUID(), projectId: p1.id, storageId: s1.id, parentId: null, name: 'Getting Started.mp4', url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4', type: 'video', order: 0, created: Date.now(), lastModified: Date.now() };
        useStore.setState((state) => ({
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
                useStore.setState((state) => ({
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

    /* ── Active-section tracking (nav highlight) ── */

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

    /* ── Nav links ── */

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

    /* ── "More features" grid items ── */

    const moreFeatures = [
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
    ];

    /* ═══════════════════════════════════════════════════════
       RENDER
       ═══════════════════════════════════════════════════════ */

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
                            {moreFeatures.map((feat, i) => (
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
