/**
 * Seed de dados de referência.
 *
 * Idempotente: usa upsert por chave natural, então pode rodar quantas vezes
 * for necessário sem duplicar nada. O usuário ADMIN é criado pelo bootstrap do
 * backend (src/bootstrap/admin-bootstrap.service.ts) — aqui ele só é garantido
 * para quem rodar o seed antes de subir a API.
 */
import { AssetStatus, MovementType, PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const CATEGORIES = [
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

const SECTORS = ['Tecnologia da Informação', 'Engenharia', 'Administrativo', 'Financeiro', 'Comercial'];

async function main(): Promise<void> {
  for (const name of CATEGORIES) {
    await prisma.assetCategory.upsert({ where: { name }, create: { name }, update: {} });
  }

  for (const name of SECTORS) {
    await prisma.sector.upsert({ where: { name }, create: { name }, update: {} });
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@empresa.com').toLowerCase();
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      name: process.env.ADMIN_NAME ?? 'Administrador',
      email: adminEmail,
      role: Role.ADMIN,
      passwordHash: await argon2.hash(process.env.ADMIN_PASSWORD ?? 'change-me', {
        type: argon2.argon2id,
      }),
    },
    update: {},
  });

  if (process.env.SEED_DEMO !== 'true') {
    console.log('Seed de referência concluído (categorias, setores, admin).');
    return;
  }

  // ---- Dados de demonstração -------------------------------------------------
  const ti = await prisma.sector.findFirstOrThrow({ where: { name: 'Tecnologia da Informação' } });
  const engenharia = await prisma.sector.findFirstOrThrow({ where: { name: 'Engenharia' } });
  const notebook = await prisma.assetCategory.findFirstOrThrow({ where: { name: 'Notebook' } });

  const joao = await prisma.employee.upsert({
    where: { email: 'joao.silva@empresa.com' },
    create: { name: 'João da Silva', email: 'joao.silva@empresa.com', sectorId: engenharia.id },
    update: {},
  });

  const invoice = await prisma.invoice.upsert({
    where: {
      number_series_supplier: { number: '001234', series: '1', supplier: 'Dell Computadores' },
    },
    create: {
      number: '001234',
      series: '1',
      supplier: 'Dell Computadores',
      issueDate: new Date('2026-08-20'),
    },
    update: {},
  });

  const existingPurchase = await prisma.purchase.findFirst({ where: { invoiceId: invoice.id } });
  if (existingPurchase) {
    console.log('Seed de demonstração já aplicado.');
    return;
  }

  const purchase = await prisma.purchase.create({
    data: { invoiceId: invoice.id, responsibleId: admin.id, sectorId: ti.id },
  });

  for (let i = 1; i <= 4; i++) {
    const asset = await prisma.asset.create({
      data: {
        assetTag: `ELD-00023${i}`,
        serialNumber: `SN-DEMO-000${i}`,
        categoryId: notebook.id,
        manufacturer: 'Dell',
        model: 'Latitude 5440',
        status: AssetStatus.AVAILABLE,
        createdById: admin.id,
        location: 'Almoxarifado TI',
      },
    });

    await prisma.purchaseItem.create({ data: { purchaseId: purchase.id, assetId: asset.id } });
    await prisma.assetMovement.create({
      data: {
        assetId: asset.id,
        type: MovementType.PURCHASE_ENTRY,
        sectorId: ti.id,
        condition: asset.condition,
        statusAfter: AssetStatus.AVAILABLE,
        notes: `NF ${invoice.number} — ${invoice.supplier}`,
        performedById: admin.id,
      },
    });

    // O primeiro notebook já sai para o colaborador.
    if (i === 1) {
      await prisma.asset.update({
        where: { id: asset.id },
        data: {
          status: AssetStatus.ASSIGNED,
          currentEmployeeId: joao.id,
          currentSectorId: engenharia.id,
        },
      });

      await prisma.assetMovement.create({
        data: {
          assetId: asset.id,
          type: MovementType.ASSIGNMENT,
          toEmployeeId: joao.id,
          sectorId: engenharia.id,
          condition: asset.condition,
          statusAfter: AssetStatus.ASSIGNED,
          performedById: admin.id,
        },
      });
    }
  }

  console.log('Seed de demonstração concluído.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
