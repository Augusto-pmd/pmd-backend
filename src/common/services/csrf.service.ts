import { Injectable } from '@nestjs/common';
import { randomBytes, createHmac } from 'crypto';

@Injectable()
export class CsrfService {
  private readonly secretKey: string;

  constructor() {
    // Use environment variable or generate a random secret
    this.secretKey = process.env.CSRF_SECRET || this.generateSecret();
  }

  /**
   * Generate a random secret key for CSRF token generation
   */
  private generateSecret(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate a CSRF token
   * @param sessionId - Optional session identifier (can use user ID or session token)
   * @returns CSRF token
   */
  generateToken(sessionId?: string): string {
    const salt = randomBytes(16).toString('hex');
    const timestamp = Date.now().toString();
    const data = `${sessionId || 'anonymous'}-${timestamp}-${salt}`;
    
    // Create HMAC signature
    const hmac = createHmac('sha256', this.secretKey);
    hmac.update(data);
    const signature = hmac.digest('hex');
    
    // Return token in format: salt-timestamp-signature
    return `${salt}-${timestamp}-${signature}`;
  }

  /**
   * Validate a CSRF token
   * @param token - CSRF token to validate
   * @param sessionId - Optional session identifier (should match the one used to generate)
   * @param maxAge - Maximum age of token in milliseconds (default: 1 hour)
   * @returns true if token is valid, false otherwise
   */
  validateToken(token: string, sessionId?: string, maxAge: number = 3600000): boolean {
    try {
      const parts = token.split('-');
      if (parts.length !== 3) {
        return false;
      }

      const [salt, timestamp, signature] = parts;
      
      // Check if token is too old
      const tokenAge = Date.now() - parseInt(timestamp, 10);
      if (tokenAge > maxAge) {
        return false;
      }

      // Recreate the data and verify signature
      const data = `${sessionId || 'anonymous'}-${timestamp}-${salt}`;
      const hmac = createHmac('sha256', this.secretKey);
      hmac.update(data);
      const expectedSignature = hmac.digest('hex');

      // Use constant-time comparison to prevent timing attacks
      return this.constantTimeCompare(signature, expectedSignature);
    } catch (error) {
      return false;
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

