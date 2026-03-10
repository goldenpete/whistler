/**
 * ─── SeekPreview.tsx ───────────────────────────────────────────────
 *
 * Thumbnail preview tooltip displayed above the video seek bar when
 * the user hovers over the timeline, showing a frame at that time.
 *
 * Features:
 *   - Hidden <video> element seeks to hovered timestamp
 *   - Positioned horizontally to follow cursor along the bar
 *   - Fade-in/out opacity transitions for smooth appearance
 *   - Formatted time label below the thumbnail
 *   - Loading skeleton while video metadata loads
 *
 * Props: file, time, x (horizontal pixel offset), visible
 * Exports: SeekPreview component
 * Related: VideoPlayer (parent), formatTime from utils
 * ───────────────────────────────────────────────────────────────────
 */
import { useRef, useEffect, useState } from "react";
import { type File } from "@/types";
import { cn, formatTime } from "@/lib/utils";
import { useResolvedFileUrl } from "@/hooks/useResolvedFileUrl";

interface SeekPreviewProps {
    file: File;
    time: number | null;
    x: number; // Pixels from left
    visible: boolean;
}

export function SeekPreview({ file, time, x, visible }: SeekPreviewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [loaded, setLoaded] = useState(false);
    const { resolvedUrl } = useResolvedFileUrl(file);

    useEffect(() => {
        if (videoRef.current && time !== null) {
            // Check if seeking is needed to avoid jitter
            if (Math.abs(videoRef.current.currentTime - time) > 0.5) {
                videoRef.current.currentTime = time;
            }
        }
    }, [time]);



    if (!resolvedUrl || (file.type !== 'video' && file.type !== 'audio')) return null;

    return (
        <div
            className={cn(
                "absolute bottom-8 transform -translate-x-1/2 pointer-events-none transition-opacity duration-200 z-50 flex flex-col items-center gap-1",
                visible ? "opacity-100" : "opacity-0"
            )}
            style={{ left: x }}
        >
            {/* Thumbnail Box */}
            <div className="w-32 aspect-video bg-black rounded-md border border-white/20 overflow-hidden shadow-xl relative">
                {!loaded && <div className="absolute inset-0 bg-zinc-900 animate-pulse" />}
                <video
                    ref={videoRef}
                    src={resolvedUrl}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    onLoadedData={() => setLoaded(true)}
                    muted
                />
            </div>

            {/* Time Label */}
            <div className="px-2 py-0.5 bg-black/80 rounded text-[10px] font-mono font-medium text-white border border-white/10 shadow-sm">
                {formatTime(time || 0)}
            </div>
        </div>
    );
}
