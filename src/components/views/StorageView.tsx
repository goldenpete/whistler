import { useState } from "react";
import { useStore } from "@/store/useStore";
import { Link } from "react-router-dom";
import {
    File as FileIcon,
    Folder,
    FilmStrip,
    FilePdf,
    MusicNote,
    Image,
    List,
    Plus,
    FolderOpen,
    GridFour,
    Rows,
    HardDrives,
    PencilSimple,
    Trash,
    Copy,
    Share,
    ArrowSquareOut
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
} from "@/components/ui/context-menu";
import { AddFileDialog, NewFolderDialog } from "@/components/dialogs/StorageDialogs";
import type { File } from "@/types";
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';

export default function StorageView() {
    const {
        projects,
        activeProjectId,
        files,
        storages,
        activeStorageId
    } = useStore();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [addFileOpen, setAddFileOpen] = useState(false);
    const [newFolderOpen, setNewFolderOpen] = useState(false);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    const activeProject = projects.find(p => p.id === activeProjectId);
    const projectStorages = storages.filter(s => s.projectId === activeProjectId && !s.deleted);
    const activeStorage = storages.find(s => s.id === activeStorageId);

    // Get current folder logic
    const currentFolder = currentFolderId ? files.find(f => f.id === currentFolderId) : null;

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

    const projectFiles = files.filter(f =>
        f.projectId === activeProjectId &&
        (!activeStorageId || f.storageId === activeStorageId) &&
        f.parentId === currentFolderId &&
        !f.deleted
    );

    const handleCreateStorage = () => {
        // TODO: Replace with Shadcn dialog
        const name = prompt("New storage name:");
        if (name && activeProjectId) {
            const newStorage = {
                id: crypto.randomUUID(),
                projectId: activeProjectId,
                name,
                created: Date.now(),
                lastModified: Date.now()
            };
            useStore.setState(state => ({
                storages: [...state.storages, newStorage],
                activeStorageId: newStorage.id
            }));
        }
    };

    const handleSelectStorage = (id: string | null) => {
        useStore.setState({ activeStorageId: id });
        setCurrentFolderId(null); // Reset folder when changing storage
        setSidebarOpen(false);
    };

    const handleNewFolder = (name: string) => {
        if (!activeProjectId) return;
        const newFolder: File = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            storageId: activeStorageId || 'default',
            parentId: currentFolderId,
            name,
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
        const type = getFileTypeFromUrl(url);
        const newFile: File = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            storageId: activeStorageId || 'default',
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

        const overFile = files.find(f => f.id === over.id);
        if (overFile && overFile.type === 'folder') {
            useStore.setState(state => ({
                files: state.files.map(f =>
                    f.id === active.id
                        ? { ...f, parentId: over.id as string, lastModified: Date.now() }
                        : f
                )
            }));
        }
    };

    const handleNavigateFolder = (folderId: string) => {
        setCurrentFolderId(folderId);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex h-full bg-background text-foreground relative">
                {/* Sliding Storage Sidebar */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSidebarOpen(false)}
                                className="fixed inset-0 bg-black/50 z-30"
                            />
                            <motion.div
                                initial={{ x: -280 }}
                                animate={{ x: 0 }}
                                exit={{ x: -280 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="fixed left-0 top-0 h-full w-72 bg-card border-r border-border z-40 flex flex-col shadow-xl"
                            >
                                <div className="flex items-center justify-between p-4 border-b border-border/50">
                                    <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <HardDrives weight="bold" className="text-primary" />
                                        Storages
                                    </h2>
                                    <Button variant="ghost" size="icon" onClick={handleCreateStorage} className="size-7">
                                        <Plus weight="bold" />
                                    </Button>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-2 space-y-1">
                                        <button
                                            onClick={() => handleSelectStorage(null)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors",
                                                !activeStorageId
                                                    ? "bg-primary/20 text-primary font-medium"
                                                    : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <FolderOpen weight={!activeStorageId ? "fill" : "regular"} className="text-lg shrink-0" />
                                            <span>All Files</span>
                                        </button>

                                        {projectStorages.map(storage => (
                                            <button
                                                key={storage.id}
                                                onClick={() => handleSelectStorage(storage.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors group",
                                                    activeStorageId === storage.id
                                                        ? "bg-primary/20 text-primary font-medium"
                                                        : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                <Folder weight={activeStorageId === storage.id ? "fill" : "regular"} className="text-lg shrink-0 text-orange-500" />
                                                <span className="truncate flex-1">{storage.name}</span>
                                            </button>
                                        ))}

                                        {projectStorages.length === 0 && (
                                            <div className="p-4 text-center text-xs text-muted-foreground/60 italic border-2 border-dashed border-border/30 rounded-md m-2">
                                                No storages created yet
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                    {/* Header / Top Bar */}
                    <div className="flex items-center gap-2 p-2 h-12 border-b border-border bg-card/30">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(true)}
                            className="size-8 shrink-0"
                        >
                            <List weight="bold" size={18} />
                        </Button>

                        <Breadcrumb className="flex-1">
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink
                                        onClick={() => setCurrentFolderId(null)}
                                        className="cursor-pointer hover:text-foreground transition-colors"
                                    >
                                        {activeStorage?.name || "All Files"}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>

                                {breadcrumbs.map((folder, index) => (
                                    <div key={folder.id} className="flex items-center">
                                        <BreadcrumbSeparator />
                                        <BreadcrumbItem>
                                            <BreadcrumbLink
                                                onClick={() => setCurrentFolderId(folder.id)}
                                                className={cn(
                                                    "cursor-pointer hover:text-foreground transition-colors",
                                                    index === breadcrumbs.length - 1 && "text-foreground font-medium"
                                                )}
                                            >
                                                {folder.name}
                                            </BreadcrumbLink>
                                        </BreadcrumbItem>
                                    </div>
                                ))}
                            </BreadcrumbList>
                        </Breadcrumb>

                        <div className="flex items-center gap-1">
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

                    {/* File Grid/List */}
                    <div className="flex-1 overflow-auto p-4">
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 pb-20">
                                {projectFiles.map(file => (
                                    <FileCardGrid key={file.id} file={file} onNavigate={handleNavigateFolder} />
                                ))}
                                {projectFiles.length === 0 && <EmptyState />}
                            </div>
                        ) : (
                            <div className="space-y-1 pb-20">
                                {projectFiles.map(file => (
                                    <FileCardList key={file.id} file={file} onNavigate={handleNavigateFolder} />
                                ))}
                                {projectFiles.length === 0 && <EmptyState />}
                            </div>
                        )}
                    </div>
                </div>

                {/* Dialogs */}
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

                <DragOverlay>
                    {/* Optional: Add drag preview if needed */}
                </DragOverlay>
            </div>
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

function FileCardGrid({ file, onNavigate }: { file: File, onNavigate: (id: string) => void }) {
    const Icon = getFileIcon(file.type);
    const linkTo = file.type === 'video' || file.type === 'pdf' ? `/file/${file.id}` : '#';

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: file.id,
        data: file
    });

    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: file.id,
        disabled: file.type !== 'folder',
        data: file
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
        opacity: isDragging ? 0.5 : 1
    } : undefined;

    const handleClick = (e: React.MouseEvent) => {
        if (file.type === 'folder') {
            e.preventDefault();
            onNavigate(file.id);
        }
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
                    <div
                        ref={setDroppableRef}
                        onClick={handleClick}
                        className={cn(
                            "flex flex-col gap-2 p-3 rounded-lg border border-border bg-card hover:bg-accent/30 hover:border-primary/50 transition-all duration-200 aspect-[4/3] relative group hover:shadow-lg hover:shadow-primary/5 cursor-pointer select-none",
                            isOver && "ring-2 ring-primary bg-primary/10"
                        )}
                    >
                        {file.type === 'video' || file.type === 'pdf' ? (
                            <Link to={linkTo} className="absolute inset-0 z-0" onClick={e => e.stopPropagation()} />
                        ) : null}

                        <div className="flex-1 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors pointer-events-none">
                            <Icon size={44} weight="light" />
                        </div>
                        <div className="text-xs font-medium truncate px-1 text-center pointer-events-none">{file.name}</div>
                    </div>
                </div>
            </ContextMenuTrigger>
            <FileContextMenu file={file} />
        </ContextMenu>
    );
}

function FileCardList({ file, onNavigate }: { file: File, onNavigate: (id: string) => void }) {
    const Icon = getFileIcon(file.type);
    const linkTo = file.type === 'video' || file.type === 'pdf' ? `/file/${file.id}` : '#';
    const dateStr = new Date(file.created).toLocaleDateString();
    const typeLabel = file.type.toUpperCase();

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: file.id,
        data: file
    });

    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: file.id,
        disabled: file.type !== 'folder',
        data: file
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
        opacity: isDragging ? 0.5 : 1
    } : undefined;

    const handleClick = (e: React.MouseEvent) => {
        if (file.type === 'folder') {
            e.preventDefault();
            onNavigate(file.id);
        }
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
                    <div
                        ref={setDroppableRef}
                        onClick={handleClick}
                        className={cn(
                            "flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent/20 hover:border-primary/40 transition-all group hover:shadow-md cursor-pointer select-none relative",
                            isOver && "ring-2 ring-primary bg-primary/10"
                        )}
                    >
                        {file.type === 'video' || file.type === 'pdf' ? (
                            <Link to={linkTo} className="absolute inset-0 z-0" onClick={e => e.stopPropagation()} />
                        ) : null}

                        {/* Thumbnail */}
                        <div className="w-16 h-12 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden pointer-events-none">
                            {file.url && (file.type === 'video' || file.type === 'image') ? (
                                <img src={file.url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <Icon size={28} weight="light" className="text-muted-foreground" />
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pointer-events-none">
                            <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">{file.name}</div>
                            <div className="text-xs text-muted-foreground/70 truncate">No description</div>
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
            <FileContextMenu file={file} />
        </ContextMenu>
    );
}

function FileContextMenu({ file }: { file: File }) {
    const handleRename = () => {
        const newName = prompt("Rename file:", file.name);
        if (newName) {
            useStore.setState(state => ({
                files: state.files.map(f => f.id === file.id ? { ...f, name: newName, lastModified: Date.now() } : f)
            }));
        }
    };

    const handleDelete = () => {
        useStore.setState(state => ({
            files: state.files.map(f => f.id === file.id ? { ...f, deleted: true } : f)
        }));
    };

    const handleCopyUrl = () => {
        if (file.url) navigator.clipboard.writeText(file.url);
    };

    return (
        <ContextMenuContent className="w-48">
            <ContextMenuItem onClick={handleRename} className="gap-2">
                <PencilSimple size={16} /> Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCopyUrl} className="gap-2">
                <Copy size={16} /> Copy URL
            </ContextMenuItem>
            <ContextMenuItem className="gap-2">
                <Share size={16} /> Share
            </ContextMenuItem>
            <ContextMenuItem className="gap-2">
                <ArrowSquareOut size={16} /> Open in New Tab
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleDelete} className="gap-2 text-destructive focus:text-destructive">
                <Trash size={16} /> Delete
            </ContextMenuItem>
        </ContextMenuContent>
    );
}

function getFileIcon(type: string) {
    switch (type) {
        case 'folder': return Folder;
        case 'video': return FilmStrip;
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
