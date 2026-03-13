/**
 * ============================================================================
 * LOCAL FILE RUNTIME HELPERS
 * ============================================================================
 *
 * This module is the single abstraction layer for Whistler's local-file
 * support.
 *
 * Responsibilities:
 *   - Pick a file from the user's machine using the File System Access API
 *   - Persist the FileSystemFileHandle in IndexedDB so the app can remember it
 *     across browser sessions
 *   - Recreate a fresh object URL from that handle at runtime whenever a local
 *     file needs to be rendered in an existing player or preview
 *   - Strip transient object URLs back out before we persist or sync data
 *   - Provide a couple of small convenience helpers for share/open/link flows
 *
 * Architectural constraint:
 *   The handle itself is browser-local and cannot be synced. That means cloud
 *   sync carries only the file metadata plus the stable `bindingId`. On a new
 *   machine the record still exists, but the app must prompt the user to grant
 *   access again or relink the handle.
 * ============================================================================
 */

import type { File as AppFile, LocalFileSource } from '@/types';
import { isCloudFile } from '@/utils/cloudFiles';

/** Reuse the existing media database so local handles live beside other browser-side media state. */
const LOCAL_MEDIA_DB = 'whistler_media';

/** Object store that holds browser FileSystemFileHandle instances by binding id. */
const LOCAL_FILE_HANDLE_STORE = 'local_file_handles';

/** Database version is bumped so the new object store can be created safely. */
const LOCAL_MEDIA_DB_VERSION = 2;

/**
 * Cache object URLs in-memory for the current browser session.
 *
 * Why cache?
 *   - Recreating object URLs for the same local file on every render would be
 *     wasteful and noisy.
 *   - A single object URL can be shared by all previews/players until the file
 *     changes or the page unloads.
 */
const objectUrlCache = new Map<string, { signature: string; url: string }>();

/**
 * File types Whistler can render today.
 * This mirrors the app's existing File.type union.
 */
export type MediaFileType = AppFile['type'];

/**
 * Runtime availability states for a local file binding.
 *
 * These are deliberately UI-friendly so components can render prompts with
 * minimal branching.
 */
export type LocalFileAvailability =
    | 'ready'
    | 'loading'
    | 'permission-required'
    | 'missing-handle'
    | 'unsupported'
    | 'error';

/**
 * Result returned after the user picks a local file from disk.
 * The browser file object is included so callers can immediately infer type,
 * metadata, and optionally resolve an object URL without another IndexedDB read.
 */
export interface PickedLocalFile {
    handle: FileSystemFileHandle;
    browserFile: File;
    inferredType: MediaFileType;
}

/**
 * Rich result returned when the runtime resolves a persisted local file.
 * The `url` field is only present when the file is immediately playable/viewable.
 */
export interface LocalFileResolution {
    status: LocalFileAvailability;
    url: string | null;
    browserFile?: File;
}

/**
 * Guard that tells the rest of the app whether the browser can do local file
 * persistence at all.
 */
export function supportsLocalFileAccess(): boolean {
    return typeof window !== 'undefined'
        && 'indexedDB' in window
        && 'showOpenFilePicker' in window;
}

/** Small type guard used across the app wherever local-file specific UI is needed. */
export function isLocalFile(file: AppFile | null | undefined): file is AppFile & { sourceKind: 'local'; localSource: LocalFileSource } {
    return Boolean(file?.sourceKind === 'local' && file.localSource?.bindingId);
}

/**
 * Infer Whistler's player type from the file name and MIME type.
 *
 * We intentionally prefer MIME type when available because local files do not
 * always have trustworthy extensions. We still fall back to extension checks so
 * the behavior matches the existing remote-URL import logic.
 */
export function inferFileTypeFromName(name: string, mimeType = ''): MediaFileType {
    const lowerName = name.toLowerCase();
    const lowerMimeType = mimeType.toLowerCase();

    if (lowerMimeType.startsWith('video/')) return 'video';
    if (lowerMimeType.startsWith('audio/')) return 'audio';
    if (lowerMimeType.startsWith('image/')) return 'image';
    if (lowerMimeType === 'application/pdf') return 'pdf';

    if (/\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(lowerName)) return 'video';
    if (/\.(mp3|wav|ogg|flac|m4a)$/i.test(lowerName)) return 'audio';
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)$/i.test(lowerName)) return 'image';
    if (/\.pdf$/i.test(lowerName)) return 'pdf';

    return 'file';
}

/**
 * Infer the existing Whistler media type from a remote URL.
 * This keeps the current remote-file behavior centralized instead of duplicated
 * between HomeView, StorageView, and thumbnail code.
 */
export function inferFileTypeFromUrl(url: string): MediaFileType {
    const lower = url.toLowerCase();

    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'video';
    if (/\.(mp4|webm|mov|avi|mkv|m4v)(\?|$)/.test(lower)) return 'video';
    if (/\.(mp3|wav|ogg|flac|m4a)(\?|$)/.test(lower)) return 'audio';
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/.test(lower)) return 'image';
    if (/\.pdf(\?|$)/.test(lower)) return 'pdf';

    // Preserve the app's existing assumption for streaming/file-hosting URLs.
    if (lower.includes('catbox') || lower.includes('files.')) return 'video';

    return 'file';
}

/**
 * Convert a browser File object into the persisted metadata we keep inside the
 * Whistler file record.
 */
export function createLocalFileSource(bindingId: string, browserFile: File): LocalFileSource {
    return {
        bindingId,
        originalFileName: browserFile.name,
        mimeType: browserFile.type || '',
        size: browserFile.size,
        lastModified: browserFile.lastModified,
        addedAt: Date.now(),
    };
}

/**
 * Build a stable signature for the browser file.
 *
 * If the underlying file changes on disk, the signature changes, which tells us
 * to revoke the stale object URL and mint a fresh one.
 */
function getBrowserFileSignature(browserFile: File): string {
    return `${browserFile.name}:${browserFile.size}:${browserFile.lastModified}:${browserFile.type}`;
}

/** Open or create the IndexedDB database that stores browser-local file handles. */
function openLocalMediaDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(LOCAL_MEDIA_DB, LOCAL_MEDIA_DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains('ambient_music')) {
                db.createObjectStore('ambient_music');
            }

            if (!db.objectStoreNames.contains(LOCAL_FILE_HANDLE_STORE)) {
                db.createObjectStore(LOCAL_FILE_HANDLE_STORE);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/** Persist a file handle using the stable binding id stored on the Whistler file. */
export async function saveLocalFileHandle(bindingId: string, handle: FileSystemFileHandle): Promise<void> {
    const db = await openLocalMediaDb();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(LOCAL_FILE_HANDLE_STORE, 'readwrite');
        transaction.objectStore(LOCAL_FILE_HANDLE_STORE).put(handle, bindingId);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

/** Load a persisted file handle back out of IndexedDB. */
export async function loadLocalFileHandle(bindingId: string): Promise<FileSystemFileHandle | null> {
    const db = await openLocalMediaDb();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(LOCAL_FILE_HANDLE_STORE, 'readonly');
        const request = transaction.objectStore(LOCAL_FILE_HANDLE_STORE).get(bindingId);
        request.onsuccess = () => resolve((request.result as FileSystemFileHandle | undefined) ?? null);
        request.onerror = () => reject(request.error);
    });
}

/** Delete a persisted local-handle binding completely. */
export async function deleteLocalFileHandle(bindingId: string): Promise<void> {
    const db = await openLocalMediaDb();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(LOCAL_FILE_HANDLE_STORE, 'readwrite');
        transaction.objectStore(LOCAL_FILE_HANDLE_STORE).delete(bindingId);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

/**
 * Ask the browser for the current permission state of a stored local-file handle.
 * We normalize any API failure into "prompt" so the UI can offer a re-grant path.
 */
async function queryLocalFilePermission(handle: FileSystemFileHandle): Promise<PermissionState | 'prompt'> {
    try {
        return await handle.queryPermission({ mode: 'read' });
    } catch {
        return 'prompt';
    }
}

/**
 * Request read permission for a stored local-file handle.
 * Returns false instead of throwing so UI callers can stay straightforward.
 */
export async function requestLocalFilePermission(bindingId: string): Promise<boolean> {
    const handle = await loadLocalFileHandle(bindingId);

    if (!handle) {
        return false;
    }

    try {
        const permission = await handle.requestPermission({ mode: 'read' });
        return permission === 'granted';
    } catch {
        return false;
    }
}

/**
 * Let the user browse for a new file and replace the stored handle for an
 * existing local-file binding.
 */
export async function relinkLocalFileBinding(bindingId: string): Promise<PickedLocalFile | null> {
    const picked = await pickLocalFile();

    if (!picked) {
        return null;
    }

    await saveLocalFileHandle(bindingId, picked.handle);
    revokeCachedObjectUrl(bindingId);

    return picked;
}

/**
 * Open the browser's native file picker and return the picked file plus its
 * handle in a normalized format.
 */
export async function pickLocalFile(): Promise<PickedLocalFile | null> {
    if (!supportsLocalFileAccess()) {
        return null;
    }

    try {
        const [handle] = await window.showOpenFilePicker({
            multiple: false,
            excludeAcceptAllOption: false,
            types: [
                {
                    description: 'Media and documents',
                    accept: {
                        'video/*': ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'],
                        'audio/*': ['.mp3', '.wav', '.ogg', '.flac', '.m4a'],
                        'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.avif'],
                        'application/pdf': ['.pdf'],
                    },
                },
            ],
        });

        const browserFile = await handle.getFile();

        return {
            handle,
            browserFile,
            inferredType: inferFileTypeFromName(browserFile.name, browserFile.type),
        };
    } catch (error) {
        // AbortError is expected when the user closes the picker.
        if (error instanceof DOMException && error.name === 'AbortError') {
            return null;
        }

        throw error;
    }
}

/** Revoke a cached object URL for a single binding if one exists. */
export function revokeCachedObjectUrl(bindingId: string): void {
    const cached = objectUrlCache.get(bindingId);

    if (!cached) {
        return;
    }

    URL.revokeObjectURL(cached.url);
    objectUrlCache.delete(bindingId);
}

/** Revoke every cached object URL when the page unloads. */
export function revokeAllCachedObjectUrls(): void {
    for (const { url } of objectUrlCache.values()) {
        URL.revokeObjectURL(url);
    }

    objectUrlCache.clear();
}

/**
 * Resolve a persisted local file into a runtime object URL.
 *
 * This is the key bridge between the persisted file record and the existing
 * media components, which already know how to render regular URLs.
 */
export async function resolveLocalFileSource(localSource: LocalFileSource): Promise<LocalFileResolution> {
    if (!supportsLocalFileAccess()) {
        return { status: 'unsupported', url: null };
    }

    const handle = await loadLocalFileHandle(localSource.bindingId);

    if (!handle) {
        return { status: 'missing-handle', url: null };
    }

    const permission = await queryLocalFilePermission(handle);

    if (permission !== 'granted') {
        return { status: 'permission-required', url: null };
    }

    try {
        const browserFile = await handle.getFile();
        const signature = getBrowserFileSignature(browserFile);
        const cached = objectUrlCache.get(localSource.bindingId);

        if (cached && cached.signature === signature) {
            return {
                status: 'ready',
                url: cached.url,
                browserFile,
            };
        }

        if (cached) {
            URL.revokeObjectURL(cached.url);
        }

        const url = URL.createObjectURL(browserFile);
        objectUrlCache.set(localSource.bindingId, { signature, url });

        return {
            status: 'ready',
            url,
            browserFile,
        };
    } catch {
        return { status: 'error', url: null };
    }
}

/**
 * Remove transient local object URLs before persisting to localStorage, sync,
 * or export. Remote files are passed through untouched.
 */
export function sanitizeFileForPersistence(file: AppFile): AppFile {
    if (!isLocalFile(file)) {
        return file;
    }

    return {
        ...file,
        url: null,
    };
}

/** Apply the same sanitization to a whole file array. */
export function sanitizeFilesForPersistence(files: AppFile[]): AppFile[] {
    return files.map((file) => sanitizeFileForPersistence(file));
}

/**
 * Build the internal Whistler route for a file.
 * For local files this is the only stable URL that survives sync or reloads.
 */
export function getWhistlerFileRoute(file: Pick<AppFile, 'id'>): string {
    return `${window.location.origin}/file/${file.id}`;
}

/**
 * Choose the best URL for "open externally" behavior.
 *
 * For local files we prefer the currently resolved runtime URL if one exists,
 * and otherwise fall back to the in-app file route.
 */
export function getOpenUrlForFile(file: AppFile, resolvedUrl?: string | null): string {
    if (isLocalFile(file)) {
        return resolvedUrl || getWhistlerFileRoute(file);
    }

    if (isCloudFile(file)) {
        return file.cloudSource.shareUrl || file.url || getWhistlerFileRoute(file);
    }

    return file.url || getWhistlerFileRoute(file);
}

/**
 * Choose the stable URL for copy/share actions.
 * Remote files can use their original URL. Local files must use the in-app route.
 */
export function getShareUrlForFile(file: AppFile): string {
    if (isLocalFile(file)) {
        return getWhistlerFileRoute(file);
    }

    if (isCloudFile(file)) {
        return file.cloudSource.shareUrl || file.url || getWhistlerFileRoute(file);
    }

    return file.url || getWhistlerFileRoute(file);
}

/**
 * Human-readable label used in the UI when we need to show a source string.
 * Local files use the persisted browser filename instead of an ephemeral blob URL.
 */
export function getDisplaySourceLabel(file: AppFile, resolvedUrl?: string | null): string {
    if (isLocalFile(file)) {
        return file.localSource.originalFileName;
    }

    if (isCloudFile(file)) {
        return file.cloudSource.shareUrl || file.url || '';
    }

    return resolvedUrl || file.url || '';
}

// Clean up any browser-generated object URLs when the tab is closed or refreshed.
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        revokeAllCachedObjectUrls();
    });
}