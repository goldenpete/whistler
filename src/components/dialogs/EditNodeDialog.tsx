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
import { File as FileIcon, FolderOpen } from "@phosphor-icons/react";
import { FilePickerDialog } from "./FilePickerDialog";

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
    const { files, collections, activeProjectId } = useStore();
    
    // Form State
    const [title, setTitle] = useState("");
    const [color, setColor] = useState(PRESET_COLORS[0]);
    const [selectedFileId, setSelectedFileId] = useState("");
    const [selectedCollectionId, setSelectedCollectionId] = useState("");
    const [timestampTime, setTimestampTime] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    
    // File Picker State
    const [filePickerOpen, setFilePickerOpen] = useState(false);

    // Initialize state
    useEffect(() => {
        if (open) {
            if (mode === 'edit' && node) {
                setTitle(node.title);
                setColor(node.color || PRESET_COLORS[0]);
                if (node.type === 'file' || node.type === 'timestamp') {
                    const linkedId = node.linkedId || "";
                    setSelectedFileId(linkedId);
                } else {
                    setSelectedFileId("");
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
            } else {
                // Create Mode Defaults
                setTitle("");
                setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
                setSelectedFileId("");
                setSelectedCollectionId("");
                setTimestampTime("");
                setLinkUrl("");
            }
        }
    }, [open, mode, node, type]);

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

        onSave(updates);
        onOpenChange(false);
    };

    // Filtered lists
    const projectCollections = collections.filter(c => c.projectId === activeProjectId && !c.deleted);
    
    // Helpers to display selected file
    const selectedFile = files.find(f => f.id === selectedFileId);

    const fileSelector = (
        <div className="space-y-2">
            <Label>Select File</Label>
            <div className="flex items-center gap-2">
                <div className="flex-1 h-9 px-3 py-1 flex items-center gap-2 border border-zinc-800 rounded-md bg-zinc-900 text-sm text-muted-foreground overflow-hidden">
                    {selectedFile ? (
                        <>
                            <FileIcon className="shrink-0 text-foreground" />
                            <span className="truncate text-foreground">{selectedFile.name}</span>
                        </>
                    ) : (
                        <span className="opacity-50">No file selected</span>
                    )}
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="shrink-0"
                    onClick={() => setFilePickerOpen(true)}
                >
                    <FolderOpen className="mr-2" />
                    Browse...
                </Button>
            </div>
            
            <FilePickerDialog
                open={filePickerOpen}
                onOpenChange={setFilePickerOpen}
                onSelect={(fileId) => setSelectedFileId(fileId)}
                initialFileId={selectedFileId}
            />
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
