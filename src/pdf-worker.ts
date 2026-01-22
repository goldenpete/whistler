import { pdfjs } from 'react-pdf';

// Use the public worker file to avoid bundling issues and worker termination errors
// This file is copied from node_modules/pdfjs-dist/build/pdf.worker.min.mjs to public/
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
