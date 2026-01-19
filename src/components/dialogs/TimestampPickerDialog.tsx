import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/store/useStore";
import type { Timestamp, Collection, File } from "@/types";
import { Clock, Folder, Tag, FilmStrip } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface TimestampPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (timestampId: string) => void;
    initialTimestampId?: string;
    title?: string;
}

function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function TimestampPickerDialog({
    open,
    onOpenChange,
    onSelect,
    initialTimestampId,
    title = "Select Timestamp"
}: TimestampPickerDialogProps) {
    const { timestamps, collections, files, activeProjectId } = useStore();

    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [selectedTimestampId, setSelectedTimestampId] = useState<string>("");

    const projectCollections = useMemo(
        () => collections.filter(c => c.projectId === activeProjectId && !c.deleted),
        [collections, activeProjectId]
    );

    const timestampsByCollection = useMemo(() => {
        const map = new Map<string, Timestamp[]>();
        for (const t of timestamps) {
            if (!t.collectionId) continue;
            const col = collections.find(c => c.id === t.collectionId && c.projectId === activeProjectId && !c.deleted);
            if (!col) continue;
            if (!map.has(col.id)) {
                map.set(col.id, []);
            }
            map.get(col.id)!.push(t);
        }
        for (const [key, list] of map.entries()) {
            list.sort((a, b) => a.start - b.start);
            map.set(key, list);
        }
        return map;
    }, [timestamps, collections, activeProjectId]);

    const collectionsWithTimestamps: Collection[] = useMemo(() => {
        return projectCollections.filter(c => timestampsByCollection.has(c.id));
    }, [projectCollections, timestampsByCollection]);

    const displayedTimestamps: Timestamp[] = useMemo(() => {
        if (!selectedCollectionId) return [];
        return timestampsByCollection.get(selectedCollectionId) || [];
    }, [timestampsByCollection, selectedCollectionId]);

    const getFile = (fileId: string): File | undefined => {
        return files.find(f => f.id === fileId);
    };

    useEffect(() => {
        if (open) {
            setSelectedTimestampId(initialTimestampId || "");

            if (initialTimestampId) {
                const ts = timestamps.find(t => t.id === initialTimestampId);
                if (ts && ts.collectionId && timestampsByCollection.has(ts.collectionId)) {
                    setSelectedCollectionId(ts.collectionId);
                    return;
                }
            }

            const firstCollection = collectionsWithTimestamps[0];
            setSelectedCollectionId(firstCollection ? firstCollection.id : null);
        }
    }, [open, initialTimestampId, timestamps, timestampsByCollection, collectionsWithTimestamps]);

    const handleConfirm = () => {
        if (selectedTimestampId) {
            onSelect(selectedTimestampId);
            onOpenChange(false);
        }
    };

    const selectedCollection = collections.find(c => c.id === selectedCollectionId) || null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <div className="flex gap-4 py-2">
                    <div className="w-48 flex flex-col gap-2">
                        <div className="text-xs font-medium text-muted-foreground px-1">Collections</div>
                        <ScrollArea className="h-[260px] border border-zinc-800 rounded-md p-1">
                            {collectionsWithTimestamps.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-xs text-muted-foreground px-2 text-center">
                                    No collections with timestamps.
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {collectionsWithTimestamps.map((collection) => (
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
                                {selectedCollection ? selectedCollection.name : "Timestamps"}
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
                            {displayedTimestamps.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-xs text-muted-foreground px-2 text-center">
                                    No timestamps in this collection.
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {displayedTimestamps.map((t) => {
                                        const file = getFile(t.fileId);
                                        return (
                                            <button
                                                key={t.id}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs text-left transition-colors",
                                                    selectedTimestampId === t.id
                                                        ? "bg-primary/20 text-primary"
                                                        : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                                                )}
                                                onClick={() => setSelectedTimestampId(t.id)}
                                                onDoubleClick={() => {
                                                    setSelectedTimestampId(t.id);
                                                    onSelect(t.id);
                                                    onOpenChange(false);
                                                }}
                                            >
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                    <Clock className="text-amber-400" size={14} />
                                                    <span className="font-mono text-[10px]">
                                                        {formatTime(t.start)}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[11px] font-medium truncate">
                                                        {t.note || (file ? file.name : "Untitled")}
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
                        disabled={!selectedTimestampId}
                    >
                        Select
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

