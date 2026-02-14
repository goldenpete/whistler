import React, { useState, useEffect, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
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
    SquaresFour,
    Rows,
    FolderOpen,
    ArrowSquareOut,
    X,
    Palette,
    Share
} from "@phosphor-icons/react";
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
} from "@/components/ui/context-menu";
import { AnimatePresence, motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useKeybind } from "@/hooks/use-keybind";
import { CreateCollectionDialog } from "@/components/dialogs/CollectionDialogs";

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
    viewMode: 'grid' | 'list';
}

function CollectionCardGridInner({ collection, isSelected, isFocused, isOver, selectionMode, onClick, domRef, children, style, className, showSelection = true }: CollectionCardInnerProps) {
    return (
        <div
            ref={domRef}
            id={`collection-card-${collection.id}`}
            onClick={onClick}
            data-sound-cursor
            className={cn(
                "flex flex-col gap-2 p-3 rounded-lg border border-border bg-card hover:bg-accent/30 hover:border-primary/50 transition-all duration-200 aspect-square relative group hover:shadow-lg hover:shadow-primary/5 cursor-pointer select-none",
                isOver && "ring-2 ring-primary bg-primary/20 shadow-xl scale-[1.02]",
                isSelected && "ring-2 ring-primary bg-primary/10 border-primary",
                isFocused && !isSelected && "ring-2 ring-primary/50 bg-accent/50",
                className
            )}
            style={{ 
                ...style,
                ...(collection.color ? { borderColor: collection.color, boxShadow: `0 0 10px ${collection.color}20` } : undefined)
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

            <div className="flex-1 flex items-center justify-center overflow-hidden w-full h-full pointer-events-none">
                <div 
                    className="flex items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 w-16 h-16"
                    style={{ backgroundColor: `${collection.color}20`, color: collection.color }}
                >
                    <Folder size={32} weight="duotone" />
                </div>
            </div>
            <div className="text-xs font-medium truncate px-1 text-center pointer-events-none">{collection.name}</div>
            
            {/* Drop Target Overlay */}
            {isOver && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px] z-20 rounded-lg">
                    <div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-primary/20 flex items-center gap-2">
                        <FolderOpen weight="fill" className="text-primary animate-bounce" size={16} />
                        <span className="text-xs font-semibold text-primary">Drop to move</span>
                    </div>
                </div>
            )}
            
            {children}
        </div>
    );
}

function CollectionCardListInner({ collection, isSelected, isFocused, isOver, selectionMode, onClick, domRef, children, style, className, showSelection = true }: CollectionCardInnerProps) {
    const dateStr = new Date(collection.lastModified).toLocaleDateString();
    
    return (
        <div
            ref={domRef}
            id={`collection-card-${collection.id}`}
            onClick={onClick}
            data-sound-cursor
            className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent/20 hover:border-primary/40 transition-all group hover:shadow-md cursor-pointer select-none relative",
                isOver && "ring-2 ring-primary bg-primary/20 shadow-xl scale-[1.01]",
                isSelected && "ring-2 ring-primary bg-primary/10 border-primary",
                isFocused && !isSelected && "ring-2 ring-primary/50 bg-accent/50",
                className
            )}
            style={{ 
                ...style,
                ...(collection.color ? { borderColor: collection.color, boxShadow: `0 0 10px ${collection.color}20` } : undefined)
            }}
        >
            {/* Drop Target Overlay */}
            {isOver && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px] z-20 rounded-lg">
                    <div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-primary/20 flex items-center gap-2">
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

            <div 
                className="w-12 h-10 rounded-md flex items-center justify-center shrink-0 overflow-hidden pointer-events-none"
                style={{ backgroundColor: `${collection.color}15`, color: collection.color }}
            >
                <Folder size={24} weight="duotone" />
            </div>

            <div className="flex-1 min-w-0 pointer-events-none">
                <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">{collection.name}</div>
            </div>

            <div className="text-xs text-muted-foreground/60 w-24 text-right shrink-0 pointer-events-none">
                {dateStr}
            </div>
            {children}
        </div>
    );
}

function CollectionCard({ collection, onNavigate, selectionMode, isSelected, isFocused, onToggleSelect, onRename, onDelete, onColorChange, onMouseEnter, onMouseLeave, viewMode, sortOption }: CollectionCardProps & { viewMode: 'grid' | 'list', sortOption: string }) {
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

    // Merge refs
    const setNodeRef = (node: HTMLElement | null) => {
        setSortableRef(node);
        // Do not merge droppable ref
    };

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

    const Inner = viewMode === 'grid' ? CollectionCardGridInner : CollectionCardListInner;

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
            <ContextMenuContent className="w-48">
                <ContextMenuItem onClick={() => onNavigate(collection.id)}>
                    <FolderOpen size={16} className="mr-2" /> Open
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onRename(collection)}>
                    <PencilSimple size={16} className="mr-2" /> Rename
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem className="text-destructive" onClick={() => onDelete(collection.id)}>
                    <Trash size={16} className="mr-2" /> Delete
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
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

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortOption, setSortOption] = useState<SortOption>("custom");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [addCollectionOpen, setAddCollectionOpen] = useState(false);
    const [collectionToEdit, setCollectionToEdit] = useState<Collection | null>(null);

    const activeProject = projects.find(p => p.id === activeProjectId);
    const currentFolder = currentFolderId ? collections.find(c => c.id === currentFolderId) : null;
    const activeBucket = activeCollectionId ? collections.find(c => c.id === activeCollectionId) : null;

    // Breadcrumbs
    const getBreadcrumbs = () => {
        const path = [];
        let curr = currentFolder;
        
        // If we have a current folder, climb up to find the breadcrumb path
        while (curr) {
            path.unshift(curr);
            
            // Stop climbing if we reach the active bucket or an item with no parent
            if (curr.parentId && curr.parentId !== activeCollectionId) {
                const parent = collections.find(c => c.id === curr!.parentId);
                // Security check: if parent is not found, break to avoid infinite loop
                if (!parent || parent.id === curr.id) break;
                curr = parent;
            } else {
                curr = null;
            }
        }
        return path;
    };
    const breadcrumbs = getBreadcrumbs();

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
        setAddCollectionOpen(true);
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
        
        const newCollection: Collection = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            parentId: targetParentId,
            name,
            color,
            icon,
            order: filteredCollections.length,
            created: Date.now(),
            lastModified: Date.now(),
            type: 'collection' // Default to collection in this view
        };
        
        useStore.setState(state => ({
            collections: [...state.collections, newCollection]
        }));
        playSfx('confirm');
    };

    const handleUpdateCollection = (name: string, color: string, icon?: string) => {
        if (!collectionToEdit) return;
        updateCollection(collectionToEdit.id, { name, color, icon, lastModified: Date.now() });
        setCollectionToEdit(null);
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

    return (
        <div className="flex flex-col h-full bg-transparent text-foreground">
            <header className="flex flex-col border-b border-border bg-card/30">
                <div className="flex items-center gap-2 px-4 h-12">
                    <h1 className="text-sm font-semibold tracking-tight">Collections</h1>
                    
                    <div className="flex-1" />

                    <div className="flex items-center gap-2">
                        <div className="relative w-56 group">
                            <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search collections..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-8 text-xs bg-background/40 border-border/40 focus:bg-background/60 transition-all rounded-md"
                            />
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            className={cn(
                                "size-8 bg-background/40 border-border/40 hover:bg-background/60",
                                selectionMode && "bg-secondary border-secondary"
                            )}
                            title="Selection mode"
                            onClick={() => setSelectionMode(!selectionMode)}
                        >
                            <CheckSquare weight={selectionMode ? "fill" : "regular"} size={16} className={selectionMode ? "text-primary" : ""} />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-2 px-3 text-xs bg-background/40 border-border/40 hover:bg-background/60">
                                    {sortOption === "custom" ? <Palette size={14} /> : sortOption === "name" ? <Tag size={14} /> : <Clock size={14} />}
                                    Sort
                                    {sortDirection === "asc" ? <CaretUp size={10} className="text-muted-foreground ml-auto" /> : <CaretDown size={10} className="text-muted-foreground ml-auto" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => { setSortOption("custom"); setSortDirection("asc"); }} className="gap-2 text-xs">
                                    <Palette size={16} weight={sortOption === "custom" ? "fill" : "regular"} className={sortOption === "custom" ? "text-primary" : ""} />
                                    Custom Order
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setSortOption("name"); setSortDirection("asc"); }} className="gap-2 text-xs">
                                    <Tag size={16} weight={sortOption === "name" && sortDirection === "asc" ? "fill" : "regular"} className={sortOption === "name" && sortDirection === "asc" ? "text-primary" : ""} />
                                    Name (A-Z)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSortOption("name"); setSortDirection("desc"); }} className="gap-2 text-xs">
                                    <Tag size={16} weight={sortOption === "name" && sortDirection === "desc" ? "fill" : "regular"} className={sortOption === "name" && sortDirection === "desc" ? "text-primary" : ""} />
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
                                <Button variant="outline" size="sm" className="h-8 gap-2 px-3 text-xs bg-background/40 border-border/40 hover:bg-background/60">
                                    {viewMode === 'grid' ? <SquaresFour size={14} /> : <Rows size={14} />}
                                    View
                                    <CaretDown size={10} className="text-muted-foreground" />
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
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="w-px h-5 bg-border mx-1" />

                        <Button 
                            className="h-8 gap-2 text-xs shadow-lg shadow-primary/20"
                            onClick={() => {
                                setCollectionToEdit(null);
                                setAddCollectionOpen(true);
                            }}
                        >
                            <Plus size={14} weight="bold" />
                            New Collection
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
                            <div className="flex items-center gap-3 px-6 py-2">
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
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedIds(new Set()); setSelectionMode(false); }}>
                                    <X size={16} />
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* Content */}
            <ScrollArea className="flex-1 p-6">
        <DndContext
            sensors={sensors}
            collisionDetection={(args: any) => {
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
                    "grid gap-4",
                    viewMode === 'grid' 
                        ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8" 
                        : "grid-cols-1"
                )}>
                    <AnimatePresence mode="popLayout">
                        {sortedCollections.length > 0 ? (
                            sortedCollections.map((collection) => (
                                <motion.div
                                    key={collection.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <CollectionCard
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
                                        onMouseEnter={() => setFocusedId(collection.id)}
                                        onMouseLeave={() => setFocusedId(null)}
                                        selectionMode={selectionMode}
                                    />
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
                                <Folder size={64} weight="thin" className="opacity-20 mb-4" />
                                <p className="text-sm">No collections found</p>
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
                    </AnimatePresence>
                </div>
            </SortableContext>

            <DragOverlay>
                {activeId ? (
                    (() => {
                        const collection = collections.find(c => c.id === activeId);
                        if (!collection) return null;
                        
                        const Inner = viewMode === 'grid' ? CollectionCardGridInner : CollectionCardListInner;
                        
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


            </ScrollArea>

            <CreateCollectionDialog
                open={addCollectionOpen}
                onOpenChange={setAddCollectionOpen}
                onSubmit={collectionToEdit ? handleUpdateCollection : handleCreateCollection}
                initialData={collectionToEdit ? {
                    name: collectionToEdit.name,
                    color: collectionToEdit.color,
                    icon: collectionToEdit.icon || "FolderPlus"
                } : undefined}
                title={collectionToEdit ? "Edit Collection" : "New Collection"}
            />
        </div>
    );
}
