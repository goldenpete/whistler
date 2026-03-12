import { useState, useEffect } from "react";
import { thumbnailStorage } from "@/utils/thumbnailDb";

/**
 * Loads a cached thumbnail from IndexedDB by key, creates an object URL,
 * and cleans up (revokeObjectURL) on unmount or when the key changes.
 *
 * @param key - The thumbnail cache key, or null/undefined to skip loading.
 * @returns The object URL for the cached thumbnail, or null if not found.
 */
export function useCachedThumbnail(key: string | null | undefined): string | null {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!key) {
            setUrl(null);
            return;
        }

        let cancelled = false;
        let objectUrl: string | null = null;

        const loadThumbnail = async () => {
            try {
                const blob = await thumbnailStorage.load(key);
                if (cancelled) return;
                if (blob) {
                    objectUrl = URL.createObjectURL(blob);
                    setUrl(objectUrl);
                } else {
                    setUrl(null);
                }
            } catch (e) {
                if (!cancelled) {
                    console.error("Failed to load thumbnail", e);
                    setUrl(null);
                }
            }
        };

        loadThumbnail();

        return () => {
            cancelled = true;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [key]);

    return url;
}
