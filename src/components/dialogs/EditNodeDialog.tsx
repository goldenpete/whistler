/**
 * ─── EditNodeDialog.tsx ─────────────────────────────────────────────
 *
 * Unified dialog for creating and editing graph nodes. Supports
 * multiple node types (note, file, collection, highlight, link, doc)
 * and adapts its form fields accordingly.
 *
 * Features / Responsibilities:
 *   - Dual-mode operation: 'create' and 'edit'
 *   - Dynamic form that changes based on the selected node type
 *   - Integrates FilePickerDialog and HighlightPickerDialog for
 *     linking nodes to existing files or highlights
 *   - Colour picker and icon selector for visual customisation
 *   - Validates inputs and delegates persistence via an onSave callback
 * ───────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, type ChangeEvent } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColorPicker, PRESET_COLORS, ACCENT_COLOR_MAP } from "@/components/ui/ColorPicker";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import type { GraphNode, File, Highlight, Collection, Doc } from "@/types";
import { File as FileIcon, FolderOpen, Clock, Link as LinkIcon, NotePencil } from "@phosphor-icons/react";
import { FilePickerDialog } from "./FilePickerDialog";
import { CollectionPickerDialog } from "./CollectionPickerDialog";
import { HighlightPickerDialog } from "./HighlightPickerDialog";
import { DocPickerDialog } from "./DocPickerDialog";
import { useNavigate } from "react-router-dom";
import { iconMap, iconNames } from "@/utils/iconMap";
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
    } = useStore(useShallow((state) => ({
        files: state.files,
        collections: state.collections,
        highlights: state.highlights,
        docs: state.docs,
        activeProjectId: state.activeProjectId,
        accentTheme: state.accentTheme,
        enableDefaultColorControls: state.enableDefaultColorControls,
        defaultColors: state.defaultColors,
    })));
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
    const [customizeTab, setCustomizeTab] = useState("color");
    
    // Picker Dialog State
    const [filePickerOpen, setFilePickerOpen] = useState(false);
    const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
    const [highlightPickerOpen, setHighlightPickerOpen] = useState(false);
    const [docPickerOpen, setDocPickerOpen] = useState(false);

    // Initialize state
    useEffect(() => {
        if (open) {
            setCustomizeTab("color");
            if (mode === 'edit' && node) {
                setTitle(node.title);
                setColor(node.color ?? PRESET_COLORS[0]);
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
                const nodeColor = enableDefaultColorControls && defaultColors?.node !== undefined
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
            <Label className="text-zinc-400">Select File</Label>
            <div className="flex items-center gap-2">
                <div className="flex-1 min-h-10 px-3 py-2 flex items-center gap-2 border border-border/60 bg-zinc-900 text-sm text-zinc-400 overflow-hidden">
                    {selectedFile ? (
                        <>
                            <FileIcon className="shrink-0 text-white" />
                            <span className="truncate text-white">{selectedFile.name}</span>
                        </>
                    ) : (
                        <span className="opacity-70">No file selected</span>
                    )}
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="shrink-0 bg-zinc-900 border-border/60 text-zinc-300 hover:bg-zinc-800 hover:text-white"
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
            <Label className="text-zinc-400">Select Highlight</Label>
            <div className="flex items-center gap-2">
                <div className="flex-1 min-h-12 px-3 py-2 flex items-center gap-3 border border-border/60 bg-zinc-900 text-sm text-zinc-400 overflow-hidden">
                    {selectedHighlight && selectedHighlightFile ? (
                        <>
                            <div className="flex flex-col items-center justify-center gap-1">
                                <Clock className="text-primary" size={16} />
                                <span className="font-mono text-[10px] text-zinc-500">
                                    {(() => {
                                        const mins = Math.floor(selectedHighlight.start / 60);
                                        const secs = Math.floor(selectedHighlight.start % 60);
                                        return `${mins}:${secs.toString().padStart(2, "0")}`;
                                    })()}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate text-white">
                                    {selectedHighlight.note || selectedHighlight.text || selectedHighlightFile.name}
                                </div>
                                <div className="text-xs text-zinc-500 truncate">
                                    {selectedHighlightFile.name}
                                </div>
                            </div>
                        </>
                    ) : (
                        <span className="opacity-70 text-xs">No highlight selected</span>
                    )}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 bg-zinc-900 border-border/60 text-zinc-300 hover:bg-zinc-800 hover:text-white"
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
            <Label className="text-zinc-400">Document</Label>
            <div className="flex items-center gap-2">
                <div className="flex-1 min-h-10 px-3 py-2 flex items-center gap-2 border border-border/60 bg-zinc-900 text-sm text-zinc-400 overflow-hidden">
                    {selectedDoc ? (
                        <>
                            <NotePencil className="shrink-0 text-white" size={14} />
                            <span className="truncate text-white">{selectedDoc.name}</span>
                        </>
                    ) : (
                        <span className="opacity-70">No document selected</span>
                    )}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 bg-zinc-900 border-border/60 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    onClick={() => setDocPickerOpen(true)}
                >
                    <NotePencil className="mr-2" size={14} />
                    Browse...
                </Button>
            </div>
            <DocPickerDialog
                open={docPickerOpen}
                onOpenChange={setDocPickerOpen}
                onSelect={(id) => setSelectedDocId(id)}
                initialDocId={selectedDocId}
            />
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? `New ${type.charAt(0).toUpperCase() + type.slice(1)} Node` : 'Edit Node'}</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        {mode === 'create' ? 'Configure the node to add to your graph.' : 'Update this node\'s properties.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="node-title" className="text-zinc-400">Title</Label>
                        <Input
                            id="node-title"
                            value={title} 
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} 
                            placeholder={type === 'note' ? "Note title..." : "Optional — auto-fills from selection"}
                            className="bg-zinc-900 border-border/60 text-white placeholder:text-zinc-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-zinc-400">Customize</Label>
                        <Tabs value={customizeTab} onValueChange={setCustomizeTab} className="border border-zinc-800 bg-zinc-950/40 rounded-none overflow-hidden">
                            <TabsList className="w-full rounded-none bg-zinc-900 border-b border-zinc-800 p-1 h-9">
                                <TabsTrigger value="color" className="flex-1 rounded-none text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Color</TabsTrigger>
                                <TabsTrigger value="icon" className="flex-1 rounded-none text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Icon</TabsTrigger>
                            </TabsList>

                            <TabsContent value="color" className="mt-0 p-3">
                                <ColorPicker
                                    color={color}
                                    onChange={setColor}
                                    showLabel={false}
                                />
                            </TabsContent>

                            <TabsContent value="icon" className="mt-0 p-3">
                                <div className="grid grid-cols-7 gap-2 max-h-56 overflow-y-auto pr-1">
                                <button
                                    type="button"
                                    onClick={() => setIconName("")}
                                    className={cn(
                                        "aspect-square flex items-center justify-center rounded-none border transition-all",
                                        !iconName ? "bg-primary border-primary text-primary-foreground" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                                    )}
                                    title="None"
                                >
                                    <span className="text-[8px] font-bold">Ø</span>
                                </button>
                                {iconNames.map(name => {
                                    const Icon = iconMap[name];
                                    return (
                                        <button
                                            key={name}
                                            type="button"
                                            onClick={() => setIconName(name)}
                                            className={cn(
                                                "aspect-square flex items-center justify-center rounded-none border transition-all",
                                                iconName === name ? "bg-primary border-primary text-primary-foreground" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                                            )}
                                            title={name}
                                        >
                                            <Icon size={18} />
                                        </button>
                                    );
                                })}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Type-specific Fields */}
                    {type === 'file' && fileSelector}

                    {type === 'collection' && (
                        <div className="space-y-2">
                            <Label className="text-zinc-400">Collection</Label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 min-h-10 px-3 py-2 flex items-center gap-2 border border-border/60 bg-zinc-900 text-sm text-zinc-400 overflow-hidden">
                                    {selectedCollection ? (
                                        <>
                                            <FolderOpen className="shrink-0 text-white" size={14} />
                                            <span className="truncate text-white">{selectedCollection.name}</span>
                                        </>
                                    ) : (
                                        <span className="opacity-70">No collection selected</span>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0 bg-zinc-900 border-border/60 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                    onClick={() => setCollectionPickerOpen(true)}
                                >
                                    <FolderOpen className="mr-2" size={14} />
                                    Browse...
                                </Button>
                            </div>
                            <CollectionPickerDialog
                                open={collectionPickerOpen}
                                onOpenChange={setCollectionPickerOpen}
                                onSelect={(id) => setSelectedCollectionId(id)}
                                initialCollectionId={selectedCollectionId}
                            />
                        </div>
                    )}

                    {type === 'link' && (
                        <div className="space-y-2">
                            <Label htmlFor="node-url" className="text-zinc-400">URL</Label>
                            <Input 
                                id="node-url"
                                value={linkUrl} 
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setLinkUrl(e.target.value)} 
                                placeholder="https://..."
                                className="bg-zinc-900 border-border/60 text-white placeholder:text-zinc-500"
                            />
                        </div>
                    )}

                    {type === 'highlight' && highlightSelector}
                    {type === 'doc' && docSelector}

                    {/* Compact Preview */}
                    {(canOpen || (type === 'note' && title.trim())) && (
                        <div className="border border-zinc-800 bg-zinc-950/40 p-3 flex items-center gap-3">
                            <div
                                className="w-8 h-8 rounded-none flex items-center justify-center shrink-0"
                                style={{ backgroundColor: color || '#3b82f6' }}
                            >
                                {iconName && iconMap[iconName] ? (
                                    (() => { const Icon = iconMap[iconName]; return <Icon size={14} className="text-white" />; })()
                                ) : (
                                    <span className="text-white text-[10px] font-bold">
                                        {(title || type).charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-white truncate">
                                    {type === 'note' ? title : (
                                        type === 'file' ? selectedFile?.name :
                                        type === 'collection' ? selectedCollection?.name :
                                        type === 'doc' ? selectedDoc?.name :
                                        type === 'highlight' ? (selectedHighlight?.note || selectedHighlight?.text || selectedHighlightFile?.name) :
                                        type === 'link' ? linkUrl : title
                                    ) || title || 'Untitled'}
                                </div>
                                <div className="text-[10px] text-zinc-500">{type} node</div>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-3 shrink-0 text-zinc-400 hover:text-white hover:bg-zinc-900"
                                disabled={!canOpen}
                                onClick={handleOpenTarget}
                            >
                                Open
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 pt-4">
                    <div className="ml-auto flex items-center gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            className="bg-primary text-primary-foreground hover:opacity-90"
                            data-sound-confirm={mode === "create" ? true : undefined}
                        >
                            {mode === 'create' ? 'Create' : 'Save'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
