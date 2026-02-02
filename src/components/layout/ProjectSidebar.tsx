import { formatDistanceToNow } from "date-fns";
import React, { useState, useEffect } from "react";
import type { MouseEvent as ReactMouseEvent, ChangeEvent as ReactChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    SidebarSimple,
    HardDrives,
    NotePencil,
    Graph,
    FolderOpen,
    Folder,
    FolderPlus,
    Plus,
    Trash,
    MagnifyingGlass,
    ArrowsClockwise,
    WaveSine,
    PencilSimple,
    CaretDown,
    CaretLeft,
    CaretRight,
    Cloud,
    Star, Heart, Flag, Tag, Bookmark, Briefcase, House, User, Users,
    Planet, Rocket, Code, Cpu, Database, GameController, MusicNotes, Image,
    FilmStrip, FileText, Book, Gear, Share,
    CheckCircle, WarningCircle, CloudCheck, CloudWarning
} from "@phosphor-icons/react";
import {
    DndContext, 
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";
import { ambientMusicStorage, useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import type { Collection, Storage, AccentTheme, BaseTheme, Doc, Graph as GraphType, Project } from "@/types";
import { getIcon } from "@/utils/iconMap";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CreateCollectionDialog, EditCollectionDialog } from "@/components/dialogs/CollectionDialogs";
import { CreateStorageDialog, EditStorageDialog, EditGraphDialog, EditDocDialog } from "@/components/dialogs/StorageDialogs";
import { NewDocDialog, NewGraphDialog } from "@/components/dialogs/CreationDialogs";
import { EditProjectDialog } from "@/components/dialogs/EditProjectDialog";
import { ColorPickerDialog } from "@/components/dialogs/ColorPickerDialog";
import { SidebarHistory } from "@/components/layout/SidebarHistory";
import { SidebarTrash } from "@/components/layout/SidebarTrash";
import { SidebarSync } from "@/components/layout/SidebarSync";
import { PiPPlayer } from "@/components/player/PiPPlayer";
import { exportProject, importProject, type ProjectExportData } from "@/utils/projectData";
import { UploadSimple, DownloadSimple, ClockCounterClockwise } from "@phosphor-icons/react";
import whistlerLogoOrange from "../../../whistlerlogo.png";
import whistlerLogoEmerald from "../../../whistlerlogo-emerald.png";
import whistlerLogoSky from "../../../whistlerlogo-sky.png";
import whistlerLogoViolet from "../../../whistlerlogo-violet.png";

const LOGO_MAP: Record<AccentTheme, string> = {
    orange: whistlerLogoOrange,
    emerald: whistlerLogoEmerald,
    sky: whistlerLogoSky,
    violet: whistlerLogoViolet,
};

const ACCENT_OPTIONS: { id: AccentTheme; label: string; previewClass: string }[] = [
    { id: "orange", label: "Orange", previewClass: "bg-orange-500" },
    { id: "emerald", label: "Emerald", previewClass: "bg-emerald-500" },
    { id: "violet", label: "Violet", previewClass: "bg-violet-500" },
    { id: "sky", label: "Sky", previewClass: "bg-sky-500" },
];

const BASE_OPTIONS: { id: BaseTheme; label: string; previewClass: string }[] = [
    { id: "neutral", label: "Neutral", previewClass: "bg-neutral-700" },
    { id: "stone", label: "Stone", previewClass: "bg-stone-700" },
    { id: "zinc", label: "Zinc", previewClass: "bg-zinc-700" },
    { id: "gray", label: "Gray", previewClass: "bg-gray-700" },
];

const DEFAULT_COLOR_ENTITIES: { key: 'file' | 'collection' | 'storage' | 'graph' | 'node'; label: string }[] = [
    { key: 'file', label: 'Files' },
    { key: 'collection', label: 'Collections' },
    { key: 'storage', label: 'Storage' },
    { key: 'graph', label: 'Graphs' },
    { key: 'node', label: 'Nodes' },
];

function SortableCollectionItem({
    collection,
    location,
    isSlim,
    handleSelectCollection,
    handleEditCollectionClick,
    handleDeleteCollection,
    setCollectionToEdit,
    setEditCollectionOpen,
    trashCollection,
    createMenuContent
}: any) {
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

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <ContextMenu>
                <ContextMenuTrigger className="block w-full">
                    <Link
                        to={`/collection/${collection.id}`}
                        onClick={() => handleSelectCollection(collection.id)}
                        className="block w-full group/item"
                        title={isSlim ? collection.name : undefined}
                    >
                        <div className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative",
                            (location.pathname === `/collection/${collection.id}`)
                                ? "bg-primary/20 text-primary font-medium"
                                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                            isSlim && "justify-center px-1"
                        )}>
                            <Icon
                                className={cn("text-lg transition-colors")}
                                weight="fill"
                                style={{ color: (location.pathname === `/collection/${collection.id}`) ? undefined : collection.color }}
                            />
                            {!isSlim && <span className="truncate flex-1">{collection.name}</span>}

                            {!isSlim && (
                                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e: ReactMouseEvent) => handleEditCollectionClick(e, collection)}
                                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                    >
                                        <PencilSimple weight="bold" />
                                    </button>
                                    <button
                                        onClick={(e: ReactMouseEvent) => handleDeleteCollection(e, collection.id)}
                                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash weight="bold" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </Link>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                    {createMenuContent}
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={(e: ReactMouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCollectionToEdit(collection);
                        setEditCollectionOpen(true);
                    }}>
                        <PencilSimple className="mr-2 h-4 w-4" />
                        Rename Collection
                    </ContextMenuItem>
                    <ContextMenuItem onClick={(e: ReactMouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        trashCollection(collection.id);
                    }} className="text-red-500 focus:text-red-500">
                        <Trash className="mr-2 h-4 w-4" />
                        Delete Collection
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        </div>
    );
}

export default function ProjectSidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        projects,
        activeCollectionId,
        activeProjectId,
        collections,
        storages,
        activeStorageId,
        docs,
        activeDocId,
        graphs,
        activeGraphId,
        addProject,
        addStorage,
        updateStorage,
        deleteStorage,
        setActiveProject,
        updateCollection,
        updateGraph,
        trashGraph,
        updateDoc,
        trashDoc,
        updateProject,
        deleteProject,
        trashCollection,
        pipFileId,
        isPipOpen,
        isSidebarCollapsed,
        toggleSidebarCollapse,
        sidebarMode,
        setSidebarMode,
        syncStatus,
        sidebarView,
        setSidebarView,
        accentTheme,
        setAccentTheme,
        baseTheme,
        setBaseTheme,
        enableDefaultColorControls,
        defaultColors,
        setEnableDefaultColorControls,
        setDefaultColor,
        backgroundImageUrl,
        backgroundImageOpacity,
        backgroundColor,
        backgroundOverlayOpacity,
        setBackgroundImageUrl,
        setBackgroundImageOpacity,
        setBackgroundColor,
        setBackgroundOverlayOpacity,
        ambientMusicUrl,
        ambientMusicVolume,
        setAmbientMusicUrl,
        setAmbientMusicVolume,
        setAmbientMusicStorageKey,
        sfxEnabled,
        setSfxEnabled,
        enabledSounds,
        toggleSound,
        windowOutlineEnabled,
        setWindowOutlineEnabled,
        muteNewVideosUntilUnmuted,
        rememberMediaVolume,
        disableMediaAutoplay,
        setMuteNewVideosUntilUnmuted,
        setRememberMediaVolume,
        setDisableMediaAutoplay,
        clearMediaVolumes,
    } = useStore();

    const activeCollection = collections.find((c: Collection) => c.id === activeCollectionId);

    // Slim mode is active when sidebar is collapsed and mode is set to 'slim'
    const isSlim = isSidebarCollapsed && sidebarMode === 'slim';

    const [projectsOpen, setProjectsOpen] = useState(true);
    const [assetsOpen, setAssetsOpen] = useState(true);
    const [createCollectionOpen, setCreateCollectionOpen] = useState(false);
    const [createStorageOpen, setCreateStorageOpen] = useState(false);
    // Edit State
    const [editCollectionOpen, setEditCollectionOpen] = useState(false);
    const [collectionToEdit, setCollectionToEdit] = useState<Collection | null>(null);
    const [editStorageOpen, setEditStorageOpen] = useState(false);
    const [storageToEdit, setStorageToEdit] = useState<Storage | null>(null);
    const [editGraphOpen, setEditGraphOpen] = useState(false);
    const [graphToEdit, setGraphToEdit] = useState<any | null>(null);
    const [renameDocOpen, setRenameDocOpen] = useState(false);
    const [docToRename, setDocToRename] = useState<any | null>(null);
    const [editProjectOpen, setEditProjectOpen] = useState(false);
    const [newDocOpen, setNewDocOpen] = useState(false);
    const [newGraphOpen, setNewGraphOpen] = useState(false);
    const [newProjectOpen, setNewProjectOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [accentDialogOpen, setAccentDialogOpen] = useState(false);
    const [defaultColorDialogOpen, setDefaultColorDialogOpen] = useState(false);
    const [activeDefaultColorEntity, setActiveDefaultColorEntity] = useState<'file' | 'collection' | 'storage' | 'graph' | 'node' | null>(null);
    const [appearanceTab, setAppearanceTab] = useState<'appearance' | 'music' | 'reset'>('appearance');
    const [disableRememberVolumeOpen, setDisableRememberVolumeOpen] = useState(false);

    const handleResetForUpdates = async () => {
        if ("caches" in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((name) => caches.delete(name)));
        }
        window.location.reload();
    };

    const handleResetAllData = async () => {
        localStorage.clear();
        sessionStorage.clear();
        indexedDB.deleteDatabase("whistler_media");
        window.location.reload();
    };

    const handleRememberVolumeToggle = () => {
        if (rememberMediaVolume) {
            setDisableRememberVolumeOpen(true);
            return;
        }
        setRememberMediaVolume(true);
    };

    const handleEditGraph = (e: ReactMouseEvent, graph: any) => {
        e.stopPropagation();
        setGraphToEdit(graph);
        setEditGraphOpen(true);
    };

    const handleDeleteGraph = (e: ReactMouseEvent, id: string) => {
        e.stopPropagation();
        trashGraph(id);
    };

    const handleRenameDoc = (e: ReactMouseEvent, doc: any) => {
        e.stopPropagation();
        setDocToRename(doc);
        setRenameDocOpen(true);
    };

    const handleDeleteDoc = (e: ReactMouseEvent, id: string) => {
        e.stopPropagation();
        trashDoc(id);
    };

    const projectStorages = storages.filter((s: Storage) => s.projectId === activeProjectId && !s.deleted);
    const projectDocs = docs.filter((d: Doc) => d.projectId === activeProjectId && !d.deleted);
    const projectGraphs = graphs.filter((g: GraphType) => g.projectId === activeProjectId && !g.deleted);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !activeProjectId) return;

        const projectCollections = collections.filter((c: Collection) => c.projectId === activeProjectId && !c.deleted);
        const oldIndex = projectCollections.findIndex((c: Collection) => c.id === active.id);
        const newIndex = projectCollections.findIndex((c: Collection) => c.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(projectCollections, oldIndex, newIndex);
        const otherCollections = collections.filter((c: Collection) => !(c.projectId === activeProjectId && !c.deleted));
        useStore.setState({ collections: [...otherCollections, ...reordered] });
    };

    const handleCreateStorage = () => {
        if (!activeProjectId) return;
        setCreateStorageOpen(true);
    };

    const handleCreateStorageSubmit = (name: string, color: string, icon: string) => {
        if (activeProjectId) {
            addStorage(name, activeProjectId, color, icon);
        }
    };

    const handleEditStorageClick = (e: ReactMouseEvent, storage: Storage) => {
        e.preventDefault();
        e.stopPropagation();
        setStorageToEdit(storage);
        setEditStorageOpen(true);
    };

    const handleUpdateStorage = (name: string, color: string, icon: string) => {
        if (storageToEdit) {
            updateStorage(storageToEdit.id, { name, color, icon });
        }
    };

    const handleDeleteStorage = (e: ReactMouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        deleteStorage(id);
    };

    const handleAmbientMusicUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            await ambientMusicStorage.save(file);
            const url = URL.createObjectURL(file);
            setAmbientMusicUrl(url);
            setAmbientMusicStorageKey(ambientMusicStorage.key);
        };
        input.click();
    };

    const handleRemoveAmbientMusic = async () => {
        await ambientMusicStorage.clear();
        setAmbientMusicUrl(null);
        setAmbientMusicStorageKey(null);
    };

    const handleUpdateGraph = (name: string, color: string, icon: string) => {
        if (graphToEdit) {
            updateGraph(graphToEdit.id, { name, color, icon });
        }
    };

    const handleUpdateDoc = (name: string, color: string, icon: string) => {
        if (docToRename) {
            updateDoc(docToRename.id, { name, color, icon });
        }
    };

    const handleEditProjectName = () => {
        if (!activeProjectId) return;
        setEditProjectOpen(true);
    };

    const handleCreateProjectSubmit = () => {
        const name = newProjectName.trim();
        if (!name) return;
        
        // Optimistically create
        useStore.getState().addProject(name);
        
        // We'll just close the dialog. The user can switch to the new project from the dropdown.
        setNewProjectOpen(false);
        setNewProjectName("");
    };

    const handleExportProject = () => {
        if (!activeProjectId) return;
        const data = exportProject(useStore.getState(), activeProjectId);
        if (data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const project = projects.find((p: Project) => p.id === activeProjectId);
            a.download = `whistler_export_${project?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'project'}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    const handleImportProject = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const text = await file.text();
            try {
                const data = JSON.parse(text) as ProjectExportData;
                if (!data.version || !data.project) throw new Error("Invalid project file");

                const importedData = importProject(data);

                useStore.setState((state: any) => ({
                    projects: [...state.projects, importedData.project],
                    files: [...state.files, ...importedData.files],
                    collections: [...state.collections, ...importedData.collections],
                    highlights: [...state.highlights, ...importedData.highlights],
                    graphs: [...state.graphs, ...importedData.graphs],
                    graphNodes: [...state.graphNodes, ...importedData.graphNodes],
                    graphEdges: [...state.graphEdges, ...importedData.graphEdges],
                    docs: [...state.docs, ...importedData.docs],
                    storages: [...state.storages, ...importedData.storages],
                    activeProjectId: importedData.project.id
                }));

                setImportStatus({
                    type: "success",
                    message: `Imported project: ${importedData.project.name}`,
                });
            } catch (err) {
                console.error(err);
                setImportStatus({
                    type: "error",
                    message: "Failed to import project. Invalid file format.",
                });
            }
        };
        input.click();
    };

    const handleSelectStorage = (id: string | null) => {
        useStore.setState({ activeStorageId: id });
    };

    const handleCreateDoc = () => {
        if (!activeProjectId) return;
        setNewDocOpen(true);
    };

    const handleCreateDocSubmit = (name: string, color: string, icon: string) => {
        if (!activeProjectId) return;
        useStore.getState().addDoc(name, activeProjectId, color, icon);
        setNewDocOpen(false);
        navigate("/docs");
    };

    const handleSelectDoc = (id: string) => {
        useStore.setState({ activeDocId: id });
    };

    const handleCreateGraph = () => {
        if (!activeProjectId) return;
        setNewGraphOpen(true);
    };

    const handleCreateGraphSubmit = (name: string, color: string, icon: string) => {
        if (!activeProjectId) return;
        useStore.getState().addGraph(name, activeProjectId, color, icon);
        setNewGraphOpen(false);
        navigate("/graphs");
    };

    const handleSelectGraph = (id: string) => {
        useStore.setState({ activeGraphId: id });
    };

    // Ensure a valid storage is always selected
    useEffect(() => {
        if (activeProjectId && projectStorages.length > 0) {
            const isValid = projectStorages.some((s: Storage) => s.id === activeStorageId);
            if (!isValid) {
                useStore.setState({ activeStorageId: projectStorages[0].id });
            }
        }
    }, [activeProjectId, activeStorageId, projectStorages]);

    const handleAddCollection = (e: ReactMouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!activeProjectId) return;

        setCreateCollectionOpen(true);
    };

    const handleCreateCollection = (name: string, color: string, icon: string) => {
        if (!activeProjectId) return;
        if (name) {
            const newCollection: Collection = {
                id: crypto.randomUUID(),
                projectId: activeProjectId,
                parentId: null,
                name,
                color,
                icon,
                created: Date.now(),
                lastModified: Date.now()
            };
            useStore.setState((state: any) => ({
                collections: [...state.collections, newCollection],
                activeCollectionId: newCollection.id
            }));
            navigate('/collections');
        }
    };

    const handleEditCollectionClick = (e: ReactMouseEvent, collection: Collection) => {
        e.preventDefault();
        e.stopPropagation();
        setCollectionToEdit(collection);
        setEditCollectionOpen(true);
    };

    const handleDeleteCollection = (e: ReactMouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        trashCollection(id);
    };

    const handleUpdateCollection = (id: string, updates: { name: string, color: string, icon: string }) => {
        updateCollection(id, updates);
    };

    const handleSelectCollection = (id: string) => {
        useStore.setState({ activeCollectionId: id });
    };

    const handleProjectChange = (value: string) => {
        if (value === "new") {
            setNewProjectName("");
            setNewProjectOpen(true);
        } else if (value.startsWith("export_") && activeProjectId) {
            // EXPORT
            const data = exportProject(useStore.getState(), activeProjectId);
            if (data) {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `whistler_export_${data.project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } else if (value === "import") {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "application/json";
            input.onchange = async (e: Event) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;

                const text = await file.text();
                try {
                    const data = JSON.parse(text) as ProjectExportData;
                    if (!data.version || !data.project) throw new Error("Invalid project file");

                    const importedData = importProject(data);

                    useStore.setState((state: any) => ({
                        projects: [...state.projects, importedData.project],
                        files: [...state.files, ...importedData.files],
                        collections: [...state.collections, ...importedData.collections],
                        highlights: [...state.highlights, ...importedData.highlights],
                        graphs: [...state.graphs, ...importedData.graphs],
                        graphNodes: [...state.graphNodes, ...importedData.graphNodes],
                        graphEdges: [...state.graphEdges, ...importedData.graphEdges],
                        docs: [...state.docs, ...importedData.docs],
                        storages: [...state.storages, ...importedData.storages],
                        activeProjectId: importedData.project.id
                    }));

                    setImportStatus({
                        type: "success",
                        message: `Imported project: ${importedData.project.name}`,
                    });
                } catch (err) {
                    console.error(err);
                    setImportStatus({
                        type: "error",
                        message: "Failed to import project. Invalid file format.",
                    });
                }
            };
            input.click();
        } else {
            setActiveProject(value);
        }
    };

    const createMenuContent = (
        <>
            <ContextMenuItem onClick={() => setCreateCollectionOpen(true)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New Collection
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCreateDoc}>
                <NotePencil className="mr-2 h-4 w-4" />
                New Doc
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCreateGraph}>
                <Graph className="mr-2 h-4 w-4" />
                New Graph
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCreateStorage}>
                <HardDrives className="mr-2 h-4 w-4" />
                New Storage
            </ContextMenuItem>
        </>
    );


    return (
        <>
            <motion.aside
                initial={{ width: isSidebarCollapsed ? (sidebarMode === 'slim' ? 60 : 0) : 280 }}
                animate={{ width: isSidebarCollapsed ? (sidebarMode === 'slim' ? 60 : 0) : 280 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={cn(
                    "flex flex-col border-r border-border bg-sidebar h-full overflow-hidden shrink-0 z-20 relative",
                    // Only disable pointer events if collapsed AND NOT in slim mode (i.e. hidden)
                    isSidebarCollapsed && sidebarMode !== 'slim' && "pointer-events-none"
                )}
            >
                {isSlim ? (
                    <div className="flex flex-col h-full min-h-0 items-center py-3 gap-2 w-full">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={toggleSidebarCollapse}
                                    className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                >
                                    <SidebarSimple weight="bold" size={18} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Expand Sidebar</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => {
                                        navigate('/');
                                        setSidebarView('main');
                                    }}
                                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent hover:opacity-80 transition-colors"
                                >
                                    <img
                                        src={LOGO_MAP[accentTheme as AccentTheme] || whistlerLogoOrange}
                                        alt="Whistlerbox"
                                        className="w-5 h-5 rounded-md"
                                    />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Whistlerbox</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => useStore.getState().setSpotlightOpen(true)}
                                    className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                >
                                    <MagnifyingGlass weight="bold" size={18} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Search</TooltipContent>
                        </Tooltip>

                        <Separator className="w-8 bg-border/40 my-1" />

                        <div className="flex flex-col gap-2 w-full items-center">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => {
                                            if (location.pathname === '/storage') {
                                                toggleSidebarCollapse && toggleSidebarCollapse();
                                                setSidebarView('storage');
                                            } else {
                                                navigate('/storage');
                                            }
                                        }}
                                        className={cn(
                                            "h-9 w-9 flex items-center justify-center rounded-md transition-colors",
                                            location.pathname === '/storage' 
                                                ? "bg-primary/20 text-primary" 
                                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                        )}
                                    >
                                        <HardDrives weight={location.pathname === '/storage' ? "fill" : "bold"} size={20} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Storage</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => {
                                            if (location.pathname.startsWith('/docs')) {
                                                toggleSidebarCollapse && toggleSidebarCollapse();
                                                setSidebarView('docs');
                                            } else {
                                                navigate('/docs');
                                            }
                                        }}
                                        className={cn(
                                            "h-9 w-9 flex items-center justify-center rounded-md transition-colors",
                                            location.pathname.startsWith('/docs')
                                                ? "bg-primary/20 text-primary" 
                                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                        )}
                                    >
                                        <NotePencil weight={location.pathname.startsWith('/docs') ? "fill" : "bold"} size={20} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Docs</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => {
                                            if (location.pathname.startsWith('/graphs')) {
                                                toggleSidebarCollapse && toggleSidebarCollapse();
                                                setSidebarView('graphs');
                                            } else {
                                                navigate('/graphs');
                                            }
                                        }}
                                        className={cn(
                                            "h-9 w-9 flex items-center justify-center rounded-md transition-colors",
                                            location.pathname.startsWith('/graphs')
                                                ? "bg-primary/20 text-primary" 
                                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                        )}
                                    >
                                        <Graph weight={location.pathname.startsWith('/graphs') ? "fill" : "bold"} size={20} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Graphs</TooltipContent>
                            </Tooltip>
                        </div>

                        <Separator className="w-8 bg-border/40 my-1" />

                        <ScrollArea className="flex-1 min-h-0 w-full px-1">
                            <div className="flex flex-col gap-2 w-full items-center pb-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => navigate('/collections')}
                                            className={cn(
                                                "h-9 w-9 flex items-center justify-center rounded-md transition-colors",
                                                location.pathname.startsWith('/collections')
                                                    ? "bg-primary/20 text-primary" 
                                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                            )}
                                        >
                                            <FolderOpen weight={location.pathname.startsWith('/collections') ? "fill" : "bold"} size={20} />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">Collections</TooltipContent>
                                </Tooltip>

                                {collections.filter((c: Collection) => c.projectId === activeProjectId && !c.deleted).map((collection: Collection) => {
                                    const Icon = getIcon(collection.icon);
                                    return (
                                        <ContextMenu key={collection.id}>
                                            <ContextMenuTrigger className="flex justify-center w-full">
                                                <Link
                                                    to={`/collection/${collection.id}`}
                                                    onClick={() => handleSelectCollection(collection.id)}
                                                    className={cn(
                                                        "flex items-center justify-center w-9 h-9 rounded-md transition-colors relative",
                                                        (location.pathname === `/collection/${collection.id}`)
                                                            ? "bg-primary/20 text-primary"
                                                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                                    )}
                                                    title={collection.name}
                                                >
                                                    <Icon
                                                        className="text-lg transition-colors"
                                                        weight="fill"
                                                        style={{ color: (location.pathname === `/collection/${collection.id}`) ? undefined : collection.color }}
                                                    />
                                                </Link>
                                            </ContextMenuTrigger>
                                            <ContextMenuContent className="w-48">
                                                {createMenuContent}
                                                <ContextMenuSeparator />
                                                <ContextMenuItem onClick={(e: ReactMouseEvent) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setCollectionToEdit(collection);
                                                    setEditCollectionOpen(true);
                                                }}>
                                                    <PencilSimple className="mr-2 h-4 w-4" />
                                                    Rename Collection
                                                </ContextMenuItem>
                                                <ContextMenuItem onClick={(e: ReactMouseEvent) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    trashCollection(collection.id);
                                                }} className="text-red-500 focus:text-red-500">
                                                    <Trash className="mr-2 h-4 w-4" />
                                                    Delete Collection
                                                </ContextMenuItem>
                                            </ContextMenuContent>
                                        </ContextMenu>
                                    );
                                })}
                            </div>
                        </ScrollArea>

                        <div className="flex flex-col gap-2 w-full items-center pb-2">
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => { setSidebarView('sync'); toggleSidebarCollapse && toggleSidebarCollapse(); }}
                                        className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                    >
                                        <ArrowsClockwise 
                                            weight="bold" 
                                            size={18} 
                                            className={cn(syncStatus === 'syncing' && "animate-spin text-primary")} 
                                        />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Sync Status</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setAccentDialogOpen(true)}
                                        className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                    >
                                         <span
                                            className="h-2.5 w-2.5 rounded-full border border-border/60 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                                            style={{ backgroundColor: "var(--primary)" }}
                                        />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Appearance</TooltipContent>
                            </Tooltip>

                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => { setSidebarView('history'); toggleSidebarCollapse && toggleSidebarCollapse(); }}
                                        className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                    >
                                        <ClockCounterClockwise weight="bold" size={18} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">History</TooltipContent>
                            </Tooltip>

                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => { setSidebarView('trash'); toggleSidebarCollapse && toggleSidebarCollapse(); }}
                                        className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                    >
                                        <Trash weight="bold" size={18} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Trash</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                ) : (
                    <>
                {/* Header */}
                <div className="flex items-center justify-between p-3 h-12 border-b border-border/40 shrink-0 relative">
                    <button
                        onClick={toggleSidebarCollapse}
                        className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors z-10"
                        title="Collapse sidebar"
                    >
                        <SidebarSimple weight="bold" size={18} />
                    </button>

                    {!isSidebarCollapsed && (
                        <>
                            {!isSlim && (
                                <motion.button
                                    onClick={() => {
                                        navigate('/');
                                        setSidebarView('main');
                                    }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 overflow-hidden whitespace-nowrap hover:opacity-80 transition-opacity"
                                >
                                    <img
                                        src={LOGO_MAP[accentTheme as AccentTheme] || whistlerLogoOrange}
                                        alt="Whistlerbox"
                                        className="w-6 h-6 rounded-md"
                                    />
                                    <span className="font-bold text-lg tracking-tight truncate">
                                        Whistlerbox
                                    </span>
                                </motion.button>
                            )}

                            <div className={cn("flex items-center gap-2 z-10", isSlim && "flex-col")}>
                                <button
                                    onClick={() => useStore.getState().setSpotlightOpen(true)}
                                    className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                    title="Search"
                                >
                                    <MagnifyingGlass weight="bold" size={18} />
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {sidebarView === 'main' ? (
                        <motion.div
                            key="main"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            {/* Project Switcher */}
                            {!isSidebarCollapsed && (
                                <div className="p-3 pb-2 animate-in fade-in duration-300 shrink-0 space-y-1">
                                    <button
                                        onClick={() => setProjectsOpen(!projectsOpen)}
                                        className={cn("flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 hover:text-foreground transition-colors w-full text-left", isSlim && "justify-center")}
                                    >
                                        <CaretDown weight="bold" className={cn("transition-transform text-xs", !projectsOpen && "-rotate-90")} />
                                        {!isSlim && "Project"}
                                    </button>
                                    
                                    <AnimatePresence initial={false}>
                                        {projectsOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="space-y-1 overflow-hidden"
                                            >
                                                <div className={cn("flex gap-1 items-center pt-1", isSlim && "flex-col")}>
                                        <Select value={activeProjectId || ""} onValueChange={handleProjectChange}>
                                            <SelectTrigger className={cn("flex-1 h-8 bg-card border-border/60 shadow-sm", isSlim && "px-1 justify-center")}>
                                                {isSlim ? <FolderOpen weight="bold" /> : <SelectValue placeholder="Select Project" />}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projects.map((p: Project) => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                            <Separator className="my-1" />
                                                <SelectItem value="new"><span className="text-primary flex items-center gap-2"><Plus className="size-3" /> New Project</span></SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            className="h-8 w-8 shrink-0 bg-card border-border/60"
                                            onClick={handleEditProjectName}
                                            title="Edit Project Name"
                                        >
                                            <PencilSimple className="text-muted-foreground" />
                                        </Button>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 bg-card border-border/60" title="Share">
                                                    <Share className="text-muted-foreground" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={handleExportProject} disabled={!activeProjectId}>
                                                    <UploadSimple className="mr-2" /> Export Project
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={handleImportProject}>
                                                    <DownloadSimple className="mr-2" /> Import Project
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {importStatus && (
                                        <div
                                            className={cn(
                                                "mt-2 text-[11px] px-2 py-1 rounded-md border",
                                                importStatus.type === "success"
                                                    ? "bg-emerald-500/10 border-emerald-700/60 text-emerald-300"
                                                    : "bg-red-500/10 border-red-700/60 text-red-300"
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="truncate">{importStatus.message}</span>
                                                <button
                                                    onClick={() => setImportStatus(null)}
                                                    className="text-xs text-zinc-400 hover:text-zinc-200"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Scrollable Content */}
                            <ScrollArea className="flex-1 px-3 py-2">
                                {/* Assets Section */}
                                <div className="mb-4">
                                    {!isSidebarCollapsed && (
                                        <div className="flex items-center justify-between mb-2 px-1">
                                            <button
                                                onClick={() => setAssetsOpen(!assetsOpen)}
                                                className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full text-left"
                                            >
                                                <CaretDown weight="bold" className={cn("transition-transform text-xs", !assetsOpen && "-rotate-90")} />
                                                Assets
                                            </button>
                                        </div>
                                    )}
                                    
                                    <AnimatePresence initial={false}>
                                        {(assetsOpen || isSidebarCollapsed || isSlim) && (
                                            <motion.div
                                                initial={!isSidebarCollapsed ? { height: 0, opacity: 0 } : undefined}
                                                animate={!isSidebarCollapsed ? { height: "auto", opacity: 1 } : undefined}
                                                exit={!isSidebarCollapsed ? { height: 0, opacity: 0 } : undefined}
                                                className={cn("flex gap-1 overflow-hidden", (isSidebarCollapsed || isSlim) ? "flex-col space-y-2" : "flex-row")}
                                            >
                                                <ContextMenu>
                                                    <ContextMenuTrigger className={cn("flex-1", (isSidebarCollapsed || isSlim) && "w-full flex justify-center")}>
                                                        <button
                                                            onClick={() => {
                                                                if (isSidebarCollapsed) {
                                                                    toggleSidebarCollapse && toggleSidebarCollapse();
                                                                    return;
                                                                }
                                                                if (location.pathname === '/storage') {
                                                                    setSidebarView('storage');
                                                                } else {
                                                                    navigate('/storage');
                                                                    setSidebarView('main');
                                                                }
                                                            }}
                                                            title="Storage"
                                                            className={cn(
                                                                "flex items-center justify-center rounded-md transition-all duration-200 group relative cursor-pointer px-2 w-full",
                                                                (isSidebarCollapsed || isSlim)
                                                                    ? "w-10 h-10 mx-auto"
                                                                    : "h-9",
                                                                (location.pathname === "/storage")
                                                                    ? "bg-primary/20 text-primary shadow-sm"
                                                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                                            )}
                                                        >
                                                            <HardDrives
                                                                weight={(location.pathname === "/storage") ? "fill" : "regular"}
                                                                size={18}
                                                                className="transition-transform group-hover:scale-110"
                                                            />
                                                            {!isSidebarCollapsed && !isSlim && (
                                                                <span className="ml-2 text-xs font-medium tracking-tight">
                                                                    Storage
                                                                </span>
                                                            )}
                                                        </button>
                                                    </ContextMenuTrigger>
                                                    <ContextMenuContent className="w-48">
                                                        {createMenuContent}
                                                    </ContextMenuContent>
                                                </ContextMenu>

                                                <ContextMenu>
                                                    <ContextMenuTrigger className={cn("flex-1", (isSidebarCollapsed || isSlim) && "w-full flex justify-center")}>
                                                        <button
                                                            onClick={() => {
                                                                if (isSidebarCollapsed) {
                                                                    toggleSidebarCollapse && toggleSidebarCollapse();
                                                                    return;
                                                                }
                                                                if (location.pathname.startsWith('/docs')) {
                                                                    setSidebarView('docs');
                                                                } else {
                                                                    navigate('/docs');
                                                                    setSidebarView('main');
                                                                }
                                                            }}
                                                            title="Docs"
                                                            className={cn(
                                                                "flex items-center justify-center rounded-md transition-all duration-200 group relative cursor-pointer px-2 w-full",
                                                                (isSidebarCollapsed || isSlim)
                                                                    ? "w-10 h-10 mx-auto"
                                                                    : "h-9",
                                                                location.pathname.startsWith("/docs")
                                                                    ? "bg-primary/20 text-primary shadow-sm"
                                                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                                            )}
                                                        >
                                                            <NotePencil
                                                                weight={location.pathname.startsWith("/docs") ? "fill" : "regular"}
                                                                size={18}
                                                                className="transition-transform group-hover:scale-110"
                                                            />
                                                            {!isSidebarCollapsed && !isSlim && (
                                                                <span className="ml-2 text-xs font-medium tracking-tight">
                                                                    Docs
                                                                </span>
                                                            )}
                                                        </button>
                                                    </ContextMenuTrigger>
                                                    <ContextMenuContent className="w-48">
                                                        {createMenuContent}
                                                    </ContextMenuContent>
                                                </ContextMenu>

                                                <ContextMenu>
                                                    <ContextMenuTrigger className={cn("flex-1", (isSidebarCollapsed || isSlim) && "w-full flex justify-center")}>
                                                        <button
                                                            onClick={() => {
                                                                if (isSidebarCollapsed) {
                                                                    toggleSidebarCollapse && toggleSidebarCollapse();
                                                                    return;
                                                                }
                                                                if (location.pathname.startsWith('/graphs')) {
                                                                    setSidebarView('graphs');
                                                                } else {
                                                                    navigate('/graphs');
                                                                    setSidebarView('main');
                                                                }
                                                            }}
                                                            title="Graphs"
                                                            className={cn(
                                                                "flex items-center justify-center rounded-md transition-all duration-200 group relative cursor-pointer px-2 w-full",
                                                                (isSidebarCollapsed || isSlim)
                                                                    ? "w-10 h-10 mx-auto"
                                                                    : "h-9",
                                                                location.pathname.startsWith("/graphs")
                                                                    ? "bg-primary/20 text-primary shadow-sm"
                                                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                                            )}
                                                        >
                                                            <Graph
                                                                weight={location.pathname.startsWith("/graphs") ? "fill" : "regular"}
                                                                size={18}
                                                                className="transition-transform group-hover:scale-110"
                                                            />
                                                            {!isSidebarCollapsed && !isSlim && (
                                                                <span className="ml-2 text-xs font-medium tracking-tight">
                                                                    Graphs
                                                                </span>
                                                            )}
                                                        </button>
                                                    </ContextMenuTrigger>
                                                    <ContextMenuContent className="w-48">
                                                        {createMenuContent}
                                                    </ContextMenuContent>
                                                </ContextMenu>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>


                                <Separator className="my-4 bg-border/40" />

                                {/* Collections Section */}
                                <div className="mb-6">
                                    {(!isSidebarCollapsed && !isSlim) ? (
                                        <div
                                            className={cn(
                                                "flex items-center justify-between mb-2 px-1 group gap-0 rounded-md border border-transparent overflow-hidden transition-colors",
                                                location.pathname.startsWith('/collections')
                                                    ? "bg-primary/20 border-primary/30 shadow-sm"
                                                    : "hover:bg-primary/20 hover:border-border"
                                            )}
                                        >
                                            <ContextMenu>
                                                <ContextMenuTrigger className="flex-1">
                                                    <button
                                                        onClick={() => navigate('/collections')}
                                                        className={cn(
                                                            "flex items-center justify-center rounded-l-md rounded-r-none transition-all duration-200 group relative cursor-pointer px-2 w-full h-9 border border-transparent",
                                                            location.pathname.startsWith('/collections')
                                                                ? "text-primary"
                                                                : "text-muted-foreground group-hover:text-primary"
                                                        )}
                                                    >
                                                        <FolderOpen
                                                            weight={location.pathname.startsWith('/collections') ? "fill" : "regular"}
                                                            size={18}
                                                            className="transition-transform group-hover:scale-110"
                                                        />
                                                        <span className="ml-2 text-xs font-medium tracking-tight flex-1 text-left">
                                                            Collections
                                                        </span>
                                                    </button>
                                                </ContextMenuTrigger>
                                                <ContextMenuContent className="w-48">
                                                    {createMenuContent}
                                                </ContextMenuContent>
                                            </ContextMenu>
                                            <button
                                                onClick={(e: ReactMouseEvent) => {
                                                    e.stopPropagation();
                                                    setCreateCollectionOpen(true);
                                                }}
                                                className="h-9 w-9 flex items-center justify-center rounded-r-md rounded-l-none border border-transparent border-l border-l-border/40 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                title="New Collection"
                                                data-sound-confirm
                                            >
                                                <Plus weight="bold" className="size-4" />
                                            </button>
                                        </div>
                                    ) : isSlim ? (
                                        <div className="flex justify-center mb-2">
                                            <ContextMenu>
                                                <ContextMenuTrigger className="flex justify-center">
                                                    <button
                                                        onClick={() => navigate('/collections')}
                                                        className={cn(
                                                            "text-muted-foreground hover:text-primary transition-colors",
                                                            location.pathname === '/collections' && "text-primary"
                                                        )}
                                                        title="All Collections"
                                                    >
                                                        <Folder weight="bold" className="size-5" />
                                                    </button>
                                                </ContextMenuTrigger>
                                                <ContextMenuContent className="w-48">
                                                    {createMenuContent}
                                                </ContextMenuContent>
                                            </ContextMenu>
                                        </div>
                                    ) : null}

                                    <AnimatePresence initial={false}>
                                        {(!isSidebarCollapsed || isSlim) && (
                                            <motion.div
                                                initial={isSlim ? false : { height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={isSlim ? undefined : { height: 0, opacity: 0 }}
                                                className="space-y-1 overflow-visible"
                                            >
                                                <DndContext 
                                                    sensors={sensors} 
                                                    collisionDetection={closestCenter} 
                                                    onDragEnd={handleDragEnd}
                                                >
                                                    <SortableContext 
                                                        items={collections.filter((c: Collection) => c.projectId === activeProjectId && !c.deleted).map((c: Collection) => c.id)}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        {collections.filter((c: Collection) => c.projectId === activeProjectId && !c.deleted).map((collection: Collection) => (
                                                            <SortableCollectionItem
                                                                key={collection.id}
                                                                collection={collection}
                                                                location={location}
                                                                isSlim={isSlim}
                                                                handleSelectCollection={handleSelectCollection}
                                                                handleEditCollectionClick={handleEditCollectionClick}
                                                                handleDeleteCollection={handleDeleteCollection}
                                                                setCollectionToEdit={setCollectionToEdit}
                                                                setEditCollectionOpen={setEditCollectionOpen}
                                                                trashCollection={trashCollection}
                                                                createMenuContent={createMenuContent}
                                                            />
                                                        ))}
                                                    </SortableContext>
                                                </DndContext>
                                                {collections.filter((c: Collection) => c.projectId === activeProjectId && !c.deleted).length === 0 && (
                                                    <div className={cn("px-3 py-4 text-xs text-muted-foreground/60 italic text-center border-2 border-dashed border-border/30 rounded-md", isSlim && "px-1 text-[10px]")}>
                                                        {isSlim ? "No col." : "No collections"}
                                                    </div>
                                                )}

                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </ScrollArea>
                        </motion.div>
                    ) : sidebarView === 'docs' ? (
                        <motion.div
                            key="docs"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <div className="p-3 pb-2 border-b border-border/40 shrink-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => setSidebarView('main')}
                                    >
                                        <CaretLeft className="text-muted-foreground" />
                                    </Button>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                        <NotePencil weight="bold" />
                                        Documents
                                    </div>
                                    <div className="flex-1" />
                                    <Button variant="ghost" size="icon" onClick={handleCreateDoc} className="size-6">
                                        <Plus weight="bold" className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                            
                            <ScrollArea className="flex-1 px-3 py-2">
                                <div className="space-y-1">
                                    {projectDocs.map((doc: Doc) => {
                                        const DocIcon = getIcon(doc.icon);
                                        return (
                                        <div
                                            key={doc.id}
                                            onClick={() => handleSelectDoc(doc.id)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e: ReactKeyboardEvent) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    handleSelectDoc(doc.id);
                                                }
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors group cursor-pointer",
                                                activeDocId === doc.id
                                                    ? "bg-primary/20 text-primary font-medium"
                                                    : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <DocIcon 
                                                weight={activeDocId === doc.id ? "fill" : "regular"} 
                                                className="text-lg shrink-0 transition-colors"
                                                style={{ color: activeDocId === doc.id ? undefined : doc.color }}
                                            />
                                            <span className="truncate flex-1">{doc.name}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e: ReactMouseEvent) => handleRenameDoc(e, doc)}
                                                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                                >
                                                    <PencilSimple weight="bold" />
                                                </button>
                                                <button
                                                    onClick={(e: ReactMouseEvent) => handleDeleteDoc(e, doc.id)}
                                                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash weight="bold" />
                                                </button>
                                            </div>
                                        </div>
                                    )})}

                                    {projectDocs.length === 0 && (
                                        <div className="p-4 text-center text-xs text-muted-foreground/60 italic border-2 border-dashed border-border/30 rounded-md m-2">
                                            No documents yet
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </motion.div>
                    ) : sidebarView === 'graphs' ? (
                        <motion.div
                            key="graphs"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <div className="p-3 pb-2 border-b border-border/40 shrink-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => setSidebarView('main')}
                                    >
                                        <CaretLeft className="text-muted-foreground" />
                                    </Button>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                        <Graph weight="bold" />
                                        Graphs
                                    </div>
                                    <div className="flex-1" />
                                    <Button variant="ghost" size="icon" onClick={handleCreateGraph} className="size-6">
                                        <Plus weight="bold" className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                            
                            <ScrollArea className="flex-1 px-3 py-2">
                                <div className="space-y-1">
                                    {projectGraphs.map((graph: GraphType) => {
                                        const GraphIcon = getIcon(graph.icon);
                                        return (
                                        <div
                                            key={graph.id}
                                            onClick={() => handleSelectGraph(graph.id)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e: ReactKeyboardEvent) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    handleSelectGraph(graph.id);
                                                }
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors group cursor-pointer",
                                                activeGraphId === graph.id
                                                    ? "bg-primary/20 text-primary font-medium"
                                                    : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <GraphIcon 
                                                weight={activeGraphId === graph.id ? "fill" : "regular"} 
                                                className="text-lg shrink-0 transition-colors"
                                                style={{ color: activeGraphId === graph.id ? undefined : graph.color }}
                                            />
                                            <span className="truncate flex-1">{graph.name}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e: ReactMouseEvent) => handleEditGraph(e, graph)}
                                                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors"
                                                >
                                                    <PencilSimple weight="bold" />
                                                </button>
                                                <button
                                                    onClick={(e: ReactMouseEvent) => handleDeleteGraph(e, graph.id)}
                                                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    <Trash weight="bold" />
                                                </button>
                                            </div>
                                        </div>
                                    )})}

                                    {projectGraphs.length === 0 && (
                                        <div className="p-4 text-center text-xs text-muted-foreground/60 italic border-2 border-dashed border-border/30 rounded-md m-2">
                                            No graphs yet
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </motion.div>
                    ) : sidebarView === 'history' ? (
                        <motion.div
                            key="history"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <SidebarHistory onBack={() => setSidebarView('main')} />
                        </motion.div>
                    ) : sidebarView === 'trash' ? (
                        <motion.div
                            key="trash"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <SidebarTrash onBack={() => setSidebarView('main')} />
                        </motion.div>
                    ) : sidebarView === 'sync' ? (
                        <motion.div
                            key="sync"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <SidebarSync onBack={() => setSidebarView('main')} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="storage"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <div className="p-3 pb-2 border-b border-border/40 shrink-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => {
                                            setSidebarView('main');
                                            // Optional: Navigate back to home or stay on storage page?
                                            // Usually back button implies going up a level, so maybe back to main view but stay on page?
                                            // But if we are on storage page, main view doesn't make much sense unless we navigate away.
                                            // Let's just switch view for now.
                                        }}
                                        data-sound-back
                                    >
                                        <CaretLeft className="text-muted-foreground" />
                                    </Button>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                        <HardDrives weight="bold" />
                                        Storages
                                    </div>
                                    <div className="flex-1" />
                                    <Button variant="ghost" size="icon" onClick={handleCreateStorage} className="size-6">
                                        <Plus weight="bold" className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                            
                            <ScrollArea className="flex-1 px-3 py-2">
                                <div className="space-y-1">
                                    {projectStorages.map((storage: Storage) => {
                                        const Icon = storage.icon ? getIcon(storage.icon) : Folder;
                                        const isActive = activeStorageId === storage.id;
                                        return (
                                            <button
                                                key={storage.id}
                                                onClick={() => handleSelectStorage(storage.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors group cursor-pointer",
                                                    isActive
                                                        ? "bg-primary/20 text-primary font-medium"
                                                        : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground",
                                                    isSlim && "justify-center px-0 py-3"
                                                )}
                                                title={isSlim ? storage.name : undefined}
                                            >
                                                <Icon 
                                                    weight={isActive ? "fill" : "regular"} 
                                                    className={cn("text-lg shrink-0 transition-colors", !storage.color && "text-primary")}
                                                    style={{ color: isActive ? undefined : storage.color }}
                                                />
                                                {!isSlim && <span className="truncate flex-1">{storage.name}</span>}
                                                {!isSlim && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e: ReactMouseEvent) => handleEditStorageClick(e, storage)}
                                                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                                        >
                                                            <PencilSimple weight="bold" />
                                                        </button>
                                                        <button
                                                            onClick={(e: ReactMouseEvent) => handleDeleteStorage(e, storage.id)}
                                                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash weight="bold" />
                                                        </button>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}

                                    {projectStorages.length === 0 && (
                                        <div className={cn(
                                            "text-muted-foreground/60 italic border-2 border-dashed border-border/30 rounded-md m-2 flex items-center justify-center",
                                            isSlim ? "p-2 h-10" : "p-4 text-center text-xs"
                                        )}>
                                            {isSlim ? <HardDrives className="opacity-50" /> : "No storages created yet"}
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer / PiP Placeholder */}
                <div className="p-3 border-t border-border/40 bg-card/30 min-h-[50px] flex flex-col justify-center">
                    {isPipOpen && pipFileId ? (
                        <PiPPlayer isCollapsed={isSidebarCollapsed} />
                    ) : (
                        <>
                            <div className={cn("flex items-center gap-1", isSidebarCollapsed || isSlim ? "flex-col justify-center" : "justify-between w-full")}>
                                {!isSidebarCollapsed && !isSlim ? (
                                    <div className="flex-1 min-w-0">
                                        <SyncStatusFooter />
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setSidebarView('sync')}
                                        className="w-8 h-8 mx-auto flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                        title="Sync Status"
                                    >
                                        <ArrowsClockwise weight="bold" size={18} className={cn(syncStatus === 'syncing' && "animate-spin text-primary")} />
                                    </button>
                                )}

                                <div className={cn("flex gap-1", (isSidebarCollapsed || isSlim) && "flex-col")}>
                                    <button
                                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                        title="Change accent theme"
                                        onClick={() => setAccentDialogOpen(true)}
                                    >
                                        <span className="flex items-center justify-center">
                                            <span
                                                className="h-3 w-3 rounded-full border border-border/60 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                                                style={{ backgroundColor: "var(--primary)" }}
                                            />
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setSidebarView('history')}
                                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                        title="History"
                                    >
                                        <ClockCounterClockwise weight="bold" size={18} />
                                    </button>
                                    <button
                                        onClick={() => setSidebarView('trash')}
                                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-400 hover:text-red-400 transition-colors"
                                        title="Trash"
                                    >
                                        <Trash weight="bold" size={18} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                </>
            )}
            </motion.aside>

            {isSidebarCollapsed && !isSlim && (
                <button
                    onClick={toggleSidebarCollapse}
                    className="fixed top-1/2 -translate-y-1/2 left-4 z-30 h-10 w-8 rounded-md bg-sidebar border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/60 shadow-sm flex items-center justify-center"
                    title="Show sidebar"
                >
                    <SidebarSimple weight="bold" size={18} />
                </button>
            )}

            <CreateCollectionDialog
                open={createCollectionOpen}
                onOpenChange={setCreateCollectionOpen}
                onSubmit={handleCreateCollection}
            />

            <EditCollectionDialog
                open={editCollectionOpen}
                onOpenChange={setEditCollectionOpen}
                collection={collectionToEdit}
                onSubmit={handleUpdateCollection}
            />

            <CreateStorageDialog
                open={createStorageOpen}
                onOpenChange={setCreateStorageOpen}
                onSubmit={handleCreateStorageSubmit}
            />
            <EditStorageDialog
                open={editStorageOpen}
                onOpenChange={setEditStorageOpen}
                onSubmit={handleUpdateStorage}
                initialName={storageToEdit?.name || ""}
                initialColor={storageToEdit?.color}
                initialIcon={storageToEdit?.icon}
            />
            <EditGraphDialog
                open={editGraphOpen}
                onOpenChange={setEditGraphOpen}
                onSubmit={handleUpdateGraph}
                initialName={graphToEdit?.name || ""}
                initialColor={graphToEdit?.color}
                initialIcon={graphToEdit?.icon}
            />
            <EditDocDialog
                open={renameDocOpen}
                onOpenChange={setRenameDocOpen}
                onSubmit={handleUpdateDoc}
                initialName={docToRename?.name || ""}
                initialColor={docToRename?.color}
                initialIcon={docToRename?.icon}
            />
            <EditProjectDialog
                open={editProjectOpen}
                onOpenChange={setEditProjectOpen}
                currentName={projects.find((p: Project) => p.id === activeProjectId)?.name || ""}
                onSave={(newName) => {
                    if (activeProjectId) {
                        updateProject(activeProjectId, { name: newName });
                    }
                }}
                onDelete={() => {
                    if (activeProjectId) {
                        deleteProject(activeProjectId);
                    }
                }}
            />

            <Dialog open={accentDialogOpen} onOpenChange={setAccentDialogOpen}>
                <DialogContent className="sm:max-w-2xl bg-popover border-border text-popover-foreground">
                    <DialogHeader>
                        <DialogTitle>Appearance</DialogTitle>
                        <DialogDescription className="text-muted-foreground text-xs">
                            Configure colors and background image.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                        <Button
                            type="button"
                            size="sm"
                            variant={appearanceTab === 'appearance' ? "default" : "ghost"}
                            onClick={() => setAppearanceTab('appearance')}
                        >
                            Appearance
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={appearanceTab === 'music' ? "default" : "ghost"}
                            onClick={() => setAppearanceTab('music')}
                        >
                            Music
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={appearanceTab === 'reset' ? "default" : "ghost"}
                            onClick={() => setAppearanceTab('reset')}
                        >
                            Reset
                        </Button>
                    </div>
                    {appearanceTab === 'appearance' ? (
                        <div className="py-2 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground px-1">Accent</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {ACCENT_OPTIONS.map((option) => (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => setAccentTheme(option.id)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors border",
                                                    accentTheme === option.id
                                                        ? "bg-primary/10 text-primary border-primary/20"
                                                        : "bg-card border-border hover:bg-accent hover:text-accent-foreground"
                                                )}
                                            >
                                                <span className={cn("h-4 w-4 rounded-full border border-border/60", option.previewClass)} />
                                                <span className="flex-1 text-left">{option.label}</span>
                                                {accentTheme === option.id && <CheckCircle weight="bold" className="text-primary" size={14} />}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="pt-4 space-y-3 border-t border-border">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground px-1">Base</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {BASE_OPTIONS.map((option) => (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    onClick={() => setBaseTheme(option.id)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors border",
                                                        baseTheme === option.id
                                                            ? "bg-primary/10 text-primary border-primary/20"
                                                            : "bg-card border-border hover:bg-accent hover:text-accent-foreground"
                                                    )}
                                                >
                                                    <span className={cn("h-4 w-4 rounded-full border border-border/60", option.previewClass)} />
                                                    <span className="flex-1 text-left">{option.label}</span>
                                                    {baseTheme === option.id && <CheckCircle weight="bold" className="text-primary" size={14} />}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="pt-3 space-y-2 border-t border-border mt-3">
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground px-1">Sidebar Mode</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => setSidebarMode('full')}
                                                    className={cn(
                                                        "flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs transition-colors border",
                                                        sidebarMode === 'full'
                                                            ? "bg-primary/10 text-primary border-primary/20"
                                                            : "bg-card border-border hover:bg-accent hover:text-accent-foreground"
                                                    )}
                                                >
                                                    <SidebarSimple weight="fill" className="text-lg" />
                                                    <span>Full</span>
                                                </button>
                                                <button
                                                    onClick={() => setSidebarMode('slim')}
                                                    className={cn(
                                                        "flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs transition-colors border",
                                                        sidebarMode === 'slim'
                                                            ? "bg-primary/10 text-primary border-primary/20"
                                                            : "bg-card border-border hover:bg-accent hover:text-accent-foreground"
                                                    )}
                                                >
                                                    <SidebarSimple weight="regular" className="text-lg" />
                                                    <span>Slim</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground px-1">Background</p>
                                    
                                    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium">Color Overlay</span>
                                            <div className="flex items-center gap-2">
                                                <div className="relative w-6 h-6 rounded-full overflow-hidden border border-border/60 cursor-pointer shadow-sm">
                                                    <input 
                                                        type="color" 
                                                        value={backgroundColor || '#000000'}
                                                        onChange={(e: ReactChangeEvent<HTMLInputElement>) => setBackgroundColor(e.target.value)}
                                                        className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 border-0 opacity-0 cursor-pointer"
                                                    />
                                                    <div 
                                                        className="w-full h-full"
                                                        style={{ backgroundColor: backgroundColor || '#000000' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] text-muted-foreground">Opacity</span>
                                                <span className="text-[11px]">{Math.round((backgroundOverlayOpacity ?? 0.5) * 100)}%</span>
                                            </div>
                                            <Slider
                                                value={[Math.round((backgroundOverlayOpacity ?? 0.5) * 100)]}
                                                onValueChange={(vals: number[]) => setBackgroundOverlayOpacity((vals[0] ?? 50) / 100)}
                                                max={100}
                                                step={1}
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-border bg-card overflow-hidden">
                                        <div className="aspect-video relative">
                                            {backgroundImageUrl ? (
                                                <img src={backgroundImageUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                    <span className="text-xs">No background image</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, var(--background))', opacity: 0.6 }} />
                                        </div>
                                        <div className="p-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        const input = document.createElement('input');
                                                        input.type = 'file';
                                                        input.accept = 'image/*';
                    input.onchange = async (e: Event) => {
                                                            const file = (e.target as HTMLInputElement).files?.[0];
                                                            if (!file) return;
                                                            const reader = new FileReader();
                                                            reader.onload = () => {
                                                                const result = reader.result as string;
                                                                setBackgroundImageUrl(result);
                                                            if ((backgroundImageOpacity ?? 0) === 0) {
                                                                setBackgroundImageOpacity(0.2);
                                                            }
                                                            };
                                                            reader.readAsDataURL(file);
                                                        };
                                                        input.click();
                                                    }}
                                                >
                                                    Upload Image
                                                </Button>
                                                {backgroundImageUrl && (
                                                    <Button variant="ghost" onClick={() => setBackgroundImageUrl(null)}>
                                                        Remove
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] text-muted-foreground">Opacity</span>
                                                    <span className="text-[11px]">{Math.round((backgroundImageOpacity ?? 0) * 100)}%</span>
                                                </div>
                                                <Slider
                                                    value={[Math.round((backgroundImageOpacity ?? 0.2) * 100)]}
                                                    onValueChange={(vals: number[]) => setBackgroundImageOpacity((vals[0] ?? 20) / 100)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-3 space-y-2 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => setEnableDefaultColorControls(!enableDefaultColorControls)}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                >
                                    <span className="text-[11px] font-medium">Advanced default colors</span>
                                    <span
                                        className={cn(
                                            "w-8 h-4 rounded-full relative transition-colors",
                                            enableDefaultColorControls ? "bg-primary" : "bg-zinc-700"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                                                enableDefaultColorControls ? "right-0.5" : "left-0.5"
                                            )}
                                        />
                                    </span>
                                </button>
                                {enableDefaultColorControls && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground px-1">Default colors</p>
                                        <div className="grid grid-cols-2 gap-1">
                                            {DEFAULT_COLOR_ENTITIES.map((entity) => (
                                                <button
                                                    key={entity.key}
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveDefaultColorEntity(entity.key);
                                                        setDefaultColorDialogOpen(true);
                                                    }}
                                                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                                >
                                                    <span
                                                        className="h-3.5 w-3.5 rounded-full border border-border/60"
                                                        style={{ backgroundColor: (defaultColors && defaultColors[entity.key]) || "hsl(var(--primary))" }}
                                                    />
                                                    <span className="flex-1 text-left">{entity.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground px-1">Used when creating new items.</p>
                                    </div>
                                )}
                            </div>
                            <div className="pt-3 space-y-2 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => setWindowOutlineEnabled(!windowOutlineEnabled)}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                >
                                    <span className="text-[11px] font-medium">Window outlines</span>
                                    <span
                                        className={cn(
                                            "w-8 h-4 rounded-full relative transition-colors",
                                            windowOutlineEnabled ? "bg-primary" : "bg-zinc-700"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                                                windowOutlineEnabled ? "right-0.5" : "left-0.5"
                                            )}
                                        />
                                    </span>
                                </button>
                                <p className="text-[10px] text-muted-foreground px-1">Uses the file color for window borders.</p>
                            </div>
                        </div>
                    ) : appearanceTab === 'music' ? (
                        <div className="py-2 space-y-6">
                            <div className="space-y-3">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground px-1">Ambient Music</p>
                                <div className="rounded-lg border border-border bg-card p-3 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" onClick={handleAmbientMusicUpload}>
                                            Upload Audio
                                        </Button>
                                        {ambientMusicUrl && (
                                            <Button variant="ghost" onClick={handleRemoveAmbientMusic}>
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                        <span>Status</span>
                                        <span>{ambientMusicUrl ? "Loaded" : "None"}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-muted-foreground">Volume</span>
                                            <span className="text-[11px]">{Math.round((ambientMusicVolume ?? 0.4) * 100)}%</span>
                                        </div>
                                        <Slider
                                            value={[Math.round((ambientMusicVolume ?? 0.4) * 100)]}
                                            onValueChange={(vals: number[]) => setAmbientMusicVolume((vals[0] ?? 40) / 100)}
                                            max={100}
                                            step={1}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-3 border-t border-border">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground px-1">Media Playback</p>
                                <div className="rounded-lg border border-border bg-card p-3 space-y-4">
                                    <button
                                        type="button"
                                        onClick={() => setMuteNewVideosUntilUnmuted(!muteNewVideosUntilUnmuted)}
                                        className="w-full flex items-center justify-between"
                                    >
                                        <span className="text-sm">Mute new videos until unmuted</span>
                                        <span
                                            className={cn(
                                                "w-8 h-4 rounded-full relative transition-colors",
                                                muteNewVideosUntilUnmuted ? "bg-primary" : "bg-zinc-700"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                                                    muteNewVideosUntilUnmuted ? "right-0.5" : "left-0.5"
                                                )}
                                            />
                                        </span>
                                    </button>
                                    <p className="text-[10px] text-muted-foreground">
                                        Requires clicking Unmute Video the first time a video opens.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={handleRememberVolumeToggle}
                                        className="w-full flex items-center justify-between"
                                    >
                                        <span className="text-sm">Remember media volume</span>
                                        <span
                                            className={cn(
                                                "w-8 h-4 rounded-full relative transition-colors",
                                                rememberMediaVolume ? "bg-primary" : "bg-zinc-700"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                                                    rememberMediaVolume ? "right-0.5" : "left-0.5"
                                                )}
                                            />
                                        </span>
                                    </button>
                                    <p className="text-[10px] text-muted-foreground">
                                        Stores volume per video and audio file.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() => setDisableMediaAutoplay(!disableMediaAutoplay)}
                                        className="w-full flex items-center justify-between"
                                    >
                                        <span className="text-sm">Disable autoplay for new media</span>
                                        <span
                                            className={cn(
                                                "w-8 h-4 rounded-full relative transition-colors",
                                                disableMediaAutoplay ? "bg-primary" : "bg-zinc-700"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                                                    disableMediaAutoplay ? "right-0.5" : "left-0.5"
                                                )}
                                            />
                                        </span>
                                    </button>
                                    <p className="text-[10px] text-muted-foreground">
                                        Applies to videos and audio files when they open.
                                    </p>
                                </div>
                                <AlertDialog open={disableRememberVolumeOpen} onOpenChange={setDisableRememberVolumeOpen}>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Disable volume memory?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                All saved media volumes will be erased.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => {
                                                    setRememberMediaVolume(false);
                                                    clearMediaVolumes();
                                                    setDisableRememberVolumeOpen(false);
                                                }}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Disable
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                            
                            <div className="space-y-3 pt-3 border-t border-border">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground px-1">Sound Effects</p>
                                <div className="rounded-lg border border-border bg-card p-3 space-y-4">
                                    <button
                                        type="button"
                                        onClick={() => setSfxEnabled(!sfxEnabled)}
                                        className="w-full flex items-center justify-between"
                                    >
                                        <span className="text-sm">Enable website sounds</span>
                                        <span
                                            className={cn(
                                                "w-8 h-4 rounded-full relative transition-colors",
                                                sfxEnabled ? "bg-primary" : "bg-zinc-700"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                                                    sfxEnabled ? "right-0.5" : "left-0.5"
                                                )}
                                            />
                                        </span>
                                    </button>

                                    {sfxEnabled && (
                                        <div className="space-y-2 pl-2 border-l-2 border-border/50">
                                            {Object.entries(enabledSounds || { cursor: true, confirm: true, error: true, back: true, search: true }).map(([key, enabled]) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => toggleSound(key as any)}
                                                    className="w-full flex items-center justify-between group"
                                                >
                                                    <span className="text-xs text-muted-foreground group-hover:text-foreground capitalize">{key}</span>
                                                    <span
                                                        className={cn(
                                                            "w-6 h-3 rounded-full relative transition-colors",
                                                            enabled ? "bg-primary/70" : "bg-zinc-700"
                                                        )}
                                                    >
                                                        <span
                                                            className={cn(
                                                                "absolute top-0.5 w-2 h-2 bg-white rounded-full transition-transform",
                                                                enabled ? "right-0.5" : "left-0.5"
                                                            )}
                                                        />
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <p className="text-[10px] text-muted-foreground mt-2">
                                        Plays sounds for clicks, confirmations, and errors.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-2 space-y-6">
                            <div className="space-y-3">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground px-1">Updates</p>
                                <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        Reload the app and refresh cached assets.
                                    </p>
                                    <Button variant="outline" onClick={handleResetForUpdates}>
                                        Reload for updates
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-3 pt-3 border-t border-border">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground px-1">Data</p>
                                <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        Clears all local data on this device.
                                    </p>
                                    <Button variant="destructive" onClick={handleResetAllData}>
                                        Reset all data
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {activeDefaultColorEntity && (
                <ColorPickerDialog
                    open={defaultColorDialogOpen}
                    onOpenChange={(open) => {
                        setDefaultColorDialogOpen(open);
                        if (!open) {
                            setActiveDefaultColorEntity(null);
                        }
                    }}
                    title={`Default color for ${DEFAULT_COLOR_ENTITIES.find(e => e.key === activeDefaultColorEntity)?.label ?? ""}`}
                    initialColor={
                        (defaultColors && defaultColors[activeDefaultColorEntity]) ||
                        "#f59e0b"
                    }
                    onColorSelect={(color) => {
                        if (activeDefaultColorEntity) {
                            setDefaultColor(activeDefaultColorEntity, color);
                        }
                    }}
                />
            )}

            <NewDocDialog
                open={newDocOpen}
                onOpenChange={setNewDocOpen}
                onSubmit={handleCreateDocSubmit}
            />

            <NewGraphDialog
                open={newGraphOpen}
                onOpenChange={setNewGraphOpen}
                onSubmit={handleCreateGraphSubmit}
            />

            <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
                <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>New Project</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Name your new project.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-project-name">Project Name</Label>
                            <Input
                                id="new-project-name"
                                placeholder="My Project"
                                value={newProjectName}
                                onChange={(e: ReactChangeEvent<HTMLInputElement>) => setNewProjectName(e.target.value)}
                                autoFocus
                                className="bg-zinc-900 border-zinc-800"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewProjectOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateProjectSubmit} disabled={!newProjectName.trim()}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function SyncStatusFooter() {
    const { syncStatus, lastSyncTime, setSidebarView } = useStore();
    const [timeString, setTimeString] = useState("");

    useEffect(() => {
        const updateTime = () => {
            if (lastSyncTime) {
                setTimeString(formatDistanceToNow(lastSyncTime, { addSuffix: true }));
            } else {
                setTimeString("Not synced");
            }
        };
        
        updateTime();
        const interval = setInterval(updateTime, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [lastSyncTime]);

    const getStatusColor = () => {
        switch (syncStatus) {
            case 'syncing': return 'text-blue-400';
            case 'error': return 'text-red-400';
            case 'success': return 'text-green-400';
            default: return lastSyncTime ? 'text-green-400' : 'text-zinc-500';
        }
    };

    const getStatusIcon = () => {
        switch (syncStatus) {
            case 'syncing': return <ArrowsClockwise className="animate-spin" weight="bold" />;
            case 'error': return <WarningCircle weight="fill" />;
            case 'success': return <CheckCircle weight="fill" />;
            default: return lastSyncTime ? <CloudCheck weight="fill" /> : <Cloud weight="regular" />;
        }
    };

    return (
        <button
            onClick={() => setSidebarView('sync')}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all group"
            title="Click to manage sync settings"
        >
            <div className={cn("text-base shrink-0 transition-colors flex items-center justify-center", getStatusColor())}>
                {getStatusIcon()}
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1 leading-none gap-1">
                <span className={cn("font-medium truncate w-full text-left transition-colors text-[10px] uppercase tracking-wider opacity-80", 
                    syncStatus === 'error' ? "text-red-400" : 
                    syncStatus === 'syncing' ? "text-blue-400" : "group-hover:text-primary"
                )}>
                    {syncStatus === 'syncing' ? "Syncing..." :
                     syncStatus === 'error' ? "Sync Error" :
                     "Last Sync"}
                </span>
                <span className="text-[11px] truncate w-full text-left font-medium">
                    {syncStatus === 'syncing' ? "Updating..." :
                     syncStatus === 'error' ? "Check connection" :
                     lastSyncTime ? timeString :
                     "Not connected"}
                </span>
            </div>
        </button>
    );
}
