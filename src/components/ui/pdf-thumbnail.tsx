import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { globalWorker } from "@/pdf-worker";
import { ErrorBoundary } from '@/components/ui/error-boundary';

export function PdfThumbnail({ url, onError, className, width = 160, page = 1 }: { url: string; onError: () => void, className?: string, width?: number, page?: number }) {
    const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
    const [safeUrl, setSafeUrl] = useState<string | null>(null);

    useEffect(() => {
        setLoadedUrl(null);
        // Debounce the PDF loading to prevent worker termination race conditions
        // when scrolling quickly through files
        const timer = setTimeout(() => {
            setSafeUrl(url);
        }, 500); 
        return () => {
            clearTimeout(timer);
            setSafeUrl(null);
        };
    }, [url]);

    if (!safeUrl) {
        return (
            <div className={`w-full h-full flex items-center justify-center bg-muted ${className || ''}`}>
                <div className="text-xs text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className={`w-full h-full flex items-center justify-center bg-muted overflow-hidden ${className || ''}`}>
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
                        />
                    )}
                </Document>
            </ErrorBoundary>
        </div>
    );
}
