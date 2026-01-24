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
        useStore.setState(state => ({ collections: [...state.collections, newCollection] }));
        setPopoverOpen(false);
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
        useStore.setState(state => ({ docs: [...state.docs, newDoc] }));
        setPopoverOpen(false);
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
        useStore.setState(state => ({ graphs: [...state.graphs, newGraph] }));
        setPopoverOpen(false);
    };

    const handleCreateStorage = (name: string, color: string, icon: string) => {
        if (!activeProjectId) return;
        useStore.getState().addStorage(name, activeProjectId, color, icon);
        setPopoverOpen(false);
    };

    const handleCreateProject = (name: string) => {
        useStore.getState().addProject(name);
        setPopoverOpen(false);
    };

    const username = user?.email?.split('@')[0] || "User";

    // Filter items for current project
    const projectFiles = files.filter(f => f.projectId === activeProjectId && !f.deleted);
    const projectDocs = docs.filter(d => d.projectId === activeProjectId && !d.deleted);
    const projectCollections = collections.filter(c => c.projectId === activeProjectId && !c.deleted);

    // Get recent items (top 5)
    const recentFiles = [...projectFiles]
        .sort((a, b) => b.lastModified - a.lastModified)
        .slice(0, 5);
        
    const recentDocs = [...projectDocs]
        .sort((a, b) => (b.lastModified || b.created) - (a.lastModified || a.created))
        .slice(0, 5);
        
    const recentCollections = [...projectCollections]
        .sort((a, b) => b.lastModified - a.lastModified)
        .slice(0, 5);

    // Recent Highlights logic
    const projectFileIds = new Set(projectFiles.map(f => f.id));
    const recentHighlights = highlights
        .filter(h => projectFileIds.has(h.fileId))
        .sort((a, b) => (b.created || 0) - (a.created || 0))
        .slice(0, 5);

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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl">
                    
                    {/* Recent Files Column */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <FileIcon className="w-4 h-4" />
                            <h2 className="text-sm font-medium uppercase tracking-wider">Recent Files</h2>
                        </div>
                        {recentFiles.length > 0 ? (
                            <div className="grid gap-2">
                                {recentFiles.map(file => {
                                    const Icon = getFileIcon(file.type);
                                    return (
                                        <Link 
                                            key={file.id} 
                                            to={`/file/${file.id}`}
                                            className="group flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/50 hover:bg-accent/50 hover:border-accent/50 transition-all"
                                        >
                                            <div className="p-2 shrink-0 rounded-md bg-background/50 text-muted-foreground group-hover:text-primary transition-colors">
                                                <Icon weight="duotone" className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate group-hover:text-foreground transition-colors">
                                                    {file.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground/70 truncate">
                                                    {formatDistanceToNow(file.lastModified, { addSuffix: true })}
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground/50 italic px-2">No recent files</div>
                        )}
                    </div>

                    {/* Recent Highlights Column */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Clock className="w-4 h-4" />
                            <h2 className="text-sm font-medium uppercase tracking-wider">Recent Highlights</h2>
                        </div>
                        {recentHighlights.length > 0 ? (
                            <div className="grid gap-2">
                                {recentHighlights.map(highlight => {
                                    const file = files.find(f => f.id === highlight.fileId);
                                    if (!file) return null;
                                    const label = formatHighlightLabel(highlight, file);
                                    return (
                                        <Link 
                                            key={highlight.id} 
                                            to={`/file/${file.id}`}
                                            className="group flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/50 hover:bg-accent/50 hover:border-accent/50 transition-all"
                                        >
                                            <div className="p-2 shrink-0 rounded-md bg-background/50 text-muted-foreground group-hover:text-primary transition-colors">
                                                <Clock weight="duotone" className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate group-hover:text-foreground transition-colors">
                                                    {highlight.note || label}
                                                </div>
                                                <div className="text-xs text-muted-foreground/70 truncate flex items-center gap-1">
                                                    <span>{file.name}</span>
                                                    <span className="opacity-50">•</span>
                                                    <span>{formatDistanceToNow(highlight.created || 0, { addSuffix: true })}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                             <div className="text-sm text-muted-foreground/50 italic px-2">No recent highlights</div>
                        )}
                    </div>

                    {/* Recent Docs/Graphs Column */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Folder className="w-4 h-4" />
                            <h2 className="text-sm font-medium uppercase tracking-wider">Recent Docs/Graphs</h2>
                        </div>
                        <div className="grid gap-2">
                            {recentDocs.length > 0 && (
                                <>
                                    <div className="text-xs font-medium text-muted-foreground/70 px-1 mt-2 mb-1">Docs</div>
                                    {recentDocs.map(doc => (
                                        <button
                                            key={doc.id}
                                            onClick={() => {
                                                setState({ activeDocId: doc.id });
                                                navigate('/docs');
                                            }}
                                            className="group w-full flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/50 hover:bg-accent/50 hover:border-accent/50 transition-all text-left"
                                        >
                                            <div className="p-2 shrink-0 rounded-md bg-background/50 text-muted-foreground group-hover:text-primary transition-colors">
                                                <FileText weight="duotone" className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate group-hover:text-foreground transition-colors">
                                                    {doc.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground/70 truncate">
                                                    {formatDistanceToNow(doc.lastModified || doc.created, { addSuffix: true })}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}
                             {recentCollections.length > 0 && (
                                <>
                                    <div className="text-xs font-medium text-muted-foreground/70 px-1 mt-2 mb-1">Collections</div>
                                    {recentCollections.map(collection => (
                                        <button
                                            key={collection.id}
                                            onClick={() => {
                                                setState({ activeCollectionId: collection.id });
                                                navigate('/collections');
                                            }}
                                            className="group w-full flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/50 hover:bg-accent/50 hover:border-accent/50 transition-all text-left"
                                        >
                                            <div className="p-2 shrink-0 rounded-md bg-background/50 text-muted-foreground group-hover:text-primary transition-colors">
                                                <Folder weight="duotone" className="w-5 h-5" style={{ color: collection.color }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate group-hover:text-foreground transition-colors">
                                                    {collection.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground/70 truncate">
                                                    {formatDistanceToNow(collection.lastModified, { addSuffix: true })}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}
                            {recentDocs.length === 0 && recentCollections.length === 0 && (
                                <div className="text-sm text-muted-foreground/50 italic px-2">No recent docs or graphs</div>
                            )}
                        </div>
                    </div>
                    
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
