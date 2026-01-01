import { 
  stripHtmlTags, 
  escapeHtml, 
  sanitizeString, 
  sanitizeUrl, 
  sanitizeObject,
  containsSuspiciousContent 
} from './sanitize.util';

describe('SanitizeUtil', () => {
  describe('stripHtmlTags', () => {
    it('should remove HTML tags', () => {
      expect(stripHtmlTags('<p>Hello</p>')).toBe('Hello');
      expect(stripHtmlTags('<script>alert("xss")</script>')).toBe('alert("xss")');
    });

    it('should handle non-string input', () => {
      expect(stripHtmlTags(null as any)).toBe(null);
      expect(stripHtmlTags(123 as any)).toBe(123);
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
      expect(escapeHtml("'test'")).toBe('&#x27;test&#x27;');
    });
  });

  describe('sanitizeString', () => {
    it('should strip tags and escape HTML', () => {
      const result = sanitizeString('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      // After stripHtmlTags, the tags are removed, so we check the content is escaped
      expect(result).toContain('alert');
      expect(result).toContain('&quot;xss&quot;');
    });
  });

  describe('sanitizeUrl', () => {
    it('should validate and return valid URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
    });

    it('should reject invalid protocols', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeUrl('data:text/html,<script>')).toBeNull();
    });

    it('should return null for invalid URLs', () => {
      expect(sanitizeUrl('not-a-url')).toBeNull();
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize nested objects', () => {
      const input = {
        name: '<script>alert(1)</script>',
        email: 'test@example.com',
        nested: {
          value: '<p>Hello</p>',
        },
      };

      const result = sanitizeObject(input);
      expect(result.name).not.toContain('<script>');
      expect(result.nested.value).not.toContain('<p>');
    });

    it('should sanitize arrays', () => {
      const input = ['<script>alert(1)</script>', 'normal text'];
      const result = sanitizeObject(input);
      expect(result[0]).not.toContain('<script>');
    });
  });

  describe('containsSuspiciousContent', () => {
    it('should detect script tags', () => {
      expect(containsSuspiciousContent('<script>alert(1)</script>')).toBe(true);
    });

    it('should detect javascript: protocol', () => {
      expect(containsSuspiciousContent('javascript:alert(1)')).toBe(true);
    });

    it('should detect event handlers', () => {
      expect(containsSuspiciousContent('onclick="alert(1)"')).toBe(true);
    });

    it('should return false for safe content', () => {
      expect(containsSuspiciousContent('Hello world')).toBe(false);
      expect(containsSuspiciousContent('test@example.com')).toBe(false);
    });
  });
});

