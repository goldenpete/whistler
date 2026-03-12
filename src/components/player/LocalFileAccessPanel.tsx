/**
 * ============================================================================
 * LOCAL FILE ACCESS PANEL
 * ============================================================================
 *
 * This component renders the user-facing explanation for the two local-file
 * failure modes that matter in browsers:
 *   1. The file handle still exists, but the browser wants permission again.
 *   2. The handle does not exist on this browser, so the user must relink it.
 *
 * The panel is intentionally reusable so the same language and actions can be
 * shown in the file player and in file-edit surfaces.
 * ============================================================================
 */

import type { File as AppFile } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FolderOpen, LockSimple, WarningCircle, Desktop } from '@phosphor-icons/react';
import { getDisplaySourceLabel, type LocalFileAvailability } from '@/utils/localFiles';

interface LocalFileAccessPanelProps {
    file: AppFile;
    availability: LocalFileAvailability;
    onRequestAccess: () => Promise<boolean>;
    onRelink: () => Promise<boolean>;
    compact?: boolean;
    className?: string;
}

/**
 * Local-file specific fallback UI.
 * The component stays intentionally narrow so it is easy to embed anywhere.
 */
export function LocalFileAccessPanel({
    file,
    availability,
    onRequestAccess,
    onRelink,
    compact = false,
    className,
}: LocalFileAccessPanelProps) {
    if (availability === 'ready') {
        return null;
    }

    const isPermissionIssue = availability === 'permission-required';
    const isMissingHandle = availability === 'missing-handle';
    const isUnsupported = availability === 'unsupported';

    return (
        <div
            className={cn(
                'w-full max-w-2xl border border-amber-500/30 bg-amber-500/8 text-amber-50',
                compact ? 'p-4' : 'p-6',
                className,
            )}
        >
            <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 text-amber-300">
                    {isPermissionIssue ? <LockSimple size={20} weight="fill" /> : isUnsupported ? <Desktop size={20} weight="fill" /> : <WarningCircle size={20} weight="fill" />}
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                    <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-amber-100">
                            {isPermissionIssue && 'Browser access is required again'}
                            {isMissingHandle && 'This browser does not know where the file lives'}
                            {isUnsupported && 'This browser does not support persisted local files'}
                            {availability === 'error' && 'Whistler could not reopen this local file'}
                            {availability === 'loading' && 'Opening local file…'}
                        </h3>

                        <p className="text-xs leading-relaxed text-amber-50/80">
                            {isPermissionIssue && 'The file is still registered in Whistler, but the browser has revoked read access for this session. Grant access again to keep highlights, graph links, docs, and playback attached to the same file record.'}
                            {isMissingHandle && 'The file record synced successfully, but the browser-specific file handle is missing here. This usually happens on a new computer or after site data was cleared. Relink the file on disk to restore the existing project references.'}
                            {isUnsupported && 'Your browser cannot reopen local file handles after the picker closes. You can still use web URLs normally, but persisted local-disk playback needs File System Access API support.'}
                            {availability === 'error' && 'The stored handle exists, but the browser could not reopen the file. Relinking the file usually fixes this.'}
                            {availability === 'loading' && 'Whistler is checking the stored browser handle and preparing a fresh runtime URL.'}
                        </p>
                    </div>

                    <div className="rounded-none border border-white/10 bg-black/20 px-3 py-2 text-xs text-amber-50/70">
                        Source: {getDisplaySourceLabel(file)}
                    </div>

                    {!isUnsupported && availability !== 'loading' && (
                        <div className="flex flex-wrap gap-2">
                            {(isPermissionIssue || availability === 'error') && (
                                <Button
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => void onRequestAccess()}
                                >
                                    <LockSimple size={16} weight="bold" />
                                    Grant Access
                                </Button>
                            )}

                            {(isMissingHandle || availability === 'error') && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2 border-amber-200/30 bg-transparent text-amber-50 hover:bg-amber-50/10"
                                    onClick={() => void onRelink()}
                                >
                                    <FolderOpen size={16} weight="bold" />
                                    Locate File
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}