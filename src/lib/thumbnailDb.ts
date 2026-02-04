
const THUMBNAIL_DB = 'whistler_thumbnails';
const THUMBNAIL_STORE = 'thumbnails';

const openThumbnailDb = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(THUMBNAIL_DB, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(THUMBNAIL_STORE)) {
                db.createObjectStore(THUMBNAIL_STORE);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

export const thumbnailStorage = {
    save: async (key: string, blob: Blob) => {
        const db = await openThumbnailDb();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(THUMBNAIL_STORE, 'readwrite');
            tx.objectStore(THUMBNAIL_STORE).put(blob, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },
    load: async (key: string) => {
        const db = await openThumbnailDb();
        return new Promise<Blob | null>((resolve, reject) => {
            const tx = db.transaction(THUMBNAIL_STORE, 'readonly');
            const request = tx.objectStore(THUMBNAIL_STORE).get(key);
            request.onsuccess = () => resolve((request.result as Blob) || null);
            request.onerror = () => reject(request.error);
        });
    },
    delete: async (key: string) => {
        const db = await openThumbnailDb();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(THUMBNAIL_STORE, 'readwrite');
            tx.objectStore(THUMBNAIL_STORE).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },
    deleteByFilter: async (filter: (key: string) => boolean) => {
        const db = await openThumbnailDb();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(THUMBNAIL_STORE, 'readwrite');
            const store = tx.objectStore(THUMBNAIL_STORE);
            const request = store.getAllKeys();

            request.onsuccess = () => {
                const keys = request.result as string[];
                const keysToDelete = keys.filter(filter);
                
                if (keysToDelete.length === 0) {
                    resolve();
                    return;
                }

                let completed = 0;
                keysToDelete.forEach(key => {
                    store.delete(key).onsuccess = () => {
                        completed++;
                        if (completed === keysToDelete.length) {
                            resolve(); // Transaction will complete automatically
                        }
                    };
                });
            };
            
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },
    clear: async () => {
        const db = await openThumbnailDb();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(THUMBNAIL_STORE, 'readwrite');
            tx.objectStore(THUMBNAIL_STORE).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
};
