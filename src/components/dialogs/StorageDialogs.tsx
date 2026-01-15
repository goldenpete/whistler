import { useState } from "react";
import { Button } from "@/components/ui/button";
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

    const handleKeyDown = (e: React.KeyboardEvent) => {
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
                            onChange={(e) => handleUrlChange(e.target.value)}
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
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!url.trim()}>
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
    onSubmit: (name: string) => void;
}

export function NewFolderDialog({ open, onOpenChange, onSubmit }: NewFolderDialogProps) {
    const [name, setName] = useState("");

    const handleSubmit = () => {
        if (!name.trim()) return;
        onSubmit(name.trim());
        setName("");
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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>New Folder</DialogTitle>
                    <DialogDescription>
                        Enter a name for the new folder.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="folder-name">Folder Name</Label>
                        <Input
                            id="folder-name"
                            placeholder="My Folder"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!name.trim()}>
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function extractFilename(url: string): string {
    try {
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
