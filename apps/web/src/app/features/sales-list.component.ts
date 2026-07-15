import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';
import type { Sale } from '../core/models';

@Component({
  selector: 'lq-sales-list',
  imports: [RouterLink, FormsModule, A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header"><div><div class="eyebrow">{{ i18n.t('sales') }}</div><h1>{{ i18n.t('ownSales') }}</h1><p>{{ i18n.t('salesIntro') }}</p></div></header>
    @if (error() && !actionSale()) { <div class="alert error" role="alert">{{ error() }}</div> }
    @if (success()) { <div class="alert success" role="status" aria-live="polite">✓ {{ success() }}</div> }
    @if (loading()) { <div class="skeleton-card">{{ i18n.t('loading') }}</div> }
    @else if (!sales().length) { <div class="empty-state"><span>◇</span><h2>{{ i18n.t('noData') }}</h2></div> }
    @else {
      <div class="table-card"><table><thead><tr><th>Folio</th><th>{{ i18n.t('businessDate') }}</th><th>{{ i18n.t('author') }}</th><th>{{ i18n.t('total') }}</th><th>{{ i18n.t('status') }}</th>@if (auth.user()?.role === 'ADMIN') { <th>{{ i18n.t('actions') }}</th> }</tr></thead><tbody>
        @for (sale of sales(); track sale.id) {
          <tr>
            <td data-label="Folio"><b>{{ sale.folio }}</b></td>
            <td [attr.data-label]="i18n.t('businessDate')">{{ i18n.formatDate(sale.businessDate) }}</td>
            <td [attr.data-label]="i18n.t('author')">{{ sale.createdBy.name }}</td>
            <td [attr.data-label]="i18n.t('total')"><b>{{ i18n.formatMoney(sale.totalAmount) }}</b></td>
            <td [attr.data-label]="i18n.t('status')"><span class="status" [class.inactive]="sale.status === 'VOIDED'">{{ statusName(sale.status) }}</span></td>
            @if (auth.user()?.role === 'ADMIN') {
              <td [attr.data-label]="i18n.t('actions')"><div class="row-actions">
                @if (sale.status === 'POSTED') {
                  <a class="button secondary compact" [routerLink]="['/sales', sale.id, 'edit']">{{ i18n.t('edit') }}</a>
                  <button class="button danger compact" type="button" (click)="openAction(sale, 'void', $event)">{{ i18n.t('void') }}</button>
                } @else {
                  <button class="button secondary compact" type="button" (click)="openAction(sale, 'restore', $event)">{{ i18n.t('restore') }}</button>
                }
              </div></td>
            }
          </tr>
        }
      </tbody></table></div>
    }

    @if (actionSale(); as sale) {
      <div class="modal-backdrop" (click)="closeAction()" (keydown.escape)="closeAction()">
        <section class="modal-card" role="dialog" aria-modal="true" cdkTrapFocus [cdkTrapFocusAutoCapture]="true" aria-labelledby="sale-action-title" (click)="$event.stopPropagation()">
          <div class="modal-heading"><div><span class="eyebrow">{{ sale.folio }}</span><h2 id="sale-action-title">{{ actionType() === 'void' ? i18n.t('voidSaleTitle') : i18n.t('restoreSaleTitle') }}</h2></div><button class="icon-button" type="button" (click)="closeAction()" [attr.aria-label]="i18n.t('cancel')">×</button></div>
          <p>{{ actionType() === 'void' ? i18n.t('voidSaleHelp') : i18n.t('restoreSaleHelp') }}</p>
          <form (ngSubmit)="confirmAction(sale)" novalidate>
            @if (error()) { <div class="alert error dialog-alert" role="alert" aria-live="assertive">{{ error() }}</div> }
            @if (actionType() === 'void') { <label class="field"><span>{{ i18n.t('voidReason') }}</span><textarea name="voidReason" rows="3" maxlength="500" [(ngModel)]="actionReason" [class.invalid]="actionSubmitted() && !actionReason.trim()"></textarea>@if (actionSubmitted() && !actionReason.trim()) { <small class="field-error">{{ i18n.t('fieldRequired') }}</small> }</label> }
            <div class="modal-actions"><button class="button ghost" type="button" (click)="closeAction()">{{ i18n.t('cancel') }}</button><button class="button" [class.danger]="actionType() === 'void'" [class.primary]="actionType() === 'restore'" [disabled]="actionSaving()">{{ actionSaving() ? i18n.t('saving') : i18n.t('confirm') }}</button></div>
          </form>
        </section>
      </div>
    }
  `,
})
export class SalesListComponent implements OnInit {
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  private api = inject(ApiService);
  readonly sales = signal<Sale[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly success = signal('');
  readonly actionSale = signal<Sale | null>(null);
  readonly actionType = signal<'void' | 'restore'>('void');
  readonly actionSaving = signal(false);
  readonly actionSubmitted = signal(false);
  actionReason = '';
  private dialogOrigin: HTMLElement | null = null;

  ngOnInit() { this.load(); }
  load() { this.api.get<{ data: Sale[] }>('/sales').subscribe({ next: (result) => { this.sales.set(result.data); this.loading.set(false); }, error: () => { this.error.set(this.i18n.t('salesLoadError')); this.loading.set(false); } }); }
  statusName(status: Sale['status']) { return status === 'VOIDED' ? this.i18n.t('voided') : this.i18n.t('posted'); }
  openAction(sale: Sale, type: 'void' | 'restore', event: Event) {
    this.error.set(''); this.success.set(''); this.actionSubmitted.set(false); this.dialogOrigin = event.currentTarget instanceof HTMLElement ? event.currentTarget : null; this.actionReason = ''; this.actionType.set(type); this.actionSale.set(sale);
  }
  closeAction() {
    if (this.actionSaving()) return;
    this.actionSale.set(null); this.restoreFocus();
  }
  confirmAction(sale: Sale) {
    this.actionSubmitted.set(true);
    if (this.actionType() === 'void' && !this.actionReason.trim()) { this.error.set(this.i18n.t('formErrorsTitle')); return; }
    this.actionSaving.set(true); this.error.set('');
    const request = this.actionType() === 'void' ? this.api.post(`/sales/${sale.id}/void`, { reason: this.actionReason.trim() }) : this.api.post(`/sales/${sale.id}/restore`, {});
    request.subscribe({
      next: () => { this.actionSaving.set(false); this.actionSale.set(null); this.success.set(this.i18n.t('saleUpdated')); this.load(); this.restoreFocus(); },
      error: (err) => { this.actionSaving.set(false); this.error.set(err?.error?.title ?? 'Error'); },
    });
  }
  private restoreFocus() { const origin = this.dialogOrigin; this.dialogOrigin = null; queueMicrotask(() => origin?.focus()); }
}
