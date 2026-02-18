import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

jest.mock('../common/helpers/prisma-error.handler', () => ({
  handlePrismaError: jest.fn((err: Error) => {
    throw err;
  }),
}));

const mockBcryptCompare = jest.fn();
const mockBcryptHash = jest.fn();
jest.mock('bcryptjs', () => ({
  compare: (...args: unknown[]) => mockBcryptCompare(...args),
  hash: (...args: unknown[]) => mockBcryptHash(...args),
}));

const mockUser = {
  id: 'user-1',
  email: 'jane@example.com',
  password: '$2b$12$hashed',
  name: 'Jane',
  avatarUrl: null,
  role: 'USER' as const,
  emailVerifiedAt: new Date(),
  userType: null,
  incomeSources: [],
  onboardingCompleted: true,
  suspendedAt: null,
  emailVerificationTokenHash: null,
  emailVerificationTokenExpiresAt: null,
  emailVerificationCodeHash: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    setEmailVerificationToken: jest.fn(),
    markEmailVerified: jest.fn(),
    completeOnboarding: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('fake-jwt-token'),
  };

  const mockConfig = {
    get: jest.fn((key: string) => (key === 'PORT' ? '3000' : undefined)),
  };

  const mockMailerService = {
    sendEmailVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      mockUsersService as any,
      mockJwtService as any,
      mockConfig as any,
      mockMailerService as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signIn', () => {
    it('should throw UnauthorizedException when user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      await expect(
        service.signIn({ email: 'nobody@example.com', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.signIn({ email: 'nobody@example.com', password: 'any' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw UnauthorizedException when email not verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        emailVerifiedAt: null,
        password: '$2b$12$same',
      });
      mockBcryptCompare.mockResolvedValue(true);
      await expect(
        service.signIn({ email: 'jane@example.com', password: 'correct' }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.signIn({ email: 'jane@example.com', password: 'correct' }),
      ).rejects.toThrow('Please verify your email');
    });

    it('should throw UnauthorizedException when account is suspended', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        suspendedAt: new Date(),
      });
      mockBcryptCompare.mockResolvedValue(true);
      await expect(
        service.signIn({ email: 'jane@example.com', password: 'correct' }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.signIn({ email: 'jane@example.com', password: 'correct' }),
      ).rejects.toThrow('suspended');
    });

    it('should return user and accessToken when credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValue(true);
      const result = await service.signIn({
        email: 'jane@example.com',
        password: 'correct',
      });
      expect(result).toHaveProperty('user');
      expect(result.user).toMatchObject({
        id: 'user-1',
        email: 'jane@example.com',
        name: 'Jane',
        role: 'USER',
      });
      expect(result).toHaveProperty('accessToken', 'fake-jwt-token');
      expect(mockJwtService.sign).toHaveBeenCalled();
    });
  });

  describe('signUp', () => {
    it('should throw ConflictException when email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      await expect(
        service.signUp({
          email: 'jane@example.com',
          password: 'SecurePass1',
          name: 'Jane',
        }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.signUp({
          email: 'jane@example.com',
          password: 'SecurePass1',
          name: 'Jane',
        }),
      ).rejects.toThrow('already exists');
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should return user and requiresEmailVerification when signup succeeds', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        ...mockUser,
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'New User',
        emailVerifiedAt: null,
        onboardingCompleted: false,
      });
      mockUsersService.setEmailVerificationToken.mockResolvedValue(undefined);
      mockBcryptHash.mockResolvedValue('$2b$12$hashed');

      const result = await service.signUp({
        email: 'new@example.com',
        password: 'SecurePass1',
        name: 'New User',
      });

      expect(result).toHaveProperty('requiresEmailVerification', true);
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('new@example.com');
      expect(mockUsersService.create).toHaveBeenCalled();
      expect(mockMailerService.sendEmailVerificationEmail).toHaveBeenCalled();
    });
  });
});
