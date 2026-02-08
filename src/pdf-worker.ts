import { pdfjs } from 'react-pdf';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Use the local worker to ensure the file is always available and matches the pdfjs-dist version
// This prevents 404 errors and worker termination issues caused by local file resolution failures or CDN issues
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Create a persistent worker instance to prevent "Worker was terminated" errors during re-renders
export const globalWorker = new pdfjs.PDFWorker();
