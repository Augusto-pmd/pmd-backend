import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthBootstrapController {
  constructor(private readonly authService: AuthService) {}

  @Post('bootstrap')
  @HttpCode(HttpStatus.OK)
  async bootstrap() {
    await this.authService.ensureAdminUser();
    return { message: "Auth bootstrap complete" };
  }
}
