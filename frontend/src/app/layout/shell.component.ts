import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { ROLE_LABEL } from '../core/models';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <aside class="sidebar" [class.sidebar--open]="menuOpen()">
        <div class="brand">
          <span class="brand__mark">TI</span>
          <span class="brand__text">
            <strong>ELDORADO</strong>
            <small>Warehouse</small>
          </span>
        </div>

        <nav>
          <a routerLink="/dashboard" routerLinkActive="active" (click)="closeMenu()">Dashboard</a>
          <a routerLink="/estoque" routerLinkActive="active" (click)="closeMenu()">Estoque</a>

          <span class="nav__group">Movimentações</span>
          @if (auth.canOperate()) {
            <a routerLink="/movimentacoes/entrada" routerLinkActive="active" (click)="closeMenu()">
              Nova entrada
            </a>
            <a routerLink="/movimentacoes/entrega" routerLinkActive="active" (click)="closeMenu()">
              Nova entrega
            </a>
            <a routerLink="/movimentacoes/devolucao" routerLinkActive="active" (click)="closeMenu()">
              Nova devolução
            </a>
          }
          <a routerLink="/movimentacoes" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeMenu()">
            Histórico
          </a>

          <span class="nav__group">Cadastros</span>
          <a routerLink="/cadastros" routerLinkActive="active" (click)="closeMenu()">
            Setores, categorias e colaboradores
          </a>

          @if (auth.isAdmin()) {
            <span class="nav__group">Administração</span>
            <a routerLink="/administracao/usuarios" routerLinkActive="active" (click)="closeMenu()">
              Usuários
            </a>
          }
        </nav>
      </aside>

      <div class="main">
        <header class="topbar">
          <button class="btn btn--ghost btn--sm menu-toggle" (click)="toggleMenu()" aria-label="Menu">
            ☰
          </button>
          <span class="spacer"></span>
          <div class="user">
            <span class="user__name">{{ auth.user()?.name }}</span>
            <span class="user__role">{{ roleLabel() }}</span>
          </div>
          <button class="btn btn--sm" (click)="auth.logout()">Sair</button>
        </header>

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .shell {
        display: flex;
        min-height: 100vh;
      }

      .sidebar {
        width: var(--sidebar-width);
        flex-shrink: 0;
        background: var(--graphite-900);
        color: #cfd4dd;
        display: flex;
        flex-direction: column;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        height: var(--topbar-height);
        padding: 0 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .brand__mark {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        background: var(--accent);
        color: #fff;
        font-size: 12px;
        font-weight: 700;
      }

      .brand__text {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
      }

      .brand__text strong {
        font-size: 13px;
        letter-spacing: 0.08em;
        color: #fff;
      }

      .brand__text small {
        font-size: 11px;
        color: var(--graphite-400);
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      nav {
        display: flex;
        flex-direction: column;
        padding: 12px 10px;
        gap: 1px;
        overflow-y: auto;
      }

      nav a {
        padding: 8px 12px;
        border-radius: var(--radius-sm);
        color: #cfd4dd;
        font-size: 13.5px;
        border-left: 2px solid transparent;
      }

      nav a:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #fff;
      }

      nav a.active {
        background: rgba(236, 102, 8, 0.14);
        border-left-color: var(--accent);
        color: #fff;
        font-weight: 500;
      }

      .nav__group {
        margin: 16px 12px 6px;
        font-size: 10.5px;
        font-weight: 600;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: var(--graphite-400);
      }

      .main {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }

      .topbar {
        display: flex;
        align-items: center;
        gap: 12px;
        height: var(--topbar-height);
        padding: 0 20px;
        background: var(--surface);
        border-bottom: 1px solid var(--border);
      }

      .user {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        line-height: 1.2;
      }

      .user__name {
        font-size: 13px;
        font-weight: 600;
      }

      .user__role {
        font-size: 11.5px;
        color: var(--graphite-500);
      }

      .content {
        flex: 1;
        padding: 24px;
        max-width: 1400px;
        width: 100%;
      }

      .menu-toggle {
        display: none;
        font-size: 16px;
      }

      @media (max-width: 900px) {
        .sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          z-index: 20;
          transform: translateX(-100%);
          transition: transform 0.18s ease;
        }

        .sidebar--open {
          transform: translateX(0);
        }

        .menu-toggle {
          display: inline-flex;
        }

        .content {
          padding: 16px;
        }
      }
    `,
  ],
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly menuOpen = signal(false);

  roleLabel(): string {
    const role = this.auth.role();
    return role ? ROLE_LABEL[role] : '';
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
