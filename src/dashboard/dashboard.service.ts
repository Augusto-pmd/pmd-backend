import { Injectable } from '@nestjs/common';
import { User } from '../users/users.entity';

@Injectable()
export class DashboardService {
  async getDashboard(user: User) {
    // Basic dashboard implementation
    return {
      user: {
        id: user.id,
        name: user.name,
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

