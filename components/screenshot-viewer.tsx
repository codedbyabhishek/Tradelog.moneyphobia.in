'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `screenshot-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 200));
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
      <img
        src={imageUrl}
        alt={title}
        className="max-h-64 w-full object-contain rounded-lg border border-border"
      />
    </div>
  );

  // During hydration, render the interactive version only after mounted
  if (!mounted) {
    return staticImage;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || staticImage}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between w-full">
            <DialogTitle>{title}</DialogTitle>
            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
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
                disabled={zoom >= 200}
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
            </div>
          </div>
        </DialogHeader>

        {/* Image Container */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/50 p-4">
          <img
            src={imageUrl}
            alt={title}
            style={{ width: `${zoom}%` }}
            className="max-w-full max-h-full object-contain rounded-lg border border-border"
          />
        </div>

        {/* Info Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/30 text-xs text-muted-foreground">
          Click on the image or use your mouse scroll wheel to zoom. Download button available in the header.
        </div>
      </DialogContent>
    </Dialog>
  );
}
