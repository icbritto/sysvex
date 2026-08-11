import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from './jwt.strategy';
import { UsersService } from '../users/users.service';
import { SecurityService } from '../security/security.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly securityService: SecurityService,
  ) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() currentUser: AuthenticatedUser) {
    const user = await this.usersService.findById(currentUser.id);
    const { passwordHash: _passwordHash, ...safe } = user;
    const effectiveRoles = await this.securityService.getEffectiveRoles(user.id, user.role);
    return { ...safe, effectiveRoles };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(currentUser.id, dto.currentPassword, dto.newPassword);
    return { success: true };
  }
}
