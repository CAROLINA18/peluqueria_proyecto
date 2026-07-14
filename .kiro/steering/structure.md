# Steering de estructura y arquitectura

## Repositorio objetivo

```text
/
├── .kiro/
├── apps/
│   ├── web/                         # Angular
│   └── api/                         # Express y composición del monolito
├── packages/
│   ├── contracts/                   # DTO, schemas y tipos sin lógica de infraestructura
│   ├── config/                      # configuración compartida de tooling
│   └── ui-tokens/                   # tokens visuales, no componentes acoplados al negocio
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── scripts/
├── tests/e2e/
├── docs/
│   ├── openapi.yaml
│   └── operations.md
├── compose.yaml
├── compose.dev.yaml
├── Dockerfile
├── package.json
└── README.md
```

## Módulos de backend

```text
apps/api/src/
├── app/                 # creación de Express, middleware y rutas
├── modules/
│   ├── auth/
│   ├── users/
│   ├── catalogs/
│   ├── sales/
│   ├── reports/
│   └── audit/
├── shared/
│   ├── errors/
│   ├── http/
│   ├── security/
│   ├── observability/
│   └── database/
└── server.ts
```

Cada módulo sigue la dirección:

`route/controller → application service/use case → repository port → Prisma adapter`.

- Los controladores solo traducen HTTP.
- Los casos de uso contienen reglas y autorización contextual.
- Los repositorios ocultan Prisma a la capa de aplicación.
- Las transacciones se delimitan en casos de uso.
- Un módulo no consulta tablas de otro módulo directamente salvo mediante un puerto explícito.
- No se crean capas vacías por ceremonia; toda abstracción debe proteger una regla o permitir una prueba útil.

## Estructura de frontend

```text
apps/web/src/app/
├── core/               # sesión, interceptores, layout y servicios singleton
├── shared/             # UI genérica, pipes y utilidades sin reglas de negocio
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── sales/
│   ├── catalogs/
│   ├── users/
│   └── reports/
└── app.routes.ts
```

- Componentes standalone y rutas lazy-loaded por feature.
- Los componentes de página orquestan; los presentacionales reciben inputs y emiten eventos.
- Acceso HTTP encapsulado en servicios/gateways tipados.
- Estado global mínimo: sesión y preferencias. El estado de formularios permanece local.
- Ningún componente decide permisos con strings dispersos; se usa una política central tipada.
- Cada feature mantiene claves equivalentes en `i18n/es.json` e `i18n/en.json`; CI rechaza claves faltantes o sobrantes.
- Se evita `any`, suscripciones anidadas y efectos con mutaciones ocultas.

## Convenciones

- Código, rutas y nombres técnicos en inglés; la interfaz usa catálogos español/inglés y la documentación de negocio se mantiene en español.
- Archivos en `kebab-case`, clases/tipos en `PascalCase`, variables/funciones en `camelCase`.
- IDs opacos (UUID/ULID) expuestos por API; no se exponen secuencias predecibles.
- Fechas de instante en UTC con ISO-8601; `businessDate` como fecha `YYYY-MM-DD` sin conversión implícita.
- Dinero por API como string decimal y moneda, por ejemplo `{ "amount": "25.00", "currency": "EUR" }`.
- Todas las listas tienen paginación, orden estable y filtros explícitos.
- Ninguna respuesta expone entidades ORM directamente; siempre usa DTO.

## Límites de dependencias

- `web` puede depender de `contracts` y `ui-tokens`.
- `api` puede depender de `contracts` y `config`.
- `contracts` no depende de Angular, Express, Prisma ni del DOM.
- `catalogs`, `sales`, `reports` y `users` no importan entre sí implementaciones concretas.
- Exportadores PDF/XLSX implementan puertos del módulo `reports`.
