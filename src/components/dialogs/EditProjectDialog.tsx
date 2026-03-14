/**
 * ─── EditProjectDialog.tsx ──────────────────────────────────────────
 *
 * Dialog for renaming or deleting an existing Whistler project.
 *
 * Features / Responsibilities:
 *   - Editable project name with Enter-to-submit support
 *   - Optional delete action confirmed inline within the same dialog
 *   - Controlled open/close state via props
 * ───────────────────────────────────────────────────────────────────
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { WarningOctagon } from "@phosphor-icons/react";

interface EditProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentName: string;
    onSave: (newName: string) => void;
    onDelete?: () => void;
}

export function EditProjectDialog({ open, onOpenChange, currentName, onSave, onDelete }: EditProjectDialogProps) {
    const [name, setName] = useState(currentName);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteCooldown, setDeleteCooldown] = useState(8);

    useEffect(() => {
        if (open) {
            setName(currentName);
        }
        setShowDeleteConfirm(false);
        setDeleteCooldown(8);
    }, [open, currentName]);

    useEffect(() => {
        if (!showDeleteConfirm) {
            setDeleteCooldown(8);
            return;
        }

        setDeleteCooldown(8);
        const intervalId = window.setInterval(() => {
            setDeleteCooldown((current) => {
                if (current <= 1) {
                    window.clearInterval(intervalId);
                    return 0;
                }
                return current - 1;
            });
        }, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [showDeleteConfirm]);

    const handleSubmit = () => {
        if (!name.trim()) return;
        onSave(name.trim());
        setShowDeleteConfirm(false);
        onOpenChange(false);
    };

    const handleClose = () => {
        setShowDeleteConfirm(false);
        onOpenChange(false);
    };

    const handleDelete = () => {
        if (!onDelete || deleteCooldown > 0) return;
        onDelete();
        setShowDeleteConfirm(false);
        setDeleteCooldown(8);
        onOpenChange(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showDeleteConfirm) return;
        if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <div className="relative">
                    <div className={`flex flex-col transition-all duration-200 ${showDeleteConfirm ? "pointer-events-none absolute inset-0 translate-y-1 opacity-0" : "relative translate-y-0 opacity-100"}`}>
                        <DialogHeader>
                            <DialogTitle>Edit Project Name</DialogTitle>
                            <DialogDescription className="text-zinc-400">
                                Enter a new name for your project.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="project-name" className="text-zinc-400">Project Name</Label>
                                <Input
                                    id="project-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    autoFocus={!showDeleteConfirm}
                                    className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                                />
                            </div>
                        </div>
                        <DialogFooter className="border-t border-zinc-800 pt-4 sm:justify-between">
                            {onDelete ? (
                                <Button
                                    variant="destructive"
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    Delete Project
                                </Button>
                            ) : <div />}
                            <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" onClick={handleClose} className="hover:bg-white/10 text-zinc-400 hover:text-white">
                                    Cancel
                                </Button>
                                <Button onClick={handleSubmit} disabled={!name.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                    Save Changes
                                </Button>
                            </div>
                        </DialogFooter>
                    </div>
                    <div className={`flex flex-col transition-all duration-200 ${showDeleteConfirm ? "relative translate-y-0 opacity-100" : "pointer-events-none absolute inset-0 -translate-y-1 opacity-0"}`}>
                        <DialogHeader>
                            <DialogTitle>Delete this project?</DialogTitle>
                            <DialogDescription className="text-zinc-400">
                                This will permanently delete this project and all its data. This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Project</Label>
                                <div className="flex min-h-9 items-center gap-3 border border-red-500/25 bg-red-500/6 px-3 text-sm text-zinc-200">
                                    <WarningOctagon size={16} weight="fill" className="shrink-0 text-red-400" />
                                    <span className="truncate font-medium text-white" title={currentName}>
                                        {currentName}
                                    </span>
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
