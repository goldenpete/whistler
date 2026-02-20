/**
 * ─── FileContextMenu.tsx ───────────────────────────────────────────
 *
 * Context menu for file/folder items in StorageView. Provides actions
 * for editing, moving, deleting, color/icon customization, and sharing.
 *
 * Exports: FileContextMenu, FileContextMenuProps, STORAGE_COLORS
 * Related: StorageView, FileCards
 * ───────────────────────────────────────────────────────────────────
 */
import { useStore } from "@/store/useStore";
import { type File as AppFile } from "@/types";
import {
    Trash, PencilSimple, CheckSquare,
    LinkSimple, ArrowSquareOut, X, Copy, Palette, Shapes, ShareNetwork, Check
} from "@phosphor-icons/react";
import {
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubTrigger,
    ContextMenuSubContent,
} from "@/components/ui/context-menu";
import { getIcon, iconNames } from "@/utils/iconMap";
import { cn } from "@/lib/utils";

export const STORAGE_COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981",
    "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef",
    "#f43f5e", "#64748b"
];

export interface FileContextMenuProps {
    file: AppFile;
    onRename: () => void;
    onMove: () => void;
    onSelect: () => void;
    onColorChange: (color: string) => void;
    onIconChange?: (icon: string) => void;
}

export function FileContextMenu({ file, onRename, onMove, onSelect, onColorChange, onIconChange }: FileContextMenuProps) {
    const handleDelete = () => {
        useStore.setState(state => ({
            files: state.files.map(f => f.id === file.id ? { ...f, deleted: true } : f)
        }));
    };

    const handleCopyLink = () => {
        const url = file.url || `${window.location.origin}/file/${file.id}`;
        navigator.clipboard.writeText(url);
    };

    const handleOpenLink = () => {
        const url = file.url || `${window.location.origin}/file/${file.id}`;
        window.open(url, '_blank');
    };

    const handleShare = () => {
        const url = file.url || `${window.location.origin}/file/${file.id}`;
        if (navigator.share) {
            navigator.share({
                title: file.name,
                url: url
            }).catch(() => {
                navigator.clipboard.writeText(url);
            });
        } else {
            navigator.clipboard.writeText(url);
        }
    };

    return (
        <ContextMenuContent className="min-w-[8rem]">
            <ContextMenuItem onClick={onSelect} className="gap-2">
                <CheckSquare size={16} /> Select
            </ContextMenuItem>

            <ContextMenuSeparator />
            <ContextMenuLabel>Edit</ContextMenuLabel>

            <ContextMenuItem onClick={onRename} className="gap-2">
                <PencilSimple size={16} /> Edit Title/Desc
            </ContextMenuItem>
            <ContextMenuItem onClick={onMove} className="gap-2">
                <ArrowSquareOut size={16} /> Move to Folder
            </ContextMenuItem>

            <ContextMenuSub>
                <ContextMenuSubTrigger className="gap-2">
                    <Palette size={16} /> Change Color
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="p-2">
                    <div className="grid grid-cols-5 gap-1.5">
                        {STORAGE_COLORS.map((c) => (
                            <ContextMenuItem
                                key={c}
                                className="p-0 w-6 h-6 rounded-none focus:bg-transparent"
                                onSelect={() => onColorChange(c)}
                            >
                                <div
                                    className={cn(
                                        "w-6 h-6 rounded-none border-2 flex items-center justify-center transition-all",
                                        file.color?.toLowerCase() === c.toLowerCase()
                                            ? "border-white scale-110"
                                            : "border-transparent hover:border-white/30 hover:scale-110"
                                    )}
                                    style={{ backgroundColor: c }}
                                >
                                    {file.color?.toLowerCase() === c.toLowerCase() && (
                                        <Check weight="bold" className="w-3 h-3 text-white drop-shadow" />
                                    )}
                                </div>
                            </ContextMenuItem>
                        ))}
                        <ContextMenuItem
                            className="p-0 w-6 h-6 rounded-none focus:bg-transparent"
                            onSelect={() => onColorChange("")}
                        >
                            <div
                                className={cn(
                                    "w-6 h-6 rounded-none border-2 flex items-center justify-center transition-all bg-zinc-800",
                                    !file.color
                                        ? "border-white scale-110"
                                        : "border-transparent hover:border-white/30 hover:scale-110"
                                )}
                            >
                                {!file.color ? (
                                    <Check weight="bold" className="w-3 h-3 text-white drop-shadow" />
                                ) : (
                                    <X weight="bold" className="w-3 h-3 text-zinc-400" />
                                )}
                            </div>
                        </ContextMenuItem>
                    </div>
                </ContextMenuSubContent>
            </ContextMenuSub>

            {file.type === 'folder' && (
                <ContextMenuSub>
                    <ContextMenuSubTrigger className="gap-2">
                        <Shapes size={16} /> Change Icon
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="p-2">
                        <div className="grid grid-cols-5 gap-1.5">
                            {iconNames.map((name) => {
                                const Icon = getIcon(name);
                                return (
                                    <ContextMenuItem
                                        key={name}
                                        className="p-0 w-6 h-6 rounded-none focus:bg-transparent"
                                        onSelect={() => onIconChange?.(name)}
                                    >
                                        <div
                                            className={cn(
                                                "w-6 h-6 rounded-none border-2 flex items-center justify-center transition-all",
                                                file.icon === name
                                                    ? "border-white scale-110 bg-zinc-700"
                                                    : "border-transparent hover:border-white/30 hover:scale-110"
                                            )}
                                        >
                                            <Icon weight={file.icon === name ? "fill" : "regular"} className="w-3.5 h-3.5 text-zinc-200" />
                                        </div>
                                    </ContextMenuItem>
                                );
                            })}
                            <ContextMenuItem
                                className="p-0 w-6 h-6 rounded-none focus:bg-transparent"
                                onSelect={() => onIconChange?.("")}
                            >
                                <div
                                    className={cn(
                                        "w-6 h-6 rounded-none border-2 flex items-center justify-center transition-all bg-zinc-800",
                                        !file.icon
                                            ? "border-white scale-110"
                                            : "border-transparent hover:border-white/30 hover:scale-110"
                                    )}
                                >
                                    {!file.icon ? (
                                        <Check weight="bold" className="w-3 h-3 text-white drop-shadow" />
                                    ) : (
                                        <X weight="bold" className="w-3 h-3 text-zinc-400" />
                                    )}
                                </div>
                            </ContextMenuItem>
                        </div>
                    </ContextMenuSubContent>
                </ContextMenuSub>
            )}

            <ContextMenuItem onClick={handleDelete} className="gap-2 text-destructive focus:text-destructive">
                <Trash size={16} /> Trash
            </ContextMenuItem>

            <ContextMenuSeparator />
            <ContextMenuLabel>Share</ContextMenuLabel>

            {file.type !== 'folder' && (
                <>
                    <ContextMenuItem onClick={handleOpenLink} className="gap-2">
                        <LinkSimple size={16} /> Open Link
                    </ContextMenuItem>
                    <ContextMenuItem onClick={handleCopyLink} className="gap-2">
                        <Copy size={16} /> Copy Link
                    </ContextMenuItem>
                    <ContextMenuItem onClick={handleShare} className="gap-2">
                        <ShareNetwork size={16} /> Share
                    </ContextMenuItem>
                </>
            )}
        </ContextMenuContent>
    );
}
