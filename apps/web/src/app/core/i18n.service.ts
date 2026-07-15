import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import type { Locale } from './models';

const es = {
  appName: 'Lina Quirama Beauty Salon', login: 'Iniciar sesión', email: 'Correo electrónico', username: 'Nombre de usuario', password: 'Contraseña', logout: 'Cerrar sesión',
  dashboard: 'Inicio', newSale: 'Nueva venta', sales: 'Ventas', catalogs: 'Catálogos', users: 'Usuarios', reports: 'Reportes',
  welcome: 'Bienvenida', today: 'Hoy', mySalesToday: 'Mis ventas de hoy', quickActions: 'Acciones rápidas',
  businessDate: 'Fecha del servicio', service: 'Servicio', quantity: 'Cantidad', suggestedPrice: 'Precio sugerido', chargedPrice: 'Precio cobrado',
  reason: 'Motivo del cambio de precio', addService: 'Añadir servicio', payments: 'Pagos', paymentMethod: 'Medio de pago', amount: 'Importe', addPayment: 'Dividir pago',
  notes: 'Observaciones', total: 'Total', remaining: 'Pendiente', registerSale: 'Registrar venta', saving: 'Guardando…', remove: 'Eliminar',
  saleCreated: 'Venta registrada correctamente', ownSales: 'Ventas registradas', status: 'Estado', author: 'Autor', actions: 'Acciones', void: 'Anular',
  services: 'Servicios', categories: 'Categorías', paymentMethods: 'Medios de pago', name: 'Nombre', code: 'Código', price: 'Precio', create: 'Crear', active: 'Activo', inactive: 'Inactivo',
  role: 'Perfil', temporaryPassword: 'Contraseña temporal', assistant: 'Asistente', senior: 'Asistente senior', admin: 'Administrador',
  period: 'Periodo', day: 'Día', week: 'Semana', month: 'Mes', year: 'Año', custom: 'Rango', loadReport: 'Consultar reporte', exportPdf: 'Descargar PDF', exportExcel: 'Descargar Excel',
  revenue: 'Ingresos', ticket: 'Ticket promedio', units: 'Servicios realizados', noData: 'Aún no hay datos para mostrar.', loading: 'Cargando…', retry: 'Reintentar',
  required: 'Completa los campos obligatorios.', priceReasonRequired: 'Escribe por qué cambiaste el precio precargado.', paymentsMismatch: 'La suma de pagos debe coincidir con el total.',
  language: 'Idioma', spanish: 'Español', english: 'English', search: 'Buscar', edit: 'Editar', activate: 'Activar', deactivate: 'Desactivar',
  posted: 'Registrada', voided: 'Anulada', restore: 'Restaurar', resetPassword: 'Restablecer contraseña', newTemporaryPassword: 'Nueva contraseña temporal', cancel: 'Cancelar', confirmReset: 'Restablecer', passwordResetSuccess: 'Contraseña restablecida. El usuario deberá cambiarla al iniciar sesión.', editSale: 'Editar venta', updateSale: 'Guardar cambios', saleUpdated: 'Venta actualizada correctamente', salesByUser: 'Ventas por usuario', reportTotal: 'Total del reporte', operations: 'Operaciones',
  save: 'Guardar', confirm: 'Confirmar', description: 'Descripción', displayOrder: 'Orden', createCatalogItem: 'Crear elemento', editCatalogItem: 'Editar elemento', catalogSaved: 'Catálogo guardado correctamente.', catalogsIntro: 'Configura toda la información de las opciones que usa el equipo.', searchCatalogs: 'Buscar por nombre, descripción o código', loadError: 'No fue posible cargar la información.',
  editUser: 'Editar usuario', editUserHelp: 'Actualiza el nombre, acceso, perfil y estado de la cuenta.', roleChangeWarning: 'Cambiar el perfil o estado cerrará las sesiones activas del usuario.', userSaved: 'Usuario actualizado correctamente.', salesIntro: 'Consulta, corrige o anula los registros según tus permisos.', salesLoadError: 'No fue posible cargar las ventas.',
  voidSaleTitle: 'Anular venta', restoreSaleTitle: 'Restaurar venta', voidSaleHelp: 'La venta quedará fuera de los reportes y conservará su historial.', restoreSaleHelp: 'La venta volverá a incluirse en los reportes.', voidReason: 'Motivo obligatorio de anulación',
  formErrorsTitle: 'Revisa los campos marcados antes de continuar.', fieldRequired: 'Este campo es obligatorio.', selectServiceError: 'Selecciona un servicio.', selectPaymentError: 'Selecciona un medio de pago.', invalidQuantity: 'Escribe una cantidad entera entre 1 y 100.', invalidPrice: 'Escribe un precio mayor que cero con máximo dos decimales.', invalidAmount: 'Escribe un importe mayor que cero con máximo dos decimales.', invalidDate: 'Selecciona una fecha válida.', invalidUsername: 'Usa al menos 3 caracteres: letras, números, punto, guion o guion bajo.', passwordMinLength: 'La contraseña debe tener al menos 10 caracteres.', saleSuccessTitle: '¡Venta registrada!', saleUpdateSuccessTitle: '¡Venta actualizada!', saleSuccessHelp: 'El registro quedó guardado correctamente.', folio: 'Folio', registerAnother: 'Registrar otra venta', viewSales: 'Ver ventas',
};

const en: typeof es = {
  appName: 'Lina Quirama Beauty Salon', login: 'Sign in', email: 'Email address', username: 'Username', password: 'Password', logout: 'Sign out',
  dashboard: 'Home', newSale: 'New sale', sales: 'Sales', catalogs: 'Catalogs', users: 'Users', reports: 'Reports',
  welcome: 'Welcome', today: 'Today', mySalesToday: 'My sales today', quickActions: 'Quick actions',
  businessDate: 'Service date', service: 'Service', quantity: 'Quantity', suggestedPrice: 'Suggested price', chargedPrice: 'Charged price',
  reason: 'Price change reason', addService: 'Add service', payments: 'Payments', paymentMethod: 'Payment method', amount: 'Amount', addPayment: 'Split payment',
  notes: 'Notes', total: 'Total', remaining: 'Remaining', registerSale: 'Register sale', saving: 'Saving…', remove: 'Remove',
  saleCreated: 'Sale registered successfully', ownSales: 'Registered sales', status: 'Status', author: 'Author', actions: 'Actions', void: 'Void',
  services: 'Services', categories: 'Categories', paymentMethods: 'Payment methods', name: 'Name', code: 'Code', price: 'Price', create: 'Create', active: 'Active', inactive: 'Inactive',
  role: 'Role', temporaryPassword: 'Temporary password', assistant: 'Assistant', senior: 'Senior assistant', admin: 'Administrator',
  period: 'Period', day: 'Day', week: 'Week', month: 'Month', year: 'Year', custom: 'Range', loadReport: 'Load report', exportPdf: 'Download PDF', exportExcel: 'Download Excel',
  revenue: 'Revenue', ticket: 'Average ticket', units: 'Services performed', noData: 'There is no data to display yet.', loading: 'Loading…', retry: 'Retry',
  required: 'Complete all required fields.', priceReasonRequired: 'Explain why you changed the prefilled price.', paymentsMismatch: 'Payments must match the total.',
  language: 'Language', spanish: 'Español', english: 'English', search: 'Search', edit: 'Edit', activate: 'Activate', deactivate: 'Deactivate',
  posted: 'Posted', voided: 'Voided', restore: 'Restore', resetPassword: 'Reset password', newTemporaryPassword: 'New temporary password', cancel: 'Cancel', confirmReset: 'Reset', passwordResetSuccess: 'Password reset. The user must change it at next sign-in.', editSale: 'Edit sale', updateSale: 'Save changes', saleUpdated: 'Sale updated successfully', salesByUser: 'Sales by user', reportTotal: 'Report total', operations: 'Operations',
  save: 'Save', confirm: 'Confirm', description: 'Description', displayOrder: 'Order', createCatalogItem: 'Create item', editCatalogItem: 'Edit item', catalogSaved: 'Catalog saved successfully.', catalogsIntro: 'Configure all information for the options used by your team.', searchCatalogs: 'Search by name, description or code', loadError: 'The information could not be loaded.',
  editUser: 'Edit user', editUserHelp: 'Update the account name, access, role and status.', roleChangeWarning: "Changing the user's role or status will close their active sessions.", userSaved: 'User updated successfully.', salesIntro: 'Review, correct or void records according to your permissions.', salesLoadError: 'Sales could not be loaded.',
  voidSaleTitle: 'Void sale', restoreSaleTitle: 'Restore sale', voidSaleHelp: 'The sale will be excluded from reports while retaining its history.', restoreSaleHelp: 'The sale will be included in reports again.', voidReason: 'Required void reason',
  formErrorsTitle: 'Review the marked fields before continuing.', fieldRequired: 'This field is required.', selectServiceError: 'Select a service.', selectPaymentError: 'Select a payment method.', invalidQuantity: 'Enter a whole quantity between 1 and 100.', invalidPrice: 'Enter a price greater than zero with no more than two decimals.', invalidAmount: 'Enter an amount greater than zero with no more than two decimals.', invalidDate: 'Select a valid date.', invalidUsername: 'Use at least 3 characters: letters, numbers, dots, dashes or underscores.', passwordMinLength: 'The password must contain at least 10 characters.', saleSuccessTitle: 'Sale registered!', saleUpdateSuccessTitle: 'Sale updated!', saleSuccessHelp: 'The record was saved successfully.', folio: 'Folio', registerAnother: 'Register another sale', viewSales: 'View sales',
};

export type TranslationKey = keyof typeof es;

@Injectable({ providedIn: 'root' })
export class I18nService {
  private document = inject(DOCUMENT);
  readonly locale = signal<Locale>((localStorage.getItem('lq_locale') as Locale) || 'es');
  constructor() { this.apply(this.locale()); }
  t(key: TranslationKey) { return (this.locale() === 'en' ? en : es)[key] ?? es[key]; }
  setLocale(locale: Locale) { this.locale.set(locale); localStorage.setItem('lq_locale', locale); this.apply(locale); }
  formatMoney(value: string | number) { return new Intl.NumberFormat(this.locale() === 'es' ? 'es-BE' : 'en-BE', { style: 'currency', currency: 'EUR' }).format(Number(value)); }
  formatDate(value: string) { return new Intl.DateTimeFormat(this.locale() === 'es' ? 'es-BE' : 'en-BE', { dateStyle: 'medium', timeZone: 'Europe/Brussels' }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`)); }
  private apply(locale: Locale) { this.document.documentElement.lang = locale; }
}
