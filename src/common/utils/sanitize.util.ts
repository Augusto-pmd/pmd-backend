/**
 * XSS Sanitization utilities for backend
 */

/**
 * Remove HTML tags from string
 */
export function stripHtmlTags(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }
  
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, (match) => htmlEscapes[match] || match);
}

/**
 * Sanitize string input (remove HTML tags and escape special characters)
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }
  return escapeHtml(stripHtmlTags(input));
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') {
    return null;
  }

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    // If URL parsing fails, return null
    return null;
  }
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Sanitize key
        const sanitizedKey = sanitizeString(key);
        // Sanitize value
        sanitized[sanitizedKey] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Check if string contains potentially dangerous content
 */
export function containsSuspiciousContent(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i,
    /vbscript:/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(input));
}

