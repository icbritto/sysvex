import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { SecurityService } from '../security/security.service';
import { AuditLogService } from '../audit/audit-log.service';

export interface LoginResult {
  accessToken: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    email: string;
    role: string;
    effectiveRoles: string[];
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly securityService: SecurityService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async validateUser(username: string, password: string): Promise<User> {
    const user = await this.usersService.findByUsername(username);
    if (!user || !user.active) {
      throw new UnauthorizedException('Usuário ou senha inválidos.');
    }
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Usuário ou senha inválidos.');
    }
    return user;
  }

  async login(username: string, password: string): Promise<LoginResult> {
    const user = await this.validateUser(username, password);
    const accessToken = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    const effectiveRoles = await this.securityService.getEffectiveRoles(user.id, user.role);
    await this.auditLogService.record({
      actorUserId: user.id,
      actorUsername: user.username,
      action: 'LOGIN',
      targetType: 'User',
      targetId: user.id,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        effectiveRoles,
      },
    };
  }

  async logout(userId: string, username: string): Promise<void> {
    await this.auditLogService.record({
      actorUserId: userId,
      actorUsername: username,
      action: 'LOGOUT',
      targetType: 'User',
      targetId: userId,
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatches) {
      throw new BadRequestException('Senha atual incorreta.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePasswordHash(userId, passwordHash);
  }
}
