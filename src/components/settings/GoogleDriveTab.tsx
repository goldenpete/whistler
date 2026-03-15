/**
 * ─── GoogleDriveTab.tsx ──────────────────────────────────────────────
 *
 * Settings tab for Google Drive integration: API key configuration,
 * safe-setup guide, and Drive file cache management.
 *
 * Uses an inline tab system — "Settings" for the main controls and
 * "Setup Guide" for a dedicated help page — instead of popups.
 *
 * Exports: GoogleDriveTab
 * Related: SettingsView, driveCache, playbackSlice
 * ─────────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useCallback, type ChangeEvent } from "react";
import { useStore } from "@/store/useStore";
import {
    GoogleDriveLogo,
    Key,
    Database,
    Trash,
    Check,
    X,
    Warning,
    ArrowCounterClockwise,
    ArrowRight,
    ArrowLeft,
    Play,
    ArrowSquareOut,
    GraduationCap,
    ShieldCheck,
    Wrench,
    Lock,
    Globe,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/toggle-switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useShallow } from "@/lib/zustand-shallow";
import {
    driveCacheStorage,
    type DriveCacheInfo,
} from "@/utils/driveCache";

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, i);
    return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

function formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

/* ═══════════════════════════════════════════════════════
   TOUR STEPS
   ═══════════════════════════════════════════════════════ */
interface TourStep {
    title: string;
    heading: string;
    body: string;
    bullets: string[];
    tip: string | null;
    link: { url: string; label: string } | null;
}

const WHISTLER_DOMAIN = "whistlerbox.com";

const TOUR_STEPS: TourStep[] = [
    {
        title: "Before you start",
        heading: "What you'll need",
        body: "This tour sets up a restricted Google API key so Whistler can play Google Drive files natively.",
        bullets: [
            "A free Google account (any Gmail works)",
            "No credit card or billing required",
            "The key will only work on whistlerbox.com — useless anywhere else",
        ],
        tip: null,
        link: null,
    },
    {
        title: "Step 1",
        heading: "Sign in to Google Cloud Console",
        body: "Open the link below and sign in with your Google account.",
        bullets: [
            "First-time users — check the Terms of Service box and click Agree and Continue",
            "No payment info will be asked",
        ],
        tip: null,
        link: { url: "https://console.cloud.google.com", label: "Open Google Cloud Console" },
    },
    {
        title: "Step 2",
        heading: "Create a new project",
        body: "Click the project selector at the top of the page, then New Project.",
        bullets: [
            'Name it "Whistler"',
            'Organisation → "No organisation"',
            "Click Create",
        ],
        tip: null,
        link: null,
    },
    {
        title: "Step 3",
        heading: "Select your Whistler project",
        body: "Click the project selector again, find \"Whistler\", and select it.",
        bullets: [
            "The top bar should now show \"Whistler\"",
            "Everything from here on happens inside this project",
        ],
        tip: "If a notification banner appears with \"Select Project\" — click that instead.",
        link: null,
    },
    {
        title: "Step 4",
        heading: "Open the API Library",
        body: "Navigate to the API Library where you can turn on specific Google APIs.",
        bullets: [
            "Hamburger menu (≡) → APIs & Services → Library",
            "Or use the direct link below",
        ],
        tip: null,
        link: { url: "https://console.cloud.google.com/apis/library/drive.googleapis.com", label: "Go directly to Drive API page" },
    },
    {
        title: "Step 5",
        heading: "Enable Google Drive API",
        body: "Search for \"Google Drive API\" and click Enable on the detail page.",
        bullets: [
            'If the button says "Manage" — it\'s already enabled, skip this step',
            "Don't enable any other APIs",
        ],
        tip: null,
        link: { url: "https://console.cloud.google.com/apis/library/drive.googleapis.com", label: "Open Drive API page" },
    },
    {
        title: "Step 6",
        heading: "Open the Credentials page",
        body: "This is where API keys are created and managed.",
        bullets: [
            "Sidebar → APIs & Services → Credentials",
            "Or click the link below",
        ],
        tip: null,
        link: { url: "https://console.cloud.google.com/apis/credentials", label: "Open Credentials page" },
    },
    {
        title: "Step 7",
        heading: "Create an API key",
        body: "Click + Create Credentials → API key. A popup will show the new key.",
        bullets: [
            "Do NOT copy the key yet",
            "Do NOT close the popup",
            'Click "Edit API key" in the popup — we need to add restrictions first',
        ],
        tip: null,
        link: null,
    },
    {
        title: "Step 8",
        heading: "Name the key",
        body: "Change the name at the top of the key editor.",
        bullets: [
            'Set it to "Whistler – Drive Playback"',
            "Just for your reference — doesn't affect functionality",
        ],
        tip: null,
        link: null,
    },
    {
        title: "Step 9",
        heading: "Restrict to whistlerbox.com only",
        body: "Under Application restrictions, select HTTP referrers (web sites).",
        bullets: [
            `Click Add and enter exactly: https://${WHISTLER_DOMAIN}/*`,
            `Optionally also add: https://www.${WHISTLER_DOMAIN}/*`,
            "Do NOT add any wildcards like */* or http://*",
        ],
        tip: "This means the key can ONLY be used from whistlerbox.com. Copying it to another site, curl, or Postman won't work.",
        link: null,
    },
    {
        title: "Step 10",
        heading: "Restrict to Google Drive API ONLY",
        body: 'Under API restrictions, change "Don\'t restrict key" to "Restrict key".',
        bullets: [
            'Select "Restrict key" — DO NOT leave it on "Don\'t restrict key"',
            "Pick Google Drive API from the dropdown",
            "Remove any other pre-selected APIs (click the ✕ on each)",
            "The list must show exactly one entry: Google Drive API",
        ],
        tip: 'If left unrestricted, this key could access Gmail, YouTube, Cloud Storage, Maps, billing, and every other Google service. Always set this to "Restrict key".',
        link: null,
    },
    {
        title: "Step 11",
        heading: "Save",
        body: "Click the blue Save button at the bottom of the editor.",
        bullets: [
            "Restrictions may take 1–2 minutes to propagate",
            'You can verify by re-opening the key — it should show "HTTP referrers" and "Google Drive API"',
        ],
        tip: null,
        link: null,
    },
    {
        title: "Step 12",
        heading: "Copy your API key",
        body: "Back on the Credentials page, find your key and click the copy icon.",
        bullets: [
            'It looks like "AIzaSy..." followed by ~35 characters',
            "Don't share it publicly — even restricted keys should stay private",
        ],
        tip: null,
        link: { url: "https://console.cloud.google.com/apis/credentials", label: "Open Credentials page" },
    },
    {
        title: "Step 13",
        heading: "Paste into Whistler",
        body: "Paste the key below. It saves automatically to your browser — never sent to the Whistler server.",
        bullets: [],
        tip: null,
        link: null,
    },
    {
        title: "Step 14",
        heading: "Test playback",
        body: "Open a public Google Drive video or audio file in Whistler.",
        bullets: [
            "Native player with full controls = working",
            'Not working? Check the file is shared as "Anyone with the link"',
            `Confirm you're on https://${WHISTLER_DOMAIN}`,
            "Wait 1–2 min if you just saved restrictions",
        ],
        tip: null,
        link: null,
    },
    {
        title: "Done",
        heading: "Setup complete",
        body: "Your key is locked down and ready.",
        bullets: [
            `Referrer restriction → only https://${WHISTLER_DOMAIN}/*`,
            "API restriction → Google Drive API only",
            "Stored in your browser, never on Whistler's server",
        ],
        tip: "Suspect abuse? Go to Credentials → click the key → Regenerate. Paste the new key here.",
        link: null,
    },
];

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */
export function GoogleDriveTab() {
    const {
        googleDriveApiKey,
        setGoogleDriveApiKey,
        googleDriveCacheEnabled,
        setGoogleDriveCacheEnabled,
    } = useStore(useShallow((state) => ({
        googleDriveApiKey: state.googleDriveApiKey,
        setGoogleDriveApiKey: state.setGoogleDriveApiKey,
        googleDriveCacheEnabled: state.googleDriveCacheEnabled,
        setGoogleDriveCacheEnabled: state.setGoogleDriveCacheEnabled,
    })));

    /* ── Cache state ── */
    const [cacheEntries, setCacheEntries] = useState<DriveCacheInfo[]>([]);
    const [cacheLoading, setCacheLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const refreshCache = useCallback(async () => {
        try {
            const entries = await driveCacheStorage.list();
            entries.sort((a, b) => b.cachedAt - a.cachedAt);
            setCacheEntries(entries);
        } catch {
            setCacheEntries([]);
        } finally {
            setCacheLoading(false);
        }
    }, []);

    useEffect(() => { refreshCache(); }, [refreshCache]);

    const handleDeleteEntry = async (id: string) => {
        setDeletingId(id);
        try {
            await driveCacheStorage.delete(id);
            setCacheEntries((prev) => prev.filter((e) => e.id !== id));
        } finally {
            setDeletingId(null);
        }
    };

    const handleClearAll = async () => {
        setCacheLoading(true);
        try {
            await driveCacheStorage.clear();
            setCacheEntries([]);
        } finally {
            setCacheLoading(false);
        }
    };

    const totalCacheSize = cacheEntries.reduce((sum, e) => sum + e.size, 0);

    /* ── Tour state ── */
    const [tourActive, setTourActive] = useState(false);
    const [tourStep, setTourStep] = useState(0);
    const currentStep = TOUR_STEPS[tourStep];
    const isLastStep = tourStep === TOUR_STEPS.length - 1;
    const startTour = () => { setTourStep(0); setTourActive(true); };
    const closeTour = () => setTourActive(false);
    const nextStep = () => { if (!isLastStep) { setTourStep((s) => s + 1); } else { closeTour(); } };
    const prevStep = () => { if (tourStep > 0) setTourStep((s) => s - 1); };

    useEffect(() => {
        if (!tourActive) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") { e.preventDefault(); nextStep(); }
            else if (e.key === "ArrowLeft") { e.preventDefault(); prevStep(); }
            else if (e.key === "Escape") { e.preventDefault(); closeTour(); }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    });

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Tabs defaultValue="settings">
                {/* ── Header with tabs ── */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <GoogleDriveLogo className="text-primary" size={24} />
                        Google Drive
                    </h2>
                    <TabsList className="rounded-none">
                        <TabsTrigger className="rounded-none" value="settings">Settings</TabsTrigger>
                        <TabsTrigger className="rounded-none" value="setup-guide">Setup Guide</TabsTrigger>
                    </TabsList>
                </div>

                {/* ════════════════════════════════════════════
                    TAB: Settings
                   ════════════════════════════════════════════ */}
                <TabsContent value="settings">
                    <div className="space-y-8">
                        {/* ── API Key ── */}
                        <div className="p-5 rounded-none border border-border bg-card/50 space-y-4">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <Key size={16} className="text-muted-foreground" />
                                    <label className="text-sm font-medium">API key for native playback</label>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Public Drive files only expose a real streamable media URL through the Drive API. Add a browser-restricted API key so Whistler can use the native player instead of Google&apos;s preview iframe.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                <Input
                                    value={googleDriveApiKey}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setGoogleDriveApiKey(e.target.value)}
                                    placeholder="Google Drive API key"
                                    spellCheck={false}
                                    autoComplete="off"
                                    className="bg-background/60"
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => setGoogleDriveApiKey('')}
                                    disabled={!googleDriveApiKey}
                                >
                                    Clear
                                </Button>
                            </div>

                            {!googleDriveApiKey && (
                                <div className="flex items-start gap-2 text-xs text-amber-400/80">
                                    <Warning size={14} className="mt-0.5 shrink-0" weight="bold" />
                                    <p>Without a key, Google Drive media falls back to preview mode — custom controls, seeking, and highlight markers are unavailable. See the Setup Guide tab for help.</p>
                                </div>
                            )}

                            {googleDriveApiKey && (
                                <div className="flex items-start gap-2 text-xs text-emerald-400/80">
                                    <Check size={14} className="mt-0.5 shrink-0" weight="bold" />
                                    <p>API key configured. Native playback is enabled for public Drive files.</p>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* ── File Cache ── */}
                        <div>
                            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                                <Database className="text-primary" size={20} />
                                File Cache
                            </h3>

                            <div className="p-5 rounded-none border border-border bg-card/50 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium">Cache Drive files locally</label>
                                        <p className="text-xs text-muted-foreground">
                                            Stores fetched Google Drive media in the browser so repeat plays don&apos;t use additional API quota.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={googleDriveCacheEnabled}
                                        onCheckedChange={setGoogleDriveCacheEnabled}
                                    />
                                </div>

                                <Separator />

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium">
                                            {cacheEntries.length} {cacheEntries.length === 1 ? 'file' : 'files'} cached
                                            {cacheEntries.length > 0 && (
                                                <span className="ml-2 text-xs text-muted-foreground font-normal">
                                                    ({formatBytes(totalCacheSize)})
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Cached files are stored in your browser and persist across sessions.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            onClick={refreshCache}
                                            title="Refresh cache list"
                                        >
                                            <ArrowCounterClockwise size={16} />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleClearAll}
                                            disabled={cacheEntries.length === 0 || cacheLoading}
                                        >
                                            <Trash size={14} className="mr-1.5" />
                                            Clear all
                                        </Button>
                                    </div>
                                </div>

                                {cacheLoading ? (
                                    <p className="text-xs text-muted-foreground py-4 text-center">Loading cache…</p>
                                ) : cacheEntries.length === 0 ? (
                                    <div className="rounded-none border border-border border-dashed bg-card/20 py-8 text-center">
                                        <Database size={32} className="mx-auto text-muted-foreground/40 mb-2" />
                                        <p className="text-xs text-muted-foreground">No cached Google Drive files yet.</p>
                                        <p className="text-xs text-muted-foreground/60 mt-1">Files will appear here after you play them with caching enabled.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
                                        {cacheEntries.map((entry) => (
                                            <div
                                                key={entry.id}
                                                className="flex items-center justify-between gap-3 rounded-none border border-border bg-background/40 px-3 py-2.5 group"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium truncate">{entry.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatBytes(entry.size)} · {formatRelativeTime(entry.cachedAt)}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleDeleteEntry(entry.id)}
                                                    disabled={deletingId === entry.id}
                                                    title="Remove from cache"
                                                >
                                                    <Trash size={14} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* ════════════════════════════════════════════
                    TAB: Setup Guide
                   ════════════════════════════════════════════ */}
                <TabsContent value="setup-guide">
                    <div className="space-y-6">
                        {/* ── Guided Tour ── */}
                        {!tourActive ? (
                            <button
                                type="button"
                                onClick={startTour}
                                className="w-full rounded-none border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors p-5 text-left group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="shrink-0 flex items-center justify-center h-10 w-10 rounded-none border border-primary/30 bg-primary/10 text-primary">
                                        <GraduationCap size={22} weight="duotone" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">Guided Setup Tour</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            New to this? Follow a step-by-step walkthrough to safely create and configure your API key.
                                        </p>
                                    </div>
                                    <Play size={20} className="shrink-0 text-primary opacity-60 group-hover:opacity-100 transition-opacity" weight="fill" />
                                </div>
                            </button>
                        ) : (
                            <div className="rounded-none border border-primary/20 bg-card/60 overflow-hidden">
                                {/* Tour header */}
                                <div className="flex items-center justify-between border-b border-border px-5 py-3 bg-primary/5">
                                    <div className="flex items-center gap-2">
                                        <GraduationCap size={18} className="text-primary" weight="duotone" />
                                        <span className="text-sm font-medium text-foreground">Setup Tour</span>
                                        <span className="text-xs text-muted-foreground">— Step {tourStep + 1} of {TOUR_STEPS.length}</span>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={closeTour}>
                                        Exit tour
                                    </Button>
                                </div>

                                {/* Progress bar */}
                                <div className="h-1 bg-muted">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${((tourStep + 1) / TOUR_STEPS.length) * 100}%` }}
                                    />
                                </div>

                                {/* Step content */}
                                <div className="p-5 space-y-4">
                                    <div>
                                        <p className="text-xs font-medium text-primary uppercase tracking-wider">{currentStep.title}</p>
                                        <h3 className="text-base font-semibold text-foreground mt-1">{currentStep.heading}</h3>
                                    </div>

                                    <p className="text-sm text-muted-foreground">{currentStep.body}</p>

                                    {currentStep.bullets.length > 0 && (
                                        <ul className="space-y-1.5">
                                            {currentStep.bullets.map((b) => (
                                                <li key={b} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                                                    {b}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {currentStep.tip && (
                                        <div className="rounded-none border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/90">
                                            {currentStep.tip}
                                        </div>
                                    )}

                                    {/* API key input on the paste step */}
                                    {currentStep.title === "Step 13" && (
                                        <div className="rounded-none border border-border bg-background/40 p-4 space-y-3">
                                            <label className="text-sm font-medium flex items-center gap-2">
                                                <Key size={14} className="text-muted-foreground" />
                                                Your API key
                                            </label>
                                            <Input
                                                value={googleDriveApiKey}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => setGoogleDriveApiKey(e.target.value)}
                                                placeholder="Paste your Google Drive API key here"
                                                spellCheck={false}
                                                autoComplete="off"
                                                className="bg-background/60"
                                            />
                                            {googleDriveApiKey ? (
                                                <div className="flex items-center gap-2 text-xs text-emerald-400/80">
                                                    <Check size={14} weight="bold" />
                                                    <span>Key saved. You can continue to the next step.</span>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground/60">Paste the key and it will be saved automatically.</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Completion state */}
                                    {currentStep.title === "Done" && googleDriveApiKey && (
                                        <div className="rounded-none border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
                                            <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" weight="bold" />
                                            <p className="text-sm text-emerald-100">Your API key is active. Native playback is ready to use.</p>
                                        </div>
                                    )}

                                    {/* External link */}
                                    {currentStep.link && (
                                        <a
                                            href={currentStep.link.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                                        >
                                            {currentStep.link.label}
                                            <ArrowSquareOut size={14} />
                                        </a>
                                    )}
                                </div>

                                {/* Navigation */}
                                <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-card/40">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1.5"
                                        onClick={prevStep}
                                        disabled={tourStep === 0}
                                    >
                                        <ArrowLeft size={14} />
                                        Back
                                    </Button>
                                    <div className="flex gap-1">
                                        {TOUR_STEPS.map((_, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => setTourStep(i)}
                                                className={`h-1.5 rounded-full transition-all ${
                                                    i === tourStep
                                                        ? "w-4 bg-primary"
                                                        : i < tourStep
                                                            ? "w-1.5 bg-primary/40"
                                                            : "w-1.5 bg-muted-foreground/20"
                                                }`}
                                                aria-label={`Go to step ${i + 1}`}
                                            />
                                        ))}
                                    </div>
                                    <Button
                                        variant={isLastStep ? "default" : "outline"}
                                        size="sm"
                                        className="gap-1.5"
                                        onClick={nextStep}
                                    >
                                        {isLastStep ? "Finish" : "Next"}
                                        {!isLastStep && <ArrowRight size={14} />}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* ── Quick Links ── */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                                { label: "Cloud Console", url: "https://console.cloud.google.com", icon: Globe },
                                { label: "Credentials", url: "https://console.cloud.google.com/apis/credentials", icon: Key },
                                { label: "Drive API", url: "https://console.cloud.google.com/apis/library/drive.googleapis.com", icon: GoogleDriveLogo },
                                { label: "Restrictions Guide", url: "https://cloud.google.com/api-keys/docs/add-restrictions-api-keys", icon: Lock },
                            ].map((l) => (
                                <a
                                    key={l.label}
                                    href={l.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group flex items-center gap-2.5 rounded-none border border-border bg-card/40 hover:bg-card/70 hover:border-primary/30 transition-colors px-3 py-2.5"
                                >
                                    <l.icon size={16} className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate">{l.label}</span>
                                    <ArrowSquareOut size={12} className="shrink-0 ml-auto text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                                </a>
                            ))}
                        </div>

                        {/* ── What & Why ── */}
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-none border border-border bg-card/50 p-4 space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <GoogleDriveLogo size={18} className="text-primary" />
                                    <p className="text-sm font-medium">What this does</p>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Lets Whistler play Google Drive files with its <strong className="text-foreground">native player</strong> — full controls, seeking, volume, and highlight markers instead of a limited preview iframe.
                                </p>
                            </div>
                            <div className="rounded-none border border-border bg-card/50 p-4 space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <Lock size={18} className="text-primary" />
                                    <p className="text-sm font-medium">How it stays safe</p>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Your key is locked to <strong className="text-foreground">whistlerbox.com</strong> and <strong className="text-foreground">Google Drive API only</strong>. It's stored in your browser — never sent to the Whistler server.
                                </p>
                            </div>
                        </div>

                        {/* ── Two Restrictions ── */}
                        <div className="rounded-none border border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Warning size={18} className="text-amber-400" weight="fill" />
                                <p className="text-sm font-medium text-amber-100">Two restrictions you must set</p>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="rounded-none border border-amber-500/15 bg-amber-500/5 px-3 py-2.5 space-y-1">
                                    <p className="text-xs font-semibold text-amber-100">1. HTTP Referrer</p>
                                    <p className="text-xs text-amber-100/70">Only <code className="bg-amber-500/15 px-1 py-0.5 text-amber-200">https://whistlerbox.com/*</code> can use the key. Other sites, curl, Postman — all blocked.</p>
                                </div>
                                <div className="rounded-none border border-amber-500/15 bg-amber-500/5 px-3 py-2.5 space-y-1">
                                    <p className="text-xs font-semibold text-amber-100">2. API Restriction</p>
                                    <p className="text-xs text-amber-100/70">Key can only call <strong>Google Drive API</strong>. No Gmail, YouTube, Maps, billing, or anything else.</p>
                                </div>
                            </div>
                            <p className="text-xs text-amber-100/50">With both in place, a leaked key is essentially useless.</p>
                        </div>

                        {/* ── Security Checklist ── */}
                        <div className="rounded-none border border-border bg-card/40 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={18} className="text-emerald-400" weight="duotone" />
                                <p className="text-sm font-medium">Security checklist</p>
                            </div>
                            <div className="grid gap-1.5 sm:grid-cols-2">
                                {[
                                    `Referrer → https://${WHISTLER_DOMAIN}/*`,
                                    'API → Google Drive API only',
                                    'Stored in browser, not on server',
                                    'No access to private files',
                                    'Suspect abuse? Regenerate the key',
                                    'Don\'t share in public repos or chats',
                                ].map((item) => (
                                    <div key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                                        <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" weight="bold" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Mistakes & Troubleshooting side by side ── */}
                        <div className="grid gap-3 sm:grid-cols-2">
                            {/* mistakes */}
                            <div className="rounded-none border border-border bg-card/40 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <X size={18} className="text-red-400" weight="bold" />
                                    <p className="text-sm font-medium">Don&apos;t do this</p>
                                </div>
                                <ul className="space-y-1.5">
                                    {[
                                        'Skip referrer restriction',
                                        'Use wildcards like */* or http://*',
                                        'Leave API set to "Don\'t restrict"',
                                        'Reuse a key from another service',
                                        'Expect access to private files',
                                    ].map((item) => (
                                        <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400/60" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {/* troubleshooting */}
                            <div className="rounded-none border border-border bg-card/40 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Wrench size={18} className="text-muted-foreground" />
                                    <p className="text-sm font-medium">Troubleshooting</p>
                                </div>
                                <ul className="space-y-1.5">
                                    {[
                                        'Not playing? File must be "Anyone with the link"',
                                        '403 error? Referrer doesn\'t match your URL',
                                        'Stopped working? Check if restrictions were reset',
                                        'Just saved? Wait 1–2 min to propagate',
                                        'Revoke access → Regenerate key in Credentials',
                                    ].map((item) => (
                                        <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
