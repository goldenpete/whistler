/**
 * ============================================================================
 * RESOLVED FILE URL HOOK
 * ============================================================================
 *
 * This hook hides the local-file resolution flow behind the same shape that the
 * rest of the app already expects: a normal URL plus a couple of actions.
 *
 * For remote files:
 *   - `resolvedUrl` is just `file.url`
 *   - availability is immediately `ready`
 *
 * For local files:
 *   - the hook loads the browser-stored handle from IndexedDB
 *   - it checks permission state
 *   - it generates an object URL if permission is granted
 *   - it writes that object URL back into the runtime store so every other part
 *     of the app can continue using the file record normally during this session
 * ============================================================================
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { File as AppFile } from '@/types';
import { useStore } from '@/store/useStore';
import { isCloudFile, resolveCloudFileUrl, getGoogleDriveEmbedUrl, extractGoogleDriveFileId } from '@/utils/cloudFiles';
import { driveCacheStorage } from '@/utils/driveCache';
import {
    createLocalFileSource,
    inferFileTypeFromName,
    isLocalFile,
    relinkLocalFileBinding,
    requestLocalFilePermission,
    resolveLocalFileSource,
    supportsLocalFileAccess,
    type LocalFileAvailability,
} from '@/utils/localFiles';

/** Simple helper that applies a runtime-only file update without creating history noise. */
function applyRuntimeFileUpdate(fileId: string, updates: Partial<AppFile>): void {
    useStore.setState((state) => ({
        files: state.files.map((candidate) => (
            candidate.id === fileId
                ? { ...candidate, ...updates }
                : candidate
        )),
    }));
}

/**
 * Public result shape consumed by players, previews, and edit dialogs.
 */
export interface ResolvedFileUrlState {
    resolvedUrl: string | null;
    googleDriveEmbedUrl: string | null;
    googleDriveNeedsApiKey: boolean;
    googleDriveCanUseNativePlayback: boolean;
    availability: LocalFileAvailability;
    isLocal: boolean;
    supportsLocalAccess: boolean;
    refresh: () => Promise<void>;
    requestAccess: () => Promise<boolean>;
    relink: () => Promise<boolean>;
}

/**
 * Resolve a file into a renderable URL and expose access-management actions.
 */
export function useResolvedFileUrl(file: AppFile | null | undefined): ResolvedFileUrlState {
    const googleDriveApiKey = useStore((state) => state.googleDriveApiKey);
    const googleDriveCacheEnabled = useStore((state) => state.googleDriveCacheEnabled);
    const normalizedGoogleDriveApiKey = googleDriveApiKey.trim();
    const isGoogleDriveCloud = Boolean(file && isCloudFile(file) && file.cloudSource.provider === 'google-drive');
    const driveBlobUrlRef = useRef<string | null>(null);
    const googleDriveNeedsApiKey = isGoogleDriveCloud && !normalizedGoogleDriveApiKey;
    const [resolvedUrl, setResolvedUrl] = useState<string | null>(() => {
        if (!file) return null;
        if (isCloudFile(file)) {
            return resolveCloudFileUrl(file.cloudSource, { googleDriveApiKey: normalizedGoogleDriveApiKey || null });
        }
        return file.url ?? null;
    });
    const [availability, setAvailability] = useState<LocalFileAvailability>(() => {
        if (!file) return 'error';
        if (!isLocalFile(file)) return 'ready';
        return file.url ? 'ready' : 'loading';
    });

    const supportsLocalAccess = supportsLocalFileAccess();
    const isLocal = isLocalFile(file);
    const googleDriveEmbedUrl = (file && isCloudFile(file)) ? getGoogleDriveEmbedUrl(file.cloudSource) : null;
    const googleDriveCanUseNativePlayback = Boolean(isGoogleDriveCloud && resolvedUrl);

    const syncRemoteFileState = useCallback(() => {
        if (!file) {
            setResolvedUrl(null);
            setAvailability('error');
            return;
        }

        if (!isCloudFile(file)) {
            setResolvedUrl(file.url ?? null);
            setAvailability('ready');
            return;
        }

        const apiUrl = resolveCloudFileUrl(file.cloudSource, { googleDriveApiKey: normalizedGoogleDriveApiKey || null });

        // For Google Drive files with caching enabled, check IndexedDB first
        if (isGoogleDriveCloud && googleDriveCacheEnabled && normalizedGoogleDriveApiKey) {
            let driveFileId: string | null = null;
            try { driveFileId = extractGoogleDriveFileId(new URL(file.cloudSource.shareUrl)); } catch { /* ignore */ }

            if (driveFileId) {
                // Try loading from cache
                driveCacheStorage.load(driveFileId).then((cached) => {
                    if (cached) {
                        // Revoke previous blob URL if any
                        if (driveBlobUrlRef.current) URL.revokeObjectURL(driveBlobUrlRef.current);
                        const blobUrl = URL.createObjectURL(cached.blob);
                        driveBlobUrlRef.current = blobUrl;
                        setResolvedUrl(blobUrl);
                    } else if (apiUrl) {
                        setResolvedUrl(apiUrl);
                        // Background: fetch + cache for next time
                        fetch(apiUrl).then((res) => {
                            if (res.ok) return res.blob();
                            return null;
                        }).then((blob) => {
                            if (blob) driveCacheStorage.save(driveFileId!, blob, file.name);
                        }).catch(() => { /* non-critical */ });
                    } else {
                        setResolvedUrl(null);
                    }
                    setAvailability('ready');
                }).catch(() => {
                    setResolvedUrl(apiUrl);
                    setAvailability('ready');
                });
                return;
            }
        }

        setResolvedUrl(apiUrl);
        setAvailability(file ? 'ready' : 'error');
    }, [file, normalizedGoogleDriveApiKey, isGoogleDriveCloud, googleDriveCacheEnabled]);

    const refresh = useCallback(async () => {
        if (!file) {
            setResolvedUrl(null);
            setAvailability('error');
            return;
        }

        if (!isLocalFile(file)) {
            syncRemoteFileState();
            return;
        }

        setAvailability('loading');

        const resolution = await resolveLocalFileSource(file.localSource);
        setAvailability(resolution.status);
        setResolvedUrl(resolution.url);

        if (resolution.status !== 'ready' || !resolution.url || !resolution.browserFile) {
            if (file.url) {
                applyRuntimeFileUpdate(file.id, { url: null });
            }
            return;
        }

        const refreshedLocalSource = {
            ...file.localSource,
            ...createLocalFileSource(file.localSource.bindingId, resolution.browserFile),
            addedAt: file.localSource.addedAt,
        };

        const inferredType = inferFileTypeFromName(
            resolution.browserFile.name,
            resolution.browserFile.type,
        );

        const shouldUpdateDisplayName = file.name === file.localSource.originalFileName;

        applyRuntimeFileUpdate(file.id, {
            url: resolution.url,
            type: inferredType,
            localSource: refreshedLocalSource,
            name: shouldUpdateDisplayName ? resolution.browserFile.name : file.name,
        });
    }, [file, syncRemoteFileState]);

    const requestAccess = useCallback(async () => {
        if (!file || !isLocalFile(file)) {
            return true;
        }

        const granted = await requestLocalFilePermission(file.localSource.bindingId);

        if (granted) {
            await refresh();
        } else {
            setAvailability('permission-required');
        }

        return granted;
    }, [file, refresh]);

    const relink = useCallback(async () => {
        if (!file || !isLocalFile(file)) {
            return false;
        }

        const relinked = await relinkLocalFileBinding(file.localSource.bindingId);

        if (!relinked) {
            return false;
        }

        const updatedLocalSource = {
            ...createLocalFileSource(file.localSource.bindingId, relinked.browserFile),
            addedAt: file.localSource.addedAt,
        };

        const inferredType = inferFileTypeFromName(
            relinked.browserFile.name,
            relinked.browserFile.type,
        );

        const shouldUpdateDisplayName = file.name === file.localSource.originalFileName;

        applyRuntimeFileUpdate(file.id, {
            localSource: updatedLocalSource,
            type: inferredType,
            name: shouldUpdateDisplayName ? relinked.browserFile.name : file.name,
            url: null,
        });

        await refresh();
        return true;
    }, [file, refresh]);

    useEffect(() => {
        if (!file) {
            setResolvedUrl(null);
            setAvailability('error');
            return;
        }

        if (!isLocalFile(file)) {
            syncRemoteFileState();
            return;
        }

        if (!supportsLocalAccess) {
            setResolvedUrl(null);
            setAvailability('unsupported');
            return;
        }

        let cancelled = false;
        (async () => {
            const resolution = await resolveLocalFileSource(file.localSource);
            if (cancelled) return;
            setAvailability(resolution.status);
            setResolvedUrl(resolution.url);

            if (resolution.status !== 'ready' || !resolution.url || !resolution.browserFile) {
                if (file.url) {
                    applyRuntimeFileUpdate(file.id, { url: null });
                }
                return;
            }

            const refreshedLocalSource = {
                ...file.localSource,
                ...createLocalFileSource(file.localSource.bindingId, resolution.browserFile),
                addedAt: file.localSource.addedAt,
            };

            const inferredType = inferFileTypeFromName(
                resolution.browserFile.name,
                resolution.browserFile.type,
            );

            const shouldUpdateDisplayName = file.name === file.localSource.originalFileName;

            applyRuntimeFileUpdate(file.id, {
                url: resolution.url,
                type: inferredType,
                localSource: refreshedLocalSource,
                name: shouldUpdateDisplayName ? resolution.browserFile.name : file.name,
            });
        })();
        return () => { cancelled = true; };
    }, [file, supportsLocalAccess, syncRemoteFileState]);

    // Cleanup: revoke blob URL on unmount
    useEffect(() => {
        return () => {
            if (driveBlobUrlRef.current) {
                URL.revokeObjectURL(driveBlobUrlRef.current);
                driveBlobUrlRef.current = null;
            }
        };
    }, []);

    return useMemo(() => ({
        resolvedUrl,
        googleDriveEmbedUrl,
        googleDriveNeedsApiKey,
        googleDriveCanUseNativePlayback,
        availability,
        isLocal,
        supportsLocalAccess,
        refresh,
        requestAccess,
        relink,
    }), [availability, googleDriveCanUseNativePlayback, googleDriveEmbedUrl, googleDriveNeedsApiKey, isLocal, refresh, relink, requestAccess, resolvedUrl, supportsLocalAccess]);
}