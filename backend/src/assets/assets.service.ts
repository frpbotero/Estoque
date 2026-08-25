import { Injectable } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto, QueryAssetsDto, UpdateAssetDto } from './dto/asset.dto';

export const ASSET_LIST_INCLUDE = {
  category: { select: { id: true, name: true } },
  currentEmployee: { select: { id: true, name: true } },
  currentSector: { select: { id: true, name: true } },
} satisfies Prisma.AssetInclude;

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAssetsDto) {
    const where: Prisma.AssetWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.condition ? { condition: query.condition } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.sectorId ? { currentSectorId: query.sectorId } : {}),
      ...(query.employeeId ? { currentEmployeeId: query.employeeId } : {}),
      ...(query.search
        ? {
            OR: [
              { assetTag: { contains: query.search, mode: 'insensitive' } },
              { serialNumber: { contains: query.search, mode: 'insensitive' } },
              { model: { contains: query.search, mode: 'insensitive' } },
              { manufacturer: { contains: query.search, mode: 'insensitive' } },
              { currentEmployee: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        include: ASSET_LIST_INCLUDE,
        orderBy: { createdAt: query.order },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.asset.count({ where }),
    ]);

    return paginated(data, total, query.page, query.pageSize);
  }

  findOne(id: string) {
    return this.prisma.asset.findUniqueOrThrow({
      where: { id },
      include: {
        ...ASSET_LIST_INCLUDE,
        createdBy: { select: { id: true, name: true } },
        purchaseItem: { include: { purchase: { include: { invoice: true, sector: true } } } },
      },
    });
  }

  /** Timeline completa do ativo — a fonte de verdade histórica. */
  async timeline(id: string) {
    await this.prisma.asset.findUniqueOrThrow({ where: { id }, select: { id: true } });

    return this.prisma.assetMovement.findMany({
      where: { assetId: id },
      include: {
        fromEmployee: { select: { id: true, name: true } },
        toEmployee: { select: { id: true, name: true } },
        sector: { select: { id: true, name: true } },
        performedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cadastro avulso de ativo (equipamento já existente, sem nota fiscal).
   * A entrada por compra passa pelo PurchasesService.
   */
  create(dto: CreateAssetDto, userId: string) {
    return this.prisma.asset.create({
      data: {
        ...dto,
        assetTag: dto.assetTag.trim().toUpperCase(),
        serialNumber: dto.serialNumber.trim().toUpperCase(),
        createdById: userId,
      },
      include: ASSET_LIST_INCLUDE,
    });
  }

  update(id: string, dto: UpdateAssetDto, userId: string) {
    return this.prisma.asset.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.serialNumber ? { serialNumber: dto.serialNumber.trim().toUpperCase() } : {}),
        updatedById: userId,
      },
      include: ASSET_LIST_INCLUDE,
    });
  }

  remove(id: string, userId: string) {
    return this.prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: userId },
    });
  }

  /** Busca por patrimônio, serial ou modelo — usada na tela de devolução. */
  lookup(term: string) {
    return this.prisma.asset.findMany({
      where: {
        deletedAt: null,
        OR: [
          { assetTag: { contains: term, mode: 'insensitive' } },
          { serialNumber: { contains: term, mode: 'insensitive' } },
          { model: { contains: term, mode: 'insensitive' } },
        ],
      },
      include: ASSET_LIST_INCLUDE,
      take: 10,
    });
  }

  /** Ativos que exigem atenção do time de TI. */
  needsAttention() {
    return this.prisma.asset.findMany({
      where: {
        deletedAt: null,
        OR: [
          { status: 'MAINTENANCE' },
          { condition: { in: ['DAMAGED', 'INOPERATIVE'] } },
          { status: 'ASSIGNED', currentEmployeeId: null },
          { status: 'ASSIGNED', currentSectorId: null },
        ],
      },
      include: ASSET_LIST_INCLUDE,
      take: 20,
      orderBy: { updatedAt: 'desc' },
    });
  }

  countsByStatus() {
    return this.prisma.asset.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
  }

  recentMovements(take = 10) {
    return this.prisma.assetMovement.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        asset: { select: { id: true, assetTag: true, model: true, manufacturer: true } },
        toEmployee: { select: { id: true, name: true } },
        fromEmployee: { select: { id: true, name: true } },
        performedBy: { select: { id: true, name: true } },
      },
    });
  }

  movementTypes(): MovementType[] {
    return Object.values(MovementType);
  }
}
