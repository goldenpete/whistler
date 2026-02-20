/**
 * ─── AppearanceTab.tsx ─────────────────────────────────────────────
 *
 * Settings tab for theme, accent colors, base themes, interface
 * options, background customization, and preview image cache.
 *
 * Extracted from SettingsView.tsx for maintainability.
 *
 * Exports: AppearanceTab
 * Related: SettingsView, useStore
 * ───────────────────────────────────────────────────────────────────
 */
import { useState, type ChangeEvent } from "react";
import { useStore, DEFAULT_CUSTOM_ACCENT_THEMES, DEFAULT_CUSTOM_THEMES } from "@/store/useStore";
import { cn } from "@/lib/utils";
import {
    Palette,
    ArrowCounterClockwise,
    UploadSimple,
    Trash,
    Desktop,
    Layout,
    CaretLeft,
    CaretRight,
    SidebarSimple,
    FilmStrip,
    File,
    Folder,
    Gear,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/toggle-switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ColorPicker, PRESET_COLORS } from "@/components/ui/ColorPicker";
import { GradientEditor } from "@/components/ui/GradientEditor";
import { useShallow } from "@/lib/zustand-shallow";
import type { AccentTheme, BaseTheme } from "@/types";
import { thumbnailStorage } from "@/utils/thumbnailDb";

/* ═══════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════ */
const ACCENT_OPTIONS: { id: AccentTheme; label: string; previewClass: string }[] = [
    { id: "orange", label: "Orange", previewClass: "bg-orange-500" },
    { id: "emerald", label: "Emerald", previewClass: "bg-emerald-500" },
    { id: "violet", label: "Violet", previewClass: "bg-violet-500" },
    { id: "sky", label: "Sky", previewClass: "bg-sky-500" },
];

const BASE_OPTIONS: { id: BaseTheme; label: string; previewClass: string }[] = [
    { id: "neutral", label: "Neutral", previewClass: "bg-neutral-700" },
    { id: "stone", label: "Stone", previewClass: "bg-stone-700" },
    { id: "zinc", label: "Zinc", previewClass: "bg-zinc-700" },
    { id: "gray", label: "Gray", previewClass: "bg-gray-700" },
];

const DEFAULT_COLOR_ENTITIES: { key: 'file' | 'collection' | 'storage' | 'graph' | 'node'; label: string }[] = [
    { key: 'file', label: 'Files' },
    { key: 'collection', label: 'Collections' },
    { key: 'storage', label: 'Storage' },
    { key: 'graph', label: 'Graphs' },
    { key: 'node', label: 'Nodes' },
];

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */
export function AppearanceTab() {
    const {
        accentTheme: accentThemeOrUndefined,
        setAccentTheme,
        accentThemeMode,
        setAccentThemeMode,
        customAccentThemes,
        setCustomAccentTheme,
        baseTheme,
        setBaseTheme,
        baseThemeMode,
        setBaseThemeMode,
        customBaseThemes,
        setCustomBaseTheme,
        backgroundImageOpacity,
        setBackgroundImageOpacity,
        backgroundImageUrl,
        setBackgroundImageUrl,
        backgroundColor,
        setBackgroundColor,
        backgroundGradient,
        setBackgroundGradient,
        backgroundIsGradient,
        setBackgroundIsGradient,
        backgroundOverlayOpacity,
        setBackgroundOverlayOpacity,
        cacheFiles,
        setCacheFiles,
        cacheCollections,
        setCacheCollections,
        cacheHighlights,
        setCacheHighlights,
        enableDefaultColorControls,
        setEnableDefaultColorControls,
        defaultColors,
        setDefaultColor,
        sidebarMode,
        setSidebarMode,
        windowOutlineEnabled,
        setWindowOutlineEnabled,
        toggleThemingEnabled,
        setToggleThemingEnabled,
        largeTogglesThemingEnabled,
        setLargeTogglesThemingEnabled,
    } = useStore(useShallow((state) => ({
        accentTheme: state.accentTheme,
        setAccentTheme: state.setAccentTheme,
        accentThemeMode: state.accentThemeMode,
        setAccentThemeMode: state.setAccentThemeMode,
        customAccentThemes: state.customAccentThemes,
        setCustomAccentTheme: state.setCustomAccentTheme,
        baseTheme: state.baseTheme,
        setBaseTheme: state.setBaseTheme,
        baseThemeMode: state.baseThemeMode,
        setBaseThemeMode: state.setBaseThemeMode,
        customBaseThemes: state.customBaseThemes,
        setCustomBaseTheme: state.setCustomBaseTheme,
        backgroundImageOpacity: state.backgroundImageOpacity,
        setBackgroundImageOpacity: state.setBackgroundImageOpacity,
        backgroundImageUrl: state.backgroundImageUrl,
        setBackgroundImageUrl: state.setBackgroundImageUrl,
        backgroundColor: state.backgroundColor,
        setBackgroundColor: state.setBackgroundColor,
        backgroundGradient: state.backgroundGradient,
        setBackgroundGradient: state.setBackgroundGradient,
        backgroundIsGradient: state.backgroundIsGradient,
        setBackgroundIsGradient: state.setBackgroundIsGradient,
        backgroundOverlayOpacity: state.backgroundOverlayOpacity,
        setBackgroundOverlayOpacity: state.setBackgroundOverlayOpacity,
        cacheFiles: state.cacheFiles,
        setCacheFiles: state.setCacheFiles,
        cacheCollections: state.cacheCollections,
        setCacheCollections: state.setCacheCollections,
        cacheHighlights: state.cacheHighlights,
        setCacheHighlights: state.setCacheHighlights,
        enableDefaultColorControls: state.enableDefaultColorControls,
        setEnableDefaultColorControls: state.setEnableDefaultColorControls,
        defaultColors: state.defaultColors,
        setDefaultColor: state.setDefaultColor,
        sidebarMode: state.sidebarMode,
        setSidebarMode: state.setSidebarMode,
        windowOutlineEnabled: state.windowOutlineEnabled,
        setWindowOutlineEnabled: state.setWindowOutlineEnabled,
        toggleThemingEnabled: state.toggleThemingEnabled,
        setToggleThemingEnabled: state.setToggleThemingEnabled,
        largeTogglesThemingEnabled: state.largeTogglesThemingEnabled,
        setLargeTogglesThemingEnabled: state.setLargeTogglesThemingEnabled,
    })));

    const accentTheme = accentThemeOrUndefined || 'orange';
    const [clearingCache, setClearingCache] = useState<string | null>(null);
    const [interfacePage, setInterfacePage] = useState(1);

    const handleClearCache = async (type: 'files' | 'collections' | 'highlights') => {
        setClearingCache(type);
        try {
            if (type === 'files') {
                await thumbnailStorage.deleteByFilter(key => key.endsWith('-start') || key.endsWith('-mid'));
            } else if (type === 'collections') {
                await thumbnailStorage.deleteByFilter(key => key.endsWith('-grid'));
            } else if (type === 'highlights') {
                await thumbnailStorage.deleteByFilter(key => key.endsWith('-grid'));
            }
        } catch (e) {
            console.error("Failed to clear cache", e);
        } finally {
            setClearingCache(null);
        }
    };

    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setBackgroundImageUrl(event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Palette className="text-primary" size={24} />
                    Theme & Colors
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4 p-5 rounded-lg border border-border bg-card/50">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium">Accent Color</label>
                            <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border/50">
                                <button
                                    onClick={() => {
                                        setAccentThemeMode('presets');
                                        if (accentTheme.startsWith('custom-')) {
                                            setAccentTheme('orange');
                                        }
                                    }}
                                    className={cn(
                                        "px-3 py-1 rounded-md text-xs font-medium transition-all",
                                        accentThemeMode === 'presets' 
                                            ? (largeTogglesThemingEnabled ? "bg-primary text-primary-foreground shadow-sm" : "bg-background shadow-sm text-foreground")
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Presets
                                </button>
                                <button
                                    onClick={() => {
                                        setAccentThemeMode('custom');
                                        if (!accentTheme.startsWith('custom-')) {
                                            setAccentTheme('custom-accent-1');
                                        }
                                    }}
                                    className={cn(
                                        "px-3 py-1 rounded-md text-xs font-medium transition-all",
                                        accentThemeMode === 'custom' 
                                            ? (largeTogglesThemingEnabled ? "bg-primary text-primary-foreground shadow-sm" : "bg-background shadow-sm text-foreground")
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Custom
                                </button>
                            </div>
                        </div>

                        {accentThemeMode === 'presets' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {ACCENT_OPTIONS.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => setAccentTheme(option.id)}
                                        className={cn(
                                            "flex flex-col items-center gap-2 p-3 rounded-md border transition-all hover:bg-accent/50",
                                            accentTheme === option.id 
                                                ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                                                : "border-border/50 bg-card"
                                        )}
                                    >
                                        <span className={cn("h-6 w-6 rounded-full shadow-sm", option.previewClass)} />
                                        <span className="text-xs font-medium">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[1, 2, 3, 4].map((num) => {
                                        const id = `custom-accent-${num}`;
                                        const isActive = accentTheme === id;
                                        const theme = customAccentThemes?.[id];
                                        
                                        return (
                                            <button
                                                key={id}
                                                onClick={() => setAccentTheme(id as AccentTheme)}
                                                className={cn(
                                                    "flex flex-col items-center gap-2 p-3 rounded-md border transition-all hover:bg-accent/50",
                                                    isActive 
                                                        ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                                                        : "border-border/50 bg-card"
                                                )}
                                            >
                                                <span 
                                                    className="h-6 w-6 rounded-full shadow-sm border border-border"
                                                    style={{ backgroundColor: theme?.colors['--primary'] || '#888' }}
                                                />
                                                <span className="text-xs font-medium">Slot {num}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {(() => {
                                    if (!accentTheme.startsWith('custom-accent-') || !customAccentThemes) return null;
                                    const activeTheme = customAccentThemes[accentTheme];
                                    if (!activeTheme) return null;

                                    const themeSlots = [
                                        { key: '--primary', label: 'Primary' },
                                        { key: '--primary-foreground', label: 'Primary Text' },
                                        { key: '--accent', label: 'Accent' },
                                        { key: '--accent-foreground', label: 'Accent Text (Hover)' },
                                    ] as const;

                                    return (
                                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" className="w-full border-dashed h-10">
                                                        <Palette className="mr-2 h-4 w-4" />
                                                        Customize Accent Colors
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[500px]">
                                                    <DialogHeader>
                                                        <DialogTitle>Customize Accent</DialogTitle>
                                                        <DialogDescription>
                                                            Fine-tune the colors for <span className="font-mono text-primary">{accentTheme}</span>.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    
                                                    <div className="grid grid-cols-2 gap-4 py-2">
                                                        <div className="flex flex-col gap-2 items-center p-4 rounded-lg border border-border bg-card">
                                                            <span className="text-xs font-medium text-muted-foreground">Primary</span>
                                                            <div className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium shadow-sm">
                                                                Active Item
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-2 items-center p-4 rounded-lg border border-border bg-card">
                                                            <span className="text-xs font-medium text-muted-foreground">Accent (Hover)</span>
                                                            <div className="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium shadow-sm">
                                                                Hover Item
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 py-2">
                                                        {themeSlots.map((slot) => (
                                                            <div key={slot.key} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-accent/50 transition-colors">
                                                                <div className="flex flex-col gap-1.5">
                                                                    <span className="text-sm font-medium">{slot.label}</span>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex items-center gap-2 bg-background/50 p-1 rounded-lg border border-border/50">
                                                                        <div className="relative group">
                                                                            <div 
                                                                                className="w-8 h-8 rounded-md border shadow-sm cursor-pointer relative overflow-hidden ring-offset-background transition-all hover:scale-105 active:scale-95" 
                                                                                style={{ backgroundColor: activeTheme.colors[slot.key] }}
                                                                                title="Pick a color"
                                                                            >
                                                                                <input 
                                                                                    type="color" 
                                                                                    value={activeTheme.colors[slot.key]} 
                                                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                                                        setCustomAccentTheme(accentTheme, {
                                                                                            colors: {
                                                                                                ...activeTheme.colors,
                                                                                                [slot.key]: e.target.value
                                                                                            }
                                                                                        });
                                                                                    }}
                                                                                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <div className="w-px h-6 bg-border/50" />

                                                                        <Input
                                                                            value={activeTheme.colors[slot.key]}
                                                                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                                                setCustomAccentTheme(accentTheme, {
                                                                                    colors: {
                                                                                        ...activeTheme.colors,
                                                                                        [slot.key]: e.target.value
                                                                                    }
                                                                                });
                                                                            }}
                                                                            className="w-[80px] h-8 font-mono uppercase text-xs bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                                                                            maxLength={7}
                                                                        />

                                                                        <div className="w-px h-6 bg-border/50" />

                                                                        <Popover>
                                                                            <PopoverTrigger asChild>
                                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                                                    <Palette className="h-4 w-4" />
                                                                                </Button>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent className="w-[280px] p-3" align="end">
                                                                                <div className="grid grid-cols-8 gap-2">
                                                                                    {PRESET_COLORS.map((c) => (
                                                                                        <button
                                                                                            key={c}
                                                                                            className={cn(
                                                                                                "w-6 h-6 rounded-full border border-white/10 hover:scale-110 transition-transform shadow-sm",
                                                                                                activeTheme.colors[slot.key] === c && "ring-2 ring-white ring-offset-2 ring-offset-zinc-900"
                                                                                            )}
                                                                                            style={{ backgroundColor: c }}
                                                                                            onClick={() => {
                                                                                                setCustomAccentTheme(accentTheme, {
                                                                                                    colors: {
                                                                                                        ...activeTheme.colors,
                                                                                                        [slot.key]: c
                                                                                                    }
                                                                                                });
                                                                                            }}
                                                                                            title={c}
                                                                                        />
                                                                                    ))}
                                                                                </div>
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    </div>

                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                                                        onClick={() => {
                                                                            const defaultColor = DEFAULT_CUSTOM_ACCENT_THEMES[accentTheme]?.colors[slot.key];
                                                                            if (defaultColor) {
                                                                                setCustomAccentTheme(accentTheme, {
                                                                                    colors: {
                                                                                        ...activeTheme.colors,
                                                                                        [slot.key]: defaultColor
                                                                                    }
                                                                                });
                                                                            }
                                                                        }}
                                                                        title="Reset to default"
                                                                    >
                                                                        <ArrowCounterClockwise className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 p-5 rounded-lg border border-border bg-card/50">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium">Base Theme</label>
                            <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border/50">
                                <button
                                    onClick={() => {
                                        setBaseThemeMode('presets');
                                        if (baseTheme?.startsWith('custom-')) {
                                            setBaseTheme('zinc');
                                        }
                                    }}
                                    className={cn(
                                        "px-3 py-1 rounded-md text-xs font-medium transition-all",
                                        baseThemeMode === 'presets' 
                                            ? (largeTogglesThemingEnabled ? "bg-primary text-primary-foreground shadow-sm" : "bg-background shadow-sm text-foreground")
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Presets
                                </button>
                                <button
                                    onClick={() => {
                                        setBaseThemeMode('custom');
                                        if (!baseTheme?.startsWith('custom-')) {
                                            setBaseTheme('custom-1');
                                        }
                                    }}
                                    className={cn(
                                        "px-3 py-1 rounded-md text-xs font-medium transition-all",
                                        baseThemeMode === 'custom' 
                                            ? (largeTogglesThemingEnabled ? "bg-primary text-primary-foreground shadow-sm" : "bg-background shadow-sm text-foreground")
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Custom
                                </button>
                            </div>
                        </div>

                        {baseThemeMode === 'presets' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {BASE_OPTIONS.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => setBaseTheme(option.id)}
                                        className={cn(
                                            "flex flex-col items-center gap-2 p-3 rounded-md border transition-all hover:bg-accent/50",
                                            baseTheme === option.id 
                                                ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                                                : "border-border/50 bg-card"
                                        )}
                                    >
                                        <span className={cn("h-6 w-6 rounded-full shadow-sm", option.previewClass)} />
                                        <span className="text-xs font-medium">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[1, 2, 3, 4].map((num) => {
                                        const id = `custom-${num}`;
                                        const isActive = baseTheme === id;
                                        const theme = customBaseThemes?.[id];
                                        
                                        return (
                                            <button
                                                key={id}
                                                onClick={() => setBaseTheme(id as BaseTheme)}
                                                className={cn(
                                                    "flex flex-col items-center gap-2 p-3 rounded-md border transition-all hover:bg-accent/50",
                                                    isActive 
                                                        ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                                                        : "border-border/50 bg-card"
                                                )}
                                            >
                                                <div className="h-6 w-6 rounded-full shadow-sm border border-border flex overflow-hidden ring-1 ring-border/20">
                                                    <div className="w-1/2 h-full" style={{ backgroundColor: theme?.colors['--background'] || '#000' }} />
                                                    <div className="w-1/2 h-full" style={{ backgroundColor: theme?.colors['--sidebar'] || '#222' }} />
                                                </div>
                                                <span className="text-xs font-medium">Slot {num}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {(() => {
                                    if (!baseTheme?.startsWith('custom-') || !customBaseThemes) return null;
                                    const activeTheme = customBaseThemes[baseTheme];
                                    if (!activeTheme) return null;

                                    const themeSlots = [
                                        { key: '--background', label: 'Background' },
                                        { key: '--sidebar', label: 'Sidebar' },
                                        { key: '--sidebar-foreground', label: 'Sidebar Text' },
                                        { key: '--card', label: 'Card / Panels' },
                                        { key: '--foreground', label: 'Foreground (Text)' },
                                        { key: '--muted-foreground', label: 'Secondary Text' },
                                        { key: '--border', label: 'Borders' },
                                    ] as const;

                                    return (
                                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" className="w-full border-dashed h-10">
                                                        <Palette className="mr-2 h-4 w-4" />
                                                        Customize Theme Colors
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[500px]">
                                                    <DialogHeader>
                                                        <DialogTitle>Customize Theme</DialogTitle>
                                                        <DialogDescription>
                                                            Fine-tune the colors for <span className="font-mono text-primary">{baseTheme}</span>.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    
                                                    <div className="space-y-4 py-2">
                                                        {themeSlots.map((slot) => (
                                                            <div key={slot.key} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-accent/50 transition-colors">
                                                                <div className="flex flex-col gap-1.5">
                                                                    <span className="text-sm font-medium">{slot.label}</span>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex items-center gap-2 bg-background/50 p-1 rounded-lg border border-border/50">
                                                                        <div className="relative group">
                                                                            <div 
                                                                                className="w-8 h-8 rounded-md border shadow-sm cursor-pointer relative overflow-hidden ring-offset-background transition-all hover:scale-105 active:scale-95" 
                                                                                style={{ backgroundColor: activeTheme.colors[slot.key] }}
                                                                                title="Pick a color"
                                                                            >
                                                                                <input 
                                                                                    type="color" 
                                                                                    value={activeTheme.colors[slot.key]} 
                                                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                                                        setCustomBaseTheme(baseTheme, {
                                                                                            colors: {
                                                                                                ...activeTheme.colors,
                                                                                                [slot.key]: e.target.value
                                                                                            }
                                                                                        });
                                                                                    }}
                                                                                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <div className="w-px h-6 bg-border/50" />

                                                                        <Input
                                                                            value={activeTheme.colors[slot.key]}
                                                                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                                                setCustomBaseTheme(baseTheme, {
                                                                                    colors: {
                                                                                        ...activeTheme.colors,
                                                                                        [slot.key]: e.target.value
                                                                                    }
                                                                                });
                                                                            }}
                                                                            className="w-[80px] h-8 font-mono uppercase text-xs bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                                                                            maxLength={7}
                                                                        />

                                                                        <div className="w-px h-6 bg-border/50" />

                                                                        <Popover>
                                                                            <PopoverTrigger asChild>
                                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                                                    <Palette className="h-4 w-4" />
                                                                                </Button>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent className="w-[280px] p-3" align="end">
                                                                                <div className="grid grid-cols-8 gap-2">
                                                                                    {PRESET_COLORS.map((c) => (
                                                                                        <button
                                                                                            key={c}
                                                                                            className={cn(
                                                                                                "w-6 h-6 rounded-full border border-white/10 hover:scale-110 transition-transform shadow-sm",
                                                                                                activeTheme.colors[slot.key] === c && "ring-2 ring-white ring-offset-2 ring-offset-zinc-900"
                                                                                            )}
                                                                                            style={{ backgroundColor: c }}
                                                                                            onClick={() => {
                                                                                                setCustomBaseTheme(baseTheme, {
                                                                                                    colors: {
                                                                                                        ...activeTheme.colors,
                                                                                                        [slot.key]: c
                                                                                                    }
                                                                                                });
                                                                                            }}
                                                                                            title={c}
                                                                                        />
                                                                                    ))}
                                                                                </div>
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    </div>

                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                                                        onClick={() => {
                                                                            const defaultColor = DEFAULT_CUSTOM_THEMES[baseTheme]?.colors[slot.key];
                                                                            if (defaultColor) {
                                                                                setCustomBaseTheme(baseTheme, {
                                                                                    colors: {
                                                                                        ...activeTheme.colors,
                                                                                        [slot.key]: defaultColor
                                                                                    }
                                                                                });
                                                                            }
                                                                        }}
                                                                        title="Reset to default"
                                                                    >
                                                                        <ArrowCounterClockwise className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Separator />

            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Layout className="text-primary" size={24} />
                    Interface
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative p-5 rounded-lg border border-border bg-card/50 flex flex-col justify-between">
                        <div className="flex flex-col justify-center flex-1">
                            {interfacePage === 1 ? (
                                <>
                                    <label className="text-sm font-medium block mb-3">Sidebar Mode</label>
                                    <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border/50">
                                        <button
                                            onClick={() => setSidebarMode('full')}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                                sidebarMode === 'full' 
                                                    ? (largeTogglesThemingEnabled ? "bg-primary text-primary-foreground shadow-sm" : "bg-background shadow-sm text-foreground")
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <SidebarSimple size={16} />
                                            Full
                                        </button>
                                        <button
                                            onClick={() => setSidebarMode('slim')}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                                sidebarMode === 'slim' 
                                                    ? (largeTogglesThemingEnabled ? "bg-primary text-primary-foreground shadow-sm" : "bg-background shadow-sm text-foreground")
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <SidebarSimple size={16} weight="duotone" />
                                            Slim
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-between h-full">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium">Toggle Theming</label>
                                        <p className="text-xs text-muted-foreground">Apply theme color to enabled toggles</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="icon-xs" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                                                    <Gear size={14} weight="fill" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-3" align="end">
                                                <div className="flex items-center gap-3">
                                                    <div className="space-y-0.5">
                                                        <label className="text-sm font-medium whitespace-nowrap">Include large toggles</label>
                                                    </div>
                                                    <Switch 
                                                        checked={largeTogglesThemingEnabled}
                                                        onCheckedChange={setLargeTogglesThemingEnabled}
                                                    />
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        <Switch 
                                            checked={toggleThemingEnabled}
                                            onCheckedChange={setToggleThemingEnabled}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="absolute top-3 right-3 flex gap-1">
                            <Button 
                                variant="ghost" 
                                size="icon-xs" 
                                className="h-6 w-6"
                                onClick={() => setInterfacePage(Math.max(1, interfacePage - 1))} 
                                disabled={interfacePage === 1}
                            >
                                <CaretLeft size={14} />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon-xs" 
                                className="h-6 w-6"
                                onClick={() => setInterfacePage(Math.min(2, interfacePage + 1))} 
                                disabled={interfacePage === 2}
                            >
                                <CaretRight size={14} />
                            </Button>
                        </div>
                    </div>

                    <div className="p-5 rounded-lg border border-border bg-card/50 flex flex-col justify-center gap-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">Window Outlines</label>
                                <p className="text-xs text-muted-foreground">Use file color for window borders</p>
                            </div>
                            <Switch 
                                checked={windowOutlineEnabled}
                                onCheckedChange={setWindowOutlineEnabled}
                            />
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/40">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">Advanced Default Colors</label>
                                <p className="text-xs text-muted-foreground">Set custom defaults for new items</p>
                            </div>
                            <Switch 
                                checked={enableDefaultColorControls}
                                onCheckedChange={setEnableDefaultColorControls}
                            />
                        </div>
                    </div>
                </div>

                {enableDefaultColorControls && (
                    <div className="mt-4 p-5 rounded-lg border border-border bg-card/50 animate-in fade-in slide-in-from-top-2">
                        <label className="text-sm font-medium block mb-3">Default Item Colors</label>
                        <div className="flex flex-wrap gap-3">
                            {DEFAULT_COLOR_ENTITIES.map((entity) => (
                                <Popover key={entity.key}>
                                    <PopoverTrigger asChild>
                                        <button
                                            className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                                        >
                                            <span
                                                className="h-3 w-3 rounded-full border border-border/60"
                                                style={{ backgroundColor: (defaultColors && defaultColors[entity.key]) ?? "hsl(var(--primary))" }}
                                            />
                                            <span className="text-xs font-medium">{entity.label}</span>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-3">
                                        <ColorPicker
                                            color={(defaultColors && defaultColors[entity.key]) ?? "#000000"}
                                            onChange={(c) => setDefaultColor(entity.key, c)}
                                        />
                                    </PopoverContent>
                                </Popover>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <Separator />

            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Desktop className="text-primary" size={24} />
                    Background
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6 p-5 rounded-lg border border-border bg-card/50 h-full">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Background Type</label>
                                <div className="flex bg-muted rounded-md p-1 gap-1">
                                    <button
                                        onClick={() => setBackgroundIsGradient(false)}
                                        className={cn(
                                            "px-3 py-1 rounded-sm text-xs font-medium transition-all",
                                            !backgroundIsGradient 
                                                ? (largeTogglesThemingEnabled ? "bg-primary text-primary-foreground shadow-sm" : "bg-background shadow-sm text-foreground")
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Solid
                                    </button>
                                    <button
                                        onClick={() => setBackgroundIsGradient(true)}
                                        className={cn(
                                            "px-3 py-1 rounded-sm text-xs font-medium transition-all",
                                            backgroundIsGradient 
                                                ? (largeTogglesThemingEnabled ? "bg-primary text-primary-foreground shadow-sm" : "bg-background shadow-sm text-foreground")
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Gradient
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Background {backgroundIsGradient ? 'Gradient' : 'Color'}</label>
                                {!backgroundIsGradient ? (
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="w-4 h-4 rounded-full border border-border" 
                                            style={{ backgroundColor: backgroundColor || '#000000' }}
                                        />
                                        <span className="text-xs font-mono text-muted-foreground">{backgroundColor || '#000000'}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="w-4 h-4 rounded-full border border-border" 
                                            style={{ background: backgroundGradient || 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)' }}
                                        />
                                    </div>
                                )}
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        <div 
                                            className="w-4 h-4 rounded-full mr-2 border border-border" 
                                            style={{ 
                                                background: backgroundIsGradient 
                                                    ? (backgroundGradient || 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)')
                                                    : (backgroundColor || '#000000') 
                                            }}
                                        />
                                        {backgroundIsGradient ? 'Edit Gradient' : 'Pick a color'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-3">
                                    {backgroundIsGradient ? (
                                        <GradientEditor
                                            value={backgroundGradient || 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)'}
                                            onChange={setBackgroundGradient}
                                        />
                                    ) : (
                                        <ColorPicker
                                            color={backgroundColor ?? '#000000'}
                                            onChange={setBackgroundColor}
                                        />
                                    )}
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Color Overlay Opacity</label>
                                <span className="text-xs font-mono text-muted-foreground">{(backgroundOverlayOpacity * 100).toFixed(0)}%</span>
                            </div>
                            <Slider
                                value={[backgroundOverlayOpacity]}
                                min={0}
                                max={1}
                                step={0.01}
                                onValueChange={([v]: number[]) => setBackgroundOverlayOpacity(v)}
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Image Opacity</label>
                                <span className="text-xs font-mono text-muted-foreground">{(backgroundImageOpacity * 100).toFixed(0)}%</span>
                            </div>
                            <Slider
                                value={[backgroundImageOpacity]}
                                min={0}
                                max={1}
                                step={0.01}
                                onValueChange={([v]: number[]) => setBackgroundImageOpacity(v)}
                            />
                        </div>

                        <div className="pt-4 border-t border-border/40">
                            {backgroundImageUrl ? (
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">Image set</div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => document.getElementById('bg-upload')?.click()}>
                                            Change
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => setBackgroundImageUrl(null)}>
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">No background image set</span>
                                    <Button variant="outline" size="sm" onClick={() => document.getElementById('bg-upload')?.click()}>
                                        <UploadSimple className="mr-2" />
                                        Upload Image
                                    </Button>
                                </div>
                            )}
                            <input
                                id="bg-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                        </div>
                    </div>

                    <div className="relative rounded-lg border border-border overflow-hidden shadow-lg bg-black h-full min-h-[300px]">
                        <div className="absolute top-3 left-3 z-50 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-medium text-white/90 uppercase tracking-wider shadow-sm">
                            Preview
                        </div>
                        {/* Preview Logic - Matches MainLayout.tsx */}
                        {/* 1. Color/Gradient Layer (Bottom) */}
                        <div 
                            className="absolute inset-0 z-0 pointer-events-none"
                            style={{ 
                                background: backgroundIsGradient 
                                    ? (backgroundGradient || 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)')
                                    : (backgroundColor || '#000000'),
                                opacity: backgroundOverlayOpacity
                            }}
                        />
                        
                        {/* 2. Image Layer (Top) */}
                        {backgroundImageUrl && (
                            <div 
                                className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none"
                                style={{ 
                                    backgroundImage: `url(${backgroundImageUrl})`,
                                    opacity: backgroundImageOpacity
                                }}
                            />
                        )}
                        
                        {/* Mock Content */}
                        <div className="absolute inset-0 flex items-center justify-center p-6">
                            <div className="w-3/4 h-3/4 rounded-lg border border-border bg-card/80 backdrop-blur-sm shadow-xl flex flex-col">
                                <div className="h-8 border-b border-border flex items-center px-3 gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                                </div>
                                <div className="flex-1 p-4 space-y-3">
                                    <div className="h-2 w-1/3 bg-muted rounded" />
                                    <div className="h-2 w-2/3 bg-muted rounded" />
                                    <div className="h-2 w-1/2 bg-muted rounded" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FilmStrip className="text-primary" size={24} />
                    Preview Image Cache
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-5 rounded-lg border border-border bg-card/50 flex flex-col justify-between gap-4">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2 mb-1">
                                <File size={16} className="text-muted-foreground" />
                                <label className="text-sm font-medium">Files</label>
                            </div>
                            <p className="text-xs text-muted-foreground">Cache preview frames for video files</p>
                        </div>
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleClearCache('files')}
                                disabled={clearingCache === 'files'}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Clear Files Cache"
                            >
                                {clearingCache === 'files' ? (
                                    <ArrowCounterClockwise className="animate-spin" size={16} />
                                ) : (
                                    <Trash size={16} />
                                )}
                            </Button>
                            <Switch 
                                checked={cacheFiles}
                                onCheckedChange={setCacheFiles}
                            />
                        </div>
                    </div>

                    <div className="p-5 rounded-lg border border-border bg-card/50 flex flex-col justify-between gap-4">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2 mb-1">
                                <Folder size={16} className="text-muted-foreground" />
                                <label className="text-sm font-medium">Collections</label>
                            </div>
                            <p className="text-xs text-muted-foreground">Cache 2x2 grid previews for collections</p>
                        </div>
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleClearCache('collections')}
                                disabled={clearingCache === 'collections'}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Clear Collections Cache"
                            >
                                {clearingCache === 'collections' ? (
                                    <ArrowCounterClockwise className="animate-spin" size={16} />
                                ) : (
                                    <Trash size={16} />
                                )}
                            </Button>
                            <Switch 
                                checked={cacheCollections}
                                onCheckedChange={setCacheCollections}
                            />
                        </div>
                    </div>

                    <div className="p-5 rounded-lg border border-border bg-card/50 flex flex-col justify-between gap-4">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2 mb-1">
                                <FilmStrip size={16} className="text-muted-foreground" />
                                <label className="text-sm font-medium">Highlights</label>
                            </div>
                            <p className="text-xs text-muted-foreground">Cache preview frames for highlights</p>
                        </div>
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleClearCache('highlights')}
                                disabled={clearingCache === 'highlights'}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Clear Highlights Cache"
                            >
                                {clearingCache === 'highlights' ? (
                                    <ArrowCounterClockwise className="animate-spin" size={16} />
                                ) : (
                                    <Trash size={16} />
                                )}
                            </Button>
                            <Switch 
                                checked={cacheHighlights}
                                onCheckedChange={setCacheHighlights}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
