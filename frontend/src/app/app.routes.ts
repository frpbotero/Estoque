import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'estoque',
        loadComponent: () =>
          import('./features/assets/assets-list.component').then((m) => m.AssetsListComponent),
      },
      {
        path: 'estoque/:id',
        loadComponent: () =>
          import('./features/assets/asset-detail.component').then((m) => m.AssetDetailComponent),
      },
      {
        path: 'movimentacoes',
        loadComponent: () =>
          import('./features/movements/movements-history.component').then(
            (m) => m.MovementsHistoryComponent,
          ),
      },
      {
        path: 'movimentacoes/entrada',
        canActivate: [roleGuard('ADMIN', 'OPERATOR')],
        loadComponent: () =>
          import('./features/movements/new-entry.component').then((m) => m.NewEntryComponent),
      },
      {
        path: 'movimentacoes/entrega',
        canActivate: [roleGuard('ADMIN', 'OPERATOR')],
        loadComponent: () =>
          import('./features/movements/new-assignment.component').then(
            (m) => m.NewAssignmentComponent,
          ),
      },
      {
        path: 'movimentacoes/devolucao',
        canActivate: [roleGuard('ADMIN', 'OPERATOR')],
        loadComponent: () =>
          import('./features/movements/new-return.component').then((m) => m.NewReturnComponent),
      },
      {
        path: 'cadastros',
        loadComponent: () =>
          import('./features/registry/registry.component').then((m) => m.RegistryComponent),
      },
      {
        path: 'administracao/usuarios',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/admin/users.component').then((m) => m.UsersComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
