import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Bootstrap do administrador inicial.
 *
 * Roda a cada subida do backend e é idempotente por construção: se já existir
 * qualquer usuário ADMIN ativo, nada acontece. Reiniciar os containers nunca
 * cria administradores duplicados.
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureReferenceData();
    await this.ensureAdmin();
  }

  /** Categorias e setores mínimos para o sistema ser utilizável no primeiro acesso. */
  private async ensureReferenceData(): Promise<void> {
    const categories = [
      'Notebook',
      'Desktop',
      'Monitor',
      'Smartphone',
      'Tablet',
      'Servidor',
      'Switch',
      'Roteador',
      'Acessório',
      'Outro',
    ];

    if ((await this.prisma.assetCategory.count()) === 0) {
      await this.prisma.assetCategory.createMany({ data: categories.map((name) => ({ name })) });
      this.logger.log('Categorias padrão criadas');
    }

    if ((await this.prisma.sector.count()) === 0) {
      await this.prisma.sector.create({ data: { name: 'Tecnologia da Informação' } });
      this.logger.log('Setor inicial criado');
    }
  }

  private async ensureAdmin(): Promise<void> {
    const existing = await this.prisma.user.count({
      where: { role: Role.ADMIN, active: true, deletedAt: null },
    });

    if (existing > 0) {
      this.logger.log(`Bootstrap ignorado: ${existing} administrador(es) já cadastrado(s)`);
      return;
    }

    const name = this.config.get<string>('admin.name')!;
    const email = this.config.get<string>('admin.email')!.toLowerCase();
    const password = this.config.get<string>('admin.password')!;

    await this.prisma.user.upsert({
      where: { email },
      create: {
        name,
        email,
        role: Role.ADMIN,
        passwordHash: await AuthService.hashPassword(password),
      },
      update: { role: Role.ADMIN, active: true, deletedAt: null },
    });

    this.logger.warn(`Administrador inicial criado: ${email} — troque a senha no primeiro acesso`);
  }
}
