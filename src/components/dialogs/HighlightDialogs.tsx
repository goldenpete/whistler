import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { type Highlight, type File, type Collection } from "@/types";
import { Play, Pause, X, PencilSimple, SpeakerHigh, SpeakerX, Repeat, CornersOut, Minus, Plus, SidebarSimple, CornersIn, GridFour, FloppyDisk, ArrowSquareOut, FilePdf, EyeSlash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PDFPlayer } from "@/components/player/PDFPlayer";

// --- Time Helper ---
const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const parseTime = (timeStr: string) => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
        const mins = parseInt(parts[0], 10);
        const secs = parseInt(parts[1], 10);
        if (!isNaN(mins) && !isNaN(secs)) {
            return mins * 60 + secs;
        }
    }
    return null;
};

const ExpandableNote = ({ text }: { text: string }) => {
    const [expanded, setExpanded] = useState(false);
    const limit = 150;

    if (!text) return <span className="text-muted-foreground/50 italic text-xs">No note</span>;
    if (text.length <= limit) return <>{text}</>;

    return (
        <span>
            {expanded ? text : `${text.slice(0, limit)}...`}
            <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    setExpanded(!expanded); 
                }} 
                className="text-primary text-xs ml-1 hover:underline font-medium"
            >
                {expanded ? "Show less" : "Show more"}
            </button>
        </span>
    );
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
    onEditHighlight?: () => void;
}

export function HighlightPlayerDialog({ open, onOpenChange, highlight, file, collection, collections, onUpdate, onEditHighlight }: HighlightPlayerDialogProps) {
    const navigate = useNavigate();
    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isLooping, setIsLooping] = useState(true);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Edit State
    const [editNote, setEditNote] = useState("");
    const [editCollectionId, setEditCollectionId] = useState("");
    const [editStart, setEditStart] = useState("");
    const [editEnd, setEditEnd] = useState("");
    const [hasChanges, setHasChanges] = useState(false);

    const start = highlight?.start || 0;
    const end = highlight?.end || 0;
    const segmentDuration = end - start;

    // Sync Edit State
    useEffect(() => {
        if (highlight) {
            setEditNote(highlight.note || "");
            setEditCollectionId(highlight.collectionId || "");
            setEditStart(formatTime(highlight.start));
            setEditEnd(formatTime(highlight.end || highlight.start));
            setHasChanges(false);
        }
    }, [highlight]);

    // Detect Changes
    useEffect(() => {
        if (!highlight || !file) return;
        
        const isPdf = file.name.toLowerCase().endsWith('.pdf');
        const startSecs = parseTime(editStart);
        const endSecs = parseTime(editEnd);
        
        const isValidTime = isPdf || (startSecs !== null && endSecs !== null && startSecs >= 0 && endSecs > startSecs);

        const isChanged = 
            isValidTime && (
                editNote !== (highlight.note || "") ||
                editCollectionId !== (highlight.collectionId || "") ||
                (!isPdf && (
                    (startSecs !== highlight.start) ||
                    (endSecs !== (highlight.end || highlight.start))
                ))
            );
            
        setHasChanges(isChanged);
    }, [editNote, editCollectionId, editStart, editEnd, highlight, file]);

    const handleSave = () => {
        if (!onUpdate || !highlight) return;
        
        const updates: Partial<Highlight> = {};
        
        if (editNote !== highlight.note) updates.note = editNote;
        if (editCollectionId !== highlight.collectionId) updates.collectionId = editCollectionId;
        
        if (!file?.name.toLowerCase().endsWith('.pdf')) {
            const startSecs = parseTime(editStart);
            const endSecs = parseTime(editEnd);
            
            if (startSecs !== null && startSecs !== highlight.start) updates.start = startSecs;
            if (endSecs !== null && endSecs !== highlight.end) updates.end = endSecs;
        }
        
        onUpdate(updates);
        setHasChanges(false);
    };

    // Initialization Effect
    useEffect(() => {
        if (open && file && highlight && videoRef.current) {
            const video = videoRef.current;
            // eslint-disable-next-line react-hooks/immutability
            video.currentTime = start;
            video.play().catch(e => console.error("Auto-play failed:", e));
            setIsPlaying(true);
        } else {
            setIsPlaying(false);
        }
    }, [open, file, highlight, start]);

    // Volume Sync
    useEffect(() => {
        if (videoRef.current) {
            // eslint-disable-next-line react-hooks/immutability
            videoRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    // Speed Sync
    useEffect(() => {
        if (videoRef.current) {
            // eslint-disable-next-line react-hooks/immutability
            videoRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed]);

    // Controls Visibility
    useEffect(() => {
        const handleMouseMove = () => {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = setTimeout(() => {
                if (isPlaying) setShowControls(false);
            }, 3000);
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('mousemove', handleMouseMove);
        }

        return () => {
            if (container) container.removeEventListener('mousemove', handleMouseMove);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [isPlaying]);

    // Time Update & Loop Logic
    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const now = video.currentTime;

        // Loop Logic
        if (now < start - 0.5 || now > end) {
            if (isLooping || now < start - 0.5) {
                video.currentTime = start;
            } else {
                video.pause();
                setIsPlaying(false);
            }
        }

        setCurrentTime(Math.max(start, Math.min(now, end)));
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
                setIsPlaying(true);
            } else {
                videoRef.current.pause();
                setIsPlaying(false);
            }
        }
    };

    const handleSeek = (vals: number[]) => {
        const pct = vals[0];
        const newTime = start + ((pct / 100) * segmentDuration);
        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
            setIsFullscreen(false);
        } else {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        }
    };

    const togglePip = async () => {
        if (!videoRef.current) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (e) {
            console.error("PiP failed:", e);
        }
    };

    const progress = segmentDuration > 0 
        ? Math.min(100, Math.max(0, ((currentTime - start) / segmentDuration) * 100))
        : 0;

    if (!highlight || !file) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className="!w-screen !h-screen !max-w-none !max-h-screen !border-none !rounded-none !p-0 overflow-hidden bg-black text-white outline-none !duration-200 data-[state=open]:!slide-in-from-bottom-10 data-[state=closed]:!slide-out-to-bottom-10"
                showCloseButton={false}
            >
                <DialogDescription className="sr-only">
                    Media player for {file.name}
                </DialogDescription>
                <div ref={containerRef} className="flex h-full w-full bg-black overflow-hidden relative group/container">
                    
                    {/* Player Area */}
                    <div className="flex-1 flex flex-col relative min-w-0 bg-black">
                        
                        {/* Top Bar (Title + Close) */}
                        <div className={cn(
                            "absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 via-black/40 to-transparent transition-all duration-200 ease-out",
                            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                        )}>
                            <DialogTitle className="text-white font-medium text-base truncate px-2">{file.name}</DialogTitle>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => onOpenChange(false)} 
                                className="text-white/70 hover:text-white hover:bg-white/10"
                            >
                                <X weight="bold" size={24} />
                            </Button>
                        </div>

                        {/* Video Stage */}
                        <div 
                            className="flex-1 flex items-center justify-center relative overflow-hidden cursor-pointer"
                            onClick={file.name.toLowerCase().endsWith('.pdf') ? undefined : togglePlay}
                        >
                            {file.name.toLowerCase().endsWith('.pdf') ? (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-950">
                                    {file.url ? (
                                        <PDFPlayer
                                            key={file.id} // Force new instance for each file to prevent state carry-over
                                            url={file.url}
                                            fileId={file.id}
                                            highlightId={highlight.id}
                                            initialPage={highlight.start}
                                            // We don't lock page so user can see context, but we start at highlight
                                            readonly={true} 
                                            onPageChange={() => {}} 
                                            onSelectionChange={() => {}}
                                            className="w-full h-full"
                                            showSidebarToggle={false}
                                            showControls={showControls}
                                            onHideControls={() => setShowControls(false)}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                                            <FilePdf size={32} />
                                            <span className="text-sm">PDF URL missing</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <video
                                    ref={videoRef}
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    src={(file as any).webkitRelativePath || (file as any).url || ""}
                                    className="max-w-full max-h-full object-contain focus:outline-none"
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    onTimeUpdate={handleTimeUpdate}
                                    autoPlay
                                />
                            )}
                        </div>

                        {/* Bottom Bar (Controls) */}
                        <div className={cn(
                            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent transition-all duration-200 ease-out z-50 pb-4 pt-8 px-4",
                            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                        )}>
                            {/* Seekbar - Video Only */}
                            {!file.name.toLowerCase().endsWith('.pdf') && (
                                <div className="mb-4 px-2 group/seek relative">
                                    <Slider
                                        value={[progress]}
                                        min={0}
                                        max={100}
                                        step={0.1}
                                        onValueChange={handleSeek}
                                        className="cursor-pointer"
                                        fillColor={collection?.color}
                                    />
                                </div>
                            )}

                            {/* Controls Row */}
                            <div className="flex items-center justify-between px-2">
                                {/* Left: Play/Pause, Volume - Video Only */}
                                {file.name.toLowerCase().endsWith('.pdf') ? (
                                    <div className="flex items-center gap-2 text-sm text-white/70 font-medium max-w-[400px]">
                                        <FilePdf size={18} weight="fill" className="text-red-400 shrink-0" />
                                        <span className="truncate">"{highlight.text || 'PDF View'}"</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                            className="h-8 w-8 rounded-md bg-white/10 hover:bg-white/20 text-white"
                                        >
                                            {isPlaying ? <Pause weight="fill" size={18} /> : <Play weight="fill" size={18} />}
                                        </Button>

                                        <div className="flex items-center gap-2 group/vol">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                                                className="text-zinc-400 hover:text-white"
                                            >
                                                {isMuted ? <SpeakerX weight="bold" size={20} /> : <SpeakerHigh weight="bold" size={20} />}
                                            </Button>
                                            <div className="w-24 opacity-0 group-hover/vol:opacity-100 transition-opacity duration-200">
                                                <Slider
                                                    value={[isMuted ? 0 : volume]}
                                                    max={1}
                                                    step={0.05}
                                                    onValueChange={(val) => setVolume(val[0])}
                                                    fillColor="white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Center: Time Display - Video Only */}
                                {!file.name.toLowerCase().endsWith('.pdf') && (
                                    <div className="absolute left-1/2 -translate-x-1/2 font-mono text-sm font-medium text-white/90 tracking-wide pointer-events-none transition-all duration-150 ease-out" style={{ left: isSidebarOpen ? 'calc(50% - 10rem)' : '50%' }}>
                                        {formatTime(currentTime - start)} <span className="text-white/40 mx-2">/</span> {formatTime(segmentDuration)}
                                    </div>
                                )}

                                {/* Right: Speed, Loop, Sidebar Toggle, Fullscreen */}
                                <div className="flex items-center gap-3">
                                    {!file.name.toLowerCase().endsWith('.pdf') && (
                                        <>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={(e) => { e.stopPropagation(); setIsLooping(!isLooping); }}
                                                className={cn("text-muted-foreground hover:text-foreground", isLooping && "text-primary hover:text-primary/80")}
                                                title={isLooping ? "Loop On" : "Loop Off"}
                                            >
                                                <Repeat weight="bold" size={20} />
                                            </Button>

                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-muted-foreground hover:text-foreground font-mono text-xs w-16"
                                                    >
                                                        {playbackSpeed}x
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-64 bg-popover border-border p-4" side="top">
                                                    <div className="flex flex-col gap-4">
                                                        <div className="flex items-center justify-between text-foreground font-mono text-xl font-medium border-b border-border pb-2">
                                                            <span>{playbackSpeed.toFixed(2)}x</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setPlaybackSpeed(Math.max(0.25, playbackSpeed - 0.05))}>
                                                                <Minus weight="bold" />
                                                            </Button>
                                                            <Slider
                                                                value={[playbackSpeed]}
                                                                min={0.25}
                                                                max={8}
                                                                step={0.05}
                                                                onValueChange={(val) => setPlaybackSpeed(val[0])}
                                                                className="flex-1"
                                                            />
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setPlaybackSpeed(Math.min(8, playbackSpeed + 0.05))}>
                                                                <Plus weight="bold" />
                                                            </Button>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 8.0].map((rate) => (
                                                                <button
                                                                    key={rate}
                                                                    onClick={() => setPlaybackSpeed(rate)}
                                                                    className={cn(
                                                                        "px-2 py-1.5 rounded text-xs font-medium transition-colors border",
                                                                        playbackSpeed === rate
                                                                            ? "bg-primary/10 text-primary border-primary/50"
                                                                            : "bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary hover:text-foreground"
                                                                    )}
                                                                >
                                                                    {rate}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>

                                            <Button variant="ghost" size="icon" onClick={togglePip} className="text-muted-foreground hover:text-foreground" title="Picture in Picture">
                                                <GridFour weight="bold" size={20} />
                                            </Button>

                                            <div className="w-px h-5 bg-white/20 mx-1" />
                                        </>
                                    )}

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); setShowControls(false); }}
                                        className="text-muted-foreground hover:text-foreground"
                                        title="Hide Controls"
                                    >
                                        <EyeSlash weight="bold" size={20} />
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}
                                        className={cn(
                                            "text-muted-foreground hover:text-foreground",
                                            isSidebarOpen && "text-primary hover:text-primary"
                                        )}
                                    >
                                        <SidebarSimple weight="bold" size={20} />
                                    </Button>
                                    
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} 
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        {isFullscreen ? <CornersIn weight="bold" size={20} /> : <CornersOut weight="bold" size={20} />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <AnimatePresence>
                        {isSidebarOpen && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 320, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="h-full bg-background border-l border-border flex flex-col shrink-0 overflow-hidden w-80 shadow-2xl text-foreground z-40"
                            >
                                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20 w-80">
                                    <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Highlight Details</h3>
                                    <div className="flex items-center gap-2">
                                        <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            onOpenChange(false);
                                            navigate(`/file/${file.id}`);
                                        }}
                                        className="h-7 gap-2 text-muted-foreground hover:text-foreground px-2"
                                        title="View Original File"
                                    >
                                        <ArrowSquareOut weight="bold" size={16} />
                                        <span className="text-xs font-medium">View Original</span>
                                    </Button>
                                        {hasChanges && (
                                            <Button 
                                                size="sm" 
                                                onClick={handleSave}
                                                className="h-7 px-3 text-xs gap-1.5"
                                            >
                                                <FloppyDisk weight="bold" />
                                                Save
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex-1 p-4 overflow-y-auto">
                                    <div className="flex flex-col gap-6">
                                        {/* Collection */}
                                        <div className="flex flex-col gap-2">
                                            <Label className="text-xs font-mono text-muted-foreground uppercase">Collection</Label>
                                            <Select value={editCollectionId} onValueChange={setEditCollectionId}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select collection" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {collections?.map(c => (
                                                        <SelectItem key={c.id} value={c.id}>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                                                                {c.name}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Time Range or Highlighted Text */}
                                        {file.name.toLowerCase().endsWith('.pdf') ? (
                                            <div className="flex flex-col gap-2">
                                                <Label className="text-xs font-mono text-muted-foreground uppercase">Highlighted Text</Label>
                                                <div className="p-3 bg-muted/30 rounded-md text-sm text-muted-foreground italic border border-border/50 max-h-[150px] overflow-y-auto">
                                                    "{highlight.text || 'No text selected'}"
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                <Label className="text-xs font-mono text-muted-foreground uppercase">Time Range</Label>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                        <Input 
                                                            value={editStart} 
                                                            onChange={(e) => setEditStart(e.target.value)}
                                                            className="font-mono text-center"
                                                            placeholder="MM:SS"
                                                        />
                                                    </div>
                                                    <span className="text-muted-foreground">-</span>
                                                    <div className="flex-1">
                                                        <Input 
                                                            value={editEnd} 
                                                            onChange={(e) => setEditEnd(e.target.value)}
                                                            className="font-mono text-center"
                                                            placeholder="MM:SS"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Note */}
                                        <div className="flex flex-col gap-2 flex-1">
                                            <Label className="text-xs font-mono text-muted-foreground uppercase">Note</Label>
                                            <Textarea 
                                                value={editNote} 
                                                onChange={(e) => setEditNote(e.target.value)} 
                                                placeholder="Add a note..."
                                                className="min-h-[200px] resize-none flex-1 font-normal leading-relaxed"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

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
    file: File | null;
    collections?: Collection[];
    onSave: (updates: Partial<Highlight>) => void;
}

export function EditHighlightDialog({ open, onOpenChange, highlight, file, collections, onSave }: EditHighlightDialogProps) {
    const [note, setNote] = useState("");
    const [collectionId, setCollectionId] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    
    useEffect(() => {
        if (open && highlight) {
            setNote(highlight.note || "");
            setCollectionId(highlight.collectionId || "");
            setStartTime(formatTime(highlight.start));
            setEndTime(formatTime(highlight.end || highlight.start));
        }
    }, [open, highlight]);

    const handleSave = () => {
        const startSecs = parseTime(startTime);
        const endSecs = parseTime(endTime);

        if (startSecs === null || endSecs === null || startSecs < 0 || endSecs <= startSecs) {
            // For PDF (text highlight), time might not be editable or relevant in the same way,
            // but we keep the validation for now if we use start/end.
            // If it's a PDF, we might not change start/end here.
        }

        const updates: Partial<Highlight> = {
            note,
            collectionId,
        };

        // Only update time if not PDF or if user edited it?
        // Actually, for PDF, we probably don't want to edit start/end via text inputs.
        // But the dialog is generic.
        // Let's rely on the conditional UI.
        
        if (!file?.name.toLowerCase().endsWith('.pdf')) {
             if (startSecs !== null && endSecs !== null && startSecs >= 0 && endSecs > startSecs) {
                updates.start = startSecs;
                updates.end = endSecs;
             }
        }

        onSave(updates);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Highlight</DialogTitle>
                    <DialogDescription>
                        Make changes to your highlight here.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Collection</Label>
                        <Select value={collectionId} onValueChange={setCollectionId}>
                             <SelectTrigger>
                                <SelectValue placeholder="Select collection" />
                            </SelectTrigger>
                            <SelectContent>
                                {collections?.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                                            {c.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {file?.name.toLowerCase().endsWith('.pdf') ? (
                         <div className="grid gap-2">
                            <Label>Highlighted Text</Label>
                            <div className="p-3 bg-muted/30 rounded-md text-sm text-muted-foreground italic border border-border/50 max-h-[150px] overflow-y-auto">
                                "{highlight?.text || 'No text selected'}"
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Start Time</Label>
                                <Input 
                                    value={startTime} 
                                    onChange={(e) => setStartTime(e.target.value)}
                                    placeholder="MM:SS"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>End Time</Label>
                                <Input 
                                    value={endTime} 
                                    onChange={(e) => setEndTime(e.target.value)}
                                    placeholder="MM:SS"
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label>Note</Label>
                        <Textarea 
                            value={note} 
                            onChange={(e) => setNote(e.target.value)} 
                            placeholder="Add a note..."
                            className="h-32 resize-none"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
