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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    Book,
    WarningOctagon
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { pickLocalFile, supportsLocalFileAccess, type PickedLocalFile } from "@/utils/localFiles";
import {
    type CloudFileDraft,
    type CloudFileTypeSelection,
    type CloudProvider,
    createCloudFileSource,
    detectCloudProvider,
    getCloudProviderLabel,
} from "@/utils/cloudFiles";
import { LocalFileAccessPanel } from "@/components/player/LocalFileAccessPanel";

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

interface EntityFormProps {
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
    footerPrefix?: React.ReactNode;
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
    showDescription = false,
    footerPrefix,
}: EntityFormProps) {
    const [name, setName] = useState(defaultName);
    const [description, setDescription] = useState(defaultDescription);
    const [color, setColor] = useState(defaultColor);
    const [iconName, setIconName] = useState(defaultIcon);
    const [customizeTab, setCustomizeTab] = useState("color");

    // Reset state when defaults change (e.g. opening different item)
    useEffect(() => {
        setName(defaultName);
        setDescription(defaultDescription);
        setColor(defaultColor);
        setIconName(defaultIcon);
        setCustomizeTab("color");
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
        <div className="space-y-4 pt-4">
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
                            {allowNoIcon && (
                                <button
                                    type="button"
                                    onClick={() => setIconName("")}
                                    className={cn(
                                        "aspect-square flex items-center justify-center rounded-none border transition-all",
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
                                        "aspect-square flex items-center justify-center rounded-none border transition-all",
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
                    </TabsContent>
                </Tabs>
            </div>

            <div className="flex items-center gap-2 pt-4">
                {footerPrefix ? <div className="mr-auto">{footerPrefix}</div> : null}
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
    onSubmitRemote: (url: string, name: string) => void;
    onSubmitCloud: (draft: CloudFileDraft) => void;
    onSubmitLocal: (selection: PickedLocalFile) => Promise<void> | void;
    defaultTab?: "web" | "cloud" | "local";
}

export function AddFileDialog({ open, onOpenChange, onSubmitRemote, onSubmitCloud, onSubmitLocal, defaultTab = "web" }: AddFileDialogProps) {
    const googleDriveApiKey = useStore((state) => state.googleDriveApiKey);
    const [url, setUrl] = useState("");
    const [name, setName] = useState("");
    const [cloudUrl, setCloudUrl] = useState("");
    const [cloudName, setCloudName] = useState("");
    const [cloudProvider, setCloudProvider] = useState<CloudProvider>("google-drive");
    const [cloudTypeSelection, setCloudTypeSelection] = useState<CloudFileTypeSelection>("auto");
    const [tab, setTab] = useState<"web" | "cloud" | "local">(defaultTab);
    const [selectedLocalFile, setSelectedLocalFile] = useState<PickedLocalFile | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        // Reset the dialog to the caller's requested mode each time it opens so
        // explicit "Add Local File" actions always land on the right tab.
        setTab(defaultTab);
    }, [defaultTab, open]);

    const handleSubmitRemote = () => {
        if (!url.trim()) return;

        // If no name provided, extract from URL
        const finalName = name.trim() || extractFilename(url);
        onSubmitRemote(url.trim(), finalName);

        // Reset form
        setUrl("");
        setName("");
        onOpenChange(false);
    };

    const handleSubmitCloud = () => {
        if (!cloudUrl.trim()) return;

        const detectedProvider = detectCloudProvider(cloudUrl) || cloudProvider;
        const cloudSource = createCloudFileSource(detectedProvider, cloudUrl);
        if (!cloudSource) {
            alert("Unsupported cloud share link. Use a public Google Drive, Dropbox, or OneDrive file link.");
            return;
        }

        onSubmitCloud({
            provider: detectedProvider,
            shareUrl: cloudSource.shareUrl,
            name: cloudName.trim() || getSuggestedCloudName(cloudSource.shareUrl, detectedProvider),
            typeSelection: cloudTypeSelection,
        });

        setCloudUrl("");
        setCloudName("");
        setCloudProvider("google-drive");
        setCloudTypeSelection("auto");
        onOpenChange(false);
    };

    const handleSubmitLocal = async () => {
        if (!selectedLocalFile) return;

        await onSubmitLocal(selectedLocalFile);
        setSelectedLocalFile(null);
        onOpenChange(false);
    };

    const handlePickLocalFile = async () => {
        const picked = await pickLocalFile();

        if (!picked) {
            return;
        }

        setSelectedLocalFile(picked);
    };

    const handleUrlChange = (value: string) => {
        setUrl(value);
        // Auto-fill name from URL if name is empty
        if (!name.trim()) {
            setName(extractFilename(value));
        }
    };

    const handleCloudUrlChange = (value: string) => {
        setCloudUrl(value);

        const detectedProvider = detectCloudProvider(value);
        if (detectedProvider) {
            setCloudProvider(detectedProvider);
        }

        if (!cloudName.trim()) {
            setCloudName(getSuggestedCloudName(value, detectedProvider || cloudProvider));
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (tab === "web") {
                handleSubmitRemote();
            } else if (tab === "cloud") {
                handleSubmitCloud();
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Add File</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Add a web link, a public cloud share link, or attach a file directly from this device.
                    </DialogDescription>
                </DialogHeader>
                <Tabs value={tab} onValueChange={(value) => setTab(value as "web" | "cloud" | "local")} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 rounded-none bg-zinc-900 border border-zinc-800 p-1 h-10">
                        <TabsTrigger value="web" className="rounded-none data-[state=active]:bg-zinc-800">Web Link</TabsTrigger>
                        <TabsTrigger value="cloud" className="rounded-none data-[state=active]:bg-zinc-800">Cloud</TabsTrigger>
                        <TabsTrigger value="local" className="rounded-none data-[state=active]:bg-zinc-800">Local File</TabsTrigger>
                    </TabsList>

                    <TabsContent value="web" className="space-y-4 py-4">
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
                                autoFocus={tab === "web"}
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
                                className="bg-zinc-900 border-border/60 text-white placeholder:text-zinc-500"
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="cloud" className="space-y-4 py-4">
                        <div className="rounded-none border border-zinc-800/80 bg-zinc-950/40 p-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">Provider</Label>
                                    <Select value={cloudProvider} onValueChange={(value) => setCloudProvider(value as CloudProvider)}>
                                        <SelectTrigger className="h-11 w-full bg-zinc-900/90 border-zinc-700 text-white hover:bg-zinc-900 focus-visible:border-zinc-500">
                                            <SelectValue placeholder="Select cloud provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="google-drive">Google Drive</SelectItem>
                                            <SelectItem value="dropbox">Dropbox</SelectItem>
                                            <SelectItem value="onedrive">OneDrive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">File Type</Label>
                                    <Select value={cloudTypeSelection} onValueChange={(value) => setCloudTypeSelection(value as CloudFileTypeSelection)}>
                                        <SelectTrigger className="h-11 w-full bg-zinc-900/90 border-zinc-700 text-white hover:bg-zinc-900 focus-visible:border-zinc-500">
                                            <SelectValue placeholder="Auto detect" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="auto">Auto detect</SelectItem>
                                            <SelectItem value="video">Video</SelectItem>
                                            <SelectItem value="audio">Audio</SelectItem>
                                            <SelectItem value="image">Image</SelectItem>
                                            <SelectItem value="pdf">PDF</SelectItem>
                                            <SelectItem value="file">Generic file</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cloud-url" className="text-zinc-400">
                                Share Link
                            </Label>
                            <Input
                                id="cloud-url"
                                placeholder="Paste a public share link"
                                value={cloudUrl}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => handleCloudUrlChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus={tab === "cloud"}
                                className="bg-zinc-900 border-border/60 text-white placeholder:text-zinc-500"
                            />
                            <p className="text-xs text-zinc-500">
                                Public file links from Google Drive, Dropbox, and OneDrive are supported.
                            </p>
                            {cloudProvider === 'google-drive' && !googleDriveApiKey && (
                                <p className="text-xs text-amber-300">
                                    Google Drive keeps full seek, speed, and highlight controls only when a Google Drive API key is set in Settings &gt; Audio &amp; Media. Otherwise playback falls back to Google&apos;s preview player.
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cloud-name" className="text-zinc-400">
                                Display Name
                            </Label>
                            <Input
                                id="cloud-name"
                                placeholder={`${getCloudProviderLabel(cloudProvider)} file`}
                                value={cloudName}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setCloudName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="bg-zinc-900 border-border/60 text-white placeholder:text-zinc-500"
                            />
                        </div>

                    </TabsContent>

                    <TabsContent value="local" className="space-y-4 py-4">
                        {!supportsLocalFileAccess() ? (
                            <LocalFileAccessPanel
                                file={{
                                    id: 'unsupported-local-file',
                                    projectId: 'unsupported',
                                    storageId: 'unsupported',
                                    parentId: null,
                                    name: 'Local file support unavailable',
                                    url: null,
                                    sourceKind: 'local',
                                    localSource: {
                                        bindingId: 'unsupported',
                                        originalFileName: 'This browser is missing File System Access API support',
                                        mimeType: '',
                                        size: 0,
                                        lastModified: 0,
                                        addedAt: 0,
                                    },
                                    type: 'file',
                                    order: 0,
                                    created: 0,
                                    lastModified: 0,
                                }}
                                availability="unsupported"
                                onRequestAccess={async () => false}
                                onRelink={async () => false}
                                compact={true}
                            />
                        ) : (
                            <>
                                <div className="rounded-none border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-medium text-white">Pick a file from your device</p>
                                            <p className="text-xs text-zinc-400">Whistler stores a browser handle locally so this file record can reconnect across sessions.</p>
                                        </div>
                                        <Button type="button" onClick={() => void handlePickLocalFile()} data-sound-confirm>
                                            Browse
                                        </Button>
                                    </div>

                                    {selectedLocalFile ? (
                                        <div className="rounded-none border border-zinc-800 bg-black/20 px-3 py-3 text-xs space-y-1">
                                            <div><span className="text-zinc-400">Name:</span> <span className="text-white">{selectedLocalFile.browserFile.name}</span></div>
                                            <div><span className="text-zinc-400">Type:</span> <span className="text-white">{selectedLocalFile.inferredType}</span></div>
                                            <div><span className="text-zinc-400">MIME:</span> <span className="text-white">{selectedLocalFile.browserFile.type || 'Unknown'}</span></div>
                                            <div><span className="text-zinc-400">Size:</span> <span className="text-white">{Math.max(1, Math.round(selectedLocalFile.browserFile.size / 1024))} KB</span></div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-zinc-500">No file selected yet.</p>
                                    )}
                                </div>
                            </>
                        )}
                    </TabsContent>
                </Tabs>
                <div className="flex justify-end gap-3 pt-4">
                    <Button 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)}
                        className="text-zinc-400 hover:text-white hover:bg-zinc-900"
                    >
                        Cancel
                    </Button>
                    {tab === "web" ? (
                        <Button 
                            onClick={handleSubmitRemote} 
                            disabled={!url.trim()}
                            className="bg-primary text-primary-foreground hover:opacity-90"
                            data-sound-confirm
                        >
                            Add to Project
                        </Button>
                    ) : tab === "cloud" ? (
                        <Button 
                            onClick={handleSubmitCloud}
                            disabled={!cloudUrl.trim()}
                            className="bg-primary text-primary-foreground hover:opacity-90"
                            data-sound-confirm
                        >
                            Add Cloud File
                        </Button>
                    ) : (
                        <Button 
                            onClick={() => void handleSubmitLocal()} 
                            disabled={!selectedLocalFile}
                            className="bg-primary text-primary-foreground hover:opacity-90"
                            data-sound-confirm
                        >
                            Add Local File
                        </Button>
                    )}
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
    onDelete?: () => void;
}

export function EditStorageDialog({ open, onOpenChange, onSubmit, initialName, initialColor, initialIcon, onDelete }: EditStorageDialogProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteCooldown, setDeleteCooldown] = useState(8);

    useEffect(() => {
        if (open) { setShowDeleteConfirm(false); setDeleteCooldown(8); }
    }, [open]);

    useEffect(() => {
        if (!showDeleteConfirm) { setDeleteCooldown(8); return; }
        setDeleteCooldown(8);
        const intervalId = window.setInterval(() => {
            setDeleteCooldown((c) => { if (c <= 1) { window.clearInterval(intervalId); return 0; } return c - 1; });
        }, 1000);
        return () => { window.clearInterval(intervalId); };
    }, [showDeleteConfirm]);

    const handleDelete = () => {
        if (!onDelete || deleteCooldown > 0) return;
        onDelete();
        setShowDeleteConfirm(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <div className="relative">
                    <div className={`flex flex-col ${showDeleteConfirm ? "hidden" : "relative"}`}>
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
                            footerPrefix={onDelete ? (
                                <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}>Delete Storage</Button>
                            ) : undefined}
                        />
                    </div>
                    <div className={`flex flex-col ${showDeleteConfirm ? "relative" : "hidden"}`}>
                        <DialogHeader>
                            <DialogTitle>Delete this storage?</DialogTitle>
                            <DialogDescription className="text-zinc-400">
                                {`This will move ${initialName} to the trash.`}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Storage</Label>
                                <div className="flex min-h-9 items-center gap-3 border border-red-500/25 bg-red-500/6 px-3 text-sm text-zinc-200">
                                    <WarningOctagon size={16} weight="fill" className="shrink-0 text-red-400" />
                                    <span className="truncate font-medium text-white" title={initialName}>{initialName}</span>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="border-t border-zinc-800 pt-4 sm:justify-between">
                            <Button variant="ghost" type="button" onClick={() => setShowDeleteConfirm(false)} className="hover:bg-white/10 text-zinc-400 hover:text-white">Back</Button>
                            <div className="flex items-center justify-end gap-2">
                                <Button variant="destructive" type="button" disabled={deleteCooldown > 0} onClick={handleDelete}>
                                    {deleteCooldown > 0 ? `Delete (${deleteCooldown}s)` : "Delete"}
                                </Button>
                            </div>
                        </DialogFooter>
                    </div>
                </div>
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

function getSuggestedCloudName(url: string, provider: CloudProvider): string {
    const extracted = extractFilename(url);
    const lower = extracted.toLowerCase();
    if (!extracted || extracted === 'Untitled' || ['open', 'view', 'u', 'download', 'content', 'uc'].includes(lower)) {
        return `${getCloudProviderLabel(provider)} File`;
    }

    return extracted;
}

interface RenameFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string, description: string, url: string, color: string) => void;
    initialName: string;
    initialDescription?: string;
    initialUrl?: string;
    initialColor?: string;
    showDescription?: boolean;
    isLocalFileSource?: boolean;
    localSourceLabel?: string;
}

export function RenameFileDialog({ open, onOpenChange, onSubmit, initialName, initialDescription = "", initialUrl = "", initialColor = "", showDescription = true, isLocalFileSource = false, localSourceLabel = "" }: RenameFileDialogProps) {
    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState(initialDescription);
    const [url, setUrl] = useState(initialUrl);
    const [color, setColor] = useState(initialColor || "");

    useEffect(() => {
        setName(initialName);
        setDescription(initialDescription || "");
        setUrl(initialUrl || "");
        setColor(initialColor || "");
    }, [initialName, initialDescription, initialUrl, initialColor, open]);

    const handleSubmit = () => {
        if (!name.trim()) return;
        onSubmit(name.trim(), description.trim(), url.trim(), color);
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
                        {isLocalFileSource
                            ? "Update the file's display metadata. Local source access is managed separately."
                            : "Update the file's name, link, and description."}
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

                    {isLocalFileSource ? (
                        <div className="space-y-2">
                            <Label className="text-zinc-400">Local Source</Label>
                            <div className="rounded-none border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200">
                                {localSourceLabel || "Local file attached"}
                            </div>
                            <p className="text-xs text-zinc-500">Use the file player if you need to re-grant permission or locate the file again.</p>
                        </div>
                    ) : (
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
                                className="bg-zinc-900 border-border/60 text-white placeholder:text-zinc-500"
                            />
                        </div>
                    )}

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
                                className="bg-zinc-900 border-border/60 text-white placeholder:text-zinc-500 resize-none h-24"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-zinc-400">Color</Label>
                        <div className="border border-zinc-800 bg-zinc-950/40 rounded-none p-3">
                            <ColorPicker
                                color={color}
                                onChange={setColor}
                                showLabel={false}
                            />
                        </div>
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
    onDelete?: () => void;
}

export function EditFolderDialog({ open, onOpenChange, onSubmit, initialName, initialDescription, initialColor, initialIcon, onDelete }: EditFolderDialogProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteCooldown, setDeleteCooldown] = useState(8);

    useEffect(() => {
        if (open) { setShowDeleteConfirm(false); setDeleteCooldown(8); }
    }, [open]);

    useEffect(() => {
        if (!showDeleteConfirm) { setDeleteCooldown(8); return; }
        setDeleteCooldown(8);
        const intervalId = window.setInterval(() => {
            setDeleteCooldown((c) => { if (c <= 1) { window.clearInterval(intervalId); return 0; } return c - 1; });
        }, 1000);
        return () => { window.clearInterval(intervalId); };
    }, [showDeleteConfirm]);

    const handleDelete = () => {
        if (!onDelete || deleteCooldown > 0) return;
        onDelete();
        setShowDeleteConfirm(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <div className="relative">
                    <div className={`flex flex-col ${showDeleteConfirm ? "hidden" : "relative"}`}>
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
                            footerPrefix={onDelete ? (
                                <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}>Delete Folder</Button>
                            ) : undefined}
                        />
                    </div>
                    <div className={`flex flex-col ${showDeleteConfirm ? "relative" : "hidden"}`}>
                        <DialogHeader>
                            <DialogTitle>Delete this folder?</DialogTitle>
                            <DialogDescription className="text-zinc-400">
                                {`This will move ${initialName} to the trash.`}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Folder</Label>
                                <div className="flex min-h-9 items-center gap-3 border border-red-500/25 bg-red-500/6 px-3 text-sm text-zinc-200">
                                    <WarningOctagon size={16} weight="fill" className="shrink-0 text-red-400" />
                                    <span className="truncate font-medium text-white" title={initialName}>{initialName}</span>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="border-t border-zinc-800 pt-4 sm:justify-between">
                            <Button variant="ghost" type="button" onClick={() => setShowDeleteConfirm(false)} className="hover:bg-white/10 text-zinc-400 hover:text-white">Back</Button>
                            <div className="flex items-center justify-end gap-2">
                                <Button variant="destructive" type="button" disabled={deleteCooldown > 0} onClick={handleDelete}>
                                    {deleteCooldown > 0 ? `Delete (${deleteCooldown}s)` : "Delete"}
                                </Button>
                            </div>
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
