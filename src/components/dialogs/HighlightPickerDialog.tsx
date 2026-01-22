import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/store/useStore";
import type { Highlight, Collection, File } from "@/types";
import { Clock, Folder, Tag, FilmStrip, TextT } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface HighlightPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (highlightId: string) => void;
    initialHighlightId?: string;
    title?: string;
}

function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function HighlightPickerDialog({
    open,
    onOpenChange,
    onSelect,
    initialHighlightId,
    title = "Select Highlight"
}: HighlightPickerDialogProps) {
    const { highlights, collections, files, activeProjectId } = useStore();

    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [selectedHighlightId, setSelectedHighlightId] = useState<string>("");

    const projectCollections = useMemo(
        () => collections.filter(c => c.projectId === activeProjectId && !c.deleted),
        [collections, activeProjectId]
    );

    const highlightsByCollection = useMemo(() => {
        const map = new Map<string, Highlight[]>();
        for (const h of highlights) {
            if (!h.collectionId) continue;
            const col = collections.find(c => c.id === h.collectionId && c.projectId === activeProjectId && !c.deleted);
            if (!col) continue;
            if (!map.has(col.id)) {
                map.set(col.id, []);
            }
            map.get(col.id)!.push(h);
        }
        for (const [key, list] of map.entries()) {
            list.sort((a, b) => a.start - b.start);
            map.set(key, list);
        }
        return map;
    }, [highlights, collections, activeProjectId]);

    const collectionsWithHighlights: Collection[] = useMemo(() => {
        return projectCollections.filter(c => highlightsByCollection.has(c.id));
    }, [projectCollections, highlightsByCollection]);

    const displayedHighlights: Highlight[] = useMemo(() => {
        if (!selectedCollectionId) return [];
        return highlightsByCollection.get(selectedCollectionId) || [];
    }, [highlightsByCollection, selectedCollectionId]);

    const getFile = (fileId: string): File | undefined => {
        return files.find(f => f.id === fileId);
    };

    useEffect(() => {
        if (open) {
            setSelectedHighlightId(initialHighlightId || "");

            if (initialHighlightId) {
                const h = highlights.find(t => t.id === initialHighlightId);
                if (h && h.collectionId && highlightsByCollection.has(h.collectionId)) {
                    setSelectedCollectionId(h.collectionId);
                    return;
                }
            }

            const firstCollection = collectionsWithHighlights[0];
            setSelectedCollectionId(firstCollection ? firstCollection.id : null);
        }
    }, [open, initialHighlightId, highlights, highlightsByCollection, collectionsWithHighlights]);

    const handleConfirm = () => {
        if (selectedHighlightId) {
            onSelect(selectedHighlightId);
            onOpenChange(false);
        }
    };

    const selectedCollection = collections.find(c => c.id === selectedCollectionId) || null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 gap-0 bg-zinc-900 border-zinc-800">
                <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className="sr-only">
                        Select a highlight from the list below.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-4 py-2">
                    <div className="w-48 flex flex-col gap-2">
                        <div className="text-xs font-medium text-muted-foreground px-1">Collections</div>
                        <ScrollArea className="h-[260px] border border-zinc-800 rounded-md p-1">
                            {collectionsWithHighlights.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-xs text-muted-foreground px-2 text-center">
                                    No collections with highlights.
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {collectionsWithHighlights.map((collection) => (
                                        <button
                                            key={collection.id}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors",
                                                selectedCollectionId === collection.id
                                                    ? "bg-primary/20 text-primary"
                                                    : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                                            )}
                                            onClick={() => setSelectedCollectionId(collection.id)}
                                        >
                                            <div className="size-5 rounded-md flex items-center justify-center bg-primary/10">
                                                <Tag size={12} weight="fill" style={{ color: collection.color }} />
                                            </div>
                                            <span className="truncate">{collection.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    <div className="flex-1 flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1">
                            <div className="text-xs font-medium text-muted-foreground">
                                {selectedCollection ? selectedCollection.name : "Highlights"}
                            </div>
                            {selectedCollection && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Folder size={10} />
                                    <span className="truncate max-w-[140px]">
                                        {selectedCollection.name}
                                    </span>
                                </div>
                            )}
                        </div>

                        <ScrollArea className="h-[260px] border border-zinc-800 rounded-md p-1">
                            {displayedHighlights.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-xs text-muted-foreground px-2 text-center">
                                    No highlights in this collection.
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {displayedHighlights.map((h) => {
                                        const file = getFile(h.fileId);
                                        const isPdf = file?.type === 'pdf';
                                        
                                        return (
                                            <button
                                                key={h.id}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs text-left transition-colors",
                                                    selectedHighlightId === h.id
                                                        ? "bg-primary/20 text-primary"
                                                        : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                                                )}
                                                onClick={() => setSelectedHighlightId(h.id)}
                                                onDoubleClick={() => {
                                                    setSelectedHighlightId(h.id);
                                                    onSelect(h.id);
                                                    onOpenChange(false);
                                                }}
                                            >
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                    {isPdf ? (
                                                        <TextT className="text-primary" size={14} />
                                                    ) : (
                                                        <Clock className="text-primary" size={14} />
                                                    )}
                                                    {!isPdf && (
                                                        <span className="font-mono text-[10px]">
                                                            {formatTime(h.start)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[11px] font-medium truncate">
                                                        {h.note || h.text || (file ? file.name : "Untitled")}
                                                    </div>
                                                    {file && (
                                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                                                            <FilmStrip size={10} />
                                                            <span className="truncate">{file.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleConfirm}
                        className="bg-primary text-primary-foreground"
                        disabled={!selectedHighlightId}
                    >
                        Select
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
