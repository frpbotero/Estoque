import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssetStatus } from '@prisma/client';
import { AssetsModule } from '../assets/assets.module';
import { AssetsService } from '../assets/assets.service';
import { PrismaService } from '../prisma/prisma.service';

export interface DashboardSummary {
  total: number;
  byStatus: Record<AssetStatus, number>;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assets: AssetsService,
  ) {}

  async summary(): Promise<DashboardSummary> {
    const grouped = await this.assets.countsByStatus();

    const byStatus = {} as Record<AssetStatus, number>;
    for (const status of Object.values(AssetStatus)) {
      byStatus[status] = 0;
    }

    let total = 0;
    for (const row of grouped) {
      byStatus[row.status] = row._count._all;
      total += row._count._all;
    }

    return { total, byStatus };
  }

  recentMovements() {
    return this.assets.recentMovements(10);
  }

  needsAttention() {
    return this.assets.needsAttention();
  }

  /** Distribuição por categoria — alimenta o gráfico simples do dashboard. */
  async byCategory() {
    const rows = await this.prisma.asset.groupBy({
      by: ['categoryId'],
      where: { deletedAt: null },
      _count: { _all: true },
    });

    const categories = await this.prisma.assetCategory.findMany({
      where: { id: { in: rows.map((r) => r.categoryId) } },
      select: { id: true, name: true },
    });

    const nameById = new Map(categories.map((c) => [c.id, c.name]));

    return rows
      .map((row) => ({
        categoryId: row.categoryId,
        name: nameById.get(row.categoryId) ?? 'Sem categoria',
        count: row._count._all,
      }))
      .sort((a, b) => b.count - a.count);
  }
}

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Indicadores do topo da tela inicial' })
  summary() {
    return this.service.summary();
  }

  @Get('recent-movements')
  recentMovements() {
    return this.service.recentMovements();
  }

  @Get('needs-attention')
  needsAttention() {
    return this.service.needsAttention();
  }

  @Get('by-category')
  byCategory() {
    return this.service.byCategory();
  }
}

@Module({
  imports: [AssetsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
