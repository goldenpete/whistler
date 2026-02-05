import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect, type MouseEvent } from "react";
import { DownloadSimple, X, CornersIn } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

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
        if (!containerRef.current) return;
        // Prevent default drag behavior
        e.preventDefault();
        
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        setIsDragging(true);
        setStartPos({ x, y });
        setCropRect({ x, y, width: 0, height: 0 });
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
            if (!startPos || !containerRef.current) return;
            
            const rect = containerRef.current.getBoundingClientRect();
            // Calculate relative to the container, but allow mouse to be anywhere
            // We clamp the coordinates to the container bounds to ensure we don't select outside
            const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
            
            const width = Math.abs(currentX - startPos.x);
            const height = Math.abs(currentY - startPos.y);
            const x = Math.min(currentX, startPos.x);
            const y = Math.min(currentY, startPos.y);
            
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
            
            // Calculate scale between displayed image and actual image natural size
            const scaleX = img.naturalWidth / container.clientWidth;
            const scaleY = img.naturalHeight / container.clientHeight;

            canvas.width = cropRect.width * scaleX;
            canvas.height = cropRect.height * scaleY;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(
                img,
                cropRect.x * scaleX,
                cropRect.y * scaleY,
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
                showCloseButton={true}
            >
                <DialogHeader className="p-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0 flex flex-row items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <DialogTitle className="flex items-center gap-2">
                            <CornersIn className="text-primary" size={20} />
                            Save Screenshot
                        </DialogTitle>
                        <DialogDescription>
                            Drag to select a crop region, or save the full frame.
                        </DialogDescription>
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

                <DialogFooter className="p-4 border-t border-zinc-800 bg-zinc-900/50 gap-2 shrink-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <div className="flex-1" />
                    {cropRect && (
                        <Button variant="secondary" onClick={() => downloadImage(true)}>
                            <CornersIn className="mr-2 h-4 w-4" />
                            Save Crop
                        </Button>
                    )}
                    <Button onClick={() => downloadImage(false)}>
                        <DownloadSimple className="mr-2" size={16} />
                        Save Full Frame
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
