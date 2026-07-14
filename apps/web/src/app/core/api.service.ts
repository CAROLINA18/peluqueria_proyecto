import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  get<T>(path: string, params?: Record<string, string>) { return this.http.get<T>(`/api/v1${path}`, { headers: this.auth.headers(), params }); }
  post<T>(path: string, body: unknown, extraHeaders: Record<string, string> = {}) { return this.http.post<T>(`/api/v1${path}`, body, { headers: { ...this.auth.headers(), ...extraHeaders } }); }
  patch<T>(path: string, body: unknown) { return this.http.patch<T>(`/api/v1${path}`, body, { headers: this.auth.headers() }); }
  put<T>(path: string, body: unknown, version: number) { return this.http.put<T>(`/api/v1${path}`, body, { headers: { ...this.auth.headers(), 'If-Match': String(version) } }); }
  download(path: string, params: Record<string, string>) { return this.http.get(`/api/v1${path}`, { headers: this.auth.headers(), params, responseType: 'blob', observe: 'response' }); }
}
