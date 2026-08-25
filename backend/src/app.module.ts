import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AssetsModule } from './assets/assets.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AdminBootstrapService } from './bootstrap/admin-bootstrap.service';
import { CategoriesModule } from './categories/categories.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmployeesModule } from './employees/employees.module';
import { HealthModule } from './health/health.module';
import { MovementsModule } from './movements/movements.module';
import { PrismaModule } from './prisma/prisma.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SectorsModule } from './sectors/sectors.module';
import { UsersModule } from './users/users.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SectorsModule,
    EmployeesModule,
    CategoriesModule,
    AssetsModule,
    PurchasesModule,
    MovementsModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [
    // Rotas são privadas por padrão; @Public() abre exceções pontuais.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    AdminBootstrapService,
  ],
})
export class AppModule {}
