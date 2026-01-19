import React, { useState, useRef, useEffect, useMemo, useImperativeHandle } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { CaretLeft, CaretRight, MagnifyingGlassPlus, MagnifyingGlassMinus } from '@phosphor-icons/react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useStore } from '@/store/useStore';

// Configure worker locally
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface PDFPlayerProps {
    url: string;
    fileId: string;
    initialPage?: number;
    onPageChange?: (page: number) => void;
    onSelectionChange?: (hasSelection: boolean) => void;
}

export interface PDFPlayerHandle {
    jumpToPage: (page: number) => void;
    addHighlightFromSelection: () => void;
}

export const PDFPlayer = React.forwardRef<PDFPlayerHandle, PDFPlayerProps>(({ url, fileId, initialPage = 1, onPageChange, onSelectionChange }, ref) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(initialPage);
    const [scale, setScale] = useState<number>(1.0);
    const [hasError, setHasError] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [selectedText, setSelectedText] = useState<string>("");
    const [aspectRatio, setAspectRatio] = useState<number | null>(null);

    const { addHighlight, activeCollectionId, highlights } = useStore();

    const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();

    const pageHighlights = useMemo(
        () =>
            highlights
                .filter((t) => t.fileId === fileId && t.start === pageNumber && t.text),
        [highlights, fileId, pageNumber]
    );

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                setContainerWidth(width);
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (initialPage) setPageNumber(initialPage);
    }, [initialPage]);

    useEffect(() => {
        const handleSelectionChange = () => {
            const sel = window.getSelection();
            const text = sel ? sel.toString().trim() : "";
            setSelectedText(text);
            onSelectionChange?.(!!text);
        };
        document.addEventListener("selectionchange", handleSelectionChange);
        return () => document.removeEventListener("selectionchange", handleSelectionChange);
    }, [onSelectionChange]);

    const [highlightRects, setHighlightRects] = useState<{ x: number, y: number, width: number, height: number }[]>([]);
    const pageWrapperRef = useRef<HTMLDivElement | null>(null);

    const handleAddHighlight = () => {
        if (!selectedText) return;

        // Calculate range
        let pdfRange: { start: number, end: number } | null = null;
        const sel = window.getSelection();
        
        if (sel && sel.rangeCount > 0 && pageWrapperRef.current) {
            const range = sel.getRangeAt(0);
            const textLayer = pageWrapperRef.current.querySelector('.react-pdf__Page__textContent');
            
            if (textLayer && textLayer.contains(range.commonAncestorContainer)) {
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

        addHighlight(fileId, pageNumber, selectedText, activeCollectionId ?? null, pdfRange);
        setSelectedText("");
        onSelectionChange?.(false);
        if (sel) sel.removeAllRanges();
    };

    useImperativeHandle(ref, () => ({
        jumpToPage: (page: number) => {
            if (page >= 1 && page <= (numPages || Infinity)) {
                setPageNumber(page);
            }
        },
        addHighlightFromSelection: handleAddHighlight
    }));

    function onPageLoadSuccess(page: any) {
        // We don't need textItems for the range-based approach, but keeping it might be useful if we switch back.
        // For now, we'll rely on the DOM.
        const width = page.originalWidth;
        const height = page.originalHeight;
        if (width && height) {
            setAspectRatio(width / height);
        }
    }

    // Update highlights when page/scale/highlights change.
    useEffect(() => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds
        const interval = setInterval(() => {
            if (!pageWrapperRef.current) return;
            const textLayer = pageWrapperRef.current.querySelector('.react-pdf__Page__textContent');
            
            // If text layer exists and has children (content), try to highlight
            if (textLayer && textLayer.children.length > 0) {
                updateHighlights();
                if (attempts > 10) clearInterval(interval);
            }
            
            attempts++;
            if (attempts >= maxAttempts) clearInterval(interval);
        }, 100);

        return () => clearInterval(interval);
    }, [pageNumber, scale, pageHighlights, numPages]);

    function updateHighlights() {
        if (!pageWrapperRef.current) return;
        
        const textLayer = pageWrapperRef.current.querySelector('.react-pdf__Page__textContent');
        if (!textLayer) return;

        const newRects: { x: number, y: number, width: number, height: number }[] = [];
        
        // 1. Build a map of all text nodes and their global offsets
        const textNodes: { node: Node, start: number, end: number }[] = [];
        let fullText = "";
        
        // Use a TreeWalker or just iterate spans if we know the structure.
        // React-pdf text layer usually is flat spans.
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

        // Helper to add rects for a range
        const addRectsForRange = (start: number, end: number) => {
            try {
                const range = document.createRange();
                
                const startNodeInfo = textNodes.find(n => start >= n.start && start < n.end);
                const endNodeInfo = textNodes.find(n => end > n.start && end <= n.end);
                
                if (startNodeInfo && endNodeInfo) {
                    range.setStart(startNodeInfo.node, start - startNodeInfo.start);
                    range.setEnd(endNodeInfo.node, end - endNodeInfo.start);
                    
                    const clientRects = range.getClientRects();
                    const wrapperRect = pageWrapperRef.current!.getBoundingClientRect();
                    
                    for (const rect of clientRects) {
                        newRects.push({
                            x: rect.left - wrapperRect.left,
                            y: rect.top - wrapperRect.top,
                            width: rect.width,
                            height: rect.height
                        });
                    }
                }
            } catch (e) {
                console.error("Error creating range for highlight", e);
            }
        };

        // 2. Search for highlights
        const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        pageHighlights.forEach(h => {
            if (!h.text) return;
            
            if (h.pdfRange) {
                addRectsForRange(h.pdfRange.start, h.pdfRange.end);
            } else {
                // Legacy: match all occurrences
                const pattern = escapeRegExp(h.text.trim()).replace(/\s+/g, '\\s+');
                const regex = new RegExp(pattern, 'gi');
                
                let match;
                while ((match = regex.exec(fullText)) !== null) {
                    addRectsForRange(match.index, match.index + match[0].length);
                }
            }
        });

        setHighlightRects(newRects);
    }

    if (!url) {
        return (
            <div className="flex flex-col h-full bg-transparent items-center justify-center text-zinc-200 text-sm" ref={containerRef}>
                No PDF URL is configured for this file.
            </div>
        );
    }

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setHasError(false);
    }

    const changePage = (offset: number) => {
        setPageNumber(prevPageNumber => {
            const newPage = Math.min(Math.max(prevPageNumber + offset, 1), numPages);
            onPageChange?.(newPage);
            return newPage;
        });
    };

    const baseWidth = containerWidth ? Math.min(containerWidth - 64, 1200) : 600;
    const effectiveWidth = baseWidth * scale;
    const loadingHeight = aspectRatio ? effectiveWidth / aspectRatio : 800;

    return (
        <div className="flex flex-col h-full bg-transparent relative group" ref={containerRef}>
            <div className="flex-1 overflow-auto flex justify-center p-4">
                {hasError ? (
                    <div className="flex items-center justify-center h-full text-red-200 text-sm">
                        Failed to load PDF.
                    </div>
                ) : (
            <Document
                        file={url}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={() => setHasError(true)}
                        className="box-shadow-xl"
                        loading={
                            <div className="flex items-center justify-center h-full text-white">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                        }
                    >
                        <div className="relative" ref={pageWrapperRef}>
                            <Page
                                pageNumber={pageNumber}
                                width={effectiveWidth}
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                                onLoadSuccess={onPageLoadSuccess}
                                className="bg-transparent"
                                loading={
                                    <div className="flex items-center justify-center text-white/20" style={{ height: loadingHeight }}>
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/20"></div>
                                    </div>
                                }
                            />
                            {/* Overlay Highlight Layer */}
                            <div className="absolute inset-0 pointer-events-none">
                                {highlightRects.map((rect, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            position: 'absolute',
                                            left: rect.x,
                                            top: rect.y,
                                            width: rect.width,
                                            height: rect.height,
                                            backgroundColor: 'hsl(var(--primary) / 0.4)',
                                            borderRadius: '2px',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </Document>
                )}
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-2xl transition-opacity opacity-0 group-hover:opacity-100 z-50">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                    onClick={() => changePage(-1)}
                    disabled={pageNumber <= 1}
                >
                    <CaretLeft size={18} />
                </Button>

                <span className="text-white text-sm font-medium min-w-[60px] text-center font-mono">
                    {pageNumber} / {numPages || '--'}
                </span>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                    onClick={() => changePage(1)}
                    disabled={pageNumber >= numPages}
                >
                    <CaretRight size={18} />
                </Button>

                <div className="w-px h-4 bg-white/20 mx-2" />

                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
                    <MagnifyingGlassMinus size={16} />
                </Button>
                <span className="text-white text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full" onClick={() => setScale(s => Math.min(3, s + 0.1))}>
                    <MagnifyingGlassPlus size={16} />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-8 px-3 text-xs text-white hover:bg-white/20 rounded-full"
                    disabled={!selectedText}
                    onClick={handleAddHighlight}
                >
                    Add Highlight
                </Button>
            </div>
        </div>
    );
});
