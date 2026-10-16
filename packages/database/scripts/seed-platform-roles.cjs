const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:password@localhost:5432/ogroniedu_dev',
});

async function main() {
  const roles = [
    ['support_agent', 'Support Agent', 'সাপোর্ট এজেন্ট', 'Customer dispute and ticket support specialist'],
    ['compliance_reviewer', 'Compliance Reviewer', 'কমপ্লায়েন্স পর্যালোচক', 'Tutor document verification and compliance auditor'],
    ['organization_owner', 'Organization Owner', 'প্রতিষ্ঠান মালিক', 'Institutional coaching center / academy owner'],
    ['organization_staff', 'Organization Staff', 'প্রতিষ্ঠান কর্মী', 'Institutional administrative staff'],
  ];

  for (const [code, nameEn, nameBn, desc] of roles) {
    await pool.query(
      `INSERT INTO roles (code, name_en, name_bn, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE
       SET name_en = EXCLUDED.name_en, name_bn = EXCLUDED.name_bn, description = EXCLUDED.description`,
      [code, nameEn, nameBn, desc]
    );
  }

  const res = await pool.query('SELECT code, name_en FROM roles ORDER BY code');
  console.log('All roles in DB:', res.rows);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
