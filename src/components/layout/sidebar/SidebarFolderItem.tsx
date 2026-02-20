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
    HardDrives,
    ArrowSquareOut,
    Palette,
    Check,
    X,
    Shapes,
} from "@phosphor-icons/react";
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { getIcon, iconNames } from "@/utils/iconMap";
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
    ContextMenuLabel,
    ContextMenuTrigger,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubTrigger,
    ContextMenuSubContent,
} from "@/components/ui/context-menu";
import type { Collection } from "@/types";

const FOLDER_COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981",
    "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef",
    "#f43f5e", "#64748b"
];

/** Props for the SidebarFolderItem component */
interface SidebarFolderItemProps {
    /** The folder/bucket data (with id, name, etc.) */
    folder: Pick<Collection, 'id' | 'name'> & Partial<Collection>;
    /** Whether the sidebar is in slim (icon-only) mode */
    isSlim: boolean;
    /** React children — collection items and sub-folders rendered inside collapse */
    children?: React.ReactNode;
    /** Callback to change this folder's color */
    onColorChange?: (color: string) => void;
    /** Callback to change this folder's icon */
    onIconChange?: (icon: string) => void;
    /** Callback to rename this folder */
    onRename?: () => void;
    /** Callback to delete this folder */
    onDelete?: () => void;
    /** Callback to move this folder to a new parent */
    onMove?: (newParentId: string | null) => void;
    /** Callback to open the move dialog for this folder */
    onMoveDialog?: () => void;
    /** All available sibling folders (for "Move to" submenu) */
    folders?: Collection[];
    /** Callback to open the "add collection" dialog */
    handleAddCollection: (e?: React.MouseEvent) => void;
    /** Callback to open the "add folder" dialog */
    handleAddFolder: (e?: React.MouseEvent) => void;
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
    onMoveDialog,
    onColorChange,
    onIconChange,
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
    const { setSidebarView, activeCollectionId, collections } = useStore(useShallow((state) => ({
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
                    ) : folder.icon ? (
                        <div style={{ color: folder.color }}>
                            {React.createElement(getIcon(folder.icon), { weight: "fill", className: "size-4" })}
                        </div>
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
                <ContextMenuTrigger asChild>
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

                        {/* Non-root folder icon: shows user-set icon or default folder */}
                        {!isRoot && (
                            folder.icon ? (
                                <div style={{ color: folder.color }}>{React.createElement(getIcon(folder.icon), { weight: "fill", className: "flex-shrink-0 size-4" })}</div>
                            ) : (
                                <Folder weight="fill" className={cn("flex-shrink-0 size-4", (location.pathname === `/collection/${folder.id}` || (location.pathname === '/collections' && currentFolderId === folder.id)) ? "text-primary" : "text-muted-foreground")} />
                            )
                        )}

                        {/* Folder name */}
                        <span title={folder.name} className="truncate w-0 flex-1 text-left py-0.5 max-w-[calc(100%-60px)]">{folder.name}</span>

                        {/* ── Hover-reveal action buttons ──────────────────────────── */}
                        <div className="h-full flex-shrink-0 flex items-center transition-opacity opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
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
                                className="h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
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
                                    className="h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                                    title="Manage Buckets"
                                >
                                    <HardDrives weight="bold" size={14} />
                                </button>
                            )}

                            {/* Add item dropdown (collection or folder) */}
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                                        title="Add Item"
                                    >
                                        <Plus weight="bold" size={14} />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent loop side="bottom" align="start" sideOffset={4} className="w-40" onCloseAutoFocus={(e: Event) => e.preventDefault()} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                    <DropdownMenuItem onSelect={() => {
                                        playSfx('cursor');
                                        if (!isRoot) {
                                            navigate(`/collections?folderId=${folder.id}`, { replace: true });
                                        }
                                        handleAddCollection();
                                    }}>
                                        <FolderPlus className="mr-2 h-4 w-4" />
                                        Collection
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => {
                                        playSfx('cursor');
                                        if (!isRoot) {
                                            navigate(`/collections?folderId=${folder.id}`, { replace: true });
                                        }
                                        handleAddFolder();
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
                                        className="h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                                        title="Edit Folder"
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
                                        className="h-6 w-6 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                                        title="Delete Folder"
                                    >
                                        <Trash weight="bold" size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </ContextMenuTrigger>

                {/* Right-click context menu */}
                <ContextMenuContent side="bottom" align="start" sideOffset={4} className="min-w-[8rem]">
                    {/* Open — both root and non-root */}
                    <ContextMenuItem onClick={() => {
                        playSfx('cursor');
                        if (isRoot) {
                            navigate('/collections');
                        } else {
                            navigate(`/collections?folderId=${folder.id}`);
                        }
                    }}>
                        <ArrowSquareOut className="mr-2 h-4 w-4" />
                        {isRoot ? 'Open' : 'Open Folder'}
                    </ContextMenuItem>

                    {/* Manage Buckets — root only */}
                    {isRoot && (
                        <ContextMenuItem onClick={() => {
                            playSfx('cursor');
                            setSidebarView('collections');
                        }}>
                            <HardDrives className="mr-2 h-4 w-4" />
                            Manage Buckets
                        </ContextMenuItem>
                    )}

                    <ContextMenuSeparator />

                    {/* Add Collection & Folder — both root and non-root */}
                    <ContextMenuItem onClick={() => {
                        playSfx('cursor');
                        if (!isRoot) {
                            navigate(`/collections?folderId=${folder.id}`, { replace: true });
                        }
                        handleAddCollection();
                    }}>
                        <FolderPlus className="mr-2 h-4 w-4" />
                        Add Collection
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => {
                        playSfx('cursor');
                        if (!isRoot) {
                            navigate(`/collections?folderId=${folder.id}`, { replace: true });
                        }
                        handleAddFolder();
                    }}>
                        <FolderSimplePlus className="mr-2 h-4 w-4" />
                        Add Folder
                    </ContextMenuItem>

                    {/* Edit actions — non-root only */}
                    {!isRoot && (
                        <>
                            <ContextMenuSeparator />
                            <ContextMenuLabel>Edit</ContextMenuLabel>
                            <ContextMenuItem onClick={onRename}>
                                <PencilSimple className="mr-2 h-4 w-4" />
                                Edit Folder
                            </ContextMenuItem>
                            {onMoveDialog && (
                                <ContextMenuItem onClick={onMoveDialog}>
                                    <FolderOpen className="mr-2 h-4 w-4" />
                                    Move to
                                </ContextMenuItem>
                            )}
                            <ContextMenuSub>
                                <ContextMenuSubTrigger>
                                    <Palette className="mr-2 h-4 w-4" />
                                    Change Color
                                </ContextMenuSubTrigger>
                                <ContextMenuSubContent className="p-2">
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {FOLDER_COLORS.map((c) => (
                                            <ContextMenuItem
                                                key={c}
                                                className="p-0 w-6 h-6 rounded-none focus:bg-transparent"
                                                onSelect={() => onColorChange?.(c)}
                                            >
                                                <div
                                                    className={cn(
                                                        "w-6 h-6 rounded-none border-2 flex items-center justify-center transition-all",
                                                        folder.color?.toLowerCase() === c.toLowerCase()
                                                            ? "border-white scale-110"
                                                            : "border-transparent hover:border-white/30 hover:scale-110"
                                                    )}
                                                    style={{ backgroundColor: c }}
                                                >
                                                    {folder.color?.toLowerCase() === c.toLowerCase() && (
                                                        <Check weight="bold" className="w-3 h-3 text-white drop-shadow" />
                                                    )}
                                                </div>
                                            </ContextMenuItem>
                                        ))}
                                        <ContextMenuItem
                                            className="p-0 w-6 h-6 rounded-none focus:bg-transparent"
                                            onSelect={() => onColorChange?.("")}
                                        >
                                            <div
                                                className={cn(
                                                    "w-6 h-6 rounded-none border-2 flex items-center justify-center transition-all bg-zinc-800",
                                                    !folder.color
                                                        ? "border-white scale-110"
                                                        : "border-transparent hover:border-white/30 hover:scale-110"
                                                )}
                                            >
                                                {!folder.color ? (
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
                                <ContextMenuSubTrigger>
                                    <Shapes className="mr-2 h-4 w-4" />
                                    Change Icon
                                </ContextMenuSubTrigger>
                                <ContextMenuSubContent className="p-2">
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {iconNames.map((name) => {
                                            const Icon = getIcon(name);
                                            return (
                                                <ContextMenuItem
                                                    key={name}
                                                    className="p-0 w-6 h-6 rounded-none focus:bg-transparent"
                                                    onSelect={() => onIconChange?.(name)}
                                                >
                                                    <div
                                                        className={cn(
                                                            "w-6 h-6 rounded-none border-2 flex items-center justify-center transition-all",
                                                            folder.icon === name
                                                                ? "border-white scale-110 bg-zinc-700"
                                                                : "border-transparent hover:border-white/30 hover:scale-110"
                                                        )}
                                                    >
                                                        <Icon weight={folder.icon === name ? "fill" : "regular"} className="w-3.5 h-3.5 text-zinc-200" />
                                                    </div>
                                                </ContextMenuItem>
                                            );
                                        })}
                                        <ContextMenuItem
                                            className="p-0 w-6 h-6 rounded-none focus:bg-transparent"
                                            onSelect={() => onIconChange?.("")}
                                        >
                                            <div
                                                className={cn(
                                                    "w-6 h-6 rounded-none border-2 flex items-center justify-center transition-all bg-zinc-800",
                                                    !folder.icon
                                                        ? "border-white scale-110"
                                                        : "border-transparent hover:border-white/30 hover:scale-110"
                                                )}
                                            >
                                                {!folder.icon ? (
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
                            <ContextMenuItem onClick={onDelete} className="text-red-500 focus:text-red-500">
                                <Trash className="mr-2 h-4 w-4" />
                                Delete Folder
                            </ContextMenuItem>
                        </>
                    )}
                </ContextMenuContent>
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
