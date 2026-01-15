import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    SidebarSimple,
    HardDrives,
    NotePencil,
    Graph,
    FolderPlus,
    Cloud,
    CaretDown,
    Plus,
    WaveSine,
    MagnifyingGlass,
    ArrowsClockwise,
    PencilSimple,
    Star, Heart, Flag, Tag, Bookmark, Briefcase, House, User, Users,
    Planet, Rocket, Code, Cpu, Database, GameController, MusicNotes, Image,
    FilmStrip, FileText, Book
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import type { Collection } from "@/types";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CreateCollectionDialog, EditCollectionDialog } from "@/components/dialogs/CollectionDialogs";

const getIcon = (name?: string) => {
    switch (name) {
        case "Star": return Star;
        case "Heart": return Heart;
        case "Flag": return Flag;
        case "Tag": return Tag;
        case "Bookmark": return Bookmark;
        case "Briefcase": return Briefcase;
        case "House": return House;
        case "User": return User;
        case "Users": return Users;
        case "Planet": return Planet;
        case "Rocket": return Rocket;
        case "Code": return Code;
        case "Cpu": return Cpu;
        case "Database": return Database;
        case "GameController": return GameController;
        case "MusicNotes": return MusicNotes;
        case "Image": return Image;
        case "FilmStrip": return FilmStrip;
        case "FileText": return FileText;
        case "Book": return Book;
        default: return FolderPlus;
    }
};

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        projects,
        activeProjectId,
        setActiveProject,
        addProject,
        collections,
        activeCollectionId,
        updateCollection // Added
    } = useStore();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [collectionsOpen, setCollectionsOpen] = useState(true);
    const [createCollectionOpen, setCreateCollectionOpen] = useState(false);

    // Edit State
    const [editCollectionOpen, setEditCollectionOpen] = useState(false);
    const [collectionToEdit, setCollectionToEdit] = useState<Collection | null>(null);


    const handleAddCollection = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!activeProjectId) return;

        setCreateCollectionOpen(true);
    };

    const handleCreateCollection = (name: string, color: string, icon: string) => {
        if (!activeProjectId) return;
        if (name) {
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
            navigate('/collections');
        }
    };

    const handleEditCollectionClick = (e: React.MouseEvent, collection: Collection) => {
        e.preventDefault();
        e.stopPropagation();
        setCollectionToEdit(collection);
        setEditCollectionOpen(true);
    };

    const handleUpdateCollection = (id: string, updates: { name: string, color: string, icon: string }) => {
        updateCollection(id, updates);
    };

    const handleSelectCollection = (id: string) => {
        useStore.setState({ activeCollectionId: id });
    };

    const handleProjectChange = (value: string) => {
        if (value === "new") {
            // Simple prompt for now, usually use a Dialog
            const name = prompt("Project Name:");
            if (name) {
                const p = addProject(name);
                setActiveProject(p.id);
            }
        } else {
            setActiveProject(value);
        }
    };


    return (
        <>
            <motion.aside
                initial={{ width: 280 }}
                animate={{ width: isCollapsed ? 60 : 280 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={cn(
                    "flex flex-col border-r border-border bg-sidebar h-full overflow-hidden shrink-0 z-20 relative",
                )}
            >
                {/* Header */}
                <div className="flex items-center gap-2 p-3 h-12 border-b border-border/40 shrink-0 relative justify-center">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors absolute left-3"
                        title="Collapse sidebar"
                    >
                        <SidebarSimple weight="bold" size={18} />
                    </button>

                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap"
                        >
                            <WaveSine weight="fill" className="text-primary text-xl" />
                            <span className="font-bold text-lg tracking-tight truncate">Whistlerbox</span>
                        </motion.div>
                    )}

                    {!isCollapsed && (
                        <button className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors absolute right-3">
                            <MagnifyingGlass weight="bold" size={18} />
                        </button>
                    )}
                </div>

                {/* Project Switcher */}
                {!isCollapsed && (
                    <div className="p-3 pb-2 animate-in fade-in duration-300">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Project</div>
                        <div className="flex gap-2 items-center">
                            <Select value={activeProjectId || ""} onValueChange={handleProjectChange}>
                                <SelectTrigger className="flex-1 h-8 bg-card border-border/60 shadow-sm">
                                    <SelectValue placeholder="Select Project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                    <Separator className="my-1" />
                                    <SelectItem value="new"><span className="text-primary flex items-center gap-2"><Plus className="size-3" /> New Project</span></SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 bg-card border-border/60">
                                <ArrowsClockwise className="text-muted-foreground" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Scrollable Content */}
                <ScrollArea className="flex-1 px-3 py-2">
                    {/* Assets Section */}
                    <div className="mb-4">
                        {!isCollapsed && (
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Assets</div>
                        )}
                        <div className={cn("flex gap-1", isCollapsed ? "flex-col space-y-2" : "flex-row")}>
                            <Link
                                to="/storage"
                                title="Storage"
                                className={cn(
                                    "flex items-center justify-center rounded-md transition-all duration-200 group relative",
                                    isCollapsed
                                        ? "w-10 h-10 mx-auto"
                                        : "flex-1 h-9",
                                    (location.pathname === "/storage" || location.pathname === "/")
                                        ? "bg-primary/20 text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                )}
                            >
                                <HardDrives weight={(location.pathname === "/storage" || location.pathname === "/") ? "fill" : "regular"} size={20} className="transition-transform group-hover:scale-110" />
                            </Link>

                            <Link
                                to="/docs"
                                title="Docs"
                                className={cn(
                                    "flex items-center justify-center rounded-md transition-all duration-200 group relative",
                                    isCollapsed
                                        ? "w-10 h-10 mx-auto"
                                        : "flex-1 h-9",
                                    location.pathname.startsWith("/docs")
                                        ? "bg-primary/20 text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                )}
                            >
                                <NotePencil weight={location.pathname.startsWith("/docs") ? "fill" : "regular"} size={20} className="transition-transform group-hover:scale-110" />
                            </Link>

                            <Link
                                to="/graph"
                                title="Graph"
                                className={cn(
                                    "flex items-center justify-center rounded-md transition-all duration-200 group relative",
                                    isCollapsed
                                        ? "w-10 h-10 mx-auto"
                                        : "flex-1 h-9",
                                    location.pathname.startsWith("/graph")
                                        ? "bg-primary/20 text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                )}
                            >
                                <Graph weight={location.pathname.startsWith("/graph") ? "fill" : "regular"} size={20} className="transition-transform group-hover:scale-110" />
                            </Link>
                        </div>
                    </div>

                    <Separator className="my-4 bg-border/40" />

                    {/* Collections Section */}
                    <div className="mb-6">
                        {!isCollapsed && (
                            <div className="flex items-center justify-between mb-2 px-1 group">
                                <button
                                    onClick={() => setCollectionsOpen(!collectionsOpen)}
                                    className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                                >
                                    <CaretDown weight="bold" className={cn("transition-transform text-xs", !collectionsOpen && "-rotate-90")} />
                                    Collections
                                </button>
                                <button
                                    onClick={handleAddCollection}
                                    className="text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Plus weight="bold" className="size-3.5" />
                                </button>
                            </div>
                        )}

                        <AnimatePresence initial={false}>
                            {collectionsOpen && !isCollapsed && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="space-y-1 overflow-hidden"
                                >
                                    {collections.filter(c => c.projectId === activeProjectId).map(collection => {
                                        const Icon = getIcon(collection.icon);
                                        return (
                                            <Link
                                                key={collection.id}
                                                to="/collections"
                                                onClick={() => handleSelectCollection(collection.id)}
                                                className="block w-full group/item"
                                            >
                                                <div className={cn(
                                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative",
                                                    (activeCollectionId === collection.id && location.pathname.startsWith("/collections"))
                                                        ? "bg-primary/20 text-primary font-medium"
                                                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                                )}>
                                                    <Icon
                                                        className={cn("text-lg transition-colors")}
                                                        weight="fill"
                                                        style={{ color: (activeCollectionId === collection.id && location.pathname.startsWith("/collections")) ? undefined : collection.color }}
                                                    />
                                                    <span className="truncate flex-1">{collection.name}</span>

                                                    <button
                                                        onClick={(e) => handleEditCollectionClick(e, collection)}
                                                        className="opacity-0 group-hover/item:opacity-100 text-zinc-400 hover:text-white p-1 rounded transition-all"
                                                    >
                                                        <PencilSimple weight="bold" />
                                                    </button>
                                                </div>
                                            </Link>
                                        )
                                    })}
                                    {collections.filter(c => c.projectId === activeProjectId).length === 0 && (
                                        <div className="px-3 py-4 text-xs text-muted-foreground/60 italic text-center border-2 border-dashed border-border/30 rounded-md">
                                            No collections
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </ScrollArea>

                {/* Footer / PiP Placeholder */}
                <div className="p-3 border-t border-border/40 bg-card/30">
                    {/* Placeholder for future PiP or User Settings */}
                    <div className="flex items-center gap-3 px-2 py-2 text-sm text-muted-foreground">
                        <div className="size-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                            <Cloud weight="fill" />
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col">
                                <span className="font-medium text-foreground text-xs">Sync Active</span>
                                <span className="text-[10px]">Last synced just now</span>
                            </div>
                        )}
                    </div>
                </div>
            </motion.aside>

            <CreateCollectionDialog
                open={createCollectionOpen}
                onOpenChange={setCreateCollectionOpen}
                onSubmit={handleCreateCollection}
            />

            <EditCollectionDialog
                open={editCollectionOpen}
                onOpenChange={setEditCollectionOpen}
                collection={collectionToEdit}
                onSubmit={handleUpdateCollection}
            />
        </>
    );
}
