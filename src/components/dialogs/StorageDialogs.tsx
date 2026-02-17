/**
 * ─── StorageDialogs.tsx ─────────────────────────────────────────────
 *
 * A comprehensive suite of dialogs for managing storages, folders,
 * files, graphs, and docs within a Whistler project. Also exports
 * the reusable EntityForm component and the shared ICONS constant.
 *
 * Features / Responsibilities:
 *   - EntityForm – generic name / description / colour / icon form
 *     reused by many creation and editing dialogs
 *   - AddFileDialog – import a file via URL, local file, or folder
 *   - NewFolderDialog / EditFolderDialog – create and rename folders
 *   - CreateStorageDialog / EditStorageDialog – manage storage
 *     volumes with name, colour, and icon
 *   - RenameFileDialog – update file name, description, and URL
 *   - EditGraphDialog / EditDocDialog – edit graph and document
 *     metadata
 *   - Shared ICONS array of Phosphor icons used across the app
 * ───────────────────────────────────────────────────────────────────
 */
import { useState, useEffect } from "react";
import type { KeyboardEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { ColorPicker, PRESET_COLORS, ACCENT_COLOR_MAP } from "@/components/ui/ColorPicker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Folder,
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
import { useStore } from "@/store/useStore";

// Predefined Icons
export const ICONS = [
    { name: "Folder", icon: Folder },
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

export interface EntityFormProps {
    defaultName?: string;
    defaultDescription?: string;
    defaultColor?: string;
    defaultIcon?: string;
    onSubmit: (name: string, description: string, color: string, icon: string) => void;
    onCancel: () => void;
    submitLabel: string;
    label: string;
    placeholder: string;
    allowNoIcon?: boolean;
    showDescription?: boolean;
}

export function EntityForm({ 
    defaultName = "", 
    defaultDescription = "",
    defaultColor = PRESET_COLORS[0], 
    defaultIcon = "Folder", 
    onSubmit, 
    onCancel, 
    submitLabel,
    label,
    placeholder,
    allowNoIcon = false,
    showDescription = false
}: EntityFormProps) {
    const [name, setName] = useState(defaultName);
    const [description, setDescription] = useState(defaultDescription);
    const [color, setColor] = useState(defaultColor);
    const [iconName, setIconName] = useState(defaultIcon);

    // Reset state when defaults change (e.g. opening different item)
    useEffect(() => {
        setName(defaultName);
        setDescription(defaultDescription);
        setColor(defaultColor);
        setIconName(defaultIcon);
    }, [defaultName, defaultDescription, defaultColor, defaultIcon]);

    const handleSubmit = () => {
        if (!name.trim()) return;
        onSubmit(name.trim(), description.trim(), color, iconName);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="entity-name" className="text-zinc-400">
                    {label}
                </Label>
                <Input
                    id="entity-name"
                    placeholder={placeholder}
                    value={name}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="bg-zinc-900 border-border/60 text-white placeholder:text-zinc-500"
                />
            </div>

            {showDescription && (
                <div className="space-y-2">
                    <Label htmlFor="entity-description" className="text-zinc-400">
                        Description
                    </Label>
                    <Textarea
                        id="entity-description"
                        placeholder="Add a description..."
                        value={description}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                        className="bg-zinc-900 border-border/60 text-white placeholder:text-zinc-500 resize-none h-24"
                    />
                </div>
            )}

            <ColorPicker
                color={color}
                onChange={setColor}
                label="Color"
            />

            <div className="space-y-2">
                <Label className="text-zinc-400">Icon</Label>
                <div className="grid grid-cols-7 gap-2">
                    {allowNoIcon && (
                        <button
                            type="button"
                            onClick={() => setIconName("")}
                            className={cn(
                                "aspect-square flex items-center justify-center rounded-md border transition-all",
                                !iconName
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                            )}
                            title="None"
                        >
                            <span className="text-[10px] uppercase font-medium">None</span>
                        </button>
                    )}
                    {ICONS.map(({ name: iName, icon: Icon }) => (
                        <button
                            key={iName}
                            type="button"
                            onClick={() => setIconName(iName)}
                            className={cn(
                                "aspect-square flex items-center justify-center rounded-md border transition-all",
                                iconName === iName
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                            )}
                            title={iName}
                        >
                            <Icon weight={iconName === iName ? "fill" : "bold"} size={20} />
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button 
                    variant="ghost" 
                    onClick={onCancel} 
                    className="text-zinc-400 hover:text-white hover:bg-zinc-900"
                >
                    Cancel
                </Button>
                <Button 
                    onClick={handleSubmit} 
                    disabled={!name.trim()} 
                    className="bg-primary text-primary-foreground hover:opacity-90" 
                    data-sound-confirm
                >
                    {submitLabel}
                </Button>
            </div>
        </div>
    );
}

interface AddFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (url: string, name: string) => void;
}

export function AddFileDialog({ open, onOpenChange, onSubmit }: AddFileDialogProps) {
    const [url, setUrl] = useState("");
    const [name, setName] = useState("");

    const handleSubmit = () => {
        if (!url.trim()) return;

        // If no name provided, extract from URL
        const finalName = name.trim() || extractFilename(url);
        onSubmit(url.trim(), finalName);

        // Reset form
        setUrl("");
        setName("");
        onOpenChange(false);
    };

    const handleUrlChange = (value: string) => {
        setUrl(value);
        // Auto-fill name from URL if name is empty
        if (!name.trim()) {
            setName(extractFilename(value));
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Add File</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Enter a web link to a video, PDF, image, or other file.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="url" className="text-zinc-400">
                            URL
                        </Label>
                        <Input
                            id="url"
                            placeholder="https://example.com/video.mp4"
                            value={url}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleUrlChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="bg-zinc-900 border-border/60 text-white placeholder:text-zinc-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-zinc-400">
                            Display Name
                        </Label>
                        <Input
                            id="name"
                            placeholder="My File"
                            value={name}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="bg-zinc-900 border-white text-white placeholder:text-zinc-500"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <Button 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)}
                        className="text-zinc-400 hover:text-white hover:bg-zinc-900"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={!url.trim()}
                        className="bg-primary text-primary-foreground hover:opacity-90"
                        data-sound-confirm
                    >
                        Add to Project
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface NewFolderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string, description: string, color: string, icon: string) => void;
}

export function NewFolderDialog({ open, onOpenChange, onSubmit }: NewFolderDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Add Folder</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Create a folder to organize your collections.
                    </DialogDescription>
                </DialogHeader>
                <EntityForm
                    label="Folder Name"
                    placeholder="My Folder"
                    submitLabel="Create"
                    showDescription={true}
                    onSubmit={(name, description, color, icon) => {
                        onSubmit(name, description, color, icon);
                        onOpenChange(false);
                    }}
                    onCancel={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

interface CreateStorageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string, color: string, icon: string) => void;
}

export function CreateStorageDialog({ open, onOpenChange, onSubmit }: CreateStorageDialogProps) {
    const store = useStore.getState();
    const { accentTheme, enableDefaultColorControls, defaultColors } = store;
    const accentColor = ACCENT_COLOR_MAP[(accentTheme as keyof typeof ACCENT_COLOR_MAP) || "orange"] ?? PRESET_COLORS[0];
    const storageColor = enableDefaultColorControls && defaultColors?.storage !== undefined
        ? defaultColors.storage
        : accentColor;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>New Storage</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Create a new storage location for your files.
                    </DialogDescription>
                </DialogHeader>
                <EntityForm
                    label="Storage Name"
                    placeholder="My Storage"
                    submitLabel="Create"
                    defaultColor={storageColor}
                    onSubmit={(name, description, color, icon) => {
                        onSubmit(name, color, icon);
                        onOpenChange(false);
                    }}
                    onCancel={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

interface EditStorageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string, color: string, icon: string) => void;
    initialName: string;
    initialColor?: string;
    initialIcon?: string;
}

export function EditStorageDialog({ open, onOpenChange, onSubmit, initialName, initialColor, initialIcon }: EditStorageDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Edit Storage</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Update storage details.
                    </DialogDescription>
                </DialogHeader>
                <EntityForm
                    label="Storage Name"
                    placeholder="My Storage"
                    submitLabel="Save"
                    defaultName={initialName}
                    defaultColor={initialColor}
                    defaultIcon={initialIcon}
                    onSubmit={(name, description, color, icon) => {
                        onSubmit(name, color, icon);
                        onOpenChange(false);
                    }}
                    onCancel={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

function extractFilename(url: string): string {
    try {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            return 'YouTube Video';
        }
        const parsedUrl = new URL(url);
        const pathname = parsedUrl.pathname;
        const filename = pathname.split('/').pop() || '';
        // Remove query params and decode
        return decodeURIComponent(filename.split('?')[0]) || 'Untitled';
    } catch {
        // If URL parsing fails, try simple extraction
        const parts = url.split('/');
        return parts[parts.length - 1]?.split('?')[0] || 'Untitled';
    }
}

interface RenameFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string, description: string, url: string) => void;
    initialName: string;
    initialDescription?: string;
    initialUrl?: string;
    showDescription?: boolean;
}

export function RenameFileDialog({ open, onOpenChange, onSubmit, initialName, initialDescription = "", initialUrl = "", showDescription = true }: RenameFileDialogProps) {
    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState(initialDescription);
    const [url, setUrl] = useState(initialUrl);

    useEffect(() => {
        setName(initialName);
        setDescription(initialDescription || "");
        setUrl(initialUrl || "");
    }, [initialName, initialDescription, initialUrl, open]);

    const handleSubmit = () => {
        if (!name.trim()) return;
        onSubmit(name.trim(), description.trim(), url.trim());
        onOpenChange(false);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>{showDescription ? "Edit File Details" : "Rename"}</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Update the file's name, link, and description.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="rename-file-name" className="text-zinc-400">
                            Name
                        </Label>
                        <Input
                            id="rename-file-name"
                            placeholder="Name"
                            value={name}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="bg-zinc-900 border-border/60 text-white placeholder:text-zinc-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="rename-file-url" className="text-zinc-400">
                            Link
                        </Label>
                        <Input
                            id="rename-file-url"
                            placeholder="https://..."
                            value={url}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="bg-zinc-900 border-white text-white placeholder:text-zinc-500"
                        />
                    </div>

                    {showDescription && (
                        <div className="space-y-2">
                            <Label htmlFor="rename-file-description" className="text-zinc-400">
                                Description
                            </Label>
                            <Textarea
                                id="rename-file-description"
                                placeholder="Add a description..."
                                value={description}
                                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                                className="bg-zinc-900 border-white text-white placeholder:text-zinc-500 resize-none h-24"
                            />
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <Button 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)} 
                        className="text-zinc-400 hover:text-white hover:bg-zinc-900"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={!name.trim()} 
                        className="bg-primary text-primary-foreground hover:opacity-90"
                        data-sound-confirm
                    >
                        Save
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface EditGraphDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string, color: string, icon: string) => void;
    initialName: string;
    initialColor?: string;
    initialIcon?: string;
}

export function EditGraphDialog({ open, onOpenChange, onSubmit, initialName, initialColor, initialIcon }: EditGraphDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Edit Graph</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Update graph details.
                    </DialogDescription>
                </DialogHeader>
                <EntityForm
                    label="Graph Name"
                    placeholder="My Graph"
                    submitLabel="Save"
                    defaultName={initialName}
                    defaultColor={initialColor}
                    defaultIcon={initialIcon}
                    onSubmit={(name, description, color, icon) => {
                        onSubmit(name, color, icon);
                        onOpenChange(false);
                    }}
                    onCancel={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

interface EditDocDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string, color: string, icon: string) => void;
    initialName: string;
    initialColor?: string;
    initialIcon?: string;
}

export function EditDocDialog({ open, onOpenChange, onSubmit, initialName, initialColor, initialIcon }: EditDocDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Edit Document</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Update document details.
                    </DialogDescription>
                </DialogHeader>
                <EntityForm
                    label="Document Name"
                    placeholder="Document Name"
                    submitLabel="Save"
                    defaultName={initialName}
                    defaultColor={initialColor}
                    defaultIcon={initialIcon}
                    onSubmit={(name, description, color, icon) => {
                        onSubmit(name, color, icon);
                        onOpenChange(false);
                    }}
                    onCancel={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

interface EditFolderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string, description: string, color: string, icon: string) => void;
    initialName: string;
    initialDescription?: string;
    initialColor?: string;
    initialIcon?: string;
}

export function EditFolderDialog({ open, onOpenChange, onSubmit, initialName, initialDescription, initialColor, initialIcon }: EditFolderDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Edit Folder</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Update folder details.
                    </DialogDescription>
                </DialogHeader>
                <EntityForm
                    label="Folder Name"
                    placeholder="My Folder"
                    submitLabel="Save"
                    defaultName={initialName}
                    defaultDescription={initialDescription}
                    defaultColor={initialColor}
                    defaultIcon={initialIcon}
                    showDescription={true}
                    onSubmit={(name, description, color, icon) => {
                        onSubmit(name, description, color, icon);
                        onOpenChange(false);
                    }}
                    onCancel={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}
