'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ScreenshotViewerProps {
  imageUrl: string;
  title?: string;
  children?: React.ReactNode;
}

const MIN_ZOOM = 50;
const MAX_ZOOM = 300;
const ZOOM_STEP = 25;
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

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    setZoom(nextOpen ? getDefaultZoom() : 100);
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

  const handleDownload = () => {
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
        className="flex h-[min(94vh,1100px)] w-[min(98vw,1700px)] max-w-[min(98vw,1700px)] flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <DialogTitle className="pr-4 text-base sm:text-lg">{title}</DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= MIN_ZOOM}
                title="Zoom out"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[3rem] text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= MAX_ZOOM}
                title="Zoom in"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetZoom}
                disabled={zoom === 100}
                title="Reset zoom"
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
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenInNewTab}
                title="Open in new tab"
                aria-label="Open image in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <DialogClose asChild>
                <Button variant="ghost" size="sm" title="Close viewer" aria-label="Close viewer">
                  <X className="w-4 h-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {/* Image Container */}
        <div
          className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_45%),linear-gradient(180deg,rgba(148,163,184,0.12),rgba(15,23,42,0.04))] p-3 sm:p-5 lg:p-6"
          onWheel={(event) => {
            if (!(event.ctrlKey || event.metaKey)) {
              return;
            }

            event.preventDefault();
            updateZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
          }}
        >
          <div className="flex min-h-full min-w-full items-center justify-center">
            <Image
              src={imageUrl}
              alt={title}
              width={1600}
              height={1200}
              unoptimized
              style={{ width: `${zoom}%` }}
              onDoubleClick={() => updateZoom(zoom === 100 ? 200 : 100)}
              className="h-auto max-w-none rounded-lg border border-border bg-background shadow-2xl transition-[width] duration-150 ease-out"
            />
          </div>
        </div>

        {/* Info Footer */}
        <div className="border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:px-6">
          Use `+`, `-`, or `0` for zoom shortcuts. Hold `Ctrl` or `Cmd` while scrolling to zoom, or double-click the image for a quick close-up.
        </div>
      </DialogContent>
    </Dialog>
  );
}
