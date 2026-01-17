import { useState, useEffect } from "react";
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
import { 
    Note, File, Folder, Clock, Link as LinkIcon, 
    TextAa, Palette 
} from "@phosphor-icons/react";

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

    // Initialize state
    useEffect(() => {
        if (open) {
            if (mode === 'edit' && node) {
                setTitle(node.title);
                setColor(node.color || PRESET_COLORS[0]);
                if (node.type === 'file' || node.type === 'timestamp') {
                    setSelectedFileId(node.linkedId || "");
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
                    {type === 'file' && (
                        <div className="space-y-2">
                            <Label>Select File</Label>
                            <Select value={selectedFileId} onValueChange={setSelectedFileId}>
                                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                                    <SelectValue placeholder="Choose a file..." />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                    {projectFiles.map(f => (
                                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

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
                            <div className="space-y-2">
                                <Label>Select File</Label>
                                <Select value={selectedFileId} onValueChange={setSelectedFileId}>
                                    <SelectTrigger className="bg-zinc-900 border-zinc-800">
                                        <SelectValue placeholder="Choose a file..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                        {projectFiles.map(f => (
                                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
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
