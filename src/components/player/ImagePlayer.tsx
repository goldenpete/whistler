import { useState, useRef, useEffect, useImperativeHandle, forwardRef, type MouseEvent as ReactMouseEvent, type SyntheticEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { Button } from '@/components/ui/button';
import { 
    MagnifyingGlassPlus, 
    MagnifyingGlassMinus, 
    SidebarSimple,
    EyeSlash,
    CornersIn,
    CornersOut
} from '@phosphor-icons/react';
import { useStore, type AppStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { useDebounceValue } from 'usehooks-ts';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useNavigate } from 'react-router-dom';
import type { Highlight, Collection } from "@/types";

export interface ImagePlayerHandle {
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
    addHighlightFromSelection: () => void;
}

interface ImagePlayerProps {
    url: string;
    fileId: string;
    highlightId?: string;
    readonly?: boolean;
    onSelectionChange?: (hasSelection: boolean) => void;
    onToggleSidebar?: () => void;
    isSidebarOpen?: boolean;
    showSidebarToggle?: boolean;
    showControls?: boolean;
    onHideControls?: () => void;
    onToggleFullscreen?: () => void;
    isFullscreen?: boolean;
    className?: string;
}

export const ImagePlayer = forwardRef<ImagePlayerHandle, ImagePlayerProps>(({ 
    url, 
    fileId, 
    highlightId,
    readonly = false,
    onSelectionChange, 
    onToggleSidebar,
    isSidebarOpen,
    showSidebarToggle = true,
    showControls = true,
    onHideControls,
    onToggleFullscreen,
    isFullscreen = false,
    className 
}, ref) => {
    const navigate = useNavigate();
    const { highlights, addImageHighlight, trashFile, collections } = useStore();
    
    // State
    const [scale, setScale] = useState<number>(1.0);
    const [selection, setSelection] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
    const [imageDimensions, setImageDimensions] = useState<{ width: number, height: number } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    
    const fileHighlights = highlights.filter((h: Highlight) => h.fileId === fileId);

    // Zoom handlers
    const zoomIn = () => setScale(s => Math.min(s + 0.25, 5.0));
    const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));
    const resetZoom = () => setScale(1.0);
    const zoomToRect = (rect: { x: number, y: number, width: number, height: number }) => {
        // Simple implementation: reset zoom and maybe scroll to center?
        // For now, just reset zoom so the user can see context, or zoom in slightly?
        // Implementing pan/zoom to specific rect is complex without a library.
        // Let's just reset zoom to 1.0 or 1.5 to make sure it's visible.
        setScale(1.5);
        // Ideally we would scroll the container to center the rect.
        // We can try to scroll containerRef.
        if (containerRef.current && imageRef.current) {
             const imageRect = imageRef.current.getBoundingClientRect();
             const containerRect = containerRef.current.getBoundingClientRect();
             
             // Calculate scroll position (naive approach)
             // rect x/y are percentages of image size
             const scrollX = (rect.x * imageRect.width) - (containerRect.width / 2) + (rect.width * imageRect.width / 2);
             const scrollY = (rect.y * imageRect.height) - (containerRect.height / 2) + (rect.height * imageRect.height / 2);
             
             containerRef.current.scrollTo({
                 left: Math.max(0, scrollX),
                 top: Math.max(0, scrollY),
                 behavior: 'smooth'
             });
        }
    };

    const handleAddHighlight = () => {
        if (!selection) return;
        addImageHighlight(fileId, selection);
        setSelection(null);
    };

    useImperativeHandle(ref, () => ({
        zoomIn,
        zoomOut,
        resetZoom,
        addHighlightFromSelection: handleAddHighlight,
        zoomToRect
    }));

    useEffect(() => {
        onSelectionChange?.(!!selection);
    }, [selection, onSelectionChange]);

    const handleWheel = (e: ReactWheelEvent | WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            e.stopPropagation();
            if (e.deltaY < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
        }
    };

    // Mouse events for selection
    const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
        if (readonly || !imageRef.current) return;
        
        // Only allow left click
        if (e.button !== 0) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        
        setDragStart({ x, y });
        setIsDragging(true);
        setSelection(null);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !dragStart || !imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const currentX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const currentY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

        const width = Math.abs(currentX - dragStart.x);
        const height = Math.abs(currentY - dragStart.y);
        const x = Math.min(currentX, dragStart.x);
        const y = Math.min(currentY, dragStart.y);

        setSelection({ x, y, width, height });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDragStart(null);
        // Clear tiny selections (accidental clicks)
        if (selection && (selection.width < 0.01 || selection.height < 0.01)) {
            setSelection(null);
        }
    };

    return (
        <div className={cn("relative h-full w-full bg-black/90 flex flex-col overflow-hidden", className)}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}>
             
            {/* Floating Highlight Button */}
            {selection && !readonly && (
                <div 
                    className="absolute z-50 animate-in fade-in zoom-in duration-200"
                    style={{
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <Button
                        size="sm"
                        onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            handleAddHighlight();
                        }}
                        className="shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 rounded-full flex items-center gap-2"
                    >
                        <span className="text-xs font-semibold">Highlight Selection</span>
                    </Button>
                </div>
            )}

            {/* Main Image Area */}
            <div 
                ref={containerRef}
                className="flex-1 overflow-auto flex items-center justify-center p-4 custom-scrollbar"
            >
                <div 
                    className="relative transition-transform duration-200 ease-out origin-center"
                    style={{ transform: `scale(${scale})` }}
                >
                    <img
                        ref={imageRef}
                        src={url}
                        alt="View"
                        className="max-w-full max-h-full object-contain select-none pointer-events-none"
                        draggable={false}
                        onLoad={(e: SyntheticEvent<HTMLImageElement>) => setImageDimensions({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
                    />
                    
                    {/* Interaction Layer (Overlay) */}
                    <div 
                        className="absolute inset-0 cursor-crosshair touch-none"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                    />

                    {/* Highlights */}
                    {fileHighlights.map(h => {
                        if (!h.rect) return null;
                        const collection = collections.find(c => c.id === h.collectionId);
                        const color = collection?.color || 'var(--primary)';
                        
                        return (
                            <div
                                key={h.id}
                                className="absolute border-2 transition-opacity duration-200 hover:bg-white/10"
                                style={{
                                    left: `${h.rect.x * 100}%`,
                                    top: `${h.rect.y * 100}%`,
                                    width: `${h.rect.width * 100}%`,
                                    height: `${h.rect.height * 100}%`,
                                    borderColor: color,
                                    boxShadow: `0 0 0 1px ${color}40`
                                }}
                                title={h.note || "Highlight"}
                            />
                        );
                    })}

                    {/* Current Selection */}
                    {selection && (
                        <div
                            className="absolute border-2 border-primary bg-primary/10"
                            style={{
                                left: `${selection.x * 100}%`,
                                top: `${selection.y * 100}%`,
                                width: `${selection.width * 100}%`,
                                height: `${selection.height * 100}%`,
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Bottom Controls */}
            <div className={cn(
                "absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/10 shadow-2xl z-[60] transition-all duration-300",
                showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            )}>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full"
                    onClick={(e: ReactMouseEvent) => {
                        e.stopPropagation();
                        zoomOut();
                    }}
                    title="Zoom Out"
                >
                    <MagnifyingGlassMinus size={14} weight="bold" />
                </Button>

                <span className="text-zinc-400 text-[10px] w-8 text-center select-none">
                    {Math.round(scale * 100)}%
                </span>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full"
                    onClick={(e: ReactMouseEvent) => {
                        e.stopPropagation();
                        zoomIn();
                    }}
                    title="Zoom In"
                >
                    <MagnifyingGlassPlus size={14} weight="bold" />
                </Button>

                <div className="w-px h-4 bg-white/10 mx-1" />

                {showSidebarToggle && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full",
                                isSidebarOpen && "text-primary hover:text-primary"
                            )}
                            onClick={onToggleSidebar}
                        >
                            <SidebarSimple size={14} weight="bold" />
                        </Button>
                    </>
                )}

                {onToggleFullscreen && (
                    <>
                        <div className="w-px h-4 bg-white/10 mx-1" />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full"
                            onClick={(e: ReactMouseEvent) => {
                        e.stopPropagation();
                        onToggleFullscreen();
                    }}
                            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                        >
                            {isFullscreen ? <CornersIn size={14} weight="bold" /> : <CornersOut size={14} weight="bold" />}
                        </Button>
                    </>
                )}

                {onHideControls && (
                    <>
                        <div className="w-px h-4 bg-white/10 mx-1" />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full"
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onHideControls();
                            }}
                            title="Hide Controls"
                        >
                            <EyeSlash size={14} weight="bold" />
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
});

ImagePlayer.displayName = 'ImagePlayer';
