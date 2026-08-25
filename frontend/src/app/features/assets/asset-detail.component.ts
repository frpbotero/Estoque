import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  Asset,
  CONDITION_LABEL,
  MOVEMENT_LABEL,
  Movement,
  STATUS_LABEL,
} from '../../core/models';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-asset-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (asset(); as a) {
      <div class="page-header">
        <div>
          <h1>{{ a.manufacturer }} {{ a.model }}</h1>
          <p class="mono">{{ a.assetTag }} · {{ a.serialNumber }}</p>
        </div>
        <div class="row">
          <app-status-badge [status]="a.status" />
          <a class="btn" routerLink="/estoque">Voltar ao estoque</a>
        </div>
      </div>

      <div class="columns">
        <div class="stack">
          <section class="card">
            <div class="card__header"><h2>Informações</h2></div>
            <div class="card__body info">
              <div><span>Categoria</span><strong>{{ a.category?.name ?? '—' }}</strong></div>
              <div><span>Estado físico</span><strong>{{ conditionLabel(a) }}</strong></div>
              <div><span>Status</span><strong>{{ statusLabel(a) }}</strong></div>
              <div><span>Localização</span><strong>{{ a.location ?? '—' }}</strong></div>
              <div><span>Cadastrado em</span><strong>{{ a.createdAt | date: 'dd/MM/yyyy' }}</strong></div>
              <div><span>Descrição</span><strong>{{ a.description ?? '—' }}</strong></div>
            </div>
          </section>

          <section class="card">
            <div class="card__header"><h2>Responsabilidade atual</h2></div>
            <div class="card__body info">
              <div><span>Colaborador</span><strong>{{ a.currentEmployee?.name ?? 'Sem responsável' }}</strong></div>
              <div><span>Setor</span><strong>{{ a.currentSector?.name ?? '—' }}</strong></div>
            </div>
          </section>

          @if (auth.canOperate()) {
            <section class="card">
              <div class="card__header"><h2>Ações</h2></div>
              <div class="card__body row">
                @if (a.status === 'AVAILABLE') {
                  <a class="btn btn--primary" routerLink="/movimentacoes/entrega">Entregar</a>
                }
                @if (a.status === 'ASSIGNED') {
                  <a class="btn btn--primary" routerLink="/movimentacoes/devolucao">
                    Registrar devolução
                  </a>
                }
                @if (a.status === 'AVAILABLE' || a.status === 'ASSIGNED') {
                  <button class="btn" (click)="sendToMaintenance()">Enviar para manutenção</button>
                }
                @if (a.status === 'MAINTENANCE') {
                  <button class="btn" (click)="returnFromMaintenance()">Retornar ao estoque</button>
                }
              </div>
              @if (actionError()) {
                <div class="card__body"><div class="alert alert--error">{{ actionError() }}</div></div>
              }
            </section>
          }
        </div>

        <section class="card">
          <div class="card__header"><h2>Histórico</h2></div>
          <div class="card__body">
            <ol class="timeline">
              @for (m of timeline(); track m.id) {
                <li>
                  <span class="timeline__dot"></span>
                  <div class="timeline__body">
                    <div class="timeline__title">{{ movementLabel(m) }}</div>
                    <div class="muted">{{ describe(m) }}</div>
                    @if (m.notes) {
                      <div class="muted">{{ m.notes }}</div>
                    }
                    <div class="timeline__meta">
                      {{ m.createdAt | date: 'dd/MM/yyyy HH:mm' }} · por {{ m.performedBy?.name }}
                    </div>
                  </div>
                </li>
              } @empty {
                <li class="empty">Sem movimentações registradas</li>
              }
            </ol>
          </div>
        </section>
      </div>
    }
  `,
  styles: [
    `
      .columns {
        display: grid;
        grid-template-columns: 1fr 1.1fr;
        gap: 16px;
        align-items: start;
      }

      .info {
        display: grid;
        gap: 12px;
      }

      .info > div {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 1px dashed var(--border);
        padding-bottom: 8px;
      }

      .info > div:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }

      .info span {
        color: var(--graphite-500);
        font-size: 12.5px;
      }

      .info strong {
        font-weight: 500;
        text-align: right;
      }

      .timeline {
        list-style: none;
        margin: 0;
        padding: 0 0 0 18px;
        border-left: 2px solid var(--border);
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .timeline li {
        position: relative;
      }

      .timeline__dot {
        position: absolute;
        left: -25px;
        top: 4px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--accent);
        border: 2px solid var(--surface);
      }

      .timeline__title {
        font-weight: 600;
      }

      .timeline__meta {
        margin-top: 4px;
        font-size: 12px;
        color: var(--graphite-400);
      }

      @media (max-width: 1000px) {
        .columns {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AssetDetailComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  /** Vem de withComponentInputBinding() — rota /estoque/:id */
  readonly id = input.required<string>();

  readonly asset = signal<Asset | null>(null);
  readonly timeline = signal<Movement[]>([]);
  readonly actionError = signal<string | null>(null);

  constructor() {
    queueMicrotask(() => this.load());
  }

  private load(): void {
    this.api.getAsset(this.id()).subscribe((a) => this.asset.set(a));
    this.api.getAssetTimeline(this.id()).subscribe((t) => this.timeline.set(t));
  }

  statusLabel(a: Asset): string {
    return STATUS_LABEL[a.status];
  }

  conditionLabel(a: Asset): string {
    return CONDITION_LABEL[a.condition];
  }

  movementLabel(m: Movement): string {
    return MOVEMENT_LABEL[m.type];
  }

  describe(m: Movement): string {
    const parts: string[] = [];

    if (m.toEmployee) parts.push(`Para ${m.toEmployee.name}`);
    if (m.fromEmployee) parts.push(`De ${m.fromEmployee.name}`);
    if (m.sector) parts.push(m.sector.name);
    if (m.condition) parts.push(`Estado: ${CONDITION_LABEL[m.condition]}`);

    return parts.join(' · ') || STATUS_LABEL[m.statusAfter];
  }

  sendToMaintenance(): void {
    this.run({ assetId: this.id(), type: 'MAINTENANCE' as const });
  }

  returnFromMaintenance(): void {
    this.run({ assetId: this.id(), type: 'MAINTENANCE_RETURN' as const, destination: 'AVAILABLE' as const });
  }

  private run(body: Parameters<ApiService['changeStatus']>[0]): void {
    this.actionError.set(null);

    this.api.changeStatus(body).subscribe({
      next: () => this.load(),
      error: (err: { error?: { message?: string } }) =>
        this.actionError.set(err?.error?.message ?? 'Não foi possível registrar a movimentação'),
    });
  }
}
