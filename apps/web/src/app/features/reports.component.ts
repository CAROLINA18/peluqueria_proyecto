import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';
import type { Report } from '../core/models';

@Component({
  selector:'lq-reports',imports:[FormsModule],changeDetection:ChangeDetectionStrategy.OnPush,
  template:`
    <header class="page-header"><div><div class="eyebrow">Lina Quirama Beauty Salon</div><h1>{{i18n.t('reports')}}</h1><p>{{i18n.locale()==='es'?'Analiza la operación y descarga resultados consistentes.':'Analyse operations and download consistent results.'}}</p></div><img class="header-seal" src="/brand/IMG-20260714-WA0010.jpg" alt="" width="88" height="88"></header>
    <section class="panel report-filters"><label class="field"><span>{{i18n.t('period')}}</span><select [(ngModel)]="period" name="period"><option value="day">{{i18n.t('day')}}</option><option value="month">{{i18n.t('month')}}</option>@if(auth.user()?.role==='ADMIN'){<option value="week">{{i18n.t('week')}}</option><option value="year">{{i18n.t('year')}}</option>}</select></label><label class="field"><span>{{i18n.t('businessDate')}}</span><input type="date" [(ngModel)]="anchor" name="anchor"></label><button class="button primary" (click)="load()">{{i18n.t('loadReport')}}</button></section>
    @if(loading()){<div class="skeleton-card">{{i18n.t('loading')}}</div>}
    @if(error()){<div class="alert error">{{error()}}</div>}
    @if(report();as data){
      <div class="report-range"><span>{{i18n.formatDate(data.from)}} — {{i18n.formatDate(data.to)}}</span><div><button class="button secondary compact" (click)="download('pdf')">↓ PDF</button><button class="button secondary compact" (click)="download('xlsx')">↓ XLSX</button></div></div>
      <div class="kpi-grid"><article><span>{{i18n.t('revenue')}}</span><strong>{{i18n.formatMoney(data.summary.grossRevenue)}}</strong></article><article><span>{{i18n.t('sales')}}</span><strong>{{data.summary.salesCount}}</strong></article><article><span>{{i18n.t('units')}}</span><strong>{{data.summary.serviceUnits}}</strong></article><article><span>{{i18n.t('ticket')}}</span><strong>{{i18n.formatMoney(data.summary.averageTicket)}}</strong></article></div>
      <div class="report-grid"><section class="panel"><h2>{{i18n.t('services')}}</h2>@for(row of data.byService;track row.id){<div class="ranking"><div><b>{{row.name}}</b><small>{{row.count}} {{i18n.t('units').toLowerCase()}}</small></div><strong>{{i18n.formatMoney(row.total)}}</strong></div>}@empty{<p class="muted">{{i18n.t('noData')}}</p>}</section><section class="panel"><h2>{{i18n.t('paymentMethods')}}</h2>@for(row of data.byPayment;track row.id){<div class="ranking"><div><b>{{row.name}}</b><small>{{row.count}}</small></div><strong>{{i18n.formatMoney(row.total)}}</strong></div>}@empty{<p class="muted">{{i18n.t('noData')}}</p>}</section></div>
    }
  `,
})
export class ReportsComponent{
  readonly i18n=inject(I18nService);readonly auth=inject(AuthService);private api=inject(ApiService);readonly report=signal<Report|null>(null);readonly loading=signal(false);readonly error=signal('');period='day';anchor=this.today();
  constructor(){this.load();}load(){this.loading.set(true);this.error.set('');this.api.get<{data:Report}>('/reports/sales',{period:this.period,anchor:this.anchor}).subscribe({next:r=>{this.report.set(r.data);this.loading.set(false);},error:e=>{this.error.set(e?.error?.title??'Error');this.loading.set(false);}});}
  download(format:'pdf'|'xlsx'){this.api.download('/reports/sales/export',{format,period:this.period,anchor:this.anchor}).subscribe(response=>{const blob=response.body;if(!blob)return;const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`reporte-ventas-${this.anchor}.${format}`;link.click();URL.revokeObjectURL(link.href);});}
  private today(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=(t:string)=>p.find(x=>x.type===t)?.value;return`${get('year')}-${get('month')}-${get('day')}`;}
}
