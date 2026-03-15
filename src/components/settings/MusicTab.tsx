/**
 * ─── MusicTab.tsx ──────────────────────────────────────────────────
 *
 * Settings tab for ambient music, media playback options, and
 * sound effect configuration.
 *
 * Extracted from SettingsView.tsx for maintainability.
 *
 * Exports: MusicTab
 * Related: SettingsView, useStore
 * ───────────────────────────────────────────────────────────────────
 */
import { useState, type ChangeEvent } from "react";
import { useStore, ambientMusicStorage, type SoundKey } from "@/store/useStore";
import { cn } from "@/lib/utils";
import {
    SpeakerHigh,
    ArrowCounterClockwise,
    UploadSimple,
    Trash,
    MusicNotes,
    Cursor,
    Check,
    X,
    MagnifyingGlass,
    CaretLeft,
    FilmStrip,
    Gear,
    Question,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useShallow } from "@/lib/zustand-shallow";

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */
export function MusicTab() {
    const {
        setAmbientMusicUrl,
        ambientMusicUrl,
        setAmbientMusicVolume,
        ambientMusicVolume,
        ambientMusicName,
        ambientMusicPaused,
        setAmbientMusicPaused,
        muteNewVideosUntilUnmuted,
        setMuteNewVideosUntilUnmuted,
        muteHighlightsUntilUnmuted,
        setMuteHighlightsUntilUnmuted,
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
        setAmbientMusicStorageKey,
        alwaysShowMuteOverlay,
        setAlwaysShowMuteOverlay,
        replaceSearchWithConfirm,
        setReplaceSearchWithConfirm,
        replaceAllSoundsWithCursor,
        setReplaceAllSoundsWithCursor,
        soundConfigs,
        setSoundConfig,
    } = useStore(useShallow((state) => ({
        setAmbientMusicUrl: state.setAmbientMusicUrl,
        ambientMusicUrl: state.ambientMusicUrl,
        setAmbientMusicVolume: state.setAmbientMusicVolume,
        ambientMusicVolume: state.ambientMusicVolume,
        ambientMusicName: state.ambientMusicName,
        ambientMusicPaused: state.ambientMusicPaused,
        setAmbientMusicPaused: state.setAmbientMusicPaused,
        muteNewVideosUntilUnmuted: state.muteNewVideosUntilUnmuted,
        setMuteNewVideosUntilUnmuted: state.setMuteNewVideosUntilUnmuted,
        muteHighlightsUntilUnmuted: state.muteHighlightsUntilUnmuted,
        setMuteHighlightsUntilUnmuted: state.setMuteHighlightsUntilUnmuted,
        rememberMediaVolume: state.rememberMediaVolume,
        setRememberMediaVolume: state.setRememberMediaVolume,
        disableMediaAutoplay: state.disableMediaAutoplay,
        setDisableMediaAutoplay: state.setDisableMediaAutoplay,
        useMiddleFrameForPreviews: state.useMiddleFrameForPreviews,
        setUseMiddleFrameForPreviews: state.setUseMiddleFrameForPreviews,
        sfxEnabled: state.sfxEnabled,
        setSfxEnabled: state.setSfxEnabled,
        enabledSounds: state.enabledSounds,
        toggleSound: state.toggleSound,
        setAmbientMusicStorageKey: state.setAmbientMusicStorageKey,
        alwaysShowMuteOverlay: state.alwaysShowMuteOverlay,
        setAlwaysShowMuteOverlay: state.setAlwaysShowMuteOverlay,
        replaceSearchWithConfirm: state.replaceSearchWithConfirm,
        setReplaceSearchWithConfirm: state.setReplaceSearchWithConfirm,
        replaceAllSoundsWithCursor: state.replaceAllSoundsWithCursor,
        setReplaceAllSoundsWithCursor: state.setReplaceAllSoundsWithCursor,
        soundConfigs: state.soundConfigs,
        setSoundConfig: state.setSoundConfig,
    })));

    /* ═══════════════════════════════════════════════════════
       AMBIENT MUSIC HANDLERS
       ═══════════════════════════════════════════════════════ */
    const handleAmbientMusicUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    await ambientMusicStorage.save(file);
                    setAmbientMusicStorageKey('current');
                    const url = URL.createObjectURL(file);
                    setAmbientMusicUrl(url, file.name, file.type);
                    setAmbientMusicVolume(0.5);
                    setAmbientMusicPaused(false);
                } catch (err) {
                    console.error("Failed to save ambient music:", err);
                }
            }
        };
        input.click();
    };

    const handleUseDefaultAmbient = () => {
        setAmbientMusicUrl('/sounds/default_ambient.mp3', 'Default: Evolve (Idle)');
        setAmbientMusicVolume(0.5);
        setAmbientMusicPaused(false);
        setAmbientMusicStorageKey('default');
    };

    const handleRemoveAmbient = async () => {
        await ambientMusicStorage.clear();
        setAmbientMusicUrl(null, null);
        setAmbientMusicStorageKey(null);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MusicNotes className="text-primary" size={24} />
                    Ambient Music
                </h2>
                <div className="p-5 rounded-none border border-border bg-card/50 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-none bg-primary/10 flex items-center justify-center text-primary">
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
                            <Button variant="outline" size="sm" onClick={handleUseDefaultAmbient}>
                                Use Default
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleAmbientMusicUpload}>
                                <UploadSimple className="mr-2" size={14} />
                                Upload
                            </Button>
                            {ambientMusicUrl && (
                                <>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={handleRemoveAmbient}
                                        className="text-destructive hover:text-destructive border-destructive/50 hover:border-destructive hover:bg-destructive/10"
                                    >
                                        <Trash className="mr-2" size={14} />
                                        Remove
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => setAmbientMusicPaused(!ambientMusicPaused)}
                                    >
                                        {!ambientMusicPaused ? <SpeakerHigh size={18} /> : <SpeakerHigh size={18} className="text-muted-foreground" />}
                                    </Button>
                                </>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 rounded-none border border-border bg-card/50">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium">Mute new videos until unmuted</label>
                            <p className="text-xs text-muted-foreground">Requires clicking Unmute Video the first time a video opens.</p>
                        </div>
                        <Switch 
                            checked={muteNewVideosUntilUnmuted}
                            onCheckedChange={setMuteNewVideosUntilUnmuted}
                        />
                    </div>
                    <div className={cn("flex items-center justify-between p-4 rounded-none border border-border bg-card/50", !muteNewVideosUntilUnmuted && "opacity-50 pointer-events-none")}>
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium">Always show mute pop-up</label>
                            <p className="text-xs text-muted-foreground">Show the overlay every time a video opens.</p>
                        </div>
                        <Switch 
                            checked={alwaysShowMuteOverlay}
                            onCheckedChange={setAlwaysShowMuteOverlay}
                        />
                    </div>
                    <div className={cn("flex items-center justify-between p-4 rounded-none border border-border bg-card/50", !muteNewVideosUntilUnmuted && "opacity-50 pointer-events-none")}>
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium">Include highlights</label>
                            <p className="text-xs text-muted-foreground">Also mute highlights when they open.</p>
                        </div>
                        <Switch 
                            checked={muteHighlightsUntilUnmuted}
                            onCheckedChange={setMuteHighlightsUntilUnmuted}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-none border border-border bg-card/50">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium">Remember media volume</label>
                            <p className="text-xs text-muted-foreground">Stores volume per video and audio file.</p>
                        </div>
                        <Switch 
                            checked={rememberMediaVolume}
                            onCheckedChange={setRememberMediaVolume}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-none border border-border bg-card/50">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium">Disable autoplay for new media</label>
                            <p className="text-xs text-muted-foreground">Applies to videos and audio files when they open.</p>
                        </div>
                        <Switch 
                            checked={disableMediaAutoplay}
                            onCheckedChange={setDisableMediaAutoplay}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-none border border-border bg-card/50">
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
                <div className="p-5 rounded-none border border-border bg-card/50 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium">Enable website sounds</label>
                            <p className="text-xs text-muted-foreground">Plays sounds for clicks, confirmations, and errors.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                        <Gear size={18} />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="absolute right-10 top-2 text-muted-foreground hover:text-foreground"
                                        onClick={() => {
                                            (['cursor', 'confirm', 'error', 'back', 'search'] as SoundKey[]).forEach((id) => {
                                                setSoundConfig(id, { source: 'preset', value: id });
                                            });
                                        }}
                                        title="Reset all to default"
                                    >
                                        <ArrowCounterClockwise />
                                    </Button>
                                    <DialogHeader>
                                        <DialogTitle>Advanced Sound Settings</DialogTitle>
                                        <DialogDescription>
                                            Customize sound effects by remapping them or uploading your own files.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-4">
                                        {[
                                            { id: 'cursor', label: 'Cursor' },
                                            { id: 'confirm', label: 'Confirm' },
                                            { id: 'error', label: 'Error' },
                                            { id: 'back', label: 'Back' },
                                            { id: 'search', label: 'Search' },
                                        ].map((sound) => {
                                            const soundId = sound.id as SoundKey;
                                            const config = soundConfigs?.[soundId] || { source: 'preset', value: soundId };
                                            const isSearchDisabled = soundId === 'search' && replaceSearchWithConfirm && !replaceAllSoundsWithCursor;
                                            const isAllDisabled = soundId !== 'cursor' && replaceAllSoundsWithCursor;
                                            const isDisabled = isSearchDisabled || isAllDisabled;
                                            
                                            const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (event) => {
                                                        const url = event.target?.result as string;
                                                        setSoundConfig(soundId, {
                                                            source: 'custom',
                                                            value: url,
                                                            name: file.name
                                                        });
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            };

                                            return (
                                                <div key={soundId} className={cn("space-y-2", isDisabled && "opacity-50 pointer-events-none")}>
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-sm font-medium">{sound.label} Sound</label>
                                                        {config.source === 'custom' && (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-6 text-xs text-muted-foreground hover:text-destructive"
                                                                onClick={() => setSoundConfig(soundId, { source: 'preset', value: soundId })}
                                                            >
                                                                Reset to Default
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Select
                                                            value={config.source === 'preset' ? config.value : 'custom'}
                                                            onValueChange={(val: string) => {
                                                                if (val === 'custom') {
                                                                    document.getElementById(`sound-upload-${soundId}`)?.click();
                                                                } else {
                                                                    setSoundConfig(soundId, { source: 'preset', value: val });
                                                                }
                                                            }}
                                                        >
                                                            <SelectTrigger className="flex-1">
                                                                <SelectValue placeholder="Select sound..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="cursor">Cursor</SelectItem>
                                                                <SelectItem value="confirm">Confirm</SelectItem>
                                                                <SelectItem value="error">Error</SelectItem>
                                                                <SelectItem value="back">Back</SelectItem>
                                                                <SelectItem value="search">Search</SelectItem>
                                                                <SelectItem value="custom">
                                                                    {config.source === 'custom' ? (config.name || 'Custom Sound') : 'Upload Custom...'}
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <Input 
                                                            id={`sound-upload-${sound.id}`}
                                                            type="file" 
                                                            accept="audio/*" 
                                                            className="hidden"
                                                            onChange={handleFileChange}
                                                        />
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => document.getElementById(`sound-upload-${sound.id}`)?.click()}
                                                            title="Upload custom sound"
                                                        >
                                                            <UploadSimple size={16} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <Switch 
                                checked={sfxEnabled}
                                onCheckedChange={setSfxEnabled}
                            />
                        </div>
                    </div>

                    {sfxEnabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
                            {[
                                { id: 'cursor', label: 'Cursor', icon: Cursor },
                                { id: 'confirm', label: 'Confirm', icon: Check },
                                { id: 'error', label: 'Error', icon: X },
                                { id: 'back', label: 'Back', icon: CaretLeft },
                                { id: 'search', label: 'Search', icon: MagnifyingGlass },
                            ].map((sound) => (
                                <div key={sound.id} className={cn(
                                    "flex items-center justify-between p-2 rounded-none hover:bg-muted/30 transition-colors",
                                    (sound.id === 'search' && replaceSearchWithConfirm && !replaceAllSoundsWithCursor) && "opacity-50 pointer-events-none",
                                    (replaceAllSoundsWithCursor && sound.id !== 'cursor') && "opacity-50 pointer-events-none"
                                )}>
                                    <div className="flex items-center gap-2">
                                        <sound.icon className="text-muted-foreground" size={16} />
                                        <span className="text-sm">{sound.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {sound.id === 'cursor' && (
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                                                        <Gear size={14} />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-64 p-3" align="end">
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium text-sm leading-none">Sound Settings</h4>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <label className="text-xs text-muted-foreground">Replace all sounds with cursor?</label>
                                                            <Switch 
                                                                checked={replaceAllSoundsWithCursor}
                                                                onCheckedChange={setReplaceAllSoundsWithCursor}
                                                                className="scale-75"
                                                            />
                                                        </div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                        {sound.id === 'confirm' && (
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                                                        <Gear size={14} />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-64 p-3" align="end">
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium text-sm leading-none">Sound Settings</h4>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <label className="text-xs text-muted-foreground">Replace search sound with confirm?</label>
                                                            <Switch 
                                                                checked={replaceSearchWithConfirm}
                                                                onCheckedChange={setReplaceSearchWithConfirm}
                                                                className="scale-75"
                                                            />
                                                        </div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                        <Switch 
                                            checked={enabledSounds[sound.id as keyof typeof enabledSounds]}
                                            onCheckedChange={() => toggleSound(sound.id as SoundKey)}
                                            disabled={(sound.id === 'search' && replaceSearchWithConfirm) || (replaceAllSoundsWithCursor && sound.id !== 'cursor')}
                                            className="scale-75"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
