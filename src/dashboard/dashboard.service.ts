import { Injectable } from '@nestjs/common';
import { User } from '../users/user.entity';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';

@Injectable()
export class DashboardService {
  async getDashboard(user: User) {
    const organizationId = getOrganizationId(user);
    
    // Basic dashboard implementation
    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role?.name || user.role,
        organizationId: organizationId,
        organization: user.organization
          ? {
              id: user.organization?.id ?? null,
              name: user.organization?.name ?? null,
            }
          : null,
      },
      summary: {
        total_works: 0,
        total_expenses: 0,
        total_incomes: 0,
      },
    };
  }
}

