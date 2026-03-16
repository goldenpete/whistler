/**
 * ─── HighlightsSidebar.tsx ───────────────────────────────────────────────────
 *
 * Animated sidebar panel listing all highlights for the currently playing file.
 * Each highlight shows its time range (or page for PDFs), collection name,
 * note text, and action buttons (open, edit, delete).
 *
 * Extracted from VideoPlayer.tsx to reduce its size.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMemo, useState, type MouseEvent } from "react";
import {
    Plus,
    Play,
    PencilSimple,
    Trash,
    SortAscending,
    SortDescending,
    Clock,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTime } from "@/lib/utils";
import { playSfx } from "@/utils/sound";
import type { Highlight, Collection, File as AppFile } from "@/types";


/* ── ExpandableNote ──────────────────────────────────────────────────────── */

function ExpandableNote({ text }: { text: string }) {
    const [expanded, setExpanded] = useState(false);
    const limit = 150;

    if (!text) return <span className="text-muted-foreground/50 italic text-xs">No note</span>;
    if (text.length <= limit) return <>{text}</>;

    return (
        <span>
            {expanded ? text : `${text.slice(0, limit)}...`}
            <button 
                onClick={(e: MouseEvent) => { 
                    e.stopPropagation(); 
                    setExpanded(!expanded); 
                }} 
                className="text-primary text-xs ml-1 hover:underline font-medium"
            >
                {expanded ? "Show less" : "Show more"}
            </button>
        </span>
    );
}


/* ── HighlightsSidebar ───────────────────────────────────────────────────── */

export interface HighlightsSidebarProps {
    file: AppFile;
    highlights: Highlight[];
    collections: Collection[];
    hasPdfSelection: boolean;
    onAddHighlight: () => void;
    onSeekToHighlight: (h: Highlight) => void;
    onOpenHighlight: (id: string) => void;
    onEditHighlight: (id: string) => void;
    onDeleteHighlight: (id: string) => void;
}

type SortMode = 'asc' | 'desc' | 'created';

export function HighlightsSidebar({
    file,
    highlights,
    collections,
    hasPdfSelection,
    onAddHighlight,
    onSeekToHighlight,
    onOpenHighlight,
    onEditHighlight,
    onDeleteHighlight,
}: HighlightsSidebarProps) {
    const [sortMode, setSortMode] = useState<SortMode>('asc');

    const sortedHighlights = useMemo(() => {
        const sorted = [...highlights];
        switch (sortMode) {
            case 'asc':  return sorted.sort((a, b) => a.start - b.start);
            case 'desc': return sorted.sort((a, b) => b.start - a.start);
            case 'created': return sorted.sort((a, b) => b.created - a.created);
        }
    }, [highlights, sortMode]);

    const cycleSortMode = () => {
        playSfx('cursor');
        setSortMode(m => m === 'asc' ? 'desc' : m === 'desc' ? 'created' : 'asc');
    };

    const SortIcon = sortMode === 'created' ? Clock : sortMode === 'desc' ? SortDescending : SortAscending;
    const sortTitle = sortMode === 'asc' ? 'Sort: Position (1→∞)' : sortMode === 'desc' ? 'Sort: Position (∞→1)' : 'Sort: Creation Date';

    return (
        <>
            <div className="p-4 border-b border-border bg-background/50 backdrop-blur-md flex items-center justify-between">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Highlights</h3>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                        onClick={cycleSortMode}
                        title={sortTitle}
                    >
                        <SortIcon weight="bold" size={14} />
                    </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:hover:text-muted-foreground"
                    onClick={() => {
                        playSfx('cursor');
                        onAddHighlight();
                    }}
                    title="Add Highlight"
                    disabled={file.type === 'pdf' && !hasPdfSelection}
                >
                    <Plus weight="bold" size={14} />
                </Button>
                </div>
            </div>
            <ScrollArea className="flex-1 w-full min-h-0">
                {highlights.length === 0 ? (
                    <div className="text-muted-foreground text-xs text-center mt-4">No highlights yet.</div>
                ) : (
                    sortedHighlights.map((h: Highlight) => {
                        const collection = collections.find((c: Collection) => c.id === h.collectionId);
                        const borderColor = collection ? collection.color : 'transparent';
                        const collectionName = collection ? collection.name : null;

                        return (
                            <div
                                key={h.id}
                                className="group flex flex-col gap-1.5 p-2 rounded-none border-l-4 transition-all relative overflow-hidden"
                                style={{ borderLeftColor: borderColor }}
                            >
                                <div 
                                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
                                    style={{ backgroundColor: borderColor }}
                                />
                                <div className="flex items-center justify-between gap-2 h-6 relative z-10">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <button
                                            className="text-primary font-mono text-xs bg-primary/10 px-1.5 py-0.5 rounded shrink-0 hover:bg-primary hover:text-primary-foreground transition-colors"
                                            onClick={() => {
                                                playSfx('cursor');
                                                onSeekToHighlight(h);
                                            }}
                                        >
                                            {file.type === 'pdf'
                                                ? (h.end && h.end !== h.start
                                                    ? `Page ${h.start}-${h.end}`
                                                    : `Page ${h.start}`)
                                                : file.type === 'image'
                                                    ? 'View Region'
                                                    : `${formatTime(h.start)} - ${formatTime(h.end || h.start + 5)}`
                                            }
                                        </button>
                                        {collectionName && (
                                            <span className="text-xs font-semibold truncate uppercase tracking-tight" style={{ color: collection?.color }}>
                                                {collectionName}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            className="p-1 px-1.5 text-xs bg-muted hover:bg-accent text-muted-foreground hover:text-foreground rounded flex items-center gap-1"
                                            onClick={(e: MouseEvent) => {
                                                playSfx('cursor');
                                                e.stopPropagation();
                                                onOpenHighlight(h.id);
                                            }}
                                            title="Open Highlight"
                                        >
                                            <Play weight="fill" size={10} />
                                        </button>
                                        <button
                                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
                                            onClick={(e: MouseEvent) => {
                                                playSfx('cursor');
                                                e.stopPropagation();
                                                onEditHighlight(h.id);
                                            }}
                                            title="Edit Highlight"
                                        >
                                            <PencilSimple weight="bold" size={12} />
                                        </button>
                                        <button
                                            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                                            onClick={(e: MouseEvent) => {
                                                playSfx('cursor');
                                                e.stopPropagation();
                                                onDeleteHighlight(h.id);
                                            }}
                                            title="Delete Highlight"
                                        >
                                            <Trash weight="bold" size={12} />
                                        </button>
                                    </div>
                                </div>
                                {file.type === 'pdf' && h.text && (
                                    <div className="text-foreground text-xs whitespace-pre-wrap break-all pl-1 leading-snug">
                                        {h.text}
                                    </div>
                                )}
                                <div className="text-muted-foreground text-sm whitespace-pre-wrap break-all pl-1 leading-relaxed mt-0.5">
                                    <ExpandableNote text={h.note} />
                                </div>
                            </div>
                        );
                    })
                )}
            </ScrollArea>
        </>
    );
}
