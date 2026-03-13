
/**
 * â”€â”€â”€ StorageView.tsx â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    HardDrives, Folder, FileText, Trash,
    MagnifyingGlass, Plus, CaretRight, CheckSquare,
    CaretDown, CaretUp, Clock, Tag,
    SquaresFour, Rows, FolderOpen, ArrowSquareOut, X, Palette,
    Cards
} from "@phosphor-icons/react";
import { type File as AppFile } from "@/types";
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
    useDroppable,
    type DragStartEvent
} from '@dnd-kit/core';
import type { CollisionDetection } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
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
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AnimatePresence, motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { cn, clamp } from "@/lib/utils";
import {
    AddFileDialog,
    NewFolderDialog,
    RenameFileDialog,
    EditFolderDialog
} from "@/components/dialogs/StorageDialogs";
import { MoveFileDialog } from "@/components/dialogs/MoveFileDialog";
import { useKeybind } from "@/hooks/use-keybind";
import {
    FileCardGrid, FileCardList, FileCardCards,
    FileCardGridInner, FileCardListInner, FileCardCardsInner
} from "@/components/storage/FileCards";
import {
    createLocalFileSource,
    getDisplaySourceLabel,
    inferFileTypeFromUrl,
    isLocalFile,
    resolveLocalFileSource,
    saveLocalFileHandle,
    type PickedLocalFile,
} from "@/utils/localFiles";



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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STORE BINDINGS & STATE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

    // Helper: check if folderId is ancestor of targetId
    const appFiles = files as AppFile[];
    const isDescendant = (folderId: string, targetId: string | null): boolean => {
        if (!targetId) return false;
        let current = appFiles.find((f) => f.id === targetId) || null;
        while (current) {
            const parentId = current.parentId;
            if (typeof parentId !== 'string') break;
            if (parentId === folderId) return true;
            const next = appFiles.find((f) => f.id === parentId) || null;
            if (!next) break;
            current = next;
        }
        return false;
    };

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
        const handleTriggerCreateFile = () => {
            setAddFileOpen(true);
        };
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

    const projectFiles = useMemo(() => files.filter(f =>
        f.projectId === activeProjectId &&
        (!activeStorageId || f.storageId === activeStorageId) &&
        f.parentId === currentFolderId &&
        !f.deleted &&
        (normalizedQuery === "" || f.name.toLowerCase().includes(normalizedQuery))
    ), [files, activeProjectId, activeStorageId, currentFolderId, normalizedQuery]);

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

    // Progressive rendering: render in batches to avoid mounting hundreds of cards at once
    const RENDER_BATCH_SIZE = 50;
    const [renderLimit, setRenderLimit] = useState(RENDER_BATCH_SIZE);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Reset render limit when the file list changes (folder navigation, search, etc.)
    useEffect(() => {
        setRenderLimit(RENDER_BATCH_SIZE);
    }, [currentFolderId, normalizedQuery, activeStorageId, sortOption]);

    // Auto-expand when the sentinel element scrolls into view
    useEffect(() => {
        const el = loadMoreRef.current;
        if (!el || renderLimit >= orderedProjectFiles.length) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setRenderLimit(prev => Math.min(prev + RENDER_BATCH_SIZE, orderedProjectFiles.length));
                }
            },
            { rootMargin: '200px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [renderLimit, orderedProjectFiles.length]);

    const visibleFiles = useMemo(
        () => orderedProjectFiles.slice(0, renderLimit),
        [orderedProjectFiles, renderLimit]
    );

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
                newIndex = clamp(currentIndex + direction, 0, orderedProjectFiles.length - 1);
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

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       FILE HANDLERS
       â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    const handleRenameInit = (file: AppFile) => {
        if (file.type === 'folder') {
            setFolderToEdit(file);
            setEditFolderOpen(true);
        } else {
            setFileToRename(file);
            setRenameDialogOpen(true);
        }
    };

    const handleRenameSubmit = (newName: string, newDescription: string, newUrl: string, newColor: string) => {
        if (fileToRename) {
            useStore.setState(state => ({
                files: state.files.map(f => f.id === fileToRename.id ? {
                    ...f,
                    name: newName,
                    description: newDescription,
                    url: isLocalFile(fileToRename) ? fileToRename.url : (newUrl || null),
                    color: newColor || undefined,
                    lastModified: Date.now()
                } : f)
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

    const handleIconChange = (file: AppFile, icon: string) => {
        useStore.setState(state => ({
            files: state.files.map(f => f.id === file.id ? { ...f, icon, lastModified: Date.now() } : f)
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

        const type = inferFileTypeFromUrl(url);
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

    const handleAddLocalFile = async (selection: PickedLocalFile) => {
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

        const bindingId = crypto.randomUUID();
        await saveLocalFileHandle(bindingId, selection.handle);

        const localSource = createLocalFileSource(bindingId, selection.browserFile);
        const newFile: AppFile = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            storageId: targetStorageId,
            parentId: currentFolderId,
            name: selection.browserFile.name,
            url: null,
            sourceKind: 'local',
            localSource,
            type: selection.inferredType,
            order: projectFiles.length,
            created: Date.now(),
            lastModified: Date.now()
        };

        useStore.setState(state => ({ files: [...state.files, newFile] }));

        const resolution = await resolveLocalFileSource(localSource);
        if (resolution.status === 'ready' && resolution.url) {
            useStore.setState((state) => ({
                files: state.files.map((candidate) => (
                    candidate.id === newFile.id
                        ? { ...candidate, url: resolution.url }
                        : candidate
                ))
            }));
        }
    };

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       DRAG-AND-DROP LOGIC
       â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
            const activeFile = files.find(f => f.id === active.id);
            // Prevent moving folder into itself or its descendants
            if (activeFile && activeFile.type === 'folder') {
                if (targetFolderId === activeFile.id) {
                    setActiveId(null);
                    return;
                }
                if (isDescendant(activeFile.id, targetFolderId)) {
                    setActiveId(null);
                    return;
                }
            }
            // Don't move if it's already in that folder
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
        const activeFile = files.find(f => f.id === active.id);
        // Prevent moving folder into itself or its descendants
        if (activeFile && activeFile.type === 'folder') {
            if (targetFolderId === activeFile.id) {
                setActiveId(null);
                return;
            }
            if (isDescendant(activeFile.id, typeof targetFolderId === 'string' ? targetFolderId : null)) {
                setActiveId(null);
                return;
            }
        }
        // Don't move if dropping on itself or same parent
        if (activeFile?.parentId === targetFolderId) {
            setActiveId(null);
            return;
        }

        // Handle nested drop targets
        let overId = over.id;
        let isExplicitFolderDrop = false;
        if (overId.toString().startsWith("folder-nest-")) {
            overId = overId.toString().replace("folder-nest-", "");
            isExplicitFolderDrop = true;
        }
        const overFile = files.find(f => f.id === overId);
        const isTargetFolder = overId === 'root' || (overFile && overFile.type === 'folder');
        const isNestingDrop = isTargetFolder && (isExplicitFolderDrop || overId === 'root' || sortOption !== 'custom');
        if (isNestingDrop) {
            // Prevent moving folder into itself or its descendants
            if (activeFile && activeFile.type === 'folder') {
                if (overId === activeFile.id) {
                    setActiveId(null);
                    return;
                }
                if (isDescendant(activeFile.id, typeof overId === 'string' ? overId : null)) {
                    setActiveId(null);
                    return;
                }
            }
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
    const collisionDetection: CollisionDetection = (args) => {
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

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       JSX RENDER
       â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
                                        {visibleFiles.map((file: AppFile) => (
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
                                                onIconChange={handleIconChange}
                                                onMouseEnter={() => setFocusedId(file.id)}
                                                onMouseLeave={() => setFocusedId(null)}
                                                sortOption={sortOption}
                                            />
                                        ))}
                                    </SortableContext>
                                    {orderedProjectFiles.length === 0 && <EmptyState />}
                                    {renderLimit < orderedProjectFiles.length && <div ref={loadMoreRef} className="h-1" />}
                                </div>
                            ) : viewMode === 'list' ? (
                                <div className="flex flex-col gap-2 pb-10">
                                    <SortableContext
                                        items={orderedProjectFiles.map(f => f.id)}
                                        strategy={verticalListSortingStrategy}
                                        disabled={sortOption !== "custom"}
                                    >
                                        {visibleFiles.map((file: AppFile) => (
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
                                                onIconChange={handleIconChange}
                                                onMouseEnter={() => setFocusedId(file.id)}
                                                onMouseLeave={() => setFocusedId(null)}
                                                sortOption={sortOption}
                                            />
                                        ))}
                                    </SortableContext>
                                    {orderedProjectFiles.length === 0 && <EmptyState />}
                                    {renderLimit < orderedProjectFiles.length && <div ref={loadMoreRef} className="h-1" />}
                                </div>
                            ) : (
                                <SortableContext
                                    items={orderedProjectFiles.map(f => f.id)}
                                    strategy={rectSortingStrategy}
                                    disabled={sortOption !== "custom"}
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-20">
                                        {visibleFiles.map((file: AppFile) => (
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
                                                onIconChange={handleIconChange}
                                                onMouseEnter={() => setFocusedId(file.id)}
                                                onMouseLeave={() => setFocusedId(null)}
                                                sortOption={sortOption}
                                            />
                                        ))}
                                        {orderedProjectFiles.length === 0 && <EmptyState />}
                                        {renderLimit < orderedProjectFiles.length && <div ref={loadMoreRef} className="h-1" />}
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
                onSubmitRemote={handleAddFile}
                onSubmitLocal={handleAddLocalFile}
            />
            <NewFolderDialog
                open={newFolderOpen}
                onOpenChange={setNewFolderOpen}
                onSubmit={handleNewFolder}
            />
            <MoveFileDialog
                open={moveDialogOpen}
                onOpenChange={(open) => {
                    setMoveDialogOpen(open);
                    if (!open && !selectionMode) setSelectedIds(new Set());
                }}
                fileIds={Array.from(selectedIds)}
            />
            <RenameFileDialog
                open={renameDialogOpen}
                onOpenChange={setRenameDialogOpen}
                onSubmit={handleRenameSubmit}
                initialName={fileToRename?.name || ""}
                initialDescription={fileToRename?.description || ""}
                initialUrl={fileToRename?.url || ""}
                initialColor={fileToRename?.color}
                showDescription={fileToRename?.type !== 'folder'}
                isLocalFileSource={Boolean(fileToRename && isLocalFile(fileToRename))}
                localSourceLabel={fileToRename ? getDisplaySourceLabel(fileToRename) : ''}
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SUB-COMPONENTS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function EmptyState() {
    return (
        <div className="col-span-full flex flex-col items-center justify-center p-16 text-muted-foreground border-2 border-dashed border-border rounded-none">
            <Folder size={56} weight="thin" className="mb-3 opacity-40" />
            <p className="font-medium">No files here</p>
            <p className="text-xs mt-1 opacity-70">Click "Add File" to add a web link or local file</p>
        </div>
    );
}
