import { useCallback, useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
    House,
    Gear,
} from "@phosphor-icons/react";
import { useStore, type AppStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import type { File, Collection, Highlight } from "@/types";
import { useKeybind } from "@/hooks/use-keybind";
import { formatTime } from "@/lib/utils";
import { playSfx } from "@/utils/sound";
import { ACTION_REGISTRY, type ActionContext } from "@/lib/actions";

export function SpotlightSearch() {
    const navigate = useNavigate();
    const location = useLocation();
    const [inputValue, setInputValue] = useState("");
    const [pages, setPages] = useState<string[]>([]);

    const store = useStore();
    const {
        files,
        collections,
        highlights,
        activeProjectId,
        setActiveProject,
        projects,
        isSpotlightOpen,
        setSpotlightOpen,
    } = useStore(useShallow((state: AppStore) => ({
        files: state.files,
        collections: state.collections,
        highlights: state.highlights,
        activeProjectId: state.activeProjectId,
        setActiveProject: state.setActiveProject,
        projects: state.projects,
        isSpotlightOpen: state.isSpotlightOpen,
        setSpotlightOpen: state.setSpotlightOpen,
    })));

    // Reset state when opening
    useEffect(() => {
        if (isSpotlightOpen) {
            setInputValue("");
            setPages([]);
        }
    }, [isSpotlightOpen]);

    const projectFiles = useMemo(
        () => files.filter((f: File) => f.projectId === activeProjectId && !f.deleted),
        [files, activeProjectId]
    );

    const projectCollections = useMemo(
        () => collections.filter((c: Collection) => c.projectId === activeProjectId && !c.deleted),
        [collections, activeProjectId]
    );

    const projectHighlights = useMemo(() => {
        const fileIds = new Set(projectFiles.map((f: File) => f.id));
        return highlights.filter((t: Highlight) => fileIds.has(t.fileId));
    }, [highlights, projectFiles]);

    useKeybind("global.search", () => setSpotlightOpen(true), { preventDefault: true, disableInInput: true });
    useKeybind("global.search.slash", () => {
        setSpotlightOpen(true);
        // Small timeout to allow the dialog to open before setting input
        setTimeout(() => setInputValue("/"), 10);
    }, { preventDefault: true, disableInInput: true });

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

    const handleSelectFile = (file: File) => {
        playSfx("search");
        setSpotlightOpen(false);
        if (file.type === "folder") {
            // Navigate to storage with folder open
            navigate(`/storage?folderId=${file.id}`);
        } else {
            navigate(`/file/${file.id}`);
        }
    };

    const handleSelectCollection = (collection: Collection) => {
        playSfx("search");
        setSpotlightOpen(false);
        useStore.setState({ activeCollectionId: collection.id });
        navigate("/collections");
    };

    const handleNavigation = (path: string) => {
        playSfx("search");
        setSpotlightOpen(false);
        navigate(path);
    };

    const handleSelectHighlight = (highlight: Highlight) => {
        playSfx("search");
        setSpotlightOpen(false);
        navigate(`/file/${highlight.fileId}`);
        // See comments in original code regarding time seek
        useStore.setState({ activeFileId: highlight.fileId });
    };

    // --- Action Logic ---
    const isActionSearch = inputValue.startsWith("/");
    
    // Filter actions based on context and input
    const filteredActions = useMemo(() => {
        if (!isActionSearch) return [];
        
        // Remove "/" and trim
        const query = inputValue.slice(1).trim().toLowerCase();
        
        const context: ActionContext = { navigate, location, store, query };
        
        return ACTION_REGISTRY.filter(action => {
            // Check availability
            if (action.available && !action.available(context)) return false;
            
            // Match query
            if (!query) return true; // Show all available actions if only "/"
            
            return action.labels.some(label => label.toLowerCase().includes(query)) ||
                   action.keywords?.some(kw => kw.toLowerCase().includes(query));
        });
    }, [inputValue, location, store, navigate]);

    const executeAction = (actionId: string) => {
        const action = ACTION_REGISTRY.find(a => a.id === actionId);
        if (!action) return;

        const context: ActionContext = { navigate, location, store, query: inputValue.slice(1).trim().toLowerCase() };
        
        // Parse arguments: everything after the command label
        // This is a naive implementation; complex args would need better parsing
        // We find the label that matched to determine where args start
        const query = inputValue.slice(1).trim();
        const matchedLabel = action.labels.find(l => query.toLowerCase().startsWith(l.toLowerCase()));
        
        let args: string[] = [];
        if (matchedLabel && query.length > matchedLabel.length) {
            const argsStr = query.slice(matchedLabel.length).trim();
            if (argsStr) {
                // simple space split for now, preserving quotes could be next step
                args = argsStr.split(" ");
            }
        }

        const result = action.execute(context, args);
        
        // Handle result
        // if (result instanceof Promise) ...
        
        // For now assume synchronous success usually
        playSfx("confirm");
        setSpotlightOpen(false);
    };

    return (
        <CommandDialog 
            open={isSpotlightOpen} 
            onOpenChange={setSpotlightOpen}
            commandProps={{
                shouldFilter: !isActionSearch // We do our own filtering for actions
            }}
        >
            <CommandInput 
                placeholder={isActionSearch ? "Type a command..." : "Search files, collections, highlights..."}
                value={inputValue}
                onValueChange={setInputValue}
            />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                {/* Actions Section */}
                {isActionSearch && (
                    <CommandGroup heading="Actions">
                        {filteredActions.map(action => (
                            <CommandItem
                                key={action.id}
                                value={action.labels[0]} // value used for selection
                                onSelect={() => executeAction(action.id)}
                            >
                                <action.icon className="mr-2 h-4 w-4" />
                                <span>{action.labels[0]}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{action.description}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {/* Standard Search Sections (Hidden if Action Search) */}
                {!isActionSearch && (
                    <>
                        {/* Quick Navigation */}
                        <CommandGroup heading="Navigation">
                            <CommandItem onSelect={() => handleNavigation("/")}>
                                <House className="mr-2 h-4 w-4" />
                                <span>Home</span>
                            </CommandItem>
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
                            <CommandItem onSelect={() => handleNavigation("/settings")}>
                                <Gear className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </CommandItem>
                        </CommandGroup>

                        <CommandSeparator />

                        {/* Files */}
                        {projectFiles.length > 0 && (
                            <CommandGroup heading="Files">
                                {projectFiles.slice(0, 10).map((file: File) => (
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
                                {projectCollections.map((collection: Collection) => (
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
                                {projectHighlights.slice(0, 10).map((highlight: Highlight) => {
                                    // Find file name for context
                                    const file = projectFiles.find(f => f.id === highlight.fileId);
                                    return (
                                        <CommandItem
                                            key={highlight.id}
                                            value={highlight.note || "Highlight"}
                                            onSelect={() => handleSelectHighlight(highlight)}
                                        >
                                            <div className="flex flex-col">
                                                <div className="flex items-center">
                                                    <Clock className="mr-2 h-3 w-3 text-muted-foreground" />
                                                    <span className="truncate font-medium">{highlight.note || "Untitled Highlight"}</span>
                                                </div>
                                                <div className="ml-5 text-xs text-muted-foreground flex items-center">
                                                    <span className="truncate max-w-[200px]">{file?.name}</span>
                                                    <span className="mx-1">•</span>
                                                    <span>{formatTime(highlight.start)}</span>
                                                </div>
                                            </div>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        )}
                    </>
                )}

                {/* Highlights */}
                {projectHighlights.length > 0 && (
                    <CommandGroup heading="Highlights">
                        {projectHighlights.slice(0, 10).map((highlight: Highlight) => {
                            const file = files.find((f: File) => f.id === highlight.fileId);
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
                            .filter((p: { id: string }) => p.id !== activeProjectId)
                            .map((project: { id: string; name: string }) => (
                                <CommandItem
                                    key={project.id}
                                    value={`project ${project.name}`}
                                    onSelect={() => {
                                        playSfx("search");
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
