/**
 * ─── driveCache.ts ───────────────────────────────────────────────────────────
 *
 * IndexedDB-based cache for Google Drive file media blobs.
 * Caches the raw media fetched via the Drive API so repeat playbacks
 * don't consume additional API quota.
 *
 * Storage layout (single object store, key = Google Drive file ID):
 *   value = { blob: Blob, name: string, size: number, cachedAt: number }
 *
 * Exports: driveCacheStorage
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DB_NAME = 'whistler_drive_cache';
const STORE_NAME = 'files';
const DB_VERSION = 1;

export interface DriveCacheEntry {
    blob: Blob;
    /** Display name of the cached file */
    name: string;
    /** Blob size in bytes */
    size: number;
    /** Unix timestamp (ms) when the entry was cached */
    cachedAt: number;
}

export interface DriveCacheInfo {
    /** Google Drive file ID used as the cache key */
    id: string;
    name: string;
    size: number;
    cachedAt: number;
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export const driveCacheStorage = {
    /** Save a Drive file blob into the cache. */
    save: async (driveFileId: string, blob: Blob, name: string): Promise<void> => {
        const db = await openDb();
        const entry: DriveCacheEntry = {
            blob,
            name,
            size: blob.size,
            cachedAt: Date.now(),
        };
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(entry, driveFileId);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    /** Load a cached Drive file blob. Returns null if not cached. */
    load: async (driveFileId: string): Promise<DriveCacheEntry | null> => {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const request = tx.objectStore(STORE_NAME).get(driveFileId);
            request.onsuccess = () => resolve((request.result as DriveCacheEntry) || null);
            request.onerror = () => reject(request.error);
        });
    },

    /** Delete a single cached file. */
    delete: async (driveFileId: string): Promise<void> => {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(driveFileId);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    /** Clear all cached Drive files. */
    clear: async (): Promise<void> => {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    /** List all cached entries (metadata only, no blobs). */
    list: async (): Promise<DriveCacheInfo[]> => {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const keysReq = store.getAllKeys();
            const valsReq = store.getAll();

            tx.oncomplete = () => {
                const keys = keysReq.result as string[];
                const vals = valsReq.result as DriveCacheEntry[];
                const infos: DriveCacheInfo[] = keys.map((id, i) => ({
                    id,
                    name: vals[i].name,
                    size: vals[i].size,
                    cachedAt: vals[i].cachedAt,
                }));
                resolve(infos);
            };
            tx.onerror = () => reject(tx.error);
        });
    },

    /** Get total cache size in bytes. */
    totalSize: async (): Promise<number> => {
        const entries = await driveCacheStorage.list();
        return entries.reduce((sum, e) => sum + e.size, 0);
    },
};
