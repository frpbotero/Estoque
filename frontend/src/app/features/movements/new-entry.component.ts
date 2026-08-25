import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AssetCondition, CONDITION_LABEL, Category, Sector } from '../../core/models';

@Component({
  selector: 'app-new-entry',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Nova entrada</h1>
        <p>Qual a origem da entrada?</p>
      </div>
    </div>

    <div class="origin">
      <button class="card origin__option" [class.origin__option--on]="origin() === 'purchase'" (click)="origin.set('purchase')">
        <strong>Compra</strong>
        <span class="muted">Equipamentos novos recebidos com nota fiscal</span>
      </button>
      <a class="card origin__option" routerLink="/movimentacoes/devolucao">
        <strong>Devolução</strong>
        <span class="muted">Equipamento que já pertence à empresa e retornou ao TI</span>
      </a>
    </div>

    @if (origin() === 'purchase') {
      <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
        @if (error()) {
          <div class="alert alert--error">{{ error() }}</div>
        }

        <section class="card">
          <div class="card__header"><h2>Nota fiscal</h2></div>
          <div class="card__body" formGroupName="invoice">
            <div class="grid">
              <div class="field">
                <label>Número da NF <span class="req">*</span></label>
                <input formControlName="number" />
              </div>
              <div class="field">
                <label>Série</label>
                <input formControlName="series" />
              </div>
              <div class="field">
                <label>Data de emissão <span class="req">*</span></label>
                <input type="date" formControlName="issueDate" />
              </div>
              <div class="field">
                <label>Fornecedor <span class="req">*</span></label>
                <input formControlName="supplier" />
              </div>
              <div class="field">
                <label>CNPJ do fornecedor</label>
                <input formControlName="supplierDocument" />
              </div>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card__header"><h2>Recebimento</h2></div>
          <div class="card__body">
            <div class="grid">
              <div class="field">
                <label>Setor solicitante <span class="req">*</span></label>
                <select formControlName="sectorId">
                  <option value="">Selecione...</option>
                  @for (s of sectors(); track s.id) {
                    <option [value]="s.id">{{ s.name }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="field">
              <label>Observação</label>
              <textarea formControlName="notes"></textarea>
            </div>
            <p class="muted">
              O responsável pelo recebimento é o usuário autenticado e fica registrado
              automaticamente na movimentação.
            </p>
          </div>
        </section>

        <section class="card">
          <div class="card__header">
            <h2>Equipamentos da nota ({{ items.length }})</h2>
            <button type="button" class="btn btn--sm" (click)="addItem()">Adicionar item</button>
          </div>
          <div class="card__body stack">
            @for (item of itemGroups(); track $index) {
              <div class="item" [formGroup]="item">
                <div class="item__head">
                  <strong>Item {{ $index + 1 }}</strong>
                  <button
                    type="button"
                    class="btn btn--sm btn--danger"
                    [disabled]="items.length === 1"
                    (click)="removeItem($index)"
                  >
                    Remover
                  </button>
                </div>
                <div class="grid">
                  <div class="field">
                    <label>Patrimônio <span class="req">*</span></label>
                    <input formControlName="assetTag" placeholder="ELD-000234" />
                  </div>
                  <div class="field">
                    <label>Número de série <span class="req">*</span></label>
                    <input formControlName="serialNumber" />
                  </div>
                  <div class="field">
                    <label>Categoria <span class="req">*</span></label>
                    <select formControlName="categoryId">
                      <option value="">Selecione...</option>
                      @for (c of categories(); track c.id) {
                        <option [value]="c.id">{{ c.name }}</option>
                      }
                    </select>
                  </div>
                  <div class="field">
                    <label>Fabricante <span class="req">*</span></label>
                    <input formControlName="manufacturer" />
                  </div>
                  <div class="field">
                    <label>Modelo <span class="req">*</span></label>
                    <input formControlName="model" />
                  </div>
                  <div class="field">
                    <label>Estado físico</label>
                    <select formControlName="condition">
                      @for (c of conditions; track c) {
                        <option [value]="c">{{ conditionLabel(c) }}</option>
                      }
                    </select>
                  </div>
                  <div class="field">
                    <label>Localização</label>
                    <input formControlName="location" placeholder="Almoxarifado TI" />
                  </div>
                  <div class="field">
                    <label>Valor unitário</label>
                    <input type="number" step="0.01" min="0" formControlName="unitCost" />
                  </div>
                </div>
              </div>
            }
          </div>
        </section>

        <div class="row">
          <button class="btn btn--primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Registrando...' : 'Confirmar entrada' }}
          </button>
          <a class="btn" routerLink="/estoque">Cancelar</a>
        </div>
      </form>
    }
  `,
  styles: [
    `
      .origin {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 14px;
        margin-bottom: 22px;
      }

      .origin__option {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 18px;
        text-align: left;
        font: inherit;
        color: inherit;
        cursor: pointer;
      }

      .origin__option strong {
        font-size: 15px;
      }

      .origin__option--on {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }

      .item {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 14px;
        background: var(--surface-muted);
      }

      .item__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
    `,
  ],
})
export class NewEntryComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly conditions: AssetCondition[] = [
    'NEW',
    'EXCELLENT',
    'GOOD',
    'FAIR',
    'DAMAGED',
    'INOPERATIVE',
  ];

  readonly origin = signal<'purchase' | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly sectors = signal<Sector[]>([]);
  readonly categories = signal<Category[]>([]);

  readonly form = this.fb.group({
    invoice: this.fb.group({
      number: ['', Validators.required],
      series: [''],
      supplier: ['', Validators.required],
      supplierDocument: [''],
      issueDate: ['', Validators.required],
    }),
    sectorId: ['', Validators.required],
    notes: [''],
    items: this.fb.array([this.buildItem()]),
  });

  constructor() {
    this.api.listSectors({ pageSize: 100 }).subscribe((r) => this.sectors.set(r.data));
    this.api.listCategories({ pageSize: 100 }).subscribe((r) => this.categories.set(r.data));
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  /** O template precisa de FormGroup tipado — controls devolve AbstractControl. */
  itemGroups(): FormGroup[] {
    return this.items.controls as FormGroup[];
  }

  conditionLabel(condition: AssetCondition): string {
    return CONDITION_LABEL[condition];
  }

  addItem(): void {
    this.items.push(this.buildItem());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Preencha todos os campos obrigatórios');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue() as {
      invoice: Record<string, string>;
      sectorId: string;
      notes: string;
      items: Record<string, string | number | null>[];
    };

    const payload = {
      invoice: {
        number: raw.invoice['number'],
        series: raw.invoice['series'] || undefined,
        supplier: raw.invoice['supplier'],
        supplierDocument: raw.invoice['supplierDocument'] || undefined,
        issueDate: raw.invoice['issueDate'],
      },
      sectorId: raw.sectorId,
      notes: raw.notes || undefined,
      items: raw.items.map((item) => ({
        assetTag: String(item['assetTag']),
        serialNumber: String(item['serialNumber']),
        categoryId: String(item['categoryId']),
        manufacturer: String(item['manufacturer']),
        model: String(item['model']),
        condition: item['condition'] as AssetCondition,
        location: item['location'] ? String(item['location']) : undefined,
        unitCost: item['unitCost'] != null && item['unitCost'] !== '' ? Number(item['unitCost']) : undefined,
      })),
    };

    this.api.createPurchase(payload).subscribe({
      next: () => void this.router.navigate(['/estoque']),
      error: (err: { error?: { message?: string | string[] } }) => {
        this.saving.set(false);
        const message = err?.error?.message;
        this.error.set(
          Array.isArray(message) ? message.join(' · ') : (message ?? 'Falha ao registrar a entrada'),
        );
      },
    });
  }

  private buildItem() {
    return this.fb.group({
      assetTag: ['', Validators.required],
      serialNumber: ['', Validators.required],
      categoryId: ['', Validators.required],
      manufacturer: ['', Validators.required],
      model: ['', Validators.required],
      condition: ['NEW'],
      location: [''],
      unitCost: [null as number | null],
    });
  }
}
