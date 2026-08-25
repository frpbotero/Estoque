import { Body, Controller, Get, Module, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../common/decorators';
import { CreatePurchaseDto, QueryPurchasesDto } from './dto/purchase.dto';
import { PurchasesService } from './purchases.service';

@ApiTags('purchases')
@ApiBearerAuth()
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}

  @Get()
  findAll(@Query() query: QueryPurchasesDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Post()
  @ApiOperation({ summary: 'Entrada por compra: cria NF, ativos e movimentações em uma transação' })
  create(@Body() dto: CreatePurchaseDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }
}

@Module({
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
