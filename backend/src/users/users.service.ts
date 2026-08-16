import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly auditLogService: AuditLogService,
  ) {}

  findAll(): Promise<User[]> {
    return this.usersRepo.find({ order: { fullName: 'ASC' } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return user;
  }

  findByUsername(username: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { username } });
  }

  async create(dto: CreateUserDto, actor?: { id: string; username: string }): Promise<User> {
    const existing = await this.usersRepo.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });
    if (existing) {
      throw new ConflictException('Já existe um usuário com este username ou email.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      username: dto.username,
      email: dto.email,
      fullName: dto.fullName,
      role: dto.role,
      active: dto.active ?? true,
      passwordHash,
    });
    const saved = await this.usersRepo.save(user);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'USER_CREATED',
        targetType: 'User',
        targetId: saved.id,
        details: `${saved.username} (${saved.role})`,
      });
    }
    return saved;
  }

  async update(id: string, dto: UpdateUserDto, actor?: { id: string; username: string }): Promise<User> {
    const user = await this.findById(id);
    const previousRole = user.role;
    Object.assign(user, dto);
    const saved = await this.usersRepo.save(user);
    if (actor && dto.role && dto.role !== previousRole) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'USER_ROLE_CHANGED',
        targetType: 'User',
        targetId: saved.id,
        details: `${saved.username}: ${previousRole} -> ${saved.role}`,
      });
    } else if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'USER_UPDATED',
        targetType: 'User',
        targetId: saved.id,
        details: saved.username,
      });
    }
    return saved;
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.usersRepo.update(id, { passwordHash });
  }

  async remove(id: string, actor?: { id: string; username: string }): Promise<void> {
    const user = await this.findById(id);
    await this.usersRepo.remove(user);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'USER_DELETED',
        targetType: 'User',
        targetId: id,
        details: user.username,
      });
    }
  }
}
