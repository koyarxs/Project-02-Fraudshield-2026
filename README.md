# 🛡️ FraudShield

### Sistema Full Stack para clasificación de riesgo en transacciones digitales

FraudShield es un proyecto de título desarrollado como parte de la carrera de
Ingeniería en Computación e Informática.

El sistema permite procesar registros transaccionales digitales mediante archivos
CSV, aplicar reglas de evaluación de riesgo y clasificar las transacciones según
su nivel de riesgo.

El objetivo de FraudShield es apoyar el análisis de transacciones en un entorno
controlado, facilitando la identificación de señales de riesgo, la trazabilidad
de los resultados y la generación de información para su posterior análisis.

> FraudShield clasifica niveles de riesgo y detecta señales asociadas a reglas
> predefinidas. No determina ni confirma la existencia de fraude.

---

## 🚀 Funcionalidades principales

- 🔐 Autenticación mediante JWT
- 👥 Gestión de usuarios y perfiles
- 📁 Carga y validación de archivos CSV
- ⚙️ Procesamiento de transacciones por lotes
- 🛡️ Motor de reglas de riesgo R1–R5
- 📊 Cálculo de score y clasificación de riesgo
- 🚦 Clasificación BAJO / MEDIO / ALTO
- 📈 Dashboard y métricas
- 🕒 Historial y trazabilidad
- 🔎 Gestión y revisión de resultados
- 📋 Auditoría de operaciones
- 📄 Reportes y exportación de resultados

---

## 🛡️ Motor de clasificación de riesgo

FraudShield utiliza un conjunto de reglas para analizar cada transacción y
generar una clasificación de riesgo.

| Regla | Evaluación |
|------|------------|
| R1 | Evaluación de monto de la transacción |
| R2 | Evaluación de horario |
| R3 | Evaluación de frecuencia |
| R4 | Evaluación de ubicaciones en un intervalo de tiempo |
| R5 | Transacción sin condiciones de riesgo detectadas |

El resultado de las reglas contribuye a generar un **score de riesgo**, utilizado
para clasificar cada transacción en uno de los niveles definidos por el sistema.

---

## 🏗️ Arquitectura tecnológica

FraudShield utiliza una arquitectura cliente-servidor modular por capas.

| Componente | Tecnología |
|---|---|
| Frontend | Next.js / React / TypeScript |
| Backend | NestJS / Node.js / TypeScript |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| Autenticación | JWT |
| Contenedores | Docker |
| Control de versiones | Git / GitHub |
| Pruebas API | Postman |

---

## 🗄️ Persistencia de datos

La información del sistema se almacena en PostgreSQL utilizando Prisma como ORM.

Entre las principales entidades se encuentran:

- User
- UploadedFile
- ProcessingBatch
- Transaction
- RiskLevel
- RiskRule
- RiskResult
- DashboardMetric
- AuditLog

---

## 🧪 Calidad del software

El proyecto incorpora validaciones y pruebas orientadas a comprobar el
funcionamiento de los componentes principales del sistema.

Se realizaron:

- Pruebas unitarias
- Pruebas End-to-End (E2E)
- Validaciones de autenticación
- Validaciones de autorización
- Pruebas de endpoints protegidos
- Validación de tokens JWT
- Validación de entradas
- Pruebas de compilación
- Análisis mediante lint

---

## 🔐 Seguridad

FraudShield incorpora controles básicos de seguridad para proteger el acceso
a las funcionalidades del sistema.

Entre ellos:

- Autenticación mediante JWT
- Rutas protegidas
- Validación de tokens
- Control de acceso
- Validación de entradas
- Manejo de credenciales
- Separación de responsabilidades entre frontend, backend y base de datos

---

## 🐳 Ejecución mediante contenedores

El proyecto utiliza Docker para facilitar la ejecución de los componentes y
mantener un entorno reproducible durante el desarrollo.

---

## 📦 Versión estable

**FraudShield MVP v1.0.0**

- Versión: `v1.0.0`
- Estado: **MVP estable**
- Control de versiones: **Git / GitHub**

---

## ⚠️ Alcance

FraudShield fue desarrollado como un MVP académico y funciona en un entorno
controlado.

El proyecto:

- Utiliza datos simulados.
- Procesa archivos CSV.
- Realiza procesamiento por lotes.
- No procesa transacciones en tiempo real.
- No se integra con sistemas bancarios reales.
- No determina que una transacción corresponda a fraude.
- Clasifica riesgo según las reglas implementadas.

---

## 🎓 Proyecto de título

Proyecto desarrollado como parte del proceso de titulación de la carrera de
**Ingeniería en Computación e Informática**.

**Autor:** Yerko Barrera  
**Universidad Andrés Bello**  
**Septiembre 2026**
