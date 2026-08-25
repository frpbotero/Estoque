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
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Roles } from '../common/decorators';
import { PaginationDto, paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

export class CreateSectorDto {
  @ApiProperty({ example: 'Engenharia' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateSectorDto extends PartialType(CreateSectorDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Injectable()
export class SectorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationDto) {
    const where: Prisma.SectorWhereInput = query.search
      ? { name: { contains: query.search, mode: 'insensitive' } }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.sector.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.sector.count({ where }),
    ]);

    return paginated(data, total, query.page, query.pageSize);
  }

  findOne(id: string) {
    return this.prisma.sector.findUniqueOrThrow({ where: { id } });
  }

  create(dto: CreateSectorDto) {
    return this.prisma.sector.create({ data: { name: dto.name.trim() } });
  }

  update(id: string, dto: UpdateSectorDto) {
    return this.prisma.sector.update({ where: { id }, data: { ...dto } });
  }

  remove(id: string) {
    return this.prisma.sector.update({ where: { id }, data: { active: false } });
  }
}

@ApiTags('sectors')
@ApiBearerAuth()
@Controller('sectors')
export class SectorsController {
  constructor(private readonly service: SectorsService) {}

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Post()
  create(@Body() dto: CreateSectorDto) {
    return this.service.create(dto);
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSectorDto) {
    return this.service.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

@Module({
  controllers: [SectorsController],
  providers: [SectorsService],
  exports: [SectorsService],
})
export class SectorsModule {}
