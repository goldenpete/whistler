/**
 * ─── HighlightDialogs.tsx ───────────────────────────────────────────
 *
 * Full-featured highlight playback and editing dialogs. The
 * HighlightPlayerDialog renders an inline or floating media player
 * for video, audio, image, PDF, and YouTube highlights, while the
 * EditHighlightDialog provides a form for updating highlight metadata.
 *
 * Features / Responsibilities:
 *   - HighlightPlayerDialog – multi-format media player with
 *     play/pause, seek, volume, loop, fullscreen, and Picture-in-
 *     Picture controls; supports minimise and drag handles
 *   - EditHighlightDialog – edit highlight name, description, start/
 *     end times, type, colour, and associated collection
 *   - Time parsing helpers for mm:ss input
 *   - Integrates VideoPlayer, AudioPlayer, PDFPlayer, ImagePlayer,
 *     and YouTubePlayer components
 * ───────────────────────────────────────────────────────────────────
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState, useRef, type MouseEvent, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { type Highlight, type File, type Collection } from "@/types";
import { playSfx } from "@/utils/sound";
import { 
    Play, Pause, X, SpeakerHigh, SpeakerX, Repeat, 
    CornersOut, CornersIn, Minus, Plus, ArrowSquareOut, 
    FilePdf, EyeSlash, FilmStrip, SidebarSimple,
    MagnifyingGlassMinus, MagnifyingGlassPlus, ArrowsClockwise
} from "@phosphor-icons/react";
import { cn, clamp, formatTime } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PDFPlayer } from "@/components/player/PDFPlayer";
import { ImagePlayer } from "@/components/player/ImagePlayer";
import { AudioPlayer } from "@/components/player/AudioPlayer";
import { YouTubePlayerComponent, type YouTubePlayerHandle } from "@/components/player/YouTubePlayer";
import { useResolvedFileUrl } from "@/hooks/useResolvedFileUrl";
import { isLocalFile } from "@/utils/localFiles";
import { LocalFileAccessPanel } from "@/components/player/LocalFileAccessPanel";

// --- Time Helper ---

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

// --- Highlight Player Dialog ---

interface HighlightPlayerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    highlight: Highlight | null;
    file: File | null;
    collection?: Collection;
    collections?: Collection[];
    onUpdate?: (updates: Partial<Highlight>) => void;
    inline?: boolean;
    onRequestMinimize?: () => void;
    onRequestClose?: () => void;
    onSelectHighlight?: (id: string) => void;
    isDraggable?: boolean;
    onDragHandlePointerDown?: (event: React.PointerEvent) => void;
}

export function HighlightPlayerDialog({ open, onOpenChange, highlight, file, collection, collections, onUpdate, inline = false, onRequestMinimize, onRequestClose, onSelectHighlight, isDraggable = false, onDragHandlePointerDown }: HighlightPlayerDialogProps) {
    const { resolvedUrl, availability, requestAccess, relink } = useResolvedFileUrl(file);
    const navigate = useNavigate();
    const { setPipFile, setFileProgress, addAmbientMusicSuppression, removeAmbientMusicSuppression, highlights: allHighlights, addFloatingPlayer, setFloatingPlayerMinimized, windowOutlineEnabled, videoZoomByFile, setVideoZoomForFile, videoZoomManualByFile, setVideoZoomManualForFile } = useStore(useShallow((state) => ({
        setPipFile: state.setPipFile,
        setFileProgress: state.setFileProgress,
        addAmbientMusicSuppression: state.addAmbientMusicSuppression,
        removeAmbientMusicSuppression: state.removeAmbientMusicSuppression,
        highlights: state.highlights,
        addFloatingPlayer: state.addFloatingPlayer,
        setFloatingPlayerMinimized: state.setFloatingPlayerMinimized,
        windowOutlineEnabled: state.windowOutlineEnabled,
        videoZoomByFile: state.videoZoomByFile,
        setVideoZoomForFile: state.setVideoZoomForFile,
        videoZoomManualByFile: state.videoZoomManualByFile,
        setVideoZoomManualForFile: state.setVideoZoomManualForFile,
    })));
    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const youtubeRef = useRef<YouTubePlayerHandle>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    // File Type Flags
    const isPdf = file?.name.toLowerCase().endsWith('.pdf');
    const isImage = file?.type === 'image';
    const isAudio = file?.type === 'audio';
    const isYouTube = resolvedUrl?.includes('youtube.com') || resolvedUrl?.includes('youtu.be');
    const isVideo = !isPdf && !isImage && !isAudio;
    
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
    
    // Windowed State
    const [isWindowed, setIsWindowed] = useState(false);
    const [windowRect, setWindowRect] = useState({ x: 32, y: 32, width: 960, height: 600 });
    const windowRectInitialized = useRef(false);
    const dragActiveRef = useRef(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    // Edit State
    const [editNote, setEditNote] = useState("");
    const [editCollectionId, setEditCollectionId] = useState("");
    const [editStart, setEditStart] = useState("");
    const [editEnd, setEditEnd] = useState("");

    const start = highlight?.start || 0;
    const end = highlight?.end || 0;
    const segmentDuration = end - start;
    const fileHighlights = file ? allHighlights.filter((h: Highlight) => h.fileId === file.id) : [];
    const sortedHighlights = fileHighlights.slice().sort((a: Highlight, b: Highlight) => a.start - b.start);

    // Windowed Logic
    const handleToggleWindowed = () => {
        if (inline) return;
        setIsWindowed(!isWindowed);
    };

    const handleMinimize = () => {
        if (onRequestMinimize) {
            onRequestMinimize();
            return;
        }
        if (!file) return;
        // Close the dialog and add to floating players
        onOpenChange(false);
        const windowId = addFloatingPlayer(file.id);
        setFloatingPlayerMinimized(windowId, true);
    };

    const handleDragStart = (e: React.PointerEvent) => {
        if (!isWindowed) return;
        dragActiveRef.current = true;
        dragOffsetRef.current = {
            x: e.clientX - windowRect.x,
            y: e.clientY - windowRect.y
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        window.addEventListener("pointermove", handleDragMove);
        window.addEventListener("pointerup", handleDragEnd);
    };

    const handleDragMove = (e: PointerEvent) => {
        if (!dragActiveRef.current) return;
        setWindowRect((prev) => ({
            ...prev,
            x: Math.max(-prev.width + 80, Math.min(window.innerWidth - 80, e.clientX - dragOffsetRef.current.x)),
            y: Math.max(-prev.height + 80, Math.min(window.innerHeight - 80, e.clientY - dragOffsetRef.current.y))
        }));
    };

    const handleDragEnd = () => {
        dragActiveRef.current = false;
        window.removeEventListener("pointermove", handleDragMove);
        window.removeEventListener("pointerup", handleDragEnd);
    };

    const handleTopBarDrag = inline ? onDragHandlePointerDown : handleDragStart;
    const clampZoom = (value: number) => clamp(value, 0.5, 2);
    const isManualZoom = file?.id ? !!videoZoomManualByFile[file.id] : false;
    const zoomForFile = isManualZoom && file?.id ? (videoZoomByFile[file.id] ?? 1) : 1;

    useEffect(() => {
        return () => {
            window.removeEventListener("pointermove", handleDragMove);
            window.removeEventListener("pointerup", handleDragEnd);
        };
    }, []);

    useEffect(() => {
        if (!isWindowed || windowRectInitialized.current) return;
        const maxWidth = Math.min(960, window.innerWidth - 48);
        const maxHeight = Math.min(640, window.innerHeight - 48);
        setWindowRect({
            x: Math.max(24, window.innerWidth - maxWidth - 24),
            y: 24,
            width: Math.max(360, maxWidth),
            height: Math.max(240, maxHeight)
        });
        windowRectInitialized.current = true;
    }, [isWindowed]);

    // Sync Edit State
    useEffect(() => {
        if (highlight) {
            setEditNote(highlight.note || "");
            setEditCollectionId(highlight.collectionId || "");
            setEditStart(formatTime(highlight.start));
            setEditEnd(formatTime(highlight.end || highlight.start));
        }
    }, [highlight]);

    const handleSave = (updates?: Partial<Highlight>) => {
        if (!onUpdate || !highlight) return;
        
        if (updates) {
            onUpdate(updates);
            return;
        }

        const calculatedUpdates: Partial<Highlight> = {};
        
        if (editNote !== highlight.note) calculatedUpdates.note = editNote;
        if (editCollectionId !== highlight.collectionId) calculatedUpdates.collectionId = editCollectionId;
        
        if (isVideo || isAudio) {
            const startSecs = parseTime(editStart);
            const endSecs = parseTime(editEnd);
            
            if (startSecs !== null && startSecs !== highlight.start) calculatedUpdates.start = startSecs;
            if (endSecs !== null && endSecs !== highlight.end) calculatedUpdates.end = endSecs;
        }
        
        onUpdate(calculatedUpdates);
    };

    // Initialization Effect
    useEffect(() => {
        if (open && file && highlight && resolvedUrl && videoRef.current) {
            const video = videoRef.current;
            // eslint-disable-next-line react-hooks/immutability
            video.currentTime = start;
            video.play().catch(() => {});
            setIsPlaying(true);
        } else {
            setIsPlaying(false);
        }
    }, [open, file, highlight, start, resolvedUrl]);

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
    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    useEffect(() => {
        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        return () => {
            removeAmbientMusicSuppression('highlight-player');
        };
    }, [removeAmbientMusicSuppression]);

    // Time Update & Loop Logic
    const handleTimeUpdate = (overrideTime?: number) => {
        let now = 0;
        if (typeof overrideTime === 'number') {
            now = overrideTime;
        } else if (videoRef.current) {
            now = videoRef.current.currentTime;
        } else {
            return;
        }

        // Loop Logic
        if (now < start - 0.5 || now > end) {
            if (isLooping || now < start - 0.5) {
                if (isYouTube && youtubeRef.current) {
                    youtubeRef.current.currentTime = start;
                } else if (videoRef.current) {
                    videoRef.current.currentTime = start;
                }
            } else {
                if (isYouTube && youtubeRef.current) {
                    youtubeRef.current.pause();
                } else if (videoRef.current) {
                    videoRef.current.pause();
                }
                setIsPlaying(false);
            }
        }

        setCurrentTime(Math.max(start, Math.min(now, end)));
    };

    const togglePlay = () => {
        if (isYouTube && youtubeRef.current) {
            if (youtubeRef.current.paused) {
                youtubeRef.current.play();
                setIsPlaying(true);
            } else {
                youtubeRef.current.pause();
                setIsPlaying(false);
            }
            return;
        }

        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play().catch(() => {});
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
        
        if (isYouTube && youtubeRef.current) {
            youtubeRef.current.currentTime = newTime;
            setCurrentTime(newTime);
            return;
        }

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

    const togglePip = () => {
        if (file) {
            const time = isYouTube ? youtubeRef.current?.currentTime : videoRef.current?.currentTime;
            if (time !== undefined) {
                setFileProgress(file.id, time);
            }
            setPipFile(file.id);
            onOpenChange(false);
        }
    };

    const progress = segmentDuration > 0 
        ? Math.min(100, Math.max(0, ((currentTime - start) / segmentDuration) * 100))
        : 0;

    if (!highlight || !file) return null;

    const playerContent = (
        <div 
            ref={containerRef} 
            className={cn(
                "flex bg-black overflow-hidden relative group/container",
                isWindowed ? "fixed shadow-2xl border border-zinc-800 rounded-lg z-[100]" : "h-full w-full"
            )}
            style={isWindowed ? {
                top: windowRect.y,
                left: windowRect.x,
                width: windowRect.width,
                height: windowRect.height,
                resize: "both",
                minWidth: 360,
                minHeight: 240,
                maxWidth: "95vw",
                maxHeight: "95vh",
                border: windowOutlineEnabled && file?.color ? `2px solid ${file.color}` : undefined
            } : undefined}
            onMouseMove={handleMouseMove}
            onClick={handleMouseMove} // Also show controls on click
        >
            
            {/* Player Area */}
            <div className="flex-1 flex flex-col relative min-w-0 bg-black overflow-hidden">
                
                {/* Top Bar (Title + Close) */}
                <div className={cn(
                    "absolute top-0 left-0 right-0 z-30 flex items-center justify-between h-14 px-4 bg-zinc-950/90 border-b border-white/5 backdrop-blur-md transition-all duration-200 ease-out",
                    showControls ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none"
                )}>
                    <div 
                        className={cn("flex items-center gap-4 min-w-0 flex-1 mr-4", (inline ? isDraggable : isWindowed) && "cursor-move")}
                        onPointerDown={handleTopBarDrag}
                    >
                        {file.name.toLowerCase().endsWith('.pdf') ? (
                            <FilePdf className="text-muted-foreground shrink-0" size={24} weight="bold" />
                        ) : (
                            <FilmStrip className="text-muted-foreground shrink-0" size={24} weight="bold" />
                        )}
                        <div className="flex flex-col min-w-0">
                            {inline ? (
                                <div className="text-white font-medium text-base truncate select-none">{file.name}</div>
                            ) : (
                                <DialogTitle className="text-white font-medium text-base truncate select-none">{file.name}</DialogTitle>
                            )}
                            {file.description && (
                                <div className="text-xs text-muted-foreground truncate max-w-[400px] select-none">
                                    {file.description}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                playSfx('cursor');
                                onOpenChange(false);
                                if (!inline) {
                                    navigate(`/file/${file.id}`);
                                }
                            }}
                            className="text-muted-foreground hover:text-foreground hover:bg-white/10"
                            title={inline ? "Return to File" : "View Original File"}
                        >
                            <ArrowSquareOut weight="bold" size={20} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                playSfx('cursor');
                                handleMinimize();
                            }}
                            className="text-muted-foreground hover:text-foreground hover:bg-white/10"
                            title="Minimize to Dock"
                        >
                            <Minus weight="bold" size={20} />
                        </Button>
                        {!inline && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    playSfx('cursor');
                                    handleToggleWindowed();
                                }}
                                className="text-muted-foreground hover:text-foreground hover:bg-white/10"
                                title={isWindowed ? "Maximize" : "Windowed Mode"}
                            >
                                {isWindowed ? <CornersOut weight="bold" size={20} /> : <CornersIn weight="bold" size={20} />}
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                playSfx('cursor');
                                setShowControls(false);
                            }}
                            className="text-muted-foreground hover:text-foreground hover:bg-white/10"
                            title="Hide Top Bar"
                        >
                            <EyeSlash weight="bold" size={20} />
                        </Button>
                        <Button  
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                                playSfx('cursor');
                                if (onRequestClose) {
                                    onRequestClose();
                                } else {
                                    onOpenChange(false);
                                }
                            }} 
                            className="text-muted-foreground hover:text-foreground hover:bg-red-500/10 hover:text-red-500"
                        >
                            <X weight="bold" size={24} />
                        </Button>
                    </div>
                </div>

                {/* Video Stage */}
                <div 
                    className="flex-1 flex items-center justify-center relative overflow-hidden cursor-pointer"
                    onClick={isVideo ? togglePlay : undefined}
                >
                    {isPdf ? (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-950">
                            {resolvedUrl ? (
                                <PDFPlayer
                                    key={file.id} // Force new instance for each file to prevent state carry-over
                                    url={resolvedUrl}
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
                                    onToggleFullscreen={toggleFullscreen}
                                    isFullscreen={isFullscreen}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                                    <FilePdf size={32} />
                                    <span className="text-sm">PDF URL missing</span>
                                </div>
                            )}
                        </div>
                    ) : isImage ? (
                        <ImagePlayer
                                key={file.id}
                            url={resolvedUrl || ""}
                                fileId={file.id}
                                highlightId={highlight.id}
                                highlights={[highlight]}
                                className="w-full h-full"
                                showControls={showControls}
                                onHideControls={() => setShowControls(false)}
                                onToggleFullscreen={toggleFullscreen}
                                isFullscreen={isFullscreen}
                            />
                        ) : isAudio ? (
                            <div className="w-full max-w-4xl px-8 flex items-center justify-center h-full">
                                <AudioPlayer
                                    key={file.id}
                                    url={resolvedUrl || ""}
                                    fileId={file.id}
                                    className="w-full"
                                    highlights={[]}
                                    highlight={highlight}
                                    showControls={true}
                                />
                            </div>
                    ) : isLocalFile(file) && !resolvedUrl ? (
                        <div className="w-full h-full flex items-center justify-center p-6">
                            <LocalFileAccessPanel
                                file={file}
                                availability={availability}
                                onRequestAccess={requestAccess}
                                onRelink={relink}
                            />
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center overflow-hidden">
                            <div
                                className={cn("flex items-center justify-center", isYouTube ? "w-full h-full" : "")}
                                style={{ transform: `scale(${zoomForFile})`, transformOrigin: "center" }}
                            >
                                {isYouTube ? (
                                        <YouTubePlayerComponent
                                            ref={youtubeRef}
                                            url={resolvedUrl || ""}
                                            className="w-full h-full"
                                            onTimeUpdate={(t: number) => handleTimeUpdate(t)}
                                            onPlay={() => {
                                                setIsPlaying(true);
                                                addAmbientMusicSuppression('highlight-player');
                                            }}
                                            onPause={() => {
                                                setIsPlaying(false);
                                                removeAmbientMusicSuppression('highlight-player');
                                            }}
                                            initialTime={start}
                                        />
                                    ) : (
                                    <video
                                        ref={videoRef}
                                        src={resolvedUrl || ""}
                                        className="max-w-full max-h-full object-contain focus:outline-none"
                                        onPause={() => {
                                            setIsPlaying(false);
                                            removeAmbientMusicSuppression('highlight-player');
                                        }}
                                        onPlay={() => {
                                            setIsPlaying(true);
                                            addAmbientMusicSuppression('highlight-player');
                                        }}
                                        onTimeUpdate={() => handleTimeUpdate()}
                                        autoPlay
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Bar (Controls) */}
                {isVideo && (
                <div className={cn(
                    "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent transition-all duration-200 ease-out z-50 pb-4 pt-8 px-4",
                    showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                )}>
                    {/* Seekbar - Video Only */}
                    {isVideo && (
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
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e: MouseEvent) => { 
                                        playSfx('cursor');
                                        e.stopPropagation(); 
                                        togglePlay(); 
                                    }}
                                    className="h-8 w-8 rounded-md bg-white/10 hover:bg-white/20 text-white"
                                >
                                    {isPlaying ? <Pause weight="fill" size={18} /> : <Play weight="fill" size={18} />}
                                </Button>

                                <div className="flex items-center group/vol">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e: MouseEvent) => { 
                                            playSfx('cursor');
                                            e.stopPropagation(); 
                                            setIsMuted(!isMuted); 
                                        }}
                                        className="text-zinc-400 hover:text-white"
                                    >
                                        {isMuted ? <SpeakerX weight="bold" size={20} /> : <SpeakerHigh weight="bold" size={20} />}
                                    </Button>
                                    <div className="w-0 opacity-0 group-hover/vol:w-24 group-hover/vol:opacity-100 transition-all duration-200 ease-out overflow-hidden">
                                        <div className="w-24 pl-2">
                                            <Slider
                                                value={[isMuted ? 0 : volume]}
                                                max={1}
                                                step={0.05}
                                                onValueChange={(val: number[]) => setVolume(val[0])}
                                                thumbClassName="bg-white border-white shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Time Display - Video Only */}
                                <div className="font-mono text-sm font-medium text-white/90 tracking-wide ml-2">
                                    {formatTime(currentTime - start)} <span className="text-white/40 mx-2">/</span> {formatTime(segmentDuration)}
                                </div>
                            </div>
                        )}

                        {/* Right: Speed, Loop, Sidebar Toggle, Fullscreen */}
                        <div className="flex items-center gap-1">
                            {!file.name.toLowerCase().endsWith('.pdf') && (
                                <>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={(e: MouseEvent) => { 
                                            playSfx('cursor');
                                            e.stopPropagation(); 
                                            setIsLooping(!isLooping); 
                                        }}
                                        className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", isLooping && "text-primary hover:text-primary/80")}
                                        title={isLooping ? "Loop On" : "Loop Off"}
                                    >
                                        <Repeat weight="bold" size={18} />
                                    </Button>
                                    {isVideo && (
                                        <>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={(e: MouseEvent) => { 
                                                    playSfx('cursor');
                                                    e.stopPropagation(); 
                                                    if (file?.id) setVideoZoomManualForFile(file.id, !isManualZoom); 
                                                }}
                                                className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", isManualZoom && "text-primary hover:text-primary/80")}
                                                title={isManualZoom ? "Manual Zoom On" : "Auto Zoom On"}
                                            >
                                                <ArrowsClockwise weight="bold" size={18} />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={(e: MouseEvent) => { 
                                                    playSfx('cursor');
                                                    e.stopPropagation(); 
                                                    if (file?.id && isManualZoom) setVideoZoomForFile(file.id, clampZoom(zoomForFile - 0.1)); 
                                                }}
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                title="Zoom Out"
                                                disabled={!isManualZoom}
                                            >
                                                <MagnifyingGlassMinus weight="bold" size={18} />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={(e: MouseEvent) => { 
                                                    playSfx('cursor');
                                                    e.stopPropagation(); 
                                                    if (file?.id && isManualZoom) setVideoZoomForFile(file.id, clampZoom(zoomForFile + 0.1)); 
                                                }}
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                title="Zoom In"
                                                disabled={!isManualZoom}
                                            >
                                                <MagnifyingGlassPlus weight="bold" size={18} />
                                            </Button>
                                        </>
                                    )}

                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e: MouseEvent) => {
                                                    playSfx('cursor');
                                                    e.stopPropagation();
                                                }}
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground text-xs"
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
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { playSfx('cursor'); setPlaybackSpeed(Math.max(0.25, playbackSpeed - 0.05)); }}>
                                                        <Minus weight="bold" />
                                                    </Button>
                                                    <Slider
                                                        value={[playbackSpeed]}
                                                        min={0.25}
                                                        max={8}
                                                        step={0.05}
                                                        onValueChange={(val: number[]) => setPlaybackSpeed(val[0])}
                                                        className="flex-1"
                                                    />
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { playSfx('cursor'); setPlaybackSpeed(Math.min(8, playbackSpeed + 0.05)); }}>
                                                        <Plus weight="bold" />
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 8.0].map((rate) => (
                                                        <button
                                                            key={rate}
                                                            onClick={() => { playSfx('cursor'); setPlaybackSpeed(rate); }}
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

                                    <Button variant="ghost" size="icon" onClick={() => { playSfx('cursor'); togglePip(); }} className="text-muted-foreground hover:text-foreground" title="Picture in Picture">
                                        <CornersOut weight="bold" size={20} />
                                    </Button>

                                    <div className="w-px h-5 bg-white/20 mx-1" />
                                </>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e: MouseEvent) => { 
                                    playSfx('cursor');
                                    e.stopPropagation(); 
                                    setShowControls(false); 
                                }}
                                className="text-muted-foreground hover:text-foreground"
                                title="Hide Controls"
                            >
                                <EyeSlash weight="bold" size={20} />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e: MouseEvent) => { 
                                    playSfx('cursor');
                                    e.stopPropagation(); 
                                    setIsSidebarOpen(!isSidebarOpen); 
                                }}
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
                                onClick={(e: MouseEvent) => { 
                                    playSfx('cursor');
                                    e.stopPropagation(); 
                                    toggleFullscreen(); 
                                }} 
                                className="text-muted-foreground hover:text-foreground"
                            >
                                {isFullscreen ? <CornersIn weight="bold" size={20} /> : <CornersOut weight="bold" size={20} />}
                            </Button>
                        </div>
                    </div>
                </div>
                )}
            </div>

            {/* Sidebar */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 320, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="h-full bg-background border-l border-border flex flex-col shrink-0 overflow-hidden w-80 shadow-2xl text-foreground z-40 min-h-0"
                    >
                        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20 w-80">
                            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Highlight Details</h3>
                        </div>
                        
                        <div className="flex-1 p-4 overflow-y-auto min-h-0">
                            <div className="flex flex-col gap-6">
                                {/* Collection */}
                                <div className="flex flex-col gap-2">
                                    <Label className="text-xs font-mono text-muted-foreground uppercase">Collection</Label>
                                    <Select 
                                        value={editCollectionId} 
                                        onValueChange={(value: string) => {
                                            setEditCollectionId(value);
                                            handleSave({ collectionId: value });
                                        }}
                                    >
                                        <SelectTrigger className="w-full bg-muted/30 border-border/50 h-9">
                                            <SelectValue placeholder="Select collection" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {collections?.map(c => (
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

                                {/* Time Range or Highlighted Text */}
                                {isPdf ? (
                                    <div className="flex flex-col gap-2">
                                        <Label className="text-xs font-mono text-muted-foreground uppercase">Highlighted Text</Label>
                                        <div className="p-3 bg-muted/30 rounded-md text-sm text-muted-foreground italic border border-border/50 max-h-[150px] overflow-y-auto">
                                            "{highlight.text || 'No text selected'}"
                                        </div>
                                    </div>
                                ) : !isImage && (
                                    <div className="flex flex-col gap-2">
                                        <Label className="text-xs font-mono text-muted-foreground uppercase">Time Range</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={editStart}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditStart(e.target.value)}
                                                onBlur={() => {
                                                    const seconds = parseTime(editStart);
                                                    if (seconds !== null) {
                                                        handleSave({ start: seconds });
                                                    } else {
                                                        setEditStart(formatTime(highlight.start));
                                                    }
                                                }}
                                                className="bg-muted/30 border-border/50 h-9 font-mono text-center"
                                                placeholder="0:00"
                                            />
                                            <span className="text-muted-foreground">-</span>
                                            <Input
                                                value={editEnd}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditEnd(e.target.value)}
                                                onBlur={() => {
                                                    const seconds = parseTime(editEnd);
                                                    if (seconds !== null) {
                                                        handleSave({ end: seconds });
                                                    } else {
                                                        setEditEnd(formatTime(highlight.end));
                                                    }
                                                }}
                                                className="bg-muted/30 border-border/50 h-9 font-mono text-center"
                                                placeholder="0:00"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Note */}
                                <div className="flex flex-col gap-2">
                                    <Label className="text-xs font-mono text-muted-foreground uppercase">Note</Label>
                                    <Textarea 
                                        value={editNote}
                                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditNote(e.target.value)}
                                        onBlur={() => handleSave({ note: editNote })}
                                        className="bg-muted/30 border-border/50 resize-none h-40 leading-relaxed p-3 focus-visible:ring-1 overflow-y-auto"
                                        placeholder="Add a note..."
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label className="text-xs font-mono text-muted-foreground uppercase">Highlights</Label>
                                    <div className="flex flex-col gap-2">
                                        {sortedHighlights.length === 0 ? (
                                            <div className="text-xs text-muted-foreground">No highlights yet.</div>
                                        ) : (
                                            sortedHighlights.map((h: Highlight) => {
                                                const isActive = h.id === highlight.id;
                                                const hCollection = collections?.find(c => c.id === h.collectionId);
                                                return (
                                                    <button
                                                        key={h.id}
                                                        onClick={() => {
                                                            playSfx('cursor');
                                                            onSelectHighlight?.(h.id);
                                                        }}
                                                        className={cn(
                                                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors border border-transparent w-full",
                                                            isActive
                                                                ? "bg-primary/10 text-primary border-primary/40"
                                                                : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                        )}
                                                    >
                                                        <span className="font-mono shrink-0">
                                                            {isPdf
                                                                ? (h.end && h.end !== h.start ? `Page ${h.start}-${h.end}` : `Page ${h.start}`)
                                                                : isImage
                                                                    ? "View Region"
                                                                    : `${formatTime(h.start)} - ${formatTime(h.end || h.start + 5)}`
                                                            }
                                                        </span>
                                                        <span className={cn("flex-1 truncate", isActive ? "text-primary/90" : "text-muted-foreground")}>
                                                            {h.note?.trim() ? h.note : "No note"}
                                                        </span>
                                                        {hCollection && (
                                                            <span className="shrink-0 truncate uppercase tracking-tight text-[10px]" style={{ color: hCollection.color }}>
                                                                {hCollection.name}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );

    if (!highlight || !file) return null;

    if (inline) {
        return playerContent;
    }

    if (isWindowed) {
        if (!open) return null;
        return createPortal(playerContent, document.body);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className="!w-screen !h-screen !max-w-none !max-h-screen !border-none !rounded-none !p-0 overflow-hidden bg-black text-white outline-none !duration-200 data-[state=open]:!slide-in-from-bottom-10 data-[state=closed]:!slide-out-to-bottom-10"
                showCloseButton={false}
            >
                <DialogDescription className="sr-only">
                    Media player for {file.name}
                </DialogDescription>
                {playerContent}
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
    container?: HTMLElement | null;
}

export function EditHighlightDialog({ open, onOpenChange, highlight, file, collections, onSave, container }: EditHighlightDialogProps) {
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
            <DialogContent className="sm:max-w-[425px]" portalContainer={container}>
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
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setStartTime(e.target.value)}
                                    placeholder="MM:SS"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>End Time</Label>
                                <Input 
                                    value={endTime} 
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEndTime(e.target.value)}
                                    placeholder="MM:SS"
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label>Note</Label>
                        <Textarea 
                            value={note} 
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)} 
                            placeholder="Add a note..."
                            className="h-32 resize-none"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => {
                        playSfx('cursor');
                        onOpenChange(false);
                    }}>Cancel</Button>
                    <Button onClick={() => {
                        playSfx('cursor');
                        handleSave();
                    }}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
