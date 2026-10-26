export interface LandingPageConfig {
  nodeEnv: string;
  port: number | string;
  swaggerEnabled: boolean;
  frontendUrl: string;
  apiUrl: string;
}

export function renderLandingPageHtml(config: LandingPageConfig): string {
  const { nodeEnv, swaggerEnabled, frontendUrl, apiUrl } = config;

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OgroniEdu API Gateway | Enterprise LMS & Tutoring Engine</title>
  <meta name="description" content="Production-ready RESTful API Gateway, WebSocket Event Streaming & Microservices for OgroniEdu Bangladesh." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg-base: #07090E;
      --bg-card: rgba(15, 23, 42, 0.7);
      --bg-card-hover: rgba(30, 41, 59, 0.8);
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-glow: rgba(16, 185, 129, 0.3);
      --text-main: #F8FAFC;
      --text-muted: #94A3B8;
      --primary: #10B981;
      --primary-hover: #059669;
      --accent: #6366F1;
      --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg-base);
      color: var(--text-main);
      font-family: var(--font-sans);
      min-height: 100vh;
      line-height: 1.6;
      background-image: 
        radial-gradient(at 0% 0%, rgba(16, 185, 129, 0.12) 0px, transparent 50%),
        radial-gradient(at 100% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
        radial-gradient(at 50% 100%, rgba(15, 23, 42, 0.8) 0px, transparent 50%);
      background-attachment: fixed;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }

    /* Header Nav */
    header {
      border-bottom: 1px solid var(--border-subtle);
      backdrop-filter: blur(20px);
      background: rgba(7, 9, 14, 0.85);
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .nav-inner {
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: var(--text-main);
    }
    .logo-badge {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #10B981, #6366F1);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.35);
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .brand-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      background: rgba(16, 185, 129, 0.15);
      color: #34D399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .nav-link {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      transition: color 0.2s;
    }
    .nav-link:hover { color: var(--text-main); }
    .btn-portal {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-portal:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.2);
    }

    /* Hero Section */
    .hero {
      padding: 64px 0 40px;
      text-align: center;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 9999px;
      color: #34D399;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background-color: #10B981;
      border-radius: 50%;
      box-shadow: 0 0 10px #10B981;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.2); }
      100% { opacity: 1; transform: scale(1); }
    }
    .hero-h1 {
      font-size: 48px;
      font-weight: 800;
      letter-spacing: -1.5px;
      line-height: 1.15;
      margin-bottom: 20px;
      background: linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero-desc {
      font-size: 18px;
      color: var(--text-muted);
      max-width: 760px;
      margin: 0 auto 36px;
    }
    .hero-actions {
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 14px 28px;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: #FFFFFF;
      font-weight: 700;
      font-size: 15px;
      border-radius: 10px;
      text-decoration: none;
      box-shadow: 0 4px 24px rgba(16, 185, 129, 0.35);
      transition: all 0.2s;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 30px rgba(16, 185, 129, 0.45);
    }
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 14px 28px;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      color: #F8FAFC;
      font-weight: 600;
      font-size: 15px;
      border-radius: 10px;
      text-decoration: none;
      backdrop-filter: blur(12px);
      transition: all 0.2s;
    }
    .btn-secondary:hover {
      background: var(--bg-card-hover);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }

    /* Live Telemetry Bar */
    .telemetry-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin: 40px 0 64px;
    }
    .telemetry-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 18px 20px;
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .telemetry-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 700;
      color: var(--text-muted);
    }
    .telemetry-val {
      font-size: 16px;
      font-weight: 700;
      color: #F1F5F9;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ping-btn {
      margin-left: auto;
      padding: 3px 10px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 6px;
      color: #34D399;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .ping-btn:hover { background: rgba(16, 185, 129, 0.3); }

    /* Section Headers */
    .section-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    .section-desc {
      color: var(--text-muted);
      margin-bottom: 24px;
      font-size: 15px;
    }

    /* Module Cards Grid */
    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 20px;
      margin-bottom: 64px;
    }
    .module-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 24px;
      backdrop-filter: blur(12px);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .module-card:hover {
      border-color: var(--border-glow);
      background: var(--bg-card-hover);
      transform: translateY(-3px);
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .card-icon {
      font-size: 24px;
    }
    .card-title {
      font-size: 17px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 6px;
    }
    .card-desc {
      font-size: 13.5px;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    .endpoints-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .endpoint-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 6px;
      font-family: var(--font-mono);
      font-size: 12px;
    }
    .method-badge {
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      letter-spacing: 0.5px;
    }
    .method-get { background: rgba(59, 130, 246, 0.2); color: #60A5FA; }
    .method-post { background: rgba(16, 185, 129, 0.2); color: #34D399; }
    .method-ws { background: rgba(168, 85, 247, 0.2); color: #C084FC; }
    .endpoint-path {
      color: #CBD5E1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Terminal Console */
    .console-box {
      background: #0B0F17;
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 64px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .console-topbar {
      height: 44px;
      background: rgba(15, 23, 42, 0.8);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
    }
    .console-dots {
      display: flex;
      gap: 6px;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot-red { background: #EF4444; }
    .dot-yellow { background: #F59E0B; }
    .dot-green { background: #10B981; }
    .console-tabs {
      display: flex;
      gap: 8px;
    }
    .console-tab {
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      background: transparent;
      color: var(--text-muted);
      border: none;
      transition: all 0.2s;
    }
    .console-tab.active {
      background: rgba(255, 255, 255, 0.1);
      color: #FFFFFF;
    }
    .console-code {
      padding: 24px;
      font-family: var(--font-mono);
      font-size: 13.5px;
      color: #38BDF8;
      overflow-x: auto;
      white-space: pre-wrap;
      position: relative;
    }
    .copy-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      padding: 6px 14px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      color: #F8FAFC;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .copy-btn:hover { background: rgba(255, 255, 255, 0.2); }

    /* Footer */
    footer {
      border-top: 1px solid var(--border-subtle);
      padding: 40px 0;
      text-align: center;
      color: var(--text-muted);
      font-size: 14px;
    }
    .footer-links {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-bottom: 16px;
    }
    .footer-links a {
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.2s;
    }
    .footer-links a:hover { color: #FFFFFF; }
  </style>
</head>
<body>

  <!-- Top Header Navigation -->
  <header>
    <div class="container nav-inner">
      <a href="/" class="brand">
        <div class="logo-badge">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
        <div>
          <span class="brand-title">OgroniEdu</span>
        </div>
        <span class="brand-tag">API v1.0</span>
      </a>

      <div class="nav-links">
        <a href="/health/live" target="_blank" class="nav-link">Health Probe</a>
        <a href="/api/v1/public/stats" target="_blank" class="nav-link">Public Stats</a>
        ${
          swaggerEnabled
            ? '<a href="/api/docs" target="_blank" class="nav-link">Swagger Docs</a>'
            : ''
        }
        <a href="${frontendUrl}" target="_blank" class="btn-portal">
          <span>Web Portal</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Banner -->
  <main class="container">
    <section class="hero">
      <div class="status-pill">
        <span class="pulse-dot"></span>
        <span>GATEWAY ONLINE &bull; ${nodeEnv.toUpperCase()}</span>
      </div>

      <h1 class="hero-h1">Enterprise Tutoring Marketplace<br/>&amp; LMS Core Engine</h1>
      <p class="hero-desc">
        High-concurrency NestJS 12 REST API, double-entry financial escrow ledger, Jitsi video classrooms, and real-time Socket.IO notification streaming.
      </p>

      <div class="hero-actions">
        ${
          swaggerEnabled
            ? '<a href="/api/docs" class="btn-primary">📚 Open Interactive Swagger Docs</a>'
            : '<a href="/api/v1/public/stats" target="_blank" class="btn-primary">📊 Query Public Platform Stats</a>'
        }
        <a href="/health/live" target="_blank" class="btn-secondary">🩺 Live System Health Probe</a>
        <a href="${frontendUrl}" target="_blank" class="btn-secondary">💻 Launch Web Frontend</a>
      </div>
    </section>

    <!-- Live Telemetry Card Grid -->
    <div class="telemetry-grid">
      <div class="telemetry-card">
        <span class="telemetry-label">Gateway Status</span>
        <div class="telemetry-val">
          <span class="pulse-dot"></span>
          <span>Active (HTTP 200)</span>
        </div>
      </div>

      <div class="telemetry-card">
        <span class="telemetry-label">Database Connection</span>
        <div class="telemetry-val">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          <span>Neon PostgreSQL (TLS)</span>
        </div>
      </div>

      <div class="telemetry-card">
        <span class="telemetry-label">Cache &amp; Storage</span>
        <div class="telemetry-val">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          <span>Upstash &bull; Supabase</span>
        </div>
      </div>

      <div class="telemetry-card">
        <span class="telemetry-label">Live API Latency</span>
        <div class="telemetry-val">
          <span id="latency-display">Checking...</span>
          <button class="ping-btn" onclick="testLatency()">Ping</button>
        </div>
      </div>
    </div>

    <!-- API Capability Matrix -->
    <h2 class="section-title">Core Gateway Services &amp; Endpoints</h2>
    <p class="section-desc">Key microservices integrated under a unified API contract with deterministic error envelopes.</p>

    <div class="modules-grid">
      <!-- Auth & RBAC -->
      <div class="module-card">
        <div class="card-header">
          <span class="card-icon">🔐</span>
          <span class="brand-tag">Authentication</span>
        </div>
        <h3 class="card-title">Identity &amp; Role-Based Access</h3>
        <p class="card-desc">Passwordless OTP codes, JWT token rotation, and multi-role permission guards for Students, Tutors, Guardians, and Admins.</p>
        <div class="endpoints-list">
          <div class="endpoint-item"><span class="method-badge method-post">POST</span><span class="endpoint-path">/api/v1/auth/request-code</span></div>
          <div class="endpoint-item"><span class="method-badge method-post">POST</span><span class="endpoint-path">/api/v1/auth/verify-code</span></div>
          <div class="endpoint-item"><span class="method-badge method-post">POST</span><span class="endpoint-path">/api/v1/auth/refresh</span></div>
        </div>
      </div>

      <!-- Tutors Marketplace -->
      <div class="module-card">
        <div class="card-header">
          <span class="card-icon">👨‍🏫</span>
          <span class="brand-tag">Marketplace</span>
        </div>
        <h3 class="card-title">Tutor Discovery &amp; Dossiers</h3>
        <p class="card-desc">Sub-second indexed search across subjects, divisions, hourly pricing, verified badges, and background checks.</p>
        <div class="endpoints-list">
          <div class="endpoint-item"><span class="method-badge method-get">GET</span><span class="endpoint-path">/api/v1/tutors</span></div>
          <div class="endpoint-item"><span class="method-badge method-get">GET</span><span class="endpoint-path">/api/v1/tutors/:id</span></div>
          <div class="endpoint-item"><span class="method-badge method-get">GET</span><span class="endpoint-path">/api/v1/tutors/:id/availability</span></div>
        </div>
      </div>

      <!-- Bookings & Escrow -->
      <div class="module-card">
        <div class="card-header">
          <span class="card-icon">💳</span>
          <span class="brand-tag">Finances</span>
        </div>
        <h3 class="card-title">Bookings, Escrow &amp; Ledger</h3>
        <p class="card-desc">SSLCOMMERZ bKash/Nagad checkout, balanced double-entry ledger journals, and milestone-release escrow protection.</p>
        <div class="endpoints-list">
          <div class="endpoint-item"><span class="method-badge method-post">POST</span><span class="endpoint-path">/api/v1/bookings</span></div>
          <div class="endpoint-item"><span class="method-badge method-post">POST</span><span class="endpoint-path">/api/v1/bookings/:id/pay</span></div>
          <div class="endpoint-item"><span class="method-badge method-get">GET</span><span class="endpoint-path">/api/v1/payments/:id/receipt</span></div>
        </div>
      </div>

      <!-- Classroom & Live LMS -->
      <div class="module-card">
        <div class="card-header">
          <span class="card-icon">🎥</span>
          <span class="brand-tag">Classroom</span>
        </div>
        <h3 class="card-title">Live Video &amp; Whiteboard</h3>
        <p class="card-desc">Option 6 Jitsi live video meeting room provisioning, synchronized whiteboard collaboration, and attendance logging.</p>
        <div class="endpoints-list">
          <div class="endpoint-item"><span class="method-badge method-get">GET</span><span class="endpoint-path">/api/v1/learning/sessions</span></div>
          <div class="endpoint-item"><span class="method-badge method-post">POST</span><span class="endpoint-path">/api/v1/learning/sessions/:id/complete</span></div>
          <div class="endpoint-item"><span class="method-badge method-get">GET</span><span class="endpoint-path">/api/v1/learning/progress/:id</span></div>
        </div>
      </div>

      <!-- Real-time Notifications -->
      <div class="module-card">
        <div class="card-header">
          <span class="card-icon">⚡</span>
          <span class="brand-tag">Streaming</span>
        </div>
        <h3 class="card-title">WebSocket Gateway &amp; Alerts</h3>
        <p class="card-desc">Bi-directional Socket.IO gateway delivering real-time booking updates, instant messages, and child safety alarms.</p>
        <div class="endpoints-list">
          <div class="endpoint-item"><span class="method-badge method-ws">WS</span><span class="endpoint-path">/notifications</span></div>
          <div class="endpoint-item"><span class="method-badge method-get">GET</span><span class="endpoint-path">/api/v1/notifications</span></div>
          <div class="endpoint-item"><span class="method-badge method-post">POST</span><span class="endpoint-path">/api/v1/notifications/read-all</span></div>
        </div>
      </div>

      <!-- Trust & Safeguarding -->
      <div class="module-card">
        <div class="card-header">
          <span class="card-icon">🛡️</span>
          <span class="brand-tag">Safeguarding</span>
        </div>
        <h3 class="card-title">Trust &amp; Child Safety Triage</h3>
        <p class="card-desc">Emergency SOS alerts, guardian child oversight, replacement guarantee workflows, and dispute arbitration.</p>
        <div class="endpoints-list">
          <div class="endpoint-item"><span class="method-badge method-post">POST</span><span class="endpoint-path">/api/v1/safety/reports</span></div>
          <div class="endpoint-item"><span class="method-badge method-post">POST</span><span class="endpoint-path">/api/v1/trust/disputes</span></div>
          <div class="endpoint-item"><span class="method-badge method-post">POST</span><span class="endpoint-path">/api/v1/support/tickets</span></div>
        </div>
      </div>
    </div>

    <!-- Interactive cURL Snippets -->
    <h2 class="section-title">Developer Quickstart Console</h2>
    <p class="section-desc">Test live endpoints using your preferred terminal or API client.</p>

    <div class="console-box">
      <div class="console-topbar">
        <div class="console-dots">
          <div class="dot dot-red"></div>
          <div class="dot dot-yellow"></div>
          <div class="dot dot-green"></div>
        </div>
        <div class="console-tabs">
          <button class="console-tab active" onclick="switchSnippet(0)">Health Probe</button>
          <button class="console-tab" onclick="switchSnippet(1)">Public Stats</button>
          <button class="console-tab" onclick="switchSnippet(2)">Auth Request OTP</button>
        </div>
      </div>
      <div class="console-code">
        <pre><code id="snippet-code">curl -s ${apiUrl}/health/live | jq .</code></pre>
        <button class="copy-btn" onclick="copySnippet()">Copy</button>
      </div>
    </div>

    <!-- Canonical Envelope Spec -->
    <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 24px; margin-bottom: 64px; backdrop-filter: blur(12px);">
      <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 8px;">Standardized API Response Guarantee</h3>
      <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 16px;">
        Every endpoint strictly adheres to the OgroniEdu Contract Standard with deterministic envelopes:
      </p>
      <pre style="background: rgba(0,0,0,0.4); padding: 16px; border-radius: 8px; font-family: var(--font-mono); font-size: 13px; color: #A7F3D0; overflow-x: auto;">
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req-9c8f2b1a-4e3d-4c2b",
    "timestamp": "2026-10-26T12:00:00.000Z",
    "path": "/api/v1/..."
  }
}</pre>
    </div>
  </main>

  <!-- Footer -->
  <footer>
    <div class="container">
      <div class="footer-links">
        <a href="${frontendUrl}" target="_blank">Student &amp; Tutor Portal</a>
        <a href="/health/live" target="_blank">Liveness Probe</a>
        <a href="/health/ready" target="_blank">Readiness Probe</a>
        <a href="https://github.com/CodesWithRakib/ogroniedu" target="_blank">GitHub Repository</a>
      </div>
      <p>&copy; ${new Date().getFullYear()} OgroniEdu Platform. All rights reserved.</p>
    </div>
  </footer>

  <script>
    const snippets = [
      'curl -s ${apiUrl}/health/live | jq .',
      'curl -s ${apiUrl}/api/v1/public/stats | jq .',
      'curl -s -X POST ${apiUrl}/api/v1/auth/request-code \\\\\n  -H "Content-Type: application/json" \\\\\n  -d \\'{"identifier":"student@ogroniedu.com"}\\' | jq .'
    ];

    function switchSnippet(index) {
      document.querySelectorAll('.console-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
      });
      document.getElementById('snippet-code').innerText = snippets[index];
    }

    function copySnippet() {
      const code = document.getElementById('snippet-code').innerText;
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.innerText = 'Copied!';
        setTimeout(() => { btn.innerText = 'Copy'; }, 2000);
      });
    }

    async function testLatency() {
      const display = document.getElementById('latency-display');
      display.innerText = 'Pinging...';
      const start = performance.now();
      try {
        const res = await fetch('/health/live');
        const duration = Math.round(performance.now() - start);
        display.innerHTML = '<span style="color:#10B981;">' + duration + ' ms</span>';
      } catch (err) {
        display.innerHTML = '<span style="color:#EF4444;">Offline</span>';
      }
    }

    // Measure on load
    testLatency();
  </script>
</body>
</html>
`;
}
