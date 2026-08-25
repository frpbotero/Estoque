import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Asset, AssetStatus, MovementType, Prisma } from '@prisma/client';
import { paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AssignmentDto, QueryMovementsDto, ReturnDto, StatusChangeDto } from './dto/movement.dto';
import { MOVEMENT_RULES, STATUS_LABELS } from './movement-rules';

const MOVEMENT_INCLUDE = {
  asset: { select: { id: true, assetTag: true, model: true, manufacturer: true, status: true } },
  fromEmployee: { select: { id: true, name: true } },
  toEmployee: { select: { id: true, name: true } },
  sector: { select: { id: true, name: true } },
  performedBy: { select: { id: true, name: true } },
} satisfies Prisma.AssetMovementInclude;

@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryMovementsDto) {
    const where: Prisma.AssetMovementWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.assetId ? { assetId: query.assetId } : {}),
      ...(query.sectorId ? { sectorId: query.sectorId } : {}),
      ...(query.employeeId
        ? { OR: [{ fromEmployeeId: query.employeeId }, { toEmployeeId: query.employeeId }] }
        : {}),
      ...(query.search
        ? {
            asset: {
              OR: [
                { assetTag: { contains: query.search, mode: 'insensitive' } },
                { serialNumber: { contains: query.search, mode: 'insensitive' } },
                { model: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.assetMovement.findMany({
        where,
        include: MOVEMENT_INCLUDE,
        orderBy: { createdAt: query.order },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.assetMovement.count({ where }),
    ]);

    return paginated(data, total, query.page, query.pageSize);
  }

  /** Entrega de equipamento a um colaborador. */
  async assign(dto: AssignmentDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const asset = await this.loadAsset(tx, dto.assetId);
      this.assertTransition(asset, MovementType.ASSIGNMENT);

      const employee = await tx.employee.findUniqueOrThrow({ where: { id: dto.toEmployeeId } });
      if (!employee.active) {
        throw new BadRequestException('Colaborador inativo não pode receber equipamentos');
      }

      await tx.asset.update({
        where: { id: asset.id },
        data: {
          status: AssetStatus.ASSIGNED,
          currentEmployeeId: dto.toEmployeeId,
          currentSectorId: dto.sectorId,
          updatedById: userId,
        },
      });

      return tx.assetMovement.create({
        data: {
          assetId: asset.id,
          type: MovementType.ASSIGNMENT,
          fromEmployeeId: asset.currentEmployeeId,
          toEmployeeId: dto.toEmployeeId,
          sectorId: dto.sectorId,
          condition: asset.condition,
          statusAfter: AssetStatus.ASSIGNED,
          notes: dto.notes,
          performedById: userId,
        },
        include: MOVEMENT_INCLUDE,
      });
    });
  }

  /** Devolução ao TI — o destino define o status resultante. */
  async return(dto: ReturnDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const asset = await this.loadAsset(tx, dto.assetId);
      this.assertTransition(asset, MovementType.RETURN, dto.destination);

      if (asset.currentEmployeeId && asset.currentEmployeeId !== dto.fromEmployeeId) {
        throw new ConflictException(
          'O equipamento está registrado com outro colaborador — verifique o responsável atual',
        );
      }

      await tx.asset.update({
        where: { id: asset.id },
        data: {
          status: dto.destination,
          condition: dto.condition,
          currentEmployeeId: null,
          currentSectorId: null,
          updatedById: userId,
        },
      });

      return tx.assetMovement.create({
        data: {
          assetId: asset.id,
          type: MovementType.RETURN,
          fromEmployeeId: dto.fromEmployeeId,
          sectorId: asset.currentSectorId,
          condition: dto.condition,
          statusAfter: dto.destination,
          notes: dto.notes,
          performedById: userId,
        },
        include: MOVEMENT_INCLUDE,
      });
    });
  }

  /** Manutenção, retorno de manutenção, retirada e descarte. */
  async changeStatus(dto: StatusChangeDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const asset = await this.loadAsset(tx, dto.assetId);
      const rule = MOVEMENT_RULES[dto.type];
      const destination = dto.destination ?? rule.allowedDestinations[0];

      this.assertTransition(asset, dto.type, destination);

      await tx.asset.update({
        where: { id: asset.id },
        data: {
          status: destination,
          ...(dto.condition ? { condition: dto.condition } : {}),
          // Ao sair de uso, o ativo deixa de ter responsável.
          ...(destination === AssetStatus.ASSIGNED
            ? {}
            : { currentEmployeeId: null, currentSectorId: null }),
          updatedById: userId,
        },
      });

      return tx.assetMovement.create({
        data: {
          assetId: asset.id,
          type: dto.type,
          fromEmployeeId: asset.currentEmployeeId,
          sectorId: asset.currentSectorId,
          condition: dto.condition ?? asset.condition,
          statusAfter: destination,
          notes: dto.notes,
          performedById: userId,
        },
        include: MOVEMENT_INCLUDE,
      });
    });
  }

  private async loadAsset(tx: Prisma.TransactionClient, assetId: string): Promise<Asset> {
    const asset = await tx.asset.findUniqueOrThrow({ where: { id: assetId } });

    if (asset.deletedAt) {
      throw new BadRequestException('Equipamento excluído não aceita movimentações');
    }

    return asset;
  }

  private assertTransition(asset: Asset, type: MovementType, destination?: AssetStatus): void {
    const rule = MOVEMENT_RULES[type];

    if (!rule.from.includes(asset.status)) {
      throw new ConflictException(
        `Não é possível registrar "${rule.label}" para um equipamento com status "${STATUS_LABELS[asset.status]}"`,
      );
    }

    if (destination && !rule.allowedDestinations.includes(destination)) {
      throw new BadRequestException(
        `Destino "${STATUS_LABELS[destination]}" não é válido para "${rule.label}"`,
      );
    }
  }
}
