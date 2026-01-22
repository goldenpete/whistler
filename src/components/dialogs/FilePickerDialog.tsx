import { useState, useMemo, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/store/useStore";
import { 
    File as FileIcon, Folder, HardDrives, CaretLeft 
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface FilePickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (fileId: string) => void;
    initialFileId?: string;
    title?: string;
}

export function FilePickerDialog({
    open,
    onOpenChange,
    onSelect,
    initialFileId,
    title = "Select File"
}: FilePickerDialogProps) {
    const { files, storages, activeProjectId, activeStorageId } = useStore();
    
    // Internal selection state
    const [selectedFileId, setSelectedFileId] = useState<string>("");
    
    // Navigation state
    const [selectedStorageId, setSelectedStorageId] = useState<string | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    // Initialize state when opening
    useEffect(() => {
        if (open) {
            setSelectedFileId(initialFileId || "");
            
            // Try to navigate to the initial file if it exists
            if (initialFileId) {
                const file = files.find(f => f.id === initialFileId);
                if (file) {
                    setSelectedStorageId(file.storageId);
                    setCurrentFolderId(file.parentId || null);
                    return;
                }
            }
            
            // Default navigation
            const defaultStorageId = activeStorageId || storages.find(s => s.projectId === activeProjectId && !s.deleted)?.id || null;
            setSelectedStorageId(defaultStorageId);
            setCurrentFolderId(null);
        }
    }, [open, initialFileId, files, storages, activeProjectId, activeStorageId]);

    const handleConfirm = () => {
        if (selectedFileId) {
            onSelect(selectedFileId);
            onOpenChange(false);
        }
    };

    // Filtered lists
    const projectStorages = useMemo(
        () => storages.filter(s => s.projectId === activeProjectId && !s.deleted),
        [storages, activeProjectId]
    );

    const displayedFolders = useMemo(() => {
        if (!activeProjectId || !selectedStorageId) return [];
        return files
            .filter(f =>
                f.projectId === activeProjectId &&
                f.storageId === selectedStorageId &&
                (currentFolderId ? f.parentId === currentFolderId : !f.parentId) &&
                !f.deleted &&
                f.type === "folder"
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [files, activeProjectId, selectedStorageId, currentFolderId]);

    const displayedFiles = useMemo(() => {
        if (!activeProjectId || !selectedStorageId) return [];
        return files
            .filter(f =>
                f.projectId === activeProjectId &&
                f.storageId === selectedStorageId &&
                (currentFolderId ? f.parentId === currentFolderId : !f.parentId) &&
                !f.deleted &&
                f.type !== "folder"
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [files, activeProjectId, selectedStorageId, currentFolderId]);

    const currentFolder = useMemo(
        () => files.find(f => f.id === currentFolderId),
        [files, currentFolderId]
    );

    const handleBack = () => {
        if (currentFolder?.parentId) {
            setCurrentFolderId(currentFolder.parentId);
        } else {
            setCurrentFolderId(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 gap-0 bg-zinc-900 border-zinc-800">
                <DialogHeader className="p-4 border-b border-white/10 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-lg font-medium">{title}</DialogTitle>
                    <DialogDescription className="sr-only">
                        Select a file from your storage.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2 py-2">
                    {/* Storage Tabs */}
                    {projectStorages.length > 0 ? (
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800 no-scrollbar">
                            {projectStorages.map(storage => (
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
                        <div className="text-xs text-muted-foreground py-1">No storages available.</div>
                    )}

                    {/* Breadcrumbs / Navigation */}
                    <div className="py-2">
                        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground min-h-[32px] px-1">
                            {currentFolderId && currentFolder ? (
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleBack}>
                                        <CaretLeft />
                                    </Button>
                                    <span className="font-medium text-foreground flex items-center gap-2">
                                        <Folder weight="fill" className="text-amber-500" />
                                        {currentFolder.name}
                                    </span>
                                </div>
                            ) : (
                                <span className="px-2 flex items-center gap-2">
                                    <HardDrives className="text-muted-foreground" />
                                    Root
                                </span>
                            )}
                        </div>

                        {/* File List */}
                        <ScrollArea className="h-[300px] border border-zinc-800 rounded-md p-1">
                            {displayedFolders.length === 0 && displayedFiles.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                    <Folder size={32} className="opacity-20" />
                                    <span className="text-xs">No items</span>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {displayedFolders.map(folder => (
                                        <button
                                            key={folder.id}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm text-left transition-colors"
                                            onClick={() => setCurrentFolderId(folder.id)}
                                        >
                                            <Folder className="text-amber-500 text-lg shrink-0" weight="fill" />
                                            <span className="truncate">{folder.name}</span>
                                        </button>
                                    ))}
                                    {displayedFiles.map(file => (
                                        <button
                                            key={file.id}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-colors",
                                                selectedFileId === file.id
                                                    ? "bg-primary/20 text-primary"
                                                    : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                                            )}
                                            onClick={() => setSelectedFileId(file.id)}
                                            onDoubleClick={() => {
                                                setSelectedFileId(file.id);
                                                onSelect(file.id);
                                                onOpenChange(false);
                                            }}
                                        >
                                            <FileIcon className="text-muted-foreground text-lg shrink-0" />
                                            <span className="truncate">{file.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button 
                        onClick={handleConfirm} 
                        className="bg-primary text-primary-foreground"
                        disabled={!selectedFileId}
                    >
                        Select
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
