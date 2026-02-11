import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEffect, useState, type ChangeEvent } from "react";
import { type File } from "@/types";
import { isValidUrl } from "@/utils/security";

interface EditFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    file: File;
    onSave: (updates: Partial<File>) => void;
    container?: HTMLElement | null;
}

export function EditFileDialog({ open, onOpenChange, file, onSave, container }: EditFileDialogProps) {
    const [name, setName] = useState(file.name);
    const [description, setDescription] = useState(file.description || "");
    const [url, setUrl] = useState(file.url || "");

    useEffect(() => {
        if (open) {
            setName(file.name);
            setDescription(file.description || "");
            setUrl(file.url || "");
        }
    }, [open, file]);

    const handleSubmit = () => {
        if (url.trim() && !isValidUrl(url)) {
            alert("Invalid or unsafe URL protocol.");
            return;
        }
        onSave({ name: name.trim(), description: description.trim(), url: url.trim() });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-white" portalContainer={container}>
                <DialogHeader>
                    <DialogTitle>Edit File Details</DialogTitle>
                    <DialogDescription>
                        Update the name and description of your file.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-zinc-400">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                            className="bg-zinc-900 border-zinc-800 focus:border-primary/50"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="url" className="text-zinc-400">Link</Label>
                        <Input
                            id="url"
                            value={url}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                            className="bg-zinc-900 border-zinc-800 focus:border-primary/50"
                            placeholder="https://..."
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description" className="text-zinc-400">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
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
