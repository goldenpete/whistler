import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useResizeObserver } from 'usehooks-ts';
import { Button } from '@/components/ui/button';
import { CaretLeft, CaretRight, MagnifyingGlassPlus, MagnifyingGlassMinus } from '@phosphor-icons/react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker locally
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface PDFPlayerProps {
    url: string;
    initialPage?: number;
    onPageChange?: (page: number) => void;
}

export function PDFPlayer({ url, initialPage = 1, onPageChange }: PDFPlayerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(initialPage);
    const [scale, setScale] = useState<number>(1.0);
    const [containerRef, containerSize] = useResizeObserver({
        box: 'border-box',
    });

    // Auto-fit width on load
    useEffect(() => {
        if (containerSize.width > 0) {
            // Approximate fit width (standard A4 ratio is ~0.7)
            // But we don't know PDF size yet. 
            // Usually we start with 1.0 or fit width if possible.
            // For now let's stick to 1.0 or calculated responsive scale.
            const wrapperWidth = containerSize.width;
            const targetWidth = wrapperWidth - 48; // padding
            if (targetWidth > 0) {
                // We can't set scale based on PDF width until it renders
                // So we might let Page handle width={targetWidth}
            }
        }
    }, [containerSize.width]);

    useEffect(() => {
        if (initialPage) setPageNumber(initialPage);
    }, [initialPage]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    const changePage = (offset: number) => {
        setPageNumber(prevPageNumber => {
            const newPage = Math.min(Math.max(prevPageNumber + offset, 1), numPages);
            onPageChange?.(newPage);
            return newPage;
        });
    };

    return (
        <div className="flex flex-col h-full bg-slate-900/50 relative group" ref={containerRef}>
            {/* PDF Render */}
            <div className="flex-1 overflow-auto flex justify-center p-4">
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="box-shadow-xl"
                    loading={
                        <div className="flex items-center justify-center h-full text-white">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                    }
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        width={containerSize.width ? Math.min(containerSize.width - 64, 1200) : 600}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                    />
                </Document>
            </div>

            {/* Floating Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-2xl transition-opacity opacity-0 group-hover:opacity-100">
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
            </div>
        </div>
    );
}
