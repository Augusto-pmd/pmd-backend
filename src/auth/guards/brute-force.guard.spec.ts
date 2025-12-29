import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BruteForceGuard } from './brute-force.guard';
import { BruteForceService } from '../services/brute-force.service';

describe('BruteForceGuard', () => {
  let guard: BruteForceGuard;
  let bruteForceService: BruteForceService;
  let reflector: Reflector;

  const mockBruteForceService = {
    isBlocked: jest.fn(),
    getRemainingBlockTime: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BruteForceGuard,
        {
          provide: BruteForceService,
          useValue: mockBruteForceService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<BruteForceGuard>(BruteForceGuard);
    bruteForceService = module.get<BruteForceService>(BruteForceService);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (headers: any = {}, ip?: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          ip: ip || '192.168.1.1',
          socket: { remoteAddress: ip || '192.168.1.1' },
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow request if not blocked', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockBruteForceService.isBlocked.mockReturnValue(false);
    
    const context = createMockContext();
    const result = guard.canActivate(context);
    
    expect(result).toBe(true);
  });

  it('should throw HttpException if blocked', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockBruteForceService.isBlocked.mockReturnValue(true);
    mockBruteForceService.getRemainingBlockTime.mockReturnValue(900000); // 15 minutes
    
    const context = createMockContext();
    
    expect(() => guard.canActivate(context)).toThrow(HttpException);
    expect(() => guard.canActivate(context)).toThrow('Too many failed login attempts');
  });

  it('should skip validation if SkipBruteForce decorator is present', () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    
    const context = createMockContext();
    const result = guard.canActivate(context);
    
    expect(result).toBe(true);
    expect(mockBruteForceService.isBlocked).not.toHaveBeenCalled();
  });
});

