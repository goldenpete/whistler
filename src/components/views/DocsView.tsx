import { useRef, useState, useEffect, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import {
    NotePencil, TextB, TextItalic, ListBullets,
    TextUnderline, TextStrikethrough, TextAlignLeft, TextAlignCenter, TextAlignRight,
    ArrowCounterClockwise, ArrowClockwise, Link, File, Rows, ArrowsOutSimple, Layout, Plus
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

export default function DocsView() {
    const { docs, activeDocId, activeProjectId } = useStore();
    const activeDoc = docs.find(d => d.id === activeDocId);

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

        useStore.setState(state => ({
            docs: [...state.docs, newDoc],
            activeDocId: newDoc.id
        }));
    };

    return (
        <div className="flex h-full bg-background overflow-hidden">
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
    doc: { id: string; name: string; content: string };
}

function DocEditor({ doc }: DocEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [docName, setDocName] = useState(doc.name);
    const { docViewMode: viewMode = 'page', setDocViewMode: setViewMode } = useStore();
    const saveTimeoutRef = useRef<number | null>(null);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.innerHTML = doc.content;
        }
        setDocName(doc.name);
    }, [doc.id]); // Reset on doc change

    const saveContent = useCallback(() => {
        if (editorRef.current) {
            const content = editorRef.current.innerHTML;
            useStore.setState(state => ({
                docs: state.docs.map(d =>
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
                useStore.setState(state => ({
                    docs: state.docs.map(d =>
                        d.id === doc.id
                            ? { ...d, name: docName, lastModified: Date.now() }
                            : d
                    )
                }));
             }, 500);
             return () => clearTimeout(timer);
        }
    }, [docName, doc.id, doc.name]);

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    const handleInsertLink = () => {
        const url = linkUrl.trim();
        if (!url) return;
        execCommand("createLink", url);
        setLinkDialogOpen(false);
        setLinkUrl("");
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
                    onChange={(e) => setDocName(e.target.value)}
                    className="max-w-xs font-medium border-none shadow-none focus-visible:ring-0 bg-transparent px-2 text-base mr-auto"
                    placeholder="Untitled"
                />

                <div className="w-px h-6 bg-border mx-1" />

                <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" onClick={() => execCommand('undo')} className="size-8" title="Undo">
                        <ArrowCounterClockwise />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => execCommand('redo')} className="size-8" title="Redo">
                        <ArrowClockwise />
                    </Button>
                </div>

                <div className="w-px h-6 bg-border mx-1" />

                <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" onClick={() => execCommand('bold')} className="size-8" title="Bold">
                        <TextB weight="bold" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => execCommand('italic')} className="size-8" title="Italic">
                        <TextItalic />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => execCommand('underline')} className="size-8" title="Underline">
                        <TextUnderline />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => execCommand('strikeThrough')} className="size-8" title="Strikethrough">
                        <TextStrikethrough />
                    </Button>
                </div>

                <div className="w-px h-6 bg-border mx-1" />

                <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" onClick={() => execCommand('justifyLeft')} className="size-8" title="Align Left">
                        <TextAlignLeft />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => execCommand('justifyCenter')} className="size-8" title="Align Center">
                        <TextAlignCenter />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => execCommand('justifyRight')} className="size-8" title="Align Right">
                        <TextAlignRight />
                    </Button>
                </div>

                <div className="w-px h-6 bg-border mx-1" />

                <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" onClick={() => execCommand('insertUnorderedList')} className="size-8" title="Bullet List">
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
                            Enter the URL to link to.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Input
                                type="url"
                                placeholder="https://example.com"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                className="h-9 bg-zinc-900 border-zinc-700"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleInsertLink} disabled={!linkUrl.trim()}>
                            Insert
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
