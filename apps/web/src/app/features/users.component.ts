import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import type { Role, User } from '../core/models';

@Component({
  selector: 'lq-users',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div><div class="eyebrow">{{ i18n.t('admin') }}</div><h1>{{ i18n.t('users') }}</h1><p>{{ i18n.locale() === 'es' ? 'Crea accesos, asigna perfiles y administra sus credenciales.' : 'Create access, assign roles and manage credentials.' }}</p></div>
    </header>

    <section class="panel catalog-create"><form (ngSubmit)="create()">
      <label class="field"><span>{{ i18n.t('name') }}</span><input name="name" [(ngModel)]="draft.name" required></label>
      <label class="field"><span>{{ i18n.t('username') }}</span><input type="text" name="username" [(ngModel)]="draft.username" pattern="[a-zA-Z0-9._-]+" autocapitalize="none" required></label>
      <label class="field"><span>{{ i18n.t('role') }}</span><select name="role" [(ngModel)]="draft.role"><option value="ASSISTANT">{{ i18n.t('assistant') }}</option><option value="SENIOR_ASSISTANT">{{ i18n.t('senior') }}</option><option value="ADMIN">{{ i18n.t('admin') }}</option></select></label>
      <label class="field"><span>{{ i18n.t('temporaryPassword') }}</span><input type="password" name="password" [(ngModel)]="draft.password" minlength="10" required></label>
      <button class="button primary">＋ {{ i18n.t('create') }}</button>
    </form></section>

    @if (error()) { <div class="alert error" role="alert">{{ error() }}</div> }
    @if (success()) { <div class="alert success" role="status">✓ {{ success() }}</div> }

    <div class="table-card"><table><thead><tr><th>{{ i18n.t('name') }}</th><th>{{ i18n.t('username') }}</th><th>{{ i18n.t('role') }}</th><th>{{ i18n.t('status') }}</th><th>{{ i18n.t('actions') }}</th></tr></thead><tbody>
      @for (user of users(); track user.id) {
        <tr>
          <td [attr.data-label]="i18n.t('name')"><b>{{ user.name }}</b></td>
          <td [attr.data-label]="i18n.t('username')"><code>{{ user.username }}</code></td>
          <td [attr.data-label]="i18n.t('role')">{{ roleName(user.role) }}</td>
          <td [attr.data-label]="i18n.t('status')"><span class="status" [class.inactive]="user.status === 'INACTIVE'">{{ user.status === 'ACTIVE' ? i18n.t('active') : i18n.t('inactive') }}</span></td>
          <td [attr.data-label]="i18n.t('actions')"><div class="row-actions user-actions">
            <button class="button secondary compact" type="button" (click)="openReset(user)">{{ i18n.t('resetPassword') }}</button>
            <button class="button ghost compact" type="button" (click)="toggle(user)">{{ user.status === 'ACTIVE' ? i18n.t('deactivate') : i18n.t('activate') }}</button>
          </div></td>
        </tr>
      }
    </tbody></table></div>

    @if (resetUser(); as user) {
      <div class="modal-backdrop" (click)="closeReset()">
        <section class="modal-card" role="dialog" aria-modal="true" [attr.aria-label]="i18n.t('resetPassword')" (click)="$event.stopPropagation()">
          <div class="modal-heading"><div><span class="eyebrow">{{ i18n.t('users') }}</span><h2>{{ i18n.t('resetPassword') }}</h2></div><button class="icon-button" type="button" (click)="closeReset()" [attr.aria-label]="i18n.t('cancel')">×</button></div>
          <p>{{ user.name }} · {{ user.username }}</p>
          <form (ngSubmit)="resetPassword(user)">
            <label class="field"><span>{{ i18n.t('newTemporaryPassword') }}</span><input type="password" name="resetPassword" [(ngModel)]="temporaryPassword" minlength="10" autocomplete="new-password" required><small>{{ i18n.locale() === 'es' ? 'Mínimo 10 caracteres. Se cerrarán las sesiones activas.' : 'At least 10 characters. Active sessions will be closed.' }}</small></label>
            <div class="modal-actions"><button class="button ghost" type="button" (click)="closeReset()">{{ i18n.t('cancel') }}</button><button class="button primary" [disabled]="resetting()">{{ resetting() ? i18n.t('saving') : i18n.t('confirmReset') }}</button></div>
          </form>
        </section>
      </div>
    }
  `,
})
export class UsersComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private api = inject(ApiService);
  readonly users = signal<User[]>([]);
  readonly error = signal('');
  readonly success = signal('');
  readonly resetUser = signal<User | null>(null);
  readonly resetting = signal(false);
  temporaryPassword = '';
  draft: { name: string; username: string; role: Role; password: string } = { name: '', username: '', role: 'ASSISTANT', password: '' };

  ngOnInit() { this.load(); }
  load() { this.api.get<{ data: User[] }>('/users').subscribe((result) => this.users.set(result.data)); }
  create() {
    this.clearMessages();
    this.api.post('/users', this.draft).subscribe({
      next: () => { this.draft = { name: '', username: '', role: 'ASSISTANT', password: '' }; this.load(); },
      error: (err) => this.error.set(err?.error?.title ?? 'Error'),
    });
  }
  toggle(user: User) {
    this.clearMessages();
    this.api.patch(`/users/${user.id}`, { status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }).subscribe({ next: () => this.load(), error: (err) => this.error.set(err?.error?.title ?? 'Error') });
  }
  openReset(user: User) { this.clearMessages(); this.temporaryPassword = ''; this.resetUser.set(user); }
  closeReset() { if (!this.resetting()) this.resetUser.set(null); }
  resetPassword(user: User) {
    if (this.temporaryPassword.length < 10) { this.error.set(this.i18n.t('required')); return; }
    this.resetting.set(true); this.error.set('');
    this.api.post(`/users/${user.id}/reset-password`, { temporaryPassword: this.temporaryPassword }).subscribe({
      next: () => { this.resetting.set(false); this.resetUser.set(null); this.temporaryPassword = ''; this.success.set(this.i18n.t('passwordResetSuccess')); },
      error: (err) => { this.resetting.set(false); this.error.set(err?.error?.title ?? 'Error'); },
    });
  }
  roleName(role: Role) { return role === 'ADMIN' ? this.i18n.t('admin') : role === 'SENIOR_ASSISTANT' ? this.i18n.t('senior') : this.i18n.t('assistant'); }
  private clearMessages() { this.error.set(''); this.success.set(''); }
}
