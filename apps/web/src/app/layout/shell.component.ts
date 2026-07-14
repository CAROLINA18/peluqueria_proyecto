import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';
import type { Locale } from '../core/models';

@Component({
  selector: 'lq-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-shell">
      <aside class="sidebar" [class.open]="menuOpen()">
        <a routerLink="/dashboard" class="brand" (click)="menuOpen.set(false)">
          <img src="/brand/IMG-20260714-WA0010.jpg" alt="" width="72" height="72">
          <span>Lina Quirama<small>Beauty Salon</small></span>
        </a>
        <nav aria-label="Principal">
          <a routerLink="/dashboard" routerLinkActive="active" (click)="menuOpen.set(false)"><span>⌂</span>{{ i18n.t('dashboard') }}</a>
          <a routerLink="/sales/new" routerLinkActive="active" (click)="menuOpen.set(false)"><span>＋</span>{{ i18n.t('newSale') }}</a>
          <a routerLink="/sales" routerLinkActive="active" (click)="menuOpen.set(false)"><span>≡</span>{{ i18n.t('sales') }}</a>
          @if (auth.user()?.role !== 'ASSISTANT') { <a routerLink="/reports" routerLinkActive="active" (click)="menuOpen.set(false)"><span>↗</span>{{ i18n.t('reports') }}</a> }
          @if (auth.user()?.role === 'ADMIN') {
            <a routerLink="/catalogs" routerLinkActive="active" (click)="menuOpen.set(false)"><span>◇</span>{{ i18n.t('catalogs') }}</a>
            <a routerLink="/users" routerLinkActive="active" (click)="menuOpen.set(false)"><span>◎</span>{{ i18n.t('users') }}</a>
          }
        </nav>
        <div class="sidebar-footer">
          <span>{{ auth.user()?.name }}</span><small>{{ roleLabel() }}</small>
        </div>
      </aside>
      @if (menuOpen()) { <button class="backdrop" aria-label="Cerrar menú" (click)="menuOpen.set(false)"></button> }
      <main class="main-area">
        <header class="topbar">
          <button class="icon-button mobile-only" aria-label="Abrir menú" (click)="menuOpen.set(true)">☰</button>
          <div class="mobile-brand"><img src="/brand/IMG-20260714-WA0010.jpg" alt="" width="40" height="40"><b>Lina Quirama</b></div>
          <div class="top-actions">
            <label class="locale-select"><span class="sr-only">{{ i18n.t('language') }}</span><select [value]="i18n.locale()" (change)="changeLocale($event)"><option value="es">ES</option><option value="en">EN</option></select></label>
            <button class="button ghost compact" (click)="logout()">{{ i18n.t('logout') }}</button>
          </div>
        </header>
        <div class="page"><router-outlet /></div>
      </main>
    </div>
  `,
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  private router = inject(Router);
  readonly menuOpen = signal(false);
  changeLocale(event: Event) { const locale = (event.target as HTMLSelectElement).value as Locale; this.auth.setLocale(locale).subscribe(); }
  logout() { this.auth.logout().subscribe(() => this.router.navigateByUrl('/login')); }
  roleLabel() { const role = this.auth.user()?.role; return role === 'ADMIN' ? this.i18n.t('admin') : role === 'SENIOR_ASSISTANT' ? this.i18n.t('senior') : this.i18n.t('assistant'); }
}
