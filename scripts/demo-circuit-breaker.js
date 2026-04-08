'use strict';
/**
 * Demo helper: patches the mock AI to fail so the circuit breaker trips.
 * Run ONLY for the demo video. Revert with: git checkout src/services/gatewayService.js
 */
const gatewayService = require('../src/services/gatewayService');

// Overwrite the internal callMockAi by monkey-patching the module – for demo only.
// In real code the service is already loaded; we trigger failures via HTTP instead.

const http = require('http');

function post(body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = http.request(
      { hostname: 'localhost', port: 3000, path: '/secure-inquiry', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
      }
    );
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('\n=== Circuit Breaker Demo ===\n');
  for (let i = 1; i <= 4; i++) {
    const r = await post({ userId: 'demo-user', message: `request ${i}` });
    console.log(`Request ${i} → HTTP ${r.status}`, JSON.stringify(r.body));
  }
})();
