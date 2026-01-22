import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { ColorPicker } from "@/components/ui/ColorPicker";

interface ColorPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    initialColor?: string;
    onColorSelect: (color: string) => void;
}

export function ColorPickerDialog({
    open,
    onOpenChange,
    title = "Select Color",
    initialColor = "#ffffff",
    onColorSelect
}: ColorPickerDialogProps) {
    const [color, setColor] = useState(initialColor);

    // Reset color when dialog opens
    useEffect(() => {
        if (open) setColor(initialColor);
    }, [open, initialColor]);

    const handleSubmit = () => {
        onColorSelect(color);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xs bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <ColorPicker
                        color={color}
                        onChange={setColor}
                        label="Choose a color"
                    />
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-white/10 text-zinc-400 hover:text-white">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        Select
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
