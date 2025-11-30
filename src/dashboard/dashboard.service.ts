import { Injectable } from '@nestjs/common';
import { User } from '../users/user.entity';

@Injectable()
export class DashboardService {
  async getDashboard(user: User) {
    // Basic dashboard implementation
    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role.name,
      },
      summary: {
        total_works: 0,
        total_expenses: 0,
        total_incomes: 0,
      },
    };
  }
}

