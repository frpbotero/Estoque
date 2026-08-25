import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, AssetQuery } from '../../core/api.service';
import { Asset, AssetStatus, Category, STATUS_LABEL, Sector } from '../../core/models';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-assets-list',
  standalone: true,
  imports: [FormsModule, RouterLink, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Estoque de TI</h1>
        <p>{{ total() }} equipamento(s) encontrados</p>
      </div>
      <a class="btn btn--primary" routerLink="/movimentacoes/entrada">Nova entrada</a>
    </div>

    <div class="toolbar">
      <input
        type="search"
        placeholder="Buscar patrimônio, serial, modelo ou responsável..."
        [(ngModel)]="search"
        (keyup.enter)="reload(1)"
      />

      <select [(ngModel)]="status" (change)="reload(1)">
        <option value="">Todos os status</option>
        @for (s of statuses; track s) {
          <option [value]="s">{{ label(s) }}</option>
        }
      </select>

      <select [(ngModel)]="categoryId" (change)="reload(1)">
        <option value="">Todas as categorias</option>
        @for (c of categories(); track c.id) {
          <option [value]="c.id">{{ c.name }}</option>
        }
      </select>

      <select [(ngModel)]="sectorId" (change)="reload(1)">
        <option value="">Todos os setores</option>
        @for (s of sectors(); track s.id) {
          <option [value]="s.id">{{ s.name }}</option>
        }
      </select>

      <button class="btn" (click)="reload(1)">Filtrar</button>
      <button class="btn btn--ghost" (click)="clear()">Limpar</button>
    </div>

    <div class="card">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Patrimônio</th>
              <th>Dispositivo</th>
              <th>Categoria</th>
              <th>Status</th>
              <th>Responsável</th>
              <th>Setor</th>
            </tr>
          </thead>
          <tbody>
            @for (a of assets(); track a.id) {
              <tr class="clickable" (click)="open(a)">
                <td class="mono">{{ a.assetTag }}</td>
                <td>
                  <strong>{{ a.manufacturer }} {{ a.model }}</strong>
                  <div class="muted mono">{{ a.serialNumber }}</div>
                </td>
                <td>{{ a.category?.name }}</td>
                <td><app-status-badge [status]="a.status" /></td>
                <td>{{ a.currentEmployee?.name ?? '—' }}</td>
                <td>{{ a.currentSector?.name ?? '—' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="empty">Nenhum equipamento encontrado com esses filtros</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (totalPages() > 1) {
        <div class="pagination">
          <button class="btn btn--sm" [disabled]="page() <= 1" (click)="reload(page() - 1)">
            Anterior
          </button>
          <span class="muted">Página {{ page() }} de {{ totalPages() }}</span>
          <button
            class="btn btn--sm"
            [disabled]="page() >= totalPages()"
            (click)="reload(page() + 1)"
          >
            Próxima
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .pagination {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        padding: 12px 16px;
        border-top: 1px solid var(--border);
      }
    `,
  ],
})
export class AssetsListComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly statuses: AssetStatus[] = [
    'AVAILABLE',
    'ASSIGNED',
    'MAINTENANCE',
    'RESERVED',
    'RETIRED',
    'DISPOSED',
  ];

  search = '';
  status: AssetStatus | '' = '';
  categoryId = '';
  sectorId = '';

  readonly assets = signal<Asset[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly sectors = signal<Sector[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);

  constructor() {
    this.api.listCategories({ pageSize: 100 }).subscribe((r) => this.categories.set(r.data));
    this.api.listSectors({ pageSize: 100 }).subscribe((r) => this.sectors.set(r.data));
    this.reload(1);
  }

  label(status: AssetStatus): string {
    return STATUS_LABEL[status];
  }

  reload(page: number): void {
    const query: AssetQuery = {
      page,
      pageSize: 20,
      search: this.search || undefined,
      status: this.status || undefined,
      categoryId: this.categoryId || undefined,
      sectorId: this.sectorId || undefined,
    };

    this.api.listAssets(query).subscribe((res) => {
      this.assets.set(res.data);
      this.page.set(res.meta.page);
      this.totalPages.set(res.meta.totalPages);
      this.total.set(res.meta.total);
    });
  }

  clear(): void {
    this.search = '';
    this.status = '';
    this.categoryId = '';
    this.sectorId = '';
    this.reload(1);
  }

  open(asset: Asset): void {
    void this.router.navigate(['/estoque', asset.id]);
  }
}
