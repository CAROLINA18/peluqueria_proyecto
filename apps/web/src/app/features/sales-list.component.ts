import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';
import type { Sale } from '../core/models';

@Component({
  selector: 'lq-sales-list', changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header"><div><div class="eyebrow">{{ i18n.t('sales') }}</div><h1>{{ i18n.t('ownSales') }}</h1><p>{{ i18n.locale() === 'es' ? 'Historial ordenado por fecha de servicio.' : 'History ordered by service date.' }}</p></div></header>
    @if (loading()) { <div class="skeleton-card">{{ i18n.t('loading') }}</div> } @else if (!sales().length) { <div class="empty-state"><span>◇</span><h2>{{ i18n.t('noData') }}</h2></div> } @else {
      <div class="table-card"><table><thead><tr><th>Folio</th><th>{{ i18n.t('businessDate') }}</th><th>{{ i18n.t('author') }}</th><th>{{ i18n.t('total') }}</th><th>{{ i18n.t('status') }}</th>@if(auth.user()?.role === 'ADMIN'){<th>{{ i18n.t('actions') }}</th>}</tr></thead><tbody>
      @for (sale of sales(); track sale.id) { <tr><td data-label="Folio"><b>{{ sale.folio }}</b></td><td [attr.data-label]="i18n.t('businessDate')">{{ i18n.formatDate(sale.businessDate) }}</td><td [attr.data-label]="i18n.t('author')">{{ sale.createdBy.name }}</td><td [attr.data-label]="i18n.t('total')"><b>{{ i18n.formatMoney(sale.totalAmount) }}</b></td><td [attr.data-label]="i18n.t('status')"><span class="status" [class.inactive]="sale.status === 'VOIDED'">{{ sale.status }}</span></td>@if(auth.user()?.role === 'ADMIN'){<td [attr.data-label]="i18n.t('actions')">@if(sale.status==='POSTED'){<button class="button danger compact" (click)="voidSale(sale)">{{ i18n.t('void') }}</button>}</td>}</tr> }
      </tbody></table></div>
    }
  `,
})
export class SalesListComponent implements OnInit {
  readonly i18n = inject(I18nService); readonly auth = inject(AuthService); private api = inject(ApiService);
  readonly sales = signal<Sale[]>([]); readonly loading = signal(true);
  ngOnInit() { this.load(); }
  load() { this.api.get<{ data: Sale[] }>('/sales').subscribe({ next: (result) => { this.sales.set(result.data); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  voidSale(sale: Sale) { const reason = window.prompt(this.i18n.locale() === 'es' ? 'Motivo obligatorio de anulación' : 'Required void reason'); if (!reason?.trim()) return; this.api.post(`/sales/${sale.id}/void`, { reason }).subscribe(() => this.load()); }
}
