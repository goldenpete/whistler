/**
 * ─── CollectionPickerDialog.tsx ─────────────────────────────────────
 *
 * A browsable collection picker dialog that lets the user select a
 * collection from the current project. Mirrors the FilePickerDialog
 * design with a scrollable list, selection highlighting, and
 * double-click to confirm.
 *
 * Used by EditNodeDialog to link a graph node to a collection.
 * ───────────────────────────────────────────────────────────────────
 */
import { useState, useMemo, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";
import { Folder, FolderOpen } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { getIcon } from "@/utils/iconMap";
import { isLeafCollection } from "@/utils/collectionUtils";
import type { Collection } from "@/types";

interface CollectionPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (collectionId: string) => void;
    initialCollectionId?: string;
}

export function CollectionPickerDialog({
    open,
    onOpenChange,
    onSelect,
    initialCollectionId,
}: CollectionPickerDialogProps) {
    const { collections, activeProjectId } = useStore(useShallow((state) => ({
        collections: state.collections,
        activeProjectId: state.activeProjectId,
    })));

    const [selectedId, setSelectedId] = useState<string>("");

    useEffect(() => {
        if (open) {
            setSelectedId(initialCollectionId || "");
        }
    }, [open, initialCollectionId]);

    const projectCollections = useMemo(
        () =>
            collections
                .filter(
                    (c: Collection) =>
                        c.projectId === activeProjectId &&
                        !c.deleted &&
                        isLeafCollection(c)
                )
                .sort((a: Collection, b: Collection) => a.name.localeCompare(b.name)),
        [collections, activeProjectId]
    );

    const handleConfirm = () => {
        if (selectedId) {
            onSelect(selectedId);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle>Select Collection</DialogTitle>
                    <DialogDescription className="sr-only">
                        Choose a collection from this project.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[280px] border rounded-none p-1">
                    {projectCollections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                            <FolderOpen size={32} className="opacity-20" />
                            <span className="text-xs">No collections in this project</span>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {projectCollections.map((c: Collection) => {
                                const Icon = getIcon(c.icon);
                                return (
                                    <button
                                        key={c.id}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2 rounded-none text-sm text-left transition-colors",
                                            selectedId === c.id
                                                ? "bg-primary/20 text-primary"
                                                : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                                        )}
                                        onClick={() => setSelectedId(c.id)}
                                        onDoubleClick={() => {
                                            setSelectedId(c.id);
                                            onSelect(c.id);
                                            onOpenChange(false);
                                        }}
                                    >
                                        <div
                                            className="w-5 h-5 rounded-none flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: c.color || undefined }}
                                        >
                                            <Icon size={12} className="text-white" weight="bold" />
                                        </div>
                                        <span className="truncate">{c.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedId}
                        data-sound-confirm
                    >
                        Select
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
