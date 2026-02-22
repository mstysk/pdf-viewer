import { useEffect, useRef, useState } from 'react';
import { usePdf } from '../hooks/usePdf';

interface PdfViewerProps {
  pdfData: ArrayBuffer;
  onClose: () => void;
}

export function PdfViewer({ pdfData, onClose }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentPage, totalPages, nextPage, prevPage, renderPage, isLoading, error } =
    usePdf(pdfData);

  // スワイプ検知用
  const touchStartXRef = useRef<number | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || isLoading) return;

    setIsRendering(true);
    renderPage(canvasRef.current).finally(() => setIsRendering(false));
  }, [currentPage, isLoading, renderPage]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;

    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    const threshold = 50;

    if (diff > threshold) {
      nextPage();
    } else if (diff < -threshold) {
      prevPage();
    }
    touchStartXRef.current = null;
  };

  return (
    <div className="pdf-viewer">
      <div className="pdf-toolbar">
        <button className="toolbar-btn" onClick={onClose} aria-label="閉じる">
          ✕
        </button>
        <div className="page-info">
          <button className="toolbar-btn" onClick={prevPage} disabled={currentPage <= 1}>
            ‹
          </button>
          <span>
            {currentPage} / {totalPages}
          </span>
          <button className="toolbar-btn" onClick={nextPage} disabled={currentPage >= totalPages}>
            ›
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div
        className="canvas-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {(isLoading || isRendering) && <div className="loading-overlay">読み込み中...</div>}
        <canvas ref={canvasRef} className="pdf-canvas" />
      </div>
    </div>
  );
}
