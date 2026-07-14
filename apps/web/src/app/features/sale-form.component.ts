import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';
import type { PaymentMethod, Sale, Service } from '../core/models';

interface ItemForm { serviceId: string; quantity: number; suggestedPrice: string; effectiveUnitPrice: string; priceOverrideReason: string; }
interface PaymentForm { paymentMethodId: string; amount: string; reference: string; }

@Component({
  selector: 'lq-sale-form', imports: [FormsModule], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header"><div><div class="eyebrow">{{ i18n.t('sales') }}</div><h1>{{ isEditing() ? i18n.t('editSale') : i18n.t('newSale') }}</h1><p>{{ i18n.locale() === 'es' ? (isEditing() ? 'Actualiza servicios, valores y medios de pago del registro.' : 'Añade los servicios realizados y cómo se pagaron.') : (isEditing() ? 'Update services, amounts and payment methods.' : 'Add performed services and how they were paid.') }}</p></div></header>
    @if (loading()) { <div class="skeleton-card">{{ i18n.t('loading') }}</div> } @else {
      <form (ngSubmit)="submit()" class="sale-layout">
        <div class="form-flow">
          <section class="panel form-section">
            <div class="section-heading"><span class="step">1</span><div><h2>{{ i18n.t('businessDate') }}</h2><p>{{ i18n.locale() === 'es' ? 'Fecha en Europe/Brussels' : 'Date in Europe/Brussels' }}</p></div></div>
            <label class="field compact-field"><span>{{ i18n.t('businessDate') }}</span><input type="date" name="businessDate" [(ngModel)]="businessDate" [readonly]="assistantOnlyToday()" required></label>
          </section>
          <section class="panel form-section">
            <div class="section-heading"><span class="step">2</span><div><h2>{{ i18n.t('services') }}</h2><p>{{ i18n.locale() === 'es' ? 'El precio actual se precarga automáticamente.' : 'The current price is filled automatically.' }}</p></div></div>
            @for (item of items; track $index; let index = $index) {
              <article class="line-item">
                <div class="line-number">{{ index + 1 }}</div>
                <label class="field service-field"><span>{{ i18n.t('service') }}</span><select [name]="'service-' + index" [(ngModel)]="item.serviceId" (ngModelChange)="serviceChanged(item)" required><option value="">— {{ i18n.t('service') }} —</option>@for (service of services(); track service.id) { <option [value]="service.id">{{ service.name }} · {{ i18n.formatMoney(service.suggestedPrice) }}</option> }</select></label>
                <label class="field small-field"><span>{{ i18n.t('quantity') }}</span><input type="number" min="1" max="100" [name]="'quantity-' + index" [(ngModel)]="item.quantity" (ngModelChange)="syncSinglePayment()" required></label>
                <label class="field price-field"><span>{{ i18n.t('chargedPrice') }}</span><div class="money-input"><span>€</span><input inputmode="decimal" [name]="'price-' + index" [(ngModel)]="item.effectiveUnitPrice" (ngModelChange)="syncSinglePayment()" required></div><small>{{ i18n.t('suggestedPrice') }}: {{ i18n.formatMoney(item.suggestedPrice || 0) }}</small></label>
                @if (priceChanged(item)) { <label class="field reason-field"><span>{{ i18n.t('reason') }} *</span><textarea rows="2" [name]="'reason-' + index" [(ngModel)]="item.priceOverrideReason" required></textarea><small class="warning-text">{{ i18n.t('priceReasonRequired') }}</small></label> }
                @if (items.length > 1) { <button class="icon-button danger line-remove" type="button" (click)="removeItem(index)" [attr.aria-label]="i18n.t('remove')">×</button> }
              </article>
            }
            <button class="button secondary" type="button" (click)="addItem()">＋ {{ i18n.t('addService') }}</button>
          </section>
          <section class="panel form-section">
            <div class="section-heading"><span class="step">3</span><div><h2>{{ i18n.t('payments') }}</h2><p>{{ i18n.locale() === 'es' ? 'Puedes dividir el total entre varios medios.' : 'You can split the total across methods.' }}</p></div></div>
            @for (payment of payments; track $index; let index = $index) {
              <div class="payment-row">
                <label class="field"><span>{{ i18n.t('paymentMethod') }}</span><select [name]="'method-' + index" [(ngModel)]="payment.paymentMethodId" required><option value="">— {{ i18n.t('paymentMethod') }} —</option>@for (method of paymentMethods(); track method.id) { <option [value]="method.id">{{ method.name }}</option> }</select></label>
                <label class="field"><span>{{ i18n.t('amount') }}</span><div class="money-input"><span>€</span><input inputmode="decimal" [name]="'amount-' + index" [(ngModel)]="payment.amount" required></div></label>
                @if (payments.length > 1) { <button class="icon-button danger" type="button" (click)="payments.splice(index, 1)" [attr.aria-label]="i18n.t('remove')">×</button> }
              </div>
            }
            <button class="button secondary" type="button" (click)="addPayment()">＋ {{ i18n.t('addPayment') }}</button>
          </section>
          <section class="panel form-section"><div class="section-heading"><span class="step">4</span><h2>{{ i18n.t('notes') }}</h2></div><label class="field"><span class="sr-only">{{ i18n.t('notes') }}</span><textarea rows="3" name="notes" [(ngModel)]="notes" maxlength="1000" [placeholder]="i18n.locale() === 'es' ? 'Opcional: añade información útil…' : 'Optional: add useful information…'"></textarea></label></section>
          @if (error()) { <div class="alert error" role="alert">{{ error() }}</div> }
          @if (success()) { <div class="alert success" role="status">✓ {{ success() }}</div> }
        </div>
        <aside class="sale-summary panel">
          <span class="eyebrow">{{ i18n.t('total') }}</span><strong>{{ i18n.formatMoney(total()) }}</strong>
          <div class="summary-line"><span>{{ i18n.t('payments') }}</span><b>{{ i18n.formatMoney(paid()) }}</b></div>
          <div class="summary-line" [class.mismatch]="Math.abs(remaining()) > 0.001"><span>{{ i18n.t('remaining') }}</span><b>{{ i18n.formatMoney(remaining()) }}</b></div>
          <button class="button primary wide" [disabled]="saving() || total() <= 0">{{ saving() ? i18n.t('saving') : (isEditing() ? i18n.t('updateSale') : i18n.t('registerSale')) }}</button>
          <small>{{ i18n.locale() === 'es' ? 'El total se valida nuevamente en el servidor.' : 'The total is validated again on the server.' }}</small>
        </aside>
      </form>
    }
  `,
})
export class SaleFormComponent implements OnInit {
  readonly i18n = inject(I18nService); private api = inject(ApiService); private auth = inject(AuthService); private cdr = inject(ChangeDetectorRef); private route = inject(ActivatedRoute); private router = inject(Router);
  readonly services = signal<Service[]>([]); readonly paymentMethods = signal<PaymentMethod[]>([]); readonly loading = signal(true); readonly saving = signal(false); readonly error = signal(''); readonly success = signal('');
  readonly Math = Math;
  readonly isEditing = signal(false);
  private editId = '';
  private editVersion = 0;
  businessDate = this.todayBelgium(); notes = '';
  items: ItemForm[] = [this.emptyItem()]; payments: PaymentForm[] = [{ paymentMethodId: '', amount: '', reference: '' }];
  ngOnInit() {
    this.editId = this.route.snapshot.paramMap.get('id') ?? '';
    this.isEditing.set(!!this.editId);
    forkJoin({ services: this.api.get<{ data: Service[] }>('/catalogs/services'), methods: this.api.get<{ data: PaymentMethod[] }>('/catalogs/payment-methods') }).subscribe({
      next: ({ services, methods }) => {
        this.services.set(services.data); this.paymentMethods.set(methods.data);
        if (this.editId) this.loadExistingSale(); else this.loading.set(false);
      },
      error: () => { this.error.set(this.i18n.locale() === 'es' ? 'No pudimos cargar los catálogos.' : 'Catalogs could not be loaded.'); this.loading.set(false); },
    });
  }
  assistantOnlyToday() { return this.auth.user()?.role === 'ASSISTANT'; }
  addItem() { this.items.push(this.emptyItem()); }
  removeItem(index: number) { this.items.splice(index, 1); this.syncSinglePayment(); }
  addPayment() { this.payments.push({ paymentMethodId: '', amount: Math.max(0, this.remaining()).toFixed(2), reference: '' }); }
  serviceChanged(item: ItemForm) { const service = this.services().find((entry) => entry.id === item.serviceId); item.suggestedPrice = service?.suggestedPrice ?? ''; item.effectiveUnitPrice = service?.suggestedPrice ?? ''; item.priceOverrideReason = ''; this.syncSinglePayment(); }
  priceChanged(item: ItemForm) { return !!item.suggestedPrice && Number(item.effectiveUnitPrice) !== Number(item.suggestedPrice); }
  total() { return this.items.reduce((sum, item) => sum + (Number(item.effectiveUnitPrice) || 0) * (Number(item.quantity) || 0), 0); }
  paid() { return this.payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0); }
  remaining() { return this.total() - this.paid(); }
  syncSinglePayment() { if (this.payments.length === 1) this.payments[0]!.amount = this.total().toFixed(2); }
  submit() {
    this.error.set(''); this.success.set('');
    if (this.items.some((item) => !item.serviceId || Number(item.effectiveUnitPrice) <= 0) || this.payments.some((payment) => !payment.paymentMethodId || Number(payment.amount) <= 0)) { this.error.set(this.i18n.t('required')); return; }
    if (this.items.some((item) => this.priceChanged(item) && !item.priceOverrideReason.trim())) { this.error.set(this.i18n.t('priceReasonRequired')); return; }
    if (Math.abs(this.remaining()) > 0.001) { this.error.set(this.i18n.t('paymentsMismatch')); return; }
    this.saving.set(true);
    const body = { businessDate: this.businessDate, items: this.items.map(({ suggestedPrice: _s, ...item }) => item), payments: this.payments, notes: this.notes || null };
    const request = this.editId
      ? this.api.put<{ data: Sale }>(`/sales/${this.editId}`, body, this.editVersion)
      : this.api.post<{ data: Sale }>('/sales', body, { 'Idempotency-Key': crypto.randomUUID() });
    request.subscribe({
      next: (result) => {
        this.saving.set(false);
        if (this.editId) { this.success.set(this.i18n.t('saleUpdated')); this.editVersion = result.data.version; setTimeout(() => void this.router.navigate(['/sales']), 700); }
        else { this.success.set(`${this.i18n.t('saleCreated')} · ${result.data.folio}`); this.items = [this.emptyItem()]; this.payments = [{ paymentMethodId: '', amount: '', reference: '' }]; this.notes = ''; }
        this.cdr.markForCheck();
      },
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.title ?? (this.i18n.locale() === 'es' ? 'No pudimos guardar la venta.' : 'The sale could not be saved.')); },
    });
  }
  private loadExistingSale() {
    this.api.get<{ data: Sale }>(`/sales/${this.editId}`).subscribe({
      next: ({ data }) => {
        if (data.status === 'VOIDED') { this.error.set(this.i18n.locale() === 'es' ? 'No se puede editar una venta anulada.' : 'A voided sale cannot be edited.'); this.loading.set(false); return; }
        this.businessDate = data.businessDate.slice(0, 10); this.notes = data.notes ?? ''; this.editVersion = data.version;
        this.items = data.items.map((item) => {
          const current = this.services().find((service) => service.id === item.serviceId)?.suggestedPrice ?? item.suggestedUnitPriceSnapshot ?? '';
          return { serviceId: item.serviceId, quantity: item.quantity, suggestedPrice: current, effectiveUnitPrice: item.effectiveUnitPrice, priceOverrideReason: item.priceOverrideReason ?? '' };
        });
        this.payments = data.payments.map((payment) => ({ paymentMethodId: payment.paymentMethodId, amount: payment.amount, reference: payment.reference ?? '' }));
        this.loading.set(false); this.cdr.markForCheck();
      },
      error: (err) => { this.error.set(err?.error?.title ?? 'Error'); this.loading.set(false); },
    });
  }
  private emptyItem(): ItemForm { return { serviceId: '', quantity: 1, suggestedPrice: '', effectiveUnitPrice: '', priceOverrideReason: '' }; }
  private todayBelgium() { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const get = (type: string) => parts.find((p) => p.type === type)?.value; return `${get('year')}-${get('month')}-${get('day')}`; }
}
