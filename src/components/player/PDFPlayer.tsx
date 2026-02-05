import React, { useState, useRef, useEffect, useMemo, useImperativeHandle, forwardRef, useCallback, type MouseEvent } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
    CaretLeft, 
    CaretRight, 
    MagnifyingGlassPlus, 
    MagnifyingGlassMinus, 
    SidebarSimple,
    EyeSlash,
    CornersIn,
    CornersOut,
    Trash
} from '@phosphor-icons/react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useStore } from '@/store/useStore';
import type { Highlight } from "@/types";
import { cn } from '@/lib/utils';
import { useDebounceValue } from 'usehooks-ts';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { globalWorker } from '@/pdf-worker';
import { playSfx } from '@/utils/sound';

// Note: Worker is configured globally in src/pdf-worker.ts

export interface PDFPlayerHandle {
    jumpToPage: (page: number) => void;
    prevPage: () => void;
    nextPage: () => void;
    addHighlightFromSelection: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
}

interface PDFPlayerProps {
    url: string;
    fileId: string;
    highlightId?: string; // If provided, only this highlight will be shown
    initialPage?: number;
    lockedPage?: number; // If set, user cannot change page (for single-page view)
    readonly?: boolean; // If true, selection is disabled
    onPageChange?: (page: number) => void;
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

export const PDFPlayer = forwardRef<PDFPlayerHandle, PDFPlayerProps>(({ 
    url, 
    fileId, 
    highlightId,
    initialPage = 1, 
    lockedPage,  
    readonly = false,
    onPageChange, 
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
    // --- State ---
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(initialPage);
    const [scale, setScale] = useState<number>(1.0);
    const [hasError, setHasError] = useState(false);
    const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [selectedText, setSelectedText] = useState<string>("");
    
    // Use debounce for resizing to prevent flickering and excessive re-renders
    // Reduced to 50ms to ensure responsive layout when sidebar toggles
    const [debouncedWidth] = useDebounceValue(containerWidth, 50);

    const containerRef = useRef<HTMLDivElement>(null);
    const pageWrapperRef = useRef<HTMLDivElement>(null);

    // --- Store Access ---
    const { addHighlight, activeCollectionId, highlights } = useStore();

    // --- Derived State ---
    const options = useMemo(() => ({
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
        verbosity: 0,
        stopAtErrors: false,
        pdfBug: false,
    }), []);

    // Filter highlights for the current page
    const pageHighlights = useMemo(() => 
        highlights.filter((h: Highlight) => 
            h.fileId === fileId && 
            h.start === pageNumber &&
            (!highlightId || h.id === highlightId)
        ),
        [highlights, fileId, pageNumber, highlightId]
    );

    const [highlightRects, setHighlightRects] = useState<{ x: number, y: number, width: number, height: number }[]>([]);

    // Robust URL handling to prevent worker race conditions
    const [safeUrl, setSafeUrl] = useState<string | null>(null);

    useEffect(() => {
        // Immediate cleanup
        setLoadedUrl(null);
        setNumPages(0);
        setHasError(false);
        setSafeUrl(null);

        // Small delay to ensure previous worker is cleaned up before starting new one
        const timer = setTimeout(() => {
            setSafeUrl(url);
        }, 100);

        return () => clearTimeout(timer);
    }, [url]);

    const handleLoadSuccess = useCallback(({ numPages }: { numPages: number }) => { 
        setNumPages(numPages); 
        setHasError(false); 
        setLoadedUrl(safeUrl);
    }, [safeUrl]);

    const handleLoadError = useCallback((err: Error) => {
        if (err.message.includes('Worker was terminated')) {
            // Ignore worker termination errors (race condition)
            return;
        }
        console.error("PDF Load Error:", err);
        setHasError(true);
        playSfx('error');
    }, []);

    // --- Effects ---

    // 1. Resize Observer
    useEffect(() => {
        if (!containerRef.current) return;
        
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0) {
                    setContainerWidth(entry.contentRect.width);
                }
            }
        });
        
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [safeUrl]);

    // 2. Initial Page Sync and URL change reset
    useEffect(() => {
        if (lockedPage) {
            setPageNumber(lockedPage);
        } else if (initialPage) {
            setPageNumber(initialPage);
        }
    }, [initialPage, lockedPage]);

    // 3. Selection Listener (Only if not readonly)
    const [selectionRect, setSelectionRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

    useEffect(() => {
        if (readonly) return;

        const handleSelectionChange = () => {
            const sel = window.getSelection();
            const text = sel ? sel.toString().trim() : "";
            
            // Only update if selection is inside our container
            if (sel && sel.rangeCount > 0 && containerRef.current?.contains(sel.anchorNode)) {
                setSelectedText(text);
                onSelectionChange?.(!!text);

                if (text) {
                    const range = sel.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    const containerRect = containerRef.current?.getBoundingClientRect();
                    
                    if (containerRect) {
                        setSelectionRect({
                            top: rect.top - containerRect.top,
                            left: rect.left - containerRect.left,
                            width: rect.width,
                            height: rect.height
                        });
                    }
                } else {
                    setSelectionRect(null);
                }
            } else {
                setSelectedText("");
                onSelectionChange?.(false);
                setSelectionRect(null);
            }
        };
        
        document.addEventListener("selectionchange", handleSelectionChange);
        // Handle scroll to update position
        const handleScroll = () => {
            if (selectedText) handleSelectionChange();
        };
        window.addEventListener("scroll", handleScroll, true);

        return () => {
            document.removeEventListener("selectionchange", handleSelectionChange);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [onSelectionChange, readonly, selectedText]);

    // 4. Update Highlights Visuals
    useEffect(() => {
        // Wait for text layer to render
        const timer = setTimeout(updateHighlights, 300); // Small delay to ensure DOM is ready
        return () => clearTimeout(timer);
    }, [pageNumber, scale, pageHighlights, debouncedWidth]);

    // --- Logic ---
    
    // Wrap updateHighlights in useCallback to prevent re-creation on every render
    const updateHighlights = useCallback(() => {
        if (!pageWrapperRef.current) return;
        const textLayer = pageWrapperRef.current.querySelector('.react-pdf__Page__textContent');
        if (!textLayer) return; // Not ready yet

        const newRects: { x: number, y: number, width: number, height: number }[] = [];
        const wrapperRect = pageWrapperRef.current.getBoundingClientRect();

        // Build text nodes map
        const textNodes: { node: Node, start: number, end: number }[] = [];
        let fullText = "";
        const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT, null);
        let currentNode: Node | null;
        
        while (currentNode = walker.nextNode()) {
            const val = currentNode.textContent || "";
            textNodes.push({
                node: currentNode,
                start: fullText.length,
                end: fullText.length + val.length
            });
            fullText += val;
        }

        if (!fullText) return;

        const addRectsForRange = (start: number, end: number) => {
            try {
                const range = document.createRange();
                const startNodeInfo = textNodes.find(n => start >= n.start && start < n.end);
                const endNodeInfo = textNodes.find(n => end > n.start && end <= n.end);
                
                if (startNodeInfo && endNodeInfo) {
                    range.setStart(startNodeInfo.node, start - startNodeInfo.start);
                    range.setEnd(endNodeInfo.node, end - endNodeInfo.start);
                    
                    const clientRects = range.getClientRects();
                    for (const rect of clientRects) {
                        newRects.push({
                            x: (rect.left - wrapperRect.left) / scale,
                            y: (rect.top - wrapperRect.top) / scale,
                            width: rect.width / scale,
                            height: rect.height / scale
                        });
                    }
                }
            } catch (e) {
                // Ignore range errors
            }
        };

        const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        pageHighlights.forEach((h: any) => {
            if (h.pdfRange) {
                addRectsForRange(h.pdfRange.start, h.pdfRange.end);
            } else if (h.text) {
                // Fallback for legacy highlights without range
                const pattern = escapeRegExp(h.text.trim()).replace(/\s+/g, '\\s+');
                const regex = new RegExp(pattern, 'gi');
                let match;
                while ((match = regex.exec(fullText)) !== null) {
                    addRectsForRange(match.index, match.index + match[0].length);
                }
            }
        });

        setHighlightRects(newRects);
    }, [pageHighlights, scale]);

    const handleAddHighlight = () => {
        if (!selectedText || readonly) return;

        let pdfRange: { start: number, end: number } | null = null;
        let visualRect: { x: number, y: number, width: number, height: number } | null = null;
        const sel = window.getSelection();
        
        if (sel && sel.rangeCount > 0 && pageWrapperRef.current) {
            const range = sel.getRangeAt(0);
            
            // Calculate visual rect
            const boundingRect = range.getBoundingClientRect();
            const pageRect = pageWrapperRef.current.getBoundingClientRect();
            
            if (boundingRect.width > 0 && boundingRect.height > 0 && pageRect.width > 0 && pageRect.height > 0) {
                 visualRect = {
                    x: (boundingRect.left - pageRect.left) / pageRect.width,
                    y: (boundingRect.top - pageRect.top) / pageRect.height,
                    width: boundingRect.width / pageRect.width,
                    height: boundingRect.height / pageRect.height
                };
            }

            const textLayer = pageWrapperRef.current.querySelector('.react-pdf__Page__textContent');
            
            if (textLayer && textLayer.contains(range.commonAncestorContainer)) {
                // Calculate absolute offsets
                const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT, null);
                let currentIndex = 0;
                let start = -1;
                let end = -1;
                let currentNode: Node | null;
                
                while (currentNode = walker.nextNode()) {
                    const nodeLen = currentNode.textContent?.length || 0;
                    if (currentNode === range.startContainer) {
                        start = currentIndex + range.startOffset;
                    }
                    if (currentNode === range.endContainer) {
                        end = currentIndex + range.endOffset;
                    }
                    currentIndex += nodeLen;
                }
                
                if (start !== -1 && end !== -1) {
                    pdfRange = { start, end };
                }
            }
        }

        addHighlight(fileId, pageNumber, selectedText, activeCollectionId ?? null, pdfRange, visualRect);
        setSelectedText("");
        onSelectionChange?.(false);
        if (sel) sel.removeAllRanges();
    };

    const changePage = (offset: number) => {
        if (lockedPage) return;
        setPageNumber((prev: number) => {
            const newPage = Math.min(Math.max(prev + offset, 1), numPages);
            onPageChange?.(newPage);
            return newPage;
        });
    };

    // --- Exposed Methods ---
    useImperativeHandle(ref, () => ({
        jumpToPage: (page: number) => {
            if (page >= 1 && page <= (numPages || Infinity)) {
                setPageNumber(page);
            }
        },
        prevPage: () => changePage(-1),
        nextPage: () => changePage(1),
        addHighlightFromSelection: handleAddHighlight,
        zoomIn: () => setScale((s: number) => Math.min(s + 0.2, 3.0)),
        zoomOut: () => setScale((s: number) => Math.max(s - 0.2, 0.5))
    }));

    // --- Render Helpers ---
    const baseWidth = debouncedWidth ? debouncedWidth - 48 : 600;
    const effectiveWidth = baseWidth;

    if (!safeUrl) {
        return <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-2"></div>
            Loading...
        </div>;
    }

    return (
        <div className={cn("flex flex-col h-full bg-transparent relative selection:bg-primary/30", className)} ref={containerRef}>
            <style>{`
                .react-pdf__Page__textContent {
                    user-select: text !important;
                    cursor: text !important;
                }
                .react-pdf__Page__annotations {
                    pointer-events: none;
                }
                .annotationLayer .linkAnnotation > a {
                    pointer-events: auto;
                }
            `}</style>
            {/* Floating Highlight Button */}
            {selectionRect && !readonly && selectedText && (
                <div 
                    className="absolute z-50 animate-in fade-in zoom-in duration-200"
                    style={{
                        top: selectionRect.top - 40,
                        left: selectionRect.left + (selectionRect.width / 2) - 50,
                    }}
                >
                    <Button
                        size="sm"
                        onClick={(e: MouseEvent) => {
                            e.stopPropagation();
                            handleAddHighlight();
                            setSelectionRect(null);
                        }}
                        className="shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 rounded-full flex items-center gap-2"
                    >
                        <span className="text-xs font-semibold">Highlight</span>
                    </Button>
                </div>
            )}

            {/* Main Document Area */}
            <div className="flex-1 overflow-auto flex justify-center p-4 custom-scrollbar">
                {hasError ? (
                    <div className="flex flex-col items-center justify-center text-red-400 gap-2 h-full">
                        <span className="text-lg font-medium">Unable to load PDF</span>
                        <span className="text-sm text-white/50">The worker may have been terminated or the file is corrupted.</span>
                        <Button variant="outline" size="sm" onClick={() => { setHasError(false); setSafeUrl(null); setTimeout(() => setSafeUrl(url), 100); }}>
                            Retry
                        </Button>
                    </div>
                ) : (
                    <ErrorBoundary fallback={
                        <div className="flex flex-col items-center justify-center text-red-400 gap-2 h-full">
                            <span className="text-lg font-medium">Render Error</span>
                            <span className="text-sm text-white/50">The PDF viewer encountered an error.</span>
                            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                                Reload
                            </Button>
                        </div>
                    }>
                        <Document
                            key={safeUrl}
                            file={safeUrl}
                            onLoadSuccess={handleLoadSuccess}
                            onLoadError={handleLoadError}
                            options={options}
                        loading={
                            <div className="flex items-center justify-center h-64 text-muted-foreground">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-2"></div>
                                Loading PDF...
                            </div>
                        }
                        className="flex justify-center shadow-2xl"
                    >
                        {loadedUrl === safeUrl && (
                            <div 
                                className="relative transition-transform duration-200 ease-out origin-top" 
                                ref={pageWrapperRef}
                                style={{ transform: `scale(${scale})` }}
                            >
                                <Page
                                    key={pageNumber}
                                    pageNumber={pageNumber}
                                    width={effectiveWidth}
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                    className="bg-white"
                                    onLoadSuccess={updateHighlights}
                                    onRenderTextLayerSuccess={updateHighlights}
                                    onRenderError={() => setHasError(true)}
                                    onGetTextError={(e: Error) => { if (!e.message?.includes('terminated')) setHasError(true) }}
                                    onGetAnnotationsError={(e: Error) => { if (!e.message?.includes('terminated')) setHasError(true) }}
                                    onGetStructTreeError={(e: Error) => { if (!e.message?.includes('terminated')) setHasError(true) }}
                                    loading={
                                        <div 
                                            style={{ width: effectiveWidth, height: effectiveWidth * 1.4 }} 
                                            className="bg-white/10 animate-pulse" 
                                        />
                                    }
                                    error={
                                        <div className="flex items-center justify-center h-64 text-red-400">
                                            Error rendering page {pageNumber}
                                        </div>
                                    }
                                />
                                
                                {/* Highlight Overlay Layer */}
                                <div className="absolute inset-0 pointer-events-none z-10">
                                    {highlightRects.map((rect, i) => (
                                        <div
                                            key={i}
                                            className="absolute bg-yellow-400/30 mix-blend-multiply border-b-2 border-yellow-500/50"
                                            style={{
                                                left: rect.x,
                                                top: rect.y,
                                                width: rect.width,
                                                height: rect.height,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </Document>
                    </ErrorBoundary>
                )}
            </div>

            {/* Floating Controls (Bottom Center) */}
            <div className={cn(
                "absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/10 shadow-2xl z-[60] transition-all duration-300",
                showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            )}>
                {/* Page Navigation */}
                <div className="flex items-center gap-1 mr-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full"
                        onClick={() => changePage(-1)}
                        disabled={pageNumber <= 1 || !!lockedPage || !loadedUrl}
                        data-sound-back
                    >
                        <CaretLeft size={14} weight="bold" />
                    </Button>
                    
                    <span className="text-zinc-200 text-xs font-mono min-w-[50px] text-center select-none">
                        {pageNumber} <span className="text-zinc-500">/</span> {numPages || '-'}
                    </span>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full"
                        onClick={(e: MouseEvent) => { e.stopPropagation(); changePage(1); }}
                        disabled={pageNumber >= numPages || !!lockedPage || !loadedUrl}
                    >
                        <CaretRight size={14} weight="bold" />
                    </Button>
                </div>

                <div className="w-px h-4 bg-white/10 mx-1" />

                {/* Zoom Controls */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full"
                        onClick={(e: MouseEvent) => { 
                            e.stopPropagation(); 
                            setScale((s: number) => Math.max(s - 0.1, 0.5)); 
                        }}
                        disabled={!loadedUrl}
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
                        onClick={(e: MouseEvent) => { 
                            e.stopPropagation(); 
                            setScale((s: number) => Math.min(s + 0.1, 3.0)); 
                        }}
                        disabled={!loadedUrl}
                    >
                        <MagnifyingGlassPlus size={14} weight="bold" />
                    </Button>
                </div>

                {onToggleSidebar && showSidebarToggle && (
                    <>
                        <div className="w-px h-4 bg-white/10 mx-1" />
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
                            onClick={(e: MouseEvent) => {
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
                            onClick={(e: MouseEvent) => {
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

PDFPlayer.displayName = 'PDFPlayer';
