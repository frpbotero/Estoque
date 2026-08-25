import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../common/decorators';
import { AssetsService } from './assets.service';
import { CreateAssetDto, QueryAssetsDto, UpdateAssetDto } from './dto/asset.dto';

@ApiTags('assets')
@ApiBearerAuth()
@Controller('assets')
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista o estoque com filtros e paginação no backend' })
  findAll(@Query() query: QueryAssetsDto) {
    return this.service.findAll(query);
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Busca rápida por patrimônio, serial ou modelo' })
  lookup(@Query('term') term: string) {
    return this.service.lookup(term ?? '');
  }

  @Get('needs-attention')
  needsAttention() {
    return this.service.needsAttention();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Histórico completo de movimentações do ativo' })
  timeline(@Param('id') id: string) {
    return this.service.timeline(id);
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Post()
  create(@Body() dto: CreateAssetDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto, @CurrentUser('id') userId: string) {
    return this.service.update(id, dto, userId);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete — o histórico é preservado' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.remove(id, userId);
  }
}
