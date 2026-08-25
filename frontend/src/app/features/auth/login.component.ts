import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login">
      <form class="card login__card" [formGroup]="form" (ngSubmit)="submit()">
        <div class="login__brand">
          <span class="login__mark">TI</span>
          <div>
            <strong>ELDORADO</strong>
            <small>Warehouse de TI</small>
          </div>
        </div>

        @if (error()) {
          <div class="alert alert--error">{{ error() }}</div>
        }

        <div class="field">
          <label for="email">E-mail</label>
          <input id="email" type="email" formControlName="email" autocomplete="username" />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <span class="field__error">Informe um e-mail válido</span>
          }
        </div>

        <div class="field">
          <label for="password">Senha</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            autocomplete="current-password"
          />
        </div>

        <button class="btn btn--primary login__submit" type="submit" [disabled]="loading()">
          {{ loading() ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
    </div>
  `,
  styles: [
    `
      .login {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: var(--surface-muted);
      }

      .login__card {
        width: 100%;
        max-width: 380px;
        padding: 28px;
      }

      .login__brand {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 24px;
      }

      .login__mark {
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: 8px;
        background: var(--accent);
        color: #fff;
        font-weight: 700;
      }

      .login__brand strong {
        display: block;
        letter-spacing: 0.08em;
        font-size: 14px;
      }

      .login__brand small {
        color: var(--graphite-500);
      }

      .login__submit {
        width: 100%;
        margin-top: 6px;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: () => {
        const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/dashboard';
        void this.router.navigateByUrl(redirect);
      },
      error: (err: { error?: { message?: string } }) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Não foi possível entrar. Tente novamente.');
      },
    });
  }
}
