import pg from 'pg';

export async function runInitialSeed(
  client: pg.Client,
  options: { isProduction?: boolean } = {},
): Promise<void> {
  // 1. Seed Roles (Idempotent ON CONFLICT)
  const roles = [
    {
      code: 'student',
      name_en: 'Student',
      name_bn: 'শিক্ষার্থী',
      desc: 'Active enrolled student learner',
    },
    {
      code: 'guardian',
      name_en: 'Guardian / Parent',
      name_bn: 'অভিভাবক',
      desc: 'Parent or primary legal guardian',
    },
    {
      code: 'tutor',
      name_en: 'Tutor / Educator',
      name_bn: 'শিক্ষক',
      desc: 'Verified academic tutor educator',
    },
    {
      code: 'admin',
      name_en: 'System Administrator',
      name_bn: 'অ্যাডমিন',
      desc: 'Operational backoffice moderator',
    },
    {
      code: 'super_admin',
      name_en: 'Super Administrator',
      name_bn: 'সুপার অ্যাডমিন',
      desc: 'Executive security root admin',
    },
  ];

  for (const role of roles) {
    await client.query(
      `INSERT INTO roles (code, name_en, name_bn, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE
       SET name_en = EXCLUDED.name_en, name_bn = EXCLUDED.name_bn, description = EXCLUDED.description;`,
      [role.code, role.name_en, role.name_bn, role.desc],
    );
  }

  // 2. Seed Curricula
  const curricula = [
    {
      code: 'bangla_medium',
      name_en: 'National Curriculum (Bangla Medium)',
      name_bn: 'জাতীয় শিক্ষাক্রম (বাংলা মাধ্যম)',
      board: 'NCTB',
    },
    {
      code: 'english_version',
      name_en: 'National Curriculum (English Version)',
      name_bn: 'জাতীয় শিক্ষাক্রম (ইংলিশ ভার্সন)',
      board: 'NCTB',
    },
    {
      code: 'english_medium',
      name_en: 'English Medium (Cambridge / Edexcel)',
      name_bn: 'ইংলিশ মিডিয়াম (কেমব্রিজ / এডেক্সেল)',
      board: 'International',
    },
    {
      code: 'madrasah',
      name_en: 'Madrasah Education Board',
      name_bn: 'মাদ্রাসা শিক্ষাক্রম (দাখিল/আলিম)',
      board: 'Madrasah Board',
    },
  ];

  for (const c of curricula) {
    await client.query(
      `INSERT INTO curricula (code, name_en, name_bn, board_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE
       SET name_en = EXCLUDED.name_en, name_bn = EXCLUDED.name_bn, board_name = EXCLUDED.board_name;`,
      [c.code, c.name_en, c.name_bn, c.board],
    );
  }

  // 3. Seed Education Levels
  const levels = [
    {
      code: 'primary_1_5',
      name_en: 'Primary (Class 1-5)',
      name_bn: 'প্রাথমিক (১ম-৫ম শ্রেণি)',
      sort: 1,
    },
    {
      code: 'junior_6_8',
      name_en: 'Junior Secondary (Class 6-8)',
      name_bn: 'নিম্ন মাধ্যমিক (৬ষ্ঠ-৮ম শ্রেণি)',
      sort: 2,
    },
    {
      code: 'secondary_ssc',
      name_en: 'Secondary (Class 9-10 / SSC)',
      name_bn: 'মাধ্যমিক (৯ম-১০ম শ্রেণি / এসএসসি)',
      sort: 3,
    },
    {
      code: 'higher_hsc',
      name_en: 'Higher Secondary (Class 11-12 / HSC)',
      name_bn: 'উচ্চ মাধ্যমিক (একাদশ-দ্বাদশ শ্রেণি / এইচএসসি)',
      sort: 4,
    },
    {
      code: 'admission_prep',
      name_en: 'University & Medical Admission Prep',
      name_bn: 'বিশ্ববিদ্যালয় ও মেডিকেল ভর্তি প্রস্তুতি',
      sort: 5,
    },
  ];

  for (const lvl of levels) {
    await client.query(
      `INSERT INTO education_levels (code, name_en, name_bn, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE
       SET name_en = EXCLUDED.name_en, name_bn = EXCLUDED.name_bn, sort_order = EXCLUDED.sort_order;`,
      [lvl.code, lvl.name_en, lvl.name_bn, lvl.sort],
    );
  }

  // 4. Seed Academic Subjects
  const subjects = [
    { code: 'math_general', name_en: 'General Mathematics', name_bn: 'সাধারণ গণিত' },
    { code: 'math_higher', name_en: 'Higher Mathematics', name_bn: 'উচ্চতর গণিত' },
    { code: 'physics', name_en: 'Physics', name_bn: 'পদার্থবিজ্ঞান' },
    { code: 'chemistry', name_en: 'Chemistry', name_bn: 'রসায়ন' },
    { code: 'biology', name_en: 'Biology', name_bn: 'জীববিজ্ঞান' },
    { code: 'english', name_en: 'English (1st & 2nd Paper)', name_bn: 'ইংরেজি (১ম ও ২য় পত্র)' },
    { code: 'bangla', name_en: 'Bangla (1st & 2nd Paper)', name_bn: 'বাংলা (১ম ও ২য় পত্র)' },
    {
      code: 'ict',
      name_en: 'Information & Communication Tech (ICT)',
      name_bn: 'তথ্য ও যোগাযোগ প্রযুক্তি (আইসিটি)',
    },
  ];

  for (const s of subjects) {
    await client.query(
      `INSERT INTO subjects (code, name_en, name_bn)
       VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE
       SET name_en = EXCLUDED.name_en, name_bn = EXCLUDED.name_bn;`,
      [s.code, s.name_en, s.name_bn],
    );
  }

  // 5. Seed Chart of Accounts (Double-Entry Financial Ledger)
  const ledgerAccounts = [
    { code: '1000', name: 'Escrow Holding Pool (bKash/Nagad/Bank)', type: 'asset', cur: 'BDT' },
    { code: '1100', name: 'Platform Operating Bank Account', type: 'asset', cur: 'BDT' },
    { code: '2000', name: 'Tutor Earnings Payable Liability', type: 'liability', cur: 'BDT' },
    {
      code: '2100',
      name: 'Student Advance Escrow Deposit Liability',
      type: 'liability',
      cur: 'BDT',
    },
    { code: '3000', name: 'Platform Capital / Retained Earnings', type: 'equity', cur: 'BDT' },
    { code: '4000', name: 'Tutoring Platform Service Fee Revenue', type: 'revenue', cur: 'BDT' },
    {
      code: '5000',
      name: 'Mobile Financial Services (MFS) Gateway Fees Expense',
      type: 'expense',
      cur: 'BDT',
    },
  ];

  for (const acc of ledgerAccounts) {
    await client.query(
      `INSERT INTO ledger_accounts (code, name, account_type, currency)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE
       SET name = EXCLUDED.name, account_type = EXCLUDED.account_type, currency = EXCLUDED.currency;`,
      [acc.code, acc.name, acc.type, acc.cur],
    );
  }

  // 6. Seed Synthetic Demo Users (Guardian, Tutor, Student)
  // Production security invariant: Production seed MUST NEVER create demo users.
  const isProd = options.isProduction ?? process.env.NODE_ENV === 'production';
  if (isProd) {
    return;
  }

  const demoUsers = [
    {
      id: '11111111-1111-4111-a111-111111111111',
      email: 'guardian.demo@ogroniedu.com',
      phone: '+8801711000001',
      name: 'তানভীর আহমেদ (Tanvir Ahmed)',
      locale: 'bn',
      status: 'active',
    },
    {
      id: '22222222-2222-4222-b222-222222222222',
      email: 'tutor.demo@ogroniedu.com',
      phone: '+8801711000002',
      name: 'রাশেদ করিম (Rashed Karim)',
      locale: 'bn',
      status: 'active',
    },
    {
      id: '33333333-3333-4333-c333-333333333333',
      email: 'student.demo@ogroniedu.com',
      phone: '+8801711000003',
      name: 'আবরার আহমেদ (Abrar Ahmed)',
      locale: 'bn',
      status: 'active',
    },
  ];

  for (const u of demoUsers) {
    await client.query(
      `INSERT INTO users (id, email, phone_e164, display_name, preferred_locale, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
       SET display_name = EXCLUDED.display_name, status = EXCLUDED.status;`,
      [u.id, u.email, u.phone, u.name, u.locale, u.status],
    );
  }

  // Assign user roles
  const userRoleAssignments = [
    { userId: '11111111-1111-4111-a111-111111111111', roleCode: 'guardian' },
    { userId: '22222222-2222-4222-b222-222222222222', roleCode: 'tutor' },
    { userId: '33333333-3333-4333-c333-333333333333', roleCode: 'student' },
  ];

  for (const a of userRoleAssignments) {
    const roleRes = await client.query('SELECT id FROM roles WHERE code = $1;', [a.roleCode]);
    if (roleRes.rows.length > 0) {
      const roleId = roleRes.rows[0].id;
      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_id) DO NOTHING;`,
        [a.userId, roleId],
      );
    }
  }

  // Link Guardian to Student
  await client.query(
    `INSERT INTO guardian_student_links (guardian_user_id, student_user_id, relationship_type, status)
     VALUES ('11111111-1111-4111-a111-111111111111', '33333333-3333-4333-c333-333333333333', 'father', 'active')
     ON CONFLICT (guardian_user_id, student_user_id) DO UPDATE
     SET status = 'active';`,
  );

  // Tutor Profile for Rashed Karim
  await client.query(
    `INSERT INTO tutor_profiles (user_id, headline, bio, years_experience, teaching_modes, hourly_rate_minor, currency, verification_status, publication_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id) DO UPDATE
     SET headline = EXCLUDED.headline, verification_status = EXCLUDED.verification_status, publication_status = EXCLUDED.publication_status;`,
    [
      '22222222-2222-4222-b222-222222222222',
      'বুয়েট সিভিল ইঞ্জিনিয়ারিং | এইচএসসি ও এসএসসি পদার্থবিজ্ঞান ও উচ্চতর গণিত অভিজ্ঞ শিক্ষক',
      '৫+ বছরের অভিজ্ঞতায় শিক্ষার্থীদের বেসিক ক্লিয়ার ও কনসেপচুয়াল লার্নিং নিশ্চিত করি।',
      5,
      ['in_person', 'online'],
      120000, // 1200 BDT in poisha (1200 * 100)
      'BDT',
      'approved',
      'published',
    ],
  );
}
