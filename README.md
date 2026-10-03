# ContainerIQ — Inspección de contenedores

API REST y dashboard administrativo en español. Node.js, Express 5, TypeScript estricto, Prisma 6 y PostgreSQL; React 18, Vite 6, Tailwind CSS 4, HeroUI 2 y Recharts 3. El archivo `package-lock.json` fija las dependencias. No se usa `any` en el código de la aplicación.

## Inicio rápido

Requisitos: Node.js **22.12 o posterior**, npm y PostgreSQL 16+ (local o con Docker Compose).

Desde la raíz, en PowerShell:

```powershell
npm ci
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
# Omite este comando si ya tienes PostgreSQL y configura DATABASE_URL en backend/.env.
docker compose up -d postgres
npm run db:generate
npm run db:migrate
# Opcional: carga datos con prefijo DEMO. No elimina registros ni envía SMS.
npm run db:seed
npm run dev
```

Dashboard: <http://localhost:5173>. API: <http://127.0.0.1:3001/api>. Salud de PostgreSQL: `GET /api/health`.

Si tu PostgreSQL ya ocupa el puerto 5432, usa esa instancia con una base propia, o cambia el puerto de Compose y `DATABASE_URL`. La contraseña de Compose es exclusivamente para desarrollo local. `db:migrate` aplica la migración versionada, sin reiniciar ni borrar bases de datos.

## Estructura

```text
backend/
  prisma/schema.prisma                 Modelos, relaciones e índices
  prisma/migrations/                   Migración SQL inicial y restricciones
  prisma/seed.ts                        Datos DEMO opcionales e idempotentes
  src/app.ts                           Configuración de Express
  src/server.ts                        Arranque, configuración y cierre
  src/routes.ts                        Rutas /api y credencial de ingestión
  src/controllers/                     Controladores de reportes y estadísticas
  src/repositories/                    Persistencia y agregaciones de PostgreSQL
  src/services/sms.service.ts           Adaptador HTTP de Twilio
  src/middleware/error-handler.ts       Respuestas JSON de error
  src/schemas.ts                       Validación Zod y tipos de entrada
  tests/                               Pruebas HTTP, SMS, fechas y PostgreSQL
frontend/
  src/App.tsx                          Dashboard y composición de secciones
  src/components/                      Controles, KPIs, gráficos e historial
  src/hooks/useDashboardData.ts         Consultas, debounce, cancelación y carga
  src/lib/api.ts                       Cliente HTTP, validación y descarga CSV
  src/types.ts                         Contratos JSON validados con Zod
  tests/                               Búsqueda, errores y respuestas obsoletas
examples/send_report.py                 Ejemplo de integración desde Python
```

## Contrato de la API

### POST /api/reports

```json
{
  "serial_number": "MSKU123",
  "image_url": "https://example.com/container.jpg",
  "damages": [
    { "type": "rust", "confidence": 0.89 },
    { "type": "hole", "confidence": 0.96 }
  ]
}
```

`image_url` es opcional. `damages` es obligatorio y puede estar vacío. Tipos aceptados: `hole`, `rust`, `dent`; confianza numérica entre 0 y 1. Se admiten hasta 500 detecciones por inspección. Seriales de 3–32 caracteres alfanuméricos o guiones, normalizados a mayúsculas; se acepta el ejemplo abreviado `MSKU123`, sin imponer validación ISO 6346. Los campos adicionales y las URLs que no sean HTTP/HTTPS se rechazan.

Respuesta **201**:

```json
{
  "data": {
    "id": "2c51f0cc-5a88-4d77-b5f0-646f99df25a8",
    "serial_number": "MSKU123",
    "timestamp": "2026-10-02T12:00:00.000Z",
    "image_url": null,
    "damages": [
      {
        "id": "4b9df4a3-0774-41b2-9b67-10f9206d5c86",
        "report_id": "2c51f0cc-5a88-4d77-b5f0-646f99df25a8",
        "damage_type": "rust",
        "confidence": 0.89
      }
    ]
  },
  "alert": { "status": "disabled", "accepted": 0, "failed": 0 }
}
```

El servidor asigna el UUID y la fecha. Prisma guarda el reporte y sus daños de forma atómica. Cada POST representa una inspección nueva, incluso para un serial ya registrado. No reintentes automáticamente un POST después de un timeout: podría haberse guardado; esta versión no implementa claves de idempotencia.

### GET /api/stats?period=weekly

`period` admite `weekly` (predeterminado) y `monthly`. Ejemplo de estructura:

```json
{
  "period": "weekly",
  "start": "2026-09-26T00:00:00.000Z",
  "end": "2026-10-02T12:00:00.000Z",
  "total_scanned": 100,
  "total_damaged": 20,
  "damage_rate": 20,
  "damage_counts": [
    { "type": "hole", "count": 5 },
    { "type": "rust", "count": 15 },
    { "type": "dent", "count": 8 }
  ],
  "timeline": [{ "date": "2026-09-26", "scanned": 14, "damaged": 3 }]
}
```

El ejemplo abrevia `timeline`: la respuesta real contiene **7 o 30 días**, incluyendo días sin actividad. Semanal incluye hoy y seis días anteriores; mensual incluye hoy y 29 anteriores. Inicio a medianoche UTC; fin en el momento de la consulta. La semana y el mes no son periodos calendario en este endpoint.

Los totales cuentan **inspecciones**, no seriales únicos. Una inspección con varios daños cuenta una sola vez como dañada. La distribución cuenta **detecciones**: dos regiones de óxido cuentan dos. Por eso su suma puede superar `total_damaged`. La tasa de daño es 0 cuando no hay inspecciones. Las consultas comparten una transacción de lectura consistente.

### GET /api/reports

Parámetros opcionales:

| Parámetro                   | Comportamiento                                                            |
| --------------------------- | ------------------------------------------------------------------------- |
| `search=MSKU123`            | Coincidencia exacta del serial normalizado; no mezcla seriales similares. |
| `period=weekly` o `monthly` | Mismo intervalo UTC de estadísticas; omitido retorna todo el historial.   |
| `page=1`                    | Página, desde 1.                                                          |
| `limit=10`                  | Tamaño de página, entre 1 y 100.                                          |

Respuesta: `{ "data": [reportesConDaños], "pagination": { "page": 1, "limit": 10, "total": 42, "total_pages": 5 } }`.

Orden descendente por fecha e ID. Sin resultados: `data: []`, `total: 0`, `total_pages: 0`. El dashboard pasa periodo y búsqueda al historial; los KPIs y gráficos permanecen globales para ese periodo.

### GET /api/reports/export

Descarga CSV UTF-8 con BOM y columnas `Número de serie`, `Fecha`, `Tipos de daño`, generado con `@json2csv/plainjs`. Incluye únicamente inspecciones con daños del **mes calendario actual en UTC**, desde el primer día inclusive hasta el primer día del siguiente mes exclusivo. Es independiente de los filtros visibles. Una fila por inspección; tipos únicos separados por comas. Si no hay daños se descargan sólo los encabezados. Valores potencialmente interpretables como fórmulas se neutralizan.

### Errores

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Revisa los datos enviados.",
    "details": [{ "path": "damages.0.confidence", "message": "..." }]
  }
}
```

Códigos HTTP: 400 validación/JSON, 401 credencial de ingestión, 404 ruta, 413 cuerpo mayor a 1 MB, 503 base de datos no disponible y 500 error interno. Los errores internos no exponen credenciales ni trazas al cliente.

## Alertas SMS

Configura en `backend/.env`:

```dotenv
TWILIO_ACCOUNT_SID=AC...32_caracteres_hexadecimales...
TWILIO_AUTH_TOKEN=tu_token
TWILIO_FROM=+15555550101
ALERT_PHONE_NUMBERS=+525555555501,+525555555502
```

Usa números reales autorizados en tu cuenta Twilio. Todas las variables son obligatorias para habilitar el envío; dejarlas todas vacías desactiva SMS. Se usa la [API Messages de Twilio](https://www.twilio.com/docs/messaging/api/message-resource), con timeout de 8 segundos y una solicitud por destinatario.

Se envía una alerta por cada inspección con **cualquier daño**, conforme al requisito específico de `POST /api/reports`; no hay umbral de gravedad implícito. Estados: `not_required` (sin daños), `disabled` (sin configuración), `accepted` (proveedor aceptó los envíos) y `failed` (algún envío falló). `accepted` no confirma entrega al teléfono. Los fallos se registran con el ID del reporte; no revierten la inspección ni provocan un 500 tras guardarla. Esta versión no incluye cola durable, reintentos automáticos ni webhooks de entrega.

## Integración Python / IA

```powershell
python -m pip install requests
python examples/send_report.py
```

El ejemplo envía un payload fijo y muestra el contrato que debe producir tu módulo YOLO/EasyOCR. Configura `REPORTS_API_URL` y, si aplica, `INGEST_API_KEY` en el entorno de Python. No se incluyen ni se han entrenado modelos de detección/OCR: el alcance implementado es la API y el dashboard solicitados. En el módulo de inferencia, transforma las clases a `hole`, `rust`, `dent` y los valores tensoriales a `float` antes de serializar. `image_url` referencia una imagen ya alojada; la API no recibe ni almacena archivos binarios.

## Verificación

```powershell
npm run typecheck
npm test
npm run build
npm run format:check
```

Las pruebas habituales usan dobles de repositorio/proveedor. Para las cinco pruebas adicionales de integración, crea una base **descartable** llamada exactamente `container_inspection_test`, aplica las migraciones a esa base y configura `TEST_DATABASE_URL`:

```powershell
$env:DATABASE_URL='postgresql://USUARIO:CLAVE@localhost:5432/container_inspection_test?schema=public'
npm run db:migrate
$env:TEST_DATABASE_URL=$env:DATABASE_URL
npm test
Remove-Item Env:DATABASE_URL
Remove-Item Env:TEST_DATABASE_URL
```

Las pruebas de integración borran los reportes de esa base antes de cada caso y al finalizar; rechazan otros nombres de base. Sin `TEST_DATABASE_URL` se omiten. Cubren transacciones, restricciones, agregaciones, paginación, búsquedas y límites del mes. Las pruebas SMS usan un transporte simulado, sin enviar mensajes reales.

## Ejecución de producción

```powershell
npm ci
npm run db:generate
npm run db:migrate
npm run build
npm run start -w backend
```

Sirve `frontend/dist` con un servidor estático que redirija `/api` al backend. Alternativamente, configura `VITE_API_BASE_URL` con el origen del backend **antes** del build y ajusta `FRONTEND_ORIGIN`. Configura `HOST` según el entorno; por defecto sólo escucha en loopback.

El dashboard administrativo todavía requiere autenticación/autorización de operadores en el proxy o una capa de acceso antes de exponerlo en Internet. `INGEST_API_KEY` protege sólo el POST del módulo IA y nunca debe ponerse en variables `VITE_*`. Los endpoints de lectura no incluyen autenticación de usuarios. Para grandes volúmenes conviene convertir la exportación en una tarea por lotes: actualmente construye el CSV del mes en memoria.

La integración visual sigue la [guía oficial de HeroUI para Vite](https://v2.heroui.com/docs/frameworks/vite), con Tailwind 4 y el proveedor de HeroUI en la raíz.
