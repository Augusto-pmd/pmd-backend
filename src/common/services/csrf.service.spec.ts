import { Test, TestingModule } from '@nestjs/testing';
import { CsrfService } from './csrf.service';

describe('CsrfService', () => {
  let service: CsrfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CsrfService],
    }).compile();

    service = module.get<CsrfService>(CsrfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateToken', () => {
    it('should generate a valid token', () => {
      const token = service.generateToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('-').length).toBe(3);
    });

    it('should generate different tokens for different calls', () => {
      const token1 = service.generateToken();
      const token2 = service.generateToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate token with session ID', () => {
      const sessionId = 'test-session-123';
      const token = service.generateToken(sessionId);
      expect(token).toBeDefined();
    });
  });

  describe('validateToken', () => {
    it('should validate a correctly generated token', () => {
      const token = service.generateToken();
      const isValid = service.validateToken(token);
      expect(isValid).toBe(true);
    });

    it('should validate a token with session ID', () => {
      const sessionId = 'test-session-123';
      const token = service.generateToken(sessionId);
      const isValid = service.validateToken(token, sessionId);
      expect(isValid).toBe(true);
    });

    it('should reject an invalid token', () => {
      const invalidToken = 'invalid-token-format';
      const isValid = service.validateToken(invalidToken);
      expect(isValid).toBe(false);
    });

    it('should reject a token with wrong session ID', () => {
      const sessionId = 'test-session-123';
      const token = service.generateToken(sessionId);
      const isValid = service.validateToken(token, 'different-session');
      expect(isValid).toBe(false);
    });

    it('should reject an expired token', () => {
      // Create a service instance and manually create an old token
      // This is a simplified test - in real scenario, we'd need to mock Date
      const token = service.generateToken();
      // Manually modify token to have old timestamp
      const parts = token.split('-');
      const oldTimestamp = (Date.now() - 7200000).toString(); // 2 hours ago
      const oldToken = `${parts[0]}-${oldTimestamp}-${parts[2]}`;
      
      // Validate with maxAge of 1 hour
      const isValid = service.validateToken(oldToken, undefined, 3600000);
      expect(isValid).toBe(false);
    });
  });
});

