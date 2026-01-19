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
    FilePdf
} from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";

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

export default function HomeView() {
    const { 
        accentTheme, 
        user, 
        files, 
        docs, 
        collections, 
        activeProjectId,
        setState 
    } = useStore();
    
    const navigate = useNavigate();

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
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {getGreeting(username)}
                </h1>
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
                                            <div className="p-2 rounded-md bg-background/50 text-muted-foreground group-hover:text-primary transition-colors">
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

                    {/* Recent Docs Column */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <FileText className="w-4 h-4" />
                            <h2 className="text-sm font-medium uppercase tracking-wider">Recent Docs</h2>
                        </div>
                        {recentDocs.length > 0 ? (
                            <div className="grid gap-2">
                                {recentDocs.map(doc => (
                                    <button
                                        key={doc.id}
                                        onClick={() => {
                                            setState({ activeDocId: doc.id });
                                            navigate('/docs');
                                        }}
                                        className="group w-full flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/50 hover:bg-accent/50 hover:border-accent/50 transition-all text-left"
                                    >
                                        <div className="p-2 rounded-md bg-background/50 text-muted-foreground group-hover:text-primary transition-colors">
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
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground/50 italic px-2">No recent docs</div>
                        )}
                    </div>

                    {/* Recent Collections Column */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Folder className="w-4 h-4" />
                            <h2 className="text-sm font-medium uppercase tracking-wider">Recent Collections</h2>
                        </div>
                        {recentCollections.length > 0 ? (
                            <div className="grid gap-2">
                                {recentCollections.map(collection => (
                                    <button
                                        key={collection.id}
                                        onClick={() => {
                                            setState({ activeCollectionId: collection.id });
                                            navigate('/collections');
                                        }}
                                        className="group w-full flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/50 hover:bg-accent/50 hover:border-accent/50 transition-all text-left"
                                    >
                                        <div className="p-2 rounded-md bg-background/50 text-muted-foreground group-hover:text-primary transition-colors">
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
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground/50 italic px-2">No recent collections</div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
