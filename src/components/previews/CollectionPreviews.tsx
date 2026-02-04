import { useState, useEffect } from "react";
import { thumbnailStorage } from "@/lib/thumbnailDb";
import { getYouTubeId } from "@/components/player/YouTubePlayer";
import { PdfThumbnail } from "@/components/ui/pdf-thumbnail";
import { useStore } from "@/store/useStore";

interface CachedVideoPreviewProps {
    url: string;
    time: number;
}

export function CachedVideoPreview({ url, time }: CachedVideoPreviewProps) {
    const [cachedThumbnail, setCachedThumbnail] = useState<string | null>(null);
    const cacheHighlights = useStore(state => state.cacheHighlights);

    useEffect(() => {
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
            crossOrigin="anonymous"
            onSeeked={async (e) => {
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
    highlights: any[];
    files: any[];
}

export function CollectionGridPreview({ collectionId, highlights, files }: CollectionGridPreviewProps) {
    // Get first 4 highlights for this collection
    const items = highlights
        .filter(h => h.collectionId === collectionId)
        .slice(0, 4);

    if (items.length === 0) return null;

    return (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-20 pointer-events-none">
            {items.map((h, i) => {
                const file = files.find(f => f.id === h.fileId);
                if (!file || !file.url) return <div key={h.id} className="bg-muted/50" />;
                
                const youtubeId = getYouTubeId(file.url);

                return (
                    <div key={h.id} className="relative overflow-hidden border-[0.5px] border-white/10">
                        {youtubeId ? (
                             <img
                                src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                                className="w-full h-full object-cover"
                                alt=""
                            />
                        ) : file.type === 'video' ? (
                            <CachedVideoPreview url={file.url} time={h.start || 0} />
                        ) : file.type === 'image' ? (
                            <img
                                src={file.url}
                                className="w-full h-full object-cover"
                                alt=""
                            />
                        ) : file.type === 'pdf' ? (
                            <div className="w-full h-full overflow-hidden">
                                <PdfThumbnail
                                    url={file.url}
                                    onError={() => {}}
                                    width={150}
                                    page={h.start || 1}
                                    rect={h.rect}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : (
                            <div className="w-full h-full bg-muted/50" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
