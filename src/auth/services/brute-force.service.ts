import { Injectable, Logger } from '@nestjs/common';

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil: number | null;
}

@Injectable()
export class BruteForceService {
  private readonly logger = new Logger(BruteForceService.name);
  private readonly attempts: Map<string, AttemptRecord> = new Map();

  // Configuration
  // Keep defaults aligned with unit tests and reasonable security baseline
  private readonly maxAttempts = 5; // Maximum failed attempts before blocking
  private readonly blockDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
  private readonly windowDuration = 60 * 60 * 1000; // 1 hour window for counting attempts

  /**
   * Record a failed login attempt
   * @param identifier - IP address or user identifier
   */
  recordFailedAttempt(identifier: string): void {
    const now = Date.now();
    const record = this.attempts.get(identifier) || {
      count: 0,
      firstAttempt: now,
      lastAttempt: now,
      blockedUntil: null,
    };

    // Reset count if window has expired
    if (now - record.firstAttempt > this.windowDuration) {
      record.count = 0;
      record.firstAttempt = now;
    }

    record.count++;
    record.lastAttempt = now;

    // Block if max attempts reached
    if (record.count >= this.maxAttempts) {
      record.blockedUntil = now + this.blockDuration;
      this.logger.warn(
        `IP ${identifier} blocked due to ${record.count} failed login attempts. Blocked until ${new Date(record.blockedUntil).toISOString()}`,
      );
    }

    this.attempts.set(identifier, record);
  }

  /**
   * Record a successful login attempt (reset counter)
   * @param identifier - IP address or user identifier
   */
  recordSuccessfulAttempt(identifier: string): void {
    this.attempts.delete(identifier);
    this.logger.debug(`IP ${identifier} login successful, resetting attempt counter`);
  }

  /**
   * Check if identifier is blocked
   * @param identifier - IP address or user identifier
   * @returns true if blocked, false otherwise
   */
  isBlocked(identifier: string): boolean {
    const record = this.attempts.get(identifier);
    if (!record || !record.blockedUntil) {
      return false;
    }

    const now = Date.now();

    // Check if block has expired
    if (now >= record.blockedUntil) {
      this.attempts.delete(identifier);
      this.logger.debug(`IP ${identifier} block expired, unblocking`);
      return false;
    }

    return true;
  }

  /**
   * Get remaining block time in milliseconds
   * @param identifier - IP address or user identifier
   * @returns remaining time in milliseconds, or 0 if not blocked
   */
  getRemainingBlockTime(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record || !record.blockedUntil) {
      return 0;
    }

    const now = Date.now();
    const remaining = record.blockedUntil - now;

    return remaining > 0 ? remaining : 0;
  }

  /**
   * Get attempt count for identifier
   * @param identifier - IP address or user identifier
   * @returns number of failed attempts
   */
  getAttemptCount(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record) {
      return 0;
    }

    // Reset count if window has expired
    const now = Date.now();
    if (now - record.firstAttempt > this.windowDuration) {
      this.attempts.delete(identifier);
      return 0;
    }

    return record.count;
  }

  /**
   * Get remaining attempts before blocking
   * @param identifier - IP address or user identifier
   * @returns remaining attempts
   */
  getRemainingAttempts(identifier: string): number {
    const count = this.getAttemptCount(identifier);
    return Math.max(0, this.maxAttempts - count);
  }

  /**
   * Clean up old records (called periodically)
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [identifier, record] of this.attempts.entries()) {
      // Remove if block expired and window expired
      const blockExpired = record.blockedUntil && now >= record.blockedUntil;
      const windowExpired = now - record.firstAttempt > this.windowDuration;

      if (blockExpired && windowExpired) {
        this.attempts.delete(identifier);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired brute force records`);
    }
  }

  /**
   * Get configuration
   */
  getConfig() {
    return {
      maxAttempts: this.maxAttempts,
      blockDuration: this.blockDuration,
      windowDuration: this.windowDuration,
    };
  }

  /**
   * Reset block for a specific identifier (admin function)
   * @param identifier - IP address or user identifier
   */
  resetBlock(identifier: string): boolean {
    const record = this.attempts.get(identifier);
    if (!record) {
      return false;
    }

    this.attempts.delete(identifier);
    this.logger.warn(`IP ${identifier} block manually reset by admin`);
    return true;
  }

  /**
   * Reset all blocks (admin function)
   * @returns number of blocks reset
   */
  resetAllBlocks(): number {
    const count = this.attempts.size;
    this.attempts.clear();
    this.logger.warn(`All brute force blocks manually reset by admin (${count} blocks cleared)`);
    return count;
  }

  /**
   * Get all blocked identifiers
   * @returns array of blocked identifiers with their block info
   */
  getAllBlocked(): Array<{ identifier: string; blockedUntil: number; remainingTime: number }> {
    const now = Date.now();
    const blocked: Array<{ identifier: string; blockedUntil: number; remainingTime: number }> = [];

    for (const [identifier, record] of this.attempts.entries()) {
      if (record.blockedUntil && now < record.blockedUntil) {
        blocked.push({
          identifier,
          blockedUntil: record.blockedUntil,
          remainingTime: record.blockedUntil - now,
        });
      }
    }

    return blocked;
  }
}

