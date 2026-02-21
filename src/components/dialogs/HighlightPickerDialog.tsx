/**
 * ─── HighlightPickerDialog.tsx ──────────────────────────────────────
 *
 * A selection dialog that lets the user pick a highlight from the
 * current project, organised by collection.
 *
 * Features / Responsibilities:
 *   - Collection filter tabs across the top for quick browsing
 *   - Full-height scrollable highlight list with file info
 *   - Supports an optional initial selection and a configurable title
 *   - Used by EditNodeDialog to link a graph node to a highlight
 * ───────────────────────────────────────────────────────────────────
 */
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
import { useShallow } from "@/lib/zustand-shallow";
import type { Highlight, Collection, File } from "@/types";
import { Clock, Tag, FilmStrip, TextT, FolderOpen } from "@phosphor-icons/react";
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
    const { highlights, collections, files, activeProjectId } = useStore(useShallow((state) => ({
        highlights: state.highlights,
        collections: state.collections,
        files: state.files,
        activeProjectId: state.activeProjectId,
    })));

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
        for (const [, list] of map.entries()) {
            list.sort((a, b) => a.start - b.start);
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className="sr-only">
                        Select a highlight from the list below.
                    </DialogDescription>
                </DialogHeader>

                {/* Collection filter tabs */}
                {collectionsWithHighlights.length > 0 ? (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border no-scrollbar">
                        {collectionsWithHighlights.map(collection => (
                            <Button
                                key={collection.id}
                                variant={selectedCollectionId === collection.id ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setSelectedCollectionId(collection.id)}
                                className="gap-2 shrink-0"
                            >
                                <Tag weight={selectedCollectionId === collection.id ? "fill" : "regular"} style={{ color: collection.color }} size={14} />
                                {collection.name}
                                <span className="text-[10px] opacity-60">
                                    {highlightsByCollection.get(collection.id)?.length || 0}
                                </span>
                            </Button>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground text-center py-2">
                        No collections with highlights.
                    </div>
                )}

                {/* Highlight list */}
                <ScrollArea className="h-[300px] border rounded-none p-1 overflow-x-hidden">
                    {displayedHighlights.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                            <Clock size={32} className="opacity-20" />
                            <span className="text-xs">
                                {collectionsWithHighlights.length === 0
                                    ? "No highlights in this project"
                                    : "No highlights in this collection"}
                            </span>
                        </div>
                    ) : (
                        <div className="space-y-0.5 w-full min-w-0">
                            {displayedHighlights.map((h) => {
                                const file = getFile(h.fileId);
                                const isPdf = file?.type === 'pdf';

                                return (
                                    <button
                                        key={h.id}
                                        className={cn(
                                            "w-full max-w-full min-w-0 overflow-hidden flex items-center gap-3 px-3 py-2 rounded-none text-sm text-left transition-colors",
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
                                        <div className="flex flex-col items-center justify-center gap-0.5 w-10 shrink-0">
                                            {isPdf ? (
                                                <TextT className="text-primary" size={16} />
                                            ) : (
                                                <Clock className="text-primary" size={16} />
                                            )}
                                            {!isPdf && (
                                                <span className="font-mono text-[10px] text-muted-foreground">
                                                    {formatTime(h.start)}
                                                </span>
                                            )}
                                            {isPdf && (
                                                <span className="font-mono text-[10px] text-muted-foreground">
                                                    p.{h.start}
                                                </span>
                                            )}
                                        </div>
                                        <div className="w-0 flex-1 min-w-0 overflow-hidden">
                                            <div className="text-xs font-medium truncate max-w-full">
                                                {h.note || h.text || (file ? file.name : "Untitled")}
                                            </div>
                                            {file && (
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5 min-w-0">
                                                    <FilmStrip size={10} className="shrink-0" />
                                                    <span className="truncate min-w-0">{file.name}</span>
                                                    {!isPdf && h.end != null && h.end !== h.start && (
                                                        <span className="ml-auto shrink-0">{formatTime(h.start)} – {formatTime(h.end)}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedHighlightId}
                        data-sound-confirm
                    >
                        Select
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

