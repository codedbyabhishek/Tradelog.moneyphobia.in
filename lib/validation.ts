import { TradeFormData } from './types';

/**
 * Sanitize string input to prevent XSS and injection attacks.
 * Pass `trim = false` during live typing so spaces between words are preserved.
 * The default (`trim = true`) is used for final validation / submission.
 */
export function sanitizeString(input: string, trim = true): string {
  if (typeof input !== 'string') return '';
  let s = input.replace(/[<>\"']/g, '').slice(0, 500); // Max length 500 chars
  if (trim) s = s.trim();
  return s;
}

/**
 * Validate a numeric value
 */
export function validateNumber(value: string | number | undefined): number | null {
  if (value === undefined || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? null : num;
}

/**
 * Validate that a number is positive
 */
export function validatePositiveNumber(value: string | undefined): number | null {
  const num = validateNumber(value);
  return num !== null && num > 0 ? num : null;
}

/**
 * Validate trade symbol (e.g., AAPL, BTC/USD)
 */
export function validateSymbol(symbol: string): boolean {
  if (!symbol) return false;
  const sanitized = sanitizeString(symbol);
  return /^[A-Z0-9\/\-]{1,20}$/.test(sanitized.toUpperCase());
}

/**
 * Validate that a file is a valid image
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
  }

  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'Image must be less than 5MB' };
  }

  return { valid: true };
}

/**
 * Validate GitHub credentials
 */
export function validateGitHubCredentials(
  owner: string,
  repo: string,
  token: string
): { valid: boolean; error?: string } {
  if (!owner || !repo || !token) {
    return { valid: false, error: 'All fields are required' };
  }

  // Validate owner and repo format
  const repoPattern = /^[a-zA-Z0-9_-]+$/;
  if (!repoPattern.test(owner) || !repoPattern.test(repo)) {
    return { valid: false, error: 'Invalid GitHub owner or repository name' };
  }

  // Validate token format (GitHub tokens are alphanumeric with underscores)
  const tokenPattern = /^[a-zA-Z0-9_]+$/;
  if (!tokenPattern.test(token)) {
    return { valid: false, error: 'Invalid GitHub token format' };
  }

  if (token.length < 20) {
    return { valid: false, error: 'GitHub token appears to be too short' };
  }

  return { valid: true };
}

/**
 * Validate trade form data comprehensively
 */
export function validateTradeForm(formData: TradeFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  // Symbol validation
  if (!formData.symbol) {
    errors.symbol = 'Symbol is required';
  } else if (!validateSymbol(formData.symbol)) {
    errors.symbol = 'Invalid symbol format';
  }

  // Setup name validation
  if (!formData.setupName) {
    errors.setupName = 'Setup name is required';
  } else if (sanitizeString(formData.setupName).length === 0) {
    errors.setupName = 'Setup name contains invalid characters';
  }

  // Time frame validation
  if (!formData.timeFrame) {
    errors.timeFrame = 'Time frame is required';
  }

  // Limit (Fibonacci) validation
  const validFibLevels = ['L-0.07', 'L-0.05', 'L-0.01', 'L0', 'L0.283', 'L0.382', 'L0.5', 'L0.702', 'L0.786', 'L1', 'L1.27', 'L1.4', 'L2', 'L2.7', 'L3'];
  if (!formData.limit) {
    errors.limit = 'Limit is required';
  } else if (!validFibLevels.includes(formData.limit)) {
    errors.limit = 'Invalid Fibonacci level';
  }

  // Exit (Fibonacci) validation
  if (!formData.exit) {
    errors.exit = 'Exit level is required';
  } else if (!validFibLevels.includes(formData.exit)) {
    errors.exit = 'Invalid Fibonacci level';
  }

  // Stop loss validation
  if (!formData.stopLoss) {
    errors.stopLoss = 'Stop loss is required';
  } else {
    const sl = validateNumber(formData.stopLoss);
    if (sl === null) {
      errors.stopLoss = 'Stop loss must be a valid number';
    }
  }

  // Quantity validation
  if (!formData.quantity) {
    errors.quantity = 'Quantity is required';
  } else {
    const qty = validatePositiveNumber(formData.quantity);
    if (qty === null) {
      errors.quantity = 'Quantity must be a positive number';
    }
  }

  // P&L validation
  if (!formData.manualProfit) {
    errors.manualProfit = 'P&L is required';
  } else {
    const pnl = validateNumber(formData.manualProfit);
    if (pnl === null) {
      errors.manualProfit = 'P&L must be a valid number';
    }
  }

  // R Factor validation
  if (formData.exitRFactor === undefined || formData.exitRFactor === '') {
    errors.exitRFactor = 'R Factor is required';
  } else {
    const rFactor = validateNumber(formData.exitRFactor);
    if (rFactor === null) {
      errors.exitRFactor = 'R Factor must be a valid number';
    }
  }

  // Charges validation (optional individual fields, auto-summed)
  if (formData.brokerage && validateNumber(formData.brokerage) === null) {
    errors.fees = 'Brokerage must be a valid number';
  }
  if (formData.exchangeCharges && validateNumber(formData.exchangeCharges) === null) {
    errors.fees = 'Exchange charges must be a valid number';
  }
  if (formData.taxes && validateNumber(formData.taxes) === null) {
    errors.fees = 'Taxes must be a valid number';
  }

  // Optional entry price validation
  if (formData.entryPrice && validateNumber(formData.entryPrice) === null) {
    errors.entryPrice = 'Entry price must be a valid number';
  }

  // Optional exit price validation
  if (formData.exitPrice && validateNumber(formData.exitPrice) === null) {
    errors.exitPrice = 'Exit price must be a valid number';
  }

  return errors;
}
