/**
 * Chart utility functions for responsive chart sizing and styling
 */

/**
 * Get responsive chart height based on viewport
 * @param baseHeight - Base height for desktop
 * @returns Height adjusted for mobile/tablet
 */
export function getResponsiveChartHeight(baseHeight: number): number {
  if (typeof window === 'undefined') return baseHeight;
  
  const width = window.innerWidth;
  if (width < 640) return Math.max(200, baseHeight * 0.7); // Mobile
  if (width < 1024) return Math.max(220, baseHeight * 0.85); // Tablet
  return baseHeight; // Desktop
}

/**
 * Get responsive chart margin
 * @returns Margin object adjusted for viewport
 */
export function getResponsiveChartMargin() {
  if (typeof window === 'undefined') {
    return { top: 10, right: 10, left: 0, bottom: 10 };
  }
  
  const width = window.innerWidth;
  if (width < 640) {
    return { top: 8, right: 5, left: -25, bottom: 5 }; // Mobile: compact margins
  }
  if (width < 1024) {
    return { top: 10, right: 8, left: -10, bottom: 8 }; // Tablet
  }
  return { top: 10, right: 10, left: 0, bottom: 10 }; // Desktop
}

/**
 * Get responsive axis font size
 * @returns Font size in pixels
 */
export function getResponsiveAxisFontSize(): number {
  if (typeof window === 'undefined') return 12;
  
  const width = window.innerWidth;
  if (width < 640) return 9;
  if (width < 1024) return 10;
  return 12;
}

/**
 * Get responsive label angle for charts
 * @returns Angle in degrees
 */
export function getResponsiveLabelAngle(): number {
  if (typeof window === 'undefined') return 0;
  
  const width = window.innerWidth;
  if (width < 640) return 45; // Mobile: angle labels to save space
  if (width < 1024) return 0;
  return 0; // Desktop
}

/**
 * Truncate long text for charts
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis
 */
export function truncateChartLabel(text: string, maxLength: number = 15): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
