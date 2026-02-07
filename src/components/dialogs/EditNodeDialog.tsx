import { useState, useEffect, type ChangeEvent } from "react";
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
import type { GraphNode, File, Highlight, Collection, Doc } from "@/types";
import { File as FileIcon, FolderOpen, Clock, Link as LinkIcon } from "@phosphor-icons/react";
import { FilePickerDialog } from "./FilePickerDialog";
import { HighlightPickerDialog } from "./HighlightPickerDialog";
import { useNavigate } from "react-router-dom";
import { ICONS } from "./StorageDialogs";
import { cn } from "@/lib/utils";

interface NodeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    type: 'note' | 'file' | 'collection' | 'highlight' | 'link' | 'doc';
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
        highlights,
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
    const [iconName, setIconName] = useState("");
    const [selectedFileId, setSelectedFileId] = useState("");
    const [selectedCollectionId, setSelectedCollectionId] = useState("");
    const [selectedHighlightId, setSelectedHighlightId] = useState("");
    const [selectedDocId, setSelectedDocId] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    
    // File Picker State
    const [filePickerOpen, setFilePickerOpen] = useState(false);
    const [highlightPickerOpen, setHighlightPickerOpen] = useState(false);

    // Initialize state
    useEffect(() => {
        if (open) {
            if (mode === 'edit' && node) {
                setTitle(node.title);
                setColor(node.color || PRESET_COLORS[0]);
                setIconName(node.icon || "");
                if (node.type === 'file') {
                    const linkedId = node.linkedId || "";
                    setSelectedFileId(linkedId);
                } else {
                    setSelectedFileId("");
                }
                if (node.type === 'highlight') {
                    const linkedId = node.linkedId || "";
                    const hExists = highlights.some((t: Highlight) => t.id === linkedId);
                    setSelectedHighlightId(hExists ? linkedId : "");
                } else {
                    setSelectedHighlightId("");
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
                const accentKey = (accentTheme || "orange") as keyof typeof ACCENT_COLOR_MAP;
                const accentColor = ACCENT_COLOR_MAP[accentKey] ?? PRESET_COLORS[0];
                const nodeColor = enableDefaultColorControls && defaultColors?.node
                    ? defaultColors.node
                    : accentColor;
                setColor(nodeColor);
                setSelectedFileId("");
                setSelectedCollectionId("");
                setSelectedHighlightId("");
                setSelectedDocId("");
                setLinkUrl("");
            }
        }
    }, [open, mode, node, type, highlights, accentTheme, enableDefaultColorControls, defaultColors]);

    // Update title when selection changes (if title is empty or matches previous selection)
    useEffect(() => {
        if (mode === 'create') {
            if (type === 'file' && selectedFileId) {
                const f = files.find((f: File) => f.id === selectedFileId);
                if (f) setTitle(f.name);
            } else if (type === 'collection' && selectedCollectionId) {
                const c = collections.find((c: Collection) => c.id === selectedCollectionId);
                if (c) setTitle(c.name);
            } else if (type === 'doc' && selectedDocId) {
                const d = docs.find((d: Doc) => d.id === selectedDocId);
                if (d) setTitle(d.name);
            }
        }
    }, [selectedFileId, selectedCollectionId, selectedDocId, type, mode, files, collections, docs]);

    const handleSubmit = () => {
        if (!title.trim() && type === 'note') return;
        if (type === 'file' && !selectedFileId) return;
        if (type === 'highlight' && !selectedHighlightId) return;
        if (type === 'doc' && !selectedDocId) return;
        
        let finalTitle = title;
        if (!finalTitle.trim()) {
            if (type === 'file') finalTitle = files.find((f: File) => f.id === selectedFileId)?.name || "File";
            else if (type === 'collection') finalTitle = collections.find((c: Collection) => c.id === selectedCollectionId)?.name || "Collection";
            else if (type === 'link') finalTitle = linkUrl;
            else if (type === 'doc') finalTitle = docs.find((d: Doc) => d.id === selectedDocId)?.name || "Document";
            else if (type === 'highlight') {
                const h = highlights.find((t: Highlight) => t.id === selectedHighlightId);
                const file = h ? files.find((f: File) => f.id === h.fileId) : undefined;
                if (h) {
                    const mins = Math.floor(h.start / 60);
                    const secs = Math.floor(h.start % 60);
                    const timeLabel = `${mins}:${secs.toString().padStart(2, "0")}`;
                    finalTitle = h.note || h.text || (file ? `${file.name} @ ${timeLabel}` : `Highlight @ ${timeLabel}`);
                } else {
                    finalTitle = "Highlight";
                }
            }
        }

        const updates: Partial<GraphNode> = {
            title: finalTitle,
            color,
            icon: iconName,
            type, // Ensure type is set/updated
            url: type === 'link' ? linkUrl : undefined,
            linkedId: type === 'file'
                ? selectedFileId
                : type === 'highlight'
                    ? selectedHighlightId
                    : type === 'collection'
                        ? selectedCollectionId
                        : type === 'doc'
                            ? selectedDocId
                            : undefined
        };

        onSave(updates);
        onOpenChange(false);
    };

    const projectCollections = collections.filter((c: Collection) => c.projectId === activeProjectId && !c.deleted);
    const projectDocs = docs.filter((d: Doc) => d.projectId === activeProjectId && !d.deleted);
    
    // Helpers to display selected file
    const selectedFile = files.find((f: File) => f.id === selectedFileId);
    const selectedHighlight = highlights.find((t: Highlight) => t.id === selectedHighlightId);
    const selectedHighlightFile = selectedHighlight ? files.find((f: File) => f.id === selectedHighlight.fileId) : undefined;
    const selectedDoc = docs.find((d: Doc) => d.id === selectedDocId);
    const selectedCollection = projectCollections.find((c: Collection) => c.id === selectedCollectionId);

    const fileSelector = (
        <div className="space-y-2">
            <Label>Select File</Label>
            <div className="flex items-center gap-2">
                <div className="flex-1 h-9 px-3 py-1 flex items-center gap-2 border border-border rounded-md bg-secondary/50 text-sm text-muted-foreground overflow-hidden">
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
        if (type === "highlight" && selectedHighlight && selectedHighlightFile) {
            navigate(`/file/${selectedHighlightFile.id}?t=${selectedHighlight.start}`);
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
        (type === "highlight" && !!selectedHighlight && !!selectedHighlightFile) ||
        (type === "doc" && !!selectedDoc) ||
        (type === "link" && !!linkUrl.trim());

    const highlightSelector = (
        <div className="space-y-2">
            <Label>Select Highlight</Label>
            <div className="flex items-center gap-2">
                <div className="flex-1 h-11 px-3 py-1.5 flex items-center gap-3 border border-border rounded-md bg-secondary/50 text-sm text-muted-foreground overflow-hidden">
                    {selectedHighlight && selectedHighlightFile ? (
                        <>
                            <div className="flex flex-col items-center justify-center gap-1">
                                <Clock className="text-primary" size={16} />
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    {(() => {
                                        const mins = Math.floor(selectedHighlight.start / 60);
                                        const secs = Math.floor(selectedHighlight.start % 60);
                                        return `${mins}:${secs.toString().padStart(2, "0")}`;
                                    })()}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate text-foreground">
                                    {selectedHighlight.note || selectedHighlight.text || selectedHighlightFile.name}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {selectedHighlightFile.name}
                                </div>
                            </div>
                        </>
                    ) : (
                        <span className="opacity-50 text-xs">No highlight selected</span>
                    )}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setHighlightPickerOpen(true)}
                >
                    <Clock className="mr-2" />
                    Browse...
                </Button>
            </div>

            <HighlightPickerDialog
                open={highlightPickerOpen}
                onOpenChange={setHighlightPickerOpen}
                onSelect={(id) => setSelectedHighlightId(id)}
                initialHighlightId={selectedHighlightId}
            />
        </div>
    );

    const docSelector = (
        <div className="space-y-2">
            <Label>Select Document</Label>
            <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue placeholder="Choose a document..." />
                </SelectTrigger>
                <SelectContent>
                    {projectDocs.map((d: Doc) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? `Add ${type.charAt(0).toUpperCase() + type.slice(1)}` : 'Edit Node'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'create' ? 'Configure new node details.' : 'Update node details.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Common: Title & Color */}
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input 
                            value={title} 
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} 
                            placeholder={type === 'note' ? "Note Title" : "Optional (defaults to selection)"}
                            className="bg-secondary/50 border-border"
                        />
                    </div>

                    <ColorPicker color={color} onChange={setColor} />

                    {/* Type Specific Fields */}
                    {type === 'file' && fileSelector}

                    {type === 'collection' && (
                        <div className="space-y-2">
                            <Label>Select Collection</Label>
                            <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
                                <SelectTrigger className="bg-secondary/50 border-border">
                                    <SelectValue placeholder="Choose a collection..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {projectCollections.map((c: Collection) => (
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
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setLinkUrl(e.target.value)} 
                                placeholder="https://..."
                                className="bg-secondary/50 border-border"
                            />
                        </div>
                    )}

                    {type === 'highlight' && highlightSelector}

                    {type === 'doc' && docSelector}

                    <div className="space-y-2 pt-2">
                        <div className="text-xs font-medium text-muted-foreground">Preview</div>
                        <div className="border border-border rounded-lg bg-secondary/20 p-3 space-y-2">
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
                            {type === 'highlight' && selectedHighlight && selectedHighlightFile && (
                                <div className="flex items-center gap-3">
                                    <Clock className="text-primary" />
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate text-foreground">
                                            {selectedHighlight.note || selectedHighlight.text || selectedHighlightFile.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            {(() => {
                                                const mins = Math.floor(selectedHighlight.start / 60);
                                                const secs = Math.floor(selectedHighlight.start % 60);
                                                return `${mins}:${secs.toString().padStart(2, "0")}`;
                                            })()} • {selectedHighlightFile.name}
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
                    <Button
                        onClick={handleSubmit}
                        className="bg-primary text-primary-foreground"
                        data-sound-confirm={mode === "create" ? true : undefined}
                    >
                        {mode === 'create' ? 'Create' : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
