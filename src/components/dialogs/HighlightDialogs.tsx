import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useRef, useState } from "react";
import { type Highlight, type File, type Collection } from "@/types";
import { Play, Pause, X, CaretDown, PencilSimple, SpeakerHigh, SpeakerSlash, Repeat, ArrowsOut, ArrowsIn, CornersOut, Gauge } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// --- Time Formatting Helper ---
const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const parseTime = (timeStr: string): number | null => {
    const parts = timeStr.split(':');
    if (parts.length !== 2) return null;
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1], 10);
    if (isNaN(mins) || isNaN(secs)) return null;
    return (mins * 60) + secs;
};


// --- Highlight Player Dialog ---

interface HighlightPlayerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    highlight: Highlight | null;
    file: File | null;
    collection?: Collection;
    collections?: Collection[];
    onUpdate?: (updates: Partial<Highlight>) => void;
    onEditHighlight?: () => void; // Added
}

export function HighlightPlayerDialog({ open, onOpenChange, highlight, file, collection, collections, onUpdate, onEditHighlight }: HighlightPlayerDialogProps) {
    // Use a callback ref to handle the video element's lifecycle within the Dialog Portal
    const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [progress, setProgress] = useState(0);
    const [note, setNote] = useState("");

    // New State
    const [isLooping, setIsLooping] = useState(true);
    const [volume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    // Feature State
    const [isMaximized, setIsMaximized] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    const start = highlight?.start || 0;
    const end = highlight?.end || 0;
    const duration = end - start;

    useEffect(() => {
        if (open && highlight) {
            setNote(highlight.note || "");
        }
    }, [open, highlight]);

    useEffect(() => {
        if (open && file && highlight && videoElement) {
            videoElement.currentTime = start;
            videoElement.volume = isMuted ? 0 : volume; // Apply volume
            videoElement.playbackRate = playbackSpeed; // Apply speed
            videoElement.play().catch(e => console.error("Auto-play failed:", e));
            setIsPlaying(true);
        } else {
            setIsPlaying(false);
        }
    }, [open, file, highlight, start, videoElement]);

    useEffect(() => {
        if (!videoElement) return;

        const video = videoElement;

        // Sync volume/mute/speed state whenever it changes
        video.volume = isMuted ? 0 : volume;
        video.playbackRate = playbackSpeed;

        const handleLoadedMetadata = () => {
            if (video.duration && start >= 0) {
                // Immediate seek to start
                video.currentTime = start;
            }
        };

        const handleTimeUpdate = () => {
            const now = video.currentTime;

            // FIX: Strict Loop Logic
            // If we are before the start (by more than 0.5s) or after the end, enforce loop
            if (now < start - 0.5 || now > end) {
                // Only seek back if looping is enabled OR we are before the start
                if (isLooping || now < start - 0.5) {
                    video.currentTime = start;
                } else {
                    // If not looping and we hit the end, just pause
                    video.pause();
                }
            }

            setCurrentTime(Math.max(start, Math.min(now, end))); // Clamp display time

            // Update Progress
            if (duration > 0) {
                const relativeTime = Math.max(0, now - start);
                const pct = Math.min(100, (relativeTime / duration) * 100);
                setProgress(pct);
            } else {
                setProgress(0);
            }
        };

        const handlePlayHeaders = () => setIsPlaying(!video.paused);

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('play', handlePlayHeaders);
        video.addEventListener('pause', handlePlayHeaders);

        // Initial check
        if (video.readyState >= 1) {
            handleLoadedMetadata();
        }
        // Force seek immediately in case metadata is already there or readyState is weird
        if (start > 0) {
            video.currentTime = start;
        }

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('play', handlePlayHeaders);
            video.removeEventListener('pause', handlePlayHeaders);
        };
    }, [videoElement, start, end, duration, isLooping, volume, isMuted, playbackSpeed]); // Added dependencies

    const togglePlay = () => {
        if (videoElement) {
            if (videoElement.paused) videoElement.play();
            else videoElement.pause();
        }
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    const toggleLoop = () => {
        setIsLooping(!isLooping);
    };

    // Cycle speeds: 1 -> 1.5 -> 2 -> 0.5 -> 1
    const toggleSpeed = () => {
        let newSpeed = 1;
        if (playbackSpeed === 1) newSpeed = 1.5;
        else if (playbackSpeed === 1.5) newSpeed = 2;
        else if (playbackSpeed === 2) newSpeed = 0.5;
        else newSpeed = 1;

        setPlaybackSpeed(newSpeed);
    };

    const toggleFullscreen = () => {
        if (videoElement) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                videoElement.requestFullscreen();
            }
        }
    };

    const handleSeek = (vals: number[]) => {
        const pct = vals[0];
        const newTime = start + ((pct / 100) * duration);
        if (videoElement) {
            videoElement.currentTime = newTime;
            setCurrentTime(newTime);
            setProgress(pct);
        }
    };

    const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newNote = e.target.value;
        setNote(newNote);
    };

    const handleNoteBlur = () => {
        if (onUpdate && highlight && note !== highlight.note) {
            onUpdate({ note });
        }
    };

    const renderPlayerControls = (isSidebar: boolean) => (
        <div className={cn(
            isSidebar ? "flex flex-col gap-4 p-4 border-b border-white/10 shrink-0" : "absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-2 z-10"
        )}>
            {isSidebar && (
                <div className="w-full flex flex-col gap-1">
                     <div className="flex justify-between text-xs font-mono text-zinc-400">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(end)}</span>
                    </div>
                    <Slider
                        value={[progress]}
                        min={0}
                        max={100}
                        step={0.1}
                        onValueChange={handleSeek}
                        className="cursor-pointer"
                    />
                </div>
            )}

            <div className={cn("flex items-center gap-3", isSidebar && "justify-between")}>
                 <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={togglePlay}>
                    {isPlaying ? <Pause weight="fill" /> : <Play weight="fill" />}
                </Button>

                {/* Volume Toggle */}
                <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={toggleMute}>
                    {isMuted ? <SpeakerSlash weight="fill" /> : <SpeakerHigh weight="fill" />}
                </Button>

                {!isSidebar && (
                    <>
                        <span className="text-xs font-mono text-zinc-300">{formatTime(currentTime)} / {formatTime(end)}</span>
                        <div className="flex-1">
                            <Slider
                                value={[progress]}
                                min={0}
                                max={100}
                                step={0.1}
                                onValueChange={handleSeek}
                                className="cursor-pointer"
                            />
                        </div>
                    </>
                )}

                {/* Speed Toggle */}
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-auto px-2 text-white/70 hover:text-white hover:bg-white/20 font-mono text-xs"
                    onClick={toggleSpeed}
                    title="Playback Speed"
                >
                    {playbackSpeed}x
                </Button>

                {/* Loop Toggle */}
                <Button
                    size="icon"
                    variant="ghost"
                    className={cn("h-8 w-8 hover:bg-white/20", isLooping ? 'text-primary hover:text-primary/80' : 'text-white/50')}
                    onClick={toggleLoop}
                    title={isLooping ? "Loop On" : "Loop Off"}
                >
                    <Repeat weight="bold" />
                </Button>

                {/* Fullscreen Video Toggle */}
                 {!isSidebar && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20"
                        onClick={toggleFullscreen}
                        title="Fullscreen Video"
                    >
                        <CornersOut weight="bold" />
                    </Button>
                )}
            </div>
        </div>
    );

    if (!highlight || !file) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className={cn(
                    "bg-black p-0 text-white gap-0 flex transition-all duration-300",
                    isMaximized 
                        ? "!w-screen !h-screen !max-w-none !max-h-screen !border-none !rounded-none !top-0 !left-0 !translate-x-0 !translate-y-0 !overflow-hidden flex-row" 
                        : "sm:max-w-[800px] border-zinc-800 flex-col"
                )}
            >
                <div className={cn("relative bg-black flex items-center justify-center group", isMaximized ? "flex-1 h-full" : "aspect-video w-full")}>
                    <video
                        ref={setVideoElement}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        src={(file as any).webkitRelativePath || (file as any).url || ""}
                        className="w-full h-full object-contain"
                        onClick={togglePlay}
                        autoPlay
                    />

                    {/* Overlay Controls */}
                    {!isMaximized && renderPlayerControls(false)}

                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center z-20"
                        onClick={() => onOpenChange(false)}
                    >
                        <X weight="bold" size={16} />
                    </Button>
                </div>
                
                <div className={cn(
                    "bg-zinc-900 flex flex-col gap-2 shrink-0 transition-all", 
                    isMaximized 
                        ? "w-80 h-full border-l border-zinc-800" 
                        : "w-full border-t border-white/10 p-4"
                )}>
                    {isMaximized && renderPlayerControls(true)}

                    <div className={cn("flex items-center justify-between", isMaximized && "px-4 pt-2")}>
                        <div className="flex items-center gap-3">
                            <button
                                className="text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors"
                                onClick={() => {
                                    if (videoElement) {
                                        videoElement.currentTime = start;
                                        videoElement.play();
                                    }
                                }}
                            >
                                {formatTime(start)} - {formatTime(end)}
                            </button>

                            {/* Collection Display (Static) */}
                            <div
                                className="font-bold text-sm tracking-wide uppercase transition-colors"
                                style={{ 
                                    color: collection?.color 
                                        ? (['#facc15', '#fde047', '#bef264', '#86efac'].includes(collection.color) 
                                            ? 'hsl(var(--primary))' // Fallback for very bright colors if needed, or maybe just let it be? 
                                            // The user said "overly bright highlight colors". 
                                            // Let's use a filter to dim it if we can, or just opacity.
                                            : collection.color) 
                                        : 'hsl(var(--primary))',
                                    filter: 'brightness(0.9)' // Slightly dim
                                }}
                            >
                                {collection?.name || "Uncategorized"}
                            </div>
                        </div>

                        {/* Edit & Maximize Triggers (Far Right) */}
                        <div className="flex items-center gap-2">
                            {/* Maximize Toggle */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-zinc-400 hover:text-white"
                                onClick={() => setIsMaximized(!isMaximized)}
                                title={isMaximized ? "Restore" : "Maximize"}
                            >
                                {isMaximized ? <ArrowsIn weight="bold" size={14} /> : <ArrowsOut weight="bold" size={14} />}
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-zinc-400 hover:text-white"
                                onClick={() => {
                                    if (onEditHighlight) onEditHighlight();
                                }}
                                title="Edit Highlight"
                            >
                                <PencilSimple weight="bold" size={14} />
                            </Button>
                        </div>
                    </div>

                    <div className={cn("flex-1", isMaximized && "px-4 pb-4")}>
                         <textarea
                            value={note}
                            onChange={handleNoteChange}
                            onBlur={handleNoteBlur}
                            placeholder="Add a note..."
                            className="w-full h-full bg-transparent border-none text-zinc-200 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-white/20 rounded p-1 -ml-1 placeholder:text-zinc-600"
                            rows={isMaximized ? undefined : 3}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// --- Edit Highlight Dialog ---

interface EditHighlightDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    highlight: Highlight | null;
    collections: Collection[];
    onSave: (updates: Partial<Highlight>) => void;
    file: File | null;
}

export function EditHighlightDialog({ open, onOpenChange, highlight, collections, onSave, file }: EditHighlightDialogProps) {
    const [note, setNote] = useState("");
    const [startStr, setStartStr] = useState("");
    const [endStr, setEndStr] = useState("");
    const [collectionId, setCollectionId] = useState<string | null>("null");
    const [highlightText, setHighlightText] = useState("");
    const [timeError, setTimeError] = useState<string | null>(null);

    useEffect(() => {
        if (open && highlight) {
            setNote(highlight.note || "");
            setCollectionId(highlight.collectionId || "null");

            if (file?.type === 'pdf') {
                setHighlightText(highlight.text || "");
                setStartStr("");
                setEndStr("");
            } else {
                setStartStr(formatTime(highlight.start));
                setEndStr(formatTime(highlight.end || highlight.start));
                setHighlightText("");
            }
        }
    }, [open, highlight, file]);

    const handleSave = () => {
        if (file?.type === 'pdf') {
            onSave({
                note,
                collectionId: collectionId === "null" ? null : collectionId
            });
            onOpenChange(false);
            return;
        }

        const start = parseTime(startStr);
        const end = parseTime(endStr);

        if (start === null || end === null) {
            setTimeError("Invalid time format. Please use MM:SS");
            return;
        }

        if (start > end) {
            setTimeError("Start time cannot be after end time.");
            return;
        }

        setTimeError(null);

        onSave({
            note,
            start,
            end,
            collectionId: collectionId === "null" ? null : collectionId
        });
        onOpenChange(false);
    };

    if (!highlight) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Edit Highlight</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Note</Label>
                                <Input
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="bg-zinc-900 border-zinc-800 focus:border-primary/50"
                                />
                    </div>
                    {file?.type === 'pdf' ? (
                        <div className="grid gap-2">
                            <Label>Selected Text</Label>
                            <div className="w-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 rounded px-2 py-1.5 whitespace-pre-wrap max-h-40 overflow-auto">
                                {highlightText}
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Start</Label>
                                    <Input
                                        value={startStr}
                                        onChange={(e) => setStartStr(e.target.value)}
                                        className="bg-zinc-900 border-zinc-800 font-mono text-center"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>End</Label>
                                    <Input
                                        value={endStr}
                                        onChange={(e) => setEndStr(e.target.value)}
                                        className="bg-zinc-900 border-zinc-800 font-mono text-center"
                                    />
                                </div>
                            </div>
                            {timeError && (
                                <p className="text-xs text-red-400">
                                    {timeError}
                                </p>
                            )}
                        </div>
                    )}
                    <div className="grid gap-2">
                        <Label>Collection</Label>
                        <Select value={collectionId || "null"} onValueChange={setCollectionId}>
                            <SelectTrigger className="bg-zinc-900 border-zinc-800">
                                <SelectValue placeholder="Select collection" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                <SelectItem value="null">None</SelectItem>
                                {collections.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                                            {c.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="hover:bg-white/10 text-zinc-400 hover:text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
