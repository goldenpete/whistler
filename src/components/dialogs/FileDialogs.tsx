import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { type File } from "@/types";

interface EditFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    file: File;
    onSave: (updates: Partial<File>) => void;
}

export function EditFileDialog({ open, onOpenChange, file, onSave }: EditFileDialogProps) {
    const [name, setName] = useState(file.name);
    const [description, setDescription] = useState(file.description || "");

    useEffect(() => {
        if (open) {
            setName(file.name);
            setDescription(file.description || "");
        }
    }, [open, file]);

    const handleSubmit = () => {
        onSave({ name, description });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Edit File Details</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-zinc-400">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-zinc-900 border-zinc-800 focus:border-primary/50"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description" className="text-zinc-400">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-zinc-900 border-zinc-800 min-h-[150px] focus:border-primary/50 resize-y"
                            placeholder="Add a description..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="hover:bg-white/10 text-zinc-400 hover:text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
