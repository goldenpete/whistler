/**
 * ─── FileThumbnail.tsx ─────────────────────────────────────────────
 *
 * Renders a thumbnail preview for a file based on its type.
 * Handles video frame capture & caching, YouTube thumbnails,
 * images, PDFs, and icon fallbacks. Also exports utility
 * functions for mapping file types and icon components.
 *
 * Exports: FileThumbnail, getFileIcon, getFileTypeFromUrl
 * Related: StorageView, StorageDialogs, thumbnailDb
 * ───────────────────────────────────────────────────────────────────
 */
import React, { useRef, useState, useEffect } from "react";
import type { SyntheticEvent } from "react";
import { useStore } from "@/store/useStore";
import { type File as AppFile } from "@/types";
import {
    Folder, File as FileIcon, FilePdf, MusicNote, Image, FileVideo
} from "@phosphor-icons/react";
import { ICONS } from "@/components/dialogs/StorageDialogs";
import { PdfThumbnail } from "@/components/ui/pdf-thumbnail";
import { getYouTubeId } from "@/components/player/YouTubePlayer";
import { thumbnailStorage } from "@/utils/thumbnailDb";
import { useResolvedFileUrl } from "@/hooks/useResolvedFileUrl";
import { inferFileTypeFromUrl } from "@/utils/localFiles";

/* ═══════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════ */

export function getFileIcon(type: string) {
    switch (type) {
        case 'folder': return Folder;
        case 'video': return FileVideo;
        case 'pdf': return FilePdf;
        case 'audio': return MusicNote;
        case 'image': return Image;
        default: return FileIcon;
    }
}

export function getFileTypeFromUrl(url: string): 'file' | 'folder' | 'video' | 'pdf' | 'audio' | 'image' {
    return inferFileTypeFromUrl(url);
}

/* ═══════════════════════════════════════════════════════
   FILE THUMBNAIL
   ═══════════════════════════════════════════════════════ */

export function FileThumbnail({ file, iconSize }: { file: AppFile, iconSize: number }) {
    const useMiddleFrameForPreviews = useStore(state => state.useMiddleFrameForPreviews);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [cachedThumbnail, setCachedThumbnail] = useState<string | null>(null);
    const { resolvedUrl } = useResolvedFileUrl(file);

    // Load cached thumbnail
    useEffect(() => {
        if (file.type !== 'video' || !resolvedUrl || getYouTubeId(resolvedUrl)) return;

        const loadThumbnail = async () => {
            const key = `${resolvedUrl}-0.1-${useMiddleFrameForPreviews ? 'mid' : 'start'}`;
            try {
                const blob = await thumbnailStorage.load(key);
                if (blob) {
                    const objectUrl = URL.createObjectURL(blob);
                    setCachedThumbnail(objectUrl);
                }
            } catch (e) {
                console.error("Failed to load thumbnail", e);
            }
        };
        loadThumbnail();
    }, [resolvedUrl, file.type, useMiddleFrameForPreviews]);

    // Cleanup object URL
    useEffect(() => {
        return () => {
            if (cachedThumbnail) {
                URL.revokeObjectURL(cachedThumbnail);
            }
        };
    }, [cachedThumbnail]);

    const Icon = (() => {
        let icon = getFileIcon(file.type);
        if (file.type === 'folder' && file.icon) {
            const customIcon = ICONS.find(i => i.name === file.icon);
            if (customIcon) icon = customIcon.icon;
        }
        return icon;
    })();

    const color = file.type === 'folder' && file.color ? file.color : undefined;

    const [error, setError] = useState(false);

    if (error || !resolvedUrl) {
        return React.createElement(Icon, {
            size: iconSize,
            weight: "regular",
            className: "text-muted-foreground group-hover:text-primary transition-colors",
            style: color ? { color } : undefined
        });
    }

    // Check for YouTube first, regardless of file type (handles legacy 'file' type imports)
    const youtubeId = getYouTubeId(resolvedUrl);
    if (youtubeId) {
        return (
            <img
                src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                alt={file.name}
                className="w-full h-full object-cover"
                onError={() => setError(true)}
            />
        );
    }

    if (file.type === 'image') {
        return <img src={resolvedUrl} alt={file.name} className="w-full h-full object-cover" onError={() => setError(true)} />;
    }

    if (file.type === 'video') {
        if (cachedThumbnail) {
            return (
                <img
                    src={cachedThumbnail}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    onError={() => setCachedThumbnail(null)}
                />
            );
        }

        return (
            <video
                ref={videoRef}
                src={`${resolvedUrl}#t=0.1`}
                className="w-full h-full object-cover"
                preload="metadata"
                muted
                playsInline
                crossOrigin="anonymous"
                onError={() => setError(true)}
                onLoadedMetadata={(e: SyntheticEvent<HTMLVideoElement>) => {
                    const video = e.currentTarget;
                    if (useMiddleFrameForPreviews && video.duration && isFinite(video.duration)) {
                        video.currentTime = video.duration / 2;
                    } else {
                        video.currentTime = 0.1;
                    }
                }}
                onSeeked={async (e: SyntheticEvent<HTMLVideoElement>) => {
                    const video = e.currentTarget;
                    const key = `${resolvedUrl}-0.1-${useMiddleFrameForPreviews ? 'mid' : 'start'}`;

                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(video, 0, 0);
                            canvas.toBlob(async (blob) => {
                                if (blob) {
                                    await thumbnailStorage.save(key, blob);
                                }
                            }, 'image/jpeg', 0.7);
                        }
                    } catch (err) {
                        console.error("Failed to capture thumbnail", err);
                    }
                }}
            />
        );
    }
    if (file.type === "pdf") {
        return (
            <PdfThumbnail
                url={resolvedUrl}
                onError={() => setError(true)}
            />
        );
    }

    return React.createElement(Icon, {
        size: iconSize,
        weight: "regular",
        className: "text-muted-foreground group-hover:text-primary transition-colors"
    });
}
