import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    FilmStrip,
    FilePdf,
    MusicNote,
    Image,
    Folder,
    FileText,
    Tag,
    Clock,
    HardDrives,
    NotePencil,
    Graph,
    Trash,
} from "@phosphor-icons/react";
import { useStore } from "@/store/useStore";
import type { File, Collection, Timestamp } from "@/types";
import { useKeybind } from "@/hooks/use-keybind";

export function SpotlightSearch() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const {
        files,
        collections,
        timestamps,
        activeProjectId,
        setActiveProject,
        projects,
    } = useStore();

    const projectFiles = useMemo(
        () => files.filter((f) => f.projectId === activeProjectId && !f.deleted),
        [files, activeProjectId]
    );

    const projectCollections = useMemo(
        () => collections.filter((c) => c.projectId === activeProjectId && !c.deleted),
        [collections, activeProjectId]
    );

    const projectTimestamps = useMemo(() => {
        const fileIds = new Set(projectFiles.map((f) => f.id));
        return timestamps.filter((t) => fileIds.has(t.fileId));
    }, [timestamps, projectFiles]);

    useKeybind("ctrl+k", () => setOpen(true), { preventDefault: true, disableInInput: true });
    useKeybind("meta+k", () => setOpen(true), { preventDefault: true, disableInInput: true });
    useKeybind("/", () => setOpen(true), { preventDefault: true, disableInInput: true });

    const getFileIcon = useCallback((type: string) => {
        switch (type) {
            case "video":
                return <FilmStrip className="mr-2 h-4 w-4 text-blue-400" />;
            case "pdf":
                return <FilePdf className="mr-2 h-4 w-4 text-red-400" />;
            case "audio":
                return <MusicNote className="mr-2 h-4 w-4 text-purple-400" />;
            case "image":
                return <Image className="mr-2 h-4 w-4 text-green-400" />;
            case "folder":
                return <Folder className="mr-2 h-4 w-4 text-amber-400" />;
            default:
                return <FileText className="mr-2 h-4 w-4 text-zinc-400" />;
        }
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handleSelectFile = (file: File) => {
        setOpen(false);
        if (file.type === "folder") {
            // Navigate to storage with folder open (future: add folder navigation state)
            navigate("/storage");
        } else {
            navigate(`/file/${file.id}`);
        }
    };

    const handleSelectCollection = (collection: Collection) => {
        setOpen(false);
        useStore.setState({ activeCollectionId: collection.id });
        navigate("/collections");
    };

    const handleSelectTimestamp = (timestamp: Timestamp) => {
        setOpen(false);
        // Navigate to the file at the timestamp
        navigate(`/file/${timestamp.fileId}?t=${timestamp.start}`);
    };

    const handleNavigation = (path: string) => {
        setOpen(false);
        navigate(path);
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Search files, collections, timestamps..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                {/* Quick Navigation */}
                <CommandGroup heading="Navigation">
                    <CommandItem onSelect={() => handleNavigation("/storage")}>
                        <HardDrives className="mr-2 h-4 w-4" />
                        <span>Storage</span>
                    </CommandItem>
                    <CommandItem onSelect={() => handleNavigation("/docs")}>
                        <NotePencil className="mr-2 h-4 w-4" />
                        <span>Docs</span>
                    </CommandItem>
                    <CommandItem onSelect={() => handleNavigation("/graphs")}>
                        <Graph className="mr-2 h-4 w-4" />
                        <span>Graphs</span>
                    </CommandItem>
                    <CommandItem onSelect={() => handleNavigation("/trash")}>
                        <Trash className="mr-2 h-4 w-4 text-red-400" />
                        <span>Trash</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                {/* Files */}
                {projectFiles.length > 0 && (
                    <CommandGroup heading="Files">
                        {projectFiles.slice(0, 10).map((file) => (
                            <CommandItem
                                key={file.id}
                                value={file.name}
                                onSelect={() => handleSelectFile(file)}
                            >
                                {getFileIcon(file.type)}
                                <span className="truncate">{file.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {/* Collections */}
                {projectCollections.length > 0 && (
                    <CommandGroup heading="Collections">
                        {projectCollections.map((collection) => (
                            <CommandItem
                                key={collection.id}
                                value={collection.name}
                                onSelect={() => handleSelectCollection(collection)}
                            >
                                <Tag
                                    className="mr-2 h-4 w-4"
                                    style={{ color: collection.color }}
                                />
                                <span>{collection.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {/* Timestamps */}
                {projectTimestamps.length > 0 && (
                    <CommandGroup heading="Highlights">
                        {projectTimestamps.slice(0, 10).map((timestamp) => {
                            const file = files.find((f) => f.id === timestamp.fileId);
                            return (
                                <CommandItem
                                    key={timestamp.id}
                                    value={`${timestamp.note} ${file?.name}`}
                                    onSelect={() => handleSelectTimestamp(timestamp)}
                                >
                                    <Clock className="mr-2 h-4 w-4 text-amber-400" />
                                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                                        {formatTime(timestamp.start)}
                                    </span>
                                    <span className="truncate flex-1">
                                        {timestamp.note || file?.name || "Unnamed"}
                                    </span>
                                </CommandItem>
                            );
                        })}
                    </CommandGroup>
                )}

                <CommandSeparator />

                {/* Projects */}
                {projects.length > 1 && (
                    <CommandGroup heading="Switch Project">
                        {projects
                            .filter((p) => p.id !== activeProjectId)
                            .map((project) => (
                                <CommandItem
                                    key={project.id}
                                    value={`project ${project.name}`}
                                    onSelect={() => {
                                        setActiveProject(project.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Folder className="mr-2 h-4 w-4 text-primary" />
                                    <span>{project.name}</span>
                                </CommandItem>
                            ))}
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    );
}
