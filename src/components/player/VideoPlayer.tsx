import { useEffect, useRef, useState, type MouseEvent, type SyntheticEvent } from "react";
import { useStore, type AppStore } from "@/store/useStore";
import { useParams, useNavigate } from "react-router-dom";
import { cn, formatTime } from "@/lib/utils";
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
import { ColorPicker } from "@/components/ui/ColorPicker";
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
    CircleNotch,
    Eye,
    EyeSlash,
    Image as ImageIcon,
    MusicNotes,
    MagnifyingGlassMinus,
    MagnifyingGlassPlus,
     ArrowsClockwise,
     VideoCamera,
     Desktop
 } from "@phosphor-icons/react";
import { ScreenshotDialog } from "@/components/dialogs/ScreenshotDialog";
import { motion } from "framer-motion";
import { PDFPlayer } from './PDFPlayer';
import type { PDFPlayerHandle } from './PDFPlayer';
import { ImagePlayer } from './ImagePlayer';
import type { ImagePlayerHandle } from './ImagePlayer';
import type { Highlight, File as AppFile, Collection } from "@/types";
import { AudioPlayer } from './AudioPlayer';
import { SeekPreview } from './SeekPreview';
import { YouTubePlayerComponent, type YouTubePlayerHandle, getYouTubeId } from '@/components/player/YouTubePlayer';

import { EditFileDialog } from "@/components/dialogs/FileDialogs";
import { HighlightPlayerDialog, EditHighlightDialog } from "@/components/dialogs/HighlightDialogs";
import { MoveFileDialog } from "@/components/dialogs/MoveFileDialog";
import { useKeybind } from "@/hooks/use-keybind";

const ExpandableNote = ({ text }: { text: string }) => {
    const [expanded, setExpanded] = useState(false);
    const limit = 150;

    if (!text) return <span className="text-muted-foreground/50 italic text-xs">No note</span>;
    if (text.length <= limit) return <>{text}</>;

    return (
        <span>
            {expanded ? text : `${text.slice(0, limit)}...`}
            <button 
                onClick={(e: MouseEvent) => { 
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

interface VideoPlayerProps {
    fileIdOverride?: string;
    floating?: boolean;
    isMinimized?: boolean;
    windowZIndex?: number;
    onFocus?: () => void;
    onMinimize?: () => void;
    onClose?: () => void;
    onExitFloating?: () => void;
}

export default function VideoPlayer({ fileIdOverride, floating = false, isMinimized: isMinimizedProp, windowZIndex, onFocus, onMinimize, onClose, onExitFloating }: VideoPlayerProps) {
    const { fileId: routeFileId } = useParams() as { fileId?: string };
    const fileId = fileIdOverride ?? routeFileId;
    const navigate = useNavigate();
    const { 
        files, 
        highlights, 
        collections, 
        addVideoHighlight, 
        removeHighlight, 
        updateHighlight, 
        updateFile, 
        activeCollectionId, 
        activeProjectId, 
        activeHighlightId,
        setActiveHighlight,
        setPipFile, 
        togglePip, 
        isPipOpen, 
        pipFileId, 
        fileProgress, 
        setFileProgress, 
        isSidebarOpen: sidebarOpen, 
        toggleSidebar: setSidebarOpen, 
        addAmbientMusicSuppression, 
        removeAmbientMusicSuppression, 
        trashFile,
        addFloatingPlayer,
        setFloatingPlayerMinimized,
        windowOutlineEnabled,
        videoZoomByFile,
        setVideoZoomForFile,
        videoZoomManualByFile,
        setVideoZoomManualForFile,
        muteNewVideosUntilUnmuted,
        rememberMediaVolume,
        disableMediaAutoplay,
        videoVolumeByFile,
        videoUnmutedByFile,
        setVideoVolumeForFile,
        setVideoUnmutedForFile
    } = useStore();
    const videoRef = useRef<HTMLVideoElement>(null);
    const youtubeRef = useRef<YouTubePlayerHandle>(null);
    const isYouTube = fileId ? (files.find(f => f.id === fileId)?.url?.includes('youtube.com') || files.find(f => f.id === fileId)?.url?.includes('youtu.be')) : false;
    const pdfRef = useRef<PDFPlayerHandle>(null);
    const imageRef = useRef<ImagePlayerHandle>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [showInitialMuteOverlay, setShowInitialMuteOverlay] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [editOpen, setEditOpen] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [enableSidebarAnimation, setEnableSidebarAnimation] = useState(false);
    const [hasPdfSelection, setHasPdfSelection] = useState(false);
    const [isWindowed, setIsWindowed] = useState(floating);
    const [windowRect, setWindowRect] = useState({ x: 32, y: 32, width: 960, height: 600 });
    const [isScreenshotDialogOpen, setIsScreenshotDialogOpen] = useState(false);
    const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

    const handleCaptureFrame = async () => {
        if (isYouTube && file && file.url) {
            const videoId = getYouTubeId(file.url);
            if (videoId) {
                const maxResUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                const hqUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                
                try {
                    const response = await fetch(maxResUrl);
                    if (response.ok) {
                        const blob = await response.blob();
                        setScreenshotUrl(URL.createObjectURL(blob));
                        setIsScreenshotDialogOpen(true);
                        return;
                    }
                } catch (e) {
                    // Ignore fetch error, try fallback
                }
                
                // Fallback to direct URL (cropping might be limited if CORS fails)
                setScreenshotUrl(hqUrl);
                setIsScreenshotDialogOpen(true);
            }
        } else if (videoRef.current) {
            const video = videoRef.current;
            
            const promptForScreenCapture = () => {
                 const tryScreenCapture = window.confirm(
                    "Cannot capture screenshot directly because the video server blocks access.\n\n" +
                    "Do you want to use Screen Capture instead?\n" +
                    "(You will need to select this tab/window and then crop the image)"
                );

                if (tryScreenCapture) {
                    handleScreenCapture();
                }
            };

            // Try capturing from the main video first (fastest)
            // If the video already has CORS headers (e.g. some CDNs), this will work immediately.
            try {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL("image/png");
                    setScreenshotUrl(dataUrl);
                    setIsScreenshotDialogOpen(true);
                    return;
                }
            } catch (e) {
                // Canvas is tainted. We need to fetch the frame using a separate CORS-enabled request.
                console.log("Main video tainted, attempting CORS capture...");
            }

            // Fallback: Create a temporary hidden video element with crossOrigin="anonymous"
            // This allows us to capture the frame without disrupting the main playback or requiring the user to reload.
            
            // SECURITY CHECK:
            // If the page is HTTPS and the video is HTTP, creating a crossOrigin element will trigger "Mixed Active Content"
            // and block the request, causing the site to be flagged as "Not Secure".
            // In this case, we MUST skip the CORS attempt and go straight to Screen Capture.
            const isMixedContent = window.location.protocol === 'https:' && video.src.startsWith('http:');
            
            if (isMixedContent) {
                console.warn("Skipping CORS capture due to Mixed Content (HTTPS page, HTTP video).");
                promptForScreenCapture();
                return;
            }

            setIsLoading(true);
            const tempVideo = document.createElement("video");
            tempVideo.crossOrigin = "anonymous";
            tempVideo.src = video.src;
            tempVideo.currentTime = video.currentTime;
            tempVideo.muted = true;
            tempVideo.style.display = 'none';
            document.body.appendChild(tempVideo);

            const cleanup = () => {
                document.body.removeChild(tempVideo);
                setIsLoading(false);
            };

            const onSeeked = () => {
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = tempVideo.videoWidth;
                    canvas.height = tempVideo.videoHeight;
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                        ctx.drawImage(tempVideo, 0, 0);
                        const dataUrl = canvas.toDataURL("image/png");
                        setScreenshotUrl(dataUrl);
                        setIsScreenshotDialogOpen(true);
                    }
                } catch (e) {
                    console.error("CORS capture failed", e);
                    alert("Cannot capture screenshot. The video server does not support CORS requests, which prevents browser-based screenshots for security reasons.");
                } finally {
                    cleanup();
                }
            };

            const onError = () => {
                console.error("CORS video load failed");
                cleanup();
                
                // Final Fallback: Screen Capture API
                // If the server blocks CORS, the only way to get pixels is to ask the user to capture their screen/tab.
                promptForScreenCapture();
            };

            tempVideo.addEventListener('seeked', onSeeked, { once: true });
            tempVideo.addEventListener('error', onError, { once: true });
            
            // Trigger load if needed (setting src usually triggers it)
        }
    };

    const handleScreenCapture = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ 
                video: { displaySurface: "browser" } 
            });
            
            const track = stream.getVideoTracks()[0];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const imageCapture = new (window as any).ImageCapture(track);
            const bitmap = await imageCapture.grabFrame();
            
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                ctx.drawImage(bitmap, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                setScreenshotUrl(dataUrl);
                setIsScreenshotDialogOpen(true);
            }
            
            // Stop sharing immediately
            track.stop();
        } catch (e) {
            console.error("Screen capture failed", e);
        }
    };
    const windowRectInitialized = useRef(false);
    const dragActiveRef = useRef(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const isMinimized = floating ? !!isMinimizedProp : false;
    const lastFileIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        // Enable sidebar animation after initial render
        const timer = setTimeout(() => setEnableSidebarAnimation(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Highlight Dialog State
    const [editHighlightOpen, setEditHighlightOpen] = useState(false);
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [colorPickerOpen, setColorPickerOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);

    // Seek Preview State
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverX, setHoverX] = useState(0);
    const progressRef = useRef<HTMLDivElement>(null);

    const selectedHighlight = highlights.find((t: Highlight) => t.id === selectedHighlightId) || null;
    const activeHighlight = highlights.find((t: Highlight) => t.id === activeHighlightId) || null;

    const file = files.find((f: AppFile) => f.id === fileId);
    const fileHighlights = highlights.filter((t: Highlight) => t.fileId === fileId);
    const activeHighlightForFile = activeHighlight && activeHighlight.fileId === fileId ? activeHighlight : null;

    const handleCreateHighlight = (time: number) => {
        if (!fileId) return;
        // Create highlight ending at the selected time, defaulting to 5 seconds duration
        const start = Math.max(0, time - 5);
        addVideoHighlight(fileId, start, time, activeCollectionId || undefined);
    };

    if (!file) {
        return <div className="p-10 text-center text-muted-foreground">Loading file...</div>;
    }

    const isMediaFile = file.type === 'video' || file.type === 'audio';
    const isManualZoom = fileId ? !!videoZoomManualByFile[fileId] : false;
    const zoomForFile = isManualZoom && fileId ? (videoZoomByFile[fileId] ?? 1) : 1;

    // Controls visibility timer
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []); // Removed isPlaying dependency as mousemove logic is moved to prop

    useEffect(() => {
        return () => {
            removeAmbientMusicSuppression('main-player');
        };
    }, [removeAmbientMusicSuppression]);

    useEffect(() => {
        if (activeHighlightId) {
            setSelectedHighlightId(activeHighlightId);
        }
    }, [activeHighlightId]);

    useEffect(() => {
        if (activeHighlightForFile) {
            if (videoRef.current) videoRef.current.pause();
            if (youtubeRef.current) youtubeRef.current.pause();
        }
    }, [activeHighlightForFile]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackRate;
        }
        if (youtubeRef.current) {
            youtubeRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    useEffect(() => {
        if (!file || file.type !== 'video' || !fileId) return;

        // Only run initialization when file changes to prevent overwriting
        // manual volume changes when store updates (e.g. unmuting)
        if (fileId !== lastFileIdRef.current) {
            lastFileIdRef.current = fileId;

            const initialVolume = rememberMediaVolume && videoVolumeByFile[fileId] !== undefined
                ? videoVolumeByFile[fileId]
                : 1;
            setVolume(initialVolume);
            if (videoRef.current) videoRef.current.volume = initialVolume;
            if (youtubeRef.current) youtubeRef.current.volume = initialVolume;
            
            const shouldMuteForFirstOpen = muteNewVideosUntilUnmuted && !videoUnmutedByFile[fileId];
            setIsMuted(shouldMuteForFirstOpen);
            setShowInitialMuteOverlay(shouldMuteForFirstOpen);
            if (videoRef.current) videoRef.current.muted = shouldMuteForFirstOpen;
            if (youtubeRef.current) youtubeRef.current.muted = shouldMuteForFirstOpen;
        }
    }, [file, fileId, rememberMediaVolume, videoVolumeByFile, muteNewVideosUntilUnmuted, videoUnmutedByFile]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume;
            videoRef.current.muted = isMuted;
        }
        if (youtubeRef.current) {
            youtubeRef.current.volume = volume;
            youtubeRef.current.muted = isMuted;
        }
    }, [volume, isMuted]);

    if (!file) {
        return <div className="flex items-center justify-center h-full text-muted-foreground">File not found</div>;
    }

    const togglePlay = () => {
        if (!isMediaFile) return;

        if (isYouTube && youtubeRef.current) {
            if (youtubeRef.current.paused) {
                youtubeRef.current.play();
            } else {
                youtubeRef.current.pause();
            }
            return;
        }

        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
            } else {
                videoRef.current.pause();
            }
        }
    };

    const handleVolumeChange = (val: number[]) => {
        const newVolume = val[0];
        setVolume(newVolume);
        if (rememberMediaVolume && fileId) {
            setVideoVolumeForFile(fileId, newVolume);
        }
        if (newVolume === 0) {
            setIsMuted(true);
        } else if (!showInitialMuteOverlay) {
            setIsMuted(false);
        }
    };

    const handleToggleMute = () => {
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        if (!nextMuted && fileId && muteNewVideosUntilUnmuted && !videoUnmutedByFile[fileId]) {
            setVideoUnmutedForFile(fileId, true);
            setShowInitialMuteOverlay(false);
        }
    };

    const handleInitialUnmute = () => {
        const nextVolume = volume === 0 ? 1 : volume;
        
        // Update store first (Unmute THEN Volume) to prevent race conditions in effects
        if (fileId) {
            setVideoUnmutedForFile(fileId, true);
            if (nextVolume !== volume && rememberMediaVolume) {
                setVideoVolumeForFile(fileId, nextVolume);
            }
        }

        if (nextVolume !== volume) {
            setVolume(nextVolume);
        }
        setIsMuted(false);
        setShowInitialMuteOverlay(false);

        if (videoRef.current) {
            videoRef.current.volume = nextVolume;
            videoRef.current.muted = false;
        }
    };

    const setQuickVolume = (nextVolume: number) => {
        // Update store first (Unmute THEN Volume) to prevent race conditions in effects
        if (fileId) {
            setVideoUnmutedForFile(fileId, true);
            if (rememberMediaVolume) {
                setVideoVolumeForFile(fileId, nextVolume);
            }
        }

        setVolume(nextVolume);
        setIsMuted(false);
        setShowInitialMuteOverlay(false);

        if (videoRef.current) {
            videoRef.current.volume = nextVolume;
            videoRef.current.muted = false;
        }
    };

    const [isCollectionMode, setIsCollectionMode] = useState(false);

    const handleTimeUpdate = (overrideTime?: number) => {
        let time = 0;
        if (typeof overrideTime === 'number') {
            time = overrideTime;
        } else if (videoRef.current) {
            time = videoRef.current.currentTime;
        } else {
            return;
        }

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
                        if (isYouTube && youtubeRef.current) {
                            youtubeRef.current.currentTime = nextSegment.start;
                        } else if (videoRef.current) {
                            videoRef.current.currentTime = nextSegment.start;
                        }
                    } else {
                        // End of all segments
                        if (isLooping) {
                            if (isYouTube && youtubeRef.current) {
                                youtubeRef.current.currentTime = sorted[0].start;
                            } else if (videoRef.current) {
                                videoRef.current.currentTime = sorted[0].start;
                            }
                        } else {
                            if (isYouTube && youtubeRef.current) {
                                youtubeRef.current.pause();
                            } else if (videoRef.current) {
                                videoRef.current.pause();
                            }
                        }
                    }
                }
            }
        }

        // Save progress every 2 seconds roughly
        if (file && Math.abs(time - (fileProgress[file.id] || 0)) > 2) {
            setFileProgress(file.id, time);
        }
    };

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
        setActiveHighlight(null);
        if (onClose) {
            onClose();
            return;
        }
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/");
        }
    };

    const handleToggleWindowed = () => {
        if (!fileId) return;
        if (!floating) {
            addFloatingPlayer(fileId);
            if (window.history.length > 1) {
                navigate(-1);
            } else {
                navigate("/storage");
            }
            return;
        }
        if (isWindowed) {
            if (onExitFloating) {
                onExitFloating();
            }
            return;
        }
        setIsWindowed(true);
    };

    const handleMinimize = () => {
        if (onMinimize) {
            onMinimize();
            return;
        }
        if (!fileId) return;
        const windowId = addFloatingPlayer(fileId);
        setFloatingPlayerMinimized(windowId, true);
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/storage");
        }
    };

    const clampZoom = (value: number) => Math.min(2, Math.max(0.5, value));

    const handleDragStart = (e: any) => {
        if (!isWindowed) return;
        if (onFocus) onFocus();
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

    useEffect(() => {
        return () => {
            window.removeEventListener("pointermove", handleDragMove);
            window.removeEventListener("pointerup", handleDragEnd);
        };
    }, []);

    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            containerRef.current?.requestFullscreen();
        }
    };

    // --- Shortcuts ---
    useKeybind("space", togglePlay, { preventDefault: true, disableInInput: true });
    useKeybind("k", togglePlay, { preventDefault: true, disableInInput: true });
    useKeybind("f", toggleFullscreen, { preventDefault: true, disableInInput: true });
    useKeybind("m", handleToggleMute, { preventDefault: true, disableInInput: true });
    useKeybind("s", handleCaptureFrame, { preventDefault: true, disableInInput: true });
    
    useKeybind("j", () => {
        if (isYouTube && youtubeRef.current) {
            youtubeRef.current.currentTime -= 10;
        } else if (videoRef.current) {
            videoRef.current.currentTime -= 10;
        }
    }, { preventDefault: true, disableInInput: true });

    useKeybind("l", () => {
        if (isYouTube && youtubeRef.current) {
            youtubeRef.current.currentTime += 10;
        } else if (videoRef.current) {
            videoRef.current.currentTime += 10;
        }
    }, { preventDefault: true, disableInInput: true });

    useKeybind("arrowleft", () => {
        if (isYouTube && youtubeRef.current) {
            youtubeRef.current.currentTime -= 5;
        } else if (videoRef.current) {
            videoRef.current.currentTime -= 5;
        }
    }, { preventDefault: true, disableInInput: true });

    useKeybind("arrowright", () => {
        if (isYouTube && youtubeRef.current) {
            youtubeRef.current.currentTime += 5;
        } else if (videoRef.current) {
            videoRef.current.currentTime += 5;
        }
    }, { preventDefault: true, disableInInput: true });

    useKeybind("arrowup", () => {
        const newVolume = Math.min(1, volume + 0.1);
        handleVolumeChange([newVolume]);
    }, { preventDefault: true, disableInInput: true });

    useKeybind("arrowdown", () => {
        const newVolume = Math.max(0, volume - 0.1);
        handleVolumeChange([newVolume]);
    }, { preventDefault: true, disableInInput: true });
    // --- End Shortcuts ---

    const handleCopyUrl = () => {
        if (file.url) navigator.clipboard.writeText(file.url);
    };

    const seekToHighlight = (highlight: Highlight) => {
        if (file?.type === 'pdf') {
            pdfRef.current?.jumpToPage(highlight.start);
        } else if (isYouTube && youtubeRef.current) {
            youtubeRef.current.currentTime = highlight.start;
            youtubeRef.current.play();
        } else if (videoRef.current) {
            videoRef.current.currentTime = highlight.start;
            videoRef.current.play();
        }
    };



    const handleSeek = (value: number[]) => {
        const time = value[0];
        if (isYouTube && youtubeRef.current) {
            youtubeRef.current.currentTime = time;
            setCurrentTime(time);
            return;
        }
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            // Immediate update to UI state to prevent jumping
            setCurrentTime(time);
        }
    };

    const handleTogglePip = () => {
        if (file) {
            const currentTime = isYouTube ? youtubeRef.current?.currentTime : videoRef.current?.currentTime;
            if (currentTime !== undefined) {
                setFileProgress(file.id, currentTime);
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
        } else if (file.type === 'image') {
            imageRef.current?.addHighlightFromSelection();
            return;
        }

        // Create highlight for the last 5 seconds ending at current time
        const start = Math.max(0, currentTime - 5);
        addVideoHighlight(fileId, start, currentTime, activeCollectionId || undefined);
    };

    const handleSeekHover = (e: MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || !file || (file.type !== 'video' && file.type !== 'audio')) return;

        const rect = progressRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const time = percentage * duration;

        setHoverTime(time);
        setHoverX(x);
    };

    useEffect(() => {
        if (!floating) return;
        setIsWindowed(true);
    }, [floating]);

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

    return (
        <>
        <div 
                ref={containerRef} 
                className={cn(
                    "flex bg-black overflow-hidden relative",
                isWindowed ? "fixed" : "h-full w-full",
                    isMinimized && "opacity-0 pointer-events-none"
                )}
                style={isWindowed ? {
                    top: windowRect.y,
                    left: windowRect.x,
                    width: windowRect.width,
                    height: windowRect.height,
                zIndex: windowZIndex ?? 80,
                    resize: "both",
                    overflow: "hidden",
                    minWidth: 360,
                    minHeight: 240,
                    maxWidth: "95vw",
                    maxHeight: "95vh",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                    border: windowOutlineEnabled && file?.color ? `2px solid ${file.color}` : undefined
                } : undefined}
                onMouseMove={handleMouseMove}
            onClick={() => {
                if (onFocus) onFocus();
                handleMouseMove();
            }}
            onPointerDown={() => {
                if (onFocus) onFocus();
            }}
            >

            {/* Player Container (Top Bar + Stage + Bottom Bar) */}
            {activeHighlightForFile ? (
                <HighlightPlayerDialog
                    open={true}
                    onOpenChange={(open) => {
                        if (!open) setActiveHighlight(null);
                    }}
                    highlight={activeHighlightForFile}
                    file={file || null}
                    collection={collections.find((c: Collection) => c.id === activeHighlightForFile?.collectionId)}
                    collections={collections.filter((c: Collection) => c.projectId === activeProjectId && !c.deleted)}
                    onUpdate={(updates) => updateHighlight(activeHighlightForFile.id, updates)}
                    inline
                    onRequestMinimize={handleMinimize}
                    onRequestClose={handleClose}
                    onSelectHighlight={setActiveHighlight}
                    isDraggable={isWindowed}
                    onDragHandlePointerDown={handleDragStart}
                />
            ) : (
                <motion.div
                    key={fileId}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeInOut" }}
                    className="flex-1 flex flex-col relative min-w-0 group"
                >

                {/* Top Bar */}
                <div className={cn(
                    "absolute top-0 left-0 right-0 z-30 flex items-center justify-between h-12 px-4 transition-all duration-300 ease-out pointer-events-none",
                    isHeaderVisible && "bg-zinc-950/90 border-b border-white/5 backdrop-blur-md",
                    showControls ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
                )}>
                    {/* Left: Info */}
                    <div className={cn(
                        "flex items-center gap-4 min-w-0 flex-1 mr-4 pointer-events-auto transition-opacity duration-300",
                        !isHeaderVisible && "opacity-0 pointer-events-none"
                    )}>
                        <div
                            onPointerDown={handleDragStart}
                            className={cn(isWindowed && "cursor-move")}
                        >
                            {file.type === 'pdf' ? (
                                <FilePdf className="text-muted-foreground shrink-0" size={24} weight="bold" />
                            ) : file.type === 'image' ? (
                                <ImageIcon className="text-muted-foreground shrink-0" size={24} weight="bold" />
                            ) : file.type === 'audio' ? (
                                <MusicNotes className="text-muted-foreground shrink-0" size={24} weight="bold" />
                            ) : (
                                <FilmStrip className="text-muted-foreground shrink-0" size={24} weight="bold" />
                            )}
                        </div>
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
                    <div className="flex items-center gap-3 shrink-0 pointer-events-auto">
                        <div className={cn(
                            "flex items-center gap-3 transition-all duration-300 ease-in-out",
                            !isHeaderVisible && "w-0 opacity-0 overflow-hidden"
                        )}>
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
                                
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-zinc-400 hover:text-white hover:bg-white/10" 
                                    title="Change Color"
                                    onClick={() => setColorPickerOpen(true)}
                                    style={{ color: file.color || undefined }}
                                >
                                    <Palette size={20} weight={file.color ? "fill" : "bold"} />
                                </Button>

                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-zinc-400 hover:text-red-400 hover:bg-red-400/10" 
                                    title="Delete"
                                    onClick={() => setDeleteDialogOpen(true)}
                                >
                                    <Trash size={20} weight="bold" />
                                </Button>
                            </div>

                            <div className="w-px h-6 bg-border mx-1" /> {/* Divider */}
                        </div>

                        <Button variant="ghost" size="icon" onClick={() => setIsHeaderVisible(!isHeaderVisible)} className="text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground" title={isHeaderVisible ? "Hide Top Bar" : "Show Top Bar"}>
                            {isHeaderVisible ? <EyeSlash weight="bold" size={24} /> : <Eye weight="bold" size={24} />}
                        </Button>

                        <Button variant="ghost" size="icon" onClick={handleToggleWindowed} className="text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground" title={isWindowed ? "Exit Window" : "Resize Window"}>
                            {isWindowed ? <CornersIn weight="bold" size={24} /> : <CornersOut weight="bold" size={24} />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleMinimize} className="text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground" title="Minimize">
                            <Minus weight="bold" size={24} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleClose} className="text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground" title="Close" data-sound-back>
                            <X weight="bold" size={24} />
                        </Button>
                    </div>
                </div>

                {/* Video/PDF Stage */}
                <div
                    className="flex-1 flex items-center justify-center bg-transparent relative overflow-hidden"
                    onClick={isMediaFile ? togglePlay : undefined}
                >
                    {/* Loading Spinner (only for video files) */}
                    {file.type === 'video' && isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50 pointer-events-none">
                            <CircleNotch className="animate-spin text-white/50" size={48} />
                        </div>
                    )}

                    {file.type === 'pdf' ? (
                        <div className="absolute inset-0 z-10">
                            <PDFPlayer
                                ref={pdfRef}
                                url={file.url || ""}
                                fileId={file.id}
                                onPageChange={() => { }}
                                onSelectionChange={setHasPdfSelection}
                                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                                isSidebarOpen={sidebarOpen}
                                showControls={showControls}
                                onHideControls={() => setShowControls(false)}
                                onToggleFullscreen={toggleFullscreen}
                                isFullscreen={isFullscreen}
                            />
                        </div>
                    ) : file.type === 'image' ? (
                        <div className="absolute inset-0 z-10">
                            <ImagePlayer
                                ref={imageRef}
                                url={file.url || ""}
                                fileId={file.id}
                                onSelectionChange={(hasSelection: boolean) => { /* Optional: update state if needed */ }}
                                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                                isSidebarOpen={sidebarOpen}
                                showControls={showControls}
                                onHideControls={() => setShowControls(false)}
                                onToggleFullscreen={toggleFullscreen}
                                isFullscreen={isFullscreen}
                            />
                        </div>
                    ) : file.type === 'audio' ? (
                        <div className="absolute inset-0 z-10 bg-zinc-950">
                        <AudioPlayer
                            url={file.url || ""}
                            fileId={file.id}
                            className="w-full h-full"
                            highlights={fileHighlights}
                        />
                    </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center overflow-hidden">
                            <div
                                    className={cn(isYouTube ? "w-full h-full" : "flex items-center justify-center w-full h-full")}
                                    style={{ transform: `scale(${zoomForFile})`, transformOrigin: "center" }}
                                >
                                    {isYouTube ? (
                                        <YouTubePlayerComponent
                                            ref={youtubeRef}
                                            url={file.url || ""}
                                            className="w-full h-full"
                                            onTimeUpdate={(t: number) => handleTimeUpdate(t)}
                                        onDurationChange={(d: number) => setDuration(d)}
                                        onEnded={() => setIsPlaying(false)}
                                        onPlay={() => {
                                            setIsPlaying(true);
                                            setIsLoading(false);
                                            addAmbientMusicSuppression('main-player');
                                        }}
                                        onPause={() => {
                                            setIsPlaying(false);
                                            removeAmbientMusicSuppression('main-player');
                                        }}
                                        onClick={togglePlay}
                                        initialTime={fileProgress[file.id] || 0}
                                    />
                                ) : (
                                <video
                                    ref={videoRef}
                                    src={file.url || ""}
                                    className="max-w-full max-h-full object-contain focus:outline-none"
                                    autoPlay={!disableMediaAutoplay}
                                    onWaiting={() => setIsLoading(true)}
                                    onCanPlay={() => setIsLoading(false)}
                                    onLoadedData={() => setIsLoading(false)}
                                    onError={(e: SyntheticEvent<HTMLVideoElement>) => {
                                        console.error("Video error:", e);
                                        setIsLoading(false);
                                    }}
                                    onPlay={() => {
                                        setIsPlaying(true);
                                        setIsLoading(false);
                                        addAmbientMusicSuppression('main-player');
                                    }}
                                    onPause={() => {
                                        setIsPlaying(false);
                                        removeAmbientMusicSuppression('main-player');
                                    }}
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    loop={isLooping}
                                />
                                )}
                            </div>
                            {showInitialMuteOverlay && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]" onClick={(e: MouseEvent) => e.stopPropagation()}>
                                    <div className="flex flex-col items-center gap-3">
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            onClick={(e: MouseEvent) => {
                                                e.stopPropagation();
                                                handleInitialUnmute();
                                            }}
                                            className="bg-black/60 text-white border-white/20 hover:bg-black/70"
                                        >
                                            Unmute Video
                                        </Button>
                                        <div className="flex flex-wrap items-center justify-center gap-2">
                                            {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((val) => (
                                                <Button
                                                    key={val}
                                                    size="xs"
                                                    variant="secondary"
                                                    onClick={(e: MouseEvent) => {
                                                        e.stopPropagation();
                                                        setQuickVolume(val);
                                                    }}
                                                    className="bg-black/40 text-white hover:bg-black/60"
                                                >
                                                    {Math.round(val * 100)}%
                                                </Button>
                                            ))}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e: MouseEvent) => {
                                                e.stopPropagation();
                                                setShowInitialMuteOverlay(false);
                                            }}
                                            className="bg-black/60 text-white border-white/20 hover:bg-black/70 mt-1"
                                        >
                                            Keep Muted
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom Bar (only for video files) */}
                {file.type === 'video' && (
                    <div
                        className={cn(
                            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent transition-opacity duration-300 z-30 pb-4 pt-8 px-4 pointer-events-none",
                            showControls ? "opacity-100" : "opacity-0"
                        )}
                    >
                        {/* Seekbar Row */}
                        <div
                            className="mb-4 px-2 group/seek relative pointer-events-auto"
                            ref={progressRef}
                            onMouseMove={handleSeekHover}
                            onMouseLeave={() => setHoverTime(null)}
                        >
                            {/* Timestamp Markers */}
                            <div className="absolute top-0 bottom-0 left-2 right-2 pointer-events-none z-10">
                                {fileHighlights.map((h: Highlight) => {
                                    const collection = collections.find((c: Collection) => c.id === h.collectionId);
                                    const color = collection ? collection.color : 'var(--primary)';
                                    return (
                                        <div
                                            key={h.id}
                                            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2 rounded-full opacity-60"
                                            style={{
                                                left: `${(h.start / duration) * 100}%`,
                                                backgroundColor: color,
                                                filter: 'brightness(0.9) saturate(0.9)'
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
                        <div className="flex items-center justify-between px-2 pointer-events-auto">
                            {/* Left: Play/Pause, Volume, Time */}
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={togglePlay}
                                    className="h-8 w-8 rounded-md bg-white/10 hover:bg-white/20 text-white"
                                >
                                    {isPlaying ? <Pause weight="fill" size={18} /> : <Play weight="fill" size={18} />}
                                </Button>

                                <div className="flex items-center group/vol">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleToggleMute}
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
                                                onValueChange={handleVolumeChange}
                                                thumbClassName="bg-white border-white shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Time Display */}
                                <div className="font-mono text-sm font-medium text-white/90 tracking-wide ml-2">
                                    {formatTime(currentTime)} <span className="text-white/40 mx-2">/</span> {formatTime(duration)}
                                </div>
                            </div>

                            {/* Right: Speed, PiP, Sidebar Toggle, Fullscreen */}
                            <div className="flex items-center gap-1">
                                {/* Loop Toggle */}
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setIsLooping(!isLooping)}
                                    className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", isLooping && "text-primary hover:text-primary/80")}
                                    title={isLooping ? "Loop On" : "Loop Off"}
                                >
                                    <Repeat weight="bold" size={18} />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleCaptureFrame}
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    title="Take Screenshot"
                                >
                                    <VideoCamera weight="bold" size={18} />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => fileId && setVideoZoomManualForFile(fileId, !isManualZoom)}
                                    className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", isManualZoom && "text-primary hover:text-primary/80")}
                                    title={isManualZoom ? "Manual Zoom On" : "Auto Zoom On"}
                                >
                                    <ArrowsClockwise weight="bold" size={18} />
                                </Button>
                                {isManualZoom && (
                                    <>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => fileId && isManualZoom && setVideoZoomForFile(fileId, clampZoom(zoomForFile - 0.1))}
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            title="Zoom Out"
                                        >
                                            <MagnifyingGlassMinus weight="bold" size={18} />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => fileId && isManualZoom && setVideoZoomForFile(fileId, clampZoom(zoomForFile + 0.1))}
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            title="Zoom In"
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
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground text-xs"
                                        >
                                            {playbackRate}x
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64 bg-popover border-border p-4" side="top" portalContainer={containerRef.current}>
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
                                                    onValueChange={(val: number[]) => setPlaybackRate(val[0])}
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
                                    <Desktop weight="bold" size={20} />
                                </Button>

                                <div className="w-px h-5 bg-border mx-1" />

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e: MouseEvent) => {
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
            )}

            {/* Sidebar (Full Height, Sibling to Player Container) */}
            {sidebarOpen && !activeHighlightForFile && (
                <motion.div
                    initial={enableSidebarAnimation ? { width: 0, opacity: 0 } : false}
                    animate={{ width: 320, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="bg-background border-l border-border flex flex-col shrink-0 z-20 overflow-hidden w-80 h-full min-h-0"
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
                    <ScrollArea className="flex-1 w-full min-h-0">
                        {fileHighlights.length === 0 ? (
                            <div className="text-muted-foreground text-xs text-center mt-4">No highlights yet.</div>
                        ) : (
                            fileHighlights.map((h: Highlight) => {
                                const collection = collections.find((c: Collection) => c.id === h.collectionId);
                                const borderColor = collection ? collection.color : 'transparent';
                                const collectionName = collection ? collection.name : null;

                                return (
                                    <div
                                        key={h.id}
                                        className="group flex flex-col gap-1.5 p-2 rounded-none border-l-4 transition-all relative overflow-hidden"
                                        style={{ borderLeftColor: borderColor }}
                                    >
                                        <div 
                                            className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
                                            style={{ backgroundColor: borderColor }}
                                        />
                                        <div className="flex items-center justify-between gap-2 h-6 relative z-10">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <button
                                                    className="text-primary font-mono text-xs bg-primary/10 px-1.5 py-0.5 rounded shrink-0 hover:bg-primary hover:text-primary-foreground transition-colors"
                                                    onClick={() => seekToHighlight(h)}
                                                >
                                                    {file.type === 'pdf'
                                                        ? (h.end && h.end !== h.start
                                                            ? `Page ${h.start}-${h.end}`
                                                            : `Page ${h.start}`)
                                                        : file.type === 'image'
                                                            ? 'View Region'
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
                                                <button
                                                    className="p-1 px-1.5 text-xs bg-muted hover:bg-accent text-muted-foreground hover:text-foreground rounded flex items-center gap-1"
                                                    onClick={(e: MouseEvent) => {
                                                        e.stopPropagation();
                                                        setSelectedHighlightId(h.id);
                                                        setActiveHighlight(h.id);
                                                    }}
                                                    title="Open Highlight"
                                                >
                                                    <Play weight="fill" size={10} />
                                                </button>
                                                <button
                                                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
                                                    onClick={(e: MouseEvent) => {
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
                                                    onClick={(e: MouseEvent) => {
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
                                            <ExpandableNote text={h.note} />
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
                container={containerRef.current}
            />

            <EditFileDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                file={file}
                onSave={(updates) => updateFile(file.id, updates)}
                container={containerRef.current}
            />

            <EditHighlightDialog
                open={editHighlightOpen}
                onOpenChange={(open) => {
                    setEditHighlightOpen(open);
                }}
                highlight={selectedHighlight}
                file={file}
                collections={collections.filter((c: Collection) => c.projectId === activeProjectId && !c.deleted)}
                onSave={(updates) => selectedHighlight && updateHighlight(selectedHighlight.id, updates)}
                container={containerRef.current}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent portalContainer={containerRef.current}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will move the file to trash. You can restore it later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            trashFile(file.id);
                            navigate(-1);
                        }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <ScreenshotDialog
                open={isScreenshotDialogOpen}
                onOpenChange={setIsScreenshotDialogOpen}
                imageUrl={screenshotUrl}
                container={containerRef.current}
            />
        </div>
        </>
    );
}
