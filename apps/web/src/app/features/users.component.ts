import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import type { Role, User } from '../core/models';

@Component({
  selector:'lq-users',imports:[FormsModule],changeDetection:ChangeDetectionStrategy.OnPush,
  template:`
    <header class="page-header"><div><div class="eyebrow">{{i18n.t('admin')}}</div><h1>{{i18n.t('users')}}</h1><p>{{i18n.locale()==='es'?'Crea accesos y asigna el perfil adecuado.':'Create access and assign the right role.'}}</p></div></header>
    <section class="panel catalog-create"><form (ngSubmit)="create()"><label class="field"><span>{{i18n.t('name')}}</span><input name="name" [(ngModel)]="draft.name" required></label><label class="field"><span>{{i18n.t('email')}}</span><input type="email" name="email" [(ngModel)]="draft.email" required></label><label class="field"><span>{{i18n.t('role')}}</span><select name="role" [(ngModel)]="draft.role"><option value="ASSISTANT">{{i18n.t('assistant')}}</option><option value="SENIOR_ASSISTANT">{{i18n.t('senior')}}</option><option value="ADMIN">{{i18n.t('admin')}}</option></select></label><label class="field"><span>{{i18n.t('temporaryPassword')}}</span><input type="password" name="password" [(ngModel)]="draft.password" minlength="10" required></label><button class="button primary">＋ {{i18n.t('create')}}</button></form></section>
    @if(error()){<div class="alert error">{{error()}}</div>}
    <div class="table-card"><table><thead><tr><th>{{i18n.t('name')}}</th><th>{{i18n.t('email')}}</th><th>{{i18n.t('role')}}</th><th>{{i18n.t('status')}}</th><th>{{i18n.t('actions')}}</th></tr></thead><tbody>@for(user of users();track user.id){<tr><td [attr.data-label]="i18n.t('name')"><b>{{user.name}}</b></td><td [attr.data-label]="i18n.t('email')">{{user.email}}</td><td [attr.data-label]="i18n.t('role')">{{roleName(user.role)}}</td><td [attr.data-label]="i18n.t('status')"><span class="status" [class.inactive]="user.status==='INACTIVE'">{{user.status}}</span></td><td [attr.data-label]="i18n.t('actions')"><button class="button secondary compact" (click)="toggle(user)">{{user.status==='ACTIVE'?i18n.t('deactivate'):i18n.t('activate')}}</button></td></tr>}</tbody></table></div>
  `,
})
export class UsersComponent implements OnInit{
  readonly i18n=inject(I18nService);private api=inject(ApiService);readonly users=signal<User[]>([]);readonly error=signal('');draft:{name:string;email:string;role:Role;password:string}={name:'',email:'',role:'ASSISTANT',password:''};
  ngOnInit(){this.load();}load(){this.api.get<{data:User[]}>('/users').subscribe(result=>this.users.set(result.data));}
  create(){this.error.set('');this.api.post('/users',this.draft).subscribe({next:()=>{this.draft={name:'',email:'',role:'ASSISTANT',password:''};this.load();},error:(err)=>this.error.set(err?.error?.title??'Error')});}
  toggle(user:User){this.api.patch(`/users/${user.id}`,{status:user.status==='ACTIVE'?'INACTIVE':'ACTIVE'}).subscribe({next:()=>this.load(),error:(err)=>this.error.set(err?.error?.title??'Error')});}
  roleName(role:Role){return role==='ADMIN'?this.i18n.t('admin'):role==='SENIOR_ASSISTANT'?this.i18n.t('senior'):this.i18n.t('assistant');}
}
