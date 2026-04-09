'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface ScreenshotViewerProps {
  imageUrl: string;
  title?: string;
  children?: React.ReactNode;
}

export function ScreenshotViewer({ imageUrl, title = 'Screenshot', children }: ScreenshotViewerProps) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(100);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `screenshot-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  // Render static image during SSR and hydration
  const staticImage = (
    <div className="cursor-pointer hover:opacity-80 transition-opacity rounded-lg border border-border overflow-hidden">
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || staticImage}
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="flex h-[min(92vh,980px)] w-[min(96vw,1500px)] max-w-[min(96vw,1500px)] flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <DialogTitle className="pr-4 text-base sm:text-lg">{title}</DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[3rem] text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 300}
                title="Zoom in"
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
                Reset
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                title="Download image"
              >
                <Download className="w-4 h-4" />
              </Button>
              <DialogClose asChild>
                <Button variant="ghost" size="sm" title="Close viewer">
                  <X className="w-4 h-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {/* Image Container */}
        <div className="flex-1 overflow-auto bg-muted/50 p-3 sm:p-5 lg:p-6">
          <div className="flex min-h-full min-w-full items-center justify-center">
          <Image
            src={imageUrl}
            alt={title}
            width={1600}
            height={1200}
            unoptimized
            style={{ width: `${zoom}%` }}
            className="h-auto max-w-none rounded-lg border border-border bg-background shadow-2xl"
          />
          </div>
        </div>

        {/* Info Footer */}
        <div className="border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:px-6">
          Use the zoom controls or your mouse scroll wheel to inspect details. Download and close actions are available in the header.
        </div>
      </DialogContent>
    </Dialog>
  );
}
