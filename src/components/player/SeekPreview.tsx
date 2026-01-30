import { useRef, useEffect, useState } from "react";
import { type File } from "@/types";
import { cn, formatTime } from "@/lib/utils";

interface SeekPreviewProps {
    file: File;
    time: number | null;
    x: number; // Pixels from left
    visible: boolean;
}

export function SeekPreview({ file, time, x, visible }: SeekPreviewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (videoRef.current && time !== null) {
            // Check if seeking is needed to avoid jitter
            if (Math.abs(videoRef.current.currentTime - time) > 0.5) {
                videoRef.current.currentTime = time;
            }
        }
    }, [time]);



    if (!file.url || (file.type !== 'video' && file.type !== 'audio')) return null;

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
                    src={file.url}
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
