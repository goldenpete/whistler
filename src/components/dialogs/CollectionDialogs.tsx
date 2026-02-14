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
                    className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                />
            </div>

            {!isFolder && (
                <>
                    <ColorPicker
                        color={color}
                        onChange={setColor}
                        label="Collection Color"
                    />

                    <div className="space-y-2">
                        <Label className="text-zinc-400">Icon</Label>
                        <div className="grid grid-cols-7 gap-2">
                            {ICONS.map(({ name: iName, icon: Icon }) => (
                                <button
                                    key={iName}
                                    type="button"
                                    onClick={() => setIconName(iName)}
                                    className={cn(
                                        "aspect-square flex items-center justify-center rounded-md border transition-all",
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
    const { accentTheme, enableDefaultColorControls, defaultColors } = useStore();
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
                            className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>{isFolder ? "Edit Folder" : "Edit Collection"}</DialogTitle>
                    <DialogDescription className="sr-only">
                        Update your {isFolder ? "folder" : "collection"} details.
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
