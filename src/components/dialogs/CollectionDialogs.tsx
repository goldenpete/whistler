/**
 * ─── CollectionDialogs.tsx ──────────────────────────────────────────
 *
 * Dialog components for creating and editing collections and
 * collection folders within the Whistler project.
 *
 * Features / Responsibilities:
 *   - CreateCollectionDialog – create a new collection with a custom
 *     name, accent colour, and icon
 *   - CreateFolderDialog – lightweight variant for creating plain
 *     collection folders
 *   - EditCollectionDialog – modify the name, colour, and icon of an
 *     existing collection
 *   - Shared CollectionForm with colour-picker and icon-grid
 *   - Predefined ICONS constant used across the collection UI
 * ───────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, type ChangeEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { ColorPicker, PRESET_COLORS, ACCENT_COLOR_MAP } from "@/components/ui/ColorPicker";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    FolderPlus,
    Star,
    Heart,
    Flag,
    Tag,
    Bookmark,
    Briefcase,
    House,
    User,
    Users,
    Planet,
    Rocket,
    Code,
    Cpu,
    Database,
    GameController,
    MusicNotes,
    Image,
    FilmStrip,
    FileText,
    Book,
    HardDrives
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { type Collection } from "@/types";



// Predefined Icons
export const ICONS = [
    { name: "FolderPlus", icon: FolderPlus },
    { name: "Star", icon: Star },
    { name: "Heart", icon: Heart },
    { name: "Flag", icon: Flag },
    { name: "Tag", icon: Tag },
    { name: "Bookmark", icon: Bookmark },
    { name: "Briefcase", icon: Briefcase },
    { name: "House", icon: House },
    { name: "User", icon: User },
    { name: "Users", icon: Users },
    { name: "Planet", icon: Planet },
    { name: "Rocket", icon: Rocket },
    { name: "Code", icon: Code },
    { name: "Cpu", icon: Cpu },
    { name: "Database", icon: Database },
    { name: "GameController", icon: GameController },
    { name: "MusicNotes", icon: MusicNotes },
    { name: "Image", icon: Image },
    { name: "FilmStrip", icon: FilmStrip },
    { name: "FileText", icon: FileText },
    { name: "Book", icon: Book },
    { name: "HardDrives", icon: HardDrives },
];


interface CollectionFormProps {
    key?: any;
    defaultName?: string;
    defaultColor?: string;
    defaultIcon?: string;
    onSubmit: (name: string, color: string, icon: string) => void;
    onCancel: () => void;
    submitLabel: string;
    isFolder?: boolean;
}

function CollectionForm({ defaultName = "", defaultColor = PRESET_COLORS[0], defaultIcon = "FolderPlus", onSubmit, onCancel, submitLabel, isFolder = false }: CollectionFormProps) {
    const [name, setName] = useState(defaultName);
    const [color, setColor] = useState(defaultColor);
    const [iconName, setIconName] = useState(defaultIcon);
    const [customizeTab, setCustomizeTab] = useState("color");

    useEffect(() => {
        setName(defaultName);
        setColor(defaultColor);
        setIconName(defaultIcon);
        setCustomizeTab("color");
    }, [defaultName, defaultColor, defaultIcon]);

    const handleSubmit = () => {
        if (!name.trim()) return;
        onSubmit(name.trim(), color, iconName);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="collection-name" className="text-zinc-400">{isFolder ? "Folder Name" : "Collection Name"}</Label>
                <Input
                    id="collection-name"
                    placeholder={isFolder ? "E.g. Projects" : "E.g. My Favorite Things"}
                    value={name}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="bg-zinc-900 border-border/60 text-white placeholder:text-zinc-500"
                />
            </div>

            {!isFolder && (
                <>
                    <div className="space-y-2">
                        <Label className="text-zinc-400">Customize</Label>
                        <Tabs value={customizeTab} onValueChange={setCustomizeTab} className="border border-zinc-800 bg-zinc-950/40 rounded-none overflow-hidden">
                            <TabsList className="w-full rounded-none bg-zinc-900 border-b border-zinc-800 p-1 h-9">
                                <TabsTrigger value="color" className="flex-1 rounded-none text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Color</TabsTrigger>
                                <TabsTrigger value="icon" className="flex-1 rounded-none text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Icon</TabsTrigger>
                            </TabsList>

                            <TabsContent value="color" className="mt-0 p-3">
                                <ColorPicker
                                    color={color}
                                    onChange={setColor}
                                    showLabel={false}
                                />
                            </TabsContent>

                            <TabsContent value="icon" className="mt-0 p-3">
                                <div className="grid grid-cols-7 gap-2">
                                    {ICONS.map(({ name: iName, icon: Icon }) => (
                                        <button
                                            key={iName}
                                            type="button"
                                            onClick={() => setIconName(iName)}
                                            className={cn(
                                                "aspect-square flex items-center justify-center rounded-none border transition-all",
                                                iconName === iName
                                                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                            )}
                                            title={iName}
                                        >
                                            <Icon weight={iconName === iName ? "fill" : "bold"} size={20} />
                                        </button>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </>
            )}

            <DialogFooter>
                <Button variant="outline" onClick={onCancel} className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800">
                    Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!name.trim()} data-sound-confirm>
                    {submitLabel}
                </Button>
            </DialogFooter>
        </div>
    );
}


interface CreateCollectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string, color: string, icon: string) => void;
    initialData?: { name: string; color: string; icon: string };
    title?: string;
}

export function CreateCollectionDialog({ open, onOpenChange, onSubmit, initialData, title = "New Collection" }: CreateCollectionDialogProps) {
    const { accentTheme, enableDefaultColorControls, defaultColors } = useStore(useShallow((state) => ({
        accentTheme: state.accentTheme,
        enableDefaultColorControls: state.enableDefaultColorControls,
        defaultColors: state.defaultColors,
    })));
    const accentKey = (accentTheme || "orange") as keyof typeof ACCENT_COLOR_MAP;
    const accentColor = ACCENT_COLOR_MAP[accentKey] ?? PRESET_COLORS[0];
    const collectionColor = enableDefaultColorControls && defaultColors?.collection !== undefined
        ? defaultColors.collection
        : accentColor;

    const isBucket = title === "New Bucket";
    const defaultIcon = isBucket ? "HardDrives" : "FolderPlus";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        {initialData ? (isBucket ? "Edit your bucket details." : "Edit your collection details.") : (isBucket ? "Customize your new bucket." : "Customize your new collection.")}
                    </DialogDescription>
                </DialogHeader>
                <CollectionForm
                    key={open ? (initialData ? "edit" : "create") : "closed"}
                    defaultName={initialData?.name}
                    defaultColor={initialData?.color ?? collectionColor}
                    defaultIcon={initialData?.icon ?? defaultIcon}
                    onSubmit={(name, color, icon) => {
                        onSubmit(name, color, icon);
                        onOpenChange(false);
                    }}
                    onCancel={() => onOpenChange(false)}
                    submitLabel={initialData ? "Save" : "Create"}
                />
            </DialogContent>
        </Dialog>
    );
}

interface CreateFolderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string) => void;
}

export function CreateFolderDialog({ open, onOpenChange, onSubmit }: CreateFolderDialogProps) {
    const [name, setName] = useState("");

    const handleSubmit = () => {
        if (!name.trim()) return;
        onSubmit(name.trim());
        setName("");
        onOpenChange(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>New Folder</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Enter a name for your new folder.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="folder-name" className="text-zinc-400">Folder Name</Label>
                        <Input
                            id="folder-name"
                            placeholder="E.g. Projects"
                            value={name}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="bg-zinc-900 border-border/60 text-white placeholder:text-zinc-500"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!name.trim()} data-sound-confirm>
                        Create Folder
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface EditCollectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    collection: Collection | null;
    onSubmit: (id: string, updates: { name: string; color: string; icon: string }) => void;
}

export function EditCollectionDialog({ open, onOpenChange, collection, onSubmit }: EditCollectionDialogProps) {
    // Reset form state when collection changes or dialog opens is handled by key={collection?.id} strategy or inside Form using useEffect

    if (!collection) return null;

    const isFolder = collection.type === 'folder';
    const isBucket = collection.type === 'bucket';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>{isBucket ? "Edit Bucket" : isFolder ? "Edit Folder" : "Edit Collection"}</DialogTitle>
                    <DialogDescription className="sr-only">
                        Update your {isBucket ? "bucket" : isFolder ? "folder" : "collection"} details.
                    </DialogDescription>
                </DialogHeader>
                {/* Use key to force re-render when collection changes */}
                <CollectionForm
                    key={collection.id}
                    defaultName={collection.name}
                    defaultColor={collection.color}
                    defaultIcon={collection.icon}
                    isFolder={isFolder}
                    onSubmit={(name, color, icon) => {
                        onSubmit(collection.id, { name, color, icon });
                        onOpenChange(false);
                    }}
                    onCancel={() => onOpenChange(false)}
                    submitLabel="Save Changes"
                />
            </DialogContent>
        </Dialog>
    );
}
