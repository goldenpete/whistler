import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useRef, useState } from "react";
import { type Timestamp, type File, type Collection } from "@/types";
import { Play, Pause, X, CaretDown, PencilSimple, SpeakerHigh, SpeakerSlash, Repeat, ArrowsOut, ArrowsIn, CornersOut, Gauge } from "@phosphor-icons/react";

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


// --- Clip Player Dialog ---

interface ClipPlayerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    timestamp: Timestamp | null;
    file: File | null;
    collection?: Collection;
    collections?: Collection[];
    onUpdate?: (updates: Partial<Timestamp>) => void;
    onEditTimestamp?: () => void; // Added
}

export function ClipPlayerDialog({ open, onOpenChange, timestamp, file, collection, collections, onUpdate, onEditTimestamp }: ClipPlayerDialogProps) {
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

    const start = timestamp?.start || 0;
    const end = timestamp?.end || 0;
    const duration = end - start;

    useEffect(() => {
        if (open && timestamp) {
            setNote(timestamp.note || "");
        }
    }, [open, timestamp]);

    useEffect(() => {
        if (open && file && timestamp && videoElement) {
            videoElement.currentTime = start;
            videoElement.volume = isMuted ? 0 : volume; // Apply volume
            videoElement.playbackRate = playbackSpeed; // Apply speed
            videoElement.play().catch(e => console.error("Auto-play failed:", e));
            setIsPlaying(true);
        } else {
            setIsPlaying(false);
        }
    }, [open, file, timestamp, start, videoElement]);

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
        if (onUpdate && timestamp && note !== timestamp.note) {
            onUpdate({ note });
        }
    };

    if (!timestamp || !file) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`${isMaximized ? '!w-screen !h-screen !max-w-none !border-none !rounded-none !top-0 !left-0 !translate-x-0 !translate-y-0 !overflow-y-auto' : 'sm:max-w-[800px] border-zinc-800'} bg-black p-0 text-white gap-0 flex flex-col`}>
                <div className={`relative bg-black ${isMaximized ? 'flex-1' : 'aspect-video'} w-full flex items-center justify-center`}>
                    <video
                        ref={setVideoElement}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        src={(file as any).webkitRelativePath || (file as any).url || ""}
                        className="w-full h-full object-contain"
                        onClick={togglePlay}
                        autoPlay
                    />

                    {/* Overlay Controls */}
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-2 z-10">
                        <div className="flex items-center gap-3">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={togglePlay}>
                                {isPlaying ? <Pause weight="fill" /> : <Play weight="fill" />}
                            </Button>

                            {/* Volume Toggle */}
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={toggleMute}>
                                {isMuted ? <SpeakerSlash weight="fill" /> : <SpeakerHigh weight="fill" />}
                            </Button>

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
                                className={`h-8 w-8 hover:bg-white/20 ${isLooping ? 'text-amber-500' : 'text-white/50'}`}
                                onClick={toggleLoop}
                                title={isLooping ? "Loop On" : "Loop Off"}
                            >
                                <Repeat weight="bold" />
                            </Button>

                            {/* Fullscreen Video Toggle */}
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20"
                                onClick={toggleFullscreen}
                                title="Fullscreen Video"
                            >
                                <CornersOut weight="bold" />
                            </Button>
                        </div>
                    </div>

                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center z-20"
                        onClick={() => onOpenChange(false)}
                    >
                        <X weight="bold" size={16} />
                    </Button>
                </div>
                <div className="p-4 bg-zinc-900 border-t border-white/10 flex flex-col gap-2 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                className="text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors"
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
                            <div className="font-bold text-sm tracking-wide uppercase transition-colors" style={{ color: collection?.color || "#f59e0b" }}>
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
                                    if (onEditTimestamp) onEditTimestamp();
                                }}
                                title="Edit Highlight"
                            >
                                <PencilSimple weight="bold" size={14} />
                            </Button>
                        </div>
                    </div>

                    <textarea
                        value={note}
                        onChange={handleNoteChange}
                        onBlur={handleNoteBlur}
                        placeholder="Add a note..."
                        className="w-full bg-transparent border-none text-zinc-200 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-white/20 rounded p-1 -ml-1 placeholder:text-zinc-600"
                        rows={3}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

// --- Edit Highlight Dialog ---

interface EditTimestampDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    timestamp: Timestamp | null;
    collections: Collection[];
    onSave: (updates: Partial<Timestamp>) => void;
    file: File | null;
}

export function EditTimestampDialog({ open, onOpenChange, timestamp, collections, onSave, file }: EditTimestampDialogProps) {
    const [note, setNote] = useState("");
    const [startStr, setStartStr] = useState("");
    const [endStr, setEndStr] = useState("");
    const [collectionId, setCollectionId] = useState<string | null>("null");
    const [highlightText, setHighlightText] = useState("");

    useEffect(() => {
        if (open && timestamp) {
            setNote(timestamp.note || "");
            setCollectionId(timestamp.collectionId || "null");

            if (file?.type === 'pdf') {
                setHighlightText(timestamp.text || "");
                setStartStr("");
                setEndStr("");
            } else {
                setStartStr(formatTime(timestamp.start));
                setEndStr(formatTime(timestamp.end || timestamp.start));
                setHighlightText("");
            }
        }
    }, [open, timestamp, file]);

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
            alert("Invalid time format. Please use MM:SS");
            return;
        }

        if (start > end) {
            alert("Start time cannot be after end time.");
            return;
        }

        onSave({
            note,
            start,
            end,
            collectionId: collectionId === "null" ? null : collectionId
        });
        onOpenChange(false);
    };

    if (!timestamp) return null;

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
                            className="bg-zinc-900 border-zinc-800 focus:border-amber-500/50"
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
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-white/10 text-zinc-400 hover:text-white">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 text-white">
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
