import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Trash,
    ArrowCounterClockwise,
    XCircle,
    Folder,
    FileText,
    Graph,
    NotePencil,
    CaretLeft,
    HardDrives,
} from "@phosphor-icons/react";
import { getIcon } from "@/utils/iconMap";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface SidebarTrashProps {
    onBack: () => void;
}

export function SidebarTrash({ onBack }: SidebarTrashProps) {
    const {
        files,
        collections,
        graphs,
        docs,
        storages,
        activeProjectId,
        restoreFile,
        permanentDeleteFile,
        restoreCollection,
        permanentDeleteCollection,
        restoreGraph,
        permanentDeleteGraph,
        restoreDoc,
        permanentDeleteDoc,
        restoreStorage,
        permanentDeleteStorage,
        emptyTrash,
    } = useStore();

    const trashedFiles = useMemo(
        () => files.filter((f) => f.projectId === activeProjectId && f.deleted),
        [files, activeProjectId]
    );

    const trashedCollections = useMemo(
        () => collections.filter((c) => c.projectId === activeProjectId && c.deleted),
        [collections, activeProjectId]
    );

    const trashedStorages = useMemo(
        () => storages.filter((s) => s.projectId === activeProjectId && s.deleted),
        [storages, activeProjectId]
    );

    const trashedGraphs = useMemo(
        () => graphs.filter((g) => g.projectId === activeProjectId && g.deleted),
        [graphs, activeProjectId]
    );

    const trashedDocs = useMemo(
        () => docs.filter((d) => d.projectId === activeProjectId && d.deleted),
        [docs, activeProjectId]
    );

    const hasTrash =
        trashedFiles.length > 0 ||
        trashedCollections.length > 0 ||
        trashedGraphs.length > 0 ||
        trashedDocs.length > 0 ||
        trashedStorages.length > 0;

    const formatRelativeTime = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const TrashItem = ({ 
        icon: Icon, 
        name, 
        date, 
        onRestore, 
        onDelete,
        color
    }: { 
        icon: any, 
        name: string, 
        date: number, 
        onRestore: () => void, 
        onDelete: () => void,
        color?: string
    }) => (
        <div className="flex items-center gap-2 p-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group relative">
            <div className={cn("shrink-0", color ? "" : "text-muted-foreground")}>
                <Icon weight="fill" size={16} style={{ color: color }} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{name}</div>
                <div className="text-[10px] text-muted-foreground">
                    {formatRelativeTime(date)}
                </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-sidebar-accent pl-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRestore();
                    }}
                    title="Restore"
                >
                    <ArrowCounterClockwise className="h-3 w-3" />
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => e.stopPropagation()}
                            title="Delete Permanently"
                        >
                            <XCircle className="h-3 w-3" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                            <AlertDialogDescription>
                                "{name}" will be permanently deleted. This cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={onDelete}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full min-h-0 bg-sidebar-background">
            <div className="p-3 border-b border-sidebar-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6 -ml-1" onClick={onBack} data-sound-back>
                        <CaretLeft className="text-muted-foreground" />
                    </Button>
                    <div className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
                        <Trash weight="fill" className="text-red-400" />
                        Trash
                    </div>
                </div>
                {hasTrash && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-400/10 uppercase tracking-wider font-bold px-2">
                                Empty
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Empty Trash?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete all items in the trash. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={emptyTrash}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Delete All
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>

            <ScrollArea className="flex-1 p-2 overflow-y-auto">
                {!hasTrash ? (
                    <div className="text-center text-muted-foreground py-8 text-xs italic">
                        Trash is empty.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {trashedStorages.length > 0 && (
                            <div>
                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-2">Storages</h3>
                                <div className="space-y-0.5">
                                    {trashedStorages.map(s => (
                                        <TrashItem
                                            key={s.id}
                                            icon={HardDrives}
                                            name={s.name}
                                            date={s.lastModified || s.created}
                                            color={s.color}
                                            onRestore={() => restoreStorage(s.id)}
                                            onDelete={() => permanentDeleteStorage(s.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {trashedCollections.length > 0 && (
                            <div>
                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-2">Collections</h3>
                                <div className="space-y-0.5">
                                    {trashedCollections.map(c => (
                                        <TrashItem
                                            key={c.id}
                                            icon={Folder}
                                            name={c.name}
                                            date={c.lastModified || c.created}
                                            color={c.color}
                                            onRestore={() => restoreCollection(c.id)}
                                            onDelete={() => permanentDeleteCollection(c.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {trashedFiles.length > 0 && (
                            <div>
                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-2">Files</h3>
                                <div className="space-y-0.5">
                                    {trashedFiles.map(f => (
                                        <TrashItem
                                            key={f.id}
                                            icon={FileText}
                                            name={f.name}
                                            date={f.lastModified}
                                            onRestore={() => restoreFile(f.id)}
                                            onDelete={() => permanentDeleteFile(f.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {trashedDocs.length > 0 && (
                            <div>
                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-2">Docs</h3>
                                <div className="space-y-0.5">
                                    {trashedDocs.map(d => (
                                        <TrashItem
                                            key={d.id}
                                            icon={getIcon(d.icon)}
                                            name={d.name}
                                            date={d.lastModified || d.created}
                                            color={d.color}
                                            onRestore={() => restoreDoc(d.id)}
                                            onDelete={() => permanentDeleteDoc(d.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {trashedGraphs.length > 0 && (
                            <div>
                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-2">Graphs</h3>
                                <div className="space-y-0.5">
                                    {trashedGraphs.map(g => (
                                        <TrashItem
                                            key={g.id}
                                            icon={getIcon(g.icon)}
                                            name={g.name}
                                            date={g.lastModified || g.created}
                                            color={g.color}
                                            onRestore={() => restoreGraph(g.id)}
                                            onDelete={() => permanentDeleteGraph(g.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
