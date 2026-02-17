/**
 * ============================================================================
 * AMBIENT MUSIC IndexedDB HELPERS
 * ============================================================================
 *
 * Handles persistent storage of ambient music blobs in IndexedDB.
 * This is separate from the main localStorage-based store because
 * audio blobs can be large and would exceed localStorage limits.
 *
 * Usage: Import `ambientMusicStorage` and call .save(), .load(), or .clear().
 * ============================================================================
 */

/** IndexedDB database name for media storage */
const AMBIENT_MUSIC_DB = 'whistler_media';

/** Object store name within the database */
const AMBIENT_MUSIC_STORE = 'ambient_music';

/** Key used to store the single ambient music blob */
const AMBIENT_MUSIC_KEY = 'current';

/**
 * Opens (or creates) the IndexedDB database for ambient music storage.
 * Automatically creates the object store on first run (version 1).
 */
const openAmbientMusicDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(AMBIENT_MUSIC_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AMBIENT_MUSIC_STORE)) {
        db.createObjectStore(AMBIENT_MUSIC_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** Save an audio blob to IndexedDB */
const ambientMusicPut = async (blob: Blob) => {
  const db = await openAmbientMusicDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(AMBIENT_MUSIC_STORE, 'readwrite');
    tx.objectStore(AMBIENT_MUSIC_STORE).put(blob, AMBIENT_MUSIC_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

/** Load the stored audio blob from IndexedDB (returns null if none exists) */
const ambientMusicGet = async () => {
  const db = await openAmbientMusicDb();
  return new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(AMBIENT_MUSIC_STORE, 'readonly');
    const request = tx.objectStore(AMBIENT_MUSIC_STORE).get(AMBIENT_MUSIC_KEY);
    request.onsuccess = () => resolve((request.result as Blob) || null);
    request.onerror = () => reject(request.error);
  });
};

/** Remove the stored audio blob from IndexedDB */
const ambientMusicClear = async () => {
  const db = await openAmbientMusicDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(AMBIENT_MUSIC_STORE, 'readwrite');
    tx.objectStore(AMBIENT_MUSIC_STORE).delete(AMBIENT_MUSIC_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

/**
 * Public API for ambient music blob storage.
 *
 * @example
 * ```ts
 * import { ambientMusicStorage } from '@/store/helpers/ambientMusicDb';
 * await ambientMusicStorage.save(audioBlob);
 * const blob = await ambientMusicStorage.load();
 * await ambientMusicStorage.clear();
 * ```
 */
export const ambientMusicStorage = {
  key: AMBIENT_MUSIC_KEY,
  save: ambientMusicPut,
  load: ambientMusicGet,
  clear: ambientMusicClear,
};
