import { BadRequestException, Injectable } from '@nestjs/common';
import { AssetStatus, MovementType, Prisma } from '@prisma/client';
import { paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto, QueryPurchasesDto } from './dto/purchase.dto';

const PURCHASE_INCLUDE = {
  invoice: true,
  sector: { select: { id: true, name: true } },
  responsible: { select: { id: true, name: true } },
  items: {
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          serialNumber: true,
          manufacturer: true,
          model: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.PurchaseInclude;

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryPurchasesDto) {
    const where: Prisma.PurchaseWhereInput = query.search
      ? {
          OR: [
            { invoice: { number: { contains: query.search, mode: 'insensitive' } } },
            { invoice: { supplier: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where,
        include: PURCHASE_INCLUDE,
        orderBy: { receivedAt: query.order },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return paginated(data, total, query.page, query.pageSize);
  }

  findOne(id: string) {
    return this.prisma.purchase.findUniqueOrThrow({ where: { id }, include: PURCHASE_INCLUDE });
  }

  /**
   * Entrada por compra.
   *
   * A nota fiscal é modelada separadamente do equipamento: uma mesma NF pode
   * conter dez notebooks e vinte monitores. Tudo acontece em uma transação —
   * ou a nota inteira entra, ou nada entra.
   */
  async create(dto: CreatePurchaseDto, userId: string) {
    this.assertNoDuplicatesInPayload(dto);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.upsert({
        where: {
          number_series_supplier: {
            number: dto.invoice.number.trim(),
            series: dto.invoice.series?.trim() ?? '',
            supplier: dto.invoice.supplier.trim(),
          },
        },
        create: {
          number: dto.invoice.number.trim(),
          series: dto.invoice.series?.trim() ?? '',
          supplier: dto.invoice.supplier.trim(),
          supplierDocument: dto.invoice.supplierDocument,
          issueDate: new Date(dto.invoice.issueDate),
          fileUrl: dto.invoice.fileUrl,
          notes: dto.invoice.notes,
        },
        update: {
          supplierDocument: dto.invoice.supplierDocument,
          fileUrl: dto.invoice.fileUrl,
        },
      });

      const purchase = await tx.purchase.create({
        data: {
          invoiceId: invoice.id,
          responsibleId: userId,
          sectorId: dto.sectorId,
          notes: dto.notes,
        },
      });

      for (const item of dto.items) {
        const asset = await tx.asset.create({
          data: {
            assetTag: item.assetTag.trim().toUpperCase(),
            serialNumber: item.serialNumber.trim().toUpperCase(),
            categoryId: item.categoryId,
            manufacturer: item.manufacturer,
            model: item.model,
            description: item.description,
            condition: item.condition ?? 'NEW',
            location: item.location,
            status: AssetStatus.AVAILABLE,
            createdById: userId,
          },
        });

        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            assetId: asset.id,
            unitCost: item.unitCost != null ? new Prisma.Decimal(item.unitCost) : null,
          },
        });

        // Todo ativo nasce com a primeira linha da sua timeline.
        await tx.assetMovement.create({
          data: {
            assetId: asset.id,
            type: MovementType.PURCHASE_ENTRY,
            sectorId: dto.sectorId,
            condition: asset.condition,
            statusAfter: AssetStatus.AVAILABLE,
            notes: `NF ${invoice.number} — ${invoice.supplier}`,
            performedById: userId,
          },
        });
      }

      return tx.purchase.findUniqueOrThrow({ where: { id: purchase.id }, include: PURCHASE_INCLUDE });
    });
  }

  private assertNoDuplicatesInPayload(dto: CreatePurchaseDto): void {
    const tags = dto.items.map((i) => i.assetTag.trim().toUpperCase());
    const serials = dto.items.map((i) => i.serialNumber.trim().toUpperCase());

    if (new Set(tags).size !== tags.length) {
      throw new BadRequestException('Há patrimônios repetidos na mesma nota');
    }

    if (new Set(serials).size !== serials.length) {
      throw new BadRequestException('Há números de série repetidos na mesma nota');
    }
  }
}
