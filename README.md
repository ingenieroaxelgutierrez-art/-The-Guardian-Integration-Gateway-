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
