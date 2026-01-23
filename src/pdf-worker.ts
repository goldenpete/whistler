import { pdfjs } from 'react-pdf';

// Use the CDN worker to ensure the file is always available and matches the pdfjs-dist version
// This prevents 404 errors and worker termination issues caused by local file resolution failures
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
