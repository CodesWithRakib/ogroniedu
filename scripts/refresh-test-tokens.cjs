const { Client } = require('pg');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'super-secret-ogroniedu-development-key-256-bit-long-string-sample';

async function main() {
  const client = new Client({ connectionString: 'postgresql://postgres:password@localhost:5432/ogroniedu_dev' });
  await client.connect();

  const userIds = {
    student: '33333333-3333-4333-b333-333333333333',
    guardian: '11111111-1111-4111-a111-111111111111',
    tutor: '8a798958-9c24-4049-86e9-18985e871597',
    admin: '00000000-0000-4000-a000-000000000000'
  };

  const tokens = {};

  for (const [key, id] of Object.entries(userIds)) {
    const res = await client.query('SELECT id, email, phone_e164, preferred_locale, auth_epoch, display_name FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) continue;
    const u = res.rows[0];

    const rolesRes = await client.query(
      `SELECT r.code FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 AND ur.revoked_at IS NULL`,
      [id]
    );
    const roles = rolesRes.rows.map(r => r.code);

    const payload = {
      sub: u.id,
      email: u.email,
      phone: u.phone_e164,
      roles: roles.length > 0 ? roles : [key],
      preferredLocale: u.preferred_locale || 'bn',
      authEpoch: u.auth_epoch ?? 0,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: 86400 * 7, // 7 days
      issuer: 'ogroniedu-api',
      audience: 'ogroniedu-clients',
    });

    tokens[key] = {
      token,
      user: {
        id: u.id,
        displayName: u.display_name,
        email: u.email,
        phone: u.phone_e164,
        roles: roles.length > 0 ? roles : [key],
        status: 'active',
        preferredLocale: u.preferred_locale || 'bn',
      }
    };
  }

  await client.end();
  console.log(JSON.stringify(tokens));
}

main().catch(console.error);
