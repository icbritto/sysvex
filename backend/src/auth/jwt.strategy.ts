import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../users/user.entity';
import { SecurityService } from '../security/security.service';

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: UserRole;
  effectiveRoles: UserRole[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly securityService: SecurityService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'sysvex-dev-secret-change-me',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Roles concedidas via acesso emergencial (firefighter) valem
    // imediatamente, então checamos os grants ativos a cada requisição.
    const effectiveRoles = await this.securityService.getEffectiveRoles(payload.sub, payload.role);
    return { id: payload.sub, username: payload.username, role: payload.role, effectiveRoles };
  }
}
