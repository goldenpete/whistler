/**
 * ─── MoveCollectionDialog.tsx ───────────────────────────────────────
 *
 * Dialog for moving one or more collections/folders to a different
 * parent folder within the active bucket.
 *
 * Features:
 *   - Browsable folder hierarchy with back navigation
 *   - Supports single collection moves
 *   - Prevents moving into self or own descendants
 *   - Shows bucket root as a destination
 * ───────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import type { Collection } from "@/types";
import { Folder, CaretLeft, FolderOpen } from "@phosphor-icons/react";
import { getIcon } from "@/utils/iconMap";
import { playSfx } from "@/utils/sound";

interface MoveCollectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The collection IDs to move */
    collectionIds: string[];
}

export function MoveCollectionDialog({ open, onOpenChange, collectionIds }: MoveCollectionDialogProps) {
    const {
        collections,
        activeProjectId,
        activeCollectionId,
        updateCollection,
    } = useStore(useShallow((state) => ({
        collections: state.collections,
        activeProjectId: state.activeProjectId,
        activeCollectionId: state.activeCollectionId,
        updateCollection: state.updateCollection,
    })));

    const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    // All buckets for the active project
    const projectBuckets = useMemo(() =>
        collections.filter(c => c.projectId === activeProjectId && c.type === 'bucket' && !c.deleted),
        [collections, activeProjectId]
    );

    const selectedBucket = selectedBucketId
        ? collections.find(c => c.id === selectedBucketId)
        : null;

    // Collect all descendant IDs of the collections being moved (to prevent circular moves)
    const excludedIds = useMemo(() => {
        const excluded = new Set(collectionIds);
        const addDescendants = (parentId: string) => {
            collections
                .filter(c => c.parentId === parentId && !c.deleted)
                .forEach(c => {
                    excluded.add(c.id);
                    addDescendants(c.id);
                });
        };
        collectionIds.forEach(id => addDescendants(id));
        return excluded;
    }, [collectionIds, collections]);

    // Initialize when dialog opens
    useEffect(() => {
        if (open) {
            // Default to the bucket of the first collection, or the active bucket
            const firstColl = collections.find(c => c.id === collectionIds[0]);
            // Walk up to find the root bucket for this collection
            let bucketId: string | null = null;
            if (firstColl) {
                let curr: Collection | undefined = firstColl;
                while (curr && curr.type !== 'bucket') {
                    curr = collections.find(c => c.id === curr!.parentId);
                }
                bucketId = curr?.id || null;
            }
            setSelectedBucketId(bucketId || activeCollectionId || projectBuckets[0]?.id || null);
            setCurrentFolderId(null);
        }
    }, [open]);

    // Folders displayed at current level
    const displayedFolders = useMemo(() => {
        if (!activeProjectId || !selectedBucketId) return [];

        const parentId = currentFolderId || selectedBucketId;

        return collections
            .filter((c) =>
                c.projectId === activeProjectId &&
                !c.deleted &&
                c.parentId === parentId &&
                c.type === 'folder' &&
                !excludedIds.has(c.id)
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [collections, activeProjectId, selectedBucketId, currentFolderId, excludedIds]);

    const currentFolder = useMemo(
        () => collections.find(c => c.id === currentFolderId),
        [collections, currentFolderId]
    );

    const handleMove = () => {
        if (!selectedBucketId) return;

        const targetParentId = currentFolderId || selectedBucketId;

        collectionIds.forEach(id => {
            const coll = collections.find(c => c.id === id);
            if (!coll || coll.parentId === targetParentId || id === targetParentId) return;
            updateCollection(id, { parentId: targetParentId, lastModified: Date.now() });
        });

        playSfx('confirm');
        onOpenChange(false);
    };

    const handleBack = () => {
        if (!currentFolder) return;
        if (currentFolder.parentId === selectedBucketId || !currentFolder.parentId) {
            setCurrentFolderId(null);
        } else {
            setCurrentFolderId(currentFolder.parentId);
        }
    };

    const movingNames = collectionIds
        .map(id => collections.find(c => c.id === id)?.name)
        .filter(Boolean)
        .join(", ");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Move to...</DialogTitle>
                    <DialogDescription>
                        Choose a destination folder for{" "}
                        <span className="font-medium text-foreground">{movingNames || "selected items"}</span>.
                    </DialogDescription>
                </DialogHeader>

                {/* Bucket Tabs */}
                {projectBuckets.length > 0 ? (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border no-scrollbar">
                        {projectBuckets.map((bucket) => {
                            const BucketIcon = bucket.icon ? getIcon(bucket.icon) : Folder;
                            return (
                                <Button
                                    key={bucket.id}
                                    variant={selectedBucketId === bucket.id ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => {
                                        setSelectedBucketId(bucket.id);
                                        setCurrentFolderId(null);
                                    }}
                                    className="gap-2 shrink-0"
                                >
                                    <BucketIcon weight={selectedBucketId === bucket.id ? "fill" : "regular"} />
                                    {bucket.name}
                                </Button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground text-center py-2">
                        No buckets available.
                    </div>
                )}

                {/* Folder Navigation */}
                <div className="py-2">
                    <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground min-h-[32px] px-1">
                        {currentFolderId ? (
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleBack} data-sound-back>
                                    <CaretLeft />
                                </Button>
                                <span className="font-medium text-foreground flex items-center gap-2">
                                    {currentFolder?.icon ? (
                                        <span style={{ color: currentFolder.color || undefined }}>
                                            {(() => { const Icon = getIcon(currentFolder.icon); return <Icon weight="fill" size={16} />; })()}
                                        </span>
                                    ) : (
                                        <Folder weight="fill" className="text-amber-500" />
                                    )}
                                    {currentFolder?.name}
                                </span>
                            </div>
                        ) : (
                            <span className="px-2 flex items-center gap-2">
                                <FolderOpen className="text-muted-foreground" />
                                {selectedBucket?.name || "Root"}
                            </span>
                        )}
                    </div>

                    <ScrollArea className="h-[250px] border rounded-md p-1">
                        {displayedFolders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                <Folder size={32} className="opacity-20" />
                                <span className="text-xs">No subfolders</span>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {displayedFolders.map((folder) => {
                                    const Icon = folder.icon ? getIcon(folder.icon) : Folder;
                                    return (
                                        <button
                                            key={folder.id}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm text-left transition-colors"
                                            onClick={() => setCurrentFolderId(folder.id)}
                                        >
                                            <span style={{ color: folder.color || undefined }}>
                                                <Icon className="text-lg shrink-0" weight="fill" />
                                            </span>
                                            <span className="truncate">{folder.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleMove} disabled={!selectedBucketId} data-sound-confirm>
                        Move Here
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
