/**
 * ─── CollectionView.tsx ────────────────────────────────────────────
 *
 * Detail view for a single collection, displaying its contained
 * media files with search, selection, and context menu interactions.
 *
 * Features:
 *   - Breadcrumb navigation within collection hierarchy
 *   - File listing with thumbnails, duration, and metadata
 *   - Search/filter files within the collection
 *   - Context menus for file actions (open, copy, delete, share)
 *   - Multi-select and bulk operations
 *   - Delete collection confirmation dialog
 *
 * Exports: default CollectionView component
 * Related: CollectionsView, collectionUtils, useStore
 * ───────────────────────────────────────────────────────────────────
 */
import React, { useState, useRef, useMemo, useEffect, memo, type ChangeEvent } from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    HardDrives,
    Folder,
    FilmStrip,
    Trash,
    Copy,
    Share,
    ArrowSquareOut,
    CheckSquare,
    Square,
    MagnifyingGlass,
    FilePdf,
    MusicNote,
    PencilSimple,
    CaretRight,
    CaretDown,
    Rows,
    SquaresFour,
    Cards
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatTime } from "@/lib/utils";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { findRootBucketId } from "@/utils/collectionUtils";
import type { Highlight, File as AppFile } from "@/types";
import { EditHighlightDialog } from "@/components/dialogs/HighlightDialogs";
import { getIcon } from "@/utils/iconMap";
import { getYouTubeId } from "@/components/player/YouTubePlayer";
import { getYouTubeThumbnailUrl } from "@/constants";



import { PdfThumbnail } from "@/components/ui/pdf-thumbnail";
import { useResolvedFileUrl } from "@/hooks/useResolvedFileUrl";

export default function CollectionView() {
    const {
        projects,
        activeProjectId,
        collections,
        highlights,
        files,
        activeCollectionId,
        collectionViewMode,
        setActiveCollection,
        setCollectionViewMode,
        updateHighlight,
        setActiveHighlight,
        floatingPlayerWindows,
        setFloatingPlayerMinimized,
        bringFloatingPlayerToFront
    } = useStore(useShallow((state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        collections: state.collections,
        highlights: state.highlights,
        files: state.files,
        activeCollectionId: state.activeCollectionId,
        collectionViewMode: state.collectionViewMode,
        setActiveCollection: state.setActiveCollection,
        setCollectionViewMode: state.setCollectionViewMode,
        updateHighlight: state.updateHighlight,
        setActiveHighlight: state.setActiveHighlight,
        floatingPlayerWindows: state.floatingPlayerWindows,
        setFloatingPlayerMinimized: state.setFloatingPlayerMinimized,
        bringFloatingPlayerToFront: state.bringFloatingPlayerToFront
    })));
    const navigate = useNavigate();
    const { id } = useParams();

    // Update lastViewed for the specific collection
    useEffect(() => {
        if (id) {
            useStore.setState(state => ({
                collections: state.collections.map(c => 
                    c.id === id ? { ...c, lastViewed: Date.now() } : c
                )
            }));
        }
    }, [id]);

    // Find the root bucket for this collection to keep the sidebar in sync
    useEffect(() => {
        if (id) {
            const bucketId = findRootBucketId(collections, id);
            if (bucketId && bucketId !== activeCollectionId) {
                setActiveCollection(bucketId);
            }
        }
    }, [id, activeCollectionId, collections.length, setActiveCollection]);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [editHighlightOpen, setEditHighlightOpen] = useState(false);
    const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);

    const activeProject = projects.find(p => p.id === activeProjectId);
    const collectionIdToUse = id || activeCollectionId;
    const activeCollection = collections.find(c => c.id === collectionIdToUse);

    const selectedHighlight = highlights.find(h => h.id === selectedHighlightId) || null;
    const selectedFile = selectedHighlight ? files.find(f => f.id === selectedHighlight.fileId) || null : null;

    // Filter highlights for this collection
    const normalizedSearchQuery = searchQuery.toLowerCase();
    const collectionHighlights = useMemo(() => highlights.filter(h =>
        h.collectionId === collectionIdToUse &&
        (h.note || "").toLowerCase().includes(normalizedSearchQuery)
    ), [highlights, collectionIdToUse, normalizedSearchQuery]);

    const fileMap = useMemo(() => new Map(files.map(f => [f.id, f])), [files]);

    // Progressive rendering for large collections
    const HIGHLIGHT_BATCH_SIZE = 60;
    const [highlightRenderLimit, setHighlightRenderLimit] = useState(HIGHLIGHT_BATCH_SIZE);
    const loadMoreHighlightsRef = useRef<HTMLDivElement>(null);

    // Reset limit when collection or search changes
    useEffect(() => {
        setHighlightRenderLimit(HIGHLIGHT_BATCH_SIZE);
    }, [collectionIdToUse, normalizedSearchQuery]);

    // Auto-expand when sentinel scrolls into view
    useEffect(() => {
        const el = loadMoreHighlightsRef.current;
        if (!el || highlightRenderLimit >= collectionHighlights.length) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setHighlightRenderLimit(prev => Math.min(prev + HIGHLIGHT_BATCH_SIZE, collectionHighlights.length));
                }
            },
            { rootMargin: '200px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [highlightRenderLimit, collectionHighlights.length]);

    const visibleHighlights = useMemo(
        () => collectionHighlights.slice(0, highlightRenderLimit),
        [collectionHighlights, highlightRenderLimit]
    );

    const CollectionIcon = getIcon(activeCollection?.icon);
    const activeBucket = activeCollectionId ? collections.find(c => c.id === activeCollectionId) : null;

    const breadcrumbs = useMemo(() => {
        const path: { id: string; name: string }[] = [];
        let current = activeCollection?.parentId ? collections.find(c => c.id === activeCollection.parentId) : null;
        const visited = new Set<string>();

        while (current) {
            if (visited.has(current.id)) {
                console.error("Cycle detected in collection structure:", current);
                break;
            }
            visited.add(current.id);

            // Stop if we reach the active bucket or an item with no parent
            if (current.id === activeCollectionId) break;

            path.unshift({ id: current.id, name: current.name });
            const parentId = current.parentId;
            current = parentId ? collections.find(c => c.id === parentId) : null;
        }
        return path;
    }, [activeCollection, collections, activeCollectionId]);

    if (collectionIdToUse && !activeCollection) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-transparent text-foreground">
                <h1 className="text-xl font-semibold">Collection Not Found</h1>
                <p className="text-muted-foreground mt-2">The collection you are looking for does not exist or has been deleted.</p>
                <Button className="mt-4" onClick={() => navigate('/')}>Go Home</Button>
            </div>
        );
    }

    const openHighlight = (h: Highlight) => {
        setSelectedHighlightId(h.id);
        setActiveHighlight(h.id);
        const matchingWindow = floatingPlayerWindows.find((window) => window.fileId === h.fileId);
        if (matchingWindow) {
            setFloatingPlayerMinimized(matchingWindow.id, false);
            bringFloatingPlayerToFront(matchingWindow.id);
        } else {
            navigate(`/file/${h.fileId}`);
        }
    };

    const handleHighlightClick = (h: Highlight) => {
        if (selectionMode) {
            toggleSelection(h.id);
            return;
        }

        openHighlight(h);
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedItems(newSet);
    };

    const handleSelectAll = () => {
        setSelectedItems(new Set(collectionHighlights.map(h => h.id)));
    };

    const handleDeselectAll = () => {
        setSelectedItems(new Set());
    };

    const handleDeleteSelected = () => {
        useStore.setState(state => ({
            highlights: state.highlights.filter(h => !selectedItems.has(h.id))
        }));
        setSelectedItems(new Set());
        setSelectionMode(false);
    };

    const gridClassName = cn(
        collectionViewMode === 'list' ? "gap-2 pb-10" : "pb-20",
        collectionViewMode === 'list'
            ? "flex flex-col"
            : collectionViewMode === 'grid'
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4"
                : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
    );

    return (
        <div className="flex flex-col h-full bg-transparent text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-12 border-b border-border bg-card/30">
                <div className="flex items-center gap-2">
                    <h1 className="text-sm font-semibold tracking-tight">Collection</h1>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-48 mr-1">
                        <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5" />
                        <Input
                            placeholder="Search..."
                            className="pl-8 h-8 text-xs"
                            value={searchQuery}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                            "size-8",
                            selectionMode && "bg-secondary border-secondary"
                        )}
                        onClick={() => {
                            if (selectionMode) {
                                setSelectionMode(false);
                                setSelectedItems(new Set());
                            } else {
                                setSelectionMode(true);
                            }
                        }}
                    >
                        <CheckSquare weight={selectionMode ? "fill" : "regular"} size={16} className={selectionMode ? "text-primary" : ""} />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-2 px-3 text-xs">
                                {collectionViewMode === 'grid' ? <SquaresFour size={16} /> : collectionViewMode === 'list' ? <Rows size={16} /> : <Cards size={16} />}
                                View
                                <CaretDown size={12} className="text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem onClick={() => setCollectionViewMode('grid')} className="gap-2 text-xs">
                                <SquaresFour size={16} weight={collectionViewMode === 'grid' ? "fill" : "regular"} className={collectionViewMode === 'grid' ? "text-primary" : ""} />
                                Grid
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCollectionViewMode('list')} className="gap-2 text-xs">
                                <Rows size={16} weight={collectionViewMode === 'list' ? "fill" : "regular"} className={collectionViewMode === 'list' ? "text-primary" : ""} />
                                List
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCollectionViewMode('cards')} className="gap-2 text-xs">
                                <Cards size={16} weight={collectionViewMode === 'cards' ? "fill" : "regular"} className={collectionViewMode === 'cards' ? "text-primary" : ""} />
                                Cards
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Breadcrumbs */}
            <div className="px-6 py-2 border-b bg-card/20 flex items-center gap-2">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink
                                className="cursor-pointer hover:text-primary transition-colors flex items-center gap-1.5 text-xs font-medium"
                                onClick={() => navigate('/collections')}
                            >
                                <HardDrives size={14} weight="bold" className="text-muted-foreground/70" />
                                {activeBucket?.name || "Collections"}
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        {breadcrumbs.map((crumb) => (
                            <React.Fragment key={crumb.id}>
                                <BreadcrumbSeparator>
                                    <CaretRight size={12} weight="bold" className="text-muted-foreground/40" />
                                </BreadcrumbSeparator>
                                <BreadcrumbItem>
                                    <BreadcrumbLink
                                        className="cursor-pointer hover:text-primary transition-colors text-xs font-medium"
                                        onClick={() => navigate(`/collections?folderId=${crumb.id}`)}
                                    >
                                        {crumb.name}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                            </React.Fragment>
                        ))}
                        <BreadcrumbSeparator>
                            <CaretRight size={12} weight="bold" className="text-muted-foreground/40" />
                        </BreadcrumbSeparator>
                        <BreadcrumbItem>
                            <BreadcrumbPage className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                <CollectionIcon weight="fill" size={14} style={{ color: activeCollection?.color }} />
                                {activeCollection?.name}
                            </BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Selection Toolbar */}
            <AnimatePresence>
                {selectionMode && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-b border-border bg-primary/5 overflow-hidden"
                    >
                        <div className="flex items-center gap-3 px-4 py-2">
                            <span className="text-sm font-medium text-primary">
                                {selectedItems.size} selected
                            </span>
                            <div className="flex-1" />
                            <Button variant="ghost" size="sm" onClick={handleSelectAll} disabled={selectedItems.size === collectionHighlights.length}>
                                Select All
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleDeselectAll} disabled={selectedItems.size === 0}>
                                Deselect All
                            </Button>
                            <div className="w-px h-5 bg-border" />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="gap-2"
                                        disabled={selectedItems.size === 0}
                                    >
                                        <Trash size={14} />
                                        Delete ({selectedItems.size})
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete selected highlights?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete {selectedItems.size} selected item{selectedItems.size === 1 ? "" : "s"} from this collection.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteSelected}>
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Grid */}
            <ScrollArea className="flex-1 p-4">
                <div className={gridClassName}>
                    {visibleHighlights.map(h => {
                        const file = fileMap.get(h.fileId);
                        if (!file) return null;
                        const isSelected = selectedItems.has(h.id);
                        const timeLabel = file.type === 'pdf'
                            ? (h.end && h.end !== h.start
                                ? `Page ${h.start}-${h.end}`
                                : `Page ${h.start}`)
                            : file.type === 'image'
                                ? null
                                : `${formatTime(h.start)} - ${formatTime(h.end || h.start)}`;

                        const content = collectionViewMode === 'list' ? (
                            <div
                                className={cn(
                                    "group relative flex items-center gap-4 px-4 py-3 rounded-none border border-border bg-card transition-all cursor-pointer select-none",
                                    isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                                )}
                                onClick={() => handleHighlightClick(h)}
                            >
                                {selectionMode && (
                                    <div className="mr-2 shrink-0">
                                        {isSelected ? (
                                            <CheckSquare weight="fill" size={20} className="text-primary" />
                                        ) : (
                                            <Square weight="regular" size={20} className="text-muted-foreground" />
                                        )}
                                    </div>
                                )}
                                <div className="w-16 h-12 rounded-none bg-muted flex items-center justify-center shrink-0 overflow-hidden relative">
                                    <CollectionHighlightPreview highlight={h} file={file} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                        {h.note || "Untitled Highlight"}
                                    </div>
                                    <div className="text-xs text-muted-foreground/70 truncate">{file.name}</div>
                                </div>
                                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-primary/20 text-primary rounded-none shrink-0">
                                    {file.type}
                                </div>
                                {timeLabel && (
                                    <div className="text-xs text-muted-foreground/60 w-24 text-right shrink-0 font-mono">
                                        {timeLabel}
                                    </div>
                                )}
                            </div>
                        ) : collectionViewMode === 'grid' ? (
                            <div
                                className={cn(
                                    "group relative flex flex-col rounded-none border bg-card transition-all overflow-hidden cursor-pointer hover:shadow-md",
                                    isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                                )}
                                onClick={() => handleHighlightClick(h)}
                            >
                                <div className="aspect-video bg-muted relative overflow-hidden">
                                    <CollectionHighlightPreview highlight={h} file={file} />

                                    {timeLabel && (
                                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-none bg-black/70 text-white text-[10px] font-mono font-medium">
                                            {timeLabel}
                                        </div>
                                    )}

                                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-none bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase flex items-center gap-1">
                                        <FileIconByType type={file.type} size={10} />
                                        {file.type}
                                    </div>

                                    {selectionMode && (
                                        <div className={cn(
                                            "absolute top-2 right-2 size-5 rounded-none border-2 flex items-center justify-center transition-colors",
                                            isSelected ? "bg-primary border-primary text-primary-foreground" : "border-white/70 bg-black/30"
                                        )}>
                                            {isSelected && <CheckSquare weight="fill" size={12} />}
                                        </div>
                                    )}
                                </div>

                                <div className="p-3">
                                    <h3 className="font-medium text-sm line-clamp-2 leading-tight mb-1 group-hover:text-primary transition-colors">
                                        {h.note || "Untitled Highlight"}
                                    </h3>
                                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                        <FilmStrip size={12} />
                                        {file.name}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div
                                className={cn(
                                    "flex flex-col rounded-none border border-border bg-card overflow-hidden transition-all group cursor-pointer select-none relative h-full",
                                    isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                                )}
                                onClick={() => handleHighlightClick(h)}
                            >
                                {selectionMode && (
                                    <div className="absolute top-3 left-3 z-10">
                                        {isSelected ? (
                                            <CheckSquare weight="fill" size={20} className="text-primary shadow-sm" />
                                        ) : (
                                            <Square weight="regular" size={20} className="text-white drop-shadow-md" />
                                        )}
                                    </div>
                                )}

                                <div className="h-[160px] flex-none bg-muted/30 flex items-center justify-center overflow-hidden pointer-events-none relative group-hover:bg-muted/10 transition-colors">
                                    <CollectionHighlightPreview highlight={h} file={file} />

                                    <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-none bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wide pointer-events-none">
                                        {file.type}
                                    </div>
                                </div>

                                <div className="p-4 flex flex-col gap-1.5 border-t border-border/50 bg-card/50 pointer-events-none">
                                    <div className="font-bold text-sm truncate group-hover:text-primary transition-colors leading-tight">
                                        {h.note || "Untitled Highlight"}
                                    </div>

                                    <div className="flex items-center justify-between mt-1 gap-3">
                                        <div className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-tighter truncate">
                                            {file.name}
                                        </div>
                                        {timeLabel && (
                                            <div className="text-[10px] text-muted-foreground/50 font-mono shrink-0">
                                                {timeLabel}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );

                        return (
                            <ContextMenu key={h.id}>
                                <ContextMenuTrigger>
                                    {content}
                                </ContextMenuTrigger>
                                <ContextMenuContent className="min-w-[8rem]">
                                    <ContextMenuItem
                                        onClick={() => {
                                            if (!selectionMode) {
                                                setSelectionMode(true);
                                            }
                                            toggleSelection(h.id);
                                        }}
                                        className="gap-2"
                                    >
                                        <CheckSquare size={16} /> Select
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        onClick={() => {
                                            openHighlight(h);
                                        }}
                                        className="gap-2"
                                    >
                                        <FilmStrip size={16} /> Play Highlight
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        onClick={() => {
                                            setSelectedHighlightId(h.id);
                                            setEditHighlightOpen(true);
                                        }}
                                        className="gap-2"
                                    >
                                        <PencilSimple size={16} /> Edit Note
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem
                                        className="gap-2 text-destructive focus:text-destructive"
                                        onClick={() => {
                                            useStore.setState(state => ({
                                                highlights: state.highlights.filter(item => item.id !== h.id)
                                            }));
                                        }}
                                    >
                                        <Trash size={16} /> Delete
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>
                        );
                    })}

                    {collectionHighlights.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50">
                            <CollectionIcon size={64} weight="thin" />
                            <p className="mt-4 text-sm font-medium">No highlights in this collection</p>
                            <p className="text-xs">Add highlights from the video player</p>
                        </div>
                    )}
                    {highlightRenderLimit < collectionHighlights.length && <div ref={loadMoreHighlightsRef} className="h-1 col-span-full" />}
                </div>
            </ScrollArea>

            <EditHighlightDialog
                open={editHighlightOpen}
                onOpenChange={(open) => {
                    setEditHighlightOpen(open);
                }}
                highlight={selectedHighlight}
                collections={collections}
                file={selectedFile}
                onSave={(updates) => {
                    if (selectedHighlight) {
                        updateHighlight(selectedHighlight.id, updates);
                    }
                }}
            />
        </div>
    );
}

const CollectionHighlightPreview = memo(function CollectionHighlightPreview({ highlight, file }: { highlight: Highlight; file: AppFile }) {
    const { resolvedUrl } = useResolvedFileUrl(file);

    if (!resolvedUrl) {
        return (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <FileIconByType type={file.type} size={48} />
            </div>
        );
    }

    const youtubeId = getYouTubeId(resolvedUrl);

    if (youtubeId) {
        return <HighlightYouTubePreview videoId={youtubeId} start={highlight.start} />;
    }

    if (file.type === 'image') {
        return <img src={resolvedUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />;
    }

    if (file.type === 'pdf') {
        return (
            <div className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity">
                <PdfThumbnail
                    url={resolvedUrl}
                    onError={() => { }}
                    width={300}
                    page={highlight.start || 1}
                    rect={highlight.rect || undefined}
                    className="w-full h-full object-cover"
                />
            </div>
        );
    }

    if (file.type === 'video') {
        return <HighlightVideoPreview url={resolvedUrl} start={highlight.start} />;
    }

    return (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <FileIconByType type={file.type} size={48} />
        </div>
    );
});

function FileIconByType({ type, size = 16 }: { type: string, size?: number }) {
    switch (type) {
        case 'video': return <FilmStrip size={size} />;
        case 'pdf': return <FilePdf size={size} />;
        case 'audio': return <MusicNote size={size} />;
        case 'image': {
            const ImageIcon = getIcon("Image") || Folder;
            return <ImageIcon size={size} />;
        }
        default: return <Folder size={size} />;
    }
}

function HighlightVideoPreview({ url, start = 0.1 }: { url: string, start?: number }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateTime = () => {
            video.currentTime = start;
        };

        if (video.readyState >= 1) {
            updateTime();
        } else {
            video.onloadedmetadata = updateTime;
        }
    }, [start]);

    return (
        <video
            ref={videoRef}
            src={`${url}#t=${start}`}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            preload="metadata"
            muted
            playsInline
        />
    );
}

function HighlightYouTubePreview({ videoId }: { videoId: string, start?: number }) {
    return (
        <img
            src={getYouTubeThumbnailUrl(videoId, 'hqdefault')}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            alt="YouTube Preview"
            loading="lazy"
        />
    );
}
