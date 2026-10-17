const SENSITIVE_SETTINGS_KEYS = new Set([
  'broker_dhan_config',
  'broker_upstox_config',
  'broker_zerodha_config',
  'profile_photo',
]);

/** Server-managed values must never be exposed through generic settings payloads. */
export function isSensitiveSettingsKey(key: string) {
  return SENSITIVE_SETTINGS_KEYS.has(key);
}
