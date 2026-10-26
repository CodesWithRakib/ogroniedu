# OgroniEdu — Environment Configuration Specification

## 1. Environment Principles & Security Standards

1. **Strict Production Invariants:** Default or example secrets (such as `super-secret-jwt-key-...` or `postgres`) are immediately rejected at application startup by `validateEnvironment()`, aborting process launch to prevent security misconfigurations.
2. **Client-Side Isolation:** Only environment variables prefixed with `NEXT_PUBLIC_` are bundled into the web frontend. All database credentials, JWT secrets, gateway passwords, and internal API keys are strictly kept on the server.
3. **Auditability:** Example configuration templates (`.env.example`) are maintained in the repository with non-sensitive placeholder values. Actual credentials must be injected securely via deployment orchestration (e.g., Docker secrets, Kubernetes Secret Manager, or GitHub Actions Environment Secrets).

---

## 2. API Server Environment Matrix (`@ogroniedu/api`)

| Variable Name               | Required    | Default / Staging Value             | Production Requirement                 | Purpose                                                                           |
| :-------------------------- | :---------- | :---------------------------------- | :------------------------------------- | :-------------------------------------------------------------------------------- |
| `NODE_ENV`                  | Yes         | `development` / `staging`           | `production`                           | Node.js execution environment; enables strict validation and masks error traces.  |
| `PORT`                      | No          | `4000`                              | `4000`                                 | Port on which the NestJS HTTP listener binds.                                     |
| `FRONTEND_URL`              | Yes         | `http://localhost:5000`             | `https://ogroniedu.com`                | Allowed CORS origins for browser credential sharing. Comma-separated if multiple. |
| `DATABASE_URL`              | Conditional | `postgresql://...`                  | Connection URI                         | Primary connection string for PostgreSQL instance.                                |
| `DB_HOST`                   | Conditional | `localhost`                         | `db.production.internal`               | PostgreSQL server hostname (if `DATABASE_URL` is omitted).                        |
| `DB_PORT`                   | No          | `5432`                              | `5432`                                 | PostgreSQL server port.                                                           |
| `DB_USERNAME`               | Conditional | `postgres`                          | `ogroni_app_user`                      | Database user account with least-privilege schema access.                         |
| `DB_PASSWORD`               | Conditional | `postgres`                          | Complex secret (>20 chars)             | Database password; default `postgres` blocked in production.                      |
| `DB_NAME`                   | No          | `ogroniedu_dev`                     | `ogroniedu_prod`                       | Target PostgreSQL database name.                                                  |
| `DB_SSL`                    | No          | `false`                             | `true`                                 | Requires SSL/TLS encrypted transport for all database queries.                    |
| `JWT_SECRET`                | Yes         | Sample 256-bit string               | High-entropy random secret (>32 chars) | Secret used to sign and verify user authentication tokens.                        |
| `SUPABASE_URL`              | Yes         | `https://your-proj.supabase.co`     | Production project URL                 | Supabase endpoint for S3 storage and JWKS verification.                           |
| `SUPABASE_PUBLISHABLE_KEY`  | Yes         | Public key string                   | Production public key                  | Public key for Supabase client interactions.                                      |
| `SUPABASE_SECRET_KEY`       | Yes         | Secret service role key             | Production service key                 | Service role key for administrative storage operations.                           |
| `SUPABASE_JWKS_URL`         | No          | `.../auth/v1/.well-known/jwks.json` | Valid JWKS endpoint                    | URL to fetch public JSON Web Key Sets for external auth token validation.         |
| `REDIS_HOST`                | No          | `localhost`                         | `redis.production.internal`            | Redis cache and queue host.                                                       |
| `REDIS_PORT`                | No          | `6379`                              | `6379`                                 | Redis port.                                                                       |
| `SSLCOMMERZ_STORE_ID`       | Yes         | Sandbox store ID                    | Production Store ID                    | Merchant account ID issued by SSLCOMMERZ Bangladesh.                              |
| `SSLCOMMERZ_STORE_PASSWD`   | Yes         | Sandbox store pass                  | Production Store Secret                | Secret authentication key for SSLCOMMERZ payment verification.                    |
| `SSLCOMMERZ_IS_LIVE`        | No          | `false`                             | `false` (until live verified)          | Flag toggling between SSLCOMMERZ Sandbox and Live payment servers.                |
| `BKASH_APP_KEY`             | Conditional | Sandbox App Key                     | Production App Key                     | App Key for bKash Tokenized Checkout API.                                         |
| `BKASH_APP_SECRET`          | Conditional | Sandbox App Secret                  | Production App Secret                  | App Secret for bKash Tokenized Checkout API.                                      |
| `BKASH_IS_SANDBOX`          | No          | `true`                              | `true` (until live verified)           | Flag enforcing bKash sandbox checkout mode.                                       |
| `OTP_SMS_PRIMARY_PROVIDER`  | No          | `http_gateway`                      | `http_gateway`                         | Provider adapter for SMS delivery (`http_gateway`).                               |
| `OTP_SMS_FALLBACK_PROVIDER` | No          | `dev`                               | `dev` or secondary                     | Provider fallback for failed SMS delivery.                                        |
| `OTP_DELIVERY_TIMEOUT_MS`   | No          | `5000`                              | `5000`                                 | Timeout before triggering secondary delivery provider.                            |

---

## 3. Web Frontend Environment Matrix (`@ogroniedu/web`)

| Variable Name                          | Required | Default Value           | Production Requirement      | Purpose                                                    |
| :------------------------------------- | :------- | :---------------------- | :-------------------------- | :--------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`                  | Yes      | `http://localhost:4000` | `https://api.ogroniedu.com` | Base URL used by browser fetch calls and React components. |
| `NEXT_PUBLIC_SUPABASE_URL`             | Yes      | Supabase project URL    | Production project URL      | Supabase public endpoint for client-side avatar display.   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes      | Public key string       | Production public key       | Supabase public anonymous API key.                         |
| `NODE_ENV`                             | Yes      | `development`           | `production`                | Next.js build and optimization flag.                       |

---

## 4. Environment Validation Logic

Environment variables in `@ogroniedu/api` are validated on bootstrap using `class-validator` and `class-transformer` via `validateEnvironment()`:

```typescript
// Strict production security invariants in apps/api/src/config/env.validation.ts
if (validatedConfig.NODE_ENV === Environment.Production) {
  if (
    !validatedConfig.JWT_SECRET ||
    validatedConfig.JWT_SECRET === 'super-secret-jwt-key-replace-in-production' ||
    validatedConfig.JWT_SECRET.includes('replace-in-production')
  ) {
    throw new Error(
      'Production security violation: Insecure JWT_SECRET detected in production environment. A strong, non-default secret must be configured.',
    );
  }
  if (!validatedConfig.DB_PASSWORD || validatedConfig.DB_PASSWORD === 'postgres') {
    throw new Error(
      'Production security violation: Insecure DB_PASSWORD detected in production environment.',
    );
  }
}
```
