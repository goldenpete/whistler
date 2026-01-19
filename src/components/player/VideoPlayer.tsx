import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    X,
    ArrowSquareOut,
    Copy,
    ShareNetwork,
    PencilSimple,
    Trash,
    SidebarSimple,
    CornersIn,
    CornersOut,
    Play,
    Pause,
    SpeakerHigh,
    SpeakerX,
    FilmStrip,
    FilePdf,
    FolderPlus,
    Palette,
    Plus,
    Minus,
    Repeat,
    Gauge,
    ArrowsOutSimple,
    GridFour,
    CircleNotch
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { PDFPlayer } from './PDFPlayer';
import type { PDFPlayerHandle } from './PDFPlayer';
import { SeekPreview } from './SeekPreview';

import { EditFileDialog } from "@/components/dialogs/FileDialogs";
import { HighlightPlayerDialog, EditHighlightDialog } from "@/components/dialogs/HighlightDialogs";
import { MoveFileDialog } from "@/components/dialogs/MoveFileDialog";
import { type Highlight } from "@/types";

export default function VideoPlayer() {
    const { fileId } = useParams<{ fileId: string }>();
    const navigate = useNavigate();
    const { files, highlights, collections, addVideoHighlight, removeHighlight, updateHighlight, updateFile, activeCollectionId, activeProjectId, setPipFile, togglePip, isPipOpen, pipFileId, fileProgress, setFileProgress, isSidebarOpen: sidebarOpen, toggleSidebar: setSidebarOpen } = useStore();
    const videoRef = useRef<HTMLVideoElement>(null);
    const pdfRef = useRef<PDFPlayerHandle>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [editOpen, setEditOpen] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [enableSidebarAnimation, setEnableSidebarAnimation] = useState(false);
    const [hasPdfSelection, setHasPdfSelection] = useState(false);

    useEffect(() => {
        // Enable sidebar animation after initial render
        const timer = setTimeout(() => setEnableSidebarAnimation(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Highlight Dialog State
    const [editHighlightOpen, setEditHighlightOpen] = useState(false);
    const [highlightPlayerOpen, setHighlightPlayerOpen] = useState(false);
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [returnToHighlightPlayer, setReturnToHighlightPlayer] = useState(false);
    const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);

    // Seek Preview State
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverX, setHoverX] = useState(0);
    const progressRef = useRef<HTMLDivElement>(null);

    const selectedHighlight = highlights.find(t => t.id === selectedHighlightId) || null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const file = files.find((f: any) => f.id === fileId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileHighlights = highlights.filter((t: Highlight) => t.fileId === fileId);

    const handleCreateHighlight = (time: number) => {
        addVideoHighlight(fileId!, time, activeCollectionId || undefined);
    };

    if (!file) {
        return <div className="p-10 text-center text-muted-foreground">Loading file...</div>;
    }

    const isMediaFile = file.type === 'video' || file.type === 'audio';

    // Controls visibility timer
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

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

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            if (container) container.removeEventListener('mousemove', handleMouseMove);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [isPlaying]);

    useEffect(() => {
        if (highlightPlayerOpen && videoRef.current) {
            videoRef.current.pause();
        }
    }, [highlightPlayerOpen]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume;
            videoRef.current.muted = isMuted;
        }
    }, [volume, isMuted]);

    if (!file) {
        return <div className="flex items-center justify-center h-full text-muted-foreground">File not found</div>;
    }

    const togglePlay = () => {
        if (!isMediaFile) return;
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
            } else {
                videoRef.current.pause();
            }
        }
    };

    const [isCollectionMode, setIsCollectionMode] = useState(false);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const time = videoRef.current.currentTime;
            setCurrentTime(time);

            // Collection Mode Logic
            if (isCollectionMode && isPlaying) {
                const relevantHighlights = activeCollectionId
                    ? fileHighlights.filter((t: Highlight) => t.collectionId === activeCollectionId)
                    : fileHighlights;

                if (relevantHighlights.length > 0) {
                    const sorted = [...relevantHighlights].sort((a: Highlight, b: Highlight) => a.start - b.start);

                    // Check if we are inside a segment
                    const currentSegment = sorted.find((t: Highlight) => time >= t.start && time <= (t.end || t.start + 5));

                    if (!currentSegment) {
                        // Not in a segment, find next one
                        const nextSegment = sorted.find((t: Highlight) => t.start > time);
                        if (nextSegment) {
                            videoRef.current.currentTime = nextSegment.start;
                        } else {
                            // End of all segments
                            if (isLooping) {
                                videoRef.current.currentTime = sorted[0].start;
                            } else {
                                videoRef.current.pause();
                            }
                        }
                    }
                }
            }

            // Save progress every 2 seconds roughly
            if (file && Math.abs(time - (fileProgress[file.id] || 0)) > 2) {
                setFileProgress(file.id, time);
            }
        }
    };

    // ... existing ...



    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            // Restore progress
            if (file && fileProgress[file.id]) {
                videoRef.current.currentTime = fileProgress[file.id];
            }
        }
    };

    const handleClose = () => {
        navigate(-1);
    };

    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            containerRef.current?.requestFullscreen();
        }
    };

    const handleCopyUrl = () => {
        if (file.url) navigator.clipboard.writeText(file.url);
    };

    const seekToHighlight = (time: number) => {
        if (file?.type === 'pdf') {
            pdfRef.current?.jumpToPage(time);
        } else if (videoRef.current) {
            videoRef.current.currentTime = time;
            videoRef.current.play();
        }
    };

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSeek = (value: number[]) => {
        const time = value[0];
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            // Immediate update to UI state to prevent jumping
            setCurrentTime(time);
        }
    };

    const handleTogglePip = () => {
        if (file) {
            if (videoRef.current) {
                setFileProgress(file.id, videoRef.current.currentTime);
            }
            setPipFile(file.id);
            navigate(-1);
        }
    };

    const handleOpenLink = () => {
        if (file.url) window.open(file.url, '_blank');
    };

    const handleShare = async () => {
        if (navigator.share && file.url) {
            try {
                await navigator.share({
                    title: file.name,
                    url: file.url
                });
            } catch (err) {
                console.error('Share failed', err);
            }
        } else {
            handleCopyUrl();
        }
    };

    const handleAddHighlight = () => {
        if (!fileId) return;

        if (file.type === 'pdf') {
            pdfRef.current?.addHighlightFromSelection();
            return;
        }

        addVideoHighlight(fileId, currentTime, activeCollectionId || undefined);
    };

    const handleSeekHover = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || !file || (file.type !== 'video' && file.type !== 'audio')) return;

        const rect = progressRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const time = percentage * duration;

        setHoverTime(time);
        setHoverX(x);
    };

    return (
        <div ref={containerRef} className="flex h-full w-full bg-black overflow-hidden relative">

            {/* Player Container (Top Bar + Stage + Bottom Bar) */}
            <motion.div
                key={fileId}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col relative min-w-0 group"
            >

                {/* Top Bar */}
                <div className={cn(
                    "absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 via-black/40 to-transparent transition-opacity duration-300",
                    showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                )}>
                    {/* Left: Info */}
                    <div className="flex items-center gap-4 min-w-0 flex-1 mr-4">
                        {file.type === 'pdf' ? (
                            <FilePdf className="text-muted-foreground shrink-0" size={24} weight="bold" />
                        ) : (
                            <FilmStrip className="text-muted-foreground shrink-0" size={24} weight="bold" />
                        )}
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 group/edit cursor-pointer" onClick={() => setEditOpen(true)}>
                                <h1 className="text-white font-medium text-base truncate">{file.name}</h1>
                                <PencilSimple className="text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity" size={14} weight="bold" />
                            </div>
                            <div className="flex items-center gap-2 group/desc cursor-pointer" onClick={() => setEditOpen(true)}>
                                <span className="text-muted-foreground text-xs truncate">{file.description || "Click to add description..."}</span>
                                <PencilSimple className="text-muted-foreground opacity-0 group-hover/desc:opacity-100 transition-opacity" size={12} weight="bold" />
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/10" title="Open Link" onClick={handleOpenLink}>
                                <ArrowSquareOut size={20} weight="bold" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/10" title="Copy URL" onClick={handleCopyUrl}>
                                <Copy size={20} weight="bold" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/10" title="Share" onClick={handleShare}>
                                <ShareNetwork size={20} weight="bold" />
                            </Button>
                        </div>

                        <div className="w-px h-6 bg-white/20 mx-1" /> {/* Divider */}

                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/10" title="Move to Folder" onClick={() => setMoveDialogOpen(true)}>
                                <FolderPlus size={20} weight="bold" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/10" title="Change Color">
                                        <Palette size={20} weight="bold" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Color feature coming soon</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            File color tagging is not available yet. This feature is coming soon.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Close</AlertDialogCancel>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-red-400 hover:bg-red-400/10" title="Delete">
                                        <Trash size={20} weight="bold" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete feature coming soon</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Deleting files from this view is not available yet. This feature is coming soon.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Close</AlertDialogCancel>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>

                        <div className="w-px h-6 bg-border mx-1" /> {/* Divider */}

                        <Button variant="ghost" size="icon" onClick={handleClose} className="text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground" title="Close">
                            <X weight="bold" size={24} />
                        </Button>
                    </div>
                </div>

                {/* Video/PDF Stage */}
                <div
                    className="flex-1 flex items-center justify-center bg-black relative overflow-hidden"
                    onClick={isMediaFile ? togglePlay : undefined}
                >
                    {/* Loading Spinner (only for media files) */}
                    {isMediaFile && isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50 pointer-events-none">
                            <CircleNotch className="animate-spin text-white/50" size={48} />
                        </div>
                    )}

                    {file.type === 'pdf' ? (
                        <div className="absolute inset-0 z-10 p-8">
                            <PDFPlayer
                                ref={pdfRef}
                                url={file.url || ""}
                                fileId={file.id}
                                onPageChange={() => { }}
                                onSelectionChange={setHasPdfSelection}
                            />
                        </div>
                    ) : (
                        <video
                            ref={videoRef}
                            src={file.url || ""}
                            className="max-w-full max-h-full object-contain focus:outline-none"
                            autoPlay
                            onWaiting={() => setIsLoading(true)}
                            onCanPlay={() => setIsLoading(false)}
                            onPlay={() => {
                                setIsPlaying(true);
                                setIsLoading(false);
                            }}
                            onPause={() => setIsPlaying(false)}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            loop={isLooping}
                        />
                    )}
                </div>

                {/* Bottom Bar (only for media files) */}
                {isMediaFile && (
                    <div
                        className={cn(
                            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent transition-opacity duration-300 z-30 pb-4 pt-8 px-4",
                            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                        )}
                    >
                        {/* Seekbar Row */}
                        <div
                            className="mb-4 px-2 group/seek relative"
                            ref={progressRef}
                            onMouseMove={handleSeekHover}
                            onMouseLeave={() => setHoverTime(null)}
                        >
                            {/* Timestamp Markers */}
                            <div className="absolute top-0 bottom-0 left-2 right-2 pointer-events-none z-10">
                                {fileHighlights.map((h: any) => {
                                    const collection = collections.find(c => c.id === h.collectionId);
                                    const color = collection ? collection.color : 'var(--primary)';
                                    return (
                                        <div
                                            key={h.id}
                                            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2 rounded-full opacity-60"
                                            style={{
                                                left: `${(h.start / duration) * 100}%`,
                                                backgroundColor: color,
                                                filter: 'brightness(0.9)'
                                            }}
                                        />
                                    );
                                })}
                            </div>

                            <SeekPreview
                                file={file}
                                time={hoverTime}
                                x={hoverX}
                                visible={hoverTime !== null}
                            />
                            <Slider
                                value={[currentTime]}
                                max={duration}
                                step={0.1}
                                onValueChange={handleSeek}
                                className="cursor-pointer"
                            />
                        </div>

                        {/* Controls Row */}
                        <div className="flex items-center justify-between px-2">
                            {/* Left: Play/Pause, Volume */}
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={togglePlay}
                                    className="h-8 w-8 rounded-md bg-white/10 hover:bg-white/20 text-white"
                                >
                                    {isPlaying ? <Pause weight="fill" size={18} /> : <Play weight="fill" size={18} />}
                                </Button>

                                <div className="flex items-center gap-2 group/vol">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsMuted(!isMuted)}
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
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Center: Time Display */}
                            <div className="absolute left-1/2 -translate-x-1/2 font-mono text-sm font-medium text-white/90 tracking-wide pointer-events-none">
                                {formatTime(currentTime)} <span className="text-white/40 mx-2">/</span> {formatTime(duration)}
                            </div>

                            {/* Right: Speed, PiP, Sidebar Toggle, Fullscreen */}
                            <div className="flex items-center gap-3">
                                {/* Loop Toggle */}
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setIsLooping(!isLooping)}
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
                                            className="text-muted-foreground hover:text-foreground font-mono text-xs w-16"
                                        >
                                            {playbackRate}x
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64 bg-popover border-border p-4" side="top">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center justify-between text-foreground font-mono text-xl font-medium border-b border-border pb-2">
                                                <span>{playbackRate.toFixed(2)}x</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setPlaybackRate(Math.max(0.25, playbackRate - 0.05))}>
                                                    <Minus weight="bold" />
                                                </Button>
                                                <Slider
                                                    value={[playbackRate]}
                                                    min={0.25}
                                                    max={8}
                                                    step={0.05}
                                                    onValueChange={(val) => setPlaybackRate(val[0])}
                                                    className="flex-1"
                                                />
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setPlaybackRate(Math.min(8, playbackRate + 0.05))}>
                                                    <Plus weight="bold" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 8.0].map((rate) => (
                                                    <button
                                                        key={rate}
                                                        onClick={() => setPlaybackRate(rate)}
                                                        className={cn(
                                                            "px-2 py-1.5 rounded text-xs font-medium transition-colors border",
                                                            playbackRate === rate
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

                                <Button variant="ghost" size="icon" onClick={handleTogglePip} className="text-muted-foreground hover:text-foreground" title="Picture in Picture">
                                    <GridFour weight="bold" size={20} />
                                </Button>

                                <div className="w-px h-5 bg-border mx-1" />

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                    className={cn(
                                        "text-muted-foreground hover:text-foreground",
                                        sidebarOpen && "text-primary hover:text-primary"
                                    )}
                                >
                                    <SidebarSimple weight="bold" size={20} />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-muted-foreground hover:text-foreground">
                                    {isFullscreen ? <CornersIn weight="bold" size={20} /> : <CornersOut weight="bold" size={20} />}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Sidebar (Full Height, Sibling to Player Container) */}
            {sidebarOpen && (
                <motion.div
                    initial={enableSidebarAnimation ? { width: 0, opacity: 0 } : false}
                    animate={{ width: 320, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="bg-background border-l border-border flex flex-col shrink-0 z-20 overflow-hidden w-80 h-full"
                >
                    <div className="p-4 border-b border-border bg-background/50 backdrop-blur-md flex items-center justify-between">
                        <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Highlights</h3>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:hover:text-muted-foreground"
                            onClick={handleAddHighlight}
                            title="Add Highlight"
                            disabled={file.type === 'pdf' && !hasPdfSelection}
                        >
                            <Plus weight="bold" size={14} />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 w-full">
                        {fileHighlights.length === 0 ? (
                            <div className="text-muted-foreground text-xs text-center mt-4">No highlights yet.</div>
                        ) : (
                            fileHighlights.map((h: any) => {
                                const collection = collections.find(c => c.id === h.collectionId);
                                const borderColor = collection ? collection.color : 'transparent';
                                const collectionName = collection ? collection.name : null;

                                return (
                                    <div
                                        key={h.id}
                                        className="group flex flex-col gap-1.5 p-2 rounded-none hover:bg-accent border-l-4 transition-all relative"
                                        style={{ borderLeftColor: borderColor }}
                                    >
                                        <div className="flex items-center justify-between gap-2 h-6">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <button
                                                    className="text-primary font-mono text-xs bg-primary/10 px-1.5 py-0.5 rounded shrink-0 hover:bg-primary hover:text-primary-foreground transition-colors"
                                                    onClick={() => seekToHighlight(h.start)}
                                                >
                                                    {file.type === 'pdf'
                                                        ? (h.end && h.end !== h.start
                                                            ? `Page ${h.start}-${h.end}`
                                                            : `Page ${h.start}`)
                                                        : `${formatTime(h.start)} - ${formatTime(h.end || h.start + 5)}`
                                                    }
                                                </button>
                                                {collectionName && (
                                                    <span className="text-xs font-semibold truncate uppercase tracking-tight" style={{ color: collection?.color }}>
                                                        {collectionName}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {file.type !== 'pdf' && (
                                                    <button
                                                        className="p-1 px-1.5 text-xs bg-muted hover:bg-accent text-muted-foreground hover:text-foreground rounded flex items-center gap-1"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedHighlightId(h.id);
                                                            setHighlightPlayerOpen(true);
                                                        }}
                                                        title="Open Highlight"
                                                    >
                                                        <Play weight="fill" size={10} />
                                                    </button>
                                                )}
                                                <button
                                                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedHighlightId(h.id);
                                                        setEditHighlightOpen(true);
                                                    }}
                                                    title="Edit Highlight"
                                                >
                                                    <PencilSimple weight="bold" size={12} />
                                                </button>
                                                <button
                                                    className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeHighlight(h.id);
                                                    }}
                                                    title="Delete Highlight"
                                                >
                                                    <Trash weight="bold" size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        {file.type === 'pdf' && h.text && (
                                            <div className="text-foreground text-xs whitespace-pre-wrap break-all pl-1 leading-snug">
                                                {h.text}
                                            </div>
                                        )}
                                        <div className="text-muted-foreground text-sm whitespace-pre-wrap break-all pl-1 leading-relaxed mt-0.5">
                                            {h.note || <span className="text-muted-foreground/50 italic text-xs">No note</span>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </ScrollArea>
                </motion.div>
            )}

            <MoveFileDialog
                open={moveDialogOpen}
                onOpenChange={setMoveDialogOpen}
                fileIds={fileId ? [fileId] : []}
            />

            <EditFileDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                file={file}
                onSave={(updates) => updateFile(file.id, updates)}
            />

            <HighlightPlayerDialog
                open={highlightPlayerOpen}
                onOpenChange={setHighlightPlayerOpen}
                highlight={selectedHighlight}
                file={file || null}
                collection={collections.find(c => c.id === selectedHighlight?.collectionId)}
                collections={collections.filter(c => c.projectId === activeProjectId && !c.deleted)}
                onUpdate={(updates) => selectedHighlight && updateHighlight(selectedHighlight.id, updates)}
                onEditHighlight={() => {
                    setHighlightPlayerOpen(false);
                    setReturnToHighlightPlayer(true);
                    setEditHighlightOpen(true);
                }}
            />

            <EditHighlightDialog
                open={editHighlightOpen}
                onOpenChange={(open) => {
                    setEditHighlightOpen(open);
                    if (!open && returnToHighlightPlayer) {
                        setReturnToHighlightPlayer(false);
                        setHighlightPlayerOpen(true);
                    }
                }}
                highlight={selectedHighlight}
                collections={collections}
                file={file || null}
                onSave={(updates) => {
                    if (selectedHighlight) {
                        updateHighlight(selectedHighlight.id, updates);
                    }
                }}
            />
        </div>
    );
}
