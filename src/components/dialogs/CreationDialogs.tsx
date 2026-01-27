import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EntityForm } from "@/components/dialogs/StorageDialogs";
import { useStore } from "@/store/useStore";
import { PRESET_COLORS, ACCENT_COLOR_MAP } from "@/components/ui/ColorPicker";

interface NewDocDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string, color: string, icon: string) => void;
}

export function NewDocDialog({ open, onOpenChange, onSubmit }: NewDocDialogProps) {
    const { accentTheme, enableDefaultColorControls, defaultColors } = useStore();
    const accentColor = ACCENT_COLOR_MAP[(accentTheme as keyof typeof ACCENT_COLOR_MAP) || "orange"] ?? PRESET_COLORS[0];
    const docColor = enableDefaultColorControls && defaultColors?.file
        ? defaultColors.file
        : accentColor;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>New Document</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Customize your new document.
                    </DialogDescription>
                </DialogHeader>
                <EntityForm
                    label="Document Name"
                    placeholder="My Document"
                    submitLabel="Create"
                    defaultColor={docColor}
                    onSubmit={(name, description, color, icon) => {
                        onSubmit(name, color, icon);
                        onOpenChange(false);
                    }}
                    onCancel={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

interface NewGraphDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string, color: string, icon: string) => void;
}

export function NewGraphDialog({ open, onOpenChange, onSubmit }: NewGraphDialogProps) {
    const { accentTheme, enableDefaultColorControls, defaultColors } = useStore();
    const accentColor = ACCENT_COLOR_MAP[(accentTheme as keyof typeof ACCENT_COLOR_MAP) || "orange"] ?? PRESET_COLORS[0];
    const graphColor = enableDefaultColorControls && defaultColors?.graph
        ? defaultColors.graph
        : accentColor;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>New Graph</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Customize your new graph.
                    </DialogDescription>
                </DialogHeader>
                <EntityForm
                    label="Graph Name"
                    placeholder="My Graph"
                    submitLabel="Create"
                    defaultColor={graphColor}
                    onSubmit={(name, description, color, icon) => {
                        onSubmit(name, color, icon);
                        onOpenChange(false);
                    }}
                    onCancel={() => onOpenChange(false)}
                />
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
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                            autoFocus
                            className="bg-zinc-900 border-zinc-800"
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSubmit()}
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
