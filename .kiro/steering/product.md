# Steering de producto

## Visión

Reemplazar el formulario manual de caja diaria por una aplicación rápida, segura y agradable para registrar los servicios realizados en un centro de estética, mantener precios, controlar el acceso por perfil y obtener reportes confiables exportables.

El nombre corporativo oficial del producto y de sus documentos es **Lina Quirama Beauty Salon**.

Los archivos `logos/IMG-20260714-WA0010.jpg` y `logos/IMG-20260714-WA0011.jpg` constituyen la identidad gráfica oficial y deben guiar el look & feel.

El producto prioriza el uso diario desde móvil o tableta sin sacrificar una experiencia completa en escritorio.

## Objetivos

- Registrar una venta cotidiana en menos de un minuto y con el mínimo de escritura.
- Evitar la repetición de bloques fijos como “Servicio 1…14”; la interfaz añade o quita líneas dinámicamente.
- Conservar el precio realmente cobrado aun cuando el precio del catálogo cambie después.
- Dar a cada perfil solo la información y acciones que necesita.
- Producir cierres y reportes reproducibles por día, semana, mes y año.
- Permitir que cada usuario trabaje en español o inglés según su preferencia guardada.
- Facilitar que cualquier miembro del equipo instale y despliegue el sistema con Docker y scripts documentados.

## Fuera de alcance inicial

- Agenda de citas, turnos o disponibilidad de cabinas.
- Historias clínicas, fichas sensibles de clientes o consentimientos.
- Inventario, compras, proveedores, nómina o cálculo de comisiones.
- Facturación electrónica o integración contable/fiscal.
- Pagos en línea o conexión directa con terminales de tarjeta.
- Aplicación móvil nativa y funcionamiento offline.
- Arquitectura de microservicios o multi-sede.

Estos puntos requieren una nueva especificación; no deben añadirse incidentalmente.

## Lenguaje ubicuo

- **Servicio de catálogo**: tratamiento ofrecido, con nombre, descripción opcional, precio sugerido y estado activo/inactivo.
- **Categoría de servicio**: agrupación administrable para ordenar y filtrar servicios, por ejemplo uñas, masajes o depilación.
- **Venta**: operación registrada en caja con fecha de negocio, autor, observaciones, uno o más servicios realizados y uno o más pagos.
- **Línea de venta**: servicio realizado dentro de una venta, con cantidad, precio sugerido capturado, precio unitario efectivo y subtotal.
- **Medio de pago**: opción administrable que aparece en la lista desplegable de cobro, por ejemplo tarjeta o efectivo.
- **Pago**: asignación de un importe a un medio de pago dentro de una venta.
- **Fecha de negocio**: día al que pertenece la venta según la zona horaria configurada del centro.
- **Anulación**: baja lógica de una venta; no destruye el historial.
- **Reporte**: agregación de ventas no anuladas en un rango autorizado.
- **Autor**: usuario autenticado que crea el registro.

En UI y API se debe evitar usar “servicio” de forma ambigua: usar “catálogo de servicios”, “servicio realizado” o “línea de venta”.

## Perfiles y permisos

| Capacidad | Administrador | Asistente senior | Asistente |
|---|:---:|:---:|:---:|
| Iniciar sesión y gestionar su sesión | Sí | Sí | Sí |
| Elegir idioma español/inglés | Sí | Sí | Sí |
| Crear ventas | Sí | Sí | Sí, solo fecha de negocio actual |
| Consultar ventas propias | Sí | Sí | Sí |
| Consultar ventas de otros | Sí | Solo mediante reportes | No |
| Editar o anular cualquier venta | Sí | No | No |
| Consultar reportes globales | Día, semana, mes, año y rango | Solo día y mes | No |
| Exportar reportes PDF/XLSX | Día, semana, mes, año y rango | Solo día y mes | No |
| Crear/editar/desactivar catálogos (servicios, categorías y medios de pago) | Sí | No | No |
| Crear/editar/desactivar usuarios | Sí | No | No |
| Ver auditoría | Sí | No | No |

Las autorizaciones se aplican siempre en el backend. Ocultar controles en Angular mejora la UX, pero no constituye seguridad.

## Reglas de negocio esenciales

1. Una venta válida tiene al menos una línea y un pago.
2. Todos los importes se almacenan como decimales exactos; nunca como punto flotante.
3. El total de pagos debe ser exactamente igual al total de las líneas.
4. El precio efectivo se inicializa con el precio vigente del catálogo y puede editarse antes de guardar.
5. Un cambio de precio efectivo exige motivo y queda auditado con el precio sugerido original.
6. Los cambios futuros en el catálogo no alteran ventas históricas.
7. Un servicio inactivo no aparece para ventas nuevas, pero sigue visible en históricos.
8. Un medio de pago inactivo no aparece en ventas nuevas, pero su nombre y código capturados siguen visibles en históricos.
9. No se elimina físicamente una venta, un usuario ni un elemento de catálogo referenciado.
10. No se permite desactivar al último administrador activo ni al último medio de pago activo.
11. El correo de usuario es único sin distinguir mayúsculas/minúsculas.
12. La fecha de negocio se evalúa en `Europe/Brussels`, incluyendo sus cambios de horario de verano.
13. Las semanas de reporte del administrador usan ISO-8601 (lunes a domingo).
14. El idioma predeterminado es español; cada usuario puede cambiar a inglés y la preferencia persiste entre sesiones.
15. Todo reporte visible, PDF y libro XLSX debe identificar al negocio como **Lina Quirama Beauty Salon**.
16. La aplicación y los PDF deben usar los logotipos oficiales del repositorio sin deformarlos, recolorearlos ni sustituirlos por una marca generada.

## Indicadores de éxito

- Mediana de registro de venta menor a 60 segundos en móvil.
- Cero accesos exitosos fuera de la matriz de permisos en pruebas automatizadas.
- Cero diferencias entre total mostrado, total persistido y total exportado.
- Primera instalación local completada por un compañero siguiendo solo el README y un comando.
- Reportes habituales generados en menos de 2 segundos con hasta 100.000 ventas, excluyendo el tiempo de descarga.
