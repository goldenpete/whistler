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
import { ColorPicker, PRESET_COLORS, ACCENT_COLOR_MAP } from "@/components/ui/ColorPicker";
import { useStore } from "@/store/useStore";
import type { GraphNode } from "@/types";
import { File as FileIcon, FolderOpen, Clock, Link as LinkIcon } from "@phosphor-icons/react";
import { FilePickerDialog } from "./FilePickerDialog";
import { TimestampPickerDialog } from "./TimestampPickerDialog";
import { useNavigate } from "react-router-dom";

interface NodeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    type: 'note' | 'file' | 'collection' | 'timestamp' | 'link' | 'doc';
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
    const {
        files,
        collections,
        timestamps,
        docs,
        activeProjectId,
        accentTheme,
        enableDefaultColorControls,
        defaultColors,
    } = useStore();
    const navigate = useNavigate();
    
    // Form State
    const [title, setTitle] = useState("");
    const [color, setColor] = useState(PRESET_COLORS[0]);
    const [selectedFileId, setSelectedFileId] = useState("");
    const [selectedCollectionId, setSelectedCollectionId] = useState("");
    const [selectedTimestampId, setSelectedTimestampId] = useState("");
    const [selectedDocId, setSelectedDocId] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    
    // File Picker State
    const [filePickerOpen, setFilePickerOpen] = useState(false);
    const [timestampPickerOpen, setTimestampPickerOpen] = useState(false);

    // Initialize state
    useEffect(() => {
        if (open) {
            if (mode === 'edit' && node) {
                setTitle(node.title);
                setColor(node.color || PRESET_COLORS[0]);
                if (node.type === 'file') {
                    const linkedId = node.linkedId || "";
                    setSelectedFileId(linkedId);
                } else {
                    setSelectedFileId("");
                }
                if (node.type === 'timestamp') {
                    const linkedId = node.linkedId || "";
                    const tsExists = timestamps.some(t => t.id === linkedId);
                    setSelectedTimestampId(tsExists ? linkedId : "");
                } else {
                    setSelectedTimestampId("");
                }
                if (node.type === 'collection') {
                    setSelectedCollectionId(node.linkedId || "");
                } else {
                    setSelectedCollectionId("");
                }
                if (node.type === 'doc') {
                    setSelectedDocId(node.linkedId || "");
                } else {
                    setSelectedDocId("");
                }
                if (node.type === 'link') {
                    setLinkUrl(node.url || "");
                } else {
                    setLinkUrl("");
                }
            } else {
                setTitle("");
                const accentColor = ACCENT_COLOR_MAP[accentTheme || "orange"] ?? PRESET_COLORS[0];
                const nodeColor = enableDefaultColorControls && defaultColors?.node
                    ? defaultColors.node
                    : accentColor;
                setColor(nodeColor);
                setSelectedFileId("");
                setSelectedCollectionId("");
                setSelectedTimestampId("");
                setSelectedDocId("");
                setLinkUrl("");
            }
        }
    }, [open, mode, node, type, timestamps, accentTheme, enableDefaultColorControls, defaultColors]);

    // Update title when selection changes (if title is empty or matches previous selection)
    useEffect(() => {
        if (mode === 'create') {
            if (type === 'file' && selectedFileId) {
                const f = files.find(f => f.id === selectedFileId);
                if (f) setTitle(f.name);
            } else if (type === 'collection' && selectedCollectionId) {
                const c = collections.find(c => c.id === selectedCollectionId);
                if (c) setTitle(c.name);
            } else if (type === 'doc' && selectedDocId) {
                const d = docs.find(d => d.id === selectedDocId);
                if (d) setTitle(d.name);
            }
        }
    }, [selectedFileId, selectedCollectionId, selectedDocId, type, mode, files, collections, docs]);

    const handleSubmit = () => {
        if (!title.trim() && type === 'note') return;
        if (type === 'file' && !selectedFileId) return;
        if (type === 'timestamp' && !selectedTimestampId) return;
        if (type === 'doc' && !selectedDocId) return;
        
        let finalTitle = title;
        if (!finalTitle.trim()) {
            if (type === 'file') finalTitle = files.find(f => f.id === selectedFileId)?.name || "File";
            else if (type === 'collection') finalTitle = collections.find(c => c.id === selectedCollectionId)?.name || "Collection";
            else if (type === 'link') finalTitle = linkUrl;
            else if (type === 'doc') finalTitle = docs.find(d => d.id === selectedDocId)?.name || "Document";
            else if (type === 'timestamp') {
                const ts = timestamps.find(t => t.id === selectedTimestampId);
                const file = ts ? files.find(f => f.id === ts.fileId) : undefined;
                if (ts) {
                    const mins = Math.floor(ts.start / 60);
                    const secs = Math.floor(ts.start % 60);
                    const timeLabel = `${mins}:${secs.toString().padStart(2, "0")}`;
                    finalTitle = ts.note || (file ? `${file.name} @ ${timeLabel}` : `Timestamp @ ${timeLabel}`);
                } else {
                    finalTitle = "Timestamp";
                }
            }
        }

        const updates: Partial<GraphNode> = {
            title: finalTitle,
            color,
            type, // Ensure type is set/updated
            url: type === 'link' ? linkUrl : undefined,
            linkedId: type === 'file'
                ? selectedFileId
                : type === 'timestamp'
                    ? selectedTimestampId
                    : type === 'collection'
                        ? selectedCollectionId
                        : type === 'doc'
                            ? selectedDocId
                            : undefined
        };

        onSave(updates);
        onOpenChange(false);
    };

    const projectCollections = collections.filter(c => c.projectId === activeProjectId && !c.deleted);
    const projectDocs = docs.filter(d => d.projectId === activeProjectId && !d.deleted);
    
    // Helpers to display selected file
    const selectedFile = files.find(f => f.id === selectedFileId);
    const selectedTimestamp = timestamps.find(t => t.id === selectedTimestampId);
    const selectedTimestampFile = selectedTimestamp ? files.find(f => f.id === selectedTimestamp.fileId) : undefined;
    const selectedDoc = docs.find(d => d.id === selectedDocId);
    const selectedCollection = projectCollections.find(c => c.id === selectedCollectionId);

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

    const handleOpenTarget = () => {
        if (type === "file" && selectedFileId) {
            navigate(`/file/${selectedFileId}`);
            return;
        }
        if (type === "collection" && selectedCollectionId) {
            useStore.setState({ activeCollectionId: selectedCollectionId });
            navigate("/collections");
            return;
        }
        if (type === "timestamp" && selectedTimestamp && selectedTimestampFile) {
            navigate(`/file/${selectedTimestampFile.id}?t=${selectedTimestamp.start}`);
            return;
        }
        if (type === "doc" && selectedDocId) {
            useStore.setState({ activeDocId: selectedDocId });
            navigate("/docs");
            return;
        }
        if (type === "link" && linkUrl.trim()) {
            const url = linkUrl.trim();
            window.open(url, "_blank", "noopener,noreferrer");
        }
    };

    const canOpen =
        (type === "file" && !!selectedFile) ||
        (type === "collection" && !!selectedCollection) ||
        (type === "timestamp" && !!selectedTimestamp && !!selectedTimestampFile) ||
        (type === "doc" && !!selectedDoc) ||
        (type === "link" && !!linkUrl.trim());

    const timestampSelector = (
        <div className="space-y-2">
            <Label>Select Timestamp</Label>
            <div className="flex items-center gap-2">
                <div className="flex-1 h-11 px-3 py-1.5 flex items-center gap-3 border border-zinc-800 rounded-md bg-zinc-900 text-sm text-muted-foreground overflow-hidden">
                    {selectedTimestamp && selectedTimestampFile ? (
                        <>
                            <div className="flex flex-col items-center justify-center gap-1">
                                <Clock className="text-primary" size={16} />
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    {(() => {
                                        const mins = Math.floor(selectedTimestamp.start / 60);
                                        const secs = Math.floor(selectedTimestamp.start % 60);
                                        return `${mins}:${secs.toString().padStart(2, "0")}`;
                                    })()}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate text-foreground">
                                    {selectedTimestamp.note || selectedTimestampFile.name}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate">
                                    {selectedTimestampFile.name}
                                </div>
                            </div>
                        </>
                    ) : (
                        <span className="opacity-50 text-xs">No timestamp selected</span>
                    )}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setTimestampPickerOpen(true)}
                >
                    <Clock className="mr-2" />
                    Browse...
                </Button>
            </div>

            <TimestampPickerDialog
                open={timestampPickerOpen}
                onOpenChange={setTimestampPickerOpen}
                onSelect={(id) => setSelectedTimestampId(id)}
                initialTimestampId={selectedTimestampId}
            />
        </div>
    );

    const docSelector = (
        <div className="space-y-2">
            <Label>Select Document</Label>
            <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue placeholder="Choose a document..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {projectDocs.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
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

                    {type === 'timestamp' && timestampSelector}

                    {type === 'doc' && docSelector}

                    <div className="space-y-2 pt-2">
                        <div className="text-xs font-medium text-muted-foreground">Preview</div>
                        <div className="border border-zinc-800 rounded-lg bg-zinc-950/70 p-3 space-y-2">
                            {type === 'file' && selectedFile && (
                                <div className="flex items-center gap-3">
                                    <FileIcon className="text-muted-foreground" />
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate text-foreground">
                                            {selectedFile.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            File node
                                        </div>
                                    </div>
                                </div>
                            )}
                            {type === 'collection' && selectedCollection && (
                                <div className="flex items-center gap-3">
                                    <FolderOpen className="text-muted-foreground" />
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate text-foreground">
                                            {selectedCollection.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            Collection node
                                        </div>
                                    </div>
                                </div>
                            )}
                            {type === 'timestamp' && selectedTimestamp && selectedTimestampFile && (
                                <div className="flex items-center gap-3">
                                    <Clock className="text-primary" />
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate text-foreground">
                                            {selectedTimestamp.note || selectedTimestampFile.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            {(() => {
                                                const mins = Math.floor(selectedTimestamp.start / 60);
                                                const secs = Math.floor(selectedTimestamp.start % 60);
                                                return `${mins}:${secs.toString().padStart(2, "0")}`;
                                            })()} • {selectedTimestampFile.name}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {type === 'doc' && selectedDoc && (
                                <div className="flex items-center gap-3">
                                    <FileIcon className="text-muted-foreground" />
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate text-foreground">
                                            {selectedDoc.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            Doc node
                                        </div>
                                    </div>
                                </div>
                            )}
                            {type === 'link' && linkUrl.trim().length > 0 && (
                                <div className="flex items-center gap-3">
                                    <LinkIcon className="text-muted-foreground" />
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate text-foreground">
                                            {linkUrl.trim()}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            External link
                                        </div>
                                    </div>
                                </div>
                            )}
                            {type === 'note' && title.trim().length > 0 && (
                                <div className="flex items-center gap-3">
                                    <FileIcon className="text-muted-foreground" />
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate text-foreground">
                                            {title}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            Note node
                                        </div>
                                    </div>
                                </div>
                            )}
                            {!canOpen && type !== 'note' && (
                                <div className="text-xs text-muted-foreground">
                                    Select a target above to preview what this node will open.
                                </div>
                            )}
                            <Button
                                size="sm"
                                className="w-full mt-1 bg-primary text-primary-foreground"
                                variant="default"
                                disabled={!canOpen}
                                onClick={handleOpenTarget}
                            >
                                Open
                            </Button>
                        </div>
                    </div>
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
