'use client';

import React, { useState } from 'react';
import { useTheme, type Theme } from '@/lib/theme-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

/**
 * ThemeToggle - Accessible dropdown for theme selection
 * Displays current theme with icon and allows switching between light, dark, and system
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);

  /**
   * Handle theme selection and close dropdown
   */
  const handleThemeSelect = (selectedTheme: Theme) => {
    setTheme(selectedTheme);
    setOpen(false);
  };

  /**
   * Get icon based on resolved theme
   * @returns Appropriate icon for current theme
   */
  const getThemeIcon = () => {
    if (theme === 'cyberpunk') {
      return (
        <svg
          className="w-4 h-4"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      );
    }
    switch (resolvedTheme) {
      case 'dark':
        return (
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        );
      case 'light':
      default:
        return (
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" />
          </svg>
        );
    }
  };

  /**
   * Get display label based on current theme
   * @returns Human-readable theme name
   */
  const getThemeLabel = () => {
    switch (theme) {
      case 'dark':
        return 'Dark';
      case 'light':
        return 'Light';
      case 'system':
        return 'System';
      case 'cyberpunk':
        return 'Cyberpunk';
      default:
        return 'Theme';
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative w-9 px-0 sm:w-auto sm:px-3 sm:pr-2.5 bg-transparent"
          aria-label="Toggle theme"
          title={`Current theme: ${getThemeLabel()}`}
        >
          {/* Icon visible on all screens */}
          <div className="flex items-center justify-center w-4 h-4">
            {getThemeIcon()}
          </div>

          {/* Label hidden on mobile, visible on small screens and up */}
          <span className="hidden sm:inline ml-2 text-xs font-medium">
            {getThemeLabel()}
          </span>

          {/* Dropdown indicator */}
          <svg
            className="hidden sm:inline ml-1 w-4 h-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </Button>
      </DropdownMenuTrigger>

      {/* Theme selection menu */}
      <DropdownMenuContent align="end" className="w-40">
        {/* Light theme option */}
        <DropdownMenuItem
          onClick={() => handleThemeSelect('light')}
          className="cursor-pointer flex items-center gap-2"
          aria-label="Switch to light theme"
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" />
          </svg>
          <span>Light</span>
          {theme === 'light' && (
            <svg
              className="ml-auto w-4 h-4 text-primary"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M20.285 2l-11.285 11.567-5.556-5.558L0 9.99l8.744 8.744L24 4.41z" />
            </svg>
          )}
        </DropdownMenuItem>

        {/* Dark theme option */}
        <DropdownMenuItem
          onClick={() => handleThemeSelect('dark')}
          className="cursor-pointer flex items-center gap-2"
          aria-label="Switch to dark theme"
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <span>Dark</span>
          {theme === 'dark' && (
            <svg
              className="ml-auto w-4 h-4 text-primary"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M20.285 2l-11.285 11.567-5.556-5.558L0 9.99l8.744 8.744L24 4.41z" />
            </svg>
          )}
        </DropdownMenuItem>

        {/* System preference option */}
        <DropdownMenuItem
          onClick={() => handleThemeSelect('system')}
          className="cursor-pointer flex items-center gap-2"
          aria-label="Switch to system theme preference"
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <path d="M8 21h8m-4 0v-4" />
          </svg>
          <span>System</span>
          {theme === 'system' && (
            <svg
              className="ml-auto w-4 h-4 text-primary"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M20.285 2l-11.285 11.567-5.556-5.558L0 9.99l8.744 8.744L24 4.41z" />
            </svg>
          )}
        </DropdownMenuItem>

        {/* Cyberpunk theme option */}
        <DropdownMenuItem
          onClick={() => handleThemeSelect('cyberpunk')}
          className="cursor-pointer flex items-center gap-2"
          aria-label="Switch to cyberpunk theme"
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span>Cyberpunk</span>
          {theme === 'cyberpunk' && (
            <svg
              className="ml-auto w-4 h-4"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
              style={{ color: '#00FF41' }}
            >
              <path d="M20.285 2l-11.285 11.567-5.556-5.558L0 9.99l8.744 8.744L24 4.41z" />
            </svg>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
