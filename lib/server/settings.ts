const SENSITIVE_SETTINGS_KEYS = new Set([
  'broker_dhan_config',
  'broker_upstox_config',
  'broker_zerodha_config',
]);

/** Broker credentials are server-only and must never be returned in generic settings payloads. */
export function isSensitiveSettingsKey(key: string) {
  return SENSITIVE_SETTINGS_KEYS.has(key);
}
