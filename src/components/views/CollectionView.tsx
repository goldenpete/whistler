import { useState } from "react";
import { useStore } from "@/store/useStore";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
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
import type { Highlight } from "@/types";
import { HighlightPlayerDialog, EditHighlightDialog } from "@/components/dialogs/HighlightDialogs";

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
        highlights,
        files,
        activeCollectionId,
        setActiveCollectionId,
        updateHighlight
    } = useStore();
    const navigate = useNavigate();
    const { id } = useParams();

    useEffect(() => {
        if (id && id !== activeCollectionId) {
            setActiveCollectionId(id);
        }
    }, [id, activeCollectionId, setActiveCollectionId]);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [highlightPlayerOpen, setHighlightPlayerOpen] = useState(false);
    const [editHighlightOpen, setEditHighlightOpen] = useState(false);
    const [returnToPlayer, setReturnToPlayer] = useState(false);
    const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);

    const activeProject = projects.find(p => p.id === activeProjectId);
    const collectionIdToUse = id || activeCollectionId;
    const activeCollection = collections.find(c => c.id === collectionIdToUse);
    const selectedHighlight = highlights.find(h => h.id === selectedHighlightId) || null;
    const selectedFile = selectedHighlight ? files.find(f => f.id === selectedHighlight.fileId) || null : null;

    // Filter highlights for this collection
    const collectionHighlights = highlights.filter(h =>
        h.collectionId === collectionIdToUse &&
        (h.note || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleHighlightClick = (h: Highlight) => {
        if (selectionMode) {
            toggleSelection(h.id);
            return;
        }

        setSelectedHighlightId(h.id);
        setHighlightPlayerOpen(true);
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
        setSelectedItems(new Set(collectionHighlights.map(h => h.id)));
    };

    const handleDeselectAll = () => {
        setSelectedItems(new Set());
    };

    const handleDeleteSelected = () => {
        useStore.setState(state => ({
            highlights: state.highlights.filter(h => !selectedItems.has(h.id))
        }));
        setSelectedItems(new Set());
        setSelectionMode(false);
    };

    const CollectionIcon = getIcon(activeCollection?.icon);

    return (
        <div className="flex flex-col h-full bg-transparent text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card/30">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                        <CollectionIcon weight="fill" size={24} style={{ color: activeCollection?.color }} />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold leading-none">{activeCollection?.name || "Collection"}</h1>
                        <p className="text-xs text-muted-foreground mt-1">{collectionHighlights.length} highlights</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-64 mr-2">
                        <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                        <Input
                            placeholder="Search highlights..."
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
                            <Button variant="ghost" size="sm" onClick={handleSelectAll} disabled={selectedItems.size === collectionHighlights.length}>
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
                                        <AlertDialogTitle>Delete selected highlights?</AlertDialogTitle>
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
                    {collectionHighlights.map(h => {
                        const file = files.find(f => f.id === h.fileId);
                        if (!file) return null;
                        const isSelected = selectedItems.has(h.id);

                        return (
                            <ContextMenu key={h.id}>
                                <ContextMenuTrigger>
                                    <div
                                        className={cn(
                                            "group relative flex flex-col rounded-lg border bg-card transition-all overflow-hidden cursor-pointer hover:shadow-md",
                                            isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                                        )}
                                        onClick={() => handleHighlightClick(h)}
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
                                                    {/* FileIconByType placeholder since I can't import it easily without breaking things or I should have checked if it was imported. It seems it was used in previous code but I don't see import. I'll assume it's available or I'll just use a generic icon */}
                                                    <FilmStrip size={48} />
                                                </div>
                                            )}

                                            {/* Time Badge */}
                                            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono font-medium">
                                                {file.type === 'pdf'
                                                    ? (h.end && h.end !== h.start
                                                        ? `Page ${h.start}-${h.end}`
                                                        : `Page ${h.start}`)
                                                    : `${formatTime(h.start)} - ${formatTime(h.end || h.start)}`
                                                }
                                            </div>

                                            {/* Type Badge */}
                                            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase flex items-center gap-1">
                                                {/* <LocalFileIconByType type={file.type} size={10} /> */}
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
                                                {h.note || "Untitled Highlight"}
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
                                            toggleSelection(h.id);
                                        }}
                                        className="gap-2"
                                    >
                                        <CheckSquare size={16} /> Select
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        onClick={() => {
                                            setSelectedHighlightId(h.id);
                                            setHighlightPlayerOpen(true);
                                        }}
                                        className="gap-2"
                                    >
                                        <FilmStrip size={16} /> Play Highlight
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        onClick={() => {
                                            setSelectedHighlightId(h.id);
                                            setEditHighlightOpen(true);
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
                                                highlights: state.highlights.filter(item => item.id !== h.id)
                                            }));
                                        }}
                                    >
                                        <Trash size={16} /> Delete
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>
                        );
                    })}

                    {collectionHighlights.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50">
                            <CollectionIcon size={64} weight="thin" />
                            <p className="mt-4 text-sm font-medium">No highlights in this collection</p>
                            <p className="text-xs">Add highlights from the video player</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <HighlightPlayerDialog
                open={highlightPlayerOpen}
                onOpenChange={setHighlightPlayerOpen}
                highlight={selectedHighlight}
                file={selectedFile}
                collection={collections.find(c => c.id === selectedHighlight?.collectionId)}
                collections={collections.filter(c => c.projectId === activeProjectId && !c.deleted)}
                onUpdate={(updates) => {
                    if (selectedHighlight) {
                        updateHighlight(selectedHighlight.id, updates);
                    }
                }}
                onEditHighlight={() => {
                    setHighlightPlayerOpen(false);
                    setReturnToPlayer(true);
                    setEditHighlightOpen(true);
                }}
            />

            <EditHighlightDialog
                open={editHighlightOpen}
                onOpenChange={(open) => {
                    setEditHighlightOpen(open);
                    if (!open && returnToPlayer) {
                        setReturnToPlayer(false);
                        setHighlightPlayerOpen(true);
                    }
                }}
                highlight={selectedHighlight}
                collections={collections}
                file={selectedFile}
                onSave={(updates) => {
                    if (selectedHighlight) {
                        updateHighlight(selectedHighlight.id, updates);
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
