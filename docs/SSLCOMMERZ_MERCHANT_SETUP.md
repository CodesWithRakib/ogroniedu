# OgroniEdu — SSLCOMMERZ Merchant Account Setup & Production Readiness Guide

This document defines the configuration, verification steps, and security procedures required outside the code repository to operate SSLCOMMERZ Embedded Easy Checkout in both Sandbox and Live production environments.

---

## 1. Credentials & Environment Separation

> [!CAUTION]
> Never commit live merchant credentials (Store ID, Store Password) to git, issue trackers, chat logs, or frontend code bundles. Live credentials must reside exclusively in server-side environment variables on secure production infrastructure.

### 1.1 Sandbox Configuration (Active in Development & Staging)
- `SSLCOMMERZ_STORE_ID`: `ogron6ac9fcef6d321` (Verified working)
- `SSLCOMMERZ_STORE_PASSWD`: `ogron6ac9fcef6d321@ssl`
- `SSLCOMMERZ_IS_LIVE`: `false`
- `SSLCOMMERZ_SESSION_URL`: `https://sandbox.sslcommerz.com/gwprocess/v4/api.php`
- `SSLCOMMERZ_VALIDATION_URL`: `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php`
- Embedded Checkout Script: `https://sandbox.sslcommerz.com/embed.min.js`

### 1.2 Production Configuration (Required for Live Cutover)
- `SSLCOMMERZ_STORE_ID`: Provided by SSLCOMMERZ Operations upon merchant account activation
- `SSLCOMMERZ_STORE_PASSWD`: Provided securely via merchant portal or encrypted channel
- `SSLCOMMERZ_IS_LIVE`: `true`
- `SSLCOMMERZ_SESSION_URL`: `https://securepay.sslcommerz.com/gwprocess/v4/api.php`
- `SSLCOMMERZ_VALIDATION_URL`: `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php`
- Embedded Checkout Script: `https://seamless-epay.sslcommerz.com/embed.min.js`

---

## 2. SSLCOMMERZ Merchant Portal Configuration Checklist

The merchant account owner or administrator must log in to the SSLCOMMERZ Merchant Panel (`https://merchant.sslcommerz.com/`) and complete the following settings:

### 2.1 Enable Easy Checkout / Seamless Integration
- Navigate to **Integration Settings** → **Checkout Mode**.
- Confirm that **Easy Checkout (Popup/Modal/Embedded)** is enabled for the merchant account.
- If not enabled, email `operation@sslcommerz.com` or contact your account manager to activate **Seamless/Easy Checkout mode**.

### 2.2 Configure Server-to-Server IPN (Instant Payment Notification)
- Navigate to **Settings** → **IPN Settings**.
- Set **IPN Listener URL** to your production HTTPS backend callback:
  ```text
  https://api.ogroniedu.com/api/v1/payments/webhook/sslcommerz
  ```
- Set **IPN Method** to `POST`.
- Enable **HTTP / HTTPS Redirect Notification** if applicable.

### 2.3 Payment Channel Enablement
Ensure all contracted channels are activated on your live profile:
- **Cards**: Visa, Mastercard, American Express (City Bank AMEX), UnionPay, Q-Cash.
- **Mobile Financial Services (MFS)**: bKash, Nagad, Rocket, Upay, Cellfin, Tap.
- **Internet Banking**: City Touch, EBL Skybanking, Bank Asia, IBBL, MTBL, PMonkey.

### 2.4 Allowed Domains & CORS Whitelist
- If domain whitelisting is enforced by SSLCOMMERZ for your merchant profile, register:
  - Frontend: `https://ogroniedu.com` and `https://www.ogroniedu.com`
  - Backend: `https://api.ogroniedu.com`

---

## 3. Server & Network Requirements

1. **HTTPS & TLS**:
   - SSLCOMMERZ requires all callback URLs (`success_url`, `fail_url`, `cancel_url`, `ipn_url`) to resolve over valid HTTPS certificates signed by a trusted CA (self-signed certs are rejected).
   - TLS 1.2 or TLS 1.3 is strictly enforced.
2. **Reverse Proxy & Raw Body Forwarding**:
   - Nginx / Cloudflare / Load Balancers must forward the raw request body to the NestJS API so the webhook signature verification (`verify_sign` and `md5` query string) remains bit-for-bit identical to the gateway output.
3. **Outbound Firewall Allowlist**:
   - The backend server must be allowed outbound HTTPS access on port `443` to:
     - `sandbox.sslcommerz.com` (Sandbox)
     - `securepay.sslcommerz.com` (Production)
     - `seamless-epay.sslcommerz.com` (Production Script)

---

## 4. Payment Lifecycle Verification Matrix

| Gateway Event | Provider Status | OgroniEdu Action | Authoritative Proof |
| :--- | :--- | :--- | :--- |
| **Customer pays successfully** | `VALID` / `VALIDATED` | S2S Query to `validationserverAPI.php` with `val_id`. When amount & currency match, mark order `succeeded`, confirm booking, generate invoice, credit escrow ledger. | Validation API returns `status: VALID` & amounts match |
| **Customer fails authentication** | `FAILED` | Mark order `failed`, log safe failure reason, prompt customer to retry. | Gateway reports `FAILED` |
| **Customer cancels at modal** | `CANCELLED` | Mark order `cancelled`, return customer cleanly to checkout without closing booking. | Gateway reports `CANCELLED` |
| **Duplicate IPN delivery** | `VALID` | Deduplicated via `WebhookEventEntity` (`provider + providerEventId`) and pessimistic write lock. No double crediting. | Idempotent transaction guard |
| **Late browser return after IPN** | `VALID` | Idempotent check finds order already `succeeded`. Renders verified confirmation screen. | Database state is immutable for terminal `succeeded` |

---

## 5. Rollback & Emergency Procedures

- If SSLCOMMERZ experiences gateway downtime, the embedded checkout automatically displays the direct fallback button ("Pay Directly in Secure Window").
- In case of persistent gateway degradation:
  1. Notify users via the platform announcement banner.
  2. Temporary manual reconciliation is available via the Admin Finance Console (`/dashboard/admin/finance`).
  3. All transactions maintain audit trails in `payment_orders`, `payment_transactions`, and `webhook_events`.
