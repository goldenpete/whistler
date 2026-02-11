import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";

interface EditProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentName: string;
    onSave: (newName: string) => void;
    onDelete?: () => void;
}

export function EditProjectDialog({ open, onOpenChange, currentName, onSave, onDelete }: EditProjectDialogProps) {
    const [name, setName] = useState(currentName);

    useEffect(() => {
        if (open) {
            setName(currentName);
        }
    }, [open, currentName]);

    const handleSubmit = () => {
        if (!name.trim()) return;
        onSave(name.trim());
        onOpenChange(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
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
                            autoFocus
                            className="bg-zinc-900 border-zinc-800 focus:border-primary/50 text-white placeholder:text-zinc-500"
                        />
                    </div>
                    {onDelete && (
                        <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
                            <span className="text-xs text-red-400">Danger zone</span>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        type="button"
                                    >
                                        Delete Project
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete this project and all its data. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => {
                                                onDelete();
                                                onOpenChange(false);
                                            }}
                                        >
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-white/10 text-zinc-400 hover:text-white">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!name.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
