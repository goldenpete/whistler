import { useCallback, useMemo } from "react";
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
import type { File, Collection, Highlight } from "@/types";
import { useKeybind } from "@/hooks/use-keybind";

export function SpotlightSearch() {
    const navigate = useNavigate();

    const {
        files,
        collections,
        highlights,
        activeProjectId,
        setActiveProject,
        projects,
        isSpotlightOpen,
        setSpotlightOpen,
    } = useStore();

    const projectFiles = useMemo(
        () => files.filter((f) => f.projectId === activeProjectId && !f.deleted),
        [files, activeProjectId]
    );

    const projectCollections = useMemo(
        () => collections.filter((c) => c.projectId === activeProjectId && !c.deleted),
        [collections, activeProjectId]
    );

    const projectHighlights = useMemo(() => {
        const fileIds = new Set(projectFiles.map((f) => f.id));
        return highlights.filter((t) => fileIds.has(t.fileId));
    }, [highlights, projectFiles]);

    useKeybind("ctrl+k", () => setSpotlightOpen(true), { preventDefault: true, disableInInput: true });
    useKeybind("meta+k", () => setSpotlightOpen(true), { preventDefault: true, disableInInput: true });
    useKeybind("/", () => setSpotlightOpen(true), { preventDefault: true, disableInInput: true });

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
        setSpotlightOpen(false);
        if (file.type === "folder") {
            // Navigate to storage with folder open (future: add folder navigation state)
            navigate("/storage");
        } else {
            navigate(`/file/${file.id}`);
        }
    };

    const handleSelectCollection = (collection: Collection) => {
        setSpotlightOpen(false);
        useStore.setState({ activeCollectionId: collection.id });
        navigate("/collections");
    };

    const handleNavigation = (path: string) => {
        setSpotlightOpen(false);
        navigate(path);
    };

    const handleSelectHighlight = (highlight: Highlight) => {
        setSpotlightOpen(false);
        navigate(`/file/${highlight.fileId}`);
        // We might need to set a state to jump to the highlight time/page
        // For now just navigating to the file is a good start. 
        // Ideally we should pass state or use a URL param.
        // Assuming the VideoPlayer/PDFPlayer handles URL params or we set store state.
        // Let's check if we can set active highlight.
        // The store has `activeFileId` but maybe not active highlight for auto-play.
        // But VideoPlayer usually checks for something.
        // Let's just navigate for now, maybe with a query param if supported.
        // Or set a transient state if we had one.
        // Actually, let's use the file navigation and maybe the player will pick up if we set something?
        // The `VideoPlayer` component uses `useParams`.
        // Let's just navigate to file.
        // Wait, if I want to jump to time, I might need to use the store to set a "pending seek" or similar.
        // But let's just do navigation first to fix the error.
        useStore.setState({ activeFileId: highlight.fileId });
        // Also maybe set query param? ?t=start
        // navigate(`/file/${highlight.fileId}?t=${highlight.start}`); 
        // I'll stick to simple navigation to fix the build error.
    };

    return (
        <CommandDialog open={isSpotlightOpen} onOpenChange={setSpotlightOpen}>
            <CommandInput placeholder="Search files, collections, highlights..." />
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

                {/* Highlights */}
                {projectHighlights.length > 0 && (
                    <CommandGroup heading="Highlights">
                        {projectHighlights.slice(0, 10).map((highlight) => {
                            const file = files.find((f) => f.id === highlight.fileId);
                            const label = file?.type === "pdf"
                                ? (highlight.end && highlight.end !== highlight.start
                                    ? `Page ${highlight.start}-${highlight.end}`
                                    : `Page ${highlight.start}`)
                                : `${formatTime(highlight.start)} - ${formatTime(highlight.end || highlight.start)}`;
                            return (
                                <CommandItem
                                    key={highlight.id}
                                    value={`${highlight.note} ${file?.name}`}
                                    onSelect={() => handleSelectHighlight(highlight)}
                                >
                                    <Clock className="mr-2 h-4 w-4 text-amber-400" />
                                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                                        {label}
                                    </span>
                                    <span className="truncate flex-1">
                                        {highlight.note || file?.name || "Unnamed"}
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
                                        setSpotlightOpen(false);
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
