import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Card - Base card container with proper overflow handling
 */
function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        // Softer, modern card styling with a subtle trending purple accent
        'bg-card text-card-foreground flex flex-col gap-6 rounded-2xl border border-border/60 py-6 shadow-md',
        'transition-colors transition-shadow duration-200 ease-out',
        // Purple-tinted hover/focus ring and shadow
        'hover:border-violet-400/70 hover:shadow-[0_18px_45px_rgba(139,92,246,0.35)]',
        'focus-within:border-violet-500 focus-within:shadow-[0_18px_45px_rgba(139,92,246,0.45)]',
        className,
      )}
      {...props}
    />
  )
}

/**
 * CardHeader - Header section with responsive padding and proper overflow
 */
function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-3 sm:px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 overflow-hidden',
        className,
      )}
      {...props}
    />
  )
}

/**
 * CardTitle - Title text with proper sizing and line wrapping
 */
function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-tight font-semibold text-base sm:text-lg break-words', className)}
      {...props}
    />
  )
}

/**
 * CardDescription - Descriptive text with muted styling
 */
function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-xs sm:text-sm break-words', className)}
      {...props}
    />
  )
}

/**
 * CardAction - Action content (icons, buttons) with flex layout
 */
function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end flex-shrink-0',
        className,
      )}
      {...props}
    />
  )
}

/**
 * CardContent - Main content area with responsive padding and overflow handling
 */
function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-3 sm:px-6 overflow-hidden', className)}
      {...props}
    />
  )
}

/**
 * CardFooter - Footer section with flex layout and responsive padding
 */
function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-3 sm:px-6 gap-2 flex-wrap [.border-t]:pt-6 overflow-hidden', className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
