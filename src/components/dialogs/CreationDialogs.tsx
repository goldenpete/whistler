import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NewDocDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string) => void;
}

export function NewDocDialog({ open, onOpenChange, onSubmit }: NewDocDialogProps) {
    const [name, setName] = useState("");

    const handleSubmit = () => {
        if (!name.trim()) return;
        onSubmit(name.trim());
        setName("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>New Document</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Give your document a name.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-doc-name">Document Name</Label>
                        <Input
                            id="new-doc-name"
                            placeholder="My Document"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            className="bg-zinc-900 border-zinc-800"
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
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

interface NewGraphDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string) => void;
}

export function NewGraphDialog({ open, onOpenChange, onSubmit }: NewGraphDialogProps) {
    const [name, setName] = useState("");

    const handleSubmit = () => {
        if (!name.trim()) return;
        onSubmit(name.trim());
        setName("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>New Graph</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Enter a name for your new graph.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-graph-name">Graph Name</Label>
                        <Input
                            id="new-graph-name"
                            placeholder="My Graph"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            className="bg-zinc-900 border-zinc-800"
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
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

interface NewProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string) => void;
}

export function NewProjectDialog({ open, onOpenChange, onSubmit }: NewProjectDialogProps) {
    const [name, setName] = useState("");

    const handleSubmit = () => {
        if (!name.trim()) return;
        onSubmit(name.trim());
        setName("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>New Project</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Name your new project.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-project-name">Project Name</Label>
                        <Input
                            id="new-project-name"
                            placeholder="My Project"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            className="bg-zinc-900 border-zinc-800"
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
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
