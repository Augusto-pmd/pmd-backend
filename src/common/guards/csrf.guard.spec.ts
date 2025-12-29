import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CsrfGuard } from './csrf.guard';
import { CsrfService } from '../services/csrf.service';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  let csrfService: CsrfService;
  let reflector: Reflector;

  const mockCsrfService = {
    validateToken: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsrfGuard,
        {
          provide: CsrfService,
          useValue: mockCsrfService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<CsrfGuard>(CsrfGuard);
    csrfService = module.get<CsrfService>(CsrfService);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (method: string, headers: any = {}, user: any = null): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          headers,
          user,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow GET requests without CSRF token', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext('GET');
    const result = guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockCsrfService.validateToken).not.toHaveBeenCalled();
  });

  it('should skip validation if SkipCsrf decorator is present', () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext('POST');
    const result = guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockCsrfService.validateToken).not.toHaveBeenCalled();
  });

  it('should validate CSRF token for POST requests', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockCsrfService.validateToken.mockReturnValue(true);
    const context = createMockContext('POST', { 'x-csrf-token': 'valid-token' });
    const result = guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockCsrfService.validateToken).toHaveBeenCalledWith('valid-token', 'anonymous');
  });

  it('should throw ForbiddenException if CSRF token is missing', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext('POST', {});
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('CSRF token missing');
  });

  it('should throw ForbiddenException if CSRF token is invalid', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockCsrfService.validateToken.mockReturnValue(false);
    const context = createMockContext('POST', { 'x-csrf-token': 'invalid-token' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Invalid CSRF token');
  });

  it('should use user ID as session identifier if user is authenticated', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockCsrfService.validateToken.mockReturnValue(true);
    const user = { id: 'user-123' };
    const context = createMockContext('POST', { 'x-csrf-token': 'valid-token' }, user);
    const result = guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockCsrfService.validateToken).toHaveBeenCalledWith('valid-token', 'user-123');
  });
});

