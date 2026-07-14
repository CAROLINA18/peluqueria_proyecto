import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';

@Component({
  selector: 'lq-dashboard', imports: [RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header"><div><div class="eyebrow">{{ i18n.t('today') }}</div><h1>{{ i18n.t('welcome') }}, {{ firstName() }}</h1><p>{{ subtitle() }}</p></div><img class="header-seal" src="/brand/IMG-20260714-WA0010.jpg" alt="" width="88" height="88"></header>
    <section class="hero-card">
      <div><span class="pill">{{ roleLabel() }}</span><h2>{{ i18n.locale() === 'es' ? 'Tu jornada, organizada.' : 'Your day, organised.' }}</h2><p>{{ i18n.locale() === 'es' ? 'Registra cada servicio y mantén la caja siempre al día.' : 'Register every service and keep your records up to date.' }}</p></div>
      <a class="button light" routerLink="/sales/new">＋ {{ i18n.t('newSale') }}</a>
    </section>
    <h2 class="section-title">{{ i18n.t('quickActions') }}</h2>
    <div class="action-grid">
      <a class="action-card" routerLink="/sales/new"><span class="action-icon">＋</span><b>{{ i18n.t('newSale') }}</b><small>{{ i18n.locale() === 'es' ? 'Servicios y pagos' : 'Services and payments' }}</small></a>
      <a class="action-card" routerLink="/sales"><span class="action-icon">≡</span><b>{{ i18n.t('sales') }}</b><small>{{ i18n.locale() === 'es' ? 'Consulta tus registros' : 'Review your records' }}</small></a>
      @if (auth.user()?.role !== 'ASSISTANT') { <a class="action-card" routerLink="/reports"><span class="action-icon">↗</span><b>{{ i18n.t('reports') }}</b><small>{{ i18n.locale() === 'es' ? 'Analiza y exporta' : 'Analyse and export' }}</small></a> }
      @if (auth.user()?.role === 'ADMIN') { <a class="action-card" routerLink="/catalogs"><span class="action-icon">◇</span><b>{{ i18n.t('catalogs') }}</b><small>{{ i18n.locale() === 'es' ? 'Servicios y medios' : 'Services and methods' }}</small></a> }
    </div>
  `,
})
export class DashboardComponent {
  readonly auth = inject(AuthService); readonly i18n = inject(I18nService);
  firstName() { return this.auth.user()?.name.split(' ')[0] ?? ''; }
  roleLabel() { const role = this.auth.user()?.role; return role === 'ADMIN' ? this.i18n.t('admin') : role === 'SENIOR_ASSISTANT' ? this.i18n.t('senior') : this.i18n.t('assistant'); }
  subtitle() { return this.i18n.locale() === 'es' ? 'Todo lo que necesitas para cuidar la operación de hoy.' : 'Everything you need to manage today’s operation.'; }
}
