import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Controller('debug-login')
export class DebugLoginController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  async debugLogin(
    @Body() body: { email: string; password: string }
  ) {
    try {
      const result = await this.authService.login(body);
      return {
        debug: true,
        received: body,
        loginResponse: result,
      };
    } catch (error) {
      return {
        debug: true,
        error: error?.message || error,
      };
    }
  }
}

