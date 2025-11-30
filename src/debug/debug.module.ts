import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DebugLoginController } from './debug-login.controller';

@Module({
  imports: [AuthModule],
  controllers: [DebugLoginController],
})
export class DebugModule {}

