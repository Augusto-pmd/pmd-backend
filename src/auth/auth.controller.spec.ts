import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CsrfService } from '../common/services/csrf.service';
import { BruteForceService } from './services/brute-force.service';
import { Request, Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
  };

  const mockCsrfService = {
    generateToken: jest.fn(),
  };

  const mockBruteForceService = {
    recordSuccessfulAttempt: jest.fn(),
    recordFailedAttempt: jest.fn(),
    isBlocked: jest.fn(),
    getRemainingBlockTime: jest.fn(),
    getAttemptCount: jest.fn(),
    getRemainingAttempts: jest.fn(),
    getConfig: jest.fn(),
  };

  const mockRequest = {
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    headers: { 'user-agent': 'test-agent' },
  } as unknown as Request;

  const mockResponse = {
    cookie: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: CsrfService,
          useValue: mockCsrfService,
        },
        {
          provide: BruteForceService,
          useValue: mockBruteForceService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.login and return result', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResult = {
        accessToken: 'mock-jwt-token',
        refresh_token: 'refresh-token',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          fullName: 'Test User',
          role: { name: 'direction' },
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto, mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResult);
      expect(authService.login).toHaveBeenCalledWith(loginDto, '127.0.0.1', 'test-agent');
    });

    it('should handle login errors', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(controller.login(loginDto, mockRequest, mockResponse)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should call authService.register and return result', async () => {
      const registerDto: RegisterDto = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        role_id: 'role-id',
      };

      const expectedResult = {
        id: 'new-user-id',
        name: 'New User',
        email: 'newuser@example.com',
        role_id: 'role-id',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expectedResult);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should handle registration errors', async () => {
      const registerDto: RegisterDto = {
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'password123',
        role_id: 'role-id',
      };

      mockAuthService.register.mockRejectedValue(new Error('User already exists'));

      await expect(controller.register(registerDto)).rejects.toThrow('User already exists');
    });
  });
});

