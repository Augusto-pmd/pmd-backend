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
 * @param obj - Object to sanitize
 * @param visited - Set of visited objects to prevent circular references (internal use)
 */
export function sanitizeObject(obj: any, visited: WeakSet<object> = new WeakSet()): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    return obj;
  }

  // Prevent circular references
  if (visited.has(obj)) {
    return '[Circular Reference]';
  }

  if (Array.isArray(obj)) {
    visited.add(obj);
    const result = obj.map((item) => sanitizeObject(item, visited));
    visited.delete(obj);
    return result;
  }

  // Handle Date, RegExp, Error, etc. - return as is
  if (obj instanceof Date || obj instanceof RegExp || obj instanceof Error) {
    return obj;
  }

  // Handle objects
  visited.add(obj);
  const sanitized: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Sanitize key
      const sanitizedKey = sanitizeString(key);
      // Sanitize value
      try {
        sanitized[sanitizedKey] = sanitizeObject(obj[key], visited);
      } catch (error) {
        // If sanitization fails (e.g., too deep recursion), skip this property
        sanitized[sanitizedKey] = '[Sanitization Error]';
      }
    }
  }
  visited.delete(obj);
  return sanitized;
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

