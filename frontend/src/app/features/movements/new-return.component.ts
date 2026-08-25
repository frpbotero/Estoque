import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Asset, AssetCondition, AssetStatus, CONDITION_LABEL } from '../../core/models';

@Component({
  selector: 'app-new-return',
  standalone: true,
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Nova devolução</h1>
        <p>Equipamento em uso que retorna ao TI</p>
      </div>
    </div>

    @if (error()) {
      <div class="alert alert--error">{{ error() }}</div>
    }

    <div class="columns">
      <section class="card">
        <div class="card__header"><h2>1. Identifique o equipamento</h2></div>
        <div class="card__body">
          <div class="field">
            <label>Patrimônio, número de série ou modelo</label>
            <input type="search" [(ngModel)]="term" (keyup.enter)="search()" />
          </div>
          <button class="btn" (click)="search()">Buscar</button>

          <div class="results">
            @for (a of results(); track a.id) {
              <button class="result" [class.result--on]="selected()?.id === a.id" (click)="select(a)">
                <span class="mono">{{ a.assetTag }}</span>
                <span>
                  {{ a.manufacturer }} {{ a.model }}
                  <em class="muted">com {{ a.currentEmployee?.name ?? 'sem responsável' }}</em>
                </span>
              </button>
            } @empty {
              <p class="muted">Nenhum equipamento em uso encontrado.</p>
            }
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card__header"><h2>2. Dados da devolução</h2></div>
        <div class="card__body">
          @if (selected(); as asset) {
            <div class="selected">
              <strong class="mono">{{ asset.assetTag }}</strong>
              <span>{{ asset.manufacturer }} {{ asset.model }}</span>
            </div>

            <div class="info-line">
              <span class="muted">Devolvido por</span>
              <strong>{{ asset.currentEmployee?.name ?? 'Responsável não registrado' }}</strong>
            </div>
            <div class="info-line">
              <span class="muted">Setor</span>
              <strong>{{ asset.currentSector?.name ?? '—' }}</strong>
            </div>

            <div class="field">
              <label>Estado do equipamento <span class="req">*</span></label>
              <select [(ngModel)]="condition">
                @for (c of conditions; track c) {
                  <option [value]="c">{{ conditionLabel(c) }}</option>
                }
              </select>
            </div>

            <div class="field">
              <label>Destino após a devolução <span class="req">*</span></label>
              <select [(ngModel)]="destination">
                <option value="AVAILABLE">Disponível no estoque</option>
                <option value="MAINTENANCE">Manutenção</option>
                <option value="DISPOSED">Descarte</option>
              </select>
            </div>

            <div class="field">
              <label>Observação</label>
              <textarea [(ngModel)]="notes" placeholder="Carregador entregue junto com o equipamento"></textarea>
            </div>

            <div class="row">
              <button
                class="btn btn--primary"
                [disabled]="!asset.currentEmployee || saving()"
                (click)="submit()"
              >
                {{ saving() ? 'Registrando...' : 'Confirmar devolução' }}
              </button>
              <a class="btn" routerLink="/estoque">Cancelar</a>
            </div>

            @if (!asset.currentEmployee) {
              <p class="muted">
                Este equipamento está em uso sem responsável registrado — corrija o cadastro antes
                de devolver.
              </p>
            }
          } @else {
            <p class="muted">Selecione um equipamento ao lado para continuar.</p>
          }
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        align-items: start;
      }

      .results {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 16px;
      }

      .result {
        display: grid;
        grid-template-columns: 110px 1fr;
        gap: 10px;
        align-items: center;
        padding: 10px 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--surface);
        font: inherit;
        text-align: left;
        cursor: pointer;
      }

      .result:hover {
        background: var(--surface-muted);
      }

      .result--on {
        border-color: var(--accent);
        background: var(--accent-soft);
      }

      .result em {
        font-style: normal;
        margin-left: 6px;
      }

      .selected {
        display: flex;
        gap: 10px;
        align-items: baseline;
        padding: 10px 12px;
        margin-bottom: 14px;
        border-radius: var(--radius-sm);
        background: var(--surface-muted);
      }

      .info-line {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        border-bottom: 1px dashed var(--border);
        margin-bottom: 6px;
      }

      @media (max-width: 900px) {
        .columns {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class NewReturnComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly conditions: AssetCondition[] = [
    'EXCELLENT',
    'GOOD',
    'FAIR',
    'DAMAGED',
    'INOPERATIVE',
    'NEW',
  ];

  term = '';
  condition: AssetCondition = 'GOOD';
  destination: AssetStatus = 'AVAILABLE';
  notes = '';

  readonly results = signal<Asset[]>([]);
  readonly selected = signal<Asset | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.search();
  }

  conditionLabel(condition: AssetCondition): string {
    return CONDITION_LABEL[condition];
  }

  search(): void {
    this.api
      .listAssets({ status: 'ASSIGNED', search: this.term || undefined, pageSize: 15 })
      .subscribe((r) => this.results.set(r.data));
  }

  select(asset: Asset): void {
    this.selected.set(asset);
    this.error.set(null);
  }

  submit(): void {
    const asset = this.selected();
    if (!asset?.currentEmployee) return;

    this.saving.set(true);
    this.error.set(null);

    this.api
      .return({
        assetId: asset.id,
        fromEmployeeId: asset.currentEmployee.id,
        condition: this.condition,
        destination: this.destination,
        notes: this.notes || undefined,
      })
      .subscribe({
        next: () => void this.router.navigate(['/estoque', asset.id]),
        error: (err: { error?: { message?: string } }) => {
          this.saving.set(false);
          this.error.set(err?.error?.message ?? 'Não foi possível registrar a devolução');
        },
      });
  }
}
