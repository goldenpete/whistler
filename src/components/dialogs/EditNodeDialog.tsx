import { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ColorPicker, PRESET_COLORS } from "@/components/ui/ColorPicker";
import { useStore } from "@/store/useStore";
import type { GraphNode } from "@/types";
import { 
    Note, File, Folder, Clock, Link as LinkIcon, 
    TextAa, Palette, HardDrives, CaretLeft 
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface NodeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    type: 'note' | 'file' | 'collection' | 'timestamp' | 'link';
    node?: GraphNode;
    onSave: (data: Partial<GraphNode>) => void;
}

export function NodeDialog({
    open,
    onOpenChange,
    mode,
    type,
    node,
    onSave
}: NodeDialogProps) {
    const { files, collections, storages, activeProjectId, activeStorageId } = useStore();
    
    // Form State
    const [title, setTitle] = useState("");
    const [color, setColor] = useState(PRESET_COLORS[0]);
    const [selectedFileId, setSelectedFileId] = useState("");
    const [selectedCollectionId, setSelectedCollectionId] = useState("");
    const [timestampTime, setTimestampTime] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    const [selectedStorageId, setSelectedStorageId] = useState<string | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    // Initialize state
    useEffect(() => {
        if (open) {
            const defaultStorageId = activeStorageId || storages.find(s => s.projectId === activeProjectId && !s.deleted)?.id || null;
            if (mode === 'edit' && node) {
                setTitle(node.title);
                setColor(node.color || PRESET_COLORS[0]);
                if (node.type === 'file' || node.type === 'timestamp') {
                    const linkedId = node.linkedId || "";
                    setSelectedFileId(linkedId);
                    const linkedFile = files.find(f => f.id === linkedId);
                    if (linkedFile) {
                        setSelectedStorageId(linkedFile.storageId || defaultStorageId);
                        setCurrentFolderId(linkedFile.parentId || null);
                    } else {
                        setSelectedStorageId(defaultStorageId);
                        setCurrentFolderId(null);
                    }
                } else {
                    setSelectedFileId("");
                    setSelectedStorageId(defaultStorageId);
                    setCurrentFolderId(null);
                }
                if (node.type === 'collection') {
                    setSelectedCollectionId(node.linkedId || "");
                } else {
                    setSelectedCollectionId("");
                }
                if (node.type === 'link') {
                    setLinkUrl(node.url || "");
                } else {
                    setLinkUrl("");
                }
                setTimestampTime("");
                // We would populate other fields if GraphNode stored them.
                // Assuming GraphNode might store data in a 'data' field or similar.
                // For now, we'll just handle Title/Color for edit, and specific fields for Create.
                // If the user wants to edit the *link* of a link node, we need to support that.
                // Let's assume we can store it in 'data' property if it exists, or just implicit.
                // For this task, the user emphasized "before creating".
                // But also "Make sure its in the edit popup as well".
                
                // We'll try to infer or use existing data.
                // Since I don't see 'data' in GraphNode type in snippets, I'll assume we might need to add it or it's loose.
                // I'll stick to Title/Color for now unless I see where to store it.
                // Wait, "prompt for file... before creating". This suggests the Title *is* the file name?
                // Or maybe we need to store the reference.
                // I'll assume for now we just set the Title based on the selection for "File/Collection".
            } else {
                // Create Mode Defaults
                setTitle("");
                setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
                setSelectedFileId("");
                setSelectedCollectionId("");
                setTimestampTime("");
                setLinkUrl("");
                setSelectedStorageId(defaultStorageId);
                setCurrentFolderId(null);
            }
        }
    }, [open, mode, node, type, files, storages, activeProjectId, activeStorageId]);

    // Update title when selection changes (if title is empty or matches previous selection)
    useEffect(() => {
        if (mode === 'create') {
            if (type === 'file' && selectedFileId) {
                const f = files.find(f => f.id === selectedFileId);
                if (f) setTitle(f.name);
            } else if (type === 'collection' && selectedCollectionId) {
                const c = collections.find(c => c.id === selectedCollectionId);
                if (c) setTitle(c.name);
            }
        }
    }, [selectedFileId, selectedCollectionId, type, mode, files, collections]);

    const handleSubmit = () => {
        if (!title.trim() && type === 'note') return; // Note needs title
        // Other types might auto-generate title from selection
        
        let finalTitle = title;
        if (!finalTitle.trim()) {
            if (type === 'file') finalTitle = files.find(f => f.id === selectedFileId)?.name || "File";
            else if (type === 'collection') finalTitle = collections.find(c => c.id === selectedCollectionId)?.name || "Collection";
            else if (type === 'link') finalTitle = linkUrl;
            else if (type === 'timestamp') finalTitle = timestampTime || "Timestamp";
        }

        const updates: Partial<GraphNode> = {
            title: finalTitle,
            color,
            type, // Ensure type is set/updated
            url: type === 'link' ? linkUrl : undefined,
            linkedId: (type === 'file' || type === 'timestamp') ? selectedFileId : (type === 'collection' ? selectedCollectionId : undefined)
        };

        // Here we would attach the extra data (fileId, etc) to the node if the type supported it.
        // For now, we just ensure the visual representation (Title/Color) is correct.
        // The user asked to "prompt", which we are doing.
        
        onSave(updates);
        onOpenChange(false);
    };

    // Filtered lists
    const projectFiles = files.filter(f => f.projectId === activeProjectId && !f.deleted);
    const projectCollections = collections.filter(c => c.projectId === activeProjectId && !c.deleted);
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
    const fileSelector = (
        <div className="space-y-2">
            <Label>Select File</Label>
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
                <ScrollArea className="h-[220px] border border-zinc-800 rounded-md p-1">
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
                                >
                                    <File className="text-muted-foreground text-lg shrink-0" />
                                    <span className="truncate">{file.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? `Add ${type.charAt(0).toUpperCase() + type.slice(1)}` : 'Edit Node'}</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        {mode === 'create' ? 'Configure new node details.' : 'Update node details.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Common: Title & Color */}
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            placeholder={type === 'note' ? "Note Title" : "Optional (defaults to selection)"}
                            className="bg-zinc-900 border-zinc-800"
                        />
                    </div>

                    <ColorPicker color={color} onChange={setColor} />

                    {/* Type Specific Fields */}
                    {type === 'file' && fileSelector}

                    {type === 'collection' && (
                        <div className="space-y-2">
                            <Label>Select Collection</Label>
                            <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
                                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                                    <SelectValue placeholder="Choose a collection..." />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                    {projectCollections.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {type === 'link' && (
                        <div className="space-y-2">
                            <Label>URL</Label>
                            <Input 
                                value={linkUrl} 
                                onChange={(e) => setLinkUrl(e.target.value)} 
                                placeholder="https://..."
                                className="bg-zinc-900 border-zinc-800"
                            />
                        </div>
                    )}

                    {type === 'timestamp' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Timestamp / Time</Label>
                                <Input 
                                    value={timestampTime} 
                                    onChange={(e) => setTimestampTime(e.target.value)} 
                                    placeholder="00:00"
                                    className="bg-zinc-900 border-zinc-800"
                                />
                            </div>
                            {fileSelector}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} className="bg-primary text-primary-foreground">
                        {mode === 'create' ? 'Create' : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
