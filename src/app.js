'use strict';

/**
 * Express application bootstrap.
 * ---------------------------------------------------------------------------
 * Layer responsibilities (inside-out):
 *
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │  HTTP (Helmet + Rate Limit)  ← security headers & traffic control   │
 *  │    └── Middleware (inputValidation)  ← input shape & size guard      │
 *  │          └── Controller  ← HTTP plumbing, audit logging              │
 *  │                └── Service  ← business logic + circuit breaker       │
 *  │                      └── Security  ← sanitizer + crypto              │
 *  └─────────────────────────────────────────────────────────────────────┘
 */

const express   = require('express');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const { validateInput } = require('./middleware/inputValidation');
const { processInput }  = require('./controllers/gatewayController');

const app = express();

// ---------------------------------------------------------------------------
// Security headers (OWASP hardening)
// ---------------------------------------------------------------------------
app.use(helmet());

// ---------------------------------------------------------------------------
// Body parsing – hard limit to prevent request-body DoS
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '50kb' }));

// ---------------------------------------------------------------------------
// Rate limiting – 100 requests per 15-minute window per IP
// ---------------------------------------------------------------------------
const limiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            100,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { success: false, error: 'Too many requests. Please try again later.' },
});
app.use(limiter);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health-check (no auth required – used by Docker / load balancers)
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

// Core gateway endpoint
app.post('/secure-inquiry', validateInput, processInput);

// Demo-only: force the circuit breaker open by recording N failures
app.post('/demo/trip-breaker', (_req, res) => {
  const { breaker } = require('./services/gatewayService');
  for (let i = 0; i < breaker.failureThreshold; i++) {
    breaker._onFailure();
  }
  res.status(200).json({ state: breaker.state, message: 'Circuit breaker tripped for demo.' });
});

// ---------------------------------------------------------------------------
// Global error handler – must have 4 parameters for Express to treat it as one
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Avoid leaking internal stack traces to the client
  const isCircuitOpen = err.message && err.message.startsWith('[CircuitBreaker]');

  if (isCircuitOpen) {
    return res.status(503).json({ success: false, message: 'Service Busy' });
  }

  res.status(500).json({ success: false, error: 'Internal server error.' });
});

module.exports = app;
