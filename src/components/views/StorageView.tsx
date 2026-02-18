/**
 * ─── StorageView.tsx ───────────────────────────────────────────────
 *
 * File system browser view for navigating, managing, and organizing
 * media files and folders within a project's storage hierarchy.
 *
 * Features:
 *   - Hierarchical folder navigation with breadcrumbs
 *   - Drag-and-drop file reordering and folder moves (dnd-kit)
 *   - Grid and list view modes with sorting options
 *   - Multi-select with bulk actions (delete, move, share)
 *   - Context menus and inline rename/edit actions
 *   - Search/filter within current folder
 *   - File type icons and metadata display
 *
 * Exports: default StorageView component
 * Related: StorageDialogs, collectionUtils, useStore
 * ───────────────────────────────────────────────────────────────────
 */
import React, { useRef, useState, useEffect, useMemo } from "react";
import type { ReactElement, MouseEvent, ReactNode, CSSProperties, ChangeEvent, SyntheticEvent } from "react";
import { useStore, type AppStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { useStableRef } from "@/lib/use-stable-ref";
import { useNavigate, useSearchParams, Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    HardDrives, Folder, File as FileIcon, FilePdf, FileText, Image, MusicNote, VideoCamera,
    DotsThreeVertical, Trash, PencilSimple, DownloadSimple, ShareNetwork,
    MagnifyingGlass, Plus, CaretRight, FileVideo, CheckSquare, Square,
    LinkSimple, CaretDown, CaretUp, ArrowsOutSimple, Clock, Tag,
    SquaresFour, Rows, FolderOpen, ArrowSquareOut, X, Copy, Palette, Share,
    Cards
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { type File as AppFile } from "@/types";
import { playSfx } from "@/utils/sound";
import {
    DndContext,
    closestCenter,
    pointerWithin,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    DragOverlay,
    useDraggable,
    useDroppable,
    type DragStartEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbSeparator,
    BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubTrigger,
    ContextMenuSubContent,
} from "@/components/ui/context-menu";
import { AnimatePresence, motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ICONS } from "@/components/dialogs/StorageDialogs";
import { cn } from "@/lib/utils";
import { PdfThumbnail } from "@/components/ui/pdf-thumbnail";
import {
    AddFileDialog,
    NewFolderDialog,
    RenameFileDialog,
    EditFolderDialog
} from "@/components/dialogs/StorageDialogs";
import { MoveFileDialog } from "@/components/dialogs/MoveFileDialog";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { getYouTubeId } from "@/components/player/YouTubePlayer";
import { thumbnailStorage } from "@/lib/thumbnailDb";
import { useKeybind } from "@/hooks/use-keybind";

const STORAGE_COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981",
    "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef",
    "#f43f5e", "#64748b"
];



type SortOption = "custom" | "name" | "date" | "type";
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
                "rounded-none px-1.5 py-0.5 transition-colors cursor-pointer",
                isOver && "bg-primary/20 text-primary ring-1 ring-primary/30",
                !isOver && !isActive && "hover:bg-accent/50 hover:text-accent-foreground",
                isActive && "font-semibold text-foreground pointer-events-none"
            )}
        >
            {children}
        </div>
    );
}

export default function StorageView() {
    const { id } = useParams();
    const {
        projects,
        activeProjectId,
        files,
        storages,
        activeStorageId,
        trashFile,
        addStorage,
    } = useStore(useShallow((state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        files: state.files,
        storages: state.storages,
        activeStorageId: state.activeStorageId,
        trashFile: state.trashFile,
        addStorage: state.addStorage,
    })));

    useEffect(() => {
        if (id && id !== activeStorageId) {
            useStore.setState({ activeStorageId: id });
        }
    }, [id, activeStorageId]);

    const viewMode = useStore(state => state.storageViewMode);
    const setViewMode = (mode: 'grid' | 'list' | 'cards') => useStore.setState({ storageViewMode: mode });
    const [sortOption, setSortOption] = useState<SortOption>("custom");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [addFileOpen, setAddFileOpen] = useState(false);

    // Listen for action triggers
    useEffect(() => {
        const handleTriggerCreateFile = () => setAddFileOpen(true);
        window.addEventListener("trigger-storage-create-file", handleTriggerCreateFile);
        return () => window.removeEventListener("trigger-storage-create-file", handleTriggerCreateFile);
    }, []);

    const getSortIcon = () => {
        switch (sortOption) {
            case "custom": return <Palette size={16} />;
            case "name": return <FileText size={16} />;
            case "date": return <Clock size={16} />;
            case "type": return <Tag size={16} />;
            default: return null;
        }
    };

    const [newFolderOpen, setNewFolderOpen] = useState(false);
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [fileToRename, setFileToRename] = useState<AppFile | null>(null);
    const [editFolderOpen, setEditFolderOpen] = useState(false);
    const [folderToEdit, setFolderToEdit] = useState<AppFile | null>(null);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentFolderId = searchParams.get('folderId');

    // Selection Mode
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [activeId, setActiveId] = useState<string | null>(null);
    const [focusedId, setFocusedId] = useState<string | null>(null);

    const activeProject = projects.find(p => p.id === activeProjectId);
    const projectStorages = storages.filter(s => s.projectId === activeProjectId && !s.deleted);
    const activeStorage = storages.find(s => s.id === activeStorageId);

    // Auto-select first storage if none active
    useEffect(() => {
        if (!activeProjectId) return;
        const projectStorages = storages.filter(s => s.projectId === activeProjectId && !s.deleted);
        if (!activeStorageId && projectStorages.length > 0) {
            useStore.setState({ activeStorageId: projectStorages[0].id });
        }
    }, [activeStorageId, activeProjectId, storages]);

    const handleCreateStorage = () => {
        if (!activeProjectId) return;

        const newStorageName = projectStorages.length === 0 ? "Main Storage" : "New Storage";
        addStorage(newStorageName, activeProjectId);
    };

    const currentFolder = currentFolderId ? files.find(f => f.id === currentFolderId) : null;
    const showEmptyState = !activeProject || projectStorages.length === 0;

    // Breadcrumb path builder
    const getBreadcrumbs = () => {
        const path = [];
        let curr = currentFolder;
        while (curr) {
            path.unshift(curr);
            if (curr.parentId) {
                curr = files.find(f => f.id === curr!.parentId) || null;
            } else {
                curr = null;
            }
        }
        return path;
    };
    const breadcrumbs = getBreadcrumbs();

    const normalizedQuery = searchQuery.toLowerCase();

    const projectFiles = files.filter(f =>
        f.projectId === activeProjectId &&
        (!activeStorageId || f.storageId === activeStorageId) &&
        f.parentId === currentFolderId &&
        !f.deleted &&
        (normalizedQuery === "" || f.name.toLowerCase().includes(normalizedQuery))
    );

    // Sort files based on option
    const sortedProjectFiles = useMemo(() => {
        if (sortOption === "custom") {
            return [...projectFiles].sort((a, b) => a.order - b.order);
        }

        return [...projectFiles].sort((a, b) => {
            let comparison = 0;
            switch (sortOption) {
                case "name":
                    comparison = a.name.localeCompare(b.name);
                    break;
                case "date":
                    comparison = (a.lastModified || a.created || 0) - (b.lastModified || b.created || 0);
                    break;
                case "type":
                    comparison = a.type.localeCompare(b.type);
                    break;
            }
            return sortDirection === "asc" ? comparison : -comparison;
        });
    }, [projectFiles, sortOption, sortDirection]);

    const orderedProjectFiles = sortedProjectFiles;

    // Keyboard Navigation
    const getColumns = () => {
        if (viewMode === 'list') return 1;
        const width = window.innerWidth;
        if (width >= 1280) return 8; // xl
        if (width >= 1024) return 6; // lg
        if (width >= 768) return 4; // md
        return 2; // default
    };

    const handleMoveFocus = (direction: number) => {
        if (orderedProjectFiles.length === 0) return;

        let newIndex = 0;
        if (!focusedId) {
            newIndex = 0;
        } else {
            const currentIndex = orderedProjectFiles.findIndex(f => f.id === focusedId);
            if (currentIndex === -1) {
                newIndex = 0;
            } else {
                newIndex = Math.min(Math.max(currentIndex + direction, 0), orderedProjectFiles.length - 1);
            }
        }
        setFocusedId(orderedProjectFiles[newIndex].id);
    };

    const handleEnter = () => {
        if (!focusedId) return;
        const file = orderedProjectFiles.find(f => f.id === focusedId);
        if (!file) return;

        if (selectionMode) {
            toggleSelectItem(file.id);
        } else if (file.type === 'folder') {
            handleNavigateFolder(file.id);
        } else {
            // Open file
            const linkTo = file.type === 'video' || file.type === 'pdf' || file.type === 'audio' || file.type === 'image' ? `/file/${file.id}` : null;
            if (linkTo) {
                navigate(linkTo);
            }
        }
    };

    useKeybind("storage.navRight", () => handleMoveFocus(1), { preventDefault: true });
    useKeybind("storage.navLeft", () => handleMoveFocus(-1), { preventDefault: true });
    useKeybind("storage.navUp", () => handleMoveFocus(viewMode === 'grid' ? -getColumns() : -1), { preventDefault: true });
    useKeybind("storage.navDown", () => handleMoveFocus(viewMode === 'grid' ? getColumns() : 1), { preventDefault: true });
    useKeybind("storage.open", handleEnter, { preventDefault: true });

    // Scroll focused item into view
    useEffect(() => {
        if (focusedId) {
            const el = document.getElementById(`file-card-${focusedId}`);
            if (el) {
                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [focusedId]);

    // Reset focus when navigating folders
    useEffect(() => {
        setFocusedId(null);
    }, [currentFolderId, activeStorageId]);

    const handleRenameInit = (file: AppFile) => {
        if (file.type === 'folder') {
            setFolderToEdit(file);
            setEditFolderOpen(true);
        } else {
            setFileToRename(file);
            setRenameDialogOpen(true);
        }
    };

    const handleRenameSubmit = (newName: string, newDescription: string) => {
        if (fileToRename) {
            useStore.setState(state => ({
                files: state.files.map(f => f.id === fileToRename.id ? { ...f, name: newName, description: newDescription, lastModified: Date.now() } : f)
            }));
        }
    };

    const handleEditFolderSubmit = (name: string, description: string, color: string, icon: string) => {
        if (folderToEdit) {
            useStore.setState(state => ({
                files: state.files.map(f => f.id === folderToEdit.id ? { ...f, name, description, color, icon, lastModified: Date.now() } : f)
            }));
        }
    };

    // --- Shortcuts ---
    useKeybind("storage.selectAll", () => {
        const ids = new Set(orderedProjectFiles.map((f: AppFile) => f.id));
        setSelectedIds(ids);
        setSelectionMode(true);
    }, { preventDefault: true, disableInInput: true });

    useKeybind("storage.select", () => {
        if (!focusedId) return;
        toggleSelectItem(focusedId);
    }, { preventDefault: true, disableInInput: true });

    useKeybind("storage.delete", () => {
        if (selectedIds.size > 0) {
            selectedIds.forEach((id: string) => trashFile(id));
            setSelectedIds(new Set<string>());
            setSelectionMode(false);
        }
    }, { preventDefault: true, disableInInput: true });

    useKeybind("storage.up", () => {
        if (selectionMode || selectedIds.size > 0) {
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

    useKeybind("storage.rename", () => {
        if (selectedIds.size === 1) {
            const id = Array.from(selectedIds)[0];
            const file = files.find(f => f.id === id);
            if (file) handleRenameInit(file);
        }
    }, { preventDefault: true, disableInInput: true });

    useKeybind("storage.clearSelection", () => {
        if (selectionMode || selectedIds.size > 0) {
            setSelectedIds(new Set());
            setSelectionMode(false);
        }
    }, { preventDefault: true, disableInInput: true });
    // --- End Shortcuts ---

    const handleMoveInit = (file: AppFile) => {
        if (!selectedIds.has(file.id)) {
            setSelectedIds(new Set([file.id]));
        }
        setMoveDialogOpen(true);
    };

    const handleColorChange = (file: AppFile, color: string) => {
        useStore.setState(state => ({
            files: state.files.map(f => f.id === file.id ? { ...f, color, lastModified: Date.now() } : f)
        }));
    };

    const handleNewFolder = (name: string, description: string, color: string, icon: string) => {
        if (!activeProjectId) return;

        let targetStorageId = activeStorageId;
        if (!targetStorageId) {
            const projectStorages = storages.filter(s => s.projectId === activeProjectId);
            if (projectStorages.length > 0) {
                targetStorageId = projectStorages[0].id;
            } else {
                const newStorage = {
                    id: crypto.randomUUID(),
                    projectId: activeProjectId,
                    name: "Main Storage",
                    created: Date.now(),
                    lastModified: Date.now()
                };
                useStore.setState(state => ({ storages: [...state.storages, newStorage] }));
                targetStorageId = newStorage.id;
            }
        }

        const newFolder: AppFile = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            storageId: targetStorageId,
            parentId: currentFolderId,
            name,
            color,
            icon,
            url: null,
            type: 'folder',
            order: projectFiles.length,
            created: Date.now(),
            lastModified: Date.now()
        };
        useStore.setState(state => ({ files: [...state.files, newFolder] }));
    };

    const handleAddFile = (url: string, name: string) => {
        if (!activeProjectId) return;

        let targetStorageId = activeStorageId;
        if (!targetStorageId) {
            const projectStorages = storages.filter(s => s.projectId === activeProjectId);
            if (projectStorages.length > 0) {
                targetStorageId = projectStorages[0].id;
            } else {
                const newStorage = {
                    id: crypto.randomUUID(),
                    projectId: activeProjectId,
                    name: "Main Storage",
                    created: Date.now(),
                    lastModified: Date.now()
                };
                useStore.setState(state => ({ storages: [...state.storages, newStorage] }));
                targetStorageId = newStorage.id;
            }
        }

        const type = getFileTypeFromUrl(url);
        const newFile: AppFile = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            storageId: targetStorageId,
            parentId: currentFolderId,
            name,
            url,
            type,
            order: projectFiles.length,
            created: Date.now(),
            lastModified: Date.now()
        };
        useStore.setState(state => ({ files: [...state.files, newFile] }));
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) {
            setActiveId(null);
            return;
        }

        // Handle drop on breadcrumb
        const overData = over.data.current;
        if (overData?.type === 'breadcrumb') {
            const targetFolderId = overData.folderId;

            // Don't move if it's already in that folder
            const activeFile = files.find(f => f.id === active.id);
            if (activeFile && activeFile.parentId === targetFolderId) {
                setActiveId(null);
                return;
            }

            useStore.setState(state => ({
                files: state.files.map(f =>
                    f.id === active.id
                        ? { ...f, parentId: targetFolderId, lastModified: Date.now() }
                        : f
                )
            }));
            setActiveId(null);
            return;
        }

        // If not in custom sort, don't allow reordering, but allow moving to folders
        if (sortOption !== "custom") {
            const overFile = files.find(f => f.id === over.id);
            const isTargetFolder = over.id === 'root' || (overFile && overFile.type === 'folder');

            if (!isTargetFolder) {
                setActiveId(null);
                return;
            }
        }

        const targetFolderId = over.id === 'root' ? null : over.id as string;

        // Don't move if dropping on itself or same parent
        const activeFile = files.find(f => f.id === active.id);
        if (activeFile?.parentId === targetFolderId) {
            setActiveId(null);
            return;
        }

        // Verify target is a folder or root, not a file (unless dropping ON a folder in the grid)
        // If dropping on breadcrumb (which we assume over.id is), it's valid if it's a folder or root.
        // We need to differentiate dropping on grid folder vs breadcrumb.
        // Grid folders are just normal IDs. Breadcrumb IDs match folder IDs (except root).

        // Check if dropping onto a folder
        let overId = over.id;
        let isExplicitFolderDrop = false;

        // Handle nested drop targets
        if (overId.toString().startsWith("folder-nest-")) {
            overId = overId.toString().replace("folder-nest-", "");
            isExplicitFolderDrop = true;
        }

        const overFile = files.find(f => f.id === overId);
        const isTargetFolder = overId === 'root' || (overFile && overFile.type === 'folder');

        // Logic for dropping into folders (nesting)
        // If it's an explicit folder drop (bullseye), or root, OR if we are not in custom sort (where everything is a drop target)
        const isNestingDrop = isTargetFolder && (isExplicitFolderDrop || overId === 'root' || sortOption !== 'custom');

        if (isNestingDrop) {
            useStore.setState(state => ({
                files: state.files.map(f =>
                    f.id === active.id
                        ? { ...f, parentId: overId === 'root' ? null : overId as string, lastModified: Date.now() }
                        : f
                )
            }));
            setActiveId(null);
            return;
        }

        if (activeFile && overFile && activeFile.parentId === overFile.parentId && activeFile.storageId === overFile.storageId) {
            const siblings = files
                .filter(f =>
                    f.projectId === activeFile.projectId &&
                    f.storageId === activeFile.storageId &&
                    f.parentId === activeFile.parentId &&
                    !f.deleted
                )
                .sort((a, b) => a.order - b.order);
            const oldIndex = siblings.findIndex(f => f.id === active.id);
            const newIndex = siblings.findIndex(f => f.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                const reordered = arrayMove(siblings, oldIndex, newIndex);
                useStore.setState(state => ({
                    files: state.files.map(f => {
                        const idx = reordered.findIndex((r: AppFile) => r.id === f.id);
                        if (idx === -1) return f;
                        return { ...f, order: idx, lastModified: Date.now() };
                    })
                }));
            }
        }

        setActiveId(null);
    };

    const handleNavigateFolder = (folderId: string | null) => {
        if (folderId) {
            setSearchParams({ folderId });
        } else {
            setSearchParams({});
        }
    };

    useEffect(() => {
        if (currentFolderId && activeProjectId) {
            const folder = files.find(f => f.id === currentFolderId);
            if (folder && folder.storageId !== activeStorageId) {
                useStore.setState({ activeStorageId: folder.storageId });
            }
        }
    }, [currentFolderId, files, activeStorageId, activeProjectId]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    const collisionDetection = (args: any) => {
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
    };

    // Selection Mode Handlers
    const toggleSelectionMode = () => {
        setSelectionMode(!selectionMode);
        if (selectionMode) {
            setSelectedIds(new Set());
        }
    };

    const toggleSelectItem = (id: string) => {
        if (!selectionMode) {
            setSelectionMode(true);
        }

        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const selectAll = () => {
        const allIds = projectFiles.map((f: AppFile) => f.id);
        setSelectedIds(new Set(allIds));
    };

    const deselectAll = () => {
        setSelectedIds(new Set<string>());
    };

    const deleteSelected = () => {
        selectedIds.forEach((id: string) => trashFile(id));
        setSelectedIds(new Set<string>());
        setSelectionMode(false);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
        >
            {showEmptyState ? (
                <div className="flex h-full bg-transparent overflow-hidden">
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <HardDrives size={64} weight="thin" className="mx-auto mb-4 opacity-30" />
                            <p className="mb-4">{!activeProjectId ? "Select a project to use storage" : "Select or create a storage"}</p>
                            {activeProject && (
                                <Button onClick={handleCreateStorage}>
                                    <Plus className="mr-2" /> Create Storage
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex h-full bg-transparent text-foreground relative">
                    <div className="flex-1 flex flex-col">
                        <div className="flex items-center gap-2 px-4 h-12 border-b border-border bg-card/30">
                            <h1 className="text-sm font-semibold tracking-tight">Storage</h1>

                            <div className="flex-1" />

                            <div className="flex items-center gap-2">
                                <div className="relative w-56">
                                    <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                                    <Input
                                        placeholder="Search in this storage..."
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
                                    title="Selection mode"
                                    onClick={toggleSelectionMode}
                                >
                                    <CheckSquare weight={selectionMode ? "fill" : "regular"} size={16} className={selectionMode ? "text-primary" : ""} />
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 gap-2 px-3 text-xs">
                                            {getSortIcon()}
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
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => { setSortOption("type"); setSortDirection("asc"); }} className="gap-2 text-xs">
                                            <Tag size={16} weight={sortOption === "type" ? "fill" : "regular"} className={sortOption === "type" ? "text-primary" : ""} />
                                            File Type
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
                                <div className="w-px h-5 bg-border mx-1" />
                                <Button variant="outline" size="sm" className="h-8 gap-2 text-xs" onClick={() => setAddFileOpen(true)}>
                                    <Plus weight="bold" size={14} />
                                    Add File
                                </Button>
                                <Button variant="default" size="sm" className="h-8 gap-2 text-xs" onClick={() => setNewFolderOpen(true)}>
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
                                            onClick={() => handleNavigateFolder(null)}
                                            className="flex items-center gap-1.5 text-xs font-medium"
                                            isActive={!currentFolderId}
                                        >
                                            <HardDrives size={14} weight="bold" className="text-muted-foreground/70" />
                                            {activeStorage?.name || "Storage"}
                                        </BreadcrumbDropTarget>
                                    </BreadcrumbItem>
                                    {breadcrumbs.map((folder, index) => (
                                        <React.Fragment key={folder.id}>
                                            <BreadcrumbSeparator>
                                                <CaretRight size={12} weight="bold" className="text-muted-foreground/40" />
                                            </BreadcrumbSeparator>
                                            <BreadcrumbItem>
                                                <BreadcrumbDropTarget
                                                    id={folder.id}
                                                    onClick={() => handleNavigateFolder(folder.id)}
                                                    className="text-xs font-medium"
                                                    isActive={index === breadcrumbs.length - 1}
                                                >
                                                    {folder.name}
                                                </BreadcrumbDropTarget>
                                            </BreadcrumbItem>
                                        </React.Fragment>
                                    ))}
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>

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
                                        <Button variant="ghost" size="sm" onClick={selectAll} disabled={selectedIds.size === projectFiles.length}>
                                            Select All
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={deselectAll} disabled={selectedIds.size === 0}>
                                            Deselect All
                                        </Button>
                                        <div className="w-px h-5 bg-border" />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="gap-2"
                                            onClick={() => setMoveDialogOpen(true)}
                                            disabled={selectedIds.size === 0}
                                        >
                                            <ArrowSquareOut size={14} />
                                            Move
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="gap-2"
                                            onClick={deleteSelected}
                                            disabled={selectedIds.size === 0}
                                        >
                                            <Trash size={14} />
                                            Delete ({selectedIds.size})
                                        </Button>
                                        <Button variant="ghost" size="icon" className="size-7" onClick={toggleSelectionMode}>
                                            <X size={16} />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex-1 overflow-auto p-4">
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 pb-20">
                                    <SortableContext
                                        items={orderedProjectFiles.map(f => f.id)}
                                        strategy={rectSortingStrategy}
                                        disabled={sortOption !== "custom"}
                                    >
                                        {orderedProjectFiles.map((file: AppFile) => (
                                            <FileCardGrid
                                                key={file.id}
                                                file={file}
                                                onNavigate={handleNavigateFolder}
                                                selectionMode={selectionMode}
                                                isSelected={selectedIds.has(file.id)}
                                                isFocused={focusedId === file.id}
                                                onToggleSelect={toggleSelectItem}
                                                onRename={handleRenameInit}
                                                onMove={handleMoveInit}
                                                onColorChange={handleColorChange}
                                                onMouseEnter={() => setFocusedId(file.id)}
                                                onMouseLeave={() => setFocusedId(null)}
                                                sortOption={sortOption}
                                            />
                                        ))}
                                    </SortableContext>
                                    {orderedProjectFiles.length === 0 && <EmptyState />}
                                </div>
                            ) : viewMode === 'list' ? (
                                <div className="flex flex-col gap-2 pb-10">
                                    <SortableContext
                                        items={orderedProjectFiles.map(f => f.id)}
                                        strategy={verticalListSortingStrategy}
                                        disabled={sortOption !== "custom"}
                                    >
                                        {orderedProjectFiles.map((file: AppFile) => (
                                            <FileCardList
                                                key={file.id}
                                                file={file}
                                                onNavigate={handleNavigateFolder}
                                                selectionMode={selectionMode}
                                                isSelected={selectedIds.has(file.id)}
                                                isFocused={focusedId === file.id}
                                                onToggleSelect={toggleSelectItem}
                                                onRename={handleRenameInit}
                                                onMove={handleMoveInit}
                                                onColorChange={handleColorChange}
                                                onMouseEnter={() => setFocusedId(file.id)}
                                                onMouseLeave={() => setFocusedId(null)}
                                                sortOption={sortOption}
                                            />
                                        ))}
                                    </SortableContext>
                                    {orderedProjectFiles.length === 0 && <EmptyState />}
                                </div>
                            ) : (
                                <SortableContext
                                    items={orderedProjectFiles.map(f => f.id)}
                                    strategy={rectSortingStrategy}
                                    disabled={sortOption !== "custom"}
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-20">
                                        {orderedProjectFiles.map((file: AppFile) => (
                                            <FileCardCards
                                                key={file.id}
                                                file={file}
                                                onNavigate={handleNavigateFolder}
                                                selectionMode={selectionMode}
                                                isSelected={selectedIds.has(file.id)}
                                                isFocused={focusedId === file.id}
                                                onToggleSelect={toggleSelectItem}
                                                onRename={handleRenameInit}
                                                onMove={handleMoveInit}
                                                onColorChange={handleColorChange}
                                                onMouseEnter={() => setFocusedId(file.id)}
                                                onMouseLeave={() => setFocusedId(null)}
                                                sortOption={sortOption}
                                            />
                                        ))}
                                        {orderedProjectFiles.length === 0 && <EmptyState />}
                                    </div>
                                </SortableContext>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <AddFileDialog
                open={addFileOpen}
                onOpenChange={setAddFileOpen}
                onSubmit={handleAddFile}
            />
            <NewFolderDialog
                open={newFolderOpen}
                onOpenChange={setNewFolderOpen}
                onSubmit={handleNewFolder}
            />
            <MoveFileDialog
                open={moveDialogOpen}
                onOpenChange={setMoveDialogOpen}
                fileIds={Array.from(selectedIds)}
            />
            <RenameFileDialog
                open={renameDialogOpen}
                onOpenChange={setRenameDialogOpen}
                onSubmit={handleRenameSubmit}
                initialName={fileToRename?.name || ""}
                initialDescription={fileToRename?.description || ""}
                initialUrl={fileToRename?.url || ""}
                showDescription={fileToRename?.type !== 'folder'}
            />
            <EditFolderDialog
                open={editFolderOpen}
                onOpenChange={setEditFolderOpen}
                onSubmit={handleEditFolderSubmit}
                initialName={folderToEdit?.name || ""}
                initialColor={folderToEdit?.color}
                initialIcon={folderToEdit?.icon}
            />

            <DragOverlay>
                {activeId ? (
                    (() => {
                        const file = files.find(f => f.id === activeId);
                        if (!file) return null;

                        const Inner = viewMode === 'grid'
                            ? FileCardGridInner
                            : viewMode === 'list'
                                ? FileCardListInner
                                : FileCardCardsInner;

                        return (
                            <Inner
                                file={file}
                                isSelected={false}
                                isOver={false}
                                selectionMode={false}
                                showSelection={false}
                                className={cn(
                                    "opacity-90 scale-105 shadow-2xl cursor-grabbing ring-2 ring-primary/50",
                                    viewMode === 'list' && "bg-card",
                                    viewMode === 'cards' && "w-[300px]" // Give it a fixed width in overlay for cards
                                )}
                            />
                        );
                    })()
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

function EmptyState() {
    return (
        <div className="col-span-full flex flex-col items-center justify-center p-16 text-muted-foreground border-2 border-dashed border-border rounded-none">
            <Folder size={56} weight="thin" className="mb-3 opacity-40" />
            <p className="font-medium">No files here</p>
            <p className="text-xs mt-1 opacity-70">Click "Add File" to add a web link</p>
        </div>
    );
}

interface FileCardProps {
    file: AppFile;
    onNavigate: (id: string) => void;
    selectionMode: boolean;
    isSelected: boolean;
    isFocused?: boolean;
    onToggleSelect: (id: string) => void;
    onRename: (file: AppFile) => void;
    onMove: (file: AppFile) => void;
    onColorChange: (file: AppFile, color: string) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    sortOption?: string;
}

interface FileCardInnerProps {
    file: AppFile;
    isSelected: boolean;
    isFocused?: boolean;
    isOver: boolean;
    selectionMode: boolean;
    onClick?: (e: MouseEvent) => void;
    linkTo?: string;
    domRef?: (element: HTMLElement | null) => void;
    children?: ReactNode;
    style?: CSSProperties;
    className?: string;
    showSelection?: boolean;
}

function FileCardGridInner({ file, isSelected, isFocused, isOver, selectionMode, onClick, linkTo, domRef, children, style, className, showSelection = true }: FileCardInnerProps) {
    const c = file.color;
    return (
        <div
            ref={domRef}
            id={`file-card-${file.id}`}
            onClick={onClick}
            data-sound-cursor
            className={cn(
                "flex flex-col gap-2 p-3 rounded-none border border-border bg-card transition-all duration-200 aspect-[4/3] relative group cursor-pointer select-none",
                isOver && "ring-2 ring-primary bg-primary/20 shadow-xl scale-[1.02]",
                isSelected && "ring-2 ring-primary bg-primary/10 border-primary",
                isFocused && !isSelected && !c && "border-muted-foreground/30 bg-muted/20 shadow-md",
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
            {/* Selection checkbox */}
            {selectionMode && showSelection && (
                <div className="absolute top-2 left-2 z-10">
                    {isSelected ? (
                        <CheckSquare weight="fill" size={20} className="text-primary" />
                    ) : (
                        <Square weight="regular" size={20} className="text-muted-foreground" />
                    )}
                </div>
            )}

            {!selectionMode && linkTo && (file.type === 'video' || file.type === 'pdf' || file.type === 'audio' || file.type === 'image') ? (
                <Link to={linkTo} className="absolute inset-0 z-0" onClick={(e: MouseEvent) => { e.stopPropagation(); playSfx('cursor'); }} />
            ) : null}

            <div className="flex-1 flex items-center justify-center overflow-hidden w-full h-full pointer-events-none">
                <FileThumbnail file={file} iconSize={44} />
            </div>
            <div className="text-xs font-medium truncate px-1 text-center pointer-events-none">{file.name}</div>

            {/* Drop Target Overlay */}
            {isOver && file.type === 'folder' && (
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
}

function FileCardListInner({ file, isSelected, isFocused, isOver, selectionMode, onClick, linkTo, domRef, children, style, className, showSelection = true }: FileCardInnerProps) {
    const dateStr = new Date(file.created).toLocaleDateString();
    const typeLabel = file.type.toUpperCase();
    const c = file.color;

    return (
        <div
            ref={domRef}
            id={`file-card-${file.id}`}
            onClick={onClick}
            data-sound-cursor
            className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-none border border-border bg-card transition-all group cursor-pointer select-none relative",
                isOver && "ring-2 ring-primary bg-primary/20 shadow-xl scale-[1.01]",
                isSelected && "ring-2 ring-primary bg-primary/10 border-primary",
                isFocused && !isSelected && !c && "border-muted-foreground/30 bg-muted/20 shadow-md",
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
            {isOver && file.type === 'folder' && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px] z-20 rounded-none">
                    <div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-none shadow-lg border border-primary/20 flex items-center gap-2">
                        <FolderOpen weight="fill" className="text-primary animate-bounce" size={16} />
                        <span className="text-xs font-semibold text-primary">Drop to move</span>
                    </div>
                </div>
            )}

            {/* Selection checkbox */}
            {selectionMode && showSelection && (
                <div className="mr-2">
                    {isSelected ? (
                        <CheckSquare weight="fill" size={20} className="text-primary" />
                    ) : (
                        <Square weight="regular" size={20} className="text-muted-foreground" />
                    )}
                </div>
            )}

            {!selectionMode && linkTo && (file.type === 'video' || file.type === 'pdf' || file.type === 'audio' || file.type === 'image') ? (
                <Link to={linkTo} className="absolute inset-0 z-0" onClick={(e: MouseEvent) => { e.stopPropagation(); playSfx('cursor'); }} />
            ) : null}

            {/* Thumbnail */}
            <div className="w-16 h-12 rounded-none bg-muted flex items-center justify-center shrink-0 overflow-hidden pointer-events-none">
                <FileThumbnail file={file} iconSize={28} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pointer-events-none">
                <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">{file.name}</div>
                {file.description && <div className="text-xs text-muted-foreground/70 truncate">{file.description}</div>}
            </div>

            {/* Type Badge */}
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-primary/20 text-primary rounded-none pointer-events-none">
                {typeLabel}
            </div>

            {/* Date */}
            <div className="text-xs text-muted-foreground/60 w-24 text-right shrink-0 pointer-events-none">
                {dateStr}
            </div>
            {children}
        </div>
    );
}

function FileCardCardsInner({ file, isSelected, isFocused, isOver, selectionMode, onClick, linkTo, domRef, children, style, className, showSelection = true }: FileCardInnerProps) {
    const dateStr = new Date(file.created).toLocaleDateString();
    const c = file.color;

    return (
        <div
            id={`file-card-${file.id}`}
            onClick={onClick}
            data-sound-cursor
            className={cn(
                "flex flex-col rounded-none border border-border bg-card overflow-hidden transition-all group cursor-pointer select-none relative h-full",
                isOver && "ring-2 ring-primary bg-primary/20 shadow-xl scale-[1.02]",
                isSelected && "ring-2 ring-primary bg-primary/10 border-primary",
                isFocused && !isSelected && !c && "border-muted-foreground/30 bg-muted/20 shadow-xl",
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
            {/* Selection checkbox */}
            {selectionMode && showSelection && (
                <div className="absolute top-3 left-3 z-10">
                    {isSelected ? (
                        <CheckSquare weight="fill" size={20} className="text-primary shadow-sm" />
                    ) : (
                        <Square weight="regular" size={20} className="text-white drop-shadow-md" />
                    )}
                </div>
            )}

            {!selectionMode && linkTo && (file.type === 'video' || file.type === 'pdf' || file.type === 'audio' || file.type === 'image') ? (
                <Link to={linkTo} className="absolute inset-0 z-0" onClick={(e: MouseEvent) => { e.stopPropagation(); playSfx('cursor'); }} />
            ) : null}

            {/* Content Area (Top) */}
            <div
                ref={domRef}
                className="flex-1 min-h-[160px] bg-muted/30 flex items-center justify-center overflow-hidden pointer-events-none relative group-hover:bg-muted/10 transition-colors"
            >
                <FileThumbnail file={file} iconSize={48} />

                {/* Type Overlay */}
                <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-none bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wide pointer-events-none">
                    {file.type}
                </div>

                {/* Drop Target Overlay */}
                {isOver && file.type === 'folder' && (
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
                    {file.name}
                </div>

                <div className="flex items-center justify-between mt-1">
                    <div className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-tighter">
                        {dateStr}
                    </div>
                    {file.description && (
                        <div className="text-[10px] text-muted-foreground/40 italic truncate max-w-[60%]">
                            {file.description}
                        </div>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
}

function FileCardCards({ file, onNavigate, selectionMode, isSelected, isFocused, onToggleSelect, onRename, onMove, onColorChange, onMouseEnter, onMouseLeave, sortOption }: FileCardProps) {
    const linkTo = file.type === 'video' || file.type === 'pdf' || file.type === 'audio' || file.type === 'image' ? `/file/${file.id}` : '#';

    // Use sortable for reordering
    const {
        attributes,
        listeners,
        setNodeRef: setSortableRef,
        transition,
        isDragging,
        isOver: isSortableOver,
        active,
        over,
        index
    } = useSortable({
        id: file.id,
        data: file,
        disabled: selectionMode
    });

    // Also use droppable for folder nesting
    // "Bullseye" strategy:
    // If Custom Sort: Inset drop zone to allow edge dragging for reorder.
    // If Other Sort: Full drop zone.
    const { setNodeRef: setDroppableRef, isOver: isFolderOver } = useDroppable({
        id: `folder-nest-${file.id}`,
        disabled: selectionMode || file.type !== 'folder',
        data: { type: 'folder', folderId: file.id }
    });

    // Stable ref to prevent React 19 detach/reattach infinite loop with dnd-kit setState
    const setNodeRef = useStableRef(setSortableRef);

    const style = {
        transition,
        zIndex: isDragging ? 999 : undefined,
    };

    const handleClick = (e: MouseEvent) => {
        if (selectionMode) {
            e.preventDefault();
            onToggleSelect(file.id);
            return;
        }
        if (file.type === 'folder') {
            e.preventDefault();
            onNavigate(file.id);
        }
    };

    // Calculate where the insertion line should be
    // Only show line if we are over the Sortable (outer) but NOT the Nest (inner)
    const showLine = isSortableOver && !isFolderOver && !isDragging && sortOption === "custom";
    let linePosition: 'left' | 'right' | null = null;

    if (showLine && active && over) {
        const activeIndex = active.data.current?.sortable?.index ?? -1;
        const overIndex = over.data.current?.sortable?.index ?? index;

        if (activeIndex !== -1) {
            linePosition = activeIndex > overIndex ? 'left' : 'right';
        } else {
            // If dragging from outside or something
            linePosition = 'left';
        }
    }

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
                    className="h-full touch-none relative"
                >
                    {/* Folder Nesting Bullseye */}
                    {file.type === 'folder' && (
                        <div
                            ref={setDroppableRef}
                            onClick={handleClick}
                            className={cn(
                                "absolute z-30 cursor-pointer",
                                sortOption === "custom" ? "inset-4 rounded-none" : "inset-0 rounded-none"
                            )}
                        />
                    )}

                    {/* Visual line indicator for insertion */}
                    {linePosition === 'left' && (
                        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-primary z-50 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                    )}
                    {linePosition === 'right' && (
                        <div className="absolute -right-3 top-0 bottom-0 w-1 bg-primary z-50 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                    )}

                    <FileCardCardsInner
                        file={file}
                        isSelected={isSelected}
                        isFocused={isFocused}
                        isOver={isFolderOver}
                        selectionMode={selectionMode}
                        onClick={handleClick}
                        linkTo={linkTo}
                        className={cn(
                            isDragging && "opacity-0"
                        )}
                    />
                </div>
            </ContextMenuTrigger>
            <FileContextMenu
                file={file}
                onRename={() => onRename(file)}
                onMove={() => onMove(file)}
                onSelect={() => onToggleSelect(file.id)}
                onColorChange={(color) => onColorChange(file, color)}
            />
        </ContextMenu>
    );
}

function FileCardGrid({ file, onNavigate, selectionMode, isSelected, isFocused, onToggleSelect, onRename, onMove, onColorChange, onMouseEnter, onMouseLeave, sortOption }: FileCardProps) {
    const linkTo = file.type === 'video' || file.type === 'pdf' || file.type === 'audio' || file.type === 'image' ? `/file/${file.id}` : '#';

    // Use sortable for reordering
    const {
        attributes,
        listeners,
        setNodeRef: setSortableRef,
        transition,
        isDragging,
        isOver: isSortableOver,
        active,
        over,
        index
    } = useSortable({
        id: file.id,
        data: file,
        disabled: selectionMode
    });

    // Also use droppable for folder nesting
    const { setNodeRef: setDroppableRef, isOver: isFolderOver } = useDroppable({
        id: `folder-nest-${file.id}`,
        disabled: selectionMode || file.type !== 'folder',
        data: { type: 'folder', folderId: file.id }
    });

    // Stable ref to prevent React 19 detach/reattach infinite loop with dnd-kit setState
    const setNodeRef = useStableRef(setSortableRef);

    const style = {
        transition,
        zIndex: isDragging ? 999 : undefined,
    };

    const handleClick = (e: MouseEvent) => {
        if (selectionMode) {
            e.preventDefault();
            onToggleSelect(file.id);
            return;
        }
        if (file.type === 'folder') {
            e.preventDefault();
            onNavigate(file.id);
        }
    };

    // Calculate where the insertion line should be
    const showLine = isSortableOver && !isFolderOver && !isDragging && sortOption === "custom";
    let linePosition: 'left' | 'right' | null = null;

    if (showLine && active && over) {
        const activeIndex = active.data.current?.sortable?.index ?? -1;
        const overIndex = over.data.current?.sortable?.index ?? index;

        if (activeIndex !== -1) {
            linePosition = activeIndex > overIndex ? 'left' : 'right';
        } else {
            linePosition = 'left';
        }
    }

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
                    className="touch-none relative h-full"
                >
                    {/* Folder Nesting Bullseye */}
                    {file.type === 'folder' && (
                        <div
                            ref={setDroppableRef}
                            onClick={handleClick}
                            className={cn(
                                "absolute z-30 cursor-pointer",
                                sortOption === "custom" ? "inset-3 rounded-none" : "inset-0 rounded-none"
                            )}
                        />
                    )}

                    {/* Visual line indicator for insertion */}
                    {linePosition === 'left' && (
                        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-primary z-50 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                    )}
                    {linePosition === 'right' && (
                        <div className="absolute -right-3 top-0 bottom-0 w-1 bg-primary z-50 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                    )}

                    <FileCardGridInner
                        file={file}
                        isSelected={isSelected}
                        isFocused={isFocused}
                        isOver={isFolderOver}
                        selectionMode={selectionMode}
                        onClick={handleClick}
                        linkTo={linkTo}
                        className={cn(
                            isDragging && "opacity-0"
                        )}
                    />
                </div>
            </ContextMenuTrigger>
            <FileContextMenu
                file={file}
                onRename={() => onRename(file)}
                onMove={() => onMove(file)}
                onSelect={() => onToggleSelect(file.id)}
                onColorChange={(color) => onColorChange(file, color)}
            />
        </ContextMenu>
    );
}

function FileCardList({ file, onNavigate, selectionMode, isSelected, isFocused, onToggleSelect, onRename, onMove, onColorChange, onMouseEnter, onMouseLeave, sortOption }: FileCardProps) {
    const linkTo = file.type === 'video' || file.type === 'pdf' || file.type === 'audio' || file.type === 'image' ? `/file/${file.id}` : '#';

    // Use sortable for reordering
    const {
        attributes,
        listeners,
        setNodeRef: setSortableRef,
        transition,
        isDragging,
        isOver: isSortableOver,
        active,
        over,
        index
    } = useSortable({
        id: file.id,
        data: file,
        disabled: selectionMode
    });

    // Also use droppable for folder nesting
    const { setNodeRef: setDroppableRef, isOver: isFolderOver } = useDroppable({
        id: `folder-nest-${file.id}`,
        disabled: selectionMode || file.type !== 'folder',
        data: { type: 'folder', folderId: file.id }
    });

    // Stable ref to prevent React 19 detach/reattach infinite loop with dnd-kit setState
    const setNodeRef = useStableRef(setSortableRef);

    const style = {
        transition,
        zIndex: isDragging ? 999 : undefined,
    };

    const handleClick = (e: MouseEvent) => {
        if (selectionMode) {
            e.preventDefault();
            onToggleSelect(file.id);
            return;
        }
        if (file.type === 'folder') {
            e.preventDefault();
            onNavigate(file.id);
        }
    };

    // Calculate where the insertion line should be
    const showLine = isSortableOver && !isFolderOver && !isDragging && sortOption === "custom";
    let linePosition: 'top' | 'bottom' | null = null;

    if (showLine && active && over) {
        const activeIndex = active.data.current?.sortable?.index ?? -1;
        const overIndex = over.data.current?.sortable?.index ?? index;

        if (activeIndex !== -1) {
            linePosition = activeIndex > overIndex ? 'top' : 'bottom';
        } else {
            linePosition = 'top';
        }
    }

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
                    className="touch-none relative"
                >
                    {/* Folder Nesting Bullseye */}
                    {file.type === 'folder' && (
                        <div
                            ref={setDroppableRef}
                            onClick={handleClick}
                            className={cn(
                                "absolute z-30 cursor-pointer",
                                sortOption === "custom" ? "inset-y-1 inset-x-4 rounded-md" : "inset-0 rounded-lg"
                            )}
                        />
                    )}

                    {/* Visual line indicator for insertion */}
                    {linePosition === 'top' && (
                        <div className="absolute -top-1 left-0 right-0 h-1 bg-primary z-50 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                    )}
                    {linePosition === 'bottom' && (
                        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary z-50 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                    )}

                    <FileCardListInner
                        file={file}
                        isSelected={isSelected}
                        isFocused={isFocused}
                        isOver={isFolderOver}
                        selectionMode={selectionMode}
                        onClick={handleClick}
                        linkTo={linkTo}
                        className={cn(
                            isDragging && "opacity-0"
                        )}
                    />
                </div>
            </ContextMenuTrigger>
            <FileContextMenu
                file={file}
                onRename={() => onRename(file)}
                onMove={() => onMove(file)}
                onSelect={() => onToggleSelect(file.id)}
                onColorChange={(color) => onColorChange(file, color)}
            />
        </ContextMenu>
    );
}

export interface FileContextMenuProps {
    file: AppFile;
    onRename: () => void;
    onMove: () => void;
    onSelect: () => void;
    onColorChange: (color: string) => void;
}

export function FileContextMenu({ file, onRename, onMove, onSelect, onColorChange }: FileContextMenuProps) {
    const handleDelete = () => {
        useStore.setState(state => ({
            files: state.files.map(f => f.id === file.id ? { ...f, deleted: true } : f)
        }));
    };

    const handleCopyLink = () => {
        const url = file.url || `${window.location.origin}/file/${file.id}`;
        navigator.clipboard.writeText(url);
    };

    const handleOpenLink = () => {
        const url = file.url || `${window.location.origin}/file/${file.id}`;
        window.open(url, '_blank');
    };

    const handleShare = () => {
        const url = file.url || `${window.location.origin}/file/${file.id}`;
        if (navigator.share) {
            navigator.share({
                title: file.name,
                url: url
            }).catch(() => {
                navigator.clipboard.writeText(url);
            });
        } else {
            navigator.clipboard.writeText(url);
        }
    };

    return (
        <ContextMenuContent className="w-56">
            <ContextMenuItem onClick={onSelect} className="gap-2">
                <CheckSquare size={16} /> Select
            </ContextMenuItem>

            <ContextMenuSeparator />
            <ContextMenuLabel>Edit</ContextMenuLabel>

            <ContextMenuItem onClick={onRename} className="gap-2">
                <PencilSimple size={16} /> Edit Title/Desc
            </ContextMenuItem>
            <ContextMenuItem onClick={onMove} className="gap-2">
                <ArrowSquareOut size={16} /> Move to Folder
            </ContextMenuItem>

            <ContextMenuSub>
                <ContextMenuSubTrigger className="gap-2">
                    <Palette size={16} /> Change Color
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-64 p-2">
                    <ColorPicker
                        color={file.color || ""}
                        onChange={onColorChange}
                    />
                </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuItem onClick={handleDelete} className="gap-2 text-destructive focus:text-destructive">
                <Trash size={16} /> Trash
            </ContextMenuItem>

            <ContextMenuSeparator />
            <ContextMenuLabel>Share</ContextMenuLabel>

            {file.type !== 'folder' && (
                <>
                    <ContextMenuItem onClick={handleOpenLink} className="gap-2">
                        <LinkSimple size={16} /> Open Link
                    </ContextMenuItem>
                    <ContextMenuItem onClick={handleCopyLink} className="gap-2">
                        <Copy size={16} /> Copy Link
                    </ContextMenuItem>
                    <ContextMenuItem onClick={handleShare} className="gap-2">
                        <ShareNetwork size={16} /> Share
                    </ContextMenuItem>
                </>
            )}
        </ContextMenuContent>
    );
}

function getFileIcon(type: string) {
    switch (type) {
        case 'folder': return Folder;
        case 'video': return FileVideo;
        case 'pdf': return FilePdf;
        case 'audio': return MusicNote;
        case 'image': return Image;
        default: return FileIcon;
    }
}

function getFileTypeFromUrl(url: string): 'file' | 'folder' | 'video' | 'pdf' | 'audio' | 'image' {
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'video';
    if (/\.(mp4|webm|mov|avi|mkv|m4v)(\?|$)/.test(lower)) return 'video';
    if (/\.(mp3|wav|ogg|flac|m4a)(\?|$)/.test(lower)) return 'audio';
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/.test(lower)) return 'image';
    if (/\.pdf(\?|$)/.test(lower)) return 'pdf';
    // Default to video for streaming URLs (catbox, etc)
    if (lower.includes('catbox') || lower.includes('files.')) return 'video';
    return 'file';
}

function FileThumbnail({ file, iconSize }: { file: AppFile, iconSize: number }) {
    const useMiddleFrameForPreviews = useStore(state => state.useMiddleFrameForPreviews);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [cachedThumbnail, setCachedThumbnail] = useState<string | null>(null);

    // Load cached thumbnail
    useEffect(() => {
        if (file.type !== 'video' || !file.url || getYouTubeId(file.url)) return;

        const loadThumbnail = async () => {
            const key = `${file.url}-0.1-${useMiddleFrameForPreviews ? 'mid' : 'start'}`;
            try {
                const blob = await thumbnailStorage.load(key);
                if (blob) {
                    const objectUrl = URL.createObjectURL(blob);
                    setCachedThumbnail(objectUrl);
                }
            } catch (e) {
                console.error("Failed to load thumbnail", e);
            }
        };
        loadThumbnail();
    }, [file.url, file.type, useMiddleFrameForPreviews]);

    // Cleanup object URL
    useEffect(() => {
        return () => {
            if (cachedThumbnail) {
                URL.revokeObjectURL(cachedThumbnail);
            }
        };
    }, [cachedThumbnail]);

    const Icon = (() => {
        let icon = getFileIcon(file.type);
        if (file.type === 'folder' && file.icon) {
            const customIcon = ICONS.find(i => i.name === file.icon);
            if (customIcon) icon = customIcon.icon;
        }
        return icon;
    })();

    const color = file.type === 'folder' && file.color ? file.color : undefined;

    const [error, setError] = useState(false);

    if (error || !file.url) {
        return React.createElement(Icon, {
            size: iconSize,
            weight: "regular",
            className: "text-muted-foreground group-hover:text-primary transition-colors",
            style: color ? { color } : undefined
        });
    }

    // Check for YouTube first, regardless of file type (handles legacy 'file' type imports)
    const youtubeId = getYouTubeId(file.url);
    if (youtubeId) {
        return (
            <img
                src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                alt={file.name}
                className="w-full h-full object-cover"
                onError={() => setError(true)}
            />
        );
    }

    if (file.type === 'image') {
        return <img src={file.url} alt={file.name} className="w-full h-full object-cover" onError={() => setError(true)} />;
    }

    if (file.type === 'video') {
        if (cachedThumbnail) {
            return (
                <img
                    src={cachedThumbnail}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    onError={() => setCachedThumbnail(null)}
                />
            );
        }

        return (
            <video
                ref={videoRef}
                src={`${file.url}#t=0.1`}
                className="w-full h-full object-cover"
                preload="metadata"
                muted
                playsInline
                crossOrigin="anonymous"
                onError={() => setError(true)}
                onLoadedMetadata={(e: SyntheticEvent<HTMLVideoElement>) => {
                    const video = e.currentTarget;
                    if (useMiddleFrameForPreviews && video.duration && isFinite(video.duration)) {
                        video.currentTime = video.duration / 2;
                    } else {
                        video.currentTime = 0.1;
                    }
                }}
                onSeeked={async (e: SyntheticEvent<HTMLVideoElement>) => {
                    const video = e.currentTarget;
                    const key = `${file.url}-0.1-${useMiddleFrameForPreviews ? 'mid' : 'start'}`;

                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(video, 0, 0);
                            canvas.toBlob(async (blob) => {
                                if (blob) {
                                    await thumbnailStorage.save(key, blob);
                                }
                            }, 'image/jpeg', 0.7);
                        }
                    } catch (err) {
                        console.error("Failed to capture thumbnail", err);
                    }
                }}
            />
        );
    }
    if (file.type === "pdf") {
        return (
            <PdfThumbnail
                url={file.url}
                onError={() => setError(true)}
            />
        );
    }

    return React.createElement(Icon, {
        size: iconSize,
        weight: "regular",
        className: "text-muted-foreground group-hover:text-primary transition-colors"
    });
}

function DroppableBreadcrumb({ id, name, isCurrent, onClick }: { id: string, name: string, isCurrent: boolean, onClick: () => void }) {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        data: { type: 'breadcrumb', id }
    });

    return (
        <BreadcrumbItem ref={setNodeRef}>
            <BreadcrumbLink
                onClick={onClick}
                className={cn(
                    "cursor-pointer transition-colors px-2 py-1 rounded-md",
                    isCurrent ? "text-foreground font-medium" : "hover:text-foreground",
                    isOver && "bg-primary/20 text-primary" // Highlight on drag over
                )}
            >
                {name}
            </BreadcrumbLink>
        </BreadcrumbItem>
    );
}
