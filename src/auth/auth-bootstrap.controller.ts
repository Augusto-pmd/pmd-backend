import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth/bootstrap')
export class AuthBootstrapController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async bootstrap() {
    await this.authService.ensureAdminUser();
    return { message: 'Auth bootstrap complete' };
  }
}
