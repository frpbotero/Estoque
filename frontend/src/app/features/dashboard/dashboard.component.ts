import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Asset, DashboardSummary, MOVEMENT_LABEL, Movement, STATUS_LABEL } from '../../core/models';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Warehouse de TI</h1>
        <p>Visão geral do parque de equipamentos</p>
      </div>
    </div>

    <div class="kpis">
      @for (kpi of kpis(); track kpi.label) {
        <div class="card kpi">
          <span class="kpi__value">{{ kpi.value }}</span>
          <span class="kpi__label">{{ kpi.label }}</span>
        </div>
      }
    </div>

    <div class="columns">
      <section class="card">
        <div class="card__header">
          <h2>Últimas movimentações</h2>
          <a routerLink="/movimentacoes">Ver histórico</a>
        </div>
        <div class="table-wrapper">
          <table>
            <tbody>
              @for (m of recent(); track m.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/estoque', m.assetId]" class="mono">{{ m.asset?.assetTag }}</a>
                    <div class="muted">{{ m.asset?.manufacturer }} {{ m.asset?.model }}</div>
                  </td>
                  <td>{{ movementLabel(m) }}</td>
                  <td class="muted">{{ target(m) }}</td>
                  <td class="muted nowrap">{{ m.createdAt | date: 'dd/MM/yy HH:mm' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td class="empty">Nenhuma movimentação registrada ainda</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <div class="card__header">
          <h2>Precisam de atenção</h2>
        </div>
        <div class="table-wrapper">
          <table>
            <tbody>
              @for (a of attention(); track a.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/estoque', a.id]" class="mono">{{ a.assetTag }}</a>
                    <div class="muted">{{ a.manufacturer }} {{ a.model }}</div>
                  </td>
                  <td><app-status-badge [status]="a.status" /></td>
                  <td class="muted">{{ reason(a) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td class="empty">Nada pendente — bom sinal</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .kpis {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 14px;
        margin-bottom: 20px;
      }

      .kpi {
        padding: 16px 18px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .kpi__value {
        font-size: 26px;
        font-weight: 600;
        letter-spacing: -0.02em;
        color: var(--graphite-900);
      }

      .kpi__label {
        font-size: 12.5px;
        color: var(--graphite-500);
      }

      .columns {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 16px;
        align-items: start;
      }

      .nowrap {
        white-space: nowrap;
      }

      @media (max-width: 1000px) {
        .columns {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DashboardComponent {
  private readonly api = inject(ApiService);

  readonly summary = signal<DashboardSummary | null>(null);
  readonly recent = signal<Movement[]>([]);
  readonly attention = signal<Asset[]>([]);

  constructor() {
    this.api.dashboardSummary().subscribe((s) => this.summary.set(s));
    this.api.dashboardRecent().subscribe((m) => this.recent.set(m));
    this.api.dashboardAttention().subscribe((a) => this.attention.set(a));
  }

  kpis(): { label: string; value: number }[] {
    const s = this.summary();

    return [
      { label: 'Total de dispositivos', value: s?.total ?? 0 },
      { label: STATUS_LABEL.AVAILABLE, value: s?.byStatus.AVAILABLE ?? 0 },
      { label: STATUS_LABEL.ASSIGNED, value: s?.byStatus.ASSIGNED ?? 0 },
      { label: STATUS_LABEL.MAINTENANCE, value: s?.byStatus.MAINTENANCE ?? 0 },
      { label: STATUS_LABEL.RESERVED, value: s?.byStatus.RESERVED ?? 0 },
      {
        label: 'Retirados / descartados',
        value: (s?.byStatus.RETIRED ?? 0) + (s?.byStatus.DISPOSED ?? 0),
      },
    ];
  }

  movementLabel(m: Movement): string {
    return MOVEMENT_LABEL[m.type];
  }

  target(m: Movement): string {
    return m.toEmployee?.name ?? m.fromEmployee?.name ?? m.sector?.name ?? '—';
  }

  reason(a: Asset): string {
    if (a.status === 'MAINTENANCE') return 'Em manutenção';
    if (a.condition === 'DAMAGED' || a.condition === 'INOPERATIVE') return 'Estado físico crítico';
    if (!a.currentEmployee) return 'Em uso sem responsável';
    return 'Em uso sem setor';
  }
}
