/** Cloudflare Workers API endpoint for sync operations. */
export const SYNC_API_URL = "https://whistler-sync.peteawesome.workers.dev";

/** Build a YouTube thumbnail URL for the given video ID and quality tier. */
export const getYouTubeThumbnailUrl = (videoId: string, quality: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault' = 'mqdefault') =>
    `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;

/** Build the unpkg CDN URL for the PDF.js worker script. */
export const getPdfWorkerUrl = (version: string) =>
    `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

/** Shared react-pdf Document options (cMap + standard fonts from unpkg CDN). */
export const getPdfDocumentOptions = (version: string) => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${version}/standard_fonts/`,
    verbosity: 0,
    stopAtErrors: false,
    pdfBug: false,
});
