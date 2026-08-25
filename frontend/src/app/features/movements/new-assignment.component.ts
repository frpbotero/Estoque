import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Asset, Employee, Sector } from '../../core/models';

@Component({
  selector: 'app-new-assignment',
  standalone: true,
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Nova entrega</h1>
        <p>Entrega de equipamento disponível a um colaborador</p>
      </div>
    </div>

    @if (error()) {
      <div class="alert alert--error">{{ error() }}</div>
    }

    <div class="columns">
      <section class="card">
        <div class="card__header"><h2>1. Escolha o equipamento</h2></div>
        <div class="card__body">
          <div class="field">
            <label>Buscar no estoque disponível</label>
            <input
              type="search"
              placeholder="Patrimônio, serial ou modelo"
              [(ngModel)]="term"
              (keyup.enter)="search()"
            />
          </div>
          <button class="btn" (click)="search()">Buscar</button>

          <div class="results">
            @for (a of results(); track a.id) {
              <button class="result" [class.result--on]="selected()?.id === a.id" (click)="select(a)">
                <span class="mono">{{ a.assetTag }}</span>
                <span>{{ a.manufacturer }} {{ a.model }}</span>
                <span class="muted mono">{{ a.serialNumber }}</span>
              </button>
            } @empty {
              <p class="muted">Nenhum equipamento disponível encontrado.</p>
            }
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card__header"><h2>2. Dados da entrega</h2></div>
        <div class="card__body">
          @if (selected(); as asset) {
            <div class="selected">
              <strong class="mono">{{ asset.assetTag }}</strong>
              <span>{{ asset.manufacturer }} {{ asset.model }}</span>
            </div>

            <div class="field">
              <label>Entregue para <span class="req">*</span></label>
              <select [(ngModel)]="employeeId" (change)="syncSector()">
                <option value="">Selecione o colaborador...</option>
                @for (e of employees(); track e.id) {
                  <option [value]="e.id">{{ e.name }} — {{ e.sector?.name }}</option>
                }
              </select>
            </div>

            <div class="field">
              <label>Setor <span class="req">*</span></label>
              <select [(ngModel)]="sectorId">
                <option value="">Selecione...</option>
                @for (s of sectors(); track s.id) {
                  <option [value]="s.id">{{ s.name }}</option>
                }
              </select>
            </div>

            <div class="field">
              <label>Observação</label>
              <textarea [(ngModel)]="notes" placeholder="Carregador e mochila entregues junto"></textarea>
            </div>

            <div class="row">
              <button class="btn btn--primary" [disabled]="!canSubmit() || saving()" (click)="submit()">
                {{ saving() ? 'Registrando...' : 'Confirmar entrega' }}
              </button>
              <a class="btn" routerLink="/estoque">Cancelar</a>
            </div>
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
        grid-template-columns: 110px 1fr auto;
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

      .selected {
        display: flex;
        gap: 10px;
        align-items: baseline;
        padding: 10px 12px;
        margin-bottom: 16px;
        border-radius: var(--radius-sm);
        background: var(--surface-muted);
      }

      @media (max-width: 900px) {
        .columns {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class NewAssignmentComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  term = '';
  employeeId = '';
  sectorId = '';
  notes = '';

  readonly results = signal<Asset[]>([]);
  readonly selected = signal<Asset | null>(null);
  readonly employees = signal<Employee[]>([]);
  readonly sectors = signal<Sector[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.api.listEmployees({ pageSize: 200 }).subscribe((r) => this.employees.set(r.data));
    this.api.listSectors({ pageSize: 100 }).subscribe((r) => this.sectors.set(r.data));
    this.search();
  }

  search(): void {
    this.api
      .listAssets({ status: 'AVAILABLE', search: this.term || undefined, pageSize: 15 })
      .subscribe((r) => this.results.set(r.data));
  }

  select(asset: Asset): void {
    this.selected.set(asset);
    this.error.set(null);
  }

  /** Preenche o setor com o do colaborador — na prática é quase sempre o mesmo. */
  syncSector(): void {
    const employee = this.employees().find((e) => e.id === this.employeeId);
    if (employee) {
      this.sectorId = employee.sectorId;
    }
  }

  canSubmit(): boolean {
    return !!this.selected() && !!this.employeeId && !!this.sectorId;
  }

  submit(): void {
    const asset = this.selected();
    if (!asset || !this.canSubmit()) return;

    this.saving.set(true);
    this.error.set(null);

    this.api
      .assign({
        assetId: asset.id,
        toEmployeeId: this.employeeId,
        sectorId: this.sectorId,
        notes: this.notes || undefined,
      })
      .subscribe({
        next: () => void this.router.navigate(['/estoque', asset.id]),
        error: (err: { error?: { message?: string } }) => {
          this.saving.set(false);
          this.error.set(err?.error?.message ?? 'Não foi possível registrar a entrega');
        },
      });
  }
}
