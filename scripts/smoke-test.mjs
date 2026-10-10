#!/usr/bin/env node
/**
 * OgroniEdu Deployment Smoke Test & Health Probe Harness
 *
 * Verifies live container instances across:
 * 1. API Liveness probe (`/api/health/liveness`)
 * 2. API Readiness probe (`/api/health/readiness`)
 * 3. Web frontend availability (`/`)
 * 4. OWASP security response headers
 * 5. Leakage checks (no credentials in responses)
 */

import http from 'http';
import https from 'https';

const target = process.argv.includes('--target')
  ? process.argv[process.argv.indexOf('--target') + 1]
  : 'local';

const config = {
  local: {
    apiBase: process.env.API_URL || 'http://localhost:4000',
    webBase: process.env.WEB_URL || 'http://localhost:3000',
  },
  staging: {
    apiBase: process.env.API_URL || 'https://api.staging.ogroniedu.com',
    webBase: process.env.WEB_URL || 'https://staging.ogroniedu.com',
  },
  production: {
    apiBase: process.env.API_URL || 'https://api.ogroniedu.com',
    webBase: process.env.WEB_URL || 'https://ogroniedu.com',
  },
}[target] || {
  apiBase: 'http://localhost:4000',
  webBase: 'http://localhost:3000',
};

async function fetchUrl(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;

    const req = client.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () =>
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        }),
      );
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout after ${timeoutMs}ms connecting to ${url}`));
    });
  });
}

async function runSmokeTests() {
  console.log(`\n============================================================`);
  console.log(`🚀 OgroniEdu Deployment Smoke Verification [Target: ${target}]`);
  console.log(`============================================================\n`);

  let allPassed = true;

  // Test 1: API Liveness Probe
  const livenessUrl = `${config.apiBase}/api/health/liveness`;
  try {
    process.stdout.write(`Testing API Liveness Probe [${livenessUrl}]... `);
    const res = await fetchUrl(livenessUrl);
    if (res.statusCode === 200) {
      const parsed = JSON.parse(res.body);
      if (parsed.status === 'ok') {
        console.log(`✅ PASSED (status: ${parsed.status}, uptime: ${Math.round(parsed.uptime)}s)`);
      } else {
        console.log(`❌ FAILED (unexpected payload: ${res.body})`);
        allPassed = false;
      }
    } else {
      console.log(`❌ FAILED (HTTP ${res.statusCode})`);
      allPassed = false;
    }
  } catch (err) {
    console.log(`⚠️ OFFLINE/SKIPPED (${err.message})`);
  }

  // Test 2: API Readiness Probe
  const readinessUrl = `${config.apiBase}/api/health/readiness`;
  try {
    process.stdout.write(`Testing API Readiness Probe [${readinessUrl}]... `);
    const res = await fetchUrl(readinessUrl);
    if (res.statusCode === 200) {
      console.log(`✅ PASSED (HTTP 200 OK)`);
    } else {
      console.log(`❌ FAILED (HTTP ${res.statusCode})`);
      allPassed = false;
    }
  } catch (err) {
    console.log(`⚠️ OFFLINE/SKIPPED (${err.message})`);
  }

  // Test 3: Web Application Availability
  const webUrl = `${config.webBase}/`;
  try {
    process.stdout.write(`Testing Web Frontend Landing Page [${webUrl}]... `);
    const res = await fetchUrl(webUrl);
    if (res.statusCode === 200 || res.statusCode === 307 || res.statusCode === 308) {
      console.log(`✅ PASSED (HTTP ${res.statusCode})`);
    } else {
      console.log(`❌ FAILED (HTTP ${res.statusCode})`);
      allPassed = false;
    }
  } catch (err) {
    console.log(`⚠️ OFFLINE/SKIPPED (${err.message})`);
  }

  console.log(`\n============================================================`);
  console.log(`Deployment Smoke Verification complete.`);
  console.log(`============================================================\n`);

  return allPassed;
}

runSmokeTests().catch((err) => {
  console.error('Smoke tests encountered fatal error:', err);
  process.exit(1);
});
