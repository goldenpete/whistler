/**
 * ─── ScreenshotDialog.tsx ───────────────────────────────────────────
 *
 * A screenshot preview and crop dialog. Displays a captured image
 * and lets the user draw a rectangular crop region before
 * downloading the result.
 *
 * Features / Responsibilities:
 *   - Full-resolution image preview inside a scrollable dialog
 *   - Click-and-drag crop rectangle with visual overlay
 *   - One-click download of the original or cropped image as PNG
 *   - Supports custom portal containers for panel embedding
 * ───────────────────────────────────────────────────────────────────
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect, type MouseEvent } from "react";
import { DownloadSimple, X, CornersIn } from "@phosphor-icons/react";
import { cn, clamp } from "@/lib/utils";

interface ScreenshotDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageUrl: string | null;
    container?: HTMLElement | null;
}

export function ScreenshotDialog({ open, onOpenChange, imageUrl, container }: ScreenshotDialogProps) {
    const [cropRect, setCropRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cropRectRef = useRef<{ x: number, y: number, width: number, height: number } | null>(null);

    // Sync ref with state
    useEffect(() => {
        cropRectRef.current = cropRect;
    }, [cropRect]);

    // Reset state when dialog opens/closes or image changes
    useEffect(() => {
        if (!open) {
            setCropRect(null);
            setIsDragging(false);
            setStartPos(null);
        }
    }, [open, imageUrl]);

    const handleMouseDown = (e: MouseEvent) => {
        if (!containerRef.current || !imageRef.current) return;
        // Prevent default drag behavior
        e.preventDefault();
        
        const containerRect = containerRef.current.getBoundingClientRect();
        const imageRect = imageRef.current.getBoundingClientRect();

        // Mouse X relative to container
        const mouseXInContainer = e.clientX - containerRect.left;
        const mouseYInContainer = e.clientY - containerRect.top;

        // Image bounds relative to container
        const imageLeftInContainer = imageRect.left - containerRect.left;
        const imageTopInContainer = imageRect.top - containerRect.top;
        const imageRightInContainer = imageLeftInContainer + imageRect.width;
        const imageBottomInContainer = imageTopInContainer + imageRect.height;

        // Clamp start position to image bounds
        const startX = Math.max(imageLeftInContainer, Math.min(mouseXInContainer, imageRightInContainer));
        const startY = Math.max(imageTopInContainer, Math.min(mouseYInContainer, imageBottomInContainer));
        
        setIsDragging(true);
        setStartPos({ x: startX, y: startY });
        setCropRect({ x: startX, y: startY, width: 0, height: 0 });
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
            if (!startPos || !containerRef.current || !imageRef.current) return;
            
            // Use the image rect for boundaries, not the container
            // This ensures we can't select the black bars
            const imageRect = imageRef.current.getBoundingClientRect();
            const containerRect = containerRef.current.getBoundingClientRect();

            // Calculate mouse position relative to the container (for the cropRect state)
            // But clamped to the image bounds
            
            // Mouse X relative to container
            const mouseXInContainer = e.clientX - containerRect.left;
            const mouseYInContainer = e.clientY - containerRect.top;

            // Image bounds relative to container
            const imageLeftInContainer = imageRect.left - containerRect.left;
            const imageTopInContainer = imageRect.top - containerRect.top;
            const imageRightInContainer = imageLeftInContainer + imageRect.width;
            const imageBottomInContainer = imageTopInContainer + imageRect.height;

            // Clamp mouse position to image bounds
            const clampedX = clamp(mouseXInContainer, imageLeftInContainer, imageRightInContainer);
            const clampedY = clamp(mouseYInContainer, imageTopInContainer, imageBottomInContainer);

            // Calculate dimensions
            const width = Math.abs(clampedX - startPos.x);
            const height = Math.abs(clampedY - startPos.y);
            const x = Math.min(clampedX, startPos.x);
            const y = Math.min(clampedY, startPos.y);
            
            setCropRect({ x, y, width, height });
        };

        const handleGlobalMouseUp = () => {
            setIsDragging(false);
            // Clear tiny selections using the ref to get latest state
            const currentRect = cropRectRef.current;
            if (currentRect && (currentRect.width < 5 || currentRect.height < 5)) {
                setCropRect(null);
            }
        };

        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging, startPos]);

    const downloadImage = async (crop: boolean) => {
        if (!imageUrl) return;

        if (crop && cropRect && imageRef.current && containerRef.current) {
            // Crop Logic
            const canvas = document.createElement('canvas');
            const img = imageRef.current;
            const container = containerRef.current;
            
            // We need to calculate the crop rect relative to the image itself, not the container
            // Since cropRect is relative to container, we adjust it
            const imageRect = img.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            const imageLeftInContainer = imageRect.left - containerRect.left;
            const imageTopInContainer = imageRect.top - containerRect.top;

            // Adjust crop coordinates to be relative to the image
            const cropXOnImage = cropRect.x - imageLeftInContainer;
            const cropYOnImage = cropRect.y - imageTopInContainer;

            const scaleX = img.naturalWidth / imageRect.width;
            const scaleY = img.naturalHeight / imageRect.height;

            canvas.width = cropRect.width * scaleX;
            canvas.height = cropRect.height * scaleY;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(
                img,
                cropXOnImage * scaleX,
                cropYOnImage * scaleY,
                cropRect.width * scaleX,
                cropRect.height * scaleY,
                0,
                0,
                canvas.width,
                canvas.height
            );

            const link = document.createElement('a');
            link.download = `screenshot-crop-${Date.now()}.png`;
            try {
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (e) {
                console.error("Crop failed", e);
                alert("Cannot crop this image due to browser security restrictions (CORS).");
            }
        } else {
            // Download Full
            const link = document.createElement('a');
            link.download = `screenshot-${Date.now()}.png`;
            link.href = imageUrl;
            link.click();
        }
        
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className="!fixed !top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none !p-0 !gap-0 !rounded-none !border-none overflow-hidden bg-zinc-950 flex flex-col z-[100]" 
                portalContainer={container}
                showCloseButton={false}
            >
                <DialogHeader className="p-3 border-b border-zinc-800 bg-zinc-900 shrink-0 flex flex-row items-center gap-4 h-14">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <DialogTitle className="flex items-center gap-2 shrink-0">
                            <CornersIn className="text-primary" size={20} />
                            Save Screenshot
                        </DialogTitle>
                        <DialogDescription className="m-0 truncate pt-0.5">
                            Drag to crop, or save full frame.
                        </DialogDescription>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                        {cropRect && (
                            <Button variant="secondary" size="sm" onClick={() => downloadImage(true)} className="h-8">
                                <CornersIn className="mr-2 h-4 w-4" />
                                Save Crop
                            </Button>
                        )}
                        <Button size="sm" onClick={() => downloadImage(false)} className="h-8">
                            <DownloadSimple className="mr-2" size={16} />
                            Save Full
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} className="h-8 w-8 ml-2">
                            <X size={18} />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="relative bg-black overflow-hidden flex items-center justify-center flex-1 min-h-0 w-full h-full">
                    {imageUrl && (
                        <div 
                            ref={containerRef}
                            className="relative cursor-crosshair select-none"
                            onMouseDown={handleMouseDown}
                        >
                            <img 
                                ref={imageRef}
                                src={imageUrl} 
                                alt="Screenshot" 
                                className="max-w-full max-h-full object-contain block"
                                draggable={false}
                                crossOrigin="anonymous"
                            />
                            
                            {/* Overlay for non-selected areas */}
                            {cropRect && (
                                <>
                                    <div className="absolute inset-0 bg-black/50 pointer-events-none" 
                                         style={{ 
                                             clipPath: `polygon(0% 0%, 0% 100%, ${cropRect.x}px 100%, ${cropRect.x}px ${cropRect.y}px, ${cropRect.x + cropRect.width}px ${cropRect.y}px, ${cropRect.x + cropRect.width}px ${cropRect.y + cropRect.height}px, ${cropRect.x}px ${cropRect.y + cropRect.height}px, ${cropRect.x}px 100%, 100% 100%, 100% 0%)` 
                                         }} 
                                    />
                                    <div 
                                        className="absolute border-2 border-primary shadow-[0_0_0_1px_rgba(0,0,0,0.5)] pointer-events-none"
                                        style={{
                                            left: cropRect.x,
                                            top: cropRect.y,
                                            width: cropRect.width,
                                            height: cropRect.height
                                        }}
                                    >
                                        {/* Dimensions Label */}
                                        <div className="absolute -top-6 left-0 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-mono font-medium whitespace-nowrap">
                                            {Math.round(cropRect.width * (imageRef.current?.naturalWidth || 0) / (containerRef.current?.clientWidth || 1))} x {Math.round(cropRect.height * (imageRef.current?.naturalHeight || 0) / (containerRef.current?.clientHeight || 1))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
