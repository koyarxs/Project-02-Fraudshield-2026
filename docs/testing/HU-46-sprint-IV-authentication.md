# HU-46 - Autenticacion y autorizacion por rol

## Identificacion

- **Historia:** HU-46, Sprint IV.
- **Ultima ejecucion:** 27-08-2026.
- **Alcance:** JWT, inicio y cierre de sesion, cuentas activas, roles Administrador y Analista, usuarios y casos asignados.
- **Entorno:** NestJS, Prisma/PostgreSQL, Jest/Supertest y Next.js.

## Resultado ejecutivo

Se implemento una separacion real entre `ADMINISTRADOR` y `ANALISTA`. El backend valida cuenta activa y rol desde PostgreSQL en cada JWT, aplica guardas a los endpoints administrativos y limita los casos del analista por `responsibleUserId`. El Administrador asigna o reasigna casos; el Analista inicia la revision y resuelve solamente sus casos asignados cuando existen responsable, analisis, gestion y resultado final. El frontend adapta navegacion y acciones al rol autenticado.

La autorizacion automatizada esta aprobada. La HU-46 permanece **Pendiente de validacion visual** solamente para persistencia al recargar, cierre desde la interfaz y redireccion posterior, porque el frontend no dispone de una suite E2E de navegador.

## Matriz de pruebas

| ID | Caso probado | Precondicion | Pasos o metodo | Resultado esperado | Resultado obtenido | Estado | Evidencia tecnica | Incidencia |
|---|---|---|---|---|---|---|---|---|
| CP-AUTH-01 | Login de Administrador | Cuenta activa con rol Administrador | Prueba unitaria de `AuthService.login` | JWT con rol y usuario sin password | JWT emitido con `ADMINISTRADOR` | Aprobado | `auth.service.spec.ts` | - |
| CP-AUTH-02 | Login de Analista | Cuenta activa con rol Analista | Prueba unitaria de `AuthService.login` | JWT con rol Analista | JWT emitido con `ANALISTA` | Aprobado | `auth.service.spec.ts` | - |
| CP-AUTH-03 | Password incorrecta | Usuario existente | Login con password distinta al hash | HTTP 401 y auditoria de fallo | Rechazado sin emitir JWT | Aprobado | `auth.service.spec.ts` | - |
| CP-AUTH-04 | Usuario inexistente | Correo no registrado | Login sin coincidencia | HTTP 401 | Rechazado y auditado | Aprobado | `auth.service.spec.ts` | - |
| CP-AUTH-05 | Campos vacios | API con `ValidationPipe` | `POST /auth/login` con `{}` | HTTP 400 | HTTP 400 con mensajes de ambos campos | Aprobado | `app.e2e-spec.ts` | - |
| CP-AUTH-06 | Endpoint sin token | Endpoint protegido | `GET /user` sin Bearer | HTTP 401 | HTTP 401 | Aprobado | `app.e2e-spec.ts` | - |
| CP-AUTH-07 | Token invalido, vencido o huerfano | API disponible | Solicitudes con tres JWT no validos | HTTP 401 | HTTP 401 en los tres casos | Aprobado | `jwt.strategy.spec.ts`, `app.e2e-spec.ts` | INC-HU46-01 corregida |
| CP-AUTH-08 | Cuenta inactiva | Usuario con `active=false` | Ejecutar login | HTTP 401 sin JWT | Cuenta rechazada | Aprobado | `auth.service.spec.ts` | - |
| CP-AUTH-09 | Administracion por Administrador | JWT Administrador | Consultar usuarios y auditoria | HTTP 200 | HTTP 200; passwords omitidas | Aprobado | `app.e2e-spec.ts` | - |
| CP-AUTH-10 | Operacion por Analista | JWT Analista | Consultar transacciones, lotes, listas y casos | HTTP 200 | HTTP 200 | Aprobado | `app.e2e-spec.ts` | - |
| CP-AUTH-11 | Analista administra usuarios/auditoria | JWT Analista | `GET /user` y `GET /audit-log` | HTTP 403 | HTTP 403, sesion conservada | Aprobado | `app.e2e-spec.ts` | - |
| CP-AUTH-12 | Analista modifica caso ajeno | Caso asignado a otro usuario | Consultar y reasignar por API | HTTP 403 | HTTP 403 en consulta y actualizacion | Aprobado | `risk-case.service.spec.ts`, `app.e2e-spec.ts` | - |
| CP-AUTH-13 | Analista reasigna su caso | Caso propio | Enviar `responsibleUserId` | HTTP 403 | Operacion rechazada | Aprobado | `risk-case.service.spec.ts` | - |
| CP-AUTH-14 | Listado de casos del Analista | JWT Analista | Consultar `GET /risk-case` | Solo casos propios | Consulta agrega `responsibleUserId` | Aprobado | `risk-case.service.spec.ts` | - |
| CP-AUTH-15 | Persistencia, logout y bloqueo posterior | Sesion iniciada en navegador | Recargar, cerrar sesion y abrir `/dashboard` | Persiste antes del logout; luego elimina sesion y redirige | Implementado, falta ejecucion E2E de navegador | Pendiente de validacion visual | `AuthContext.tsx`, `auth.service.ts`, `AuthGuard.tsx` | - |
| CP-AUTH-16 | Administrador asigna un caso | Caso pendiente sin responsable | Actualizar prioridad y `responsibleUserId` como Administrador | Caso asignado y notificacion al Analista | Asignacion, timeline y notificacion ejecutados | Aprobado | `risk-case.service.spec.ts` | - |
| CP-AUTH-17 | Analista inicia la revision | Caso propio en estado Pendiente | Cambiar estado a `EN_REVISION` | Revision iniciada y Administrador notificado | Estado y notificacion ejecutados | Aprobado | `risk-case.service.spec.ts` | - |
| CP-AUTH-18 | Analista resuelve su caso | Caso propio En revision con datos completos | Registrar analisis, gestion, resultado y `RESUELTO` | Cierre, timeline, auditoria y notificacion al Administrador | Flujo aceptado; reasignacion y casos ajenos siguen rechazados | Aprobado | `risk-case.service.spec.ts` | - |

## Permisos comprobados

| Modulo o accion | Administrador | Analista |
|---|---|---|
| Dashboard, transacciones, resultados, historial y perfil | Acceso | Acceso |
| Carga y procesamiento de archivos | Gestion | Sin acceso |
| Casos | Todos; asigna, reasigna y consulta el cierre | Solo asignados; inicia, registra la revision y resuelve; no asigna ni cambia prioridad |
| Usuarios | Crea, consulta, actualiza y desactiva | HTTP 403 |
| Watchlist y Allowlist | Administra | Solo consulta |
| Auditoria | Acceso completo | HTTP 403 |
| Reportes | Todas las categorias, incluida auditoria | Reportes operacionales sin auditoria |

`DELETE /user/:id` conserva relaciones e historial: ahora desactiva la cuenta en vez de eliminarla fisicamente.

## Datos conservados

- `admin@fraudshield.cl`: `ADMINISTRADOR`, activo.
- `yerko@fraudshield.cl`: `ANALISTA`, activo.
- Tres cuentas duplicadas, tecnicas o de pruebas: conservadas con todas sus relaciones y marcadas inactivas.
- No se eliminaron usuarios, casos, relaciones ni registros de auditoria.

## Validaciones ejecutadas

| Validacion | Resultado |
|---|---|
| Backend lint | Aprobado |
| Backend build | Aprobado |
| Backend unitarias | 26 suites, 51 pruebas aprobadas |
| Backend E2E | 1 suite, 10 pruebas aprobadas |
| Frontend lint | Aprobado |
| Frontend TypeScript | Aprobado |
| Frontend build | Aprobado; 14 rutas estaticas |
| Frontend E2E de navegador | No disponible en el proyecto |

## Validacion visual pendiente

1. Iniciar sesion con cada cuenta activa y recargar `/dashboard`.
2. Confirmar que el Administrador ve Carga y Auditoria y que el Analista no las ve.
3. Con el Administrador, abrir un caso pendiente, asignarlo a Yerko y confirmar que permanece en el detalle actualizado.
4. Con Yerko, abrir "Mis casos", iniciar la revision, registrar analisis y gestion, elegir un resultado final y resolver.
5. Volver a iniciar sesion como Administrador y confirmar el cierre y los eventos del timeline.
6. Cerrar sesion, confirmar que `access_token` y `user` desaparecen de Local Storage y abrir `/dashboard` directamente.
7. Confirmar la redireccion a `/login?next=%2Fdashboard` y el retorno correcto tras volver a iniciar sesion.

## Limitaciones

- No existe un endpoint backend de logout ni revocacion de JWT; el cierre del MVP elimina la sesion local.
- No existe una pagina frontend para administrar usuarios, aunque la API administrativa esta autorizada por rol.
- No existe un endpoint dedicado de reportes; el frontend consolida endpoints de lectura existentes.
- Actualmente Yerko no tiene casos asignados en PostgreSQL. El flujo completo se cubrio mediante pruebas de servicio y la visibilidad por rol mediante E2E de solo lectura, sin consumir el caso pendiente de la demostracion.
- La configuracion JWT aun usa el mecanismo existente del proyecto; no se modifico la politica de secretos en esta historia.

## Archivos de la implementacion

- Modelo y migracion: `backend/prisma/schema.prisma`, `backend/prisma/migrations/20260827000100_user_roles_and_status/migration.sql`.
- Autenticacion y roles: `backend/src/auth/*`.
- Autorizacion de recursos: controladores de usuarios, auditoria, procesamiento, lotes, listas, metricas, transacciones, resultados, reglas y casos.
- Restriccion de casos: `backend/src/risk-case/risk-case.service.ts` y `backend/src/transaction/transaction.service.ts`.
- Interfaz por rol: `frontend/src/components/auth/AuthGuard.tsx`, `Sidebar.tsx`, pantallas de Casos, Transacciones, Listas de control, Reportes y Perfil, y servicios de autenticacion/API.
- Pruebas: `backend/src/auth/*.spec.ts`, `backend/src/user/user.service.spec.ts`, `backend/src/risk-case/risk-case.service.spec.ts`, `backend/test/app.e2e-spec.ts`.

## Dictamen

La separacion de permisos y el flujo Administrador -> Analista -> cierre estan **implementados y aprobados por pruebas de backend**. El sistema queda apto para iniciar la prueba formal; para cerrar la evidencia del Sprint IV queda pendiente registrar el recorrido visual completo en navegador.
