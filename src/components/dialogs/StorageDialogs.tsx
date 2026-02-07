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
        <div className="space-y-6 py-4">
            <div className="space-y-2">
                <Label htmlFor="entity-name">{label}</Label>
                <Input
                    id="entity-name"
                    placeholder={placeholder}
                    value={name}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="bg-zinc-900 border-zinc-800"
                />
            </div>

            {showDescription && (
                <div className="space-y-2">
                    <Label htmlFor="entity-description">Description</Label>
                    <Textarea
                        id="entity-description"
                        placeholder="Add a description..."
                        value={description}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 resize-none h-24"
                    />
                </div>
            )}

            <ColorPicker
                color={color}
                onChange={setColor}
                label="Color"
            />

            <div className="space-y-2">
                <Label>Icon</Label>
                <div className="grid grid-cols-7 gap-2">
                    {allowNoIcon && (
                        <button
                            type="button"
                            onClick={() => setIconName("")}
                            className={cn(
                                "aspect-square flex items-center justify-center rounded-md border transition-all",
                                !iconName
                                    ? "bg-primary/20 border-primary text-primary"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            )}
                            title="None"
                        >
                            <span className="text-xs font-medium">None</span>
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
                                    ? "bg-primary/20 border-primary text-primary"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            )}
                            title={iName}
                        >
                            <Icon weight="regular" size={20} />
                        </button>
                    ))}
                </div>
            </div>

            <DialogFooter className="pt-4">
                <Button variant="ghost" onClick={onCancel} className="hover:bg-white/10 text-zinc-400 hover:text-white">
                    Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!name.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground" data-sound-confirm>
                    {submitLabel}
                </Button>
            </DialogFooter>
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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add File</DialogTitle>
                    <DialogDescription>
                        Enter a web link to a video, PDF, image, or other file.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="url">URL</Label>
                        <Input
                            id="url"
                            placeholder="https://example.com/video.mp4"
                            value={url}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleUrlChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Name (optional)</Label>
                        <Input
                            id="name"
                            placeholder="My Video"
                            value={name}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    <div className="space-y-2 text-xs text-muted-foreground">
                        <p>
                            Upload your file to a hosting service and paste the direct URL above:
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                            <div className="space-y-1">
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Permanent
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <a
                                        href="https://catbox.moe/"
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="px-2 py-1 rounded-md border border-border/60 hover:border-primary/60 hover:text-primary transition-colors"
                                    >
                                        catbox.moe
                                    </a>
                                    <a
                                        href="https://pomf2.lain.la/"
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="px-2 py-1 rounded-md border border-border/60 hover:border-primary/60 hover:text-primary transition-colors"
                                    >
                                        pomf2.lain.la
                                    </a>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Temporary
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <a
                                        href="https://litterbox.catbox.moe/"
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="px-2 py-1 rounded-md border border-border/60 hover:border-primary/60 hover:text-primary transition-colors"
                                    >
                                        litterbox
                                    </a>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Other Options
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <a
                                        href="https://youtube.com/"
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="px-2 py-1 rounded-md border border-border/60 hover:border-primary/60 hover:text-primary transition-colors"
                                    >
                                        YouTube
                                    </a>
                                </div>
                            </div>
                        </div>
                        <p className="text-[11px]">
                            Discord file links also work here. Any direct video, image, or PDF URL from the web can be imported.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!url.trim()} data-sound-confirm>
                        Add File
                    </Button>
                </DialogFooter>
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
                    <DialogTitle>New Folder</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Customize your new folder.
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
                    <DialogTitle>Create Storage</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Customize your new storage.
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
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="rename-file-name">Name</Label>
                        <Input
                            id="rename-file-name"
                            placeholder="Name"
                            value={name}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="bg-zinc-900 border-zinc-800"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="rename-file-url">Link</Label>
                        <Input
                            id="rename-file-url"
                            placeholder="https://..."
                            value={url}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="bg-zinc-900 border-zinc-800 font-mono text-xs"
                        />
                    </div>

                    {showDescription && (
                        <div className="space-y-2">
                            <Label htmlFor="rename-file-description">Description</Label>
                            <Textarea
                                id="rename-file-description"
                                placeholder="Add a description..."
                                value={description}
                                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 resize-none h-24"
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-white/10 text-zinc-400 hover:text-white">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!name.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground" data-sound-confirm>
                        Save
                    </Button>
                </DialogFooter>
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
