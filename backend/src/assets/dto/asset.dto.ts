import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { AssetCondition, AssetStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateAssetDto {
  @ApiProperty({ example: 'ELD-000234', description: 'Patrimônio / asset tag' })
  @IsString()
  @IsNotEmpty()
  assetTag: string;

  @ApiProperty({ example: 'SN-9F2K1LMC' })
  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'Dell' })
  @IsString()
  @IsNotEmpty()
  manufacturer: string;

  @ApiProperty({ example: 'Latitude 5440' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: AssetCondition, default: AssetCondition.NEW })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @ApiPropertyOptional({ example: 'Almoxarifado TI — prateleira B2' })
  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateAssetDto extends PartialType(OmitType(CreateAssetDto, ['assetTag'] as const)) {}

export class QueryAssetsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: AssetStatus })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({ enum: AssetCondition })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sectorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
