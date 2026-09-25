const DEFAULT_SITE_URL = 'https://traderlogify.online';

export interface EnvVariableCheck {
  name: string;
  ok: boolean;
  required: boolean;
  message?: string;
}

export interface EnvValidationReport {
  ok: boolean;
  siteUrl: string;
  required: EnvVariableCheck[];
  optional: EnvVariableCheck[];
  warnings: string[];
  errors: string[];
}

function isProductionEnvironment() {
  return process.env.NODE_ENV === 'production';
}

function normalizeUrl(value: string) {
  return value.trim().replace(/\/$/, '');
}

function isValidAbsoluteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidCredentialEncryptionKey(value: string | undefined) {
  if (!value?.trim()) return false;
  return Buffer.from(value.trim(), 'base64').length === 32;
}

function buildCheck(
  name: string,
  required: boolean,
  predicate: (value: string | undefined) => boolean,
  message: string
): EnvVariableCheck {
  const value = process.env[name];
  return {
    name,
    ok: predicate(value),
    required,
    message,
  };
}

function getRawConfiguredSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '';
}

export function getSiteUrl() {
  const configured = getRawConfiguredSiteUrl();
  return normalizeUrl(configured || DEFAULT_SITE_URL);
}

export function getRequiredSiteUrl() {
  const configured = getRawConfiguredSiteUrl();

  if (!configured) {
    if (isProductionEnvironment()) {
      throw new Error('NEXT_PUBLIC_SITE_URL or SITE_URL must be configured in production.');
    }
    return normalizeUrl(DEFAULT_SITE_URL);
  }

  const normalized = normalizeUrl(configured);
  if (!isValidAbsoluteUrl(normalized)) {
    throw new Error('NEXT_PUBLIC_SITE_URL or SITE_URL must be a valid absolute URL.');
  }

  if (isProductionEnvironment() && !normalized.startsWith('https://')) {
    throw new Error('NEXT_PUBLIC_SITE_URL or SITE_URL must use HTTPS in production.');
  }

  return normalized;
}

export function getEnvValidationReport(): EnvValidationReport {
  const siteUrl = getSiteUrl();
  const required: EnvVariableCheck[] = [
    buildCheck('DB_HOST', true, (value) => Boolean(value?.trim()), 'Database host is required.'),
    buildCheck('DB_USER', true, (value) => Boolean(value?.trim()), 'Database user is required.'),
    buildCheck('DB_NAME', true, (value) => Boolean(value?.trim()), 'Database name is required.'),
    buildCheck(
      'NEXT_PUBLIC_SITE_URL',
      true,
      (value) => {
        const normalized = value?.trim();
        if (!normalized) return false;
        return isValidAbsoluteUrl(normalized);
      },
      'Public site URL must be configured as an absolute URL.'
    ),
    buildCheck(
      'HEALTHCHECK_TOKEN',
      true,
      (value) => {
        const normalized = value?.trim();
        if (!normalized) return false;
        return normalized.length >= 24;
      },
      'Health check token should be configured and at least 24 characters long.'
    ),
    buildCheck(
      'BROKER_CREDENTIALS_ENCRYPTION_KEY',
      true,
      isValidCredentialEncryptionKey,
      'Broker credential encryption key must be a base64-encoded 32-byte key.'
    ),
  ];

  const optional: EnvVariableCheck[] = [
    buildCheck(
      'ADMIN_EMAILS',
      false,
      (value) => Boolean(value?.trim()),
      'Admin emails are recommended for `/admin` access control.'
    ),
    buildCheck(
      'GOOGLE_CLIENT_ID',
      false,
      (value) => !value || Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim()),
      'Google sign-in should define both GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_CLIENT_ID.'
    ),
    buildCheck(
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
      false,
      (value) => !value || Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
      'Google sign-in should define both GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_CLIENT_ID.'
    ),
    buildCheck(
      'SMTP_HOST',
      false,
      () => {
        const keys = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
        const filled = keys.filter((key) => Boolean(process.env[key]?.trim()));
        return filled.length === 0 || filled.length === keys.length;
      },
      'SMTP should either be fully configured or omitted entirely.'
    ),
    buildCheck(
      'RAZORPAY_KEY_ID',
      false,
      () => {
        const keys = [
          'RAZORPAY_KEY_ID',
          'RAZORPAY_KEY_SECRET',
          'RAZORPAY_WEBHOOK_SECRET',
          'RAZORPAY_PLAN_MONTHLY_ID',
          'RAZORPAY_PLAN_YEARLY_ID',
        ];
        const filled = keys.filter((key) => Boolean(process.env[key]?.trim()));
        return filled.length === 0 || filled.length === keys.length;
      },
      'Razorpay should either be fully configured or omitted entirely.'
    ),
  ];

  const errors = required.filter((item) => !item.ok).map((item) => item.message || item.name);
  const warnings = optional.filter((item) => !item.ok).map((item) => item.message || item.name);

  if (isProductionEnvironment() && !siteUrl.startsWith('https://')) {
    errors.push('NEXT_PUBLIC_SITE_URL must use HTTPS in production.');
  }

  return {
    ok: errors.length === 0,
    siteUrl,
    required,
    optional,
    warnings,
    errors,
  };
}
