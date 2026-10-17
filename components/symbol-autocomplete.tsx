'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import { ChevronRight, LoaderCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getLocalSymbolSuggestions,
  mergeSymbolSuggestions,
  type SymbolSuggestion,
} from '@/lib/trading-symbols';

interface SymbolAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  recentSymbols?: string[];
  name?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  'aria-describedby'?: string;
}

const MAX_VISIBLE_SUGGESTIONS = 12;

export function SymbolAutocomplete({
  value,
  onValueChange,
  recentSymbols = [],
  name = 'symbol',
  id,
  placeholder = 'Search symbols…',
  className,
  'aria-describedby': ariaDescribedBy,
}: SymbolAutocompleteProps) {
  const generatedId = useId();
  const inputId = id || `symbol-${generatedId}`;
  const listboxId = `${inputId}-suggestions`;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dhanSuggestions, setDhanSuggestions] = useState<SymbolSuggestion[]>([]);
  const [isLoadingDhan, setIsLoadingDhan] = useState(false);
  const [hasDhanError, setHasDhanError] = useState(false);

  const localSuggestions = useMemo(
    () => getLocalSymbolSuggestions(value, recentSymbols, MAX_VISIBLE_SUGGESTIONS),
    [recentSymbols, value],
  );
  const suggestions = useMemo(() => {
    if (dhanSuggestions.length === 0) return localSuggestions;

    const recent = localSuggestions.filter((suggestion) => suggestion.source === 'recent');
    const catalogue = localSuggestions.filter((suggestion) => suggestion.source !== 'recent');
    return mergeSymbolSuggestions(recent, dhanSuggestions, catalogue).slice(0, MAX_VISIBLE_SUGGESTIONS);
  }, [dhanSuggestions, localSuggestions]);

  useEffect(() => {
    setActiveIndex(0);
  }, [value, suggestions.length]);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setDhanSuggestions([]);
      setIsLoadingDhan(false);
      setHasDhanError(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoadingDhan(true);
      setHasDhanError(false);

      try {
        const response = await fetch(`/api/instruments?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Instrument request failed');

        const payload = (await response.json()) as { instruments?: SymbolSuggestion[] };
        setDhanSuggestions(Array.isArray(payload.instruments) ? payload.instruments : []);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn('[symbol-autocomplete] Dhan search unavailable', error);
          setDhanSuggestions([]);
          setHasDhanError(true);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingDhan(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [value]);

  const chooseSuggestion = (suggestion: SymbolSuggestion) => {
    onValueChange(suggestion.symbol);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (suggestions.length === 0) return;
      setIsOpen(true);
      setActiveIndex((current) => (isOpen ? Math.min(current + 1, suggestions.length - 1) : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (suggestions.length === 0) return;
      setIsOpen(true);
      setActiveIndex((current) => (isOpen ? Math.max(current - 1, 0) : suggestions.length - 1));
    } else if (event.key === 'Enter' && isOpen && suggestions[activeIndex]) {
      event.preventDefault();
      chooseSuggestion(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const showSuggestions = isOpen && (suggestions.length > 0 || isLoadingDhan || hasDhanError);

  return (
    <div className="relative">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={inputId}
          type="text"
          name={name}
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showSuggestions}
          aria-activedescendant={showSuggestions && suggestions[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
          aria-describedby={ariaDescribedBy}
          className={cn('w-full px-3 py-2', className, '!pl-9')}
        />
      </div>

      {showSuggestions ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
          {suggestions.length > 0 ? (
            <ul id={listboxId} role="listbox" className="max-h-72 overflow-y-auto py-1">
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion.market}-${suggestion.symbol}`} role="presentation">
                  <button
                    id={`${listboxId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseSuggestion(suggestion)}
                    onMouseMove={() => setActiveIndex(index)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
                      index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary/70',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{suggestion.symbol}</span>
                      <span className="block truncate text-xs text-muted-foreground">{suggestion.name}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-right text-[11px] text-muted-foreground">
                      {suggestion.market}
                      <ChevronRight aria-hidden="true" className="size-3" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {isLoadingDhan ? (
            <p className="flex items-center gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
              <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
              Searching the live Indian instrument catalogue…
            </p>
          ) : null}

          {hasDhanError ? (
            <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              Showing saved and common symbols. The live Indian catalogue is temporarily unavailable.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
