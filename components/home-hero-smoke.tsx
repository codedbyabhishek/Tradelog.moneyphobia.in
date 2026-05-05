'use client';

import { useEffect, useRef } from 'react';

type SmokePoint = {
  x: number;
  y: number;
  age: number;
  driftX: number;
  driftY: number;
  radius: number;
};

const MAX_POINTS = 22;
const MAX_DEVICE_PIXEL_RATIO = 1.5;
const POINT_LIFETIME = 1.15;

export default function HomeHeroSmoke() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;

    if (!canvas || !overlay) {
      return;
    }

    const context = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
    });

    if (!context) {
      return;
    }

    const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointerMedia = window.matchMedia('(hover: hover) and (pointer: fine)');
    const parent = overlay.parentElement;

    if (!parent) {
      return;
    }

    let points: SmokePoint[] = [];
    let lastPointer = { x: 0, y: 0 };
    let rafId = 0;
    let lastFrame = 0;
    let isVisible = true;
    let isInside = false;
    let isActive = false;
    let cssWidth = 0;
    let cssHeight = 0;
    let devicePixelRatio = 1;

    const resizeCanvas = () => {
      const rect = parent.getBoundingClientRect();
      cssWidth = rect.width;
      cssHeight = rect.height;
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);

      canvas.width = Math.max(1, Math.floor(cssWidth * devicePixelRatio));
      canvas.height = Math.max(1, Math.floor(cssHeight * devicePixelRatio));
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };

    const pushPoint = (x: number, y: number, intensity: number) => {
      points.push({
        x,
        y,
        age: 0,
        driftX: (Math.random() - 0.5) * 16 * intensity,
        driftY: -18 - Math.random() * 16 * intensity,
        radius: 10 + Math.random() * 18 * intensity,
      });

      if (points.length > MAX_POINTS) {
        points = points.slice(points.length - MAX_POINTS);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerMedia.matches || motionMedia.matches || !isInside) {
        return;
      }

      const rect = parent.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
        return;
      }

      const dx = x - lastPointer.x;
      const dy = y - lastPointer.y;
      const distance = Math.hypot(dx, dy);
      const steps = Math.min(6, Math.max(1, Math.ceil(distance / 28)));
      const intensity = Math.min(1.4, 0.85 + distance / 180);

      for (let index = 1; index <= steps; index += 1) {
        const progress = index / steps;
        pushPoint(lastPointer.x + dx * progress, lastPointer.y + dy * progress, intensity);
      }

      lastPointer = { x, y };
      isActive = true;
    };

    const handlePointerEnter = (event: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      lastPointer = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      isInside = true;
    };

    const handlePointerLeave = () => {
      isInside = false;
    };

    const drawSmoke = () => {
      context.clearRect(0, 0, cssWidth, cssHeight);

      if (points.length < 2) {
        return;
      }

      const activePoints = points.filter((point) => point.age < POINT_LIFETIME);

      if (activePoints.length < 2) {
        return;
      }

      const makeStroke = (lineWidth: number, blur: number, alphaScale: number, strokeStyle: string) => {
        context.save();
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = lineWidth;
        context.strokeStyle = strokeStyle;
        context.shadowBlur = blur;
        context.shadowColor = strokeStyle;
        context.globalAlpha = alphaScale;
        context.beginPath();
        context.moveTo(activePoints[0].x, activePoints[0].y);

        for (let index = 1; index < activePoints.length - 1; index += 1) {
          const current = activePoints[index];
          const next = activePoints[index + 1];
          const midX = (current.x + next.x) / 2;
          const midY = (current.y + next.y) / 2;
          context.quadraticCurveTo(current.x, current.y, midX, midY);
        }

        const lastPoint = activePoints[activePoints.length - 1];
        context.lineTo(lastPoint.x, lastPoint.y);
        context.stroke();
        context.restore();
      };

      makeStroke(38, 48, 0.055, 'rgba(56, 189, 248, 0.95)');
      makeStroke(22, 32, 0.075, 'rgba(168, 85, 247, 0.92)');
      makeStroke(10, 16, 0.12, 'rgba(255, 255, 255, 0.9)');

      for (const point of activePoints) {
        const ageProgress = 1 - point.age / POINT_LIFETIME;
        const gradient = context.createRadialGradient(
          point.x,
          point.y,
          0,
          point.x,
          point.y,
          point.radius,
        );

        gradient.addColorStop(0, `rgba(255,255,255,${0.08 * ageProgress})`);
        gradient.addColorStop(0.5, `rgba(125,211,252,${0.06 * ageProgress})`);
        gradient.addColorStop(1, 'rgba(125,211,252,0)');

        context.fillStyle = gradient;
        context.beginPath();
        context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        context.fill();
      }
    };

    const animate = (timestamp: number) => {
      const deltaSeconds = lastFrame ? Math.min(0.032, (timestamp - lastFrame) / 1000) : 0.016;
      lastFrame = timestamp;

      if (isVisible && points.length > 0) {
        points = points
          .map((point) => ({
            ...point,
            x: point.x + point.driftX * deltaSeconds,
            y: point.y + point.driftY * deltaSeconds,
            age: point.age + deltaSeconds,
            radius: point.radius + deltaSeconds * 8,
          }))
          .filter((point) => point.age < POINT_LIFETIME);

        drawSmoke();
      } else if (!isActive) {
        context.clearRect(0, 0, cssWidth, cssHeight);
      }

      isActive = points.length > 0;
      rafId = window.requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );

    resizeCanvas();
    resizeObserver.observe(parent);
    intersectionObserver.observe(parent);

    parent.addEventListener('pointerenter', handlePointerEnter);
    parent.addEventListener('pointermove', handlePointerMove);
    parent.addEventListener('pointerleave', handlePointerLeave);

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      parent.removeEventListener('pointerenter', handlePointerEnter);
      parent.removeEventListener('pointermove', handlePointerMove);
      parent.removeEventListener('pointerleave', handlePointerLeave);
      context.clearRect(0, 0, cssWidth, cssHeight);
    };
  }, []);

  return (
      <div
      ref={overlayRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full opacity-90 [mask-image:radial-gradient(circle_at_center,black,transparent_92%)]"
      />
    </div>
  );
}
