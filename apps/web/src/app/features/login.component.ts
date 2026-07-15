import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';
import type { Locale } from '../core/models';

@Component({
  selector: 'lq-login', imports: [FormsModule], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="login-page">
      <section class="login-brand" aria-label="Lina Quirama Beauty Salon"><img src="/brand/IMG-20260714-WA0011.jpg" alt="Lina Quirama Beauty Salon" width="420" height="700"><p>Beauty, calm & confidence</p></section>
      <section class="login-panel">
        <div class="login-locale"><button [class.selected]="i18n.locale() === 'es'" (click)="setLocale('es')">ES</button><button [class.selected]="i18n.locale() === 'en'" (click)="setLocale('en')">EN</button></div>
        <form class="auth-card" (ngSubmit)="submit()" novalidate>
          <div class="eyebrow">Lina Quirama Beauty Salon</div><h1>{{ i18n.t('login') }}</h1>
          <p class="muted">{{ i18n.locale() === 'es' ? 'Gestiona tu jornada con calma y claridad.' : 'Manage your day with calm and clarity.' }}</p>
          @if (error()) { <div class="alert error" role="alert" aria-live="assertive">{{ error() }}</div> }
          <label>{{ i18n.t('username') }}
            <input type="text" name="username" [(ngModel)]="username" autocomplete="username" autocapitalize="none" [class.invalid]="submitted() && !username.trim()" [attr.aria-invalid]="submitted() && !username.trim()" aria-describedby="login-username-error">
            @if (submitted() && !username.trim()) { <small id="login-username-error" class="field-error">{{ i18n.t('invalidUsername') }}</small> }
          </label>
          <label>{{ i18n.t('password') }}
            <div class="password-field"><input [type]="showPassword() ? 'text' : 'password'" name="password" [(ngModel)]="password" autocomplete="current-password" [class.invalid]="submitted() && !password" [attr.aria-invalid]="submitted() && !password" aria-describedby="login-password-error"><button type="button" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'">{{ showPassword() ? '◉' : '◎' }}</button></div>
            @if (submitted() && !password) { <small id="login-password-error" class="field-error">{{ i18n.t('fieldRequired') }}</small> }
          </label>
          <button class="button primary wide" [disabled]="loading()">{{ loading() ? i18n.t('loading') : i18n.t('login') }}</button>
          <small class="demo-note">Demo: admin · ChangeMe123!</small>
        </form>
      </section>
    </main>
  `,
})
export class LoginComponent {
  readonly i18n = inject(I18nService); private auth = inject(AuthService); private router = inject(Router);
  username = 'admin'; password = 'ChangeMe123!';
  readonly loading = signal(false); readonly error = signal(''); readonly showPassword = signal(false); readonly submitted = signal(false);
  setLocale(locale: Locale) { this.i18n.setLocale(locale); }
  submit() {
    this.submitted.set(true); this.error.set('');
    if (!this.username.trim() || !this.password) { this.error.set(this.i18n.t('formErrorsTitle')); return; }
    this.loading.set(true);
    this.auth.login(this.username.trim(), this.password).subscribe({ next: () => this.router.navigateByUrl('/dashboard'), error: (err) => { this.loading.set(false); this.error.set(err?.error?.title ?? (this.i18n.locale() === 'es' ? 'No pudimos iniciar sesión' : 'We could not sign you in')); } });
  }
}
