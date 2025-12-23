import { Controller, Post, Get, HttpCode, HttpStatus, Body, Res, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtUserPayload } from './interfaces/jwt-user-payload.interface';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const { accessToken, refresh_token, user } = await this.authService.login(dto);

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('token', accessToken, {
      httpOnly: false,
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
      httpOnly: false, // Allow frontend to read cookie if needed
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
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}
