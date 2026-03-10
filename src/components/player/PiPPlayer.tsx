/**
 * ─── PiPPlayer.tsx ─────────────────────────────────────────────────
 *
 * Picture-in-Picture mini video player that appears as a compact
 * overlay, allowing playback to continue while browsing other views.
 *
 * Features:
 *   - Compact video overlay with play/pause and mute toggles
 *   - Progress restoration from saved file progress state
 *   - Expand to full file view or close PiP
 *   - Sidebar-collapse-aware positioning
 *   - Continuous progress tracking via timeupdate events
 *
 * Props: isCollapsed (sidebar state for layout adjustment)
 * Exports: PiPPlayer component
 * Related: useStore (pipFileId, isPipOpen), VideoPlayer
 * ───────────────────────────────────────────────────────────────────
 */
import { useRef, useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play, Pause, X, ArrowsOutSimple, SpeakerSimpleHigh, SpeakerSimpleSlash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useResolvedFileUrl } from "@/hooks/useResolvedFileUrl";

interface PiPPlayerProps {
    isCollapsed: boolean;
}

export function PiPPlayer({ isCollapsed }: PiPPlayerProps) {
    const navigate = useNavigate();
    const { pipFileId, isPipOpen, setPipFile, togglePip, files, fileProgress, setFileProgress } = useStore(useShallow((state) => ({
        pipFileId: state.pipFileId,
        isPipOpen: state.isPipOpen,
        setPipFile: state.setPipFile,
        togglePip: state.togglePip,
        files: state.files,
        fileProgress: state.fileProgress,
        setFileProgress: state.setFileProgress,
    })));
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);

    const file = pipFileId ? files.find(f => f.id === pipFileId) : null;
    const { resolvedUrl } = useResolvedFileUrl(file);

    useEffect(() => {
        if (videoRef.current) {
            // Restore progress
            if (file && fileProgress[file.id] && Math.abs(videoRef.current.currentTime - fileProgress[file.id]) > 1) {
                videoRef.current.currentTime = fileProgress[file.id];
            }

            if (isPlaying) {
                videoRef.current.play().catch(() => setIsPlaying(false));
            } else {
                videoRef.current.pause();
            }
        }
    }, [isPlaying, file?.id]); // Re-run when file changes


    if (!isPipOpen || !file || !resolvedUrl) return null;

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsPlaying(!isPlaying);
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMuted(!isMuted);
    };

    const handleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current && file) {
            setFileProgress(file.id, videoRef.current.currentTime);
        }
        setPipFile(null); // Close PiP
        navigate(`/file/${file.id}`);
    };

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current && file) {
            setFileProgress(file.id, videoRef.current.currentTime);
        }
        togglePip(false);
        setPipFile(null);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current && file) {
            const time = videoRef.current.currentTime;
            if (Math.abs(time - (fileProgress[file.id] || 0)) > 2) {
                setFileProgress(file.id, time);
            }
        }
    };

    return (
        <div className="relative group">
            {/* Main Container */}
            <div className={cn(
                "relative bg-transparent overflow-hidden flex items-center justify-center",
                isCollapsed ? "h-10 w-10 mx-auto rounded-md" : "h-[120px] w-full rounded-md" // Aspect ratio placeholder
            )}>
                {/* Video */}
                <video
                    ref={videoRef}
                    src={resolvedUrl}
                    className="w-full h-full object-cover"
                    muted={isMuted}
                    loop
                    onTimeUpdate={handleTimeUpdate}
                />

                {/* Overlays (Only visible when not collapsed) */}
                {!isCollapsed && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <div className="flex justify-between items-start">
                            <span className="text-[10px] text-white font-medium truncate flex-1 drop-shadow-md">
                                {file.name}
                            </span>
                            <button onClick={handleClose} className="text-white/80 hover:text-white">
                                <X size={14} weight="bold" />
                            </button>
                        </div>

                        <div className="flex justify-center gap-3 items-center">
                            <button onClick={handleExpand} className="text-white/80 hover:text-white" title="Expand">
                                <ArrowsOutSimple size={16} weight="bold" />
                            </button>
                            <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white backdrop-blur-sm transition-colors">
                                {isPlaying ? <Pause weight="fill" /> : <Play weight="fill" />}
                            </button>
                            <button onClick={toggleMute} className="text-white/80 hover:text-white" title={isMuted ? "Unmute" : "Mute"}>
                                {isMuted ? <SpeakerSimpleSlash size={16} weight="bold" /> : <SpeakerSimpleHigh size={16} weight="bold" />}
                            </button>
                        </div>
                    </div>
                )}

                {/* Collapsed State Overlay */}
                {isCollapsed && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/40 transition-colors cursor-pointer" onClick={handleExpand}>
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse absolute top-1 right-1" />
                        {isPlaying ? (
                            <div className="flex gap-0.5 items-end h-3">
                                <div className="w-0.5 bg-white h-2 animate-[bounce_1s_infinite]" />
                                <div className="w-0.5 bg-white h-3 animate-[bounce_1.2s_infinite]" />
                                <div className="w-0.5 bg-white h-1.5 animate-[bounce_0.8s_infinite]" />
                            </div>
                        ) : (
                            <Play weight="fill" className="text-white text-xs" />
                        )}
                    </div>
                )}
            </div>

        </div>
    );
}
