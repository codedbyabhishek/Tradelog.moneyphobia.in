import type { Trade } from '@/lib/types';

export type BrokerId = 'manual' | 'dhan' | 'zerodha' | 'upstox' | 'angelone';

export interface BrokerDefinition {
  id: BrokerId;
  label: string;
  shortLabel: string;
  status: 'live' | 'groundwork' | 'coming-soon';
}

export const BROKER_DEFINITIONS: BrokerDefinition[] = [
  { id: 'manual', label: 'Manual Journal', shortLabel: 'Manual', status: 'live' },
  { id: 'dhan', label: 'Dhan', shortLabel: 'Dhan', status: 'live' },
  { id: 'zerodha', label: 'Zerodha', shortLabel: 'Zerodha', status: 'groundwork' },
  { id: 'upstox', label: 'Upstox', shortLabel: 'Upstox', status: 'live' },
  { id: 'angelone', label: 'Angel One', shortLabel: 'Angel One', status: 'coming-soon' },
];

export function getBrokerIdFromTrade(trade: Trade): BrokerId {
  const prefix = trade.id.split(':')[0]?.toLowerCase();

  if (prefix === 'dhan') return 'dhan';
  if (prefix === 'zerodha') return 'zerodha';
  if (prefix === 'upstox') return 'upstox';
  if (prefix === 'angelone') return 'angelone';
  return 'manual';
}

export function getBrokerDefinition(id: BrokerId) {
  return BROKER_DEFINITIONS.find((broker) => broker.id === id) || BROKER_DEFINITIONS[0];
}
