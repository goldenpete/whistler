/**
 * ─── DocPickerDialog.tsx ────────────────────────────────────────────
 *
 * A browsable document picker dialog that lets the user select a
 * document from the current project. Mirrors the FilePickerDialog
 * design with a scrollable list, selection highlighting, and
 * double-click to confirm.
 *
 * Used by EditNodeDialog to link a graph node to a document.
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
import { NotePencil } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { getIcon } from "@/utils/iconMap";
import type { Doc } from "@/types";

interface DocPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (docId: string) => void;
    initialDocId?: string;
}

export function DocPickerDialog({
    open,
    onOpenChange,
    onSelect,
    initialDocId,
}: DocPickerDialogProps) {
    const { docs, activeProjectId } = useStore(useShallow((state) => ({
        docs: state.docs,
        activeProjectId: state.activeProjectId,
    })));

    const [selectedId, setSelectedId] = useState<string>("");

    useEffect(() => {
        if (open) {
            setSelectedId(initialDocId || "");
        }
    }, [open, initialDocId]);

    const projectDocs = useMemo(
        () =>
            docs
                .filter((d: Doc) => d.projectId === activeProjectId && !d.deleted)
                .sort((a: Doc, b: Doc) => a.name.localeCompare(b.name)),
        [docs, activeProjectId]
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
                    <DialogTitle>Select Document</DialogTitle>
                    <DialogDescription className="sr-only">
                        Choose a document from this project.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[280px] border rounded-none p-1">
                    {projectDocs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                            <NotePencil size={32} className="opacity-20" />
                            <span className="text-xs">No documents in this project</span>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {projectDocs.map((d: Doc) => {
                                const Icon = d.icon ? getIcon(d.icon) : NotePencil;
                                return (
                                    <button
                                        key={d.id}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2 rounded-none text-sm text-left transition-colors",
                                            selectedId === d.id
                                                ? "bg-primary/20 text-primary"
                                                : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                                        )}
                                        onClick={() => setSelectedId(d.id)}
                                        onDoubleClick={() => {
                                            setSelectedId(d.id);
                                            onSelect(d.id);
                                            onOpenChange(false);
                                        }}
                                    >
                                        <Icon size={16} className="shrink-0" />
                                        <span className="truncate">{d.name}</span>
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
