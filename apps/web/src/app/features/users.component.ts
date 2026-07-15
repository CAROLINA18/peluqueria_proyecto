import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import type { Role, User } from '../core/models';

@Component({
  selector: 'lq-users',
  imports: [FormsModule, A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div><div class="eyebrow">{{ i18n.t('admin') }}</div><h1>{{ i18n.t('users') }}</h1><p>{{ i18n.locale() === 'es' ? 'Crea accesos, asigna perfiles y administra sus credenciales.' : 'Create access, assign roles and manage credentials.' }}</p></div>
    </header>

    <section class="panel catalog-create"><form (ngSubmit)="create()" novalidate>
      <label class="field"><span>{{ i18n.t('name') }}</span><input name="name" [(ngModel)]="draft.name" [class.invalid]="createSubmitted() && draft.name.trim().length < 2">@if (createSubmitted() && draft.name.trim().length < 2) { <small class="field-error">{{ i18n.t('fieldRequired') }}</small> }</label>
      <label class="field"><span>{{ i18n.t('username') }}</span><input type="text" name="username" [(ngModel)]="draft.username" autocapitalize="none" [class.invalid]="createSubmitted() && !validUsername(draft.username)">@if (createSubmitted() && !validUsername(draft.username)) { <small class="field-error">{{ i18n.t('invalidUsername') }}</small> }</label>
      <label class="field"><span>{{ i18n.t('role') }}</span><select name="role" [(ngModel)]="draft.role"><option value="ASSISTANT">{{ i18n.t('assistant') }}</option><option value="SENIOR_ASSISTANT">{{ i18n.t('senior') }}</option><option value="ADMIN">{{ i18n.t('admin') }}</option></select></label>
      <label class="field"><span>{{ i18n.t('temporaryPassword') }}</span><input type="password" name="password" [(ngModel)]="draft.password" [class.invalid]="createSubmitted() && draft.password.length < 10">@if (createSubmitted() && draft.password.length < 10) { <small class="field-error">{{ i18n.t('passwordMinLength') }}</small> }</label>
      <button class="button primary">＋ {{ i18n.t('create') }}</button>
    </form></section>

    @if (error() && !resetUser() && !editUser()) { <div class="alert error" role="alert">{{ error() }}</div> }
    @if (success()) { <div class="alert success" role="status">✓ {{ success() }}</div> }

    <div class="table-card"><table><thead><tr><th>{{ i18n.t('name') }}</th><th>{{ i18n.t('username') }}</th><th>{{ i18n.t('role') }}</th><th>{{ i18n.t('status') }}</th><th>{{ i18n.t('actions') }}</th></tr></thead><tbody>
      @for (user of users(); track user.id) {
        <tr>
          <td [attr.data-label]="i18n.t('name')"><b>{{ user.name }}</b></td>
          <td [attr.data-label]="i18n.t('username')"><code>{{ user.username }}</code></td>
          <td [attr.data-label]="i18n.t('role')">{{ roleName(user.role) }}</td>
          <td [attr.data-label]="i18n.t('status')"><span class="status" [class.inactive]="user.status === 'INACTIVE'">{{ user.status === 'ACTIVE' ? i18n.t('active') : i18n.t('inactive') }}</span></td>
          <td [attr.data-label]="i18n.t('actions')"><div class="row-actions user-actions">
            <button class="button primary compact" type="button" (click)="openEdit(user, $event)">{{ i18n.t('edit') }}</button>
            <button class="button secondary compact" type="button" (click)="openReset(user, $event)">{{ i18n.t('resetPassword') }}</button>
            <button class="button ghost compact" type="button" (click)="toggle(user)">{{ user.status === 'ACTIVE' ? i18n.t('deactivate') : i18n.t('activate') }}</button>
          </div></td>
        </tr>
      }
    </tbody></table></div>

    @if (resetUser(); as user) {
      <div class="modal-backdrop" (click)="closeReset()" (keydown.escape)="closeReset()">
        <section class="modal-card" role="dialog" aria-modal="true" cdkTrapFocus [cdkTrapFocusAutoCapture]="true" [attr.aria-label]="i18n.t('resetPassword')" (click)="$event.stopPropagation()">
          <div class="modal-heading"><div><span class="eyebrow">{{ i18n.t('users') }}</span><h2>{{ i18n.t('resetPassword') }}</h2></div><button class="icon-button" type="button" (click)="closeReset()" [attr.aria-label]="i18n.t('cancel')">×</button></div>
          <p>{{ user.name }} · {{ user.username }}</p>
          <form (ngSubmit)="resetPassword(user)" novalidate>
            @if (error()) { <div class="alert error dialog-alert" role="alert" aria-live="assertive">{{ error() }}</div> }
            <label class="field"><span>{{ i18n.t('newTemporaryPassword') }}</span><input type="password" name="resetPassword" [(ngModel)]="temporaryPassword" autocomplete="new-password" [class.invalid]="resetSubmitted() && temporaryPassword.length < 10">@if (resetSubmitted() && temporaryPassword.length < 10) { <small class="field-error">{{ i18n.t('passwordMinLength') }}</small> }<small>{{ i18n.locale() === 'es' ? 'Mínimo 10 caracteres. Se cerrarán las sesiones activas.' : 'At least 10 characters. Active sessions will be closed.' }}</small></label>
            <div class="modal-actions"><button class="button ghost" type="button" (click)="closeReset()">{{ i18n.t('cancel') }}</button><button class="button primary" [disabled]="resetting()">{{ resetting() ? i18n.t('saving') : i18n.t('confirmReset') }}</button></div>
          </form>
        </section>
      </div>
    }

    @if (editUser(); as user) {
      <div class="modal-backdrop" (click)="closeEdit()" (keydown.escape)="closeEdit()">
        <section class="modal-card" role="dialog" aria-modal="true" cdkTrapFocus [cdkTrapFocusAutoCapture]="true" aria-labelledby="edit-user-title" (click)="$event.stopPropagation()">
          <div class="modal-heading"><div><span class="eyebrow">{{ i18n.t('users') }}</span><h2 id="edit-user-title">{{ i18n.t('editUser') }}</h2></div><button class="icon-button" type="button" (click)="closeEdit()" [attr.aria-label]="i18n.t('cancel')">×</button></div>
          <p>{{ i18n.t('editUserHelp') }}</p>
          <form (ngSubmit)="saveEdit(user)" novalidate>
            @if (error()) { <div class="alert error dialog-alert" role="alert" aria-live="assertive">{{ error() }}</div> }
            <div class="modal-form-grid">
              <label class="field"><span>{{ i18n.t('name') }}</span><input name="editName" [(ngModel)]="editDraft.name" maxlength="120" [class.invalid]="editSubmitted() && editDraft.name.trim().length < 2">@if (editSubmitted() && editDraft.name.trim().length < 2) { <small class="field-error">{{ i18n.t('fieldRequired') }}</small> }</label>
              <label class="field"><span>{{ i18n.t('username') }}</span><input name="editUsername" [(ngModel)]="editDraft.username" maxlength="80" autocapitalize="none" [class.invalid]="editSubmitted() && !validUsername(editDraft.username)">@if (editSubmitted() && !validUsername(editDraft.username)) { <small class="field-error">{{ i18n.t('invalidUsername') }}</small> }</label>
              <label class="field"><span>{{ i18n.t('role') }}</span><select name="editRole" [(ngModel)]="editDraft.role"><option value="ASSISTANT">{{ i18n.t('assistant') }}</option><option value="SENIOR_ASSISTANT">{{ i18n.t('senior') }}</option><option value="ADMIN">{{ i18n.t('admin') }}</option></select></label>
              <label class="field"><span>{{ i18n.t('status') }}</span><select name="editStatus" [(ngModel)]="editDraft.status"><option value="ACTIVE">{{ i18n.t('active') }}</option><option value="INACTIVE">{{ i18n.t('inactive') }}</option></select></label>
            </div>
            <small class="dialog-note">{{ i18n.t('roleChangeWarning') }}</small>
            <div class="modal-actions"><button class="button ghost" type="button" (click)="closeEdit()">{{ i18n.t('cancel') }}</button><button class="button primary" [disabled]="editing()">{{ editing() ? i18n.t('saving') : i18n.t('save') }}</button></div>
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
  readonly editUser = signal<User | null>(null);
  readonly editing = signal(false);
  readonly createSubmitted = signal(false);
  readonly resetSubmitted = signal(false);
  readonly editSubmitted = signal(false);
  temporaryPassword = '';
  draft: { name: string; username: string; role: Role; password: string } = { name: '', username: '', role: 'ASSISTANT', password: '' };
  editDraft: { name: string; username: string; role: Role; status: 'ACTIVE' | 'INACTIVE' } = { name: '', username: '', role: 'ASSISTANT', status: 'ACTIVE' };
  private dialogOrigin: HTMLElement | null = null;

  ngOnInit() { this.load(); }
  load() { this.api.get<{ data: User[] }>('/users').subscribe((result) => this.users.set(result.data)); }
  create() {
    this.clearMessages(); this.createSubmitted.set(true);
    if (this.draft.name.trim().length < 2 || !this.validUsername(this.draft.username) || this.draft.password.length < 10) { this.error.set(this.i18n.t('formErrorsTitle')); return; }
    this.api.post('/users', this.draft).subscribe({
      next: () => { this.draft = { name: '', username: '', role: 'ASSISTANT', password: '' }; this.createSubmitted.set(false); this.success.set(this.i18n.t('userSaved')); this.load(); },
      error: (err) => this.error.set(err?.error?.title ?? 'Error'),
    });
  }
  toggle(user: User) {
    this.clearMessages();
    this.api.patch(`/users/${user.id}`, { status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }).subscribe({ next: () => this.load(), error: (err) => this.error.set(err?.error?.title ?? 'Error') });
  }
  openReset(user: User, event: Event) { this.clearMessages(); this.resetSubmitted.set(false); this.rememberOrigin(event); this.temporaryPassword = ''; this.resetUser.set(user); }
  closeReset() { if (!this.resetting()) { this.resetUser.set(null); this.error.set(''); this.restoreFocus(); } }
  resetPassword(user: User) {
    this.resetSubmitted.set(true);
    if (this.temporaryPassword.length < 10) { this.error.set(this.i18n.t('formErrorsTitle')); return; }
    this.resetting.set(true); this.error.set('');
    this.api.post(`/users/${user.id}/reset-password`, { temporaryPassword: this.temporaryPassword }).subscribe({
      next: () => { this.resetting.set(false); this.resetUser.set(null); this.temporaryPassword = ''; this.success.set(this.i18n.t('passwordResetSuccess')); this.restoreFocus(); },
      error: (err) => { this.resetting.set(false); this.error.set(err?.error?.title ?? 'Error'); },
    });
  }
  openEdit(user: User, event: Event) {
    this.clearMessages(); this.editSubmitted.set(false); this.rememberOrigin(event); this.editDraft = { name: user.name, username: user.username, role: user.role, status: user.status ?? 'ACTIVE' }; this.editUser.set(user);
  }
  closeEdit() { if (!this.editing()) { this.editUser.set(null); this.error.set(''); this.restoreFocus(); } }
  saveEdit(user: User) {
    this.clearMessages(); this.editSubmitted.set(true);
    if (this.editDraft.name.trim().length < 2 || !this.validUsername(this.editDraft.username)) { this.error.set(this.i18n.t('formErrorsTitle')); return; }
    this.editing.set(true);
    this.api.patch(`/users/${user.id}`, this.editDraft).subscribe({
      next: () => { this.editing.set(false); this.editUser.set(null); this.success.set(this.i18n.t('userSaved')); this.load(); this.restoreFocus(); },
      error: (err) => { this.editing.set(false); this.error.set(err?.error?.title ?? 'Error'); },
    });
  }
  roleName(role: Role) { return role === 'ADMIN' ? this.i18n.t('admin') : role === 'SENIOR_ASSISTANT' ? this.i18n.t('senior') : this.i18n.t('assistant'); }
  validUsername(value: string) { return /^[a-zA-Z0-9._-]{3,80}$/.test(value.trim()); }
  private rememberOrigin(event: Event) { this.dialogOrigin = event.currentTarget instanceof HTMLElement ? event.currentTarget : null; }
  private restoreFocus() { const origin = this.dialogOrigin; this.dialogOrigin = null; queueMicrotask(() => origin?.focus()); }
  private clearMessages() { this.error.set(''); this.success.set(''); }
}
