import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

// pdf.js workerの設定
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

interface UsePdfReturn {
  currentPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  renderPage: (canvas: HTMLCanvasElement) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function usePdf(pdfData: ArrayBuffer | null): UsePdfReturn {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);

  useEffect(() => {
    if (!pdfData) {
      pdfDocRef.current = null;
      setTotalPages(0);
      setCurrentPage(1);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    // ArrayBufferをコピーして渡す（Workerへの転送で元バッファが無効化されるのを防ぐ）
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfData.slice(0)) });
    loadingTask.promise
      .then((doc) => {
        if (cancelled) return;
        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      })
      .catch((err: Error) => {
        // StrictModeのcleanupによるWorker破棄は無視する
        if (cancelled || err.message === 'Worker was destroyed') return;
        setError(`PDFの読み込みに失敗しました: ${err.message}`);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      loadingTask.destroy();
    };
  }, [pdfData]);

  const renderPage = async (canvas: HTMLCanvasElement): Promise<void> => {
    const doc = pdfDocRef.current;
    if (!doc) return;

    let page: PDFPageProxy | null = null;
    try {
      page = await doc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.5 });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    } finally {
      page?.cleanup();
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return {
    currentPage,
    totalPages,
    goToPage,
    nextPage: () => goToPage(currentPage + 1),
    prevPage: () => goToPage(currentPage - 1),
    renderPage,
    isLoading,
    error,
  };
}
