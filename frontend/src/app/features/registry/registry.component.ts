import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { Category, Employee, Sector } from '../../core/models';

type Tab = 'sectors' | 'categories' | 'employees';

@Component({
  selector: 'app-registry',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Cadastros</h1>
        <p>Setores, categorias e colaboradores</p>
      </div>
    </div>

    <div class="tabs">
      <button class="tab" [class.tab--on]="tab() === 'sectors'" (click)="tab.set('sectors')">Setores</button>
      <button class="tab" [class.tab--on]="tab() === 'categories'" (click)="tab.set('categories')">Categorias</button>
      <button class="tab" [class.tab--on]="tab() === 'employees'" (click)="tab.set('employees')">Colaboradores</button>
    </div>

    @if (error()) {
      <div class="alert alert--error">{{ error() }}</div>
    }

    @switch (tab()) {
      @case ('sectors') {
        <div class="card">
          @if (auth.canOperate()) {
            <div class="card__header">
              <input [(ngModel)]="newSector" placeholder="Nome do setor" (keyup.enter)="addSector()" />
              <button class="btn btn--primary" (click)="addSector()">Adicionar</button>
            </div>
          }
          <div class="table-wrapper">
            <table>
              <thead>
                <tr><th>Setor</th><th>Situação</th></tr>
              </thead>
              <tbody>
                @for (s of sectors(); track s.id) {
                  <tr>
                    <td>{{ s.name }}</td>
                    <td>{{ s.active ? 'Ativo' : 'Inativo' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="2" class="empty">Nenhum setor cadastrado</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @case ('categories') {
        <div class="card">
          @if (auth.canOperate()) {
            <div class="card__header">
              <input [(ngModel)]="newCategory" placeholder="Nome da categoria" (keyup.enter)="addCategory()" />
              <button class="btn btn--primary" (click)="addCategory()">Adicionar</button>
            </div>
          }
          <div class="table-wrapper">
            <table>
              <thead>
                <tr><th>Categoria</th><th>Situação</th></tr>
              </thead>
              <tbody>
                @for (c of categories(); track c.id) {
                  <tr>
                    <td>{{ c.name }}</td>
                    <td>{{ c.active ? 'Ativa' : 'Inativa' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="2" class="empty">Nenhuma categoria cadastrada</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @case ('employees') {
        <div class="card">
          @if (auth.canOperate()) {
            <div class="card__body employee-form">
              <div class="field">
                <label>Nome <span class="req">*</span></label>
                <input [(ngModel)]="newEmployee.name" />
              </div>
              <div class="field">
                <label>E-mail</label>
                <input type="email" [(ngModel)]="newEmployee.email" />
              </div>
              <div class="field">
                <label>Matrícula</label>
                <input [(ngModel)]="newEmployee.registration" />
              </div>
              <div class="field">
                <label>Setor <span class="req">*</span></label>
                <select [(ngModel)]="newEmployee.sectorId">
                  <option value="">Selecione...</option>
                  @for (s of sectors(); track s.id) {
                    <option [value]="s.id">{{ s.name }}</option>
                  }
                </select>
              </div>
              <button class="btn btn--primary" (click)="addEmployee()">Adicionar colaborador</button>
            </div>
          }
          <div class="table-wrapper">
            <table>
              <thead>
                <tr><th>Nome</th><th>Setor</th><th>E-mail</th><th>Matrícula</th></tr>
              </thead>
              <tbody>
                @for (e of employees(); track e.id) {
                  <tr>
                    <td>{{ e.name }}</td>
                    <td>{{ e.sector?.name }}</td>
                    <td class="muted">{{ e.email ?? '—' }}</td>
                    <td class="muted mono">{{ e.registration ?? '—' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="empty">Nenhum colaborador cadastrado</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    }
  `,
  styles: [
    `
      .tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 16px;
        border-bottom: 1px solid var(--border);
      }

      .tab {
        padding: 9px 14px;
        border: none;
        background: none;
        font: inherit;
        font-weight: 500;
        color: var(--graphite-500);
        cursor: pointer;
        border-bottom: 2px solid transparent;
      }

      .tab--on {
        color: var(--graphite-900);
        border-bottom-color: var(--accent);
      }

      .employee-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        gap: 0 14px;
        align-items: end;
      }

      .employee-form .btn {
        margin-bottom: 14px;
      }

      .card__header input {
        max-width: 320px;
      }
    `,
  ],
})
export class RegistryComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly tab = signal<Tab>('sectors');
  readonly sectors = signal<Sector[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly employees = signal<Employee[]>([]);
  readonly error = signal<string | null>(null);

  newSector = '';
  newCategory = '';
  newEmployee = { name: '', email: '', registration: '', sectorId: '' };

  constructor() {
    this.loadAll();
  }

  private loadAll(): void {
    this.api.listSectors({ pageSize: 100 }).subscribe((r) => this.sectors.set(r.data));
    this.api.listCategories({ pageSize: 100 }).subscribe((r) => this.categories.set(r.data));
    this.api.listEmployees({ pageSize: 100 }).subscribe((r) => this.employees.set(r.data));
  }

  addSector(): void {
    if (!this.newSector.trim()) return;

    this.api.createSector(this.newSector.trim()).subscribe({
      next: () => {
        this.newSector = '';
        this.error.set(null);
        this.loadAll();
      },
      error: (err: { error?: { message?: string } }) =>
        this.error.set(err?.error?.message ?? 'Falha ao criar o setor'),
    });
  }

  addCategory(): void {
    if (!this.newCategory.trim()) return;

    this.api.createCategory(this.newCategory.trim()).subscribe({
      next: () => {
        this.newCategory = '';
        this.error.set(null);
        this.loadAll();
      },
      error: (err: { error?: { message?: string } }) =>
        this.error.set(err?.error?.message ?? 'Falha ao criar a categoria'),
    });
  }

  addEmployee(): void {
    const { name, sectorId } = this.newEmployee;
    if (!name.trim() || !sectorId) {
      this.error.set('Nome e setor são obrigatórios');
      return;
    }

    this.api
      .createEmployee({
        name: name.trim(),
        email: this.newEmployee.email || undefined,
        registration: this.newEmployee.registration || undefined,
        sectorId,
      })
      .subscribe({
        next: () => {
          this.newEmployee = { name: '', email: '', registration: '', sectorId: '' };
          this.error.set(null);
          this.loadAll();
        },
        error: (err: { error?: { message?: string } }) =>
          this.error.set(err?.error?.message ?? 'Falha ao criar o colaborador'),
      });
  }
}
