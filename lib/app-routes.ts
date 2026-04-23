export type Page =
  | 'dashboard'
  | 'pre-trade'
  | 'playbooks'
  | 'add-trade'
  | 'gallery'
  | 'learning-videos'
  | 'log'
  | 'analytics'
  | 'profit-loss'
  | 'weekly-review'
  | 'data-utilities'
  | 'ideas'
  | 'add-idea'
  | 'advanced-analytics'
  | 'goals'
  | 'search'
  | 'reports'
  | 'emotion-analyzer';

export const APP_PAGES: Page[] = [
  'dashboard',
  'pre-trade',
  'playbooks',
  'add-trade',
  'gallery',
  'learning-videos',
  'log',
  'analytics',
  'profit-loss',
  'weekly-review',
  'data-utilities',
  'ideas',
  'add-idea',
  'advanced-analytics',
  'goals',
  'search',
  'reports',
  'emotion-analyzer',
];

export function isAppPage(value: string): value is Page {
  return APP_PAGES.includes(value as Page);
}

export function buildAppPath(page: Page): string {
  return `/app/${page}`;
}
