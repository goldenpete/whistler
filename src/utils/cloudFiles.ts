import type { CloudFileSource, CloudProvider, File as AppFile } from '@/types';

export type CloudFileTypeSelection = 'auto' | Exclude<AppFile['type'], 'folder'>;

export interface CloudFileDraft {
    provider: CloudProvider;
    shareUrl: string;
    name: string;
    typeSelection: CloudFileTypeSelection;
}

const CLOUD_PROVIDER_LABELS: Record<CloudProvider, string> = {
    'google-drive': 'Google Drive',
    dropbox: 'Dropbox',
    onedrive: 'OneDrive',
};

export function getCloudProviderLabel(provider: CloudProvider): string {
    return CLOUD_PROVIDER_LABELS[provider];
}

export function isCloudFile(file: AppFile | null | undefined): file is AppFile & { sourceKind: 'cloud'; cloudSource: CloudFileSource } {
    return Boolean(file?.sourceKind === 'cloud' && file.cloudSource?.provider && file.cloudSource?.shareUrl && file.cloudSource?.directUrl);
}

export function detectCloudProvider(url: string): CloudProvider | null {
    try {
        const parsed = new URL(url.trim());
        const host = parsed.hostname.toLowerCase();

        if (host.includes('drive.google.com') || host.includes('docs.google.com')) {
            return 'google-drive';
        }

        if (host.includes('dropbox.com') || host.includes('dropboxusercontent.com')) {
            return 'dropbox';
        }

        if (host.includes('onedrive.live.com') || host.includes('1drv.ms')) {
            return 'onedrive';
        }

        return null;
    } catch {
        return null;
    }
}

export function createCloudFileSource(provider: CloudProvider, shareUrl: string): CloudFileSource | null {
    const trimmed = shareUrl.trim();
    if (!trimmed) return null;

    try {
        const parsed = new URL(trimmed);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return null;
        }

        const directUrl = resolveCloudDirectUrl(provider, parsed);
        if (!directUrl) {
            return null;
        }

        return {
            provider,
            shareUrl: parsed.toString(),
            directUrl,
        };
    } catch {
        return null;
    }
}

export function inferCloudFileType(
    name: string,
    cloudSource: CloudFileSource,
    fallback: Exclude<AppFile['type'], 'folder'> = 'file',
    override: CloudFileTypeSelection = 'auto'
): Exclude<AppFile['type'], 'folder'> {
    if (override !== 'auto') {
        return override;
    }

    const inferredFromName = inferMediaFileType(name);
    if (inferredFromName !== 'file') {
        return inferredFromName;
    }

    const inferredFromUrl = inferMediaFileType(cloudSource.directUrl);
    if (inferredFromUrl !== 'file') {
        return inferredFromUrl;
    }

    return fallback;
}

function resolveCloudDirectUrl(provider: CloudProvider, parsed: URL): string | null {
    switch (provider) {
        case 'google-drive': {
            return buildGoogleDriveDirectUrl(parsed);
        }
        case 'dropbox': {
            if (parsed.hostname.toLowerCase().includes('dropboxusercontent.com')) {
                return parsed.toString();
            }

            if (!parsed.hostname.toLowerCase().includes('dropbox.com')) {
                return null;
            }

            parsed.hostname = 'dl.dropboxusercontent.com';
            parsed.search = '';
            parsed.hash = '';
            return parsed.toString();
        }
        case 'onedrive': {
            const encodedShare = encodeBase64Url(parsed.toString());
            return `https://api.onedrive.com/v1.0/shares/u!${encodedShare}/root/content`;
        }
        default:
            return null;
    }
}

function buildGoogleDriveDirectUrl(parsed: URL): string | null {
    const fileId = extractGoogleDriveFileId(parsed);
    if (!fileId) {
        return null;
    }

    const directUrl = new URL('https://drive.google.com/uc');
    directUrl.searchParams.set('export', 'download');
    directUrl.searchParams.set('id', fileId);

    const resourceKey = extractGoogleDriveResourceKey(parsed);
    if (resourceKey) {
        directUrl.searchParams.set('resourcekey', resourceKey);
    }

    return directUrl.toString();
}

function extractGoogleDriveFileId(parsed: URL): string | null {
    const pathname = parsed.pathname;
    const fileMatch = pathname.match(/\/file\/d\/([^/]+)/i);
    if (fileMatch?.[1]) {
        return fileMatch[1];
    }

    const documentMatch = pathname.match(/\/(?:document|presentation|spreadsheets)\/d\/([^/]+)/i);
    if (documentMatch?.[1]) {
        return documentMatch[1];
    }

    const queryId = parsed.searchParams.get('id');
    return queryId || null;
}

function extractGoogleDriveResourceKey(parsed: URL): string | null {
    return parsed.searchParams.get('resourcekey');
}

function encodeBase64Url(value: string): string {
    const utf8 = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
    return btoa(utf8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function inferMediaFileType(value: string): Exclude<AppFile['type'], 'folder'> {
    const lower = value.toLowerCase();

    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'video';
    if (/\.(mp4|webm|mov|avi|mkv|m4v)(\?|$)/.test(lower)) return 'video';
    if (/\.(mp3|wav|ogg|flac|m4a)(\?|$)/.test(lower)) return 'audio';
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/.test(lower)) return 'image';
    if (/\.pdf(\?|$)/.test(lower)) return 'pdf';
    if (lower.includes('catbox') || lower.includes('files.')) return 'video';

    return 'file';
}