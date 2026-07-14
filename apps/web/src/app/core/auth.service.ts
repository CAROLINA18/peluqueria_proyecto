import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, shareReplay, tap } from 'rxjs';
import type { Locale, User } from './models';
import { I18nService } from './i18n.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private i18n = inject(I18nService);
  private refreshRequest?: Observable<boolean>;
  readonly user = signal<User | null>(null);
  readonly accessToken = signal<string | null>(null);

  login(email: string, password: string) {
    return this.http.post<{ accessToken: string; user: User }>('/api/v1/auth/login', { email, password }, { withCredentials: true }).pipe(tap((result) => this.accept(result)));
  }
  ensureSession() {
    if (this.user() && this.accessToken()) return of(true);
    if (!this.refreshRequest) {
      this.refreshRequest = this.http.post<{ accessToken: string; user: User }>('/api/v1/auth/refresh', {}, { withCredentials: true }).pipe(
        tap((result) => this.accept(result)), map(() => true), catchError(() => { this.clear(); return of(false); }), shareReplay(1),
      );
    }
    return this.refreshRequest;
  }
  logout() { return this.http.post('/api/v1/auth/logout', {}, { withCredentials: true }).pipe(tap(() => this.clear())); }
  setLocale(locale: Locale) {
    this.i18n.setLocale(locale);
    return this.http.patch<{ accessToken: string; user: User }>('/api/v1/users/me/preferences', { locale }, { headers: this.headers() }).pipe(tap((result) => this.accept(result)));
  }
  headers() { return { Authorization: `Bearer ${this.accessToken() ?? ''}` }; }
  private accept(result: { accessToken: string; user: User }) { this.accessToken.set(result.accessToken); this.user.set(result.user); this.i18n.setLocale(result.user.preferredLocale); this.refreshRequest = undefined; }
  private clear() { this.user.set(null); this.accessToken.set(null); this.refreshRequest = undefined; }
}
