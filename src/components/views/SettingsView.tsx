import React, { useState, useRef, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { 
    SpeakerHigh, 
    Palette, 
    CheckCircle, 
    ArrowCounterClockwise, 
    UploadSimple,
    Trash,
    Monitor,
    Globe,
    Sidebar,
    Layout,
    MusicNotes,
    Mouse,
    Check,
    X,
    MagnifyingGlass,
    CaretLeft,
    SidebarSimple,
    FilmStrip,
    Cloud,
    File,
    Folder,
    FileText,
    Graph,
    HardDrives,
    PencilSimple,
    Gear
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { SettingsSync } from "@/components/settings/SettingsSync";
import { DestructiveDeleteDialog } from "@/components/ui/destructive-delete-dialog";
import type { AccentTheme, BaseTheme } from "@/types";

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

type SettingsTab = 'appearance' | 'music' | 'system' | 'sync';

export default function SettingsView() {
    const {  
        accentTheme, 
        setAccentTheme, 
        baseTheme, 
        setBaseTheme,
        backgroundImageOpacity,
        setBackgroundImageOpacity,
        backgroundImageUrl,
        setBackgroundImageUrl,
        backgroundOverlayOpacity,
        setBackgroundOverlayOpacity,
        setAmbientMusicUrl,
        ambientMusicUrl,
        setAmbientMusicVolume,
        ambientMusicVolume,
        ambientMusicName,
        ambientMusicPaused,
        setAmbientMusicPaused,
        muteNewVideosUntilUnmuted,
        setMuteNewVideosUntilUnmuted,
        rememberMediaVolume,
        setRememberMediaVolume,
        disableMediaAutoplay,
        setDisableMediaAutoplay,
        useMiddleFrameForPreviews,
        setUseMiddleFrameForPreviews,
        sfxEnabled,
        setSfxEnabled,
        enabledSounds,
        toggleSound,
        enableDefaultColorControls,
        setEnableDefaultColorControls,
        defaultColors,
        setDefaultColor,
        sidebarMode,
        setSidebarMode,
        windowOutlineEnabled,
        setWindowOutlineEnabled,
        setState
    } = useStore();

    const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
    const [deleteLocalOpen, setDeleteLocalOpen] = useState(false);
    const [localItemToDelete, setLocalItemToDelete] = useState<{id: string, label: string} | null>(null);
    const [isDeletingLocal, setIsDeletingLocal] = useState(false);

    const handleDeleteLocal = async () => {
        if (!localItemToDelete) return;
        setIsDeletingLocal(true);
        
        // Small delay to simulate processing and allow UI to update if needed
        await new Promise(resolve => setTimeout(resolve, 500));

        switch (localItemToDelete.id) {
            case 'files':
                setState({ files: [], activeFileId: null });
                break;
            case 'collections':
                setState({ collections: [], activeCollectionId: null });
                break;
            case 'highlights':
                setState({ highlights: [], activeHighlightId: null });
                break;
            case 'docs':
                setState({ docs: [], activeDocId: null });
                break;
            case 'graphs':
                setState({ graphs: [], graphNodes: [], graphEdges: [], activeGraphId: null });
                break;
            case 'storages':
                setState({ storages: [], activeStorageId: null });
                break;
        }

        setIsDeletingLocal(false);
        setDeleteLocalOpen(false);
        setLocalItemToDelete(null);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleAmbientMusicUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const url = URL.createObjectURL(file);
                setAmbientMusicUrl(url, file.name);
                setAmbientMusicVolume(0.5);
                setAmbientMusicPaused(false);
            }
        };
        input.click();
    };

    const handleReload = () => {
        window.location.reload();
    };

    const handleReset = () => {
        if (confirm("Are you sure you want to reset all data? This cannot be undone.")) {
            localStorage.removeItem('whistler_v2_data');
            window.location.reload();
        }
    };

    return (
        <div className="flex h-full w-full bg-transparent text-foreground overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r border-border bg-card/30 flex flex-col shrink-0 backdrop-blur-sm">
                <div className="p-6 pb-4">
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your workspace preferences.</p>
                </div>
                
                <nav className="flex-1 px-4 py-2 space-y-6">
                    <div>
                        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preferences</h3>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('appearance')}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                    activeTab === 'appearance' 
                                        ? "bg-primary/10 text-primary" 
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <Palette size={18} weight={activeTab === 'appearance' ? "fill" : "regular"} />
                                Appearance
                            </button>
                            <button
                                onClick={() => setActiveTab('music')}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                    activeTab === 'music' 
                                        ? "bg-primary/10 text-primary" 
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <SpeakerHigh size={18} weight={activeTab === 'music' ? "fill" : "regular"} />
                                Audio & Media
                            </button>
                        </div>
                    </div>

                    <div>
                        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Data & Account</h3>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('sync')}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                    activeTab === 'sync' 
                                        ? "bg-primary/10 text-primary" 
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <Cloud size={18} weight={activeTab === 'sync' ? "fill" : "regular"} />
                                Sync & Backup
                            </button>
                            <button
                                onClick={() => setActiveTab('system')}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                    activeTab === 'system' 
                                        ? "bg-primary/10 text-primary" 
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <Gear size={18} weight={activeTab === 'system' ? "fill" : "regular"} />
                                System
                            </button>
                        </div>
                    </div>
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-transparent">
                <div className="max-w-4xl mx-auto p-8 pb-20">
                    
                    {/* Appearance Tab */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Palette className="text-primary" size={24} />
                                    Theme & Colors
                                </h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-4 p-5 rounded-lg border border-border bg-card/50">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium">Accent Color</label>
                                        </div>
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
                                    </div>

                                    <div className="space-y-4 p-5 rounded-lg border border-border bg-card/50">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium">Base Theme</label>
                                        </div>
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
                                    <div className="space-y-4 p-5 rounded-lg border border-border bg-card/50">
                                        <label className="text-sm font-medium block mb-3">Sidebar Mode</label>
                                        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border/50">
                                            <button
                                                onClick={() => setSidebarMode('full')}
                                                className={cn(
                                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                                    sidebarMode === 'full' 
                                                        ? "bg-background shadow-sm text-foreground" 
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
                                                        ? "bg-background shadow-sm text-foreground" 
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                <SidebarSimple size={16} weight="duotone" />
                                                Slim
                                            </button>
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
                                                                style={{ backgroundColor: (defaultColors && defaultColors[entity.key]) || "hsl(var(--primary))" }}
                                                            />
                                                            <span className="text-xs font-medium">{entity.label}</span>
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-3">
                                                        <ColorPicker
                                                            color={(defaultColors && defaultColors[entity.key]) || "#000000"}
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
                                    <Monitor className="text-primary" size={24} />
                                    Background
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-6 p-5 rounded-lg border border-border bg-card/50 h-fit">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-medium">Color Overlay</label>
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
                                                <label className="text-sm font-medium">Background Image Opacity</label>
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

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Preview</label>
                                        <div className="relative rounded-lg border border-border overflow-hidden aspect-video shadow-lg bg-background">
                                            {/* Preview Logic */}
                                            {backgroundImageUrl && (
                                                <div 
                                                    className="absolute inset-0 bg-cover bg-center"
                                                    style={{ 
                                                        backgroundImage: `url(${backgroundImageUrl})`,
                                                        opacity: backgroundImageOpacity
                                                    }}
                                                />
                                            )}
                                            <div 
                                                className="absolute inset-0 bg-background"
                                                style={{ opacity: 1 - backgroundOverlayOpacity }}
                                            />
                                            
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
                            </div>
                        </div>
                    )}

                    {/* Sync Tab */}
                    {activeTab === 'sync' && (
                        <SettingsSync />
                    )}

                    {/* Music Tab */}
                    {activeTab === 'music' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <MusicNotes className="text-primary" size={24} />
                                    Ambient Music
                                </h2>
                                <div className="p-5 rounded-lg border border-border bg-card/50 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <MusicNotes size={20} weight="fill" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{ambientMusicName || "No track loaded"}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {!ambientMusicPaused ? "Playing" : "Paused"}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={handleAmbientMusicUpload}>
                                                <UploadSimple className="mr-2" size={14} />
                                                Upload
                                            </Button>
                                            {ambientMusicUrl && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={() => setAmbientMusicPaused(!ambientMusicPaused)}
                                                >
                                                    {!ambientMusicPaused ? <SpeakerHigh size={18} /> : <SpeakerHigh size={18} className="text-muted-foreground" />}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {ambientMusicUrl && (
                                        <div className="space-y-2 pt-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-medium text-muted-foreground">Volume</label>
                                                <span className="text-xs font-mono text-muted-foreground">{(ambientMusicVolume * 100).toFixed(0)}%</span>
                                            </div>
                                            <Slider
                                                value={[ambientMusicVolume]}
                                                min={0}
                                                max={1}
                                                step={0.01}
                                                onValueChange={([v]: number[]) => setAmbientMusicVolume(v)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <FilmStrip className="text-primary" size={24} />
                                    Media Playback
                                </h2>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-medium">Mute new videos until unmuted</label>
                                            <p className="text-xs text-muted-foreground">Requires clicking Unmute Video the first time a video opens.</p>
                                        </div>
                                        <Switch 
                                            checked={muteNewVideosUntilUnmuted}
                                            onCheckedChange={setMuteNewVideosUntilUnmuted}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-medium">Remember media volume</label>
                                            <p className="text-xs text-muted-foreground">Stores volume per video and audio file.</p>
                                        </div>
                                        <Switch 
                                            checked={rememberMediaVolume}
                                            onCheckedChange={setRememberMediaVolume}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-medium">Disable autoplay for new media</label>
                                            <p className="text-xs text-muted-foreground">Applies to videos and audio files when they open.</p>
                                        </div>
                                        <Switch 
                                            checked={disableMediaAutoplay}
                                            onCheckedChange={setDisableMediaAutoplay}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-medium">Use middle frame for previews</label>
                                            <p className="text-xs text-muted-foreground">Generates thumbnails from the middle of videos.</p>
                                        </div>
                                        <Switch 
                                            checked={useMiddleFrameForPreviews}
                                            onCheckedChange={setUseMiddleFrameForPreviews}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <SpeakerHigh className="text-primary" size={24} />
                                    Sound Effects
                                </h2>
                                <div className="p-5 rounded-lg border border-border bg-card/50 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-medium">Enable website sounds</label>
                                            <p className="text-xs text-muted-foreground">Plays sounds for clicks, confirmations, and errors.</p>
                                        </div>
                                        <Switch 
                                            checked={sfxEnabled}
                                            onCheckedChange={setSfxEnabled}
                                        />
                                    </div>

                                    {sfxEnabled && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
                                            {[
                                                { id: 'cursor', label: 'Cursor', icon: Cursor },
                                                { id: 'confirm', label: 'Confirm', icon: Check },
                                                { id: 'error', label: 'Error', icon: X },
                                                { id: 'back', label: 'Back', icon: ArrowLeft },
                                                { id: 'search', label: 'Search', icon: MagnifyingGlass },
                                            ].map((sound) => (
                                                <div key={sound.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <sound.icon className="text-muted-foreground" size={16} />
                                                        <span className="text-sm">{sound.label}</span>
                                                    </div>
                                                    <Switch 
                                                        checked={enabledSounds[sound.id as keyof typeof enabledSounds]}
                                                        onCheckedChange={() => toggleSound(sound.id as any)}
                                                        className="scale-75"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* System Tab */}
                    {activeTab === 'system' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <ArrowCounterClockwise className="text-primary" size={24} />
                                    Updates & Maintenance
                                </h2>
                                <div className="p-5 rounded-lg border border-border bg-card/50 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-medium">Reload Application</label>
                                            <p className="text-xs text-muted-foreground">Reload the app and refresh cached assets.</p>
                                        </div>
                                        <Button variant="outline" onClick={handleReload}>
                                            Reload for updates
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <HardDrives className="text-primary" size={24} />
                                    Data Management
                                </h2>
                                <div className="p-5 rounded-lg border border-border bg-card/50 space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">Local Data</label>
                                        <p className="text-xs text-muted-foreground">Manage and clear local data by category.</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            { id: 'files', label: 'Files', icon: File },
                                            { id: 'collections', label: 'Collections', icon: Folder },
                                            { id: 'highlights', label: 'Highlights', icon: PencilSimple },
                                            { id: 'docs', label: 'Documents', icon: FileText },
                                            { id: 'graphs', label: 'Graphs', icon: Graph },
                                            { id: 'storages', label: 'Storage', icon: HardDrives },
                                        ].map((item) => (
                                            <div key={item.id} className="flex items-center justify-between p-3 rounded-md border border-border bg-background/50">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                        <item.icon size={16} weight="fill" />
                                                    </div>
                                                    <span className="text-sm font-medium">{item.label}</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        setLocalItemToDelete({ id: item.id, label: item.label });
                                                        setDeleteLocalOpen(true);
                                                    }}
                                                >
                                                    <Trash size={16} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-500">
                                    <Trash size={24} weight="fill" />
                                    Danger Zone
                                </h2>
                                <div className="p-5 rounded-lg border border-red-900/20 bg-red-900/5 space-y-4">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium text-red-500">Clear All Data</label>
                                        <p className="text-xs text-muted-foreground">Permanently removes all local data on this device. This action cannot be undone.</p>
                                    </div>
                                    <Button variant="destructive" onClick={handleReset}>
                                        Reset all data
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <DestructiveDeleteDialog 
                open={deleteLocalOpen}
                onOpenChange={setDeleteLocalOpen}
                onConfirm={handleDeleteLocal}
                title={`Clear Local ${localItemToDelete?.label || ""}?`}
                description={`This will permanently delete all local ${localItemToDelete?.label.toLowerCase() || ""} data from this device. Sync data will not be affected.`}
                isDeleting={isDeletingLocal}
            />
        </div>
    );
}


