import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { Role } from '../roles/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { createMockUser } from '../common/test/test-helpers';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;

  const mockUserRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    })),
  };

  const mockRoleRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      const createDto: CreateUserDto = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        role_id: 'role-id',
      };

      const mockRole = {
        id: 'role-id',
        name: UserRole.OPERATOR,
      };

      const savedUser = {
        id: 'user-id',
        ...createDto,
        role: mockRole,
        organization: null,
      };
      mockRoleRepository.findOne.mockResolvedValue(mockRole);
      mockUserRepository.create.mockReturnValue({
        ...createDto,
        id: 'user-id',
      });
      mockUserRepository.save.mockResolvedValue(savedUser);
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          ...savedUser,
          role: mockRole,
          organization: null,
        }),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDto.role_id },
      });
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [createMockUser()];
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(users),
        getOne: jest.fn(),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll();

      expect(result).toBeDefined();
      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return user when found', async () => {
      const user = createMockUser();
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(user),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findOne('user-id');

      expect(result).toBeDefined();
      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});

