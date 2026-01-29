import { useState, useEffect, createElement } from "react";
import { useStore } from "@/store/useStore";
import { Link, useSearchParams } from "react-router-dom";
import {
    File as FileIcon,
    Folder,
    FileVideo,
    FilePdf,
    MusicNote,
    Image,
    Plus,
    FolderOpen,
    GridFour,
    Rows,
    PencilSimple,
    Trash,
    ArrowSquareOut,
    CheckSquare,
    Square,
    X,
    MagnifyingGlass,
    HardDrives,
    Palette,
    LinkSimple,
    Copy,
    ShareNetwork,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
    ContextMenuLabel,
} from "@/components/ui/context-menu";
import { AddFileDialog, NewFolderDialog, RenameFileDialog, EditFolderDialog, ICONS } from "@/components/dialogs/StorageDialogs";
import { MoveFileDialog } from "@/components/dialogs/MoveFileDialog";
import { ColorPickerDialog } from "@/components/dialogs/ColorPickerDialog";
import type { File } from "@/types";
import { Input } from "@/components/ui/input";
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { globalWorker } from "@/pdf-worker";
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { playSfx } from '@/utils/sound';



export default function StorageView() {
    const {
        projects,
        activeProjectId,
        files,
        storages,
        activeStorageId,
        trashFile,
        addStorage,
    } = useStore();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [addFileOpen, setAddFileOpen] = useState(false);
    const [newFolderOpen, setNewFolderOpen] = useState(false);
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [fileToRename, setFileToRename] = useState<File | null>(null);
    const [colorPickerDialogOpen, setColorPickerDialogOpen] = useState(false);
    const [fileToColor, setFileToColor] = useState<File | null>(null);
    const [editFolderOpen, setEditFolderOpen] = useState(false);
    const [folderToEdit, setFolderToEdit] = useState<File | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const currentFolderId = searchParams.get('folderId');

    // Selection Mode
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");

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

    const handleRenameInit = (file: File) => {
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

    const handleMoveInit = (file: File) => {
        if (!selectedIds.has(file.id)) {
            setSelectedIds(new Set([file.id]));
        }
        setMoveDialogOpen(true);
    };

    const handleColorInit = (file: File) => {
        setFileToColor(file);
        setColorPickerDialogOpen(true);
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

        const newFolder: File = {
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
        const newFile: File = {
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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const targetFolderId = over.id === 'root' ? null : over.id as string;

        // Don't move if dropping on itself or same parent
        const activeFile = files.find(f => f.id === active.id);
        if (activeFile?.parentId === targetFolderId) return;

        // Verify target is a folder or root, not a file (unless dropping ON a folder in the grid)
        // If dropping on breadcrumb (which we assume over.id is), it's valid if it's a folder or root.
        // We need to differentiate dropping on grid folder vs breadcrumb.
        // Grid folders are just normal IDs. Breadcrumb IDs match folder IDs (except root).

        // Check if dropping onto a folder
        const overFile = files.find(f => f.id === over.id);
        const isTargetFolder = over.id === 'root' || (overFile && overFile.type === 'folder');

        if (isTargetFolder) {
            useStore.setState(state => ({
                files: state.files.map(f =>
                    f.id === active.id
                        ? { ...f, parentId: targetFolderId, lastModified: Date.now() }
                        : f
                )
            }));
        }
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
        })
    );

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
        const allIds = projectFiles.map(f => f.id);
        setSelectedIds(new Set(allIds));
    };

    const deselectAll = () => {
        setSelectedIds(new Set());
    };

    const deleteSelected = () => {
        selectedIds.forEach(id => trashFile(id));
        setSelectedIds(new Set());
        setSelectionMode(false);
    };

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            {showEmptyState ? (
                <div className="flex h-full bg-transparent overflow-hidden">
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <HardDrives size={64} weight="thin" className="mx-auto mb-4 opacity-30" />
                            <p className="mb-4">Select or create a storage</p>
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
                        <div className="flex items-center gap-2 p-2 h-12 border-b border-border bg-card/30">
                            <Breadcrumb className="flex-1 pl-2">
                                <BreadcrumbList>
                                    <DroppableBreadcrumb id="root" name={activeStorage?.name || "All Files"} isCurrent={!currentFolderId} onClick={() => handleNavigateFolder(null)} />

                                    {breadcrumbs.map((folder, index) => (
                                        <div key={folder.id} className="flex items-center">
                                            <BreadcrumbSeparator />
                                            <DroppableBreadcrumb
                                                id={folder.id}
                                                name={folder.name}
                                                isCurrent={index === breadcrumbs.length - 1}
                                                onClick={() => handleNavigateFolder(folder.id)}
                                            />
                                        </div>
                                    ))}
                                </BreadcrumbList>
                            </Breadcrumb>

                            <div className="flex items-center gap-2">
                                <div className="relative w-56">
                                    <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                                    <Input
                                        placeholder="Search in this storage..."
                                        className="pl-8 h-8 text-xs"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Button
                                    variant={selectionMode ? "secondary" : "ghost"}
                                    size="icon"
                                    className="size-8"
                                    title="Selection mode"
                                    onClick={toggleSelectionMode}
                                >
                                    <CheckSquare weight={selectionMode ? "fill" : "regular"} size={16} className={selectionMode ? "text-primary" : ""} />
                                </Button>
                                <Button variant="ghost" size="icon" className="size-8" title="View as grid" onClick={() => setViewMode('grid')}>
                                    <GridFour weight={viewMode === 'grid' ? "fill" : "regular"} size={16} className={viewMode === 'grid' ? "text-primary" : ""} />
                                </Button>
                                <Button variant="ghost" size="icon" className="size-8" title="View as list" onClick={() => setViewMode('list')}>
                                    <Rows weight={viewMode === 'list' ? "fill" : "regular"} size={16} className={viewMode === 'list' ? "text-primary" : ""} />
                                </Button>
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
                                    {projectFiles.map(file => (
                                        <FileCardGrid
                                            key={file.id}
                                            file={file}
                                            onNavigate={handleNavigateFolder}
                                            selectionMode={selectionMode}
                                            isSelected={selectedIds.has(file.id)}
                                            onToggleSelect={toggleSelectItem}
                                            onRename={handleRenameInit}
                                            onMove={handleMoveInit}
                                            onColor={handleColorInit}
                                        />
                                    ))}
                                    {projectFiles.length === 0 && <EmptyState />}
                                </div>
                            ) : (
                                <div className="space-y-1 pb-20">
                                    {projectFiles.map(file => (
                                        <FileCardList
                                            key={file.id}
                                            file={file}
                                            onNavigate={handleNavigateFolder}
                                            selectionMode={selectionMode}
                                            isSelected={selectedIds.has(file.id)}
                                            onToggleSelect={toggleSelectItem}
                                            onRename={handleRenameInit}
                                            onMove={handleMoveInit}
                                            onColor={handleColorInit}
                                        />
                                    ))}
                                    {projectFiles.length === 0 && <EmptyState />}
                                </div>
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
            />
            <EditFolderDialog
                open={editFolderOpen}
                onOpenChange={setEditFolderOpen}
                onSubmit={handleEditFolderSubmit}
                initialName={folderToEdit?.name || ""}
                initialColor={folderToEdit?.color}
                initialIcon={folderToEdit?.icon}
            />
            <ColorPickerDialog
                open={colorPickerDialogOpen}
                onOpenChange={setColorPickerDialogOpen}
                initialColor={fileToColor?.color || "#ffffff"}
                onColorSelect={(color) => {
                    if (fileToColor) {
                        useStore.setState(state => ({
                            files: state.files.map(f => f.id === fileToColor.id ? { ...f, color, lastModified: Date.now() } : f)
                        }));
                    }
                }}
            />

            <DragOverlay>
            </DragOverlay>
        </DndContext>
    );
}

function EmptyState() {
    return (
        <div className="col-span-full flex flex-col items-center justify-center p-16 text-muted-foreground border-2 border-dashed border-border rounded-lg">
            <Folder size={56} weight="thin" className="mb-3 opacity-40" />
            <p className="font-medium">No files here</p>
            <p className="text-xs mt-1 opacity-70">Click "Add File" to add a web link</p>
        </div>
    );
}

interface FileCardProps {
    file: File;
    onNavigate: (id: string) => void;
    selectionMode: boolean;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    onRename: (file: File) => void;
    onMove: (file: File) => void;
    onColor: (file: File) => void;
}

function FileCardGrid({ file, onNavigate, selectionMode, isSelected, onToggleSelect, onRename, onMove, onColor }: FileCardProps) {
    const Icon = getFileIcon(file.type);
    const linkTo = file.type === 'video' || file.type === 'pdf' ? `/file/${file.id}` : '#';

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: file.id,
        data: file,
        disabled: selectionMode,
    });

    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: file.id,
        disabled: file.type !== 'folder' || selectionMode,
        data: file
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
        opacity: isDragging ? 0.5 : 1
    } : undefined;

    const handleClick = (e: React.MouseEvent) => {
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

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild disabled={selectionMode}>
                <div ref={setNodeRef} style={style} {...(selectionMode ? {} : listeners)} {...(selectionMode ? {} : attributes)}>
                    <div
                        ref={setDroppableRef}
                        onClick={handleClick}
                        data-sound-cursor
                        className={cn(
                            "flex flex-col gap-2 p-3 rounded-lg border border-border bg-card hover:bg-accent/30 hover:border-primary/50 transition-all duration-200 aspect-[4/3] relative group hover:shadow-lg hover:shadow-primary/5 cursor-pointer select-none",
                            isOver && "ring-2 ring-primary bg-primary/10",
                            isSelected && "ring-2 ring-primary bg-primary/10 border-primary"
                        )}
                        style={file.color ? { borderColor: file.color, boxShadow: `0 0 10px ${file.color}20` } : undefined}
                    >
                        {/* Selection checkbox */}
                        {selectionMode && (
                            <div className="absolute top-2 left-2 z-10">
                                {isSelected ? (
                                    <CheckSquare weight="fill" size={20} className="text-primary" />
                                ) : (
                                    <Square weight="regular" size={20} className="text-muted-foreground" />
                                )}
                            </div>
                        )}

                        {!selectionMode && (file.type === 'video' || file.type === 'pdf') ? (
                            <Link to={linkTo} className="absolute inset-0 z-0" onClick={e => { e.stopPropagation(); playSfx('cursor'); }} />
                        ) : null}

                        <div className="flex-1 flex items-center justify-center overflow-hidden w-full h-full pointer-events-none">
                            <FileThumbnail file={file} iconSize={44} />
                        </div>
                        <div className="text-xs font-medium truncate px-1 text-center pointer-events-none">{file.name}</div>
                    </div>
                </div>
            </ContextMenuTrigger>
            <FileContextMenu 
                file={file} 
                onRename={() => onRename(file)}
                onMove={() => onMove(file)}
                onSelect={() => onToggleSelect(file.id)}
                onColor={() => onColor(file)}
            />
        </ContextMenu>
    );
}

function FileCardList({ file, onNavigate, selectionMode, isSelected, onToggleSelect, onRename, onMove, onColor }: FileCardProps) {
    const linkTo = file.type === 'video' || file.type === 'pdf' ? `/file/${file.id}` : '#';
    const dateStr = new Date(file.created).toLocaleDateString();
    const typeLabel = file.type.toUpperCase();

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: file.id,
        data: file,
        disabled: selectionMode,
    });

    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: file.id,
        disabled: file.type !== 'folder' || selectionMode,
        data: file
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
        opacity: isDragging ? 0.5 : 1
    } : undefined;

    const handleClick = (e: React.MouseEvent) => {
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

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild disabled={selectionMode}>
                <div ref={setNodeRef} style={style} {...(selectionMode ? {} : listeners)} {...(selectionMode ? {} : attributes)}>
                    <div
                        ref={setDroppableRef}
                        onClick={handleClick}
                        data-sound-cursor
                        className={cn(
                            "flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent/20 hover:border-primary/40 transition-all group hover:shadow-md cursor-pointer select-none relative",
                            isOver && "ring-2 ring-primary bg-primary/10",
                            isSelected && "ring-2 ring-primary bg-primary/10 border-primary"
                        )}
                        style={file.color ? { borderColor: file.color, boxShadow: `0 0 10px ${file.color}20` } : undefined}
                    >
                        {/* Selection checkbox */}
                        {selectionMode && (
                            <div className="mr-2">
                                {isSelected ? (
                                    <CheckSquare weight="fill" size={20} className="text-primary" />
                                ) : (
                                    <Square weight="regular" size={20} className="text-muted-foreground" />
                                )}
                            </div>
                        )}

                        {!selectionMode && (file.type === 'video' || file.type === 'pdf') ? (
                            <Link to={linkTo} className="absolute inset-0 z-0" onClick={e => { e.stopPropagation(); playSfx('cursor'); }} />
                        ) : null}

                        {/* Thumbnail */}
                        <div className="w-16 h-12 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden pointer-events-none">
                            <FileThumbnail file={file} iconSize={28} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pointer-events-none">
                            <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">{file.name}</div>
                            {file.description && <div className="text-xs text-muted-foreground/70 truncate">{file.description}</div>}
                        </div>

                        {/* Type Badge */}
                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-primary/20 text-primary rounded-full pointer-events-none">
                            {typeLabel}
                        </div>

                        {/* Date */}
                        <div className="text-xs text-muted-foreground/60 w-24 text-right shrink-0 pointer-events-none">
                            {dateStr}
                        </div>
                    </div>
                </div>
            </ContextMenuTrigger>
            <FileContextMenu 
                file={file} 
                onRename={() => onRename(file)}
                onMove={() => onMove(file)}
                onSelect={() => onToggleSelect(file.id)}
                onColor={() => onColor(file)}
            />
        </ContextMenu>
    );
}

export interface FileContextMenuProps {
    file: File;
    onRename: () => void;
    onMove: () => void;
    onSelect: () => void;
    onColor: () => void;
}

export function FileContextMenu({ file, onRename, onMove, onSelect, onColor }: FileContextMenuProps) {
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
            <ContextMenuItem onClick={onColor} className="gap-2">
                <Palette size={16} /> Change Color
            </ContextMenuItem>
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
    if (/\.(mp4|webm|mov|avi|mkv|m4v)(\?|$)/.test(lower)) return 'video';
    if (/\.(mp3|wav|ogg|flac|m4a)(\?|$)/.test(lower)) return 'audio';
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/.test(lower)) return 'image';
    if (/\.pdf(\?|$)/.test(lower)) return 'pdf';
    // Default to video for streaming URLs (catbox, etc)
    if (lower.includes('catbox') || lower.includes('files.')) return 'video';
    return 'file';
}

function FileThumbnail({ file, iconSize }: { file: File, iconSize: number }) {
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
        return createElement(Icon, {
            size: iconSize,
            weight: "regular",
            className: "text-muted-foreground group-hover:text-primary transition-colors",
            style: color ? { color } : undefined
        });
    }

    if (file.type === 'image') {
        return <img src={file.url} alt={file.name} className="w-full h-full object-cover" onError={() => setError(true)} />;
    }

    if (file.type === 'video') {
        return (
            <video
                src={`${file.url}#t=0.1`}
                className="w-full h-full object-cover"
                preload="metadata"
                muted
                playsInline
                onError={() => setError(true)}
                onLoadedMetadata={(e) => {
                    e.currentTarget.currentTime = 0.1;
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

    return createElement(Icon, {
        size: iconSize,
        weight: "regular",
        className: "text-muted-foreground group-hover:text-primary transition-colors"
    });
}

function PdfThumbnail({ url, onError }: { url: string; onError: () => void }) {
    const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
    const [safeUrl, setSafeUrl] = useState<string | null>(null);

    useEffect(() => {
        setLoadedUrl(null);
        // Debounce the PDF loading to prevent worker termination race conditions
        // when scrolling quickly through files
        const timer = setTimeout(() => {
            setSafeUrl(url);
        }, 500); 
        return () => {
            clearTimeout(timer);
            setSafeUrl(null);
        };
    }, [url]);

    if (!safeUrl) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="text-xs text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex items-center justify-center bg-muted overflow-hidden">
            <ErrorBoundary fallback={
                <div className="flex flex-col items-center justify-center text-xs text-red-400 p-2 text-center">
                    <span>Preview Error</span>
                </div>
            }>
                <Document
                    file={safeUrl}
                    loading={
                        <div className="text-xs text-muted-foreground">
                            Loading PDF...
                        </div>
                    }
                    onLoadSuccess={() => setLoadedUrl(safeUrl)}
                    onLoadError={(error) => {
                        // Ignore worker termination errors which happen during rapid scrolling
                        if (error.message.includes('Worker was terminated')) {
                            return;
                        }
                        console.error('Thumbnail Load Error:', error);
                        onError();
                    }}
                    options={{
                        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                        cMapPacked: true,
                        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
                        verbosity: 0,
                        stopAtErrors: false,
                        pdfBug: false,
                    }}
                >
                    {loadedUrl === safeUrl && (
                        <Page
                            pageNumber={1}
                            width={160}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            onRenderError={() => onError()}
                            onGetTextError={(e) => { if (!e.message?.includes('terminated')) onError() }}
                            onGetAnnotationsError={(e) => { if (!e.message?.includes('terminated')) onError() }}
                            onGetStructTreeError={(e) => { if (!e.message?.includes('terminated')) onError() }}
                        />
                    )}
                </Document>
            </ErrorBoundary>
        </div>
    );
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
