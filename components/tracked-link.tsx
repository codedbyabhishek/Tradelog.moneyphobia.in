'use client';

import Link from 'next/link';
import type { ComponentProps, MouseEvent } from 'react';
import { trackEvent } from '@/lib/analytics';

interface TrackedLinkProps extends ComponentProps<typeof Link> {
  eventName?: string;
  eventParams?: Record<string, unknown>;
}

export default function TrackedLink({
  eventName = 'select_content',
  eventParams,
  onClick,
  ...props
}: TrackedLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (eventName) {
      trackEvent(eventName, eventParams);
    }

    onClick?.(event);
  };

  return <Link {...props} onClick={handleClick} />;
}
