import { Controller, Post, Get, HttpCode, HttpStatus, Body, Res, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

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
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(loginDto);
    
    // Set token as cookie with conditional SameSite for production
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('token', result.access_token, {
      httpOnly: false, // Allow frontend to read cookie if needed
      secure: isProduction, // Only in production (HTTPS required)
      sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site in production, 'lax' for dev
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    // Always return JSON, never redirect
    // Ensure organizationId is always present
    const userResponse = {
      id: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
      role: result.user.role,
      organizationId: result.user.organizationId ?? null,
    };
    
    return res.status(200).json({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      user: userResponse,
    });
  }

  @Get('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refresh(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.refresh(req.user);
    
    // Set token as cookie with conditional SameSite for production
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('token', result.access_token, {
      httpOnly: false, // Allow frontend to read cookie if needed
      secure: isProduction, // Only in production (HTTPS required)
      sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site in production, 'lax' for dev
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    // Always return JSON, never redirect
    // Ensure organizationId is always present
    const userResponse = {
      id: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
      role: result.user.role,
      organizationId: result.user.organizationId ?? null,
    };
    
    return res.status(200).json({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      user: userResponse,
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
