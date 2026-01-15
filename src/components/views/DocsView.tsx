import { useRef, useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Plus, NotePencil, TextB, TextItalic, ListBullets } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function DocsView() {
    const { docs, activeProjectId, activeDocId } = useStore();
    const projectDocs = docs.filter(d => d.projectId === activeProjectId && !d.deleted);

    const activeDoc = docs.find(d => d.id === activeDocId);

    const handleCreateDoc = () => {
        const name = prompt("New document name:");
        if (name && activeProjectId) {
            const newDoc = {
                id: crypto.randomUUID(),
                projectId: activeProjectId,
                name,
                content: "<p>Start writing...</p>",
                created: Date.now(),
                lastModified: Date.now()
            };
            useStore.setState(state => ({
                docs: [...state.docs, newDoc],
                activeDocId: newDoc.id
            }));
        }
    };

    const handleSelectDoc = (id: string) => {
        useStore.setState({ activeDocId: id });
    };

    return (
        <div className="flex h-full bg-background">
            {/* Sidebar: Doc List */}
            <div className="w-64 border-r border-border flex flex-col shrink-0 bg-card/50">
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Documents</h2>
                    <Button variant="ghost" size="icon" onClick={handleCreateDoc} className="size-7">
                        <Plus weight="bold" />
                    </Button>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {projectDocs.map(doc => (
                            <button
                                key={doc.id}
                                onClick={() => handleSelectDoc(doc.id)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors",
                                    activeDocId === doc.id
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <NotePencil weight={activeDocId === doc.id ? "fill" : "regular"} className="text-lg shrink-0" />
                                <span className="truncate">{doc.name}</span>
                            </button>
                        ))}
                        {projectDocs.length === 0 && (
                            <div className="p-4 text-center text-xs text-muted-foreground italic">
                                No documents yet.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col">
                {activeDoc ? (
                    <DocEditor doc={activeDoc} />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <NotePencil size={64} weight="thin" className="mx-auto mb-4 opacity-30" />
                            <p>Select or create a document</p>
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

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.innerHTML = doc.content;
        }
        setDocName(doc.name);
    }, [doc.id]); // Reset on doc change

    const handleSave = () => {
        if (editorRef.current) {
            const content = editorRef.current.innerHTML;
            useStore.setState(state => ({
                docs: state.docs.map(d =>
                    d.id === doc.id
                        ? { ...d, name: docName, content, lastModified: Date.now() }
                        : d
                )
            }));
        }
    };

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    return (
        <>
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-3 border-b border-border bg-card/30">
                <Input
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="max-w-xs font-medium border-none shadow-none focus-visible:ring-0 bg-transparent px-0 text-base"
                    placeholder="Untitled"
                />
                <div className="flex-1" />
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => execCommand('bold')} className="size-8">
                        <TextB weight="bold" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => execCommand('italic')} className="size-8">
                        <TextItalic />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => execCommand('insertUnorderedList')} className="size-8">
                        <ListBullets />
                    </Button>
                </div>
                <Button variant="default" size="sm" onClick={handleSave} className="ml-4">
                    Save
                </Button>
            </div>

            {/* Editor */}
            <ScrollArea className="flex-1 p-6">
                <div
                    ref={editorRef}
                    contentEditable
                    className="prose prose-sm dark:prose-invert max-w-3xl mx-auto min-h-[400px] focus:outline-none"
                    suppressContentEditableWarning
                />
            </ScrollArea>
        </>
    );
}
