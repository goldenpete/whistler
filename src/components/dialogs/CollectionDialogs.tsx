import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ColorPicker, PRESET_COLORS } from "@/components/ui/ColorPicker";
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
    Book
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { type Collection } from "@/types";



// Predefined Icons
const ICONS = [
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
];


interface CollectionFormProps {
    defaultName?: string;
    defaultColor?: string;
    defaultIcon?: string;
    onSubmit: (name: string, color: string, icon: string) => void;
    onCancel: () => void;
    submitLabel: string;
}

function CollectionForm({ defaultName = "", defaultColor = PRESET_COLORS[0], defaultIcon = "FolderPlus", onSubmit, onCancel, submitLabel }: CollectionFormProps) {
    const [name, setName] = useState(defaultName);
    const [color, setColor] = useState(defaultColor);
    const [iconName, setIconName] = useState(defaultIcon);

    const handleSubmit = () => {
        if (!name.trim()) return;
        onSubmit(name.trim(), color, iconName);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="space-y-6 py-4">
            <div className="space-y-2">
                <Label htmlFor="collection-name">Collection Name</Label>
                <Input
                    id="collection-name"
                    placeholder="My Collection"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="bg-zinc-900 border-zinc-800"
                />
            </div>

            <ColorPicker
                color={color}
                onChange={setColor}
                label="Collection Color"
            />

            <div className="space-y-2">
                <Label>Icon</Label>
                <div className="grid grid-cols-7 gap-2">
                    {ICONS.map(({ name: iName, icon: Icon }) => (
                        <button
                            key={iName}
                            type="button"
                            onClick={() => setIconName(iName)}
                            className={cn(
                                "aspect-square flex items-center justify-center rounded-md border transition-all",
                                iconName === iName
                                    ? "bg-primary/20 border-primary text-primary"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            )}
                            title={iName}
                        >
                            <Icon weight={iconName === iName ? "fill" : "regular"} size={20} />
                        </button>
                    ))}
                </div>
            </div>

            <DialogFooter className="pt-4">
                <Button variant="ghost" onClick={onCancel} className="hover:bg-white/10 text-zinc-400 hover:text-white">
                    Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!name.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
}

export function CreateCollectionDialog({ open, onOpenChange, onSubmit }: CreateCollectionDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>New Collection</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Customize your new collection.
                    </DialogDescription>
                </DialogHeader>
                <CollectionForm
                    onSubmit={(name, color, icon) => {
                        onSubmit(name, color, icon);
                        onOpenChange(false);
                    }}
                    onCancel={() => onOpenChange(false)}
                    submitLabel="Create"
                />
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Edit Collection</DialogTitle>
                </DialogHeader>
                {/* Use key to force re-render when collection changes */}
                <CollectionForm
                    key={collection.id}
                    defaultName={collection.name}
                    defaultColor={collection.color}
                    defaultIcon={collection.icon}
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
