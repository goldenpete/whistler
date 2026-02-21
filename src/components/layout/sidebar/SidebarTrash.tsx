import { useMemo, type MouseEvent, type ReactNode } from "react";
import { useShallow } from "@/lib/zustand-shallow";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Trash,
    ArrowsCounterClockwise,
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
    variant?: 'sidebar' | 'settings' | 'settings-page';
}

export function SidebarTrash({ onBack, variant = 'sidebar' }: SidebarTrashProps) {
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
    } = useStore(useShallow((state) => ({
        files: state.files,
        collections: state.collections,
        graphs: state.graphs,
        docs: state.docs,
        storages: state.storages,
        activeProjectId: state.activeProjectId,
        restoreFile: state.restoreFile,
        permanentDeleteFile: state.permanentDeleteFile,
        restoreCollection: state.restoreCollection,
        permanentDeleteCollection: state.permanentDeleteCollection,
        restoreGraph: state.restoreGraph,
        permanentDeleteGraph: state.permanentDeleteGraph,
        restoreDoc: state.restoreDoc,
        permanentDeleteDoc: state.permanentDeleteDoc,
        restoreStorage: state.restoreStorage,
        permanentDeleteStorage: state.permanentDeleteStorage,
        emptyTrash: state.emptyTrash,
    })));

    const isSettingsPage = variant === 'settings-page';

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
        icon: React.ComponentType<{ weight?: string; className?: string; style?: React.CSSProperties }>, 
        name: string, 
        date: number, 
        onRestore: () => void, 
        onDelete: () => void,
        color?: string
    }) => {
        if (isSettingsPage) {
            return (
                <div className="flex items-center justify-between p-3 rounded-none border border-border bg-background/50 group">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("h-8 w-8 rounded-none bg-primary/10 flex items-center justify-center text-primary shrink-0")}>
                            <Icon size={16} weight="fill" style={color ? { color } : undefined} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{name}</p>
                            <p className="text-xs text-muted-foreground truncate">{formatRelativeTime(date)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={(e: MouseEvent) => {
                                e.stopPropagation();
                                onRestore();
                            }}
                            title="Restore"
                        >
                            <ArrowsCounterClockwise className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e: MouseEvent) => e.stopPropagation()}
                                    title="Delete Permanently"
                                >
                                    <XCircle className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-zinc-400">
                                        "{name}" will be permanently deleted. This cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-transparent border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white">Cancel</AlertDialogCancel>
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
        }

        return (
            <div className={cn(
                "flex items-center gap-2 p-2 rounded-none transition-colors group relative",
                variant === 'sidebar' 
                    ? "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" 
                    : "hover:bg-muted"
            )}>
                <div className={cn("shrink-0", color ? "" : "text-muted-foreground")}>
                    <Icon weight="fill" size={16} style={{ color: color }} />
                </div>
                <div className="flex-1 min-w-0 pr-8">
                    <div className="text-xs font-medium truncate max-w-[200px]">{name}</div>
                    <div className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(date)}
                    </div>
                </div>
                <div className={cn(
                    "flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 pl-2",
                    variant === 'sidebar' ? "bg-sidebar-accent" : "bg-muted"
                )}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={(e: MouseEvent) => {
                            e.stopPropagation();
                            onRestore();
                        }}
                        title="Restore"
                    >
                        <ArrowsCounterClockwise className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e: MouseEvent) => e.stopPropagation()}
                                title="Delete Permanently"
                            >
                                <XCircle className="h-3 w-3" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                                <AlertDialogDescription className="text-zinc-400">
                                    "{name}" will be permanently deleted. This cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-transparent border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white">Cancel</AlertDialogCancel>
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
    };

    const Header = () => {
        if (variant === 'sidebar') {
            return (
                <div className="px-3 py-2 border-b border-border/40 bg-card/20 flex items-center justify-between shrink-0">
                    <button
                        onClick={onBack}
                        className="h-5 w-5 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
                        data-sound-back
                    >
                        <CaretLeft weight="bold" size={12} />
                    </button>
                    <div className="flex-1 flex items-center justify-center gap-2 text-xs font-medium text-sidebar-foreground">
                        <Trash weight="fill" size={12} className="text-red-400" />
                        Trash
                    </div>
                    {hasTrash && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <button className="h-5 w-5 flex items-center justify-center rounded-none border border-border/60 shadow-sm bg-secondary/40 text-red-400 hover:bg-secondary/60 hover:text-red-300 transition-all duration-200">
                                    <Trash weight="fill" size={12} />
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Empty Trash?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-zinc-400">
                                        This will permanently delete all items in the trash. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-transparent border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white">Cancel</AlertDialogCancel>
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
            );
        }
        if (variant === 'settings') {
             return (
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Trash className="text-primary" size={24} />
                            Trash
                        </h2>
                    </div>
                    {hasTrash && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-8 text-xs"
                                >
                                    Empty Trash
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Empty Trash?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-zinc-400">
                                        This will permanently delete all items in the trash. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-transparent border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={emptyTrash} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Empty Trash
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            );
        }
        // settings-page
        return (
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Trash className="text-primary" size={24} />
                    Trash
                </h2>
                {hasTrash && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 text-xs"
                            >
                                Empty Trash
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Empty Trash?</AlertDialogTitle>
                                <AlertDialogDescription className="text-zinc-400">
                                    This will permanently delete all items in the trash. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-transparent border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={emptyTrash} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Empty Trash
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        );
    }

    const Wrapper = isSettingsPage ? 'div' : ScrollArea;
    const wrapperClass = isSettingsPage ? '' : 'flex-1 p-2 overflow-y-auto';
    const containerClass = cn(
        isSettingsPage ? "space-y-6" : "flex flex-col h-full min-h-0",
        variant === 'sidebar' ? "bg-sidebar-background" : "bg-transparent"
    );

    const TrashSection = ({ title, children }: { title: string, children: ReactNode }) => (
        <div className={isSettingsPage ? "p-5 rounded-none border border-border bg-card/50" : ""}>
            <h3 className={cn(
                "text-muted-foreground uppercase tracking-wider mb-2 px-2",
                isSettingsPage ? "text-sm font-semibold normal-case px-0 tracking-normal text-foreground mb-3" : "text-[10px] font-bold"
            )}>{title}</h3>
            <div className={isSettingsPage ? "space-y-2" : "space-y-0.5"}>
                {children}
            </div>
        </div>
    );

    return (
        <div className={containerClass}>
            <Header />

            <Wrapper className={wrapperClass}>
                {!hasTrash ? (
                    <div className={cn("text-center text-muted-foreground", isSettingsPage ? "p-8 border border-dashed border-border rounded-none bg-card/30" : "py-8")}>
                         {isSettingsPage && (
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-none bg-muted/50 mb-4">
                                <Trash size={24} className="opacity-50" />
                            </div>
                         )}
                        <p className={cn("italic", isSettingsPage ? "not-italic text-sm font-medium" : "text-xs")}>
                            {isSettingsPage ? "Trash is empty" : "Trash is empty."}
                        </p>
                    </div>
                ) : (
                    <div className={isSettingsPage ? "space-y-6" : "space-y-4"}>
                        {trashedStorages.length > 0 && (
                            <TrashSection title="Storages">
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
                            </TrashSection>
                        )}

                        {trashedCollections.length > 0 && (
                            <TrashSection title="Collections">
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
                            </TrashSection>
                        )}

                        {trashedFiles.length > 0 && (
                            <TrashSection title="Files">
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
                            </TrashSection>
                        )}

                        {trashedDocs.length > 0 && (
                            <TrashSection title="Docs">
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
                            </TrashSection>
                        )}

                        {trashedGraphs.length > 0 && (
                            <TrashSection title="Graphs">
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
                            </TrashSection>
                        )}
                    </div>
                )}
            </Wrapper>
        </div>
    );
}
