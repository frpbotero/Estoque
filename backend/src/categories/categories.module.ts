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

export class CreateCategoryDto {
  @ApiProperty({ example: 'Notebook' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationDto) {
    const where: Prisma.AssetCategoryWhereInput = query.search
      ? { name: { contains: query.search, mode: 'insensitive' } }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.assetCategory.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.assetCategory.count({ where }),
    ]);

    return paginated(data, total, query.page, query.pageSize);
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.assetCategory.create({ data: { name: dto.name.trim() } });
  }

  update(id: string, dto: UpdateCategoryDto) {
    return this.prisma.assetCategory.update({ where: { id }, data: { ...dto } });
  }

  remove(id: string) {
    return this.prisma.assetCategory.update({ where: { id }, data: { active: false } });
  }
}

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.service.findAll(query);
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
