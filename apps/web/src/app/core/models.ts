export type Role = 'ADMIN' | 'SENIOR_ASSISTANT' | 'ASSISTANT';
export type Locale = 'es' | 'en';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  preferredLocale: Locale;
  mustChangePassword: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface Category { id: string; name: string; description?: string; displayOrder: number; status: 'ACTIVE' | 'INACTIVE'; }
export interface PaymentMethod { id: string; code: string; name: string; description?: string; displayOrder: number; status: 'ACTIVE' | 'INACTIVE'; }
export interface Service { id: string; name: string; description?: string; categoryId?: string; category?: Category; suggestedPrice: string; status: 'ACTIVE' | 'INACTIVE'; }
export interface SaleItem { id?: string; serviceId: string; serviceNameSnapshot?: string; quantity: number; suggestedUnitPriceSnapshot?: string; effectiveUnitPrice: string; priceOverrideReason?: string | null; lineTotal?: string; }
export interface SalePayment { id?: string; paymentMethodId: string; paymentMethodNameSnapshot?: string; amount: string; reference?: string; }
export interface Sale { id: string; folio: string; businessDate: string; status: 'POSTED' | 'VOIDED'; totalAmount: string; notes?: string; version: number; createdBy: { id: string; name: string }; items: SaleItem[]; payments: SalePayment[]; }

export interface Report {
  period: string; from: string; to: string; currency: 'EUR';
  summary: { salesCount: number; serviceUnits: number; grossRevenue: string; averageTicket: string };
  byDay: ReportRow[]; byService: ReportRow[]; byPayment: ReportRow[]; byUser: ReportRow[];
  sales: Array<{ id: string; folio: string; businessDate: string; author: string; total: string }>;
}
export interface ReportRow { id: string; name: string; total: string; count: number; }
