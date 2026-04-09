# Guardian Integration Gateway — Live Demo

> 🎬 **[Watch Demo Video](./The%20Guardian%20Integration%20Gateway.mp4)**

---

## English

**Guardian Integration Gateway — Live Demo Summary**

The demo showcases a production-ready Node.js backend running inside a Docker container, deployed locally via Docker Desktop.

The following was demonstrated:

1. **Container startup** — The service was launched from Docker Desktop, with the container logging `Listening on port 3000` in production mode.
2. **Health check** — A `GET /health` request confirmed the service was live and responding with `{ status: ok }`.
3. **PII sanitization + AI mock** — A `POST /secure-inquiry` request was sent containing a real email (`john@company.com`), a credit card number (`4111-1111-1111-1111`), and an SSN (`123-45-6789`). The system returned `Generated Answer` — with all sensitive data automatically redacted before processing.
4. **Encrypted audit log** — The `audit-db.json` log file showed every request persisted to disk: the `redactedMessage` field displayed `<REDACTED: EMAIL>`, `<REDACTED: CREDIT_CARD>`, and `<REDACTED: SSN>`, while `originalEncrypted` stored the original message protected with AES-256-GCM authenticated encryption.
5. **Circuit breaker** — The demo script fired 4 consecutive requests, all returning `HTTP 200`, demonstrating the circuit breaker in its CLOSED (healthy) state.
6. **Test suite** — `npm test` ran 24 unit tests covering email, credit card, SSN redaction, false positive prevention, edge cases, and a performance guard — all passing in 1.394 seconds.

---
---

# Guardian Integration Gateway — Demo en Vivo

> 🎬 **[Ver Video de Demo](./The%20Guardian%20Integration%20Gateway.mp4)**

---

## Español

**Guardian Integration Gateway — Resumen de Demo en Vivo**

La demo muestra un backend Node.js listo para producción corriendo dentro de un contenedor Docker, desplegado localmente desde Docker Desktop.

Se demostró lo siguiente:

1. **Inicio del contenedor** — El servicio fue lanzado desde Docker Desktop, con el contenedor registrando `Listening on port 3000` en modo producción.
2. **Health check** — Una solicitud `GET /health` confirmó que el servicio estaba activo y respondiendo con `{ status: ok }`.
3. **Sanitización de PII + mock de IA** — Se envió una solicitud `POST /secure-inquiry` con un email real (`john@company.com`), un número de tarjeta de crédito (`4111-1111-1111-1111`) y un SSN (`123-45-6789`). El sistema devolvió `Generated Answer` — con todos los datos sensibles redactados automáticamente antes de ser procesados.
4. **Registro de auditoría cifrado** — El archivo `audit-db.json` mostró cada solicitud persistida en disco: el campo `redactedMessage` mostraba `<REDACTED: EMAIL>`, `<REDACTED: CREDIT_CARD>` y `<REDACTED: SSN>`, mientras que `originalEncrypted` almacenaba el mensaje original protegido con cifrado autenticado AES-256-GCM.
5. **Circuit breaker** — El script de demo ejecutó 4 solicitudes consecutivas, todas respondiendo `HTTP 200`, demostrando el circuit breaker en estado CERRADO (saludable).
6. **Suite de pruebas** — `npm test` ejecutó 24 pruebas unitarias cubriendo redacción de emails, tarjetas, SSN, prevención de falsos positivos, casos extremos y un guard de rendimiento — todas pasando en 1.394 segundos.
