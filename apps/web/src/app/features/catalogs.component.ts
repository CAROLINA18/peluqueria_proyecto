import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import type { Category, PaymentMethod, Service } from '../core/models';

type Tab = 'services' | 'categories' | 'methods';
type CatalogItem = Service | Category | PaymentMethod;
type EditorKind = 'service' | 'category' | 'method';

interface CatalogDraft {
  name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  displayOrder: number;
  categoryId: string;
  suggestedPrice: string;
  code: string;
}

@Component({
  selector: 'lq-catalogs',
  imports: [FormsModule, A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div><div class="eyebrow">{{ i18n.t('admin') }}</div><h1>{{ i18n.t('catalogs') }}</h1><p>{{ i18n.t('catalogsIntro') }}</p></div>
      <button class="button primary" type="button" (click)="openCreate($event)">＋ {{ i18n.t('create') }}</button>
    </header>

    <div class="tabs">
      <button [class.active]="tab()==='services'" (click)="changeTab('services')">{{ i18n.t('services') }}</button>
      <button [class.active]="tab()==='categories'" (click)="changeTab('categories')">{{ i18n.t('categories') }}</button>
      <button [class.active]="tab()==='methods'" (click)="changeTab('methods')">{{ i18n.t('paymentMethods') }}</button>
    </div>

    <label class="field catalog-search"><span>{{ i18n.t('search') }}</span><input name="catalogSearch" type="search" [(ngModel)]="searchQuery" [placeholder]="i18n.t('searchCatalogs')"></label>

    @if (error() && !editorKind()) { <div class="alert error" role="alert">{{ error() }}</div> }
    @if (success()) { <div class="alert success" role="status">✓ {{ success() }}</div> }

    <div class="catalog-grid">
      @for (item of visibleItems(); track item.id) {
        <article class="catalog-card">
          <div>
            <span class="status" [class.inactive]="item.status==='INACTIVE'">{{ item.status==='ACTIVE' ? i18n.t('active') : i18n.t('inactive') }}</span>
            <h3>{{ item.name }}</h3>
            @if (item.description) { <p>{{ item.description }}</p> }
            @if (isService(item)) { <p>{{ i18n.formatMoney(item.suggestedPrice) }} · {{ item.category?.name || '—' }}</p> }
            @if (isMethod(item)) { <p><b>{{ i18n.t('code') }}:</b> {{ item.code }} · <b>{{ i18n.t('displayOrder') }}:</b> {{ item.displayOrder }}</p> }
            @if (isCategory(item)) { <p><b>{{ i18n.t('displayOrder') }}:</b> {{ item.displayOrder }}</p> }
          </div>
          <div class="card-actions">
            <button class="button ghost compact" type="button" (click)="openEdit(item, $event)">{{ i18n.t('edit') }}</button>
            <button class="button secondary compact" type="button" (click)="toggle(item)">{{ item.status==='ACTIVE' ? i18n.t('deactivate') : i18n.t('activate') }}</button>
          </div>
        </article>
      }
    </div>

    @if (editorKind(); as kind) {
      <div class="modal-backdrop" (click)="closeEditor()" (keydown.escape)="closeEditor()">
        <section class="modal-card modal-card-wide" role="dialog" aria-modal="true" cdkTrapFocus [cdkTrapFocusAutoCapture]="true" [attr.aria-labelledby]="'catalog-editor-title'" (click)="$event.stopPropagation()">
          <div class="modal-heading">
            <div><span class="eyebrow">{{ catalogKindName(kind) }}</span><h2 id="catalog-editor-title">{{ editingId() ? i18n.t('editCatalogItem') : i18n.t('createCatalogItem') }}</h2></div>
            <button class="icon-button" type="button" (click)="closeEditor()" [attr.aria-label]="i18n.t('cancel')">×</button>
          </div>
          <form (ngSubmit)="saveEditor()" novalidate>
            @if (error()) { <div class="alert error dialog-alert" role="alert" aria-live="assertive">{{ error() }}</div> }
            <div class="modal-form-grid">
              @if (kind === 'method') {
                <label class="field"><span>{{ i18n.t('code') }}</span><input name="catalogCode" [(ngModel)]="draft.code" maxlength="50" [class.invalid]="editorSubmitted() && !draft.code.trim()">@if (editorSubmitted() && !draft.code.trim()) { <small class="field-error">{{ i18n.t('fieldRequired') }}</small> }</label>
              }
              <label class="field"><span>{{ i18n.t('name') }}</span><input name="catalogName" [(ngModel)]="draft.name" maxlength="160" [class.invalid]="editorSubmitted() && !draft.name.trim()">@if (editorSubmitted() && !draft.name.trim()) { <small class="field-error">{{ i18n.t('fieldRequired') }}</small> }</label>
              @if (kind === 'service') {
                <label class="field"><span>{{ i18n.t('categories') }}</span><select name="catalogCategory" [(ngModel)]="draft.categoryId"><option value="">—</option>@for(c of categories(); track c.id){<option [value]="c.id">{{c.name}}</option>}</select></label>
                <label class="field"><span>{{ i18n.t('suggestedPrice') }}</span><input name="catalogPrice" type="number" min="0.01" step="0.01" inputmode="decimal" [(ngModel)]="draft.suggestedPrice" [class.invalid]="editorSubmitted() && !validPrice()">@if (editorSubmitted() && !validPrice()) { <small class="field-error">{{ i18n.t('invalidPrice') }}</small> }</label>
              } @else {
                <label class="field"><span>{{ i18n.t('displayOrder') }}</span><input name="catalogOrder" type="number" min="0" step="1" [(ngModel)]="draft.displayOrder" [class.invalid]="editorSubmitted() && !validOrder()">@if (editorSubmitted() && !validOrder()) { <small class="field-error">{{ i18n.t('invalidQuantity') }}</small> }</label>
              }
              <label class="field"><span>{{ i18n.t('status') }}</span><select name="catalogStatus" [(ngModel)]="draft.status"><option value="ACTIVE">{{ i18n.t('active') }}</option><option value="INACTIVE">{{ i18n.t('inactive') }}</option></select></label>
              <label class="field modal-form-full"><span>{{ i18n.t('description') }}</span><textarea name="catalogDescription" rows="3" maxlength="500" [(ngModel)]="draft.description"></textarea></label>
            </div>
            <div class="modal-actions"><button class="button ghost" type="button" (click)="closeEditor()">{{ i18n.t('cancel') }}</button><button class="button primary" [disabled]="saving()">{{ saving() ? i18n.t('saving') : i18n.t('save') }}</button></div>
          </form>
        </section>
      </div>
    }
  `,
})
export class CatalogsComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private api = inject(ApiService);
  readonly tab = signal<Tab>('services');
  readonly services = signal<Service[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly methods = signal<PaymentMethod[]>([]);
  readonly editorKind = signal<EditorKind | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly editorSubmitted = signal(false);
  searchQuery = '';
  draft: CatalogDraft = this.emptyDraft();
  private dialogOrigin: HTMLElement | null = null;

  ngOnInit() { this.load(); }
  load() {
    forkJoin({
      s: this.api.get<{ data: Service[] }>('/catalogs/services'),
      c: this.api.get<{ data: Category[] }>('/catalogs/categories'),
      m: this.api.get<{ data: PaymentMethod[] }>('/catalogs/payment-methods'),
    }).subscribe({
      next: ({ s, c, m }) => { this.services.set(s.data); this.categories.set(c.data); this.methods.set(m.data); },
      error: (err) => this.error.set(err?.error?.title ?? this.i18n.t('loadError')),
    });
  }
  changeTab(tab: Tab) { this.tab.set(tab); this.clearMessages(); }
  visibleItems() {
    const items = this.tab() === 'services' ? this.services() : this.tab() === 'categories' ? this.categories() : this.methods();
    const query = this.searchQuery.trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter((item) => [item.name, item.description, this.isMethod(item) ? item.code : ''].some((value) => value?.toLocaleLowerCase().includes(query)));
  }
  isService(item: CatalogItem): item is Service { return 'suggestedPrice' in item; }
  isMethod(item: CatalogItem): item is PaymentMethod { return 'code' in item; }
  isCategory(item: CatalogItem): item is Category { return !this.isService(item) && !this.isMethod(item); }

  openCreate(event: Event) {
    this.clearMessages(); this.editorSubmitted.set(false); this.rememberOrigin(event); this.editingId.set(null); this.draft = this.emptyDraft(); this.editorKind.set(this.kindForTab());
  }
  openEdit(item: CatalogItem, event: Event) {
    this.clearMessages(); this.editorSubmitted.set(false); this.rememberOrigin(event); this.editingId.set(item.id);
    this.draft = {
      name: item.name,
      description: item.description ?? '',
      status: item.status,
      displayOrder: this.isService(item) ? 0 : item.displayOrder,
      categoryId: this.isService(item) ? item.categoryId ?? '' : '',
      suggestedPrice: this.isService(item) ? item.suggestedPrice : '',
      code: this.isMethod(item) ? item.code : '',
    };
    this.editorKind.set(this.isService(item) ? 'service' : this.isMethod(item) ? 'method' : 'category');
  }
  closeEditor() {
    if (this.saving()) return;
    this.editorKind.set(null); this.editingId.set(null); this.restoreFocus();
  }
  saveEditor() {
    const kind = this.editorKind(); if (!kind) return;
    this.editorSubmitted.set(true); this.error.set('');
    if (!this.draft.name.trim() || (kind === 'method' && !this.draft.code.trim()) || (kind === 'service' && !this.validPrice()) || (kind !== 'service' && !this.validOrder())) { this.error.set(this.i18n.t('formErrorsTitle')); return; }
    this.saving.set(true); this.error.set('');
    const path = kind === 'service' ? 'services' : kind === 'method' ? 'payment-methods' : 'categories';
    const body = kind === 'service'
      ? { name: this.draft.name, description: this.nullIfBlank(this.draft.description), categoryId: this.draft.categoryId || null, suggestedPrice: this.draft.suggestedPrice, status: this.draft.status }
      : kind === 'method'
        ? { code: this.draft.code, name: this.draft.name, description: this.nullIfBlank(this.draft.description), displayOrder: this.draft.displayOrder, status: this.draft.status }
        : { name: this.draft.name, description: this.nullIfBlank(this.draft.description), displayOrder: this.draft.displayOrder, status: this.draft.status };
    const request = this.editingId() ? this.api.patch(`/catalogs/${path}/${this.editingId()}`, body) : this.api.post(`/catalogs/${path}`, body);
    request.subscribe({
      next: () => { this.saving.set(false); this.editorKind.set(null); this.editingId.set(null); this.success.set(this.i18n.t('catalogSaved')); this.load(); this.restoreFocus(); },
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.title ?? 'Error'); },
    });
  }
  toggle(item: CatalogItem) {
    this.clearMessages();
    const path = this.isService(item) ? 'services' : this.isMethod(item) ? 'payment-methods' : 'categories';
    this.api.patch(`/catalogs/${path}/${item.id}`, { status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }).subscribe({
      next: () => { this.success.set(this.i18n.t('catalogSaved')); this.load(); },
      error: (err) => this.error.set(err?.error?.title ?? 'Error'),
    });
  }
  catalogKindName(kind: EditorKind) { return kind === 'service' ? this.i18n.t('service') : kind === 'category' ? this.i18n.t('categories') : this.i18n.t('paymentMethods'); }
  validPrice() { const value = Number(this.draft.suggestedPrice); return Number.isFinite(value) && value > 0; }
  validOrder() { return Number.isInteger(Number(this.draft.displayOrder)) && Number(this.draft.displayOrder) >= 0; }
  private kindForTab(): EditorKind { return this.tab() === 'services' ? 'service' : this.tab() === 'categories' ? 'category' : 'method'; }
  private emptyDraft(): CatalogDraft { return { name: '', description: '', status: 'ACTIVE', displayOrder: 0, categoryId: '', suggestedPrice: '', code: '' }; }
  private nullIfBlank(value: string) { const trimmed = value.trim(); return trimmed || null; }
  private rememberOrigin(event: Event) { this.dialogOrigin = event.currentTarget instanceof HTMLElement ? event.currentTarget : null; }
  private restoreFocus() { const origin = this.dialogOrigin; this.dialogOrigin = null; queueMicrotask(() => origin?.focus()); }
  private clearMessages() { this.error.set(''); this.success.set(''); }
}
