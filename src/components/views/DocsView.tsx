import React, { useRef, useState, useEffect, useCallback, type ChangeEvent } from "react";
import { useStore, type AppStore } from "@/store/useStore";
import type { Doc, File as AppFile, Collection, Highlight } from "@/types";
import { useShallow } from "@/lib/zustand-shallow";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useKeybind } from "@/hooks/use-keybind";
import {
    NotePencil, TextB, TextItalic, ListBullets,
    TextUnderline, TextStrikethrough, TextAlignLeft, TextAlignCenter, TextAlignRight,
    ArrowsCounterClockwise, ArrowsClockwise, Link, File, Rows, ArrowsOutSimple, Layout, Plus
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { sanitizeHTML } from "@/utils/security";

export default function DocsView() {
    const { docs, activeDocId, activeProjectId } = useStore();
    const activeDoc = docs.find((d: Doc) => d.id === activeDocId && !d.deleted);

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
                {activeDoc ? (
                    <DocEditor doc={activeDoc} />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <NotePencil size={64} weight="thin" className="mx-auto mb-4 opacity-30" />
                            <p className="mb-4">Select or create a document</p>
                            <Button onClick={handleCreateDoc}>
                                <Plus className="mr-2" /> Create Document
                            </Button>
                        </div>
                    </div>
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
    } = useStore(useShallow((state: AppStore) => ({
        docViewMode: state.docViewMode,
        setDocViewMode: state.setDocViewMode,
        files: state.files,
        collections: state.collections,
        highlights: state.highlights,
    })));
    const saveTimeoutRef = useRef<number | null>(null);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [linkMode, setLinkMode] = useState<"external" | "internal">("external");
    const [internalType, setInternalType] = useState<"file" | "collection" | "highlight">("file");
    const [internalId, setInternalId] = useState<string>("");
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
    useKeybind("ctrl+s", () => {
        saveContent();
        // Visual feedback could be added here
    }, { preventDefault: true });

    useKeybind("ctrl+k", () => {
        setLinkUrl("");
        setLinkDialogOpen(true);
    }, { preventDefault: true });

    useKeybind("ctrl+shift+e", () => execCommand('justifyCenter'), { preventDefault: true });
    useKeybind("ctrl+shift+l", () => execCommand('justifyLeft'), { preventDefault: true });
    useKeybind("ctrl+shift+r", () => execCommand('justifyRight'), { preventDefault: true });
    useKeybind("ctrl+shift+8", () => execCommand('insertUnorderedList'), { preventDefault: true }); // Standard bullet shortcut
    useKeybind("ctrl+shift+u", () => execCommand('insertUnorderedList'), { preventDefault: true }); // Alternate

    useKeybind("ctrl+b", () => execCommand('bold'), { preventDefault: true });
    useKeybind("ctrl+i", () => execCommand('italic'), { preventDefault: true });
    useKeybind("ctrl+u", () => execCommand('underline'), { preventDefault: true });

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
    const handleInsertLink = () => {
        if (linkMode === "external") {
            const url = linkUrl.trim();
            if (!url) return;
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
            <div className="flex items-center gap-1 p-2 border-b border-border bg-card/30 flex-wrap">
                <Input
                    value={docName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDocName(e.target.value)}
                    className="max-w-xs font-medium border-none shadow-none focus-visible:ring-0 bg-transparent px-2 text-base mr-auto"
                    placeholder="Untitled"
                />

                <div className="w-px h-6 bg-border mx-1" />

                <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" onClick={() => execCommand('undo')} className="size-8" title="Undo">
                        <ArrowsCounterClockwise />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => execCommand('redo')} className="size-8" title="Redo">
                        <ArrowsClockwise />
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
                            "prose prose-sm dark:prose-invert focus:outline-none transition-all duration-300 ease-in-out",
                            getContainerClass()
                        )}
                        suppressContentEditableWarning
                    />
                </div>
            </div>

            <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                <DialogContent className="sm:max-w-sm bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Insert Link</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Choose an external URL or an internal link.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant={linkMode === "external" ? "default" : "ghost"}
                                size="sm"
                                className={cn(
                                    "h-8 px-3 text-xs",
                                    linkMode === "external"
                                        ? "bg-white text-black hover:bg-white/90"
                                        : "text-zinc-300 hover:text-white"
                                )}
                                onClick={() => setLinkMode("external")}
                            >
                                External URL
                            </Button>
                            <Button
                                type="button"
                                variant={linkMode === "internal" ? "default" : "ghost"}
                                size="sm"
                                className={cn(
                                    "h-8 px-3 text-xs",
                                    linkMode === "internal"
                                        ? "bg-white text-black hover:bg-white/90"
                                        : "text-zinc-300 hover:text-white"
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
                                    className="h-9 bg-zinc-900 border-zinc-700"
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs">
                                    <Button
                                        type="button"
                                        variant={internalType === "file" ? "secondary" : "ghost"}
                                        size="sm"
                                        className={cn(
                                            "h-7 px-3",
                                            internalType === "file"
                                                ? "bg-zinc-100 text-black hover:bg-zinc-200"
                                                : "text-zinc-300 hover:text-white"
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
                                                ? "bg-zinc-100 text-black hover:bg-zinc-200"
                                                : "text-zinc-300 hover:text-white"
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
                                                ? "bg-zinc-100 text-black hover:bg-zinc-200"
                                                : "text-zinc-300 hover:text-white"
                                        )}
                                        onClick={() => setInternalType("highlight")}
                                    >
                                        Highlights
                                    </Button>
                                </div>
                                <ScrollArea className="max-h-56 rounded-md border border-zinc-800 bg-zinc-900/60">
                                    <div className="p-2 space-y-1">
                                        {internalType === "file" &&
                                            (projectFiles.length > 0 ? (
                                                projectFiles.map((f: AppFile) => (
                                                    <button
                                                        key={f.id}
                                                        type="button"
                                                        onClick={() => setInternalId(f.id)}
                                                        className={cn(
                                                            "w-full flex items-center justify-between px-2 py-1.5 rounded text-xs text-left transition-colors",
                                                            internalId === f.id
                                                                ? "bg-primary/20 text-primary"
                                                                : "hover:bg-zinc-800/80 text-zinc-200"
                                                        )}
                                                    >
                                                        <span className="truncate">{f.name}</span>
                                                        <span className="ml-2 text-[10px] text-zinc-400 uppercase">
                                                            {f.type}
                                                        </span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-2 py-1.5 text-xs text-zinc-500">
                                                    No files in this project
                                                </div>
                                            ))}
                                        {internalType === "collection" &&
                                            (projectCollections.length > 0 ? (
                                                projectCollections.map((c: Collection) => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => setInternalId(c.id)}
                                                        className={cn(
                                                            "w-full flex items-center justify-between px-2 py-1.5 rounded text-xs text-left transition-colors",
                                                            internalId === c.id
                                                                ? "bg-primary/20 text-primary"
                                                                : "hover:bg-zinc-800/80 text-zinc-200"
                                                        )}
                                                    >
                                                        <span className="truncate">{c.name}</span>
                                                        <span className="ml-2 text-[10px] text-zinc-400 uppercase">
                                                            collection
                                                        </span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-2 py-1.5 text-xs text-zinc-500">
                                                    No collections in this project
                                                </div>
                                            ))}
                                        {internalType === "highlight" &&
                                            (projectHighlights.length > 0 ? (
                                                projectHighlights.map((t: Highlight) => {
                                                    const file = files.find(
                                                        (f: AppFile) => f.id === t.fileId
                                                    );
                                                    const mins = Math.floor(t.start / 60);
                                                    const secs = Math.floor(t.start % 60)
                                                        .toString()
                                                        .padStart(2, "0");
                                                    return (
                                                        <button
                                                            key={t.id}
                                                            type="button"
                                                            onClick={() => setInternalId(t.id)}
                                                            className={cn(
                                                                "w-full flex flex-col px-2 py-1.5 rounded text-xs text-left transition-colors",
                                                                internalId === t.id
                                                                    ? "bg-primary/20 text-primary"
                                                                    : "hover:bg-zinc-800/80 text-zinc-200"
                                                            )}
                                                        >
                                                            <span className="truncate">
                                                                {t.note || "Highlight"}
                                                            </span>
                                                            <span className="text-[10px] text-zinc-400 truncate">
                                                                {file?.name || "File"} • {mins}:
                                                                {secs}
                                                            </span>
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                <div className="px-2 py-1.5 text-xs text-zinc-500">
                                                    No highlights in this project
                                                </div>
                                            ))}
                                    </div>
                                </ScrollArea>
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
