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
    FileText, Book,
    PencilSimple
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
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
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Timestamp } from "@/types";
import { ClipPlayerDialog, EditTimestampDialog } from "@/components/dialogs/TimestampDialogs";

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
        activeCollectionId,
        updateTimestamp
    } = useStore();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [clipPlayerOpen, setClipPlayerOpen] = useState(false);
    const [editTimestampOpen, setEditTimestampOpen] = useState(false);
    const [returnToClipPlayer, setReturnToClipPlayer] = useState(false);
    const [selectedTimestampId, setSelectedTimestampId] = useState<string | null>(null);

    const activeProject = projects.find(p => p.id === activeProjectId);
    const activeCollection = collections.find(c => c.id === activeCollectionId);
    const selectedTimestamp = timestamps.find(t => t.id === selectedTimestampId) || null;
    const selectedFile = selectedTimestamp ? files.find(f => f.id === selectedTimestamp.fileId) || null : null;

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
            return;
        }

        setSelectedTimestampId(t.id);
        setClipPlayerOpen(true);
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
        setSelectedItems(new Set(collectionTimestamps.map(t => t.id)));
    };

    const handleDeselectAll = () => {
        setSelectedItems(new Set());
    };

    const handleDeleteSelected = () => {
        useStore.setState(state => ({
            timestamps: state.timestamps.filter(t => !selectedItems.has(t.id))
        }));
        setSelectedItems(new Set());
        setSelectionMode(false);
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
                    <div className="relative w-64 mr-2">
                        <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                        <Input
                            placeholder="Search clips..."
                            className="pl-9 h-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button
                        variant={selectionMode ? "secondary" : "ghost"}
                        size="icon"
                        onClick={() => {
                            if (selectionMode) {
                                setSelectionMode(false);
                                setSelectedItems(new Set());
                            } else {
                                setSelectionMode(true);
                            }
                        }}
                    >
                        <CheckSquare weight={selectionMode ? "fill" : "regular"} size={20} />
                    </Button>
                </div>
            </div>

            {/* Selection Toolbar */}
            <AnimatePresence>
                {selectionMode && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-b border-border bg-primary/5 overflow-hidden"
                    >
                        <div className="flex items-center gap-3 px-4 py-2">
                            <span className="text-sm font-medium text-primary">
                                {selectedItems.size} selected
                            </span>
                            <div className="flex-1" />
                            <Button variant="ghost" size="sm" onClick={handleSelectAll} disabled={selectedItems.size === collectionTimestamps.length}>
                                Select All
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleDeselectAll} disabled={selectedItems.size === 0}>
                                Deselect All
                            </Button>
                            <div className="w-px h-5 bg-border" />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="gap-2"
                                        disabled={selectedItems.size === 0}
                                    >
                                        <Trash size={14} />
                                        Delete ({selectedItems.size})
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete selected clips?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete {selectedItems.size} selected item{selectedItems.size === 1 ? "" : "s"} from this collection.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteSelected}>
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                            {/* Media Preview */}
                                            {file.url && (file.type === 'video' || file.type === 'image') ? (
                                                file.type === 'image' ? (
                                                    <img
                                                        src={file.url}
                                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                    />
                                                ) : (
                                                    <video
                                                        src={file.url}
                                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                        preload="metadata"
                                                        muted
                                                        playsInline
                                                    />
                                                )
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
                                <ContextMenuContent className="w-56">
                                    <ContextMenuItem
                                        onClick={() => {
                                            if (!selectionMode) {
                                                setSelectionMode(true);
                                            }
                                            toggleSelection(t.id);
                                        }}
                                        className="gap-2"
                                    >
                                        <CheckSquare size={16} /> Select
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        onClick={() => {
                                            setSelectedTimestampId(t.id);
                                            setClipPlayerOpen(true);
                                        }}
                                        className="gap-2"
                                    >
                                        <FilmStrip size={16} /> Play Clip
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        onClick={() => {
                                            setSelectedTimestampId(t.id);
                                            setEditTimestampOpen(true);
                                        }}
                                        className="gap-2"
                                    >
                                        <PencilSimple size={16} /> Edit Note
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem
                                        className="gap-2 text-destructive focus:text-destructive"
                                        onClick={() => {
                                            useStore.setState(state => ({
                                                timestamps: state.timestamps.filter(item => item.id !== t.id)
                                            }));
                                        }}
                                    >
                                        <Trash size={16} /> Delete
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

            <ClipPlayerDialog
                open={clipPlayerOpen}
                onOpenChange={setClipPlayerOpen}
                timestamp={selectedTimestamp}
                file={selectedFile}
                collection={collections.find(c => c.id === selectedTimestamp?.collectionId)}
                collections={collections.filter(c => c.projectId === activeProjectId && !c.deleted)}
                onUpdate={(updates) => {
                    if (selectedTimestamp) {
                        updateTimestamp(selectedTimestamp.id, updates);
                    }
                }}
                onEditTimestamp={() => {
                    setClipPlayerOpen(false);
                    setReturnToClipPlayer(true);
                    setEditTimestampOpen(true);
                }}
            />

            <EditTimestampDialog
                open={editTimestampOpen}
                onOpenChange={(open) => {
                    setEditTimestampOpen(open);
                    if (!open && returnToClipPlayer) {
                        setReturnToClipPlayer(false);
                        setClipPlayerOpen(true);
                    }
                }}
                timestamp={selectedTimestamp}
                collections={collections}
                file={selectedFile}
                onSave={(updates) => {
                    if (selectedTimestamp) {
                        updateTimestamp(selectedTimestamp.id, updates);
                    }
                }}
            />
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
