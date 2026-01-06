import { Controller, Post, Get, HttpCode, HttpStatus, Body, Res, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtUserPayload } from './interfaces/jwt-user-payload.interface';
import { CsrfService } from '../common/services/csrf.service';
import { SkipCsrf } from '../common/guards/csrf.guard';
import { BruteForceGuard } from './guards/brute-force.guard';
import { BruteForceService } from './services/brute-force.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly csrfService: CsrfService,
    private readonly bruteForceService: BruteForceService,
  ) {}

  @Get('csrf-token')
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get CSRF token' })
  @ApiResponse({ status: 200, description: 'CSRF token generated successfully' })
  async getCsrfToken(@Req() req: Request) {
    // Generate token with optional session identifier
    const token = this.csrfService.generateToken();
    return { csrfToken: token };
  }

  @Post('login')
  @SkipCsrf()
  @UseGuards(BruteForceGuard)
  // Aumentar límite en desarrollo/test para permitir más tests E2E
  // Producción: 5 requests/minuto, Desarrollo/Test: 50 requests/minuto
  @Throttle({ 
    default: { 
      limit: process.env.NODE_ENV === 'production' ? 5 : 50, 
      ttl: 60000 
    } 
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res() res: Response) {
    // Extract IP address and user agent
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      const { accessToken, refresh_token, user } = await this.authService.login(dto, ipAddress, userAgent);
      
      // Record successful login (reset brute force counter)
      this.bruteForceService.recordSuccessfulAttempt(ipAddress);

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 604800000
    });

      return res.status(200).json({
        accessToken,
        refresh_token,
        user,
      });
    } catch (error) {
      // Record failed login attempt
      this.bruteForceService.recordFailedAttempt(ipAddress);
      throw error;
    }
  }

  @Get('brute-force-status')
  @SkipCsrf()
  @ApiOperation({ summary: 'Get brute force protection status' })
  @ApiResponse({ status: 200, description: 'Brute force status' })
  async getBruteForceStatus(@Req() req: Request) {
    const ipAddress = this.extractIpAddress(req);
    const isBlocked = this.bruteForceService.isBlocked(ipAddress);
    const remainingTime = this.bruteForceService.getRemainingBlockTime(ipAddress);
    const attemptCount = this.bruteForceService.getAttemptCount(ipAddress);
    const remainingAttempts = this.bruteForceService.getRemainingAttempts(ipAddress);
    const config = this.bruteForceService.getConfig();

    return {
      isBlocked,
      remainingTime,
      remainingMinutes: Math.ceil(remainingTime / 60000),
      attemptCount,
      remainingAttempts,
      maxAttempts: config.maxAttempts,
      blockDuration: config.blockDuration,
      retryAfter: isBlocked ? new Date(Date.now() + remainingTime).toISOString() : null,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async loadMe(@Req() req: Request) {
    if (!req.user) {
      throw new Error('User not found in request');
    }
    const user = await this.authService.loadMe(req.user as JwtUserPayload);
    return { user };
  }

  @Get('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refresh(@Req() req: Request, @Res() res: Response) {
    if (!req.user) {
      throw new Error('User not found in request');
    }
    const result = await this.authService.refresh(req.user as JwtUserPayload);
    
    // Set token as cookie with conditional SameSite for production
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('token', result.access_token, {
      httpOnly: true,
      secure: isProduction, // Only in production (HTTPS required)
      sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site in production, 'lax' for dev
      path: '/',
      maxAge: 604800000, // 7 days
    });
    
    // Always return JSON, never redirect
    return res.status(200).json({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      user: result.user,
    });
  }

  @Post('register')
  @SkipCsrf()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Req() req: Request) {
    const user = req.user as JwtUserPayload;
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    await this.authService.logout(user.id, ipAddress, userAgent);
    return { message: 'Logout successful' };
  }

  /**
   * Extract IP address from request, handling proxy headers
   */
  private extractIpAddress(req: Request): string {
    // Check x-forwarded-for header (first IP in chain)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor).split(',').map((ip: string) => ip.trim());
      return ips[0] || 'unknown';
    }

    // Check x-real-ip header
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Use direct IP from request
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}
