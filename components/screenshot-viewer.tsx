'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Pencil, RotateCcw, Undo2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScreenshotViewerProps {
  imageUrl: string;
  title?: string;
  children?: React.ReactNode;
}

const MIN_ZOOM = 50;
const MAX_ZOOM = 300;
const ZOOM_STEP = 25;
interface DrawingPoint {
  x: number;
  y: number;
}

type DrawingPath = DrawingPoint[];

const clampZoom = (value: number) => Math.min(Math.max(value, MIN_ZOOM), MAX_ZOOM);
const getDefaultZoom = () => {
  if (typeof window === 'undefined') {
    return 100;
  }

  if (window.innerWidth >= 1600) {
    return 140;
  }

  if (window.innerWidth >= 1280) {
    return 125;
  }

  return 100;
};

export function ScreenshotViewer({ imageUrl, title = 'Screenshot', children }: ScreenshotViewerProps) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isPenEnabled, setIsPenEnabled] = useState(false);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { toast } = useToast();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    setZoom(nextOpen ? getDefaultZoom() : 100);
    setIsPenEnabled(false);
    setDrawingPaths([]);
  };

  const filename = useMemo(() => {
    const fallbackBaseName =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'screenshot';

    try {
      const url = new URL(imageUrl, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
      const lastSegment = url.pathname.split('/').filter(Boolean).pop();
      return lastSegment && lastSegment.includes('.') ? lastSegment : `${fallbackBaseName}.png`;
    } catch {
      return `${fallbackBaseName}.png`;
    }
  }, [imageUrl, title]);

  const updateZoom = (nextZoom: number) => {
    setZoom(clampZoom(nextZoom));
  };

  const handleDownload = async () => {
    const image = imageRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (image && drawingCanvas && drawingPaths.length > 0) {
      try {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = image.naturalWidth;
        exportCanvas.height = image.naturalHeight;
        const context = exportCanvas.getContext('2d');
        if (!context) throw new Error('Could not prepare the annotated image.');

        context.drawImage(image, 0, 0);
        context.drawImage(drawingCanvas, 0, 0);
        const blob = await new Promise<Blob>((resolve, reject) => {
          exportCanvas.toBlob((result) => {
            if (result) resolve(result);
            else reject(new Error('Could not export the annotated image.'));
          });
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) {
        console.error('[ScreenshotViewer] Annotated image download failed', error);
        toast({
          title: 'Download failed',
          description: 'Could not export the annotations with this image. Try opening it in a new tab instead.',
          variant: 'destructive',
        });
      }
      return;
    }

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => {
    setZoom(prev => clampZoom(prev + ZOOM_STEP));
  };

  const handleZoomOut = () => {
    setZoom(prev => clampZoom(prev - ZOOM_STEP));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  const handleOpenInNewTab = () => {
    window.open(imageUrl, '_blank', 'noopener,noreferrer');
  };

  const getDrawingPoint = (event: ReactPointerEvent<HTMLCanvasElement>): DrawingPoint => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
    };
  };

  const handleDrawingStart = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isPenEnabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getDrawingPoint(event);
    setDrawingPaths((paths) => [...paths, [point]]);
  };

  const handleDrawingMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isPenEnabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = getDrawingPoint(event);
    setDrawingPaths((paths) => {
      if (paths.length === 0) return paths;
      const nextPaths = [...paths];
      nextPaths[nextPaths.length - 1] = [...nextPaths[nextPaths.length - 1], point];
      return nextPaths;
    });
  };

  const handleImageLoad = (image: HTMLImageElement) => {
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
    }
    setImageLoaded(true);
  };

  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    const image = imageRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !imageLoaded || !image) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#facc15';
    context.lineWidth = Math.max(4, image.naturalWidth / 400);
    context.lineCap = 'round';
    context.lineJoin = 'round';

    for (const path of drawingPaths) {
      if (path.length === 0) continue;
      context.beginPath();
      context.moveTo(path[0].x * canvas.width, path[0].y * canvas.height);
      for (const point of path.slice(1)) {
        context.lineTo(point.x * canvas.width, point.y * canvas.height);
      }
      if (path.length === 1) {
        context.lineTo(path[0].x * canvas.width + 0.1, path[0].y * canvas.height + 0.1);
      }
      context.stroke();
    }
  }, [drawingPaths, imageLoaded, zoom]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setZoom(prev => clampZoom(prev + ZOOM_STEP));
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        setZoom(prev => clampZoom(prev - ZOOM_STEP));
      } else if (event.key === '0') {
        event.preventDefault();
        setZoom(100);
      } else if (event.key === 'Escape') {
        setIsPenEnabled(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Render static image during SSR and hydration
  const staticImage = (
    <div className="cursor-zoom-in overflow-hidden rounded-lg border border-border transition-opacity hover:opacity-80">
      <Image
        src={imageUrl}
        alt={title}
        width={1200}
        height={800}
        unoptimized
        className="max-h-64 w-full object-contain rounded-lg border border-border"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || staticImage}
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="!fixed !inset-0 !left-0 !top-0 !flex !h-dvh !max-h-dvh !w-screen !max-w-none !translate-x-0 !translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-[#090b10] p-0 text-white shadow-none"
      >
        <DialogHeader className="shrink-0 border-b border-white/10 bg-[#101319] px-3 py-2 text-left sm:px-5 sm:py-3">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <DialogTitle className="min-w-0 truncate pr-2 text-sm font-semibold text-white sm:text-base">{title}</DialogTitle>
            <div className="flex w-full items-center gap-1 overflow-x-auto pb-0.5 sm:w-auto sm:justify-end">
              <Button
                variant={isPenEnabled ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setIsPenEnabled((enabled) => !enabled)}
                title={isPenEnabled ? 'Disable pen' : 'Draw on image'}
                aria-label={isPenEnabled ? 'Disable drawing pen' : 'Draw on image'}
                aria-pressed={isPenEnabled}
                className="shrink-0 text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">{isPenEnabled ? 'Pen on' : 'Draw'}</span>
              </Button>
              {drawingPaths.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDrawingPaths((paths) => paths.slice(0, -1))}
                  title="Undo last stroke"
                  aria-label="Undo last stroke"
                  className="shrink-0 text-slate-200 hover:bg-white/10 hover:text-white"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= MIN_ZOOM}
                title="Zoom out"
                aria-label="Zoom out"
                className="shrink-0 text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="min-w-[2.75rem] shrink-0 text-center text-xs font-medium tabular-nums text-slate-300">{zoom}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= MAX_ZOOM}
                title="Zoom in"
                aria-label="Zoom in"
                className="shrink-0 text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetZoom}
                title="Reset zoom"
                className="shrink-0 text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                title="Download image"
                aria-label="Download image"
                className="shrink-0 text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenInNewTab}
                title="Open in new tab"
                aria-label="Open image in new tab"
                className="shrink-0 text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <DialogClose asChild>
                <Button variant="ghost" size="sm" title="Close viewer" aria-label="Close viewer" className="shrink-0 text-slate-200 hover:bg-white/10 hover:text-white">
                  <X className="w-4 h-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {/* Image Container */}
        <div
          className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_center,rgba(35,42,55,0.72),rgba(9,11,16,0.98)_72%)] p-2 sm:p-4"
          onWheel={(event) => {
            if (!(event.ctrlKey || event.metaKey)) {
              return;
            }

            event.preventDefault();
            updateZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
          }}
        >
          <div className="flex min-h-full min-w-full items-center justify-center">
            <div
              className="relative inline-flex max-h-full max-w-full items-center justify-center transition-transform duration-150 ease-out"
              style={{ transform: `scale(${zoom / 100})` }}
            >
              <Image
                ref={imageRef}
                src={imageUrl}
                alt={title}
                width={1600}
                height={1200}
                unoptimized
                onLoad={(event) => handleImageLoad(event.currentTarget)}
                onDoubleClick={() => updateZoom(zoom === 100 ? 200 : 100)}
                className="block h-auto max-h-[calc(100dvh-150px)] w-auto max-w-[calc(100vw-16px)] rounded-lg border border-white/10 bg-background object-contain shadow-2xl sm:max-h-[calc(100dvh-170px)] sm:max-w-[calc(100vw-40px)]"
              />
              <canvas
                ref={drawingCanvasRef}
                aria-label={isPenEnabled ? 'Draw on screenshot' : 'Screenshot annotations'}
                className={`absolute inset-0 h-full w-full ${isPenEnabled ? 'touch-none cursor-crosshair' : 'pointer-events-none'}`}
                onPointerDown={handleDrawingStart}
                onPointerMove={handleDrawingMove}
              />
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="shrink-0 border-t border-white/10 bg-[#101319] px-3 py-2 text-[11px] text-slate-400 sm:px-5">
          {isPenEnabled
            ? 'Draw with your mouse, finger, or stylus. Download saves the annotations with the image.'
            : 'Use +, - or 0 to zoom. Hold Ctrl or Cmd while scrolling, or double-click the image to zoom.'}
        </div>
      </DialogContent>
    </Dialog>
  );
}
