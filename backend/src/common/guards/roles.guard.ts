import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }
    const effectiveRoles: UserRole[] = user.effectiveRoles ?? [user.role];
    if (effectiveRoles.includes(UserRole.ADMIN)) {
      return true;
    }
    if (!effectiveRoles.some((role) => requiredRoles.includes(role))) {
      throw new ForbiddenException('Seu usuário não tem permissão (role) para esta ação.');
    }
    return true;
  }
}
