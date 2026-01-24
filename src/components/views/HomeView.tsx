import { useState } from "react"; // Ensure useState is imported
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
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { AddFileDialog, CreateStorageDialog } from "@/components/dialogs/StorageDialogs";
import { CreateCollectionDialog } from "@/components/dialogs/CollectionDialogs";
import { NewDocDialog, NewGraphDialog, NewProjectDialog } from "@/components/dialogs/CreationDialogs";

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
        activeStorageId,
        setState 
    } = useStore();
    
    const navigate = useNavigate();

    const [addFileOpen, setAddFileOpen] = useState(false);
    const [addCollectionOpen, setAddCollectionOpen] = useState(false);
    const [addDocOpen, setAddDocOpen] = useState(false);
    const [addGraphOpen, setAddGraphOpen] = useState(false);
    const [addStorageOpen, setAddStorageOpen] = useState(false);
    const [addProjectOpen, setAddProjectOpen] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);

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
                useStore.setState(state => ({ 
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
            order: files.filter(f => f.projectId === activeProjectId && !f.parentId).length,
            created: Date.now(),
            lastModified: Date.now()
        };
        useStore.setState(state => ({ files: [...state.files, newFile] }));
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
        useStore.setState(state => ({ 
            collections: [...state.collections, newCollection],
            activeCollectionId: newCollection.id 
        }));
        setPopoverOpen(false);
        navigate('/collections');
    };

    const handleCreateDoc = (name: string) => {
        if (!activeProjectId) return;
        const newDoc: Doc = {
            id: crypto.randomUUID(),
            projectId: activeProjectId,
            name,
            content: "",
            created: Date.now(),
            lastModified: Date.now()
        };
        useStore.setState(state => ({ 
            docs: [...state.docs, newDoc],
            activeDocId: newDoc.id 
        }));
        setPopoverOpen(false);
        navigate('/docs');
    };

    const handleCreateGraph = (name: string) => {
        if (!activeProjectId) return;
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
        const projectStorage = storages.find(s => s.projectId === newProject.id);
        
        useStore.setState({ 
            activeProjectId: newProject.id,
            activeStorageId: projectStorage?.id || null 
        });
        setPopoverOpen(false);
    };

    const username = user?.email?.split('@')[0] || "User";

    // Filter items for current project
    const projectFiles = files.filter(f => f.projectId === activeProjectId && !f.deleted);
    const projectDocs = docs.filter(d => d.projectId === activeProjectId && !d.deleted);
    const projectCollections = collections.filter(c => c.projectId === activeProjectId && !c.deleted);
    const projectGraphs = (useStore.getState().graphs || []).filter(g => g.projectId === activeProjectId);

    // Recent Highlights logic
    const projectFileIds = new Set(projectFiles.map(f => f.id));
    const projectHighlights = highlights
        .filter(h => projectFileIds.has(h.fileId));

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
        ...projectFiles.map(f => ({
            id: f.id,
            type: 'file' as const,
            subType: f.type,
            name: f.name,
            timestamp: f.lastModified,
            data: f
        })),
        ...projectDocs.map(d => ({
            id: d.id,
            type: 'doc' as const,
            name: d.name,
            timestamp: d.lastModified || d.created,
            data: d
        })),
        ...projectCollections.map(c => ({
            id: c.id,
            type: 'collection' as const,
            name: c.name,
            timestamp: c.lastModified,
            data: c
        })),
        ...projectGraphs.map(g => ({
            id: g.id,
            type: 'graph' as const,
            name: g.name,
            timestamp: g.lastModified || g.created,
            data: g
        })),
        ...projectHighlights.map(h => {
            const file = files.find(f => f.id === h.fileId);
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
        switch (item.type) {
            case 'file': return getFileIcon(item.subType as any);
            case 'doc': return FileText;
            case 'collection': return Folder;
            case 'graph': return Graph;
            case 'highlight': return Clock;
        }
    };

    const getItemLabel = (type: string) => {
        switch (type) {
            case 'file': return 'File';
            case 'doc': return 'Doc';
            case 'collection': return 'Collection';
            case 'graph': return 'Graph';
            case 'highlight': return 'Highlight';
            default: return type;
        }
    };

    const handleItemClick = (item: typeof allItems[0]) => {
        switch (item.type) {
            case 'file':
                navigate(`/file/${item.id}`);
                break;
            case 'doc':
                setState({ activeDocId: item.id });
                navigate('/docs');
                break;
            case 'collection':
                setState({ activeCollectionId: item.id });
                navigate('/collections');
                break;
            case 'graph':
                setState({ activeGraphId: item.id });
                navigate('/graphs');
                break;
            case 'highlight':
                if (item.data.file) {
                    navigate(`/file/${item.data.file.id}`);
                }
                break;
        }
    };

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center gap-4 p-8 pb-4 shrink-0">
                <img 
                    src={LOGO_MAP[accentTheme || 'orange']}
                    alt="Whistlerbox Logo" 
                    className="w-12 h-12 rounded-xl pointer-events-none select-none shadow-sm"
                />
                <h1 className="text-2xl font-semibold tracking-tight text-foreground flex-1">
                    {getGreeting(username)}
                </h1>
                
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
                                const Icon = getItemIcon(item);
                                const label = getItemLabel(item.type);
                                
                                return (
                                    <button
                                        key={`${item.type}-${item.id}`}
                                        onClick={() => handleItemClick(item)}
                                        className="group flex flex-col items-start gap-3 p-4 rounded-lg border border-border/40 bg-card/50 hover:bg-accent/50 hover:border-accent/50 transition-all text-left overflow-hidden h-full"
                                    >
                                        <div className="flex items-center justify-between w-full gap-2">
                                            <div className="p-2 shrink-0 rounded-md bg-background/50 text-muted-foreground group-hover:text-primary transition-colors">
                                                <Icon weight="duotone" className="w-5 h-5" style={item.type === 'collection' ? { color: item.data.color } : undefined} />
                                            </div>
                                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-background/50 text-muted-foreground">
                                                {label}
                                            </span>
                                        </div>
                                        
                                        <div className="w-full min-w-0 flex-1 flex flex-col justify-between gap-2">
                                            <div>
                                                <div className="font-medium text-sm truncate group-hover:text-foreground transition-colors" title={item.name}>
                                                    {item.name}
                                                </div>
                                                {item.type === 'highlight' && item.data.file && (
                                                    <div className="text-xs text-muted-foreground/70 truncate mt-0.5">
                                                        in {item.data.file.name}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground/70 truncate pt-2 border-t border-border/20 w-full">
                                                {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                                            </div>
                                        </div>
                                    </button>
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
        </div>
    );
}
