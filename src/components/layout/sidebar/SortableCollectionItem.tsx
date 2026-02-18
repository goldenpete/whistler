/**
 * ============================================================================
 * SORTABLE COLLECTION ITEM
 * ============================================================================
 *
 * A drag-sortable collection/bucket item displayed in the sidebar tree.
 * Shows the collection icon (colored), name, and hover-reveal edit/delete
 * buttons. Active/selected state uses primary theme colors.
 *
 * Features:
 *  - Drag-and-drop reordering via @dnd-kit
 *  - Right-click context menu for rename/delete
 *  - Active state detection via URL path and folder context
 *  - Bucket vs collection distinction in context menu labels
 *
 * Used by: ProjectSidebar collection tree (main view + buckets view)
 * ============================================================================
 */

import type { MouseEvent as ReactMouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { getIcon } from "@/utils/iconMap";
import { playSfx } from "@/utils/sound";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Collection } from "@/types";

/** Props for the sortable collection item */
export interface SortableCollectionItemProps {
    /** The collection data object */
    collection: Collection;
    /** Current react-router location object */
    location: { pathname: string };
    /** Whether the sidebar is in slim/collapsed mode */
    isSlim: boolean;
    /** Handler to set the active collection (navigates to its root bucket) */
    handleSelectCollection: (id: string) => void;
    /** Handler for the edit button click */
    handleEditCollectionClick: (e: ReactMouseEvent, collection: Collection) => void;
    /** Handler for the delete button click */
    handleDeleteCollection: (e: ReactMouseEvent, id: string) => void;
    /** Setter for the collection being edited (used by context menu) */
    setCollectionToEdit: (c: Collection) => void;
    /** Setter to open the edit collection dialog (used by context menu) */
    setEditCollectionOpen: (open: boolean) => void;
    /** Store action to soft-delete a collection (used by context menu) */
    trashCollection: (id: string) => void;
    /** Context menu content for create actions (unused in this component's own menu) */
    createMenuContent: React.ReactNode;
    /** Currently active folder ID from URL search params, for active state detection */
    currentFolderId?: string | null;
}

export function SortableCollectionItem({
    collection,
    location,
    isSlim,
    handleSelectCollection,
    handleEditCollectionClick,
    handleDeleteCollection,
    setCollectionToEdit,
    setEditCollectionOpen,
    trashCollection,
    currentFolderId = null,
}: SortableCollectionItemProps) {
    const navigate = useNavigate();

    const { activeCollectionId } = useStore(useShallow((state: any) => ({
        activeCollectionId: state.activeCollectionId
    })));

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: collection.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : "auto",
        position: "relative" as const,
    };

    const Icon = getIcon(collection.icon);

    // Determine if this collection is currently active
    const isActive = (() => {
        if (collection.type === 'bucket') {
            return location.pathname === `/collections` && activeCollectionId === collection.id;
        }
        return (
            location.pathname === `/collection/${collection.id}` ||
            (location.pathname === `/collections` && currentFolderId === collection.id)
        );
    })();

    return (
        <div ref={setNodeRef} style={style}>
            <ContextMenu>
                <ContextMenuTrigger className="block w-full" asChild>
                    <div
                        onClick={(e: ReactMouseEvent) => {
                            playSfx('cursor');
                            handleSelectCollection(collection.id);
                            if (collection.type === 'bucket') {
                                navigate(`/collections`);
                            } else {
                                navigate(`/collection/${collection.id}`);
                            }
                        }}
                        {...attributes}
                        {...listeners}
                        role="button"
                        tabIndex={0}
                        data-no-sfx
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleSelectCollection(collection.id);
                                if (collection.type === 'bucket') {
                                    navigate(`/collections`);
                                } else {
                                    navigate(`/collection/${collection.id}`);
                                }
                            }
                        }}
                        className="block w-full group/item cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        title={isSlim ? collection.name : undefined}
                    >
                        <div className={cn(
                            "flex items-center gap-3 pl-3 pr-0 py-0 rounded-none text-sm transition-all relative border shadow-sm h-7 overflow-hidden",
                            isSlim && "justify-center px-1",
                            isActive
                                ? "bg-primary/20 text-primary border-primary/30"
                                : "bg-secondary/10 text-muted-foreground border-border/20 hover:bg-secondary/30 hover:text-foreground hover:border-border/40"
                        )}>
                            {/* Collection icon (always filled, colored) */}
                            <div style={{ color: collection.color }}>
                                <Icon className="text-lg transition-colors" weight="fill" />
                            </div>

                            {/* Collection name (hidden in slim mode) */}
                            {!isSlim && (
                                <span
                                    title={collection.name}
                                    className="truncate w-0 flex-1 py-2 max-w-[calc(100%-50px)] group-hover/item:max-w-[calc(100%-95px)]"
                                >
                                    {collection.name}
                                </span>
                            )}

                            {/* Hover-reveal action buttons (hidden in slim mode) */}
                            {!isSlim && (
                                <div className="absolute inset-y-0 right-0 flex items-center h-full gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity pr-1">
                                    <button
                                        onPointerDown={(e: ReactMouseEvent) => e.stopPropagation()}
                                        onClick={(e: ReactMouseEvent) => {
                                            playSfx('cursor');
                                            handleEditCollectionClick(e, collection);
                                        }}
                                        className="h-5 w-5 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                                        title="Edit Collection"
                                    >
                                        <PencilSimple weight="bold" size={12} />
                                    </button>
                                    <button
                                        onPointerDown={(e: ReactMouseEvent) => e.stopPropagation()}
                                        onClick={(e: ReactMouseEvent) => {
                                            playSfx('cursor');
                                            handleDeleteCollection(e, collection.id);
                                        }}
                                        className="h-5 w-5 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                                        title="Delete Collection"
                                    >
                                        <Trash weight="bold" size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </ContextMenuTrigger>

                {/* Right-click context menu */}
                <ContextMenuContent side="bottom" align="start" sideOffset={4} className="w-48">
                    <ContextMenuItem onClick={(e: ReactMouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCollectionToEdit(collection);
                        setEditCollectionOpen(true);
                    }}>
                        <PencilSimple className="mr-2 h-4 w-4" />
                        {collection.type === 'bucket' ? 'Rename Bucket' : 'Rename Collection'}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={(e: ReactMouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        trashCollection(collection.id);
                    }} className="text-red-500 focus:text-red-500">
                        <Trash className="mr-2 h-4 w-4" />
                        {collection.type === 'bucket' ? 'Delete Bucket' : 'Delete Collection'}
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        </div>
    );
}
