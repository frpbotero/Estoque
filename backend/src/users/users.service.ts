import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PaginationDto, paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationDto) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: SAFE_SELECT,
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginated(data, total, query.page, query.pageSize);
  }

  findOne(id: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id }, select: SAFE_SELECT });
  }

  async create(dto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        role: dto.role,
        passwordHash: await AuthService.hashPassword(dto.password),
      },
      select: SAFE_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const data: Prisma.UserUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email.toLowerCase() }),
      ...(dto.role !== undefined && { role: dto.role }),
      ...(dto.active !== undefined && { active: dto.active }),
      ...(dto.password ? { passwordHash: await AuthService.hashPassword(dto.password) } : {}),
    };

    return this.prisma.user.update({ where: { id }, data, select: SAFE_SELECT });
  }

  async remove(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new BadRequestException('Você não pode desativar o próprio usuário');
    }

    const admins = await this.prisma.user.count({
      where: { role: 'ADMIN', active: true, deletedAt: null },
    });
    const target = await this.prisma.user.findUniqueOrThrow({ where: { id } });

    if (target.role === 'ADMIN' && admins <= 1) {
      throw new BadRequestException('O sistema precisa de ao menos um administrador ativo');
    }

    return this.prisma.user.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
      select: SAFE_SELECT,
    });
  }
}
