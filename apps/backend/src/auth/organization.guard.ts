import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationMembership } from '../entities/organization-membership.entity';
import { AuthenticatedUser } from './current-user.decorator';

export interface TenantRequest {
  user: AuthenticatedUser;
  params: { organizationId?: string };
  membership?: OrganizationMembership;
}

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(
    @InjectRepository(OrganizationMembership)
    private readonly memberships: Repository<OrganizationMembership>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const organizationId = request.params.organizationId;
    if (!organizationId)
      throw new ForbiddenException('Organization context required');

    const membership = await this.memberships.findOne({
      where: { organizationId, userId: request.user.userId },
    });
    if (!membership) throw new ForbiddenException('Organization access denied');

    request.membership = membership;
    return true;
  }
}
