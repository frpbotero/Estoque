import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { CONDITION_LABEL, MOVEMENT_LABEL, Movement, MovementType } from '../../core/models';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-movements-history',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Histórico de movimentações</h1>
        <p>{{ total() }} registro(s)</p>
      </div>
    </div>

    <div class="toolbar">
      <input type="search" placeholder="Patrimônio, serial ou modelo" [(ngModel)]="search" (keyup.enter)="reload(1)" />
      <select [(ngModel)]="type" (change)="reload(1)">
        <option value="">Todos os tipos</option>
        @for (t of types; track t) {
          <option [value]="t">{{ typeLabel(t) }}</option>
        }
      </select>
      <button class="btn" (click)="reload(1)">Filtrar</button>
    </div>

    <div class="card">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Equipamento</th>
              <th>Movimentação</th>
              <th>Envolvidos</th>
              <th>Estado</th>
              <th>Status final</th>
              <th>Registrado por</th>
            </tr>
          </thead>
          <tbody>
            @for (m of movements(); track m.id) {
              <tr>
                <td class="nowrap">{{ m.createdAt | date: 'dd/MM/yy HH:mm' }}</td>
                <td>
                  <a [routerLink]="['/estoque', m.assetId]" class="mono">{{ m.asset?.assetTag }}</a>
                  <div class="muted">{{ m.asset?.manufacturer }} {{ m.asset?.model }}</div>
                </td>
                <td>{{ typeLabel(m.type) }}</td>
                <td class="muted">{{ people(m) }}</td>
                <td class="muted">{{ conditionLabel(m) }}</td>
                <td><app-status-badge [status]="m.statusAfter" /></td>
                <td class="muted">{{ m.performedBy?.name }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="empty">Nenhuma movimentação encontrada</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (totalPages() > 1) {
        <div class="pagination">
          <button class="btn btn--sm" [disabled]="page() <= 1" (click)="reload(page() - 1)">Anterior</button>
          <span class="muted">Página {{ page() }} de {{ totalPages() }}</span>
          <button class="btn btn--sm" [disabled]="page() >= totalPages()" (click)="reload(page() + 1)">
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

      .nowrap {
        white-space: nowrap;
      }
    `,
  ],
})
export class MovementsHistoryComponent {
  private readonly api = inject(ApiService);

  readonly types: MovementType[] = [
    'PURCHASE_ENTRY',
    'ASSIGNMENT',
    'RETURN',
    'MAINTENANCE',
    'MAINTENANCE_RETURN',
    'RETIREMENT',
    'DISPOSAL',
  ];

  search = '';
  type: MovementType | '' = '';

  readonly movements = signal<Movement[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);

  constructor() {
    this.reload(1);
  }

  typeLabel(type: MovementType): string {
    return MOVEMENT_LABEL[type];
  }

  conditionLabel(m: Movement): string {
    return m.condition ? CONDITION_LABEL[m.condition] : '—';
  }

  people(m: Movement): string {
    const parts: string[] = [];
    if (m.fromEmployee) parts.push(`de ${m.fromEmployee.name}`);
    if (m.toEmployee) parts.push(`para ${m.toEmployee.name}`);
    if (!parts.length && m.sector) parts.push(m.sector.name);
    return parts.join(' · ') || '—';
  }

  reload(page: number): void {
    this.api
      .listMovements({ page, pageSize: 25, search: this.search || undefined, type: this.type || undefined })
      .subscribe((res) => {
        this.movements.set(res.data);
        this.page.set(res.meta.page);
        this.totalPages.set(res.meta.totalPages);
        this.total.set(res.meta.total);
      });
  }
}
