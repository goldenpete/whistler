import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
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
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import type { Collection, Storage, AccentTheme } from "@/types";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CreateCollectionDialog, EditCollectionDialog } from "@/components/dialogs/CollectionDialogs";
import { CreateStorageDialog, EditStorageDialog, EditGraphDialog, RenameDocDialog } from "@/components/dialogs/StorageDialogs";
import { EditProjectDialog } from "@/components/dialogs/EditProjectDialog";
import { SidebarHistory } from "@/components/layout/SidebarHistory";
import { SidebarTrash } from "@/components/layout/SidebarTrash";
import { SidebarSync } from "@/components/layout/SidebarSync";
import { PiPPlayer } from "@/components/player/PiPPlayer";
import { exportProject, importProject, type ProjectExportData } from "@/utils/projectData";
import { UploadSimple, DownloadSimple, ClockCounterClockwise } from "@phosphor-icons/react";
import whistlerLogo from "../../../whistlerlogo.png";

const ACCENT_OPTIONS: { id: AccentTheme; label: string; previewClass: string }[] = [
    { id: "orange", label: "Orange", previewClass: "bg-orange-500" },
    { id: "emerald", label: "Emerald", previewClass: "bg-emerald-500" },
    { id: "violet", label: "Violet", previewClass: "bg-violet-500" },
    { id: "sky", label: "Sky", previewClass: "bg-sky-500" },
];

export default function Sidebar() {
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
        syncStatus,
        sidebarView,
        setSidebarView,
        accentTheme,
        setAccentTheme,
    } = useStore();

    const activeCollection = collections.find(c => c.id === activeCollectionId);

    const [projectsOpen, setProjectsOpen] = useState(true);
    const [assetsOpen, setAssetsOpen] = useState(true);
    const [collectionsOpen, setCollectionsOpen] = useState(true);
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
    const [newDocName, setNewDocName] = useState("");
    const [newGraphOpen, setNewGraphOpen] = useState(false);
    const [newGraphName, setNewGraphName] = useState("");
    const [newProjectOpen, setNewProjectOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const handleEditGraph = (e: React.MouseEvent, graph: any) => {
        e.stopPropagation();
        setGraphToEdit(graph);
        setEditGraphOpen(true);
    };

    const handleDeleteGraph = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        trashGraph(id);
    };

    const handleRenameDoc = (e: React.MouseEvent, doc: any) => {
        e.stopPropagation();
        setDocToRename(doc);
        setRenameDocOpen(true);
    };

    const handleDeleteDoc = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        trashDoc(id);
    };

    const projectStorages = storages.filter(s => s.projectId === activeProjectId && !s.deleted);
    const projectDocs = docs.filter(d => d.projectId === activeProjectId && !d.deleted);
    const projectGraphs = graphs.filter(g => g.projectId === activeProjectId && !g.deleted);

    const handleCreateStorage = () => {
        if (!activeProjectId) return;
        setCreateStorageOpen(true);
    };

    const handleCreateStorageSubmit = (name: string, color: string, icon: string) => {
        if (activeProjectId) {
            addStorage(name, activeProjectId, color, icon);
        }
    };

    const handleEditStorageClick = (e: React.MouseEvent, storage: Storage) => {
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

    const handleDeleteStorage = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        deleteStorage(id);
    };

    const handleUpdateGraph = (name: string, color: string, icon: string) => {
        if (graphToEdit) {
            updateGraph(graphToEdit.id, { name, color, icon });
        }
    };

    const handleUpdateDoc = (name: string) => {
        if (docToRename) {
            updateDoc(docToRename.id, { name });
        }
    };

    const handleEditProjectName = () => {
        if (!activeProjectId) return;
        setEditProjectOpen(true);
    };

    const handleCreateProjectSubmit = () => {
        const name = newProjectName.trim();
        if (!name) return;
        const project = addProject(name);
        setActiveProject(project.id);
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
            const project = projects.find(p => p.id === activeProjectId);
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
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const text = await file.text();
            try {
                const data = JSON.parse(text) as ProjectExportData;
                if (!data.version || !data.project) throw new Error("Invalid project file");

                const importedData = importProject(data);

                useStore.setState(state => ({
                    projects: [...state.projects, importedData.project],
                    files: [...state.files, ...importedData.files],
                    collections: [...state.collections, ...importedData.collections],
                    timestamps: [...state.timestamps, ...importedData.timestamps],
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
        setNewDocName("");
        setNewDocOpen(true);
    };

    const handleCreateDocSubmit = () => {
        if (!activeProjectId) return;
        const name = newDocName.trim();
        if (!name) return;

        const newDoc = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            name,
            content: "<p>Start writing...</p>",
            created: Date.now(),
            lastModified: Date.now()
        };

        useStore.setState(state => ({
            docs: [...state.docs, newDoc],
            activeDocId: newDoc.id
        }));

        setNewDocOpen(false);
        setNewDocName("");
        navigate("/docs");
    };

    const handleSelectDoc = (id: string) => {
        useStore.setState({ activeDocId: id });
    };

    const handleCreateGraph = () => {
        if (!activeProjectId) return;
        setNewGraphName("");
        setNewGraphOpen(true);
    };

    const handleCreateGraphSubmit = () => {
        if (!activeProjectId) return;
        const name = newGraphName.trim();
        if (!name) return;

        const newGraph = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            name,
            created: Date.now(),
            lastModified: Date.now()
        };

        useStore.setState(state => ({
            graphs: [...state.graphs, newGraph],
            activeGraphId: newGraph.id
        }));

        setNewGraphOpen(false);
        setNewGraphName("");
        navigate("/graphs");
    };

    const handleSelectGraph = (id: string) => {
        useStore.setState({ activeGraphId: id });
    };

    // Ensure a valid storage is always selected
    useEffect(() => {
        if (activeProjectId && projectStorages.length > 0) {
            const isValid = projectStorages.some(s => s.id === activeStorageId);
            if (!isValid) {
                useStore.setState({ activeStorageId: projectStorages[0].id });
            }
        }
    }, [activeProjectId, activeStorageId, projectStorages]);

    const handleAddCollection = (e: React.MouseEvent) => {
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
            useStore.setState(state => ({
                collections: [...state.collections, newCollection],
                activeCollectionId: newCollection.id
            }));
            navigate('/collections');
        }
    };

    const handleEditCollectionClick = (e: React.MouseEvent, collection: Collection) => {
        e.preventDefault();
        e.stopPropagation();
        setCollectionToEdit(collection);
        setEditCollectionOpen(true);
    };

    const handleDeleteCollection = (e: React.MouseEvent, id: string) => {
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
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;

                const text = await file.text();
                try {
                    const data = JSON.parse(text) as ProjectExportData;
                    if (!data.version || !data.project) throw new Error("Invalid project file");

                    const importedData = importProject(data);

                    useStore.setState(state => ({
                        projects: [...state.projects, importedData.project],
                        files: [...state.files, ...importedData.files],
                        collections: [...state.collections, ...importedData.collections],
                        timestamps: [...state.timestamps, ...importedData.timestamps],
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


    return (
        <>
            <motion.aside
                initial={{ width: isSidebarCollapsed ? 0 : 280 }}
                animate={{ width: isSidebarCollapsed ? 0 : 280 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={cn(
                    "flex flex-col border-r border-border bg-sidebar h-full overflow-hidden shrink-0 z-20 relative",
                    isSidebarCollapsed && "pointer-events-none"
                )}
            >
                {/* Header */}
                <div className="flex items-center gap-2 p-3 h-12 border-b border-border/40 shrink-0 relative justify-center">
                    <button
                        onClick={toggleSidebarCollapse}
                        className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors absolute left-3"
                        title="Collapse sidebar"
                    >
                        <SidebarSimple weight="bold" size={18} />
                    </button>

                    {!isSidebarCollapsed && (
                        <motion.button
                            onClick={() => {
                                navigate('/');
                                setSidebarView('main');
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap hover:opacity-80 transition-opacity"
                        >
                            <img
                                src={whistlerLogo}
                                alt="Whistlerbox"
                                className="w-6 h-6 rounded-md"
                            />
                            <span className="font-bold text-lg tracking-tight truncate">Whistlerbox</span>
                        </motion.button>
                    )}

                    {!isSidebarCollapsed && (
                        <>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors absolute right-10"
                                        title="Change accent theme"
                                    >
                                        <span className="flex items-center justify-center">
                                            <span
                                                className="h-3 w-3 rounded-full border border-border/60 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                                                style={{ backgroundColor: "var(--primary)" }}
                                            />
                                        </span>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                    {ACCENT_OPTIONS.map((option) => (
                                        <DropdownMenuItem
                                            key={option.id}
                                            onClick={() => setAccentTheme(option.id)}
                                            className="flex items-center gap-2"
                                        >
                                            <span
                                                className={cn(
                                                    "h-3.5 w-3.5 rounded-full border border-border/60",
                                                    option.previewClass
                                                )}
                                            />
                                            <span className="flex-1 text-xs">{option.label}</span>
                                            {accentTheme === option.id && (
                                                <CheckCircle
                                                    weight="bold"
                                                    className="text-primary"
                                                    size={14}
                                                />
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <button
                                onClick={() => useStore.getState().setSpotlightOpen(true)}
                                className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors absolute right-3"
                            >
                                <MagnifyingGlass weight="bold" size={18} />
                            </button>
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
                                        className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 hover:text-foreground transition-colors w-full text-left"
                                    >
                                        <CaretDown weight="bold" className={cn("transition-transform text-xs", !projectsOpen && "-rotate-90")} />
                                        Project
                                    </button>
                                    
                                    <AnimatePresence initial={false}>
                                        {projectsOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="space-y-1 overflow-hidden"
                                            >
                                                <div className="flex gap-1 items-center pt-1">
                                        <Select value={activeProjectId || ""} onValueChange={handleProjectChange}>
                                            <SelectTrigger className="flex-1 h-8 bg-card border-border/60 shadow-sm">
                                                <SelectValue placeholder="Select Project" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {projects.map(p => (
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

                                    {/* Project Tools Row */}
                                <div className="flex gap-1">
                                         <Button 
                                            variant="outline" 
                                            className="flex-1 h-8 bg-card border-border/60 shadow-sm text-xs text-muted-foreground px-0 gap-1.5"
                                            onClick={() => setSidebarView('sync')}
                                            title="Sync"
                                         >
                                            <motion.span
                                                className="inline-flex items-center gap-1.5"
                                                animate={syncStatus === 'syncing' ? { rotate: 360 } : { rotate: 0 }}
                                                transition={syncStatus === 'syncing' ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0.2 }}
                                            >
                                                <ArrowsClockwise
                                                    className={cn(
                                                        "transition-colors",
                                                        syncStatus === 'syncing' ? "text-primary" : "text-muted-foreground"
                                                    )}
                                                />
                                                <span>Sync</span>
                                            </motion.span>
                                         </Button>
                                         <Button 
                                            variant="outline" 
                                            className="flex-1 h-8 bg-card border-border/60 shadow-sm text-xs text-muted-foreground px-0 gap-1.5"
                                            onClick={() => setSidebarView('history')}
                                            title="History"
                                         >
                                            <ClockCounterClockwise /> History
                                         </Button>
                                         <Button 
                                            variant="outline" 
                                            className="flex-1 h-8 bg-card border-border/60 shadow-sm text-xs text-muted-foreground px-0 gap-1.5"
                                            onClick={() => setSidebarView('trash')}
                                            title="Trash"
                                         >
                                            <Trash /> Trash
                                         </Button>
                                    </div>
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
                                        {(assetsOpen || isSidebarCollapsed) && (
                                            <motion.div
                                                initial={!isSidebarCollapsed ? { height: 0, opacity: 0 } : undefined}
                                                animate={!isSidebarCollapsed ? { height: "auto", opacity: 1 } : undefined}
                                                exit={!isSidebarCollapsed ? { height: 0, opacity: 0 } : undefined}
                                                className={cn("flex gap-1 overflow-hidden", isSidebarCollapsed ? "flex-col space-y-2" : "flex-row")}
                                            >
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
                                                    "flex items-center justify-center rounded-md transition-all duration-200 group relative cursor-pointer px-2",
                                                        isSidebarCollapsed
                                                            ? "w-10 h-10 mx-auto"
                                                            : "flex-1 h-9",
                                                        (location.pathname === "/storage" || location.pathname === "/")
                                                            ? "bg-primary/20 text-primary shadow-sm"
                                                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                                    )}
                                                >
                                                    <HardDrives
                                                        weight={(location.pathname === "/storage" || location.pathname === "/") ? "fill" : "regular"}
                                                        size={18}
                                                        className="transition-transform group-hover:scale-110"
                                                    />
                                                    {!isSidebarCollapsed && (
                                                        <span className="ml-2 text-xs font-medium tracking-tight">
                                                            Storage
                                                        </span>
                                                    )}
                                                </button>

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
                                                        "flex items-center justify-center rounded-md transition-all duration-200 group relative cursor-pointer px-2",
                                                        isSidebarCollapsed
                                                            ? "w-10 h-10 mx-auto"
                                                            : "flex-1 h-9",
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
                                                        {!isSidebarCollapsed && (
                                                            <span className="ml-2 text-xs font-medium tracking-tight">
                                                                Docs
                                                            </span>
                                                        )}
                                                </button>

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
                                                        "flex items-center justify-center rounded-md transition-all duration-200 group relative cursor-pointer px-2",
                                                        isSidebarCollapsed
                                                            ? "w-10 h-10 mx-auto"
                                                            : "flex-1 h-9",
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
                                                        {!isSidebarCollapsed && (
                                                            <span className="ml-2 text-xs font-medium tracking-tight">
                                                                Graphs
                                                            </span>
                                                        )}
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>


                                <Separator className="my-4 bg-border/40" />

                                {/* Collections Section */}
                                <div className="mb-6">
                                    {!isSidebarCollapsed && (
                                        <div className="flex items-center justify-between mb-2 px-1 group">
                                            <button
                                                onClick={() => setCollectionsOpen(!collectionsOpen)}
                                                className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                                            >
                                                <CaretDown weight="bold" className={cn("transition-transform text-xs", !collectionsOpen && "-rotate-90")} />
                                                Collections
                                            </button>
                                            <button
                                                onClick={handleAddCollection}
                                                className="text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Plus weight="bold" className="size-3.5" />
                                            </button>
                                        </div>
                                    )}

                                    <AnimatePresence initial={false}>
                                        {collectionsOpen && !isSidebarCollapsed && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="space-y-1 overflow-hidden"
                                            >
                                                {collections.filter(c => c.projectId === activeProjectId && !c.deleted).map(collection => {
                                                    const Icon = getIcon(collection.icon);
                                                    return (
                                                        <Link
                                                            key={collection.id}
                                                            to="/collections"
                                                            onClick={() => handleSelectCollection(collection.id)}
                                                            className="block w-full group/item"
                                                        >
                                                            <div className={cn(
                                                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative",
                                                                (activeCollectionId === collection.id && location.pathname.startsWith("/collections"))
                                                                    ? "bg-primary/20 text-primary font-medium"
                                                                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                                            )}>
                                                                <Icon
                                                                    className={cn("text-lg transition-colors")}
                                                                    weight="fill"
                                                                    style={{ color: (activeCollectionId === collection.id && location.pathname.startsWith("/collections")) ? undefined : collection.color }}
                                                                />
                                                                <span className="truncate flex-1">{collection.name}</span>

                                                                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={(e) => handleEditCollectionClick(e, collection)}
                                                                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                                                    >
                                                                        <PencilSimple weight="bold" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => handleDeleteCollection(e, collection.id)}
                                                                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                                                                    >
                                                                        <Trash weight="bold" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    )
                                                })}
                                                {collections.filter(c => c.projectId === activeProjectId && !c.deleted).length === 0 && (
                                                    <div className="px-3 py-4 text-xs text-muted-foreground/60 italic text-center border-2 border-dashed border-border/30 rounded-md">
                                                        No collections
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
                                    {projectDocs.map(doc => (
                                        <div
                                            key={doc.id}
                                            onClick={() => handleSelectDoc(doc.id)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
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
                                            <NotePencil 
                                                weight={activeDocId === doc.id ? "fill" : "regular"} 
                                                className="text-lg shrink-0 transition-colors"
                                            />
                                            <span className="truncate flex-1">{doc.name}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => handleRenameDoc(e, doc)}
                                                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                                >
                                                    <PencilSimple weight="bold" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteDoc(e, doc.id)}
                                                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash weight="bold" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

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
                                    {projectGraphs.map(graph => (
                                        <div
                                            key={graph.id}
                                            onClick={() => handleSelectGraph(graph.id)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
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
                                            <Graph 
                                                weight={activeGraphId === graph.id ? "fill" : "regular"} 
                                                className="text-lg shrink-0 transition-colors"
                                            />
                                            <span className="truncate flex-1">{graph.name}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => handleEditGraph(e, graph)}
                                                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                                >
                                                    <PencilSimple weight="bold" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteGraph(e, graph.id)}
                                                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash weight="bold" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

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
                                    {projectStorages.map(storage => {
                                        const Icon = storage.icon ? getIcon(storage.icon) : Folder;
                                        return (
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
                                                <Icon 
                                                    weight="regular" 
                                                    className={cn("text-lg shrink-0 transition-colors", !storage.color && "text-primary")}
                                                    style={{ color: storage.color }}
                                                />
                                                <span className="truncate flex-1">{storage.name}</span>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => handleEditStorageClick(e, storage)}
                                                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                                    >
                                                        <PencilSimple weight="bold" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteStorage(e, storage.id)}
                                                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash weight="bold" />
                                                    </button>
                                                </div>
                                            </button>
                                        );
                                    })}

                                    {projectStorages.length === 0 && (
                                        <div className="p-4 text-center text-xs text-muted-foreground/60 italic border-2 border-dashed border-border/30 rounded-md m-2">
                                            No storages created yet
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
                            <div className={cn("flex items-center gap-1", isSidebarCollapsed ? "flex-col justify-center" : "justify-between w-full")}>
                                {!isSidebarCollapsed ? (
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

                                <div className={cn("flex gap-1", isSidebarCollapsed && "flex-col")}>
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
            </motion.aside>

            {isSidebarCollapsed && (
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
            <RenameDocDialog
                open={renameDocOpen}
                onOpenChange={setRenameDocOpen}
                onSubmit={handleUpdateDoc}
                initialName={docToRename?.name || ""}
            />
            <EditProjectDialog
                open={editProjectOpen}
                onOpenChange={setEditProjectOpen}
                currentName={projects.find(p => p.id === activeProjectId)?.name || ""}
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

            <Dialog open={newDocOpen} onOpenChange={setNewDocOpen}>
                <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>New Document</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Enter a name for your new document.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-doc-name">Document Name</Label>
                            <Input
                                id="new-doc-name"
                                placeholder="My Document"
                                value={newDocName}
                                onChange={(e) => setNewDocName(e.target.value)}
                                autoFocus
                                className="bg-zinc-900 border-zinc-800"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewDocOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateDocSubmit} disabled={!newDocName.trim()}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={newGraphOpen} onOpenChange={setNewGraphOpen}>
                <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>New Graph</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Enter a name for your new graph.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-graph-name">Graph Name</Label>
                            <Input
                                id="new-graph-name"
                                placeholder="My Graph"
                                value={newGraphName}
                                onChange={(e) => setNewGraphName(e.target.value)}
                                autoFocus
                                className="bg-zinc-900 border-zinc-800"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewGraphOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateGraphSubmit} disabled={!newGraphName.trim()}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                onChange={(e) => setNewProjectName(e.target.value)}
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
