/**
 * ─── CollectionsView.tsx ───────────────────────────────────────────
 *
 * Top-level collections browser for viewing, creating, and managing
 * buckets and nested collections within a project.
 *
 * Features:
 *   - Drag-and-drop collection reordering (dnd-kit)
 *   - Grid and list view modes with sorting/filtering
 *   - Multi-select with bulk actions
 *   - Context menus for rename, delete, color, and share
 *   - Search across all collections
 *   - Nested folder hierarchy with root bucket detection
 *
 * Exports: default CollectionsView component
 * Related: CollectionView, CollectionDialogs, collectionUtils
 * ───────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect, useMemo, memo } from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { useStableRef } from "@/hooks/useStableRef";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Folder,
    DotsThreeVertical,
    Trash,
    PencilSimple,
    MagnifyingGlass,
    Plus,
    CaretRight,
    CheckSquare,
    Square,
    CaretDown,
    CaretUp,
    Clock,
    Tag,
    FileText,
    SquaresFour,
    Rows,
    FolderOpen,
    ArrowSquareOut,
    X,
    Palette,
    Share,
    Cards,
    Check,
    Shapes,
} from "@phosphor-icons/react";
import { findRootBucketId } from "@/utils/collectionUtils";
import { getIcon, iconNames } from "@/utils/iconMap";
import { type Collection } from "@/types";
import { playSfx } from "@/utils/sound";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    DragOverlay,
    useDraggable,
    useDroppable,
    type DragStartEvent,
    pointerWithin,
    type CollisionDetection,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbSeparator,
    BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuLabel,
    ContextMenuSub,
    ContextMenuSubTrigger,
    ContextMenuSubContent,
} from "@/components/ui/context-menu";
import { AnimatePresence, motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useKeybind } from "@/hooks/use-keybind";
import { CreateCollectionDialog, CreateFolderDialog, EditCollectionDialog } from "@/components/dialogs/CollectionDialogs";
import { MoveCollectionDialog } from "@/components/dialogs/MoveCollectionDialog";
import { CollectionGridPreview } from "@/components/previews/CollectionPreviews";
import { ViewEmptyState } from "@/components/views/ViewEmptyState";

const COLLECTION_COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981",
    "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef",
    "#f43f5e", "#64748b"
];

type SortOption = "custom" | "name" | "date";
type SortDirection = "asc" | "desc";

function BreadcrumbDropTarget({
    id,
    children,
    onClick,
    className,
    isActive = false
}: {
    id: string;
    children: React.ReactNode;
    onClick: () => void;
    className?: string;
    isActive?: boolean;
}) {
    const { isOver, setNodeRef } = useDroppable({
        id: `breadcrumb-${id}`,
        data: { type: 'breadcrumb', folderId: id === 'root' ? null : id }
    });

    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            className={cn(
                className,
                "rounded px-1.5 py-0.5 transition-colors cursor-pointer",
                isOver && "bg-primary/20 text-primary ring-1 ring-primary/30",
                !isOver && !isActive && "hover:bg-accent/50 hover:text-accent-foreground",
                isActive && "font-semibold text-foreground pointer-events-none"
            )}
        >
            {children}
        </div>
    );
}

interface CollectionCardProps {
    collection: Collection;
    onNavigate: (id: string) => void;
    selectionMode: boolean;
    isSelected: boolean;
    isFocused?: boolean;
    onToggleSelect: (id: string) => void;
    onRename: (collection: Collection) => void;
    onDelete: (id: string) => void;
    onColorChange: (collection: Collection, color: string) => void;
    onIconChange: (collection: Collection, icon: string) => void;
    onMove?: (collection: Collection) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

interface CollectionCardInnerProps {
    collection: Collection;
    isSelected: boolean;
    isFocused?: boolean;
    isOver: boolean;
    selectionMode: boolean;
    onClick?: (e: React.MouseEvent) => void;
    domRef?: (element: HTMLElement | null) => void;
    children?: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    showSelection?: boolean;
    viewMode: 'grid' | 'list' | 'cards';
}

const CollectionCardGridInner = memo(function CollectionCardGridInner({ collection, isSelected, isFocused, isOver, selectionMode, onClick, domRef, children, style, className, showSelection = true }: CollectionCardInnerProps) {
    const { highlights, files } = useStore(useShallow((state) => ({
        highlights: state.highlights,
        files: state.files,
    })));
    const hasPreview = highlights.some((h) => h.collectionId === collection.id);
    const c = collection.color;
    return (
        <div
            ref={domRef}
            id={`collection-card-${collection.id}`}
            onClick={onClick}
            data-sound-cursor
            className={cn(
                "flex flex-col gap-2 p-3 rounded-none border border-border bg-card transition-all duration-200 aspect-square relative group cursor-pointer select-none",
                isOver && "ring-2 ring-primary bg-primary/20 shadow-xl scale-[1.02]",
                isSelected && "ring-2 ring-primary bg-primary/10 border-primary",
                isFocused && !isSelected && !c && "border-primary/50 bg-accent/10 shadow-lg shadow-primary/5",
                className
            )}
            style={{
                ...style,
                ...(c ? {
                    borderColor: c,
                    ...(isFocused && !isSelected ? { backgroundColor: c + '18', boxShadow: `0 0 12px ${c}30` } : {})
                } : undefined)
            }}
        >
            {selectionMode && showSelection && (
                <div className="absolute top-2 left-2 z-10">
                    {isSelected ? (
                        <CheckSquare weight="fill" size={20} className="text-primary" />
                    ) : (
                        <Square weight="regular" size={20} className="text-muted-foreground" />
                    )}
                </div>
            )}

            <div className="flex-1 flex items-center justify-center overflow-hidden w-full h-full pointer-events-none relative">
                <CollectionGridPreview collectionId={collection.id} highlights={highlights} files={files} />
                {!hasPreview && React.createElement(getIcon(collection.icon), {
                    size: 44,
                    weight: "regular",
                    className: "text-muted-foreground group-hover:text-primary transition-colors",
                    style: collection.color ? { color: collection.color } : undefined
                })}
            </div>
            <div className="text-xs font-medium truncate px-1 text-center pointer-events-none">{collection.name}</div>

            {/* Drop Target Overlay */}
            {isOver && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px] z-20 rounded-none">
                    <div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-none shadow-lg border border-primary/20 flex items-center gap-2">
                        <FolderOpen weight="fill" className="text-primary animate-bounce" size={16} />
                        <span className="text-xs font-semibold text-primary">Drop to move</span>
                    </div>
                </div>
            )}

            {children}
        </div>
    );
});

const CollectionCardListInner = memo(function CollectionCardListInner({ collection, isSelected, isFocused, isOver, selectionMode, onClick, domRef, children, style, className, showSelection = true }: CollectionCardInnerProps) {
    const { highlights, files } = useStore(useShallow((state) => ({
        highlights: state.highlights,
        files: state.files,
    })));
    const hasPreview = highlights.some((h) => h.collectionId === collection.id);
    const dateStr = new Date(collection.lastModified).toLocaleDateString();
    const c = collection.color;

    return (
        <div
            ref={domRef}
            id={`collection-card-${collection.id}`}
            onClick={onClick}
            data-sound-cursor
            className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-none border border-border bg-card transition-all group cursor-pointer select-none relative",
                isOver && "ring-2 ring-primary bg-primary/20 shadow-xl scale-[1.01]",
                isSelected && "ring-2 ring-primary bg-primary/10 border-primary",
                isFocused && !isSelected && !c && "border-primary/50 bg-accent/10 shadow-md shadow-primary/5",
                className
            )}
            style={{
                ...style,
                ...(c ? {
                    borderColor: c,
                    ...(isFocused && !isSelected ? { backgroundColor: c + '18', boxShadow: `0 0 12px ${c}30` } : {})
                } : undefined)
            }}
        >
            {/* Drop Target Overlay */}
            {isOver && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px] z-20 rounded-none">
                    <div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-none shadow-lg border border-primary/20 flex items-center gap-2">
                        <FolderOpen weight="fill" className="text-primary animate-bounce" size={16} />
                        <span className="text-xs font-semibold text-primary">Drop to move</span>
                    </div>
                </div>
            )}

            {selectionMode && showSelection && (
                <div className="mr-2">
                    {isSelected ? (
                        <CheckSquare weight="fill" size={20} className="text-primary" />
                    ) : (
                        <Square weight="regular" size={20} className="text-muted-foreground" />
                    )}
                </div>
            )}

            <div className="w-16 h-12 rounded-none bg-muted flex items-center justify-center shrink-0 overflow-hidden pointer-events-none relative">
                <CollectionGridPreview collectionId={collection.id} highlights={highlights} files={files} />
                {!hasPreview && React.createElement(getIcon(collection.icon), {
                    size: 28,
                    weight: "regular",
                    className: "text-muted-foreground group-hover:text-primary transition-colors",
                    style: collection.color ? { color: collection.color } : undefined
                })}
            </div>

            <div className="flex-1 min-w-0 pointer-events-none">
                <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">{collection.name}</div>
            </div>

            {/* Type Badge */}
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-primary/20 text-primary rounded-none pointer-events-none">
                {(collection.type || 'collection').toUpperCase()}
            </div>

            <div className="text-xs text-muted-foreground/60 w-24 text-right shrink-0 pointer-events-none">
                {dateStr}
            </div>
            {children}
        </div>
    );
});

const CollectionCardCardsInner = memo(function CollectionCardCardsInner({ collection, isSelected, isFocused, isOver, selectionMode, onClick, domRef, children, style, className, showSelection = true }: CollectionCardInnerProps) {
    const { highlights, files } = useStore(useShallow((state) => ({
        highlights: state.highlights,
        files: state.files,
    })));
    const hasPreview = highlights.some((h) => h.collectionId === collection.id);
    const dateStr = new Date(collection.lastModified).toLocaleDateString();
    const c = collection.color;

    return (
        <div
            ref={domRef}
            id={`collection-card-${collection.id}`}
            onClick={onClick}
            data-sound-cursor
            className={cn(
                "flex flex-col rounded-none border border-border bg-card overflow-hidden transition-all group cursor-pointer select-none relative h-full",
                isOver && "ring-2 ring-primary bg-primary/20 shadow-xl scale-[1.02]",
                isSelected && "ring-2 ring-primary bg-primary/10 border-primary",
                isFocused && !isSelected && !c && "border-primary/50 bg-accent/10 shadow-xl shadow-primary/5",
                className
            )}
            style={{
                ...style,
                ...(c ? {
                    borderColor: c,
                    ...(isFocused && !isSelected ? { backgroundColor: c + '18', boxShadow: `0 0 12px ${c}30` } : {})
                } : undefined)
            }}
        >
            {selectionMode && showSelection && (
                <div className="absolute top-3 left-3 z-10">
                    {isSelected ? (
                        <CheckSquare weight="fill" size={20} className="text-primary shadow-sm" />
                    ) : (
                        <Square weight="regular" size={20} className="text-white drop-shadow-md" />
                    )}
                </div>
            )}

            {/* Content Area (Top) */}
            <div className="h-[160px] flex-none bg-muted/30 flex items-center justify-center overflow-hidden pointer-events-none relative group-hover:bg-muted/10 transition-colors">
                <CollectionGridPreview collectionId={collection.id} highlights={highlights} files={files} />
                {!hasPreview && React.createElement(getIcon(collection.icon), {
                    size: 48,
                    weight: "regular",
                    className: "text-muted-foreground group-hover:text-primary transition-colors",
                    style: collection.color ? { color: collection.color } : undefined
                })}

                {/* Type Overlay */}
                <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-none bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wide pointer-events-none">
                    {(collection.type || 'collection').toUpperCase()}
                </div>

                {/* Drop Target Overlay */}
                {isOver && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px] z-20">
                        <div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-none shadow-lg border border-primary/20 flex items-center gap-2">
                            <FolderOpen weight="fill" className="text-primary animate-bounce" size={16} />
                            <span className="text-xs font-semibold text-primary">Drop to move</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Details Area (Bottom) */}
            <div className="p-4 flex flex-col gap-1.5 border-t border-border/50 bg-card/50 pointer-events-none">
                <div className="font-bold text-sm truncate group-hover:text-primary transition-colors leading-tight">
                    {collection.name}
                </div>
                <div className="flex items-center justify-between mt-1">
                    <div className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-tighter">
                        {dateStr}
                    </div>
                </div>
            </div>
            {children}
        </div>
    );
});

function CollectionCard({ collection, onNavigate, selectionMode, isSelected, isFocused, onToggleSelect, onRename, onDelete, onColorChange, onIconChange, onMove, onMouseEnter, onMouseLeave, viewMode, sortOption }: CollectionCardProps & { viewMode: 'grid' | 'list' | 'cards', sortOption: string }) {
    const {
        attributes,
        listeners,
        setNodeRef: setSortableRef,
        transform,
        transition,
        isDragging,
        isOver: isSortableOver,
        active,
        over,
        index
    } = useSortable({
        id: collection.id,
        data: collection,
        disabled: selectionMode,
    });

    // Bullseye Droppable
    // Only enabled for folders (nesting target)
    const { setNodeRef: setDroppableRef, isOver: isFolderOver } = useDroppable({
        id: `folder-nest-${collection.id}`,
        disabled: selectionMode || collection.type !== 'folder',
        data: { type: 'folder', folderId: collection.id }
    });

    // Stable ref to prevent React 19 detach/reattach infinite loop with dnd-kit setState
    const setNodeRef = useStableRef(setSortableRef);

    const style = {
        transition,
        zIndex: isDragging ? 999 : undefined,
    };

    const handleClick = (e: React.MouseEvent) => {
        if (selectionMode) {
            e.preventDefault();
            onToggleSelect(collection.id);
            return;
        }
        e.preventDefault();
        onNavigate(collection.id);
    };

    // Calculate where the insertion line should be
    const showLine = isSortableOver && !isDragging && !isFolderOver && sortOption === "custom";
    let linePosition: 'left' | 'right' | 'top' | 'bottom' | null = null;

    if (showLine && active && over) {
        const activeIndex = active.data.current?.sortable?.index ?? -1;
        const overIndex = over.data.current?.sortable?.index ?? index;

        if (activeIndex !== -1) {
            if (viewMode === 'grid') {
                linePosition = activeIndex > overIndex ? 'left' : 'right';
            } else {
                linePosition = activeIndex > overIndex ? 'top' : 'bottom';
            }
        } else {
            linePosition = viewMode === 'grid' ? 'left' : 'top';
        }
    }

    const Inner = viewMode === 'grid' ? CollectionCardGridInner : viewMode === 'list' ? CollectionCardListInner : CollectionCardCardsInner;

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild disabled={selectionMode}>
                <div
                    ref={setNodeRef}
                    style={style}
                    {...(selectionMode ? {} : listeners)}
                    {...(selectionMode ? {} : attributes)}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    className="relative touch-none"
                >
                    {/* Bullseye Drop Zone */}
                    {collection.type === 'folder' && (
                        <div
                            ref={setDroppableRef}
                            onClick={handleClick}
                            className={cn(
                                "absolute z-30 cursor-pointer",
                                sortOption === "custom" ? (viewMode === 'grid' ? "inset-3" : "inset-y-1 inset-x-4") : "inset-0",
                                "rounded-lg"
                            )}
                        />
                    )}

                    {/* Visual line indicator for insertion */}
                    {linePosition === 'left' && (
                        <div className={cn(
                            "absolute top-0 bottom-0 w-1 bg-primary z-50 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse",
                            viewMode === 'grid' ? "-left-3" : "-left-2"
                        )} />
                    )}
                    {linePosition === 'right' && (
                        <div className={cn(
                            "absolute top-0 bottom-0 w-1 bg-primary z-50 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse",
                            viewMode === 'grid' ? "-right-3" : "-right-2"
                        )} />
                    )}
                    {linePosition === 'top' && (
                        <div className="absolute -top-1 left-0 right-0 h-1 bg-primary z-50 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                    )}
                    {linePosition === 'bottom' && (
                        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary z-50 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                    )}

                    <Inner
                        collection={collection}
                        isSelected={isSelected}
                        isFocused={isFocused}
                        isOver={isFolderOver}
                        selectionMode={selectionMode}
                        onClick={handleClick}
                        viewMode={viewMode}
                        className={cn(isDragging && "opacity-0")}
                    />
                </div>
            </ContextMenuTrigger>
            <CollectionContextMenu
                collection={collection}
                onNavigate={onNavigate}
                onRename={onRename}
                onDelete={onDelete}
                onColorChange={onColorChange}
                onIconChange={onIconChange}
                onMove={onMove}
                onSelect={() => onToggleSelect(collection.id)}
            />
        </ContextMenu>
    );
}

/** ─── CollectionContextMenu ──────────────────────────────────────── */

interface CollectionContextMenuProps {
    collection: Collection;
    onNavigate: (id: string) => void;
    onRename: (collection: Collection) => void;
    onDelete: (id: string) => void;
    onColorChange: (collection: Collection, color: string) => void;
    onIconChange?: (collection: Collection, icon: string) => void;
    onMove?: (collection: Collection) => void;
    onSelect?: () => void;
    /** Available folders to move into (if omitted, fetched from store) */
    folders?: Collection[];
    /** The active bucket id (if omitted, fetched from store) */
    activeBucketId?: string | null;
}

export function CollectionContextMenu({
    collection,
    onNavigate,
    onRename,
    onDelete,
    onColorChange,
    onIconChange,
    onMove,
    onSelect,
    folders: foldersProp,
    activeBucketId: activeBucketIdProp,
}: CollectionContextMenuProps) {
    const storeData = useStore(useShallow((state) => ({
        collections: state.collections,
        activeProjectId: state.activeProjectId,
        activeCollectionId: state.activeCollectionId,
    })));

    const typeLabel =
        collection.type === 'bucket' ? 'Bucket' :
        collection.type === 'folder' ? 'Folder' : 'Collection';

    return (
        <ContextMenuContent className="min-w-[8rem]">
            <ContextMenuItem onClick={() => onNavigate(collection.id)} className="gap-2">
                <FolderOpen size={16} /> Open
            </ContextMenuItem>

            {onSelect && (
                <ContextMenuItem onClick={onSelect} className="gap-2">
                    <CheckSquare size={16} /> Select
                </ContextMenuItem>
            )}

            <ContextMenuSeparator />
            <ContextMenuLabel>Edit</ContextMenuLabel>

            <ContextMenuItem onClick={() => onRename(collection)} className="gap-2">
                <PencilSimple size={16} /> Edit {typeLabel}
            </ContextMenuItem>

            {collection.type !== 'bucket' && onMove && (
                <ContextMenuItem onClick={() => onMove(collection)} className="gap-2">
                    <ArrowSquareOut size={16} /> Move to
                </ContextMenuItem>
            )}

            <ContextMenuSub>
                <ContextMenuSubTrigger className="gap-2">
                    <Palette size={16} /> Change Color
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="p-2">
                    <div className="grid grid-cols-5 gap-1.5">
                        {COLLECTION_COLORS.map((c) => (
                            <ContextMenuItem
                                key={c}
                                className="p-0 w-6 h-6 rounded-none focus:bg-transparent"
                                onSelect={() => onColorChange(collection, c)}
                            >
                                <div
                                    className={cn(
                                        "w-6 h-6 rounded-none border-2 flex items-center justify-center transition-all",
                                        collection.color?.toLowerCase() === c.toLowerCase()
                                            ? "border-white scale-110"
                                            : "border-transparent hover:border-white/30 hover:scale-110"
                                    )}
                                    style={{ backgroundColor: c }}
                                >
                                    {collection.color?.toLowerCase() === c.toLowerCase() && (
                                        <Check weight="bold" className="w-3 h-3 text-white drop-shadow" />
                                    )}
                                </div>
                            </ContextMenuItem>
                        ))}
                        <ContextMenuItem
                            className="p-0 w-6 h-6 rounded-none focus:bg-transparent"
                            onSelect={() => onColorChange(collection, "")}
                        >
                            <div
                                className={cn(
                                    "w-6 h-6 rounded-none border-2 flex items-center justify-center transition-all bg-zinc-800",
                                    !collection.color
                                        ? "border-white scale-110"
                                        : "border-transparent hover:border-white/30 hover:scale-110"
                                )}
                            >
                                {!collection.color ? (
                                    <Check weight="bold" className="w-3 h-3 text-white drop-shadow" />
                                ) : (
                                    <X weight="bold" className="w-3 h-3 text-zinc-400" />
                                )}
                            </div>
                        </ContextMenuItem>
                    </div>
                </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSub>
                <ContextMenuSubTrigger className="gap-2">
                    <Shapes size={16} /> Change Icon
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="p-2">
                    <div className="grid grid-cols-5 gap-1.5">
                        {iconNames.map((name) => {
                            const Icon = getIcon(name);
                            return (
                                <ContextMenuItem
                                    key={name}
                                    className="p-0 w-6 h-6 rounded-none focus:bg-transparent"
                                    onSelect={() => onIconChange?.(collection, name)}
                                >
                                    <div
                                        className={cn(
                                            "w-6 h-6 rounded-none border-2 flex items-center justify-center transition-all",
                                            collection.icon === name
                                                ? "border-white scale-110 bg-zinc-700"
                                                : "border-transparent hover:border-white/30 hover:scale-110"
                                        )}
                                    >
                                        <Icon weight={collection.icon === name ? "fill" : "regular"} className="w-3.5 h-3.5 text-zinc-200" />
                                    </div>
                                </ContextMenuItem>
                            );
                        })}
                        <ContextMenuItem
                            className="p-0 w-6 h-6 rounded-none focus:bg-transparent"
                            onSelect={() => onIconChange?.(collection, "")}
                        >
                            <div
                                className={cn(
                                    "w-6 h-6 rounded-none border-2 flex items-center justify-center transition-all bg-zinc-800",
                                    !collection.icon
                                        ? "border-white scale-110"
                                        : "border-transparent hover:border-white/30 hover:scale-110"
                                )}
                            >
                                {!collection.icon ? (
                                    <Check weight="bold" className="w-3 h-3 text-white drop-shadow" />
                                ) : (
                                    <X weight="bold" className="w-3 h-3 text-zinc-400" />
                                )}
                            </div>
                        </ContextMenuItem>
                    </div>
                </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSeparator />

            <ContextMenuItem
                onClick={() => onDelete(collection.id)}
                className="gap-2 text-destructive focus:text-destructive"
            >
                <Trash size={16} /> Delete {typeLabel}
            </ContextMenuItem>
        </ContextMenuContent>
    );
}

export default function CollectionsView() {
    const {
        projects,
        activeProjectId,
        collections,
        trashCollection,
        updateCollection,
        activeCollectionId,
    } = useStore(useShallow((state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        collections: state.collections,
        trashCollection: state.trashCollection,
        updateCollection: state.updateCollection,
        activeCollectionId: state.activeCollectionId,
    })));

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentFolderId = searchParams.get('folderId');

    // Sync activeCollectionId with the bucket containing currentFolderId
    useEffect(() => {
        if (currentFolderId) {
            const bucketId = findRootBucketId(collections, currentFolderId);
            if (bucketId && bucketId !== activeCollectionId) {
                useStore.setState({ activeCollectionId: bucketId });
            }
        }
    }, [currentFolderId, activeCollectionId, collections.length]);

    const viewMode = useStore(state => state.collectionViewMode);
    const setViewMode = (mode: 'grid' | 'list' | 'cards') => useStore.setState({ collectionViewMode: mode });
    const [sortOption, setSortOption] = useState<SortOption>("custom");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [addCollectionOpen, setAddCollectionOpen] = useState(false);
    const [addBucketOpen, setAddBucketOpen] = useState(false);
    const [addFolderOpen, setAddFolderOpen] = useState(false);
    const [editCollectionOpen, setEditCollectionOpen] = useState(false);
    const [collectionToEdit, setCollectionToEdit] = useState<Collection | null>(null);
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [collectionToMove, setCollectionToMove] = useState<Collection | null>(null);

    const activeProject = projects.find(p => p.id === activeProjectId);
    const currentFolder = currentFolderId ? collections.find(c => c.id === currentFolderId) : null;
    const activeBucket = activeCollectionId ? collections.find(c => c.id === activeCollectionId) : null;
    const projectBuckets = useMemo(
        () => collections.filter((c) => c.projectId === activeProjectId && c.parentId === null && c.type === 'bucket' && !c.deleted),
        [collections, activeProjectId]
    );
    const currentEditTarget = currentFolder || activeBucket || null;

    // Breadcrumbs with memoization and protection
    const breadcrumbs = useMemo(() => {
        const path = [];
        let curr = currentFolder;
        const visited = new Set<string>();

        // If we have a current folder, climb up to find the breadcrumb path
        while (curr) {
            // Circular reference protection
            if (visited.has(curr.id)) {
                console.error("Circular reference detected in collections hierarchy at:", curr.id);
                break;
            }
            visited.add(curr.id);
            
            path.unshift(curr);

            // Stop climbing if we reach the active bucket or an item with no parent
            if (curr.parentId && curr.parentId !== activeCollectionId) {
                const parent = collections.find(c => c.id === curr!.parentId);
                // Security check: if parent is not found or is itself, break
                if (!parent || parent.id === curr.id) break;
                curr = parent;
            } else {
                curr = null;
            }
        }
        return path;
    }, [currentFolder, collections, activeCollectionId]);

    const normalizedQuery = searchQuery.toLowerCase();

    // Logic: If we are at the root (currentFolderId is null), we should show 
    // items that belong to the active bucket (parentId === activeCollectionId).
    // We should NEVER show buckets in this view.
    const filteredCollections = useMemo(() => {
        return collections.filter(c =>
            c.projectId === activeProjectId &&
            c.type !== 'bucket' &&
            (currentFolderId
                ? c.parentId === currentFolderId
                : (activeCollectionId ? c.parentId === activeCollectionId : c.parentId === null)) &&
            !c.deleted &&
            (normalizedQuery === "" || c.name.toLowerCase().includes(normalizedQuery))
        );
    }, [collections, activeProjectId, activeCollectionId, currentFolderId, normalizedQuery]);

    const sortedCollections = useMemo(() => {
        if (sortOption === "custom") {
            return [...filteredCollections].sort((a, b) => (a.order || 0) - (b.order || 0));
        }
        return [...filteredCollections].sort((a, b) => {
            let comp = 0;
            if (sortOption === "name") comp = a.name.localeCompare(b.name);
            else if (sortOption === "date") comp = (a.lastModified || 0) - (b.lastModified || 0);
            return sortDirection === "asc" ? comp : -comp;
        });
    }, [filteredCollections, sortOption, sortDirection]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;

        const overData = over.data.current;
        const activeId = active.id as string;

        // Handle drop on breadcrumb
        if (overData?.type === 'breadcrumb') {
            const targetFolderId = overData.folderId || activeCollectionId; // Default to bucket root
            const activeCollection = collections.find(c => c.id === activeId);
            if (activeCollection && activeCollection.parentId !== targetFolderId) {
                updateCollection(activeId, { parentId: targetFolderId, lastModified: Date.now() });
                playSfx('confirm');
            }
            return;
        }

        // Handle drop on folder
        let overId = over.id as string;
        let isExplicitFolderDrop = false;

        if (overId.toString().startsWith("folder-nest-")) {
            overId = overId.toString().replace("folder-nest-", "");
            isExplicitFolderDrop = true;
        }

        const overCollection = collections.find(c => c.id === overId);

        // Check if we should nest
        // Always nest if explicit drop or sort != custom
        // If sort == custom, only nest if explicit drop
        if (overCollection && (isExplicitFolderDrop || sortOption !== "custom")) {
            if (overId !== activeId) {
                updateCollection(activeId, { parentId: overId, lastModified: Date.now() });
                playSfx('confirm');
            }
            return;
        }

        // Handle reordering
        if (sortOption === "custom" && active.id !== over.id) {
            const oldIndex = sortedCollections.findIndex(c => c.id === active.id);
            const newIndex = sortedCollections.findIndex(c => c.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(sortedCollections, oldIndex, newIndex);
                newOrder.forEach((c, index) => {
                    if (c.order !== index) {
                        updateCollection(c.id, { order: index });
                    }
                });
                playSfx('confirm');
            }
        }
    };

    const handleNavigate = (id: string) => {
        const item = collections.find(c => c.id === id);
        if (item && item.type === 'folder') {
            setSearchParams({ folderId: id });
        } else {
            navigate(`/collection/${id}`);
        }
    };

    const toggleSelectItem = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
        setSelectionMode(newSelected.size > 0);
    };

    const handleRenameInit = (collection: Collection) => {
        setCollectionToEdit(collection);
        setEditCollectionOpen(true);
    };

    const handleEditCurrentTarget = () => {
        if (!currentEditTarget) return;
        setCollectionToEdit(currentEditTarget);
        setEditCollectionOpen(true);
    };

    const handleCreateCollection = (name: string, color: string, icon?: string) => {
        if (!activeProjectId) return;

        // Items created in this view should be parented to either the current folder or the active bucket
        let targetParentId = currentFolderId || activeCollectionId;

        // If no bucket is active, try to find the first one
        if (!targetParentId) {
            const firstBucket = collections.find((c: Collection) =>
                c.projectId === activeProjectId && c.parentId === null && c.type === 'bucket' && !c.deleted
            );
            if (firstBucket) {
                targetParentId = firstBucket.id;
                // Sync the active bucket if it wasn't set
                useStore.setState({ activeCollectionId: firstBucket.id });
            }
        }

        // If we still don't have a parent, we can't create a collection (buckets must be created via sidebar)
        if (!targetParentId) {
            console.warn("Cannot create collection: No active bucket found.");
            return;
        }

        const sameParentItems = collections.filter(c => c.parentId === targetParentId);
        const maxOrder = sameParentItems.length > 0 
            ? Math.max(...sameParentItems.map(c => c.order || 0)) 
            : -1;

        const newCollection: Collection = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            parentId: targetParentId,
            name,
            color,
            icon,
            order: maxOrder + 1,
            created: Date.now(),
            lastModified: Date.now(),
            type: 'collection' // Default to collection in this view
        };

        useStore.setState(state => ({
            collections: [...state.collections, newCollection]
        }));
        setAddCollectionOpen(false);
        navigate(`/collection/${newCollection.id}`);
        playSfx('confirm');
    };

    const handleCreateBucket = (name: string, color: string, icon?: string) => {
        if (!activeProjectId) return;

        const maxOrder = projectBuckets.length > 0
            ? Math.max(...projectBuckets.map((bucket) => bucket.order || 0))
            : -1;

        const newBucket: Collection = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            parentId: null,
            name,
            color,
            icon: icon || "HardDrives",
            order: maxOrder + 1,
            created: Date.now(),
            lastModified: Date.now(),
            type: 'bucket'
        };

        useStore.setState((state) => ({
            collections: [...state.collections, newBucket],
            activeCollectionId: newBucket.id
        }));
        setSearchParams({});
        navigate('/collections');
        playSfx('confirm');
    };

    const handleUpdateCollection = (name: string, color: string, icon?: string) => {
        if (!collectionToEdit) return;
        updateCollection(collectionToEdit.id, { name, color, icon, lastModified: Date.now() });
        setCollectionToEdit(null);
        playSfx('confirm');
    };

    const handleDeleteCollectionTarget = (target: Collection) => {
        trashCollection(target.id);
        setCollectionToEdit(null);

        if (target.id === currentFolderId) {
            if (target.parentId && target.parentId !== activeCollectionId) {
                setSearchParams({ folderId: target.parentId });
            } else {
                setSearchParams({});
            }
            return;
        }

        if (target.type === 'bucket' && target.id === activeCollectionId) {
            setSearchParams({});
            navigate('/collections');
        }
    };

    const handleCreateFolder = (name: string) => {
        if (!activeProjectId) return;
        if (!name) return;

        let targetParentId = currentFolderId || activeCollectionId;
        if (!targetParentId) {
            const firstBucket = collections.find((c: Collection) =>
                c.projectId === activeProjectId && c.parentId === null && c.type === 'bucket' && !c.deleted
            );
            if (firstBucket) {
                targetParentId = firstBucket.id;
                useStore.setState({ activeCollectionId: firstBucket.id });
            } else {
                return;
            }
        }

        const sameParentItems = collections.filter(c => c.parentId === targetParentId);
        const maxOrder = sameParentItems.length > 0
            ? Math.max(...sameParentItems.map(c => c.order || 0))
            : -1;

        const newFolder: Collection = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            parentId: targetParentId,
            name,
            color: "#71717a",
            icon: "Folder",
            type: 'folder',
            order: maxOrder + 1,
            created: Date.now(),
            lastModified: Date.now()
        };

        useStore.setState((state) => ({
            collections: [...state.collections, newFolder]
        }));

        setAddFolderOpen(false);
        setSearchParams({ folderId: newFolder.id });
        playSfx('confirm');
    };

    // Keyboard navigation
    useKeybind("collections.navUp", () => {
        if (sortedCollections.length === 0) return;
        const currentIndex = sortedCollections.findIndex(c => c.id === focusedId);
        const columns = viewMode === 'grid' ? 4 : 1; // Simplification
        const newIndex = Math.max(0, currentIndex - columns);
        setFocusedId(sortedCollections[newIndex].id);
    }, { preventDefault: true });

    useKeybind("collections.navDown", () => {
        if (sortedCollections.length === 0) return;
        const currentIndex = sortedCollections.findIndex(c => c.id === focusedId);
        const columns = viewMode === 'grid' ? 4 : 1;
        const newIndex = Math.min(sortedCollections.length - 1, currentIndex + columns);
        setFocusedId(sortedCollections[newIndex].id);
    }, { preventDefault: true });

    // Shortcuts
    useKeybind("collections.selectAll", () => {
        const ids = new Set(sortedCollections.map(c => c.id));
        setSelectedIds(ids);
        setSelectionMode(true);
    }, { preventDefault: true, disableInInput: true });

    useKeybind("collections.delete", () => {
        if (selectedIds.size > 0) {
            selectedIds.forEach(id => trashCollection(id));
            setSelectedIds(new Set());
            setSelectionMode(false);
            playSfx('back');
        }
    }, { preventDefault: true, disableInInput: true });

    useKeybind("collections.up", () => {
        if (selectionMode) {
            setSelectedIds(new Set());
            setSelectionMode(false);
            return;
        }
        if (currentFolderId) {
            if (currentFolder && currentFolder.parentId) {
                setSearchParams({ folderId: currentFolder.parentId });
            } else {
                setSearchParams({});
            }
        }
    }, { preventDefault: true, disableInInput: true });

    if (!activeProject) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-muted-foreground p-8 text-center">
                <Folder size={64} weight="thin" className="mb-4 opacity-20" />
                <h1 className="text-2xl font-semibold mb-2 text-foreground">No Project Selected</h1>
                <p className="max-w-md opacity-60">Select or create a project to start organizing your collections.</p>
            </div>
        );
    }

    if (projectBuckets.length === 0) {
        return (
            <>
                <ViewEmptyState
                    icon={FolderOpen}
                    title="Select or create a bucket"
                    description="Create a bucket to start organizing collection roots in this project."
                    actionLabel="Create Bucket"
                    onAction={() => setAddBucketOpen(true)}
                />
                <CreateCollectionDialog
                    open={addBucketOpen}
                    onOpenChange={setAddBucketOpen}
                    onSubmit={handleCreateBucket}
                    title="New Bucket"
                />
            </>
        );
    }

    return (
        <div className="flex h-full bg-transparent text-foreground relative">
            <div className="flex-1 flex flex-col">
                <div className="flex items-center gap-2 px-4 h-12 border-b border-border bg-card/30">
                    <h1 className="text-sm font-semibold tracking-tight">Collections</h1>

                    <div className="flex-1" />

                    <div className="flex items-center gap-2">
                        <div className="relative w-56">
                            <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                            <Input
                                placeholder="Search collections..."
                                className="pl-8 h-8 text-xs"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            className={cn(
                                "size-8",
                                selectionMode && "bg-secondary border-secondary"
                            )}
                            title="Selection mode"
                            onClick={() => setSelectionMode(!selectionMode)}
                        >
                            <CheckSquare weight={selectionMode ? "fill" : "regular"} size={16} className={selectionMode ? "text-primary" : ""} />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-2 px-3 text-xs">
                                    {sortOption === "custom" ? <Palette size={16} /> : sortOption === "name" ? <FileText size={16} /> : <Clock size={16} />}
                                    Sort
                                    {sortDirection === "asc" ? <CaretUp size={12} className="text-muted-foreground ml-auto" /> : <CaretDown size={12} className="text-muted-foreground ml-auto" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => { setSortOption("custom"); setSortDirection("asc"); }} className="gap-2 text-xs">
                                    <Palette size={16} weight={sortOption === "custom" ? "fill" : "regular"} className={sortOption === "custom" ? "text-primary" : ""} />
                                    Custom Order
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setSortOption("name"); setSortDirection("asc"); }} className="gap-2 text-xs">
                                    <FileText size={16} weight={sortOption === "name" && sortDirection === "asc" ? "fill" : "regular"} className={sortOption === "name" && sortDirection === "asc" ? "text-primary" : ""} />
                                    Name (A-Z)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSortOption("name"); setSortDirection("desc"); }} className="gap-2 text-xs">
                                    <FileText size={16} weight={sortOption === "name" && sortDirection === "desc" ? "fill" : "regular"} className={sortOption === "name" && sortDirection === "desc" ? "text-primary" : ""} />
                                    Name (Z-A)
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setSortOption("date"); setSortDirection("desc"); }} className="gap-2 text-xs">
                                    <Clock size={16} weight={sortOption === "date" && sortDirection === "desc" ? "fill" : "regular"} className={sortOption === "date" && sortDirection === "desc" ? "text-primary" : ""} />
                                    Newest First
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSortOption("date"); setSortDirection("asc"); }} className="gap-2 text-xs">
                                    <Clock size={16} weight={sortOption === "date" && sortDirection === "asc" ? "fill" : "regular"} className={sortOption === "date" && sortDirection === "asc" ? "text-primary" : ""} />
                                    Oldest First
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-2 px-3 text-xs">
                                    {viewMode === 'grid' ? <SquaresFour size={16} /> : viewMode === 'list' ? <Rows size={16} /> : <Cards size={16} />}
                                    View
                                    <CaretDown size={12} className="text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                                <DropdownMenuItem onClick={() => setViewMode('grid')} className="gap-2 text-xs">
                                    <SquaresFour size={16} weight={viewMode === 'grid' ? "fill" : "regular"} className={viewMode === 'grid' ? "text-primary" : ""} />
                                    Grid
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setViewMode('list')} className="gap-2 text-xs">
                                    <Rows size={16} weight={viewMode === 'list' ? "fill" : "regular"} className={viewMode === 'list' ? "text-primary" : ""} />
                                    List
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setViewMode('cards')} className="gap-2 text-xs">
                                    <Cards size={16} weight={viewMode === 'cards' ? "fill" : "regular"} className={viewMode === 'cards' ? "text-primary" : ""} />
                                    Cards
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0 bg-card border-border/60 group"
                            onClick={handleEditCurrentTarget}
                            title={currentEditTarget ? `Edit ${currentEditTarget.type === 'bucket' ? 'Bucket' : currentEditTarget.type === 'folder' ? 'Folder' : 'Collection'}` : 'Edit'}
                            disabled={!currentEditTarget}
                        >
                            <PencilSimple className="text-muted-foreground group-hover:text-foreground transition-colors" size={16} />
                        </Button>

                        <div className="w-px h-5 bg-border mx-1" />

                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2 text-xs"
                            onClick={() => {
                                setCollectionToEdit(null);
                                setAddCollectionOpen(true);
                            }}
                        >
                            <Plus size={14} weight="bold" />
                            Add Collection
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            className="h-8 gap-2 text-xs"
                            onClick={() => setAddFolderOpen(true)}
                        >
                            <FolderOpen weight="bold" size={14} />
                            New Folder
                        </Button>
                    </div>
                </div>

                {/* Breadcrumbs */}
                <div className="px-6 py-2 border-b bg-card/20 flex items-center gap-2">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbDropTarget
                                    id="root"
                                    onClick={() => setSearchParams({})}
                                    isActive={!currentFolderId}
                                    className="flex items-center gap-1.5 text-xs font-medium"
                                >
                                    <Folder size={14} weight="bold" className="text-muted-foreground/70" />
                                    {activeBucket?.name || "Collections"}
                                </BreadcrumbDropTarget>
                            </BreadcrumbItem>
                            {breadcrumbs.map((crumb, index) => (
                                <React.Fragment key={crumb.id}>
                                    <BreadcrumbSeparator>
                                        <CaretRight size={12} weight="bold" className="text-muted-foreground/40" />
                                    </BreadcrumbSeparator>
                                    <BreadcrumbItem>
                                        <BreadcrumbDropTarget
                                            id={crumb.id}
                                            onClick={() => handleNavigate(crumb.id)}
                                            isActive={index === breadcrumbs.length - 1}
                                            className="text-xs font-medium"
                                        >
                                            {crumb.name}
                                        </BreadcrumbDropTarget>
                                    </BreadcrumbItem>
                                </React.Fragment>
                            ))}
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                {/* Selection Bar */}
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
                                    {selectedIds.size} selected
                                </span>
                                <div className="flex-1" />
                                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedIds(new Set(filteredCollections.map(c => c.id)))}>
                                    Select All
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSelectedIds(new Set()); setSelectionMode(false); }}>
                                    Deselect All
                                </Button>
                                <div className="w-px h-5 bg-border" />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs gap-2"
                                    onClick={() => {
                                        setCollectionToMove(null);
                                        setMoveDialogOpen(true);
                                    }}
                                    disabled={selectedIds.size === 0}
                                >
                                    <ArrowSquareOut size={14} />
                                    Move
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-8 text-xs gap-2"
                                    onClick={() => {
                                        selectedIds.forEach(id => trashCollection(id));
                                        setSelectedIds(new Set());
                                        setSelectionMode(false);
                                        playSfx('back');
                                    }}
                                >
                                    <Trash size={14} />
                                    Delete
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Exit selection mode"
                                    onClick={() => {
                                        setSelectedIds(new Set());
                                        setSelectionMode(false);
                                    }}
                                >
                                    <X size={16} />
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={(args) => {
                        // First, check if pointer is within any droppable
                        const pointerCollisions = pointerWithin(args);

                        // If we have pointer collisions, filter them
                        if (pointerCollisions.length > 0) {
                            // Prioritize folder nest zones
                            const folderNest = pointerCollisions.find(c => c.id.toString().startsWith("folder-nest-"));
                            if (folderNest) {
                                return [folderNest];
                            }
                            return pointerCollisions;
                        }

                        // Fallback to closest center
                        return closestCenter(args);
                    }}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveId(null)}
                >
                    <SortableContext
                        items={sortedCollections.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                        disabled={sortOption !== "custom"}
                    >
                        <div className={cn(
                            "grid gap-4 pb-20",
                            viewMode === 'grid'
                                ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
                                : viewMode === 'list'
                                    ? "grid-cols-1"
                                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                        )}>
                                {sortedCollections.length > 0 ? (
                                    sortedCollections.map((collection) => (
                                        <CollectionCard
                                            key={collection.id}
                                            collection={collection}
                                            viewMode={viewMode}
                                            sortOption={sortOption}
                                            isSelected={selectedIds.has(collection.id)}
                                            isFocused={focusedId === collection.id}
                                            onToggleSelect={toggleSelectItem}
                                            onNavigate={handleNavigate}
                                            onRename={handleRenameInit}
                                            onDelete={(id) => {
                                                trashCollection(id);
                                                playSfx('back');
                                            }}
                                            onColorChange={(c, color) => updateCollection(c.id, { color })}
                                            onIconChange={(c, icon) => updateCollection(c.id, { icon })}
                                            onMove={(c) => { setCollectionToMove(c); setMoveDialogOpen(true); }}
                                            onMouseEnter={() => setFocusedId(collection.id)}
                                            onMouseLeave={() => setFocusedId(null)}
                                            selectionMode={selectionMode}
                                        />
                                    ))
                                ) : (
                                    <div className="col-span-full flex flex-col items-center justify-center p-16 text-muted-foreground border-2 border-dashed border-border rounded-none">
                                        <Folder size={56} weight="thin" className="mb-3 opacity-40" />
                                        <p className="font-medium">No collections found</p>
                                        {searchQuery && (
                                            <Button
                                                variant="link"
                                                onClick={() => setSearchQuery("")}
                                                className="mt-2 text-primary"
                                            >
                                                Clear search
                                            </Button>
                                        )}
                                    </div>
                                )}
                        </div>
                    </SortableContext>

                    <DragOverlay>
                        {activeId ? (
                            (() => {
                                const collection = collections.find(c => c.id === activeId);
                                if (!collection) return null;

                                const Inner = viewMode === 'grid' ? CollectionCardGridInner : viewMode === 'list' ? CollectionCardListInner : CollectionCardCardsInner;

                                return (
                                    <Inner
                                        collection={collection}
                                        isSelected={false}
                                        isFocused={false}
                                        isOver={false}
                                        selectionMode={false}
                                        showSelection={false}
                                        viewMode={viewMode}
                                        className="opacity-90 scale-105 shadow-2xl cursor-grabbing ring-2 ring-primary/50"
                                    />
                                );
                            })()
                        ) : null}
                    </DragOverlay>
                </DndContext>
                </div>
            </div>

            <CreateCollectionDialog
                open={addCollectionOpen}
                onOpenChange={setAddCollectionOpen}
                onSubmit={handleCreateCollection}
                title="New Collection"
            />
            <CreateCollectionDialog
                open={addBucketOpen}
                onOpenChange={setAddBucketOpen}
                onSubmit={handleCreateBucket}
                title="New Bucket"
            />
            <CreateFolderDialog
                open={addFolderOpen}
                onOpenChange={setAddFolderOpen}
                onSubmit={handleCreateFolder}
            />
            <EditCollectionDialog
                open={editCollectionOpen}
                onOpenChange={setEditCollectionOpen}
                collection={collectionToEdit}
                onSubmit={(id, updates) => {
                    updateCollection(id, { ...updates, lastModified: Date.now() });
                    setCollectionToEdit(null);
                    playSfx('confirm');
                }}
                onDelete={handleDeleteCollectionTarget}
            />
            <MoveCollectionDialog
                open={moveDialogOpen}
                onOpenChange={setMoveDialogOpen}
                collectionIds={collectionToMove ? [collectionToMove.id] : Array.from(selectedIds)}
            />
        </div>
    );
}
