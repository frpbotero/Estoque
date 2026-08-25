import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ROLE_LABEL, Role, User } from '../../core/models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Usuários</h1>
        <p>Quem acessa o sistema e com qual perfil</p>
      </div>
    </div>

    @if (error()) {
      <div class="alert alert--error">{{ error() }}</div>
    }

    <div class="card">
      <div class="card__body user-form">
        <div class="field">
          <label>Nome <span class="req">*</span></label>
          <input [(ngModel)]="draft.name" />
        </div>
        <div class="field">
          <label>E-mail <span class="req">*</span></label>
          <input type="email" [(ngModel)]="draft.email" />
        </div>
        <div class="field">
          <label>Senha <span class="req">*</span></label>
          <input type="password" [(ngModel)]="draft.password" placeholder="mínimo 8 caracteres" />
        </div>
        <div class="field">
          <label>Perfil</label>
          <select [(ngModel)]="draft.role">
            @for (r of roles; track r) {
              <option [value]="r">{{ roleLabel(r) }}</option>
            }
          </select>
        </div>
        <button class="btn btn--primary" (click)="create()">Criar usuário</button>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th></th></tr>
          </thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr>
                <td>{{ u.name }}</td>
                <td class="muted">{{ u.email }}</td>
                <td>{{ roleLabel(u.role) }}</td>
                <td>{{ u.active ? 'Ativo' : 'Inativo' }}</td>
                <td>
                  @if (u.active) {
                    <button class="btn btn--sm btn--danger" (click)="deactivate(u)">Desativar</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty">Nenhum usuário</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .user-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 0 14px;
        align-items: end;
        border-bottom: 1px solid var(--border);
      }

      .user-form .btn {
        margin-bottom: 14px;
      }
    `,
  ],
})
export class UsersComponent {
  private readonly api = inject(ApiService);

  readonly roles: Role[] = ['ADMIN', 'OPERATOR', 'VIEWER'];
  readonly users = signal<User[]>([]);
  readonly error = signal<string | null>(null);

  draft = { name: '', email: '', password: '', role: 'OPERATOR' as Role };

  constructor() {
    this.load();
  }

  roleLabel(role: Role): string {
    return ROLE_LABEL[role];
  }

  private load(): void {
    this.api.listUsers({ pageSize: 100 }).subscribe((r) => this.users.set(r.data));
  }

  create(): void {
    if (!this.draft.name || !this.draft.email || this.draft.password.length < 8) {
      this.error.set('Nome, e-mail e senha com ao menos 8 caracteres são obrigatórios');
      return;
    }

    this.api.createUser(this.draft).subscribe({
      next: () => {
        this.draft = { name: '', email: '', password: '', role: 'OPERATOR' };
        this.error.set(null);
        this.load();
      },
      error: (err: { error?: { message?: string | string[] } }) => {
        const message = err?.error?.message;
        this.error.set(Array.isArray(message) ? message.join(' · ') : (message ?? 'Falha ao criar usuário'));
      },
    });
  }

  deactivate(user: User): void {
    this.api.deactivateUser(user.id).subscribe({
      next: () => this.load(),
      error: (err: { error?: { message?: string } }) =>
        this.error.set(err?.error?.message ?? 'Falha ao desativar o usuário'),
    });
  }
}
