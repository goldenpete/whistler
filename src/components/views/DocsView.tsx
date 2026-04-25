/**
 * ─── DocsView.tsx ──────────────────────────────────────────────────
 *
 * Rich-text document editor view for creating and editing notes
 * within a project, with a formatting toolbar and file linking.
 *
 * Features:
 *   - ContentEditable-based rich text editing
 *   - Formatting toolbar (bold, italic, underline, strikethrough,
 *     lists, alignment, headings, links)
 *   - File picker dialog for embedding file references
 *   - Split-pane and full-screen editor layouts
 *   - Auto-save and URL-based document selection
 *   - HTML sanitization via security utilities
 *
 * Exports: default DocsView component
 * Related: FilePickerDialog, security (sanitizeHTML), useStore
 * ───────────────────────────────────────────────────────────────────
 */
import React, { useRef, useState, useEffect, useCallback, type ChangeEvent } from "react";
import { useStore, type AppStore } from "@/store/useStore";
import type { Doc, File as AppFile, Collection, Highlight } from "@/types";
import { useShallow } from "@/lib/zustand-shallow";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useKeybind } from "@/hooks/use-keybind";
import {
    NotePencil, TextB, TextItalic, ListBullets,
    TextUnderline, TextStrikethrough, TextAlignLeft, TextAlignCenter, TextAlignRight,
    CaretLeft, CaretRight, Link, File, Rows, ArrowsOutSimple, Layout, Plus, Folder, Clock
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { sanitizeHTML, isValidUrl } from "@/utils/security";
import { FilePickerDialog } from "@/components/dialogs/FilePickerDialog";
import { CollectionPickerDialog } from "@/components/dialogs/CollectionPickerDialog";
import { HighlightPickerDialog } from "@/components/dialogs/HighlightPickerDialog";
import { DocPickerDialog } from "@/components/dialogs/DocPickerDialog";
import { ViewEmptyState } from "@/components/views/ViewEmptyState";

export default function DocsView() {
    const { id } = useParams();
    const { docs, activeDocId, activeProjectId } = useStore(useShallow((state) => ({
        docs: state.docs,
        activeDocId: state.activeDocId,
        activeProjectId: state.activeProjectId,
    })));
    const activeDoc = docs.find((d: Doc) => d.id === activeDocId && !d.deleted);

    // Sync URL to store
    useEffect(() => {
        if (id && id !== activeDocId) {
            useStore.setState({ activeDocId: id });
        }
    }, [id, activeDocId]);

    // Auto-select first doc if none active
    useEffect(() => {
        if (!activeProjectId) return;
        const projectDocs = docs.filter((d: Doc) => d.projectId === activeProjectId && !d.deleted);
        if (!activeDocId && projectDocs.length > 0) {
            useStore.setState({ activeDocId: projectDocs[0].id });
        }
    }, [activeDocId, activeProjectId, docs]);

    const handleCreateDoc = () => {
        if (!activeProjectId) return;

        const newDoc = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            name: "New Document",
            content: "<p>Start writing...</p>",
            created: Date.now(),
            lastModified: Date.now()
        };

        useStore.setState((state: AppStore) => ({
            docs: [...state.docs, newDoc],
            activeDocId: newDoc.id
        }));
    };

    return (
        <div className="flex h-full bg-transparent overflow-hidden">
            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col min-h-0">
                {!activeProjectId ? (
                    <ViewEmptyState
                        icon={NotePencil}
                        title="No Project Selected"
                        description="Select or create a project to start organizing your documents."
                    />
                ) : activeDoc ? (
                    <DocEditor doc={activeDoc} />
                ) : (
                    <ViewEmptyState
                        icon={NotePencil}
                        title="Select or create a document"
                        description="Create a document to start writing inside this project."
                        actionLabel="Create Document"
                        onAction={handleCreateDoc}
                    />
                )}
            </div>
        </div>
    );
}

interface DocEditorProps {
    doc: { id: string; name: string; content: string; projectId: string };
}

function DocEditor({ doc }: DocEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [docName, setDocName] = useState(doc.name);
    const {
        docViewMode: viewMode = "page",
        setDocViewMode: setViewMode,
        files,
        collections,
        highlights,
        docs,
    } = useStore(useShallow((state: AppStore) => ({
        docViewMode: state.docViewMode,
        setDocViewMode: state.setDocViewMode,
        files: state.files,
        collections: state.collections,
        highlights: state.highlights,
        docs: state.docs,
    })));
    const saveTimeoutRef = useRef<number | null>(null);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [linkMode, setLinkMode] = useState<"external" | "internal">("external");
    const [internalType, setInternalType] = useState<"file" | "collection" | "highlight" | "doc">("file");
    const [internalId, setInternalId] = useState<string>("");
    const [filePickerOpen, setFilePickerOpen] = useState(false);
    const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
    const [highlightPickerOpen, setHighlightPickerOpen] = useState(false);
    const [docPickerOpen, setDocPickerOpen] = useState(false);
    const [formatState, setFormatState] = useState({
        bold: false,
        italic: false,
        underline: false,
        strikeThrough: false,
        justifyLeft: false,
        justifyCenter: false,
        justifyRight: false,
        unorderedList: false,
    });

    const updateFormatState = useCallback(() => {
        try {
            const bold = document.queryCommandState("bold");
            const italic = document.queryCommandState("italic");
            const underline = document.queryCommandState("underline");
            const strikeThrough = document.queryCommandState("strikeThrough");
            const justifyLeft = document.queryCommandState("justifyLeft");
            const justifyCenter = document.queryCommandState("justifyCenter");
            const justifyRight = document.queryCommandState("justifyRight");
            const unorderedList = document.queryCommandState("insertUnorderedList");
            setFormatState({
                bold: !!bold,
                italic: !!italic,
                underline: !!underline,
                strikeThrough: !!strikeThrough,
                justifyLeft: !!justifyLeft,
                justifyCenter: !!justifyCenter,
                justifyRight: !!justifyRight,
                unorderedList: !!unorderedList,
            });
        } catch {
        }
    }, []);

    useEffect(() => {
        if (editorRef.current) {
            // Sanitize content before setting it
            editorRef.current.innerHTML = sanitizeHTML(doc.content);
        }
        setDocName(doc.name);
        updateFormatState();
    }, [doc.id, updateFormatState]);

    const saveContent = useCallback(() => {
        if (editorRef.current) {
            const content = editorRef.current.innerHTML;
            useStore.setState((state: AppStore) => ({
                docs: state.docs.map((d: Doc) =>
                    d.id === doc.id
                        ? { ...d, content, lastModified: Date.now() }
                        : d
                )
            }));
        }
    }, [doc.id]);

    const handleInput = () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            saveContent();
        }, 1000);
    };

    // Save name change
    useEffect(() => {
        if (docName !== doc.name) {
             const timer = setTimeout(() => {
                useStore.setState((state: AppStore) => ({
                    docs: state.docs.map((d: Doc) =>
                        d.id === doc.id
                            ? { ...d, name: docName, lastModified: Date.now() }
                            : d
                    )
                }));
             }, 500);
             return () => clearTimeout(timer);
        }
    }, [docName, doc.id, doc.name]);

    useEffect(() => {
        const handleSelectionChange = () => {
            if (!editorRef.current) return;
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            const anchorNode = selection.anchorNode;
            if (!anchorNode) return;
            if (editorRef.current.contains(anchorNode)) {
                updateFormatState();
            }
        };
        document.addEventListener("selectionchange", handleSelectionChange);
        return () => {
            document.removeEventListener("selectionchange", handleSelectionChange);
        };
    }, [updateFormatState]);

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        updateFormatState();
    };
    // --- Keybinds ---
    useKeybind("docs.save", () => {
        saveContent();
        // Visual feedback could be added here
    }, { preventDefault: true });

    useKeybind("docs.link", () => {
        setLinkUrl("");
        setLinkDialogOpen(true);
    }, { preventDefault: true });

    useKeybind("docs.alignCenter", () => execCommand('justifyCenter'), { preventDefault: true });
    useKeybind("docs.alignLeft", () => execCommand('justifyLeft'), { preventDefault: true });
    useKeybind("docs.alignRight", () => execCommand('justifyRight'), { preventDefault: true });
    useKeybind("docs.bulletList", () => execCommand('insertUnorderedList'), { preventDefault: true });

    useKeybind("docs.bold", () => execCommand('bold'), { preventDefault: true });
    useKeybind("docs.italic", () => execCommand('italic'), { preventDefault: true });
    useKeybind("docs.underline", () => execCommand('underline'), { preventDefault: true });

    useKeybind("docs.viewMode", () => {
        const modes: ("page" | "pageless" | "pageless-wide")[] = ["page", "pageless", "pageless-wide"];
        const currentIndex = modes.indexOf(viewMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        setViewMode(modes[nextIndex]);
    }, { preventDefault: true });

    useKeybind("docs.blur", () => {
        if (document.activeElement === editorRef.current) {
            editorRef.current?.blur();
        }
    }, { preventDefault: true });

    const projectFiles = files.filter(
        (f: AppFile) => f.projectId === doc.projectId && !f.deleted
    );
    const projectCollections = collections.filter(
        (c: Collection) => c.projectId === doc.projectId && !c.deleted
    );
    const projectHighlights = highlights.filter((t: Highlight) => {
        const file = files.find((f: AppFile) => f.id === t.fileId && !f.deleted);
        return !!file && file.projectId === doc.projectId;
    });
    const projectDocs = docs.filter(
        (d: Doc) => d.projectId === doc.projectId && !d.deleted
    );
    const selectedFile = projectFiles.find((f: AppFile) => f.id === internalId);
    const selectedCollection = projectCollections.find((c: Collection) => c.id === internalId);
    const selectedHighlight = projectHighlights.find((t: Highlight) => t.id === internalId);
    const selectedHighlightFile = selectedHighlight
        ? files.find((f: AppFile) => f.id === selectedHighlight.fileId)
        : undefined;
    const selectedDoc = projectDocs.find((d: Doc) => d.id === internalId);
    const handleInsertLink = () => {
        if (linkMode === "external") {
            const url = linkUrl.trim();
            if (!url) return;
            
            if (!isValidUrl(url)) {
                alert("Invalid URL. Only http, https, blob, and data protocols are allowed.");
                return;
            }
            
            execCommand("createLink", url);
        } else {
            let href = "";
            if (internalType === "file") {
                const target = projectFiles.find((f: AppFile) => f.id === internalId);
                if (!target) return;
                href = `/file/${target.id}`;
            } else if (internalType === "collection") {
                const target = projectCollections.find((c: Collection) => c.id === internalId);
                if (!target) return;
                href = `/collections?collectionId=${target.id}`;
            } else if (internalType === "highlight") {
                const target = projectHighlights.find((t: Highlight) => t.id === internalId);
                if (!target) return;
                href = `/file/${target.fileId}?t=${target.start}`;
            } else if (internalType === "doc") {
                const target = projectDocs.find((d: Doc) => d.id === internalId);
                if (!target) return;
                href = `/docs/${target.id}`;
            }
            if (!href) return;
            execCommand("createLink", href);
        }
        setLinkDialogOpen(false);
        setLinkUrl("");
        setInternalId("");
    };

    const getContainerClass = () => {
        switch (viewMode) {
            case 'page':
                return "max-w-3xl mx-auto my-8 p-12 bg-card shadow-sm border border-border min-h-[800px]";
            case 'pageless':
                return "max-w-3xl mx-auto py-8 min-h-[400px]";
            case 'pageless-wide':
                return "max-w-none mx-8 py-8 min-h-[400px]";
            default:
                return "max-w-3xl mx-auto min-h-[400px]";
        }
    };

    return (
        <>
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-4 h-12 border-b border-border bg-card/30 flex-wrap shrink-0">
                <Input
                    value={docName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDocName(e.target.value)}
                    className="max-w-xs font-medium border-none shadow-none focus-visible:ring-0 bg-transparent px-2 text-sm mr-auto"
                    placeholder="Untitled"
                />

                <div className="w-px h-6 bg-border mx-1" />

                <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" onClick={() => execCommand('undo')} className="size-8" title="Undo">
                        <CaretLeft />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => execCommand('redo')} className="size-8" title="Redo">
                        <CaretRight />
                    </Button>
                </div>

                <div className="w-px h-6 bg-border mx-1" />

                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => execCommand('bold')}
                        className={cn(
                            "size-8",
                            formatState.bold && "bg-primary/10 text-primary border border-primary/40"
                        )}
                        title="Bold"
                    >
                        <TextB />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => execCommand('italic')}
                        className={cn(
                            "size-8",
                            formatState.italic && "bg-primary/10 text-primary border border-primary/40"
                        )}
                        title="Italic"
                    >
                        <TextItalic />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => execCommand('underline')}
                        className={cn(
                            "size-8",
                            formatState.underline && "bg-primary/10 text-primary border border-primary/40"
                        )}
                        title="Underline"
                    >
                        <TextUnderline />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => execCommand('strikeThrough')}
                        className={cn(
                            "size-8",
                            formatState.strikeThrough && "bg-primary/10 text-primary border border-primary/40"
                        )}
                        title="Strikethrough"
                    >
                        <TextStrikethrough />
                    </Button>
                </div>

                <div className="w-px h-6 bg-border mx-1" />

                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => execCommand('justifyLeft')}
                        className={cn(
                            "size-8",
                            formatState.justifyLeft && "bg-primary/10 text-primary border border-primary/40"
                        )}
                        title="Align Left"
                    >
                        <TextAlignLeft />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => execCommand('justifyCenter')}
                        className={cn(
                            "size-8",
                            formatState.justifyCenter && "bg-primary/10 text-primary border border-primary/40"
                        )}
                        title="Align Center"
                    >
                        <TextAlignCenter />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => execCommand('justifyRight')}
                        className={cn(
                            "size-8",
                            formatState.justifyRight && "bg-primary/10 text-primary border border-primary/40"
                        )}
                        title="Align Right"
                    >
                        <TextAlignRight />
                    </Button>
                </div>

                <div className="w-px h-6 bg-border mx-1" />

                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => execCommand('insertUnorderedList')}
                        className={cn(
                            "size-8",
                            formatState.unorderedList && "bg-primary/10 text-primary border border-primary/40"
                        )}
                        title="Bullet List"
                    >
                        <ListBullets />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            setLinkUrl("");
                            setLinkDialogOpen(true);
                        }}
                        className="size-8"
                        title="Insert Link"
                    >
                        <Link />
                    </Button>
                </div>

                <div className="w-px h-6 bg-border mx-1" />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                            <Layout className="size-4" />
                            <span className="hidden sm:inline">Layout</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewMode('page')}>
                            <File className="mr-2 size-4" />
                            <span>Page View</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setViewMode('pageless')}>
                            <Rows className="mr-2 size-4" />
                            <span>Pageless View</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setViewMode('pageless-wide')}>
                            <ArrowsOutSimple className="mr-2 size-4" />
                            <span>Pageless Wide View</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-y-auto bg-muted/10">
                <div className="p-4">
                    <div
                        ref={editorRef}
                        contentEditable
                        onInput={handleInput}
                        onBlur={saveContent}
                        className={cn(
                            "prose prose-sm dark:prose-invert focus:outline-none transition-all duration-300 ease-in-out [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:list-outside [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:list-outside",
                            getContainerClass()
                        )}
                        suppressContentEditableWarning
                    />
                </div>
            </div>

            <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-[34rem]">
                    <DialogHeader>
                        <DialogTitle>Insert Link</DialogTitle>
                        <DialogDescription>
                            Choose an external URL or an internal link.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant={linkMode === "external" ? "secondary" : "ghost"}
                                size="sm"
                                className={cn(
                                    "h-8 px-3 text-xs",
                                    linkMode === "external"
                                        ? "font-medium"
                                        : "text-muted-foreground"
                                )}
                                onClick={() => setLinkMode("external")}
                            >
                                External URL
                            </Button>
                            <Button
                                type="button"
                                variant={linkMode === "internal" ? "secondary" : "ghost"}
                                size="sm"
                                className={cn(
                                    "h-8 px-3 text-xs",
                                    linkMode === "internal"
                                        ? "font-medium"
                                        : "text-muted-foreground"
                                )}
                                onClick={() => setLinkMode("internal")}
                            >
                                Internal link
                            </Button>
                        </div>
                        {linkMode === "external" ? (
                            <div className="space-y-1">
                                <Input
                                    type="url"
                                    placeholder="https://example.com"
                                    value={linkUrl}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setLinkUrl(e.target.value)}
                                    className="h-9 bg-secondary/50 border-border"
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <div className="space-y-3 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 text-xs min-w-0">
                                    <Button
                                        type="button"
                                        variant={internalType === "file" ? "secondary" : "ghost"}
                                        size="sm"
                                        className={cn(
                                            "h-7 px-3",
                                            internalType === "file"
                                                ? "bg-secondary text-secondary-foreground"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                        onClick={() => setInternalType("file")}
                                    >
                                        Storage files
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={
                                            internalType === "collection" ? "secondary" : "ghost"
                                        }
                                        size="sm"
                                        className={cn(
                                            "h-7 px-3",
                                            internalType === "collection"
                                                ? "bg-secondary text-secondary-foreground"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                        onClick={() => setInternalType("collection")}
                                    >
                                        Collections
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={
                                            internalType === "highlight" ? "secondary" : "ghost"
                                        }
                                        size="sm"
                                        className={cn(
                                            "h-7 px-3",
                                            internalType === "highlight"
                                                ? "bg-secondary text-secondary-foreground"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                        onClick={() => setInternalType("highlight")}
                                    >
                                        Highlights
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={internalType === "doc" ? "secondary" : "ghost"}
                                        size="sm"
                                        className={cn(
                                            "h-7 px-3",
                                            internalType === "doc"
                                                ? "bg-secondary text-secondary-foreground"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                        onClick={() => setInternalType("doc")}
                                    >
                                        Documents
                                    </Button>
                                </div>
                                <div className="py-2 space-y-2">
                                    {internalType === "file" && (
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="flex-1 min-w-0 h-9 px-3 py-1 flex items-center gap-2 border border-border rounded-md bg-secondary/50 text-sm text-muted-foreground overflow-hidden">
                                                {selectedFile ? (
                                                    <>
                                                        <File className="shrink-0 text-foreground" />
                                                        <span className="truncate text-foreground">{selectedFile.name}</span>
                                                    </>
                                                ) : (
                                                    <span className="opacity-50">No file selected</span>
                                                )}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="shrink-0 bg-secondary/50 border-border hover:bg-secondary text-foreground"
                                                onClick={() => setFilePickerOpen(true)}
                                            >
                                                Browse...
                                            </Button>
                                        </div>
                                    )}
                                    {internalType === "collection" && (
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="flex-1 min-w-0 h-9 px-3 py-1 flex items-center gap-2 border border-border rounded-md bg-secondary/50 text-sm text-muted-foreground overflow-hidden">
                                                {selectedCollection ? (
                                                    <>
                                                        <Folder className="shrink-0 text-foreground" />
                                                        <span className="truncate text-foreground">{selectedCollection.name}</span>
                                                    </>
                                                ) : (
                                                    <span className="opacity-50">No collection selected</span>
                                                )}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="shrink-0 bg-secondary/50 border-border hover:bg-secondary text-foreground"
                                                onClick={() => setCollectionPickerOpen(true)}
                                            >
                                                Browse...
                                            </Button>
                                        </div>
                                    )}
                                    {internalType === "highlight" && (
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="flex-1 min-w-0 h-9 px-3 py-1 flex items-center gap-2 border border-border rounded-md bg-secondary/50 text-sm text-muted-foreground overflow-hidden">
                                                {selectedHighlight ? (
                                                    <>
                                                        <Clock className="shrink-0 text-primary" size={14} />
                                                        <span className="truncate text-foreground min-w-0">
                                                            {selectedHighlight.note || selectedHighlight.text || selectedHighlightFile?.name || "Highlight"}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="opacity-50 text-xs">No highlight selected</span>
                                                )}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="shrink-0 bg-secondary/50 border-border hover:bg-secondary text-foreground"
                                                onClick={() => setHighlightPickerOpen(true)}
                                            >
                                                Browse...
                                            </Button>
                                        </div>
                                    )}
                                    {internalType === "doc" && (
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="flex-1 min-w-0 h-9 px-3 py-1 flex items-center gap-2 border border-border rounded-md bg-secondary/50 text-sm text-muted-foreground overflow-hidden">
                                                {selectedDoc ? (
                                                    <>
                                                        <NotePencil className="shrink-0 text-foreground" size={14} />
                                                        <span className="truncate text-foreground">{selectedDoc.name}</span>
                                                    </>
                                                ) : (
                                                    <span className="opacity-50">No document selected</span>
                                                )}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="shrink-0 bg-secondary/50 border-border hover:bg-secondary text-foreground"
                                                onClick={() => setDocPickerOpen(true)}
                                            >
                                                Browse...
                                            </Button>
                                        </div>
                                    )}
                                    <FilePickerDialog
                                        open={filePickerOpen}
                                        onOpenChange={setFilePickerOpen}
                                        onSelect={(selectedId) => setInternalId(selectedId)}
                                        initialFileId={internalType === "file" ? internalId : undefined}
                                    />
                                    <CollectionPickerDialog
                                        open={collectionPickerOpen}
                                        onOpenChange={setCollectionPickerOpen}
                                        onSelect={(selectedId) => setInternalId(selectedId)}
                                        initialCollectionId={internalType === "collection" ? internalId : undefined}
                                    />
                                    <HighlightPickerDialog
                                        open={highlightPickerOpen}
                                        onOpenChange={setHighlightPickerOpen}
                                        onSelect={(selectedId) => setInternalId(selectedId)}
                                        initialHighlightId={internalType === "highlight" ? internalId : undefined}
                                    />
                                    <DocPickerDialog
                                        open={docPickerOpen}
                                        onOpenChange={setDocPickerOpen}
                                        onSelect={(selectedId) => setInternalId(selectedId)}
                                        initialDocId={internalType === "doc" ? internalId : undefined}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleInsertLink}
                            disabled={
                                linkMode === "external"
                                    ? !linkUrl.trim()
                                    : !internalId
                            }
                        >
                            Insert
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
