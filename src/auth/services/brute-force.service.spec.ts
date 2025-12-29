import { Test, TestingModule } from '@nestjs/testing';
import { BruteForceService } from './brute-force.service';

describe('BruteForceService', () => {
  let service: BruteForceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BruteForceService],
    }).compile();

    service = module.get<BruteForceService>(BruteForceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordFailedAttempt', () => {
    it('should record a failed attempt', () => {
      const identifier = '192.168.1.1';
      service.recordFailedAttempt(identifier);
      expect(service.getAttemptCount(identifier)).toBe(1);
    });

    it('should block after max attempts', () => {
      const identifier = '192.168.1.1';
      const maxAttempts = 5;

      for (let i = 0; i < maxAttempts; i++) {
        service.recordFailedAttempt(identifier);
      }

      expect(service.isBlocked(identifier)).toBe(true);
      expect(service.getAttemptCount(identifier)).toBe(maxAttempts);
    });
  });

  describe('recordSuccessfulAttempt', () => {
    it('should reset attempt counter on successful login', () => {
      const identifier = '192.168.1.1';
      
      service.recordFailedAttempt(identifier);
      service.recordFailedAttempt(identifier);
      expect(service.getAttemptCount(identifier)).toBe(2);

      service.recordSuccessfulAttempt(identifier);
      expect(service.getAttemptCount(identifier)).toBe(0);
      expect(service.isBlocked(identifier)).toBe(false);
    });
  });

  describe('isBlocked', () => {
    it('should return false if not blocked', () => {
      const identifier = '192.168.1.1';
      expect(service.isBlocked(identifier)).toBe(false);
    });

    it('should return true if blocked', () => {
      const identifier = '192.168.1.1';
      
      for (let i = 0; i < 5; i++) {
        service.recordFailedAttempt(identifier);
      }

      expect(service.isBlocked(identifier)).toBe(true);
    });
  });

  describe('getRemainingAttempts', () => {
    it('should return correct remaining attempts', () => {
      const identifier = '192.168.1.1';
      
      service.recordFailedAttempt(identifier);
      service.recordFailedAttempt(identifier);
      
      expect(service.getRemainingAttempts(identifier)).toBe(3); // 5 - 2 = 3
    });
  });
});

