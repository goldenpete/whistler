/**
 * ============================================================================
 * SIDEBAR FOLDER ITEM — Collapsible folder/bucket container in the sidebar
 * ============================================================================
 *
 * Renders a folder or root bucket header in the sidebar collection tree.
 * Supports:
 *  - Expand/collapse with animation (Framer Motion)
 *  - Drag-and-drop (as both a draggable sortable item AND a drop target)
 *  - Active/selected state theming (primary colors when viewing this folder)
 *  - Slim mode (icon-only layout for collapsed sidebar)
 *  - Nested folder depth indentation
 *  - Hover-reveal action buttons: open, add collection, add folder, rename, delete
 *  - Right-click context menu with rename, move, delete
 *  - Auto-expand when folder becomes active via route navigation
 *
 * Children are rendered inside the collapsible area (collections and sub-folders).
 *
 * Props:
 *  - folder:           The folder/bucket data object
 *  - isRoot:           Whether this is the root bucket header
 *  - isSlim:           Slim sidebar mode
 *  - depth:            Nesting depth for indentation
 *  - isCollapsed:      Root-level collapse state (only used when isRoot=true)
 *  - onToggleCollapse: Root-level toggle callback (only used when isRoot=true)
 *  - collapsedById:    Map of folder IDs to their collapsed state
 *  - setCollapsedById: Setter for the collapsed state map
 *  - currentFolderId:  Active folder ID from URL params
 *  - folders:          All available folders (for "Move to" context menu)
 *  - children:         React children rendered in the collapsible area
 *
 * Used by: ProjectSidebar → collection tree rendering
 * ============================================================================
 */

import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Folder,
    FolderOpen,
    FolderPlus,
    FolderSimplePlus,
    Plus,
    Trash,
    PencilSimple,
    CaretDown,
    Gear,
    ArrowSquareOut,
} from "@phosphor-icons/react";
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { getIcon } from "@/utils/iconMap";
import { playSfx } from "@/utils/sound";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubTrigger,
    ContextMenuSubContent,
} from "@/components/ui/context-menu";
import type { Collection } from "@/types";

/** Props for the SidebarFolderItem component */
export interface SidebarFolderItemProps {
    /** The folder/bucket data (with id, name, etc.) */
    folder: any;
    /** Whether the sidebar is in slim (icon-only) mode */
    isSlim: boolean;
    /** React children — collection items and sub-folders rendered inside collapse */
    children?: React.ReactNode;
    /** Callback to rename this folder */
    onRename?: () => void;
    /** Callback to delete this folder */
    onDelete?: () => void;
    /** Callback to move this folder to a new parent */
    onMove?: (newParentId: string | null) => void;
    /** All available sibling folders (for "Move to" submenu) */
    folders?: any[];
    /** Callback to open the "add collection" dialog */
    handleAddCollection: (e?: any) => void;
    /** Callback to open the "add folder" dialog */
    handleAddFolder: (e?: any) => void;
    /** Nesting depth (0 = direct child of root) */
    depth?: number;
    /** Whether this item is the root bucket header */
    isRoot?: boolean;
    /** Root-level toggle callback (only for isRoot=true) */
    onToggleCollapse?: () => void;
    /** Root-level collapsed state (only for isRoot=true) */
    isCollapsed?: boolean;
    /** Currently active folder ID from URL search params */
    currentFolderId?: string | null;
    /** Map of folder IDs → collapsed state (for non-root folders) */
    collapsedById?: Record<string, boolean>;
    /** Setter for the collapsedById map */
    setCollapsedById?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function SidebarFolderItem({
    folder,
    isSlim,
    children,
    onRename,
    onDelete,
    onMove,
    folders,
    handleAddCollection,
    handleAddFolder,
    depth = 0,
    isRoot = false,
    onToggleCollapse,
    isCollapsed: isCollapsedProp,
    currentFolderId = null,
    collapsedById,
    setCollapsedById
}: SidebarFolderItemProps) {
    const navigate = useNavigate();
    const location = useLocation();

    // ── Auto-expand when this folder becomes the active route ────────────
    const isFolderActive = !isRoot && (
        location.pathname === `/collection/${folder.id}` ||
        (location.pathname === '/collections' && currentFolderId === folder.id)
    );

    useEffect(() => {
        if (isFolderActive && collapsedById?.[folder.id] !== false && setCollapsedById) {
            setCollapsedById((prev: Record<string, boolean>) => ({
                ...prev,
                [folder.id]: false
            }));
        }
    }, [isFolderActive]);

    // Determine collapsed state: root uses prop, non-root uses collapsedById map
    const isCollapsed = isRoot ? isCollapsedProp : (collapsedById?.[folder.id] ?? true);

    // ── Store data ──────────────────────────────────────────────────────────
    const { setSidebarView, activeCollectionId, collections } = useStore(useShallow((state: any) => ({
        setSidebarView: state.setSidebarView,
        activeCollectionId: state.activeCollectionId,
        collections: state.collections
    })));

    const activeCollection = activeCollectionId
        ? collections.find((c: Collection) => c.id === activeCollectionId)
        : null;
    const CollectionIcon = activeCollection ? getIcon(activeCollection.icon) : Folder;

    // ── Drag-and-drop setup ─────────────────────────────────────────────────
    const {
        attributes,
        listeners,
        setNodeRef: setSortableRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: isRoot ? "collections-root-header" : folder.id,
        data: { type: 'folder', folder: isRoot ? { ...folder, id: null } : folder }
    });

    const { setNodeRef: setDroppableRef, isOver: isFolderOver } = useDroppable({
        id: isRoot ? "folder-nest-root" : `folder-nest-${folder.id}`,
        data: { type: 'folder', folderId: isRoot ? null : folder.id }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: "relative" as const,
        zIndex: isDragging ? 50 : "auto",
    };

    // ── Toggle handler ──────────────────────────────────────────────────────
    const handleToggle = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        playSfx('cursor');
        if (isRoot) {
            if (isSlim) {
                navigate('/collections');
            }
            if (onToggleCollapse) onToggleCollapse();
        } else {
            if (isSlim) {
                navigate(`/collections?folderId=${folder.id}`);
            } else {
                if (setCollapsedById) {
                    setCollapsedById((prev: Record<string, boolean>) => ({
                        ...prev,
                        [folder.id]: !(prev?.[folder.id] ?? true)
                    }));
                }
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // SLIM MODE RENDER
    // ═══════════════════════════════════════════════════════════════════════
    if (isSlim) {
        return (
            <div ref={setSortableRef} style={style} className="mb-1 flex justify-center">
                <button
                    ref={setDroppableRef}
                    onClick={handleToggle}
                    {...attributes}
                    {...listeners}
                    className={cn(
                        "p-2 rounded-md transition-all group text-zinc-500 hover:text-zinc-300 hover:bg-secondary/40",
                        isRoot && (location.pathname === '/collections' || location.pathname.startsWith('/collection/')) && "text-primary bg-primary/10",
                        !isRoot && (location.pathname === `/collection/${folder.id}` || (location.pathname === '/collections' && currentFolderId === folder.id)) && "text-primary bg-primary/10",
                        (isFolderOver || (isRoot && isDragging)) && "bg-primary/20 ring-2 ring-primary ring-inset"
                    )}
                    title={isRoot ? (activeCollectionId ? (collections.find((c: Collection) => c.id === activeCollectionId)?.name || "Bucket") : "Collections") : folder.name}
                >
                    {isRoot ? (
                        activeCollectionId ? (
                            <div style={{ color: activeCollection?.color }}>
                                <CollectionIcon weight="fill" className="size-5" />
                            </div>
                        ) : (
                            <Folder weight="fill" className="size-5" />
                        )
                    ) : (
                        <FolderOpen weight="bold" className="size-4" />
                    )}
                </button>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FULL MODE RENDER
    // ═══════════════════════════════════════════════════════════════════════
    return (
        <div ref={setSortableRef} style={style} className={cn("mb-0.5", isRoot && "mb-2")}>
            <ContextMenu>
                <ContextMenuTrigger disabled={isRoot} asChild>
                    <div
                        ref={setDroppableRef}
                        onClick={handleToggle}
                        {...attributes}
                        {...listeners}
                        role="button"
                        tabIndex={0}
                        data-no-sfx
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleToggle();
                            }
                        }}
                        className={cn(
                            "w-full flex items-center gap-2 pr-0 pl-2 py-0 text-[11px] font-semibold tracking-wider rounded-none transition-all group border shadow-sm relative h-7 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            // Root theming: active vs inactive
                            isRoot
                                ? (location.pathname === '/collections' && !currentFolderId)
                                    ? "bg-primary/20 border-primary/30 text-primary uppercase"
                                    : "bg-secondary/40 border-border/60 text-zinc-500 hover:text-zinc-300 hover:bg-secondary/60 uppercase"
                                // Non-root theming: active vs inactive
                                : (location.pathname === `/collection/${folder.id}` || (location.pathname === '/collections' && currentFolderId === folder.id))
                                    ? "bg-primary/20 border-primary/30 text-primary"
                                    : "bg-secondary/20 border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/30",
                            depth > 0 && "ml-3 w-[calc(100%-12px)]"
                        )}
                    >
                        {/* Collapse/expand caret */}
                        <div className={cn(
                            "flex-shrink-0 transition-transform duration-200",
                            isCollapsed ? "-rotate-90" : "rotate-0"
                        )}>
                            <CaretDown size={12} weight="bold" />
                        </div>

                        {/* Root icon: shows active collection icon or generic folder */}
                        {isRoot && (
                            activeCollectionId
                                ? <div style={{ color: activeCollection?.color }}><CollectionIcon weight="fill" className={cn("flex-shrink-0 size-4", (location.pathname === '/collections' || location.pathname.startsWith('/collection/')) && "brightness-125")} /></div>
                                : <Folder weight="fill" className={cn("flex-shrink-0 size-4", (location.pathname === '/collections' || location.pathname.startsWith('/collection/')) ? "text-primary" : "text-muted-foreground")} />
                        )}

                        {/* Folder name */}
                        <span title={folder.name} className="truncate w-0 flex-1 text-left py-0.5 max-w-[calc(100%-60px)]">{folder.name}</span>

                        {/* ── Hover-reveal action buttons ──────────────────────────── */}
                        <div className={cn(
                            "h-full flex-shrink-0 items-center transition-opacity",
                            isRoot
                                ? "flex opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
                                : "hidden group-hover:flex"
                        )}>
                            {/* Open folder button */}
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    playSfx('cursor');
                                    if (isRoot) {
                                        navigate('/collections');
                                    } else {
                                        navigate(`/collections?folderId=${folder.id}`);
                                    }
                                }}
                                className="h-full px-2.5 rounded-none text-muted-foreground hover:bg-secondary/20 hover:text-foreground transition-all border-l border-border/20"
                                title="Open Folder"
                            >
                                <ArrowSquareOut weight="bold" size={14} />
                            </button>

                            {/* Manage Buckets button (root only) */}
                            {isRoot && (
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        playSfx('cursor');
                                        setSidebarView('collections');
                                    }}
                                    className="h-full px-2.5 rounded-none text-muted-foreground hover:bg-secondary/20 hover:text-foreground transition-all border-l border-border/20"
                                    title="Manage Buckets"
                                >
                                    <Gear weight="bold" size={14} />
                                </button>
                            )}

                            {/* Add item dropdown (collection or folder) */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-full px-2.5 rounded-none text-muted-foreground hover:bg-secondary/20 hover:text-foreground transition-all border-l border-border/20"
                                        title="Add Item"
                                    >
                                        <Plus weight="bold" size={14} />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent loop side="bottom" align="start" sideOffset={4} className="w-40">
                                    <DropdownMenuItem onClick={(e: any) => {
                                        e.stopPropagation();
                                        playSfx('cursor');
                                        if (!isRoot) {
                                            navigate(`/collections?folderId=${folder.id}`, { replace: true });
                                        }
                                        handleAddCollection(e as any);
                                    }}>
                                        <FolderPlus className="mr-2 h-4 w-4" />
                                        Collection
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e: any) => {
                                        e.stopPropagation();
                                        playSfx('cursor');
                                        if (!isRoot) {
                                            navigate(`/collections?folderId=${folder.id}`, { replace: true });
                                        }
                                        handleAddFolder(e as any);
                                    }}>
                                        <FolderSimplePlus className="mr-2 h-4 w-4" />
                                        Folder
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Rename and delete buttons (non-root only) */}
                            {!isRoot && (
                                <>
                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            playSfx('cursor');
                                            onRename?.();
                                        }}
                                        className="h-full px-2.5 rounded-none text-muted-foreground hover:bg-secondary/20 hover:text-foreground transition-all border-l border-border/20"
                                        title="Rename Folder"
                                    >
                                        <PencilSimple weight="bold" size={14} />
                                    </button>
                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            playSfx('cursor');
                                            onDelete?.();
                                        }}
                                        className="h-full px-2.5 rounded-none text-muted-foreground hover:bg-secondary/20 hover:text-foreground transition-all border-l border-border/20"
                                        title="Delete Folder"
                                    >
                                        <Trash weight="bold" size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </ContextMenuTrigger>

                {/* Right-click context menu (non-root only) */}
                {!isRoot && (
                    <ContextMenuContent side="bottom" align="start" sideOffset={4} className="w-48">
                        <ContextMenuItem onClick={onRename}>
                            <PencilSimple className="mr-2 h-4 w-4" />
                            Rename Folder
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuSub>
                            <ContextMenuSubTrigger>
                                <FolderOpen className="mr-2 h-4 w-4" />
                                Move to Folder
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent className="w-48">
                                <ContextMenuItem onClick={() => onMove?.(null)}>
                                    Root
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                {folders?.map((f: any) => (
                                    <ContextMenuItem key={f.id} onClick={() => onMove?.(f.id)}>
                                        {f.name}
                                    </ContextMenuItem>
                                ))}
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={onDelete} className="text-red-500 focus:text-red-500">
                            <Trash className="mr-2 h-4 w-4" />
                            Delete Folder
                        </ContextMenuItem>
                    </ContextMenuContent>
                )}
            </ContextMenu>

            {/* ── Collapsible children area ─────────────────────────────────── */}
            <AnimatePresence initial={false}>
                {!isCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            "overflow-hidden border-l border-zinc-800/50 ml-2.5 pl-1.5 mt-0.5 space-y-0.5",
                            depth > 0 && "ml-5.5",
                            isRoot && "ml-3 border-l border-border/40 pl-2"
                        )}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
