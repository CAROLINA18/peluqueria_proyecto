import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import type { Category, PaymentMethod, Service } from '../core/models';

type Tab = 'services' | 'categories' | 'methods';
@Component({
  selector: 'lq-catalogs', imports: [FormsModule], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header"><div><div class="eyebrow">{{ i18n.t('admin') }}</div><h1>{{ i18n.t('catalogs') }}</h1><p>{{ i18n.locale() === 'es' ? 'Configura las opciones que usa el equipo.' : 'Configure the options used by your team.' }}</p></div></header>
    <div class="tabs"><button [class.active]="tab()==='services'" (click)="tab.set('services')">{{ i18n.t('services') }}</button><button [class.active]="tab()==='categories'" (click)="tab.set('categories')">{{ i18n.t('categories') }}</button><button [class.active]="tab()==='methods'" (click)="tab.set('methods')">{{ i18n.t('paymentMethods') }}</button></div>
    <section class="panel catalog-create">
      @if (tab()==='services') { <form (ngSubmit)="createService()"><label class="field"><span>{{ i18n.t('name') }}</span><input name="serviceName" [(ngModel)]="serviceDraft.name" required></label><label class="field"><span>{{ i18n.t('categories') }}</span><select name="serviceCategory" [(ngModel)]="serviceDraft.categoryId"><option value="">—</option>@for(c of categories();track c.id){<option [value]="c.id">{{c.name}}</option>}</select></label><label class="field"><span>{{ i18n.t('price') }}</span><input name="servicePrice" inputmode="decimal" [(ngModel)]="serviceDraft.suggestedPrice" required></label><button class="button primary">＋ {{ i18n.t('create') }}</button></form> }
      @if (tab()==='categories') { <form (ngSubmit)="createCategory()"><label class="field"><span>{{ i18n.t('name') }}</span><input name="categoryName" [(ngModel)]="categoryName" required></label><button class="button primary">＋ {{ i18n.t('create') }}</button></form> }
      @if (tab()==='methods') { <form (ngSubmit)="createMethod()"><label class="field"><span>{{ i18n.t('code') }}</span><input name="methodCode" [(ngModel)]="methodDraft.code" required></label><label class="field"><span>{{ i18n.t('name') }}</span><input name="methodName" [(ngModel)]="methodDraft.name" required></label><button class="button primary">＋ {{ i18n.t('create') }}</button></form> }
    </section>
    <div class="catalog-grid">
      @for (item of visibleItems(); track item.id) { <article class="catalog-card"><div><span class="status" [class.inactive]="item.status==='INACTIVE'">{{ item.status==='ACTIVE' ? i18n.t('active') : i18n.t('inactive') }}</span><h3>{{ item.name }}</h3>@if(isService(item)){<p>{{ i18n.formatMoney(item.suggestedPrice) }} · {{ item.category?.name || '—' }}</p>}@if(isMethod(item)){<p>{{item.code}}</p>}</div><div class="card-actions"><button class="button ghost compact" (click)="edit(item)">{{ i18n.t('edit') }}</button><button class="button secondary compact" (click)="toggle(item)">{{ item.status==='ACTIVE' ? i18n.t('deactivate') : i18n.t('activate') }}</button></div></article> }
    </div>
  `,
})
export class CatalogsComponent implements OnInit {
  readonly i18n=inject(I18nService); private api=inject(ApiService); readonly tab=signal<Tab>('services'); readonly services=signal<Service[]>([]); readonly categories=signal<Category[]>([]); readonly methods=signal<PaymentMethod[]>([]);
  serviceDraft={name:'',categoryId:'',suggestedPrice:''}; categoryName=''; methodDraft={code:'',name:''};
  ngOnInit(){this.load();} load(){forkJoin({s:this.api.get<{data:Service[]}>('/catalogs/services'),c:this.api.get<{data:Category[]}>('/catalogs/categories'),m:this.api.get<{data:PaymentMethod[]}>('/catalogs/payment-methods')}).subscribe(({s,c,m})=>{this.services.set(s.data);this.categories.set(c.data);this.methods.set(m.data);});}
  visibleItems(){return this.tab()==='services'?this.services():this.tab()==='categories'?this.categories():this.methods();}
  isService(item: Service|Category|PaymentMethod):item is Service{return 'suggestedPrice'in item;} isMethod(item:Service|Category|PaymentMethod):item is PaymentMethod{return 'code'in item;}
  createService(){this.api.post('/catalogs/services',this.serviceDraft).subscribe(()=>{this.serviceDraft={name:'',categoryId:'',suggestedPrice:''};this.load();});}
  createCategory(){this.api.post('/catalogs/categories',{name:this.categoryName,displayOrder:this.categories().length*10}).subscribe(()=>{this.categoryName='';this.load();});}
  createMethod(){this.api.post('/catalogs/payment-methods',{...this.methodDraft,displayOrder:this.methods().length*10}).subscribe(()=>{this.methodDraft={code:'',name:''};this.load();});}
  toggle(item:Service|Category|PaymentMethod){const path=this.isService(item)?'services':this.isMethod(item)?'payment-methods':'categories';this.api.patch(`/catalogs/${path}/${item.id}`,{status:item.status==='ACTIVE'?'INACTIVE':'ACTIVE'}).subscribe(()=>this.load());}
  edit(item:Service|Category|PaymentMethod){const name=window.prompt(this.i18n.t('name'),item.name);if(!name?.trim())return;const path=this.isService(item)?'services':this.isMethod(item)?'payment-methods':'categories';const body:any={name};if(this.isService(item)){const price=window.prompt(this.i18n.t('price'),item.suggestedPrice);if(!price)return;body.suggestedPrice=price;}this.api.patch(`/catalogs/${path}/${item.id}`,body).subscribe(()=>this.load());}
}
