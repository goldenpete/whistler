import { useState, useEffect, type SyntheticEvent } from "react";
import { thumbnailStorage } from "@/utils/thumbnailDb";
import { getYouTubeId } from "@/components/player/YouTubePlayer";
import { PdfThumbnail } from "@/components/ui/pdf-thumbnail";
import { useStore } from "@/store/useStore";
import type { Highlight, File as AppFile } from "@/types";
import { useResolvedFileUrl } from "@/hooks/useResolvedFileUrl";

interface CachedVideoPreviewProps {
    url: string;
    time: number;
}

function CachedVideoPreview({ url, time }: CachedVideoPreviewProps) {
    const [cachedThumbnail, setCachedThumbnail] = useState<string | null>(null);
    const cacheHighlights = useStore(state => state.cacheHighlights);

    useEffect(() => {
        if (Number.isNaN(time)) return;

        const loadThumbnail = async () => {
            const key = `${url}-${time}-grid`;
            try {
                const blob = await thumbnailStorage.load(key);
                if (blob) {
                    setCachedThumbnail(URL.createObjectURL(blob));
                }
            } catch (e) {
                console.error(e);
            }
        };
        loadThumbnail();
    }, [url, time]);

    useEffect(() => {
        return () => {
             if (cachedThumbnail) URL.revokeObjectURL(cachedThumbnail);
        }
    }, [cachedThumbnail]);

    if (cachedThumbnail) {
        return <img src={cachedThumbnail} className="w-full h-full object-cover" alt="" />;
    }

    return (
        <video
            src={`${url}#t=${time}`}
            className="w-full h-full object-cover"
            muted
            playsInline
            onSeeked={async (e: SyntheticEvent<HTMLVideoElement>) => {
                if (!cacheHighlights) return;
                
                const video = e.currentTarget;
                const key = `${url}-${time}-grid`;
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0);
                        canvas.toBlob(async (blob) => {
                            if (blob) await thumbnailStorage.save(key, blob);
                        }, 'image/jpeg', 0.5);
                    }
                } catch (e) {}
            }}
        />
    );
}

interface CollectionGridPreviewProps {
    collectionId: string;
    highlights: Highlight[];
    files: AppFile[];
}

function CollectionGridPreviewTile({ highlight, file }: { highlight: Highlight; file: AppFile }) {
    const { resolvedUrl } = useResolvedFileUrl(file);

    if (!resolvedUrl) {
        return <div className="w-full h-full bg-muted/50" />;
    }

    const youtubeId = getYouTubeId(resolvedUrl);

    if (youtubeId) {
        return (
            <img
                src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                className="w-full h-full object-cover"
                alt=""
            />
        );
    }

    if (file.type === 'video') {
        return <CachedVideoPreview url={resolvedUrl} time={highlight.start || 0} />;
    }

    if (file.type === 'image') {
        return <img src={resolvedUrl} className="w-full h-full object-cover" alt="" />;
    }

    if (file.type === 'pdf') {
        return (
            <div className="w-full h-full overflow-hidden">
                <PdfThumbnail
                    url={resolvedUrl}
                    onError={() => {}}
                    width={150}
                    page={highlight.start || 1}
                    rect={highlight.rect ?? undefined}
                    className="w-full h-full object-cover"
                />
            </div>
        );
    }

    return <div className="w-full h-full bg-muted/50" />;
}

export function CollectionGridPreview({ collectionId, highlights, files }: CollectionGridPreviewProps) {
    // Get first 4 highlights for this collection
    const items = highlights
        .filter(h => h.collectionId === collectionId)
        .slice(0, 4);

    if (items.length === 0) return null;

    return (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-20 pointer-events-none">
            {items.map((h) => {
                const file = files.find(f => f.id === h.fileId);
                if (!file) return <div key={h.id} className="bg-muted/50" />;

                return (
                    <div key={h.id} className="relative overflow-hidden border-[0.5px] border-white/10">
                        <CollectionGridPreviewTile highlight={h} file={file} />
                    </div>
                );
            })}
        </div>
    );
}
