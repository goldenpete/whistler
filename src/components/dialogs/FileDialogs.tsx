/**
 * ─── FileDialogs.tsx ────────────────────────────────────────────────
 *
 * Dialog for editing the metadata of an existing file entry,
 * including its display name, description, and associated URL.
 *
 * Features / Responsibilities:
 *   - EditFileDialog – inline form for updating file name, description,
 *     and URL with real-time state management
 *   - URL validation via the shared isValidUrl utility
 *   - Supports custom portal containers for embedding inside panels
 * ───────────────────────────────────────────────────────────────────
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { useEffect, useState, type ChangeEvent } from "react";
import { type File } from "@/types";
import { isValidUrl } from "@/utils/security";
import { useResolvedFileUrl } from "@/hooks/useResolvedFileUrl";
import { getDisplaySourceLabel, isLocalFile } from "@/utils/localFiles";
import { createCloudFileSource, detectCloudProvider, inferCloudFileType, isCloudFile, getCloudProviderLabel } from "@/utils/cloudFiles";
import { LocalFileAccessPanel } from "@/components/player/LocalFileAccessPanel";
import { useStore } from "@/store/useStore";

interface EditFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    file: File;
    onSave: (updates: Partial<File>) => void;
    container?: HTMLElement | null;
}

export function EditFileDialog({ open, onOpenChange, file, onSave, container }: EditFileDialogProps) {
    const googleDriveApiKey = useStore((state) => state.googleDriveApiKey);
    const [name, setName] = useState(file.name);
    const [description, setDescription] = useState(file.description || "");
    const [url, setUrl] = useState(isCloudFile(file) ? file.cloudSource.shareUrl : (file.url || ""));
    const [color, setColor] = useState(file.color || "");
    const { availability, requestAccess, relink, resolvedUrl } = useResolvedFileUrl(file);
    const isLocalSource = isLocalFile(file);
    const isCloudSource = isCloudFile(file);

    useEffect(() => {
        if (open) {
            setName(file.name);
            setDescription(file.description || "");
            setUrl(isCloudFile(file) ? file.cloudSource.shareUrl : (file.url || ""));
            setColor(file.color || "");
        }
    }, [open, file]);

    const handleSubmit = () => {
        if (!isLocalSource && url.trim() && !isValidUrl(url)) {
            alert("Invalid or unsafe URL protocol.");
            return;
        }

        if (isCloudSource) {
            const provider = detectCloudProvider(url.trim()) || file.cloudSource.provider;
            const cloudSource = createCloudFileSource(provider, url.trim());
            if (!cloudSource) {
                alert("Unsupported cloud share link. Use a public Google Drive, Dropbox, or OneDrive file link.");
                return;
            }

            onSave({
                name: name.trim(),
                description: description.trim(),
                url: cloudSource.shareUrl,
                cloudSource,
                type: inferCloudFileType(name.trim(), cloudSource, file.type),
                color,
            });
            onOpenChange(false);
            return;
        }

        onSave({ name: name.trim(), description: description.trim(), url: isLocalSource ? file.url : url.trim(), color });
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
                    {isLocalSource ? (
                        <div className="grid gap-2">
                            <Label className="text-zinc-400">Local Source</Label>
                            <div className="rounded-none border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200">
                                {getDisplaySourceLabel(file, resolvedUrl) || "Local file attached"}
                            </div>

                            {(availability === 'permission-required' || availability === 'missing-handle' || availability === 'unsupported' || availability === 'error') && (
                                <LocalFileAccessPanel
                                    file={file}
                                    availability={availability}
                                    onRequestAccess={requestAccess}
                                    onRelink={relink}
                                    compact={true}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            <Label htmlFor="url" className="text-zinc-400">{isCloudSource ? 'Cloud Link' : 'Link'}</Label>
                            <Input
                                id="url"
                                value={url}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 focus:border-primary/50"
                                placeholder="https://..."
                            />
                            {isCloudSource && (
                                <>
                                    <p className="text-xs text-zinc-500">Provider: {getCloudProviderLabel(file.cloudSource.provider)}</p>
                                    {file.cloudSource.provider === 'google-drive' && !googleDriveApiKey && (
                                        <p className="text-xs text-amber-300">
                                            Native Google Drive playback needs a Google Drive API key in Settings &gt; Audio &amp; Media. Without it, this file opens in Google&apos;s preview player and Whistler&apos;s custom controls stay disabled.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    )}
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
                    <div className="grid gap-2">
                        <Label className="text-zinc-400">Color</Label>
                        <div className="border border-zinc-800 bg-zinc-950/40 rounded-none p-3">
                            <ColorPicker
                                color={color}
                                onChange={setColor}
                                showLabel={false}
                            />
                        </div>
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
