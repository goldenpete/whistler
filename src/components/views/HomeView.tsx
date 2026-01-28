import { useState } from "react";
import { useStore } from "@/store/useStore";
import whistlerLogoOrange from "../../../whistlerlogo.png";
import whistlerLogoEmerald from "../../../whistlerlogo-emerald.png";
import whistlerLogoSky from "../../../whistlerlogo-sky.png";
import whistlerLogoViolet from "../../../whistlerlogo-violet.png";
import type { AccentTheme, File, Doc, Collection } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { 
    FileText, 
    Folder, 
    File as FileIcon, 
    FilmStrip, 
    Image as ImageIcon,
    MusicNote,
    FilePdf,
    Clock,
    Plus,
    Graph,
    HardDrives,
    Tag,
    NotePencil,
    ProjectorScreenChart
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
import { AddFileDialog, RenameFileDialog, EditDocDialog, EditFolderDialog, EditGraphDialog, CreateStorageDialog, ICONS } from "@/components/dialogs/StorageDialogs";
import { CreateCollectionDialog } from "@/components/dialogs/CollectionDialogs";
import { NewDocDialog, NewGraphDialog, NewProjectDialog } from "@/components/dialogs/CreationDialogs";
import { MoveFileDialog } from "@/components/dialogs/MoveFileDialog";
import { ColorPickerDialog } from "@/components/dialogs/ColorPickerDialog";
import { QuickAccessDialog } from "@/components/dialogs/QuickAccessDialog";
import type { QuickAccessType } from "@/components/dialogs/QuickAccessDialog";
import { FileContextMenu } from "@/components/views/StorageView";
import { Copy, Trash, ArrowSquareOut, PencilSimple, Lightning } from "@phosphor-icons/react";

const LOGO_MAP: Record<AccentTheme, string> = {
    orange: whistlerLogoOrange,
    emerald: whistlerLogoEmerald,
    sky: whistlerLogoSky,
    violet: whistlerLogoViolet,
};

function getGreeting(username: string) {
    const hour = new Date().getHours();
    let greeting = "";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 17) greeting = "Good afternoon";
    else if (hour < 22) greeting = "Good evening";
    else greeting = "Good night";
    
    return `${greeting}, ${username}`;
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

export default function HomeView() {
    const { 
        accentTheme, 
        user, 
        files, 
        docs, 
        collections, 
        highlights,
        storages,
        activeProjectId,
        activeStorageId
    } = useStore();
    
    const navigate = useNavigate();

    const [addFileOpen, setAddFileOpen] = useState(false);
    const [addCollectionOpen, setAddCollectionOpen] = useState(false);
    const [addDocOpen, setAddDocOpen] = useState(false);
    const [addGraphOpen, setAddGraphOpen] = useState(false);
    const [addStorageOpen, setAddStorageOpen] = useState(false);
    const [addProjectOpen, setAddProjectOpen] = useState(false);
    
    // Quick Access State
    const [quickAccessOpen, setQuickAccessOpen] = useState(false);
    const [quickAccessType, setQuickAccessType] = useState<QuickAccessType | null>(null);
    const [quickAccessPopoverOpen, setQuickAccessPopoverOpen] = useState(false);
    
    // Rename/Edit Dialog States
    const [renameItem, setRenameItem] = useState<{id: string, type: string, name: string, data?: any} | null>(null);
    const [renameFileOpen, setRenameFileOpen] = useState(false);
    const [renameDocOpen, setRenameDocOpen] = useState(false);
    const [editCollectionOpen, setEditCollectionOpen] = useState(false);
    const [renameGraphOpen, setRenameGraphOpen] = useState(false);

    // Storage Dialog States
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [colorPickerDialogOpen, setColorPickerDialogOpen] = useState(false);
    const [fileToMove, setFileToMove] = useState<File | null>(null);
    const [fileToColor, setFileToColor] = useState<File | null>(null);

    const handleMoveInit = (file: File) => {
        setFileToMove(file);
        setMoveDialogOpen(true);
    };

    const handleColorInit = (file: File) => {
        setFileToColor(file);
        setColorPickerDialogOpen(true);
    };

    const [popoverOpen, setPopoverOpen] = useState(false);

    const handleAddFile = (url: string, name: string) => {
        if (!activeProjectId) return;

        let targetStorageId = activeStorageId;
        if (!targetStorageId) {
            const projectStorages = storages.filter((s: any) => s.projectId === activeProjectId);
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
                useStore.setState((state: any) => ({ 
                    storages: [...state.storages, newStorage],
                    activeStorageId: newStorage.id 
                }));
                targetStorageId = newStorage.id;
            }
        }

        const type = getFileTypeFromUrl(url);
        const newFile: File = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            storageId: targetStorageId,
            parentId: null,
            name,
            url,
            type,
            order: files.filter((f: File) => f.projectId === activeProjectId && !f.parentId).length,
            created: Date.now(),
            lastModified: Date.now()
        };
        useStore.setState((state: any) => ({ files: [...state.files, newFile] }));
        setPopoverOpen(false);
        navigate(`/file/${newFile.id}`);
    };

    const handleCreateCollection = (name: string, color: string, icon: string) => {
        if (!activeProjectId) return;
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
        setPopoverOpen(false);
        navigate('/collections');
    };

    const handleCreateDoc = (name: string, color: string, icon: string) => {
        if (!activeProjectId) return;
        useStore.getState().addDoc(name, activeProjectId, color, icon);
        setPopoverOpen(false);
        navigate('/docs');
    };

    const handleCreateGraph = (name: string, color: string, icon: string) => {
        if (!activeProjectId) return;
        useStore.getState().addGraph(name, activeProjectId, color, icon);
        setPopoverOpen(false);
        navigate('/graphs');
    };

    const handleCreateStorage = (name: string, color: string, icon: string) => {
        if (!activeProjectId) return;
        useStore.getState().addStorage(name, activeProjectId, color, icon);
        setPopoverOpen(false);
        navigate('/storage');
    };

    const handleCreateProject = (name: string) => {
        const newProject = useStore.getState().addProject(name);
        const storages = useStore.getState().storages;
        const projectStorage = storages.find((s: any) => s.projectId === newProject.id);
        
        useStore.setState({ 
            activeProjectId: newProject.id,
            activeStorageId: projectStorage?.id || null 
        });
        setPopoverOpen(false);
    };

    const username = user?.email?.split('@')[0] || "User";

    // Filter items for current project
    const projectFiles = files.filter((f: File) => f.projectId === activeProjectId && !f.deleted);
    const projectDocs = docs.filter((d: Doc) => d.projectId === activeProjectId && !d.deleted);
    const projectCollections = collections.filter((c: Collection) => c.projectId === activeProjectId && !c.deleted);
    const projectGraphs = (useStore.getState().graphs || []).filter((g: any) => g.projectId === activeProjectId);

    // Recent Highlights logic
    const projectFileIds = new Set(projectFiles.map((f: File) => f.id));
    const projectHighlights = highlights
        .filter((h: any) => projectFileIds.has(h.fileId));

    const formatHighlightLabel = (h: any, file?: any) => {
        if (file?.type === 'pdf') {
            return h.end && h.end !== h.start ? `Page ${h.start}-${h.end}` : `Page ${h.start}`;
        }
        const formatTime = (seconds: number) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };
        return `${formatTime(h.start)} - ${formatTime(h.end || h.start)}`;
    };

    const getFileIcon = (type: File['type']) => {
        switch (type) {
            case 'video': return FilmStrip;
            case 'image': return ImageIcon;
            case 'audio': return MusicNote;
            case 'pdf': return FilePdf;
            case 'folder': return Folder;
            default: return FileIcon;
        }
    };

    // Unify all items
    const allItems = [
        ...projectFiles.map((f: File) => ({
            id: f.id,
            type: 'file' as const,
            subType: f.type,
            name: f.name,
            timestamp: Math.max(f.lastModified, f.lastViewed || 0),
            data: f
        })),
        ...projectDocs.map((d: Doc) => ({
            id: d.id,
            type: 'doc' as const,
            name: d.name,
            timestamp: Math.max(d.lastModified || d.created, d.lastViewed || 0),
            data: d
        })),
        ...projectCollections.map((c: Collection) => ({
            id: c.id,
            type: 'collection' as const,
            name: c.name,
            timestamp: Math.max(c.lastModified, c.lastViewed || 0),
            data: c
        })),
        ...projectGraphs.map((g: any) => ({
            id: g.id,
            type: 'graph' as const,
            name: g.name,
            timestamp: Math.max(g.lastModified || g.created, g.lastViewed || 0),
            data: g
        })),
        ...projectHighlights.map((h: any) => {
            const file = files.find((f: File) => f.id === h.fileId);
            const label = formatHighlightLabel(h, file);
            return {
                id: h.id,
                type: 'highlight' as const,
                name: h.note || label,
                timestamp: h.created || 0,
                data: { ...h, file }
            };
        })
    ].sort((a, b) => b.timestamp - a.timestamp);

    const getItemIcon = (item: typeof allItems[0]) => {
        if ((item.type === 'collection' || item.type === 'doc' || item.type === 'graph') && item.data.icon) {
            const customIcon = ICONS.find(i => i.name === item.data.icon)?.icon;
            if (customIcon) return customIcon;
        }

        switch (item.type) {
            case 'file': return getFileIcon(item.subType as any);
            case 'doc': return FileText;
            case 'collection': return Tag;
            case 'graph': return Graph;
            case 'highlight': return Clock;
        }
    };

    const getItemLabel = (item: typeof allItems[0]) => {
        switch (item.type) {
            case 'file':
                return item.subType === 'folder' ? 'Folder' : 'File';
            case 'doc':
                return 'Doc';
            case 'collection':
                return 'Collection';
            case 'graph':
                return 'Graph';
            case 'highlight':
                return 'Highlight';
            default:
                return 'Unknown';
        }
    };

    const handleItemClick = (item: typeof allItems[0]) => {
        switch (item.type) {
            case 'file':
                if (item.subType === 'folder') {
                    navigate(`/storage?folderId=${item.id}`);
                } else {
                    useStore.getState().setActiveFile(item.id);
                    navigate(`/file/${item.id}`);
                }
                break;
            case 'doc':
                useStore.getState().setActiveDoc(item.id);
                navigate('/docs');
                break;
            case 'collection':
                useStore.getState().setActiveCollection(item.id);
                navigate('/collections');
                break;
            case 'graph':
                useStore.getState().setActiveGraph(item.id);
                navigate('/graphs');
                break;
            case 'highlight':
                if (item.data.file) {
                    useStore.getState().setActiveFile(item.data.file.id);
                    navigate(`/file/${item.data.file.id}`);
                }
                break;
        }
    };

    const handleRename = (name: string, description?: string, color?: string, icon?: string) => {
        if (!renameItem) return;

        const { id, type } = renameItem;
        
        switch (type) {
            case 'file':
                useStore.getState().updateFile(id, { name, description });
                break;
            case 'doc':
                if (color || icon) {
                    useStore.getState().updateDoc(id, { name, color, icon });
                } else {
                    useStore.getState().updateDoc(id, { name });
                }
                break;
            case 'collection':
                if (color && icon) {
                    useStore.getState().updateCollection(id, { name, color, icon });
                }
                break;
            case 'graph':
                if (color || icon) {
                    useStore.getState().updateGraph(id, { name, color, icon });
                } else {
                    useStore.getState().updateGraph(id, { name });
                }
                break;
        }
        
        setRenameItem(null);
    };

    const handleDelete = (item: typeof allItems[0]) => {
        switch (item.type) {
            case 'file':
                useStore.getState().trashFile(item.id);
                break;
            case 'doc':
                useStore.getState().trashDoc(item.id);
                break;
            case 'collection':
                useStore.getState().trashCollection(item.id);
                break;
            case 'graph':
                useStore.getState().trashGraph(item.id);
                break;
            case 'highlight':
                useStore.getState().removeHighlight(item.id);
                break;
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        // Toast logic here if we had toast
    };

    const openRenameDialog = (item: typeof allItems[0]) => {
        setRenameItem(item);
        switch (item.type) {
            case 'file':
                setRenameFileOpen(true);
                break;
            case 'doc':
                setRenameDocOpen(true);
                break;
            case 'collection':
                setEditCollectionOpen(true);
                break;
            case 'graph':
                setRenameGraphOpen(true);
                break;
        }
    };

    const CardPreview = ({ item }: { item: typeof allItems[0] }) => {
        // Image File
        if (item.type === 'file' && item.subType === 'image' && item.data.url) {
            return (
                <div className="absolute inset-0 bg-black/20">
                    <img 
                        src={item.data.url} 
                        alt="" 
                        className="w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105" 
                        onContextMenu={(e: any) => e.preventDefault()}
                    />
                </div>
            );
        }
        
        // Video File
        if (item.type === 'file' && item.subType === 'video' && item.data.url) {
            return (
                <div className="absolute inset-0 bg-black/20">
                    <video
                        src={item.data.url + "#t=0.1"}
                        className="w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
                        muted
                        loop
                        playsInline
                        onMouseOver={(e: any) => e.currentTarget.play()}
                        onMouseOut={(e: any) => e.currentTarget.pause()}
                        onContextMenu={(e: any) => e.preventDefault()}
                    />
                </div>
            );
        }

        // PDF File
        if (item.type === 'file' && item.subType === 'pdf') {
            return (
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] rotate-12 scale-150 pointer-events-none">
                    <FilePdf size={200} weight="fill" />
                </div>
            );
        }

        // Audio File
        if (item.type === 'file' && item.subType === 'audio') {
            return (
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] scale-150 pointer-events-none">
                    <MusicNote size={200} weight="fill" />
                </div>
            );
        }

        // Doc
        if (item.type === 'doc') {
            const text = item.data.content?.replace(/<[^>]*>/g, '') || '';
            return (
                <>
                    {item.data.color && (
                        <div 
                            className="absolute inset-0 opacity-[0.08]"
                            style={{ backgroundColor: item.data.color }}
                        />
                    )}
                    <div 
                        className="absolute inset-0 flex items-center justify-center opacity-[0.06] scale-150 pointer-events-none"
                        style={item.data.color ? { color: item.data.color } : undefined}
                    >
                        <NotePencil size={180} weight="fill" />
                    </div>
                    <div 
                        className="absolute inset-0 p-6 text-[10px] text-foreground/20 font-mono break-words leading-relaxed overflow-hidden select-none pointer-events-none"
                        style={{ maskImage: 'linear-gradient(to bottom, black 50%, transparent)' }}
                    >
                        {text.slice(0, 1000)}
                    </div>
                </>
            );
        }

        // Collection
        if (item.type === 'collection') {
            return (
                <>
                    <div 
                        className="absolute inset-0 opacity-[0.08]"
                        style={{ backgroundColor: item.data.color }}
                    />
                    <div 
                        className="absolute inset-0 flex items-center justify-center opacity-[0.08] scale-150 pointer-events-none"
                        style={{ color: item.data.color }}
                    >
                        <Tag size={180} weight="fill" />
                    </div>
                </>
            );
        }

        // Graph
        if (item.type === 'graph') {
            return (
                <>
                    {item.data.color && (
                        <div 
                            className="absolute inset-0 opacity-[0.08]"
                            style={{ backgroundColor: item.data.color }}
                        />
                    )}
                    <div 
                        className="absolute inset-0 flex items-center justify-center opacity-[0.03] scale-150 pointer-events-none"
                        style={item.data.color ? { color: item.data.color, opacity: 0.05 } : undefined}
                    >
                        <Graph size={200} weight="fill" />
                    </div>
                </>
            );
        }

        // Highlight
        if (item.type === 'highlight') {
            const file = item.data.file;
            
            if (file?.url && (file.type === 'video' || file.type === 'image')) {
                if (file.type === 'image') {
                    return (
                        <div className="absolute inset-0 bg-black/20">
                            <img 
                                src={file.url} 
                                alt="" 
                                className="w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105" 
                                onContextMenu={(e: any) => e.preventDefault()}
                            />
                        </div>
                    );
                }
                
                if (file.type === 'video') {
                    return (
                        <div className="absolute inset-0 bg-black/20">
                            <video
                                src={`${file.url}#t=${item.data.start || 0.1}`}
                                className="w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
                                muted
                                loop
                                playsInline
                                onMouseOver={(e: any) => e.currentTarget.play()}
                                onMouseOut={(e: any) => e.currentTarget.pause()}
                                onContextMenu={(e: any) => e.preventDefault()}
                            />
                        </div>
                    );
                }
            }

            return (
                <div className="absolute -top-4 -left-4 text-[120px] leading-none opacity-[0.03] font-serif pointer-events-none">
                    “
                </div>
            );
        }

        // Folder
        if (item.type === 'file' && item.subType === 'folder') {
            return (
                <>
                    {item.data.color && (
                        <div 
                            className="absolute inset-0 opacity-[0.08]"
                            style={{ backgroundColor: item.data.color }}
                        />
                    )}
                    <div 
                        className="absolute inset-0 flex items-center justify-center opacity-[0.08] scale-150 pointer-events-none"
                        style={item.data.color ? { color: item.data.color } : undefined}
                    >
                        <Folder size={180} weight="fill" />
                    </div>
                </>
            );
        }

        return null;
    };

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center gap-4 p-8 pb-4 shrink-0">
                <img 
                    src={LOGO_MAP[(accentTheme as AccentTheme) || 'orange']}
                    alt="Whistlerbox Logo" 
                    className="w-12 h-12 rounded-xl pointer-events-none select-none shadow-sm"
                />
                <h1 className="text-2xl font-semibold tracking-tight text-foreground flex-1">
                    {getGreeting(username)}
                </h1>
                
                <Popover open={quickAccessPopoverOpen} onOpenChange={setQuickAccessPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Lightning weight="bold" />
                            Quick Access
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="end">
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setQuickAccessType('file'); setQuickAccessOpen(true); setQuickAccessPopoverOpen(false); }}>
                            <FileIcon className="text-muted-foreground" size={16} /> Files
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setQuickAccessType('highlight'); setQuickAccessOpen(true); setQuickAccessPopoverOpen(false); }}>
                            <Clock className="text-muted-foreground" size={16} /> Highlights
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setQuickAccessType('collection'); setQuickAccessOpen(true); setQuickAccessPopoverOpen(false); }}>
                            <Tag className="text-muted-foreground" size={16} /> Collections
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setQuickAccessType('doc'); setQuickAccessOpen(true); setQuickAccessPopoverOpen(false); }}>
                            <NotePencil className="text-muted-foreground" size={16} /> Docs
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setQuickAccessType('graph'); setQuickAccessOpen(true); setQuickAccessPopoverOpen(false); }}>
                            <Graph className="text-muted-foreground" size={16} /> Graphs
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setQuickAccessType('storage'); setQuickAccessOpen(true); setQuickAccessPopoverOpen(false); }}>
                            <HardDrives className="text-muted-foreground" size={16} /> Storages
                        </Button>
                        <div className="h-px bg-border my-1" />
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setQuickAccessType('project'); setQuickAccessOpen(true); setQuickAccessPopoverOpen(false); }}>
                            <ProjectorScreenChart className="text-muted-foreground" size={16} /> Projects
                        </Button>
                    </PopoverContent>
                </Popover>
                
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button className="gap-2">
                            <Plus weight="bold" />
                            Add
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="end">
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setAddFileOpen(true); setPopoverOpen(false); }}>
                            <FileIcon className="text-muted-foreground" size={16} /> Add File
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setAddCollectionOpen(true); setPopoverOpen(false); }}>
                            <Tag className="text-muted-foreground" size={16} /> Add Collection
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setAddDocOpen(true); setPopoverOpen(false); }}>
                            <NotePencil className="text-muted-foreground" size={16} /> Add Doc
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setAddGraphOpen(true); setPopoverOpen(false); }}>
                            <Graph className="text-muted-foreground" size={16} /> Add Graph
                        </Button>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setAddStorageOpen(true); setPopoverOpen(false); }}>
                            <HardDrives className="text-muted-foreground" size={16} /> Add Storage
                        </Button>
                        <div className="h-px bg-border my-1" />
                        <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 font-normal" onClick={() => { setAddProjectOpen(true); setPopoverOpen(false); }}>
                            <ProjectorScreenChart className="text-muted-foreground" size={16} /> Add Project
                        </Button>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-auto p-8 pt-4">
                <div className="space-y-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-2 text-muted-foreground mb-4">
                        <Clock className="w-4 h-4" />
                        <h2 className="text-sm font-medium uppercase tracking-wider">Recent Activity</h2>
                    </div>
                    
                    {allItems.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {allItems.slice(0, 50).map(item => {
                                const Icon = getItemIcon(item) || FileIcon;
                                const label = getItemLabel(item);
                                
                                return (
                                    <ContextMenu key={`${item.type}-${item.id}`}>
                                        <ContextMenuTrigger asChild>
                                            <button
                                                onClick={() => handleItemClick(item)}
                                                className="group relative flex flex-col items-start justify-end gap-3 p-4 rounded-xl border border-border/40 bg-card/30 hover:bg-card/50 hover:border-accent/50 transition-all text-left overflow-hidden h-48 shadow-sm"
                                            >
                                                {/* Background Preview */}
                                                <CardPreview item={item} />
                                                
                                                {/* Gradient Overlay for Text Readability */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent z-10" />

                                                {/* Content Layer */}
                                                <div className="relative z-20 w-full flex flex-col h-full">
                                                    <div className="flex items-center justify-between w-full gap-2 mb-auto">
                                                        <div className="p-2 shrink-0 rounded-md bg-background/80 backdrop-blur-sm text-muted-foreground group-hover:text-primary transition-colors shadow-sm">
                                                            <Icon weight="duotone" className="w-5 h-5" style={item.data.color ? { color: item.data.color } : undefined} />
                                                        </div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm text-muted-foreground/80 shadow-sm border border-border/20">
                                                            {label}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="w-full min-w-0 flex flex-col gap-1 mt-4">
                                                        <div className="font-semibold text-sm truncate leading-tight group-hover:text-primary transition-colors" title={item.name}>
                                                            {item.name}
                                                        </div>
                                                        {item.type === 'highlight' && item.data.file && (
                                                            <div className="text-xs text-muted-foreground/80 truncate">
                                                                in {item.data.file.name}
                                                            </div>
                                                        )}
                                                        <div className="text-[11px] text-muted-foreground/60 truncate pt-2 mt-1 border-t border-border/10 w-full font-medium">
                                                            {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        </ContextMenuTrigger>
                                        {item.type === 'file' ? (
                                            <FileContextMenu 
                                                file={item.data}
                                                onRename={() => openRenameDialog(item)}
                                                onMove={() => handleMoveInit(item.data)}
                                                onSelect={() => {}} 
                                                onColor={() => handleColorInit(item.data)}
                                            />
                                        ) : (
                                            <ContextMenuContent>
                                                <ContextMenuItem onClick={() => handleItemClick(item)}>
                                                    <ArrowSquareOut className="mr-2 h-4 w-4" />
                                                    Open
                                                </ContextMenuItem>
                                                
                                                {item.type === 'highlight' ? (
                                                    <>
                                                        <ContextMenuItem onClick={() => handleCopy(item.data.text || item.data.note)}>
                                                            <Copy className="mr-2 h-4 w-4" />
                                                            Copy Text
                                                        </ContextMenuItem>
                                                    </>
                                                ) : (
                                                    <ContextMenuItem onClick={() => openRenameDialog(item)}>
                                                        <PencilSimple className="mr-2 h-4 w-4" />
                                                        Rename
                                                    </ContextMenuItem>
                                                )}
                                                
                                                <ContextMenuSeparator />
                                                
                                                <ContextMenuItem 
                                                    className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                                    onClick={() => handleDelete(item)}
                                                >
                                                    <Trash className="mr-2 h-4 w-4" />
                                                    Move to Trash
                                                </ContextMenuItem>
                                            </ContextMenuContent>
                                        )}
                                    </ContextMenu>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-muted-foreground/50 italic">
                            No recent activity found
                        </div>
                    )}
                </div>

            </div>
            <AddFileDialog
                open={addFileOpen}
                onOpenChange={setAddFileOpen}
                onSubmit={handleAddFile}
            />
            <CreateCollectionDialog
                open={addCollectionOpen}
                onOpenChange={setAddCollectionOpen}
                onSubmit={handleCreateCollection}
            />
            <NewDocDialog
                open={addDocOpen}
                onOpenChange={setAddDocOpen}
                onSubmit={handleCreateDoc}
            />
            <NewGraphDialog
                open={addGraphOpen}
                onOpenChange={setAddGraphOpen}
                onSubmit={handleCreateGraph}
            />
            <CreateStorageDialog
                open={addStorageOpen}
                onOpenChange={setAddStorageOpen}
                onSubmit={handleCreateStorage}
            />
            <NewProjectDialog
                open={addProjectOpen}
                onOpenChange={setAddProjectOpen}
                onSubmit={handleCreateProject}
            />

            <QuickAccessDialog
                open={quickAccessOpen}
                onOpenChange={setQuickAccessOpen}
                type={quickAccessType}
            />

            {/* Rename/Edit Dialogs */}
            {renameItem && (
                <>
                    <RenameFileDialog
                        open={renameFileOpen}
                        onOpenChange={setRenameFileOpen}
                        onSubmit={(name, description) => handleRename(name, description)}
                        initialName={renameItem.name}
                        initialDescription={renameItem.data.description}
                    />
                    <EditDocDialog
                        open={renameDocOpen}
                        onOpenChange={setRenameDocOpen}
                        onSubmit={(name, color, icon) => handleRename(name, undefined, color, icon)}
                        initialName={renameItem.name}
                        initialColor={renameItem.data.color}
                        initialIcon={renameItem.data.icon}
                    />
                    <EditFolderDialog
                        open={editCollectionOpen}
                        onOpenChange={setEditCollectionOpen}
                        onSubmit={(name, description, color, icon) => handleRename(name, undefined, color, icon)}
                        initialName={renameItem.name}
                        initialColor={renameItem.data.color}
                        initialIcon={renameItem.data.icon}
                    />
                    <EditGraphDialog
                        open={renameGraphOpen}
                        onOpenChange={setRenameGraphOpen}
                        onSubmit={(name, color, icon) => handleRename(name, undefined, color, icon)}
                        initialName={renameItem.name}
                        initialColor={renameItem.data.color}
                        initialIcon={renameItem.data.icon}
                    />
                    <MoveFileDialog
                        open={moveDialogOpen}
                        onOpenChange={setMoveDialogOpen}
                        fileIds={fileToMove ? [fileToMove.id] : []}
                    />
                    <ColorPickerDialog
                        open={colorPickerDialogOpen}
                        onOpenChange={setColorPickerDialogOpen}
                        initialColor={fileToColor?.color || "#ffffff"}
                        onColorSelect={(color) => {
                            if (fileToColor) {
                                useStore.setState((state: any) => ({
                                    files: state.files.map((f: File) => f.id === fileToColor.id ? { ...f, color, lastModified: Date.now() } : f)
                                }));
                            }
                        }}
                    />
                </>
            )}
        </div>
    );
}
