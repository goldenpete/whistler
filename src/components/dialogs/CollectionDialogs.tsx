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
import { AppTooltip } from "@/components/ui/tooltip";
import { WarningOctagon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { type Collection } from "@/types";
import { iconMap, iconNames } from "@/utils/iconMap";



// Predefined Icons
export const ICONS = iconNames.map((name) => ({ name, icon: iconMap[name] }));


interface CollectionFormProps {
    key?: React.Key;
    defaultName?: string;
    defaultColor?: string;
    defaultIcon?: string;
    onSubmit: (name: string, color: string, icon: string) => void;
    onCancel: () => void;
    submitLabel: string;
    isFolder?: boolean;
    footerPrefix?: React.ReactNode;
}

function CollectionForm({ defaultName = "", defaultColor = PRESET_COLORS[0], defaultIcon = "FolderPlus", onSubmit, onCancel, submitLabel, isFolder = false, footerPrefix }: CollectionFormProps) {
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
        <div className="space-y-4 pt-4">
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
                                <div className="grid max-h-56 grid-cols-7 gap-2 overflow-y-auto pr-1">
                                    {ICONS.map(({ name: iName, icon: Icon }) => (
                                        <AppTooltip key={iName} content={iName}>
                                            <button
                                                type="button"
                                                onClick={() => setIconName(iName)}
                                                className={cn(
                                                    "aspect-square flex items-center justify-center rounded-none border transition-all",
                                                    iconName === iName
                                                        ? "bg-primary border-primary text-primary-foreground shadow-sm"
                                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                                )}
                                                aria-label={iName}
                                            >
                                                <Icon weight={iconName === iName ? "fill" : "bold"} size={20} />
                                            </button>
                                        </AppTooltip>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </>
            )}

            <div className="flex items-center gap-2 pt-4">
                {footerPrefix ? <div>{footerPrefix}</div> : null}
                <div className="ml-auto flex items-center gap-2">
                    <Button variant="outline" onClick={onCancel} className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!name.trim()} data-sound-confirm>
                        {submitLabel}
                    </Button>
                </div>
            </div>
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
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!name.trim()} data-sound-confirm>
                        Create Folder
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface EditCollectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    collection: Collection | null;
    onSubmit: (id: string, updates: { name: string; color: string; icon: string }) => void;
    onDelete?: (collection: Collection) => void;
}

export function EditCollectionDialog({ open, onOpenChange, collection, onSubmit, onDelete }: EditCollectionDialogProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteCooldown, setDeleteCooldown] = useState(8);

    useEffect(() => {
        if (open) {
            setShowDeleteConfirm(false);
            setDeleteCooldown(8);
        }
    }, [open]);

    useEffect(() => {
        if (!showDeleteConfirm) {
            setDeleteCooldown(8);
            return;
        }
        setDeleteCooldown(8);
        const intervalId = window.setInterval(() => {
            setDeleteCooldown((current) => {
                if (current <= 1) { window.clearInterval(intervalId); return 0; }
                return current - 1;
            });
        }, 1000);
        return () => { window.clearInterval(intervalId); };
    }, [showDeleteConfirm]);

    if (!collection) return null;

    const isFolder = collection.type === 'folder';
    const isBucket = collection.type === 'bucket';
    const typeLabel = isBucket ? "Bucket" : isFolder ? "Folder" : "Collection";

    const handleDelete = () => {
        if (!onDelete || deleteCooldown > 0) return;
        onDelete(collection);
        setShowDeleteConfirm(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <div className="relative">
                    {/* ── Edit layer ── */}
                    <div className={`flex flex-col ${showDeleteConfirm ? "hidden" : "relative"}`}>
                        <DialogHeader>
                            <DialogTitle>{`Edit ${typeLabel}`}</DialogTitle>
                            <DialogDescription className="sr-only">
                                Update your {typeLabel.toLowerCase()} details.
                            </DialogDescription>
                        </DialogHeader>
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
                            footerPrefix={onDelete ? (
                                <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}>
                                    {`Delete ${typeLabel}`}
                                </Button>
                            ) : undefined}
                        />
                    </div>
                    {/* ── Delete confirmation layer ── */}
                    <div className={`flex flex-col ${showDeleteConfirm ? "relative" : "hidden"}`}>
                        <DialogHeader>
                            <DialogTitle>{`Delete this ${typeLabel.toLowerCase()}?`}</DialogTitle>
                            <DialogDescription className="text-zinc-400">
                                {`This will move ${collection.name} to the trash.`}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-400">{typeLabel}</Label>
                                <div className="flex min-h-9 items-center gap-3 border border-red-500/25 bg-red-500/6 px-3 text-sm text-zinc-200">
                                    <WarningOctagon size={16} weight="fill" className="shrink-0 text-red-400" />
                                    <AppTooltip content={collection.name}>
                                        <span className="truncate font-medium text-white">
                                            {collection.name}
                                        </span>
                                    </AppTooltip>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="border-t border-zinc-800 pt-4 sm:justify-between">
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="hover:bg-white/10 text-zinc-400 hover:text-white"
                            >
                                Back
                            </Button>
                            <div className="flex items-center justify-end gap-2">
                                <Button
                                    variant="destructive"
                                    type="button"
                                    disabled={deleteCooldown > 0}
                                    onClick={handleDelete}
                                >
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
