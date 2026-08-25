import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthUser, LoginResponse, Role } from '../models';

const ACCESS_KEY = 'tiw.access';
const REFRESH_KEY = 'tiw.refresh';
const USER_KEY = 'tiw.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _user = signal<AuthUser | null>(this.readUser());

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly role = computed<Role | null>(() => this._user()?.role ?? null);
  /** Perfis que podem registrar movimentações. */
  readonly canOperate = computed(() => {
    const role = this.role();
    return role === 'ADMIN' || role === 'OPERATOR';
  });
  readonly isAdmin = computed(() => this.role() === 'ADMIN');

  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>('/api/auth/login', { email, password })
      .pipe(tap((res) => this.persist(res)));
  }

  refresh(): Observable<Omit<LoginResponse, 'user'>> {
    return this.http
      .post<Omit<LoginResponse, 'user'>>('/api/auth/refresh', {
        refreshToken: this.refreshToken,
      })
      .pipe(
        tap((res) => {
          localStorage.setItem(ACCESS_KEY, res.accessToken);
          localStorage.setItem(REFRESH_KEY, res.refreshToken);
        }),
      );
  }

  logout(navigate = true): void {
    const token = this.refreshToken;

    if (token) {
      // Best-effort: mesmo que a chamada falhe, a sessão local é encerrada.
      this.http.post('/api/auth/logout', { refreshToken: token }).subscribe({
        error: () => undefined,
      });
    }

    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);

    if (navigate) {
      void this.router.navigate(['/login']);
    }
  }

  private persist(res: LoginResponse): void {
    localStorage.setItem(ACCESS_KEY, res.accessToken);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this._user.set(res.user);
  }

  private readUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}
