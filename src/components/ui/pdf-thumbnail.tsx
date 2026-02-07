import { useState, useEffect, memo, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { globalWorker } from "@/pdf-worker";
import { ErrorBoundary } from '@/components/ui/error-boundary';

export const PdfThumbnail = memo(function PdfThumbnail({ url, onError, className, width = 160, page = 1, rect }: { url: string; onError: () => void, className?: string, width?: number, page?: number, rect?: { x: number; y: number; width: number; height: number } }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
    const [safeUrl, setSafeUrl] = useState<string | null>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            setIsVisible(entry.isIntersecting);
        }, { rootMargin: '200px' });
        
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) {
            setSafeUrl(null);
            return;
        }

        if (url === safeUrl) return;

        setLoadedUrl(null);
        const timer = setTimeout(() => {
            setSafeUrl(url);
        }, 500); 
        return () => {
            clearTimeout(timer);
        };
    }, [url, isVisible, safeUrl]);

    if (!safeUrl) {
        return (
            <div ref={containerRef} className={`w-full h-full flex items-center justify-center bg-muted ${className || ''}`}>
                <div className="text-xs text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`w-full h-full flex items-center justify-center bg-muted overflow-hidden ${className || ''}`}>
            <ErrorBoundary fallback={
                <div className="flex flex-col items-center justify-center text-xs text-red-400 p-2 text-center">
                    <span>Preview Error</span>
                </div>
            }>
                <Document
                    file={safeUrl}
                    loading={
                        <div className="text-xs text-muted-foreground">
                            Loading PDF...
                        </div>
                    }
                    onLoadSuccess={() => setLoadedUrl(safeUrl)}
                    onLoadError={(error: Error) => {
                        // Ignore worker termination errors which happen during rapid scrolling
                        if (error.message.includes('Worker was terminated')) {
                            return;
                        }
                        console.error('Thumbnail Load Error:', error);
                        onError();
                    }}
                    options={{
                        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                        cMapPacked: true,
                        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
                        verbosity: 0,
                        stopAtErrors: false,
                        pdfBug: false,
                    }}
                >
                    {loadedUrl === safeUrl && (
                        <Page
                            pageNumber={page}
                            width={width}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            onRenderError={() => onError()}
                            onGetTextError={(e: Error) => { if (!e.message?.includes('terminated')) onError() }}
                            onGetAnnotationsError={(e: Error) => { if (!e.message?.includes('terminated')) onError() }}
                            onGetStructTreeError={(e: Error) => { if (!e.message?.includes('terminated')) onError() }}
                        >
                            {rect && (
                                <div 
                                    className="absolute bg-yellow-400/40 mix-blend-multiply border border-yellow-500/50 z-10"
                                    style={{
                                        left: `${rect.x * 100}%`,
                                        top: `${rect.y * 100}%`,
                                        width: `${rect.width * 100}%`,
                                        height: `${rect.height * 100}%`
                                    }}
                                />
                            )}
                        </Page>
                    )}
                </Document>
            </ErrorBoundary>
        </div>
    );
});
