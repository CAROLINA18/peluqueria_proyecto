import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';
import type { Report, ReportRow } from '../core/models';

@Component({
  selector: 'lq-reports', imports: [FormsModule, NgTemplateOutlet], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header"><div><div class="eyebrow">Lina Quirama Beauty Salon</div><h1>{{ i18n.t('reports') }}</h1><p>{{ i18n.locale() === 'es' ? 'Analiza ventas por usuario, servicio y medio de pago.' : 'Analyse sales by user, service and payment method.' }}</p></div><img class="header-seal" src="/brand/IMG-20260714-WA0010.jpg" alt="" width="88" height="88"></header>
    <section class="panel report-filters">
      <label class="field"><span>{{ i18n.t('period') }}</span><select [(ngModel)]="period" name="period"><option value="day">{{ i18n.t('day') }}</option><option value="month">{{ i18n.t('month') }}</option>@if (auth.user()?.role === 'ADMIN') { <option value="week">{{ i18n.t('week') }}</option><option value="year">{{ i18n.t('year') }}</option> }</select></label>
      <label class="field"><span>{{ i18n.t('businessDate') }}</span><input type="date" [(ngModel)]="anchor" name="anchor"></label>
      <button class="button primary" type="button" (click)="load()">{{ i18n.t('loadReport') }}</button>
    </section>
    @if (loading()) { <div class="skeleton-card">{{ i18n.t('loading') }}</div> }
    @if (error()) { <div class="alert error" role="alert">{{ error() }}</div> }
    @if (report(); as data) {
      <div class="report-range"><span>{{ i18n.formatDate(data.from) }} — {{ i18n.formatDate(data.to) }}</span><div><button class="button secondary compact" type="button" (click)="download('pdf')">↓ PDF</button><button class="button secondary compact" type="button" (click)="download('xlsx')">↓ XLSX</button></div></div>
      <div class="kpi-grid"><article><span>{{ i18n.t('reportTotal') }}</span><strong>{{ i18n.formatMoney(data.summary.grossRevenue) }}</strong></article><article><span>{{ i18n.t('sales') }}</span><strong>{{ data.summary.salesCount }}</strong></article><article><span>{{ i18n.t('units') }}</span><strong>{{ data.summary.serviceUnits }}</strong></article><article><span>{{ i18n.t('ticket') }}</span><strong>{{ i18n.formatMoney(data.summary.averageTicket) }}</strong></article></div>
      <div class="report-grid report-grid-three">
        <ng-container [ngTemplateOutlet]="reportBlock" [ngTemplateOutletContext]="{ title: i18n.t('salesByUser'), rows: data.byUser, countLabel: i18n.t('sales'), total: data.summary.grossRevenue }"></ng-container>
        <ng-container [ngTemplateOutlet]="reportBlock" [ngTemplateOutletContext]="{ title: i18n.t('paymentMethods'), rows: data.byPayment, countLabel: i18n.t('operations'), total: data.summary.grossRevenue }"></ng-container>
        <ng-container [ngTemplateOutlet]="reportBlock" [ngTemplateOutletContext]="{ title: i18n.t('services'), rows: data.byService, countLabel: i18n.t('units'), total: data.summary.grossRevenue }"></ng-container>
      </div>
      <ng-template #reportBlock let-title="title" let-rows="rows" let-countLabel="countLabel" let-total="total">
        <section class="panel report-breakdown"><h2>{{ title }}</h2>
          @for (row of asRows(rows); track row.id) { <div class="ranking"><div><b>{{ row.name }}</b><small>{{ row.count }} {{ countLabel.toLowerCase() }}</small></div><strong>{{ i18n.formatMoney(row.total) }}</strong></div> }
          @empty { <p class="muted">{{ i18n.t('noData') }}</p> }
          <div class="ranking ranking-total"><div><b>{{ i18n.t('total') }}</b></div><strong>{{ i18n.formatMoney(total) }}</strong></div>
        </section>
      </ng-template>
    }
  `,
})
export class ReportsComponent {
  readonly i18n = inject(I18nService); readonly auth = inject(AuthService); private api = inject(ApiService);
  readonly report = signal<Report | null>(null); readonly loading = signal(false); readonly error = signal('');
  period = 'day'; anchor = this.today();
  constructor() { this.load(); }
  load() { this.loading.set(true); this.error.set(''); this.api.get<{ data: Report }>('/reports/sales', { period: this.period, anchor: this.anchor }).subscribe({ next: (result) => { this.report.set(result.data); this.loading.set(false); }, error: (err) => { this.error.set(err?.error?.title ?? 'Error'); this.loading.set(false); } }); }
  download(format: 'pdf' | 'xlsx') { this.api.download('/reports/sales/export', { format, period: this.period, anchor: this.anchor }).subscribe((response) => { const blob = response.body; if (!blob) return; const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `reporte-ventas-${this.anchor}.${format}`; link.click(); URL.revokeObjectURL(link.href); }); }
  asRows(rows: ReportRow[] | null | undefined) { return rows ?? []; }
  private today() { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const get = (type: string) => parts.find((part) => part.type === type)?.value; return `${get('year')}-${get('month')}-${get('day')}`; }
}
