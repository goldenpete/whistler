import React, { useState, useEffect, type ChangeEvent, type SyntheticEvent } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DestructiveDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title: string;
    description: string;
    isDeleting: boolean;
    confirmationPhrase?: string;
    waitDuration?: number;
}

export function DestructiveDeleteDialog({
    open,
    onOpenChange,
    onConfirm,
    title,
    description,
    isDeleting,
    confirmationPhrase = "I understand I cannot get this data back",
    waitDuration = 20
}: DestructiveDeleteDialogProps) {
    const [confirmText, setConfirmText] = useState("");
    const [countdown, setCountdown] = useState(waitDuration);

    useEffect(() => {
        if (open) {
            setCountdown(waitDuration);
            setConfirmText("");
        }
    }, [open, waitDuration]);

    useEffect(() => {
        if (open && countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [open, countdown]);

    const isValid = confirmText === confirmationPhrase && countdown === 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm">
                        Warning: This action cannot be undone.
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Type "{confirmationPhrase}" to confirm:
                        </label>
                        <Input
                            value={confirmText}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmText(e.target.value)}
                            onPaste={(e: SyntheticEvent<HTMLInputElement>) => e.preventDefault()}
                            placeholder="Type the confirmation phrase..."
                            className="font-mono text-xs"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button 
                        variant="destructive" 
                        onClick={onConfirm} 
                        disabled={!isValid || isDeleting}
                    >
                        {isDeleting ? "Deleting..." : countdown > 0 ? `Delete (${countdown}s)` : "Delete Forever"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
