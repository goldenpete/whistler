/**
 * ─── VideoPlayer.tsx ─────────────────────────────────────────────────────────
 *
 * Full-featured video player component with custom UI controls.
 *
 * Features:
 *   - Custom play/pause, seek bar, volume, fullscreen controls
 *   - Highlight/timestamp system: create, edit, delete time-range annotations
 *   - Seek preview thumbnails on hover over the progress bar
 *   - Picture-in-Picture (PiP) support
 *   - Per-file zoom level (manual or auto-fit)
 *   - Playback speed control (0.25x–4x)
 *   - Looping with optional A–B loop range
 *   - Keyboard shortcuts (space, arrows, etc.)
 *   - Collection association for highlights
 *   - Per-file volume + mute state persistence
 *   - Auto-resume from last playback position
 *   - Ambient music suppression while video plays
 *
 * Props pattern:
 *   Receives url, fileId, optional highlight list and callbacks.
 *   Uses forwardRef + useImperativeHandle to expose control methods
 *   (play, pause, seek, zoom, addHighlight) to parent FileView.
 *
 * Largest component in the app (~1,700 lines).
 * Consider extracting: HighlightPanel, ControlBar, SeekBar as sub-components
 * if this file becomes difficult to edit.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ImageCapture API type (experimental browser API, no built-in TS types)
declare class ImageCapture {
    constructor(track: MediaStreamTrack);
    grabFrame(): Promise<ImageBitmap>;
}

import { useEffect, useRef, useState, type MouseEvent, type SyntheticEvent, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useStore, type AppStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { useParams, useNavigate } from "react-router-dom";
import { cn, clamp, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { motion, AnimatePresence } from "framer-motion";
import { PDFPlayer } from './PDFPlayer';
import type { PDFPlayerHandle } from './PDFPlayer';
import { ImagePlayer } from './ImagePlayer';
import type { ImagePlayerHandle } from './ImagePlayer';
import type { Highlight, File as AppFile, Collection } from "@/types";
import { AudioPlayer, type AudioPlayerHandle } from './AudioPlayer';
import { SeekPreview } from './SeekPreview';
import { YouTubePlayerComponent, type YouTubePlayerHandle, getYouTubeId } from '@/components/player/YouTubePlayer';
import { getYouTubeThumbnailUrl } from '@/constants';

import { EditFileDialog } from "@/components/dialogs/FileDialogs";
import { HighlightPlayerDialog, EditHighlightDialog } from "@/components/dialogs/HighlightDialogs";
import { MoveFileDialog } from "@/components/dialogs/MoveFileDialog";
import { useKeybind } from "@/hooks/use-keybind";
import { playSfx } from "@/utils/sound";
import { isValidUrl } from "@/utils/security";
import { HighlightsSidebar } from "@/components/player/HighlightsSidebar";
import { useResolvedFileUrl } from "@/hooks/useResolvedFileUrl";
import {
    getDisplaySourceLabel,
    getOpenUrlForFile,
    getShareUrlForFile,
    isLocalFile,
} from "@/utils/localFiles";
import { LocalFileAccessPanel } from "@/components/player/LocalFileAccessPanel";

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

/* ═══════════════════════════════════════════════════════
   STORE BINDINGS & STATE
   ═══════════════════════════════════════════════════════ */
export default function VideoPlayer({ fileIdOverride, floating = false, isMinimized: isMinimizedProp, windowZIndex, onFocus, onMinimize, onClose, onExitFloating }: VideoPlayerProps) {
    const { id: routeFileId } = useParams() as { id?: string };
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
        muteHighlightsUntilUnmuted,
        rememberMediaVolume,
        disableMediaAutoplay,
        videoVolumeByFile,
        videoUnmutedByFile,
        setVideoVolumeForFile,
        setVideoUnmutedForFile,
        alwaysShowMuteOverlay,
        hideSeekbarProgressTrail
    } = useStore(useShallow((state) => ({
        files: state.files,
        highlights: state.highlights,
        collections: state.collections,
        addVideoHighlight: state.addVideoHighlight,
        removeHighlight: state.removeHighlight,
        updateHighlight: state.updateHighlight,
        updateFile: state.updateFile,
        activeCollectionId: state.activeCollectionId,
        activeProjectId: state.activeProjectId,
        activeHighlightId: state.activeHighlightId,
        setActiveHighlight: state.setActiveHighlight,
        setPipFile: state.setPipFile,
        togglePip: state.togglePip,
        isPipOpen: state.isPipOpen,
        pipFileId: state.pipFileId,
        fileProgress: state.fileProgress,
        setFileProgress: state.setFileProgress,
        isSidebarOpen: state.isSidebarOpen,
        toggleSidebar: state.toggleSidebar,
        addAmbientMusicSuppression: state.addAmbientMusicSuppression,
        removeAmbientMusicSuppression: state.removeAmbientMusicSuppression,
        trashFile: state.trashFile,
        addFloatingPlayer: state.addFloatingPlayer,
        setFloatingPlayerMinimized: state.setFloatingPlayerMinimized,
        windowOutlineEnabled: state.windowOutlineEnabled,
        videoZoomByFile: state.videoZoomByFile,
        setVideoZoomForFile: state.setVideoZoomForFile,
        videoZoomManualByFile: state.videoZoomManualByFile,
        setVideoZoomManualForFile: state.setVideoZoomManualForFile,
        muteNewVideosUntilUnmuted: state.muteNewVideosUntilUnmuted,
        muteHighlightsUntilUnmuted: state.muteHighlightsUntilUnmuted,
        rememberMediaVolume: state.rememberMediaVolume,
        disableMediaAutoplay: state.disableMediaAutoplay,
        videoVolumeByFile: state.videoVolumeByFile,
        videoUnmutedByFile: state.videoUnmutedByFile,
        setVideoVolumeForFile: state.setVideoVolumeForFile,
        setVideoUnmutedForFile: state.setVideoUnmutedForFile,
        alwaysShowMuteOverlay: state.alwaysShowMuteOverlay,
        hideSeekbarProgressTrail: state.hideSeekbarProgressTrail,
    })));
    const videoRef = useRef<HTMLVideoElement>(null);
    const youtubeRef = useRef<YouTubePlayerHandle>(null);
    const pdfRef = useRef<PDFPlayerHandle>(null);
    const imageRef = useRef<ImagePlayerHandle>(null);
    const audioRef = useRef<AudioPlayerHandle>(null);
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
    const [isCaptureConfirmOpen, setIsCaptureConfirmOpen] = useState(false);
    const [screenshotUrl, setScreenshotUrlRaw] = useState<string | null>(null);
    const screenshotBlobUrl = useRef<string | null>(null);
    const tempScreenshotVideo = useRef<HTMLVideoElement | null>(null);
    const setScreenshotUrl = (url: string | null) => {
        if (screenshotBlobUrl.current && screenshotBlobUrl.current.startsWith('blob:')) {
            URL.revokeObjectURL(screenshotBlobUrl.current);
        }
        screenshotBlobUrl.current = url && url.startsWith('blob:') ? url : null;
        setScreenshotUrlRaw(url);
    };

    const file = files.find(f => f.id === fileId);
    const { resolvedUrl, availability, requestAccess, relink } = useResolvedFileUrl(file);
    const isYouTube = resolvedUrl ? (resolvedUrl.includes('youtube.com') || resolvedUrl.includes('youtu.be')) : false;
    const [localUrl, setLocalUrl] = useState(file?.url || "");
    const displaySourceLabel = file ? getDisplaySourceLabel(file, resolvedUrl) : "";

    useEffect(() => {
        setLocalUrl(isLocalFile(file) ? "" : (file?.url || ""));
    }, [file?.url, file]);

    const handleUrlUpdate = () => {
        if (!file || isLocalFile(file)) {
            return;
        }

        if (file && localUrl !== file.url) {
            if (localUrl && !isValidUrl(localUrl)) {
                alert("Invalid or unsafe URL protocol.");
                setLocalUrl(file.url || "");
                return;
            }
            updateFile(file.id, { url: localUrl });
        }
    };

    /* ═══════════════════════════════════════════════════════
       SCREENSHOT CAPTURE
       ═══════════════════════════════════════════════════════ */
    const handleCaptureFrame = async () => {
        if (isYouTube && file && resolvedUrl) {
            const videoId = getYouTubeId(resolvedUrl);
            if (videoId) {
                const maxResUrl = getYouTubeThumbnailUrl(videoId, 'maxresdefault');
                const hqUrl = getYouTubeThumbnailUrl(videoId, 'hqdefault');
                
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
                setIsCaptureConfirmOpen(true);
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
                // Canvas is tainted — fall through to CORS-enabled capture below.
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
            tempScreenshotVideo.current = tempVideo;

            const cleanup = () => {
                if (tempVideo.parentNode) {
                    document.body.removeChild(tempVideo);
                }
                tempScreenshotVideo.current = null;
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
            const imageCapture = new ImageCapture(track);
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
            
            // Check if we are viewing a highlight
            const isViewingHighlight = activeHighlightId && highlights.find((h: Highlight) => h.id === activeHighlightId)?.fileId === fileId;

            const shouldMuteForFirstOpen = muteNewVideosUntilUnmuted && 
                (alwaysShowMuteOverlay || !videoUnmutedByFile[fileId]) &&
                (!isViewingHighlight || muteHighlightsUntilUnmuted);

            setIsMuted(shouldMuteForFirstOpen);
            setShowInitialMuteOverlay(shouldMuteForFirstOpen);
            if (videoRef.current) videoRef.current.muted = shouldMuteForFirstOpen;
            if (youtubeRef.current) youtubeRef.current.muted = shouldMuteForFirstOpen;
        }
    }, [file, fileId, rememberMediaVolume, videoVolumeByFile, muteNewVideosUntilUnmuted, videoUnmutedByFile, alwaysShowMuteOverlay, muteHighlightsUntilUnmuted, activeHighlightId, highlights]);

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

    /* ═══════════════════════════════════════════════════════
       PLAYBACK CONTROLS
       ═══════════════════════════════════════════════════════ */
    const togglePlay = () => {
        if (!isMediaFile) return;

        if (file?.type === 'audio') {
            audioRef.current?.togglePlay();
            return;
        }

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
        if (file?.type === 'audio') {
            audioRef.current?.setVolume(newVolume);
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
        if (file?.type === 'audio') {
            audioRef.current?.toggleMute();
        }
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

    /* ═══════════════════════════════════════════════════════
       WINDOW MANAGEMENT
       ═══════════════════════════════════════════════════════ */
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

    const clampZoom = (value: number) => clamp(value, 0.5, 2);

    const handleDragStart = (e: React.PointerEvent) => {
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

    /* ═══════════════════════════════════════════════════════
       KEYBOARD SHORTCUTS
       ═══════════════════════════════════════════════════════ */
    // --- Shortcuts ---
    // --- Shortcuts ---
    
    const handlePlayPause = () => togglePlay();
    useKeybind("video.playPause", handlePlayPause, { preventDefault: true, disableInInput: true });
    useKeybind("audio.playPause", handlePlayPause, { preventDefault: true, disableInInput: true });

    useKeybind("video.fullscreen", toggleFullscreen, { preventDefault: true, disableInInput: true });

    useKeybind("video.mute", handleToggleMute, { preventDefault: true, disableInInput: true });
    useKeybind("audio.mute", handleToggleMute, { preventDefault: true, disableInInput: true });

    useKeybind("video.screenshot", handleCaptureFrame, { preventDefault: true, disableInInput: true });

    // Seek 10s
    useKeybind("video.seekBack10", () => {
        if (isYouTube && youtubeRef.current) youtubeRef.current.currentTime -= 10;
        else if (videoRef.current) videoRef.current.currentTime -= 10;
    }, { preventDefault: true, disableInInput: true });

    useKeybind("audio.seekBack10", () => {
        if (file?.type === 'audio') audioRef.current?.seekRelative(-10);
    }, { preventDefault: true, disableInInput: true });

    useKeybind("video.seekFwd10", () => {
        if (isYouTube && youtubeRef.current) youtubeRef.current.currentTime += 10;
        else if (videoRef.current) videoRef.current.currentTime += 10;
    }, { preventDefault: true, disableInInput: true });

    useKeybind("audio.seekFwd10", () => {
        if (file?.type === 'audio') audioRef.current?.seekRelative(10);
    }, { preventDefault: true, disableInInput: true });

    // Seek 5s / Page Nav
    useKeybind("video.seekBack5", () => {
        if (isYouTube && youtubeRef.current) youtubeRef.current.currentTime -= 5;
        else if (videoRef.current) videoRef.current.currentTime -= 5;
    }, { preventDefault: true, disableInInput: true });

    useKeybind("audio.seekBack5", () => {
        if (file?.type === 'audio') audioRef.current?.seekRelative(-5);
    }, { preventDefault: true, disableInInput: true });

    useKeybind("pdf.prevPage", () => {
        if (file?.type === 'pdf') pdfRef.current?.prevPage();
    }, { preventDefault: true, disableInInput: true });

    useKeybind("video.seekFwd5", () => {
        if (isYouTube && youtubeRef.current) youtubeRef.current.currentTime += 5;
        else if (videoRef.current) videoRef.current.currentTime += 5;
    }, { preventDefault: true, disableInInput: true });

    useKeybind("audio.seekFwd5", () => {
        if (file?.type === 'audio') audioRef.current?.seekRelative(5);
    }, { preventDefault: true, disableInInput: true });

    useKeybind("pdf.nextPage", () => {
        if (file?.type === 'pdf') pdfRef.current?.nextPage();
    }, { preventDefault: true, disableInInput: true });

    // Zoom
    useKeybind("pdf.zoomIn", () => {
        if (file?.type === 'pdf') pdfRef.current?.zoomIn();
    }, { preventDefault: true, disableInInput: true });
    
    useKeybind("image.zoomIn", () => {
        if (file?.type === 'image') imageRef.current?.zoomIn();
    }, { preventDefault: true, disableInInput: true });

    useKeybind("pdf.zoomOut", () => {
        if (file?.type === 'pdf') pdfRef.current?.zoomOut();
    }, { preventDefault: true, disableInInput: true });

    useKeybind("image.zoomOut", () => {
        if (file?.type === 'image') imageRef.current?.zoomOut();
    }, { preventDefault: true, disableInInput: true });

    useKeybind("image.resetZoom", () => {
        if (file?.type === 'image') imageRef.current?.resetZoom();
    }, { preventDefault: true, disableInInput: true });

    // Volume
    useKeybind("video.volUp", () => {
        const newVolume = Math.min(1, volume + 0.1);
        handleVolumeChange([newVolume]);
    }, { preventDefault: true, disableInInput: true });

    useKeybind("video.volDown", () => {
        const newVolume = Math.max(0, volume - 0.1);
        handleVolumeChange([newVolume]);
    }, { preventDefault: true, disableInInput: true });

    // Close
    useKeybind("video.close", handleClose, { preventDefault: true, disableInInput: true });
    useKeybind("audio.close", handleClose, { preventDefault: true, disableInInput: true });
    useKeybind("pdf.close", handleClose, { preventDefault: true, disableInInput: true });
    useKeybind("image.close", handleClose, { preventDefault: true, disableInInput: true });
    // --- End Shortcuts ---

    const handleCopyUrl = () => {
        if (!file) return;
        navigator.clipboard.writeText(getShareUrlForFile(file));
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
        if (!file) return;
        window.open(getOpenUrlForFile(file, resolvedUrl), '_blank');
    };

    const handleShare = async () => {
        if (!file) return;

        const shareUrl = getShareUrlForFile(file);

        if (navigator.share) {
            try {
                await navigator.share({
                    title: file.name,
                    url: shareUrl
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

    const seekHoverRaf = useRef<number>(0);
    const handleSeekHover = (e: MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || !file || (file.type !== 'video' && file.type !== 'audio')) return;

        const clientX = e.clientX;
        cancelAnimationFrame(seekHoverRaf.current);
        seekHoverRaf.current = requestAnimationFrame(() => {
            if (!progressRef.current) return;
            const rect = progressRef.current.getBoundingClientRect();
            const x = clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));
            const time = percentage * duration;

            setHoverTime(time);
            setHoverX(x);
        });
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

    // --- Slash Command / Action Integration ---
    const actionHandlersRef = useRef({ togglePlay, handleAddHighlight, handleCaptureFrame });
    useEffect(() => {
        actionHandlersRef.current = { togglePlay, handleAddHighlight, handleCaptureFrame };
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps -- event listeners use refs, no need to re-register
    useEffect(() => {
        const handlePdfNext = () => pdfRef.current?.nextPage();
        const handlePdfPrev = () => pdfRef.current?.prevPage();
        const handlePdfZoomIn = () => pdfRef.current?.zoomIn();
        const handlePdfZoomOut = () => pdfRef.current?.zoomOut();

        const handleImageZoomIn = () => imageRef.current?.zoomIn();
        const handleImageZoomOut = () => imageRef.current?.zoomOut();
        const handleImageReset = () => imageRef.current?.resetZoom();

        const handleAudioPlay = () => audioRef.current?.play();
        const handleAudioPause = () => audioRef.current?.pause();
        const handleAudioMute = () => audioRef.current?.mute();
        const handleAudioUnmute = () => audioRef.current?.unmute();
        const handleAudioSeekForward = () => audioRef.current?.seekRelative(10);
        const handleAudioSeekBackward = () => audioRef.current?.seekRelative(-10);

        const handleMediaPlay = () => actionHandlersRef.current.togglePlay();
        const handleMediaPause = () => {
             if (videoRef.current) videoRef.current.pause();
             if (youtubeRef.current) youtubeRef.current.pause();
             if (audioRef.current) audioRef.current.pause();
             setIsPlaying(false);
        };
        const handleMediaMute = () => setIsMuted(true);
        const handleMediaUnmute = () => setIsMuted(false);
        const handleScreenshot = () => actionHandlersRef.current.handleCaptureFrame();
        const handleHighlight = () => actionHandlersRef.current.handleAddHighlight();
        
        window.addEventListener("trigger-pdf-next", handlePdfNext);
        window.addEventListener("trigger-pdf-prev", handlePdfPrev);
        window.addEventListener("trigger-pdf-zoom-in", handlePdfZoomIn);
        window.addEventListener("trigger-pdf-zoom-out", handlePdfZoomOut);

        window.addEventListener("trigger-image-zoom-in", handleImageZoomIn);
        window.addEventListener("trigger-image-zoom-out", handleImageZoomOut);
        window.addEventListener("trigger-image-reset", handleImageReset);

        window.addEventListener("trigger-audio-play", handleAudioPlay);
        window.addEventListener("trigger-audio-pause", handleAudioPause);
        window.addEventListener("trigger-audio-mute", handleAudioMute);
        window.addEventListener("trigger-audio-unmute", handleAudioUnmute);
        window.addEventListener("trigger-audio-seek-forward", handleAudioSeekForward);
        window.addEventListener("trigger-audio-seek-backward", handleAudioSeekBackward);
        
        window.addEventListener("trigger-play", handleMediaPlay);
        window.addEventListener("trigger-pause", handleMediaPause);
        window.addEventListener("trigger-mute", handleMediaMute);
        window.addEventListener("trigger-unmute", handleMediaUnmute);
        window.addEventListener("trigger-screenshot", handleScreenshot);
        window.addEventListener("trigger-highlight", handleHighlight);

        return () => {
            window.removeEventListener("trigger-pdf-next", handlePdfNext);
            window.removeEventListener("trigger-pdf-prev", handlePdfPrev);
            window.removeEventListener("trigger-pdf-zoom-in", handlePdfZoomIn);
            window.removeEventListener("trigger-pdf-zoom-out", handlePdfZoomOut);

            window.removeEventListener("trigger-image-zoom-in", handleImageZoomIn);
            window.removeEventListener("trigger-image-zoom-out", handleImageZoomOut);
            window.removeEventListener("trigger-image-reset", handleImageReset);

            window.removeEventListener("trigger-audio-play", handleAudioPlay);
            window.removeEventListener("trigger-audio-pause", handleAudioPause);
            window.removeEventListener("trigger-audio-mute", handleAudioMute);
            window.removeEventListener("trigger-audio-unmute", handleAudioUnmute);
            window.removeEventListener("trigger-audio-seek-forward", handleAudioSeekForward);
            window.removeEventListener("trigger-audio-seek-backward", handleAudioSeekBackward);
            
            window.removeEventListener("trigger-play", handleMediaPlay);
            window.removeEventListener("trigger-pause", handleMediaPause);
            window.removeEventListener("trigger-mute", handleMediaMute);
            window.removeEventListener("trigger-unmute", handleMediaUnmute);
            window.removeEventListener("trigger-screenshot", handleScreenshot);
            window.removeEventListener("trigger-highlight", handleHighlight);
        };
    }, []);

    // Cleanup orphaned temp video element on unmount
    useEffect(() => {
        return () => {
            if (tempScreenshotVideo.current?.parentNode) {
                document.body.removeChild(tempScreenshotVideo.current);
                tempScreenshotVideo.current = null;
            }
        };
    }, []);

    /* ═══════════════════════════════════════════════════════
       JSX RENDER
       ═══════════════════════════════════════════════════════ */
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
                            <div className="flex items-center gap-3 flex-nowrap min-w-0">
                                <div className="flex items-center gap-2 group/edit cursor-pointer shrink-0" onClick={() => setEditOpen(true)}>
                                    <h1 className="text-white font-medium text-base truncate max-w-[200px] sm:max-w-[300px]">{file.name}</h1>
                                </div>
                                <div 
                                    className="flex items-center gap-2 group/url cursor-pointer min-w-0 shrink" 
                                    onClick={(e: MouseEvent) => {
                                        e.stopPropagation();
                                        setEditOpen(true);
                                    }}
                                >
                                    <span className="text-xs text-blue-400 truncate max-w-[150px] sm:max-w-[200px] hover:underline font-mono">
                                        {isLocalFile(file) ? displaySourceLabel : (localUrl || "Add URL...")}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 min-w-0">
                                <div className="flex items-center gap-2 group/desc cursor-pointer min-w-0" onClick={() => setEditOpen(true)}>
                                    <span className="text-muted-foreground text-xs truncate max-w-[250px] sm:max-w-[400px] block">{file.description || "Click to add description..."}</span>
                                    <PencilSimple className="text-muted-foreground opacity-0 group-hover/desc:opacity-100 transition-opacity shrink-0" size={12} weight="bold" />
                                </div>
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
                                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/10" title="Open Link" onClick={() => { playSfx('cursor'); handleOpenLink(); }}>
                                    <ArrowSquareOut size={20} weight="bold" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/10" title="Copy URL" onClick={() => { playSfx('cursor'); handleCopyUrl(); }}>
                                    <Copy size={20} weight="bold" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/10" title="Share" onClick={() => { playSfx('cursor'); handleShare(); }}>
                                    <ShareNetwork size={20} weight="bold" />
                                </Button>
                            </div>

                            <div className="w-px h-6 bg-white/20 mx-1" /> {/* Divider */}

                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/10" title="Move to Folder" onClick={() => { playSfx('cursor'); setMoveDialogOpen(true); }}>
                                    <FolderPlus size={20} weight="bold" />
                                </Button>
                                
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-zinc-400 hover:text-white hover:bg-white/10" 
                                    title="Change Color"
                                    onClick={() => { playSfx('cursor'); setColorPickerOpen(true); }}
                                    style={{ color: file.color || undefined }}
                                >
                                    <Palette size={20} weight={file.color ? "fill" : "bold"} />
                                </Button>

                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-zinc-400 hover:text-red-400 hover:bg-red-400/10" 
                                    title="Delete"
                                    onClick={() => { playSfx('cursor'); setDeleteDialogOpen(true); }}
                                >
                                    <Trash size={20} weight="bold" />
                                </Button>
                            </div>

                            <div className="w-px h-6 bg-border mx-1" /> {/* Divider */}
                        </div>

                        <Button variant="ghost" size="icon" onClick={() => { playSfx('cursor'); setIsHeaderVisible(!isHeaderVisible); }} className="text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground" title={isHeaderVisible ? "Hide Top Bar" : "Show Top Bar"}>
                            {isHeaderVisible ? <EyeSlash weight="bold" size={24} /> : <Eye weight="bold" size={24} />}
                        </Button>

                        <Button variant="ghost" size="icon" onClick={() => { playSfx('cursor'); handleToggleWindowed(); }} className="text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground" title={isWindowed ? "Exit Window" : "Resize Window"}>
                            {isWindowed ? <CornersIn weight="bold" size={24} /> : <CornersOut weight="bold" size={24} />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { playSfx('cursor'); handleMinimize(); }} className="text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground" title="Minimize">
                            <Minus weight="bold" size={24} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { playSfx('cursor'); handleClose(); }} className="text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground" title="Close" data-sound-back>
                            <X weight="bold" size={24} />
                        </Button>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════
                   JSX: MEDIA STAGE
                   ═══════════════════════════════════════════════════════ */}
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

                    {isLocalFile(file) && !resolvedUrl ? (
                            <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/30">
                            <LocalFileAccessPanel
                                file={file}
                                availability={availability}
                                onRequestAccess={requestAccess}
                                onRelink={relink}
                            />
                        </div>
                    ) : file.type === 'pdf' ? (
                        <div className="absolute inset-0 z-10">
                            <PDFPlayer
                                ref={pdfRef}
                                url={resolvedUrl || ""}
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
                                url={resolvedUrl || ""}
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
                            ref={audioRef}
                            url={resolvedUrl || ""}
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
                                            url={resolvedUrl || ""}
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
                                    src={resolvedUrl || ""}
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
                                    onTimeUpdate={() => handleTimeUpdate()}
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
                                    const startPct = (h.start / duration) * 100;
                                    const hasRange = h.end && h.end > h.start;
                                    const widthPct = hasRange ? ((h.end! - h.start) / duration) * 100 : 0;
                                    
                                    return (
                                        <div
                                            key={h.id}
                                            className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full opacity-60"
                                            style={{
                                                left: `${startPct}%`,
                                                width: hasRange ? `${widthPct}%` : '4px',
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
                                hideRange={hideSeekbarProgressTrail}
                            />
                        </div>

                        {/* Controls Row */}
                        <div className="flex items-center justify-between px-2 pointer-events-auto">
                            {/* Left: Play/Pause, Volume, Time */}
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => { playSfx('cursor'); togglePlay(); }}
                                    className="h-8 w-8 rounded-md bg-white/10 hover:bg-white/20 text-white"
                                >
                                    {isPlaying ? <Pause weight="fill" size={18} /> : <Play weight="fill" size={18} />}
                                </Button>

                                <div className="flex items-center group/vol">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => { playSfx('cursor'); handleToggleMute(); }}
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
                                    onClick={() => { playSfx('cursor'); setIsLooping(!isLooping); }}
                                    className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", isLooping && "text-primary hover:text-primary/80")}
                                    title={isLooping ? "Loop On" : "Loop Off"}
                                >
                                    <Repeat weight="bold" size={18} />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => { playSfx('cursor'); handleCaptureFrame(); }}
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    title="Take Screenshot"
                                >
                                    <VideoCamera weight="bold" size={18} />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => { playSfx('cursor'); if (fileId) setVideoZoomManualForFile(fileId, !isManualZoom); }}
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
                                            onClick={() => { playSfx('cursor'); if (fileId && isManualZoom) setVideoZoomForFile(fileId, clampZoom(zoomForFile - 0.1)); }}
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            title="Zoom Out"
                                        >
                                            <MagnifyingGlassMinus weight="bold" size={18} />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => { playSfx('cursor'); if (fileId && isManualZoom) setVideoZoomForFile(fileId, clampZoom(zoomForFile + 0.1)); }}
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
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { playSfx('cursor'); setPlaybackRate(Math.max(0.25, playbackRate - 0.05)); }}>
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
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { playSfx('cursor'); setPlaybackRate(Math.min(8, playbackRate + 0.05)); }}>
                                                    <Plus weight="bold" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 8.0].map((rate) => (
                                                    <button
                                                        key={rate}
                                                        onClick={() => { playSfx('cursor'); setPlaybackRate(rate); }}
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

                                <Button variant="ghost" size="icon" onClick={() => { playSfx('cursor'); handleTogglePip(); }} className="text-muted-foreground hover:text-foreground" title="Picture in Picture">
                                    <Desktop weight="bold" size={20} />
                                </Button>

                                <div className="w-px h-5 bg-border mx-1" />

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
                                    onClick={() => { playSfx('cursor'); setSidebarOpen(!sidebarOpen); }}
                                    className={cn(
                                        "text-muted-foreground hover:text-foreground",
                                        sidebarOpen && "text-primary hover:text-primary"
                                    )}
                                >
                                    <SidebarSimple weight="bold" size={20} />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => { playSfx('cursor'); toggleFullscreen(); }} className="text-muted-foreground hover:text-foreground">
                                    {isFullscreen ? <CornersIn weight="bold" size={20} /> : <CornersOut weight="bold" size={20} />}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
            )}

            {/* Sidebar (Full Height, Sibling to Player Container) */}
            <AnimatePresence>
                {sidebarOpen && !activeHighlightForFile && (
                    <motion.div
                        key="sidebar"
                        initial={enableSidebarAnimation ? { width: 0, opacity: 0 } : false}
                        animate={{ width: 320, opacity: 1 }}
                        exit={enableSidebarAnimation ? { width: 0, opacity: 0 } : undefined}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="bg-background border-l border-border flex flex-col shrink-0 z-20 overflow-hidden w-80 h-full min-h-0"
                    >
                        <HighlightsSidebar
                            file={file}
                            highlights={fileHighlights}
                            collections={collections}
                            hasPdfSelection={hasPdfSelection}
                            onAddHighlight={handleAddHighlight}
                            onSeekToHighlight={seekToHighlight}
                            onOpenHighlight={(id) => {
                                setSelectedHighlightId(id);
                                setActiveHighlight(id);
                            }}
                            onEditHighlight={(id) => {
                                setSelectedHighlightId(id);
                                setEditHighlightOpen(true);
                            }}
                            onDeleteHighlight={removeHighlight}
                        />
                </motion.div>
            )}
            </AnimatePresence>

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

            <AlertDialog open={isCaptureConfirmOpen} onOpenChange={setIsCaptureConfirmOpen}>
                <AlertDialogContent portalContainer={containerRef.current}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Capture Screenshot</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cannot capture screenshot directly because the video server blocks access.
                            <br /><br />
                            Do you want to use Screen Capture instead?
                            <br />
                            (You will need to select this tab/window and then crop the image)
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleScreenCapture()}>
                            OK
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

            <Dialog open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                <DialogContent className="sm:max-w-sm bg-zinc-950 border-zinc-800" portalContainer={containerRef.current}>
                    <DialogHeader>
                        <DialogTitle>Change Accent Color</DialogTitle>
                        <DialogDescription>
                            Choose a color to identify this file throughout the app.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <ColorPicker
                            color={file.color ?? ""}
                            onChange={(color) => updateFile(file.id, { color })}
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setColorPickerOpen(false)}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        </>
    );
}
