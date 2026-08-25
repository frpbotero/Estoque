import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// Compartilhado entre requisições concorrentes: apenas um refresh por vez.
let refreshing = false;
const refreshed$ = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const isAuthRoute = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/refresh');
  const token = auth.accessToken;

  const authorized =
    token && !isAuthRoute
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthRoute) {
        return throwError(() => error);
      }

      if (!auth.refreshToken) {
        auth.logout();
        return throwError(() => error);
      }

      if (refreshing) {
        return refreshed$.pipe(
          filter((t): t is string => t !== null),
          take(1),
          switchMap((fresh) =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${fresh}` } })),
          ),
        );
      }

      refreshing = true;
      refreshed$.next(null);

      return auth.refresh().pipe(
        switchMap((res) => {
          refreshing = false;
          refreshed$.next(res.accessToken);
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${res.accessToken}` } }));
        }),
        catchError((refreshError: unknown) => {
          refreshing = false;
          auth.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
