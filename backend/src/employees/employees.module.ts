import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags, PartialType } from '@nestjs/swagger';
import { Prisma, Role } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Roles } from '../common/decorators';
import { PaginationDto, paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Matrícula' })
  @IsOptional()
  @IsString()
  registration?: string;

  @ApiProperty()
  @IsUUID()
  sectorId: string;
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationDto & { sectorId?: string }) {
    const where: Prisma.EmployeeWhereInput = {
      deletedAt: null,
      ...(query.sectorId ? { sectorId: query.sectorId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { registration: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        include: { sector: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.employee.count({ where }),
    ]);

    return paginated(data, total, query.page, query.pageSize);
  }

  findOne(id: string) {
    return this.prisma.employee.findUniqueOrThrow({
      where: { id },
      include: { sector: true, assetsInUse: true },
    });
  }

  create(dto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: {
        name: dto.name.trim(),
        email: dto.email?.toLowerCase(),
        registration: dto.registration,
        sectorId: dto.sectorId,
      },
      include: { sector: { select: { id: true, name: true } } },
    });
  }

  update(id: string, dto: UpdateEmployeeDto) {
    return this.prisma.employee.update({
      where: { id },
      data: { ...dto, email: dto.email?.toLowerCase() },
      include: { sector: { select: { id: true, name: true } } },
    });
  }

  remove(id: string) {
    return this.prisma.employee.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
    });
  }
}

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  findAll(@Query() query: PaginationDto, @Query('sectorId') sectorId?: string) {
    return this.service.findAll(Object.assign(query, { sectorId }));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.service.create(dto);
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
