import { useMemo, useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import {
    Trash,
    ArrowCounterClockwise,
    XCircle,
    FilmStrip,
    FilePdf,
    MusicNote,
    Image,
    Folder,
    FileText,
    Tag,
    Graph,
    NotePencil,
} from "@phosphor-icons/react";
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

export default function TrashView() {
    const {
        files,
        collections,
        graphs,
        docs,
        activeProjectId,
        restoreFile,
        permanentDeleteFile,
        restoreCollection,
        permanentDeleteCollection,
        restoreGraph,
        permanentDeleteGraph,
        restoreDoc,
        permanentDeleteDoc,
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

    const trashedGraphs = useMemo(
        () => graphs.filter((g) => g.projectId === activeProjectId && g.deleted),
        [graphs, activeProjectId]
    );

    const trashedDocs = useMemo(
        () => docs.filter((d) => d.projectId === activeProjectId && d.deleted),
        [docs, activeProjectId]
    );

    const hasTrash = trashedFiles.length > 0 || trashedCollections.length > 0 || trashedGraphs.length > 0 || trashedDocs.length > 0;

    const getFileIcon = (type: string) => {
        switch (type) {
            case "video":
                return <FilmStrip className="text-blue-400" weight="fill" />;
            case "pdf":
                return <FilePdf className="text-red-400" weight="fill" />;
            case "audio":
                return <MusicNote className="text-purple-400" weight="fill" />;
            case "image":
                return <Image className="text-green-400" weight="fill" />;
            case "folder":
                return <Folder className="text-amber-400" weight="fill" />;
            default:
                return <FileText className="text-zinc-400" weight="fill" />;
        }
    };

    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    const formatRelativeTime = (timestamp: number) => {
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-3">
                    <Trash weight="fill" className="text-red-400 text-xl" />
                    <h1 className="text-lg font-semibold">Trash</h1>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {trashedFiles.length + trashedCollections.length} items
                    </span>
                </div>

                {hasTrash && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash className="mr-2 h-4 w-4" />
                                Empty Trash
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
            </header>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
                {!hasTrash ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Trash weight="thin" className="text-6xl text-muted-foreground/30 mb-4" />
                        <h2 className="text-lg font-medium text-muted-foreground">Trash is empty</h2>
                        <p className="text-sm text-muted-foreground/60 mt-1">
                            Deleted items will appear here
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Files Section */}
                        {trashedFiles.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Files ({trashedFiles.length})
                                </h3>
                                <div className="space-y-2">
                                    {trashedFiles.map((file) => (
                                        <div
                                            key={file.id}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/40 group"
                                        >
                                            <div className="text-xl">{getFileIcon(file.type)}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{file.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    Deleted {formatRelativeTime(file.lastModified)}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-primary hover:text-primary"
                                                    onClick={() => restoreFile(file.id)}
                                                    title="Restore"
                                                >
                                                    <ArrowCounterClockwise className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                                            title="Delete Permanently"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                "{file.name}" will be permanently deleted. This cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => permanentDeleteFile(file.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Collections Section */}
                        {trashedCollections.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                    <Tag className="h-4 w-4" />
                                    Collections ({trashedCollections.length})
                                </h3>
                                <div className="space-y-2">
                                    {trashedCollections.map((collection) => (
                                        <div
                                            key={collection.id}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/40 group"
                                        >
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: collection.color }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{collection.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    Deleted {formatRelativeTime(collection.lastModified || collection.created)}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-primary hover:text-primary"
                                                    onClick={() => restoreCollection(collection.id)}
                                                    title="Restore"
                                                >
                                                    <ArrowCounterClockwise className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                                            title="Delete Permanently"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                "{collection.name}" will be permanently deleted along with all timestamps. This cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => permanentDeleteCollection(collection.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Graphs Section */}
                        {trashedGraphs.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                    <Graph className="h-4 w-4" />
                                    Graphs ({trashedGraphs.length})
                                </h3>
                                <div className="space-y-2">
                                    {trashedGraphs.map((graph) => (
                                        <div
                                            key={graph.id}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/40 group"
                                        >
                                            <div className="text-xl text-purple-400"><Graph weight="fill" /></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{graph.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    Deleted {formatRelativeTime(graph.lastModified || graph.created)}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-primary hover:text-primary"
                                                    onClick={() => restoreGraph(graph.id)}
                                                    title="Restore"
                                                >
                                                    <ArrowCounterClockwise className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                                            title="Delete Permanently"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                "{graph.name}" will be permanently deleted. This cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => permanentDeleteGraph(graph.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Docs Section */}
                        {trashedDocs.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                    <NotePencil className="h-4 w-4" />
                                    Documents ({trashedDocs.length})
                                </h3>
                                <div className="space-y-2">
                                    {trashedDocs.map((doc) => (
                                        <div
                                            key={doc.id}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/40 group"
                                        >
                                            <div className="text-xl text-yellow-400"><NotePencil weight="fill" /></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{doc.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    Deleted {formatRelativeTime(doc.lastModified || doc.created)}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-primary hover:text-primary"
                                                    onClick={() => restoreDoc(doc.id)}
                                                    title="Restore"
                                                >
                                                    <ArrowCounterClockwise className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                                            title="Delete Permanently"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                "{doc.name}" will be permanently deleted. This cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => permanentDeleteDoc(doc.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
