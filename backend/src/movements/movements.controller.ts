import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../common/decorators';
import { AssignmentDto, QueryMovementsDto, ReturnDto, StatusChangeDto } from './dto/movement.dto';
import { MOVEMENT_RULES, STATUS_LABELS } from './movement-rules';
import { MovementsService } from './movements.service';

@ApiTags('movements')
@ApiBearerAuth()
@Controller('movements')
export class MovementsController {
  constructor(private readonly service: MovementsService) {}

  @Get()
  @ApiOperation({ summary: 'Histórico de movimentações com filtros' })
  findAll(@Query() query: QueryMovementsDto) {
    return this.service.findAll(query);
  }

  @Get('rules')
  @ApiOperation({ summary: 'Máquina de estados — usada pelo frontend para habilitar ações' })
  rules() {
    return { movements: MOVEMENT_RULES, statusLabels: STATUS_LABELS };
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Post('assignment')
  @ApiOperation({ summary: 'Entrega o equipamento a um colaborador' })
  assign(@Body() dto: AssignmentDto, @CurrentUser('id') userId: string) {
    return this.service.assign(dto, userId);
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Post('return')
  @ApiOperation({ summary: 'Registra a devolução ao TI' })
  return(@Body() dto: ReturnDto, @CurrentUser('id') userId: string) {
    return this.service.return(dto, userId);
  }

  @Roles(Role.ADMIN, Role.OPERATOR)
  @Post('status')
  @ApiOperation({ summary: 'Manutenção, retorno de manutenção, retirada ou descarte' })
  changeStatus(@Body() dto: StatusChangeDto, @CurrentUser('id') userId: string) {
    return this.service.changeStatus(dto, userId);
  }
}
