import { useState } from "react";
import { useStore } from "@/store/useStore";
import { Link, useNavigate } from "react-router-dom";
import {
    Folder,
    FilmStrip,
    Trash,
    Copy,
    Share,
    ArrowSquareOut,
    CheckSquare,
    FolderPlus,
    MagnifyingGlass,
    FilePdf,
    MusicNote,
    Image as ImageIcon,
    Star, Heart, Flag, Tag, Bookmark, Briefcase, House, User, Users,
    Planet, Rocket, Code, Cpu, Database, GameController, MusicNotes, Image,
    FileText, Book
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Timestamp } from "@/types";

const getIcon = (name?: string) => {
    switch (name) {
        case "FolderPlus": return Folder;
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
        default: return Folder;
    }
};

export default function CollectionView() {
    const {
        projects,
        activeProjectId,
        collections,
        timestamps,
        files,
        activeCollectionId
    } = useStore();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    const activeProject = projects.find(p => p.id === activeProjectId);
    const activeCollection = collections.find(c => c.id === activeCollectionId);

    // If no active collection, maybe show a "All Collections" dashboard or redirect?
    // For now, let's assume Sidebar handles "All Collections" vs specific ID.
    // If specific ID is active, show that collection's items.

    // Filter timestamps for this collection
    const collectionTimestamps = timestamps.filter(t =>
        t.collectionId === activeCollectionId &&
        t.note.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleTimestampClick = (t: Timestamp) => {
        if (selectionMode) {
            toggleSelection(t.id);
        } else {
            // Navigate to player with this timestamp context
            // Format: /file/:fileId?t=:start&collection=:collectionId
            navigate(`/file/${t.fileId}?t=${t.start}&c=${activeCollectionId}`);
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedItems(newSet);
    };

    const handleSelectAll = () => {
        if (selectedItems.size === collectionTimestamps.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(collectionTimestamps.map(t => t.id)));
        }
    };

    const handleDeleteSelected = () => {
        if (confirm(`Delete ${selectedItems.size} items?`)) {
            useStore.setState(state => ({
                timestamps: state.timestamps.filter(t => !selectedItems.has(t.id))
            }));
            setSelectedItems(new Set());
            setSelectionMode(false);
        }
    };

    const CollectionIcon = getIcon(activeCollection?.icon);

    return (
        <div className="flex flex-col h-full bg-background text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card/30">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                        <CollectionIcon weight="fill" size={24} style={{ color: activeCollection?.color }} />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold leading-none">{activeCollection?.name || "Collection"}</h1>
                        <p className="text-xs text-muted-foreground mt-1">{collectionTimestamps.length} clips</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {selectionMode ? (
                        <>
                            <span className="text-sm text-muted-foreground mr-2">{selectedItems.size} selected</span>
                            <Button variant="ghost" size="icon" onClick={() => setSelectionMode(false)}>
                                <ArrowSquareOut size={20} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleSelectAll}>
                                <CheckSquare size={20} weight={selectedItems.size === collectionTimestamps.length ? "fill" : "regular"} />
                            </Button>
                            <Button variant="destructive" size="icon" onClick={handleDeleteSelected} disabled={selectedItems.size === 0}>
                                <Trash size={20} />
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="relative w-64 mr-2">
                                <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                                <Input
                                    placeholder="Search clips..."
                                    className="pl-9 h-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectionMode(true)}>
                                <CheckSquare size={20} />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Grid */}
            <ScrollArea className="flex-1 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    {collectionTimestamps.map(t => {
                        const file = files.find(f => f.id === t.fileId);
                        if (!file) return null;
                        const isSelected = selectedItems.has(t.id);

                        return (
                            <ContextMenu key={t.id}>
                                <ContextMenuTrigger>
                                    <div
                                        className={cn(
                                            "group relative flex flex-col rounded-lg border bg-card transition-all overflow-hidden cursor-pointer hover:shadow-md",
                                            isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                                        )}
                                        onClick={() => handleTimestampClick(t)}
                                    >
                                        {/* Preview Area */}
                                        <div className="aspect-video bg-muted relative overflow-hidden">
                                            {/* Media Preview (Placeholder for now) */}
                                            {file.url && (file.type === 'video' || file.type === 'image') ? (
                                                <img src={file.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                    <FileIconByType type={file.type} size={48} />
                                                </div>
                                            )}

                                            {/* Time Badge */}
                                            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono font-medium">
                                                {formatTime(t.start)}
                                            </div>

                                            {/* Type Badge */}
                                            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase flex items-center gap-1">
                                                <FileIconByType type={file.type} size={10} />
                                                {file.type}
                                            </div>

                                            {/* Selection Checkbox */}
                                            {selectionMode && (
                                                <div className={cn(
                                                    "absolute top-2 right-2 size-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                                    isSelected ? "bg-primary border-primary text-primary-foreground" : "border-white/70 bg-black/30"
                                                )}>
                                                    {isSelected && <CheckSquare weight="fill" size={12} />}
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-3">
                                            <h3 className="font-medium text-sm line-clamp-2 leading-tight mb-1 group-hover:text-primary transition-colors">
                                                {t.note || "Untitled Clip"}
                                            </h3>
                                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                                <FilmStrip size={12} />
                                                {file.name}
                                            </p>
                                        </div>
                                    </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                    <ContextMenuItem onClick={() => navigate(`/file/${t.fileId}?t=${t.start}&c=${activeCollectionId}`)}>
                                        Play Clip
                                    </ContextMenuItem>
                                    <ContextMenuItem>Edit Note</ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem className="text-destructive" onClick={() => {
                                        useStore.setState(state => ({
                                            timestamps: state.timestamps.filter(item => item.id !== t.id)
                                        }));
                                    }}>
                                        Delete
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>
                        );
                    })}

                    {collectionTimestamps.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50">
                            <CollectionIcon size={64} weight="thin" />
                            <p className="mt-4 text-sm font-medium">No clips in this collection</p>
                            <p className="text-xs">Add clips from the video player</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

function FileIconByType({ type, size = 16 }: { type: string, size?: number }) {
    switch (type) {
        case 'video': return <FilmStrip size={size} />;
        case 'pdf': return <FilePdf size={size} />;
        case 'audio': return <MusicNote size={size} />;
        case 'image': return <ImageIcon size={size} />;
        default: return <Folder size={size} />;
    }
}

function formatTime(seconds: number) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}
