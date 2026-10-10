#!/usr/bin/env node
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.env.PORT || 4000;
const NGROK_API = 'http://127.0.0.1:4040/api/tunnels';

function fetchActiveTunnels() {
  return new Promise((resolve, reject) => {
    http.get(NGROK_API, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.tunnels || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log(`[OgroniEdu Tunnel] Checking active ngrok tunnels for API port ${PORT}...`);

  try {
    const existing = await fetchActiveTunnels();
    if (existing.length > 0) {
      const publicUrl = existing[0].public_url;
      console.log(`\n======================================================`);
      console.log(` [OgroniEdu Payment Tunnel is ALREADY ACTIVE]`);
      console.log(` Public URL:     ${publicUrl}`);
      console.log(` Local Target:   http://localhost:${PORT}`);
      console.log(` SSLCOMMERZ IPN: ${publicUrl}/api/v1/payments/webhook/sslcommerz`);
      console.log(` Ngrok Web UI:   http://127.0.0.1:4040`);
      console.log(`======================================================\n`);
      return;
    }
  } catch {
    // ngrok not running, proceed to spawn
  }

  console.log(`[OgroniEdu Tunnel] Launching new ngrok tunnel on port ${PORT}...`);
  const ngrokProcess = spawn('ngrok', ['http', String(PORT), '--log=stdout'], {
    stdio: 'inherit',
    shell: true,
  });

  ngrokProcess.on('error', (err) => {
    console.error(`[OgroniEdu Tunnel] Failed to start ngrok:`, err.message);
  });

  // Wait for ngrok to initialize
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const tunnels = await fetchActiveTunnels();
      if (tunnels.length > 0) {
        const publicUrl = tunnels[0].public_url;
        console.log(`\n======================================================`);
        console.log(` [OgroniEdu Payment Tunnel STARTED SUCCESSFULLY]`);
        console.log(` Public URL:     ${publicUrl}`);
        console.log(` Local Target:   http://localhost:${PORT}`);
        console.log(` SSLCOMMERZ IPN: ${publicUrl}/api/v1/payments/webhook/sslcommerz`);
        console.log(` Ngrok Web UI:   http://127.0.0.1:4040`);
        console.log(`======================================================\n`);
        break;
      }
    } catch {
      // Retrying
    }
  }
}

main();
