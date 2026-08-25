import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetCondition, AssetStatus, MovementType } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class AssignmentDto {
  @ApiProperty()
  @IsUUID()
  assetId: string;

  @ApiProperty({ description: 'Colaborador que está recebendo o equipamento' })
  @IsUUID()
  toEmployeeId: string;

  @ApiProperty()
  @IsUUID()
  sectorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReturnDto {
  @ApiProperty()
  @IsUUID()
  assetId: string;

  @ApiProperty({ description: 'Colaborador que está devolvendo' })
  @IsUUID()
  fromEmployeeId: string;

  @ApiProperty({ enum: AssetCondition, description: 'Estado físico na devolução' })
  @IsEnum(AssetCondition)
  condition: AssetCondition;

  @ApiProperty({
    enum: [AssetStatus.AVAILABLE, AssetStatus.MAINTENANCE, AssetStatus.DISPOSED],
    description: 'Destino do equipamento após a devolução',
  })
  @IsIn([AssetStatus.AVAILABLE, AssetStatus.MAINTENANCE, AssetStatus.DISPOSED])
  destination: AssetStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

/** Movimentações de estado sem troca de responsável. */
export class StatusChangeDto {
  @ApiProperty()
  @IsUUID()
  assetId: string;

  @ApiProperty({
    enum: [
      MovementType.MAINTENANCE,
      MovementType.MAINTENANCE_RETURN,
      MovementType.RETIREMENT,
      MovementType.DISPOSAL,
    ],
  })
  @IsIn([
    MovementType.MAINTENANCE,
    MovementType.MAINTENANCE_RETURN,
    MovementType.RETIREMENT,
    MovementType.DISPOSAL,
  ])
  type: MovementType;

  @ApiPropertyOptional({
    enum: AssetStatus,
    description: 'Destino — obrigatório apenas no retorno de manutenção',
  })
  @IsOptional()
  @IsEnum(AssetStatus)
  destination?: AssetStatus;

  @ApiPropertyOptional({ enum: AssetCondition })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryMovementsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: MovementType })
  @IsOptional()
  @IsEnum(MovementType)
  type?: MovementType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sectorId?: string;
}
