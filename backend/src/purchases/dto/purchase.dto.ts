import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateAssetDto } from '../../assets/dto/asset.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class InvoiceDto {
  @ApiProperty({ example: '001234' })
  @IsString()
  @IsNotEmpty()
  number: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  series?: string;

  @ApiProperty({ example: 'Dell Computadores do Brasil' })
  @IsString()
  @IsNotEmpty()
  supplier: string;

  @ApiPropertyOptional({ example: '72.381.189/0001-10' })
  @IsOptional()
  @IsString()
  supplierDocument?: string;

  @ApiProperty({ example: '2026-08-25' })
  @IsDateString()
  issueDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PurchaseItemDto extends CreateAssetDto {
  @ApiPropertyOptional({ example: 4890.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;
}

export class CreatePurchaseDto {
  @ApiProperty({ type: InvoiceDto })
  @ValidateNested()
  @Type(() => InvoiceDto)
  invoice: InvoiceDto;

  @ApiProperty({ description: 'Setor solicitante' })
  @IsUUID()
  sectorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PurchaseItemDto], description: 'Equipamentos contidos na nota' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Informe ao menos um equipamento' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];
}

export class QueryPurchasesDto extends PaginationDto {}
