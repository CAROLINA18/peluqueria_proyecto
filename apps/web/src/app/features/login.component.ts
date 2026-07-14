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
      <section class="login-brand" aria-label="Lina Quirama Beauty Salon">
        <img src="/brand/IMG-20260714-WA0011.jpg" alt="Lina Quirama Beauty Salon" width="420" height="700">
        <p>Beauty, calm & confidence</p>
      </section>
      <section class="login-panel">
        <div class="login-locale"><button [class.selected]="i18n.locale() === 'es'" (click)="setLocale('es')">ES</button><button [class.selected]="i18n.locale() === 'en'" (click)="setLocale('en')">EN</button></div>
        <form class="auth-card" (ngSubmit)="submit()">
          <div class="eyebrow">Lina Quirama Beauty Salon</div>
          <h1>{{ i18n.t('login') }}</h1>
          <p class="muted">{{ i18n.locale() === 'es' ? 'Gestiona tu jornada con calma y claridad.' : 'Manage your day with calm and clarity.' }}</p>
          <label>{{ i18n.t('email') }}<input type="email" name="email" [(ngModel)]="email" autocomplete="username" required></label>
          <label>{{ i18n.t('password') }}<div class="password-field"><input [type]="showPassword() ? 'text' : 'password'" name="password" [(ngModel)]="password" autocomplete="current-password" required><button type="button" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'">{{ showPassword() ? '◉' : '◎' }}</button></div></label>
          @if (error()) { <div class="alert error" role="alert">{{ error() }}</div> }
          <button class="button primary wide" [disabled]="loading()">{{ loading() ? i18n.t('loading') : i18n.t('login') }}</button>
          <small class="demo-note">Demo: admin&#64;linaquirama.local · ChangeMe123!</small>
        </form>
      </section>
    </main>
  `,
})
export class LoginComponent {
  readonly i18n = inject(I18nService); private auth = inject(AuthService); private router = inject(Router);
  email = 'admin@linaquirama.local'; password = 'ChangeMe123!';
  readonly loading = signal(false); readonly error = signal(''); readonly showPassword = signal(false);
  setLocale(locale: Locale) { this.i18n.setLocale(locale); }
  submit() { this.loading.set(true); this.error.set(''); this.auth.login(this.email, this.password).subscribe({ next: () => this.router.navigateByUrl('/dashboard'), error: (err) => { this.loading.set(false); this.error.set(err?.error?.title ?? 'No pudimos iniciar sesión'); } }); }
}
