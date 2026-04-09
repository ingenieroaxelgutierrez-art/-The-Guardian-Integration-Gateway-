# Guardian Integration Gateway

A production-ready Node.js backend that combines **AI-designed input sanitization**, **circuit-breaker resilience**, and **encrypted audit logging** into a clean, layered architecture.

---

## Overview

Guardian Integration Gateway acts as a secure intermediary between untrusted user input and downstream services. Every request is sanitized, protected by a circuit breaker, and traced through tamper-evident encrypted logs — all with minimal latency overhead.

---

## Architecture Decisions

```
HTTP Request
    │
    ▼
┌──────────────────────────────────────────────────────┐
│  Security Headers  (Helmet)                          │
│  Rate Limiting     (express-rate-limit)              │
├──────────────────────────────────────────────────────┤
│  Middleware  →  inputValidation.js                   │
│  (shape validation, size limit)                      │
├──────────────────────────────────────────────────────┤
│  Controller  →  gatewayController.js                 │
│  (HTTP plumbing, audit logging)                      │
├──────────────────────────────────────────────────────┤
│  Service     →  gatewayService.js                    │
│  (orchestration, circuit breaker)                    │
├──────────────────────────────────────────────────────┤
│  Security    →  sanitizer.js  /  crypto.js           │
│  (sensitive-data redaction, AES-256-GCM)             │
├──────────────────────────────────────────────────────┤
│  Resilience  →  circuitBreaker.js                    │
│  (CLOSED / OPEN / HALF-OPEN state machine)           │
└──────────────────────────────────────────────────────┘
```

| Layer | File | Responsibility |
|-------|------|----------------|
| Security headers | `app.js` | Helmet + rate limiting |
| Input validation | `middleware/inputValidation.js` | Field presence, type, size |
| Controller | `controllers/gatewayController.js` | HTTP parsing, audit trail |
| Service | `services/gatewayService.js` | Business logic coordination |
| Sanitizer | `security/sanitizer.js` | PII / sensitive data redaction |
| Crypto | `security/crypto.js` | AES-256-GCM encrypt/decrypt |
| Circuit breaker | `resilience/circuitBreaker.js` | Fail-fast cascade prevention |
| Audit logger | `audit/auditLogger.js` | JSON mock DB: original (encrypted) + redacted (plaintext) |

---

## Security Considerations

- **Input sanitization** — Emails, credit card numbers (13–16 digits), and SSNs are redacted before any outbound call. Regex patterns are pre-compiled and anchored to prevent ReDoS.
- **Encrypted audit logs** — Every request event is serialised to JSON, encrypted with AES-256-GCM (authenticated encryption), and appended to disk. Logs cannot be silently tampered with.
- **Key derivation** — Raw key material is never used directly. PBKDF2-SHA-256 with 100 000 iterations derives the final key, bound to a deployment-specific salt (`CRYPTO_SALT`).
- **Security headers** — Helmet sets `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, and CSP defaults.
- **Rate limiting** — 100 requests per IP per 15-minute window prevents brute-force and DoS abuse.
- **Body size cap** — Express JSON parser is capped at 50 KB; the middleware layer enforces a 10 000-character limit on the `message` field.
- **Non-root Docker container** — The image runs as an unprivileged `appuser`.

---

## AI Integration Explanation

The sanitizer logic was iteratively designed and reviewed using AI assistance:

1. **Prompt 1** — A senior security engineer persona generated the initial sanitizer using optimized, anchored regexes and a strict redaction order (emails → credit cards → SSNs).
2. **Prompt 2** — The same persona reviewed the output for ReDoS risks, false positives, and missing patterns, producing the hardened version in `sanitizer.js`.

This workflow (generate → review → harden) mirrors a real code-review cycle and demonstrates how AI-assisted development can be integrated responsibly into a security-sensitive codebase.

---

## How to Run Locally with Docker

### Prerequisites
- Docker ≥ 24 and Docker Compose V2

### 1. Clone and configure

```bash
git clone https://github.com/your-org/guardian-integration-gateway.git
cd guardian-integration-gateway
cp .env.example .env
# Edit .env and set AUDIT_LOG_KEY and CRYPTO_SALT to strong random values
```

### 2. Start the service

```bash
docker compose up --build
```

The API will be available at `http://localhost:3000`.

### 3. Run tests (outside Docker)

```bash
npm install
npm test
```

---

## API Endpoint Documentation

### `POST /secure-inquiry`

Sanitizes the message, runs it through a mock AI call (2 s), and records the audit log.

**Request**

```http
POST /secure-inquiry
Content-Type: application/json

{
  "userId": "user-123",
  "message": "Contact john@company.com, card 4111-1111-1111-1111"
}
```

**Success Response** `200 OK`

```json
{
  "success": true,
  "answer": "Generated Answer"
}
```

**Circuit Breaker Open** `503 Service Unavailable`

```json
{
  "success": false,
  "message": "Service Busy"
}
```

**Error Responses**

| Status | Condition |
|--------|-----------|
| `400` | Missing or invalid `userId` / `message` field |
| `413` | `message` exceeds 10 000 characters |
| `429` | Rate limit exceeded |
| `503` | Circuit breaker is OPEN — returns `"Service Busy"` instantly |
| `500` | Unexpected internal error |

**Audit log entry** (`logs/audit-db.json`)

```json
{
  "timestamp": "2026-04-08T12:00:00.000Z",
  "userId": "user-123",
  "originalEncrypted": "<AES-256-GCM ciphertext>",
  "redactedMessage": "Contact <REDACTED: EMAIL>, card <REDACTED: CREDIT_CARD>",
  "status": "SUCCESS"
}
```

---

### `GET /health`

Returns service health status. Used by Docker health-check and load balancers.

```json
{ "status": "ok" }
```

---

## Project Structure

```
guardian-integration-gateway/
├── src/
│   ├── app.js                       # Express bootstrap
│   ├── server.js                    # Entry point
│   ├── controllers/
│   │   └── gatewayController.js
│   ├── services/
│   │   └── gatewayService.js
│   ├── security/
│   │   ├── sanitizer.js
│   │   └── crypto.js
│   ├── resilience/
│   │   └── circuitBreaker.js
│   ├── audit/
│   │   └── auditLogger.js
│   └── middleware/
│       └── inputValidation.js
├── tests/
│   └── sanitizer.test.js
├── logs/                            # Encrypted audit logs (git-ignored)
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## License

MIT


---
---

# Guardian Integration Gateway *(Español)*

Un backend Node.js listo para producción que combina **sanitización de entradas diseñada con IA**, **resiliencia con circuit breaker** y **registro de auditoría cifrado** en una arquitectura limpia y por capas.

---

## Descripción General

Guardian Integration Gateway actúa como intermediario seguro entre la entrada de usuario no confiable y los servicios externos. Cada solicitud es sanitizada, protegida por un circuit breaker y trazada mediante registros cifrados a prueba de manipulaciones — todo con una sobrecarga de latencia mínima.

---

## Decisiones de Arquitectura

```
Solicitud HTTP
    │
    ▼
┌──────────────────────────────────────────────────────┐
│  Cabeceras de Seguridad  (Helmet)                    │
│  Limitación de Tasa      (express-rate-limit)        │
├──────────────────────────────────────────────────────┤
│  Middleware  →  inputValidation.js                   │
│  (validación de estructura, límite de tamaño)        │
├──────────────────────────────────────────────────────┤
│  Controlador  →  gatewayController.js                │
│  (gestión HTTP, registro de auditoría)               │
├──────────────────────────────────────────────────────┤
│  Servicio     →  gatewayService.js                   │
│  (orquestación, circuit breaker)                     │
├──────────────────────────────────────────────────────┤
│  Seguridad    →  sanitizer.js  /  crypto.js          │
│  (redacción de datos sensibles, AES-256-GCM)         │
├──────────────────────────────────────────────────────┤
│  Resiliencia  →  circuitBreaker.js                   │
│  (máquina de estados CERRADO / ABIERTO / SEMI-ABIERTO) │
└──────────────────────────────────────────────────────┘
```

| Capa | Archivo | Responsabilidad |
|------|---------|-----------------|
| Cabeceras de seguridad | `app.js` | Helmet + limitación de tasa |
| Validación de entrada | `middleware/inputValidation.js` | Presencia de campos, tipo, tamaño |
| Controlador | `controllers/gatewayController.js` | Parseo HTTP, registro de auditoría |
| Servicio | `services/gatewayService.js` | Coordinación de lógica de negocio |
| Sanitizador | `security/sanitizer.js` | Redacción de PII / datos sensibles |
| Cifrado | `security/crypto.js` | Cifrado/descifrado AES-256-GCM |
| Circuit breaker | `resilience/circuitBreaker.js` | Prevención de cascada de fallos |
| Registro de auditoría | `audit/auditLogger.js` | BD JSON simulada: original (cifrado) + redactado (texto plano) |

---

## Consideraciones de Seguridad

- **Sanitización de entradas** — Correos electrónicos, números de tarjeta de crédito (13–16 dígitos) y SSN son redactados antes de cualquier llamada saliente. Los patrones regex están precompilados y anclados para prevenir ReDoS.
- **Registros de auditoría cifrados** — Cada evento de solicitud es serializado a JSON, cifrado con AES-256-GCM (cifrado autenticado) y añadido al disco. Los registros no pueden ser manipulados silenciosamente.
- **Derivación de clave** — El material de clave crudo nunca se usa directamente. PBKDF2-SHA-256 con 100.000 iteraciones deriva la clave final, vinculada a un salt específico del despliegue (`CRYPTO_SALT`).
- **Cabeceras de seguridad** — Helmet configura `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` y los valores predeterminados de CSP.
- **Limitación de tasa** — 100 solicitudes por IP por ventana de 15 minutos previene ataques de fuerza bruta y DoS.
- **Límite de tamaño del cuerpo** — El parser JSON de Express está limitado a 50 KB; la capa de middleware impone un límite de 10.000 caracteres al campo `message`.
- **Contenedor Docker sin root** — La imagen se ejecuta como un usuario sin privilegios `appuser`.

---

## Explicación de la Integración con IA

La lógica del sanitizador fue diseñada y revisada de forma iterativa con asistencia de IA:

1. **Prompt 1** — Una persona con perfil de ingeniero senior de seguridad generó el sanitizador inicial usando regexes optimizados y anclados, con un orden de redacción estricto (correos → tarjetas de crédito → SSN).
2. **Prompt 2** — La misma persona revisó el resultado en busca de riesgos ReDoS, falsos positivos y patrones faltantes, produciendo la versión reforzada en `sanitizer.js`.

Este flujo de trabajo (generar → revisar → reforzar) imita un ciclo de revisión de código real y demuestra cómo el desarrollo asistido por IA puede integrarse de forma responsable en una base de código sensible a la seguridad.

---

## Cómo Ejecutar Localmente con Docker

### Prerrequisitos
- Docker ≥ 24 y Docker Compose V2

### 1. Clonar y configurar

```bash
git clone https://github.com/your-org/guardian-integration-gateway.git
cd guardian-integration-gateway
cp .env.example .env
# Editar .env y establecer AUDIT_LOG_KEY y CRYPTO_SALT con valores aleatorios fuertes
```

### 2. Iniciar el servicio

```bash
docker compose up --build
```

La API estará disponible en `http://localhost:3000`.

### 3. Ejecutar pruebas (fuera de Docker)

```bash
npm install
npm test
```

---

## Documentación del Endpoint API

### `POST /secure-inquiry`

Sanitiza el mensaje, lo procesa a través de una llamada mock de IA (2 s) y registra el log de auditoría.

**Solicitud**

```http
POST /secure-inquiry
Content-Type: application/json

{
  "userId": "user-123",
  "message": "Contactar a john@company.com, tarjeta 4111-1111-1111-1111"
}
```

**Respuesta Exitosa** `200 OK`

```json
{
  "success": true,
  "answer": "Generated Answer"
}
```

**Circuit Breaker Abierto** `503 Service Unavailable`

```json
{
  "success": false,
  "message": "Service Busy"
}
```

**Respuestas de Error**

| Estado | Condición |
|--------|-----------|
| `400` | Campo `userId` / `message` faltante o inválido |
| `413` | `message` supera los 10.000 caracteres |
| `429` | Límite de tasa excedido |
| `503` | Circuit breaker ABIERTO — devuelve `"Service Busy"` instantáneamente |
| `500` | Error interno inesperado |

**Entrada del log de auditoría** (`logs/audit-db.json`)

```json
{
  "timestamp": "2026-04-08T12:00:00.000Z",
  "userId": "user-123",
  "originalEncrypted": "<texto cifrado AES-256-GCM>",
  "redactedMessage": "Contactar a <REDACTED: EMAIL>, tarjeta <REDACTED: CREDIT_CARD>",
  "status": "SUCCESS"
}
```

---

### `GET /health`

Devuelve el estado de salud del servicio. Usado por el health-check de Docker y los balanceadores de carga.

```json
{ "status": "ok" }
```

---

## Estructura del Proyecto

```
guardian-integration-gateway/
├── src/
│   ├── app.js                       # Bootstrap de Express
│   ├── server.js                    # Punto de entrada
│   ├── controllers/
│   │   └── gatewayController.js
│   ├── services/
│   │   └── gatewayService.js
│   ├── security/
│   │   ├── sanitizer.js
│   │   └── crypto.js
│   ├── resilience/
│   │   └── circuitBreaker.js
│   ├── audit/
│   │   └── auditLogger.js
│   └── middleware/
│       └── inputValidation.js
├── tests/
│   └── sanitizer.test.js
├── logs/                            # Logs de auditoría cifrados (ignorados por git)
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Licencia

MIT