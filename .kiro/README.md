# Base Spec-Driven — Centro de estética

Este directorio es la fuente de verdad para construir la aplicación. El código debe derivarse de estas decisiones y ningún cambio funcional debe implementarse sin actualizar primero la especificación afectada.

## Orden de lectura

1. `steering/product.md`: visión, alcance, lenguaje del negocio y permisos.
2. `steering/tech.md`: stack y restricciones técnicas.
3. `steering/structure.md`: arquitectura y organización del repositorio.
4. `steering/engineering.md`: reglas de calidad, seguridad y entrega.
5. `steering/ux.md`: experiencia visual y patrones de interacción.
6. `specs/beauty-center-management/requirements.md`: requisitos verificables.
7. `specs/beauty-center-management/design.md`: diseño técnico y contratos.
8. `specs/beauty-center-management/tasks.md`: plan incremental de implementación.

## Flujo de cambio

1. Proponer el cambio en lenguaje de negocio.
2. Modificar requisitos y criterios de aceptación.
3. Actualizar diseño, modelo de datos, permisos y contratos si aplica.
4. Añadir o ajustar tareas y pruebas.
5. Implementar en una rama corta.
6. Validar trazabilidad requisito → prueba → código.

## Decisiones confirmadas y pendientes

- La moneda del producto es EUR y la zona horaria del negocio es `Europe/Brussels` (Bélgica).
- El nombre corporativo oficial es **Lina Quirama Beauty Salon** y debe aparecer en PDF, reportes y exportaciones.
- Los dos logotipos oficiales ubicados en `logos/` son la fuente visual obligatoria para la aplicación y los documentos.
- Una venta puede contener varios servicios y pagos divididos.
- El precio del catálogo es el valor sugerido; el precio efectivo puede cambiarse al registrar la venta y queda como una copia histórica.
- Si el precio efectivo difiere del precio sugerido, se exige una justificación.
- El asistente crea ventas del día y consulta únicamente las creadas por él; no edita ni elimina.
- El asistente senior registra ventas con los servicios tomados y consulta/descarga reportes globales únicamente del día o del mes; no administra catálogos ni edita/elimina ventas.
- Solo el administrador puede corregir o anular registros. Las eliminaciones de ventas son lógicas para conservar la auditoría.
- El administrador mantiene los catálogos de servicios, categorías de servicio y medios de pago que alimentan las listas desplegables.
- Cada usuario puede usar la aplicación en español o inglés; la preferencia queda guardada y español es el valor inicial.
- Sigue pendiente únicamente confirmar si los bonos necesitan código o saldo propio; la dirección no es obligatoria para el MVP.
