import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditLog } from '../../audit/audit.entity';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let auditLogRepository: Repository<AuditLog>;

  const mockAuditLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockExecutionContext = {
    switchToHttp: jest.fn(() => ({
      getRequest: jest.fn(() => ({
        method: 'POST',
        url: '/users',
        body: { name: 'Test User', email: 'test@example.com' },
        params: {},
        query: {},
        user: { id: 'user-id', organizationId: 'org-id' },
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '10.0.0.1',
        },
      })),
    })),
  } as unknown as ExecutionContext;

  const mockCallHandler: CallHandler = {
    handle: jest.fn(() => of({ id: 'new-id', name: 'Test User', email: 'test@example.com' })),
  } as CallHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditInterceptor,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
      ],
    }).compile();

    interceptor = module.get<AuditInterceptor>(AuditInterceptor);
    auditLogRepository = module.get<Repository<AuditLog>>(getRepositoryToken(AuditLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should create audit log for POST request', async () => {
      const response = { id: 'new-id', name: 'Test User', email: 'test@example.com' };
      mockAuditLogRepository.create.mockReturnValue({});
      mockAuditLogRepository.save.mockResolvedValue({});

      const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await new Promise((resolve) => observable.subscribe(resolve));

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-id',
          action: 'POST /users',
          module: 'users',
          previous_value: null,
          new_value: response,
          ip_address: expect.any(String),
          user_agent: 'Mozilla/5.0',
          criticality: expect.any(String),
        }),
      );
      expect(mockAuditLogRepository.save).toHaveBeenCalled();
    });

    it('should extract IP from x-forwarded-for header', async () => {
      const context = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({
            method: 'POST',
            url: '/users',
            body: {},
            params: {},
            query: {},
            user: { id: 'user-id' },
            ip: '192.168.1.1',
            headers: {
              'x-forwarded-for': '10.0.0.1, 192.168.1.1',
            },
          })),
        })),
      } as unknown as ExecutionContext;

      mockAuditLogRepository.create.mockReturnValue({});
      mockAuditLogRepository.save.mockResolvedValue({});

      const observable = interceptor.intercept(context, mockCallHandler);
      await new Promise((resolve) => observable.subscribe(resolve));

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '10.0.0.1',
        }),
      );
    });

    it('should capture previous_value for PUT request', async () => {
      const context = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({
            method: 'PUT',
            url: '/users/user-id',
            body: { name: 'Updated User', email: 'updated@example.com' },
            params: { id: 'user-id' },
            query: {},
            user: { id: 'user-id' },
            ip: '192.168.1.1',
            headers: { 'user-agent': 'Mozilla/5.0' },
          })),
        })),
      } as unknown as ExecutionContext;

      const handler: CallHandler = {
        handle: jest.fn(() => of({ id: 'user-id', name: 'Updated User', email: 'updated@example.com' })),
      } as CallHandler;

      mockAuditLogRepository.create.mockReturnValue({});
      mockAuditLogRepository.save.mockResolvedValue({});

      const observable = interceptor.intercept(context, handler);
      await new Promise((resolve) => observable.subscribe(resolve));

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          previous_value: expect.objectContaining({
            name: 'Updated User',
            email: 'updated@example.com',
            _audit_note: 'Data sent in request (may not include all fields)',
          }),
          new_value: { id: 'user-id', name: 'Updated User', email: 'updated@example.com' },
        }),
      );
    });

    it('should capture previous_value for DELETE request', async () => {
      const deletedEntity = { id: 'user-id', name: 'Deleted User' };
      const context = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({
            method: 'DELETE',
            url: '/users/user-id',
            body: {},
            params: { id: 'user-id' },
            query: {},
            user: { id: 'user-id' },
            ip: '192.168.1.1',
            headers: { 'user-agent': 'Mozilla/5.0' },
          })),
        })),
      } as unknown as ExecutionContext;

      const handler: CallHandler = {
        handle: jest.fn(() => of(deletedEntity)),
      } as CallHandler;

      mockAuditLogRepository.create.mockReturnValue({});
      mockAuditLogRepository.save.mockResolvedValue({});

      const observable = interceptor.intercept(context, handler);
      await new Promise((resolve) => observable.subscribe(resolve));

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          previous_value: deletedEntity,
          new_value: expect.objectContaining({
            status: 'deleted',
            timestamp: expect.any(String),
          }),
          criticality: 'high',
        }),
      );
    });

    it('should sanitize sensitive data from audit log', async () => {
      const context = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({
            method: 'POST',
            url: '/users',
            body: {
              name: 'Test User',
              email: 'test@example.com',
              password: 'secret123',
              token: 'abc123',
            },
            params: {},
            query: {},
            user: { id: 'user-id' },
            ip: '192.168.1.1',
            headers: { 'user-agent': 'Mozilla/5.0' },
          })),
        })),
      } as unknown as ExecutionContext;

      const response = {
        id: 'new-id',
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed_password',
      };

      const handler: CallHandler = {
        handle: jest.fn(() => of(response)),
      } as CallHandler;

      mockAuditLogRepository.create.mockReturnValue({});
      mockAuditLogRepository.save.mockResolvedValue({});

      const observable = interceptor.intercept(context, handler);
      await new Promise((resolve) => observable.subscribe(resolve));

      const createCall = mockAuditLogRepository.create.mock.calls[0][0];
      expect(createCall.new_value).not.toHaveProperty('password');
      expect(createCall.new_value).not.toHaveProperty('token');
    });

    it('should skip logging for GET requests with low criticality', async () => {
      const context = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({
            method: 'GET',
            url: '/users',
            body: {},
            params: {},
            query: {},
            user: { id: 'user-id' },
            ip: '192.168.1.1',
            headers: { 'user-agent': 'Mozilla/5.0' },
          })),
        })),
      } as unknown as ExecutionContext;

      const observable = interceptor.intercept(context, mockCallHandler);
      await new Promise((resolve) => observable.subscribe(resolve));

      expect(mockAuditLogRepository.create).not.toHaveBeenCalled();
      expect(mockAuditLogRepository.save).not.toHaveBeenCalled();
    });

    it('should handle missing user gracefully', async () => {
      const context = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({
            method: 'POST',
            url: '/users',
            body: {},
            params: {},
            query: {},
            user: null,
            ip: '192.168.1.1',
            headers: { 'user-agent': 'Mozilla/5.0' },
          })),
        })),
      } as unknown as ExecutionContext;

      mockAuditLogRepository.create.mockReturnValue({});
      mockAuditLogRepository.save.mockResolvedValue({});

      const observable = interceptor.intercept(context, mockCallHandler);
      await new Promise((resolve) => observable.subscribe(resolve));

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
        }),
      );
    });
  });
});

