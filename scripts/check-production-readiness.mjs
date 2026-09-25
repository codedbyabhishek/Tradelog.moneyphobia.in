const REQUIRED_VARS = [
  'DB_HOST',
  'DB_USER',
  'DB_NAME',
  'NEXT_PUBLIC_SITE_URL',
  'HEALTHCHECK_TOKEN',
  'BROKER_CREDENTIALS_ENCRYPTION_KEY',
];
const OPTIONAL_GROUPS = {
  SMTP: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'],
  Razorpay: [
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
    'RAZORPAY_PLAN_MONTHLY_ID',
    'RAZORPAY_PLAN_YEARLY_ID',
  ],
  'Google Sign-In': ['GOOGLE_CLIENT_ID', 'NEXT_PUBLIC_GOOGLE_CLIENT_ID'],
};

function isValidAbsoluteUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function filled(name) {
  return Boolean(process.env[name]?.trim());
}

const errors = [];
const warnings = [];

for (const name of REQUIRED_VARS) {
  if (!filled(name)) {
    errors.push(`${name} is missing`);
  }
}

if (filled('NEXT_PUBLIC_SITE_URL') && !isValidAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL.trim())) {
  errors.push('NEXT_PUBLIC_SITE_URL must be an absolute URL');
}

if (
  process.env.NODE_ENV === 'production' &&
  filled('NEXT_PUBLIC_SITE_URL') &&
  !process.env.NEXT_PUBLIC_SITE_URL.trim().startsWith('https://')
) {
  errors.push('NEXT_PUBLIC_SITE_URL must use HTTPS in production');
}

if (filled('HEALTHCHECK_TOKEN') && process.env.HEALTHCHECK_TOKEN.trim().length < 24) {
  errors.push('HEALTHCHECK_TOKEN should be at least 24 characters long');
}

if (
  filled('BROKER_CREDENTIALS_ENCRYPTION_KEY') &&
  Buffer.from(process.env.BROKER_CREDENTIALS_ENCRYPTION_KEY.trim(), 'base64').length !== 32
) {
  errors.push('BROKER_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
}

for (const [label, names] of Object.entries(OPTIONAL_GROUPS)) {
  const present = names.filter(filled);
  if (present.length > 0 && present.length < names.length) {
    warnings.push(`${label} is only partially configured: ${present.join(', ')}`);
  }
}

if (!filled('ADMIN_EMAILS')) {
  warnings.push('ADMIN_EMAILS is not configured');
}

if (errors.length > 0) {
  console.error('Production readiness check failed:\n');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  if (warnings.length > 0) {
    console.error('\nWarnings:');
    for (const warning of warnings) {
      console.error(`- ${warning}`);
    }
  }
  process.exit(1);
}

console.log('Production readiness check passed.');
if (warnings.length > 0) {
  console.log('\nWarnings:');
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}
