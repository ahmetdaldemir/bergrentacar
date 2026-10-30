/**
 * Sanitization Utility for Activity Logs
 * 
 * Removes/masks sensitive data before logging:
 * - Secrets: password, token, apiKey, secret, cvv, cardNumber, iban, etc.
 * - PII: email, phone, identity numbers (partial masking)
 * - Size limits: prevents huge logs from breaking the system
 * - Circular references: safe stringification
 */

const MAX_STRING_LENGTH = 10000; // 10KB per string field
const MAX_OBJECT_DEPTH = 10; // Prevent infinite recursion
const MAX_TOTAL_SIZE = 100000; // 100KB total per log entry

// Secret field patterns (case-insensitive)
const SECRET_PATTERNS = [
  /password/i,
  /passwd/i,
  /pwd/i,
  /token/i,
  /refreshtoken/i,
  /accesstoken/i,
  /authorization/i,
  /auth/i,
  /cookie/i,
  /session/i,
  /apikey/i,
  /api_key/i,
  /secret/i,
  /private/i,
  /cvv/i,
  /cvc/i,
  /cardnumber/i,
  /card_number/i,
  /creditcard/i,
  /credit_card/i,
  /iban/i,
  /accountnumber/i,
  /account_number/i,
  /pin/i,
  /otp/i,
];

// PII field patterns (case-insensitive)
const PII_PATTERNS = [
  /email/i,
  /phone/i,
  /mobile/i,
  /tel/i,
  /identitynumber/i,
  /identity_number/i,
  /idnumber/i,
  /id_number/i,
  /passportnumber/i,
  /passport_number/i,
  /tc/i, // Turkish ID
  /ssn/i, // Social Security Number
];

interface SanitizeOptions {
  maskSecrets?: boolean;
  maskPII?: boolean;
  maxStringLength?: number;
  maxDepth?: number;
  maxTotalSize?: number;
}

const DEFAULT_OPTIONS: SanitizeOptions = {
  maskSecrets: true,
  maskPII: true,
  maxStringLength: MAX_STRING_LENGTH,
  maxDepth: MAX_OBJECT_DEPTH,
  maxTotalSize: MAX_TOTAL_SIZE,
};

/**
 * Mask a string value (partial masking)
 */
function maskString(value: string, type: 'secret' | 'pii'): string {
  if (!value || typeof value !== 'string') {
    return value;
  }

  if (type === 'secret') {
    // Completely mask secrets
    return '***REDACTED***';
  }

  // Partial masking for PII
  if (value.length <= 4) {
    return '*'.repeat(value.length);
  }

  // Email: show first 2 chars and domain
  if (value.includes('@')) {
    const [local, domain] = value.split('@');
    return `${local.substring(0, 2)}***@${domain}`;
  }

  // Phone/ID: show last 4 digits
  if (/^\+?[\d\s()-]+$/.test(value)) {
    return `***${value.slice(-4)}`;
  }

  // Default: show first 2 and last 2 chars
  return `${value.substring(0, 2)}***${value.slice(-2)}`;
}

/**
 * Check if a key matches secret patterns
 */
function isSecretKey(key: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Check if a key matches PII patterns
 */
function isPIIKey(key: string): boolean {
  return PII_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Truncate string to max length
 */
function truncateString(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.substring(0, maxLength)}... [TRUNCATED ${value.length - maxLength} chars]`;
}

/**
 * Calculate approximate size of object in bytes
 */
function calculateSize(obj: any): number {
  try {
    return JSON.stringify(obj).length;
  } catch {
    return 0;
  }
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(
  obj: any,
  options: SanitizeOptions,
  depth: number = 0,
  seen: WeakSet<object> = new WeakSet()
): any {
  // Depth limit
  if (depth > (options.maxDepth || MAX_OBJECT_DEPTH)) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  // Null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Primitives
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return truncateString(obj, options.maxStringLength || MAX_STRING_LENGTH);
    }
    return obj;
  }

  // Circular reference check
  if (seen.has(obj)) {
    return '[CIRCULAR]';
  }
  seen.add(obj);

  // Arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, options, depth + 1, seen));
  }

  // Date
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Error
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: truncateString(obj.message, options.maxStringLength || MAX_STRING_LENGTH),
      stack: options.maskSecrets
        ? '[STACK_TRACE_REDACTED]'
        : truncateString(obj.stack || '', options.maxStringLength || MAX_STRING_LENGTH),
    };
  }

  // Objects
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Check if key is secret
    if (options.maskSecrets && isSecretKey(key)) {
      result[key] = maskString(String(value), 'secret');
      continue;
    }

    // Check if key is PII
    if (options.maskPII && isPIIKey(key)) {
      result[key] = maskString(String(value), 'pii');
      continue;
    }

    // Recursively sanitize value
    result[key] = sanitizeObject(value, options, depth + 1, seen);
  }

  return result;
}

/**
 * Main sanitize function
 */
export function sanitizeForLog(data: any, customOptions?: Partial<SanitizeOptions>): any {
  const options: SanitizeOptions = {
    ...DEFAULT_OPTIONS,
    ...customOptions,
  };

  try {
    const sanitized = sanitizeObject(data, options);

    // Check total size
    const size = calculateSize(sanitized);
    if (size > (options.maxTotalSize || MAX_TOTAL_SIZE)) {
      return {
        _truncated: true,
        _originalSize: size,
        _message: 'Object too large for logging',
        _preview: truncateString(JSON.stringify(sanitized), options.maxTotalSize || MAX_TOTAL_SIZE),
      };
    }

    return sanitized;
  } catch (error) {
    // Fallback: return safe error message
    return {
      _error: 'Failed to sanitize object',
      _message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Sanitize stack trace (truncate to reasonable length)
 */
export function sanitizeStackTrace(stackTrace: string | undefined): string | null {
  if (!stackTrace) {
    return null;
  }

  const MAX_STACK_LENGTH = 10000; // 10KB for stack traces
  return truncateString(stackTrace, MAX_STACK_LENGTH);
}

/**
 * Compute diff between two objects (only changed fields)
 */
export function computeDiff(before: any, after: any): Record<string, any> | null {
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') {
    return null;
  }

  const diff: Record<string, any> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const beforeValue = before[key];
    const afterValue = after[key];

    // Skip if values are the same
    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
      continue;
    }

    diff[key] = {
      before: beforeValue,
      after: afterValue,
    };
  }

  return Object.keys(diff).length > 0 ? diff : null;
}

