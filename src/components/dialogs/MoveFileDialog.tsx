/**
 * ─── MoveFileDialog.tsx ─────────────────────────────────────────────
 *
 * Dialog for moving one or more files to a different storage or
 * folder within the active Whistler project.
 *
 * Features / Responsibilities:
 *   - Browsable storage and folder hierarchy with back navigation
 *   - Supports batch-moving multiple files at once
 *   - Prevents moving a folder into itself or its own descendants
 *   - Highlights the current location context and updates the store
 *     on confirmation
 * ───────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import type { File, Storage } from "@/types";
import { Folder, HardDrives, CaretLeft } from "@phosphor-icons/react";

interface MoveFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fileIds: string[];
    container?: HTMLElement | null;
}

export function MoveFileDialog({ open, onOpenChange, fileIds, container }: MoveFileDialogProps) {
    const { 
        files, 
        storages, 
        updateFile, 
        activeProjectId, 
        activeStorageId: globalActiveStorageId 
    } = useStore(useShallow((state) => ({
        files: state.files,
        storages: state.storages,
        updateFile: state.updateFile,
        activeProjectId: state.activeProjectId,
        activeStorageId: state.activeStorageId,
    })));

    const [selectedStorageId, setSelectedStorageId] = useState<string | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    // Names of files being moved (for description)
    const movingNames = useMemo(() =>
        fileIds
            .map(id => files.find((f: File) => f.id === id)?.name)
            .filter(Boolean)
            .join(", "),
        [fileIds, files]
    );

    // Filter storages for current project
    const projectStorages = useMemo(() => 
        storages.filter((s: Storage) => s.projectId === activeProjectId && !s.deleted),
        [storages, activeProjectId]
    );

    // Initialize state when dialog opens
    useEffect(() => {
        if (open) {
            // Default to the storage of the first file, or the active storage
            const firstFile = useStore.getState().files.find((f: File) => f.id === fileIds[0]);
            const initialStorageId = firstFile?.storageId || globalActiveStorageId || projectStorages[0]?.id || null;
            
            setSelectedStorageId(initialStorageId);
            setCurrentFolderId(null);
        }
    }, [open]); // Only run when open state changes

    // Filter folders to display in the list
    const displayedFolders = useMemo(() => {
        if (!activeProjectId || !selectedStorageId) return [];

        return files.filter((f: File) => 
            f.projectId === activeProjectId && 
            f.storageId === selectedStorageId &&
            // Handle null/undefined parentId consistently
            (currentFolderId ? f.parentId === currentFolderId : !f.parentId) &&
            !f.deleted &&
            f.type === 'folder' && 
            !fileIds.includes(f.id) // Don't show folders being moved to avoid circular dependency
        ).sort((a: File, b: File) => a.name.localeCompare(b.name));
    }, [files, activeProjectId, selectedStorageId, currentFolderId, fileIds]);

    const currentFolder = useMemo(() => 
        files.find((f: File) => f.id === currentFolderId),
        [files, currentFolderId]
    );

    const handleMove = () => {
        if (!selectedStorageId) return;

        fileIds.forEach(id => {
            // Prevent moving a folder into its own child (simplified check: prevent moving into self)
            if (id === currentFolderId) return;

            updateFile(id, {
                storageId: selectedStorageId,
                parentId: currentFolderId
            });
        });
        onOpenChange(false);
    };

    const handleBack = () => {
        if (currentFolder?.parentId) {
            setCurrentFolderId(currentFolder.parentId);
        } else {
            setCurrentFolderId(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]" portalContainer={container}>
                <DialogHeader>
                    <DialogTitle>Move to...</DialogTitle>
                    <DialogDescription>
                        Choose a destination folder for{" "}
                        <span className="font-medium text-foreground">{movingNames || "selected items"}</span>.
                    </DialogDescription>
                </DialogHeader>
                
                {/* Storage Tabs */}
                {projectStorages.length > 0 ? (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border no-scrollbar">
                        {projectStorages.map((storage: Storage) => (
                            <Button
                                key={storage.id}
                                variant={selectedStorageId === storage.id ? "default" : "ghost"}
                                size="sm"
                                onClick={() => {
                                    setSelectedStorageId(storage.id);
                                    setCurrentFolderId(null);
                                }}
                                className="gap-2 shrink-0"
                            >
                                <HardDrives weight={selectedStorageId === storage.id ? "fill" : "regular"} />
                                {storage.name}
                            </Button>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground text-center py-2">
                        No storages available.
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
                                    <Folder weight="fill" className="text-amber-500" />
                                    {currentFolder?.name}
                                </span>
                            </div>
                        ) : (
                            <span className="px-2 flex items-center gap-2">
                                <HardDrives className="text-muted-foreground" />
                                Root
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
                                {displayedFolders.map((folder: File) => (
                                    <button
                                        key={folder.id}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm text-left transition-colors"
                                        onClick={() => setCurrentFolderId(folder.id)}
                                    >
                                        <Folder className="text-amber-500 text-lg shrink-0" weight="fill" />
                                        <span className="truncate">{folder.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleMove} disabled={!selectedStorageId} data-sound-confirm>
                        Move Here
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
